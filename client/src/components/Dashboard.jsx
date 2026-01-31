import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { db } from '../firebase';
import { collection, query, limit, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { motion, AnimatePresence } from 'framer-motion';

// --- ICON IMPORTS ---
import fireIcon from '../icons/fire.svg';
import dumbbellIcon from '../icons/dumbbell-filled.svg';
import searchIcon from '../icons/search.svg';
import breadIcon from '../icons/bread-slice.svg'; 
import candyIcon from '../icons/candy.svg'; 
import cheeseIcon from '../icons/cheese.svg'; 
import steakIcon from '../icons/steak.svg'; 
import eggIcon from '../icons/eggfried.svg';

// --- CONFIGURATION ---
const LOGO_DEV_PUBLIC_KEY = 'pk_AnZTwqMTQ1ia9Btg_pILzg';
const USDA_API_KEY = '47ccOoSTZvhVDw3YpNh4nGCwSbLs98XOJufWOcY7'; 

// --- HELPER COMPONENTS ---

const ColoredIcon = ({ src, colorClass, sizeClass = "w-6 h-6" }) => (
  <div 
    className={`${sizeClass} ${colorClass}`}
    style={{
      WebkitMaskImage: `url("${src}")`,
      WebkitMaskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskImage: `url("${src}")`,
      maskSize: 'contain',
      maskRepeat: 'no-repeat',
      maskPosition: 'center',
      backgroundColor: 'currentColor'
    }}
  />
);

const ProgressBar = ({ current, max, colorClass, bgClass, height = "h-2" }) => {
  const percent = Math.min(100, Math.max(0, (current / max) * 100));
  return (
    <div className={`w-full ${height} ${bgClass} rounded-full overflow-hidden`}>
      <div 
        className={`h-full ${colorClass} transition-all duration-700 ease-out rounded-full`} 
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};

// --- COMPONENT: DATE STRIP ---
const DateStrip = () => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = new Date().getDay(); 
    
    return (
        <div className="flex justify-between items-center mb-8 px-1">
            {days.map((d, i) => {
                const isActive = i === today;
                return (
                    <div key={i} className="flex flex-col items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400">{d}</span>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${isActive ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 scale-110' : 'bg-white text-slate-300 border border-slate-100'}`}>
                            {new Date(new Date().setDate(new Date().getDate() - (today - i))).getDate()}
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

// --- COMPONENT: STAT CARD ---
const StatCard = ({ icon, colorText, colorBg, label, value, unit, max, progressColor, progressBg }) => {
    return (
        <div className="bg-white rounded-[2rem] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between h-44 relative overflow-hidden group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 border border-slate-50">
            <div className="flex justify-between items-start">
                <div className={`w-10 h-10 rounded-full ${colorBg} ${colorText} flex items-center justify-center`}>
                    <ColoredIcon src={icon} colorClass="bg-current" sizeClass="w-5 h-5" />
                </div>
                {unit === 'kcal' && (
                     <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{unit}</span>
                )}
            </div>

            <div className="mt-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{value}</span>
                <span className="text-sm font-bold text-slate-400 ml-1">{unit !== 'kcal' ? unit : ''}</span>
                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wide">{label}</p>
            </div>

            <div className="mt-auto pt-4">
                 {max && (
                     <div className="flex items-center gap-2">
                        <ProgressBar current={value} max={max} colorClass={progressColor} bgClass={progressBg} />
                        <span className="text-[10px] font-bold text-slate-300">{Math.round((value/max)*100)}%</span>
                     </div>
                 )}
            </div>
        </div>
    );
};

const ModalPortal = ({ children }) => {
    if (typeof document === 'undefined') return null;
    return ReactDOM.createPortal(children, document.body);
};

const SearchOverlay = ({ isSearching, setIsSearching, searchQuery, setSearchQuery, isApiLoading, suggestions, onSelect, recentSearches }) => {
    return (
      <ModalPortal>
        <AnimatePresence>
            {isSearching && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] bg-white flex flex-col font-['Switzer']"
            >
                {/* Search Header */}
                <div className="pt-12 px-5 pb-4 flex items-center gap-3 bg-white border-b border-slate-50">
                    <div className="relative flex-1 group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <ColoredIcon src={searchIcon} colorClass="bg-current" sizeClass="w-5 h-5" />
                        </div>
                        <input 
                            autoFocus 
                            type="search" 
                            placeholder="Search (e.g. Avocado Toast)" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            className="w-full bg-slate-50 focus:bg-white border-none rounded-2xl py-4 pl-12 pr-10 font-bold text-lg text-slate-900 outline-none placeholder:text-slate-300 transition-all ring-0" 
                        />
                        {isApiLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>}
                    </div>
                    <button 
                        onClick={() => { setIsSearching(false); setSearchQuery(''); }} 
                        className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-2xl text-slate-900 font-bold hover:bg-slate-100 transition-colors"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Results List */}
                <div className="flex-1 overflow-y-auto px-5 py-6 no-scrollbar bg-white">
                    {searchQuery.length === 0 && recentSearches.length > 0 && (
                        <section className="mb-8">
                            <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-4">Recent</h3>
                            {recentSearches.map((res, idx) => (
                                <motion.article 
                                    key={`recent-${idx}`} 
                                    onClick={() => onSelect(res)} 
                                    className="flex items-center gap-4 p-4 mb-2 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors"
                                >
                                    <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 bg-white p-1">
                                        <img src={res.logo} alt="" className="w-full h-full object-contain" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/706/706164.png'} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-900 text-sm capitalize">{res.name}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{res.brand}</p>
                                    </div>
                                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-300 font-light text-xl">+</div>
                                </motion.article>
                            ))}
                        </section>
                    )}

                    <section className="space-y-2 pb-20">
                        {suggestions.map((res, i) => (
                            <motion.article 
                                key={res.fdcId || res.id} 
                                onClick={() => onSelect(res)} 
                                className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                            >
                                <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 bg-white p-1 border border-slate-100">
                                    <img src={res.logo} alt="" className="w-full h-full object-contain" loading="lazy" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/706/706164.png'} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-900 text-sm capitalize">{res.name}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{res.brand}</p>
                                </div>
                            </motion.article>
                        ))}
                    </section>
                </div>
            </motion.div>
            )}
        </AnimatePresence>
      </ModalPortal>
    );
};

// --- ICONS MAPPING ---
const ICONS = {
    calories: fireIcon,
    protein: dumbbellIcon,
    carbs: breadIcon,
    fat: cheeseIcon,
    search: searchIcon,
    breakfast: eggIcon,
    lunch: breadIcon,
    dinner: steakIcon,
    snacks: candyIcon
};

const getLogoUrl = (brand) => {
    if (!brand || brand === 'Generic' || brand === 'Foundation') return 'https://cdn-icons-png.flaticon.com/512/706/706164.png';
    const domain = brand.toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '') + '.com';
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}&size=100&format=png`;
};

const Dashboard = ({ profile, setIsSearching, isSearching, setDashboardLocation }) => {
  const [locationName, setLocationName] = useState('Locating...');
  const [locationLoading, setLocationLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [trackingSuccess, setTrackingSuccess] = useState(false);
  const [portionSize, setPortionSize] = useState(1.0);
  const [selectedMeal, setSelectedMeal] = useState('Breakfast');

  // --- DYNAMIC GOALS ---
  const dailyStats = useMemo(() => {
    let bmr = 2000;
    if (profile?.weight && profile?.height && profile?.age && profile?.gender) {
        const weightKg = parseFloat(profile.weight) * 0.453592;
        const heightCm = parseFloat(profile.height) * 2.54;
        const age = parseFloat(profile.age);
        if (profile.gender === 'male') {
            bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
        } else {
            bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
        }
        bmr *= 1.55; 
    }

    const tdee = Math.round(bmr);
    const goals = {
        calories: tdee,
        protein: Math.round((tdee * 0.25) / 4), 
        carbs: Math.round((tdee * 0.45) / 4), 
        fat: Math.round((tdee * 0.30) / 9), 
    };

    const intake = profile?.dailyIntake || [];
    const meals = { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] };
    
    const totals = intake.reduce((acc, item) => {
        const mealType = item.meal || 'Snacks';
        if (meals[mealType]) meals[mealType].push(item);
        else meals.Snacks.push(item);

        return {
            calories: acc.calories + (item.calories?.amount || 0),
            protein: acc.protein + (item.protein?.amount || 0),
            carbs: acc.carbs + (item.carbs?.amount || 0),
            fat: acc.fat + (item.fat?.amount || 0),
        };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    return { totals, goals, meals };
  }, [profile]);

  // --- EFFECTS ---
  useEffect(() => {
    const saved = localStorage.getItem('safespoon_recent_searches');
    if (saved) { try { setRecentSearches(JSON.parse(saved)); } catch (e) { setRecentSearches([]); } }
    handleLocationClick();
  }, []);

  const handleLocationClick = () => {
    setLocationLoading(true);
    if (!navigator.geolocation) { setLocationName("Select Location"); setLocationLoading(false); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`);
        const data = await res.json();
        setLocationName(`${data.city || "Unknown"}, ${data.principalSubdivisionCode?.split('-').pop() || ""}`);
      } catch (e) { setLocationName("Select Location"); }
      finally { setLocationLoading(false); }
    }, () => { setLocationName("Select Location"); setLocationLoading(false); });
  };

  useEffect(() => {
    if (setDashboardLocation) {
        setDashboardLocation(
          <button onClick={handleLocationClick} className="flex items-center gap-1 opacity-80 cursor-pointer active:scale-95 bg-transparent border-none p-0">
            <div className="text-slate-900">
                <ColoredIcon src={searchIcon} colorClass="bg-slate-900" sizeClass="w-3.5 h-3.5 opacity-0" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 font-['Switzer']">{locationLoading ? "..." : locationName}</span>
          </button>
        );
    }
  }, [locationName, locationLoading]);

  // --- SEARCH LOGIC ---
  useEffect(() => {
    if (searchQuery.length < 3) { setSuggestions([]); return; }
    
    const fetchUSDASuggestions = async () => {
      setIsApiLoading(true);
      try {
        const safeQuery = encodeURIComponent(searchQuery);
        const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${safeQuery}&pageSize=25&dataType=Survey%20(FNDDS),SR%20Legacy&api_key=${USDA_API_KEY}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('API Response Error');
        
        const data = await response.json();
        const apiResults = (data.foods || []).map(f => ({
          id: f.fdcId, fdcId: f.fdcId, name: f.description, brand: f.brandOwner || 'Generic', logo: getLogoUrl(f.brandOwner), isExternal: true
        }));
        setSuggestions(apiResults);
      } catch (err) { 
          console.error("USDA Search Error:", err); 
      } finally { 
          setIsApiLoading(false); 
      }
    };

    const debounce = setTimeout(fetchUSDASuggestions, 500);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleProductSelect = async (product) => {
    setRecentSearches(prev => [product, ...prev.filter(i => i.id !== product.id)].slice(0, 10));
    setTrackingSuccess(false);
    setPortionSize(1.0);
    setSelectedMeal('Breakfast');

    const safeProduct = {
        ...product,
        fullName: product.fullName || product.name,
        logo: product.logo || getLogoUrl(product.brand),
        coreMetrics: {
            calories: { amount: 0 }, sugar: { amount: 0 }, protein: { amount: 0 }, sodium: { amount: 0 }, cholesterol: { amount: 0 }, carbs: { amount: 0 }, fat: { amount: 0 },
            fiber: { amount: 0 }, satFat: { amount: 0 }
        },
        ingredients: "Ingredients unavailable."
    };

    if (!product.isExternal) {
        setIsSearching(false);
        setSelectedProduct(safeProduct);
        return;
    }

    setSelectedProduct(safeProduct); 

    try {
        const cacheRef = doc(db, "product_cache", String(product.fdcId));
        const cacheSnap = await getDoc(cacheRef);
        if (cacheSnap.exists()) {
            setSelectedProduct({ ...safeProduct, ...cacheSnap.data() });
            return;
        }

        const response = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${product.fdcId}?api_key=${USDA_API_KEY}`);
        const data = await response.json();
        const rawSize = data.servingSize || 100;
        const multiplier = rawSize / 100;

        const getNut = (ids) => {
            if (!data.foodNutrients) return { amount: 0, dv: 0 };
            const n = data.foodNutrients.find(nut => ids.includes(String(nut.nutrient.number)));
            const amount = Math.round((n?.amount || 0) * multiplier * 10) / 10;
            return { amount, dv: 0 }; 
        };

        const details = {
            servingLabel: `${rawSize}${data.servingSizeUnit || 'g'}`,
            fullName: data.description,
            coreMetrics: {
                calories: getNut(['208', '1008']), 
                protein: getNut(['203', '1003']),
                fat: getNut(['204', '1004']),
                carbs: getNut(['205', '1005']),
                sugar: getNut(['269', '2000']),
                fiber: getNut(['291', '1079']),
                sodium: getNut(['307', '1093']),
                cholesterol: getNut(['601', '1253']),
                satFat: getNut(['606', '1258']),
            },
            ingredients: data.ingredients || "Ingredient data unavailable."
        };

        await setDoc(cacheRef, details);
        setSelectedProduct(prev => ({ ...prev, ...details }));
    } catch (err) { console.error(err); }
  };

  const handleAddToIntake = async () => {
    if (!profile || !profile.uid) { alert("User profile missing."); return; }

    const base = selectedProduct.coreMetrics;
    const trackedMetrics = {};
    Object.keys(base).forEach(key => {
        const val = base[key]?.amount;
        trackedMetrics[key] = { amount: typeof val === 'number' ? Math.round(val * portionSize) : 0 };
    });

    try {
      await updateDoc(doc(db, "users", profile.uid), {
        dailyIntake: arrayUnion({ 
            ...trackedMetrics, 
            name: selectedProduct.fullName || "Unknown Food",
            brand: selectedProduct.brand || "Generic",
            portion: Number(portionSize) || 1,
            meal: selectedMeal, 
            timestamp: new Date().toISOString() 
        })
      });
      setTrackingSuccess(true);
      setTimeout(() => {
          setSelectedProduct(null);
          setTrackingSuccess(false);
          setPortionSize(1.0);
          setIsSearching(false);
      }, 1500);
    } catch (e) { console.error("Firestore Error:", e); alert("Failed to save."); }
  };

  const displayVal = (val) => Math.round((val || 0) * portionSize);
  
  const caloriesBurned = 450; // Mocked burned calories
  const netCalories = dailyStats.totals.calories - caloriesBurned;
  const remaining = dailyStats.goals.calories - netCalories;

  return (
    <main className="w-full pb-28 font-['Switzer'] bg-gray-50 min-h-screen text-slate-900">
      <SearchOverlay isSearching={isSearching} setIsSearching={setIsSearching} searchQuery={searchQuery} setSearchQuery={setSearchQuery} isApiLoading={isApiLoading} suggestions={suggestions} onSelect={handleProductSelect} recentSearches={recentSearches} />
      
      {/* --- HEADER --- */}
      <div className="pt-8 pb-2 px-6">
          <div className="flex justify-between items-center mb-1">
             <h1 className="text-3xl font-black tracking-tight text-slate-900">Today's Goals</h1>
             <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSearching(true)}
                className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg active:bg-slate-800 transition-all"
             >
                <span className="text-2xl font-light mb-1">+</span>
             </motion.button>
          </div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-6">Overview</p>
          <DateStrip />
      </div>

      {/* --- GRID SYSTEM (Clean Card UI) --- */}
      <div className="px-6 grid grid-cols-2 gap-4 mb-8">
          {/* Card 1: Calories Remaining */}
          <StatCard 
            icon={ICONS.calories} 
            colorText="text-purple-600" 
            colorBg="bg-purple-100" 
            label="Calories Left" 
            value={remaining} 
            unit="kcal"
            max={dailyStats.goals.calories}
            progressColor="bg-purple-500"
            progressBg="bg-purple-100"
          />

          {/* Card 2: Burned */}
          <StatCard 
            icon={ICONS.calories} 
            colorText="text-lime-600" 
            colorBg="bg-lime-100" 
            label="Burned" 
            value={caloriesBurned} 
            unit="kcal"
          />

          {/* Card 3: Protein */}
          <StatCard 
            icon={ICONS.protein} 
            colorText="text-blue-600" 
            colorBg="bg-blue-100" 
            label="Protein" 
            value={dailyStats.totals.protein} 
            unit="g"
            max={dailyStats.goals.protein}
            progressColor="bg-blue-500"
            progressBg="bg-blue-100"
          />

           {/* Card 4: Carbs */}
           <StatCard 
            icon={ICONS.carbs} 
            colorText="text-orange-600" 
            colorBg="bg-orange-100" 
            label="Carbs" 
            value={dailyStats.totals.carbs} 
            unit="g"
            max={dailyStats.goals.carbs}
            progressColor="bg-orange-500"
            progressBg="bg-orange-100"
          />
      </div>

      {/* --- MEAL LIST --- */}
      <div className="px-6 space-y-6">
          {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((meal) => {
              const items = dailyStats.meals[meal];
              const cals = items.reduce((s, i) => s + (i.calories?.amount || 0), 0);
              
              return (
                  <section key={meal} className="bg-white rounded-[1.5rem] p-1 shadow-[0_2px_15px_rgba(0,0,0,0.02)] border border-slate-50">
                      <div className="flex justify-between items-center p-4 pb-2">
                           <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${items.length > 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    <ColoredIcon src={ICONS[meal.toLowerCase()]} colorClass="bg-current" sizeClass="w-4 h-4" />
                                </div>
                                <h3 className="text-base font-black text-slate-900">{meal}</h3>
                           </div>
                          <span className="text-xs font-bold text-slate-400">{cals} kcal</span>
                      </div>
                      
                      {items.length > 0 ? (
                          <div className="space-y-1 p-2">
                              {items.map((item, i) => (
                                  <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group">
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">{item.name.charAt(0)}</div>
                                          <div>
                                              <p className="font-bold text-sm text-slate-900 leading-tight">{item.name}</p>
                                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{item.brand}</p>
                                          </div>
                                      </div>
                                      <span className="font-black text-xs text-slate-900">{item.calories?.amount}</span>
                                  </div>
                              ))}
                              <button onClick={() => { setIsSearching(true); setSelectedMeal(meal); }} className="w-full py-3 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500 transition-colors">
                                  + Add Food
                              </button>
                          </div>
                      ) : (
                          <div className="p-4 pt-0">
                             <button 
                                onClick={() => { setIsSearching(true); setSelectedMeal(meal); }}
                                className="w-full py-4 border-2 border-dashed border-slate-100 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:border-slate-200 hover:text-slate-500 transition-all hover:bg-slate-50"
                            >
                                Empty - Tap to Track
                            </button>
                          </div>
                      )}
                  </section>
              );
          })}
      </div>

      {/* --- MODAL (Clean) --- */}
      <ModalPortal>
        <AnimatePresence>
            {selectedProduct && (
                <motion.div 
                    initial={{ y: "100%" }} 
                    animate={{ y: 0 }} 
                    exit={{ y: "100%" }} 
                    transition={{ type: "spring", damping: 25, stiffness: 200 }} 
                    className="fixed inset-0 z-[11000] flex flex-col justify-end pointer-events-none"
                >
                    <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] pointer-events-auto transition-opacity" onClick={() => setSelectedProduct(null)} />
                    
                    <div className="bg-white w-full rounded-t-[2.5rem] p-6 pb-10 pointer-events-auto h-[85vh] overflow-y-auto relative shadow-2xl">
                        <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto mb-8" />

                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 leading-tight mb-2">{selectedProduct.fullName}</h2>
                            <span className="inline-block bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">{selectedProduct.brand}</span>
                        </div>

                        {/* PORTION CONTROL */}
                        <div className="flex items-center justify-between mb-8 bg-slate-50 p-2 rounded-2xl">
                            <button onClick={() => setPortionSize(p => Math.max(0.5, p - 0.5))} className="w-12 h-12 bg-white rounded-xl text-xl font-bold text-slate-900 shadow-sm active:scale-95 transition-transform">-</button>
                            <div className="text-center">
                                <span className="block text-3xl font-black text-slate-900 tracking-tighter">{portionSize}<span className="text-xl text-slate-400">x</span></span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Serving ({selectedProduct.servingLabel})</span>
                            </div>
                            <button onClick={() => setPortionSize(p => p + 0.5)} className="w-12 h-12 bg-white rounded-xl text-xl font-bold text-slate-900 shadow-sm active:scale-95 transition-transform">+</button>
                        </div>

                        {/* MACRO GRID */}
                        <div className="grid grid-cols-4 gap-2 mb-8">
                            {[
                                { label: 'Cal', val: selectedProduct.coreMetrics?.calories?.amount, unit: '' },
                                { label: 'Pro', val: selectedProduct.coreMetrics?.protein?.amount, unit: 'g' },
                                { label: 'Carb', val: selectedProduct.coreMetrics?.carbs?.amount, unit: 'g' },
                                { label: 'Fat', val: selectedProduct.coreMetrics?.fat?.amount, unit: 'g' },
                            ].map(m => (
                                <div key={m.label} className="bg-slate-50 rounded-2xl p-3 flex flex-col items-center justify-center aspect-square">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1 opacity-70">{m.label}</span>
                                    <span className="text-xl font-black text-slate-900">{displayVal(m.val)}</span>
                                    <span className="text-[9px] font-bold text-slate-400">{m.unit}</span>
                                </div>
                            ))}
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-10">
                            <motion.button 
                                whileTap={{ scale: 0.98 }}
                                onClick={handleAddToIntake}
                                className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl ${trackingSuccess ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-900 text-white shadow-slate-300'}`}
                            >
                                {trackingSuccess ? 'Logged!' : `Add to ${selectedMeal}`}
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </ModalPortal>
    </main>
  );
};

export default Dashboard;