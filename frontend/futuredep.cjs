const StellarSdk = require('@stellar/stellar-sdk');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');


const wasm = fs.readFileSync("./public/wasm/anchorfx_escrow.wasm");
console.log("WASM:", wasm.length, "bytes");

const RPC_URLS = [
  "https://soroban-testnet.stellar.org",
  "https://rpc-futurenet.stellar.org",
];

function rpcPost(rpcUrl, method, params) {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  console.log(`  ${rpcUrl.split('//')[1]}: ${method} body=${body.length} bytes`);
  return new Promise((resolve, reject) => {
    const url = new URL(rpcUrl);
    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({ httpStatus: res.statusCode, raw: data.slice(0,300) }); } });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

const loadEnv = require('./lib/load-env.cjs');
const { publicKey, secretKey, keypair } = loadEnv();

async function tryDeploy(rpcUrl) {
  console.log(`\n=== ${rpcUrl} ===`);
  const ledger = await rpcPost(rpcUrl, "getLatestLedger", {});
  console.log("  Ledger:", ledger.result?.sequence);

  const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
  const account = await horizon.loadAccount(publicKey);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "200000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.uploadContractWasm({ wasm }))
    .setTimeout(60)
    .build();

  tx.sign(keypair);
  const xdr = tx.toEnvelope().toXDR("base64");
  const result = await rpcPost(rpcUrl, "sendTransaction", { transaction: xdr });
  console.log("  Result:", JSON.stringify(result).slice(0, 600));
  return result;
}

async function main() {
  for (const url of RPC_URLS) {
    await tryDeploy(url);
  }
}
main().catch(e => console.error(e.message));
