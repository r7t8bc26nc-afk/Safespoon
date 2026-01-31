import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; 
import { db } from '../firebase';
import { getAuth } from "firebase/auth"; 
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { Helmet } from "react-helmet"; 

// --- NO IMPORTS NEEDED ---
// We reference icons directly as strings (e.g. "/icons/file.svg")

export const Recipes = ({ userProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);
  
  const [activeCategory, setActiveCategory] = useState('All'); 
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Categories Configuration - Updated with direct paths
  const categories = [
    { id: 'All', label: 'Discover', icon: null },
    { id: 'Beef', label: 'Beef', icon: '/icons/steak.svg' },
    { id: 'Chicken', label: 'Chicken', icon: '/icons/chicken-leg.svg' },
    { id: 'Seafood', label: 'Seafood', icon: '/icons/fish.svg' },
    { id: 'Vegetarian', label: 'Vegetarian', icon: '/icons/carrot.svg' },
    { id: 'Vegan', label: 'Vegan', icon: '/icons/Apple-fruit.svg' },
    { id: 'Pasta', label: 'Pasta', icon: '/icons/baguette.svg' },
    { id: 'Dessert', label: 'Dessert', icon: '/icons/cake.svg' },
  ];

  const getCategoryIcon = (cat) => {
      const found = categories.find(c => c.id.toLowerCase() === cat?.toLowerCase());
      return found ? found.icon : null;
  };

  // --- LIFESTYLE & COLOR LOGIC ---
  const getLifestyleConfig = (recipe) => {
      if (!recipe) return { label: 'Vegetarian', style: getStyle('Vegetarian') };

      const cat = recipe.category?.toLowerCase() || '';
      const area = recipe.area?.toLowerCase() || '';
      const tags = (recipe.tags || []).map(t => t.toLowerCase());

      // Priority 1: Explicit Tags
      if (cat === 'vegan' || tags.includes('vegan')) return { label: 'Vegan', style: getStyle('Vegan') };
      if (area === 'jamaican' && (cat === 'vegetarian' || cat === 'vegan')) return { label: 'Ital', style: getStyle('Ital') };
      if (area === 'middle eastern' || area === 'egyptian' || area === 'moroccan') return { label: 'Halal', style: getStyle('Halal') };
      if (tags.includes('paleo')) return { label: 'Paleo', style: getStyle('Paleo') };
      if (tags.includes('keto')) return { label: 'Keto', style: getStyle('Keto') };

      // Priority 2: Category Inference
      switch (cat) {
          case 'beef': 
          case 'lamb':
          case 'pork':
              return { label: 'Keto', style: getStyle('Keto') }; 
          case 'chicken':
          case 'seafood':
          case 'fish':
              return { label: 'Paleo', style: getStyle('Paleo') };
          case 'vegetarian':
          case 'pasta':
          case 'dessert':
              return { label: 'Vegetarian', style: getStyle('Vegetarian') };
          default:
              return { label: 'Vegetarian', style: getStyle('Vegetarian') };
      }
  };

  const getStyle = (label) => {
      switch (label) {
          case 'Vegan': return { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-100' };
          case 'Vegetarian': return { bg: 'bg-lime-50', text: 'text-lime-900', border: 'border-lime-100' };
          case 'Keto': return { bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-100' };
          case 'Paleo': return { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-100' };
          case 'Halal': return { bg: 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-100' };
          case 'Kosher': return { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-100' };
          case 'Ital': return { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-100' };
          default: return { bg: 'bg-slate-50', text: 'text-slate-900', border: 'border-slate-100' };
      }
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
          area: m.strArea, 
          tags: m.strTags ? m.strTags.split(',') : [],
          ingredients: ingredients,
      };
  };

  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let isMounted = true; 
    const fetchData = async () => {
        setLoading(true);
        try {
            if (debouncedTerm.trim() !== "") {
                const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${debouncedTerm}`);
                const data = await res.json();
                if (isMounted) {
                    if (data.meals) {
                        const validMeals = data.meals.map(normalizeMeal).filter(Boolean);
                        setRecipes(validMeals);
                    } else {
                        setRecipes([]);
                    }
                }
            } 
            else {
                if (activeCategory === 'All') {
                    const randomPromises = Array.from({ length: 12 }).map(() => 
                        fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(r => r.json())
                    );
                    const randomResults = await Promise.all(randomPromises);
                    if (isMounted) {
                        const formatted = randomResults.map(d => d.meals ? normalizeMeal(d.meals[0]) : null).filter(Boolean);
                        const uniqueRecipes = Array.from(new Set(formatted.map(a => a.id))).map(id => formatted.find(a => a.id === id));
                        setRecipes(uniqueRecipes);
                    }
                } 
                else {
                    const listRes = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${activeCategory}`);
                    const listData = await listRes.json();
                    if (!listData.meals) {
                        if (isMounted) { setRecipes([]); setLoading(false); }
                        return;
                    }
                    const topMeals = listData.meals.slice(0, 12);
                    const detailPromises = topMeals.map(meal => 
                        fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`).then(r => r.json()).catch(e => null) 
                    );
                    const detailsData = await Promise.all(detailPromises);
                    if (isMounted) {
                        const formatted = detailsData.filter(d => d && d.meals && d.meals[0]).map(d => normalizeMeal(d.meals[0])).filter(Boolean);
                        setRecipes(formatted);
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching recipes:", err);
            if (isMounted) setRecipes([]);
        } finally {
            if (isMounted) setLoading(false);
        }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [activeCategory, debouncedTerm]);

  const handleToggleFavorite = async (e, recipeId) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const isFavorite = userProfile?.favorites?.includes(recipeId);
    try {
        if (isFavorite) {
            await updateDoc(userRef, { favorites: arrayRemove(recipeId) });
        } else {
            await updateDoc(userRef, { favorites: arrayUnion(recipeId) });
        }
    } catch (err) { console.error("Error updating favorites:", err); }
  };

  const checkRecipeSafety = (recipe) => {
    const userRestrictions = (userProfile?.restrictions || []).map(r => r.toLowerCase());
    const conflicts = [];
    if (!recipe || !recipe.ingredients) return { isSafe: true, conflicts: [] };
    recipe.ingredients.forEach(ing => {
        const ingLower = ing.toLowerCase();
        userRestrictions.forEach(r => {
            if (ingLower.includes(r)) { if (!conflicts.includes(r)) conflicts.push(r); }
            if (r === 'beef' && ingLower.includes('beef')) { if (!conflicts.includes('Beef')) conflicts.push('Beef'); }
            if (r === 'gluten' && (ingLower.includes('flour') || ingLower.includes('bread') || ingLower.includes('pasta')) && !recipe.tags.includes('Gluten-Free')) { 
                if (!conflicts.includes('Gluten')) conflicts.push('Gluten (suspected)'); 
            }
        });
    });
    return { isSafe: conflicts.length === 0, conflicts };
  };

  // --- SEO STRUCTURED DATA GENERATOR ---
  const generateStructuredData = () => {
      return JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "itemListElement": recipes.map((recipe, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "url": `https://safespoon.com/recipe/${recipe.id}`,
              "name": recipe.name,
              "image": recipe.image,
              "description": `A delicious ${recipe.area || ''} ${recipe.category} recipe.`
          }))
      });
  };

  return (
    <div className="w-full space-y-6 pb-24 font-['Switzer']">
      <Helmet>
        <title>Discover Recipes | Safespoon</title>
        <meta name="description" content="Find safe, healthy, and delicious recipes tailored to your dietary needs and lifestyle goals." />
        {!loading && recipes.length > 0 && (
            <script type="application/ld+json">
                {generateStructuredData()}
            </script>
        )}
      </Helmet>
      
      <h1 className="sr-only">Discover Healthy & Safe Recipes</h1>

      {/* SEARCH BAR */}
      <div className="relative w-full group">
         <div className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
         </div>
         <input 
            type="text" 
            placeholder="Search Recipes & Ingredients" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-gray-100 rounded-2xl pl-14 pr-12 py-4 font-medium text-gray-900 placeholder:text-gray-400 outline-none border-2 border-transparent focus:border-violet-100 transition-all" 
         />
         {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-gray-500 p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
         )}
      </div>

      {/* CATEGORIES */}
      <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
         {categories.map(cat => {
             const isActive = activeCategory === cat.id;
             return (
                <button 
                    key={cat.id} 
                    onClick={() => { setActiveCategory(cat.id); setSearchTerm(''); }} 
                    className={`
                        snap-start flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full text-xs font-regular transition-all border whitespace-nowrap
                        ${isActive 
                            ? 'bg-violet-800 text-white font-semibold leading-tight border-violet-800 shadow-md' 
                            : 'bg-white text-gray-600 border-gray-200'
                        }
                    `}
                >
                    {cat.icon && <span><img src={cat.icon} alt="" className={`w-3.5 h-3.5 object-contain ${isActive ? 'invert brightness-0' : ''}`} /></span>}
                    <span>{cat.label}</span>
                </button>
             );
         })}
      </div>

      {/* LOADING */}
      {loading && (
          <div className="py-32 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-100 border-t-violet-600"></div>
          </div>
      )}

      {/* RECIPE GRID */}
      <main>
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recipes.length === 0 && (
                <div className="col-span-full py-32 text-center">
                    <div className="text-6xl mb-4 opacity-20">🍳</div>
                    <p className="text-gray-900 font-bold text-xl mb-2">No recipes found</p>
                </div>
            )}

            {recipes.map((recipe) => {
                const { isSafe } = checkRecipeSafety(recipe);
                const isFavorite = userProfile?.favorites?.includes(recipe.id);
                // Updated Fallback to use string path
                const categoryIcon = getCategoryIcon(recipe.category) || '/icons/Apple-fruit.svg'; 
                
                const lifestyle = getLifestyleConfig(recipe);

                return (
                    <article key={recipe.id}>
                    <Link 
                        to={`/recipe/${recipe.id}`} 
                        className="bg-white rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group relative block"
                    >
                        {/* IMAGE CONTAINER */}
                        <div className="relative">
                            <div className="h-44 w-full relative bg-gray-50">
                                <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                
                                {/* Favorite Button */}
                                <button 
                                    onClick={(e) => handleToggleFavorite(e, recipe.id)}
                                    className={`absolute top-3 right-3 h-9 w-9 rounded-full flex items-center justify-center shadow-sm backdrop-blur-sm transition-all ${isFavorite ? 'bg-rose-500 text-white' : 'bg-white/90 text-slate-400 hover:text-rose-500'}`}
                                >
                                    <svg className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                </button>
                            </div>
                        </div>
                        
                        {/* CONTENT CONTAINER */}
                        <div className="p-4">
                            {/* TITLE & BADGE ROW */}
                            <div className="flex justify-between items-start gap-2 mb-2">
                                <h3 className="text-lg font-bold text-slate-600 leading-tightest group-hover:text-violet-700 transition-colors line-clamp-2 capitalize">
                                    {recipe.name}
                                </h3>
                                
                                {/* STATUS BADGE */}
                                <div className="flex-shrink-0 pt-0.5">
                                    {isSafe ? (
                                        <div className="flex items-center gap-1">
                                            {/* Updated to use string path */}
                                            <img src="/icons/Badge-check.svg" className="w-3.5 h-3.5 opacity-90" alt="" />
                                            <span className="text-[10px] font-medium text-emerald-500 capitalize tracking-tight">Safe</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            {/* Updated to use string path */}
                                            <img src="/icons/bell-exclamation.svg" className="w-3.5 h-3.5 opacity-90" alt="" />
                                            <span className="text-[10px] font-bold text-rose-500 capitalize tracking-tight">Conflict</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* CATEGORY TAG */}
                            <div className="flex items-center gap-2">
                                <div className={`px-2.5 py-1 rounded-full text-[10px] font-medium capitalize tracking-wider flex items-center gap-1.5 border ${lifestyle.style.bg} ${lifestyle.style.text} ${lifestyle.style.border}`}>
                                    {categoryIcon && <img src={categoryIcon} alt="" className="w-3 h-3 object-contain opacity-70" />}
                                    <span>{lifestyle.label}</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                    </article>
                );
            })}
        </div>
      )}
      </main>
    </div>
  );
};