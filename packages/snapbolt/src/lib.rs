use snapbolt_core::{optimize_buffer, OptimizeOptions, OutputFormat};
use wasm_bindgen::prelude::*;

/// Returned by `optimize_image`. Call `.free()` after extracting `.data` and `.mime`.
#[wasm_bindgen]
pub struct OptimizeResult {
    data: Vec<u8>,
    mime: String,
}

#[wasm_bindgen]
impl OptimizeResult {
    #[wasm_bindgen(getter)]
    pub fn data(&self) -> Vec<u8> {
        self.data.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn mime(&self) -> String {
        self.mime.clone()
    }
}

fn parse_format(s: &str) -> OutputFormat {
    match s {
        "avif" => OutputFormat::Avif,
        "jpeg" | "jpg" => OutputFormat::Jpeg,
        "png" => OutputFormat::Png,
        // "webp" and unknown values route to WebP (which maps to AVIF in WASM mode
        // via the core crate's feature-gated logic)
        _ => OutputFormat::WebP,
    }
}

/// Encode `input` bytes to the requested `format` at the given `quality` (1–100).
/// Returns an `OptimizeResult` with `.data` (encoded bytes) and `.mime` (MIME type).
/// Always call `.free()` on the result after you are done with it.
#[wasm_bindgen]
pub fn optimize_image(input: &[u8], quality: f32, format: &str) -> Result<OptimizeResult, JsValue> {
    let options = OptimizeOptions {
        quality,
        format: parse_format(format),
        ..OptimizeOptions::default()
    };
    match optimize_buffer(input, &options) {
        Ok((data, mime)) => Ok(OptimizeResult { data, mime: mime.to_string() }),
        Err(e) => Err(JsValue::from_str(&e.to_string())),
    }
}

/// Legacy single-value entry point — returns raw bytes only (AVIF in WASM mode).
/// Prefer `optimize_image` for new code.
#[wasm_bindgen]
pub fn optimize_image_sync(input: &[u8], quality: f32) -> Result<Vec<u8>, JsValue> {
    let result = optimize_image(input, quality, "avif")?;
    Ok(result.data)
}
