# Snippy - a Rock-Paper-Scissors bot tournament server

This is a demonstration project for using WebAssembly to sandbox untrusted code with minimal overhead.

The site is designed to allow anyone to uploaded their own bot to play rock-paper-scissors in multiple different programming languages.
The bots are run in WebAssembly for sandboxing, and do not rely on OS-level sandboxing or separate processes.

## Local development

You'll need node and yarn for the frontend client code. See: [Installing Node](https://nodejs.org/en/download) and [Installing Yarn](https://yarnpkg.com/getting-started/install)

For the backend server, you'll need a Rust toolchain and Postgres installed. See [Installing Rust and Cargo](https://doc.rust-lang.org/cargo/getting-started/installation.html) and [Installing Postgres](https://www.postgresql.org/download/)

### Client (Web UI)

The UI code is stored in the `client` folder. It's a fairly standard React/TypeScript app.

Install dependencies:

```
cd client
yarn
```

To run the development server:
```
yarn start
```

This should automatically open a browser window at `http://localhost:3000/`.

The client code isn't very useful without the server and database behind it.
The client devserver is configured to proxy to `localhost:3001` for server requests (the default) so you can develop the client and server at the same time, despite the client running as a separate webserver.

### Setup a database

Create a fresh postgres DB called `snippy`

```
createdb snippy
```

Then there's a script to create the necessary tables and populate it with some sample bots.

**NOTE:** This will also create a database user called `snippyuser` with login and (insecure) password.
This is for local development only.

```sh
psql snippy < ./wasi-runner/local_setup.sql
```

In the `wasi-runner` folder, create a file called `.env` with the following contents.

```
DB_PASSWORD="snippy123"
```

Note: You can also set `DB_HOST`, `DB_PORT` and `DB_USER` but they default to `localhost:5432` and `snippyuser` if not specified.

### Build and run the server

In a separate terminal to the client devserver, go to the `wasi-runner` folder and run `cargo run`.

```
cd wasi-runner
cargo run
```

This will start the server on port 3001, the client devserver is set up to proxy API calls to this port.

The server may take about 15 seconds (or more depending on your machine) to start up because it loads the wasm engine and modules before starting the http server.

Check that the server is running correctly by visiting http://localhost:3001/ in the browser. If that loads, then the UI should also be able to run bots and tournaments via the API.

### Use dockerized version to run locally

Run:
```sh
docker compose -f docker-compose.yaml up
```

If there were changes after the initial build, you can rebuild the image with:
```sh
docker compose -f docker-compose.yaml up --build
```
