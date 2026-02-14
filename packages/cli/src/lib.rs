use napi_derive::napi;
use napi::Error;
use std::path::Path;
use std::fs;
use walkdir::WalkDir;
use rayon::prelude::*;
use opti_assets_core::{optimize_buffer, OptimizeOptions};

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
            if let Ok(optimized) = optimize_buffer(&data, &options) {
                let mut new_path = path.to_path_buf();
                new_path.set_extension("webp");
                let _ = fs::write(new_path, optimized);
            }
        }
    });

    count as u32
}
