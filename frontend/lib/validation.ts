// OWASP Input Validation — Sanitize and validate all user-supplied data.
// Rejects unexpected fields, enforces type/length/format constraints.

const STELLAR_PUBLIC_KEY_RE = /^G[A-Z2-7]{55}$/;
const SOROBAN_CONTRACT_ID_RE = /^C[A-Z0-9]{50,55}$/;
const MAX_AMOUNT_XLM = 10_000_000; // generous upper bound for testnet
const MIN_AMOUNT_XLM = 0.0000001;
const MAX_CONTRACT_ID_LEN = 64;
const MAX_ADDRESS_LEN = 56;
const MAX_AMOUNT_STR_LEN = 20;

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

interface SchemaField {
  name: string;
  type: "stellarAddress" | "contractId" | "stellarSecret" | "xlmAmount" | "string";
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
}

// OWASP: Validate Stellar public key format (G-address, base32, 56 chars)
export function validateStellarAddress(input: unknown): ValidationResult {
  if (typeof input !== "string") return { valid: false, error: "Address must be a string" };
  const trimmed = input.trim();
  if (trimmed.length === 0) return { valid: false, error: "Address is required" };
  if (trimmed.length > MAX_ADDRESS_LEN)
    return { valid: false, error: `Address too long (max ${MAX_ADDRESS_LEN} chars)` };
  if (!STELLAR_PUBLIC_KEY_RE.test(trimmed))
    return { valid: false, error: "Invalid Stellar address format (must start with G, 56 chars, base32)" };
  return { valid: true, sanitized: trimmed };
}

// OWASP: Validate Soroban contract ID format (C-address, hex)
export function validateContractId(input: unknown): ValidationResult {
  if (typeof input !== "string") return { valid: false, error: "Contract ID must be a string" };
  const trimmed = input.trim();
  if (trimmed.length === 0) return { valid: false, error: "Contract ID is required" };
  if (trimmed.length > MAX_CONTRACT_ID_LEN)
    return { valid: false, error: `Contract ID too long (max ${MAX_CONTRACT_ID_LEN} chars)` };
  if (!SOROBAN_CONTRACT_ID_RE.test(trimmed))
    return { valid: false, error: "Invalid Soroban contract ID format (must start with C, 56 chars)" };
  return { valid: true, sanitized: trimmed };
}

// OWASP: Validate XLM amount — numeric, within bounds, sensible precision
export function validateXlmAmount(input: unknown): ValidationResult {
  if (input === undefined || input === null) return { valid: false, error: "Amount is required" };
  const str = typeof input === "string" ? input : String(input);
  const trimmed = str.trim();
  if (trimmed.length === 0) return { valid: false, error: "Amount is required" };
  if (trimmed.length > MAX_AMOUNT_STR_LEN)
    return { valid: false, error: `Amount too long (max ${MAX_AMOUNT_STR_LEN} chars)` };

  const num = Number.parseFloat(trimmed);
  if (Number.isNaN(num) || !Number.isFinite(num))
    return { valid: false, error: "Amount must be a valid number" };
  if (num < MIN_AMOUNT_XLM)
    return { valid: false, error: `Amount must be at least ${MIN_AMOUNT_XLM} XLM` };
  if (num > MAX_AMOUNT_XLM)
    return { valid: false, error: `Amount exceeds maximum allowed (${MAX_AMOUNT_XLM} XLM)` };

  // reject scientific notation and non-numeric characters
  if (!/^\d+(\.\d+)?$/.test(trimmed))
    return { valid: false, error: "Amount must be a plain decimal number" };

  return { valid: true, sanitized: trimmed };
}

// OWASP: Validate a generic string field
export function validateString(
  input: unknown,
  maxLength: number = 256,
): ValidationResult {
  if (typeof input !== "string") return { valid: false, error: "Must be a string" };
  const trimmed = input.trim();
  if (trimmed.length === 0) return { valid: false, error: "Field is required" };
  if (trimmed.length > maxLength)
    return { valid: false, error: `Value too long (max ${maxLength} chars)` };
  return { valid: true, sanitized: trimmed };
}

// OWASP: Strict schema validation — rejects unexpected fields
export function validateSchema(
  data: unknown,
  schema: SchemaField[],
): { valid: boolean; errors: Record<string, string>; sanitized: Record<string, string> } {
  const errors: Record<string, string> = {};
  const sanitized: Record<string, string> = {};

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { valid: false, errors: { _root: "Request body must be a JSON object" }, sanitized: {} };
  }

  const obj = data as Record<string, unknown>;

  // OWASP: reject unexpected top-level fields
  const allowedFields = new Set(schema.map((f) => f.name));
  for (const key of Object.keys(obj)) {
    if (!allowedFields.has(key)) {
      errors[key] = `Unexpected field: "${key}"`;
    }
  }

  for (const field of schema) {
    const val = obj[field.name];

    if (field.required && (val === undefined || val === null || (typeof val === "string" && val.trim() === ""))) {
      errors[field.name] = `${field.name} is required`;
      continue;
    }

    if (val === undefined || val === null) continue; // optional field not provided

    switch (field.type) {
      case "stellarAddress": {
        const r = validateStellarAddress(val);
        if (!r.valid) errors[field.name] = r.error!;
        else sanitized[field.name] = r.sanitized!;
        break;
      }
      case "contractId": {
        const r = validateContractId(val);
        if (!r.valid) errors[field.name] = r.error!;
        else sanitized[field.name] = r.sanitized!;
        break;
      }
      case "xlmAmount": {
        const r = validateXlmAmount(val);
        if (!r.valid) errors[field.name] = r.error!;
        else sanitized[field.name] = r.sanitized!;
        break;
      }
      case "string": {
        const r = validateString(val, field.maxLength ?? 256);
        if (!r.valid) errors[field.name] = r.error!;
        else sanitized[field.name] = r.sanitized!;
        break;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors, sanitized };
}
