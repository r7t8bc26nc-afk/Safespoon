import React, { useState } from 'react';
import { db } from '../firebase';
import { writeBatch, doc, collection, getDocs } from "firebase/firestore";

// Helper for dynamic dates
const getDate = (daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// --- 1. BLOG CONTENT ---
const SEED_BLOG_POSTS = [
    {
        id: 'safety-cross-contamination', // Explicit ID
        title: "Navigating Cross-Contamination",
        excerpt: "The hidden dangers in shared kitchens and how to spot them before you order.",
        category: "Safety",
        author: "SafeSpoon Team",
        date: getDate(2),
        readTime: "5 min read",
        image: "https://images.unsplash.com/photo-1556910103-1c02745a30bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        content: [
            "Cross-contamination happens when a food allergen is accidentally transferred to another food. This is the most common reason for reactions when dining out.",
            "Common red flags include: shared deep fryers (often used for both fries and breaded chicken), buffets where spoons are swapped, and steam wands on espresso machines.",
            "Always ask your server: 'Do you use separate cookware for allergy orders?' and 'Is there a dedicated prep area?'"
        ]
    },
    {
        id: 'nutrition-oat-vs-almond',
        title: "Oat vs Almond: The 2026 Guide",
        excerpt: "Which plant-based milk reigns supreme for coffee, baking, and nutrition?",
        category: "Nutrition",
        author: "SafeSpoon Team",
        date: getDate(5),
        readTime: "4 min read",
        image: "https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        content: [
            "Oat milk has taken the world by storm due to its creamy texture, making it the barista's favorite. However, if you have Celiac disease, you must ensure it is certified gluten-free, as oats are often processed with wheat.",
            "Almond milk is lower in calories but often thinner. It is great for smoothies but can separate in hot coffee."
        ]
    },
    {
        id: 'shopping-hidden-gluten',
        title: "Hidden Gluten in Your Pantry",
        excerpt: "Soy sauce, licorice, and salad dressings. The unexpected places wheat hides.",
        category: "Shopping",
        author: "SafeSpoon Team",
        date: getDate(10),
        readTime: "6 min read",
        image: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        content: [
            "Reading labels is an essential skill for safety. While 'Wheat' is required to be labeled in many countries, 'Barley' and 'Rye' often hide in ingredients list under 'Malt Flavoring' or 'Natural Flavors'.",
            "Soy Sauce is a major culprit, as traditional brewing involves wheat. Always look for Tamari or specifically labeled GF Soy Sauce."
        ]
    },
    {
        id: 'health-gut-healing',
        title: "5 Foods to Soothe Your Gut",
        excerpt: "Recovering from an accidental gluten or dairy exposure? Start here.",
        category: "Health",
        author: "SafeSpoon Team",
        date: getDate(14),
        readTime: "3 min read",
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        content: [
            "Bone Broth is rich in collagen and amino acids like glutamine, which may help support the integrity of the gut lining.",
            "Ginger has been used for centuries to treat nausea and inflammation. Try a ginger tea if you are feeling unsettled."
        ]
    }
];

// --- 2. REAL GROCERIES (With Explicit IDs) ---
// Using specific product IDs ensures we update the same item instead of creating duplicates.
const SEED_GROCERIES = [
    { 
        id: 'oatly-barista',
        name: 'Barista Oat Milk', brand: 'Oatly', category: 'Dairy Alt', 
        image: 'https://images.openfoodfacts.org/images/products/739/437/661/6036/front_en.6.400.jpg', 
        tags: ['Vegan', 'Gluten Free'], nutrition: { calories: 140, protein: '3g', carbs: '16g', fat: '7g' } 
    },
    { 
        id: 'nutpods-almond',
        name: 'Almond Creamer', brand: 'Nutpods', category: 'Dairy Alt', 
        image: 'https://images.openfoodfacts.org/images/products/085/563/100/5069/front_en.13.400.jpg', 
        tags: ['Whole30', 'Tree Nuts'], nutrition: { calories: 10, protein: '0g', carbs: '0g', fat: '1g' } 
    },
    { 
        id: 'kite-hill-chive',
        name: 'Chive Cream Cheese', brand: 'Kite Hill', category: 'Dairy Alt', 
        image: 'https://images.openfoodfacts.org/images/products/085/662/300/4427/front_en.16.400.jpg', 
        tags: ['Vegan', 'Tree Nuts'], nutrition: { calories: 70, protein: '2g', carbs: '2g', fat: '6g' } 
    },
    { 
        id: 'stonyfield-greek',
        name: 'Greek Yogurt', brand: 'Stonyfield', category: 'Dairy', 
        image: 'https://images.openfoodfacts.org/images/products/005/215/900/2030/front_en.14.400.jpg', 
        tags: ['Dairy', 'Gluten Free'], nutrition: { calories: 120, protein: '16g', carbs: '6g', fat: '0g' } 
    },
    { 
        id: 'kerrygold-butter',
        name: 'Butter', brand: 'Kerrygold', category: 'Dairy', 
        image: 'https://images.openfoodfacts.org/images/products/076/770/700/2149/front_en.4.400.jpg', 
        tags: ['Dairy', 'Keto'], nutrition: { calories: 100, protein: '0g', carbs: '0g', fat: '11g' } 
    },
    { 
        id: 'canyon-honey-bread',
        name: 'Honey Bread', brand: 'Canyon Bakehouse', category: 'Bakery', 
        image: 'https://images.openfoodfacts.org/images/products/085/358/400/2004/front_en.20.400.jpg', 
        tags: ['Gluten Free', 'Soy Free'], nutrition: { calories: 90, protein: '2g', carbs: '18g', fat: '1.5g' } 
    },
    { 
        id: 'siete-almond-tortilla',
        name: 'Almond Tortillas', brand: 'Siete', category: 'Bakery', 
        image: 'https://images.openfoodfacts.org/images/products/081/606/402/0000/front_en.23.400.jpg', 
        tags: ['Grain Free', 'Paleo'], nutrition: { calories: 190, protein: '6g', carbs: '34g', fat: '3g' } 
    },
    { 
        id: 'raos-marinara',
        name: 'Marinara', brand: "Rao's", category: 'Pantry', 
        image: 'https://images.openfoodfacts.org/images/products/074/747/900/0042/front_en.19.400.jpg', 
        tags: ['Keto', 'No Sugar'], nutrition: { calories: 80, protein: '1g', carbs: '4g', fat: '7g' } 
    },
    { 
        id: 'banza-pasta',
        name: 'Chickpea Pasta', brand: 'Banza', category: 'Pantry', 
        image: 'https://images.openfoodfacts.org/images/products/085/718/300/5005/front_en.23.400.jpg', 
        tags: ['High Protein', 'Gluten Free'], nutrition: { calories: 190, protein: '13g', carbs: '32g', fat: '3.5g' } 
    },
    { 
        id: 'primal-mayo',
        name: 'Avocado Mayo', brand: 'Primal Kitchen', category: 'Pantry', 
        image: 'https://images.openfoodfacts.org/images/products/085/523/200/5079/front_en.20.400.jpg', 
        tags: ['Paleo', 'Whole30'], nutrition: { calories: 100, protein: '0g', carbs: '0g', fat: '12g' } 
    },
    { 
        id: 'siete-chips',
        name: 'Tortilla Chips', brand: 'Siete', category: 'Snacks', 
        image: 'https://images.openfoodfacts.org/images/products/081/606/402/0130/front_en.12.400.jpg', 
        tags: ['Grain Free', 'Vegan'], nutrition: { calories: 130, protein: '1g', carbs: '19g', fat: '7g' } 
    },
    { 
        id: 'hippeas-puffs',
        name: 'Chickpea Puffs', brand: 'Hippeas', category: 'Snacks', 
        image: 'https://images.openfoodfacts.org/images/products/085/475/800/6020/front_en.16.400.jpg', 
        tags: ['Vegan', 'Gluten Free'], nutrition: { calories: 130, protein: '4g', carbs: '15g', fat: '5g' } 
    },
    { 
        id: 'vital-farms-eggs',
        name: 'Organic Eggs', brand: 'Vital Farms', category: 'Protein', 
        image: 'https://images.openfoodfacts.org/images/products/085/069/300/2034/front_en.22.400.jpg', 
        tags: ['Eggs', 'High Protein'], nutrition: { calories: 70, protein: '6g', carbs: '0g', fat: '5g' } 
    },
    { 
        id: 'caulipower-crust',
        name: 'Cauliflower Crust', brand: 'Caulipower', category: 'Frozen', 
        image: 'https://images.openfoodfacts.org/images/products/085/493/400/7037/front_en.18.400.jpg', 
        tags: ['Gluten Free'], nutrition: { calories: 170, protein: '3g', carbs: '26g', fat: '6g' } 
    }
];

// --- 3. REAL RECIPES (Stable Unsplash) ---
const SEED_RECIPES = [
  { id: 'recipe-salmon', name: 'Sheet Pan Salmon', image: 'https://images.unsplash.com/photo-1467003909585-2f8a7270028d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', time: '25 min', category: 'Dinner', tags: ['High Protein', 'Gluten Free'], ingredients: ['Salmon', 'Asparagus', 'Lemon'], instructions: ['Bake at 400°F for 15 mins.'] },
  { id: 'recipe-taco-bowl', name: 'Turkey Taco Bowl', image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', time: '20 min', category: 'Dinner', tags: ['Gluten Free'], ingredients: ['Turkey', 'Rice', 'Beans'], instructions: ['Cook turkey, assemble bowl.'] },
  { id: 'recipe-chia', name: 'Chia Pudding', image: 'https://images.unsplash.com/photo-1522425862217-0949242d4496?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', time: '5 min', category: 'Breakfast', tags: ['Vegan'], ingredients: ['Chia Seeds', 'Almond Milk'], instructions: ['Mix and chill overnight.'] },
  { id: 'recipe-avo-toast', name: 'Avocado Toast', image: 'https://images.unsplash.com/photo-1525351484163-7529414395d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', time: '10 min', category: 'Breakfast', tags: ['Vegetarian'], ingredients: ['Bread', 'Avocado', 'Egg'], instructions: ['Toast bread, top with avocado.'] }
];

const AdminSeeder = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // --- 1. THE "NUCLEAR" OPTION (Wipe everything) ---
  const clearDatabase = async () => {
    if (!window.confirm("DANGER: This will delete ALL data (Groceries, Recipes, Blog). Use this to fix duplicates.")) return;
    setLoading(true);
    setStatus('Deleting old data...');
    
    try {
        // We must fetch first to know what to delete
        const grocSnap = await getDocs(collection(db, "groceries"));
        const recSnap = await getDocs(collection(db, "recipes"));
        const blogSnap = await getDocs(collection(db, "blog_posts"));
        
        const batch = writeBatch(db);
        
        // Queue deletes
        grocSnap.forEach(doc => batch.delete(doc.ref));
        recSnap.forEach(doc => batch.delete(doc.ref));
        blogSnap.forEach(doc => batch.delete(doc.ref));
        
        await batch.commit();
        setStatus('✨ Database Cleared! Now click Seed.');
    } catch (err) {
        console.error(err);
        setStatus(`Error clearing: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  // --- 2. THE "SMART" SEEDER (Upsert) ---
  const seedDatabase = async () => {
    setLoading(true);
    setStatus('Seeding data...');
    const batch = writeBatch(db);

    try {
        // Uses the ID property we defined above to prevent duplicates
        SEED_GROCERIES.forEach(item => {
            const ref = doc(db, "groceries", item.id); 
            batch.set(ref, item); // .set() creates or overwrites. It never duplicates.
        });

        SEED_RECIPES.forEach(item => {
            const ref = doc(db, "recipes", item.id);
            batch.set(ref, item);
        });

        SEED_BLOG_POSTS.forEach(item => {
            const ref = doc(db, "blog_posts", item.id);
            batch.set(ref, item);
        });

        await batch.commit();
        setStatus('✅ Success! Data is now clean and unique.');
    } catch (err) {
        console.error(err);
        setStatus(`Error seeding: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-2xl border border-gray-700 w-80">
            <h3 className="font-bold text-lg mb-2">Admin Tools</h3>
            <p className="text-sm text-gray-400 mb-4">Database Management</p>
            
            {status && <div className={`mb-4 text-xs font-mono p-2 rounded ${status.includes('Error') ? 'bg-red-900/50 text-red-200' : 'bg-emerald-900/50 text-emerald-200'}`}>{status}</div>}
            
            <div className="flex flex-col gap-3">
                <button 
                    onClick={clearDatabase} 
                    disabled={loading} 
                    className="w-full bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 text-sm border border-red-900/50"
                >
                    🗑️ Wipe Database
                </button>
                <button 
                    onClick={seedDatabase} 
                    disabled={loading} 
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                >
                    {loading ? 'Processing...' : '🌱 Seed Data'}
                </button>
            </div>
        </div>
    </div>
  );
};

export default AdminSeeder;