const StellarSdk = require('@stellar/stellar-sdk');
const crypto = require('crypto');
const fs = require('fs');
const zlib = require('zlib');

const loadEnv = require('./lib/load-env.cjs');
const { publicKey, secretKey, keypair } = loadEnv();

const adminAddress = StellarSdk.Address.fromString(publicKey);

const wasm = fs.readFileSync("./public/wasm/anchorfx_escrow.wasm");
const wasmHash = crypto.createHash("sha256").update(wasm).digest();

// Try multiple RPC endpoints
const RPCS = [
  "https://soroban-testnet.stellar.org",
  "https://rpc-futurenet.stellar.org",
];

async function tryDeploy(rpcUrl) {
  console.log("\nTrying RPC:", rpcUrl);
  const rpc = new StellarSdk.rpc.Server(rpcUrl, { allowHttp: true });
  const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
  const account = await horizon.loadAccount(publicKey);

  // Step 1: Upload WASM
  const uploadTx = new StellarSdk.TransactionBuilder(account, {
    fee: "200000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.uploadContractWasm({ wasm }))
    .setTimeout(60)
    .build();

  console.log("  Simulating upload...");
  try {
    const uploadPrep = await rpc.prepareTransaction(uploadTx);
    uploadPrep.sign(keypair);
    console.log("  Sending upload...");
    const result = await rpc.sendTransaction(uploadPrep);
    console.log("  Upload:", result.status, result.hash);
    if (result.status === "SUCCESS") return result;
    console.log("  Upload failed:", result.errorResultXdr || result.status);
  } catch(e) {
    console.log("  Error:", e.message?.slice(0,200));
  }
  return null;
}

async function main() {
  for (const rpcUrl of RPCS) {
    const r = await tryDeploy(rpcUrl);
    if (r) {
      console.log("\nSUCCESS!", r.hash);
      return;
    }
  }
  console.log("\nAll RPC endpoints failed");
}
main().catch(e => console.error(e.message));
