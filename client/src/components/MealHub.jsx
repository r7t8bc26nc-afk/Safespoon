import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Helmet } from "react-helmet"; 

// --- ICONS ---
import searchIcon from '../icons/search.svg';
import heartIcon from '../icons/heart.svg';
import storeIcon from '../icons/store.svg'; 
import refreshIcon from '../icons/rotate.svg'; // Assuming you have this, or standard svg

const ColoredIcon = ({ src, colorClass, sizeClass = "w-4 h-4" }) => (
  <div className={`${sizeClass} ${colorClass}`} style={{ WebkitMaskImage: `url("${src}")`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: `url("${src}")`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', backgroundColor: 'currentColor' }} />
);

export const MealHub = ({ userProfile, onOpenMenu }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  
  // Data States
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [allGroceries, setAllGroceries] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);

  // Search States
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState({ recipes: [], groceries: [] });
  const [isSearchingAPI, setIsSearchingAPI] = useState(false);
  const searchInputRef = useRef(null);

  // --- 1. SETUP: FETCH GROCERIES LISTENER ---
  useEffect(() => {
    // We fetch the latest 500 items to ensure client-side search is snappy and comprehensive
    const q = query(collection(db, "groceries"), orderBy("lastUpdated", "desc"), limit(500));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllGroceries(items);
    });
    return () => unsub();
  }, []);

  // --- 2. SETUP: FETCH "AI" RECIPES (Random/Featured) ---
  const fetchRandomRecipes = async () => {
    setLoadingRecipes(true);
    try {
        // Fetch 5 random meals to simulate "AI" generation
        const promises = Array.from({ length: 5 }).map(() => 
            fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(res => res.json())
        );
        const results = await Promise.all(promises);
        const meals = results.map(r => r.meals?.[0]).filter(Boolean).map(m => ({
            id: m.idMeal,
            name: m.strMeal,
            image: m.strMealThumb,
            category: m.strCategory,
            time: '25 min', // Mock data as API doesn't provide time
            calories: Math.floor(Math.random() * (600 - 300) + 300) // Mock calories
        }));
        // Deduplicate
        const unique = [...new Map(meals.map(item => [item.id, item])).values()];
        setFeaturedRecipes(unique);
    } catch (err) {
        console.error("Failed to fetch recipes", err);
    } finally {
        setLoadingRecipes(false);
    }
  };

  useEffect(() => {
    fetchRandomRecipes();
  }, []);

  // --- 3. SEARCH ENGINE ---
  useEffect(() => {
    if (!searchTerm.trim()) {
        setSearchResults({ recipes: [], groceries: [] });
        return;
    }

    const delayDebounceFn = setTimeout(async () => {
        setIsSearchingAPI(true);
        const lowerTerm = searchTerm.toLowerCase();

        // A. Search Local Database (Groceries)
        const matchedGroceries = allGroceries.filter(item => 
            item.name?.toLowerCase().includes(lowerTerm) || 
            item.brand?.toLowerCase().includes(lowerTerm) ||
            item.taxonomy?.category?.toLowerCase().includes(lowerTerm)
        );

        // B. Search External API (Recipes)
        let matchedRecipes = [];
        try {
            const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${searchTerm}`);
            const data = await res.json();
            if (data.meals) {
                matchedRecipes = data.meals.map(m => ({
                    id: m.idMeal,
                    name: m.strMeal,
                    image: m.strMealThumb,
                    calories: Math.floor(Math.random() * (600 - 300) + 300) // Mock
                })).slice(0, 10); // Limit results
            }
        } catch (err) {
            console.error("API Search Error", err);
        }

        setSearchResults({ recipes: matchedRecipes, groceries: matchedGroceries });
        setIsSearchingAPI(false);
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, allGroceries]);


  // --- COMPONENT: SEARCH OVERLAY ---
  if (isSearchMode) {
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col font-['Switzer'] animate-in fade-in duration-200">
        <div className="flex items-center gap-3 pt-safe-top px-5 pb-4 border-b border-slate-100 bg-white">
          <div className="relative flex-1 h-[50px] bg-slate-100 rounded-2xl flex items-center px-4">
             <div className="text-slate-400 mr-3">
                 <ColoredIcon src={searchIcon} colorClass="bg-current" sizeClass="w-5 h-5" />
             </div>
             <input
              ref={searchInputRef}
              autoFocus
              type="text"
              placeholder="Search recipes & groceries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent h-full text-black font-semibold placeholder:text-slate-400 outline-none text-[16px]"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="p-2 text-slate-400 active:text-black">✕</button>
            )}
          </div>
          <button 
            onClick={() => { setIsSearchMode(false); setSearchTerm(''); }} 
            className="h-[50px] px-4 font-bold text-black active:opacity-70"
          >
            Cancel
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pb-20">
          {!searchTerm ? (
            <div className="mt-10 text-center">
                <p className="text-slate-400 font-bold text-sm">Type to search your database & recipes</p>
            </div>
          ) : isSearchingAPI ? (
             <div className="mt-10 flex justify-center">
                 <div className="w-6 h-6 border-2 border-slate-200 border-t-black rounded-full animate-spin"></div>
             </div>
          ) : (
             <div className="flex flex-col gap-8">
                {/* RESULTS: RECIPES */}
                {searchResults.recipes.length > 0 && (
                    <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Recipes Found</h3>
                        <div className="flex flex-col gap-4">
                            {searchResults.recipes.map(r => (
                                <div key={r.id} onClick={() => navigate(`/recipe/${r.id}`)} className="flex items-center gap-4 group cursor-pointer">
                                    <img src={r.image} className="w-16 h-16 rounded-xl bg-slate-100 object-cover" />
                                    <div>
                                        <p className="font-bold text-black text-[15px] leading-tight mb-1 group-hover:text-slate-600 transition-colors">{r.name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-400">Recipe</span>
                                            <span className="text-[10px] text-slate-300">•</span>
                                            <span className="text-xs font-bold text-slate-400">{r.calories} kcal</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* RESULTS: GROCERIES */}
                {searchResults.groceries.length > 0 && (
                    <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">From Your Database</h3>
                        <div className="flex flex-col gap-4">
                            {searchResults.groceries.map(g => (
                                <div key={g.id} onClick={() => onOpenMenu(g)} className="flex items-center gap-4 group cursor-pointer">
                                    <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                        <ColoredIcon src={storeIcon} colorClass="bg-slate-300" sizeClass="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-black text-[15px] leading-tight mb-1 capitalize">{g.name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-400 capitalize">{g.brand || "Generic"}</span>
                                            <span className="text-[10px] text-slate-300">•</span>
                                            <span className="text-xs font-bold text-slate-400 capitalize">{g.taxonomy?.category || "Item"}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {searchResults.recipes.length === 0 && searchResults.groceries.length === 0 && (
                    <div className="text-center mt-10">
                        <p className="text-slate-900 font-bold mb-1">No matches found.</p>
                        <p className="text-slate-400 text-sm">Try a different term like "Chicken" or "Rice".</p>
                    </div>
                )}
             </div>
          )}
        </div>
      </div>
    );
  }

  // --- MAIN SCREEN RENDER ---
  return (
    <div className="w-full font-['Switzer'] pb-safe-bottom bg-white min-h-screen">
      <Helmet><title>Meal Hub | Safespoon</title></Helmet>

      {/* HEADER */}
      <header className="px-6 pt-8 pb-4">
          <p className="text-sm font-bold text-slate-400 mb-1">Hi {userProfile?.firstName || 'Chef'}</p>
          <h1 className="text-3xl font-black text-black leading-[1.1] tracking-tight">
              What's On Your<br/>Plate Today?
          </h1>
      </header>

      {/* SEARCH BAR (Redesigned: Split Layout) */}
      <div className="px-6 mt-4 mb-8">
          <div className="flex gap-3 h-[56px]">
              {/* Input Container */}
              <div 
                onClick={() => setIsSearchMode(true)}
                className="flex-1 bg-[#F6F7FB] rounded-2xl flex items-center px-4 cursor-text border border-transparent hover:border-slate-200 transition-colors"
              >
                  <div className="text-slate-400 mr-3">
                      <ColoredIcon src={searchIcon} colorClass="bg-current" sizeClass="w-5 h-5" />
                  </div>
                  <span className="text-[15px] font-medium text-slate-400 truncate">
                      Describe what you're craving...
                  </span>
              </div>
              
              {/* Button Container */}
              <button 
                onClick={() => setIsSearchMode(true)}
                className="h-full aspect-square bg-black rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
              >
                  <ColoredIcon src={searchIcon} colorClass="bg-white" sizeClass="w-5 h-5" />
              </button>
          </div>
      </div>

      {/* FEATURED RECIPES (Real API Data) */}
      <section className="mb-8">
          <div className="flex justify-between items-center px-6 mb-5">
              <h3 className="text-lg font-bold text-black tracking-tight">Easy AI Recipes</h3>
              <button 
                onClick={fetchRandomRecipes}
                disabled={loadingRecipes}
                className="text-xs font-bold text-black flex items-center gap-1.5 border border-slate-200 px-3 py-1.5 rounded-full active:bg-slate-50 transition-colors disabled:opacity-50"
              >
                  <span className={`text-lg leading-none ${loadingRecipes ? 'animate-spin' : ''}`}>
                      {loadingRecipes ? 'C' : '+'}
                  </span> 
                  {loadingRecipes ? 'Generating...' : 'Generate New'}
              </button>
          </div>

          <div className="flex overflow-x-auto gap-4 px-6 pb-4 snap-x no-scrollbar">
              {loadingRecipes ? (
                  // Loading Skeletons
                  [1,2,3].map(i => (
                    <div key={i} className="snap-center shrink-0 w-[260px] flex flex-col gap-3">
                        <div className="h-[180px] w-full bg-slate-100 rounded-[24px] animate-pulse" />
                        <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
                    </div>
                  ))
              ) : (
                  featuredRecipes.map(recipe => (
                    <div key={recipe.id} onClick={() => navigate(`/recipe/${recipe.id}`)} className="snap-center shrink-0 w-[260px] flex flex-col gap-3 group cursor-pointer active:scale-[0.98] transition-transform">
                        <div className="relative h-[180px] w-full rounded-[24px] overflow-hidden bg-slate-100 shadow-sm">
                            <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
                            <div className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
                                <ColoredIcon src={heartIcon} colorClass="bg-slate-900" sizeClass="w-4 h-4" />
                            </div>
                        </div>
                        
                        <div className="px-1">
                            <h3 className="text-[17px] font-bold text-black leading-tight line-clamp-2 mb-2">
                                {recipe.name}
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-slate-500 font-bold">
                                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">⏱ {recipe.time}</div>
                                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">🔥 {recipe.calories} kcal</div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button className="flex-1 h-[40px] bg-black text-white text-xs font-bold rounded-xl shadow-md">Cook Now</button>
                                <button className="flex-1 h-[40px] bg-white border border-slate-200 text-black text-xs font-bold rounded-xl">Details</button>
                            </div>
                        </div>
                    </div>
                  ))
              )}
          </div>
      </section>

      {/* DAILY MEAL PLAN (Locked) */}
      <section className="px-6 pb-12">
         <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-black tracking-tight">Daily Meal Plan</h3>
              <div className="flex bg-slate-100 p-1 rounded-full">
                  {['All', 'Bkfast', 'Lunch'].map(cat => (
                      <button key={cat} onClick={() => setActiveTab(cat)} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${activeTab === cat ? 'bg-white text-black shadow-sm' : 'text-slate-400'}`}>
                          {cat}
                      </button>
                  ))}
              </div>
          </div>

          <div className="relative overflow-hidden rounded-[32px] border border-slate-100">
              {/* Call to Action Overlay */}
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-4 shadow-xl rotate-3">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                  </div>
                  <h4 className="text-xl font-black text-black mb-2 tracking-tight">Unlock Your Plan</h4>
                  <p className="text-sm text-slate-500 font-medium mb-6 max-w-[240px] leading-relaxed">
                      Get AI-personalized daily meal plans and automatic grocery lists.
                  </p>
                  <button className="w-full py-4 bg-black text-white text-sm font-bold rounded-2xl shadow-xl active:scale-95 transition-transform">
                      Subscribe • $4.99/mo
                  </button>
              </div>

              {/* Background Content (Blurred) */}
              <div className="flex flex-col gap-1 p-2 opacity-40 select-none">
                  {[1, 2, 3].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-[#F8F9FC] rounded-[24px]">
                        <div className="h-16 w-16 rounded-2xl bg-slate-200 shrink-0" />
                        <div className="flex-1">
                            <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
                            <div className="h-3 w-20 bg-slate-200 rounded" />
                        </div>
                    </div>
                  ))}
              </div>
          </div>
      </section>
    </div>
  );
};