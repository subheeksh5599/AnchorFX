const StellarSdk = require('@stellar/stellar-sdk');


const loadEnv = require('./lib/load-env.cjs');
const { publicKey, secretKey, keypair } = loadEnv();

const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");

async function main() {
  const account = await horizon.loadAccount(publicKey);
  console.log("Seq:", account.sequence);

  const asset = new StellarSdk.Asset("ANFX", publicKey);
  
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.changeTrust({ asset, limit: "1000000" })
    )
    .setTimeout(30)
    .build();
  tx.sign(keypair);
  
  try {
    const result = await horizon.submitTransaction(tx);
    console.log("Trustline created! TX:", result.hash);
    return result.hash;
  } catch(e) {
    console.log("Error:", e.response?.data?.extras?.result_codes || e.message);
  }
}

main();
