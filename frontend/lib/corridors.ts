/**
 * AnchorFX corridor definitions — shared by pages, API routes, and tests.
 * Corridor IDs are stored on-chain in the escrow contract.
 */

export interface Corridor {
  id: number;
  from: string;
  to: string;
}

export const CORRIDORS: Record<number, Corridor> = {
  1: { id: 1, from: "US", to: "PH" },
  2: { id: 2, from: "US", to: "MX" },
  3: { id: 3, from: "EUR", to: "BR" },
  4: { id: 4, from: "US", to: "NG" },
  5: { id: 5, from: "EUR", to: "IN" },
  6: { id: 6, from: "US", to: "AR" },
  7: { id: 7, from: "US", to: "GH" },
  8: { id: 8, from: "US", to: "KE" },
  9: { id: 9, from: "US", to: "ID" },
  10: { id: 10, from: "US", to: "VN" },
  11: { id: 11, from: "US", to: "TH" },
};

export const CORRIDOR_OPTIONS: Corridor[] = Object.values(CORRIDORS);

export function corridorLabel(id: number): string {
  const c = CORRIDORS[id];
  return c ? `${c.from} → ${c.to}` : "?? → ??";
}

export function corridorFor(id: number): { from: string; to: string } {
  const c = CORRIDORS[id];
  return c ? { from: c.from, to: c.to } : { from: "??", to: "??" };
}

export const CORRIDOR_COUNT = CORRIDOR_OPTIONS.length;
