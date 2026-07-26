import { TransactionBuilder, Networks, Keypair } from "@stellar/stellar-sdk";
import { Server as RpcServer } from "@stellar/stellar-sdk/rpc";
import { NETWORK, RPC_URL } from "@/lib/env";

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY ?? "";

export async function POST(req: Request) {
  try {
    const { signedXdr } = await req.json();

    if (!signedXdr) {
      return Response.json({ error: "Missing signed XDR" }, { status: 400 });
    }

    if (!ADMIN_SECRET) {
      return Response.json({ error: "Admin key not configured" }, { status: 500 });
    }

    const networkPassphrase = NETWORK === "PUBLIC" ? Networks.PUBLIC : Networks.TESTNET;
    const adminKp = Keypair.fromSecret(ADMIN_SECRET);
    const rpc = new RpcServer(RPC_URL, { allowHttp: false });

    // Wrap the signed inner transaction in a fee bump
    const innerTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase) as import("@stellar/stellar-sdk").Transaction;
    const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
      adminKp,
      "100000", // 0.01 XLM fee — generous
      innerTx,
      networkPassphrase
    );

    feeBumpTx.sign(adminKp);

    const result = await rpc.sendTransaction(feeBumpTx as any);

    if (result.status === "ERROR") {
      return Response.json(
        { error: "Transaction failed", detail: result.errorResult },
        { status: 400 }
      );
    }

    return Response.json({
      hash: result.hash,
      status: result.status,
      sponsored: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
