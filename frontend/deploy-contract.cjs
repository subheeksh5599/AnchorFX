const StellarSdk = require("@stellar/stellar-sdk");
const fs = require("fs");
const crypto = require("crypto");

const SECRET = process.argv[2];
if (!SECRET) {
  console.error("Usage: node deploy-contract.cjs <SECRET_KEY>");
  process.exit(1);
}

const keypair = StellarSdk.Keypair.fromSecret(SECRET);
const publicKey = keypair.publicKey();
console.log("Deploying from:", publicKey);

const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
const { Server: RpcServer } = require("@stellar/stellar-sdk/rpc");
const rpc = new RpcServer("https://soroban-testnet.stellar.org", { allowHttp: false });

const WASM_PATH = __dirname + "/../contracts/anchorfx-escrow/target/wasm32-unknown-unknown/release/anchorfx_escrow.wasm";

async function main() {
  const wasmBuffer = fs.readFileSync(WASM_PATH);
  const wasmHash = crypto.createHash("sha256").update(wasmBuffer).digest();

  const account = await horizon.loadAccount(publicKey);
  console.log("XLM Balance:", account.balances.find((b) => b.asset_type === "native")?.balance);

  // Step 1: Upload WASM
  console.log("\n--- Uploading WASM ---");
  const uploadTx = new StellarSdk.TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.uploadContractWasm({ wasm: wasmBuffer }))
    .setTimeout(30)
    .build();

  const uploadSim = await rpc.simulateTransaction(uploadTx);
  console.log("Simulation result:", JSON.stringify(uploadSim).slice(0, 500));
  const uploadAssembled = StellarSdk.SorobanRpc.assembleTransaction(uploadTx, uploadSim);
  uploadAssembled.sign(keypair);
  const uploadResult = await rpc.sendTransaction(uploadAssembled, {skipSim: true});

  if (uploadResult.status === "ERROR") {
    throw new Error("WASM upload failed: " + JSON.stringify(uploadResult.errorResult));
  }
  console.log("WASM uploaded:", uploadResult.hash);

  // Step 2: Create contract
  console.log("\n--- Creating Contract ---");
  const refreshedAccount = await horizon.loadAccount(publicKey);
  const salt = crypto.randomBytes(32);
  const adminAddress = StellarSdk.Address.fromString(publicKey);

  const createTx = new StellarSdk.TransactionBuilder(refreshedAccount, {
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
    .setTimeout(30)
    .build();

  const createSim = await rpc.simulateTransaction(createTx);
  const createAssembled = StellarSdk.SorobanRpc.assembleTransaction(createTx, createSim);
  createAssembled.sign(keypair);
  const createResult = await rpc.sendTransaction(createAssembled, {skipSim: true});

  if (createResult.status === "ERROR") {
    throw new Error("Contract creation failed: " + JSON.stringify(createResult.errorResult));
  }

  const contractId = "C" + createResult.hash.slice(0, 54);
  console.log("\n=== DEPLOYMENT SUCCESS ===");
  console.log("Contract ID:", contractId);
  console.log("TX Hash:", createResult.hash);
  console.log("Explorer:", `https://stellar.expert/explorer/testnet/tx/${createResult.hash}`);
}

main().catch((e) => {
  console.error("\nFAILED:", e.message || e);
  process.exit(1);
});
