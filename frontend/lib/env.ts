// Default to testnet (safe for development)
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK ?? "TESTNET";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anchorfx.vercel.app";
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@anchorfx.dev";
export const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? "https://github.com/subheeksh5599/AnchorFX";
export const ADMIN_PUBLIC_KEY = process.env.NEXT_PUBLIC_ADMIN_PUBLIC_KEY ?? "";
export const CONTRACT_ID = process.env.CONTRACT_ID ?? process.env.NEXT_PUBLIC_CONTRACT_ID ?? "";
export const XLM_SAC_ADDRESS = process.env.NEXT_PUBLIC_XLM_SAC_ADDRESS ?? "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
export const USDC_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS ?? "";
