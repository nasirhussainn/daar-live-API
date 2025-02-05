const admin = require("firebase-admin");

// Load Firebase private key (replace with your actual file path)
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
