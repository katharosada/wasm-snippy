use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn select_move(_random_num: i32) -> i32 {
    // Always chooses paper (1)
    return 1;
}
