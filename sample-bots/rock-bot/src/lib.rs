use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn select_move(_random_num: i32) -> i32 {
    // Always returns rock (2)
    return 2;
}
