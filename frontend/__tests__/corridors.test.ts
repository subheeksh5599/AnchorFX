import { describe, it, expect } from "vitest";
import {
  CORRIDORS,
  CORRIDOR_OPTIONS,
  corridorLabel,
  corridorFor,
  CORRIDOR_COUNT,
} from "@/lib/corridors";

describe("corridors", () => {
  it("has 11 supported corridors", () => {
    expect(CORRIDOR_COUNT).toBe(11);
  });

  it("has contiguous corridor IDs starting at 1", () => {
    const ids = CORRIDOR_OPTIONS.map((c) => c.id);
    for (let i = 1; i <= ids.length; i++) {
      expect(ids).toContain(i);
    }
  });

  it("covers the six new LATAM/Africa/Asia corridors", () => {
    const labels = CORRIDOR_OPTIONS.map((c) => `${c.from}→${c.to}`);
    expect(labels).toContain("US→AR");
    expect(labels).toContain("US→GH");
    expect(labels).toContain("US→KE");
    expect(labels).toContain("US→ID");
    expect(labels).toContain("US→VN");
    expect(labels).toContain("US→TH");
  });

  it("corridorLabel formats id 1 as US → PH", () => {
    expect(corridorLabel(1)).toBe("US → PH");
  });

  it("corridorLabel falls back for unknown id", () => {
    expect(corridorLabel(999)).toBe("?? → ??");
  });

  it("corridorFor returns both legs", () => {
    expect(corridorFor(6)).toEqual({ from: "US", to: "AR" });
  });

  it("corridorFor falls back for unknown id", () => {
    expect(corridorFor(999)).toEqual({ from: "??", to: "??" });
  });

  it("CORRIDORS keys match corridor ids", () => {
    for (const [id, c] of Object.entries(CORRIDORS)) {
      expect(Number(id)).toBe(c.id);
    }
  });
});
