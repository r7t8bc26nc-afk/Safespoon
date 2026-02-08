import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { Helmet } from "react-helmet-async"; 
import { motion, AnimatePresence } from 'framer-motion';
// Ensure this service path matches your project
import { searchRestaurantMenu } from '../services/FoodService';

// --- ICONS ---
import searchIcon from '../icons/search.svg';
import heartIcon from '../icons/heart.svg';
import storeIcon from '../icons/store.svg'; 
import fireIcon from '../icons/fire.svg';       
import clockIcon from '../icons/rotate.svg'; 
import refreshIcon from '../icons/rotate.svg';
import chefIcon from '../icons/hat-chef.svg';
import plusIcon from '../icons/plus-square.svg'; 
import arrowLeftIcon from '../icons/angle-left-small.svg'; 
import checkIcon from '../icons/check-circle.svg'; 
import chartIcon from '../icons/chart-line.svg'; 

// Category Icons
import eggIcon from '../icons/mug-hot.svg'; 
import bowlIcon from '../icons/leaf.svg';   
import burgerIcon from '../icons/steak.svg'; 
import friesIcon from '../icons/candy.svg'; 
import coffeeIcon from '../icons/glass.svg'; 
import cakeIcon from '../icons/candy.svg'; 

// --- CONFIG ---
const CACHE_KEY = 'safespoon_meal_hub_v9'; 
const CACHE_DURATION = 1000 * 60 * 60 * 4; 
const LOGO_DEV_PUBLIC_KEY = 'pk_AnZTwqMTQ1ia9Btg_pILzg'; 

// --- DYNAMIC DATA ---
const POPULAR_CHAINS = [
    "Chipotle", "Starbucks", "Sweetgreen", "Panera Bread", 
    "Chick-fil-A", "Taco Bell", "Subway", "McDonald's"
];

// --- NEUBRUTALIST HELPERS ---
const ColoredIcon = ({ src, colorClass, sizeClass = "w-5 h-5" }) => (
  <div className={`${sizeClass} ${colorClass}`} style={{ 
      WebkitMaskImage: `url("${src}")`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center',
      maskImage: `url("${src}")`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', backgroundColor: 'currentColor' 
  }} />
);

// --- LOGIC HELPERS ---
const getRestaurantType = (name) => {
    const n = name.toLowerCase();
    if (n.includes('coffee') || n.includes('starbucks') || n.includes('dunkin')) return 'Coffee & Tea';
    if (n.includes('burger') || n.includes('mcdonald') || n.includes('shack')) return 'Burgers & Fries';
    if (n.includes('taco') || n.includes('chipotle')) return 'Mexican Grill';
    if (n.includes('salad') || n.includes('sweetgreen')) return 'Fresh Salads';
    if (n.includes('sub') || n.includes('sandwich') || n.includes('panera')) return 'Sandwiches & Soups';
    if (n.includes('chick')) return 'Chicken';
    return 'Fast Casual';
};

const getLogoUrl = (brandName) => {
    if (!brandName) return '';
    const domain = brandName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}&size=200&format=png`;
};

const checkSafety = (item, profile) => {
    if (!profile) return { isSafe: true, issues: [] };
    const restrictions = [...(profile.allergies || []), ...(profile.dietaryPreferences || [])].map(r => r.toLowerCase());
    const text = `${item.name} ${item.description || ''} ${item.ingredients || ''}`.toLowerCase();
    const issues = [];

    // Basic Keyword Matching
    const SAFETY_KEYWORDS = {
        gluten: ['wheat', 'flour', 'bread', 'bun', 'pasta', 'crust', 'soy sauce', 'barley', 'malt', 'rye'],
        dairy: ['milk', 'cheese', 'cream', 'butter', 'yogurt', 'whey', 'casein', 'lactose'],
        nuts: ['peanut', 'almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio', 'macadamia'],
        shellfish: ['shrimp', 'crab', 'lobster', 'prawn', 'oyster', 'clam', 'mussel', 'scallop'],
        vegan: ['meat', 'chicken', 'beef', 'pork', 'fish', 'egg', 'honey', 'dairy', 'cheese', 'milk', 'bacon'],
        vegetarian: ['meat', 'chicken', 'beef', 'pork', 'fish', 'bacon']
    };

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

// --- SUB-COMPONENTS ---

const SafetyBadge = ({ isSafe, issues }) => {
    if (isSafe) {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-black self-start">
                <ColoredIcon src={checkIcon} colorClass="bg-black" sizeClass="w-3 h-3" />
                <span className="text-[10px] font-bold text-black uppercase tracking-wide">Safe Match</span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FF3B30] border-2 border-black self-start">
             <div className="w-3 h-3 bg-white text-black flex items-center justify-center text-[10px] font-bold">!</div>
             <span className="text-[10px] font-bold text-white uppercase tracking-wide">Avoid: {issues[0]}</span>
        </div>
    );
};

const RecipeRow = ({ title, recipes, loading, onRefresh, navigate }) => (
  <section className="mb-10">
      <div className="flex justify-between items-center px-6 mb-4 border-b-4 border-black pb-2 mx-4">
          <h3 className="text-xl font-black uppercase tracking-tighter">{title}</h3>
          {onRefresh && (
            <button onClick={onRefresh} className="p-2 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all">
                <ColoredIcon src={refreshIcon} colorClass={loading ? "bg-black animate-spin" : "bg-black"} sizeClass="w-4 h-4" />
            </button>
          )}
      </div>

      <div className="flex overflow-x-auto gap-4 px-6 no-scrollbar pb-4 min-h-[220px]">
          {loading && recipes.length === 0 ? (
             [1,2,3].map(i => <div key={i} className="shrink-0 w-64 h-48 border-4 border-black bg-gray-100 animate-pulse" />)
          ) : (
            recipes.map(recipe => (
              <div 
                key={recipe.id} 
                onClick={() => navigate(`/recipe/${recipe.id}`)} 
                className="shrink-0 w-64 bg-white border-4 border-black p-0 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
              >
                  <div className="h-32 w-full border-b-4 border-black overflow-hidden relative">
                      <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" loading="lazy" />
                  </div>
                  <div className="p-4">
                      <h4 className="font-black text-sm uppercase leading-tight truncate mb-2">{recipe.name}</h4>
                      <div className="flex gap-2">
                          <span className="text-xs font-bold border-2 border-black px-1.5 py-0.5">{recipe.time || '15 min'}</span>
                          <span className="text-xs font-bold border-2 border-black px-1.5 py-0.5 bg-[#FFD700]">{recipe.calories} kcal</span>
                      </div>
                  </div>
              </div>
          )))}
      </div>
  </section>
);

// --- MEAL PLANNER CARD ---
const MealPlannerCard = ({ onClick }) => (
    <div onClick={onClick} className="mx-6 mb-8 p-6 bg-black border-4 border-black flex items-center justify-between shadow-[6px_6px_0px_0px_rgba(100,100,100,1)] cursor-pointer active:translate-x-1 active:translate-y-1 active:shadow-none">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white border-2 border-white flex items-center justify-center">
                <ColoredIcon src={chartIcon} colorClass="bg-black" sizeClass="w-6 h-6" />
            </div>
            <div>
                <h4 className="text-lg font-black text-white leading-none mb-1 uppercase">Smart Planner</h4>
                <p className="text-xs font-bold text-gray-400 uppercase">Save Money & Prep</p>
            </div>
        </div>
        <div className="w-8 h-8 bg-[#FFD700] border-2 border-black flex items-center justify-center">
             <ColoredIcon src={arrowLeftIcon} colorClass="bg-black rotate-180" sizeClass="w-4 h-4" />
        </div>
    </div>
);

// --- SEARCH OVERLAY ---
const SearchOverlay = ({ isSearching, setIsSearching, searchTerm, setSearchTerm, results, isApiLoading, onSelect, history, onClearHistory }) => {
    const [searchTab, setSearchTab] = useState('kitchen'); 

    const uniqueRestaurantBrands = useMemo(() => {
        if (!results.restaurants || results.restaurants.length === 0) return [];
        const seen = new Set();
        return results.restaurants.reduce((acc, curr) => {
            const brand = curr.brand || curr.restaurantName || curr.name; 
            if (brand && !seen.has(brand)) {
                seen.add(brand);
                acc.push({ 
                    id: curr.id, 
                    name: brand, 
                    brand: brand, 
                    logo: getLogoUrl(brand)
                });
            }
            return acc;
        }, []);
    }, [results.restaurants]);

    return (
        <AnimatePresence>
            {isSearching && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-white flex flex-col font-sans">
                    
                    {/* SEARCH HEADER */}
                    <div className="pt-8 px-5 pb-4 bg-[#FFD700] border-b-4 border-black z-20">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Search</h2>
                            <button onClick={() => { setIsSearching(false); setSearchTerm(''); }} className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center font-bold text-xl hover:bg-black hover:text-white transition-colors">×</button>
                        </div>
                        
                        {/* INPUT */}
                        <div className="relative mb-4">
                            <input 
                                autoFocus 
                                type="text" 
                                placeholder={searchTab === 'kitchen' ? "PASTA, CHICKEN..." : "CHIPOTLE, STARBUCKS..."}
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full h-14 border-4 border-black px-4 font-bold text-lg uppercase outline-none focus:bg-white bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" 
                            />
                        </div>

                        {/* TABS */}
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setSearchTab('kitchen')}
                                className={`px-4 py-2 border-2 border-black font-bold uppercase text-xs transition-all ${searchTab === 'kitchen' ? 'bg-black text-white' : 'bg-white text-black'}`}
                            >
                                Kitchen
                            </button>
                            <button 
                                onClick={() => setSearchTab('restaurants')}
                                className={`px-4 py-2 border-2 border-black font-bold uppercase text-xs transition-all ${searchTab === 'restaurants' ? 'bg-black text-white' : 'bg-white text-black'}`}
                            >
                                Restaurants
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto px-5 py-6 bg-white">
                        {/* HISTORY */}
                        {!searchTerm && (
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-sm font-black uppercase tracking-widest">Recent</h3>
                                    {history.length > 0 && <button onClick={onClearHistory} className="text-xs font-bold underline">Clear</button>}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {history.map((term, i) => (
                                        <button key={i} onClick={() => setSearchTerm(term)} className="px-3 py-1 border-2 border-black text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors">
                                            {term}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* RESTAURANT RESULTS */}
                        {searchTab === 'restaurants' && (
                             <div className="mb-6">
                                {uniqueRestaurantBrands.map(r => (
                                    <div 
                                        key={r.id} 
                                        onClick={() => onSelect(r, 'restaurant_entity')} 
                                        className="flex items-center gap-4 p-4 border-4 border-black mb-3 active:translate-x-1 active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer bg-white"
                                    >
                                        <div className="w-12 h-12 border-2 border-black bg-gray-100 flex items-center justify-center shrink-0">
                                            <img src={r.logo} className="w-8 h-8 object-contain" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/706/706164.png'} alt="logo"/>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-black uppercase text-lg leading-none">{r.name}</h4>
                                            <span className="text-[10px] font-bold bg-[#E0E7FF] border border-black px-2 py-0.5 mt-1 inline-block">VIEW MENU</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* KITCHEN RESULTS */}
                        {searchTab === 'kitchen' && (
                            <div className="space-y-3">
                                {results.recipes.map(r => (
                                    <div key={r.id} onClick={() => onSelect(r, 'recipe')} className="flex items-center gap-4 p-3 border-4 border-black active:translate-x-1 active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer">
                                        <img src={r.image} className="w-12 h-12 border-2 border-black object-cover" alt={r.name} />
                                        <div>
                                            <h4 className="font-bold uppercase text-sm line-clamp-1">{r.name}</h4>
                                            <p className="text-[10px] font-bold uppercase bg-yellow-300 border border-black px-1 w-fit">{r.calories} kcal</p>
                                        </div>
                                    </div>
                                ))}
                                {results.groceries.map(g => (
                                    <div key={g.id} onClick={() => onSelect(g, 'grocery')} className="flex items-center gap-4 p-3 border-4 border-black active:translate-x-1 active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer">
                                        <div className="w-12 h-12 border-2 border-black bg-gray-100 flex items-center justify-center shrink-0"><ColoredIcon src={storeIcon} colorClass="bg-black" /></div>
                                        <div>
                                            <h4 className="font-bold uppercase text-sm">{g.name}</h4>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">{g.brand || 'Generic'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {isApiLoading && <div className="py-8 text-center font-black uppercase">Loading...</div>}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// --- MEAL SELECTION MODAL ---
const MealSelectionModal = ({ item, onClose, onConfirm, userProfile }) => {
    if (!item) return null;
    const { isSafe, issues } = checkSafety(item, userProfile);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[13000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-center mb-6">
                    <h3 className="text-2xl font-black uppercase leading-tight mb-1">Add to Log</h3>
                    <p className="text-sm font-bold text-gray-500 uppercase">{item.name}</p>
                </div>

                {!isSafe && (
                     <div className="mb-6 p-4 bg-[#FF3B30] border-4 border-black text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-white text-red-600 font-black flex items-center justify-center border-2 border-black">!</div>
                            <h4 className="font-black uppercase">Conflict Warning</h4>
                        </div>
                        <p className="text-xs font-bold leading-relaxed">
                            Contains <strong>{issues.join(', ')}</strong>.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                    {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map(meal => (
                        <button 
                            key={meal} 
                            onClick={() => onConfirm(meal, item)}
                            className="py-3 border-4 border-black font-black uppercase text-sm hover:bg-black hover:text-white transition-colors"
                        >
                            {meal}
                        </button>
                    ))}
                </div>
                <button onClick={onClose} className="w-full py-3 font-bold text-xs uppercase text-gray-400 hover:text-black">Cancel</button>
            </motion.div>
        </motion.div>
    );
};

// --- RESTAURANT MENU MODAL ---
const RestaurantMenuModal = ({ restaurantName, items, onClose, userProfile, onItemSelect }) => {
    const safeItems = useMemo(() => items, [items]); 
    const menuTabs = useMemo(() => categorizeMenu(safeItems), [safeItems]);
    const [activeTab, setActiveTab] = useState(menuTabs[0]?.id || 'other');
    const [expandedItemId, setExpandedItemId] = useState(null); 
    const logoUrl = getLogoUrl(restaurantName);

    useEffect(() => { if (menuTabs.length > 0) setActiveTab(menuTabs[0].id); }, [menuTabs]);

    return (
        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 z-[12000] bg-white flex flex-col font-sans">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b-4 border-black bg-[#E0E7FF] sticky top-0 z-10">
                <div className="flex justify-between items-start mb-4">
                     <div className="flex items-center gap-3">
                         <div className="w-12 h-12 border-2 border-black bg-white flex items-center justify-center overflow-hidden">
                            <img src={logoUrl} alt="logo" className="w-full h-full object-contain" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/706/706164.png'} />
                         </div>
                         <div>
                            <h2 className="text-2xl font-black uppercase leading-none">{restaurantName}</h2>
                            <p className="text-xs font-bold uppercase mt-1">Full Menu</p>
                         </div>
                     </div>
                     <button onClick={onClose} className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center font-black text-xl hover:bg-black hover:text-white transition-colors">×</button>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {menuTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`shrink-0 px-4 py-2 border-2 border-black font-bold uppercase text-xs transition-all ${
                                activeTab === tab.id ? 'bg-black text-white' : 'bg-white text-black'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 bg-white">
                <div className="space-y-4 pb-12">
                     {menuTabs.find(t => t.id === activeTab)?.items.map(item => {
                        const { isSafe, issues } = checkSafety(item, userProfile);
                        const isExpanded = expandedItemId === item.id;

                        return (
                            <div 
                                key={item.id} 
                                onClick={() => setExpandedItemId(isExpanded ? null : item.id)} 
                                className={`border-4 border-black p-4 transition-all ${isExpanded ? 'bg-gray-50' : 'bg-white'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="mb-2"><SafetyBadge isSafe={isSafe} issues={issues} /></div>
                                        <h3 className="font-black text-lg uppercase leading-tight">{item.name}</h3>
                                        {!isExpanded && <p className="text-xs font-bold mt-1 bg-yellow-300 border border-black px-1 w-fit">{item.macros?.calories || 0} cal</p>}
                                    </div>
                                    <div className="text-2xl font-black">{isExpanded ? '-' : '+'}</div>
                                </div>

                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t-2 border-black">
                                        <p className="text-xs font-medium mb-4">{item.description}</p>
                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                            <div className="border-2 border-black bg-white p-2 text-center"><span className="block text-[10px] font-bold uppercase">Pro</span><span className="font-black text-sm">{item.macros?.protein || 0}g</span></div>
                                            <div className="border-2 border-black bg-white p-2 text-center"><span className="block text-[10px] font-bold uppercase">Carb</span><span className="font-black text-sm">{item.macros?.carbs || 0}g</span></div>
                                            <div className="border-2 border-black bg-white p-2 text-center"><span className="block text-[10px] font-bold uppercase">Fat</span><span className="font-black text-sm">{item.macros?.fat || 0}g</span></div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onItemSelect(item); }}
                                            className="w-full py-3 bg-black text-white font-black uppercase text-sm border-2 border-black active:bg-white active:text-black transition-colors"
                                        >
                                            Add to Log
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                     })}
                </div>
            </div>
        </motion.div>
    );
};

// --- MAIN COMPONENT ---
export const MealHub = ({ userProfile }) => {
  const navigate = useNavigate();
  // --- STATE DECLARATIONS ---
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestaurantName, setSelectedRestaurantName] = useState(null);
  const [restaurantMenu, setRestaurantMenu] = useState([]);
  const [itemForIntake, setItemForIntake] = useState(null); 
  const [allGroceries, setAllGroceries] = useState([]);
  const [searchResults, setSearchResults] = useState({ recipes: [], groceries: [], restaurants: [] });
  const [isSearchingAPI, setIsSearchingAPI] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
      try { return JSON.parse(localStorage.getItem('safespoon_search_history') || '[]'); } catch { return []; }
  });
  
  // Data Sections State
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [breakfastRecipes, setBreakfastRecipes] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load Groceries (One-time)
  useEffect(() => {
    const q = query(collection(db, "groceries"), orderBy("lastUpdated", "desc"), limit(500));
    return onSnapshot(q, (snapshot) => {
      setAllGroceries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  // Search Logic
  useEffect(() => {
    if (!searchTerm.trim()) { setSearchResults({ recipes: [], groceries: [], restaurants: [] }); return; }
    
    const delay = setTimeout(async () => {
        setIsSearchingAPI(true);
        // Save history
        const newHist = [searchTerm, ...searchHistory.filter(t => t !== searchTerm)].slice(0, 8);
        setSearchHistory(newHist);
        localStorage.setItem('safespoon_search_history', JSON.stringify(newHist));

        const matchedGroceries = allGroceries.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        // Fetch Parallel
        const [recipeResult, restaurantResult] = await Promise.allSettled([
            fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${searchTerm}`).then(r => r.json()).then(d => d.meals || []),
            searchRestaurantMenu(searchTerm).then(r => r.items || [])
        ]);

        const recipes = recipeResult.status === 'fulfilled' ? recipeResult.value.map(m => ({ id: m.idMeal, name: m.strMeal, image: m.strMealThumb, calories: 450 })) : [];
        const restaurants = restaurantResult.status === 'fulfilled' ? restaurantResult.value : [];

        setSearchResults({ recipes: recipes.slice(0, 10), groceries: matchedGroceries, restaurants: restaurants.slice(0, 8) });
        setIsSearchingAPI(false);
    }, 600); 

    return () => clearTimeout(delay);
  }, [searchTerm, allGroceries]);

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
      await updateDoc(doc(db, "users", userProfile.uid), { dailyIntake: arrayUnion(newEntry) });
      setItemForIntake(null); 
  };

  // Initial Load
  const loadAllSections = async () => {
      setIsRefreshing(true);
      try {
        const f = await fetch('https://www.themealdb.com/api/json/v1/1/filter.php?a=American').then(r=>r.json());
        const b = await fetch('https://www.themealdb.com/api/json/v1/1/filter.php?c=Breakfast').then(r=>r.json());
        setFeaturedRecipes(f.meals?.slice(0,6).map(m=>({id:m.idMeal, name:m.strMeal, image:m.strMealThumb, calories:Math.floor(Math.random()*400+400)})) || []);
        setBreakfastRecipes(b.meals?.slice(0,6).map(m=>({id:m.idMeal, name:m.strMeal, image:m.strMealThumb, calories:350})) || []);
      } catch {}
      setIsRefreshing(false);
  };
  
  useEffect(() => { loadAllSections(); }, []);

  return (
    <div className="w-full pb-12 font-sans text-black bg-white min-h-screen">
      <Helmet><title>Meal Hub</title></Helmet>

      {/* MODALS */}
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
        onSelect={(item, type) => {
             if (type === 'restaurant_entity') { handleRestaurantSelect(item.brand); setIsSearching(false); }
             else if (type === 'recipe') navigate(`/recipe/${item.id}`);
             else setItemForIntake(item);
        }}
        history={searchHistory}
        onClearHistory={() => setSearchHistory([])}
      />

      {/* HEADER */}
      <div className="px-6 pt-8 pb-6 bg-[#FFD700] border-b-4 border-black">
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Eat<br/>Something<br/>Good</h1>
          <button onClick={() => setIsSearching(true)} className="w-full h-14 pl-4 pr-4 border-4 border-black font-bold uppercase text-left bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-gray-500 flex items-center justify-between">
              <span>SEARCH RECIPES...</span>
              <ColoredIcon src={searchIcon} colorClass="bg-black" />
          </button>
      </div>

      <div className="pt-8 space-y-2">
          {/* POPULAR CHAINS */}
          <section className="mb-10 pl-6">
               <h3 className="text-xl font-black uppercase tracking-tighter mb-4 pr-6">Popular Chains</h3>
               <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 pr-6">
                  {POPULAR_CHAINS.map((name, i) => (
                      <div 
                        key={i} 
                        onClick={() => handleRestaurantSelect(name)}
                        className="shrink-0 w-28 h-32 bg-white border-4 border-black p-2 flex flex-col items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
                      >
                          <div className="w-12 h-12 border-2 border-black bg-white flex items-center justify-center overflow-hidden">
                            <img src={getLogoUrl(name)} className="w-full h-full object-cover" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/706/706164.png'} alt={name}/>
                          </div>
                          <h4 className="font-bold text-black text-[10px] text-center leading-tight uppercase line-clamp-2">{name}</h4>
                      </div>
                  ))}
              </div>
          </section>

          {/* PLANNER CTA */}
          <MealPlannerCard onClick={() => navigate('/planner')} />

          <RecipeRow 
            title="Chef's Selections" 
            recipes={featuredRecipes} 
            loading={isRefreshing} 
            navigate={navigate} 
            onRefresh={loadAllSections} 
          />
          <RecipeRow 
            title="Morning Momentum" 
            recipes={breakfastRecipes} 
            loading={isRefreshing} 
            navigate={navigate} 
          />
      </div>
    </div>
  );
};