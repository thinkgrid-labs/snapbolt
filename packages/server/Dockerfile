# ── Build stage ───────────────────────────────────────────────────────────────
FROM rust:alpine AS builder

# musl-dev for static linking; no OpenSSL needed (reqwest uses rustls)
RUN apk add --no-cache musl-dev

WORKDIR /app

# Copy workspace manifests first to cache dependencies
COPY Cargo.toml Cargo.lock ./
COPY packages/core/Cargo.toml    packages/core/Cargo.toml
COPY packages/server/Cargo.toml  packages/server/Cargo.toml
COPY packages/cli/Cargo.toml     packages/cli/Cargo.toml

# Stub src files so `cargo fetch` / dependency compile succeeds
RUN mkdir -p packages/core/src packages/server/src packages/cli/src && \
    echo "pub fn stub() {}" > packages/core/src/lib.rs && \
    echo "fn main() {}"     > packages/server/src/main.rs && \
    echo "pub fn stub() {}" > packages/cli/src/lib.rs

RUN cargo build --release -p snapbolt-server && \
    rm -rf packages/core/src packages/server/src packages/cli/src

# Copy real source and rebuild only what changed
COPY packages/core/src   packages/core/src
COPY packages/server/src packages/server/src

RUN touch packages/server/src/main.rs && \
    cargo build --release -p snapbolt-server

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM alpine:3.20

RUN apk add --no-cache ca-certificates

COPY --from=builder /app/target/release/snapbolt-server /usr/local/bin/snapbolt-server

EXPOSE 3000

ENV PORT=3000

ENTRYPOINT ["snapbolt-server"]
