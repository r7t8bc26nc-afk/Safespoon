import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom'; 
import { db } from '../firebase';
import { getAuth } from "firebase/auth"; 
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { Helmet } from "react-helmet"; 
import { motion, AnimatePresence } from 'framer-motion';

// --- ICON IMPORTS ---
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
import pastaIcon from '../icons/baguette.svg';
import cakeIcon from '../icons/cake.svg';

// --- HELPER COMPONENT ---
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

// --- NUTRITION LOGIC ENGINE ---
// Values per 100g (Approximate USDA Averages)
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
    vegetable: { cals: 65, pro: 2.9, carb: 13, fat: 0.2 }, // generic avg
    fruit: { cals: 52, pro: 0.3, carb: 14, fat: 0.2 }, // generic avg
    sugar: { cals: 387, pro: 0, carb: 100, fat: 0 },
    flour: { cals: 364, pro: 10, carb: 76, fat: 1 },
};

const calculateRealMacros = (meal) => {
    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    // 1. Iterate through all 20 ingredient slots
    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];

        if (ingredient && ingredient.trim() !== "") {
            const ingLower = ingredient.toLowerCase();
            const measureLower = measure ? measure.toLowerCase() : '';

            // 2. Find matching food profile
            let profile = FOOD_DATABASE.vegetable; // Default fallback
            for (const [key, val] of Object.entries(FOOD_DATABASE)) {
                if (ingLower.includes(key)) {
                    profile = val;
                    break;
                }
            }

            // 3. Parse Quantity (Rough Heuristics)
            let multiplier = 1.0; // Default to 100g serving if unknown
            
            // Extract numbers: "200g" -> 200, "2 cups" -> 2
            const numberMatch = measureLower.match(/(\d+(\.\d+)?)/);
            const qty = numberMatch ? parseFloat(numberMatch[0]) : 1;

            if (measureLower.includes('kg')) multiplier = qty * 10;
            else if (measureLower.includes('lb')) multiplier = qty * 4.53;
            else if (measureLower.includes('oz')) multiplier = qty * 0.28;
            else if (measureLower.includes('cup')) multiplier = qty * 2.4; // avg cup ~240g
            else if (measureLower.includes('tbsp')) multiplier = qty * 0.15;
            else if (measureLower.includes('tsp')) multiplier = qty * 0.05;
            else if (measureLower.includes('g')) multiplier = qty * 0.01;
            
            // 4. Add to Totals
            totals.calories += profile.cals * multiplier;
            totals.protein += profile.pro * multiplier;
            totals.carbs += profile.carb * multiplier;
            totals.fat += profile.fat * multiplier;
        }
    }

    // Round values
    return {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein),
        carbs: Math.round(totals.carbs),
        fat: Math.round(totals.fat)
    };
};

export const Recipes = ({ userProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);
  const [activeCategory, setActiveCategory] = useState('All'); 
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- CONFIGURATION ---
  const categories = [
    { id: 'All', label: 'Discover', icon: null },
    { id: 'Beef', label: 'Beef', icon: beefIcon },
    { id: 'Chicken', label: 'Chicken', icon: chickenIcon },
    { id: 'Seafood', label: 'Seafood', icon: fishIcon },
    { id: 'Vegetarian', label: 'Vegetarian', icon: veggieIcon },
    { id: 'Vegan', label: 'Vegan', icon: fruitIcon },
    { id: 'Pasta', label: 'Pasta', icon: pastaIcon },
    { id: 'Dessert', label: 'Dessert', icon: cakeIcon },
  ];

  const normalizeMeal = (m) => {
      if (!m) return null;
      // RUN THE CALCULATOR HERE
      const calculatedMacros = calculateRealMacros(m);
      
      // Safety check: if calculation returns 0 (bad parsing), fallback to category avg
      if (calculatedMacros.calories < 50) {
          // Fallback logic
      }

      return {
          id: m.idMeal,
          name: m.strMeal,
          image: m.strMealThumb,
          category: m.strCategory,
          area: m.strArea,
          macros: calculatedMacros, 
      };
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 500);
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
                if (isMounted) setRecipes(data.meals ? data.meals.map(normalizeMeal).filter(Boolean) : []);
            } 
            else {
                if (activeCategory === 'All') {
                    const randomPromises = Array.from({ length: 8 }).map(() => fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(r => r.json()));
                    const randomResults = await Promise.all(randomPromises);
                    if (isMounted) {
                        const formatted = randomResults.map(d => d.meals ? normalizeMeal(d.meals[0]) : null).filter(Boolean);
                        const unique = Array.from(new Set(formatted.map(a => a.id))).map(id => formatted.find(a => a.id === id));
                        setRecipes(unique);
                    }
                } 
                else {
                    const listRes = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${activeCategory}`);
                    const listData = await listRes.json();
                    if (!listData.meals) { if (isMounted) setRecipes([]); return; }
                    
                    const topMeals = listData.meals.slice(0, 8);
                    const detailPromises = topMeals.map(meal => fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`).then(r => r.json()).catch(e => null));
                    const detailsData = await Promise.all(detailPromises);
                    
                    if (isMounted) {
                        const formatted = detailsData.filter(d => d && d.meals && d.meals[0]).map(d => normalizeMeal(d.meals[0])).filter(Boolean);
                        setRecipes(formatted);
                    }
                }
            }
        } catch (err) {
            console.error("Fetch error", err);
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
        if (isFavorite) await updateDoc(userRef, { favorites: arrayRemove(recipeId) });
        else await updateDoc(userRef, { favorites: arrayUnion(recipeId) });
    } catch (err) { console.error("Fav error", err); }
  };

  return (
    <div className="w-full font-['Switzer'] space-y-6">
      <Helmet>
        <title>Meal Prep Hub | Safespoon</title>
      </Helmet>
      
      {/* --- HERO & SEARCH --- */}
      <section className="space-y-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Meal Prep Hub</h1>
            <p className="text-slate-500 font-medium text-sm">Find your next meal and track it instantly.</p>
          </div>

          <div className="relative w-full group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors">
                <ColoredIcon src={searchIcon} colorClass="bg-current" sizeClass="w-5 h-5" />
            </div>
            <input 
                type="text" 
                placeholder="Search recipes (e.g. Keto Chicken)..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-base font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900/10 transition-all" 
            />
          </div>
      </section>

      {/* --- CATEGORY PILLS --- */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
         {categories.map(cat => {
             const isActive = activeCategory === cat.id;
             return (
                <button 
                    key={cat.id} 
                    onClick={() => { setActiveCategory(cat.id); setSearchTerm(''); }} 
                    className={`
                        snap-start flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all border
                        ${isActive 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }
                    `}
                >
                    {cat.icon && (
                        <ColoredIcon 
                            src={cat.icon} 
                            colorClass={isActive ? 'bg-white' : 'bg-slate-400'} 
                            sizeClass="w-4 h-4"
                        />
                    )}
                    <span>{cat.label}</span>
                </button>
             );
         })}
      </div>

      {/* --- RECIPE GRID --- */}
      {loading ? (
          <div className="py-20 flex flex-col items-center justify-center opacity-50">
              <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Kitchen...</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-24">
            {recipes.length === 0 && (
                <div className="col-span-full py-12 text-center opacity-60">
                    <p className="text-slate-900 font-bold">No meals found.</p>
                </div>
            )}

            {recipes.map((recipe) => {
                const isFavorite = userProfile?.favorites?.includes(recipe.id);
                
                return (
                    <Link 
                        key={recipe.id}
                        to={`/recipe/${recipe.id}`} 
                        className="bg-white rounded-[2rem] p-3 border border-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] transition-all cursor-pointer group active:scale-[0.99]"
                    >
                        {/* CARD HEADER (Image) */}
                        <div className="relative h-48 w-full rounded-[1.5rem] overflow-hidden mb-3 bg-slate-100">
                            <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                            
                            <button 
                                onClick={(e) => handleToggleFavorite(e, recipe.id)}
                                className="absolute top-3 right-3 w-10 h-10 bg-white/30 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
                            >
                                <ColoredIcon src={isFavorite ? heartFilledIcon : heartIcon} colorClass={isFavorite ? "bg-rose-500" : "bg-white"} sizeClass="w-5 h-5" />
                            </button>

                            {/* CATEGORY BADGE */}
                            <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">{recipe.category}</span>
                            </div>
                        </div>

                        {/* CARD BODY */}
                        <div className="px-2 pb-2">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-black text-slate-900 leading-tight line-clamp-2 w-3/4">
                                    {recipe.name}
                                </h3>
                                {/* CALORIES BADGE */}
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-1 text-orange-500">
                                        <ColoredIcon src={fireIcon} colorClass="bg-current" sizeClass="w-3.5 h-3.5" />
                                        <span className="text-sm font-black">{recipe.macros.calories}</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Kcal</span>
                                </div>
                            </div>

                            {/* MACROS GRID */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="bg-blue-50 rounded-xl p-2 flex flex-col items-center">
                                    <span className="text-[9px] font-bold text-blue-400 uppercase mb-0.5">Protein</span>
                                    <div className="flex items-center gap-1 text-blue-700">
                                        <ColoredIcon src={dumbbellIcon} colorClass="bg-current" sizeClass="w-3 h-3" />
                                        <span className="text-xs font-black">{recipe.macros.protein}g</span>
                                    </div>
                                </div>
                                <div className="bg-orange-50 rounded-xl p-2 flex flex-col items-center">
                                    <span className="text-[9px] font-bold text-orange-400 uppercase mb-0.5">Carbs</span>
                                    <div className="flex items-center gap-1 text-orange-700">
                                        <ColoredIcon src={breadIcon} colorClass="bg-current" sizeClass="w-3 h-3" />
                                        <span className="text-xs font-black">{recipe.macros.carbs}g</span>
                                    </div>
                                </div>
                                <div className="bg-yellow-50 rounded-xl p-2 flex flex-col items-center">
                                    <span className="text-[9px] font-bold text-yellow-500 uppercase mb-0.5">Fat</span>
                                    <div className="flex items-center gap-1 text-yellow-700">
                                        <ColoredIcon src={cheeseIcon} colorClass="bg-current" sizeClass="w-3 h-3" />
                                        <span className="text-xs font-black">{recipe.macros.fat}g</span>
                                    </div>
                                </div>
                            </div>

                            {/* ACTION BUTTON */}
                            <button className="w-full py-3 bg-slate-900 rounded-xl text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 active:scale-[0.98] transition-all">
                                View Recipe
                            </button>
                        </div>
                    </Link>
                );
            })}
        </div>
      )}
    </div>
  );
};