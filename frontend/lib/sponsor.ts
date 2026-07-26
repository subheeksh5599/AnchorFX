/**
 * Fee Sponsorship — submit a signed transaction XDR through the sponsor API
 * so the user pays 0 XLM in fees.
 */
export async function sponsoredSubmit(signedXdr: string): Promise<{
  hash: string;
  status: string;
  sponsored: boolean;
}> {
  const res = await fetch("/api/sponsor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signedXdr }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Sponsor API error" }));
    throw new Error(err.error || `Sponsor API returned ${res.status}`);
  }

  return res.json();
}
