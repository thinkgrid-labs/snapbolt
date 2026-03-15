mod cache;
mod config;
mod handler;

use axum::{routing::get, Router};
use handler::AppState;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{fmt, EnvFilter};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    fmt()
        .with_env_filter(
            EnvFilter::from_default_env()
                .add_directive("snapbolt_server=info".parse()?)
                .add_directive("tower_http=info".parse()?),
        )
        .init();

    // Load config from environment
    let config = config::Config::from_env()?;

    if config.allowed_domains.is_empty() {
        tracing::warn!(
            "ALLOWED_DOMAINS is not set — running in OPEN mode. \
             All remote URLs will be accepted. Set ALLOWED_DOMAINS in production."
        );
    } else {
        tracing::info!(domains = ?config.allowed_domains, "Domain allowlist loaded");
    }

    // Build shared state
    let image_cache = cache::build_cache(config.cache_max_bytes);
    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .user_agent("snapbolt-server/0.1")
        .build()?;

    let state = AppState {
        config: Arc::new(config.clone()),
        cache: image_cache,
        http_client,
    };

    // Build router
    let app = Router::new()
        .route("/image", get(handler::image_handler))
        .route("/health", get(handler::health_handler))
        .with_state(state)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let addr = format!("0.0.0.0:{}", config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("snapbolt-server listening on http://{}", addr);

    axum::serve(listener, app).await?;
    Ok(())
}
