use snapbolt_core::{optimize_buffer, OptimizeOptions};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn optimize_image_sync(input: &[u8], quality: f32) -> Result<Vec<u8>, JsValue> {
    let options = OptimizeOptions { quality, ..OptimizeOptions::default() };
    match optimize_buffer(input, &options) {
        Ok((data, _mime)) => Ok(data),
        Err(e) => Err(JsValue::from_str(&e.to_string())),
    }
}
