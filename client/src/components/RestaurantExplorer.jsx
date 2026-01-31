import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

// --- ICONS ---
import cheeseIcon from '../icons/cheese.svg'; 
import steakIcon from '../icons/steak.svg';
import pantryIcon from '../icons/door-open.svg';
import candyIcon from '../icons/candy.svg';
import drinkIcon from '../icons/cup-straw.svg';
import storeIcon from '../icons/store.svg'; 

// --- CONFIGURATION ---
const AISLES = {
  'All': [],
  'Dairy': ['milk', 'cheese', 'yogurt', 'cream', 'butter', 'dairy'],
  'Meat': ['meat', 'chicken', 'poultry', 'beef', 'pork', 'fish', 'seafood'],
  'Pantry': ['cereal', 'pasta', 'rice', 'sauce', 'oil', 'spice', 'baking', 'bread'],
  'Snacks': ['chip', 'snack', 'candy', 'chocolate', 'cracker', 'popcorn', 'cookie'],
  'Drinks': ['beverage', 'juice', 'soda', 'water', 'tea', 'coffee', 'drink']
};

const SUB_SECTIONS = {
  'Dairy': ['Milk', 'Cheese', 'Yogurt', 'Butter & Cream'],
  'Meat': ['Chicken', 'Beef', 'Pork', 'Fish & Seafood'],
  'Pantry': ['Cereal', 'Pasta & Rice', 'Sauces', 'Baking'],
  'Snacks': ['Chips & Crackers', 'Candy & Sweets', 'Bars'],
  'Drinks': ['Water', 'Soda', 'Juice', 'Coffee & Tea']
};

export const RestaurantExplorer = ({ onOpenMenu, userProfile }) => {
  const [items, setItems] = useState([]);
  const [activeAisle, setActiveAisle] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Navigation & View State
  const [viewingSubPage, setViewingSubPage] = useState(null); 
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const searchInputRef = useRef(null);

  // --- FIXED USE EFFECT (Handles Safari Crash) ---
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "groceries"), orderBy("lastUpdated", "desc"), limit(300));
    
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    try {
      const rawHistory = JSON.parse(localStorage.getItem('safespoon_search_history') || '[]');
      const cleanHistory = Array.isArray(rawHistory) 
        ? rawHistory.filter(item => typeof item === 'string') 
        : [];
      setRecentSearches(cleanHistory);
    } catch (err) {
      console.warn("Cleared corrupted search history", err);
      setRecentSearches([]);
    }

    return () => unsub();
  }, []);

  // --- SAFETY & LIFESTYLE LOGIC ---
  const getSafetyAnalysis = (item) => {
    if (!userProfile) return { status: 'neutral', title: '', copy: '' };
    
    const itemAllergens = item.safetyProfile?.allergens || {};
    const userAllergens = userProfile.allergens || {};
    const userLifestyle = userProfile.lifestyle || {}; 

    // 1. CRITICAL: Allergen Check (Red / Avoid)
    const conflicts = Object.keys(userAllergens).filter(k => userAllergens[k] && itemAllergens[k]);
    if (conflicts.length > 0) {
      return { 
        status: 'unsafe', 
        title: `Contains ${conflicts.join(', ')}`,
        copy: `This item contains ingredients you've flagged as strictly unsafe. Best to steer clear.`
      };
    }

    // 2. WARNING: Lifestyle Check (Yellow / Caution)
    if (userLifestyle.isKeto && (item.macros?.carbs > 10)) {
       return {
         status: 'lifestyle_conflict',
         title: 'High Carb Count',
         copy: "This choice is a bit of a rebel against your Keto goals. It's safe to eat, but might use up your daily carb allowance faster than you'd like."
       };
    }

    if (userLifestyle.isVegan && (item.taxonomy?.category?.includes('dairy'))) {
        return {
          status: 'lifestyle_conflict',
          title: 'Contains Animal Products',
          copy: "While not an allergen risk, this aligns more with traditional dairy than a plant-based lifestyle."
        };
    }

    // 3. SAFE
    return { status: 'safe', title: '', copy: '' };
  };

  const handleSearchSubmit = (term) => {
    if (!term) return;
    const newHistory = [term, ...recentSearches.filter(t => t !== term)].slice(0, 5);
    setRecentSearches(newHistory);
    localStorage.setItem('safespoon_search_history', JSON.stringify(newHistory));
    setSearchTerm(term);
    setIsSearchMode(false);
  };

  // --- FILTERING ---
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const name = (item.name || '').toLowerCase();
      const brand = (item.brand || '').toLowerCase();
      const cat = (item.taxonomy?.category || '').toLowerCase();
      const query = searchTerm.toLowerCase();

      // In Overlay Mode, we search everything. In Feed mode, we filter by Aisle + Search
      const matchesSearch = query === '' || name.includes(query) || brand.includes(query);
      const aisleKeywords = AISLES[activeAisle];
      const matchesAisle = isSearchMode ? true : (activeAisle === 'All' || aisleKeywords.some(k => cat.includes(k)));

      return matchesSearch && matchesAisle;
    });
  }, [items, activeAisle, searchTerm, isSearchMode]);

  const groupedItems = useMemo(() => {
    if (activeAisle === 'All') {
       // Group by Aisle
       const groups = {};
       Object.keys(AISLES).forEach(key => {
         if (key === 'All') return;
         const keywords = AISLES[key];
         const matches = filteredItems.filter(item => 
           keywords.some(k => (item.taxonomy?.category || '').toLowerCase().includes(k))
         );
         if (matches.length > 0) groups[key] = matches;
       });
       return groups;
    } else {
       // Group by SubSection
       const groups = {};
       const subs = SUB_SECTIONS[activeAisle] || [];
       subs.forEach(sub => {
         const keywords = sub.toLowerCase().split(' & ').flatMap(k => k.split(' '));
         const matches = filteredItems.filter(item => 
           keywords.some(k => (item.taxonomy?.category || '').toLowerCase().includes(k))
         );
         if (matches.length > 0) groups[sub] = matches;
       });
       return groups;
    }
  }, [filteredItems, activeAisle]);

  // --- COMPONENTS ---
  const ProductCard = ({ item, minimal = false }) => {
    const { status, title, copy } = getSafetyAnalysis(item);
    const isUnsafe = status === 'unsafe';
    const isLifestyleConflict = status === 'lifestyle_conflict';

    // Base Styles
    let cardStyle = "bg-white border-slate-100 hover:border-slate-300";
    let badge = null;

    // Safety Styling
    if (isUnsafe) {
      cardStyle = "bg-red-50 border-red-200 ring-2 ring-red-400 shadow-[0_0_15px_rgba(239,68,68,0.25)]";
      badge = (
        <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-red-600 text-white rounded text-[9px] font-black uppercase tracking-tight z-10">
          Avoid
        </span>
      );
    } else if (isLifestyleConflict && !minimal) {
       cardStyle = "bg-yellow-50 border-yellow-200 hover:border-yellow-300";
    }

    return (
      <article 
        onClick={() => onOpenMenu(item)}
        className={`flex flex-col p-4 rounded-2xl border transition-all cursor-pointer relative overflow-visible group ${cardStyle} ${minimal ? 'min-w-[150px] w-[150px]' : 'w-full'}`}
      >
        <div className="flex justify-between items-start mb-1 h-5 w-full pr-8">
          <span className="text-[10px] font-bold text-slate-400 capitalize tracking-tight truncate w-full">
            {item.brand || "Generic"}
          </span>
        </div>
        
        {badge}

        <h3 className={`font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors capitalize tracking-tight line-clamp-3 ${minimal ? 'text-sm h-12' : 'text-base'}`}>
          {(item.name || item.taxonomy?.category || 'Unknown').toLowerCase()}
        </h3>

        {!minimal && (isUnsafe || isLifestyleConflict) && (
          <div className="mt-3 pt-3 border-t border-slate-200/50">
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isUnsafe ? 'text-red-500' : 'text-yellow-600'}`}>
              {title}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              {copy}
            </p>
          </div>
        )}
      </article>
    );
  };

  // --- VIEW: SEARCH OVERLAY ---
  if (isSearchMode) {
    return (
      <div className="fixed inset-0 bg-white z-[5000] flex flex-col font-['Switzer'] animate-in fade-in duration-200">
        <div className="flex items-center gap-3 py-4 border-b border-gray-100 px-4 bg-white">
          <div className="relative flex-1">
             <input
              ref={searchInputRef}
              autoFocus
              type="text"
              placeholder="Search Safespoon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(searchTerm)}
              className="w-full pl-10 pr-10 py-3 bg-gray-100 border-none rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-slate-900 capitalize tracking-tight outline-none"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
               </svg>
            </div>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
              </button>
            )}
          </div>
          <button onClick={() => { setIsSearchMode(false); setSearchTerm(''); }} className="text-sm font-bold text-slate-500 capitalize tracking-tight">Cancel</button>
        </div>

        <div className="p-6 overflow-y-auto">
          {searchTerm.length === 0 ? (
            <>
              <h3 className="text-xs font-bold text-slate-400 capitalize tracking-tight mb-4">Recent Searches</h3>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term, i) => (
                  <button key={i} onClick={() => handleSearchSubmit(term)} className="px-4 py-2 bg-slate-50 rounded-lg text-sm font-semibold text-slate-600 capitalize tracking-tight hover:bg-slate-100">
                    {term}
                  </button>
                ))}
                {recentSearches.length === 0 && <p className="text-sm text-slate-300 italic">No recent history.</p>}
              </div>
            </>
          ) : (
             <div className="flex flex-col gap-4">
                {filteredItems.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold mt-10">No results found.</p>
                ) : (
                    filteredItems.map(item => <ProductCard key={item.id} item={item} minimal={false} />)
                )}
             </div>
          )}
        </div>
      </div>
    );
  }

  // --- VIEW: SubPage (Vertical List) ---
  if (viewingSubPage) {
    const subItems = groupedItems[viewingSubPage] || [];
    return (
      <div className="flex flex-col h-full bg-white font-['Switzer'] animate-in slide-in-from-right duration-300">
        
        {/* FIX: Match sticky offset to App Header height
            Mobile App Header ~76px -> Set to top-[76px]
            Desktop App Header 80px -> Set to md:top-[80px]
            Added z-40 so it sits under the App Header (z-50) but above content (z-0)
        */}
        <div className="sticky top-[76px] md:top-[80px] z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100 py-4 flex items-center justify-between -mx-4 md:-mx-8 px-4 md:px-8">
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setViewingSubPage(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 transition-colors"
            >
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="text-xl font-bold text-slate-900 capitalize tracking-tight">{viewingSubPage}</h2>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">{subItems.length} items</span>
        </div>
        
        <div className="flex flex-col gap-3 pb-24 pt-4 overflow-y-auto relative z-0">
          {subItems.map(item => <ProductCard key={item.id} item={item} minimal={false} />)}
        </div>
      </div>
    );
  }

  // --- VIEW: Main Feed ---
  return (
    <div className="flex flex-col h-full bg-white font-['Switzer']">
      
      {/* FIX: 
          1. Changed top-[88px] -> top-[76px] md:top-[80px] to match App Header exactly (removing gap).
          2. Used z-40 so it doesn't fight the main header (z-50).
          3. Added bg-white to ensure opacity.
      */}
      <div className="bg-white sticky top-[70px] md:top-[80px] z-40 pb-4 pt-2 shadow-[0_1px_0px_rgba(0,0,0,0.03)] -mx-4 md:-mx-8 px-4 md:px-8">
        <div className="mb-6">
           {/* Fake Search Bar to Trigger Overlay */}
          <div className="relative group">
            <input 
              readOnly
              onFocus={() => setIsSearchMode(true)}
              onClick={() => setIsSearchMode(true)}
              placeholder={`Search ${activeAisle === 'All' ? 'products' : activeAisle.toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-slate-900 font-bold group-hover:border-slate-300 transition-all capitalize tracking-tight cursor-text outline-none"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
               </svg>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {Object.keys(AISLES).map((aisle) => {
            const isActive = activeAisle === aisle;
            const renderIcon = (a) => {
                const style = `w-4 h-4 ${isActive ? 'brightness-0 invert' : 'opacity-40'}`;
                const map = { 'All': storeIcon, 'Dairy': cheeseIcon, 'Meat': steakIcon, 'Pantry': pantryIcon, 'Snacks': candyIcon, 'Drinks': drinkIcon };
                return <img src={map[a]} className={style} alt="" />;
            };
            
            return (
              <button
                key={aisle}
                onClick={() => { setActiveAisle(aisle); setSearchTerm(''); }}
                className={`flex items-center justify-center gap-1.5 px-5 h-10 rounded-full text-[11px] font-bold capitalize tracking-tight transition-all border whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                    : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                }`}
              >
                {renderIcon(aisle)}
                <span>{aisle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW RENDERER */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-2 mt-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"/>
          <span className="font-bold text-xs capitalize tracking-tight">Loading Safespoon...</span>
        </div>
      ) : Object.keys(groupedItems).length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-6">
           <p className="text-slate-900 font-bold mb-1 capitalize tracking-tight">No items found.</p>
        </div>
      ) : (
        /* FIX: Relative Z-0 to force content below the z-40 header */
        <div className="flex flex-col gap-1 pb-24 pt-0 relative z-0">
          {Object.entries(groupedItems).map(([title, items]) => (
            <section key={title} className="flex flex-col">
              {/* ALIGNED HEADER */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-slate-900 capitalize tracking-tight">{title}</h3>
                <button 
                  onClick={() => setViewingSubPage(title)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 capitalize tracking-tight"
                >
                  See All
                </button>
              </div>
              
              {/* Horizontal Scroll */}
              <div className="flex overflow-x-auto gap-3 pb-6 -m-2 p-2 snap-x no-scrollbar">
                {items.slice(0, 5).map((item) => (
                  <div key={item.id} className="snap-start">
                    <ProductCard item={item} minimal={true} />
                  </div>
                ))}
                {items.length > 5 && (
                  <button 
                    onClick={() => setViewingSubPage(title)}
                    className="min-w-[100px] flex flex-col items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 font-bold text-xs hover:bg-slate-100 snap-start capitalize tracking-tight h-[150px]"
                  >
                    <span>+{items.length - 5} more</span>
                  </button>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};