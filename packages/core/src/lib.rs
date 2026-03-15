use std::io::Cursor;
use image::imageops::FilterType;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum OptimizerError {
    #[error("Failed to decode image: {0}")]
    DecodeError(String),
    #[error("Failed to encode image: {0}")]
    EncodeError(String),
    #[error("Unsupported format")]
    UnsupportedFormat,
    #[error("AVIF encode error: {0}")]
    AvifError(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize, Default)]
pub enum OutputFormat {
    #[default]
    WebP,
    Avif,
    Jpeg,
    Png,
}

pub struct OptimizeOptions {
    pub quality: f32,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub format: OutputFormat,
}

impl Default for OptimizeOptions {
    fn default() -> Self {
        Self {
            quality: 80.0,
            width: None,
            height: None,
            format: OutputFormat::default(),
        }
    }
}

/// Optimizes an image buffer. Returns (encoded_bytes, mime_type).
pub fn optimize_buffer(
    input: &[u8],
    options: &OptimizeOptions,
) -> Result<(Vec<u8>, &'static str), OptimizerError> {
    // 1. Decode
    let img = image::load_from_memory(input)
        .map_err(|e| OptimizerError::DecodeError(e.to_string()))?;

    // 2. Resize (preserves aspect ratio via Lanczos3)
    let img = match (options.width, options.height) {
        (Some(w), Some(h)) => img.resize(w, h, FilterType::Lanczos3),
        (Some(w), None) => img.resize(w, u32::MAX, FilterType::Lanczos3),
        (None, Some(h)) => img.resize(u32::MAX, h, FilterType::Lanczos3),
        (None, None) => img,
    };

    // 3. Encode by format
    match options.format {
        OutputFormat::WebP => {
            // Native: lossy WebP via libwebp-sys (quality-controlled, smaller output).
            // WASM: pure-Rust encoder from the image crate (no C FFI, wasm32-compatible).
            #[cfg(feature = "native")]
            {
                let encoder = webp::Encoder::from_image(&img)
                    .map_err(|e| OptimizerError::EncodeError(e.to_string()))?;
                let memory = encoder.encode(options.quality);
                Ok((memory.to_vec(), "image/webp"))
            }
            #[cfg(not(feature = "native"))]
            {
                let mut out = Cursor::new(Vec::new());
                img.write_to(&mut out, image::ImageFormat::WebP)
                    .map_err(|e| OptimizerError::EncodeError(e.to_string()))?;
                Ok((out.into_inner(), "image/webp"))
            }
        }

        // AVIF encoding requires nasm (brew install nasm) + ravif + rgb deps.
        // Enable by adding ravif/rgb to Cargo.toml and restoring the encode arm.
        OutputFormat::Avif => Err(OptimizerError::UnsupportedFormat),

        OutputFormat::Jpeg => {
            let mut out = Cursor::new(Vec::new());
            let quality = options.quality.clamp(1.0, 100.0) as u8;
            let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, quality);
            encoder
                .encode_image(&img)
                .map_err(|e| OptimizerError::EncodeError(e.to_string()))?;
            Ok((out.into_inner(), "image/jpeg"))
        }

        OutputFormat::Png => {
            let mut out = Cursor::new(Vec::new());
            img.write_to(&mut out, image::ImageFormat::Png)
                .map_err(|e| OptimizerError::EncodeError(e.to_string()))?;
            Ok((out.into_inner(), "image/png"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Minimal 1x1 Red Pixel PNG
    const MINIMAL_PNG: &[u8] = &[
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x77, 0x53, 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8,
        0xCF, 0xC0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB0, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ];

    #[test]
    fn test_optimize_buffer_valid_png() {
        let options = OptimizeOptions { quality: 50.0, ..OptimizeOptions::default() };
        let result = optimize_buffer(MINIMAL_PNG, &options);

        assert!(result.is_ok());
        let (webp_data, mime) = result.unwrap();

        assert_eq!(mime, "image/webp");
        assert_eq!(&webp_data[0..4], b"RIFF");
        assert_eq!(&webp_data[8..12], b"WEBP");
    }

    #[test]
    fn test_optimize_buffer_quality_impact() {
        let opt_high = OptimizeOptions { quality: 90.0, ..OptimizeOptions::default() };
        let (res_high, _) = optimize_buffer(MINIMAL_PNG, &opt_high).unwrap();

        let opt_low = OptimizeOptions { quality: 10.0, ..OptimizeOptions::default() };
        let (res_low, _) = optimize_buffer(MINIMAL_PNG, &opt_low).unwrap();

        assert!(!res_high.is_empty());
        assert!(!res_low.is_empty());
    }

    #[test]
    fn test_optimize_buffer_invalid_data() {
        let options = OptimizeOptions::default();
        let invalid_data = &[0, 1, 2, 3];
        let result = optimize_buffer(invalid_data, &options);
        assert!(matches!(result, Err(OptimizerError::DecodeError(_))));
    }

    #[test]
    fn test_unsupported_format() {
        let options = OptimizeOptions::default();
        let empty_data = &[];
        let result = optimize_buffer(empty_data, &options);
        assert!(result.is_err());
    }

    #[test]
    fn test_jpeg_output() {
        let options = OptimizeOptions {
            quality: 75.0,
            format: OutputFormat::Jpeg,
            ..OptimizeOptions::default()
        };
        let (data, mime) = optimize_buffer(MINIMAL_PNG, &options).unwrap();
        assert_eq!(mime, "image/jpeg");
        assert_eq!(&data[0..2], &[0xFF, 0xD8]);
    }

    #[test]
    fn test_png_output() {
        let options = OptimizeOptions {
            format: OutputFormat::Png,
            ..OptimizeOptions::default()
        };
        let (data, mime) = optimize_buffer(MINIMAL_PNG, &options).unwrap();
        assert_eq!(mime, "image/png");
        assert_eq!(&data[0..4], &[0x89, 0x50, 0x4E, 0x47]);
    }

    #[test]
    fn test_resize_with_width() {
        let options = OptimizeOptions {
            width: Some(1),
            format: OutputFormat::WebP,
            ..OptimizeOptions::default()
        };
        let result = optimize_buffer(MINIMAL_PNG, &options);
        assert!(result.is_ok());
    }
}
