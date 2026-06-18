const StellarSdk = require('@stellar/stellar-sdk');


const loadEnv = require('./lib/load-env.cjs');
const { publicKey, secretKey, keypair } = loadEnv();

const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
const rpc = new StellarSdk.rpc.Server("https://soroban-testnet.stellar.org", { allowHttp: true });

async function main() {
  const account = await horizon.loadAccount(publicKey);
  console.log("Account:", publicKey);

  // Create a Stellar Asset Contract (SAC) - this wraps native XLM or a custom asset
  // For XLM, we use Asset.native()
  const asset = StellarSdk.Asset.native();

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.createStellarAssetContract({ asset })
    )
    .setTimeout(60)
    .build();

  console.log("Simulating...");
  const prep = await rpc.prepareTransaction(tx);
  prep.sign(keypair);
  console.log("Sending...");
  const result = await rpc.sendTransaction(prep);
  console.log("Result:", result.status, result.hash);

  if (result.status === "SUCCESS") {
    console.log("\n=== SAC DEPLOYED ===");
    console.log("TX Hash:", result.hash);
    console.log("View: https://stellar.expert/explorer/testnet/tx/" + result.hash);
    
    // Get the contract address
    const contractAddress = StellarSdk.Address.fromString(publicKey).toScAddress();
    console.log("Contract preview address:", contractAddress.toString());
  }
}

main().catch(e => console.error("Error:", e.message));
