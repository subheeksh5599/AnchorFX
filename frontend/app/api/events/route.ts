import { Server as RpcServer } from "@stellar/stellar-sdk/rpc";

const RPC_URL = "https://soroban-testnet.stellar.org";
const DEPLOYED_CONTRACT = "CB4U7NLHDRGQQEKBNJ7GBPMXW4AA2VGTGEURS2FF34ZCRJMVOCFBKE26";

interface ContractEvent {
  type: string;
  data: unknown;
  ledger: number;
  timestamp: number;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const contractId = url.searchParams.get("contract") ?? DEPLOYED_CONTRACT;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const rpc = new RpcServer(RPC_URL, { allowHttp: false });
      let cursor: string | undefined;
      let seenLedgers = new Set<number>();

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected", contractId })}\n\n`));

      const poll = async () => {
        try {
          const filters = [
            {
              type: "contract" as const,
              contractIds: [contractId],
            },
          ];

          const response = await rpc.getEvents({
            filters,
            limit: 50,
            cursor: cursor ?? "",
          });

          for (const event of response.events) {
            const ledger = event.ledger;
            if (ledger && seenLedgers.has(ledger)) continue;
            if (ledger) seenLedgers.add(ledger);

            const rawType = event.topic[0]?.toString() ?? "unknown";
            const type = rawType.replace(/^Symbol\(\)/, "").replace(/^"(.*)"$/, "");

            const ev: ContractEvent = {
              type,
              data: event.value,
              ledger: event.ledger ?? 0,
              timestamp: Date.now(),
            };

            controller.enqueue(encoder.encode(`event: contract\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
          }

          if (response.events.length > 0) {
            cursor = response.cursor;
          }

          // keep up to 1000 ledgers to avoid unbounded memory
          if (seenLedgers.size > 1000) {
            const arr = Array.from(seenLedgers).sort((a, b) => a - b);
            seenLedgers = new Set(arr.slice(-500));
          }
        } catch {
          // send heartbeat on error
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        }
      };

      // poll every 2 seconds
      const interval = setInterval(poll, 2000);
      await poll();

      const close = () => {
        clearInterval(interval);
        controller.close();
      };

      request.signal.addEventListener("abort", close);
    },
    cancel() {
      // client disconnected
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
