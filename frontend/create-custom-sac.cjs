const StellarSdk = require('@stellar/stellar-sdk');


const loadEnv = require('./lib/load-env.cjs');
const { publicKey, secretKey, keypair } = loadEnv();

const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
const rpc = new StellarSdk.rpc.Server("https://soroban-testnet.stellar.org", { allowHttp: true });

async function main() {
  const account = await horizon.loadAccount(publicKey);
  console.log("Account:", publicKey, "Seq:", account.sequence);

  // Create a custom asset: ANFX token
  const asset = new StellarSdk.Asset("ANFX", publicKey);

  // Step 1: Change trust - add trustline to the asset
  console.log("Adding trustline for ANFX...");
  const trustTx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.changeTrust({ asset, limit: "1000000" })
    )
    .setTimeout(30)
    .build();
  trustTx.sign(keypair);
  
  const trustResult = await horizon.submitTransaction(trustTx);
  console.log("Trustline TX:", trustResult.hash);

  // Step 2: Create SAC for the custom asset
  const nextAccount = await horizon.loadAccount(publicKey);
  console.log("Step 2: Creating SAC for ANFX (seq:", nextAccount.sequence, ")...");
  
  const sacTx = new StellarSdk.TransactionBuilder(nextAccount, {
    fee: "100000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.createStellarAssetContract({ asset })
    )
    .setTimeout(60)
    .build();

  console.log("Simulating SAC creation...");
  const prep = await rpc.prepareTransaction(sacTx);
  prep.sign(keypair);
  console.log("Sending SAC creation...");
  const result = await rpc.sendTransaction(prep);
  console.log("SAC Result:", result.status, result.hash);

  if (result.status === "SUCCESS") {
    console.log("\n=== CUSTOM SAC DEPLOYED ===");
    console.log("Asset: ANFX (issuer:", publicKey, ")");
    console.log("TX:", result.hash);
    
    // Get the SAC address
    const sacAddress = StellarSdk.Address.fromString(publicKey).toScAddress();
    console.log("SAC Address hint:", sacAddress.toString());
  }
}

main().catch(e => console.error("Error:", e.message));
