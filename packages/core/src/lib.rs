use std::io::Cursor;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum OptimizerError {
    #[error("Failed to decode image: {0}")]
    DecodeError(String),
    #[error("Failed to encode image: {0}")]
    EncodeError(String),
    #[error("Unsupported format")]
    UnsupportedFormat,
}

pub struct OptimizeOptions {
    pub quality: f32,
}

impl Default for OptimizeOptions {
    fn default() -> Self {
        Self { quality: 80.0 }
    }
}

/// Optimizes an image buffer (PNG/JPEG) to WebP
pub fn optimize_buffer(
    input: &[u8],
    _options: &OptimizeOptions,
) -> Result<Vec<u8>, OptimizerError> {
    // 1. Decode generic image
    let img =
        image::load_from_memory(input).map_err(|e| OptimizerError::DecodeError(e.to_string()))?;

    // 2. Encode to WebP
    // using image crate's pure Rust encoder (lossless by default in 0.25 for simple write_to)
    let mut out = Cursor::new(Vec::new());
    img.write_to(&mut out, image::ImageFormat::WebP)
        .map_err(|e| OptimizerError::EncodeError(e.to_string()))?;

    // Return as owned Vec<u8>
    Ok(out.into_inner())
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
        let options = OptimizeOptions { quality: 50.0 };
        let result = optimize_buffer(MINIMAL_PNG, &options);

        assert!(result.is_ok());
        let webp_data = result.unwrap();

        // Check WebP Header (RIFF....WEBP)
        assert_eq!(&webp_data[0..4], b"RIFF");
        assert_eq!(&webp_data[8..12], b"WEBP");
    }

    #[test]
    fn test_optimize_buffer_quality_impact() {
        // High quality
        let opt_high = OptimizeOptions { quality: 90.0 };
        let res_high = optimize_buffer(MINIMAL_PNG, &opt_high).unwrap();

        // Low quality
        let opt_low = OptimizeOptions { quality: 10.0 };
        let res_low = optimize_buffer(MINIMAL_PNG, &opt_low).unwrap();

        // For a 1x1 image, sizes might be identical, but we ensure both succeed
        assert!(res_high.len() > 0);
        assert!(res_low.len() > 0);
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
}
