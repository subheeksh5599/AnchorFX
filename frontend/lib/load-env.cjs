// OWASP: Never hardcode secrets. Load from environment variables.
// Usage: const loadEnv = require("./load-env.cjs"); const { mnemonic, keypair } = loadEnv();

const StellarSdk = require("@stellar/stellar-sdk");
const HDWallet = require("stellar-hd-wallet").default;

function loadEnv() {
  const mnemonic = process.env.STELLAR_MNEMONIC;
  if (!mnemonic) {
    console.error("STELLAR_MNEMONIC environment variable is required");
    console.error("Create a .env file or export STELLAR_MNEMONIC=...");
    process.exit(1);
  }

  const wallet = HDWallet.fromMnemonic(mnemonic);
  const publicKey = wallet.getPublicKey(0);
  const secretKey = wallet.getSecret(0);
  const keypair = StellarSdk.Keypair.fromSecret(secretKey);

  return { mnemonic, publicKey, secretKey, keypair };
}

module.exports = loadEnv;
