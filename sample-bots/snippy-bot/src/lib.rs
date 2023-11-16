use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn select_move(_random_num: i32) -> i32 {
    // Always returns 0 (scissors)
    return 0;
}
