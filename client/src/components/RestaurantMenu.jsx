import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { getAuth } from "firebase/auth";
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

const LOGO_DEV_PUBLIC_KEY = 'pk_AnZTwqMTQ1ia9Btg_pILzg';

// Helper for broken images
const handleImageError = (e) => {
  e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'; 
  e.target.style.filter = "grayscale(20%) opacity(80%)";
};

// --- NAMED EXPORT (This fixes your error) ---
export const RestaurantMenu = ({ restaurant, onBack, userProfile }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('combos'); 
  const [expandedId, setExpandedId] = useState(null);

  const getLogoUrl = (name) => {
    if (!name) return '';
    const domain = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}&size=100&format=png`;
  };

  useEffect(() => {
    const fetchMenu = async () => {
      if (!restaurant?.id) return;
      try {
        setLoading(true);
        const safeId = String(restaurant.id);
        const subCollectionRef = collection(db, "restaurants", safeId, "menu_items");
        const subCollectionSnap = await getDocs(subCollectionRef);
        if (!subCollectionSnap.empty) {
          const items = subCollectionSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMenuItems(items);
        } else {
          setMenuItems([]);
        }
      } catch (err) {
        console.error("Error fetching menu:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [restaurant]);

  const handleToggleFavorite = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || !restaurant?.id) return;

    const userRef = doc(db, "users", user.uid);
    const isFavorite = userProfile?.favorites?.includes(restaurant.id);

    try {
        if (isFavorite) await updateDoc(userRef, { favorites: arrayRemove(restaurant.id) });
        else await updateDoc(userRef, { favorites: arrayUnion(restaurant.id) });
    } catch (err) {
        console.error("Error updating favorites:", err);
    }
  };

  const isFavorite = userProfile?.favorites?.includes(restaurant.id);

  const groupedMenu = useMemo(() => {
    const buckets = { combos: [], mains: [], sides: [], drinks: [] };
    menuItems.forEach(item => {
        const cat = (item.category || "").toLowerCase();
        const name = (item.name || "").toLowerCase();
        if (cat.includes('drink') || cat.includes('beverage') || name.includes('soda')) buckets.drinks.push(item);
        else if (cat.includes('side') || name.includes('fries')) buckets.sides.push(item);
        else if (item.is_meal === true || cat.includes('meal') || cat.includes('combo')) buckets.combos.push(item);
        else buckets.mains.push(item);
    });
    return buckets;
  }, [menuItems]);

  const displayedItems = groupedMenu[activeTab] || [];

  const checkSafety = (item) => {
    const userRestrictions = userProfile?.restrictions || [];
    const flags = item.dietary_flags || {};
    const conflicts = [];
    const itemText = `${item.name} ${item.description || ''} ${item.ingredients ? item.ingredients.join(' ') : ''}`.toLowerCase();
    userRestrictions.forEach(r => {
        let isConflict = false;
        if (r === 'dairy' && flags.contains_dairy) isConflict = true;
        if (r === 'gluten' && flags.is_gluten_free === false) isConflict = true;
        if (!isConflict && itemText.includes(r.toLowerCase())) isConflict = true;
        if (isConflict) {
            const label = r.charAt(0).toUpperCase() + r.slice(1);
            if (!conflicts.includes(label)) conflicts.push(label);
        }
    });
    return { isSafe: conflicts.length === 0, conflicts: conflicts };
  };

  const toggleItem = (id) => setExpandedId(current => current === id ? null : id);

  return (
    <div className="w-full max-w-7xl mx-auto pb-24 relative">
        
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gray-50 rounded-full blur-[120px] -z-10 opacity-70"></div>

      {/* --- NAV --- */}
      <div className="mb-6">
          <button onClick={onBack} className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm text-gray-500 font-bold hover:text-gray-900 hover:shadow-md transition-all text-sm">
            <span>←</span> <span>Back</span>
          </button>
      </div>

      {/* --- RESTAURANT HERO --- */}
      <div className="relative mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            
            {/* LOGO FIX: object-cover fills the circle, handles broken links */}
            <div className="h-28 w-28 rounded-full bg-white shadow-xl shrink-0 overflow-hidden relative z-10 flex items-center justify-center">
                <img 
                    src={getLogoUrl(restaurant.name)} 
                    alt="Logo" 
                    className="w-full h-full object-cover" 
                    onError={handleImageError} 
                />
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-2 pt-1">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-gray-900 leading-none">{restaurant.name}</h1>
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                    <span className="text-gray-500 font-bold text-sm uppercase tracking-wide">
                        {restaurant.category || "Restaurant"}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className="text-violet-600 font-bold text-sm flex items-center gap-1 uppercase tracking-wide">
                        ★ {restaurant.rating || "New"} Safety Score
                    </span>
                </div>
            </div>

            {/* HEART BUTTON */}
            <button 
                onClick={handleToggleFavorite} 
                className={`h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${isFavorite ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-white text-gray-300 hover:text-rose-500'}`}
            >
                <svg className="w-6 h-6" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
            </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : (
        <>
            {/* --- STICKY TABS --- */}
            <div className="sticky top-0 z-30 bg-gray-50/90 backdrop-blur-md py-4 -mx-4 px-4 border-b border-gray-100 mb-6">
                <div className="flex justify-center md:justify-start gap-2 overflow-x-auto no-scrollbar">
                    {['combos', 'mains', 'sides', 'drinks'].map(tab => (
                        <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab)} 
                            className={`
                                group flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-extrabold transition-all duration-300 flex-none
                                ${activeTab === tab 
                                    ? 'bg-gray-900 text-white shadow-md' 
                                    : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                }
                            `}
                        >
                            <span>{tab === 'combos' ? '🍱' : tab === 'mains' ? '🍔' : tab === 'sides' ? '🍟' : '🥤'}</span>
                            <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                            <span className={`text-xs ml-1 opacity-60`}>{groupedMenu[tab].length}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* --- MENU CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {displayedItems.length === 0 && <div className="col-span-full py-32 text-center opacity-50"><p className="text-xl font-bold text-gray-900">No items found.</p></div>}

                {displayedItems.map((item) => {
                    const { isSafe, conflicts } = checkSafety(item);
                    const isExpanded = expandedId === item.id;
                    const priceDisplay = item.price && item.price > 0 ? `$${item.price}` : "";

                    return (
                        <div 
                            key={item.id} 
                            onClick={() => toggleItem(item.id)}
                            className={`
                                group relative bg-white rounded-3xl p-6 cursor-pointer overflow-hidden transition-all duration-300 border border-transparent
                                ${isExpanded 
                                    ? 'shadow-xl ring-1 ring-gray-100 z-10' 
                                    : 'shadow-[0_4px_20px_-12px_rgba(0,0,0,0.1)] hover:shadow-lg hover:-translate-y-0.5'
                                }
                            `}
                        >
                            {/* Safety Dot */}
                            <div className={`absolute top-6 right-6 h-3 w-3 rounded-full ${isSafe ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>

                            <div className="pr-8">
                                <div className="flex flex-col mb-2">
                                    <h3 className="font-bold text-lg text-gray-900 leading-tight mb-1">{item.name}</h3>
                                    {priceDisplay && <span className="text-sm font-bold text-gray-400">{priceDisplay}</span>}
                                </div>

                                <p className={`text-gray-500 text-sm leading-relaxed transition-all duration-300 ${isExpanded ? 'mb-4' : 'line-clamp-2'}`}>
                                    {item.description || "No description provided."}
                                </p>

                                {/* Badges */}
                                <div className="flex items-center gap-2">
                                    {isSafe ? (
                                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Safe Choice</span>
                                    ) : (
                                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-1 rounded-md">Avoid</span>
                                    )}
                                </div>
                                
                                {(!isSafe || isExpanded) && !isSafe && (
                                    <div className="mt-4 p-3 bg-rose-50 rounded-xl text-xs text-rose-900 font-medium animate-fade-in border border-rose-100">
                                        Contains: <span className="font-bold">{conflicts.join(", ")}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
      )}
    </div>
  );
};