import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { getAuth } from "firebase/auth"; 
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

const LOGO_DEV_PUBLIC_KEY = 'pk_AnZTwqMTQ1ia9Btg_pILzg';

const CATEGORIES = [
    { id: 'All', label: 'All', icon: '🍽️' },
    { id: 'Fast Food', label: 'Fast Food', icon: '🍔' },
    { id: 'Healthy', label: 'Healthy', icon: '🥗' },
    { id: 'Mexican', label: 'Mexican', icon: '🌮' },
    { id: 'Pizza', label: 'Pizza', icon: '🍕' },
    { id: 'Coffee', label: 'Coffee', icon: '☕' },
    { id: 'Burgers', label: 'Burgers', icon: '🥩' },
];

export const RestaurantExplorer = ({ onOpenMenu, userProfile, onAuthRequired }) => {
  const [mode, setMode] = useState('restaurants');
  const [restaurants, setRestaurants] = useState([]);
  const [groceries, setGroceries] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const getLogoUrl = (name) => {
    if (!name) return '';
    const domain = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}&size=100&format=png`;
  };

  useEffect(() => {
    setLoading(true);
    const unsubRestaurants = onSnapshot(collection(db, "restaurants"), (snapshot) => {
        const restData = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(), distance: (Math.random() * 10 + 0.5).toFixed(1) 
        }));
        setRestaurants(restData);
    });

    const unsubGroceries = onSnapshot(collection(db, "groceries"), (snapshot) => {
        const grocData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGroceries(grocData);
        setLoading(false);
    });

    return () => { unsubRestaurants(); unsubGroceries(); };
  }, []);

  const handleToggleFavorite = async (e, itemId) => {
    e.stopPropagation(); 
    
    // GUEST INTERRUPT: Soft convert to signup
    if (!userProfile) {
        onAuthRequired();
        return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    const userRef = doc(db, "users", user.uid);
    const isFavorite = userProfile?.favorites?.includes(itemId);
    try {
        if (isFavorite) await updateDoc(userRef, { favorites: arrayRemove(itemId) });
        else await updateDoc(userRef, { favorites: arrayUnion(itemId) });
    } catch (err) { console.error(err); }
  };

  const checkSafety = (item) => {
      // GUEST MODE: Assume safe but indicate personalization required
      if (!userProfile) return { isSafe: true, isGuest: true, conflicts: [] };

      const userRestrictions = (userProfile?.restrictions || []).map(r => r.toLowerCase());
      const conflicts = [];
      (item.tags || []).forEach(tag => {
          if (userRestrictions.includes(tag.toLowerCase())) conflicts.push(tag);
          if (tag.toLowerCase() === 'wheat' && userRestrictions.includes('gluten')) {
               if (!conflicts.includes('Gluten')) conflicts.push('Gluten (Wheat)');
          }
      });
      return { isSafe: conflicts.length === 0, conflicts };
  };

  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch = r.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesCategory = activeCategory === 'All' || (r.category && r.category.includes(activeCategory));
    return matchesSearch && matchesCategory;
  });

  const filteredGroceries = groceries.filter(i => 
      i.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false
  );

  const handleImageError = (e) => {
      e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'; 
      e.target.style.filter = "grayscale(20%) opacity(80%)";
  };

  return (
    <div className={`w-full max-w-7xl mx-auto pb-24 transition-all duration-300 ${isExpanded ? 'fixed inset-0 z-[100] bg-white p-6 overflow-y-auto' : 'relative'}`}>
      
      {!isExpanded && <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-100 rounded-full blur-3xl -z-10 opacity-40 animate-pulse"></div>}

      <div className={`flex flex-col gap-4 ${isExpanded ? 'mt-4' : 'pt-4'}`}>
         
         {!isExpanded && (
             <div className="flex justify-end mb-2">
                <div className="bg-gray-100 p-1 rounded-xl inline-flex w-full md:w-auto">
                    <button onClick={() => setMode('restaurants')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'restaurants' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500'}`}>Restaurants</button>
                    <button onClick={() => setMode('ingredients')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'ingredients' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500'}`}>Groceries</button>
                </div>
             </div>
         )}

         <div className="flex items-center gap-4">
            {isExpanded && (
                <button onClick={() => setIsExpanded(false)} className="p-2 -ml-2 text-slate-900">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                </button>
            )}
            <div className="relative flex-1 z-20">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input 
                    type="text" 
                    placeholder={mode === 'restaurants' ? "Search for 'Burgers', 'Sushi'..." : "Search 'Oat Milk', 'Flour'..."} 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsExpanded(true)}
                    className="w-full bg-slate-100 rounded-2xl pl-12 pr-4 py-4 font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all shadow-sm" 
                />
            </div>
         </div>

         {!isExpanded && mode === 'restaurants' && (
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {CATEGORIES.map((cat) => (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all border ${activeCategory === cat.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-100'}`}>
                        <span>{cat.icon}</span> <span>{cat.label}</span>
                    </button>
                ))}
            </div>
         )}
      </div>

      <div className={`${isExpanded && 'mt-8'}`}>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
                {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-100 rounded-[2rem] animate-pulse"></div>)}
            </div>
          ) : (
            <>
            {mode === 'restaurants' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                    {filteredRestaurants.map((restaurant) => {
                        const isFavorite = userProfile?.favorites?.includes(restaurant.id);
                        return (
                            <div key={restaurant.id} onClick={() => onOpenMenu(restaurant)} className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col">
                                <div className="h-40 w-full bg-gray-200 relative overflow-hidden">
                                    <img src={`https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400`} alt={restaurant.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" onError={(e) => e.target.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'} />
                                    <div className="absolute top-3 left-3 flex gap-2">
                                        {restaurant.verified && <span className="bg-emerald-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md shadow-sm">Verified</span>}
                                        <span className="bg-white/90 backdrop-blur-md text-gray-900 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1">★ {restaurant.rating || "New"}</span>
                                    </div>
                                    <button onClick={(e) => handleToggleFavorite(e, restaurant.id)} className={`absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center shadow-md transition-all ${isFavorite ? 'bg-rose-500 text-white' : 'bg-white text-gray-400 hover:scale-110'}`}><svg className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg></button>
                                </div>
                                <div className="p-5 pt-12 relative flex-1 flex flex-col">
                                    <div className="absolute -top-8 left-5 h-16 w-16 rounded-full bg-white p-1 shadow-md border border-gray-50"><img src={getLogoUrl(restaurant.name)} alt="logo" className="w-full h-full object-contain rounded-full" onError={(e) => e.target.style.display='none'} /></div>
                                    <div className="mb-2">
                                        <h3 className="text-xl font-extrabold text-gray-900 leading-tight group-hover:text-violet-700 transition-colors">{restaurant.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md">{restaurant.category || "Restaurant"}</span>
                                            <span className="text-xs font-bold text-gray-400">•</span>
                                            <span className="text-xs font-bold text-gray-500">{restaurant.distance} mi</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {mode === 'ingredients' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                    {filteredGroceries.map(item => {
                        const { isSafe, isGuest, conflicts } = checkSafety(item);
                        return (
                            <div key={item.id} onClick={() => setSelectedIngredient(item)} className="group relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col">
                                <div className="h-40 w-full bg-gray-50 relative overflow-hidden">
                                    <img src={item.image} alt={item.name} onError={handleImageError} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    <div className={`absolute top-3 right-3 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm border border-white/20 ${isGuest ? 'bg-violet-500 text-white' : (isSafe ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white')}`}>{isGuest ? 'Check Safety' : (isSafe ? 'Safe' : 'Avoid')}</div>
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="mb-2">
                                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wide mb-1">{item.brand}</p>
                                        <h3 className="font-extrabold text-lg text-gray-900 leading-tight line-clamp-2">{item.name}</h3>
                                    </div>
                                    <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-[10px] font-bold text-gray-500">
                                        {item.nutrition ? <div className="flex gap-2"><span>🔥 {item.nutrition.calories || 'N/A'} Cal</span><span>💪 {item.nutrition.protein || '0g'} Pro</span></div> : <span className="opacity-50">View Details</span>}
                                        <span className="text-violet-600 group-hover:translate-x-1 transition-transform">View →</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            </>
          )}
      </div>

      {selectedIngredient && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl relative">
                  <button onClick={() => setSelectedIngredient(null)} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">✕</button>
                  <div className="text-center mb-6">
                      <div className="h-20 w-20 mx-auto rounded-full bg-gray-50 mb-4 overflow-hidden shadow-sm border-4 border-white"><img src={selectedIngredient.image} onError={handleImageError} alt={selectedIngredient.name} className="w-full h-full object-cover" /></div>
                      <h2 className="text-xl font-black text-gray-900 leading-tight mb-1">{selectedIngredient.name}</h2>
                      <p className="text-gray-500 font-bold uppercase text-xs tracking-wide">{selectedIngredient.brand}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 mb-6">
                      <h3 className="font-black text-gray-900 uppercase tracking-widest text-[10px] mb-3 border-b border-gray-200 pb-2">Nutrition Facts</h3>
                      {selectedIngredient.nutrition ? (
                          <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center"><span className="font-bold text-gray-600">Calories</span><span className="font-black text-lg text-gray-900">{selectedIngredient.nutrition.calories || 'N/A'}</span></div>
                              <div className="w-full h-px bg-gray-200"></div>
                              <div className="flex justify-between items-center"><span className="font-medium text-gray-500">Protein</span><span className="font-bold text-gray-900">{selectedIngredient.nutrition.protein || 'N/A'}</span></div>
                              <div className="flex justify-between items-center"><span className="font-medium text-gray-500">Total Fat</span><span className="font-bold text-gray-900">{selectedIngredient.nutrition.fat || 'N/A'}</span></div>
                              <div className="flex justify-between items-center"><span className="font-medium text-gray-500">Carbs</span><span className="font-bold text-gray-900">{selectedIngredient.nutrition.carbs || 'N/A'}</span></div>
                          </div>
                      ) : <div className="text-center text-gray-400 text-sm">No data available</div>}
                  </div>
                  {(() => {
                      const { isSafe, isGuest, conflicts } = checkSafety(selectedIngredient);
                      return (
                          <div className={`p-4 rounded-xl border flex items-start gap-3 ${isGuest ? 'bg-violet-50 border-violet-100' : (isSafe ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100')}`}>
                             <span className="text-2xl">{isGuest ? '✨' : (isSafe ? '👍' : '⚠️')}</span>
                             <div>
                                 <h3 className={`font-bold text-sm ${isGuest ? 'text-violet-800' : (isSafe ? 'text-emerald-800' : 'text-rose-800')}`}>{isGuest ? 'Personalize Phlynt' : (isSafe ? 'Safe Choice' : 'Conflict Warning')}</h3>
                                 <p className={`text-xs mt-1 ${isGuest ? 'text-violet-600' : (isSafe ? 'text-emerald-600' : 'text-rose-600')}`}>{isGuest ? 'Sign up to see if this matches your profile.' : (isSafe ? 'No allergens detected.' : `Contains: ${conflicts.join(', ')}`)}</p>
                             </div>
                          </div>
                      );
                  })()}
              </div>
          </div>
      )}
    </div>
  );
};