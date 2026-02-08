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

// --- DATA CONSTANTS (RESTORED) ---
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
  const [viewingSubPage, setViewingSubPage] = useState(null); 
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  // Restore Safety Analysis
  const getSafetyAnalysis = (item) => {
    if (!userProfile) return { status: 'neutral', title: '', copy: '' };
    const itemAllergens = item.safetyProfile?.allergens || {};
    const userAllergens = userProfile.allergens || {};
    const userLifestyle = userProfile.lifestyle || {}; 

    // 1. Critical
    const conflicts = Object.keys(userAllergens).filter(k => userAllergens[k] && itemAllergens[k]);
    if (conflicts.length > 0) return { status: 'unsafe', title: `CONTAINS ${conflicts.join(', ').toUpperCase()}`, copy: `Strict allergen conflict detected.` };

    // 2. Warning
    if (userLifestyle.isKeto && (item.macros?.carbs > 10)) return { status: 'lifestyle_conflict', title: 'HIGH CARB', copy: "Rebel choice for Keto goals." };
    if (userLifestyle.isVegan && (item.taxonomy?.category?.includes('dairy'))) return { status: 'lifestyle_conflict', title: 'ANIMAL PRODUCT', copy: "Not plant-based." };

    return { status: 'safe', title: '', copy: '' };
  };

  useEffect(() => {
    const q = query(collection(db, "groceries"), orderBy("lastUpdated", "desc"), limit(300));
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const name = (item.name || '').toLowerCase();
      const brand = (item.brand || '').toLowerCase();
      const cat = (item.taxonomy?.category || '').toLowerCase();
      const query = searchTerm.toLowerCase();
      const matchesSearch = query === '' || name.includes(query) || brand.includes(query);
      const aisleKeywords = AISLES[activeAisle];
      const matchesAisle = isSearchMode ? true : (activeAisle === 'All' || aisleKeywords.some(k => cat.includes(k)));
      return matchesSearch && matchesAisle;
    });
  }, [items, activeAisle, searchTerm, isSearchMode]);

  const groupedItems = useMemo(() => {
    if (activeAisle === 'All') {
       const groups = {};
       Object.keys(AISLES).forEach(key => {
         if (key === 'All') return;
         const keywords = AISLES[key];
         const matches = filteredItems.filter(item => keywords.some(k => (item.taxonomy?.category || '').toLowerCase().includes(k)));
         if (matches.length > 0) groups[key] = matches;
       });
       return groups;
    } else {
       const groups = {};
       const subs = SUB_SECTIONS[activeAisle] || [];
       subs.forEach(sub => {
         const keywords = sub.toLowerCase().split(' & ').flatMap(k => k.split(' '));
         const matches = filteredItems.filter(item => keywords.some(k => (item.taxonomy?.category || '').toLowerCase().includes(k)));
         if (matches.length > 0) groups[sub] = matches;
       });
       return groups;
    }
  }, [filteredItems, activeAisle]);

  // --- NEUBRUTALIST PRODUCT CARD ---
  const ProductCard = ({ item }) => {
    const { status, title, copy } = getSafetyAnalysis(item);
    const isUnsafe = status === 'unsafe';
    const isWarn = status === 'lifestyle_conflict';

    return (
      <article 
        onClick={() => onOpenMenu(item)}
        className={`border-4 border-black p-4 flex flex-col cursor-pointer active:translate-x-1 active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white ${isUnsafe ? 'bg-red-50 border-red-900' : ''}`}
      >
        <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-black text-white px-2 py-1">{item.brand || "Generic"}</span>
            {isUnsafe && <span className="text-[10px] font-black uppercase bg-red-600 text-white px-2 py-1">AVOID</span>}
        </div>
        
        <h3 className="font-black text-lg leading-tight uppercase line-clamp-2 mb-2">{item.name}</h3>
        
        {(isUnsafe || isWarn) && (
            <div className={`border-t-2 ${isUnsafe ? 'border-red-900' : 'border-black'} pt-2 mt-auto`}>
                <p className={`text-[10px] font-black uppercase ${isUnsafe ? 'text-red-600' : 'text-yellow-600'}`}>{title}</p>
                <p className="text-[10px] font-bold leading-tight mt-0.5 opacity-80">{copy}</p>
            </div>
        )}
      </article>
    );
  };

  if (viewingSubPage) {
     const subItems = groupedItems[viewingSubPage] || [];
     return (
         <div className="bg-white min-h-screen">
             <div className="sticky top-0 z-40 bg-[#FFF8DC] border-b-4 border-black px-4 py-4 flex items-center gap-4">
                 <button onClick={() => setViewingSubPage(null)} className="font-black text-xl border-2 border-black bg-white w-10 h-10 flex items-center justify-center hover:bg-black hover:text-white transition-colors">←</button>
                 <h2 className="font-black uppercase text-xl">{viewingSubPage}</h2>
             </div>
             <div className="p-4 grid grid-cols-2 gap-4 pb-24">
                 {subItems.map(item => <ProductCard key={item.id} item={item} />)}
             </div>
         </div>
     );
  }

  return (
    <div className="bg-white min-h-screen font-sans text-black">
      {/* AISLE TABS */}
      <div className="sticky top-0 z-30 bg-white border-b-4 border-black px-4 py-4">
          <input 
            type="text"
            placeholder={`SEARCH ${activeAisle.toUpperCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 px-4 border-4 border-black font-bold uppercase placeholder:text-gray-400 focus:outline-none focus:bg-yellow-50 mb-4"
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {Object.keys(AISLES).map(aisle => (
                  <button
                    key={aisle}
                    onClick={() => { setActiveAisle(aisle); setSearchTerm(''); }}
                    className={`px-4 py-2 border-2 border-black font-bold uppercase text-xs whitespace-nowrap ${activeAisle === aisle ? 'bg-black text-white' : 'bg-white text-black'}`}
                  >
                    {aisle}
                  </button>
              ))}
          </div>
      </div>

      <div className="p-4 flex flex-col gap-8 pb-24">
          {Object.entries(groupedItems).map(([title, items]) => (
             <section key={title}>
                 <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-1">
                     <h3 className="font-black text-xl uppercase">{title}</h3>
                     <button onClick={() => setViewingSubPage(title)} className="text-xs font-bold uppercase underline">See All</button>
                 </div>
                 <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar">
                     {items.slice(0, 5).map(item => (
                         <div key={item.id} className="min-w-[160px] w-[160px] snap-start">
                             <ProductCard item={item} />
                         </div>
                     ))}
                 </div>
             </section>
          ))}
          {Object.keys(groupedItems).length === 0 && <div className="text-center font-bold py-10">NO ITEMS FOUND.</div>}
      </div>
    </div>
  );
};