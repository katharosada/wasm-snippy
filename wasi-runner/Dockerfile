FROM rust:alpine3.17 AS builder

RUN apk add libressl-dev musl-dev

WORKDIR /app
COPY ./ .
RUN cargo build --release

FROM alpine:3.17
EXPOSE 3001
WORKDIR /app
COPY --from=builder /app/database_cert.pem ./
COPY --from=builder /app/target/release/wasi-runner ./
COPY --from=builder /app/*.wasm ./
CMD ["./wasi-runner"]