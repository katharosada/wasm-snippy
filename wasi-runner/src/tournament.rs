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

#[derive(Clone)]
#[derive(Deserialize, Serialize)]
pub enum BotRunType {
    Wasi = 1,
    Python,
}

#[derive(Clone, Serialize)]
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
    pub play: SPROption,
    pub opponent: String,
    pub opponent_play: SPROption,
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
    let last_line = *lines.last().unwrap_or(&"");
    println!("Last line: {}", last_line);
    match last_line.to_lowercase().as_str() {
        "scissors" => SPROption::Scissors,
        "paper" => SPROption::Paper,
        "rock" => SPROption::Rock,
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
        SPROption::Invalid => Some("Program did not print a valid play on the last line.".to_string()),
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


fn get_bots() -> Vec<BotDetails> {
    return vec![
        BotDetails {
            run_type: BotRunType::Python,
            name: "rocky".to_string(),
            code: "print('rock')".to_string(),
            wasm_path: "".to_string()
        },
        BotDetails {
            run_type: BotRunType::Python,
            name: "rando bot".to_string(),
            code: "import random\nnum = random.randint(0, 2)\nprint(['rock', 'paper', 'scissors'][num])".to_string(),
            wasm_path: "".to_string()
        },
        BotDetails {
            run_type: BotRunType::Python,
            name: "snippy".to_string(),
            code: "print('scissors')".to_string(),
            wasm_path: "".to_string()
        },
        BotDetails {
            run_type: BotRunType::Python,
            name: "booky".to_string(),
            code: "print('paper')".to_string(),
            wasm_path: "".to_string()
        },
        BotDetails {
            run_type: BotRunType::Python,
            name: "Randall".to_string(),
            code: "import random\nnum = random.randint(0, 2)\nprint(['rock', 'paper', 'scissors'][num])".to_string(),
            wasm_path: "".to_string()
        },
    ]
}

#[derive(Clone, Serialize)]
pub enum MatchState {
    NotStarted,
    InProgress,
    Bye,
    Finished
}

#[derive(Clone, Serialize)]
pub struct Match {
    id: String,
    tournament_round_text: String,
    next_match_id: Option<String>,
    participants: Vec<BotDetails>,
    state: MatchState,
}

impl Match {
    fn set_next_match_id(&mut self, next_match_id: String) {
        self.next_match_id = Some(next_match_id);
    }
}

#[derive(Clone, Serialize)]
pub struct Tournament {
    matches: Vec<Match>,
}

pub fn create_tournament() -> Result<Tournament> {
    let bots = get_bots();
    // Count from 1 to 30
    let num_bots = bots.len() as u32;
    let pow_two = 2_u32.pow(((num_bots as f32).log2()).ceil() as u32);
    let byes = pow_two - num_bots;

    let mut matches: Vec<Match> = vec![];

    let match_bots = &bots[0..(bots.len() - byes as usize)];
    let bye_bots = &bots[(bots.len() - byes as usize)..];

    for i in 0..(match_bots.len() - 1) {
        let bot1 = &match_bots[i];
        let bot2 = &match_bots[i + 1];
        let match_id = format!("{}-{}", bot1.name, bot2.name);
        let new_match = Match {
            id: match_id,
            tournament_round_text: "Round 1".to_string(),
            next_match_id: None,
            participants: vec![bot1.clone(), bot2.clone()],
            state: MatchState::NotStarted,
        };
        matches.push(new_match);
    }
    for i in 0..bye_bots.len() {
        let bot = &bye_bots[i];
        let match_id = format!("{}-bye", bot.name);
        let new_match = Match {
            id: match_id,
            tournament_round_text: "Round 1".to_string(),
            next_match_id: None,
            participants: vec![bot.clone()],
            state: MatchState::Bye,
        };
        matches.push(new_match);
    }
    let mut last_round_matches = matches;
    let mut all_matches: Vec<Match> = vec![];
    let mut round = 2;
    while last_round_matches.len() >= 2 {
        let mut new_matches: Vec<Match> = vec![];
        for i in 0..(last_round_matches.len() / 2) {
            let match1 = &last_round_matches[i * 2];
            let match2 = &last_round_matches[i * 2 + 1];
            let match_id = format!("{}-{}", match1.id, match2.id);
            let new_match = Match {
                id: match_id.clone(),
                tournament_round_text: format!("Round {}", round),
                next_match_id: None,
                participants: vec![],
                state: MatchState::NotStarted,
            };
            last_round_matches[i * 2].set_next_match_id(match_id.clone());
            last_round_matches[i * 2 + 1].set_next_match_id(match_id);
            new_matches.push(new_match);
        }
        all_matches.append(&mut last_round_matches);
        last_round_matches = new_matches;
        round += 1;
    }
    all_matches.append(&mut last_round_matches);
    return Ok(Tournament { matches: all_matches });
}