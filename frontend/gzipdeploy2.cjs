const StellarSdk = require('@stellar/stellar-sdk');
const crypto = require('crypto');
const fs = require('fs');
const zlib = require('zlib');
const https = require('https');


const wasm = fs.readFileSync("./public/wasm/anchorfx_escrow.wasm");
console.log("WASM:", wasm.length, "bytes");

const loadEnv = require('./lib/load-env.cjs');
const { publicKey, secretKey, keypair } = loadEnv();

const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");

async function postWithGzip(body) {
  const gzipped = zlib.gzipSync(Buffer.from(body));
  return new Promise((resolve, reject) => {
    const url = new URL("https://soroban-testnet.stellar.org");
    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Encoding": "gzip", "Accept": "application/json" },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, data }));
    });
    req.on("error", reject);
    req.write(gzipped);
    req.end();
  });
}

async function deploy() {
  const account = await horizon.loadAccount(publicKey);
  console.log("Account:", account.sequence);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "200000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.uploadContractWasm({ wasm }))
    .setTimeout(60)
    .build();

  tx.sign(keypair);
  const signedXdr = tx.toEnvelope().toXDR("base64");
  console.log("TX XDR:", signedXdr.length);

  // Try sendTransaction with gzip
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "sendTransaction", params: { transaction: signedXdr } });
  console.log("Body uncompressed:", body.length, "gzipped:", zlib.gzipSync(body).length);
  
  const result = await postWithGzip(body);
  console.log("Result:", result.status, result.data?.slice(0, 500));
}

deploy().catch(e => console.error(e.message));
