import { rateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";
import { validateStellarAddress } from "@/lib/validation";
import { CONTRACT_ID, XLM_SAC_ADDRESS, USDC_TOKEN_ADDRESS, SITE_URL } from "@/lib/env";

// Stellar Asset Contract addresses — testnet SAC tokens
const STABLECOINS: Record<string, { name: string; issuer: string; decimals: number; code: string }> = {
  [XLM_SAC_ADDRESS]: {
    name: "Stellar Lumen (SAC)",
    issuer: "native",
    decimals: 7,
    code: "XLM",
  },
  [USDC_TOKEN_ADDRESS]: {
    name: "USD Coin (Testnet)",
    issuer: "stellar.org",
    decimals: 7,
    code: "USDC",
  },
};

const CORRIDORS: Record<string, { from: string; to: string; rate: number; fromAsset: string; toAsset: string }> = {
  "US-PH": { from: "USD", to: "PHP", rate: 56.4, fromAsset: "USDC", toAsset: "PHPC" },
  "US-MX": { from: "USD", to: "MXN", rate: 17.2, fromAsset: "USDC", toAsset: "MXNC" },
  "EUR-BR": { from: "EUR", to: "BRL", rate: 5.8, fromAsset: "EURC", toAsset: "BRLC" },
  "US-NG": { from: "USD", to: "NGN", rate: 1580.0, fromAsset: "USDC", toAsset: "NGNC" },
  "EUR-IN": { from: "EUR", to: "INR", rate: 92.0, fromAsset: "EURC", toAsset: "INRC" },
};

interface Sep31Transaction {
  id: string;
  status: "pending_sender" | "pending_stellar" | "pending_receiver" | "pending_external" | "completed" | "error";
  amount_in: string;
  amount_out: string;
  asset: string;
  sender: string;
  corridor: string;
  stellar_tx_id: string | null;
  escrow_id: number | null;
  started_at: string;
  completed_at: string | null;
  stellar_memo: string | null;
}

// In-memory store (replace with database for production)
const txStore = new Map<string, Sep31Transaction>();

function validateAmount(amount: string): { valid: boolean; value: number; error?: string } {
  if (!amount || amount.trim() === "") {
    return { valid: false, value: 0, error: "Amount is required" };
  }
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || !isFinite(parsed)) {
    return { valid: false, value: 0, error: "Invalid amount format" };
  }
  if (parsed <= 0) {
    return { valid: false, value: 0, error: "Amount must be positive" };
  }
  if (parsed > 1_000_000_000) {
    return { valid: false, value: 0, error: "Amount exceeds maximum (1B)" };
  }
  return { valid: true, value: parsed };
}

/** GET /api/sep31/info — SEP-31 compliant anchor info */
export async function GET(request: Request) {
  const limitResult = rateLimit(request, RATE_LIMITS.api, "sep31");
  if (!limitResult.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  const url = new URL(request.url);
  const txId = url.searchParams.get("tx_id") || url.searchParams.get("id");

  // Transaction status lookup
  if (txId) {
    const tx = txStore.get(txId);
    if (!tx) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
      });
    }
    return new Response(JSON.stringify({
      transaction: {
        id: tx.id,
        status: tx.status,
        status_eta: tx.status === "completed" ? 0 : 30,
        amount_in: {
          amount: tx.amount_in,
          asset: tx.asset,
        },
        amount_out: {
          amount: tx.amount_out,
          asset: CORRIDORS[tx.corridor]?.toAsset ?? "unknown",
        },
        started_at: tx.started_at,
        completed_at: tx.completed_at,
        stellar_transaction_id: tx.stellar_tx_id,
        more_info_url: `${SITE_URL}/api/sep31/transaction?tx_id=${tx.id}`,
      },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  // SEP-31 /info response
  return new Response(JSON.stringify({
    deposit: {
      [XLM_SAC_ADDRESS]: {
        enabled: true,
        fee_fixed: 0.00001,
        fee_percent: 0.001,
        min_amount: 0.1,
        max_amount: 1000000,
      },
    },
    receive: {
      PHP: {
        enabled: true,
        fee_fixed: 25,
        fee_percent: 0.15,
        min_amount: 50,
        max_amount: 5000000,
        methods: ["bank_account", "cash_pickup"],
      },
      MXN: {
        enabled: true,
        fee_fixed: 20,
        fee_percent: 0.12,
        min_amount: 50,
        max_amount: 3000000,
        methods: ["bank_account"],
      },
      BRL: {
        enabled: true,
        fee_fixed: 15,
        fee_percent: 0.18,
        min_amount: 50,
        max_amount: 2000000,
        methods: ["bank_account", "cash_pickup"],
      },
      NGN: {
        enabled: true,
        fee_fixed: 100,
        fee_percent: 0.20,
        min_amount: 50,
        max_amount: 10000000,
        methods: ["bank_account"],
      },
      INR: {
        enabled: true,
        fee_fixed: 50,
        fee_percent: 0.10,
        min_amount: 50,
        max_amount: 7500000,
        methods: ["bank_account", "upi"],
      },
    },
    fee: {
      enabled: false,
    },
    transactions: {
      enabled: true,
      authentication_required: true,
    },
    anchor_name: "AnchorFX",
    anchor_quote_server: `${SITE_URL}/api/sep31/info`,
    transfer_protocols: ["sep31"],
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
  });
}

/** POST /api/sep31/transactions — Initiate SEP-31 receive */
export async function POST(request: Request) {
  const limitResult = rateLimit(request, RATE_LIMITS.api, "sep31");
  if (!limitResult.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  const asset = String(body.asset ?? "");
  const rawAmount = String(body.amount ?? "0");
  const sender = String(body.sender ?? "").trim();
  const corridor = String(body.corridor ?? "US-PH").trim().toUpperCase();

  // Validate asset
  if (!STABLECOINS[asset]) {
    return new Response(JSON.stringify({
      error: "Unsupported asset",
      supported_assets: Object.keys(STABLECOINS),
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  // Validate amount
  const amountCheck = validateAmount(rawAmount);
  if (!amountCheck.valid) {
    return new Response(JSON.stringify({ error: amountCheck.error }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  // Validate sender address
  if (sender) {
    const addrCheck = validateStellarAddress(sender);
    if (!addrCheck.valid) {
      return new Response(JSON.stringify({ error: `Invalid sender address: ${addrCheck.error}` }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
      });
    }
  }

  // Validate corridor
  const corridorInfo = CORRIDORS[corridor];
  if (!corridorInfo) {
    return new Response(JSON.stringify({
      error: "Unsupported corridor",
      supported: Object.keys(CORRIDORS),
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  const txId = `sep31-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const estimatedOut = amountCheck.value * corridorInfo.rate;

  const tx: Sep31Transaction = {
    id: txId,
    status: "pending_sender",
    amount_in: amountCheck.value.toFixed(2),
    amount_out: estimatedOut.toFixed(2),
    asset,
    sender: sender || "unknown",
    corridor,
    stellar_tx_id: null,
    escrow_id: null,
    started_at: new Date().toISOString(),
    completed_at: null,
    stellar_memo: null,
  };

  txStore.set(txId, tx);

  return new Response(JSON.stringify({
    id: txId,
    status: tx.status,
    amount_in: {
      amount: tx.amount_in,
      asset: STABLECOINS[asset].code,
    },
    amount_out: {
      amount: tx.amount_out,
      asset: corridorInfo.toAsset,
    },
    how: `Send ${tx.amount_in} ${STABLECOINS[asset].code} to AnchorFX escrow contract ${CONTRACT_ID} with memo "${txId}"`,
    more_info_url: `${SITE_URL}/api/sep31/transaction?tx_id=${txId}`,
    message: "SEP-31 receive initiated. Funds will settle via AnchorFX escrow contract on Stellar.",
  }), {
    status: 201,
    headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
  });
}
