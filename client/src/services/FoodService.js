// client/src/services/FoodService.js

// ---------------------------------------------------------------------------
// AUTOMATIC URL SWITCHING
// ---------------------------------------------------------------------------
// If you are running on localhost, use port 5001.
// If you are live, use your specific Render URL.
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5001' 
  : 'https://safespoon-cd82.onrender.com'; // <--- Your fixed Render URL

/**
 * Searches for food/restaurants via your backend proxy.
 */
export const searchRestaurantMenu = async (query) => {
  if (!query) return { items: [] };

  try {
    const response = await fetch(`${API_BASE_URL}/api/food-search?search_expression=${encodeURIComponent(query)}`);

    if (!response.ok) {
        console.error("Server API Error:", response.statusText);
        return { items: [] };
    }

    const data = await response.json();
    
    // Debug Log: Check your browser console to see what FatSecret returns
    console.log("Raw API Response:", data); 

    let rawItems = [];
    if (data.foods && data.foods.food) {
        // Handle FatSecret XML-to-JSON quirk (single item vs array)
        rawItems = Array.isArray(data.foods.food) ? data.foods.food : [data.foods.food];
    }

    const items = rawItems.map(item => ({
        id: item.food_id,
        name: item.food_name,
        brand: item.brand_name || 'Generic',
        description: item.food_description, 
        type: item.food_type,
        isRestaurant: item.food_type === 'Brand',
        macros: parseMacros(item.food_description) 
    }));

    return { items };

  } catch (error) {
    console.error("Failed to connect to backend:", error);
    return { items: [] };
  }
};

// Helper to clean up the FatSecret description string
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