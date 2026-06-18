const StellarSdk = require('@stellar/stellar-sdk');


const loadEnv = require('./lib/load-env.cjs');
const { publicKey, secretKey, keypair } = loadEnv();

const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");

async function main() {
  const account = await horizon.loadAccount(publicKey);
  console.log("Balance:", account.balances.find(b=>b.asset_type==="native")?.balance, "XLM");
  
  // Send to a known testnet address - Stellar laboratory's account creator generates them
  // Let's use a self-send: create a new keypair and send to it
  const newKey = StellarSdk.Keypair.random();
  console.log("New key:", newKey.publicKey());
  
  // First create the new account with 1 XLM
  const createTx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.createAccount({
      destination: newKey.publicKey(),
      startingBalance: "1",
    }))
    .setTimeout(30)
    .build();
  
  createTx.sign(keypair);
  
  const result = await horizon.submitTransaction(createTx);
  console.log("✅ Account created! TX:", result.hash);
  console.log("Explorer: https://stellar.expert/explorer/testnet/tx/" + result.hash);
  
  // Now send XLM payment to it
  const account2 = await horizon.loadAccount(publicKey);
  const payTx = new StellarSdk.TransactionBuilder(account2, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: newKey.publicKey(),
      asset: StellarSdk.Asset.native(),
      amount: "0.01",
    }))
    .setTimeout(30)
    .build();
  
  payTx.sign(keypair);
  
  const payResult = await horizon.submitTransaction(payTx);
  console.log("✅ Payment sent! TX:", payResult.hash);
  console.log("Explorer: https://stellar.expert/explorer/testnet/tx/" + payResult.hash);
}

main().catch(e => {
  console.log("❌", e.response?.data?.extras?.result_codes || e.message);
});
