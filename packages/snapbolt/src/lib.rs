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
        "jpeg" | "jpg" => OutputFormat::Jpeg,
        "png" => OutputFormat::Png,
        // In browser WASM mode, actual WebP encoding is done by the Canvas API on the
        // main thread. WASM returns passthrough bytes so the caller can canvas-encode.
        // "avif", "webp", and unknown values all route to WebP (passthrough in WASM mode).
        _ => OutputFormat::WebP,
    }
}

/// Returns input bytes passthrough (WASM mode) or encoded to the requested format
/// (native/CLI mode with the `native` feature). Canvas API handles WebP on the browser side.
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

/// Legacy passthrough — returns raw bytes unchanged for canvas encoding downstream.
#[wasm_bindgen]
pub fn optimize_image_sync(input: &[u8], _quality: f32) -> Vec<u8> {
    input.to_vec()
}
