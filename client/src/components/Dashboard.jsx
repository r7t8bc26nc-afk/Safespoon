import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { db } from '../firebase';
import { collection, getDocs, getDoc, setDoc, query, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { motion, AnimatePresence } from 'framer-motion';

const LOGO_DEV_PUBLIC_KEY = 'pk_AnZTwqMTQ1ia9Btg_pILzg';
const USDA_API_KEY = '47ccOoSTZvhVDw3YpNh4nGCwSbLs98XOJufWOcY7'; 

const PARTNER_ADS = [
  { id: 1, name: "Sweetgreen", domain: "sweetgreen.com", offer: "Get $5 off your first verified gluten-free bowl.", gradient: "from-gray-900 to-gray-800", buttonColor: "hover:bg-emerald-50 text-gray-900", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80" },
  { id: 2, name: "Chipotle", domain: "chipotle.com", offer: "Free Guac on your first allergen-safe order.", gradient: "from-red-900 to-orange-900", buttonColor: "hover:bg-orange-50 text-orange-900", image: "https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80" },
  { id: 3, name: "Cava", domain: "cava.com", offer: "Double rewards points on Mediterranean greens.", gradient: "from-emerald-900 to-teal-900", buttonColor: "hover:bg-teal-50 text-teal-900", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80" }
];

const CATEGORIES = [
  { id: 'Fast Food', label: 'Fast Food', icon: '🍔' },
  { id: 'Healthy', label: 'Healthy', icon: '🥗' },
  { id: 'Mexican', label: 'Mexican', icon: '🌮' },
  { id: 'Pizza', label: 'Pizza', icon: '🍕' },
  { id: 'Coffee', label: 'Coffee', icon: '☕' },
  { id: 'Asian', label: 'Asian', icon: '🥢' },
  { id: 'Burgers', label: 'Burgers', icon: '🍔' },
  { id: 'Dessert', label: 'Dessert', icon: '🍰' },
];

const getLogoUrl = (brand) => {
    const domain = brand?.toLowerCase().split(',')[0].replace(/[^a-z0-9]/g, '') + '.com';
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}&size=100&format=png`;
};

// Portal Component for Modals
const ModalPortal = ({ children }) => {
    if (typeof document === 'undefined') return null;
    return ReactDOM.createPortal(children, document.body);
};

const SearchOverlay = ({ isSearching, setIsSearching, searchQuery, setSearchQuery, isApiLoading, suggestions, onSelect, recentSearches }) => {
    return (
      <ModalPortal>
        <AnimatePresence>
            {isSearching && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-white flex flex-col font-['Host_Grotesk']">
                <div className="pt-8 px-4 pb-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="relative flex-1">
                        {/* Search Icon Added */}
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        {/* Updated Placeholder Font Weight and Copy */}
                        <input 
                            autoFocus 
                            type="text" 
                            placeholder="Search brands, cravings, or items..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            className="w-full bg-gray-100 rounded-xl py-3.5 pl-12 pr-10 font-medium text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400" 
                        />
                        {isApiLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div></div>}
                    </div>
                    <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="text-gray-900 font-bold px-2">Cancel</button>
                </div>
                
                <div className="flex-1 overflow-y-auto px-4 no-scrollbar">
                    {/* Recent Searches Section */}
                    {searchQuery.length === 0 && recentSearches.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-6 mb-2">Recent</h3>
                            {recentSearches.map((res, idx) => (
                                <div key={`recent-${idx}`} onClick={() => onSelect(res)} className="flex items-center gap-4 py-4 hover:bg-slate-50 cursor-pointer border-b border-gray-50/50">
                                    <div className="h-10 w-10 rounded-full border border-gray-100 overflow-hidden shrink-0 opacity-60">
                                        <img src={res.logo} alt="" className="w-full h-full object-contain p-1" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/5223/5223755.png'} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 text-sm">{res.name}</h4>
                                    </div>
                                    <div className="text-gray-300"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                </div>
                            ))}
                        </div>
                    )}

                    {suggestions.map((res) => (
                        <div key={res.fdcId || res.id} onClick={() => onSelect(res)} className="flex items-center gap-4 py-5 hover:bg-slate-50 cursor-pointer border-b border-gray-50">
                        <div className="h-12 w-12 rounded-full border border-gray-100 overflow-hidden shrink-0">
                            <img src={res.logo} alt="" className="w-full h-full object-contain p-1" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/5223/5223755.png'} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-black text-gray-900 truncate max-w-[240px] leading-tight text-xs uppercase">{res.name}</h4>
                            <p className="text-[9px] font-bold text-violet-600 uppercase tracking-widest mt-0.5">{res.brand}</p>
                        </div>
                        </div>
                    ))}
                </div>
            </motion.div>
            )}
        </AnimatePresence>
      </ModalPortal>
    );
};

const Dashboard = ({ setView, profile, onOpenMenu, setIsSearching, isSearching, setDashboardLocation }) => {
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [categoryResults, setCategoryResults] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [locationName, setLocationName] = useState('Locating...');
  const [locationLoading, setLocationLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]); // New State for History
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [nutrientLoading, setNutrientLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    // Load Recent Searches on Mount
    const saved = localStorage.getItem('phlynt_recent_searches');
    if (saved) setRecentSearches(JSON.parse(saved));

    handleLocationClick();
    const fetchRes = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, "restaurants")));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), distance: (Math.random() * 5 + 0.5).toFixed(1) }));
        setAllRestaurants(data);
        setFeatured(data.slice(0, 4)); 
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchRes();
    const interval = setInterval(() => setCurrentAdIndex(prev => prev === PARTNER_ADS.length - 1 ? 0 : prev + 1), 6000);
    return () => clearInterval(interval);
  }, []);

  const handleLocationClick = () => {
    setLocationLoading(true);
    if (!navigator.geolocation) { setLocationName("Set Location"); setLocationLoading(false); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`);
        const data = await res.json();
        setLocationName(`${data.city || "Unknown"}, ${data.principalSubdivisionCode?.split('-').pop() || ""}`);
      } catch (e) { setLocationName("Set Location"); }
      finally { setLocationLoading(false); }
    }, () => { setLocationName("Set Location"); setLocationLoading(false); });
  };

  useEffect(() => {
    if (setDashboardLocation) {
        setDashboardLocation(
          <div onClick={handleLocationClick} className="flex items-center gap-1 opacity-80 cursor-pointer active:scale-95">
            <svg className={`w-3.5 h-3.5 text-violet-600 ${locationLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
            <span className="text-[10px] font-bold text-gray-400">{locationLoading ? "..." : locationName}</span>
          </div>
        );
    }
  }, [locationName, locationLoading]);

  // USDA Search Logic
  useEffect(() => {
    if (searchQuery.length < 3) { setSuggestions([]); return; }
    const fetchUSDASuggestions = async () => {
      setIsApiLoading(true);
      try {
        const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(searchQuery)}&pageSize=30&dataType=Branded&api_key=${USDA_API_KEY}`);
        const data = await response.json();
        
        const seen = new Set();
        const apiResults = (data.foods || []).filter(f => {
          const key = `${f.brandOwner}-${f.description}`.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).map(f => ({
          id: f.fdcId, fdcId: f.fdcId, 
          name: f.description, 
          brand: f.brandOwner || 'Generic',
          logo: getLogoUrl(f.brandOwner), 
          isExternal: true
        }));

        const local = allRestaurants.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
        setSuggestions([...local, ...apiResults]);
      } catch (err) { console.error(err); } finally { setIsApiLoading(false); }
    };
    const debounce = setTimeout(fetchUSDASuggestions, 500);
    return () => clearTimeout(debounce);
  }, [searchQuery, allRestaurants]);

  const addToHistory = (item) => {
    const newHistory = [item, ...recentSearches.filter(i => i.id !== item.id)].slice(0, 3);
    setRecentSearches(newHistory);
    localStorage.setItem('phlynt_recent_searches', JSON.stringify(newHistory));
  };

  const highlightAllergens = (text) => {
    if (!text || !profile?.allergens) return text;
    const regex = new RegExp(`(${profile.allergens.join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => regex.test(part) ? <span key={i} className="text-rose-600 font-black underline decoration-2">{part}</span> : part);
  };

  const handleProductSelect = async (product) => {
    // FIX: Do NOT set isSearching(false) here. 
    // This keeps the search overlay open behind the modal so "Back" works.
    addToHistory(product);
    
    if (!product.isExternal) {
        setIsSearching(false); // Close search for Restaurants (they have their own view)
        onOpenMenu({ id: product.id, name: product.name, category: product.category || 'Restaurant', rating: product.rating || "New" });
        return;
    }

    setNutrientLoading(true);
    setSelectedProduct(product);

    try {
        const cacheRef = doc(db, "product_cache", String(product.fdcId));
        const cacheSnap = await getDoc(cacheRef);

        if (cacheSnap.exists()) {
            setSelectedProduct({ ...product, ...cacheSnap.data() });
            setNutrientLoading(false);
            return;
        }

        const response = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${product.fdcId}?api_key=${USDA_API_KEY}`);
        const data = await response.json();
        
        const isLiquid = data.servingSizeUnit?.toLowerCase() === 'ml';
        const rawSize = data.servingSize || 100;
        const servingLabel = isLiquid ? `${(rawSize / 29.5735).toFixed(1)} fl oz` : `${rawSize}${data.servingSizeUnit || 'g'}`;
        const multiplier = rawSize / 100;

        const findN = (keywords) => {
            if (!data.foodNutrients) return { amount: 0, dv: 0 };
            const n = data.foodNutrients.find(nut => keywords.some(k => nut.nutrient.name.toLowerCase().includes(k.toLowerCase())));
            const amount = Math.round((n?.amount || 0) * multiplier);
            const base = keywords.includes('Sodium') ? 2300 : keywords.includes('Sugar') ? 50 : 78;
            return { amount, dv: Math.round((amount / base) * 100) };
        };

        const details = {
            servingLabel,
            fullName: `${data.brandOwner ? data.brandOwner + ' ' : ''}${data.description}`,
            coreMetrics: {
                calories: findN(['Energy', 'Energy (kcal)']),
                sodium: findN(['Sodium', 'Na']),
                sugar: findN(['Sugars, total', 'Total Sugars']),
                fat: findN(['Total lipid (fat)', 'Fat, total']),
                protein: findN(['Protein']),
                carbs: findN(['Carbohydrate', 'Carbohydrate, by difference'])
            },
            ingredients: data.ingredients || "Ingredient data unavailable."
        };

        await setDoc(cacheRef, details);
        setSelectedProduct(prev => ({ ...prev, ...details }));
    } catch (err) { setSelectedProduct(null); } finally { setNutrientLoading(false); }
  };

  const handleAddToIntake = async () => {
    if (!profile?.isPremium) { setShowPaywall(true); return; }
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        dailyIntake: arrayUnion({ ...selectedProduct.coreMetrics, name: selectedProduct.fullName, timestamp: new Date().toISOString() })
      });
      setSelectedProduct(null);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="w-full space-y-8 pb-12 font-['Host_Grotesk']">
      <SearchOverlay isSearching={isSearching} setIsSearching={setIsSearching} searchQuery={searchQuery} setSearchQuery={setSearchQuery} isApiLoading={isApiLoading} suggestions={suggestions} onSelect={handleProductSelect} recentSearches={recentSearches} />
      
      <ModalPortal>
        <AnimatePresence>
            {showPaywall && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[12000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setShowPaywall(false)}>
                <div className="bg-white rounded-[3rem] p-10 w-full max-w-md text-center" onClick={e => e.stopPropagation()}>
                    <div className="text-4xl mb-4">👑</div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Phlynt Pro</h3>
                    <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">Unlock daily intake tracking and automated health goal analysis with a premium subscription.</p>
                    <button className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black shadow-xl mb-3">Upgrade for Tracking</button>
                </div>
            </motion.div>
            )}
        </AnimatePresence>
      </ModalPortal>

      <ModalPortal>
        <AnimatePresence>
            {selectedProduct && (
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }} className="fixed inset-0 z-[11000] bg-white flex flex-col overflow-hidden px-4 md:px-8">
                <div className="py-6 flex items-center justify-between shrink-0">
                <button onClick={() => setSelectedProduct(null)} className="h-12 w-12 flex items-center justify-center bg-slate-50 rounded-full active:scale-95 transition-transform"><svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M15 19l-7-7 7-7"/></svg></button>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Nutritional Facts</span>
                <div className="w-12" />
                </div>
                <div className="flex-1 overflow-y-auto pb-12 no-scrollbar">
                <div className="flex flex-col items-center mb-8 px-6 text-center">
                    <div className="h-40 w-40 bg-slate-50 rounded-full flex items-center justify-center mb-6 p-4">
                        <img src={selectedProduct.logo} className="h-full w-full object-contain" alt="" onError={e => e.target.src = 'https://cdn-icons-png.flaticon.com/512/5223/5223755.png'} />
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900 leading-tight uppercase">{selectedProduct.fullName || selectedProduct.name}</h2>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest bg-violet-50 px-3 py-1.5 rounded-full border border-violet-100">Serving: {selectedProduct.servingLabel || '--'}</span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full">{selectedProduct.coreMetrics?.calories?.amount || 0} Calories</span>
                    </div>
                </div>
                {nutrientLoading ? <div className="space-y-4 animate-pulse px-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-50 rounded-[2rem]"></div>)}</div> : (
                    <div className="space-y-6 px-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-emerald-50 text-emerald-600 p-6 rounded-[2.5rem] flex flex-col items-center justify-center">
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Protein</p>
                                <p className="text-2xl font-black">{selectedProduct.coreMetrics?.protein?.amount || 0}g</p>
                            </div>
                            <div className="bg-slate-50 text-slate-900 p-6 rounded-[2.5rem] flex flex-col items-center justify-center">
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Carbs</p>
                                <p className="text-2xl font-black">{selectedProduct.coreMetrics?.carbs?.amount || 0}g</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {[ 
                            { label: 'Sodium', data: selectedProduct.coreMetrics?.sodium, unit: 'mg', limit: 400 }, 
                            { label: 'Sugar', data: selectedProduct.coreMetrics?.sugar, unit: 'g', limit: 12 },
                            { label: 'Fat', data: selectedProduct.coreMetrics?.fat, unit: 'g', limit: 15 } 
                            ].map((item, idx) => (
                            <div key={idx} className={`${(item.data?.amount || 0) > item.limit ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-900 border-slate-50'} p-5 rounded-[2rem] text-center border transition-all`}>
                                <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">{item.label}</p>
                                <p className="text-lg font-black">{item.data?.amount || 0}{item.unit}</p>
                                <p className="text-[7px] font-black uppercase mt-1 opacity-40">{item.data?.dv || 0}% DV</p>
                            </div>
                            ))}
                        </div>
                        <div className="p-7 bg-violet-600 rounded-[2.5rem] text-white shadow-xl flex items-center justify-between">
                        <div className="flex-1 pr-4">
                            <h4 className="font-black text-[10px] uppercase tracking-widest mb-1 opacity-80">Safety Scan</h4>
                            <p className="text-[11px] font-bold text-violet-100 leading-relaxed italic">Verified match for your {profile?.allergens?.join(', ') || 'dietary'} settings.</p>
                        </div>
                        <button onClick={handleAddToIntake} className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-violet-600 shadow-lg active:scale-90 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M12 4v16m8-8H4" /></svg></button>
                        </div>
                        <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800">
                            <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4 tracking-[0.2em]">Ingredients</h4>
                            <p className="text-[11px] font-bold text-slate-400 italic leading-relaxed uppercase tracking-tighter line-clamp-6">{highlightAllergens(selectedProduct.ingredients)}</p>
                        </div>
                    </div>
                )}
                </div>
            </motion.div>
            )}
        </AnimatePresence>
      </ModalPortal>

      <div className="px-4 md:px-8 pt-2">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight mb-4">Welcome back,<br/><span className="text-violet-600">{profile?.username || 'Quajaee Simmons'}</span>.</h1>
        <div onClick={() => setIsSearching(true)} className="relative w-full cursor-pointer group mb-6"><div className="w-full bg-gray-100 rounded-2xl px-6 py-4 font-medium text-gray-400 border-2 border-transparent group-hover:border-violet-100 transition-all flex items-center gap-2 pl-4"><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>Search brands, cravings, or items...</div></div>
        <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar snap-x">{CATEGORIES.map((cat) => (<button key={cat.id} onClick={() => { setActiveCategory(cat.id); setCategoryResults(allRestaurants.filter(r => (r.category || "").toLowerCase().includes(cat.id.toLowerCase()))); }} className={`snap-start flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black transition-all border whitespace-nowrap ${activeCategory === cat.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}><span>{cat.icon}</span><span>{cat.label}</span></button>))}</div>
        
        {!activeCategory && (
          <div className="relative overflow-hidden rounded-[2.5rem] shadow-xl h-auto min-h-[300px] md:h-[260px] my-8">
            <div className="absolute inset-0 flex transition-transform duration-700 h-full" style={{ transform: `translateX(-${currentAdIndex * 100}%)` }}>
              {PARTNER_ADS.map((ad) => (
                <div key={ad.id} className={`w-full h-full flex-shrink-0 relative bg-gradient-to-br ${ad.gradient} text-white p-8 flex flex-col md:flex-row items-center justify-between gap-8`}>
                  <div className="flex-1 text-center md:text-left z-20"><h2 className="text-2xl md:text-3xl font-extrabold mb-2 tracking-tighter leading-none">{ad.name}</h2><p className="text-gray-300 mb-6 font-medium text-sm">{ad.offer}</p><button className={`bg-white px-6 py-2.5 rounded-xl text-sm font-black shadow-lg ${ad.buttonColor}`}>Claim Offer</button></div>
                  <div className="relative w-full md:w-48 h-40 md:h-auto rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 shrink-0"><img src={ad.image} alt="" className="object-cover w-full h-full" /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-5">{activeCategory ? <span>🍽️ {activeCategory} Places</span> : <span>📍 Nearby Favorites</span>}</h2>
            {loading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-50 rounded-[2rem] animate-pulse"></div>)}</div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {(activeCategory ? categoryResults : featured).map((restaurant) => (
                  <div key={restaurant.id} onClick={() => handleProductSelect({ ...restaurant, isExternal: false })} className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm hover:shadow-lg transition-all cursor-pointer group">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-white p-1 border group-hover:scale-105 transition-transform shrink-0"><img src={getLogoUrl(restaurant.name)} alt={restaurant.name} className="w-full h-full object-contain rounded-full" /></div>
                            <div><h3 className="text-base font-black text-gray-900 group-hover:text-violet-700 transition-colors leading-tight">{restaurant.name}</h3><div className="text-xs text-gray-500 font-bold">{restaurant.category} • {restaurant.distance} mi</div></div>
                        </div>
                        <span className="bg-gray-50 text-gray-700 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter">★ {restaurant.rating || "New"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;