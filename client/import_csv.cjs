const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');

// 1. Setup Firebase
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// 2. Helper to guess category (Optional, since CSVs might not have it)
function guessCategory(itemName) {
  const name = itemName.toLowerCase();
  if (name.includes('burger')) return 'Burgers';
  if (name.includes('fries') || name.includes('tots')) return 'Sides';
  if (name.includes('shake') || name.includes('ice cream')) return 'Dessert';
  if (name.includes('chicken') || name.includes('nugget')) return 'Poultry';
  if (name.includes('salad')) return 'Salads';
  return 'Entree';
}

// 3. Main Import Function
async function importCsvData() {
  const results = [];
  
  console.log("⏳ Reading CSV file...");

  fs.createReadStream('menu_data.csv') // Ensure this matches your filename
    .pipe(csv())
    .on('data', (row) => {
      // Clean up the row keys (sometimes CSVs have weird casing)
      // This mapping depends on the specific CSV headers. 
      // Common Kaggle headers: "restaurant", "item", "calories", "total_fat", "sugar", "sodium"
      
      const restaurantName = row['restaurant'] || row['Company'];
      const itemName = row['item'] || row['Item'];
      
      if (!restaurantName || !itemName) return;

      const newItem = {
        restaurant: restaurantName,
        item: {
          name: itemName,
          category: guessCategory(itemName),
          // Price is rarely in nutrition CSVs, defaulting to 0 or a placeholder
          price: 0, 
          description: `${itemName} from ${restaurantName}`,
          nutrition: {
            calories: Number(row['calories'] || row['Calories'] || 0),
            protein_g: Number(row['protein'] || row['Protein'] || 0),
            carbs_g: Number(row['total_carb'] || row['Carbs'] || 0),
            total_fat_g: Number(row['total_fat'] || row['Total Fat'] || 0),
            sodium_mg: Number(row['sodium'] || row['Sodium'] || 0),
            sugar_g: Number(row['sugar'] || row['Sugars'] || 0),
            saturated_fat_g: Number(row['sat_fat'] || row['Saturated Fat'] || 0),
            trans_fat_g: Number(row['trans_fat'] || row['Trans Fat'] || 0),
            cholesterol_mg: Number(row['cholesterol'] || row['Cholesterol'] || 0),
          },
          // CRITICAL SAFETY NOTE:
          // CSV datasets rarely contain reliable allergen info.
          // We default to FALSE or NULL to force a manual review.
          // Do NOT infer these programmatically for safety reasons.
          dietary_flags: {
            is_gluten_free: false, 
            is_vegan: false,
            is_vegetarian: false,
            contains_nuts: false,
            contains_dairy: false,
            contains_soy: false,
            contains_shellfish: false,
            // Add a flag for your UI to know this needs review
            requires_verification: true 
          }
        }
      };
      results.push(newItem);
    })
    .on('end', async () => {
      console.log(`✅ CSV Parsed! Found ${results.length} items.`);
      await uploadToFirestore(results);
    });
}

async function uploadToFirestore(data) {
  // Group by Restaurant to minimize writes
  const restaurants = {};
  
  data.forEach(entry => {
    if (!restaurants[entry.restaurant]) {
      restaurants[entry.restaurant] = [];
    }
    restaurants[entry.restaurant].push(entry.item);
  });

  const batchSize = 500; // Firestore batch limit
  let batch = db.batch();
  let count = 0;

  for (const [name, items] of Object.entries(restaurants)) {
    // 1. Create Restaurant Doc
    const restaurantRef = db.collection('restaurants').doc(name);
    batch.set(restaurantRef, {
      name: name,
      logo_url: "", // You can fill this later or map it manually
      type: "Chain",
      updated_at: new Date()
    });

    // 2. Create Menu Items
    for (const item of items) {
      const itemRef = restaurantRef.collection('menu_items').doc();
      batch.set(itemRef, item);
      count++;

      // Commit batch if full
      if (count >= batchSize) {
        await batch.commit();
        batch = db.batch();
        count = 0;
        console.log(`...Committing batch...`);
      }
    }
  }

  if (count > 0) await batch.commit();
  console.log("🎉 Database successfully populated from CSV!");
}

importCsvData();