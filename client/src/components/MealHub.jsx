import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Helmet } from "react-helmet-async"; 
import { motion, AnimatePresence } from 'framer-motion';

// --- ICONS ---
import searchIcon from '../icons/search.svg';
import heartIcon from '../icons/heart.svg';
import storeIcon from '../icons/store.svg'; 
import fireIcon from '../icons/fire.svg';       
import clockIcon from '../icons/clock.svg';     
import refreshIcon from '../icons/rotate.svg';
import starIcon from '../icons/sparkle.svg'; 

// --- CONFIG ---
const CACHE_KEY = 'safespoon_meal_hub_v1';
const CACHE_DURATION = 1000 * 60 * 60 * 4; // 4 Hours

// --- SHARED COMPONENT ---
const ColoredIcon = ({ src, colorClass, sizeClass = "w-4 h-4" }) => (
  <div className={`${sizeClass} ${colorClass}`} style={{ WebkitMaskImage: `url("${src}")`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: `url("${src}")`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', backgroundColor: 'currentColor' }} />
);

// --- NEW: FLAT PRO BANNER (Consistent Design) ---
const CompactUpgradeBanner = () => (
    <div className="mx-6 mb-2 p-4 bg-white rounded-2xl flex items-center justify-between border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100">
                <ColoredIcon src={starIcon} colorClass="text-emerald-600" sizeClass="w-5 h-5" />
            </div>
            <div>
                <h4 className="text-sm font-bold text-slate-900 leading-tight">Safespoon Premium</h4>
                <p className="text-[10px] font-bold text-slate-400 capitalize tracking-tight">Unlock AI recipes</p>
            </div>
        </div>
        <button className="px-5 py-2.5 bg-emerald-600 text-emerald-50 text-[10px] font-bold capitalize tracking-tight rounded-xl active:scale-95 transition-transform whitespace-nowrap shadow-md shadow-slate-200">
            Upgrade Now
        </button>
    </div>
);

// --- REUSABLE RECIPE ROW ---
const RecipeRow = ({ title, recipes, loading, onRefresh, navigate, onItemClick }) => (
  <section className="mb-10" aria-label={title}>
      <div className="flex justify-between items-center px-6 mb-5">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
          {onRefresh && (
            <button onClick={onRefresh} aria-label="Refresh recommendations" className="h-8 w-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white transition-colors active:rotate-180 duration-500">
                <div className={loading ? 'animate-spin' : ''}>
                    <ColoredIcon src={refreshIcon} colorClass="bg-current" sizeClass="w-4 h-4" />
                </div>
            </button>
          )}
      </div>

      <div className="flex overflow-x-auto gap-4 px-6 no-scrollbar pb-4 min-h-[220px]">
          {loading && recipes.length === 0 ? (
             [1,2,3].map(i => <div key={i} className="shrink-0 w-72 h-48 bg-slate-50 border border-slate-100 rounded-[2rem] animate-pulse" />)
          ) : (
            recipes.map(recipe => (
              <article 
                key={recipe.id} 
                onClick={() => onItemClick ? onItemClick(recipe) : navigate(`/recipe/${recipe.id}`)} 
                className="shrink-0 w-72 group cursor-pointer active:scale-95 transition-transform"
                role="link"
                tabIndex={0}
              >
                  <div className="relative h-48 w-full rounded-[2rem] overflow-hidden mb-3 shadow-sm border border-slate-100 bg-slate-100">
                      <img 
                        src={recipe.image} 
                        alt={recipe.name}
                        className="w-full h-full object-cover transition-opacity duration-300" 
                        loading="lazy" 
                      />
                      <div className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
                          <ColoredIcon src={heartIcon} colorClass="bg-slate-900" sizeClass="w-3.5 h-3.5" />
                      </div>
                  </div>
                  <h4 className="px-1 font-black text-slate-900 text-sm leading-tight truncate">{recipe.name}</h4>
                  
                  <div className="px-1 flex gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                          <ColoredIcon src={clockIcon} colorClass="bg-slate-400" sizeClass="w-3 h-3" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{recipe.time || '15 min'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                          <ColoredIcon src={fireIcon} colorClass="bg-slate-400" sizeClass="w-3 h-3" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{recipe.calories} kcal</span>
                      </div>
                  </div>
              </article>
          )))}
      </div>
  </section>
);

// --- SEARCH OVERLAY ---
const SearchOverlay = ({ isSearching, setIsSearching, searchTerm, setSearchTerm, results, isApiLoading, onSelect }) => {
    return (
        <AnimatePresence>
            {isSearching && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: 10 }}
                    className="fixed inset-0 z-[9999] bg-white flex flex-col font-['Switzer']"
                >
                    <div className="pt-14 px-5 pb-4 bg-white border-b border-slate-50">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Kitchen Search</h2>
                            <button 
                                onClick={() => { setIsSearching(false); setSearchTerm(''); }} 
                                className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                            >
                                <span className="font-bold text-lg">✕</span>
                            </button>
                        </div>

                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                <ColoredIcon src={searchIcon} colorClass="bg-current" sizeClass="w-4 h-4" />
                            </div>
                            <input 
                                autoFocus 
                                type="text" 
                                placeholder="Search recipes, ingredients, or scan barcode..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 bg-slate-100 rounded-xl pl-10 pr-4 font-medium text-slate-700 placeholder:text-slate-500 outline-none text-sm" 
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-4">
                        {results.groceries.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">From Your Pantry</h3>
                                <div className="space-y-3">
                                    {results.groceries.map(g => (
                                        <article key={g.id} onClick={() => onSelect(g, 'grocery')} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl active:bg-slate-100 transition-colors cursor-pointer">
                                            <div className="w-14 h-14 rounded-xl bg-white border border-slate-100 flex items-center justify-center">
                                                <ColoredIcon src={storeIcon} colorClass="bg-slate-300" sizeClass="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">{g.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{g.brand || 'Generic'}</p>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(results.recipes.length > 0 || isApiLoading) && (
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Global Discoveries</h3>
                                <div className="space-y-3">
                                    {results.recipes.map(r => (
                                        <article key={r.id} onClick={() => onSelect(r, 'recipe')} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl active:bg-slate-100 transition-colors cursor-pointer">
                                            <img src={r.image} className="w-14 h-14 rounded-xl object-cover bg-white" alt={r.name} />
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">{r.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <ColoredIcon src={fireIcon} colorClass="bg-slate-400" sizeClass="w-3 h-3" />
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{r.calories} kcal</p>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                    {isApiLoading && (
                                        <div className="flex justify-center py-6">
                                            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export const MealHub = ({ userProfile, onOpenMenu }) => {
  const navigate = useNavigate();
  
  // UI States
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- 1. OPTIMIZED CACHE STRATEGY ---
  // Load whatever is in cache IMMEDIATELY, regardless of goal match.
  // This prevents the "blank page" flicker. We will silently update it if goal mismatches later.
  const getInitialState = (key, fallback) => {
      try {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
              const parsed = JSON.parse(cached);
              // Simply return data if it exists. We refetch in useEffect anyway if needed.
              if (parsed.data) return parsed.data[key] || fallback;
          }
      } catch (e) {}
      return fallback;
  };

  const [featuredRecipes, setFeaturedRecipes] = useState(() => getInitialState('featured', []));
  const [breakfastRecipes, setBreakfastRecipes] = useState(() => getInitialState('breakfast', []));
  const [goalRecipes, setGoalRecipes] = useState(() => getInitialState('goalRecipes', []));
  const [goalTitle, setGoalTitle] = useState(() => getInitialState('goalTitle', 'Recommended For You'));
  const [vegRecipes, setVegRecipes] = useState(() => getInitialState('veg', []));
  const [treatRecipes, setTreatRecipes] = useState(() => getInitialState('treat', []));
  const [drinkRecipes, setDrinkRecipes] = useState(() => getInitialState('drinks', []));
  
  // Only show loading skeletons if we truly have NO data
  const [isRefreshing, setIsRefreshing] = useState(featuredRecipes.length === 0);
  
  const [allGroceries, setAllGroceries] = useState([]);
  const [searchResults, setSearchResults] = useState({ recipes: [], groceries: [] });
  const [isSearchingAPI, setIsSearchingAPI] = useState(false);

  // --- 2. LOAD GROCERIES ---
  useEffect(() => {
    const q = query(collection(db, "groceries"), orderBy("lastUpdated", "desc"), limit(500));
    return onSnapshot(q, (snapshot) => {
      setAllGroceries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  // --- 3. DATA FETCHING UTILS ---
  const fetchRecipesByUrl = async (url, count = 5, isDrink = false) => {
      try {
        const res = await fetch(url);
        const data = await res.json();
        const items = isDrink ? data.drinks : data.meals;
        const list = items || [];
        const shuffled = list.sort(() => 0.5 - Math.random()).slice(0, count);
        
        return shuffled.map(m => ({
            id: isDrink ? m.idDrink : m.idMeal,
            name: isDrink ? m.strDrink : m.strMeal,
            image: isDrink ? m.strDrinkThumb : m.strMealThumb,
            time: isDrink ? '5 min' : `${Math.floor(Math.random() * (45 - 15) + 15)} min`,
            calories: Math.floor(Math.random() * (isDrink ? (250 - 80) + 80 : (700 - 300) + 300))
        }));
      } catch (e) { return []; }
  };

  const loadAllSections = async (forceRefresh = false) => {
    // If profile isn't ready, use 'maintain' as safe default but don't crash
    const userGoal = userProfile?.goalType || 'maintain'; 
    
    if (!forceRefresh) {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            const { timestamp, goal } = JSON.parse(cachedData);
            const isFresh = (Date.now() - timestamp) < CACHE_DURATION;
            
            // If cache is fresh AND matches the user's current goal (or they have no goal yet)
            // We can skip the fetch completely.
            if (isFresh && (goal === userGoal || !userProfile)) {
                setIsRefreshing(false);
                return; 
            }
        }
    }

    setIsRefreshing(true);

    let goalCategory = 'Chicken'; 
    let dynamicTitle = 'High-Performance Protein';

    if (userGoal === 'lose') {
        goalCategory = Math.random() > 0.5 ? 'Chicken' : 'Seafood';
        dynamicTitle = 'Lean Fuel (Fat Loss)';
    } else if (userGoal === 'gain') {
        goalCategory = Math.random() > 0.5 ? 'Beef' : 'Pasta';
        dynamicTitle = 'Mass Builder (High Calorie)';
    } else {
        goalCategory = Math.random() > 0.5 ? 'Pork' : 'Lamb';
        dynamicTitle = 'Balanced Maintenance';
    }
    setGoalTitle(dynamicTitle);

    try {
        const [randomData, breakfast, goal, veg, drinks, treats] = await Promise.all([
            Promise.all(Array.from({ length: 5 }).map(() => fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(r => r.json()))),
            fetchRecipesByUrl('https://www.themealdb.com/api/json/v1/1/filter.php?c=Breakfast'),
            fetchRecipesByUrl(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${goalCategory}`),
            fetchRecipesByUrl('https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian'),
            fetchRecipesByUrl('https://www.thecocktaildb.com/api/json/v1/1/filter.php?c=Cocktail', 5, true),
            fetchRecipesByUrl('https://www.themealdb.com/api/json/v1/1/filter.php?c=Dessert')
        ]);

        const formattedFeatured = randomData.map(r => r.meals?.[0]).filter(Boolean).map(m => ({
            id: m.idMeal, name: m.strMeal, image: m.strMealThumb, time: '20 min', calories: Math.floor(Math.random() * 300 + 300)
        }));

        setFeaturedRecipes(formattedFeatured);
        setBreakfastRecipes(breakfast);
        setGoalRecipes(goal);
        setVegRecipes(veg);
        setDrinkRecipes(drinks);
        setTreatRecipes(treats);

        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            goal: userGoal,
            data: {
                featured: formattedFeatured,
                breakfast,
                goalRecipes: goal,
                goalTitle: dynamicTitle,
                veg,
                drinks,
                treat: treats
            }
        }));

    } catch (err) {
        console.error("Load Error", err);
    } finally {
        setIsRefreshing(false);
    }
  };

  // Run on mount. Add userGoal to dependency so it refetches if goal changes.
  useEffect(() => { loadAllSections(); }, [userProfile?.goalType]);

  // --- 4. SEARCH LOGIC ---
  useEffect(() => {
    if (!searchTerm.trim()) return;
    const delay = setTimeout(async () => {
        setIsSearchingAPI(true);
        const matchedGroceries = allGroceries.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        let matchedRecipes = [];
        try {
            const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${searchTerm}`);
            const data = await res.json();
            if (data.meals) matchedRecipes = data.meals.map(m => ({ id: m.idMeal, name: m.strMeal, image: m.strMealThumb, calories: 450 })).slice(0, 10);
        } catch (e) {}
        
        setSearchResults({ recipes: matchedRecipes, groceries: matchedGroceries });
        setIsSearchingAPI(false);
    }, 400);
    return () => clearTimeout(delay);
  }, [searchTerm, allGroceries]);

  // --- 5. FORMAT & HANDLERS ---
  const formatItemForMenu = (details, type, originalItem, relatedItems) => {
      const isDrink = type === 'drink';
      const ingredientsList = [];
      for (let i = 1; i <= 20; i++) {
          const ing = details[`strIngredient${i}`];
          const measure = details[`strMeasure${i}`];
          if (ing && ing.trim()) ingredientsList.push(measure ? `${measure.trim()} ${ing.trim()}` : ing.trim());
      }

      return {
          id: originalItem.id, 
          name: isDrink ? details.strDrink : details.strMeal,
          image: isDrink ? details.strDrinkThumb : details.strMealThumb,
          brand: isDrink ? "House Mixology" : (details.strArea ? `${details.strArea} Cuisine` : "International"),
          taxonomy: { category: (isDrink ? details.strCategory : details.strCategory) || "General" },
          safetyProfile: { allergens: {} },
          ingredients: ingredientsList.join(', '),
          macros: { 
              calories: originalItem.calories,
              carbs: isDrink ? 15 : 45,
              protein: isDrink ? 0 : 25,
              fat: isDrink ? 0 : 15
          },
          relatedItems: relatedItems, 
          type: type 
      };
  };

  const handleDrinkSelect = async (drink) => {
      try {
          const res = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${drink.id}`);
          const data = await res.json();
          const fullDrink = data.drinks ? data.drinks[0] : null;
          if (!fullDrink) return;
          const related = drinkRecipes.filter(d => d.id !== drink.id).sort(() => 0.5 - Math.random()).slice(0, 5);
          const menuData = formatItemForMenu(fullDrink, 'drink', drink, related);
          onOpenMenu(menuData);
      } catch (e) {}
  };

  const handleFoodSelect = async (recipe, categoryList) => {
      try {
          const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${recipe.id}`);
          const data = await res.json();
          const fullMeal = data.meals ? data.meals[0] : null;
          if (!fullMeal) return;
          const related = categoryList.filter(r => r.id !== recipe.id).sort(() => 0.5 - Math.random()).slice(0, 5);
          const menuData = formatItemForMenu(fullMeal, 'food', recipe, related);
          onOpenMenu(menuData);
      } catch (e) {}
  };

  // --- WRAPPERS ---
  const handleFeaturedClick = (item) => handleFoodSelect(item, featuredRecipes);
  const handleBreakfastClick = (item) => handleFoodSelect(item, breakfastRecipes);
  const handleGoalClick = (item) => handleFoodSelect(item, goalRecipes);
  const handleVegClick = (item) => handleFoodSelect(item, vegRecipes);
  const handleTreatClick = (item) => handleFoodSelect(item, treatRecipes);

  return (
    <main className="w-full pb-6 font-['Switzer'] bg-gray-50 min-h-screen text-slate-900">
      <Helmet><title>Meal Hub | Smart Nutrition Planner</title></Helmet>

      <SearchOverlay 
        isSearching={isSearching} setIsSearching={setIsSearching}
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        results={searchResults} isApiLoading={isSearchingAPI}
        onSelect={(item, type) => type === 'recipe' ? handleFoodSelect(item, featuredRecipes) : onOpenMenu(item)}
      />

      <header className="pt-8 pb-2 px-6">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Smart Nutrition & Meal Planner</p>
          <h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">
              Discover Your Next<br/>Healthy Meal
          </h1>
      </header>

      <div className="px-6 mb-10">
          <button 
            onClick={() => setIsSearching(true)}
            className="w-full h-12 bg-slate-200/60 rounded-xl flex items-center px-4 active:bg-slate-200 transition-colors"
          >
              <div className="text-slate-500 mr-3">
                  <ColoredIcon src={searchIcon} colorClass="bg-current" sizeClass="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-slate-500">Search ingredients, diets, or cravings...</span>
          </button>
      </div>

      <RecipeRow title="Chef's Daily Selections" recipes={featuredRecipes} loading={isRefreshing && featuredRecipes.length === 0} navigate={navigate} onRefresh={() => loadAllSections(true)} onItemClick={handleFeaturedClick} />
      <RecipeRow title="Morning Momentum" recipes={breakfastRecipes} loading={isRefreshing && breakfastRecipes.length === 0} navigate={navigate} onItemClick={handleBreakfastClick} />
      
      {/* Dynamic Goal Row */}
      <RecipeRow title={goalTitle} recipes={goalRecipes} loading={isRefreshing && goalRecipes.length === 0} navigate={navigate} onItemClick={handleGoalClick} />
      
      <RecipeRow title="Plant-Based Power" recipes={vegRecipes} loading={isRefreshing && vegRecipes.length === 0} navigate={navigate} onItemClick={handleVegClick} />
      <RecipeRow title="Mindful Mixology" recipes={drinkRecipes} loading={isRefreshing && drinkRecipes.length === 0} navigate={navigate} onItemClick={handleDrinkSelect} />
      <RecipeRow title="Weekend Indulgence" recipes={treatRecipes} loading={isRefreshing && treatRecipes.length === 0} navigate={navigate} onItemClick={handleTreatClick} />

      {/* NEW COMPACT BANNER */}
      <CompactUpgradeBanner />

    </main>
  );
};