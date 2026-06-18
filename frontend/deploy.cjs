const StellarSdk = require('@stellar/stellar-sdk');
const crypto = require('crypto');
const fs = require('fs');

const loadEnv = require('./lib/load-env.cjs');
const { publicKey, secretKey, keypair } = loadEnv();

const adminAddress = StellarSdk.Address.fromString(publicKey);

const rpc = new StellarSdk.rpc.Server("https://soroban-testnet.stellar.org", { allowHttp: true });
const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");

async function deploy() {
  const account = await horizon.loadAccount(publicKey);
  const bal = account.balances.find(b => b.asset_type === "native");
  console.log("Balance:", bal?.balance, "XLM");

  // Step 1: Upload WASM
  console.log("Step 1: Uploading WASM...");
  const uploadTx = new StellarSdk.TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.uploadContractWasm({ wasm }))
    .setTimeout(60)
    .build();

  const uploadPrep = await rpc.prepareTransaction(uploadTx);
  uploadPrep.sign(keypair);
  const uploadResult = await rpc.sendTransaction(uploadPrep);
  console.log("Upload status:", uploadResult.status, "hash:", uploadResult.hash);

  if (uploadResult.status === "ERROR") {
    console.error("Upload FAILED:", JSON.stringify(uploadResult));
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

  const createPrep = await rpc.prepareTransaction(createTx);
  createPrep.sign(keypair);
  const createResult = await rpc.sendTransaction(createPrep);
  console.log("Create status:", createResult.status, "hash:", createResult.hash);

  if (createResult.status === "ERROR") {
    console.error("Create FAILED:", JSON.stringify(createResult));
    return;
  }

  console.log("\n=== CONTRACT DEPLOYED ===");
  console.log("Create TX Hash:", createResult.hash);
  console.log("Explorer: https://stellar.expert/explorer/testnet/tx/" + createResult.hash);
}

deploy().catch(e => { console.error("Error:", e.message || e); process.exit(1); });
