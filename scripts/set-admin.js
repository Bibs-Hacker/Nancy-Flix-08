#!/usr/bin/env node
/* NANCYFLIX — grant Admin Studio access to an account (one time).
 *
 *   npm install firebase-admin
 *   node scripts/set-admin.js someone@example.com
 *
 * Put the Firebase service account file next to this script as
 * serviceAccount.json (Project settings > Service accounts > Generate new
 * private key). The file is a master key: never commit or share it.
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: node scripts/set-admin.js someone@example.com');
  process.exit(1);
}

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'serviceAccount.json');
if (!fs.existsSync(keyPath)) {
  console.error('No service account file found at ' + keyPath);
  console.error('Download it from Firebase: Project settings > Service accounts > Generate new private key,');
  console.error('save it as serviceAccount.json next to this script (or set GOOGLE_APPLICATION_CREDENTIALS).');
  process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(creds) });

(async () => {
  const user = await admin.auth().getUserByEmail(email);
  const claims = Object.assign({}, user.customClaims || {}, { admin: true });
  await admin.auth().setCustomUserClaims(user.uid, claims);
  console.log('Done. ' + email + ' is now an admin (uid ' + user.uid + ').');
  console.log('Sign out and back in on the site so the new permission is picked up.');
})().catch((err) => {
  console.error('Could not set the admin flag: ' + (err && err.message ? err.message : err));
  process.exit(1);
});
