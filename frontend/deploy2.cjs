const StellarSdk = require('@stellar/stellar-sdk');
const crypto = require('crypto');
const fs = require('fs');

const loadEnv = require('./lib/load-env.cjs');
const { publicKey, secretKey, keypair } = loadEnv();

const adminAddress = StellarSdk.Address.fromString(publicKey);

console.log("Account:", publicKey);

const wasm = fs.readFileSync("./public/wasm/anchorfx_escrow.wasm");
console.log("WASM size:", wasm.length, "bytes");
const wasmHash = crypto.createHash("sha256").update(wasm).digest();
console.log("WASM hash:", wasmHash.toString("hex"));

const rpc = new StellarSdk.rpc.Server("https://soroban-testnet.stellar.org", { allowHttp: true });
const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");

async function deploy() {
  const account = await horizon.loadAccount(publicKey);
  console.log("Balance:", account.balances.find(b => b.asset_type === "native")?.balance, "Seq:", account.sequence);

  // Step 1: Upload WASM
  console.log("Step 1: Uploading WASM...");
  const uploadTx = new StellarSdk.TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.uploadContractWasm({ wasm }))
    .setTimeout(60)
    .build();

  console.log("TX built, simulating...");
  let uploadPrep;
  try {
    uploadPrep = await rpc.prepareTransaction(uploadTx);
  } catch(e) {
    console.error("prepareTransaction failed:", e.message);
    console.error("Full:", e.response?.data ? JSON.stringify(e.response.data).slice(0,500) : "no data");
    return;
  }
  
  uploadPrep.sign(keypair);
  console.log("Sending...");
  const uploadResult = await rpc.sendTransaction(uploadPrep);
  console.log("Upload:", uploadResult.status, uploadResult.hash);
  if (uploadResult.status === "ERROR") {
    console.error("Upload FAILED:", JSON.stringify(uploadResult).slice(0,1000));
    return;
  }

  // Step 2: Create contract
  console.log("Step 2: Creating contract...");
  const salt = crypto.randomBytes(32);
  const createTx = new StellarSdk.TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.createCustomContract({
        wasmHash,
        address: adminAddress,
        salt,
        constructorArgs: [adminAddress.toScVal()],
      })
    )
    .setTimeout(60)
    .build();

  console.log("Simulating create...");
  const createPrep = await rpc.prepareTransaction(createTx);
  createPrep.sign(keypair);
  const createResult = await rpc.sendTransaction(createPrep);
  console.log("Create:", createResult.status, createResult.hash);
  if (createResult.status === "ERROR") {
    console.error("Create FAILED:", JSON.stringify(createResult).slice(0,1000));
    return;
  }

  console.log("\n=== DEPLOYED ===");
  console.log("TX:", createResult.hash);
}

deploy().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
