use moka::future::Cache;
use std::sync::Arc;
use std::time::Duration;

#[derive(Clone)]
pub struct CachedImage {
    pub data: Vec<u8>,
    pub mime: &'static str,
    pub etag: String,
}

pub type ImageCache = Cache<String, Arc<CachedImage>>;

pub fn build_cache(max_bytes: u64) -> ImageCache {
    Cache::builder()
        .weigher(|_key: &String, value: &Arc<CachedImage>| {
            // Weight by approximate byte size (data + small overhead per entry)
            (value.data.len() as u32).saturating_add(128)
        })
        .max_capacity(max_bytes)
        .time_to_live(Duration::from_secs(3600)) // evict stale entries after 1 hour
        .build()
}
