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

#[derive(serde::Deserialize, Debug)]
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
