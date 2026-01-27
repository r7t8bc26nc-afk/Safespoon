import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { getAuth } from "firebase/auth";
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { motion, AnimatePresence } from 'framer-motion';

const USDA_API_KEY = '47ccOoSTZvhVDw3YpNh4nGCwSbLs98XOJufWOcY7'; 
const LOGO_DEV_PUBLIC_KEY = 'pk_AnZTwqMTQ1ia9Btg_pILzg';

export const RestaurantMenu = ({ restaurant, onBack, userProfile }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('entrees'); 
  const [expandedId, setExpandedId] = useState(null);

  const getLogoUrl = (name) => {
    const domain = name?.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}&size=100&format=png`;
  };

  useEffect(() => {
    const fetchUSDAMenu = async () => {
      if (!restaurant?.name) return;
      try {
        setLoading(true);
        // Check local first
        const localSnap = await getDocs(collection(db, "restaurants", String(restaurant.id), "menu_items"));
        if (!localSnap.empty) {
          setMenuItems(localSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
          return;
        }

        // Query USDA by Brand Owner (National Chains)
        const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${restaurant.name}&brandOwner=${restaurant.name}&pageSize=30&api_key=${USDA_API_KEY}`);
        const data = await response.json();
        
        if (data.foods) {
          const formatted = data.foods.map(f => ({
            id: f.fdcId, name: f.description, category: f.brandOwner,
            description: "USDA Analyzed: Review nutrients for personalized safety audit.",
            is_meal: true
          }));
          setMenuItems(formatted);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchUSDAMenu();
  }, [restaurant]);

  const handleToggleFavorite = async () => {
    const auth = getAuth();
    if (!auth.currentUser || !restaurant?.id) return;
    const isFavorite = userProfile?.favorites?.includes(restaurant.id);
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
        favorites: isFavorite ? arrayRemove(restaurant.id) : arrayUnion(restaurant.id)
    });
  };

  const groupedMenu = useMemo(() => {
    const buckets = { entrees: [], sides: [], drinks: [] };
    menuItems.forEach(item => {
        const name = item.name.toLowerCase();
        if (name.includes('drink') || name.includes('soda') || name.includes('tea')) buckets.drinks.push(item);
        else if (name.includes('fries') || name.includes('side') || name.includes('chips')) buckets.sides.push(item);
        else buckets.entrees.push(item);
    });
    return buckets;
  }, [menuItems]);

  const displayedItems = groupedMenu[activeTab] || [];

  return (
    <div className="w-full min-h-screen bg-white font-['Host_Grotesk'] px-4 md:px-8 pb-32">
      <div className="py-6 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-50 border-b border-slate-100 -mx-4 px-4 md:-mx-8 md:px-8">
          <button onClick={onBack} className="h-12 w-12 flex items-center justify-center bg-slate-50 rounded-full"><svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M15 19l-7-7 7-7"/></svg></button>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Venue Menu Audit</span>
          <button onClick={handleToggleFavorite} className={`h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-all ${userProfile?.favorites?.includes(restaurant.id) ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-slate-50 text-slate-300'}`}><svg className="w-5 h-5" fill="currentColor" stroke="none" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg></button>
      </div>

      <div className="pt-8">
        <div className="flex flex-col items-center text-center mb-10">
            <div className="h-32 w-32 rounded-full bg-white border border-slate-100 flex items-center justify-center mb-6 overflow-hidden">
                <img src={getLogoUrl(restaurant.name)} alt="" className="w-20 h-20 object-contain" onError={e => e.target.src = 'https://cdn-icons-png.flaticon.com/512/5223/5223755.png'} />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-2">{restaurant.name}</h1>
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{restaurant.category || "National Chain"}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                <span className="text-violet-600 font-black text-xs uppercase tracking-widest">★ {restaurant.rating || "New"} FDC Score</span>
            </div>
        </div>

        <div className="flex justify-center md:justify-start gap-2 overflow-x-auto no-scrollbar pb-8 snap-x">
            {['entrees', 'sides', 'drinks'].map(id => (
                <button key={id} onClick={() => setActiveTab(id)} className={`snap-start shrink-0 flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black transition-all border ${activeTab === id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}>
                    {id.toUpperCase()}
                </button>
            ))}
        </div>

        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-50 rounded-[2rem]"></div>)}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedItems.map(item => (
                    <motion.div key={item.id} layout onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className={`bg-slate-50 rounded-[2rem] p-6 border ${expandedId === item.id ? 'border-violet-200 bg-white ring-4 ring-violet-50' : 'border-slate-100'}`}>
                        <h3 className="text-base font-black text-slate-900 mb-1">{item.name}</h3>
                        <p className="text-xs font-medium text-slate-500 leading-relaxed line-clamp-2">{item.description}</p>
                        <AnimatePresence>
                            {expandedId === item.id && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="mt-4 pt-4 border-t border-slate-100">
                                    <button className="w-full py-3 bg-violet-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Audit Full Nutrition</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};