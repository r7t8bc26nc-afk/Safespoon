import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Helmet } from "react-helmet-async"; 
import { motion, AnimatePresence } from 'framer-motion';
// Ensure this service is created as per previous steps
import { searchRestaurantMenu } from '../Services/RestaurantService';

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

// --- CONFIG ---
const CACHE_KEY = 'safespoon_meal_hub_v1';
const CACHE_DURATION = 1000 * 60 * 60 * 4; // 4 Hours
const LOGO_DEV_PUBLIC_KEY = 'pk_AnZTwqMTQ1ia9Btg_pILzg'; // Your Key

// --- DYNAMIC DATA ---
// Just add names here. The app will fetch Logos & Menus automatically.
const POPULAR_CHAINS = [
    "Chipotle", 
    "Starbucks", 
    "Sweetgreen", 
    "Panera Bread", 
    "Chick-fil-A", 
    "Taco Bell",
    "Subway",
    "McDonald's"
];

// --- HELPERS ---
const getLogoUrl = (brandName) => {
    if (!brandName) return '';
    // heuristic: guess the domain based on name (e.g. "Taco Bell" -> "tacobell.com")
    const domain = brandName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}&size=200&format=png`;
};

const ColoredIcon = ({ src, colorClass, sizeClass = "w-4 h-4" }) => (
  <div className={`${sizeClass} ${colorClass}`} style={{ WebkitMaskImage: `url("${src}")`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: `url("${src}")`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', backgroundColor: 'currentColor' }} />
);

// --- SAFETY & SEGMENTATION LOGIC ---
const SAFETY_KEYWORDS = {
    gluten: ['wheat', 'flour', 'bread', 'bun', 'pasta', 'crust', 'soy sauce', 'barley', 'malt', 'rye'],
    dairy: ['milk', 'cheese', 'cream', 'butter', 'yogurt', 'whey', 'casein', 'lactose'],
    nuts: ['peanut', 'almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio', 'macadamia'],
    shellfish: ['shrimp', 'crab', 'lobster', 'prawn', 'oyster', 'clam', 'mussel', 'scallop'],
    vegan: ['meat', 'chicken', 'beef', 'pork', 'fish', 'egg', 'honey', 'dairy', 'cheese', 'milk', 'bacon'],
    vegetarian: ['meat', 'chicken', 'beef', 'pork', 'fish', 'bacon']
};

const filterMenuForUser = (items, profile) => {
    if (!profile) return items;
    const restrictions = [...(profile.allergies || []), ...(profile.dietaryPreferences || [])].map(r => r.toLowerCase());
    
    return items.filter(item => {
        const text = `${item.name} ${item.description}`.toLowerCase();
        for (const res of restrictions) {
            let key = null;
            if (res.includes('gluten')) key = 'gluten';
            else if (res.includes('dairy') || res.includes('lactose')) key = 'dairy';
            else if (res.includes('nut')) key = 'nuts';
            else if (res.includes('shellfish')) key = 'shellfish';
            else if (res.includes('vegan')) key = 'vegan';
            else if (res.includes('vegetarian')) key = 'vegetarian';

            if (key && SAFETY_KEYWORDS[key] && SAFETY_KEYWORDS[key].some(k => text.includes(k))) return false;
        }
        return true;
    });
};

const segmentMenu = (items) => {
    const segments = { meals: [], sides: [], drinks: [] };
    items.forEach(item => {
        const name = item.name.toLowerCase();
        if (name.match(/drink|soda|juice|coffee|tea|latte|water|beverage|shake|smoothie/)) segments.drinks.push(item);
        else if (name.match(/side|fries|chips|soup|cookie|brownie|muffin|croissant|snack|cake/)) segments.sides.push(item);
        else segments.meals.push(item);
    });
    return segments;
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
                <p className="text-[10px] font-bold text-slate-400 capitalize tracking-tight">Unlock AI recipes</p>
            </div>
        </div>
        <button className="px-5 py-2.5 bg-emerald-600 text-emerald-50 text-[10px] font-bold capitalize tracking-tight rounded-xl active:scale-95 transition-transform whitespace-nowrap shadow-md shadow-slate-200">
            Upgrade Now
        </button>
    </div>
);

const RecipeRow = ({ title, recipes, loading, onRefresh, navigate, onItemClick }) => (
  <section className="mb-10" aria-label={title}>
      <div className="flex justify-between items-center px-6 mb-5">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
          {onRefresh && (
            <button onClick={onRefresh} className="h-8 w-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors active:rotate-180 duration-500">
                <div className={loading ? 'animate-spin' : ''}>
                    <ColoredIcon src={refreshIcon} colorClass="bg-current" sizeClass="w-4 h-4" />
                </div>
            </button>
          )}
      </div>

      <div className="flex overflow-x-auto gap-4 px-6 no-scrollbar pb-4 min-h-[220px]">
          {loading && recipes.length === 0 ? (
             [1,2,3].map(i => <div key={i} className="shrink-0 w-72 h-48 bg-slate-50 border border-slate-100 rounded-[2rem] animate-pulse" />)
          ) : (
            recipes.map(recipe => (
              <article 
                key={recipe.id} 
                onClick={() => onItemClick ? onItemClick(recipe) : navigate(`/recipe/${recipe.id}`)} 
                className="shrink-0 w-72 group cursor-pointer active:scale-95 transition-transform"
              >
                  <div className="relative h-48 w-full rounded-[2rem] overflow-hidden mb-3 shadow-sm border border-slate-100 bg-slate-100">
                      <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover transition-opacity duration-300" loading="lazy" />
                      <div className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
                          <ColoredIcon src={heartIcon} colorClass="bg-slate-900" sizeClass="w-3.5 h-3.5" />
                      </div>
                  </div>
                  <h4 className="px-1 font-black text-slate-900 text-sm leading-tight truncate">{recipe.name}</h4>
                  <div className="px-1 flex gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                          <ColoredIcon src={clockIcon} colorClass="bg-slate-400" sizeClass="w-3 h-3" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{recipe.time || '15 min'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                          <ColoredIcon src={fireIcon} colorClass="bg-slate-400" sizeClass="w-3 h-3" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{recipe.calories} kcal</span>
                      </div>
                  </div>
              </article>
          )))}
      </div>
  </section>
);

const RestaurantMenuModal = ({ restaurantName, items, onClose, userProfile }) => {
    const safeItems = filterMenuForUser(items, userProfile);
    const segmented = segmentMenu(safeItems);
    const [activeTab, setActiveTab] = useState('meals');

    return (
        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 z-[12000] bg-white flex flex-col font-['Switzer']">
            <div className="px-6 pt-14 pb-4 border-b border-slate-50 bg-white/95 backdrop-blur-sm z-10 sticky top-0">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={onClose} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-900 font-bold">✕</button>
                    <div className="text-right">
                        <h2 className="text-xl font-black text-slate-900">{restaurantName}</h2>
                        {userProfile?.dietaryPreferences && userProfile.dietaryPreferences.length > 0 && (
                            <div className="flex items-center justify-end gap-1 mt-1">
                                <ColoredIcon src={leafIcon} colorClass="text-emerald-500" sizeClass="w-3 h-3" />
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                    Safe for {userProfile.dietaryPreferences[0]}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
                    {[ { id: 'meals', label: 'Mains' }, { id: 'sides', label: 'Sides' }, { id: 'drinks', label: 'Drinks' } ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 px-4 rounded-lg text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                                activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50">
                {segmented[activeTab].length === 0 ? (
                    <div className="text-center py-20 opacity-40">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No items match your profile</p>
                    </div>
                ) : (
                    <div className="space-y-4 pb-12">
                        {segmented[activeTab].map(item => (
                            <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{item.name}</h3>
                                    <span className="shrink-0 bg-slate-100 text-slate-600 text-[10px] font-black uppercase px-2 py-1 rounded-md">
                                        {item.macros?.calories || '?'} kcal
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{item.description}</p>
                                <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-50">
                                    <div className="text-center"><span className="block text-[10px] text-slate-400 font-bold uppercase">Pro</span><span className="font-black text-slate-900">{item.macros?.protein || 0}g</span></div>
                                    <div className="text-center"><span className="block text-[10px] text-slate-400 font-bold uppercase">Carb</span><span className="font-black text-slate-900">{item.macros?.carbs || 0}g</span></div>
                                    <div className="text-center"><span className="block text-[10px] text-slate-400 font-bold uppercase">Fat</span><span className="font-black text-slate-900">{item.macros?.fat || 0}g</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const SearchOverlay = ({ isSearching, setIsSearching, searchTerm, setSearchTerm, results, isApiLoading, onSelect }) => {
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
                            <input autoFocus type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-10 bg-slate-100 rounded-xl pl-10 pr-4 font-medium text-slate-700 outline-none text-sm" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-5 py-4">
                        {results.groceries.length > 0 && (
                            <div className="mb-6"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Pantry</h3><div className="space-y-3">{results.groceries.map(g => (<article key={g.id} onClick={() => onSelect(g, 'grocery')} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl active:bg-slate-100 transition-colors cursor-pointer"><div className="w-14 h-14 rounded-xl bg-white border border-slate-100 flex items-center justify-center"><ColoredIcon src={storeIcon} colorClass="bg-slate-300" sizeClass="w-6 h-6" /></div><div><h4 className="font-bold text-slate-900 text-sm">{g.name}</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{g.brand || 'Generic'}</p></div></article>))}</div></div>
                        )}
                        {(results.recipes.length > 0 || isApiLoading) && (
                            <div><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Global</h3><div className="space-y-3">{results.recipes.map(r => (<article key={r.id} onClick={() => onSelect(r, 'recipe')} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl active:bg-slate-100 transition-colors cursor-pointer"><img src={r.image} className="w-14 h-14 rounded-xl object-cover bg-white" alt={r.name} /><div><h4 className="font-bold text-slate-900 text-sm">{r.name}</h4><div className="flex items-center gap-2 mt-1"><ColoredIcon src={fireIcon} colorClass="bg-slate-400" sizeClass="w-3 h-3" /><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{r.calories} kcal</p></div></div></article>))}</div></div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export const MealHub = ({ userProfile, onOpenMenu }) => {
  const navigate = useNavigate();
  
  // UI States
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Restaurant States
  const [selectedRestaurantName, setSelectedRestaurantName] = useState(null);
  const [restaurantMenu, setRestaurantMenu] = useState([]);
  const [isMenuLoading, setIsMenuLoading] = useState(false);

  // --- HANDLERS ---
  const handleRestaurantSelect = async (name) => {
      setSelectedRestaurantName(name); 
      setIsMenuLoading(true);
      try {
          const res = await searchRestaurantMenu(name);
          setRestaurantMenu(res.items || []);
      } catch (e) { console.error(e); } 
      finally { setIsMenuLoading(false); }
  };

  const getInitialState = (key, fallback) => {
      try {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed.data) return parsed.data[key] || fallback;
          }
      } catch (e) {}
      return fallback;
  };

  const [featuredRecipes, setFeaturedRecipes] = useState(() => getInitialState('featured', []));
  const [breakfastRecipes, setBreakfastRecipes] = useState(() => getInitialState('breakfast', []));
  const [goalRecipes, setGoalRecipes] = useState(() => getInitialState('goalRecipes', []));
  const [goalTitle, setGoalTitle] = useState(() => getInitialState('goalTitle', 'Recommended For You'));
  const [vegRecipes, setVegRecipes] = useState(() => getInitialState('veg', []));
  const [treatRecipes, setTreatRecipes] = useState(() => getInitialState('treat', []));
  const [drinkRecipes, setDrinkRecipes] = useState(() => getInitialState('drinks', []));
  
  const [isRefreshing, setIsRefreshing] = useState(featuredRecipes.length === 0);
  const [allGroceries, setAllGroceries] = useState([]);
  const [searchResults, setSearchResults] = useState({ recipes: [], groceries: [] });
  const [isSearchingAPI, setIsSearchingAPI] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "groceries"), orderBy("lastUpdated", "desc"), limit(500));
    return onSnapshot(q, (snapshot) => {
      setAllGroceries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const fetchRecipesByUrl = async (url, count = 5, isDrink = false) => {
      try {
        const res = await fetch(url);
        const data = await res.json();
        const items = isDrink ? data.drinks : data.meals;
        const list = items || [];
        const shuffled = list.sort(() => 0.5 - Math.random()).slice(0, count);
        return shuffled.map(m => ({
            id: isDrink ? m.idDrink : m.idMeal,
            name: isDrink ? m.strDrink : m.strMeal,
            image: isDrink ? m.strDrinkThumb : m.strMealThumb,
            time: isDrink ? '5 min' : `${Math.floor(Math.random() * (45 - 15) + 15)} min`,
            calories: Math.floor(Math.random() * (isDrink ? (250 - 80) + 80 : (700 - 300) + 300))
        }));
      } catch (e) { return []; }
  };

  const loadAllSections = async (forceRefresh = false) => {
    const userGoal = userProfile?.goalType || 'maintain'; 
    if (!forceRefresh) {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            const { timestamp, goal } = JSON.parse(cachedData);
            const isFresh = (Date.now() - timestamp) < CACHE_DURATION;
            if (isFresh && (goal === userGoal || !userProfile)) {
                setIsRefreshing(false);
                return; 
            }
        }
    }

    setIsRefreshing(true);
    let goalCategory = 'Chicken'; 
    let dynamicTitle = 'High-Performance Protein';

    if (userGoal === 'lose') {
        goalCategory = Math.random() > 0.5 ? 'Chicken' : 'Seafood';
        dynamicTitle = 'Lean Fuel (Fat Loss)';
    } else if (userGoal === 'gain') {
        goalCategory = Math.random() > 0.5 ? 'Beef' : 'Pasta';
        dynamicTitle = 'Mass Builder (High Calorie)';
    } else {
        goalCategory = Math.random() > 0.5 ? 'Pork' : 'Lamb';
        dynamicTitle = 'Balanced Maintenance';
    }
    setGoalTitle(dynamicTitle);

    try {
        const [randomData, breakfast, goal, veg, drinks, treats] = await Promise.all([
            Promise.all(Array.from({ length: 5 }).map(() => fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(r => r.json()))),
            fetchRecipesByUrl('https://www.themealdb.com/api/json/v1/1/filter.php?c=Breakfast'),
            fetchRecipesByUrl(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${goalCategory}`),
            fetchRecipesByUrl('https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian'),
            fetchRecipesByUrl('https://www.thecocktaildb.com/api/json/v1/1/filter.php?c=Cocktail', 5, true),
            fetchRecipesByUrl('https://www.themealdb.com/api/json/v1/1/filter.php?c=Dessert')
        ]);

        const formattedFeatured = randomData.map(r => r.meals?.[0]).filter(Boolean).map(m => ({
            id: m.idMeal, name: m.strMeal, image: m.strMealThumb, time: '20 min', calories: Math.floor(Math.random() * 300 + 300)
        }));

        setFeaturedRecipes(formattedFeatured);
        setBreakfastRecipes(breakfast);
        setGoalRecipes(goal);
        setVegRecipes(veg);
        setDrinkRecipes(drinks);
        setTreatRecipes(treats);

        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            goal: userGoal,
            data: {
                featured: formattedFeatured,
                breakfast,
                goalRecipes: goal,
                goalTitle: dynamicTitle,
                veg,
                drinks,
                treat: treats
            }
        }));

    } catch (err) { console.error("Load Error", err); } finally { setIsRefreshing(false); }
  };

  useEffect(() => { loadAllSections(); }, [userProfile?.goalType]);

  useEffect(() => {
    if (!searchTerm.trim()) return;
    const delay = setTimeout(async () => {
        setIsSearchingAPI(true);
        const matchedGroceries = allGroceries.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));
        let matchedRecipes = [];
        try {
            const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${searchTerm}`);
            const data = await res.json();
            if (data.meals) matchedRecipes = data.meals.map(m => ({ id: m.idMeal, name: m.strMeal, image: m.strMealThumb, calories: 450 })).slice(0, 10);
        } catch (e) {}
        setSearchResults({ recipes: matchedRecipes, groceries: matchedGroceries });
        setIsSearchingAPI(false);
    }, 400);
    return () => clearTimeout(delay);
  }, [searchTerm, allGroceries]);

  const handleFoodSelect = async (recipe, categoryList) => {
      try {
          const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${recipe.id}`);
          const data = await res.json();
          const fullMeal = data.meals ? data.meals[0] : null;
          if (!fullMeal) return;
          
          const ingredientsList = [];
          for (let i = 1; i <= 20; i++) {
              const ing = fullMeal[`strIngredient${i}`];
              const measure = fullMeal[`strMeasure${i}`];
              if (ing && ing.trim()) ingredientsList.push(measure ? `${measure.trim()} ${ing.trim()}` : ing.trim());
          }

          const related = categoryList ? categoryList.filter(r => r.id !== recipe.id).slice(0, 5) : [];
          
          const menuData = {
              id: recipe.id, 
              name: fullMeal.strMeal,
              image: fullMeal.strMealThumb,
              brand: fullMeal.strArea ? `${fullMeal.strArea} Cuisine` : "International",
              taxonomy: { category: fullMeal.strCategory || "General" },
              safetyProfile: { allergens: {} },
              ingredients: ingredientsList.join(', '),
              macros: { calories: recipe.calories, carbs: 45, protein: 25, fat: 15 },
              relatedItems: related, 
              type: 'food' 
          };
          onOpenMenu(menuData);
      } catch (e) {}
  };

  const handleDrinkSelect = async (drink) => {
      try {
          const res = await fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${drink.id}`);
          const data = await res.json();
          const fullDrink = data.drinks ? data.drinks[0] : null;
          if (!fullDrink) return;
          const related = drinkRecipes.filter(d => d.id !== drink.id).slice(0, 5);
          const menuData = {
              id: drink.id,
              name: fullDrink.strDrink,
              image: fullDrink.strDrinkThumb,
              brand: "Mixology",
              macros: { calories: drink.calories, carbs: 15, protein: 0, fat: 0 },
              ingredients: "Various Spirits",
              relatedItems: related,
              type: 'drink'
          };
          onOpenMenu(menuData);
      } catch (e) {}
  };

  return (
    <main className="w-full pb-6 font-['Switzer'] bg-gray-50 min-h-screen text-slate-900">
      <Helmet><title>Meal Hub | Smart Nutrition Planner</title></Helmet>

      {/* --- RESTAURANT OVERLAY --- */}
      <AnimatePresence>
        {selectedRestaurantName && (
            <RestaurantMenuModal 
                restaurantName={selectedRestaurantName}
                items={restaurantMenu}
                userProfile={userProfile}
                onClose={() => { setSelectedRestaurantName(null); setRestaurantMenu([]); }}
            />
        )}
      </AnimatePresence>

      <SearchOverlay 
        isSearching={isSearching} setIsSearching={setIsSearching}
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        results={searchResults} isApiLoading={isSearchingAPI}
        onSelect={(item, type) => type === 'recipe' ? handleFoodSelect(item, featuredRecipes) : onOpenMenu(item)}
      />

      <header className="pt-8 pb-2 px-6">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Smart Nutrition & Meal Planner</p>
          <h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">
              Discover Your Next<br/>Healthy Meal
          </h1>
      </header>

      <div className="px-6 mb-10">
          <button onClick={() => setIsSearching(true)} className="w-full h-12 bg-slate-200/60 rounded-xl flex items-center px-4 active:bg-slate-200 transition-colors">
              <div className="text-slate-500 mr-3"><ColoredIcon src={searchIcon} colorClass="bg-current" sizeClass="w-4 h-4" /></div>
              <span className="text-sm font-medium text-slate-500">Search ingredients, diets, or cravings...</span>
          </button>
      </div>

      {/* --- DYNAMIC RESTAURANT ROW --- */}
      <section className="mb-10 pl-6">
           <div className="flex justify-between items-center pr-6 mb-5">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Popular Restaurants</h3>
              <div className="flex items-center gap-1 opacity-50">
                  <ColoredIcon src={chefIcon} colorClass="bg-slate-400" sizeClass="w-3 h-3" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Verified Menus</span>
              </div>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 pr-6">
              {POPULAR_CHAINS.map((name, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleRestaurantSelect(name)}
                    className="shrink-0 w-32 h-32 bg-white rounded-3xl border border-slate-100 p-4 flex flex-col items-center justify-center gap-3 shadow-sm active:scale-95 transition-transform"
                  >
                      <img 
                        src={getLogoUrl(name)} 
                        className="w-12 h-12 object-contain drop-shadow-sm" 
                        alt={name} 
                        onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/706/706164.png'}
                      />
                      <h4 className="font-bold text-slate-900 text-xs text-center leading-tight">{name}</h4>
                  </button>
              ))}
          </div>
      </section>

      <RecipeRow title="Chef's Daily Selections" recipes={featuredRecipes} loading={isRefreshing && featuredRecipes.length === 0} navigate={navigate} onRefresh={() => loadAllSections(true)} onItemClick={(item) => handleFoodSelect(item, featuredRecipes)} />
      <RecipeRow title="Morning Momentum" recipes={breakfastRecipes} loading={isRefreshing && breakfastRecipes.length === 0} navigate={navigate} onItemClick={(item) => handleFoodSelect(item, breakfastRecipes)} />
      <RecipeRow title={goalTitle} recipes={goalRecipes} loading={isRefreshing && goalRecipes.length === 0} navigate={navigate} onItemClick={(item) => handleFoodSelect(item, goalRecipes)} />
      <RecipeRow title="Plant-Based Power" recipes={vegRecipes} loading={isRefreshing && vegRecipes.length === 0} navigate={navigate} onItemClick={(item) => handleFoodSelect(item, vegRecipes)} />
      <RecipeRow title="Mindful Mixology" recipes={drinkRecipes} loading={isRefreshing && drinkRecipes.length === 0} navigate={navigate} onItemClick={handleDrinkSelect} />
      <RecipeRow title="Weekend Indulgence" recipes={treatRecipes} loading={isRefreshing && treatRecipes.length === 0} navigate={navigate} onItemClick={(item) => handleFoodSelect(item, treatRecipes)} />

      <CompactUpgradeBanner />
    </main>
  );
};