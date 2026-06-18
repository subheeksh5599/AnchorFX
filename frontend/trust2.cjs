const StellarSdk = require('@stellar/stellar-sdk');
const https = require('https');


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
      StellarSdk.Operation.changeTrust({
        asset: asset,
        limit: "1000000",
      })
    )
    .setTimeout(30)
    .build();
  tx.sign(keypair);
  
  const xdr = tx.toEnvelope().toXDR("base64");
  console.log("TX size:", xdr.length, "bytes");

  // Submit via raw Horizon API
  const body = new URLSearchParams({ tx: xdr }).toString();
  console.log("Submitting to Horizon...");
  
  const result = await new Promise((resolve, reject) => {
    const url = new URL("https://horizon-testnet.stellar.org/transactions");
    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname, method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve({ status: res.statusCode, raw: data.slice(0,500) }); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });

  console.log("Result:", JSON.stringify(result).slice(0, 600));
}

main().catch(e => console.error(e.message));
