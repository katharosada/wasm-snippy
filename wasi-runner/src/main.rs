use std::env;
use std::fs;
use std::path::Path;
use wasmtime::*;
use wasmtime_wasi::sync::WasiCtxBuilder;
use wasi_common::pipe::ReadPipe;
use wasi_common::pipe::WritePipe;
use std::time::{Duration, Instant};


enum SPROption {
    Scissors = 0,
    Paper,
    Rock,
    Invalid
}

fn run_python(python_module: &Module, engine: &Engine, python_code: String) -> wasmtime::Result<SPROption> {    
    let mut linker = Linker::new(&engine);
    wasmtime_wasi::add_to_linker(&mut linker, |s| s)?;

    // Fake args
    let args: &[String] = &["python".to_string(), "main.py".to_string()];

    let stdin = ReadPipe::from("");
    let stdout = WritePipe::new_in_memory();
    let stderr = WritePipe::new_in_memory();

    println!("Creating tempdir");
    let temp_dir_path = env::temp_dir();
    let temp_dir = fs::File::open(temp_dir_path.clone())?;
    let main_py_path = temp_dir_path.join("main.py");
    fs::write(main_py_path, python_code.as_bytes())?;

    println!("Settingup WASI Dir");
    let root_dir = wasmtime_wasi::sync::Dir::from_std_file(temp_dir);
    let root_dir_internal_path = Path::new("/");

    println!("Building WASI context");
    let wasi = WasiCtxBuilder::new()
        .args(&args)?
        .stdin(Box::new(stdin))
        .stdout(Box::new(stdout.clone()))
        .stderr(Box::new(stderr.clone()))
        .preopened_dir(root_dir, root_dir_internal_path)?
        .build();

    println!("Creating Store");
    let mut store = Store::new(&engine, wasi);
    store.add_fuel(1_000_000_000)?;

    println!("Linking modules");
    linker.module(&mut store, "", &python_module)?;
    println!("Running...");
    let start = Instant::now();
    let result = linker
        .get_default(&mut store, "")?
        .typed::<(), ()>(&store)?
        .call(&mut store, ());

    let duration = start.elapsed();
    println!("Stopped after {}s", duration.as_secs_f32());
    drop(store);
    // Print the contents of stdout pipe
    let stdout_buf: Vec<u8> = stdout.try_into_inner().expect("sole remaining reference to WritePipe").into_inner();
    let stdout_str = String::from_utf8_lossy(&stdout_buf);
    // println!("contents of stdout: {:?}", stdout_str);

    if (result.is_err()) {
        println!("Error running python.");
        return Ok(SPROption::Invalid);
    }
    return Ok(SPROption::Scissors);
}

fn main() -> wasmtime::Result<()> {
    let start = Instant::now();
    let mut config = Config::new();
    config.wasm_component_model(true);
    config.consume_fuel(true);
    let engine = Engine::new(&config)?;
    // Instantiate our module with the imports we've created, and run it.
    let module = Module::from_file(&engine, "./python-3.11.4.wasm")?;

    let duration = start.elapsed();
    println!("Loaded in {}s", duration.as_secs_f32());
    run_python(&module, &engine, "import random\nprint(random.randint(0, 2))\n".to_string());
    run_python(&module, &engine, "while True:\n  print('Hello')\n".to_string());
    run_python(&module, &engine, "import random\nprint(random.randint(0, 2))\n".to_string());

    Ok(())
}