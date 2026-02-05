// src/services/RestaurantService.js
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// --- CONFIGURATION ---
const FATSECRET_CLIENT_ID = '720ff6ec882f4d0fa89c1b28fa2d9685';
const FATSECRET_CLIENT_SECRET = 'ae20febb460142649756aca2889265a3';
const CACHE_TTL_DAYS = 30; 

// 1. HELPER: Extracts numbers from text (e.g. "Calories: 250kcal" -> 250)
// THIS WAS MISSING IN YOUR UPLOAD
const extractValue = (str, key) => {
    try {
        const regex = new RegExp(`${key}\\s*([0-9.]+)`);
        const match = str.match(regex);
        return match ? parseFloat(match[1]) : 0;
    } catch (e) { return 0; }
};

let cachedToken = null;
let tokenExpiry = 0;

const getAccessToken = async () => {
    const now = Date.now();
    if (cachedToken && now < tokenExpiry) return cachedToken;
    try {
        const response = await fetch('https://oauth.fatsecret.com/connect/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=client_credentials&scope=basic&client_id=${FATSECRET_CLIENT_ID}&client_secret=${FATSECRET_CLIENT_SECRET}`
        });
        const data = await response.json();
        if (data.access_token) {
            cachedToken = data.access_token;
            tokenExpiry = now + (data.expires_in * 1000); 
            return cachedToken;
        }
    } catch (e) { console.error("Auth Failed", e); }
    return null;
};

export const searchRestaurantMenu = async (restaurantName) => {
    // Sanitize ID
    const cleanId = `menu_${restaurantName.toLowerCase().trim().replace(/[^a-z0-9]/g, '')}`;
    const docRef = doc(db, "restaurant_cache", cleanId);

    // A. CHECK CACHE
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const ageInDays = (new Date() - data.lastUpdated.toDate()) / (1000 * 60 * 60 * 24);
            if (ageInDays < CACHE_TTL_DAYS) {
                console.log("✅ Loaded from Database:", restaurantName);
                return { items: data.items, source: 'database' };
            }
        }
    } catch (err) { }

    // B. FETCH API
    try {
        const token = await getAccessToken();
        if (!token) return { items: [], source: 'error' };

        console.log("🌊 Fetching FatSecret for:", restaurantName); // DEBUG LOG

        const res = await fetch(`https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(restaurantName)}&format=json`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        // Log the raw response so you can prove data is coming through
        console.log("🌊 Raw FatSecret Data:", data); 

        const results = data.foods?.food || [];
        
        // Filter: Only allow 'Brand' (Restaurant) items
        const brandItems = results.filter(item => item.food_type === 'Brand');

        if (brandItems.length === 0) return { items: [], source: 'not_found' };

        // C. FORMAT DATA WITH MACROS
        const formattedItems = brandItems.map(item => ({
            id: item.food_id,
            name: item.food_name,
            brand: restaurantName,
            description: item.food_description,
            // CRITICAL: Parse the text string into numbers for the Dashboard
            macros: {
                calories: extractValue(item.food_description, 'Calories:'),
                protein: extractValue(item.food_description, 'Protein:'),
                carbs: extractValue(item.food_description, 'Carbs:'),
                fat: extractValue(item.food_description, 'Fat:')
            }
        }));

        // D. SAVE TO CACHE
        await setDoc(docRef, {
            name: restaurantName,
            items: formattedItems,
            lastUpdated: serverTimestamp(),
            source: 'fatsecret_verified'
        });

        return { items: formattedItems, source: 'live_api' };

    } catch (error) {
        console.error("API Error", error);
        return { items: [], source: 'error' };
    }
};