import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; 
import { Helmet } from "react-helmet"; 
import { db } from '../firebase';
import { getAuth } from "firebase/auth"; 

// --- FIXED: No imports needed for public assets ---
// We simply reference the strings "/icons/..." in the code below.

export const RecipeDetail = ({ userProfile }) => {
  const { id } = useParams(); 
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // TOGGLES
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(false);

  // --- PARSER: Handle messy API text ---
  const parseInstructions = (rawInstructions) => {
      if (!rawInstructions) return [];
      
      // Standardize newlines
      let normalized = rawInstructions.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // 1. Split into chunks by double newlines (paragraphs)
      let chunks = normalized.split(/\n\s*\n/);
      
      // Fallback: If we only got 1 massive chunk, try splitting by single newlines
      if (chunks.length === 1 && normalized.length > 200) {
          chunks = normalized.split(/\n/);
      }

      return chunks
          .map(chunk => chunk.replace(/\n/g, ' ').trim()) // Replace single breaks with spaces
          .filter(chunk => chunk.length > 10); // Remove garbage
  };

  const normalizeMeal = (m) => {
      if (!m) return null;
      const ingredients = [];
      for (let i = 1; i <= 20; i++) {
          const ingredient = m[`strIngredient${i}`];
          const measure = m[`strMeasure${i}`];
          if (ingredient && ingredient.trim() !== "") {
              ingredients.push(`${measure ? measure : ''} ${ingredient}`.trim());
          }
      }
      
      return {
          id: m.idMeal,
          name: m.strMeal,
          image: m.strMealThumb,
          category: m.strCategory,
          instructions: parseInstructions(m.strInstructions),
          ingredients: ingredients,
          tags: m.strTags ? m.strTags.split(',') : []
      };
  };

  useEffect(() => {
    const fetchDetails = async () => {
        setLoading(true);
        try {
            const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
            const data = await res.json();
            if (data.meals) {
                setRecipe(normalizeMeal(data.meals[0]));
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    };
    if (id) fetchDetails();
  }, [id]);

  const checkRecipeSafety = (r) => {
      if (!r) return { isSafe: true, conflicts: [] };
      const userRestrictions = (userProfile?.restrictions || []).map(x => x.toLowerCase());
      const conflicts = [];
      r.ingredients.forEach(ing => {
         const lower = ing.toLowerCase();
         userRestrictions.forEach(rest => { if(lower.includes(rest)) conflicts.push(rest); });
      });
      return { isSafe: conflicts.length === 0, conflicts: [...new Set(conflicts)] };
  };

  // Helper to determine the "Food Style" label
  const getFoodStyleLabel = (r) => {
      const cat = r.category.toLowerCase();
      const tags = r.tags.map(t => t.toLowerCase());
      if (cat === 'vegan' || tags.includes('vegan')) return 'Vegan';
      if (cat === 'vegetarian' || tags.includes('vegetarian')) return 'Vegetarian';
      if (tags.includes('gluten-free')) return 'Gluten Free';
      if (tags.includes('paleo')) return 'Paleo';
      if (tags.includes('keto')) return 'Keto';
      return r.category;
  };

  if (loading) return <div className="py-32 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-100 border-t-violet-600"></div></div>;
  if (!recipe) return <div className="p-10 text-center">Recipe not found</div>;

  const { isSafe, conflicts } = checkRecipeSafety(recipe);
  const displayLabel = getFoodStyleLabel(recipe);

  // VISIBILITY LOGIC
  const visibleIngredients = showAllIngredients ? recipe.ingredients : recipe.ingredients.slice(0, 6);
  const hiddenIngredientsCount = recipe.ingredients.length - 6;

  const visibleSteps = showAllSteps ? recipe.instructions : recipe.instructions.slice(0, 3);
  const hiddenStepsCount = recipe.instructions.length - 3;

  return (
    <div className="w-full pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 font-['Host_Grotesk']">
        <Helmet>
            <title>{recipe.name} Recipe - Safespoon</title>
            <meta name="description" content={`Learn how to make ${recipe.name}.`} />
        </Helmet>

        {/* Hero Image */}
        <div className="relative w-full aspect-square md:aspect-[21/9] rounded-3xl overflow-hidden shadow-xl mb-8 mt-4 md:mt-8 group">
            <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            
            <div className="absolute bottom-6 left-6 right-6">
                 <h1 className="text-3xl md:text-6xl font-black text-white mb-3 shadow-sm leading-tight">
                    {recipe.name}
                 </h1>
                 <div className="flex gap-2">
                    <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase border border-white/20">
                        {displayLabel}
                    </span>
                 </div>
            </div>
        </div>

        {/* Safety Alert */}
        <div className="mb-10">
            {isSafe ? (
                <div className="bg-emerald-50 text-emerald-800 px-5 py-4 rounded-2xl border border-emerald-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center p-2 flex-shrink-0">
                        {/* FIXED: Uses direct path from public folder */}
                        <img src="/icons/Badge-check.svg" className="opacity-80 w-6 h-6 invert-0" alt="Safe"/>
                    </div>
                    <div>
                        <p className="font-bold text-lg leading-none mb-1">Dietary Match</p>
                        <p className="text-sm opacity-80">Safe for your profile.</p>
                    </div>
                </div>
            ) : (
                <div className="bg-amber-50 text-amber-900 px-5 py-4 rounded-2xl border border-amber-100 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center p-2 flex-shrink-0">
                        {/* FIXED: Uses direct path from public folder */}
                        <img src="/icons/bell-exclamation.svg" className="opacity-80 w-6 h-6 invert-0" alt="Alert"/>
                        </div>
                        <div>
                        <p className="font-bold text-lg leading-none mb-1">Dietary Alert</p>
                        <p className="text-sm">Avoid: <span className="font-bold">{conflicts.join(', ')}</span></p>
                        </div>
                </div>
            )}
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-12 gap-10">
            
            {/* Ingredients Column (Collapsible) */}
            <div className="lg:col-span-4 relative">
                <div className="lg:sticky lg:top-8">
                    <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                        Ingredients 
                        <span className="bg-slate-100 text-slate-500 text-xs px-2.5 py-1 rounded-full">{recipe.ingredients.length}</span>
                    </h3>
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 transition-all duration-300">
                        <ul className="space-y-4">
                            {visibleIngredients.map((ing, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0"></div>
                                    <span className="text-slate-700 font-medium text-sm capitalize leading-snug">{ing}</span>
                                </li>
                            ))}
                        </ul>
                        
                        {/* Ingredients Toggle */}
                        {recipe.ingredients.length > 6 && (
                            <button 
                                onClick={() => setShowAllIngredients(!showAllIngredients)}
                                className="w-full mt-6 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                            >
                                {showAllIngredients ? (
                                    <>Show Less <span className="text-xs">▲</span></>
                                ) : (
                                    <>Show {hiddenIngredientsCount} More <span className="text-xs">▼</span></>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Instructions Column (Collapsible) */}
            <div className="lg:col-span-8">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Preparation Steps</h3>
                <div className="space-y-8">
                    {visibleSteps.map((step, i) => (
                        // items-start ensures number stays at top of text block
                        <div key={i} className="flex gap-5 group items-start">
                            <div className="flex-shrink-0 flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xl shadow-slate-200">
                                    {i + 1}
                                </div>
                                {/* Connector line (only show if not last visible item) */}
                                {i !== visibleSteps.length - 1 && (
                                    <div className="w-0.5 flex-grow bg-slate-100 my-3 rounded-full"></div>
                                )}
                            </div>
                            <div className="pt-0.5 pb-2">
                                <p className="text-slate-600 text-base md:text-lg leading-relaxed font-medium">{step}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Steps Toggle - Only if more than 3 steps */}
                {recipe.instructions.length > 3 && (
                     <button 
                        onClick={() => setShowAllSteps(!showAllSteps)}
                        className="w-full mt-8 py-4 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        {showAllSteps ? (
                            <>Collapse Instructions <span className="text-xs">▲</span></>
                        ) : (
                            <>View Full Instructions ({hiddenStepsCount} More) <span className="text-xs">▼</span></>
                        )}
                    </button>
                )}
            </div>
        </div>
    </div>
  );
};