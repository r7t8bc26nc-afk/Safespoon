const SPOONACULAR_API_KEY = '346decbc94b14c14825c54ccb99be60f'; // Get at spoonacular.com/food-api

export const verifyDishSafety = async (dishName, userRestrictions = []) => {
  try {
    // 1. Search for the dish and get detailed nutrition/ingredient data
    const response = await fetch(
      `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(dishName)}&addRecipeInformation=true&fillIngredients=true&apiKey=${SPOONACULAR_API_KEY}`
    );
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return { status: 'unknown', message: 'No verified data found for this dish.' };
    }

    const dish = data.results[0];
    const ingredients = dish.extendedIngredients.map(ing => ing.name.toLowerCase());
    
    // 2. Cross-reference with User Restrictions
    const foundAllergens = userRestrictions.filter(restriction => 
      ingredients.some(ing => ing.includes(restriction.toLowerCase()))
    );

    return {
      status: foundAllergens.length === 0 ? 'safe' : 'danger',
      dishName: dish.title,
      image: dish.image,
      ingredients: ingredients,
      conflicts: foundAllergens,
      summary: dish.summary.replace(/<[^>]*>?/gm, '').slice(0, 150) + '...'
    };
  } catch (error) {
    console.error("Safety Verification Error:", error);
    return { status: 'error', message: 'Verification server unreachable.' };
  }
};