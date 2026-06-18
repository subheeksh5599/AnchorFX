const StellarSdk = require('@stellar/stellar-sdk');


const loadEnv = require('./lib/load-env.cjs');
const { publicKey, secretKey, keypair } = loadEnv();

async function testViaFetch() {
  const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
  const account = await horizon.loadAccount(publicKey);
  console.log("Seq:", account.sequence);

  // Build EXACTLY like the frontend does
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: publicKey, // self-send
      asset: StellarSdk.Asset.native(),
      amount: "0.0001",
    }))
    .setTimeout(30)
    .build();

  // Sign with keypair (same as what Freighter would do)
  tx.sign(keypair);
  
  // Now simulate what the frontend does: get the XDR
  const unsignedXdr = tx.toXDR();
  console.log("Unsigned TX XDR length:", unsignedXdr.length);
  
  // Get the signed envelope XDR  
  const signedXdr = tx.toEnvelope().toXDR("base64");
  console.log("Signed envelope XDR length:", signedXdr.length);

  // METHOD 1: Submit via SDK (working approach)
  console.log("\n--- METHOD 1: SDK submitTransaction ---");
  try {
    const account2 = await horizon.loadAccount(publicKey);
    const tx2 = new StellarSdk.TransactionBuilder(account2, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(StellarSdk.Operation.payment({
        destination: "GBSBL76Q2NTIYF5J64PCG5PYZTI5KNO3ZXR5FG6ME4EEMIEI36YXJYYL",
        asset: StellarSdk.Asset.native(),
        amount: "0.0001",
      }))
      .setTimeout(30).build();
    tx2.sign(keypair);
    const r1 = await horizon.submitTransaction(tx2);
    console.log("✅ SDK submit: SUCCESS", r1.hash);
  } catch(e) {
    console.log("❌ SDK submit:", e.response?.data?.extras?.result_codes || e.message);
  }

  // METHOD 2: Submit signed envelope via fetch (what frontend does)
  console.log("\n--- METHOD 2: fetch with signed envelope ---");
  try {
    const account3 = await horizon.loadAccount(publicKey);
    const tx3 = new StellarSdk.TransactionBuilder(account3, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(StellarSdk.Operation.payment({
        destination: "GBSBL76Q2NTIYF5J64PCG5PYZTI5KNO3ZXR5FG6ME4EEMIEI36YXJYYL",
        asset: StellarSdk.Asset.native(),
        amount: "0.0001",
      }))
      .setTimeout(30).build();
    tx3.sign(keypair);
    
    const fetchXdr = tx3.toEnvelope().toXDR("base64");
    const body = new URLSearchParams({ tx: fetchXdr });
    const resp = await fetch("https://horizon-testnet.stellar.org/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = await resp.json();
    if (resp.ok) {
      console.log("✅ fetch submit: SUCCESS", json.hash);
    } else {
      console.log("❌ fetch submit:", JSON.stringify(json.extras?.result_codes || json, null, 2));
    }
  } catch(e) {
    console.log("❌ fetch error:", e.message);
  }
}

testViaFetch();
