import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { db } from '../firebase';
import { collection, query, limit, where, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { motion, AnimatePresence } from 'framer-motion';
// --- SPECIALIZED SCANNER ENGINE ---
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// --- ICON IMPORTS ---
import fireIcon from '../icons/fire.svg';
import dumbbellIcon from '../icons/dumbbell-filled.svg';
import searchIcon from '../icons/search.svg';
import breadIcon from '../icons/bread-slice.svg'; 
import candyIcon from '../icons/candy.svg'; 
import cheeseIcon from '../icons/cheese.svg'; 
import steakIcon from '../icons/steak.svg'; 
import eggIcon from '../icons/eggfried.svg';
import cloudIcon from '../icons/cloud-shield.svg';
import activityIcon from '../icons/cycling.svg';

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
    snacks: candyIcon,
    sync: cloudIcon,
    exercise: activityIcon
};

// --- CONFIGURATION ---
const LOGO_DEV_PUBLIC_KEY = 'pk_AnZTwqMTQ1ia9Btg_pILzg';
const USDA_API_KEY = '47ccOoSTZvhVDw3YpNh4nGCwSbLs98XOJufWOcY7'; 

// --- PORTION VISUALIZATION LOGIC ---
const getVisualReference = (grams, name = "") => {
    if (!grams) return null;
    const foodName = name.toLowerCase();

    if (foodName.includes("meat") || foodName.includes("steak") || foodName.includes("chicken") || (grams >= 80 && grams <= 120)) {
        return "Size of a deck of cards";
    }
    if (foodName.includes("cheese") || (grams >= 25 && grams <= 35)) {
        return "Size of a pair of dice";
    }
    if (foodName.includes("pasta") || foodName.includes("rice") || (grams >= 180 && grams <= 220)) {
        return "Size of a tight fist";
    }
    if (foodName.includes("oil") || foodName.includes("butter") || foodName.includes("peanut") || grams <= 15) {
        return "Size of your thumb tip";
    }
    if (grams >= 40 && grams <= 65) {
        return "Size of a tennis ball";
    }
    if (grams >= 140 && grams <= 170) {
        return "Size of a baseball";
    }
    return "Approx. one handful";
};

// --- EXERCISE DATABASE (RESTORED FULL LIST) ---
const EXERCISE_DB = [
    { id: 'ex_run_fast', name: 'Running (Fast - 8mph)', met: 11.8 },
    { id: 'ex_run_mod', name: 'Running (Moderate - 6mph)', met: 9.8 },
    { id: 'ex_jog', name: 'Jogging', met: 7.0 },
    { id: 'ex_cycle_vig', name: 'Cycling (Vigorous)', met: 10.0 },
    { id: 'ex_cycle_mod', name: 'Cycling (Moderate)', met: 7.5 },
    { id: 'ex_hiit', name: 'HIIT Workout', met: 8.0 },
    { id: 'ex_weights_vig', name: 'Weight Lifting (Vigorous)', met: 6.0 },
    { id: 'ex_weights_mod', name: 'Weight Lifting (Moderate)', met: 3.5 },
    { id: 'ex_swim_laps', name: 'Swimming (Laps)', met: 8.0 },
    { id: 'ex_yoga', name: 'Yoga (Power)', met: 4.0 },
    { id: 'ex_yoga_hatha', name: 'Yoga (Hatha)', met: 2.5 },
    { id: 'ex_pilates', name: 'Pilates', met: 3.0 },
    { id: 'ex_walk_fast', name: 'Walking (Brisk)', met: 4.3 },
    { id: 'ex_walk_mod', name: 'Walking (Moderate)', met: 3.5 },
    { id: 'ex_hike', name: 'Hiking', met: 6.0 },
    { id: 'ex_basketball', name: 'Basketball', met: 8.0 },
    { id: 'ex_soccer', name: 'Soccer', met: 10.0 },
    { id: 'ex_tennis', name: 'Tennis', met: 7.3 },
    { id: 'ex_dance', name: 'Dancing', met: 5.0 },
    { id: 'ex_jump_rope', name: 'Jump Rope', met: 11.0 }
];

// --- HELPER COMPONENTS ---

const getLogoUrl = (brand) => {
    if (!brand || brand === 'Generic' || brand === 'Foundation') return 'https://cdn-icons-png.flaticon.com/512/706/706164.png';
    const domain = brand.toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '') + '.com';
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}&size=100&format=png`;
};

const ColoredIcon = ({ src, colorClass, sizeClass = "w-5 h-5" }) => (
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

const ProgressBar = ({ current, max, colorClass, bgClass, height = "h-1.5" }) => {
  const percent = Math.min(100, Math.max(0, (current / (max || 1)) * 100));
  return (
    <div className={`w-full ${height} ${bgClass} rounded-full overflow-hidden`}>
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`h-full ${colorClass} rounded-full`} 
      />
    </div>
  );
};

const DateStrip = ({ intakeHistory, dailyGoal, selectedDate, onSelectDate }) => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const getDayStatus = (dateObj) => {
        const dateString = dateObj.toDateString();
        const logs = intakeHistory.filter(item => {
            const itemDate = new Date(item.timestamp);
            return itemDate.toDateString() === dateString;
        });
        if (logs.length === 0) return 'empty';
        const totalCals = logs.reduce((sum, item) => sum + (item.calories?.amount || 0), 0);
        return totalCals <= dailyGoal ? 'success' : 'failed';
    };

    return (
        <div className="flex justify-between items-center mb-0 w-full px-1">
            {[6, 5, 4, 3, 2, 1, 0].map((offset, i) => {
                const date = new Date();
                date.setDate(date.getDate() - offset);
                const dayLabel = days[date.getDay()];
                const dayNumber = date.getDate();
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const isToday = offset === 0;
                const status = getDayStatus(date);

                let bgClass = 'bg-transparent text-slate-400 border border-transparent'; 
                let textClass = 'text-slate-400';

                if (!isSelected) {
                    if (status === 'success') {
                        bgClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                        textClass = 'text-emerald-600 font-semibold';
                    } else if (status === 'failed') {
                        bgClass = 'bg-rose-50 text-rose-600 border border-rose-100';
                        textClass = 'text-rose-600 font-semibold';
                    } else if (isToday) {
                        bgClass = 'bg-slate-100 text-slate-900 border-slate-200';
                        textClass = 'text-slate-900 font-bold';
                    }
                } else {
                    bgClass = 'bg-slate-900 text-white shadow-lg scale-110';
                    textClass = 'text-slate-900 font-bold';
                }

                return (
                    <button 
                        key={i} 
                        onClick={() => onSelectDate(date)}
                        className="flex flex-col items-center gap-1.5 focus:outline-none group active:scale-95 transition-transform"
                    >
                        <span className={`text-[10px] font-medium ${textClass}`}>{dayLabel}</span>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all ${bgClass}`}>
                            {dayNumber}
                        </div>
                    </button>
                )
            })}
        </div>
    );
};

const StatCard = ({ icon, colorText, colorBg, label, value, unit, max, progressColor, progressBg, fullWidth = false }) => {
    return (
        <div className={`bg-white rounded-3xl p-5 shadow-sm border border-slate-50 flex flex-col justify-between ${fullWidth ? 'w-full h-44 mb-4' : 'h-36'}`}>
            <div className="flex justify-between items-start">
                <div className={`w-10 h-10 rounded-full ${colorBg} ${colorText} flex items-center justify-center`}>
                    <ColoredIcon src={icon} colorClass="bg-current" sizeClass="w-5 h-5" />
                </div>
                {unit === 'kcal' && (
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{unit}</span>
                )}
            </div>
            <div>
                <div className="flex items-baseline mb-1">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">{Math.round(value)}</span>
                    {max && (
                        <span className="text-sm font-bold text-slate-300 ml-1.5">/ {max}</span>
                    )}
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
            </div>
            <div className="mt-auto pt-3">
                 {max && (
                     <div className="flex items-center gap-2">
                        <ProgressBar current={value} max={max} colorClass={progressColor} bgClass={progressBg} height="h-2" />
                     </div>
                 )}
            </div>
        </div>
    );
};

const NutrientRow = ({ label, value, max, unit }) => {
    const ratio = max > 0 ? Math.round((value / max) * 100) : 0;
    
    return (
        <div className="flex items-center justify-between py-3.5 border-b border-slate-50 last:border-0">
            <div className="w-5/12 pr-2">
                <span className="text-sm font-bold text-slate-700 block">{label}</span>
            </div>
            <div className="flex items-center gap-3 w-7/12">
                <div className="flex-1">
                    <ProgressBar current={value} max={max} colorClass={ratio > 100 ? "bg-amber-500" : "bg-slate-900"} bgClass="bg-slate-100" height="h-1.5" />
                </div>
                <div className="text-right w-24">
                    <span className="text-sm font-black text-slate-900">{Math.round(value)}</span>
                    <span className="text-[10px] text-slate-400 ml-1 font-bold uppercase">/ {max}{unit}</span>
                </div>
            </div>
        </div>
    );
};

// --- BARCODE SCANNER (html5-qrcode) ---
const BarcodeScanner = ({ onResult, onClose }) => {
    const scannerId = "safespoon-barcode-reader";
    const scannerRef = useRef(null);
    const [status, setStatus] = useState("Align barcode in frame");
    const [isFlash, setIsFlash] = useState(false);

    useEffect(() => {
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        const config = { 
            fps: 20, 
            qrbox: { width: 280, height: 160 }, 
            formatsToSupport: [ 
                Html5QrcodeSupportedFormats.UPC_A, 
                Html5QrcodeSupportedFormats.UPC_E, 
                Html5QrcodeSupportedFormats.EAN_13, 
                Html5QrcodeSupportedFormats.EAN_8
            ]
        };

        html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            (decodedText) => {
                if (navigator.vibrate) navigator.vibrate(200);
                html5QrCode.stop().then(() => onResult(decodedText));
            },
            (errorMessage) => { }
        ).catch(err => {
            console.error("Camera start failed", err);
            setStatus("Camera Access Denied");
        });

        return () => {
            if (html5QrCode.isScanning) {
                html5QrCode.stop().catch(e => console.error("Stop failed", e));
            }
        };
    }, [onResult]);

    const handleManualCapture = () => {
        setIsFlash(true);
        setTimeout(() => setIsFlash(false), 150);
        setStatus("Analyzing frame...");
        if (navigator.vibrate) navigator.vibrate(50);
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center font-['Switzer']">
            <div id={scannerId} className="w-full h-full object-cover" />
            
            <AnimatePresence>
                {isFlash && (
                    <motion.div 
                        initial={{ opacity: 0.8 }} 
                        animate={{ opacity: 0 }} 
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white pointer-events-none z-50"
                    />
                )}
            </AnimatePresence>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-72 h-44 border-2 border-white/40 rounded-xl relative shadow-2xl">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"></div>
                    <div className="absolute top-1/2 left-4 right-4 h-px bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-10 flex flex-col items-center gap-6">
                <p className="text-white text-[10px] font-black uppercase tracking-widest bg-black/40 px-4 py-1.5 rounded-full">{status}</p>
                
                <div className="flex items-center gap-12">
                    <button 
                        onClick={onClose} 
                        className="text-white font-bold text-xs uppercase tracking-widest px-4"
                    >
                        Cancel
                    </button>

                    <button 
                        onClick={handleManualCapture}
                        className="w-20 h-20 bg-white rounded-full border-4 border-slate-400 shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
                    >
                        <div className="w-16 h-16 rounded-full border-2 border-slate-900" />
                    </button>

                    <div className="w-16" /> 
                </div>
            </div>
        </div>
    );
};

const ModalPortal = ({ children }) => {
    if (typeof document === 'undefined') return null;
    return ReactDOM.createPortal(children, document.body);
};

// --- SEARCH OVERLAY ---
const SearchOverlay = ({ 
    isSearching, setIsSearching, 
    searchQuery, setSearchQuery, 
    isApiLoading, suggestions, 
    onSelect, recentSearches, 
    activeMode, setActiveMode,
    onSelectExercise
}) => {
    const [isScanning, setIsScanning] = useState(false);

    const handleScanResult = (barcode) => {
        setSearchQuery(barcode);
        setIsScanning(false);
    };

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
                {isScanning ? (
                    <BarcodeScanner onResult={handleScanResult} onClose={() => setIsScanning(false)} />
                ) : (
                    <>
                        <div className="pt-14 px-5 pb-4 bg-white shadow-sm z-20 border-b border-slate-50">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Add Entry</h2>
                                <button 
                                    onClick={() => { setIsSearching(false); setSearchQuery(''); }} 
                                    className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 font-bold"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="flex p-1 bg-slate-100 rounded-xl mb-4 relative">
                                <motion.div 
                                    layout
                                    className="absolute top-1 bottom-1 bg-white rounded-[0.6rem] shadow-sm z-0"
                                    initial={false}
                                    animate={{ 
                                        left: activeMode === 'food' ? '4px' : '50%', 
                                        width: 'calc(50% - 4px)'
                                    }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                                <button 
                                    onClick={() => { setActiveMode('food'); setSearchQuery(''); }} 
                                    className={`flex-1 relative z-10 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeMode === 'food' ? 'text-slate-900' : 'text-slate-400'}`}
                                >
                                    Food
                                </button>
                                <button 
                                    onClick={() => { setActiveMode('exercise'); setSearchQuery(''); }} 
                                    className={`flex-1 relative z-10 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeMode === 'exercise' ? 'text-slate-900' : 'text-slate-400'}`}
                                >
                                    Exercise
                                </button>
                            </div>

                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <ColoredIcon src={ICONS.search} colorClass="bg-current" sizeClass="w-5 h-5" />
                                </div>
                                <input 
                                    autoFocus 
                                    type="search" 
                                    placeholder={activeMode === 'food' ? "Search food or scan..." : "Search activity..."} 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                    className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-12 font-bold text-slate-900 placeholder:text-slate-400 outline-none" 
                                />
                                
                                {activeMode === 'food' && (
                                    <button 
                                        onClick={() => setIsScanning(true)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1.5 active:scale-95 transition-transform"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto px-5 py-4 no-scrollbar bg-white">
                            {activeMode === 'exercise' ? (
                                <div className="space-y-2">
                                    {EXERCISE_DB.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase())).map((ex) => (
                                        <button 
                                            key={ex.id}
                                            onClick={() => onSelectExercise(ex)}
                                            className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl text-left active:bg-slate-100 transition-colors"
                                        >
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">{ex.name}</h4>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">MET: {ex.met}</p>
                                            </div>
                                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-300 shadow-sm">+</div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <section className="space-y-2 pb-24">
                                    {suggestions.map((res) => (
                                        <article 
                                            key={res.fdcId} 
                                            onClick={() => onSelect(res)} 
                                            className="flex items-center gap-4 p-4 active:bg-slate-50 rounded-2xl cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                                        >
                                            <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 bg-white p-1 border border-slate-100 shadow-sm">
                                                <img src={res.logo} alt="" className="w-full h-full object-contain" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/706/706164.png'} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900 text-sm leading-tight">{res.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{res.brand}</p>
                                            </div>
                                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-200 shadow-sm font-light text-xl">+</div>
                                        </article>
                                    ))}
                                    {isApiLoading && (
                                        <div className="text-center py-12">
                                            <div className="inline-block w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                    {!isApiLoading && searchQuery.length >= 3 && suggestions.length === 0 && (
                                        <div className="text-center py-20 opacity-40">
                                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No Food Records Found</p>
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>
                    </>
                )}
            </motion.div>
            )}
        </AnimatePresence>
      </ModalPortal>
    );
};

// --- MAIN DASHBOARD COMPONENT ---
const Dashboard = ({ profile, setIsSearching, isSearching }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [trackingSuccess, setTrackingSuccess] = useState(false);
  const [portionSize, setPortionSize] = useState(1.0);
  const [selectedMeal, setSelectedMeal] = useState('Breakfast');
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [showMicros, setShowMicros] = useState(false);
  const [offlineIntake, setOfflineIntake] = useState([]);
  const [searchMode, setSearchMode] = useState('food'); 
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseDuration, setExerciseDuration] = useState(30);

  useEffect(() => {
    try {
        const cached = localStorage.getItem('safespoon_offline_intake');
        if (cached) setOfflineIntake(JSON.parse(cached));
    } catch (e) { console.error("Local load fail", e); }
  }, []);

  // --- DYNAMIC DEMOGRAPHICS COMPOSITION ENGINE (16 NUTRIENTS) ---
  const dailyStats = useMemo(() => {
    let bmr = 1600; 
    let weightKg = 70; 
    let age = 25; 
    let gender = 'male';

    if (profile?.weight && profile?.height && profile?.age && profile?.gender) {
        weightKg = parseFloat(profile.weight) * 0.453592;
        const heightCm = parseFloat(profile.height) * 2.54;
        age = parseFloat(profile.age);
        gender = profile.gender;
        bmr = (gender === 'male') ? (10 * weightKg + 6.25 * heightCm - 5 * age + 5) : (10 * weightKg + 6.25 * heightCm - 5 * age - 161);
    }
    
    const tdee = Math.round(bmr * (profile?.activityLevel || 1.375));
    
    // Demographic Specific Goals
    const goals = {
        calories: tdee,
        protein: Math.round(tdee * 0.20 / 4),
        carbs: Math.round(tdee * 0.50 / 4),
        fat: Math.round(tdee * 0.30 / 9),
        fiber: 30,
        sugar: 36,
        satFat: Math.round(tdee * 0.10 / 9),
        polyFat: Math.round(tdee * 0.08 / 9),
        monoFat: Math.round(tdee * 0.12 / 9),
        transFat: 2,
        cholesterol: 300,
        sodium: 2300,
        potassium: 4700,
        vitaminA: 900,
        vitaminC: 90,
        calcium: 1300,
        iron: (gender === 'female' && age < 50) ? 18 : 8
    };
    
    const combinedIntake = [...(profile?.dailyIntake || []), ...offlineIntake];
    const dateStr = selectedDate.toDateString();
    
    // Calculate Totals
    const totals = combinedIntake.reduce((acc, item) => {
        if (new Date(item.timestamp).toDateString() !== dateStr || item.type === 'exercise') return acc;
        return { 
            calories: acc.calories + (item.calories?.amount || 0), 
            protein: acc.protein + (item.protein?.amount || 0), 
            carbs: acc.carbs + (item.carbs?.amount || 0), 
            fat: acc.fat + (item.fat?.amount || 0),
            sugar: acc.sugar + (item.sugar?.amount || 0),
            fiber: acc.fiber + (item.fiber?.amount || 0),
            satFat: acc.satFat + (item.satFat?.amount || 0),
            polyFat: acc.polyFat + (item.polyFat?.amount || 0),
            monoFat: acc.monoFat + (item.monoFat?.amount || 0),
            transFat: acc.transFat + (item.transFat?.amount || 0),
            cholesterol: acc.cholesterol + (item.cholesterol?.amount || 0),
            sodium: acc.sodium + (item.sodium?.amount || 0),
            potassium: acc.potassium + (item.potassium?.amount || 0),
            vitaminA: acc.vitaminA + (item.vitaminA?.amount || 0),
            vitaminC: acc.vitaminC + (item.vitaminC?.amount || 0),
            calcium: acc.calcium + (item.calcium?.amount || 0),
            iron: acc.iron + (item.iron?.amount || 0)
        };
    }, { 
        calories: 0, protein: 0, carbs: 0, fat: 0, 
        sugar: 0, fiber: 0, satFat: 0, polyFat: 0, 
        monoFat: 0, transFat: 0, cholesterol: 0, sodium: 0, 
        potassium: 0, vitaminA: 0, vitaminC: 0, calcium: 0, iron: 0 
    });

    const meals = { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] };
    combinedIntake.forEach(item => {
        if (new Date(item.timestamp).toDateString() === dateStr && !item.type) {
            meals[item.meal || 'Snacks'].push(item);
        }
    });

    return { totals, goals, meals, weightKg };
  }, [profile, selectedDate, offlineIntake]);

  // --- DYNAMIC SMART SUMMARY ---
  const smartSummary = useMemo(() => {
      const { totals, goals } = dailyStats;
      const remaining = goals.calories - totals.calories;
      
      if (totals.calories === 0) return "☀️ Good morning! Scan your first meal to get started.";
      if (remaining < 0) return "⚠️ You've exceeded your daily calorie budget. Focus on hydration.";
      if (totals.sugar > goals.sugar) return "🍭 Sugar intake is elevated. Try opting for whole foods.";
      if (totals.protein >= goals.protein) return "💪 Excellent! You've hit your protein target for the day.";
      if (remaining < 300) return "🏁 You're close to your limit. A light snack fits perfectly.";
      return `👍 You're on track. ${remaining} kcal remaining in your budget.`;
  }, [dailyStats]);

  // --- ACTIONS & API HANDLERS ---

  const handleProductSelect = async (product) => {
      setSelectedProduct({ ...product, fullName: product.name, coreMetrics: { calories: { amount: 0 } } }); 
      try {
        const response = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${product.fdcId}?api_key=${USDA_API_KEY}`);
        const data = await response.json();
        
        const rawSize = data.servingSize || 100;
        const multiplier = rawSize / 100;

        const getNut = (ids) => {
            const n = data.foodNutrients?.find(nut => ids.includes(String(nut.nutrient.number)));
            return { amount: Math.round((n?.amount || 0) * multiplier * 10) / 10 };
        };

        const details = {
            servingLabel: `${rawSize}${data.servingSizeUnit || 'g'}`,
            householdReference: data.householdServingFullText || null, 
            fullName: data.description,
            brand: data.brandOwner || product.brand,
            coreMetrics: { 
                calories: getNut(['208', '1008']), 
                protein: getNut(['203']), 
                fat: getNut(['204']), 
                carbs: getNut(['205']),
                sugar: getNut(['269']), 
                fiber: getNut(['291']), 
                sodium: getNut(['307']),
                satFat: getNut(['606']), 
                polyFat: getNut(['646']), 
                monoFat: getNut(['645']), 
                transFat: getNut(['605']),
                cholesterol: getNut(['601']), 
                potassium: getNut(['306']), 
                vitaminA: getNut(['318', '320']), 
                vitaminC: getNut(['401']), 
                calcium: getNut(['301']), 
                iron: getNut(['303'])
            }
        };
        setSelectedProduct(prev => ({ ...prev, ...details }));
    } catch (err) { console.error("USDA Fetch Error", err); }
  };

  const saveExercise = async () => {
      const met = selectedExercise.met;
      const burned = Math.round(((met * 3.5 * dailyStats.weightKg) / 200) * exerciseDuration);
      const entry = { type: 'exercise', name: selectedExercise.name, caloriesBurned: burned, timestamp: selectedDate.toISOString() };
      
      try {
          await updateDoc(doc(db, "users", profile.uid), { dailyActivity: arrayUnion(entry) });
          setTrackingSuccess(true);
      } catch (e) { console.warn("Exercise Offline Save", e); }
      
      setTimeout(() => { setSelectedExercise(null); setIsSearching(false); setTrackingSuccess(false); }, 1500);
  };

  const handleAddToIntake = async () => {
    const base = selectedProduct.coreMetrics;
    const scaled = {};
    Object.keys(base).forEach(key => {
        const val = base[key]?.amount;
        trackedMetrics[key] = { amount: typeof val === 'number' ? Math.round(val * portionSize) : 0 };
    });

    const newLogEntry = { 
        ...trackedMetrics, 
        name: selectedProduct.fullName || "Unknown Food",
        brand: selectedProduct.brand || "Generic",
        portion: Number(portionSize) || 1,
        meal: selectedMeal, 
        timestamp: selectedDate.toISOString() 
    };

    try {
      await updateDoc(doc(db, "users", profile.uid), {
        dailyIntake: arrayUnion(newLogEntry)
      });
      setTrackingSuccess(true);
    } catch (e) { 
        const currentOffline = JSON.parse(localStorage.getItem('safespoon_offline_intake') || '[]');
        const updatedOffline = [...currentOffline, newLogEntry];
        localStorage.setItem('safespoon_offline_intake', JSON.stringify(updatedOffline));
        setOfflineIntake(updatedOffline);
        setTrackingSuccess(true);
    }

    setTimeout(() => {
        setSelectedProduct(null);
        setTrackingSuccess(false);
        setPortionSize(1.0);
        setIsSearching(false);
    }, 1500);
  };

  useEffect(() => {
    if (searchQuery.length < 3 || searchMode !== 'food') { 
        if (searchMode === 'food') setSuggestions([]); 
        return; 
    }
    const timeoutId = setTimeout(async () => {
        setIsApiLoading(true);
        setSearchError(null);
        try {
            const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(searchQuery)}&pageSize=8&dataType=Branded,Foundation`);
            const data = await res.json();
            if (data.foods) {
                setSuggestions(data.foods.map(f => ({
                    id: f.fdcId,
                    fdcId: f.fdcId,
                    name: f.description,
                    brand: f.brandOwner || (f.dataType === 'Foundation' ? 'Basic' : 'Generic'),
                    logo: getLogoUrl(f.brandOwner),
                    isExternal: true
                })));
            }
        } catch (e) { setSearchError("Connection to USDA failed."); } 
        finally { setIsApiLoading(false); }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchMode]);


  return (
    <main className="w-full pb-32 font-['Switzer'] bg-gray-50 min-h-screen text-slate-900">
      <SearchOverlay 
        isSearching={isSearching} 
        setIsSearching={setIsSearching} 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        isApiLoading={isApiLoading} 
        suggestions={suggestions} 
        onSelect={handleProductSelect} 
        activeMode={searchMode} 
        setActiveMode={setSearchMode} 
        onSelectExercise={setSelectedExercise} 
      />
      
      {/* --- EXERCISE DURATION MODAL --- */}
      <ModalPortal>
        <AnimatePresence>
            {selectedExercise && (
                <motion.div 
                    initial={{ y: "100%" }} 
                    animate={{ y: 0 }} 
                    exit={{ y: "100%" }} 
                    className="fixed inset-0 z-[11000] flex flex-col justify-end pointer-events-none"
                >
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm pointer-events-auto" onClick={() => setSelectedExercise(null)} />
                    <div className="bg-white w-full rounded-t-[2rem] p-6 pb-8 pointer-events-auto shadow-2xl relative z-10">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                        
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900">{selectedExercise.name}</h2>
                            <p className="text-sm font-bold text-slate-400 mt-1">Intensity Level: {selectedExercise.met > 7 ? 'High' : 'Moderate'}</p>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-6 mb-8">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Duration</span>
                                <span className="text-3xl font-black text-slate-900">{exerciseDuration}<span className="text-base font-bold text-slate-400 ml-1">min</span></span>
                            </div>
                            <input 
                                type="range" 
                                min="5" max="180" step="5" 
                                value={exerciseDuration} 
                                onChange={(e) => setExerciseDuration(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                            />
                        </div>

                        <button 
                            onClick={saveExercise}
                            className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 ${trackingSuccess ? 'bg-emerald-500 shadow-emerald-200' : 'bg-slate-900 shadow-slate-300'}`}
                        >
                            {trackingSuccess ? 'Saved!' : 'Log Activity'}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </ModalPortal>

      {/* --- HEADER --- */}
      <div className="pt-8 pb-1 px-4">
          <div className="flex justify-between items-center mb-0">
             <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {selectedDate.toDateString() === new Date().toDateString() ? "Overview" : `${selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
             </h1>
             {/* SCAN ICON */}
             <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSearching(true)}
                className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg active:bg-slate-800 transition-all"
             >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
             </motion.button>
          </div>
          
          {/* SMART SUMMARY - Dynamic */}
          <motion.p key={smartSummary} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-medium text-slate-500 mb-8 mt-2">{smartSummary}</motion.p>

          <DateStrip 
            intakeHistory={[...(profile?.dailyIntake || []), ...offlineIntake]} 
            dailyGoal={dailyStats.goals.calories} 
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
      </div>

      {/* --- FULL WIDTH CALORIE CARD --- */}
      {/* Intake / Goal */}
      <div className="px-4 pt-4 mb-6">
          <StatCard icon={ICONS.calories} colorText="text-slate-900" colorBg="bg-slate-100" label="Calories Consumed" value={dailyStats.totals.calories} unit="kcal" max={dailyStats.goals.calories} progressColor="bg-slate-900" progressBg="bg-slate-100" fullWidth={true} />
      </div>

      {/* --- MACRO GRID --- */}
      <div className="px-4 grid grid-cols-3 gap-3 mb-8">
            <StatCard icon={ICONS.protein} colorText="text-slate-900" colorBg="bg-slate-100" label="Protein" value={dailyStats.totals.protein} unit="g" max={dailyStats.goals.protein} progressColor="bg-slate-900" progressBg="bg-slate-100" />
            <StatCard icon={ICONS.carbs} colorText="text-slate-900" colorBg="bg-slate-100" label="Carbs" value={dailyStats.totals.carbs} unit="g" max={dailyStats.goals.carbs} progressColor="bg-slate-900" progressBg="bg-slate-100" />
            <StatCard icon={ICONS.fat} colorText="text-slate-900" colorBg="bg-slate-100" label="Fat" value={dailyStats.totals.fat} unit="g" max={dailyStats.goals.fat} progressColor="bg-slate-900" progressBg="bg-slate-100" />
      </div>

      {/* --- NUTRIENT ANALYSIS --- */}
      <div className="mx-4 bg-white rounded-[1.5rem] border border-slate-50 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden mb-8">
            <button onClick={() => setShowMicros(!showMicros)} className="w-full flex items-center justify-between p-5 bg-slate-50/50 active:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Nutrient Analysis (16)</span>
                <motion.div animate={{ rotate: showMicros ? 180 : 0 }}><svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></motion.div>
            </button>
            <AnimatePresence>
                {showMicros && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-5 pb-6 overflow-hidden">
                        <div className="mt-4 border-b border-slate-50 pb-2 mb-3"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Lipids</p></div>
                        <NutrientRow label="Saturated Fat" value={dailyStats.totals.satFat} max={dailyStats.goals.satFat} unit="g" />
                        <NutrientRow label="Polyunsaturated" value={dailyStats.totals.polyFat} max={dailyStats.goals.polyFat} unit="g" />
                        <NutrientRow label="Monounsaturated" value={dailyStats.totals.monoFat} max={dailyStats.goals.monoFat} unit="g" />
                        <NutrientRow label="Trans Fat" value={dailyStats.totals.transFat} max={dailyStats.goals.transFat} unit="g" />
                        <NutrientRow label="Cholesterol" value={dailyStats.totals.cholesterol} max={dailyStats.goals.cholesterol} unit="mg" />
                        
                        <div className="mt-6 border-b border-slate-50 pb-2 mb-3"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Carbs & Fiber</p></div>
                        <NutrientRow label="Dietary Fiber" value={dailyStats.totals.fiber} max={dailyStats.goals.fiber} unit="g" />
                        <NutrientRow label="Total Sugar" value={dailyStats.totals.sugar} max={dailyStats.goals.sugar} unit="g" />
                        
                        <div className="mt-6 border-b border-slate-50 pb-2 mb-3"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Micronutrients</p></div>
                        <NutrientRow label="Sodium" value={dailyStats.totals.sodium} max={dailyStats.goals.sodium} unit="mg" />
                        <NutrientRow label="Potassium" value={dailyStats.totals.potassium} max={dailyStats.goals.potassium} unit="mg" />
                        <NutrientRow label="Calcium" value={dailyStats.totals.calcium} max={dailyStats.goals.calcium} unit="mg" />
                        <NutrientRow label="Iron" value={dailyStats.totals.iron} max={dailyStats.goals.iron} unit="mg" />
                        <NutrientRow label="Vitamin A" value={dailyStats.totals.vitaminA} max={dailyStats.goals.vitaminA} unit="µg" />
                        <NutrientRow label="Vitamin C" value={dailyStats.totals.vitaminC} max={dailyStats.goals.vitaminC} unit="mg" />
                    </motion.div>
                )}
            </AnimatePresence>
      </div>

      {/* --- MEAL LIST (Transparent Icons) --- */}
      <div className="px-4 space-y-4 pb-12">
          {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((meal) => {
              const items = dailyStats.meals[meal]; const cals = items.reduce((s, i) => s + (i.calories?.amount || 0), 0);
              return (
                  <section key={meal} className="bg-white rounded-[1.5rem] p-2 shadow-sm border border-slate-50">
                      <div className="flex justify-between items-center p-4 pb-2">
                           <div className="flex items-center gap-3">
                                {/* Transparent Icon Container */}
                                <div className="w-8 h-8 flex items-center justify-center">
                                    <ColoredIcon src={ICONS[meal.toLowerCase()]} colorClass="text-slate-900 bg-current" sizeClass="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800">{meal}</h3>
                           </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{cals} kcal</span>
                      </div>
                      
                      {items.length > 0 ? (
                          <div className="space-y-1 p-2">
                              {items.map((item, i) => (
                                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl active:bg-slate-100 transition-colors">
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-300 font-bold text-xs shadow-sm border border-slate-50">{item.name.charAt(0)}</div>
                                          <div><p className="font-bold text-xs text-slate-900 leading-tight">{item.name}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1">{item.brand}</p></div>
                                      </div>
                                      <span className="font-bold text-xs text-slate-900">{item.calories?.amount}</span>
                                  </div>
                              ))}
                              <button onClick={() => { setIsSearching(true); setSelectedMeal(meal); }} className="w-full py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest active:text-slate-600 transition-colors">+ Add Item</button>
                          </div>
                      ) : (
                          <div className="p-3">
                             <button onClick={() => { setIsSearching(true); setSelectedMeal(meal); }} className="w-full py-3 border-2 border-dashed border-slate-100 rounded-xl text-[10px] font-bold text-slate-300 uppercase tracking-widest active:border-slate-300 transition-all">Empty - Tap to Log</button>
                          </div>
                      )}
                  </section>
              );
          })}
      </div>

      {/* --- FOOD MODAL --- */}
      <ModalPortal>
        <AnimatePresence>
            {selectedProduct && (
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed inset-0 z-[11000] flex flex-col justify-end pointer-events-none">
                    <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] pointer-events-auto transition-opacity" onClick={() => setSelectedProduct(null)} />
                    <div className="bg-white w-full rounded-t-[2rem] p-6 pb-12 pointer-events-auto h-[90vh] overflow-y-auto relative shadow-2xl no-scrollbar border-t border-slate-100">
                       <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />
                        <div className="text-center mb-8 px-6">
                            <h2 className="text-2xl font-black text-slate-900 leading-tight mb-2">{selectedProduct.fullName}</h2>
                            <span className="inline-block bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">{selectedProduct.brand}</span>
                        </div>

                        <div className="mb-8 px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-sm shrink-0"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></div>
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Visual Guide</p><p className="text-sm font-bold text-slate-900 leading-tight">{selectedProduct.householdReference || getVisualReference(parseFloat(selectedProduct.servingLabel), selectedProduct.fullName)}</p></div>
                        </div>

                        <div className="flex items-center justify-between mb-8 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <button onClick={() => setPortionSize(p => Math.max(0.5, p - 0.5))} className="w-12 h-12 bg-white rounded-xl text-xl font-bold text-slate-900 shadow-sm active:scale-90 transition-transform">-</button>
                            <div className="text-center"><span className="block text-3xl font-bold text-slate-900 leading-none mb-1">{portionSize}<span className="text-xl text-slate-300 ml-1">x</span></span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">({selectedProduct.servingLabel})</span></div>
                            <button onClick={() => setPortionSize(p => p + 0.5)} className="w-12 h-12 bg-white rounded-xl text-xl font-bold text-slate-900 shadow-sm active:scale-90 transition-transform">+</button>
                        </div>

                        <div className="grid grid-cols-4 gap-3 mb-10">
                            {['calories', 'protein', 'carbs', 'fat'].map(m => (
                                <div key={m} className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center aspect-square border border-slate-100 shadow-sm">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">{m.slice(0,3)}</span>
                                    <span className="text-xl font-black text-slate-900 leading-none">{Math.round((selectedProduct.coreMetrics[m]?.amount || 0) * portionSize)}</span>
                                    <span className="text-[9px] font-bold text-slate-300 mt-1 uppercase">{m === 'calories' ? 'kcal' : 'g'}</span>
                                </div>
                            ))}
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                            <motion.button whileTap={{ scale: 0.98 }} onClick={handleAddToIntake} className={`w-full py-5 rounded-2xl font-bold text-xs uppercase tracking-widest text-white shadow-xl transition-all ${trackingSuccess ? 'bg-emerald-500 shadow-emerald-200' : 'bg-slate-900 shadow-slate-300'}`}>{trackingSuccess ? 'Logged' : `Add to ${selectedMeal}`}</motion.button>
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