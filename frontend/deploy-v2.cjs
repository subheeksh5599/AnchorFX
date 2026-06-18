const StellarSdk = require("@stellar/stellar-sdk");
const fs = require("fs");
const crypto = require("crypto");

const SECRET = process.argv[2];
if (!SECRET) {
  console.error("Usage: node deploy-v2.cjs <SECRET_KEY>");
  process.exit(1);
}

const keypair = StellarSdk.Keypair.fromSecret(SECRET);
const publicKey = keypair.publicKey();
console.log("Deploying from:", publicKey);

const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");

const WASM_PATH = __dirname + "/../contracts/anchorfx-escrow/target/wasm32-unknown-unknown/release/anchorfx_escrow.wasm";

async function main() {
  const wasmBuffer = fs.readFileSync(WASM_PATH);
  const wasmHash = crypto.createHash("sha256").update(wasmBuffer).digest();
  console.log("WASM hash:", wasmHash.toString("hex"));

  // Step 1: Upload WASM via Horizon
  console.log("\n--- Uploading WASM via Horizon ---");
  const account = await horizon.loadAccount(publicKey);
  
  const uploadTx = new StellarSdk.TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.uploadContractWasm({ wasm: wasmBuffer }))
    .setTimeout(30)
    .build();

  uploadTx.sign(keypair);
  const uploadResult = await horizon.submitTransaction(uploadTx);
  console.log("WASM uploaded:", uploadResult.hash);
  console.log("Explorer:", `https://stellar.expert/explorer/testnet/tx/${uploadResult.hash}`);

  // Step 2: Create contract instance  
  console.log("\n--- Creating Contract Instance ---");
  const account2 = await horizon.loadAccount(publicKey);
  const salt = crypto.randomBytes(32);
  const adminAddress = StellarSdk.Address.fromString(publicKey);

  const createTx = new StellarSdk.TransactionBuilder(account2, {
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

  createTx.sign(keypair);
  const createResult = await horizon.submitTransaction(createTx);

  const contractId = "C" + createResult.hash.slice(0, 54);
  console.log("\n=== DEPLOYMENT SUCCESS ===");
  console.log("Contract ID:", contractId);
  console.log("TX Hash:", createResult.hash);
  console.log("Explorer:", `https://stellar.expert/explorer/testnet/tx/${createResult.hash}`);
}

main().catch((e) => {
  console.error("\nFAILED:", e.message || e);
  if (e.response?.data?.extras?.result_codes) {
    console.error("Result codes:", JSON.stringify(e.response.data.extras.result_codes));
  }
  process.exit(1);
});
