// AnchorFX — Universal Deploy Script (testnet + mainnet)
// Usage: node deploy.cjs <SECRET_KEY> [--mainnet]
//
// Deploys oracle first, then escrow with correct init(admin, oracle) args.
// Uses Soroban RPC (not Horizon) for all contract operations.

const StellarSdk = require("@stellar/stellar-sdk");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const SECRET = process.argv[2];
if (!SECRET) {
  console.error("Usage: node deploy.cjs <SECRET_KEY> [--mainnet]");
  process.exit(1);
}

const isMainnet = process.argv.includes("--mainnet");
const NETWORK = isMainnet ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET;
const RPC_URL = isMainnet
  ? "https://mainnet.sorobanrpc.com"
  : "https://soroban-testnet.stellar.org";
const HORIZON_URL = isMainnet
  ? "https://horizon.stellar.org"
  : "https://horizon-testnet.stellar.org";
const EXPLORER = isMainnet
  ? "https://stellar.expert/explorer/public/tx/"
  : "https://stellar.expert/explorer/testnet/tx/";

console.log(`Network: ${isMainnet ? "MAINNET" : "TESTNET"}`);
console.log(`RPC: ${RPC_URL}`);

const keypair = StellarSdk.Keypair.fromSecret(SECRET);
const publicKey = keypair.publicKey();
console.log(`Deployer: ${publicKey}`);

const { Server: RpcServer } = require("@stellar/stellar-sdk/rpc");
const rpc = new RpcServer(RPC_URL, { allowHttp: false });
const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);

const ROOT = __dirname + "/..";
const ESCROW_WASM = path.join(ROOT, "contracts/anchorfx-escrow/target/wasm32-unknown-unknown/release/anchorfx_escrow.wasm");
const ORACLE_WASM = path.join(ROOT, "contracts/anchorfx-oracle/target/wasm32-unknown-unknown/release/anchorfx_oracle.wasm");

// ── helpers ──

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForTx(hash, label) {
  for (let i = 0; i < 30; i++) {
    await sleep(3000);
    const tx = await rpc.getTransaction(hash);
    if (tx.status === "SUCCESS") return tx;
    if (tx.status === "FAILED") {
      const err = tx.resultXdr ? Buffer.from(tx.resultXdr, "base64").toString("hex") : "unknown";
      throw new Error(`${label} failed: ${err}`);
    }
    process.stdout.write(".");
  }
  throw new Error(`${label} timed out`);
}

function extractContractId(txResult) {
  try {
    const addrObj = txResult.returnValue._value;
    if (addrObj._arm === "contractId" && Buffer.isBuffer(addrObj._value)) {
      return StellarSdk.StrKey.encodeContract(Buffer.from(addrObj._value));
    }
  } catch (e) {}
  return null;
}

async function deployContract(wasmPath, initArgs, label) {
  // Check WASM exists
  if (!fs.existsSync(wasmPath)) {
    throw new Error(`${label} WASM not found at ${wasmPath}. Run: cargo build --target wasm32-unknown-unknown --release`);
  }

  const wasmBuffer = fs.readFileSync(wasmPath);
  const wasmHash = crypto.createHash("sha256").update(wasmBuffer).digest();
  console.log(`\n[${label}] WASM: ${wasmBuffer.length} bytes`);

  // Step 1: Upload WASM
  const account = await horizon.loadAccount(publicKey);
  console.log(`[${label}] Balance: ${account.balances.find(b => b.asset_type === "native")?.balance} XLM`);

  const uploadTx = new StellarSdk.TransactionBuilder(account, {
    fee: isMainnet ? "100000" : "100000",
    networkPassphrase: NETWORK,
  })
    .addOperation(StellarSdk.Operation.uploadContractWasm({ wasm: wasmBuffer }))
    .setTimeout(60)
    .build();

  const uploadSim = await rpc.simulateTransaction(uploadTx);
  const uploadPrep = await rpc.prepareTransaction(uploadTx, uploadSim);
  uploadPrep.sign(keypair);
  const uploadRes = await rpc.sendTransaction(uploadPrep);
  if (uploadRes.status === "ERROR") throw new Error(`${label} upload failed: ${JSON.stringify(uploadRes)}`);
  console.log(`[${label}] Upload TX: ${uploadRes.hash}`);
  await waitForTx(uploadRes.hash, `${label} upload`);

  // Step 2: Create contract instance
  const account2 = await horizon.loadAccount(publicKey);
  const salt = crypto.randomBytes(32);
  const deployer = StellarSdk.Address.fromString(publicKey);

  const createTx = new StellarSdk.TransactionBuilder(account2, {
    fee: isMainnet ? "100000" : "100000",
    networkPassphrase: NETWORK,
  })
    .addOperation(
      StellarSdk.Operation.createCustomContract({ wasmHash, salt, address: deployer })
    )
    .setTimeout(60)
    .build();

  const createSim = await rpc.simulateTransaction(createTx);
  const createPrep = await rpc.prepareTransaction(createTx, createSim);
  createPrep.sign(keypair);
  const createRes = await rpc.sendTransaction(createPrep);
  if (createRes.status === "ERROR") throw new Error(`${label} deploy failed`);
  console.log(`[${label}] Deploy TX: ${createRes.hash}`);

  const txResult = await waitForTx(createRes.hash, `${label} deploy`);
  const contractId = extractContractId(txResult);
  if (!contractId) throw new Error(`${label} could not extract contract ID`);
  console.log(`[${label}] Contract: ${contractId}`);

  // Step 3: Initialize
  if (initArgs && initArgs.length > 0) {
    const account3 = await horizon.loadAccount(publicKey);
    const initTx = new StellarSdk.TransactionBuilder(account3, {
      fee: isMainnet ? "100000" : "100000",
      networkPassphrase: NETWORK,
    })
      .addOperation(
        StellarSdk.Operation.invokeContractFunction({
          contract: contractId,
          function: "init",
          args: initArgs,
        })
      )
      .setTimeout(60)
      .build();

    const initSim = await rpc.simulateTransaction(initTx);
    const initPrep = await rpc.prepareTransaction(initTx, initSim);
    initPrep.sign(keypair);
    const initRes = await rpc.sendTransaction(initPrep);
    console.log(`[${label}] Init TX: ${initRes.hash}`);
    await waitForTx(initRes.hash, `${label} init`);
    console.log(`[${label}] Initialized`);
  }

  return { contractId, deployHash: createRes.hash };
}

// ── main ──

async function main() {
  // Verify balance
  const account = await horizon.loadAccount(publicKey);
  const balance = account.balances.find(b => b.asset_type === "native")?.balance;
  console.log(`\nBalance: ${balance} XLM`);
  if (isMainnet && parseFloat(balance) < 10) {
    console.warn("WARNING: Low balance for mainnet deploy. Need ~10 XLM minimum.");
  }

  const adminScVal = StellarSdk.Address.fromString(publicKey).toScVal();

  // 1. Deploy oracle
  const oracle = await deployContract(ORACLE_WASM, [adminScVal], "Oracle");

  // 2. Deploy escrow (depends on oracle)
  const oracleScVal = StellarSdk.Address.fromString(oracle.contractId).toScVal();
  const escrow = await deployContract(ESCROW_WASM, [adminScVal, oracleScVal], "Escrow");

  // ── summary ──
  console.log("\n" + "=".repeat(56));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(56));
  console.log(`Network: ${isMainnet ? "MAINNET" : "TESTNET"}`);
  console.log(`Oracle:  ${oracle.contractId}`);
  console.log(`Escrow:  ${escrow.contractId}`);
  console.log(`Admin:   ${publicKey}`);
  console.log("=".repeat(56));
  console.log(`\nExplorer links:`);
  console.log(`Oracle deploy: ${EXPLORER}${oracle.deployHash}`);
  console.log(`Escrow deploy: ${EXPLORER}${escrow.deployHash}`);

  // Save
  const envFile = isMainnet ? ".env.mainnet.contracts" : ".env.testnet.contracts";
  fs.writeFileSync(
    path.join(__dirname, envFile),
    `# ${isMainnet ? "Mainnet" : "Testnet"} — deployed ${new Date().toISOString()}\n` +
    `NEXT_PUBLIC_ORACLE_CONTRACT_ID=${oracle.contractId}\n` +
    `CONTRACT_ID=${escrow.contractId}\n` +
    `NEXT_PUBLIC_CONTRACT_ID=${escrow.contractId}\n` +
    `NEXT_PUBLIC_ADMIN_PUBLIC_KEY=${publicKey}\n` +
    `ADMIN_SECRET_KEY=${SECRET}\n`
  );
  console.log(`\nSaved to ${envFile}`);
}

main().catch(e => {
  console.error("\n" + "=".repeat(56));
  console.error("DEPLOY FAILED");
  console.error("=".repeat(56));
  console.error(e.message || e);
  process.exit(1);
});
