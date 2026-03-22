use axum::{
    body::Body,
    extract::{Query, State},
    http::{header, HeaderMap, Response, StatusCode},
    response::IntoResponse,
    Json,
};
use sha2::{Digest, Sha256};
use snapbolt_core::{OptimizeOptions, OutputFormat};
use std::sync::Arc;

use crate::cache::{CachedImage, ImageCache};
use crate::config::Config;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub cache: ImageCache,
    pub http_client: reqwest::Client,
}

#[derive(serde::Deserialize, Debug, Clone)]
pub struct ImageQuery {
    pub url: String,
    pub w: Option<u32>,
    pub h: Option<u32>,
    pub q: Option<u8>,
    pub fmt: Option<String>,
}

fn resolve_format(fmt_param: Option<&str>, accept_header: Option<&str>) -> OutputFormat {
    match fmt_param {
        Some("avif") => OutputFormat::Avif,
        Some("webp") => OutputFormat::WebP,
        Some("jpeg") | Some("jpg") => OutputFormat::Jpeg,
        Some("png") => OutputFormat::Png,
        _ => {
            // fmt=auto or not specified: negotiate from Accept header
            let accept = accept_header.unwrap_or("");
            if accept.contains("image/avif") {
                OutputFormat::Avif
            } else {
                OutputFormat::WebP
            }
        }
    }
}

fn compute_cache_key(params: &ImageQuery, format: OutputFormat, quality: u8) -> String {
    let mut hasher = Sha256::new();
    hasher.update(params.url.as_bytes());
    hasher.update(params.w.unwrap_or(0).to_le_bytes());
    hasher.update(params.h.unwrap_or(0).to_le_bytes());
    hasher.update([quality]);
    hasher.update(format!("{:?}", format).as_bytes());
    hex::encode(hasher.finalize())
}

fn image_response(cached: &CachedImage, from_cache: bool) -> Response<Body> {
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, cached.mime)
        .header(header::ETAG, format!("\"{}\"", cached.etag))
        .header(header::CACHE_CONTROL, "public, max-age=31536000, immutable")
        .header("X-Cache", if from_cache { "HIT" } else { "MISS" })
        .body(Body::from(cached.data.clone()))
        .unwrap()
}

fn error_response(status: u16, message: &str) -> Response<Body> {
    let code = StatusCode::from_u16(status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    Response::builder()
        .status(code)
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            serde_json::json!({"error": message}).to_string(),
        ))
        .unwrap()
}

pub async fn image_handler(
    Query(params): Query<ImageQuery>,
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Response<Body> {
    // 1. Parse and validate URL — extract host for SSRF check
    let parsed_url = match url::Url::parse(&params.url) {
        Ok(u) => u,
        Err(_) => return error_response(400, "Invalid URL"),
    };
    let host = match parsed_url.host_str() {
        Some(h) => h.to_lowercase(),
        None => return error_response(400, "URL has no host"),
    };

    // 2. SSRF protection
    if !state.config.is_domain_allowed(&host) {
        return error_response(403, "Domain not in ALLOWED_DOMAINS");
    }

    // 3. Resolve output format
    let accept_val = headers
        .get(header::ACCEPT)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    let format = resolve_format(params.fmt.as_deref(), accept_val.as_deref());
    let quality = params.q.unwrap_or(state.config.default_quality);

    // 4. Cache lookup
    let cache_key = compute_cache_key(&params, format, quality);
    if let Some(cached) = state.cache.get(&cache_key).await {
        return image_response(&cached, true);
    }

    // 5. Fetch upstream image
    let upstream_bytes = match state
        .http_client
        .get(&params.url)
        .send()
        .await
        .and_then(|r| r.error_for_status())
    {
        Ok(resp) => match resp.bytes().await {
            Ok(b) => b,
            Err(e) => return error_response(502, &format!("Failed to read upstream: {e}")),
        },
        Err(e) => return error_response(502, &format!("Failed to fetch upstream: {e}")),
    };

    // 6. Optimize — run in blocking thread pool (CPU-bound, must not block Tokio runtime)
    let options = OptimizeOptions {
        quality: quality as f32,
        width: params.w,
        height: params.h,
        format,
    };

    let optimize_result = tokio::task::spawn_blocking(move || {
        snapbolt_core::optimize_buffer(&upstream_bytes, &options)
    })
    .await;

    let (output_bytes, mime) = match optimize_result {
        Ok(Ok(result)) => result,
        Ok(Err(e)) => return error_response(422, &format!("Optimization failed: {e}")),
        Err(e) => return error_response(500, &format!("Internal error: {e}")),
    };

    // 7. Store in cache
    let etag = cache_key[..16].to_string();
    let cached = Arc::new(CachedImage {
        data: output_bytes,
        mime,
        etag,
    });
    state.cache.insert(cache_key, cached.clone()).await;

    // 8. Return response
    image_response(&cached, false)
}

pub async fn health_handler() -> impl IntoResponse {
    Json(serde_json::json!({"status": "ok"}))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Method, Request, StatusCode},
        routing::get,
        Router,
    };
    use http_body_util::BodyExt;
    use std::sync::Arc;
    use tower::ServiceExt;

    // ── Helpers ──────────────────────────────────────────────────────────────────

    fn test_state(allowed_domains: Vec<String>) -> AppState {
        let config = Config {
            port: 3000,
            allowed_domains,
            cache_max_bytes: 10 * 1024 * 1024,
            default_quality: 80,
        };
        AppState {
            config: Arc::new(config),
            cache: crate::cache::build_cache(10 * 1024 * 1024),
            http_client: reqwest::Client::new(),
        }
    }

    fn app(state: AppState) -> Router {
        Router::new()
            .route("/image", get(image_handler))
            .route("/health", get(health_handler))
            .with_state(state)
    }

    async fn body_string(body: Body) -> String {
        let bytes = body.collect().await.unwrap().to_bytes();
        String::from_utf8_lossy(&bytes).to_string()
    }

    // ── Health endpoint ───────────────────────────────────────────────────────

    #[tokio::test]
    async fn health_returns_200_ok() {
        let resp = app(test_state(vec![]))
            .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
        let body = body_string(resp.into_body()).await;
        assert!(body.contains("ok"));
    }

    // ── Missing / invalid URL params ──────────────────────────────────────────

    #[tokio::test]
    async fn missing_url_param_returns_422() {
        // Axum returns 422 for missing required query params
        let resp = app(test_state(vec![]))
            .oneshot(
                Request::builder()
                    .uri("/image")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(resp.status(), StatusCode::UNPROCESSABLE_ENTITY);
    }

    #[tokio::test]
    async fn invalid_url_returns_400() {
        let resp = app(test_state(vec![]))
            .oneshot(
                Request::builder()
                    .uri("/image?url=not-a-url")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
        let body = body_string(resp.into_body()).await;
        assert!(body.contains("Invalid URL"));
    }

    #[tokio::test]
    async fn url_with_no_host_returns_400() {
        let resp = app(test_state(vec![]))
            .oneshot(
                Request::builder()
                    .uri("/image?url=file%3A%2F%2F%2Fetc%2Fpasswd")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        // file:// URLs parse fine but have no host
        assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
    }

    // ── SSRF protection ───────────────────────────────────────────────────────

    #[tokio::test]
    async fn blocked_domain_returns_403() {
        let state = test_state(vec!["allowed.example.com".into()]);
        let resp = app(state)
            .oneshot(
                Request::builder()
                    .uri("/image?url=https%3A%2F%2Fevil.com%2Fphoto.jpg")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(resp.status(), StatusCode::FORBIDDEN);
        let body = body_string(resp.into_body()).await;
        assert!(body.contains("ALLOWED_DOMAINS"));
    }

    #[tokio::test]
    async fn allowed_domain_subdomain_passes_ssrf_check() {
        // open-mode state (empty allowlist) + a domain that doesn't exist → will
        // fail at fetch stage (502), not at the SSRF gate (403).
        let state = test_state(vec!["example.com".into()]);
        let resp = app(state)
            .oneshot(
                Request::builder()
                    .uri("/image?url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        // Should pass SSRF check, then fail at upstream fetch (502)
        assert_ne!(resp.status(), StatusCode::FORBIDDEN);
    }

    // ── resolve_format ────────────────────────────────────────────────────────

    #[test]
    fn resolve_format_explicit_webp() {
        assert_eq!(resolve_format(Some("webp"), None), OutputFormat::WebP);
    }

    #[test]
    fn resolve_format_explicit_jpeg() {
        assert_eq!(resolve_format(Some("jpeg"), None), OutputFormat::Jpeg);
        assert_eq!(resolve_format(Some("jpg"), None), OutputFormat::Jpeg);
    }

    #[test]
    fn resolve_format_explicit_png() {
        assert_eq!(resolve_format(Some("png"), None), OutputFormat::Png);
    }

    #[test]
    fn resolve_format_explicit_avif() {
        assert_eq!(resolve_format(Some("avif"), None), OutputFormat::Avif);
    }

    #[test]
    fn resolve_format_auto_with_avif_accept_header() {
        assert_eq!(
            resolve_format(None, Some("image/avif,image/webp,*/*;q=0.8")),
            OutputFormat::Avif
        );
    }

    #[test]
    fn resolve_format_auto_without_avif_accept_header_defaults_webp() {
        assert_eq!(
            resolve_format(None, Some("image/webp,*/*;q=0.8")),
            OutputFormat::WebP
        );
    }

    #[test]
    fn resolve_format_no_fmt_no_accept_defaults_webp() {
        assert_eq!(resolve_format(None, None), OutputFormat::WebP);
    }

    // ── compute_cache_key ─────────────────────────────────────────────────────

    #[test]
    fn cache_key_is_deterministic() {
        let params = ImageQuery {
            url: "https://example.com/photo.jpg".into(),
            w: Some(800),
            h: None,
            q: Some(75),
            fmt: None,
        };
        let k1 = compute_cache_key(&params, OutputFormat::WebP, 75);
        let k2 = compute_cache_key(&params, OutputFormat::WebP, 75);
        assert_eq!(k1, k2);
    }

    #[test]
    fn cache_key_differs_by_url() {
        let base = ImageQuery {
            url: "https://example.com/a.jpg".into(),
            w: None,
            h: None,
            q: None,
            fmt: None,
        };
        let other = ImageQuery { url: "https://example.com/b.jpg".into(), ..base.clone() };
        assert_ne!(
            compute_cache_key(&base, OutputFormat::WebP, 80),
            compute_cache_key(&other, OutputFormat::WebP, 80)
        );
    }

    #[test]
    fn cache_key_differs_by_format() {
        let params = ImageQuery {
            url: "https://example.com/photo.jpg".into(),
            w: None,
            h: None,
            q: None,
            fmt: None,
        };
        assert_ne!(
            compute_cache_key(&params, OutputFormat::WebP, 80),
            compute_cache_key(&params, OutputFormat::Jpeg, 80)
        );
    }

    #[test]
    fn cache_key_differs_by_quality() {
        let params = ImageQuery {
            url: "https://example.com/photo.jpg".into(),
            w: None,
            h: None,
            q: None,
            fmt: None,
        };
        assert_ne!(
            compute_cache_key(&params, OutputFormat::WebP, 80),
            compute_cache_key(&params, OutputFormat::WebP, 50)
        );
    }

    // ── Config: is_domain_allowed ──────────────────────────────────────────────

    #[test]
    fn config_empty_allowlist_permits_all() {
        let cfg = Config {
            port: 3000,
            allowed_domains: vec![],
            cache_max_bytes: 0,
            default_quality: 80,
        };
        assert!(cfg.is_domain_allowed("anything.com"));
    }

    #[test]
    fn config_allowlist_exact_match() {
        let cfg = Config {
            port: 3000,
            allowed_domains: vec!["example.com".into()],
            cache_max_bytes: 0,
            default_quality: 80,
        };
        assert!(cfg.is_domain_allowed("example.com"));
        assert!(!cfg.is_domain_allowed("other.com"));
    }

    #[test]
    fn config_allowlist_subdomain_match() {
        let cfg = Config {
            port: 3000,
            allowed_domains: vec!["example.com".into()],
            cache_max_bytes: 0,
            default_quality: 80,
        };
        assert!(cfg.is_domain_allowed("cdn.example.com"));
        assert!(cfg.is_domain_allowed("assets.cdn.example.com"));
        assert!(!cfg.is_domain_allowed("notexample.com"));
    }

    #[test]
    fn config_allowlist_is_case_insensitive() {
        let cfg = Config {
            port: 3000,
            allowed_domains: vec!["example.com".into()],
            cache_max_bytes: 0,
            default_quality: 80,
        };
        assert!(cfg.is_domain_allowed("EXAMPLE.COM"));
        assert!(cfg.is_domain_allowed("CDN.Example.Com"));
    }
}
