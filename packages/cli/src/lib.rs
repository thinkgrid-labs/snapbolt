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

    #[test]
    fn test_optimize_directory_skips_non_images() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("notes.txt"), b"hello").unwrap();
        fs::write(dir.path().join("data.json"), b"{}").unwrap();
        fs::write(dir.path().join("style.css"), b"body{}").unwrap();

        let count = optimize_directory(dir.path().to_str().unwrap().to_string());
        assert_eq!(count, 0);
    }

    #[test]
    fn test_optimize_directory_counts_jpg_and_jpeg() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("a.jpg"), b"fake").unwrap();
        fs::write(dir.path().join("b.jpeg"), b"fake").unwrap();
        fs::write(dir.path().join("c.png"), b"fake").unwrap();

        let count = optimize_directory(dir.path().to_str().unwrap().to_string());
        assert_eq!(count, 3);
    }

    #[test]
    fn test_optimize_directory_recurses_into_subdirectories() {
        let dir = tempdir().unwrap();
        let sub = dir.path().join("sub");
        fs::create_dir(&sub).unwrap();
        fs::write(sub.join("deep.png"), b"fake").unwrap();
        fs::write(dir.path().join("top.png"), b"fake").unwrap();

        let count = optimize_directory(dir.path().to_str().unwrap().to_string());
        assert_eq!(count, 2);
    }

    #[test]
    fn test_optimize_directory_valid_png_writes_webp_file() {
        // Minimal 1×1 red-pixel PNG (same as core tests)
        const MINIMAL_PNG: &[u8] = &[
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48,
            0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00,
            0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08,
            0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
            0xB0, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
        ];

        let dir = tempdir().unwrap();
        let src = dir.path().join("real.png");
        fs::write(&src, MINIMAL_PNG).unwrap();

        optimize_directory(dir.path().to_str().unwrap().to_string());

        let webp_path = dir.path().join("real.webp");
        assert!(webp_path.exists(), "expected .webp output file to be written");
        let webp_data = fs::read(&webp_path).unwrap();
        assert_eq!(&webp_data[0..4], b"RIFF");
        assert_eq!(&webp_data[8..12], b"WEBP");
    }
}
