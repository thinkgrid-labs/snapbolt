use wasm_bindgen::prelude::*;
use opti_assets_core::{optimize_buffer, OptimizeOptions};

#[wasm_bindgen]
pub fn optimize_image_sync(input: &[u8], quality: f32) -> Result<Vec<u8>, JsValue> {
    let options = OptimizeOptions { quality };
    match optimize_buffer(input, &options) {
        Ok(data) => Ok(data),
        Err(e) => Err(JsValue::from_str(&e.to_string())),
    }
}
