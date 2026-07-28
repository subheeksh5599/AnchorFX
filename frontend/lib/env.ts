// Default to mainnet for production
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://mainnet.sorobanrpc.com";
export const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon.stellar.org";
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK ?? "PUBLIC";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anchorfx.vercel.app";
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@anchorfx.dev";
export const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? "https://github.com/subheeksh5599/AnchorFX";
export const ADMIN_PUBLIC_KEY = process.env.NEXT_PUBLIC_ADMIN_PUBLIC_KEY ?? "GDHMIQXJITKCXJ5IREK4MUEJKLSZVA6XKBF25WKVN3REC6OMMNENYSK5";
export const CONTRACT_ID = process.env.CONTRACT_ID ?? process.env.NEXT_PUBLIC_CONTRACT_ID ?? "CDGQ7K4XGAPG3YJVAGHCE45XOR63HLD6ARJCRESEEKSRQZSIRAKG6F6V";
export const XLM_SAC_ADDRESS = process.env.NEXT_PUBLIC_XLM_SAC_ADDRESS ?? "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
export const USDC_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS ?? "";
export const ORACLE_ID = process.env.NEXT_PUBLIC_ORACLE_ID ?? "CCOIG4R7AIUQTP5CURK4PFINFF2EVQTBGTCN636E2JY25FGY7L4K54KT";
