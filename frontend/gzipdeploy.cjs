const StellarSdk = require('@stellar/stellar-sdk');
const crypto = require('crypto');
const fs = require('fs');
const zlib = require('zlib');
const http = require('http');
const https = require('https');


const wasm = fs.readFileSync("./public/wasm/anchorfx_escrow.wasm");
console.log("WASM:", wasm.length, "bytes");

const loadEnv = require('./lib/load-env.cjs');
const { publicKey, secretKey, keypair } = loadEnv();

const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");

async function deploy() {
  const account = await horizon.loadAccount(publicKey);
  console.log("Account loaded");

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "200000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.uploadContractWasm({ wasm }))
    .setTimeout(60)
    .build();

  tx.sign(keypair);
  const signedXdr = tx.toEnvelope().toXDR("base64");
  console.log("Signed XDR length:", signedXdr.length);

  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "sendTransaction",
    params: { transaction: signedXdr },
  });
  console.log("Body size:", body.length, "bytes");

  // Try POST with gzip
  const gzipped = zlib.gzipSync(body);
  console.log("Gzipped:", gzipped.length, "bytes");

  return new Promise((resolve, reject) => {
    const url = new URL("https://soroban-testnet.stellar.org");
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": "gzip",
        "Accept": "application/json",
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        console.log("Status:", res.statusCode);
        console.log(data.slice(0, 500));
        resolve();
      });
    });
    req.on("error", reject);
    req.write(gzipped);
    req.end();
  });
}

deploy().then(() => console.log("Done")).catch(e => console.error(e.message));
