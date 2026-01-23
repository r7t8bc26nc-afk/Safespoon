import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { getAuth } from "firebase/auth";
import { collection, getDocs, doc, updateDoc, arrayRemove } from "firebase/firestore";

const LOGO_DEV_PUBLIC_KEY = 'pk_AnZTwqMTQ1ia9Btg_pILzg';

// --- MOCK RECIPES (Matching Recipes.jsx) ---
const MOCK_RECIPES = [
  {
    id: 'r1',
    name: 'Quinoa Salad Bowl',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    time: '15 min',
    category: 'Lunch',
    tags: ['Vegan', 'Gluten Free'],
  },
  {
    id: 'r2',
    name: 'Classic Beef Burger',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    time: '25 min',
    category: 'Dinner',
    tags: ['High Protein'],
  },
  {
    id: 'r3',
    name: 'Thai Green Curry',
    image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=80',
    time: '35 min',
    category: 'Dinner',
    tags: ['Spicy', 'Dairy Free'],
  },
  {
    id: 'r4',
    name: 'Gluten-Free Pancakes',
    image: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80',
    time: '20 min',
    category: 'Breakfast',
    tags: ['Breakfast', 'Gluten Free'],
  }
];

export const Favorites = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState('restaurants');
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Restaurants (Real Data)
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "restaurants"));
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRestaurants(docs);
      } catch (err) {
        console.error("Error fetching restaurants:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  // 2. Filter Data based on User Favorites
  const favoriteIds = userProfile?.favorites || [];
  
  const savedRestaurants = restaurants.filter(r => favoriteIds.includes(r.id));
  const savedRecipes = MOCK_RECIPES.filter(r => favoriteIds.includes(r.id));

  const displayList = activeTab === 'restaurants' ? savedRestaurants : savedRecipes;

  const getLogoUrl = (name) => {
    if (!name) return '';
    const domain = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}&size=100&format=png`;
  };

  // 3. Remove Logic
  const handleRemove = async (e, itemId) => {
    e.stopPropagation();
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    try {
        await updateDoc(userRef, {
            favorites: arrayRemove(itemId)
        });
    } catch (err) {
        console.error("Error removing favorite:", err);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-24 relative">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-50 rounded-full blur-[100px] -z-10 opacity-50 mix-blend-multiply animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-50 rounded-full blur-[100px] -z-10 opacity-50 mix-blend-multiply"></div>

      {/* --- HERO HEADER --- */}
      <div className="pt-6 space-y-8 mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none mb-2">
                    Favorites
                </h1>
                <p className="text-lg text-gray-500 font-medium">
                    Your saved spots and recipes.
                </p>
            </div>
            
            {/* Toggle Switch */}
            <div className="bg-white p-1.5 rounded-full shadow-[0_8px_20px_rgb(0,0,0,0.06)] border border-gray-100 flex w-full md:w-auto">
                <button 
                    onClick={() => setActiveTab('restaurants')}
                    className={`flex-1 md:flex-none px-8 py-3 rounded-full text-sm font-extrabold transition-all duration-300 ${activeTab === 'restaurants' ? 'bg-gray-900 text-white shadow-lg transform scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Restaurants
                </button>
                <button 
                    onClick={() => setActiveTab('recipes')}
                    className={`flex-1 md:flex-none px-8 py-3 rounded-full text-sm font-extrabold transition-all duration-300 ${activeTab === 'recipes' ? 'bg-gray-900 text-white shadow-lg transform scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Recipes
                </button>
            </div>
        </div>
      </div>

      {/* --- CONTENT GRID --- */}
      {displayList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center opacity-60">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-4xl">
                  {activeTab === 'restaurants' ? '🍽️' : '👨‍🍳'}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No favorites yet</h3>
              <p className="text-gray-500 max-w-sm">
                  Go to the {activeTab === 'restaurants' ? 'Explorer' : 'Recipe Hub'} to start building your collection.
              </p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayList.map((item) => (
                  <div 
                      key={item.id} 
                      className={`
                          group bg-white rounded-[2.5rem] p-6 cursor-pointer border border-gray-100 relative overflow-hidden transition-all duration-500
                          shadow-[0_2px_12px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_-5px_rgb(0,0,0,0.1)] hover:-translate-y-2
                      `}
                  >
                        {/* --- RESTAURANT CARD STYLE --- */}
                        {activeTab === 'restaurants' && (
                            <>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="h-16 w-16 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-500 p-2">
                                        <img 
                                            src={getLogoUrl(item.name)} 
                                            alt="logo" 
                                            className="w-full h-full object-cover rounded-full"
                                            onError={(e) => e.target.style.display='none'}
                                        />
                                    </div>
                                    <button 
                                        onClick={(e) => handleRemove(e, item.id)}
                                        className="h-10 w-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center transition-all hover:bg-rose-500 hover:text-white"
                                        title="Remove"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                    </button>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-2xl font-extrabold text-gray-900 mb-1 leading-tight">{item.name}</h3>
                                    <p className="text-gray-400 font-bold text-sm">{item.category || "Restaurant"}</p>
                                </div>

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                                    <span className="flex items-center gap-1.5 bg-violet-50 text-violet-700 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider">
                                        ★ {item.rating || "New"}
                                    </span>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Saved</span>
                                </div>
                            </>
                        )}

                        {/* --- RECIPE CARD STYLE --- */}
                        {activeTab === 'recipes' && (
                            <>
                                <div className="h-48 rounded-[2rem] overflow-hidden relative mb-4 shadow-sm group-hover:shadow-md transition-all">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                                    
                                    <div className="absolute top-3 right-3">
                                        <button 
                                            onClick={(e) => handleRemove(e, item.id)}
                                            className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-rose-500 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                        </button>
                                    </div>

                                    <div className="absolute bottom-3 left-4">
                                        <span className="bg-white/90 backdrop-blur text-gray-900 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                                            {item.category}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-xl font-extrabold text-gray-900 leading-tight">{item.name}</h3>
                                        <span className="text-xs font-bold text-gray-400 whitespace-nowrap pt-1">⏱ {item.time}</span>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {item.tags?.slice(0, 2).map(tag => (
                                            <span key={tag} className="bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};