use napi::bindgen_prelude::Buffer;
use napi_derive::napi;
use rayon::prelude::*;
use snapbolt_core::{optimize_buffer, OptimizeOptions, OutputFormat};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

/// Optimize a single image buffer — used by the Next.js API route handler.
/// Returns the encoded bytes (WebP by default, or the requested format).
#[napi]
pub fn optimize_image(
    input: Buffer,
    quality: Option<f64>,
    width: Option<u32>,
    height: Option<u32>,
    format: Option<String>,
) -> napi::Result<Buffer> {
    let fmt = match format.as_deref() {
        Some("jpeg") | Some("jpg") => OutputFormat::Jpeg,
        Some("png") => OutputFormat::Png,
        _ => OutputFormat::WebP,
    };
    let options = OptimizeOptions {
        quality: quality.unwrap_or(80.0) as f32,
        width,
        height,
        format: fmt,
    };
    match optimize_buffer(&input, &options) {
        Ok((data, _)) => Ok(data.into()),
        Err(e) => Err(napi::Error::from_reason(e.to_string())),
    }
}

#[napi]
pub fn optimize_directory(path_str: String) -> u32 {
    let path = Path::new(&path_str);

    // Collect all image paths first
    let entries: Vec<_> = WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            let p = e.path();
            if let Some(ext) = p.extension() {
                let ext = ext.to_string_lossy().to_lowercase();
                ext == "png" || ext == "jpg" || ext == "jpeg"
            } else {
                false
            }
        })
        .collect();

    let count = entries.len();

    // Process in parallel using Rayon
    entries.par_iter().for_each(|entry| {
        let path = entry.path();

        if let Ok(data) = fs::read(path) {
            let options = OptimizeOptions::default();
            if let Ok((optimized, _mime)) = optimize_buffer(&data, &options) {
                let mut new_path = path.to_path_buf();
                new_path.set_extension("webp");
                let _ = fs::write(new_path, optimized);
            }
        }
    });

    count as u32
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_optimize_directory_empty() {
        let dir = tempdir().unwrap();
        let count = optimize_directory(dir.path().to_str().unwrap().to_string());
        assert_eq!(count, 0);
    }

    #[test]
    fn test_optimize_directory_with_images() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.png");
        fs::write(file_path, b"fake-png-data").unwrap();

        let count = optimize_directory(dir.path().to_str().unwrap().to_string());
        // Since we are using fake data, the core optimizer will fail to decode it,
        // but the scanner should still count 1 file.
        assert_eq!(count, 1);
    }
}
