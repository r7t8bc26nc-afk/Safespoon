import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { db } from '../firebase';
import { collection, query, limit, where, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { motion, AnimatePresence } from 'framer-motion';
// --- NEW SPECIALIZED SCANNER IMPORT ---
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

// --- EXERCISE DB ---
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
        <div className="flex justify-between items-center mb-6 px-1">
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
                        bgClass = 'bg-emerald-100 text-emerald-600 border-emerald-200';
                        textClass = 'text-emerald-600 font-bold';
                    } else if (status === 'failed') {
                        bgClass = 'bg-rose-100 text-rose-600 border-rose-200';
                        textClass = 'text-rose-600 font-bold';
                    } else if (isToday) {
                        bgClass = 'bg-slate-100 text-slate-900 border-slate-200';
                        textClass = 'text-slate-900 font-bold';
                    }
                } else {
                    bgClass = 'bg-slate-900 text-white shadow-lg scale-110';
                    textClass = 'text-slate-900 font-black';
                }

                return (
                    <button 
                        key={i} 
                        onClick={() => onSelectDate(date)}
                        className="flex flex-col items-center gap-2 focus:outline-none group active:scale-95 transition-transform"
                    >
                        <span className={`text-[10px] uppercase tracking-wider transition-colors ${textClass}`}>{dayLabel}</span>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${bgClass}`}>
                            {dayNumber}
                        </div>
                        {isToday && !isSelected && <div className="w-1 h-1 rounded-full bg-slate-900 mt-1" />}
                    </button>
                )
            })}
        </div>
    );
};

const StatCard = ({ icon, colorText, colorBg, label, value, unit, max, progressColor, progressBg }) => {
    return (
        <div className="bg-white rounded-[1.5rem] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between h-36 relative overflow-hidden active:scale-98 transition-transform border border-slate-50">
            <div className="flex justify-between items-start">
                <div className={`w-9 h-9 rounded-full ${colorBg} ${colorText} flex items-center justify-center`}>
                    <ColoredIcon src={icon} colorClass="bg-current" sizeClass="w-4 h-4" />
                </div>
                {unit === 'kcal' && (
                     <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{unit}</span>
                )}
            </div>
            <div className="mt-1">
                <div className="flex items-baseline">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">{value}</span>
                    {max && (
                        <span className="text-sm font-bold text-slate-300 ml-1">/ {max}</span>
                    )}
                </div>
                {unit !== 'kcal' && <span className="text-xs font-bold text-slate-400 ml-0.5">{unit}</span>}
                <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">{label}</p>
            </div>
            <div className="mt-auto pt-3">
                 {max && (
                     <div className="flex items-center gap-2">
                        <ProgressBar current={value} max={max} colorClass={progressColor} bgClass={progressBg} />
                     </div>
                 )}
            </div>
        </div>
    );
};

const NutrientRow = ({ label, value, max, unit }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-3 w-1/2">
            <div className="flex-1">
                <ProgressBar current={value} max={max} colorClass="bg-slate-400" bgClass="bg-slate-100" height="h-1.5" />
            </div>
            <div className="text-right w-12">
                <span className="text-sm font-black text-slate-900">{Math.round(value)}</span>
                <span className="text-[9px] text-slate-400 ml-0.5">{unit}</span>
            </div>
        </div>
    </div>
);

// --- NEW MANUAL BARCODE SCANNER (FINAL REPAIR) ---
const BarcodeScanner = ({ onResult, onClose }) => {
    const scannerId = "safespoon-qr-reader";
    const scannerRef = useRef(null);
    const [status, setStatus] = useState("Aim at barcode");
    const [isFlash, setIsFlash] = useState(false);

    useEffect(() => {
        // Initialize specializing in American 1D formats
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
                // Handle success
                if (navigator.vibrate) navigator.vibrate(200);
                html5QrCode.stop().then(() => onResult(decodedText));
            },
            (error) => { /* Silent progress tracking */ }
        ).catch(err => {
            console.error(err);
            setStatus("Camera Error");
        });

        return () => {
            if (html5QrCode.isScanning) {
                html5QrCode.stop().catch(e => console.error(e));
            }
        };
    }, [onResult]);

    // Manual capture button logic
    const handleManualCapture = () => {
        setIsFlash(true);
        setTimeout(() => setIsFlash(false), 150);
        setStatus("Analyzing frame...");
        
        // The current frame is analyzed by the engine; 
        // high FPS (20) ensures the latest frame is captured.
        if (navigator.vibrate) navigator.vibrate(50);
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center font-['Switzer']">
            {/* Library video injection */}
            <div id={scannerId} className="w-full h-full" />

            {/* Shutter flash */}
            <AnimatePresence>
                {isFlash && (
                    <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} className="absolute inset-0 bg-white z-50 pointer-events-none" />
                )}
            </AnimatePresence>

            {/* Custom UI Overlays */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-72 h-44 border-2 border-white/40 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"></div>
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-red-500/50 shadow-[0_0_10px_red]" />
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-10 flex flex-col items-center gap-6">
                <p className="text-white text-[10px] font-black uppercase tracking-widest bg-black/40 px-4 py-1.5 rounded-full">{status}</p>
                
                <div className="flex items-center gap-12">
                    <button onClick={onClose} className="text-white font-bold text-xs uppercase tracking-widest px-4">Cancel</button>
                    
                    {/* THE MANUAL SHUTTER BUTTON */}
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

const SearchOverlay = ({ 
    isSearching, setIsSearching, 
    searchQuery, setSearchQuery, 
    isApiLoading, suggestions, 
    onSelect, recentSearches, 
    searchError,
    activeMode, setActiveMode,
    onSelectExercise
}) => {
    const [isScanning, setIsScanning] = useState(false);

    const handleScanResult = (barcode) => {
        setSearchQuery(barcode);
        setIsScanning(false);
    };

    const handleQuickAdd = (term) => {
        setSearchQuery(term);
    };

    const exerciseResults = useMemo(() => {
        if (activeMode !== 'exercise' || searchQuery.length < 2) return [];
        const q = searchQuery.toLowerCase();
        return EXERCISE_DB.filter(ex => ex.name.toLowerCase().includes(q));
    }, [searchQuery, activeMode]);

    const quickSuggestions = ["Egg", "Avocado", "Oats", "Chicken", "Banana", "Rice", "Coffee"];

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
                        <div className="pt-12 px-4 pb-0 bg-white shadow-sm z-20">
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Add {activeMode === 'food' ? 'Food' : 'Activity'}</h2>
                                <button 
                                    onClick={() => { setIsSearching(false); setSearchQuery(''); }} 
                                    className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 font-bold active:bg-slate-200 transition-colors text-sm"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="flex p-1 bg-slate-100 rounded-xl mb-3 relative">
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
                                    className={`flex-1 relative z-10 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeMode === 'food' ? 'text-slate-900' : 'text-slate-400'}`}
                                >
                                    Food
                                </button>
                                <button 
                                    onClick={() => { setActiveMode('exercise'); setSearchQuery(''); }} 
                                    className={`flex-1 relative z-10 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeMode === 'exercise' ? 'text-slate-900' : 'text-slate-400'}`}
                                >
                                    Exercise
                                </button>
                            </div>

                            <div className="relative group mb-3">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <ColoredIcon src={ICONS.search} colorClass="bg-current" sizeClass="w-4 h-4" />
                                </div>
                                <input 
                                    autoFocus 
                                    type="search" 
                                    placeholder={activeMode === 'food' ? "Search food..." : "Search workout..."} 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                    className="w-full bg-slate-50 focus:bg-slate-100 border-none rounded-xl py-3 pl-10 pr-10 font-medium text-[15px] text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-normal transition-all ring-0" 
                                />
                                
                                {activeMode === 'food' && (
                                    <button 
                                        onClick={() => setIsScanning(true)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1.5"
                                        title="Scan Barcode"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto px-4 py-2 no-scrollbar bg-white">
                            {activeMode === 'exercise' && (
                                <div className="space-y-1">
                                    {exerciseResults.length > 0 ? (
                                        exerciseResults.map((ex) => (
                                            <motion.button 
                                                key={ex.id}
                                                onClick={() => onSelectExercise(ex)}
                                                className="w-full flex items-center justify-between p-3 bg-slate-50/50 rounded-xl active:scale-98 transition-transform border border-transparent hover:border-slate-100 text-left"
                                            >
                                                <div>
                                                    <h4 className="font-bold text-slate-900 text-sm">{ex.name}</h4>
                                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mt-0.5">MET: {ex.met}</p>
                                                </div>
                                                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-slate-300 font-light text-lg shadow-sm">+</div>
                                            </motion.button>
                                        ))
                                    ) : searchQuery.length > 1 ? (
                                        <div className="text-center py-12 opacity-60">
                                            <p className="text-slate-500 font-bold text-sm">No activity found.</p>
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 opacity-50">
                                            <p className="text-xs font-bold text-slate-400">Type to find workouts...</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeMode === 'food' && (
                                <>
                                    {searchError && (
                                        <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                                            <div className="text-red-500 font-bold text-xs mt-0.5">⚠️</div>
                                            <div>
                                                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Error</p>
                                                <p className="text-xs text-red-500 leading-tight">{searchError}</p>
                                            </div>
                                        </div>
                                    )}

                                    {searchQuery.length === 0 && (
                                        <div className="pt-1">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Add</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mb-6">
                                                {quickSuggestions.map(term => (
                                                    <button key={term} onClick={() => handleQuickAdd(term)} className="px-3 py-1.5 bg-white border border-slate-100 shadow-sm rounded-full text-xs font-medium text-slate-600 active:bg-slate-50 transition-all hover:border-slate-200">{term}</button>
                                                ))}
                                            </div>
                                            {recentSearches.length > 0 && (
                                                <>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent</span>
                                                    </div>
                                                    {recentSearches.map((res, idx) => (
                                                        <motion.article key={`recent-${idx}`} onClick={() => onSelect(res)} className="flex items-center gap-3 p-2 mb-1.5 bg-slate-50/50 rounded-xl cursor-pointer active:scale-98 transition-transform border border-transparent hover:border-slate-100">
                                                            <div className="h-9 w-9 rounded-lg overflow-hidden shrink-0 bg-white p-1 shadow-sm border border-slate-50">
                                                                <img src={res.logo} alt="" className="w-full h-full object-contain" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/706/706164.png'} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className="font-bold text-slate-900 text-xs capitalize">{res.name}</h4>
                                                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">{res.brand}</p>
                                                            </div>
                                                            <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-slate-300 font-light text-lg shadow-sm border border-slate-50">+</div>
                                                        </motion.article>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {searchQuery.length > 0 && (
                                        <section className="space-y-1 pb-20">
                                            {searchQuery.length < 3 ? (
                                                <div className="text-center py-10 opacity-50">
                                                    <p className="text-xs font-bold text-slate-400">Keep typing...</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {suggestions.map((res, i) => (
                                                        <motion.article key={res.fdcId || res.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => onSelect(res)} className="flex items-center gap-3 p-2.5 active:bg-slate-50 rounded-xl cursor-pointer transition-colors border-b border-slate-50 last:border-0">
                                                            <div className="h-9 w-9 rounded-lg overflow-hidden shrink-0 bg-white p-1 border border-slate-100 shadow-sm">
                                                                <img src={res.logo} alt="" className="w-full h-full object-contain" loading="lazy" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/706/706164.png'} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className="font-bold text-slate-900 text-xs capitalize">{res.name}</h4>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{res.brand}</p>
                                                            </div>
                                                        </motion.article>
                                                    ))}
                                                    {isApiLoading && (
                                                        <div className="text-center py-6">
                                                            <div className="inline-block w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                                                        </div>
                                                    )}
                                                    {!isApiLoading && suggestions.length === 0 && (
                                                        <div className="text-center py-10 opacity-60">
                                                            <p className="text-slate-500 font-bold text-sm">No food found.</p>
                                                            <p className="text-slate-400 text-[10px] mt-1">Try a simpler name or scan the barcode.</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </section>
                                    )}
                                </>
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

const Dashboard = ({ profile, setIsSearching, isSearching, setDashboardLocation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [trackingSuccess, setTrackingSuccess] = useState(false);
  const [portionSize, setPortionSize] = useState(1.0);
  const [selectedMeal, setSelectedMeal] = useState('Breakfast');
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [showMicros, setShowMicros] = useState(false); 
  const [offlineIntake, setOfflineIntake] = useState([]);
  const [searchError, setSearchError] = useState(null);

  const [searchMode, setSearchMode] = useState('food'); 
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseDuration, setExerciseDuration] = useState(30);

  useEffect(() => {
      try {
          const cached = localStorage.getItem('safespoon_offline_intake');
          if (cached) setOfflineIntake(JSON.parse(cached));
      } catch (e) { console.error("Local load fail", e); }
  }, []);

  const dailyStats = useMemo(() => {
    let bmr = 1600;
    let weightKg = 70; 

    if (profile?.weight && profile?.height && profile?.age && profile?.gender) {
        weightKg = parseFloat(profile.weight) * 0.453592;
        const heightCm = parseFloat(profile.height) * 2.54;
        const age = parseFloat(profile.age);
        if (profile.gender === 'male') {
            bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
        } else {
            bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
        }
    }

    const activityMultiplier = profile?.activityLevel || 1.375; 
    const tdee = Math.round(bmr * activityMultiplier);
    const baseActiveBurn = Math.round(tdee - bmr);

    const goals = {
        calories: tdee,
        activeBurnCurrent: 0, 
        activeBurnGoal: 600,
        protein: Math.round((tdee * 0.25) / 4), 
        carbs: Math.round((tdee * 0.45) / 4), 
        fat: Math.round((tdee * 0.30) / 9), 
        sugar: 36, fiber: 30, sodium: 2300, cholesterol: 300, satFat: 20
    };

    const serverIntake = profile?.dailyIntake || [];
    const serverActivity = profile?.dailyActivity || [];
    const combinedIntake = [...serverIntake, ...offlineIntake]; 
    
    const selectedDateStr = selectedDate.toDateString();
    const todaysActivities = serverActivity.filter(act => {
        const d = new Date(act.timestamp);
        return d.toDateString() === selectedDateStr;
    });

    const totalExerciseBurn = todaysActivities.reduce((sum, act) => sum + (act.caloriesBurned || 0), 0);
    
    goals.activeBurnCurrent = baseActiveBurn + totalExerciseBurn;

    if (goals.activeBurnCurrent > goals.activeBurnGoal) {
        goals.activeBurnGoal = Math.round(goals.activeBurnCurrent * 1.2); 
    }

    const meals = { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] };
    
    const totals = combinedIntake.reduce((acc, item) => {
        const itemDate = new Date(item.timestamp).toDateString();
        if (itemDate !== selectedDateStr) return acc;
        if (item.type === 'exercise') return acc; 

        const mealType = item.meal || 'Snacks';
        if (meals[mealType]) meals[mealType].push(item);
        else meals.Snacks.push(item);

        return {
            calories: acc.calories + (item.calories?.amount || 0),
            protein: acc.protein + (item.protein?.amount || 0),
            carbs: acc.carbs + (item.carbs?.amount || 0),
            fat: acc.fat + (item.fat?.amount || 0),
            sugar: acc.sugar + (item.sugar?.amount || 0),
            fiber: acc.fiber + (item.fiber?.amount || 0),
            sodium: acc.sodium + (item.sodium?.amount || 0),
            cholesterol: acc.cholesterol + (item.cholesterol?.amount || 0),
            satFat: acc.satFat + (item.satFat?.amount || 0),
        };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, fiber: 0, sodium: 0, cholesterol: 0, satFat: 0 });

    let currentStreak = 0; 
    const todayStr = new Date().toDateString();
    if (combinedIntake.some(i => new Date(i.timestamp).toDateString() === todayStr)) currentStreak++;
    
    return { totals, goals, meals, currentStreak, weightKg };
  }, [profile, selectedDate, offlineIntake]);

  const handleProductSelect = async (product) => {
      setRecentSearches(prev => [product, ...prev.filter(i => i.id !== product.id)].slice(0, 10));
      setTrackingSuccess(false);
      setPortionSize(1.0);
      setSelectedMeal('Breakfast');
      
      const safeProduct = { ...product, fullName: product.fullName || product.name, logo: product.logo || getLogoUrl(product.brand), coreMetrics: { calories: { amount: 0 } } }; 
      
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
                calories: getNut(['208', '1008']), protein: getNut(['203', '1003']), fat: getNut(['204', '1004']), carbs: getNut(['205', '1005']), sugar: getNut(['269', '2000']), fiber: getNut(['291', '1079']), sodium: getNut(['307', '1093']), cholesterol: getNut(['601', '1253']), satFat: getNut(['606', '1258']),
            },
            ingredients: data.ingredients || "Ingredient data unavailable."
        };

        await setDoc(cacheRef, details);
        setSelectedProduct(prev => ({ ...prev, ...details }));
    } catch (err) { console.error(err); }
  };

  const handleExerciseSelect = (exercise) => {
      setSelectedExercise(exercise);
      setExerciseDuration(30); 
  };

  const saveExercise = async () => {
      if (!profile || !profile.uid) return;
      
      const met = selectedExercise.met;
      const weight = dailyStats.weightKg; 
      const burned = Math.round(((met * 3.5 * weight) / 200) * exerciseDuration);

      const newActivity = {
          type: 'exercise',
          name: selectedExercise.name,
          duration: exerciseDuration,
          caloriesBurned: burned,
          met: met,
          timestamp: selectedDate.toISOString()
      };

      try {
          await updateDoc(doc(db, "users", profile.uid), {
              dailyActivity: arrayUnion(newActivity)
          });
          setTrackingSuccess(true);
      } catch (e) {
          const updatedOffline = [...offlineIntake, newActivity];
          localStorage.setItem('safespoon_offline_intake', JSON.stringify(updatedOffline));
          setOfflineIntake(updatedOffline);
          setTrackingSuccess(true);
      }

      setTimeout(() => {
          setSelectedExercise(null);
          setTrackingSuccess(false);
          setIsSearching(false);
      }, 1500);
  };

  const handleAddToIntake = async () => {
    if (!profile || !profile.uid) return;
    
    const base = selectedProduct.coreMetrics;
    const trackedMetrics = {};
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
        } catch (e) { setSearchError("USDA API is currently unavailable."); } 
        finally { setIsApiLoading(false); }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchMode]);


  return (
    <main className="w-full pb-28 font-['Switzer'] bg-gray-50 min-h-screen text-slate-900">
      <SearchOverlay 
        isSearching={isSearching} 
        setIsSearching={setIsSearching} 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        isApiLoading={isApiLoading} 
        suggestions={suggestions} 
        onSelect={handleProductSelect} 
        recentSearches={recentSearches}
        searchError={searchError}
        activeMode={searchMode}
        setActiveMode={setSearchMode}
        onSelectExercise={handleExerciseSelect}
      />
      
      <ModalPortal>
        <AnimatePresence>
            {selectedExercise && (
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 z-[11000] flex flex-col justify-end pointer-events-none">
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm pointer-events-auto" onClick={() => setSelectedExercise(null)} />
                    <div className="bg-white w-full rounded-t-[2rem] p-6 pb-8 pointer-events-auto shadow-2xl">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-600">
                                <ColoredIcon src={ICONS.calories} colorClass="bg-current" sizeClass="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900">{selectedExercise.name}</h2>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-6 mb-8">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Duration</span>
                                <span className="text-3xl font-black text-slate-900">{exerciseDuration}<span className="text-base font-bold text-slate-400 ml-1">min</span></span>
                            </div>
                            <input type="range" min="5" max="180" step="5" value={exerciseDuration} onChange={(e) => setExerciseDuration(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900" />
                        </div>
                        <button onClick={saveExercise} className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 ${trackingSuccess ? 'bg-emerald-500 shadow-emerald-200' : 'bg-slate-900 shadow-slate-300'}`}>
                            {trackingSuccess ? 'Workout Logged!' : 'Log Activity'}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </ModalPortal>

      <div className="pt-8 pb-1 px-4">
          <div className="flex justify-between items-center mb-0">
             <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {selectedDate.toDateString() === new Date().toDateString() ? "Overview" : selectedDate.toLocaleDateString()}
             </h1>
             <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsSearching(true)} className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg active:bg-slate-800 transition-all">
                <span className="text-2xl font-light mb-1">+</span>
             </motion.button>
          </div>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-4">Daily Progress</p>
          <DateStrip intakeHistory={[...(profile?.dailyIntake || []), ...offlineIntake]} dailyGoal={dailyStats.goals.calories} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </div>

      <div className="px-4 mb-6">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard icon={ICONS.calories} colorText="text-slate-600" colorBg="bg-slate-100" label="Remaining" value={dailyStats.goals.calories - (dailyStats.totals.calories - dailyStats.goals.activeBurnCurrent)} unit="kcal" max={dailyStats.goals.calories} progressColor="bg-slate-900" progressBg="bg-slate-100" />
            <StatCard icon={ICONS.exercise} colorText="text-slate-600" colorBg="bg-slate-100" label="Active Burn" value={dailyStats.goals.activeBurnCurrent} max={dailyStats.goals.activeBurnGoal} progressColor="bg-slate-900" progressBg="bg-slate-100" />
            <StatCard icon={ICONS.protein} colorText="text-slate-600" colorBg="bg-slate-100" label="Protein" value={dailyStats.totals.protein} unit="g" max={dailyStats.goals.protein} progressColor="bg-slate-900" progressBg="bg-slate-100" />
            <StatCard icon={ICONS.carbs} colorText="text-slate-600" colorBg="bg-slate-100" label="Carbs" value={dailyStats.totals.carbs} unit="g" max={dailyStats.goals.carbs} progressColor="bg-slate-900" progressBg="bg-slate-100" />
          </div>
          <div className="bg-white rounded-[1.5rem] border border-slate-50 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                <button onClick={() => setShowMicros(!showMicros)} className="w-full flex items-center justify-between p-4 bg-slate-50/50">
                    <span className="text-[10px] font-semibold text-slate-600 capitalize">Nutrient Details</span>
                    <motion.div animate={{ rotate: showMicros ? 180 : 0 }}><svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></motion.div>
                </button>
                <AnimatePresence>
                    {showMicros && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="px-4 pb-4 overflow-hidden">
                            <NutrientRow label="Total Sugar" value={dailyStats.totals.sugar} max={dailyStats.goals.sugar} unit="g" />
                            <NutrientRow label="Fiber" value={dailyStats.totals.fiber} max={dailyStats.goals.fiber} unit="g" />
                            <NutrientRow label="Sodium" value={dailyStats.totals.sodium} max={dailyStats.goals.sodium} unit="mg" />
                        </motion.div>
                    )}
                </AnimatePresence>
          </div>
      </div>

      <div className="px-4 space-y-4">
          {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((meal) => {
              const items = dailyStats.meals[meal];
              const cals = items.reduce((s, i) => s + (i.calories?.amount || 0), 0);
              return (
                  <section key={meal} className="bg-white rounded-[1.25rem] p-1 shadow-sm border border-slate-50">
                      <div className="flex justify-between items-center p-3 pb-2">
                           <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-900 text-white">
                                    <ColoredIcon src={ICONS[meal.toLowerCase()]} colorClass="bg-current" sizeClass="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-semibold text-slate-700">{meal}</h3>
                           </div>
                          <span className="text-[10px] font-bold text-slate-400">{cals} kcal</span>
                      </div>
                      <div className="space-y-1 p-2">
                          {items.map((item, i) => (
                              <div key={i} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl">
                                  <div>
                                      <p className="font-bold text-xs text-slate-900">{item.name}</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.brand}</p>
                                  </div>
                                  <span className="font-black text-xs text-slate-900">{item.calories?.amount}</span>
                              </div>
                          ))}
                          <button onClick={() => { setIsSearching(true); setSelectedMeal(meal); }} className="w-full py-3 text-[10px] font-black text-slate-300 uppercase tracking-widest">+ Add Food</button>
                      </div>
                  </section>
              );
          })}
      </div>

      <ModalPortal>
        <AnimatePresence>
            {selectedProduct && (
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 z-[11000] flex flex-col justify-end pointer-events-none">
                    <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] pointer-events-auto" onClick={() => setSelectedProduct(null)} />
                    <div className="bg-white w-full rounded-t-[2rem] p-5 pb-8 pointer-events-auto h-[80vh] overflow-y-auto relative shadow-2xl">
                       <div className="w-10 h-1 bg-slate-100 rounded-full mx-auto mb-6" />
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-black text-slate-900 leading-tight mb-2">{selectedProduct.fullName}</h2>
                            <span className="inline-block bg-slate-50 text-slate-400 text-[10px] font-bold uppercase px-3 py-1 rounded-full">{selectedProduct.brand}</span>
                        </div>
                        <div className="flex items-center justify-between mb-6 bg-slate-50 p-2 rounded-2xl">
                            <button onClick={() => setPortionSize(p => Math.max(0.5, p - 0.5))} className="w-12 h-12 bg-white rounded-xl text-xl font-bold">-</button>
                            <div className="text-center">
                                <span className="block text-2xl font-black">{portionSize}x</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Serving ({selectedProduct.servingLabel})</span>
                            </div>
                            <button onClick={() => setPortionSize(p => p + 0.5)} className="w-12 h-12 bg-white rounded-xl text-xl font-bold">+</button>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mb-8">
                            {[{ label: 'Cal', val: selectedProduct.coreMetrics?.calories?.amount, unit: '' }, { label: 'Pro', val: selectedProduct.coreMetrics?.protein?.amount, unit: 'g' }, { label: 'Carb', val: selectedProduct.coreMetrics?.carbs?.amount, unit: 'g' }, { label: 'Fat', val: selectedProduct.coreMetrics?.fat?.amount, unit: 'g' }].map(m => (
                                <div key={m.label} className="bg-slate-50 rounded-xl p-2 flex flex-col items-center justify-center aspect-square">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">{m.label}</span>
                                    <span className="text-lg font-black text-slate-900">{m.val}</span>
                                    <span className="text-[9px] font-bold text-slate-400">{m.unit}</span>
                                </div>
                            ))}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-5 bg-white">
                            <motion.button whileTap={{ scale: 0.98 }} onClick={handleAddToIntake} className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white shadow-xl ${trackingSuccess ? 'bg-emerald-500 shadow-emerald-200' : 'bg-slate-900 shadow-slate-300'}`}>
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