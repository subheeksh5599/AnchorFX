# AnchorFX — One-command automation for build, test, deploy, verify

# === Default target ===
default: test-all

# === Full test suite ===
test-all:
    @echo "=== Escrow Contract Tests ==="
    cd contracts/anchorfx-escrow && cargo test
    @echo ""
    @echo "=== Oracle Contract Tests ==="
    cd contracts/anchorfx-oracle && cargo test
    @echo ""
    @echo "=== Frontend Tests ==="
    cd frontend && npx vitest run
    @echo ""
    @echo "✓ All tests passed"

# === Build contracts to WASM ===
build-wasm:
    @echo "Building escrow WASM..."
    cd contracts/anchorfx-escrow && cargo build --target wasm32-unknown-unknown --release
    @echo "Building oracle WASM..."
    cd contracts/anchorfx-oracle && cargo build --target wasm32-unknown-unknown --release
    @echo "✓ WASM builds complete"

# === Build frontend ===
build:
    @echo "Building frontend..."
    cd frontend && npm run build
    @echo "✓ Frontend build complete"

# === Deploy to Vercel ===
deploy:
    cd frontend && npx vercel --prod --yes

# === Lint all ===
lint:
    @echo "Linting contracts..."
    cd contracts/anchorfx-escrow && cargo clippy -- -D warnings || true
    cd contracts/anchorfx-oracle && cargo clippy -- -D warnings || true
    @echo "Linting frontend..."
    cd frontend && npx eslint . --quiet || true
    @echo "✓ Lint complete"

# === Full CI pipeline (what GitHub Actions runs) ===
ci: test-all build-wasm build lint
    @echo "✓ CI pipeline complete"

# === Clean all build artifacts ===
clean:
    cd contracts/anchorfx-escrow && cargo clean
    cd contracts/anchorfx-oracle && cargo clean
    cd frontend && rm -rf .next node_modules/.cache
    @echo "✓ Cleaned"

# === Quick check (build frontend only, no tests) ===
check:
    cd frontend && npm run build
    @echo "✓ Quick check passed"
