import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { PlateScanner } from './PlateScanner'; 
import { searchRestaurantMenu } from '../services/FoodService';

// --- ICONS ---
import scannerIcon from '../icons/scanner.svg';
import searchIcon from '../icons/search.svg';
import foodTrayIcon from '../icons/fork-knife-alt.svg'; 
import chartIcon from '../icons/chart-line.svg'; 
import userIcon from '../icons/user.svg';

// --- CONFIG ---
const LOGO_DEV_PUBLIC_KEY = 'pk_AnZTwqMTQ1ia9Btg_pILzg';
const USDA_API_KEY = '47ccOoSTZvhVDw3YpNh4nGCwSbLs98XOJufWOcY7';

// --- HELPER COMPONENTS (STYLED) ---

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

const PrimaryActionButton = ({ label, icon, color, onClick }) => (
  <button 
    onClick={onClick}
    className={`
      flex-1 aspect-[4/3] p-4 flex flex-col items-center justify-center gap-3
      border-4 border-black 
      shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] 
      active:shadow-none active:translate-x-[2px] active:translate-y-[2px] 
      transition-all duration-150
      ${color}
    `}
  >
     <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center rounded-full shrink-0">
        <ColoredIcon src={icon} colorClass="bg-black" sizeClass="w-5 h-5" />
     </div>
     <span className="font-black uppercase text-xs tracking-widest leading-none text-center">{label}</span>
  </button>
);

const MenuLink = ({ label, subLabel, icon, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full p-4 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-between group mb-3 last:mb-0"
  >
    <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-50 border-2 border-black flex items-center justify-center shrink-0">
            <ColoredIcon src={icon} colorClass="bg-black" sizeClass="w-6 h-6" />
        </div>
        <div className="text-left">
            <h3 className="text-lg font-black uppercase tracking-tight leading-none mb-1">{label}</h3>
            <p className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-widest">{subLabel}</p>
        </div>
    </div>
    <div className="text-2xl font-black">→</div>
  </button>
);

const MacroItem = ({ label, value, unit }) => (
    <div className="flex flex-col items-center justify-center bg-white/50 p-2 border-2 border-black/5 rounded-lg">
        <span className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-1">{label}</span>
        <span className="text-xl font-black leading-none text-black">
            {Math.round(value)}<span className="text-[9px] font-bold ml-0.5 opacity-60">{unit}</span>
        </span>
    </div>
);

const ModalPortal = ({ children }) => {
    if (typeof document === 'undefined') return null;
    return ReactDOM.createPortal(children, document.body);
};

// --- DATA HELPERS ---
const getLogoUrl = (brand) => {
    if (!brand || brand === 'Generic' || brand === 'Foundation') return 'https://cdn-icons-png.flaticon.com/512/706/706164.png';
    const domain = brand.toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '') + '.com';
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}&size=100&format=png`;
};

// --- SEARCH OVERLAY COMPONENT ---
const SearchOverlay = ({ isSearching, setIsSearching, searchQuery, setSearchQuery, isApiLoading, suggestions, onSelect }) => {
    const [isScanning, setIsScanning] = useState(false);
    
    // Barcode Scanner Sub-component
    const BarcodeScannerInternal = ({ onResult, onClose }) => {
        const scannerId = "safespoon-barcode-reader-internal";
        const scannerRef = useRef(null);
        useEffect(() => {
            const timer = setTimeout(() => {
                if (scannerRef.current) return;
                const html5QrCode = new Html5Qrcode(scannerId);
                scannerRef.current = html5QrCode;
                html5QrCode.start({ facingMode: "environment" }, { fps: 20, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 }, 
                    (decodedText) => { if (navigator.vibrate) navigator.vibrate(200); html5QrCode.stop().then(() => { scannerRef.current = null; onResult(decodedText); }); }, () => {}
                ).catch(err => console.error(err));
            }, 300);
            return () => { clearTimeout(timer); if (scannerRef.current?.isScanning) scannerRef.current.stop(); };
        }, [onResult]);
        return (
            <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center">
                <div id={scannerId} className="w-full h-full object-cover" />
                <button onClick={onClose} className="absolute bottom-10 bg-white border-4 border-black px-6 py-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Cancel</button>
            </div>
        );
    };

    return (
      <ModalPortal>
        <AnimatePresence>
            {isSearching && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-white flex flex-col font-sans text-black">
                {isScanning ? (
                    <BarcodeScannerInternal onResult={(barcode) => { setSearchQuery(barcode); setIsScanning(false); }} onClose={() => setIsScanning(false)} />
                ) : (
                    <>
                        <div className="pt-14 px-4 pb-4 bg-white border-b-4 border-black flex gap-3 items-center">
                            <div className="flex-1 relative">
                                <input autoFocus type="search" placeholder="SEARCH FOOD..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 border-4 border-black pl-4 pr-12 font-black text-xl uppercase placeholder:text-gray-300 outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all" />
                                <button onClick={() => setIsScanning(true)} className="absolute right-3 top-1/2 -translate-y-1/2"><ColoredIcon src={scannerIcon} colorClass="bg-black" /></button>
                            </div>
                            <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="w-14 h-14 bg-[#FF5252] border-4 border-black flex items-center justify-center text-white font-black text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
                            <div className="space-y-3 pb-24">
                                {suggestions.map((res) => (
                                    <button key={res.fdcId} onClick={() => onSelect(res)} className="w-full flex items-center gap-4 p-4 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all text-left">
                                        <div className="h-12 w-12 border-2 border-black flex items-center justify-center bg-gray-100 p-1"><img src={res.logo} alt="" className="w-full h-full object-contain grayscale" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/706/706164.png'} /></div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-black text-lg leading-tight uppercase">{res.name}</h4>
                                                {res.isRestaurant && <span className="bg-[#10B981] text-white text-[9px] font-black uppercase px-2 py-0.5 border border-black">Verified</span>}
                                            </div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">{res.brand}</p>
                                        </div>
                                        <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-black text-xl">+</div>
                                    </button>
                                ))}
                                {isApiLoading && <div className="text-center py-10 font-black uppercase animate-pulse">Searching Database...</div>}
                                {!isApiLoading && searchQuery.length >= 3 && suggestions.length === 0 && <div className="text-center py-20 opacity-40 font-black uppercase">No Results Found</div>}
                            </div>
                        </div>
                    </>
                )}
            </motion.div>
            )}
        </AnimatePresence>
      </ModalPortal>
    );
};

// --- MAIN DASHBOARD ---
const Dashboard = ({ profile, setIsSearching, isSearching, deferredPrompt }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [trackingSuccess, setTrackingSuccess] = useState(false);
  const [portionSize, setPortionSize] = useState(1.0);
  const [selectedMeal, setSelectedMeal] = useState('Snacks'); 
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [offlineIntake, setOfflineIntake] = useState([]);
  const [greeting, setGreeting] = useState('HELLO');
  const [dateString, setDateString] = useState('');

  // 1. Initialize & Date Logic
  useEffect(() => {
    try {
        const cached = localStorage.getItem('safespoon_offline_intake');
        if (cached) setOfflineIntake(JSON.parse(cached));
    } catch (e) { console.error("Local load fail", e); }

    const updateTime = () => {
        const now = new Date();
        const hours = now.getHours();
        if (hours < 12) setGreeting('GOOD MORNING');
        else if (hours < 18) setGreeting('GOOD AFTERNOON');
        else setGreeting('GOOD EVENING');
        setDateString(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateTime();
  }, []);

  // 2. Statistics Calculation
  const dailyStats = useMemo(() => {
      let tdee = 2000;
      if (profile?.goalType === 'lose') tdee = 1800;
      if (profile?.goalType === 'gain') tdee = 2400;
      
      const goals = { calories: tdee, protein: 150, carbs: 200, fat: 65, sodium: 2300, sugar: 36, satFat: 20 };
      const combinedIntake = [...(profile?.dailyIntake || []), ...offlineIntake];
      const dateStr = selectedDate.toDateString();
      
      const totals = combinedIntake.reduce((acc, item) => {
          if (new Date(item.timestamp).toDateString() !== dateStr) return acc;
          return { 
              calories: acc.calories + (item.calories?.amount || 0), 
              protein: acc.protein + (item.protein?.amount || 0), 
              carbs: acc.carbs + (item.carbs?.amount || 0), 
              fat: acc.fat + (item.fat?.amount || 0),
              sugar: acc.sugar + (item.sugar?.amount || 0), 
              sodium: acc.sodium + (item.sodium?.amount || 0),
              satFat: acc.satFat + (item.satFat?.amount || 0)
          };
      }, { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0, satFat: 0 });

      return { totals, goals };
  }, [profile, selectedDate, offlineIntake]);

  // 3. API Search Logic
  useEffect(() => {
    if (searchQuery.length < 3) { setSuggestions([]); return; }
    const timeoutId = setTimeout(async () => {
        setIsApiLoading(true);
        try {
            const [usdaRes, restaurantRes] = await Promise.all([
                fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(searchQuery)}&pageSize=8&dataType=Branded,Foundation`).then(r => r.json()),
                searchRestaurantMenu(searchQuery)
            ]);
            const newSuggestions = [];
            if (restaurantRes.items) restaurantRes.items.forEach(item => newSuggestions.push({ id: item.id, fdcId: `rest-${item.id}`, name: item.name, brand: item.brand, logo: getLogoUrl(item.brand), isRestaurant: true, details: item }));
            if (usdaRes.foods) usdaRes.foods.forEach(f => newSuggestions.push({ id: f.fdcId, fdcId: f.fdcId, name: f.description, brand: f.brandOwner || (f.dataType === 'Foundation' ? 'Basic' : 'Generic'), logo: getLogoUrl(f.brandOwner), isExternal: true }));
            setSuggestions(newSuggestions);
        } catch (e) { console.error("Search failed", e); } 
        finally { setIsApiLoading(false); }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 4. Product Handling
  const handleProductSelect = async (product) => {
      setSelectedProduct({ ...product, fullName: product.name, coreMetrics: { calories: { amount: 0 } } });
      
      // A. Restaurant Item
      if (product.isRestaurant && product.details.macros) {
          const m = product.details.macros;
          setSelectedProduct(prev => ({ ...prev, servingLabel: "1 serving", householdReference: product.details.description, coreMetrics: { calories: { amount: m.calories || 0 }, protein: { amount: m.protein || 0 }, fat: { amount: m.fat || 0 }, carbs: { amount: m.carbs || 0 } } }));
          return;
      }
      
      // B. USDA Item
      try {
        const response = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${product.fdcId}?api_key=${USDA_API_KEY}`);
        const data = await response.json();
        const rawSize = data.servingSize || 100;
        const multiplier = rawSize / 100;
        const getNut = (ids) => ({ amount: Math.round((data.foodNutrients?.find(nut => ids.includes(String(nut.nutrient.number)))?.amount || 0) * multiplier * 10) / 10 });
        setSelectedProduct(prev => ({ ...prev, servingLabel: `${rawSize}${data.servingSizeUnit || 'g'}`, fullName: data.description, brand: data.brandOwner || product.brand, coreMetrics: { calories: getNut(['208', '1008']), protein: getNut(['203']), fat: getNut(['204']), carbs: getNut(['205']), sugar: getNut(['269']), sodium: getNut(['307']), satFat: getNut(['606']) } }));
      } catch (err) { console.error("USDA Fetch Error", err); }
  };

  const handleAddToIntake = async () => {
    const base = selectedProduct.coreMetrics;
    const trackedMetrics = {}; 
    Object.keys(base).forEach(key => { trackedMetrics[key] = { amount: Math.round((base[key]?.amount || 0) * portionSize) }; });
    const newLogEntry = { ...trackedMetrics, name: selectedProduct.fullName, brand: selectedProduct.brand, portion: Number(portionSize) || 1, meal: selectedMeal, timestamp: selectedDate.toISOString() };
    try {
      await updateDoc(doc(db, "users", profile.uid), { dailyIntake: arrayUnion(newLogEntry) });
      setTrackingSuccess(true);
    } catch (e) { 
        const currentOffline = JSON.parse(localStorage.getItem('safespoon_offline_intake') || '[]');
        const updatedOffline = [...currentOffline, newLogEntry];
        localStorage.setItem('safespoon_offline_intake', JSON.stringify(updatedOffline));
        setOfflineIntake(updatedOffline);
        setTrackingSuccess(true);
    }
    setTimeout(() => { setSelectedProduct(null); setTrackingSuccess(false); setPortionSize(1.0); setIsSearching(false); }, 1500);
  };

  return (
    <div className="flex flex-col gap-5 font-sans text-black pb-24 pt-safe-top">
      
      {/* BACKGROUND FEATURES (Overlays) */}
      <SearchOverlay 
        isSearching={isSearching} setIsSearching={setIsSearching} 
        searchQuery={searchQuery} setSearchQuery={setSearchQuery} 
        isApiLoading={isApiLoading} suggestions={suggestions} 
        onSelect={handleProductSelect}
      />

      {/* SECTION 1: HEADER */}
      <section className="flex justify-between items-end mt-8">
          <div>
            <div className="inline-block bg-black text-white px-2 py-0.5 mb-2 border-2 border-black">
                <span className="text-[10px] font-bold uppercase tracking-widest">{dateString}</span>
            </div>
            <h1 className="text-4xl font-black uppercase leading-[0.9] tracking-tighter">
                {greeting},<br/>
                <span className="text-gray-400">{profile?.firstName || 'FRIEND'}</span>
            </h1>
          </div>
      </section>
      
      {/* SECTION 2: STATUS CARD (PURPLE/LAVENDER) */}
      <section className="bg-[#E0E7FF] border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
         {/* Top Row */}
         <div className="flex justify-between items-center mb-2">
             <h2 className="text-[10px] font-black uppercase tracking-widest bg-white border-2 border-black px-2 py-0.5">Today's Intake</h2>
             <div className="text-right">
                <span className="text-lg font-black leading-none">{dailyStats.goals.calories}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 ml-1">GOAL</span>
             </div>
         </div>
         
         {/* Middle Row: Big Number & Bar */}
         <div className="flex items-center gap-4 mb-4">
            <div className="flex items-baseline shrink-0">
                <span className="text-5xl font-black tracking-tighter leading-none">{Math.round(dailyStats.totals.calories)}</span>
                <span className="text-sm font-black uppercase tracking-tight opacity-50 ml-1">kcal</span>
            </div>
            
            <div className="w-full h-4 border-2 border-black bg-white p-0.5 relative">
                <div 
                    className="h-full bg-black transition-all duration-500 ease-out" 
                    style={{ width: `${Math.min((dailyStats.totals.calories / dailyStats.goals.calories) * 100, 100)}%` }} 
                />
            </div>
         </div>

         {/* Bottom Row: Macros Grid */}
         <div className="grid grid-cols-4 gap-2">
             <MacroItem label="Protein" value={dailyStats.totals.protein} unit="g" />
             <MacroItem label="Carbs" value={dailyStats.totals.carbs} unit="g" />
             <MacroItem label="Sugar" value={dailyStats.totals.sugar} unit="g" />
             <MacroItem label="Sodium" value={dailyStats.totals.sodium} unit="mg" />
         </div>
      </section>

      {/* SECTION 3: ACTIONS */}
      <section className="grid grid-cols-2 gap-3">
          <PrimaryActionButton 
            label="Scan Barcode" 
            icon={scannerIcon} 
            color="bg-[#FFD700]" 
            onClick={() => navigate('/scanner')} 
          />
          <PrimaryActionButton 
            label="Type Search" 
            icon={searchIcon} 
            color="bg-white" 
            onClick={() => setIsSearching(true)} 
          />
      </section>

      {/* SECTION 4: MENU */}
      <section>
          <h2 className="text-sm font-black uppercase tracking-widest mb-3">Menu</h2>
          <div className="flex flex-col">
              <MenuLink 
                label="Food Hall" 
                subLabel="Restaurants & Recipes" 
                icon={foodTrayIcon} 
                onClick={() => navigate('/meal-hub')} 
              />
              <MenuLink 
                label="Meal Plans" 
                subLabel="Weekly meals & cost anlaysis" 
                icon={chartIcon} 
                onClick={() => navigate('/planner')} 
              />
              <MenuLink 
                label="Account Info" 
                subLabel="Your Safespoon command center" 
                icon={userIcon} 
                onClick={() => navigate('/account')} 
              />
          </div>
      </section>

      {/* SECTION 5: PRODUCT MODAL (Hidden unless activated) */}
      <ModalPortal>
        <AnimatePresence>
            {selectedProduct && (
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 z-[11000] flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
                    <div className="bg-white w-full border-t-4 border-black p-6 pb-12 relative h-[85vh] overflow-y-auto z-10">
                       <div className="w-16 h-2 bg-black mx-auto mb-8" />
                        <div className="text-center mb-6">
                            <h2 className="text-3xl font-black uppercase leading-tight mb-2">{selectedProduct.fullName}</h2>
                            <span className="inline-block bg-black text-white text-xs font-bold uppercase px-2 py-1">{selectedProduct.brand}</span>
                        </div>

                        <div className="flex items-center justify-between mb-8 bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <button onClick={() => setPortionSize(p => Math.max(0.5, p - 0.5))} className="w-12 h-12 bg-black text-white text-2xl font-black active:scale-90 transition-transform">-</button>
                            <div className="text-center"><span className="block text-4xl font-black leading-none">{portionSize}<span className="text-xl text-gray-400 ml-1">x</span></span><span className="text-[10px] font-black uppercase tracking-widest">({selectedProduct.servingLabel})</span></div>
                            <button onClick={() => setPortionSize(p => p + 0.5)} className="w-12 h-12 bg-black text-white text-2xl font-black active:scale-90 transition-transform">+</button>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-10">
                            {['calories', 'protein', 'carbs', 'fat'].map(m => (
                                <div key={m} className="bg-white border-2 border-black p-2 flex flex-col items-center justify-center aspect-square shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <span className="text-[9px] font-black uppercase mb-1">{m.slice(0,3)}</span>
                                    <span className="text-xl font-black leading-none">{Math.round((selectedProduct.coreMetrics[m]?.amount || 0) * portionSize)}</span>
                                    <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase">{m === 'calories' ? 'kcal' : 'g'}</span>
                                </div>
                            ))}
                        </div>

                        <button onClick={handleAddToIntake} className={`w-full py-5 border-4 border-black font-black text-xl uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all ${trackingSuccess ? 'bg-[#10B981] text-black' : 'bg-black text-white'}`}>{trackingSuccess ? 'LOGGED ✓' : `ADD TO LOG`}</button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </ModalPortal>

    </div>
  );
};

export default Dashboard;