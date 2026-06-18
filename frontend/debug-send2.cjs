const StellarSdk = require('@stellar/stellar-sdk');
const crypto = require('crypto');


// Create a brand new account to send to
const destKey = StellarSdk.Keypair.random();
const destPK = destKey.publicKey();
console.log("Source:", publicKey);
console.log("Dest:", destPK);

const loadEnv = require('./lib/load-env.cjs');
const { publicKey, secretKey, keypair } = loadEnv();

async function testFetch() {
  const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
  const account = await horizon.loadAccount(publicKey);
  console.log("Seq:", account.sequence);

  // Step 1: Create dest account (SDK method)
  const createTx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.createAccount({
      destination: destPK,
      startingBalance: "1",
    }))
    .setTimeout(30).build();
  createTx.sign(keypair);
  const cr = await horizon.submitTransaction(createTx);
  console.log("Created account:", cr.hash);
  
  // Step 2: Send payment via fetch (mimics frontend)
  const account2 = await horizon.loadAccount(publicKey);
  const tx = new StellarSdk.TransactionBuilder(account2, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: destPK,
      asset: StellarSdk.Asset.native(),
      amount: "0.01",
    }))
    .setTimeout(30).build();
  tx.sign(keypair);
  
  const signedXdr = tx.toEnvelope().toXDR("base64");
  console.log("signedXdr:", signedXdr.slice(0,20), "... length:", signedXdr.length);
  
  // The frontend does:
  //   1. Builds unsigned tx with TransactionBuilder
  //   2. Gets unsignedXdr = transaction.toXDR()
  //   3. Calls Freighter signTransaction(unsignedXdr) -> gets signedTxXdr
  //   4. Submits signedTxXdr via fetch
  
  const unsignedXdr = tx.toXDR();
  console.log("unsignedXdr:", unsignedXdr.slice(0,20), "... length:", unsignedXdr.length);
  
  // These should be DIFFERENT - unsigned vs signed envelope
  // But when signing with keypair, toXDR() gives the same result as toEnvelope().toXDR()?
  // Let me check
  console.log("\nAre toXDR() and toEnvelope().toXDR() same?", unsignedXdr === signedXdr);
  
  // The issue: Freighter signs the unsigned TX and returns a SIGNED envelope
  // But the frontend passes toXDR() (the UNENVELOPED transaction) to Freighter
  // Freighter might wrap it and sign
  
  // Let me simulate what Freighter returns by signing the bare transaction
  const bareTx = StellarSdk.TransactionBuilder.fromXDR(unsignedXdr, StellarSdk.Networks.TESTNET);
  bareTx.sign(keypair);
  const bareSignedXdr = bareTx.toEnvelope().toXDR("base64");
  console.log("bareSignedXdr:", bareSignedXdr.slice(0,20), "... length:", bareSignedXdr.length);
  
  // NOW submit both via fetch
  // Method A: signed via toEnvelope (what SDK normally does)
  const body = new URLSearchParams({ tx: signedXdr });
  const resp = await fetch("https://horizon-testnet.stellar.org/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await resp.json();
  console.log("\nMethod A (toEnvelope):", resp.ok ? "✅" : "❌", resp.status, json.hash || JSON.stringify(json.extras?.result_codes || json).slice(0,300));
}

testFetch().catch(e => console.error(e.message));
