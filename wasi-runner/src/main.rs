use axum::{
    routing::{get, post},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json, Router,
};
use serde::Deserialize;
use tournament::{BotRunType, BotDetails};
use std::net::SocketAddr;

mod tournament;


#[tokio::main]
async fn main() {
    // initialize tracing
    tracing_subscriber::fmt::init();    

    // Can call init to pre-warm the wasm runtime but it slows down startup.
    tournament::init();

    // build our application with a route
    let app = Router::new()
        // `GET /` goes to `root`
        .route("/", get(root))
        .route("/api/test", post(test_bot));

    // run our app with hyper
    // `axum::Server` is a re-export of `hyper::Server`
    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    tracing::debug!("listening on {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

async fn root() -> &'static str {
    "Hello, World!"
}

#[derive(Deserialize)]
struct TestBotRequest {
    botname: String,
    botcode: String,
    run_type: BotRunType,
}

async fn test_bot(Json(payload): Json<TestBotRequest>) -> Response {
    let botname = payload.botname;
    let botcode = payload.botcode;

    let bot: BotDetails = BotDetails {
        run_type: payload.run_type,
        name: botname.clone(),
        code: botcode.clone(),
        wasm_path: "".to_string(),
    };

    let result = tournament::test_bot(&bot);
    match result {
        Ok(payload) => (StatusCode::OK, Json(payload)).into_response(),
        Err(e) => {
            println!("Error: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json("Unexpected error occurred".to_string())).into_response();
        }
    }
}
