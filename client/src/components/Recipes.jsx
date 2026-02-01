import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom'; 
import { db } from '../firebase';
import { getAuth } from "firebase/auth"; 
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Helmet } from "react-helmet"; 
import { motion, AnimatePresence } from 'framer-motion';

// --- ICON IMPORTS ---
// Using imports from your provided files
import searchIcon from '../icons/search.svg';
import heartIcon from '../icons/heart.svg';
import heartFilledIcon from '../icons/heart-filled.svg';
import fireIcon from '../icons/fire.svg';
import dumbbellIcon from '../icons/dumbbell-filled.svg'; 
import breadIcon from '../icons/bread-slice.svg';
import cheeseIcon from '../icons/cheese.svg';

// Category Icons
import beefIcon from '../icons/steak.svg';
import chickenIcon from '../icons/chicken-leg.svg';
import fishIcon from '../icons/fish.svg';
import veggieIcon from '../icons/carrot.svg';
import fruitIcon from '../icons/Apple-fruit.svg';
import storeIcon from '../icons/store.svg'; 
import pantryIcon from '../icons/door-open.svg';
import candyIcon from '../icons/candy.svg';
import drinkIcon from '../icons/cup-straw.svg';

// --- HELPER COMPONENT: ColoredIcon ---
const ColoredIcon = ({ src, colorClass, sizeClass = "w-4 h-4" }) => (
  <div 
    className={`${sizeClass} ${colorClass}`}
    style={{
      WebkitMaskImage: `url("${src}")`,
      WebkitMaskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskImage: `url("${src}")`,
      maskSize: 'contain',
      maskRepeat: 'no-repeat',
      maskPosition: 'center',
      backgroundColor: 'currentColor'
    }}
  />
);

// --- NUTRITION LOGIC (From Recipes.jsx) ---
const FOOD_DATABASE = {
    chicken: { cals: 165, pro: 31, carb: 0, fat: 3.6 },
    beef: { cals: 250, pro: 26, carb: 0, fat: 17 },
    pork: { cals: 242, pro: 27, carb: 0, fat: 14 },
    fish: { cals: 206, pro: 22, carb: 0, fat: 12 },
    salmon: { cals: 208, pro: 20, carb: 0, fat: 13 },
    rice: { cals: 130, pro: 2.7, carb: 28, fat: 0.3 },
    pasta: { cals: 131, pro: 5, carb: 25, fat: 1.1 },
    potato: { cals: 77, pro: 2, carb: 17, fat: 0.1 },
    bread: { cals: 265, pro: 9, carb: 49, fat: 3.2 },
    egg: { cals: 155, pro: 13, carb: 1.1, fat: 11 },
    cheese: { cals: 402, pro: 25, carb: 1.3, fat: 33 },
    butter: { cals: 717, pro: 0.8, carb: 0.1, fat: 81 },
    oil: { cals: 884, pro: 0, carb: 0, fat: 100 },
    vegetable: { cals: 65, pro: 2.9, carb: 13, fat: 0.2 },
    fruit: { cals: 52, pro: 0.3, carb: 14, fat: 0.2 },
    sugar: { cals: 387, pro: 0, carb: 100, fat: 0 },
    flour: { cals: 364, pro: 10, carb: 76, fat: 1 },
};

const calculateRealMacros = (meal) => {
    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ingredient && ingredient.trim() !== "") {
            const ingLower = ingredient.toLowerCase();
            const measureLower = measure ? measure.toLowerCase() : '';
            let profile = FOOD_DATABASE.vegetable; 
            for (const [key, val] of Object.entries(FOOD_DATABASE)) {
                if (ingLower.includes(key)) { profile = val; break; }
            }
            let multiplier = 1.0; 
            const numberMatch = measureLower.match(/(\d+(\.\d+)?)/);
            const qty = numberMatch ? parseFloat(numberMatch[0]) : 1;
            if (measureLower.includes('kg')) multiplier = qty * 10;
            else if (measureLower.includes('lb')) multiplier = qty * 4.53;
            else if (measureLower.includes('oz')) multiplier = qty * 0.28;
            else if (measureLower.includes('cup')) multiplier = qty * 2.4; 
            else if (measureLower.includes('tbsp')) multiplier = qty * 0.15;
            else if (measureLower.includes('tsp')) multiplier = qty * 0.05;
            else if (measureLower.includes('g')) multiplier = qty * 0.01;
            totals.calories += profile.cals * multiplier;
            totals.protein += profile.pro * multiplier;
            totals.carbs += profile.carb * multiplier;
            totals.fat += profile.fat * multiplier;
        }
    }
    return {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein),
        carbs: Math.round(totals.carbs),
        fat: Math.round(totals.fat)
    };
};

const normalizeMeal = (m) => {
    if (!m) return null;
    const calculatedMacros = calculateRealMacros(m);
    return {
        id: m.idMeal,
        name: m.strMeal,
        image: m.strMealThumb,
        category: m.strCategory,
        area: m.strArea,
        macros: calculatedMacros, 
        type: 'recipe'
    };
};

// --- MAIN COMPONENT ---
export const MealHub = ({ userProfile, onOpenMenu }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  
  // Data States
  const [recipes, setRecipes] = useState([]);
  const [groceries, setGroceries] = useState([]);
  const [groceryLoading, setGroceryLoading] = useState(true);
  const [recipeLoading, setRecipeLoading] = useState(true);

  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [searchResults, setSearchResults] = useState({ recipes: [], groceries: [] });
  const [isSearchMode, setIsSearchMode] = useState(false);
  const searchInputRef = useRef(null);

  // --- 1. FETCH GROCERIES (From RestaurantExplorer) ---
  useEffect(() => {
    const q = query(collection(db, "groceries"), orderBy("lastUpdated", "desc"), limit(100));
    const unsub = onSnapshot(q, (snapshot) => {
      setGroceries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'grocery' })));
      setGroceryLoading(false);
    });
    return () => unsub();
  }, []);

  // --- 2. FETCH RECIPES (Initial Random Load) ---
  useEffect(() => {
    let isMounted = true;
    const fetchRandomRecipes = async () => {
        try {
            const randomPromises = Array.from({ length: 6 }).map(() => fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(r => r.json()));
            const randomResults = await Promise.all(randomPromises);
            if (isMounted) {
                const formatted = randomResults.map(d => d.meals ? normalizeMeal(d.meals[0]) : null).filter(Boolean);
                const unique = Array.from(new Set(formatted.map(a => a.id))).map(id => formatted.find(a => a.id === id));
                setRecipes(unique);
                setRecipeLoading(false);
            }
        } catch (err) { console.error(err); }
    };
    fetchRandomRecipes();
    return () => { isMounted = false; };
  }, []);

  // --- 3. UNIFIED SEARCH LOGIC ---
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!debouncedTerm) {
        setSearchResults({ recipes: [], groceries: [] });
        return;
    }

    const performSearch = async () => {
        // A. Filter Local Groceries
        const lowerTerm = debouncedTerm.toLowerCase();
        const groceryMatches = groceries.filter(g => 
            (g.name?.toLowerCase().includes(lowerTerm)) || 
            (g.brand?.toLowerCase().includes(lowerTerm)) ||
            (g.taxonomy?.category?.toLowerCase().includes(lowerTerm))
        );

        // B. Fetch Recipes
        let recipeMatches = [];
        try {
            const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${debouncedTerm}`);
            const data = await res.json();
            if (data.meals) recipeMatches = data.meals.map(normalizeMeal);
        } catch (e) { console.error(e); }

        setSearchResults({ recipes: recipeMatches, groceries: groceryMatches });
    };

    performSearch();
  }, [debouncedTerm, groceries]);


  // --- SAFETY ANALYSIS (From RestaurantExplorer) ---
  const getSafetyAnalysis = (item) => {
    if (!userProfile) return { status: 'neutral' };
    const itemAllergens = item.safetyProfile?.allergens || {};
    const userAllergens = userProfile.allergens || {};
    const conflicts = Object.keys(userAllergens).filter(k => userAllergens[k] && itemAllergens[k]);
    if (conflicts.length > 0) return { status: 'unsafe', label: `Contains ${conflicts[0]}` };
    return { status: 'safe' };
  };

  const handleToggleFavorite = async (e, recipeId) => {
    e.preventDefault(); e.stopPropagation();
    const auth = getAuth();
    if (!auth.currentUser) return;
    const userRef = doc(db, "users", auth.currentUser.uid);
    const isFavorite = userProfile?.favorites?.includes(recipeId);
    if (isFavorite) await updateDoc(userRef, { favorites: arrayRemove(recipeId) });
    else await updateDoc(userRef, { favorites: arrayUnion(recipeId) });
  };

  // --- RENDERERS ---

  // 1. Grocery List Item (Replaces "Daily Meal Plan" style)
  const GroceryListItem = ({ item }) => {
      const { status, label } = getSafetyAnalysis(item);
      return (
        <div onClick={() => onOpenMenu(item)} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="h-16 w-16 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm shrink-0 overflow-hidden relative">
                 {status === 'unsafe' && <div className="absolute inset-0 bg-red-500/10 z-10 border-2 border-red-500 rounded-xl"></div>}
                 <ColoredIcon src={storeIcon} colorClass="bg-slate-300" sizeClass="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-900 truncate pr-2 capitalize">{item.name || "Unknown Item"}</h4>
                    {status === 'unsafe' && <span className="text-[9px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded uppercase tracking-wider">Avoid</span>}
                </div>
                <p className="text-xs text-slate-500 font-medium capitalize mb-1">{item.brand || "Generic"} • {item.taxonomy?.category || "Pantry"}</p>
                
                <div className="flex items-center gap-3">
                   {item.macros?.calories > 0 && (
                        <div className="flex items-center gap-1 text-slate-400">
                             <ColoredIcon src={fireIcon} colorClass="bg-slate-400" sizeClass="w-3 h-3" />
                             <span className="text-[10px] font-bold">{item.macros.calories} kcal</span>
                        </div>
                   )}
                </div>
            </div>
            <button className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-600 transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            </button>
        </div>
      );
  };

  // 2. Recipe Card (Horizontal Scroll Style)
  const RecipeCard = ({ recipe }) => {
    const isFavorite = userProfile?.favorites?.includes(recipe.id);
    return (
        <Link to={`/recipe/${recipe.id}`} className="snap-center shrink-0 w-[280px] flex flex-col gap-3 group">
            <div className="relative h-[200px] w-full rounded-[2rem] overflow-hidden bg-slate-100 shadow-sm">
                <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                
                {/* Category Tag */}
                <div className="absolute top-4 left-4 px-3 py-1 bg-white/20 backdrop-blur-md border border-white/20 rounded-full">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">{recipe.category}</span>
                </div>

                {/* Fav Button */}
                <button 
                    onClick={(e) => handleToggleFavorite(e, recipe.id)}
                    className="absolute top-4 right-4 w-9 h-9 bg-white/20 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center hover:bg-white transition-all"
                >
                    <ColoredIcon src={isFavorite ? heartFilledIcon : heartIcon} colorClass={isFavorite ? "bg-rose-500" : "bg-white"} sizeClass="w-4 h-4" />
                </button>

                {/* Bottom Info */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-white">
                     <div className="flex items-center gap-1.5">
                        <ColoredIcon src={fireIcon} colorClass="bg-white" sizeClass="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">{recipe.macros.calories} Kcal</span>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <ColoredIcon src={dumbbellIcon} colorClass="bg-white" sizeClass="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">{recipe.macros.protein}g Pro</span>
                     </div>
                </div>
            </div>
            
            <div className="px-2">
                <h3 className="text-lg font-black text-slate-900 leading-tight line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                    {recipe.name}
                </h3>
                <div className="flex gap-2">
                    <button className="flex-1 py-2.5 bg-indigo-600 rounded-xl text-white text-xs font-bold shadow-lg shadow-indigo-200">Cook Now</button>
                    <button className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Details</button>
                </div>
            </div>
        </Link>
    );
  };

  // --- SEARCH OVERLAY ---
  if (isSearchMode) {
      return (
        <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto font-['Switzer'] animate-in fade-in duration-200">
            <div className="sticky top-0 bg-white z-10 border-b border-slate-100 p-4 flex gap-3">
                 <div className="relative flex-1">
                    <input 
                        ref={searchInputRef} autoFocus
                        type="text" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search recipes, ingredients, brands..."
                        className="w-full bg-slate-100 rounded-xl pl-10 pr-4 py-3 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                     <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <ColoredIcon src={searchIcon} colorClass="bg-current" sizeClass="w-5 h-5" />
                    </div>
                 </div>
                 <button onClick={() => {setIsSearchMode(false); setSearchTerm('');}} className="font-bold text-slate-500 text-sm">Cancel</button>
            </div>

            <div className="p-4 space-y-6">
                {debouncedTerm && searchResults.recipes.length === 0 && searchResults.groceries.length === 0 && (
                    <div className="text-center py-10 text-slate-400 font-bold">No results found for "{debouncedTerm}"</div>
                )}

                {/* Recipe Results */}
                {searchResults.recipes.length > 0 && (
                    <div>
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Recipes</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {searchResults.recipes.map(r => (
                                <Link key={r.id} to={`/recipe/${r.id}`} className="block group">
                                    <div className="aspect-square rounded-2xl overflow-hidden mb-2 relative">
                                        <img src={r.image} className="w-full h-full object-cover" />
                                        <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-white">{r.macros.calories} cal</div>
                                    </div>
                                    <p className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">{r.name}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Grocery Results */}
                {searchResults.groceries.length > 0 && (
                    <div>
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Market Items</h3>
                        <div className="space-y-2">
                            {searchResults.groceries.map(g => (
                                <GroceryListItem key={g.id} item={g} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      );
  }

  // --- MAIN VIEW ---
  return (
    <div className="w-full font-['Switzer'] pb-24 space-y-8">
      <Helmet><title>Meal Hub | Safespoon</title></Helmet>

      {/* 1. Header & Search (Screenshot Style) */}
      <section className="space-y-6">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-sm font-bold text-slate-400 mb-1">Hi ! {userProfile?.firstName || 'Chef'}</h2>
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">What's On Your<br/>Plate Today?</h1>
              </div>
              {/* Optional: Profile Icon or simple element could go here if header wasn't global */}
          </div>

          <div 
            onClick={() => setIsSearchMode(true)}
            className="flex gap-2 p-2 bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-2xl cursor-text group"
          >
             <div className="flex-1 flex items-center gap-3 px-3">
                 <ColoredIcon src={searchIcon} colorClass="bg-slate-300 group-hover:bg-indigo-600 transition-colors" sizeClass="w-5 h-5" />
                 <span className="text-slate-400 font-semibold text-sm">Describe what you're craving...</span>
             </div>
             <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all">
                 Search
             </button>
          </div>
      </section>

      {/* 2. Featured Recipes (Horizontal Scroll) */}
      <section>
          <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="text-lg font-bold text-slate-900">Featured Recipes</h3>
              <div className="flex items-center gap-1 text-indigo-600 text-xs font-bold cursor-pointer hover:underline">
                  <ColoredIcon src={searchIcon} colorClass="bg-indigo-600" sizeClass="w-3 h-3" />
                  <span>Generate New</span>
              </div>
          </div>

          <div className="flex overflow-x-auto gap-4 pb-8 -mx-4 px-4 snap-x no-scrollbar">
              {recipeLoading ? (
                  [1,2,3].map(i => <div key={i} className="snap-center shrink-0 w-[280px] h-[320px] bg-slate-50 rounded-[2rem] animate-pulse" />)
              ) : (
                  recipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)
              )}
          </div>
      </section>

      {/* 3. Market / Groceries (Vertical List) */}
      <section>
         <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="text-lg font-bold text-slate-900">Market & Groceries</h3>
              {/* Filter Tabs for this section */}
              <div className="flex gap-2">
                  {['All', 'Dairy', 'Meat', 'Pantry'].map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setActiveTab(cat)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                            activeTab === cat 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                          {cat}
                      </button>
                  ))}
              </div>
          </div>

          <div className="flex flex-col gap-3">
              {groceryLoading ? (
                  [1,2,3,4].map(i => <div key={i} className="w-full h-20 bg-slate-50 rounded-2xl animate-pulse" />)
              ) : (
                  groceries
                    .filter(g => activeTab === 'All' || g.taxonomy?.category?.toLowerCase().includes(activeTab.toLowerCase()))
                    .slice(0, 8) // Limit for feed
                    .map(item => <GroceryListItem key={item.id} item={item} />)
              )}
              
              {groceries.length === 0 && !groceryLoading && (
                  <div className="text-center py-8 text-slate-400 text-sm font-medium">No items found in the market.</div>
              )}
          </div>
      </section>

    </div>
  );
};