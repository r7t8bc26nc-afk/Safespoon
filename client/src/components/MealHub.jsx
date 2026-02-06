import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { Helmet } from "react-helmet-async"; 
import { motion, AnimatePresence } from 'framer-motion';
// Service for FatSecret (Restaurants)
import { searchRestaurantMenu } from '../services/FoodService';

// --- ICONS ---
import searchIcon from '../icons/search.svg';
import heartIcon from '../icons/heart.svg';
import storeIcon from '../icons/store.svg'; 
import fireIcon from '../icons/fire.svg';       
import clockIcon from '../icons/clock.svg';     
import refreshIcon from '../icons/rotate.svg';
import starIcon from '../icons/sparkle.svg'; 
import chefIcon from '../icons/hat-chef.svg';
import leafIcon from '../icons/leaf.svg';
import plusIcon from '../icons/plus-square.svg'; 
import historyIcon from '../icons/rotate.svg'; // Reuse rotate for history or import a specific one
import arrowRightIcon from '../icons/angle-right.svg'; // You might need to add this or use a generic one

// Category Icons
import eggIcon from '../icons/mug-hot.svg'; 
import bowlIcon from '../icons/leaf.svg';   
import burgerIcon from '../icons/steak.svg'; 
import friesIcon from '../icons/candy.svg'; 
import coffeeIcon from '../icons/glass.svg'; 
import cakeIcon from '../icons/candy.svg'; 

// --- CONFIG ---
const CACHE_KEY = 'safespoon_meal_hub_v1';
const HISTORY_KEY = 'safespoon_search_history';
const LOGO_DEV_PUBLIC_KEY = 'pk_AnZTwqMTQ1ia9Btg_pILzg'; 

// --- DYNAMIC DATA ---
const POPULAR_CHAINS = [
    "Chipotle", "Starbucks", "Sweetgreen", "Panera Bread", 
    "Chick-fil-A", "Taco Bell", "Subway", "McDonald's"
];

// --- HELPERS ---
const getLogoUrl = (brandName) => {
    if (!brandName) return '';
    const domain = brandName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}&size=200&format=png`;
};

const ColoredIcon = ({ src, colorClass, sizeClass = "w-4 h-4" }) => (
  <div className={`${sizeClass} ${colorClass}`} style={{ 
      WebkitMaskImage: `url("${src}")`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center',
      maskImage: `url("${src}")`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', backgroundColor: 'currentColor' 
  }} />
);

// --- SAFETY LOGIC ---
const SAFETY_KEYWORDS = {
    gluten: ['wheat', 'flour', 'bread', 'bun', 'pasta', 'crust', 'soy sauce', 'barley', 'malt', 'rye'],
    dairy: ['milk', 'cheese', 'cream', 'butter', 'yogurt', 'whey', 'casein', 'lactose'],
    nuts: ['peanut', 'almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio', 'macadamia'],
    shellfish: ['shrimp', 'crab', 'lobster', 'prawn', 'oyster', 'clam', 'mussel', 'scallop'],
    vegan: ['meat', 'chicken', 'beef', 'pork', 'fish', 'egg', 'honey', 'dairy', 'cheese', 'milk', 'bacon'],
    vegetarian: ['meat', 'chicken', 'beef', 'pork', 'fish', 'bacon']
};

const checkSafety = (item, profile) => {
    if (!profile) return { isSafe: true, issues: [] };
    const restrictions = [...(profile.allergies || []), ...(profile.dietaryPreferences || [])].map(r => r.toLowerCase());
    const text = `${item.name} ${item.description || ''} ${item.ingredients || ''}`.toLowerCase();
    const issues = [];

    for (const res of restrictions) {
        let key = null;
        if (res.includes('gluten')) key = 'gluten';
        else if (res.includes('dairy') || res.includes('lactose')) key = 'dairy';
        else if (res.includes('nut')) key = 'nuts';
        else if (res.includes('shellfish')) key = 'shellfish';
        else if (res.includes('vegan')) key = 'vegan';
        else if (res.includes('vegetarian')) key = 'vegetarian';
        
        if (key && SAFETY_KEYWORDS[key] && SAFETY_KEYWORDS[key].some(k => text.includes(k))) {
            issues.push(res);
        }
    }
    return { isSafe: issues.length === 0, issues };
};

// --- SMART CATEGORIZATION ---
const categorizeMenu = (items) => {
    const TAXONOMY = [
        { id: 'breakfast', label: 'Breakfast', icon: eggIcon, keywords: ['egg', 'bacon', 'sausage', 'oat', 'muffin', 'croissant', 'bagel', 'pancake', 'waffle', 'breakfast', 'morning'] },
        { id: 'bowls', label: 'Bowls', icon: bowlIcon, keywords: ['bowl', 'salad', 'greens', 'lettuce', 'harvest', 'grain'] },
        { id: 'entrees', label: 'Entrees', icon: burgerIcon, keywords: ['sandwich', 'burger', 'steak', 'chicken', 'beef', 'pork', 'pasta', 'filet', 'salmon', 'plate', 'dinner', 'combo', 'burrito', 'taco', 'wrap'] },
        { id: 'snacks', label: 'Sides', icon: friesIcon, keywords: ['fries', 'chips', 'side', 'soup', 'snack', 'bite', 'nugget', 'wings', 'tots'] },
        { id: 'beverages', label: 'Drinks', icon: coffeeIcon, keywords: ['coffee', 'tea', 'latte', 'drink', 'soda', 'coke', 'pepsi', 'water', 'juice', 'shake', 'smoothie', 'brew', 'espresso', 'mocha'] },
        { id: 'desserts', label: 'Treats', icon: cakeIcon, keywords: ['cake', 'cookie', 'brownie', 'ice cream', 'dessert', 'sweet', 'chocolate', 'donut'] }
    ];

    const categories = {};
    TAXONOMY.forEach(t => categories[t.id] = { label: t.label, icon: t.icon, items: [] });
    categories['other'] = { label: 'General', icon: chefIcon, items: [] };

    items.forEach(item => {
        const text = (item.name + ' ' + (item.description || '')).toLowerCase();
        let matched = false;
        for (const cat of TAXONOMY) {
            if (cat.keywords.some(k => text.includes(k))) {
                categories[cat.id].items.push(item);
                matched = true;
                break; 
            }
        }
        if (!matched) categories['other'].items.push(item);
    });

    return Object.keys(categories)
        .map(key => ({ id: key, ...categories[key] }))
        .filter(cat => cat.items.length > 0);
};

// --- COMPONENTS ---

const CompactUpgradeBanner = () => (
    <div className="mx-6 mb-2 p-4 bg-white rounded-2xl flex items-center justify-between border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100">
                <ColoredIcon src={starIcon} colorClass="text-emerald-600" sizeClass="w-5 h-5" />
            </div>
            <div>
                <h4 className="text-sm font-bold text-slate-900 leading-tight">Safespoon Premium</h4>
                <p className="text-xs font-semibold text-slate-400">Unlock AI recipes</p>
            </div>
        </div>
        <button className="px-5 py-2.5 bg-emerald-600 text-emerald-50 text-xs font-semibold rounded-xl active:scale-95 transition-transform whitespace-nowrap shadow-md shadow-emerald-200">
            Upgrade
        </button>
    </div>
);

const RecipeRow = ({ title, recipes, loading, onRefresh, navigate }) => (
  <section className="mb-10" aria-label={title}>
      <div className="flex justify-between items-end px-6 mb-5">
          <div className="flex items-center gap-3">
             <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
             {onRefresh && (
                <button onClick={onRefresh} className="h-6 w-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors active:rotate-180 duration-500">
                    <div className={loading ? 'animate-spin' : ''}>
                        <ColoredIcon src={refreshIcon} colorClass="bg-current" sizeClass="w-3 h-3" />
                    </div>
                </button>
             )}
          </div>
          <button className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors">See All</button>
      </div>

      <div className="flex overflow-x-auto gap-4 px-6 no-scrollbar pb-4 min-h-[220px]">
          {loading && recipes.length === 0 ? (
             [1,2,3].map(i => <div key={i} className="shrink-0 w-72 h-48 bg-slate-50 border border-slate-100 rounded-[2rem] animate-pulse" />)
          ) : (
            recipes.map(recipe => (
              <article 
                key={recipe.id} 
                onClick={() => navigate(`/recipe/${recipe.id}`)} 
                className="shrink-0 w-72 group cursor-pointer active:scale-95 transition-transform"
              >
                  <div className="relative h-48 w-full rounded-[2rem] overflow-hidden mb-3 shadow-sm border border-slate-100 bg-slate-100">
                      <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover transition-opacity duration-300" loading="lazy" />
                      <div className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
                          <ColoredIcon src={heartIcon} colorClass="bg-slate-900" sizeClass="w-3.5 h-3.5" />
                      </div>
                  </div>
                  <h4 className="px-1 font-bold text-slate-900 text-sm leading-tight truncate">{recipe.name}</h4>
                  <div className="px-1 flex gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                          <ColoredIcon src={clockIcon} colorClass="bg-slate-400" sizeClass="w-3 h-3" />
                          <span className="text-xs font-semibold text-slate-400">{recipe.time || '15 min'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                          <ColoredIcon src={fireIcon} colorClass="bg-slate-400" sizeClass="w-3 h-3" />
                          <span className="text-xs font-semibold text-slate-400">{recipe.calories} kcal</span>
                      </div>
                  </div>
              </article>
          )))}
      </div>
  </section>
);

// --- SEARCH OVERLAY (UPDATED) ---
const SearchOverlay = ({ isSearching, setIsSearching, searchTerm, setSearchTerm, results, isApiLoading, onSelect, history, onClearHistory }) => {
    return (
        <AnimatePresence>
            {isSearching && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="fixed inset-0 z-[9999] bg-white flex flex-col font-['Switzer']">
                    <div className="pt-14 px-5 pb-4 bg-white border-b border-slate-50">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Kitchen Search</h2>
                            <button onClick={() => { setIsSearching(false); setSearchTerm(''); }} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">✕</button>
                        </div>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><ColoredIcon src={searchIcon} colorClass="bg-current" sizeClass="w-4 h-4" /></div>
                            <input autoFocus type="text" placeholder="Recipes, restaurants, ingredients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-10 bg-slate-100 rounded-xl pl-10 pr-4 font-medium text-slate-700 outline-none text-sm" />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto px-5 py-4">
                        {/* SEARCH HISTORY & EMPTY STATE */}
                        {!searchTerm && (
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-3 pl-1">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent</h3>
                                    {history.length > 0 && <button onClick={onClearHistory} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600">Clear</button>}
                                </div>
                                {history.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {history.map((term, i) => (
                                            <button key={i} onClick={() => setSearchTerm(term)} className="px-4 py-2 bg-slate-50 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                                                {term}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 pl-1 italic">No recent searches</p>
                                )}
                            </div>
                        )}

                        {/* RESULTS: RESTAURANTS (FATSECRET) */}
                        {results.restaurants.length > 0 && (
                             <div className="mb-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Restaurants</h3>
                                <div className="space-y-3">
                                    {results.restaurants.map(r => (
                                        <article key={r.id} onClick={() => onSelect(r, 'restaurant')} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl active:bg-slate-100 transition-colors cursor-pointer">
                                            <div className="w-14 h-14 rounded-xl bg-white border border-slate-100 flex items-center justify-center">
                                                <img src={getLogoUrl(r.brand)} className="w-8 h-8 object-contain" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/706/706164.png'} alt="logo"/>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">{r.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{r.brand}</p>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* RESULTS: RECIPES (THEMEALDB) */}
                        {(results.recipes.length > 0 || isApiLoading) && (
                            <div className="mb-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Recipes</h3>
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
                                    {isApiLoading && <div className="py-4 text-center"><div className="inline-block w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>}
                                </div>
                            </div>
                        )}

                         {/* RESULTS: LOCAL (PANTRY) */}
                         {results.groceries.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Pantry</h3>
                                <div className="space-y-3">
                                    {results.groceries.map(g => (
                                        <article key={g.id} onClick={() => onSelect(g, 'grocery')} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl active:bg-slate-100 transition-colors cursor-pointer">
                                            <div className="w-14 h-14 rounded-xl bg-white border border-slate-100 flex items-center justify-center"><ColoredIcon src={storeIcon} colorClass="bg-slate-300" sizeClass="w-6 h-6" /></div>
                                            <div><h4 className="font-bold text-slate-900 text-sm">{g.name}</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{g.brand || 'Generic'}</p></div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// --- MEAL SELECTION MODAL (INTAKE) - NO EMOJIS ---
const MealSelectionModal = ({ item, onClose, onConfirm, userProfile }) => {
    if (!item) return null;
    const { isSafe, issues } = checkSafety(item, userProfile);

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[13000] bg-slate-900/60 backdrop-blur-sm flex items-end justify-center sm:items-center p-4 font-['Switzer']"
        >
            <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
                className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 relative shadow-2xl overflow-hidden"
            >
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-inner border border-slate-100">
                         {/* REPLACED EMOJI WITH ICON */}
                         <ColoredIcon src={chefIcon} colorClass="bg-slate-900" sizeClass="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight mb-1">Add to Intake</h3>
                    <p className="text-sm font-medium text-slate-400">{item.name}</p>
                </div>

                {!isSafe && (
                     <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-xs mt-0.5">!</div>
                        <div>
                            <h4 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">Safety Warning</h4>
                            <p className="text-xs text-red-600 leading-relaxed">
                                Contains <strong>{issues.join(', ')}</strong> which conflicts with your profile.
                            </p>
                        </div>
                    </div>
                )}

                {item.ingredients && (
                    <div className="mb-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ingredients</p>
                        <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                            {item.ingredients}
                        </p>
                    </div>
                )}

                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Select Meal Segment</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map(meal => (
                        <button 
                            key={meal} 
                            onClick={() => onConfirm(meal, item)}
                            className="py-4 rounded-xl border border-slate-100 bg-slate-50 font-bold text-sm text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-95"
                        >
                            {meal}
                        </button>
                    ))}
                </div>
                <button onClick={onClose} className="w-full py-4 font-bold text-xs uppercase tracking-widest text-slate-400">Cancel</button>
            </motion.div>
        </motion.div>
    );
};

// --- RESTAURANT MODAL (BROWSING) ---
const RestaurantMenuModal = ({ restaurantName, items, onClose, userProfile, onItemSelect }) => {
    const safeItems = useMemo(() => items, [items]); 
    const menuTabs = useMemo(() => categorizeMenu(safeItems), [safeItems]);
    const [activeTab, setActiveTab] = useState(menuTabs[0]?.id || 'other');
    const logoUrl = getLogoUrl(restaurantName);

    useEffect(() => {
        if (menuTabs.length > 0) setActiveTab(menuTabs[0].id);
    }, [menuTabs]);

    return (
        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed inset-0 z-[12000] bg-white flex flex-col font-['Switzer']">
            {/* Header */}
            <div className="px-6 pt-14 pb-2 border-b border-slate-50 bg-white/95 backdrop-blur-sm z-10 sticky top-0 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={onClose} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-900 font-bold active:bg-slate-200 transition-colors">✕</button>
                    <div className="flex flex-col items-end">
                         <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">{restaurantName}</h2>
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-100 shadow-sm">
                                <img src={logoUrl} alt="logo" className="w-full h-full object-contain bg-white" />
                            </div>
                         </div>
                        {userProfile?.dietaryPreferences && userProfile.dietaryPreferences.length > 0 ? (
                            <div className="flex items-center justify-end gap-1">
                                <ColoredIcon src={leafIcon} colorClass="text-emerald-500" sizeClass="w-3 h-3" />
                                <span className="text-xs font-semibold text-emerald-600">
                                    Safe for {userProfile.dietaryPreferences[0]}
                                </span>
                            </div>
                        ) : (
                             <p className="text-xs font-semibold text-slate-400">{safeItems.length} items found</p>
                        )}
                    </div>
                </div>
                
                {/* Scrollable Tabs */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {menuTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`shrink-0 pl-3 pr-4 py-2.5 rounded-full flex items-center gap-2 transition-all border ${
                                activeTab === tab.id 
                                ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200' 
                                : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <ColoredIcon src={tab.icon} colorClass={activeTab === tab.id ? 'bg-white' : 'bg-slate-400'} sizeClass="w-4 h-4" />
                            <span className="text-xs font-semibold capitalize">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu List */}
            <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50">
                {(!menuTabs || menuTabs.length === 0) ? (
                    <div className="text-center py-20 opacity-40">
                        <p className="text-xs font-semibold text-slate-400">No items available</p>
                    </div>
                ) : (
                    <div className="space-y-4 pb-12">
                         {menuTabs.find(t => t.id === activeTab)?.items.map(item => {
                            const { isSafe } = checkSafety(item, userProfile);
                            return (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }} 
                                    whileInView={{ opacity: 1, y: 0 }} 
                                    viewport={{ once: true }}
                                    key={item.id} 
                                    className={`bg-white p-5 rounded-3xl border shadow-sm flex flex-col gap-2 group active:scale-[0.98] transition-transform relative overflow-hidden ${isSafe ? 'border-slate-100' : 'border-red-100 bg-red-50/10'}`}
                                >
                                    <div className="flex justify-between items-start z-10">
                                        <h3 className="font-bold text-slate-900 text-lg leading-tight w-3/4">{item.name}</h3>
                                        <button 
                                            onClick={() => onItemSelect(item)}
                                            className="shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                                        >
                                            <ColoredIcon src={plusIcon} colorClass="bg-white" sizeClass="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2 w-5/6 z-10">
                                        {item.description ? item.description.replace(/\|/g, ' • ') : 'No description available.'}
                                    </p>

                                    {(item.macros?.protein > 0 || item.macros?.carbs > 0) && (
                                        <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-50 opacity-80 group-hover:opacity-100 transition-opacity z-10">
                                            <div className="text-center"><span className="block text-xs text-slate-400 font-semibold mb-0.5">Pro</span><span className="font-bold text-slate-900">{item.macros?.protein || 0}g</span></div>
                                            <div className="text-center"><span className="block text-xs text-slate-400 font-semibold mb-0.5">Carb</span><span className="font-bold text-slate-900">{item.macros?.carbs || 0}g</span></div>
                                            <div className="text-center"><span className="block text-xs text-slate-400 font-semibold mb-0.5">Cal</span><span className="font-bold text-slate-900">{item.macros?.calories || 0}</span></div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                         })}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export const MealHub = ({ userProfile, onOpenMenu }) => {
  const navigate = useNavigate();
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestaurantName, setSelectedRestaurantName] = useState(null);
  const [restaurantMenu, setRestaurantMenu] = useState([]);
  const [itemForIntake, setItemForIntake] = useState(null); 
  const [allGroceries, setAllGroceries] = useState([]);
  const [searchResults, setSearchResults] = useState({ recipes: [], groceries: [], restaurants: [] });
  const [isSearchingAPI, setIsSearchingAPI] = useState(false);
  
  // Search History State
  const [searchHistory, setSearchHistory] = useState(() => {
      try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  });

  const addToHistory = (term) => {
      if (!term) return;
      const updated = [term, ...searchHistory.filter(t => t !== term)].slice(0, 8); // Keep top 8
      setSearchHistory(updated);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  useEffect(() => {
    const q = query(collection(db, "groceries"), orderBy("lastUpdated", "desc"), limit(500));
    return onSnapshot(q, (snapshot) => {
      setAllGroceries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  // --- RESTORED & UPGRADED SEARCH EFFECT (INCLUDES FATSECRET) ---
  useEffect(() => {
    if (!searchTerm.trim()) return;
    const delay = setTimeout(async () => {
        setIsSearchingAPI(true);
        const term = searchTerm.toLowerCase();

        // 1. Local Filter
        const matchedGroceries = allGroceries.filter(item => item.name?.toLowerCase().includes(term));
        
        let matchedRecipes = [];
        let matchedRestaurants = [];

        try {
            // 2. Parallel API Calls (MealDB + FatSecret via Backend)
            const [recipeRes, restaurantRes] = await Promise.all([
                fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${searchTerm}`),
                searchRestaurantMenu(searchTerm) // Queries your backend -> FatSecret
            ]);

            const recipeData = await recipeRes.json();
            
            if (recipeData.meals) {
                matchedRecipes = recipeData.meals.map(m => ({ 
                    id: m.idMeal, 
                    name: m.strMeal, 
                    image: m.strMealThumb, 
                    calories: 450 // Estimate as MealDB provides none
                })).slice(0, 10);
            }

            // 3. Process Restaurant Results
            if (restaurantRes.items) {
                matchedRestaurants = restaurantRes.items.slice(0, 8); // Limit to top 8
            }

        } catch (e) { console.error("Search Error", e); }
        
        setSearchResults({ 
            recipes: matchedRecipes, 
            groceries: matchedGroceries, 
            restaurants: matchedRestaurants // Now includes FatSecret data
        });
        setIsSearchingAPI(false);
    }, 500); // 500ms debounce
    return () => clearTimeout(delay);
  }, [searchTerm, allGroceries]);

  // Load Data
  const getInitialState = (key, val) => {
      try { return JSON.parse(localStorage.getItem(CACHE_KEY))?.data?.[key] || val; } catch { return val; }
  };
  const [featuredRecipes] = useState(() => getInitialState('featured', []));
  const [breakfastRecipes] = useState(() => getInitialState('breakfast', []));
  const [goalRecipes] = useState(() => getInitialState('goalRecipes', []));
  const [isRefreshing] = useState(false); 

  const handleRestaurantSelect = async (name) => {
      setSelectedRestaurantName(name); 
      try {
          const res = await searchRestaurantMenu(name);
          setRestaurantMenu(res.items || []);
      } catch (e) { console.error(e); } 
  };

  const handleAddToLog = async (mealSegment, item) => {
      if (!userProfile?.uid || !item) return;
      
      const newEntry = {
          name: item.name,
          brand: selectedRestaurantName || item.brand || "Recipe",
          calories: { amount: item.macros?.calories || 0 },
          protein: { amount: item.macros?.protein || 0 },
          carbs: { amount: item.macros?.carbs || 0 },
          fat: { amount: item.macros?.fat || 0 },
          portion: 1,
          meal: mealSegment,
          timestamp: new Date().toISOString()
      };

      try {
          await updateDoc(doc(db, "users", userProfile.uid), { dailyIntake: arrayUnion(newEntry) });
          setItemForIntake(null); 
      } catch (e) {
          console.error("Failed to log food", e);
      }
  };

  const handleSearchResultClick = (item, type) => {
      addToHistory(searchTerm); // Save to history on click
      if (type === 'recipe') {
          navigate(`/recipe/${item.id}`);
      } else if (type === 'restaurant') {
          // If searching generic food (e.g., "Burger"), show it in intake modal
          // If searching a place (e.g., "Starbucks"), likely want to see menu (handled if logic existed, for now treating as item)
          setItemForIntake({ ...item, brand: item.brand || 'Restaurant' });
      } else {
          setItemForIntake(item);
      }
  };

  return (
    <main className="w-full pb-6 font-['Switzer'] bg-gray-50 min-h-screen text-slate-900">
      <Helmet><title>Meal Hub</title></Helmet>

      {/* --- RESTAURANT MODAL (BROWSING) --- */}
      <AnimatePresence>
        {selectedRestaurantName && (
            <RestaurantMenuModal 
                restaurantName={selectedRestaurantName}
                items={restaurantMenu}
                userProfile={userProfile}
                onClose={() => { setSelectedRestaurantName(null); setRestaurantMenu([]); }}
                onItemSelect={(item) => setItemForIntake(item)} 
            />
        )}
      </AnimatePresence>

      {/* --- ADD TO INTAKE MODAL --- */}
      <AnimatePresence>
        {itemForIntake && (
            <MealSelectionModal 
                item={itemForIntake} 
                userProfile={userProfile}
                onClose={() => setItemForIntake(null)}
                onConfirm={handleAddToLog}
            />
        )}
      </AnimatePresence>

      <SearchOverlay 
        isSearching={isSearching} setIsSearching={setIsSearching}
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        results={searchResults} isApiLoading={isSearchingAPI}
        onSelect={handleSearchResultClick}
        history={searchHistory}
        onClearHistory={() => { setSearchHistory([]); localStorage.removeItem(HISTORY_KEY); }}
      />

      <header className="pt-8 pb-2 px-6">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Smart Nutrition & Meal Planner</p>
          <h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">
              Discover Your Next<br/>Healthy Meal
          </h1>
      </header>

      <div className="px-6 mb-10 mt-6">
          <button onClick={() => setIsSearching(true)} className="w-full h-12 bg-white border border-slate-100 shadow-sm rounded-xl flex items-center px-4 active:scale-[0.99] transition-all">
              <div className="text-slate-400 mr-3"><ColoredIcon src={searchIcon} colorClass="bg-current" sizeClass="w-4 h-4" /></div>
              <span className="text-sm font-medium text-slate-400">Search recipes, restaurants...</span>
          </button>
      </div>

      {/* --- POLISHED RESTAURANT ROW --- */}
      <section className="mb-10 pl-6">
           <div className="flex justify-between items-end pr-6 mb-5">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Popular Restaurants</h3>
              <button className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors">See All</button>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 pr-6">
              {POPULAR_CHAINS.map((name, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleRestaurantSelect(name)}
                    className="shrink-0 w-28 h-32 bg-white rounded-[2rem] border border-slate-100 p-2 flex flex-col items-center justify-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)] active:scale-95 transition-transform group relative overflow-hidden"
                  >
                      <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center shadow-inner border border-slate-100 group-hover:scale-110 transition-transform duration-300 relative z-10 overflow-hidden">
                        <img 
                            src={getLogoUrl(name)} 
                            className="w-full h-full object-cover" 
                            alt={name} 
                            onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/706/706164.png'}
                        />
                      </div>
                      <h4 className="font-bold text-slate-900 text-[10px] text-center leading-tight line-clamp-2 z-10">{name}</h4>
                  </button>
              ))}
          </div>
      </section>

      {/* FIXED: RECIPE CLICKS NAVIGATE */}
      <RecipeRow title="Chef's Selections" recipes={featuredRecipes} loading={isRefreshing} navigate={navigate} onRefresh={() => {}} />
      <RecipeRow title="Morning Momentum" recipes={breakfastRecipes} loading={isRefreshing} navigate={navigate} />
      <RecipeRow title="Your Goals" recipes={goalRecipes} loading={isRefreshing} navigate={navigate} />

      <CompactUpgradeBanner />
    </main>
  );
};