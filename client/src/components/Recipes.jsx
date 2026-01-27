import React, { useState } from 'react';
import { db } from '../firebase';
import { getAuth } from "firebase/auth"; 
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

// --- MOCK RECIPE DATA ---
const MOCK_RECIPES = [
  {
    id: 'r1',
    name: 'Quinoa Salad Bowl',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    time: '15 min',
    category: 'Lunch',
    calories: 320,
    tags: ['Vegan', 'Gluten Free'],
    ingredients: ['Quinoa', 'Cucumber', 'Cherry Tomatoes', 'Lemon Juice', 'Olive Oil', 'Parsley'],
    instructions: ['Cook quinoa...', 'Chop veggies...', 'Mix...', 'Season...']
  },
  {
    id: 'r2',
    name: 'Classic Beef Burger',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    time: '25 min',
    category: 'Dinner',
    calories: 650,
    tags: ['High Protein'],
    ingredients: ['Ground Beef', 'Burger Bun', 'Lettuce', 'Tomato', 'Cheddar Cheese', 'Ketchup'],
    instructions: ['Form patties...', 'Grill...', 'Toast buns...', 'Assemble...']
  },
  {
    id: 'r3',
    name: 'Thai Green Curry',
    image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=80',
    time: '35 min',
    category: 'Dinner',
    calories: 480,
    tags: ['Spicy', 'Dairy Free'],
    ingredients: ['Chicken Breast', 'Coconut Milk', 'Green Curry Paste', 'Bamboo Shoots', 'Basil', 'Rice'],
    instructions: ['Sauté paste...', 'Add chicken...', 'Simmer...', 'Serve...']
  },
  {
    id: 'r4',
    name: 'Gluten-Free Pancakes',
    image: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80',
    time: '20 min',
    category: 'Breakfast',
    calories: 350,
    tags: ['Breakfast', 'Gluten Free'],
    ingredients: ['GF Flour Blend', 'Almond Milk', 'Eggs', 'Maple Syrup', 'Vanilla Extract'],
    instructions: ['Whisk...', 'Pour...', 'Flip...', 'Serve...']
  }
];

export const Recipes = ({ userProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  
  // --- FAVORITE LOGIC ---
  const handleToggleFavorite = async (e, recipeId) => {
    e.stopPropagation(); 
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
        console.error("User not authenticated");
        return;
    }

    const userRef = doc(db, "users", user.uid);
    const isFavorite = userProfile?.favorites?.includes(recipeId);

    try {
        if (isFavorite) {
            await updateDoc(userRef, { favorites: arrayRemove(recipeId) });
        } else {
            await updateDoc(userRef, { favorites: arrayUnion(recipeId) });
        }
    } catch (err) {
        console.error("Error updating favorites:", err);
    }
  };

  const checkRecipeSafety = (recipe) => {
    const userRestrictions = (userProfile?.restrictions || []).map(r => r.toLowerCase());
    const conflicts = [];
    recipe.ingredients.forEach(ing => {
        const ingLower = ing.toLowerCase();
        userRestrictions.forEach(r => {
            if (ingLower.includes(r)) {
                if (!conflicts.includes(r)) conflicts.push(r);
            }
            if (r === 'beef' && ingLower.includes('beef')) { if (!conflicts.includes('Beef')) conflicts.push('Beef'); }
            if (r === 'gluten' && (ingLower.includes('bun') || ingLower.includes('bread') || ingLower.includes('flour')) && !recipe.tags.includes('Gluten Free')) { 
                if (!conflicts.includes('Gluten')) conflicts.push('Gluten (suspected)'); 
            }
        });
    });
    return { isSafe: conflicts.length === 0, conflicts };
  };

  const filteredRecipes = MOCK_RECIPES.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.ingredients.some(ing => ing.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = activeCategory === 'All' || r.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];

  // --- DETAIL VIEW ---
  if (selectedRecipe) {
    const { isSafe, conflicts } = checkRecipeSafety(selectedRecipe);
    const isFavorite = userProfile?.favorites?.includes(selectedRecipe.id);

    return (
        <div className="max-w-4xl mx-auto pb-24">
            <button onClick={() => setSelectedRecipe(null)} className="mb-4 flex items-center gap-2 text-gray-500 font-bold hover:text-black">
                ← Back to Recipes
            </button>
            
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                <div className="h-64 md:h-80 w-full relative">
                    <img src={selectedRecipe.image} alt={selectedRecipe.name} className="w-full h-full object-cover" />
                    
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                         <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                            ⏱ {selectedRecipe.time}
                        </div>
                        <button 
                            onClick={(e) => handleToggleFavorite(e, selectedRecipe.id)}
                            className={`h-10 w-10 rounded-full flex items-center justify-center shadow-md transition-all ${isFavorite ? 'bg-rose-500 text-white' : 'bg-white text-gray-400 hover:bg-gray-100'}`}
                        >
                            <svg className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                        </button>
                    </div>
                </div>
                
                <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{selectedRecipe.name}</h1>
                            <div className="flex flex-wrap gap-2">
                                <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-bold uppercase">{selectedRecipe.category}</span>
                                {selectedRecipe.tags.map(tag => (
                                    <span key={tag} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold uppercase">{tag}</span>
                                ))}
                            </div>
                        </div>
                        <div>
                            {isSafe ? (
                                <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl border border-emerald-100 flex items-center gap-2">
                                    <span className="text-2xl">👍</span>
                                    <div><p className="font-bold text-sm">Safe for you</p><p className="text-xs opacity-80">No conflicts found.</p></div>
                                </div>
                            ) : (
                                <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl border border-rose-100 flex items-center gap-2">
                                    <span className="text-2xl">⚠️</span>
                                    <div><p className="font-bold text-sm">Conflict Warning</p><p className="text-xs opacity-80">Contains: {conflicts.join(', ')}</p></div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Ingredients</h3>
                            <ul className="space-y-3">
                                {selectedRecipe.ingredients.map((ing, i) => (
                                    <li key={i} className="flex items-center gap-3 text-gray-700 text-sm font-medium"><div className="w-1.5 h-1.5 rounded-full bg-violet-400"></div>{ing}</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Instructions</h3>
                            <div className="space-y-6">
                                {selectedRecipe.instructions.map((step, i) => (
                                    <div key={i} className="flex gap-4"><span className="flex-shrink-0 h-6 w-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold mt-0.5">{i + 1}</span><p className="text-gray-600 text-sm leading-relaxed">{step}</p></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* 1. Header (Downsized to text-2xl/3xl) */}
      <div className="pt-2">
       
      </div>

      {/* 2. Search Bar (Moved ABOVE Categories) */}
      <div className="relative w-full">
         <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
         </div>
         <input 
            type="text" 
            placeholder="Search by dish or ingredient..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-gray-100 rounded-xl pl-12 pr-4 py-4 font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all" 
         />
      </div>

      {/* 3. Categories (Now below Search) */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
         {categories.map(cat => (
             <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)} 
                className={`
                    whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all border 
                    ${activeCategory === cat 
                        ? 'bg-gray-900 text-white border-gray-900 shadow-md' 
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }
                `}
            >
                {cat}
            </button>
         ))}
      </div>

      {/* 4. Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.length === 0 && (
              <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border-dashed border border-gray-200">
                  <p className="text-gray-400 font-bold">No recipes found.</p>
              </div>
          )}

          {filteredRecipes.map((recipe) => {
              const { isSafe } = checkRecipeSafety(recipe);
              const isFavorite = userProfile?.favorites?.includes(recipe.id);

              return (
                <div key={recipe.id} onClick={() => setSelectedRecipe(recipe)} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative">
                    <div className="h-48 overflow-hidden relative">
                        <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-3 left-3">
                             {isSafe ? <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">SAFE</span> : <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">CONFLICT</span>}
                        </div>
                        <button 
                            onClick={(e) => handleToggleFavorite(e, recipe.id)}
                            className={`absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center shadow-sm transition-all ${isFavorite ? 'bg-rose-500 text-white' : 'bg-white text-gray-400 hover:text-rose-500'}`}
                        >
                            <svg className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                        </button>
                    </div>
                    <div className="p-5">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-violet-700 transition-colors">{recipe.name}</h3>
                            <span className="text-xs font-bold text-gray-400 whitespace-nowrap ml-2">⏱ {recipe.time}</span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{recipe.ingredients.join(', ')}</p>
                        <div className="flex gap-2">
                             {recipe.tags.slice(0, 2).map(tag => (
                                 <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded font-bold uppercase">{tag}</span>
                             ))}
                        </div>
                    </div>
                </div>
              );
          })}
      </div>
    </div>
  );
};