# Snippy - a Rock-Paper-Scissors bot tournament server

This is a demonstration project for using WebAssembly to sandbox untrusted code with minimal overhead.

The site is designed to allow anyone to uploaded their own bot to play rock-paper-scissors in multiple different programming languages.
The bots are run in WebAssembly for sandboxing, and do not rely on OS-level sandboxing or separate processes.

## Local development

You'll need node, yarn and postgres installed.

To build the Rust-based sample bots, you'll also need the Rust development tools.

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

### Setup a database and run the server locally

The backend is a NodeJS Express server, the code is in the `server/` folder. The server should be run in a separate terminal while the client devserver is running.

Create a fresh postgres DB, create necessary tables and populate it with some sample bots.

**NOTE:** This will also create a database user called `snippyuser` with login and (insecure) password.
This is for local development only.

```sh
cd server/
createdb snippy
psql snippy < setup.sql
```

Create a file called `.env` in the `server` folder and populate it like this:

```
DATABASE_URL="postgres://snippyuser:snippy123@localhost:5432/snippy"
```

To build and run the server:

```
yarn
yarn build
yarn start
```

To automatically update the server whenever the files are changed run:

```
yarn dev
```
