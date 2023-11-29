# Rust example bot

Main bot code is in `src/main.rs`.

Edit it as you choose!

## Building & testing

You'll need to install a Rust toolchain. See [Installing Rust and Cargo](https://doc.rust-lang.org/cargo/getting-started/installation.html)

Install dependencies & build
```
$ rustup target add wasm32-wasi
$ cargo build --target wasm32-wasi
```

Install Wasmtime. See: [Wasmtime installation instructions](https://docs.wasmtime.dev/cli-install.html).

Test using `wasmtime` CLI:
```
$ wasmtime target/wasm32-wasi/debug/rust-snippy-bot.wasm
```

If the program needs input, pass in the json data through stdin:
```
$ echo '{"botname": "MyBot", "opponent": "RandomBot"}' | wasmtime target/wasm32-wasi/debug/rust-snippy-bot.wasm
```

## Submitting the bot

Build a release version:
```
$ cargo build --target wasm32-wasi --release
```

Find the release build in `target/wasm32-wasi/release/rust-snippy-bot.wasm` to upload to the tournament.