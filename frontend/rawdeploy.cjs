const StellarSdk = require('@stellar/stellar-sdk');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');


const wasm = fs.readFileSync("./public/wasm/anchorfx_escrow.wasm");
console.log("WASM:", wasm.length, "bytes");

const loadEnv = require('./lib/load-env.cjs');
const { publicKey, secretKey, keypair } = loadEnv();

const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");

function rpcPost(method, params) {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  console.log(`  ${method}: body=${body.length} bytes`);
  return new Promise((resolve, reject) => {
    const url = new URL("https://soroban-testnet.stellar.org");
    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({ status: res.statusCode, raw: data.slice(0,500) }); } });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function deploy() {
  // Check ledger
  const ledger = await rpcPost("getLatestLedger", {});
  console.log("Ledger:", ledger.result?.sequence);

  const account = await horizon.loadAccount(publicKey);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "200000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.uploadContractWasm({ wasm }))
    .setTimeout(60)
    .build();

  tx.sign(keypair);
  const signedXdr = tx.toEnvelope().toXDR("base64");

  const sendResult = await rpcPost("sendTransaction", { transaction: signedXdr });
  console.log("Send result:", JSON.stringify(sendResult).slice(0, 800));
}

deploy().catch(e => console.error(e.message));
