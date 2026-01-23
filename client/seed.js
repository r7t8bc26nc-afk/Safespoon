const admin = require('firebase-admin');

// TODO: Replace with the path to your actual service account key file
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * DATASET
 * 5 Chains, 5 Items each.
 * Structure designed for easy copy-pasting of more data.
 */
const DATASET = [
  {
    restaurant_name: "McDonald's",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/3/36/McDonald%27s_Golden_Arches.svg",
    type: "Fast Food",
    menu_items: [
      {
        name: "Big Mac",
        category: "Burgers",
        price: 5.99,
        description: "The one and only. Two 100% beef patties, special sauce, lettuce, cheese, pickles, onions on a sesame seed bun.",
        nutrition: {
          calories: 550,
          protein_g: 25,
          carbs_g: 45,
          total_fat_g: 30,
          sodium_mg: 1010,
          sugar_g: 9,
          saturated_fat_g: 11,
          trans_fat_g: 1, // Detrimental
          cholesterol_mg: 80
        },
        dietary_flags: {
          is_gluten_free: false,
          is_vegan: false,
          is_vegetarian: false,
          contains_nuts: false,
          contains_dairy: true,
          contains_soy: true,
          contains_shellfish: false
        }
      },
      {
        name: "World Famous Fries (Medium)",
        category: "Sides",
        price: 2.79,
        description: "Golden outside, soft and fluffy inside.",
        nutrition: {
          calories: 320,
          protein_g: 5,
          carbs_g: 43,
          total_fat_g: 15,
          sodium_mg: 260,
          sugar_g: 0,
          saturated_fat_g: 2,
          trans_fat_g: 0,
          cholesterol_mg: 0
        },
        dietary_flags: {
          is_gluten_free: true, // Note: Cross-contamination risks exist, but ingredients are GF
          is_vegan: true,
          is_vegetarian: true,
          contains_nuts: false,
          contains_dairy: false,
          contains_soy: true, // often fried in oil with soy derivatives
          contains_shellfish: false
        }
      },
      {
        name: "McChicken",
        category: "Sandwiches",
        price: 1.99,
        description: "Crispy chicken patty topped with shredded lettuce and just the right amount of creamy mayonnaise.",
        nutrition: {
          calories: 400,
          protein_g: 14,
          carbs_g: 39,
          total_fat_g: 21,
          sodium_mg: 560,
          sugar_g: 5,
          saturated_fat_g: 3.5,
          trans_fat_g: 0,
          cholesterol_mg: 40
        },
        dietary_flags: {
          is_gluten_free: false,
          is_vegan: false,
          is_vegetarian: false,
          contains_nuts: false,
          contains_dairy: false, // Patty usually dairy-free, bun may contain traces
          contains_soy: true,
          contains_shellfish: false
        }
      },
      {
        name: "Baked Apple Pie",
        category: "Dessert",
        price: 1.29,
        description: "100% American-grown apples, lattice crust baked to perfection.",
        nutrition: {
          calories: 230,
          protein_g: 2,
          carbs_g: 33,
          total_fat_g: 11,
          sodium_mg: 130,
          sugar_g: 13,
          saturated_fat_g: 5,
          trans_fat_g: 0,
          cholesterol_mg: 0
        },
        dietary_flags: {
          is_gluten_free: false,
          is_vegan: true,
          is_vegetarian: true,
          contains_nuts: false,
          contains_dairy: false,
          contains_soy: false,
          contains_shellfish: false
        }
      },
      {
        name: "Coca-Cola (Medium)",
        category: "Beverages",
        price: 1.99,
        description: "Ice-cold Coca-Cola.",
        nutrition: {
          calories: 220,
          protein_g: 0,
          carbs_g: 60,
          total_fat_g: 0,
          sodium_mg: 15,
          sugar_g: 60, // High detrimental sugar
          saturated_fat_g: 0,
          trans_fat_g: 0,
          cholesterol_mg: 0
        },
        dietary_flags: {
          is_gluten_free: true,
          is_vegan: true,
          is_vegetarian: true,
          contains_nuts: false,
          contains_dairy: false,
          contains_soy: false,
          contains_shellfish: false
        }
      }
    ]
  },
  {
    restaurant_name: "Taco Bell",
    logo_url: "https://upload.wikimedia.org/wikipedia/en/b/b3/Taco_Bell_2016.svg",
    type: "Fast Food",
    menu_items: [
      {
        name: "Crunchy Taco",
        category: "Tacos",
        price: 1.79,
        description: "A crunchy corn taco shell filled with seasoned beef, crisp lettuce, and cheddar cheese.",
        nutrition: {
          calories: 170,
          protein_g: 8,
          carbs_g: 13,
          total_fat_g: 9,
          sodium_mg: 310,
          sugar_g: 1,
          saturated_fat_g: 3.5,
          trans_fat_g: 0,
          cholesterol_mg: 25
        },
        dietary_flags: {
          is_gluten_free: true, // If strictly corn shell, but cross contamination high
          is_vegan: false,
          is_vegetarian: false,
          contains_nuts: false,
          contains_dairy: true,
          contains_soy: true,
          contains_shellfish: false
        }
      },
      {
        name: "Bean Burrito",
        category: "Burritos",
        price: 1.99,
        description: "Warm flour tortilla loaded with beans, red sauce, onions, and cheese.",
        nutrition: {
          calories: 350,
          protein_g: 13,
          carbs_g: 54,
          total_fat_g: 9,
          sodium_mg: 1000,
          sugar_g: 3,
          saturated_fat_g: 3,
          trans_fat_g: 0,
          cholesterol_mg: 10
        },
        dietary_flags: {
          is_gluten_free: false,
          is_vegan: false, // Contains cheese
          is_vegetarian: true,
          contains_nuts: false,
          contains_dairy: true,
          contains_soy: true,
          contains_shellfish: false
        }
      },
      {
        name: "Chicken Quesadilla",
        category: "Quesadillas",
        price: 4.69,
        description: "Grilled chicken, three-cheese blend, and creamy jalapeño sauce in a flour tortilla.",
        nutrition: {
          calories: 520,
          protein_g: 26,
          carbs_g: 41,
          total_fat_g: 27,
          sodium_mg: 1250,
          sugar_g: 4,
          saturated_fat_g: 11,
          trans_fat_g: 0.5,
          cholesterol_mg: 85
        },
        dietary_flags: {
          is_gluten_free: false,
          is_vegan: false,
          is_vegetarian: false,
          contains_nuts: false,
          contains_dairy: true,
          contains_soy: true,
          contains_shellfish: false
        }
      },
      {
        name: "Nachos BellGrande",
        category: "Nachos",
        price: 5.49,
        description: "Portion of tortilla chips topped with beans, seasoned beef, warm nacho cheese sauce, sour cream, and tomatoes.",
        nutrition: {
          calories: 740,
          protein_g: 16,
          carbs_g: 82,
          total_fat_g: 38,
          sodium_mg: 1130,
          sugar_g: 5,
          saturated_fat_g: 7,
          trans_fat_g: 0,
          cholesterol_mg: 35
        },
        dietary_flags: {
          is_gluten_free: false, // Chips often have gluten trace/shared fryer
          is_vegan: false,
          is_vegetarian: false,
          contains_nuts: false,
          contains_dairy: true,
          contains_soy: true,
          contains_shellfish: false
        }
      },
      {
        name: "Cinnamon Twists",
        category: "Dessert",
        price: 1.00,
        description: "Crispy, puffed corn twists sprinkled with cinnamon and sugar.",
        nutrition: {
          calories: 170,
          protein_g: 1,
          carbs_g: 27,
          total_fat_g: 6,
          sodium_mg: 210,
          sugar_g: 13,
          saturated_fat_g: 0.5,
          trans_fat_g: 0,
          cholesterol_mg: 0
        },
        dietary_flags: {
          is_gluten_free: true, // Ingredients are GF, but fryer risk
          is_vegan: true,
          is_vegetarian: true,
          contains_nuts: false,
          contains_dairy: false,
          contains_soy: false,
          contains_shellfish: false
        }
      }
    ]
  },
  {
    restaurant_name: "Chick-fil-A",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/0/02/Chick-fil-A_Logo.svg",
    type: "Fast Food",
    menu_items: [
      {
        name: "Chick-fil-A Chicken Sandwich",
        category: "Sandwiches",
        price: 4.59,
        description: "A boneless breast of chicken seasoned to perfection, freshly breaded, pressure cooked in 100% refined peanut oil and served on a toasted, buttered bun with dill pickle chips.",
        nutrition: {
          calories: 440,
          protein_g: 29,
          carbs_g: 41,
          total_fat_g: 17,
          sodium_mg: 1400,
          sugar_g: 6,
          saturated_fat_g: 4,
          trans_fat_g: 0,
          cholesterol_mg: 70
        },
        dietary_flags: {
          is_gluten_free: false,
          is_vegan: false,
          is_vegetarian: false,
          contains_nuts: false, // Peanut oil is refined and usually exempt, but good to flag or note
          contains_dairy: true,
          contains_soy: true,
          contains_shellfish: false
        }
      },
      {
        name: "Waffle Potato Fries (Medium)",
        category: "Sides",
        price: 2.35,
        description: "Waffle-cut potatoes cooked in canola oil until crispy outside and tender inside.",
        nutrition: {
          calories: 420,
          protein_g: 5,
          carbs_g: 45,
          total_fat_g: 24,
          sodium_mg: 240,
          sugar_g: 0,
          saturated_fat_g: 2,
          trans_fat_g: 0,
          cholesterol_mg: 0
        },
        dietary_flags: {
          is_gluten_free: true,
          is_vegan: true,
          is_vegetarian: true,
          contains_nuts: false,
          contains_dairy: false,
          contains_soy: false,
          contains_shellfish: false
        }
      },
      {
        name: "Nuggets (8ct)",
        category: "Entree",
        price: 4.49,
        description: "Bite-sized pieces of boneless chicken breast, seasoned to perfection.",
        nutrition: {
          calories: 250,
          protein_g: 27,
          carbs_g: 11,
          total_fat_g: 11,
          sodium_mg: 1210,
          sugar_g: 1,
          saturated_fat_g: 2.5,
          trans_fat_g: 0,
          cholesterol_mg: 85
        },
        dietary_flags: {
          is_gluten_free: false,
          is_vegan: false,
          is_vegetarian: false,
          contains_nuts: false,
          contains_dairy: true,
          contains_soy: true,
          contains_shellfish: false
        }
      },
      {
        name: "Grilled Nuggets (8ct)",
        category: "Entree",
        price: 5.19,
        description: "Bite-sized boneless chicken breast, marinated and grilled.",
        nutrition: {
          calories: 130,
          protein_g: 25,
          carbs_g: 1,
          total_fat_g: 3,
          sodium_mg: 440,
          sugar_g: 0,
          saturated_fat_g: 0.5,
          trans_fat_g: 0,
          cholesterol_mg: 70
        },
        dietary_flags: {
          is_gluten_free: true,
          is_vegan: false,
          is_vegetarian: false,
          contains_nuts: false,
          contains_dairy: false,
          contains_soy: false,
          contains_shellfish: false
        }
      },
      {
        name: "Fresh Lemonade (Medium)",
        category: "Beverages",
        price: 2.39,
        description: "Classic lemonade using real lemons, water, and sugar.",
        nutrition: {
          calories: 220,
          protein_g: 0,
          carbs_g: 58,
          total_fat_g: 0,
          sodium_mg: 10,
          sugar_g: 55,
          saturated_fat_g: 0,
          trans_fat_g: 0,
          cholesterol_mg: 0
        },
        dietary_flags: {
          is_gluten_free: true,
          is_vegan: true,
          is_vegetarian: true,
          contains_nuts: false,
          contains_dairy: false,
          contains_soy: false,
          contains_shellfish: false
        }
      }
    ]
  },
  {
    restaurant_name: "Starbucks",
    logo_url: "https://upload.wikimedia.org/wikipedia/en/d/d3/Starbucks_Corporation_Logo_2011.svg",
    type: "Coffeehouse",
    menu_items: [
      {
        name: "Caffè Latte (Grande)",
        category: "Coffee",
        price: 4.45,
        description: "Dark, rich espresso balanced with steamed milk and a light layer of foam.",
        nutrition: {
          calories: 190,
          protein_g: 13,
          carbs_g: 19,
          total_fat_g: 7,
          sodium_mg: 170,
          sugar_g: 18,
          saturated_fat_g: 4.5,
          trans_fat_g: 0,
          cholesterol_mg: 30
        },
        dietary_flags: {
          is_gluten_free: true,
          is_vegan: false, // Can be made vegan with oat/almond milk
          is_vegetarian: true,
          contains_nuts: false,
          contains_dairy: true,
          contains_soy: false,
          contains_shellfish: false
        }
      },
      {
        name: "Butter Croissant",
        category: "Bakery",
        price: 2.95,
        description: "Classic butter croissant with soft, flaky layers and a golden-brown crust.",
        nutrition: {
          calories: 260,
          protein_g: 5,
          carbs_g: 32,
          total_fat_g: 15,
          sodium_mg: 320,
          sugar_g: 5,
          saturated_fat_g: 9,
          trans_fat_g: 0.5,
          cholesterol_mg: 45
        },
        dietary_flags: {
          is_gluten_free: false,
          is_vegan: false,
          is_vegetarian: true,
          contains_nuts: false,
          contains_dairy: true,
          contains_soy: false,
          contains_shellfish: false
        }
      },
      {
        name: "Bacon & Gruyère Sous Vide Egg Bites",
        category: "Hot Breakfast",
        price: 4.95,
        description: "Velvety cage-free eggs with aged Gruyère and Monterey Jack cheeses, topped with applewood-smoked bacon.",
        nutrition: {
          calories: 300,
          protein_g: 19,
          carbs_g: 9,
          total_fat_g: 20,
          sodium_mg: 680,
          sugar_g: 2,
          saturated_fat_g: 12, // High saturated fat
          trans_fat_g: 0,
          cholesterol_mg: 215
        },
        dietary_flags: {
          is_gluten_free: true, // Gluten free ingredients (Wheat free)
          is_vegan: false,
          is_vegetarian: false,
          contains_nuts: false,
          contains_dairy: true,
          contains_soy: false,
          contains_shellfish: false
        }
      },
      {
        name: "Blueberry Muffin",
        category: "Bakery",
        price: 3.25,
        description: "A moist muffin packed with juicy blueberries and a hint of lemon.",
        nutrition: {
          calories: 360,
          protein_g: 5,
          carbs_g: 52,
          total_fat_g: 15,
          sodium_mg: 330,
          sugar_g: 29,
          saturated_fat_g: 3,
          trans_fat_g: 0,
          cholesterol_mg: 55
        },
        dietary_flags: {
          is_gluten_free: false,
          is_vegan: false,
          is_vegetarian: true,
          contains_nuts: false,
          contains_dairy: true,
          contains_soy: true,
          contains_shellfish: false
        }
      },
      {
        name: "Caramel Macchiato (Grande)",
        category: "Coffee",
        price: 5.25,
        description: "Freshly steamed milk with vanilla-flavored syrup marked with espresso and topped with a caramel drizzle.",
        nutrition: {
          calories: 250,
          protein_g: 10,
          carbs_g: 35,
          total_fat_g: 7,
          sodium_mg: 150,
          sugar_g: 33,
          saturated_fat_g: 4.5,
          trans_fat_g: 0,
          cholesterol_mg: 25
        },
        dietary_flags: {
          is_gluten_free: true,
          is_vegan: false,
          is_vegetarian: true,
          contains_nuts: false,
          contains_dairy: true,
          contains_soy: false,
          contains_shellfish: false
        }
      }
    ]
  },
  {
    restaurant_name: "Subway",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Subway_2016_Logo.svg",
    type: "Sandwiches",
    menu_items: [
      {
        name: "Oven Roasted Turkey (6 inch)",
        category: "Sandwiches",
        price: 6.99,
        description: "Thinly sliced oven roasted turkey on freshly baked bread.",
        nutrition: {
          calories: 270,
          protein_g: 21,
          carbs_g: 41,
          total_fat_g: 3.5,
          sodium_mg: 820,
          sugar_g: 6,
          saturated_fat_g: 1,
          trans_fat_g: 0,
          cholesterol_mg: 25
        },
        dietary_flags: {
          is_gluten_free: false,
          is_vegan: false,
          is_vegetarian: false,
          contains_nuts: false,
          contains_dairy: false, // Default build no cheese
          contains_soy: true,
          contains_shellfish: false
        }
      },
      {
        name: "Tuna (6 inch)",
        category: "Sandwiches",
        price: 7.49,
        description: "Flaked tuna mixed with creamy mayonnaise.",
        nutrition: {
          calories: 450,
          protein_g: 19,
          carbs_g: 38,
          total_fat_g: 25,
          sodium_mg: 630,
          sugar_g: 5,
          saturated_fat_g: 4.5,
          trans_fat_g: 0,
          cholesterol_mg: 40
        },
        dietary_flags: {
          is_gluten_free: false,
          is_vegan: false,
          is_vegetarian: false, // Pescatarian
          contains_nuts: false,
          contains_dairy: false,
          contains_soy: true,
          contains_shellfish: false // Tuna is fish, not shellfish, but cross contamination risk
        }
      },
      {
        name: "Italian B.M.T.® (Footlong)",
        category: "Sandwiches",
        price: 10.99,
        description: "Packed with Genoa salami, spicy pepperoni, and Black Forest ham.",
        nutrition: {
          calories: 780,
          protein_g: 38,
          carbs_g: 88,
          total_fat_g: 32,
          sodium_mg: 2500, // VERY High sodium
          sugar_g: 12,
          saturated_fat_g: 11,
          trans_fat_g: 1,
          cholesterol_mg: 95
        },
        dietary_flags: {
          is_gluten_free: false,
          is_vegan: false,
          is_vegetarian: false,
          contains_nuts: false,
          contains_dairy: false,
          contains_soy: true,
          contains_shellfish: false
        }
      },
      {
        name: "Chocolate Chip Cookie",
        category: "Dessert",
        price: 0.99,
        description: "Freshly baked cookie with chocolate chips.",
        nutrition: {
          calories: 200,
          protein_g: 2,
          carbs_g: 30,
          total_fat_g: 10,
          sodium_mg: 100,
          sugar_g: 18,
          saturated_fat_g: 5,
          trans_fat_g: 0.5,
          cholesterol_mg: 15
        },
        dietary_flags: {
          is_gluten_free: false,
          is_vegan: false,
          is_vegetarian: true,
          contains_nuts: false,
          contains_dairy: true,
          contains_soy: true,
          contains_shellfish: false
        }
      },
      {
        name: "Lay's Classic Potato Chips",
        category: "Sides",
        price: 1.49,
        description: "Crispy salted potato chips.",
        nutrition: {
          calories: 240,
          protein_g: 2,
          carbs_g: 23,
          total_fat_g: 15,
          sodium_mg: 250,
          sugar_g: 1,
          saturated_fat_g: 2.5,
          trans_fat_g: 0,
          cholesterol_mg: 0
        },
        dietary_flags: {
          is_gluten_free: true,
          is_vegan: true,
          is_vegetarian: true,
          contains_nuts: false,
          contains_dairy: false,
          contains_soy: false,
          contains_shellfish: false
        }
      }
    ]
  }
];

/**
 * Validates a menu item's data to ensure no nulls and defaults to 0.
 * Logs warnings for missing data.
 */
function validateAndCleanItem(item, restaurantName) {
  const cleanItem = { ...item };
  
  // Required Numeric Fields to check
  const requiredNutrition = [
    'calories', 'protein_g', 'carbs_g', 'total_fat_g', 
    'sodium_mg', 'sugar_g', 'saturated_fat_g', 'trans_fat_g', 'cholesterol_mg'
  ];

  if (!cleanItem.nutrition) {
    cleanItem.nutrition = {};
    console.warn(`⚠️ Warning: ${item.name} from ${restaurantName} missing nutrition object.`);
  }

  requiredNutrition.forEach(field => {
    if (cleanItem.nutrition[field] === undefined || cleanItem.nutrition[field] === null) {
      console.warn(`⚠️ Warning: ${item.name} (${restaurantName}) missing '${field}'. Defaulting to 0.`);
      cleanItem.nutrition[field] = 0;
    }
  });

  // Ensure dietary flags exist
  const requiredFlags = [
    'is_gluten_free', 'is_vegan', 'is_vegetarian', 
    'contains_nuts', 'contains_dairy', 'contains_soy', 'contains_shellfish'
  ];

  if (!cleanItem.dietary_flags) {
     cleanItem.dietary_flags = {};
  }

  requiredFlags.forEach(flag => {
    if (cleanItem.dietary_flags[flag] === undefined || cleanItem.dietary_flags[flag] === null) {
      // Default to FALSE for safety (don't assume safe)
      // Exception: If we don't know if it's vegan, false is safer.
      cleanItem.dietary_flags[flag] = false;
    }
  });

  return cleanItem;
}

/**
 * Main Seed Function
 */
async function seedDatabase() {
  console.log('🚀 Starting Database Seed...');

  for (const restaurant of DATASET) {
    try {
      // 1. Create Restaurant Document
      // We use the name as ID to prevent duplicates if you re-run, or remove .doc(restaurant.name) to auto-gen IDs
      const restaurantRef = db.collection('restaurants').doc(restaurant.restaurant_name);
      
      await restaurantRef.set({
        name: restaurant.restaurant_name,
        logo_url: restaurant.logo_url,
        type: restaurant.type,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Restaurant added: ${restaurant.restaurant_name}`);

      // 2. Add Menu Items to Sub-collection
      const batch = db.batch();
      let opCount = 0;

      for (const item of restaurant.menu_items) {
        const cleanItem = validateAndCleanItem(item, restaurant.restaurant_name);
        
        // Create a new doc reference in the sub-collection
        const itemRef = restaurantRef.collection('menu_items').doc(); 
        batch.set(itemRef, cleanItem);
        opCount++;
      }

      await batch.commit();
      console.log(`   - Added ${opCount} menu items to ${restaurant.restaurant_name}`);

    } catch (error) {
      console.error(`❌ Error seeding ${restaurant.restaurant_name}:`, error);
    }
  }

  console.log('🎉 Seeding Complete!');
}

// Run the script
seedDatabase();