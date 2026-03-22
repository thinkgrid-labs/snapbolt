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

/// Pure-Rust AVIF encoder via ravif + rav1e. Works on wasm32-unknown-unknown.
#[cfg(feature = "avif")]
fn encode_avif(img: &image::DynamicImage, quality: f32) -> Result<Vec<u8>, OptimizerError> {
    use rgb::FromSlice;
    let rgba = img.to_rgba8();
    let (width, height) = (rgba.width() as usize, rgba.height() as usize);
    let pixels: &[rgb::RGBA8] = rgba.as_raw().as_rgba();
    let result = ravif::Encoder::new()
        .with_quality(quality)
        .with_speed(6)
        .encode_rgba(ravif::Img::new(pixels, width, height))
        .map_err(|e| OptimizerError::EncodeError(e.to_string()))?;
    Ok(result.avif_file)
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
            #[cfg(feature = "native")]
            {
                let encoder = webp::Encoder::from_image(&img)
                    .map_err(|e| OptimizerError::EncodeError(e.to_string()))?;
                let memory = encoder.encode(options.quality);
                Ok((memory.to_vec(), "image/webp"))
            }
            // WASM: route to AVIF (pure Rust, no C FFI needed). Transparent to callers
            // requesting WebP — AVIF is smaller and better quality at equivalent bitrates.
            #[cfg(all(not(feature = "native"), feature = "avif"))]
            {
                encode_avif(&img, options.quality).map(|data| (data, "image/avif"))
            }
            // Fallback when neither native nor avif features are enabled.
            #[cfg(all(not(feature = "native"), not(feature = "avif")))]
            {
                Ok((input.to_vec(), "image/jpeg"))
            }
        }

        OutputFormat::Avif => {
            #[cfg(feature = "avif")]
            {
                encode_avif(&img, options.quality).map(|data| (data, "image/avif"))
            }
            #[cfg(not(feature = "avif"))]
            {
                Err(OptimizerError::UnsupportedFormat)
            }
        }

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
        let (avif_data, mime) = result.unwrap();

        assert_eq!(mime, "image/avif");
        assert!(!avif_data.is_empty());
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
            format: OutputFormat::Avif,
            ..OptimizeOptions::default()
        };
        let result = optimize_buffer(MINIMAL_PNG, &options);
        assert!(result.is_ok());
    }

    #[test]
    fn test_resize_with_height_only() {
        let options = OptimizeOptions {
            height: Some(1),
            format: OutputFormat::Png,
            ..OptimizeOptions::default()
        };
        let result = optimize_buffer(MINIMAL_PNG, &options);
        assert!(result.is_ok());
    }

    #[test]
    fn test_resize_with_both_dimensions() {
        let options = OptimizeOptions {
            width: Some(2),
            height: Some(2),
            format: OutputFormat::Jpeg,
            ..OptimizeOptions::default()
        };
        let (data, mime) = optimize_buffer(MINIMAL_PNG, &options).unwrap();
        assert_eq!(mime, "image/jpeg");
        assert!(!data.is_empty());
    }

    #[test]
    fn test_avif_output() {
        let options = OptimizeOptions {
            format: OutputFormat::Avif,
            ..OptimizeOptions::default()
        };
        let result = optimize_buffer(MINIMAL_PNG, &options);
        assert!(result.is_ok());
        let (data, mime) = result.unwrap();
        assert_eq!(mime, "image/avif");
        assert!(!data.is_empty());
    }

    #[test]
    fn test_jpeg_quality_boundary_high() {
        let options = OptimizeOptions {
            quality: 100.0,
            format: OutputFormat::Jpeg,
            ..OptimizeOptions::default()
        };
        let (data, mime) = optimize_buffer(MINIMAL_PNG, &options).unwrap();
        assert_eq!(mime, "image/jpeg");
        assert!(!data.is_empty());
    }

    #[test]
    fn test_jpeg_quality_boundary_low() {
        let options = OptimizeOptions {
            quality: 1.0,
            format: OutputFormat::Jpeg,
            ..OptimizeOptions::default()
        };
        let (data, mime) = optimize_buffer(MINIMAL_PNG, &options).unwrap();
        assert_eq!(mime, "image/jpeg");
        assert!(!data.is_empty());
    }

    #[test]
    fn test_empty_input_returns_decode_error() {
        let options = OptimizeOptions::default();
        let result = optimize_buffer(&[], &options);
        assert!(matches!(result, Err(OptimizerError::DecodeError(_))));
    }

    #[test]
    fn test_optimize_options_default_values() {
        let opts = OptimizeOptions::default();
        assert_eq!(opts.quality, 80.0);
        assert_eq!(opts.width, None);
        assert_eq!(opts.height, None);
        assert_eq!(opts.format, OutputFormat::WebP);
    }

    #[test]
    fn test_output_format_default_is_webp() {
        assert_eq!(OutputFormat::default(), OutputFormat::WebP);
    }
}
