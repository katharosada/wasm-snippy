use std::env;
use std::fs;
use std::str;
use std::path::Path;
use wasmtime::*;
use wasmtime_wasi::sync::WasiCtxBuilder;
use wasi_common::pipe::ReadPipe;
use wasi_common::pipe::WritePipe;
use std::time::Instant;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};


#[derive(Serialize)]
pub enum SPROption {
    Scissors = 0,
    Paper,
    Rock,
    Invalid
}

#[derive(Deserialize)]
pub enum BotRunType {
    Wasi = 1,
    Python,
}

pub struct BotDetails {
    pub run_type: BotRunType,
    pub name: String,
    pub code: String,
    pub wasm_path: String,
}

pub struct WasmRuntime {
    engine: Engine,
    python_module: Module,
}

lazy_static! {
    static ref WASM_RUNTIME: WasmRuntime = {
        let runtime = WasmRuntime::new().unwrap();
        runtime
    };
}

impl WasmRuntime {
    pub fn new() -> Result<WasmRuntime> {
        let start = Instant::now();
        let mut config = Config::new();
        config.wasm_component_model(true);
        config.consume_fuel(true);
        let engine = Engine::new(&config)?;
        // Instantiate our module with the imports we've created, and run it.
        let module = Module::from_file(&engine, "./python-3.11.4.wasm")?;

        let duration = start.elapsed();
        println!("Loaded Wasm runtime in {}s", duration.as_secs_f32());

        Ok(WasmRuntime {
            engine: engine,
            python_module: module,
        })
    }
}

pub fn init() {
    println!("Initializing WASM Runtime...");
    let _ = test_bot(&BotDetails {
        run_type: BotRunType::Python,
        name: "test".to_string(),
        code: "print(2)".to_string(),
        wasm_path: "".to_string()
    });
    println!("Finished inititalising WASM Runtime");
}

#[derive(Serialize)]
pub struct BotRunResult {
    pub stdin: String,
    pub stdout: String,
    pub stderr: String,
    pub duration: f32,
    pub result: SPROption,
    pub invalid_reason: Option<String>,
}

#[derive(Serialize)]
pub struct BotMatchOutcome {
    pub round: u32,
    pub choice: SPROption,
    pub opponent: String,
    pub opponent_choice: SPROption,
}

#[derive(Serialize)]
pub struct BotRunInput {
    botname: String,
    opponent: String,
    round: u32,
    opponent_history: Vec<BotMatchOutcome>
}

fn generate_test_input(bot_name: &String) -> String {
    let input = BotRunInput {
        botname: bot_name.clone(),
        opponent: "test".to_string(),
        round: 0,
        opponent_history: vec![]
    };

    serde_json::to_string(&input).unwrap()
}

pub fn test_bot(bot_details: &BotDetails) -> Result<BotRunResult> {
    let input = generate_test_input(&bot_details.name);
    match bot_details.run_type {
        BotRunType::Wasi => {
            return test_wasi_bot(bot_details, input);
        },
        BotRunType::Python => {
            return test_python_bot(bot_details, input);
        }
    }
}

fn test_wasi_bot(bot_details: &BotDetails, input: String) -> Result<BotRunResult> {
    println!("Running WASI bot, path: {}", bot_details.wasm_path);
    Ok(BotRunResult {
        stdin: input,
        stdout: "".to_string(),
        stderr: "".to_string(),
        duration: 0.0,
        result: SPROption::Invalid,
        invalid_reason: Some("Not implemented".to_string()),
    })
}

fn trim_newlines<'a>(s: &'a str) -> &'a str {
    match s.strip_suffix("\n") {
        Some(s) => s,
        None => s
    }
}

fn extract_result_from_stdout(stdout: &String) -> SPROption {
    let lines: Vec<&str> = trim_newlines(stdout).split("\n").collect();
    let last_line = lines.last().unwrap();
    println!("Last line: {}", last_line);
    match last_line.get(0..1) {
        Some("0") => SPROption::Scissors,
        Some("1") => SPROption::Paper,
        Some("2") => SPROption::Rock,
        _ => SPROption::Invalid
    }
}

fn test_python_bot(bot_details: &BotDetails, input: String) -> Result<BotRunResult> {
    let mut linker = Linker::new(&WASM_RUNTIME.engine);
    wasmtime_wasi::add_to_linker(&mut linker, |s| s)?;

    // Fake args
    let args: &[String] = &["python".to_string(), "main.py".to_string()];

    let stdin = ReadPipe::from(input.clone());
    let stdout = WritePipe::new_in_memory();
    let stderr = WritePipe::new_in_memory();

    println!("Creating tempdir");
    let temp_dir_path = env::temp_dir();
    let temp_dir = fs::File::open(temp_dir_path.clone())?;
    let main_py_path = temp_dir_path.join("main.py");
    fs::write(main_py_path, bot_details.code.as_bytes())?;

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
    let mut store = Store::new(&WASM_RUNTIME.engine, wasi);
    store.add_fuel(1_000_000_000)?;

    println!("Linking modules");
    linker.module(&mut store, "", &WASM_RUNTIME.python_module)?;
    println!("Running...");
    let start = Instant::now();
    let result = linker
        .get_default(&mut store, "")?
        .typed::<(), ()>(&store)?
        .call(&mut store, ());

    let duration = start.elapsed();
    println!("Stopped after {}s", duration.as_secs_f32());
    drop(store);

    let stdout_buf: Vec<u8> = stdout.try_into_inner().expect("sole remaining reference to WritePipe").into_inner();
    let stdout_str = String::from_utf8_lossy(&stdout_buf).to_string();

    let stderr_buf: Vec<u8> = stderr.try_into_inner().expect("sole remaining reference to WritePipe").into_inner();
    
    let stderr_str = String::from_utf8_lossy(&stderr_buf).to_string();


    if result.is_err() {
        println!("Error running python.");
        return Ok(BotRunResult{
            stdin: input,
            stdout: stdout_str,
            stderr: stderr_str,
            duration: duration.as_secs_f32(),
            result: SPROption::Invalid,
            invalid_reason: Some("Program did not exit successfully.".to_string())
        })
    }
    let bot_result = extract_result_from_stdout(&stdout_str);
    let invalid_reason = match bot_result {
        SPROption::Invalid => Some("Program did not print 0, 1 or 2 on the last line.".to_string()),
        _ => None  
    };
    return Ok(BotRunResult{
        stdin: input,
        stdout: stdout_str,
        stderr: stderr_str,
        duration: duration.as_secs_f32(),
        result: bot_result,
        invalid_reason: invalid_reason
    });
}
