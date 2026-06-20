const StellarSdk = require("@stellar/stellar-sdk");
const { Server: RpcServer } = require("@stellar/stellar-sdk/rpc");

const SECRET = process.env.STELLAR_SECRET || (() => { throw new Error("Set STELLAR_SECRET env var"); })();
const CONTRACT_ID = "CB4U7NLHDRGQQEKBNJ7GBPMXW4AA2VGTGEURS2FF34ZCRJMVOCFBKE26";
const SAC_ADDR = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

const keypair = StellarSdk.Keypair.fromSecret(SECRET);
const publicKey = keypair.publicKey();
const rpc = new RpcServer("https://soroban-testnet.stellar.org");
const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");

function i128(n) { return StellarSdk.xdr.ScVal.scvI128(new StellarSdk.xdr.Int128Parts({ lo: BigInt(n), hi: 0n })); }
function u32(n) { return StellarSdk.xdr.ScVal.scvU32(n); }
function u64(n) { return StellarSdk.xdr.ScVal.scvU64(new StellarSdk.xdr.Uint64(n)); }

const sender = StellarSdk.Address.fromString(publicKey);
const escrowAddr = StellarSdk.Address.fromString(CONTRACT_ID);
const tokenAddr = StellarSdk.Address.fromString(SAC_ADDR);
const tokenContract = new StellarSdk.Contract(SAC_ADDR);
const escrowContract = new StellarSdk.Contract(CONTRACT_ID);

async function submitAndWait(tx) {
  const prep = await rpc.prepareTransaction(tx);
  prep.sign(keypair);
  const result = await rpc.sendTransaction(prep);
  if (result.status === "ERROR") {
    throw new Error(`TX failed: ${JSON.stringify(result.errorResult)}`);
  }
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const txResult = await rpc.getTransaction(result.hash);
    if (txResult.status === "SUCCESS") return result.hash;
    if (txResult.status === "FAILED") throw new Error(`TX failed on-chain: ${JSON.stringify(txResult)}`);
    process.stdout.write(".");
    if (i % 5 === 4) process.stdout.write("\n");
  }
  throw new Error("TX timed out");
}

async function main() {
  const receivers = [
    "GC5V7YCTCOADP4MCD6XLRGAXCPXAC32SSNVQ6LQTNP4FDHPF6RKWNTUC",
    "GCZVWS7KO2T4GPLFTZND5WYYEH66ZLYYZH72BAH3DDB3HQUWQVTDFNTZ",
    "GBV6YIW3G7DWBNKTXOUHUGIFGUGO6QKKI5UAUTMGWLXBGWAE6SZQ344Z",
    "GDUFRRVRI675RORN46NXSHN2YNJKRNOKNFYCTQXRVDEOZRLHE57MFV35",
    "GD5G3WULGU3FMZ2GAKILK5AVPWLEM62HSZCJXSG3E2366Z6DAAR3PNWW",
  ];
  const amounts = [5000000, 10000000, 2000000, 3500000, 7000000];
  const txs = [];

  // Create 5 escrows
  for (let i = 0; i < 5; i++) {
    let account = await horizon.loadAccount(publicKey);
    console.log(`\n[${1+i}/11] Create escrow #${2+i} -> ${receivers[i].slice(0,8)}... amount=${amounts[i]}`);
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: "200000",
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(escrowContract.call(
        "create",
        sender.toScVal(),
        StellarSdk.Address.fromString(receivers[i]).toScVal(),
        tokenAddr.toScVal(),
        i128(amounts[i]),
        u32(5000),
      ))
      .setTimeout(30).build();
    const hash = await submitAndWait(tx);
    txs.push({ op: "Create Escrow #" + (2+i), hash });
    console.log("OK:", hash);
    await new Promise(r => setTimeout(r, 5000));
  }

  // Settle 3 escrows
  for (let id = 2; id <= 4; id++) {
    let account = await horizon.loadAccount(publicKey);
    console.log(`\n[${5+id-2}/11] Settle escrow #${id}...`);
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: "200000",
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(escrowContract.call("settle", u64(id)))
      .setTimeout(30).build();
    const hash = await submitAndWait(tx);
    txs.push({ op: "Settle Escrow #" + id, hash });
    console.log("OK:", hash);
    await new Promise(r => setTimeout(r, 5000));
  }

  // Refund escrow #5
  let account = await horizon.loadAccount(publicKey);
  console.log(`\n[9/11] Refund escrow #5...`);
  const refundTx = new StellarSdk.TransactionBuilder(account, {
    fee: "200000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(escrowContract.call("refund", u64(5)))
    .setTimeout(30).build();
  const rHash = await submitAndWait(refundTx);
  txs.push({ op: "Refund Escrow #5", hash: rHash });
  console.log("OK:", rHash);
  await new Promise(r => setTimeout(r, 5000));

  // Cancel escrow #6
  account = await horizon.loadAccount(publicKey);
  console.log(`\n[10/11] Cancel escrow #6...`);
  const cancelTx = new StellarSdk.TransactionBuilder(account, {
    fee: "200000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(escrowContract.call("cancel", u64(6)))
    .setTimeout(30).build();
  const cHash = await submitAndWait(cancelTx);
  txs.push({ op: "Cancel Escrow #6", hash: cHash });
  console.log("OK:", cHash);

  console.log("\n=== ALL 10 INTERACTIONS COMPLETE ===");
  console.log("Contract:", `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`);
  console.log("");
  txs.forEach((t, i) => console.log(`  ${i+1}. ${t.op}: https://stellar.expert/explorer/testnet/tx/${t.hash}`));
}

main().catch(e => console.error("FAIL:", e.message || e));
