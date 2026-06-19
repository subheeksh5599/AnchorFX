const StellarSdk = require("@stellar/stellar-sdk");
const { Server: RpcServer } = require("@stellar/stellar-sdk/rpc");

const SECRET = "SAEKSJQXQKROJ7SJX2GODXFW45W4WBQWAVE3GPLZRDQJAKVMYTMJKODT";
const ESCROW_ID = "CBXJRCVLWK5GGBKVC5RAFCTCDCCRRXLBXDNVRVW7YUGPLFW3K3BVXC6Y";
const SAC_ADDR = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

const keypair = StellarSdk.Keypair.fromSecret(SECRET);
const publicKey = keypair.publicKey();
const rpc = new RpcServer("https://soroban-testnet.stellar.org");
const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");

function i128(n) { return StellarSdk.xdr.ScVal.scvI128(new StellarSdk.xdr.Int128Parts({ lo: BigInt(n), hi: 0n })); }

async function submitAndWait(tx, label) {
  const prep = await rpc.prepareTransaction(tx);
  prep.sign(keypair);
  const result = await rpc.sendTransaction(prep);
  if (result.status === "ERROR") throw new Error(`${label}: ${JSON.stringify(result.errorResult)}`);
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const txResult = await rpc.getTransaction(result.hash);
    if (txResult.status === "SUCCESS") { console.log(`  ${label} OK: ${result.hash.slice(0,12)}...`); return result.hash; }
    if (txResult.status === "FAILED") throw new Error(`${label} failed: ${JSON.stringify(txResult)}`);
  }
  throw new Error(`${label} timed out`);
}

async function main() {
  const sender = StellarSdk.Address.fromString(publicKey);
  const token = StellarSdk.Address.fromString(SAC_ADDR);
  const tokenContract = new StellarSdk.Contract(SAC_ADDR);
  const escrowContract = new StellarSdk.Contract(ESCROW_ID);
  const escrow = StellarSdk.Address.fromString(ESCROW_ID);

  // Get current ledger for valid expiry
  const latest = await rpc.getLatestLedger();
  const expiry = latest.sequence + 2000000;

  // Approve escrow to spend SAC tokens
  let account = await horizon.loadAccount(publicKey);
  console.log("Approving escrow...");
  const approveTx = new StellarSdk.TransactionBuilder(account, {
    fee: "100000", networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(tokenContract.call("approve", sender.toScVal(), escrow.toScVal(), i128(500000000), StellarSdk.xdr.ScVal.scvU32(expiry)))
    .setTimeout(30).build();
  await submitAndWait(approveTx, "Approve");
  await new Promise(r => setTimeout(r, 5000));

  // Create 3 escrows
  for (let i = 1; i <= 3; i++) {
    const amount = 10000000 * i;
    account = await horizon.loadAccount(publicKey);
    const createTx = new StellarSdk.TransactionBuilder(account, {
      fee: "100000", networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(escrowContract.call("create_escrow", sender.toScVal(), sender.toScVal(), token.toScVal(), i128(amount), StellarSdk.xdr.ScVal.scvU32(5000)))
      .setTimeout(30).build();
    await submitAndWait(createTx, `Escrow ${i}`);
    await new Promise(r => setTimeout(r, 5000));
  }

  console.log("\n=== DONE ===");
  console.log(`Check: https://anchorfx.vercel.app/api/escrows?contract=${ESCROW_ID}`);
}

main().catch(e => console.error("FAIL:", e.message || e));
