const StellarSdk = require('@stellar/stellar-sdk');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');


const wasm = fs.readFileSync("./public/wasm/anchorfx_escrow.wasm");
const loadEnv = require('./lib/load-env.cjs');
const { publicKey, secretKey, keypair } = loadEnv();

const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");

async function deploy() {
  const account = await horizon.loadAccount(publicKey);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "200000", networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.uploadContractWasm({ wasm }))
    .setTimeout(60).build();
  tx.sign(keypair);
  const xdr = tx.toEnvelope().toXDR("base64");
  
  // The XDR is base64 which means the WASM bytes are base64-encoded inside the XDR
  // XDR with WASM: base64 overhead is ~33%
  // CBOR with WASM: raw bytes, no overhead
  // But the RPC expects JSON-RPC...
  
  // Actually, CBOR is just serialization format for the JSON-RPC body
  // Let me check if the content-type matters
  
  console.log("WASM raw:", wasm.length);
  console.log("XDR base64:", xdr.length);
  // XDR is ~660KB for 490KB WASM -> the XDR encoding has ~35% overhead on the WASM
  
  // Maybe we should try to use gzip content-encoding with accept-encoding: gzip
  // But the server apparently doesn't support it
  
  // Final idea: can we skip simulation and sign submit directly?
  // The issue is the sendTransaction also has body size limit...
  
  console.log("RPC body limit prevents deployment of contracts > ~200KB WASM");
}

deploy();
