const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const saPath = path.join(__dirname, "..", "service-account.json");
const serviceAccount = JSON.parse(fs.readFileSync(saPath, "utf8"));

admin.initializeApp({ credential: admin.cert(serviceAccount) });
const db = getFirestore();
const ts = FieldValue.serverTimestamp();

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "seed-data.json"), "utf8"));

async function seed() {
  console.log("Seeding Firestore...\n");

  for (const [collection, items] of Object.entries(data)) {
    const batch = db.batch();
    for (const item of items) {
      const ref = db.collection(collection).doc(item.id);
      batch.set(ref, { ...item, createdAt: ts });
    }
    await batch.commit();
    console.log(`  ✓ ${items.length} ${collection}`);
  }

  console.log("\nDone!");
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
