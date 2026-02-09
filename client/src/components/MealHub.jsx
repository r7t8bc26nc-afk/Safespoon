import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom'; 
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { Helmet } from "react-helmet-async"; 
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
// CORRECTED IMPORT PER YOUR REQUEST
import { searchRestaurantMenu } from '../services/FoodService';

// --- ICONS ---
import searchIcon from '../icons/search.svg';
import checkIcon from '../icons/check-circle.svg'; 
import refreshIcon from '../icons/rotate.svg';
import chartIcon from '../icons/chart-line.svg'; 
import scannerIcon from '../icons/scanner.svg';
import storeIcon from '../icons/store.svg';

// Category Icons
import eggIcon from '../icons/mug-hot.svg'; 
import bowlIcon from '../icons/leaf.svg';   
import burgerIcon from '../icons/steak.svg'; 
import friesIcon from '../icons/candy.svg'; 
import coffeeIcon from '../icons/glass.svg'; 
import cakeIcon from '../icons/candy.svg'; 
import chefIcon from '../icons/hat-chef.svg';

// --- CONFIG ---
const LOGO_DEV_PUBLIC_KEY = 'pk_AnZTwqMTQ1ia9Btg_pILzg'; 
const USDA_API_KEY = '47ccOoSTZvhVDw3YpNh4nGCwSbLs98XOJufWOcY7';

// --- DYNAMIC DATA ---
const POPULAR_CHAINS = [
    "Chipotle", "Starbucks", "Sweetgreen", "Panera Bread", 
    "Chick-fil-A", "Taco Bell", "Subway", "McDonald's"
];

// --- HELPERS ---
const ColoredIcon = ({ src, colorClass, sizeClass = "w-5 h-5" }) => (
  <div className={`${sizeClass} ${colorClass}`} style={{ 
      WebkitMaskImage: `url("${src}")`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center',
      maskImage: `url("${src}")`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', backgroundColor: 'currentColor' 
  }} />
);

const getLogoUrl = (brandName) => {
    if (!brandName) return '';
    const domain = brandName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}&size=200&format=png`;
};

const ModalPortal = ({ children }) => {
    if (typeof document === 'undefined') return null;
    return ReactDOM.createPortal(children, document.body);
};

// --- LOGIC: SAFETY CHECK ---
const checkSafety = (item, profile) => {
    if (!profile) return { isSafe: true, issues: [] };
    
    const restrictions = [
        ...(profile.allergies || []), 
        ...(profile.dietaryPreferences || []),
        ...(profile.restrictions || []) 
    ].map(r => r.toLowerCase());
    
    const text = `${item.name} ${item.description || ''} ${item.ingredients || ''}`.toLowerCase();
    const issues = [];

    const SAFETY_KEYWORDS = {
        gluten: ['wheat', 'flour', 'bread', 'bun', 'pasta', 'crust', 'soy sauce', 'barley', 'malt', 'rye'],
        dairy: ['milk', 'cheese', 'cream', 'butter', 'yogurt', 'whey', 'casein', 'lactose'],
        nuts: ['peanut', 'almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio', 'macadamia'],
        shellfish: ['shrimp', 'crab', 'lobster', 'prawn', 'oyster', 'clam', 'mussel', 'scallop'],
        vegan: ['meat', 'chicken', 'beef', 'pork', 'fish', 'egg', 'honey', 'dairy', 'cheese', 'milk', 'bacon', 'lard'],
        vegetarian: ['meat', 'chicken', 'beef', 'pork', 'fish', 'bacon', 'lard'],
        pork: ['pork', 'bacon', 'ham', 'sausage', 'pepperoni', 'chorizo'],
        soy: ['soy', 'tofu', 'edamame', 'miso', 'tempeh']
    };

    for (const res of restrictions) {
        let key = null;
        if (res.includes('gluten')) key = 'gluten';
        else if (res.includes('dairy') || res.includes('lactose')) key = 'dairy';
        else if (res.includes('nut')) key = 'nuts';
        else if (res.includes('shellfish')) key = 'shellfish';
        else if (res.includes('vegan')) key = 'vegan';
        else if (res.includes('vegetarian')) key = 'vegetarian';
        else if (res.includes('pork') || res.includes('halal') || res.includes('kosher')) key = 'pork'; 
        else if (res.includes('soy')) key = 'soy';
        
        if (key && SAFETY_KEYWORDS[key] && SAFETY_KEYWORDS[key].some(k => text.includes(k))) {
            issues.push(res);
        }
    }
    return { isSafe: issues.length === 0, issues };
};

// --- LOGIC: CATEGORIZATION ---
const categorizeMenu = (items) => {
    const TAXONOMY = [
        { id: 'breakfast', label: 'Breakfast', icon: eggIcon, keywords: ['egg', 'bacon', 'sausage', 'oat', 'muffin', 'croissant', 'bagel', 'pancake', 'waffle', 'breakfast', 'morning'] },
        { id: 'bowls', label: 'Bowls', icon: bowlIcon, keywords: ['bowl', 'salad', 'greens', 'lettuce', 'harvest', 'grain', 'rice'] },
        { id: 'entrees', label: 'Entrees', icon: burgerIcon, keywords: ['sandwich', 'burger', 'steak', 'chicken', 'beef', 'pork', 'pasta', 'filet', 'salmon', 'plate', 'dinner', 'combo', 'burrito', 'taco', 'wrap', 'pizza'] },
        { id: 'snacks', label: 'Sides', icon: friesIcon, keywords: ['fries', 'chips', 'side', 'soup', 'snack', 'bite', 'nugget', 'wings', 'tots'] },
        { id: 'beverages', label: 'Drinks', icon: coffeeIcon, keywords: ['coffee', 'tea', 'latte', 'drink', 'soda', 'coke', 'pepsi', 'water', 'juice', 'shake', 'smoothie', 'brew', 'espresso', 'mocha'] },
        { id: 'desserts', label: 'Treats', icon: cakeIcon, keywords: ['cake', 'cookie', 'brownie', 'ice cream', 'dessert', 'sweet', 'chocolate', 'donut', 'pie'] }
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

const SafetyBadge = ({ isSafe, issues }) => (
    isSafe ? (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white border-2 border-black self-start mb-2">
            <ColoredIcon src={checkIcon} colorClass="bg-black" sizeClass="w-3 h-3" />
            <span className="text-[10px] font-bold text-black uppercase tracking-wide">Safe</span>
        </div>
    ) : (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#FF3B30] border-2 border-black self-start text-white mb-2">
             <span className="text-[10px] font-bold uppercase tracking-wide">Avoid: {issues[0]}</span>
        </div>
    )
);

const RecipeRow = ({ title, recipes, loading, onRefresh, navigate }) => (
  <section className="flex flex-col gap-4 mb-8">
      {/* Header aligned with content */}
      <div className="flex justify-between items-end border-b-4 border-black pb-2 mx-4">
          <h3 className="text-lg font-black uppercase tracking-widest">{title}</h3>
          {onRefresh && (
            <button onClick={onRefresh} className="p-1 hover:bg-gray-100 transition-colors">
                <ColoredIcon src={refreshIcon} colorClass="bg-black" sizeClass="w-4 h-4" />
            </button>
          )}
      </div>

      {/* Full Bleed Scroll Container */}
      <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar">
          {loading && recipes.length === 0 ? (
             [1,2,3].map(i => <div key={i} className="shrink-0 w-64 h-48 border-4 border-black bg-gray-100 animate-pulse" />)
          ) : (
            recipes.map(recipe => (
              <div 
                key={recipe.id} 
                onClick={() => navigate(`/recipe/${recipe.id}`)} 
                className="shrink-0 w-64 bg-white border-4 border-black p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
              >
                  <div className="h-32 w-full border-b-4 border-black relative">
                      <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" loading="lazy" />
                  </div>
                  <div className="p-4">
                      <h4 className="font-black text-sm uppercase leading-tight truncate mb-2">{recipe.name}</h4>
                      <div className="flex gap-2">
                          <span className="text-[10px] font-bold border-2 border-black px-1.5 py-0.5 uppercase">{recipe.time || '15 min'}</span>
                          <span className="text-[10px] font-bold border-2 border-black px-1.5 py-0.5 bg-[#FFD700]">{recipe.calories} kcal</span>
                      </div>
                  </div>
              </div>
          )))}
      </div>
  </section>
);

// --- SEARCH OVERLAY ---
const SearchOverlay = ({ isSearching, setIsSearching, searchQuery, setSearchQuery, isApiLoading, suggestions, onSelect, history, onClearHistory }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [searchTab, setSearchTab] = useState('all'); 

    // Barcode Scanner Logic
    const BarcodeScanner = ({ onResult, onClose }) => {
        const scannerId = "safespoon-barcode-reader-hub";
        const scannerRef = useRef(null);
        useEffect(() => {
            const timer = setTimeout(() => {
                if (scannerRef.current) return;
                const html5QrCode = new Html5Qrcode(scannerId);
                scannerRef.current = html5QrCode;
                html5QrCode.start({ facingMode: "environment" }, { fps: 20, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 }, 
                    (decodedText) => { if (navigator.vibrate) navigator.vibrate(200); html5QrCode.stop().then(() => { scannerRef.current = null; onResult(decodedText); }); }, () => {}
                ).catch(err => console.error(err));
            }, 300);
            return () => { clearTimeout(timer); if (scannerRef.current?.isScanning) scannerRef.current.stop(); };
        }, [onResult]);
        return (
            <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center">
                <div id={scannerId} className="w-full h-full object-cover" />
                <button onClick={onClose} className="absolute bottom-10 bg-white border-4 border-black px-6 py-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Cancel</button>
            </div>
        );
    };

    return (
      <ModalPortal>
        <AnimatePresence>
            {isSearching && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-white flex flex-col font-sans text-black">
                {isScanning ? (
                    <BarcodeScanner onResult={(barcode) => { setSearchQuery(barcode); setIsScanning(false); }} onClose={() => setIsScanning(false)} />
                ) : (
                    <>
                        {/* Search Header - PADDING ADJUSTED FOR BRUTALIST FILL */}
                        <div className="pt-safe-top px-4 pb-4 bg-white border-b-4 border-black flex flex-col gap-3 mt-4">
                            <div className="flex gap-3 items-center">
                                <div className="flex-1 relative">
                                    {/* Input Style Update:
                                        1. Added [&::-webkit-search-cancel-button]:hidden to remove native X
                                        2. Adjusted padding right to make room for new brutalist scan button
                                    */}
                                    <input 
                                        autoFocus 
                                        type="search" 
                                        placeholder="SEARCH FOOD OR RESTAURANTS..." 
                                        value={searchQuery} 
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                        className="w-full h-14 border-4 border-black pl-4 pr-14 font-black text-xl uppercase placeholder:text-gray-300 outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all [&::-webkit-search-cancel-button]:hidden" 
                                    />
                                    {/* BRUTALIST SCAN BUTTON */}
                                    <button 
                                        onClick={() => setIsScanning(true)} 
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-[#FFD700] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[-40%] transition-all"
                                    >
                                        <ColoredIcon src={scannerIcon} colorClass="bg-black" sizeClass="w-5 h-5" />
                                    </button>
                                </div>
                                <button 
                                    onClick={() => { setIsSearching(false); setSearchQuery(''); }} 
                                    className="w-14 h-14 bg-[#FF5252] border-4 border-black flex items-center justify-center text-white font-black text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            {/* Filter Tabs */}
                            <div className="flex gap-2">
                                <button onClick={() => setSearchTab('all')} className={`px-3 py-1 border-2 border-black text-xs font-black uppercase ${searchTab === 'all' ? 'bg-black text-white' : 'bg-white'}`}>All</button>
                                <button onClick={() => setSearchTab('restaurant')} className={`px-3 py-1 border-2 border-black text-xs font-black uppercase ${searchTab === 'restaurant' ? 'bg-black text-white' : 'bg-white'}`}>Restaurants</button>
                                <button onClick={() => setSearchTab('grocery')} className={`px-3 py-1 border-2 border-black text-xs font-black uppercase ${searchTab === 'grocery' ? 'bg-black text-white' : 'bg-white'}`}>Grocery</button>
                            </div>
                        </div>

                        {/* Search Results */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
                            {/* History */}
                            {!searchQuery && history && history.length > 0 && (
                                <div className="mb-6">
                                    <div className="flex justify-between mb-2">
                                        <h4 className="font-black uppercase text-xs tracking-widest text-gray-500">Recent</h4>
                                        <button onClick={onClearHistory} className="text-xs font-bold underline">Clear</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {history.map((term, i) => (
                                            <button key={i} onClick={() => setSearchQuery(term)} className="px-3 py-2 bg-white border-2 border-black font-bold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1">{term}</button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 pb-24">
                                {suggestions
                                    .filter(item => searchTab === 'all' || (searchTab === 'restaurant' && item.isRestaurant) || (searchTab === 'grocery' && !item.isRestaurant))
                                    .map((res) => (
                                    <button 
                                        key={res.fdcId} 
                                        onClick={() => onSelect(res)} 
                                        className="w-full flex items-center gap-4 p-4 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all text-left"
                                    >
                                        <div className="h-12 w-12 border-2 border-black flex items-center justify-center bg-gray-100 p-1 overflow-hidden">
                                            {res.isRestaurant ? (
                                                <img src={res.logo} alt="" className="w-full h-full object-contain grayscale" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/706/706164.png'} />
                                            ) : (
                                                <ColoredIcon src={storeIcon} colorClass="bg-black" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-black text-lg leading-tight uppercase">{res.name}</h4>
                                                {res.isRestaurant && <span className="bg-[#10B981] text-white text-[9px] font-black uppercase px-2 py-0.5 border border-black">Verified</span>}
                                            </div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">{res.brand}</p>
                                        </div>
                                        <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-black text-xl">+</div>
                                    </button>
                                ))}
                                {isApiLoading && <div className="text-center py-10 font-black uppercase animate-pulse">Searching Database...</div>}
                                {!isApiLoading && searchQuery.length >= 3 && suggestions.length === 0 && <div className="text-center py-20 opacity-40 font-black uppercase">No Results Found</div>}
                            </div>
                        </div>
                    </>
                )}
            </motion.div>
            )}
        </AnimatePresence>
      </ModalPortal>
    );
};

// --- MODALS ---

const MealSelectionModal = ({ item, onClose, onConfirm, userProfile }) => {
    if (!item) return null;
    const { isSafe, issues } = checkSafety(item, userProfile);

    return (
        <div className="fixed inset-0 z-[13000] bg-black/80 flex items-center justify-center p-4 font-sans text-black backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white border-4 border-black p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_#FFFFFF]">
                <div className="text-center mb-6">
                    <h3 className="text-2xl font-black uppercase leading-tight mb-1">Add to Log</h3>
                    <p className="text-sm font-bold text-gray-500 uppercase">{item.name}</p>
                </div>

                {!isSafe && (
                     <div className="mb-6 p-4 bg-[#FF3B30] border-4 border-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
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
                            className="p-3 border-4 border-black font-bold uppercase hover:bg-black hover:text-white transition-colors active:translate-x-1 active:translate-y-1 active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                            {meal}
                        </button>
                    ))}
                </div>
                <button onClick={onClose} className="w-full text-center font-bold uppercase underline">Cancel</button>
            </motion.div>
        </div>
    );
};

const RestaurantMenuModal = ({ restaurantName, items, onClose, onItemSelect, userProfile }) => {
    const safeItems = useMemo(() => items, [items]); 
    const menuTabs = useMemo(() => categorizeMenu(safeItems), [safeItems]);
    const [activeTab, setActiveTab] = useState(menuTabs[0]?.id || 'other');
    const logoUrl = getLogoUrl(restaurantName);

    useEffect(() => { if (menuTabs.length > 0 && !menuTabs.find(t => t.id === activeTab)) setActiveTab(menuTabs[0].id); }, [menuTabs, activeTab]);

    return (
        <div className="fixed inset-0 z-[12000] bg-white flex flex-col font-sans text-black animate-in fade-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b-4 border-black flex justify-between items-start bg-[#E0E7FF] pt-12">
                <div className="flex items-center gap-4">
                     <div className="w-16 h-16 border-4 border-black bg-white flex items-center justify-center overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <img src={logoUrl} alt="logo" className="w-full h-full object-contain" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/706/706164.png'} />
                     </div>
                     <div>
                        <h2 className="text-3xl font-black uppercase leading-none tracking-tighter">{restaurantName}</h2>
                        <p className="text-xs font-bold uppercase mt-1 tracking-widest">Full Menu</p>
                     </div>
                </div>
                <button onClick={onClose} className="w-10 h-10 border-4 border-black bg-white flex items-center justify-center font-black hover:bg-black hover:text-white transition-all">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar p-4 border-b-4 border-black bg-white">
                {menuTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`shrink-0 px-4 py-3 border-4 border-black font-black uppercase text-xs transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none ${
                            activeTab === tab.id ? 'bg-black text-white' : 'bg-white text-black'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <div className="space-y-4 pb-20">
                     {menuTabs.find(t => t.id === activeTab)?.items.map(item => {
                        const { isSafe, issues } = checkSafety(item, userProfile);
                        return (
                            <div key={item.id} className="border-4 border-black p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 pr-4">
                                        <div className="mb-2"><SafetyBadge isSafe={isSafe} issues={issues} /></div>
                                        <h3 className="font-black text-lg uppercase leading-tight">{item.name}</h3>
                                        <p className="text-xs font-bold mt-2 bg-[#FFD700] border-2 border-black px-2 py-0.5 w-fit">{item.macros?.calories || 0} cal</p>
                                    </div>
                                    <button 
                                        onClick={() => onItemSelect(item)}
                                        className="w-12 h-12 bg-black text-white font-black text-xl flex items-center justify-center border-2 border-black active:scale-90 transition-transform"
                                    >
                                        +
                                    </button>
                                </div>
                                {item.description && <p className="text-xs font-bold text-gray-500 mt-2 uppercase leading-relaxed">{item.description}</p>}
                            </div>
                        );
                     })}
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export const MealHub = ({ userProfile, onOpenMenu }) => {
  const navigate = useNavigate();
  
  // State for Search
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  
  // Search History State
  const [searchHistory, setSearchHistory] = useState(() => {
      try { return JSON.parse(localStorage.getItem('safespoon_search_history') || '[]'); } catch { return []; }
  });

  // Selection States
  const [selectedRestaurantName, setSelectedRestaurantName] = useState(null);
  const [restaurantMenu, setRestaurantMenu] = useState([]);
  const [itemForIntake, setItemForIntake] = useState(null); 

  // State for Recipes
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [breakfastRecipes, setBreakfastRecipes] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- DUAL API SEARCH LOGIC ---
  useEffect(() => {
    if (searchQuery.length < 3) { setSuggestions([]); return; }
    
    const timeoutId = setTimeout(async () => {
        setIsApiLoading(true);
        try {
            // Run BOTH searches in parallel
            const [usdaRes, restaurantRes] = await Promise.all([
                // A. USDA Search
                fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(searchQuery)}&pageSize=10&dataType=Branded,Foundation`).then(r => r.json()),
                
                // B. FoodService (FatSecret) Search
                searchRestaurantMenu(searchQuery)
            ]);

            const newSuggestions = [];

            // 1. Process Restaurants (Priority)
            if (restaurantRes.items && restaurantRes.items.length > 0) {
                restaurantRes.items.forEach(item => {
                    newSuggestions.push({
                        id: item.id,
                        fdcId: `rest-${item.id}`,
                        name: item.name,
                        brand: item.brand,
                        logo: getLogoUrl(item.brand),
                        isRestaurant: true,
                        details: item 
                    });
                });
            }

            // 2. Process USDA Results
            if (usdaRes.foods) {
                usdaRes.foods.forEach(f => {
                    newSuggestions.push({
                        id: f.fdcId, 
                        fdcId: f.fdcId, 
                        name: f.description, 
                        brand: f.brandOwner || (f.dataType === 'Foundation' ? 'Basic' : 'Generic'), 
                        logo: getLogoUrl(f.brandOwner), 
                        isExternal: true
                    });
                });
            }

            setSuggestions(newSuggestions);

        } catch (e) { console.error("Search failed", e); } 
        finally { setIsApiLoading(false); }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle Item Selection
  const handleSelect = (item) => {
      // Add to History
      const newHist = [item.name, ...searchHistory.filter(t => t !== item.name)].slice(0, 6);
      setSearchHistory(newHist);
      localStorage.setItem('safespoon_search_history', JSON.stringify(newHist));

      setIsSearching(false);
      
      // If it's a restaurant item/brand, open menu
      if (item.isRestaurant) {
          handleRestaurantSelect(item.brand || item.name);
      } else {
          // If generic USDA item, open adding modal directly
          setItemForIntake({
              name: item.name,
              brand: item.brand,
              macros: { calories: 0 } // USDA needs a fetch detail call, simplifying for list select
          });
      }
  };

  // Quick Search for Chains
  const triggerChainSearch = (chainName) => {
      handleRestaurantSelect(chainName);
  };

  const handleRestaurantSelect = async (name) => {
      setSelectedRestaurantName(name); 
      try {
          // Use FoodService to get full menu
          const res = await searchRestaurantMenu(name);
          setRestaurantMenu(res.items || []);
      } catch (e) { console.error(e); } 
  };

  const handleAddToLog = async (mealSegment, item) => {
      if (!userProfile?.uid || !item) return;
      const newEntry = {
          name: item.name,
          brand: selectedRestaurantName || item.brand || "Generic",
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
      alert("Added to log!");
  };

  // Load Recipes (TheMealDB)
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
    <div className="font-sans text-black pb-12">
      <Helmet><title>Meal Hub</title></Helmet>

      {/* SEARCH OVERLAY */}
      <SearchOverlay 
        isSearching={isSearching} setIsSearching={setIsSearching}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        isApiLoading={isApiLoading} suggestions={suggestions}
        onSelect={handleSelect}
        history={searchHistory}
        onClearHistory={() => { setSearchHistory([]); localStorage.removeItem('safespoon_search_history'); }}
      />

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

      {/* 1. HERO HEADER - FULL BLEED (-mx-4 to counteract container padding) */}
      <header className="-mx-4 px-4 pt-6 pb-6 bg-[#A7F3D0] border-b-4 border-black mb-4">
          <h1 className="text-5xl font-black uppercase leading-[0.85] tracking-tighter mb-2">
            Eat<br/>Good.
          </h1>
          <p className="text-sm font-bold uppercase tracking-widest text-black/60">Discover healthy options</p>
      </header>

      {/* 2. SEARCH BOX (Trigger) - FULL BLEED */}
      <div className="-mx-4 px-4 mb-8">
          <button 
            onClick={() => setIsSearching(true)} 
            className="w-full h-16 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center px-4 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all group"
          >
              <div className="mr-4"><ColoredIcon src={searchIcon} colorClass="bg-black" sizeClass="w-6 h-6" /></div>
              <span className="text-xl font-black uppercase tracking-wide text-gray-300 group-hover:text-black transition-colors">Search Food...</span>
          </button>
      </div>

      {/* 3. POPULAR CHAINS */}
      <section className="mb-10 px-0">
           <h3 className="text-sm font-black uppercase tracking-widest mb-4">Popular Chains</h3>
           <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4">
              {POPULAR_CHAINS.map((name, i) => (
                  <button 
                    key={i} 
                    onClick={() => triggerChainSearch(name)}
                    className="shrink-0 w-24 h-24 bg-white border-4 border-black flex flex-col items-center justify-center p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                  >
                      <div className="w-10 h-10 mb-2 overflow-hidden border-2 border-black rounded-full bg-gray-50 flex items-center justify-center">
                        <img src={getLogoUrl(name)} className="w-full h-full object-cover" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/706/706164.png'} alt={name}/>
                      </div>
                      <span className="text-[9px] font-black uppercase text-center leading-tight line-clamp-1 w-full">{name}</span>
                  </button>
              ))}
          </div>
      </section>

      {/* 4. RECIPE ROWS */}
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

      {/* 5. PLANNER BANNER */}
      <div className="px-0 mt-4">
        <button 
            onClick={() => navigate('/planner')}
            className="w-full bg-[#E0E7FF] border-4 border-black p-6 flex justify-between items-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
            <div className="text-left">
                <h3 className="text-xl font-black uppercase">Weekly Planner</h3>
                <p className="text-xs font-bold font-mono uppercase tracking-widest text-gray-500 mt-1">Save money & prep ahead</p>
            </div>
            <div className="w-12 h-12 border-2 border-black bg-white flex items-center justify-center">
                <ColoredIcon src={chartIcon} colorClass="bg-black" sizeClass="w-6 h-6" />
            </div>
        </button>
      </div>
    </div>
  );
};