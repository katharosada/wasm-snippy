use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn select_move(random_num: i32) -> i32 {
    return random_num % 3;
}
