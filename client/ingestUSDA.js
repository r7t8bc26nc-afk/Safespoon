import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- CONFIGURATION ---
const KEY_NAME = 'serviceAccountKey 2.json'; 
const TARGET_BRANDS = ['Arby\'s', 'McDonald\'s', 'Taco Bell', 'Kellogg\'s', 'Nestle', 'Tyson', 'Kraft', 'General Mills'];
const BATCH_SIZE = 500;

// --- INIT FIREBASE ---
const KEY_PATH = path.join(__dirname, KEY_NAME);
if (!fs.existsSync(KEY_PATH)) {
  console.error(`❌ ERROR: Could not find ${KEY_NAME}`);
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// --- HELPER: SAFETY PROFILE ---
const getSafetyProfile = (ing = "") => {
  const i = ing.toLowerCase();
  return {
    allergens: {
      milk: i.includes('milk') || i.includes('whey') || i.includes('casein'),
      eggs: i.includes('egg'),
      fish: i.includes('fish'),
      shellfish: i.includes('shrimp') || i.includes('crab'),
      treeNuts: i.includes('almond') || i.includes('walnut') || i.includes('cashew'),
      peanuts: i.includes('peanut'),
      wheat: i.includes('wheat') || i.includes('flour') || i.includes('gluten'),
      soy: i.includes('soy'),
      sesame: i.includes('sesame')
    }
  };
};

async function patchData() {
  console.log("🚀 Starting Flow-Controlled Patch...");

  // 1. CHECK FOR FILES
  if (!fs.existsSync(path.join(__dirname, 'food.csv'))) {
      console.error("❌ ERROR: Missing 'food.csv'.");
      process.exit(1);
  }

  // 2. LOAD NAMES (Fast)
  console.log("📥 Loading Names...");
  const nameMap = new Map();
  const nameStream = fs.createReadStream(path.join(__dirname, 'food.csv')).pipe(csv());
  
  for await (const row of nameStream) {
      if (row.fdc_id && row.description) {
          nameMap.set(row.fdc_id, row.description);
      }
  }
  console.log(`✅ Loaded ${nameMap.size} names.`);

  // 3. UPLOAD WITH FLOW CONTROL
  console.log("🩹 Patching database (Steady Mode)...");
  
  const dataStream = fs.createReadStream(path.join(__dirname, 'branded_food.csv')).pipe(csv());
  let batch = db.batch();
  let count = 0;
  let totalProcessed = 0;

  // KEY FIX: 'for await' pauses reading until the loop finishes!
  for await (const row of dataStream) {
      const brand = row.brand_owner;
      
      if (brand && TARGET_BRANDS.some(b => brand.includes(b))) {
          const realName = nameMap.get(row.fdc_id);
          if (!realName) continue;

          const docRef = db.collection('groceries').doc(row.fdc_id);
          const meta = getSafetyProfile(row.ingredients);

          batch.set(docRef, {
            fdcId: row.fdc_id,
            name: realName, 
            brand: brand,
            ingredients: row.ingredients,
            taxonomy: { category: row.branded_food_category },
            safetyProfile: { allergens: meta.allergens },
            lastUpdated: new Date().toISOString()
          }, { merge: true });

          count++;
          totalProcessed++;

          if (count >= BATCH_SIZE) {
            await batch.commit(); // This now PAUSES the file read while uploading
            console.log(`✅ Patched ${totalProcessed} items...`);
            batch = db.batch();
            count = 0;
          }
      }
  }

  if (count > 0) await batch.commit();
  console.log(`\n🎉 SUCCESS: ${totalProcessed} items repaired!`);
}

patchData();