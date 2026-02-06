// client/src/services/FoodService.js

// 1. Define where your backend server is running
// (If you deploy to Vercel later, this URL will change)
const API_BASE_URL = 'http://localhost:5001'; 
'https://safespoon-cd82.onrender.com';

/**
 * Searches for food/restaurants via your backend proxy.
 * This is the ONLY function your React components need to import.
 */
export const searchRestaurantMenu = async (query) => {
  if (!query) return { items: [] };

  try {
    // We fetch from YOUR local server, not FatSecret directly
    const response = await fetch(`${API_BASE_URL}/api/food-search?search_expression=${encodeURIComponent(query)}`);

    if (!response.ok) {
        console.error("Server API Error:", response.statusText);
        return { items: [] };
    }

    const data = await response.json();
 

    // ADD THIS LOG:
    console.log("Raw API Response:", data); 

    
    // Standardize the FatSecret response for your App
    // (Handles the XML-to-JSON quirks where single items aren't arrays)
    let rawItems = [];
    if (data.foods && data.foods.food) {
        rawItems = Array.isArray(data.foods.food) ? data.foods.food : [data.foods.food];
    }

    const items = rawItems.map(item => ({
        id: item.food_id,
        name: item.food_name,
        brand: item.brand_name || 'Generic',
        description: item.food_description, 
        type: item.food_type,
        isRestaurant: item.food_type === 'Brand',
        // Optional: Parse macros from description string if needed
        macros: parseMacros(item.food_description) 
    }));

    return { items };

  } catch (error) {
    console.error("Failed to connect to backend:", error);
    return { items: [] };
  }
};

// Helper to clean up the description string
const parseMacros = (desc) => {
    if (!desc) return {};
    const macros = {};
    const parts = desc.split('|');
    parts.forEach(part => {
        const p = part.trim();
        if (p.includes('Calories:')) macros.calories = parseInt(p.split('Calories:')[1]);
        if (p.includes('Fat:')) macros.fat = parseFloat(p.split('Fat:')[1]);
        if (p.includes('Carbs:')) macros.carbs = parseFloat(p.split('Carbs:')[1]);
        if (p.includes('Protein:')) macros.protein = parseFloat(p.split('Protein:')[1]);
    });
    return macros;
};