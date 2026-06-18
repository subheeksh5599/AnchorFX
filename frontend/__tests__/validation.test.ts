import { describe, it, expect } from "vitest";
import {
  validateStellarAddress,
  validateContractId,
  validateXlmAmount,
  validateSchema,
} from "@/lib/validation";

describe("validateStellarAddress", () => {
  it("accepts valid testnet public key", () => {
    const r = validateStellarAddress("GC3Z6XEDF25KKJGGKF6V4ALMWWLWOD3KHKYM3DO5WJJTVHXJMEY64BWF");
    expect(r.valid).toBe(true);
    expect(r.sanitized).toBe("GC3Z6XEDF25KKJGGKF6V4ALMWWLWOD3KHKYM3DO5WJJTVHXJMEY64BWF");
  });

  it("rejects empty string", () => {
    const r = validateStellarAddress("");
    expect(r.valid).toBe(false);
    expect(r.error).toContain("required");
  });

  it("rejects non-Stellar format", () => {
    const r = validateStellarAddress("0x1234567890abcdef");
    expect(r.valid).toBe(false);
    expect(r.error).toContain("Invalid Stellar");
  });

  it("rejects address that is too long", () => {
    const r = validateStellarAddress("G" + "A".repeat(100));
    expect(r.valid).toBe(false);
    expect(r.error).toContain("too long");
  });

  it("rejects address with wrong prefix", () => {
    const r = validateStellarAddress("SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    expect(r.valid).toBe(false);
    expect(r.error).toContain("Invalid Stellar");
  });

  it("trims whitespace from valid address", () => {
    const r = validateStellarAddress("  GC3Z6XEDF25KKJGGKF6V4ALMWWLWOD3KHKYM3DO5WJJTVHXJMEY64BWF  ");
    expect(r.valid).toBe(true);
    expect(r.sanitized).toBe("GC3Z6XEDF25KKJGGKF6V4ALMWWLWOD3KHKYM3DO5WJJTVHXJMEY64BWF");
  });
});

describe("validateContractId", () => {
  it("accepts valid Soroban contract ID", () => {
    const r = validateContractId("CB4U7NLHDRGQQEKBNJ7GBPMXW4AA2VGTGEURS2FF34ZCRJMVOCFBKE26");
    expect(r.valid).toBe(true);
  });

  it("rejects empty string", () => {
    const r = validateContractId("");
    expect(r.valid).toBe(false);
  });

  it("rejects non-C prefix", () => {
    const r = validateContractId("GB4U7NLHDRGQQEKBNJ7GBPMXW4AA2VGTGEURS2FF34ZCRJMVOCFBKE26");
    expect(r.valid).toBe(false);
  });
});

describe("validateXlmAmount", () => {
  it("accepts valid amount", () => {
    const r = validateXlmAmount("100.5");
    expect(r.valid).toBe(true);
  });

  it("rejects negative amount", () => {
    const r = validateXlmAmount("-10");
    expect(r.valid).toBe(false);
  });

  it("rejects zero", () => {
    const r = validateXlmAmount("0");
    expect(r.valid).toBe(false);
    expect(r.error).toContain("at least");
  });

  it("rejects non-numeric input", () => {
    const r = validateXlmAmount("abc");
    expect(r.valid).toBe(false);
  });

  it("rejects scientific notation", () => {
    const r = validateXlmAmount("1e10");
    expect(r.valid).toBe(false);
  });

  it("rejects amount exceeding maximum", () => {
    const r = validateXlmAmount("20000000");
    expect(r.valid).toBe(false);
    expect(r.error).toContain("maximum");
  });

  it("accepts fractional XLM", () => {
    const r = validateXlmAmount("0.0000001");
    expect(r.valid).toBe(true);
  });
});

describe("validateSchema", () => {
  it("rejects unexpected fields", () => {
    const r = validateSchema({ is_admin: true, destination: "abc" }, [
      { name: "destination", type: "stellarAddress" as const },
    ]);
    expect(r.valid).toBe(false);
    expect(r.errors.is_admin).toContain("Unexpected");
  });

  it("accepts valid schema with optional field missing", () => {
    const r = validateSchema({ destination: "GC3Z6XEDF25KKJGGKF6V4ALMWWLWOD3KHKYM3DO5WJJTVHXJMEY64BWF" }, [
      { name: "destination", type: "stellarAddress" as const },
      { name: "memo", type: "string" as const },
    ]);
    expect(r.valid).toBe(true);
  });

  it("rejects when required field is missing", () => {
    const r = validateSchema({}, [
      { name: "destination", type: "stellarAddress" as const, required: true },
    ]);
    expect(r.valid).toBe(false);
    expect(r.errors.destination).toContain("required");
  });

  it("rejects non-object input", () => {
    const r = validateSchema("not-an-object", [
      { name: "key", type: "string" as const },
    ]);
    expect(r.valid).toBe(false);
    expect(r.errors._root).toContain("object");
  });
});
