const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const KEY_DIR = path.join(__dirname, '../keys');
const PRIVATE_KEY_PATH = path.join(KEY_DIR, 'rsa_private.pem');
const PUBLIC_KEY_PATH = path.join(KEY_DIR, 'rsa_public.pem');

let privateKey = null;
let publicKey = null;

function initKeys() {
  if (!fs.existsSync(KEY_DIR)) {
    fs.mkdirSync(KEY_DIR, { recursive: true });
  }

  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
  } else {
    const { privateKey: priv, publicKey: pub } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    fs.writeFileSync(PRIVATE_KEY_PATH, priv);
    fs.writeFileSync(PUBLIC_KEY_PATH, pub);
    privateKey = priv;
    publicKey = pub;
  }
}

function getPublicKey() {
  if (!publicKey) initKeys();
  return publicKey;
}

function decryptPassword(encryptedPassword) {
  if (!privateKey) initKeys();
  const decrypted = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(encryptedPassword, 'base64')
  );
  return decrypted.toString('utf8');
}

initKeys();

module.exports = { getPublicKey, decryptPassword };
