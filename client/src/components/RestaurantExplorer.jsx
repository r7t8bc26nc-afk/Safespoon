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

export const RestaurantExplorer = ({ onOpenMenu, userProfile }) => {
  const [mode, setMode] = useState('restaurants');
  const [restaurants, setRestaurants] = useState([]);
  const [groceries, setGroceries] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedIngredient, setSelectedIngredient] = useState(null);

  const getLogoUrl = (name) => {
    if (!name) return '';
    const domain = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}&size=100&format=png`;
  };

  useEffect(() => {
    setLoading(true);
    // 1. Listen to Restaurants
    const unsubRestaurants = onSnapshot(collection(db, "restaurants"), (snapshot) => {
        const restData = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(), distance: (Math.random() * 10 + 0.5).toFixed(1) 
        }));
        setRestaurants(restData);
    });

    // 2. Listen to Groceries
    const unsubGroceries = onSnapshot(collection(db, "groceries"), (snapshot) => {
        const grocData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGroceries(grocData);
        setLoading(false);
    });

    return () => { unsubRestaurants(); unsubGroceries(); };
  }, []);

  const handleToggleFavorite = async (e, itemId) => {
    e.stopPropagation(); 
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const isFavorite = userProfile?.favorites?.includes(itemId);
    try {
        if (isFavorite) await updateDoc(userRef, { favorites: arrayRemove(itemId) });
        else await updateDoc(userRef, { favorites: arrayUnion(itemId) });
    } catch (err) { console.error(err); }
  };

  const checkSafety = (item) => {
      const userRestrictions = (userProfile?.restrictions || []).map(r => r.toLowerCase());
      const conflicts = [];
      // Safety Check: Ensure tags exist before mapping
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
    <div className="w-full max-w-7xl mx-auto space-y-10 pb-24 relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-100 rounded-full blur-3xl -z-10 opacity-40 mix-blend-multiply animate-pulse"></div>

      {/* --- HEADER --- */}
      <div className="pt-0 space-y-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
                <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter leading-none mb-2">Discover.</h1>
                <p className="text-lg text-gray-500 font-medium">Find safe eats or verify ingredients.</p>
            </div>
            <div className="bg-white p-1.5 rounded-full shadow-sm border border-gray-100 flex w-full md:w-auto">
                <button onClick={() => setMode('restaurants')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-full text-sm font-extrabold transition-all duration-300 ${mode === 'restaurants' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-900'}`}>Restaurants</button>
                <button onClick={() => setMode('ingredients')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-full text-sm font-extrabold transition-all duration-300 ${mode === 'ingredients' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-900'}`}>Groceries</button>
            </div>
        </div>

        <div className="relative w-full z-20">
            <div className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></div>
            <input type="text" placeholder={mode === 'restaurants' ? "Search for 'Burgers', 'Sushi'..." : "Search 'Oat Milk', 'Flour'..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white rounded-[2rem] pl-16 pr-6 py-5 font-bold text-gray-900 placeholder-gray-400 shadow-[0_15px_30px_-5px_rgb(0,0,0,0.06)] ring-1 ring-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:shadow-xl transition-all text-lg" />
        </div>

        {mode === 'restaurants' && (
            <div className="flex flex-wrap gap-2 items-center">
                {CATEGORIES.map((cat) => (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border flex items-center gap-2 ${activeCategory === cat.id ? 'bg-gray-900 text-white border-gray-900 shadow-lg scale-105' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50 hover:border-gray-300'}`}>
                        <span>{cat.icon}</span><span>{cat.label}</span>
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* --- CONTENT --- */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1,2,3].map(i => <div key={i} className="h-72 bg-gray-100 rounded-[2rem] animate-pulse"></div>)}
        </div>
      ) : (
        <>
        {/* MODE 1: RESTAURANTS */}
        {mode === 'restaurants' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredRestaurants.map((restaurant) => {
                    const isFavorite = userProfile?.favorites?.includes(restaurant.id);
                    return (
                        <div key={restaurant.id} onClick={() => onOpenMenu(restaurant)} className="group bg-white rounded-[2rem] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_-5px_rgb(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500 cursor-pointer border border-gray-100 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                                <div className="h-16 w-16 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                    <img src={getLogoUrl(restaurant.name)} alt="logo" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                                </div>
                                <span className="bg-gray-50 text-gray-500 text-xs font-bold px-3 py-1.5 rounded-full tracking-wide">{restaurant.distance} mi</span>
                            </div>
                            <div className="mb-6">
                                <h3 className="text-2xl font-extrabold text-gray-900 mb-1 leading-tight">{restaurant.name}</h3>
                                <p className="text-gray-400 font-bold text-sm">{restaurant.category || "Restaurant"}</p>
                            </div>
                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                                <span className="flex items-center gap-1.5 bg-violet-50 text-violet-700 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider">★ {restaurant.rating || "New"}</span>
                                <button onClick={(e) => handleToggleFavorite(e, restaurant.id)} className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 ${isFavorite ? 'bg-rose-50 text-rose-500 shadow-sm' : 'bg-gray-50 text-gray-300 hover:text-rose-400'}`}>
                                    <svg className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        {/* MODE 2: GROCERIES */}
        {mode === 'ingredients' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGroceries.length === 0 && <div className="col-span-full py-20 text-center"><div className="inline-block p-4 rounded-full bg-gray-50 mb-3 text-2xl">🥕</div><p className="text-gray-900 font-bold">No groceries found.</p></div>}
                
                {filteredGroceries.map(item => {
                    const { isSafe, conflicts } = checkSafety(item);
                    return (
                        <div key={item.id} onClick={() => setSelectedIngredient(item)} className="group relative bg-white rounded-[2rem] border border-gray-100 shadow-[0_2px_15px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_-5px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col">
                            {/* Full Bleed Image */}
                            <div className="h-48 w-full bg-gray-50 relative overflow-hidden">
                                <img 
                                    src={item.image} 
                                    alt={item.name} 
                                    onError={handleImageError} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                />
                                <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm border border-white/20 ${isSafe ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'}`}>
                                    {isSafe ? 'Safe' : 'Avoid'}
                                </div>
                            </div>
                            
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="mb-1">
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-1">{item.brand}</p>
                                    <h3 className="font-extrabold text-xl text-gray-900 leading-tight line-clamp-2">{item.name}</h3>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-gray-500">
                                    {/* SAFELY CHECK FOR NUTRITION DATA */}
                                    {item.nutrition ? (
                                        <div className="flex gap-3">
                                            <span>🔥 {item.nutrition.calories || 'N/A'} Cal</span>
                                            <span>💪 {item.nutrition.protein || '0g'} Pro</span>
                                        </div>
                                    ) : (
                                        <span className="opacity-50">View Details</span>
                                    )}
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

      {/* --- NUTRITION MODAL --- */}
      {selectedIngredient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-[2.5rem] p-6 md:p-8 w-full max-w-md shadow-2xl relative animate-slide-up">
                  <button onClick={() => setSelectedIngredient(null)} className="absolute top-4 right-4 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">✕</button>

                  <div className="text-center mb-6">
                      <div className="h-24 w-24 mx-auto rounded-full bg-gray-50 mb-4 overflow-hidden shadow-sm border-4 border-white">
                          <img src={selectedIngredient.image} onError={handleImageError} alt={selectedIngredient.name} className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-2xl font-black text-gray-900 leading-tight mb-1">{selectedIngredient.name}</h2>
                      <p className="text-gray-500 font-bold uppercase text-sm tracking-wide">{selectedIngredient.brand}</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-6">
                      <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-4 border-b border-gray-200 pb-2">Nutrition Facts</h3>
                      
                      {/* SAFE ACCESS TO NUTRITION DATA */}
                      {selectedIngredient.nutrition ? (
                          <div className="space-y-3 text-sm">
                              <div className="flex justify-between items-center"><span className="font-bold text-gray-600">Calories</span><span className="font-black text-xl text-gray-900">{selectedIngredient.nutrition.calories || 'N/A'}</span></div>
                              <div className="w-full h-px bg-gray-200"></div>
                              <div className="flex justify-between items-center"><span className="font-medium text-gray-500">Protein</span><span className="font-bold text-gray-900">{selectedIngredient.nutrition.protein || 'N/A'}</span></div>
                              <div className="flex justify-between items-center"><span className="font-medium text-gray-500">Total Fat</span><span className="font-bold text-gray-900">{selectedIngredient.nutrition.fat || 'N/A'}</span></div>
                              <div className="flex justify-between items-center"><span className="font-medium text-gray-500">Carbs</span><span className="font-bold text-gray-900">{selectedIngredient.nutrition.carbs || 'N/A'}</span></div>
                          </div>
                      ) : <div className="text-center text-gray-400 text-sm">No data available</div>}
                  </div>

                  {(() => {
                      const { isSafe, conflicts } = checkSafety(selectedIngredient);
                      return (
                          <div className={`p-4 rounded-xl border flex items-start gap-3 ${isSafe ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                             <span className="text-2xl">{isSafe ? '👍' : '⚠️'}</span>
                             <div>
                                 <h3 className={`font-bold text-sm ${isSafe ? 'text-emerald-800' : 'text-rose-800'}`}>{isSafe ? 'Safe Choice' : 'Conflict Warning'}</h3>
                                 <p className={`text-xs mt-1 ${isSafe ? 'text-emerald-600' : 'text-rose-600'}`}>{isSafe ? 'No allergens detected.' : `Contains: ${conflicts.join(', ')}`}</p>
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