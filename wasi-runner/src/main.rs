use std::env;
use std::sync::Arc;

use axum::{
    body::Bytes,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Multipart, State,
    },
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use std::{fs, net::SocketAddr, path::PathBuf, time::Duration};
use tower_http::{
    services::ServeDir,
    trace::{DefaultMakeSpan, TraceLayer},
};

use tokio::sync::broadcast;
use tokio::sync::RwLock;
use tokio::time;
use tokio_postgres::NoTls;
use tokio_stream::wrappers::IntervalStream;

use anyhow::Result;

//allows to split the websocket stream into separate TX and RX branches
use deadpool_postgres::{Config, ManagerConfig, Pool, RecyclingMethod, Runtime};
use dotenvy::dotenv;
use futures::{sink::SinkExt, stream::StreamExt};
use native_tls::{Certificate, TlsConnector};
use postgres_native_tls::MakeTlsConnector;

use tournament::{BotDetails, BotRunType, SPROption, Tournament};

mod tournament;

pub type ConnectionPool = Pool;

struct SharedState {
    tournament: RwLock<Tournament>,
    broadcast_channel: broadcast::Sender<String>,
    db_pool: ConnectionPool,
    bucket_name: String,
}

const TOURNAMENT_INTERVAL: u64 = 30;

#[tokio::main]
async fn main() {
    // Load .env file
    dotenv().ok();

    let assets_dir: PathBuf = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("assets");

    let db_host = env::var("DB_HOST").unwrap_or("localhost".to_string());
    let db_port: u16 = env::var("DB_PORT")
        .unwrap_or("5432".to_string())
        .parse()
        .expect("DB_PORT must be a valid integer.");
    let db_name = env::var("DB_NAME").unwrap_or("snippy".to_string());
    let db_user = env::var("DB_USER").unwrap_or("snippyuser".to_string());
    let db_password = env::var("DB_PASSWORD").unwrap_or("".to_string());
    let bucket_name = env::var("S3_BUCKET_NAME").expect("S3_BUCKET_NAME is required.");

    let mut config = Config::new();
    config.host = Some(db_host);
    config.port = Some(db_port);
    config.dbname = Some(db_name);
    config.user = Some(db_user);
    config.password = Some(db_password);
    config.manager = Some(ManagerConfig {
        recycling_method: RecyclingMethod::Fast,
    });

    let database_cert_path =
        env::var("DATABASE_CERT_PATH").unwrap_or("database_cert.pem".to_string());

    let cert_read = fs::read(&database_cert_path);
    let db_pool: ConnectionPool = match cert_read {
        Ok(cert) => {
            let cert = Certificate::from_pem(&cert).expect("Reading certificate failed.");
            let connector = TlsConnector::builder()
                .add_root_certificate(cert)
                .danger_accept_invalid_hostnames(true)
                .build()
                .expect("Failed to build TLS connector.");
            let connector = MakeTlsConnector::new(connector);
            config
                .create_pool(Some(Runtime::Tokio1), connector)
                .unwrap()
        }
        Err(e) => {
            println!("Warning: Cannot read database certificate at path {} ({}). Defaulting to not using TLS.", database_cert_path, e);
            config.create_pool(Some(Runtime::Tokio1), NoTls).unwrap()
        }
    };

    let (tx, _rx) = broadcast::channel(200);
    let shared_state: Arc<SharedState> = Arc::new(SharedState {
        tournament: RwLock::new(Tournament::new()),
        broadcast_channel: tx,
        db_pool,
        bucket_name,
    });

    // build our application with a route
    let app = Router::new()
        .fallback_service(ServeDir::new(assets_dir).append_index_html_on_directories(true))
        // `GET /` goes to `root`
        .route("/", get(root))
        .route("/api/ws", get(ws_handler))
        .route("/health", get(health))
        .route("/api/test", post(test_bot))
        .route("/api/bot", post(post_bot))
        .route("/api/upload_wasm", post(upload_wasm))
        .with_state(shared_state.clone())
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::default().include_headers(true)),
        );

    // run our app with hyper
    // `axum::Server` is a re-export of `hyper::Server`
    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    tracing::debug!("listening on {}", addr);

    tokio::select! {
        res = axum::Server::bind(&addr)
            .serve(app.into_make_service_with_connect_info::<SocketAddr>()) => {
            match res {
                Ok(_) => {},
                Err(e) => {
                    println!("Error: {}", e);
                }
            }
        },
        res = start_background_tournaments(shared_state) => {
            match res {
                Ok(_) => {},
                Err(e) => {
                    println!("Error: {}", e);
                }
            }
        }
    }
}

async fn start_background_tournaments(shared_state: Arc<SharedState>) -> Result<()> {
    let mut stream = IntervalStream::new(time::interval(Duration::from_secs(TOURNAMENT_INTERVAL)));

    while let Some(_ts) = stream.next().await {
        println!("Starting new tournament.");
        let result =
            tournament::create_tournament(&shared_state.db_pool, &shared_state.bucket_name).await;
        match result {
            Ok(payload) => {
                let mut tournament = shared_state.tournament.write().await;
                let tournament_json = serde_json::to_string(&payload.clone()).unwrap();
                shared_state
                    .broadcast_channel
                    .send(tournament_json)
                    .unwrap();
                *tournament = payload;

                let sender = shared_state.broadcast_channel.clone();
                let result2 = (*tournament).run(sender, &shared_state.db_pool).await;
                match result2 {
                    Ok(_) => {}
                    Err(e) => return Err(e.into()),
                }
            }
            Err(e) => {
                println!("Error: {}", e);
                return Err(e.into());
            }
        }
        println!("Tournament done.");
    }

    return Ok(());
}

async fn root() -> &'static str {
    "Hello, World!"
}

async fn health() -> &'static str {
    "Ok"
}

#[derive(Deserialize)]
struct CreateBotRequest {
    name: String,
    botcode: String,
    run_type: BotRunType,
}

async fn post_bot(
    State(shared_state): State<Arc<SharedState>>,
    Json(payload): Json<CreateBotRequest>,
) -> Response {
    let botname = payload.name;
    let botcode = payload.botcode;

    let mut bot: BotDetails = BotDetails {
        id: None,
        run_type: payload.run_type,
        name: botname.clone(),
        code: botcode.clone(),
        wasm_path: "".to_string(),
        wasm_bytes: None,
    };

    if botname.len() > 30 {
        return (
            StatusCode::BAD_REQUEST,
            Json("Bot name is limited to 30 characters."),
        )
            .into_response();
    }
    if botname.len() == 0 {
        return (StatusCode::BAD_REQUEST, Json("Bot name cannot be empty.")).into_response();
    }

    let result = tournament::add_bot(
        &shared_state.db_pool,
        &shared_state.bucket_name,
        &mut bot,
        true,
    )
    .await;
    return match result {
        Ok(1) => (StatusCode::OK, Json("success!")).into_response(),
        Ok(_) => (StatusCode::BAD_REQUEST, Json("Bot name is already in use.")).into_response(),
        Err(e) => {
            println!("Error: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json("Unexpected error occurred".to_string()),
            )
                .into_response();
        }
    };
}

#[derive(Deserialize)]
struct TestBotRequest {
    botcode: String,
    stdin: Option<String>,
    run_type: BotRunType,
}

async fn test_bot(Json(payload): Json<TestBotRequest>) -> Response {
    let botcode = payload.botcode;

    let bot: BotDetails = BotDetails {
        id: None,
        run_type: payload.run_type,
        name: "test".to_string(),
        code: botcode.clone(),
        wasm_path: "".to_string(),
        wasm_bytes: None,
    };

    let result = tournament::test_bot(&bot, payload.stdin).await;
    return (StatusCode::OK, Json(result)).into_response();
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(shared_state): State<Arc<SharedState>>,
) -> impl IntoResponse {
    // finalize the upgrade process by returning upgrade callback.
    // we can customize the callback by sending additional info such as address.
    ws.on_upgrade(move |socket| handle_socket(socket, shared_state))
}

/// Actual websocket statemachine (one will be spawned per connection)
async fn handle_socket(socket: WebSocket, state: Arc<SharedState>) {
    // By splitting socket we can send and receive at the same time. In this example we will send
    // unsolicited messages to client based on some sort of server's internal event (i.e .timer).
    let (mut sender, mut receiver) = socket.split();

    // Start recieveing updates
    let mut update_reciever = state.broadcast_channel.subscribe();

    let tournament_json = match serde_json::to_string(&state.tournament.read().await.clone()) {
        Ok(json) => json,
        Err(e) => {
            println!("Error: {}", e);
            return;
        }
    };

    // Send the tournament state to the client
    if sender.send(Message::Text(tournament_json)).await.is_err() {
        return;
    }

    let mut send_task = tokio::spawn(async move {
        // Send updates to the client too.
        while let Ok(msg) = update_reciever.recv().await {
            // In any websocket error, break loop.
            if sender.send(Message::Text(msg)).await.is_err() {
                println!("Error for websocket client, breaking.");
                break;
            }
        }
    });

    let mut recv_task = tokio::spawn(async move {
        while let Some(message) = receiver.next().await {
            match message {
                Ok(Message::Text(text)) => text,
                Ok(Message::Close(_)) => {
                    println!("Received close message from websocket client.");
                    break;
                }
                Err(e) => {
                    println!("Error: {}", e);
                    break;
                }
                _ => continue,
            };
        }
    });

    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };
}

async fn upload_wasm(
    State(shared_state): State<Arc<SharedState>>,
    mut form_data: Multipart,
) -> Response {
    let mut botname = "".to_string();
    let mut data: Bytes = Bytes::from("".to_string());
    while let Some(field) = form_data.next_field().await.unwrap() {
        let field_name = field.name().unwrap_or_default().to_string();
        if field_name == "botname".to_string() {
            botname = field.text().await.unwrap();
        } else if field_name == "wasm_file".to_string() {
            data = field.bytes().await.unwrap_or_default();
        }
    }

    if data.len() == 0 {
        return (StatusCode::BAD_REQUEST, Json("No file uploaded.")).into_response();
    }
    if botname.is_empty() {
        return (StatusCode::BAD_REQUEST, Json("No bot name provided.")).into_response();
    }

    let data_vec: Vec<u8> = data.to_vec();

    println!("File upload size: {}", data.len());

    let mut bot: BotDetails = BotDetails {
        id: None,
        run_type: BotRunType::Wasi,
        name: botname.clone(),
        code: "".to_string(),
        wasm_path: "".to_string(),
        wasm_bytes: Some(data_vec),
    };

    let bot_run_result = tournament::test_bot(&bot, None).await;
    match bot_run_result.result {
        SPROption::Invalid => {
            let reason = bot_run_result
                .invalid_reason
                .unwrap_or("Unknown reason".to_string());
            return (
                StatusCode::BAD_REQUEST,
                Json(format!("Bot did not pass a test run. {}", reason)),
            )
                .into_response();
        }
        _ => (),
    }

    match tournament::add_bot(
        &shared_state.db_pool,
        &shared_state.bucket_name,
        &mut bot,
        false,
    )
    .await
    {
        Ok(1) => {
            return (StatusCode::OK, Json("success!")).into_response();
        }
        Ok(_) => {
            return (StatusCode::BAD_REQUEST, Json("Bot name is already in use.")).into_response();
        }
        Err(e) => {
            println!("Error: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json("Unexpected error occurred".to_string()),
            )
                .into_response();
        }
    }
}
