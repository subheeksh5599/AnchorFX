import { getHealth } from "@/lib/relay";

const DEFAULT_CONTRACT = process.env.CONTRACT_ID ?? "CB4U7NLHDRGQQEKBNJ7GBPMXW4AA2VGTGEURS2FF34ZCRJMVOCFBKE26";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const contractId = url.searchParams.get("contract") ?? DEFAULT_CONTRACT;
  const health = await getHealth(contractId);

  const healthy = health.rpc === "connected" && health.contract === "active";

  return new Response(JSON.stringify({ healthy, ...health }), {
    status: healthy ? 200 : 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
  });
}
