use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub port: u16,
    pub allowed_domains: Vec<String>,
    pub cache_max_bytes: u64,
    pub default_quality: u8,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let port = env::var("PORT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(3000u16);

        let allowed_domains = env::var("ALLOWED_DOMAINS")
            .unwrap_or_default()
            .split(',')
            .map(|s| s.trim().to_lowercase())
            .filter(|s| !s.is_empty())
            .collect();

        let cache_max_bytes = env::var("CACHE_MAX_BYTES")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(500 * 1024 * 1024u64); // 500 MB default

        let default_quality = env::var("DEFAULT_QUALITY")
            .ok()
            .and_then(|v| v.parse::<u8>().ok())
            .map(|q| q.clamp(1, 100))
            .unwrap_or(80);

        Ok(Config {
            port,
            allowed_domains,
            cache_max_bytes,
            default_quality,
        })
    }

    /// Returns true if the given hostname is permitted.
    /// If the allowlist is empty, all domains are allowed (open mode — warn at startup).
    pub fn is_domain_allowed(&self, host: &str) -> bool {
        if self.allowed_domains.is_empty() {
            return true;
        }
        let host_lower = host.to_lowercase();
        self.allowed_domains.iter().any(|d| {
            host_lower == *d || host_lower.ends_with(&format!(".{}", d))
        })
    }
}
