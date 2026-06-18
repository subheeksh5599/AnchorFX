// OWASP: Never hardcode secrets. Load from environment variables.
// Accepts either STELLAR_SECRET_KEY (raw S...) or STELLAR_MNEMONIC (BIP39 phrase).
// Usage: const loadEnv = require("./load-env.cjs"); const { keypair } = loadEnv();

const StellarSdk = require("@stellar/stellar-sdk");
const HDWallet = require("stellar-hd-wallet").default;

function loadEnv() {
  const secretKey = process.env.STELLAR_SECRET_KEY;
  const mnemonic = process.env.STELLAR_MNEMONIC;

  if (secretKey) {
    const keypair = StellarSdk.Keypair.fromSecret(secretKey);
    return { publicKey: keypair.publicKey(), secretKey: secretKey, keypair };
  }

  if (mnemonic) {
    const wallet = HDWallet.fromMnemonic(mnemonic);
    const publicKey = wallet.getPublicKey(0);
    const sk = wallet.getSecret(0);
    const keypair = StellarSdk.Keypair.fromSecret(sk);
    return { publicKey, secretKey: sk, keypair };
  }

  console.error("STELLAR_SECRET_KEY or STELLAR_MNEMONIC environment variable is required");
  console.error("Create a .env file or export STELLAR_SECRET_KEY=S...");
  process.exit(1);
}

module.exports = loadEnv;
