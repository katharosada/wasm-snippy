use std::env;
use std::fs;
use std::str;
use std::path::Path;
use std::collections::HashMap;
use rand::Rng;
use rand::seq::SliceRandom;
use tokio::sync::broadcast::Sender;
use wasmtime::*;
use wasmtime_wasi::sync::WasiCtxBuilder;
use wasi_common::pipe::ReadPipe;
use wasi_common::pipe::WritePipe;
use std::time::Instant;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};

use crate::ConnectionPool;


#[derive(Serialize, Clone, PartialEq, Eq)]
pub enum SPROption {
    Scissors = 0,
    Paper,
    Rock,
    Invalid
}

impl SPROption {
    fn beats(&self, other: &SPROption) -> bool {
        match self {
            SPROption::Scissors => match other {
                SPROption::Paper => true,
                SPROption::Invalid => true,
                _ => false
            },
            SPROption::Paper => match other {
                SPROption::Rock => true,
                SPROption::Invalid => true,
                _ => false
            },
            SPROption::Rock => match other {
                SPROption::Scissors => true,
                SPROption::Invalid => true,
                _ => false
            },
            _ => false
        }
    }
}

#[derive(Clone, Debug)]
#[derive(Deserialize, Serialize)]
pub enum BotRunType {
    Wasi = 1,
    Python,
}

#[derive(Clone, Serialize, Debug)]
pub struct BotDetails {
    pub id: Option<i32>,
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
    history: Vec<SPROption>,
}

fn generate_test_input(bot_name: &String, opponent_name: &String, history: &Vec<SPROption>) -> String {
    let input = BotRunInput {
        botname: bot_name.clone(),
        opponent: opponent_name.clone(),
        round: history.len() as u32,
        history: history.clone(),
    };

    serde_json::to_string(&input).unwrap()
}

// This one is syncrhonous because it's intended to be run in a blocking thread.
pub fn run_bot(bot_details: &BotDetails, opponent_name: &String, history: &Vec<SPROption>) -> Result<BotRunResult> {
    let input = generate_test_input(&bot_details.name, opponent_name, &history);
    match bot_details.run_type {
        BotRunType::Wasi => {
            return run_wasi_bot(&bot_details, input);
        },
        BotRunType::Python => {
            return run_python_bot(&bot_details, input);
        }
    }
}

pub async fn test_bot(bot_details: &BotDetails) -> Result<BotRunResult> {
    let bot_details = bot_details.clone();
    let join = tokio::task::spawn_blocking(move || {
        let test_history = vec![SPROption::Rock, SPROption::Scissors];
        let test_opponent = "testbot".to_string();
        let input = generate_test_input(&bot_details.name, &test_opponent, &test_history);
        match bot_details.run_type {
            BotRunType::Wasi => {
                return run_wasi_bot(&bot_details, input);
            },
            BotRunType::Python => {
                return run_python_bot(&bot_details, input);
            }
        }
    });
    return join.await?;
}

pub async fn add_bot(db_pool: &ConnectionPool, bot_details: &BotDetails) -> Result<u64> {
    test_bot(&bot_details).await?;

    let conn = db_pool.get().await?;
    let stmt = conn.prepare("INSERT INTO bots (name, script_contents, run_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING").await?;
    let run_type: i32 = match bot_details.run_type {
        BotRunType::Wasi => 1,
        BotRunType::Python => 2
    };
    let count = conn.execute(&stmt, &[&bot_details.name, &bot_details.code, &run_type]).await?;
    return Ok(count);
}

fn run_wasi_bot(bot_details: &BotDetails, input: String) -> Result<BotRunResult> {
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
    match last_line.to_lowercase().as_str() {
        "scissors" => SPROption::Scissors,
        "paper" => SPROption::Paper,
        "rock" => SPROption::Rock,
        _ => SPROption::Invalid
    }
}

fn run_python_bot(bot_details: &BotDetails, input: String) -> Result<BotRunResult> {
    let mut linker = Linker::new(&WASM_RUNTIME.engine);
    wasmtime_wasi::add_to_linker(&mut linker, |s| s)?;

    // Fake args
    let args: &[String] = &["python".to_string(), "main.py".to_string()];

    let stdin = ReadPipe::from(input.clone());
    let stdout = WritePipe::new_in_memory();
    let stderr = WritePipe::new_in_memory();

    let temp_dir_path = env::temp_dir();
    let temp_dir = fs::File::open(temp_dir_path.clone())?;
    let main_py_path = temp_dir_path.join("main.py");
    fs::write(main_py_path, bot_details.code.as_bytes())?;

    let root_dir = wasmtime_wasi::sync::Dir::from_std_file(temp_dir);
    let root_dir_internal_path = Path::new("/");

    let wasi = WasiCtxBuilder::new()
        .args(&args)?
        .stdin(Box::new(stdin))
        .stdout(Box::new(stdout.clone()))
        .stderr(Box::new(stderr.clone()))
        .preopened_dir(root_dir, root_dir_internal_path)?
        .build();

    let mut store = Store::new(&WASM_RUNTIME.engine, wasi);
    store.add_fuel(1_000_000_000)?;

    linker.module(&mut store, "", &WASM_RUNTIME.python_module)?;
    let start = Instant::now();
    let result = linker
        .get_default(&mut store, "")?
        .typed::<(), ()>(&store)?
        .call(&mut store, ());

    let duration = start.elapsed();
    println!("Wasm stopped after {}s", duration.as_secs_f32());
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


async fn get_bots(db_pool: &ConnectionPool) -> Result<Vec<BotDetails>> {
    let conn = db_pool.get().await?;
    let stmt = conn.prepare("SELECT id, name, script_contents, run_type FROM bots").await?;

    let rows = conn.query(&stmt, &[]).await?;
    let bots: Vec<BotDetails> = rows.iter().map(|row| {
        let id: i32 = row.get(0);
        let name: String = row.get(1);
        let script_contents: String = row.get(2);
        let run_type: i32 = row.get(3);
        let run_type = match run_type {
            1 => BotRunType::Wasi,
            2 => BotRunType::Python,
            _ => BotRunType::Python
        };
        BotDetails {
            id: Some(id),
            run_type,
            name,
            code: script_contents,
            wasm_path: "".to_string()
        }
    }).collect();
    return Ok(bots);
}

#[derive(Clone, Serialize, Eq, PartialEq)]
pub enum MatchState {
    NotStarted,
    Bye,
    InProgress,
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
pub struct ParticipantOutcome {
    name: String,
    moves: Vec<SPROption>,
    winner: bool
}

#[derive(Clone, Serialize)]
pub struct MatchOutcome {
    match_id: String,
    state: MatchState,
    note: Option<String>,
    winner: usize,
    participants: Vec<ParticipantOutcome>,
}

#[derive(Clone, Serialize)]
pub struct Tournament {
    starting_matches: Vec<Match>,
    match_updates: Vec<MatchOutcome>,
}

impl Tournament {
    pub fn new() -> Tournament {
        Tournament {
            starting_matches: vec![],
            match_updates: vec![]
        }
    }

    pub async fn run(&mut self, sender: Sender<String>) -> Result<()> {
        let mut match_participants: HashMap<String, Vec<BotDetails>> = self.starting_matches
            .iter().map(|m| (m.id.clone(), m.participants.clone())).collect();

        for this_match in &self.starting_matches {
            let participant_outcomes: Vec<ParticipantOutcome> = match_participants.get(&this_match.id).unwrap().iter().map(|p| ParticipantOutcome {
                name: p.name.clone(),
                moves: vec![],
                winner: false
            }).collect();
            let in_progress_match_out = MatchOutcome {
                match_id: this_match.id.clone(),
                state: MatchState::InProgress,
                winner: 0,
                note: None,
                participants: participant_outcomes.clone()
            };
            sender.send(serde_json::to_string(&in_progress_match_out).unwrap()).unwrap();
            let mut winner_bot = match_participants.get(&this_match.id).unwrap()[0].clone();
            if this_match.state == MatchState::Bye {
                let match_out = MatchOutcome {
                    match_id: this_match.id.clone(),
                    state: MatchState::Bye,
                    winner: 0,
                    note: Some("Bye".to_string()),
                    participants: participant_outcomes
                };
                sender.send(serde_json::to_string(&match_out).unwrap()).unwrap();
                self.match_updates.push(match_out);
            } else {
                let participants = match_participants.get(&this_match.id).unwrap();
                let match_outcome = run_match(
                    &this_match.id, &participants[0], &participants[1]).await?;
                winner_bot = participants[match_outcome.winner as usize].clone();
                sender.send(serde_json::to_string(&match_outcome).unwrap()).unwrap();
                self.match_updates.push(match_outcome.clone());
            }
            // Add winner to participants for next match.
            match &this_match.next_match_id {
                Some(next_match_id) => {
                    match_participants.get_mut(next_match_id).unwrap().push(winner_bot);
                },
                None => {
                    // This is the final match
                    println!("Winner: {}", winner_bot.name);
                }
            }
        }
        return Ok(())
    }
}

async fn run_match(match_id: &String, bot1: &BotDetails, bot2: &BotDetails) -> Result<MatchOutcome> {
    let match_id = match_id.clone();
    let bot1 = bot1.clone();
    let bot2 = bot2.clone();

    let join: tokio::task::JoinHandle<std::prelude::v1::Result<MatchOutcome, Error>> = tokio::task::spawn_blocking(move || {

        let mut bot1_moves: Vec<SPROption> = vec![];
        let mut bot2_moves: Vec<SPROption> = vec![];

        let mut winner_bot: Option<usize> = None;
        for _i in 0..5 {
            // TODO: Generate stdin input and stop using the test function.
            let bot1_result = run_bot(&bot1, &bot2.name,&bot1_moves)?;
            let bot2_result = run_bot(&bot2, &bot1.name, &bot1_moves)?;
            let bot1_play = bot1_result.result;
            let bot2_play = bot2_result.result;
            bot1_moves.push(bot1_play.clone());
            bot2_moves.push(bot2_play.clone());
            if bot1_play == bot2_play {
                // Both invalid, no one wins.
                if bot1_play == SPROption::Invalid {
                    break;
                }
                continue;
            } else if bot1_play == SPROption::Invalid {
                winner_bot = Some(1);
                break
            } else if bot1_play.beats(&bot2_play) {
                winner_bot = Some(0);
                break
            } else {
                winner_bot = Some(1);
                break
            }
        }

        let mut note: Option<String> = None;
        let winner_bot = match winner_bot {
            Some(winner_bot) => winner_bot,
            None => {
                note = Some("5x Draw. Winner chosen by coin toss.".to_string());
                // 5 rounds resulted in a draw
                // Choose random winner - number 0 or 1
                let mut rng = rand::thread_rng();
                rng.gen_range(0..2)
            }
        };

        let participant_outcomes = vec![
            ParticipantOutcome {
                name: bot1.name.clone(),
                moves: bot1_moves.clone(),
                winner: winner_bot == 0
            },
            ParticipantOutcome {
                name: bot2.name.clone(),
                moves: bot2_moves.clone(),
                winner: winner_bot == 1
            }
        ];

        return Ok(MatchOutcome {
            match_id: match_id.clone(),
            state: MatchState::Finished,
            winner: winner_bot,
            note,
            participants: participant_outcomes
        })
    });
    return join.await?;
}

pub async fn create_tournament(db_pool: &ConnectionPool) -> Result<Tournament> {
    let mut bots = get_bots(db_pool).await?;
    bots.shuffle(&mut rand::thread_rng());

    let num_bots = bots.len() as u32;
    let pow_two = 2_u32.pow(((num_bots as f32).log2()).ceil() as u32);
    let byes = pow_two - num_bots;

    let mut matches: Vec<Match> = vec![];

    let match_bots = &bots[0..(bots.len() - byes as usize)];
    let bye_bots = &bots[(bots.len() - byes as usize)..];

    // Create first round matches (pairs)
    for i in (0..(match_bots.len() - 1)).step_by(2) {
        let bot1 = &match_bots[i];
        let bot2 = &match_bots[i + 1];
        let match_id = format!("{}-{}", bot1.name, bot2.name);
        let new_match = Match {
            id: match_id,
            tournament_round_text: "1".to_string(),
            next_match_id: None,
            participants: vec![bot1.clone(), bot2.clone()],
            state: MatchState::NotStarted,
        };
        matches.push(new_match);
    }

    // Create 'bye' matches.
    for i in 0..bye_bots.len() {
        let bot = &bye_bots[i];
        let match_id = format!("{}-bye", bot.name);
        let new_match = Match {
            id: match_id,
            tournament_round_text: "1".to_string(),
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
                tournament_round_text: round.to_string(),
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
    return Ok(Tournament { starting_matches: all_matches, match_updates: vec![] });
}