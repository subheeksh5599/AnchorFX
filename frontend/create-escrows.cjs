const StellarSdk = require("@stellar/stellar-sdk");
const { Server: RpcServer } = require("@stellar/stellar-sdk/rpc");

const SECRET = process.env.STELLAR_SECRET || (() => { throw new Error("Set STELLAR_SECRET env var"); })();
const CONTRACT_ID = "CB4U7NLHDRGQQEKBNJ7GBPMXW4AA2VGTGEURS2FF34ZCRJMVOCFBKE26";
const SAC_ADDR = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

const keypair = StellarSdk.Keypair.fromSecret(SECRET);
const publicKey = keypair.publicKey();
const rpc = new RpcServer("https://soroban-testnet.stellar.org");
const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");

function i128(n) {
  return StellarSdk.xdr.ScVal.scvI128(new StellarSdk.xdr.Int128Parts({ lo: BigInt(n), hi: 0n }));
}

async function submitAndWait(tx) {
  const prep = await rpc.prepareTransaction(tx);
  prep.sign(keypair);
  const result = await rpc.sendTransaction(prep);
  if (result.status === "ERROR") {
    throw new Error(`TX failed: ${JSON.stringify(result.errorResult)}`);
  }
  // Poll for confirmation
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const txResult = await rpc.getTransaction(result.hash);
    if (txResult.status === "SUCCESS") return result.hash;
    if (txResult.status === "FAILED") throw new Error(`TX failed on-chain: ${JSON.stringify(txResult)}`);
    console.log(`  Waiting... attempt ${i + 1}/20, status: ${txResult.status}`);
  }
  throw new Error("TX timed out");
}

async function main() {
  const sender = StellarSdk.Address.fromString(publicKey);
  const escrow = StellarSdk.Address.fromString(CONTRACT_ID);
  const token = StellarSdk.Address.fromString(SAC_ADDR);
  const tokenContract = new StellarSdk.Contract(SAC_ADDR);
  const escrowContract = new StellarSdk.Contract(CONTRACT_ID);

  // Get current ledger for valid expiry range
  const latest = await rpc.getLatestLedger();
  const expiry = latest.sequence + 2000000;
  console.log("Current ledger:", latest.sequence, "Expiry:", expiry);

  // Approve escrow contract to spend SAC tokens
  let account = await horizon.loadAccount(publicKey);
  console.log("Account:", publicKey, "Seq:", account.sequence);
  console.log("--- Approving contract ---");

  const approveTx = new StellarSdk.TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(tokenContract.call("approve", sender.toScVal(), escrow.toScVal(), i128(100000000), StellarSdk.xdr.ScVal.scvU32(expiry)))
    .setTimeout(30)
    .build();

  const approveHash = await submitAndWait(approveTx);
  console.log("Approved:", approveHash);
  await new Promise(r => setTimeout(r, 5000));

  // Create escrow 1
  account = await horizon.loadAccount(publicKey);
  console.log("--- Creating escrow 1 ---");
  const createTx = new StellarSdk.TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(escrowContract.call("create", sender.toScVal(), sender.toScVal(), token.toScVal(), i128(10000000), StellarSdk.xdr.ScVal.scvU32(5000)))
    .setTimeout(30)
    .build();

  const hash1 = await submitAndWait(createTx);
  console.log("Escrow 1:", hash1);
  await new Promise(r => setTimeout(r, 5000));

  // Create escrow 2
  account = await horizon.loadAccount(publicKey);
  console.log("--- Creating escrow 2 ---");
  const createTx2 = new StellarSdk.TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(escrowContract.call("create", sender.toScVal(), sender.toScVal(), token.toScVal(), i128(5000000), StellarSdk.xdr.ScVal.scvU32(5000)))
    .setTimeout(30)
    .build();

  const hash2 = await submitAndWait(createTx2);
  console.log("Escrow 2:", hash2);

  console.log("\n=== DONE ===");
  console.log("Escrow 1 TX:", `https://stellar.expert/explorer/testnet/tx/${hash1}`);
  console.log("Escrow 2 TX:", `https://stellar.expert/explorer/testnet/tx/${hash2}`);
  console.log("Check: https://anchorfx.vercel.app/api/escrows");
}

main().catch(e => console.error("FAIL:", e.message || e));
