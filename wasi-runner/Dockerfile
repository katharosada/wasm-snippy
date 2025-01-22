FROM rust:1.84.0-alpine AS builder

RUN apk add libressl-dev musl-dev

WORKDIR /app
COPY ./ .
RUN cargo build --release

FROM alpine:3.20
EXPOSE 3001
WORKDIR /app
COPY --from=builder /app/target/release/wasi-runner ./
COPY --from=builder /app/*.wasm /app/database_cert*.pem ./
CMD ["./wasi-runner"]