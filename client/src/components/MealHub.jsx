import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Helmet } from "react-helmet"; 
import { motion, AnimatePresence } from 'framer-motion';

// --- ICONS ---
import searchIcon from '../icons/search.svg';
import heartIcon from '../icons/heart.svg';
import storeIcon from '../icons/store.svg'; 
import fireIcon from '../icons/fire.svg';       
import clockIcon from '../icons/clock.svg';     
import refreshIcon from '../icons/rotate.svg';  

// --- SHARED COMPONENT ---
const ColoredIcon = ({ src, colorClass, sizeClass = "w-4 h-4" }) => (
  <div className={`${sizeClass} ${colorClass}`} style={{ WebkitMaskImage: `url("${src}")`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: `url("${src}")`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', backgroundColor: 'currentColor' }} />
);

// --- REUSABLE RECIPE ROW COMPONENT ---
const RecipeRow = ({ title, recipes, loading, onRefresh, navigate }) => (
  <section className="mb-10">
      <div className="flex justify-between items-center px-6 mb-5">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
          {onRefresh && (
            <button onClick={onRefresh} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 hover:bg-slate-200 transition-colors">
                <div className={loading ? 'animate-spin' : ''}>
                    <ColoredIcon src={refreshIcon} colorClass="bg-slate-900" sizeClass="w-4 h-4" />
                </div>
            </button>
          )}
      </div>

      <div className="flex overflow-x-auto gap-4 px-6 no-scrollbar pb-4">
          {loading ? [1,2,3].map(i => <div key={i} className="shrink-0 w-72 h-48 bg-white rounded-[2rem] animate-pulse shadow-sm" />) : 
            recipes.map(recipe => (
              <div key={recipe.id} onClick={() => navigate(`/recipe/${recipe.id}`)} className="shrink-0 w-72 group cursor-pointer active:scale-95 transition-transform">
                  <div className="relative h-48 w-full rounded-[2rem] overflow-hidden mb-3 shadow-sm border border-slate-100 bg-slate-100">
                      <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover transition-opacity duration-300" loading="lazy" />
                      <div className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
                          <ColoredIcon src={heartIcon} colorClass="bg-slate-900" sizeClass="w-4 h-4" />
                      </div>
                  </div>
                  <h4 className="px-2 font-black text-slate-900 text-sm leading-tight truncate">{recipe.name}</h4>
                  
                  <div className="px-2 flex gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                          <ColoredIcon src={clockIcon} colorClass="bg-slate-400" sizeClass="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{recipe.time || '20 min'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                          <ColoredIcon src={fireIcon} colorClass="bg-slate-400" sizeClass="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{recipe.calories} kcal</span>
                      </div>
                  </div>
              </div>
          ))}
      </div>
  </section>
);

// --- SEARCH OVERLAY ---
const SearchOverlay = ({ isSearching, setIsSearching, searchTerm, setSearchTerm, activeMode, setActiveMode, results, isApiLoading, onSelect }) => {
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
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Culinary Database</h2>
                            <button onClick={() => { setIsSearching(false); setSearchTerm(''); }} className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                                <svg className="w-5 h-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex p-1 bg-slate-100 rounded-xl mb-4 relative">
                            <motion.div 
                                layout
                                className="absolute top-1 bottom-1 bg-white rounded-[0.6rem] shadow-sm z-0"
                                animate={{ left: activeMode === 'recipes' ? '4px' : '50%', width: 'calc(50% - 4px)' }}
                            />
                            <button onClick={() => setActiveMode('recipes')} className={`flex-1 relative z-10 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeMode === 'recipes' ? 'text-slate-900' : 'text-slate-400'}`}>Global Recipes</button>
                            <button onClick={() => setActiveMode('groceries')} className={`flex-1 relative z-10 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeMode === 'groceries' ? 'text-slate-900' : 'text-slate-400'}`}>My Pantry</button>
                        </div>

                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <ColoredIcon src={searchIcon} colorClass="bg-current" sizeClass="w-5 h-5" />
                            </div>
                            <input 
                                autoFocus 
                                type="text" 
                                placeholder={activeMode === 'recipes' ? "Try 'Keto Chicken' or 'Vegan Pasta'..." : "Search ingredients or scan barcode..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-900 placeholder:text-slate-400 outline-none" 
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-4">
                        {isApiLoading ? (
                            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" /></div>
                        ) : (
                            <div className="space-y-3">
                                {activeMode === 'recipes' ? (
                                    results.recipes.map(r => (
                                        <article key={r.id} onClick={() => onSelect(r, 'recipe')} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl active:bg-slate-100 transition-colors">
                                            <img src={r.image} className="w-14 h-14 rounded-xl object-cover bg-white" alt={r.name} />
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">{r.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <ColoredIcon src={fireIcon} colorClass="bg-slate-400" sizeClass="w-3 h-3" />
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{r.calories} kcal</p>
                                                </div>
                                            </div>
                                        </article>
                                    ))
                                ) : (
                                    results.groceries.map(g => (
                                        <article key={g.id} onClick={() => onSelect(g, 'grocery')} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl active:bg-slate-100 transition-colors">
                                            <div className="w-14 h-14 rounded-xl bg-white border border-slate-100 flex items-center justify-center">
                                                <ColoredIcon src={storeIcon} colorClass="bg-slate-300" sizeClass="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">{g.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{g.brand || 'Generic'}</p>
                                            </div>
                                        </article>
                                    ))
                                )}
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
  const [searchMode, setSearchMode] = useState('recipes');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data States
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [breakfastRecipes, setBreakfastRecipes] = useState([]);
  const [proteinRecipes, setProteinRecipes] = useState([]);
  const [vegRecipes, setVegRecipes] = useState([]);
  const [treatRecipes, setTreatRecipes] = useState([]);
  
  // Loading States
  const [loading, setLoading] = useState({ featured: true, breakfast: true, protein: true, veg: true, treat: true });
  const [allGroceries, setAllGroceries] = useState([]);
  const [searchResults, setSearchResults] = useState({ recipes: [], groceries: [] });
  const [isSearchingAPI, setIsSearchingAPI] = useState(false);

  // --- 1. LOAD GROCERIES ---
  useEffect(() => {
    const q = query(collection(db, "groceries"), orderBy("lastUpdated", "desc"), limit(500));
    const unsub = onSnapshot(q, (snapshot) => {
      setAllGroceries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // --- 2. CURATION ENGINE ---
  const fetchRecipesByUrl = async (url, count = 5) => {
      const res = await fetch(url);
      const data = await res.json();
      const meals = data.meals || [];
      // Shuffle and slice
      const shuffled = meals.sort(() => 0.5 - Math.random()).slice(0, count);
      
      // Augment with mock meta-data (API limitation)
      return shuffled.map(m => ({
          id: m.idMeal,
          name: m.strMeal,
          image: m.strMealThumb,
          time: `${Math.floor(Math.random() * (45 - 15) + 15)} min`,
          calories: Math.floor(Math.random() * (700 - 300) + 300)
      }));
  };

  const loadAllSections = async () => {
    // A. AI Picks (Random)
    setLoading(prev => ({ ...prev, featured: true }));
    const promises = Array.from({ length: 5 }).map(() => fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(res => res.json()));
    const randomResults = await Promise.all(promises);
    setFeaturedRecipes(randomResults.map(r => r.meals?.[0]).filter(Boolean).map(m => ({
        id: m.idMeal, name: m.strMeal, image: m.strMealThumb, time: '20 min', calories: Math.floor(Math.random() * 300 + 300)
    })));
    setLoading(prev => ({ ...prev, featured: false }));

    // B. Breakfast (Morning Fuel)
    setLoading(prev => ({ ...prev, breakfast: true }));
    fetchRecipesByUrl('https://www.themealdb.com/api/json/v1/1/filter.php?c=Breakfast')
      .then(res => { setBreakfastRecipes(res); setLoading(prev => ({ ...prev, breakfast: false })); });

    // C. Protein (Chicken/Beef)
    setLoading(prev => ({ ...prev, protein: true }));
    const proteinType = Math.random() > 0.5 ? 'Chicken' : 'Beef'; // Randomize source
    fetchRecipesByUrl(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${proteinType}`)
      .then(res => { setProteinRecipes(res); setLoading(prev => ({ ...prev, protein: false })); });

    // D. Vegetarian (Health)
    setLoading(prev => ({ ...prev, veg: true }));
    fetchRecipesByUrl('https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian')
      .then(res => { setVegRecipes(res); setLoading(prev => ({ ...prev, veg: false })); });

    // E. Treats (Dessert)
    setLoading(prev => ({ ...prev, treat: true }));
    fetchRecipesByUrl('https://www.themealdb.com/api/json/v1/1/filter.php?c=Dessert')
      .then(res => { setTreatRecipes(res); setLoading(prev => ({ ...prev, treat: false })); });
  };

  useEffect(() => { loadAllSections(); }, []);

  // --- 3. SEARCH LOGIC ---
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

  return (
    <main className="w-full pb-32 font-['Switzer'] bg-gray-50 min-h-screen text-slate-900">
      <Helmet><title>Meal Hub | Smart Nutrition Planner</title></Helmet>

      <SearchOverlay 
        isSearching={isSearching} setIsSearching={setIsSearching}
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        activeMode={searchMode} setActiveMode={setSearchMode}
        results={searchResults} isApiLoading={isSearchingAPI}
        onSelect={(item, type) => type === 'recipe' ? navigate(`/recipe/${item.id}`) : onOpenMenu(item)}
      />

      {/* HEADER */}
      <header className="pt-8 pb-2 px-6">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Smart Nutrition & Meal Planner</p>
          <h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">
              Discover Your Next<br/>Healthy Meal.
          </h1>
      </header>

      {/* SEARCH BAR */}
      <div className="px-6 mb-10">
          <button 
            onClick={() => setIsSearching(true)}
            className="w-full h-16 bg-white rounded-2xl flex items-center px-5 shadow-sm border border-slate-50 active:scale-[0.98] transition-all"
          >
              <div className="text-slate-400 mr-4">
                  <ColoredIcon src={searchIcon} colorClass="bg-current" sizeClass="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-400">Search ingredients, diets, or cravings...</span>
          </button>
      </div>

      {/* SECTION 1: AI Picks */}
      <RecipeRow 
        title="Chef-Curated AI Picks" 
        recipes={featuredRecipes} 
        loading={loading.featured} 
        navigate={navigate}
        onRefresh={() => loadAllSections()} // Only this one has a refresh button
      />

      {/* SECTION 2: Needs - Breakfast */}
      <RecipeRow 
        title="Morning Momentum" 
        recipes={breakfastRecipes} 
        loading={loading.breakfast} 
        navigate={navigate}
      />

      {/* SECTION 3: Needs - High Protein */}
      <RecipeRow 
        title="High-Performance Protein" 
        recipes={proteinRecipes} 
        loading={loading.protein} 
        navigate={navigate}
      />

      {/* SECTION 4: Needs - Plant Based */}
      <RecipeRow 
        title="Plant-Based Power" 
        recipes={vegRecipes} 
        loading={loading.veg} 
        navigate={navigate}
      />

      {/* SECTION 5: Wants - Desserts */}
      <RecipeRow 
        title="Weekend Indulgence" 
        recipes={treatRecipes} 
        loading={loading.treat} 
        navigate={navigate}
      />

      {/* SUBSCRIPTION */}
      <section className="px-6">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 shadow-2xl border border-slate-800">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]" />
              
              <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.4)] rotate-6">
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                  </div>
                  
                  <h4 className="text-2xl font-black text-white mb-2 tracking-tight">Upgrade Your Kitchen Intelligence</h4>
                  <p className="text-slate-400 text-sm font-medium mb-8 max-w-[260px] leading-relaxed">
                      Unlock unlimited AI meal generation, automated nutritional analysis, and smart grocery syncing.
                  </p>
                  
                  <button className="w-full py-5 bg-white text-slate-900 text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all">
                      Start Pro Trial • $4.99/mo
                  </button>
                  <p className="mt-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">No commitment. Cancel anytime.</p>
              </div>
          </div>
      </section>
    </main>
  );
};