import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { db } from '../firebase';
// Added 'orderBy' and 'startAt/endAt' logic via where clauses for search
import { collection, query, limit, where, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { PlateScanner } from './PlateScanner'; 
import { searchRestaurantMenu } from '../services/RestaurantService';

// --- ICON IMPORTS ---
import fireIcon from '../icons/fire.svg';
import dumbbellIcon from '../icons/dumbbell-filled.svg';
import searchIcon from '../icons/search.svg';
import breadIcon from '../icons/bread-slice.svg'; 
import candyIcon from '../icons/candy.svg'; 
import cheeseIcon from '../icons/cheese.svg'; 
import steakIcon from '../icons/steak.svg'; 
import eggIcon from '../icons/mug-hot.svg';
import cloudIcon from '../icons/cloud-shield.svg';
import heartIcon from '../icons/heart-check.svg';
import historyIcon from '../icons/rotate.svg'; 
import cameraIcon from '../icons/camera.svg'; 
import scannerIcon from '../icons/scanner.svg'; 

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
    vitals: heartIcon,
    history: historyIcon
};

const LOGO_DEV_PUBLIC_KEY = import.meta.env.VITE_LOGO_DEV_KEY;
const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY;

// --- HELPERS ---
const getVisualReference = (grams, name = "") => {
    if (!grams) return null;
    const foodName = name.toLowerCase();
    if (foodName.includes("meat") || foodName.includes("steak") || foodName.includes("chicken") || (grams >= 80 && grams <= 120)) return "Size of a deck of cards";
    if (foodName.includes("cheese") || (grams >= 25 && grams <= 35)) return "Size of a pair of dice";
    if (foodName.includes("pasta") || foodName.includes("rice") || (grams >= 180 && grams <= 220)) return "Size of a tight fist";
    if (foodName.includes("oil") || foodName.includes("butter") || grams <= 15) return "Size of your thumb tip";
    if (grams >= 40 && grams <= 65) return "Size of a tennis ball";
    return "Approx. one handful";
};

const getLogoUrl = (brand) => {
    if (!brand || brand === 'Generic' || brand === 'Foundation' || brand === 'Local Database') return 'https://cdn-icons-png.flaticon.com/512/706/706164.png';
    const domain = brand.toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '') + '.com';
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}&size=100&format=png`;
};

const ColoredIcon = ({ src, colorClass, sizeClass = "w-5 h-5" }) => (
  <div className={`${sizeClass} ${colorClass}`} style={{ WebkitMaskImage: `url("${src}")`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: `url("${src}")`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', backgroundColor: 'currentColor' }} />
);

const ProgressBar = ({ current, max, colorClass, bgClass, height = "h-1.5" }) => {
  const percent = Math.min(100, Math.max(0, (current / (max || 1)) * 100));
  return (
    <div className={`w-full ${height} ${bgClass} rounded-full overflow-hidden`}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={`h-full ${colorClass} rounded-full`} />
    </div>
  );
};

const ModalPortal = ({ children }) => {
    if (typeof document === 'undefined') return null;
    return ReactDOM.createPortal(children, document.body);
};

// --- SUB-COMPONENTS ---
const GoalsModal = ({ onClose, onSave, currentWeight, tdee }) => {
    const [step, setStep] = useState(1);
    const [selectedGoal, setSelectedGoal] = useState('maintain');

    const goals = [
        { id: 'lose', label: 'Fat Loss', icon: fireIcon, sub: 'Sustainable Deficit', desc: 'Reduces daily intake by 15% to prioritize fat loss while retaining lean muscle.', modifier: 0.85 },
        { id: 'maintain', label: 'Maintenance', icon: heartIcon, sub: 'Metabolic Baseline', desc: 'Keeps calories at your estimated expenditure to stabilize weight and energy.', modifier: 1.0 },
        { id: 'gain', label: 'Muscle Gain', icon: dumbbellIcon, sub: 'Controlled Surplus', desc: 'Increases intake by 10% to fuel hypertrophy and strength gains.', modifier: 1.1 }
    ];

    const currentGoalData = goals.find(g => g.id === selectedGoal);
    const projectedCalories = Math.round(tdee * currentGoalData.modifier);

    return (
      <ModalPortal>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[12000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 font-['Switzer']">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between mb-8">
                     <div>
                        <h2 className="text-3xl font-black text-slate-900 leading-tight">Calibrate Nutrition</h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">Let's align your dashboard with your biology</p>
                     </div>
                     <div className="flex gap-2">
                        <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-slate-900' : 'bg-slate-200'}`} />
                        <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-slate-900' : 'bg-slate-200'}`} />
                     </div>
                </div>

                <AnimatePresence mode='wait'>
                    {step === 1 ? (
                        <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 overflow-y-auto no-scrollbar">
                            <div className="grid md:grid-cols-3 gap-4 mb-8">
                                {goals.map((g) => (
                                    <button 
                                        key={g.id} 
                                        onClick={() => setSelectedGoal(g.id)}
                                        className={`flex flex-col items-center text-center p-6 rounded-[2rem] border-2 transition-all duration-300 relative overflow-hidden group ${selectedGoal === g.id ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                    >
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${selectedGoal === g.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                                            <ColoredIcon src={g.icon} colorClass="bg-current" sizeClass="w-7 h-7" />
                                        </div>
                                        <p className="font-black text-lg text-slate-900 mb-1">{g.label}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">{g.sub}</p>
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedGoal === g.id ? 'border-emerald-500' : 'border-slate-200'}`}>
                                            {selectedGoal === g.id && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Selected Strategy</p>
                                <p className="text-slate-600 text-sm font-medium leading-relaxed">{currentGoalData.desc}</p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            <div className="bg-slate-900 rounded-[2rem] p-8 text-white text-center mb-8 shadow-xl shadow-slate-200">
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Projected Daily Target</p>
                                <div className="text-6xl font-black tracking-tighter mb-2">{projectedCalories}</div>
                                <p className="text-slate-400 font-medium text-sm">kcal / day</p>
                                <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/10">
                                    <div><span className="block text-2xl font-bold">{Math.round(projectedCalories * 0.20 / 4)}g</span><span className="text-[10px] font-bold text-slate-500 uppercase">Protein</span></div>
                                    <div><span className="block text-2xl font-bold">{Math.round(projectedCalories * 0.50 / 4)}g</span><span className="text-[10px] font-bold text-slate-500 uppercase">Carbs</span></div>
                                    <div><span className="block text-2xl font-bold">{Math.round(projectedCalories * 0.30 / 9)}g</span><span className="text-[10px] font-bold text-slate-500 uppercase">Fats</span></div>
                                </div>
                            </div>
                            <p className="text-center text-slate-500 text-sm font-medium px-8">
                                This plan is adjusted for your weight of <strong>{currentWeight} lbs</strong>. We will automatically track your adherence and suggest adjustments weekly.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex gap-3 mt-6 pt-6 border-t border-slate-50">
                    <button onClick={onClose} className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Skip</button>
                    {step === 1 ? (
                        <button onClick={() => setStep(2)} className="flex-1 h-14 bg-slate-900 text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">Review Plan <span className="text-lg">→</span></button>
                    ) : (
                        <button onClick={() => onSave(selectedGoal)} className="flex-1 h-14 bg-emerald-500 text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-2">Confirm & Save <span className="text-lg">✓</span></button>
                    )}
                </div>
            </motion.div>
        </motion.div>
      </ModalPortal>
    );
};

const DateStrip = ({ intakeHistory, dailyGoal, selectedDate, onSelectDate }) => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const getDayStatus = (dateObj) => {
        const dateString = dateObj.toDateString();
        const logs = intakeHistory.filter(item => new Date(item.timestamp).toDateString() === dateString);
        if (logs.length === 0) return 'empty';
        const totalCals = logs.reduce((sum, item) => sum + (item.calories?.amount || 0), 0);
        return totalCals <= dailyGoal ? 'success' : 'warning';
    };

    return (
        <div className="flex justify-between items-start w-full px-2 mt-6">
            {[6, 5, 4, 3, 2, 1, 0].map((offset, i) => {
                const date = new Date();
                date.setDate(date.getDate() - offset);
                const dayLabel = days[date.getDay()];
                const dayNumber = date.getDate();
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const status = getDayStatus(date);
                
                let bgClass = 'bg-transparent text-slate-400';
                
                if (!isSelected) {
                    if (status === 'success') bgClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                    else if (status === 'warning') bgClass = 'bg-amber-50 text-amber-600 border border-amber-100';
                    else if (offset === 0) bgClass = 'bg-slate-50 text-slate-900 border border-slate-100';
                } else {
                    bgClass = 'bg-transparent text-slate-900 font-bold';
                }

                return (
                    <button key={i} onClick={() => onSelectDate(date)} className="flex flex-col items-center gap-1 focus:outline-none group active:scale-95 transition-transform w-10">
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>{dayLabel}</span>
                        
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all ${bgClass} ${isSelected ? '' : 'border'}`}>
                            {dayNumber}
                        </div>
                        
                        <div className={`h-1.5 w-1.5 rounded-full bg-emerald-500 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                    </button>
                )
            })}
        </div>
    );
};

const NutrientRow = ({ label, value, max, unit }) => {
    const ratio = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="flex items-center justify-between py-3.5 border-b border-slate-50 last:border-0">
            <div className="w-5/12 pr-2"><span className="text-sm font-bold text-slate-700 block">{label}</span></div>
            <div className="flex items-center gap-3 w-7/12">
                <div className="flex-1"><ProgressBar current={value} max={max} colorClass={ratio > 100 ? "bg-amber-500" : "bg-slate-900"} bgClass="bg-slate-100" height="h-1.5" /></div>
                <div className="text-right w-24"><span className="text-sm font-black text-slate-900">{Math.round(value)}</span><span className="text-[10px] text-slate-400 ml-1 font-bold uppercase">/ {max}{unit}</span></div>
            </div>
        </div>
    );
};

const HealthVitalsCard = ({ totals, goals }) => {
    const remaining = Math.max(0, goals.calories - totals.calories);
    const progress = Math.min(100, (totals.calories / goals.calories) * 100);
    const getStatus = (val, max) => {
        const ratio = val / max;
        if (ratio > 1.1) return 'text-rose-500 bg-rose-50 border-rose-100'; 
        if (ratio > 0.9) return 'text-amber-500 bg-amber-50 border-amber-100'; 
        return 'text-emerald-600 bg-emerald-50 border-emerald-100'; 
    };

    return (
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ColoredIcon src={ICONS.vitals} colorClass="bg-slate-400" sizeClass="w-4 h-4" />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Health Vitals</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black tracking-tight text-slate-900">{remaining}</span>
                        <span className="text-sm font-semibold text-slate-400">kcal budget</span>
                    </div>
                </div>
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="#f1f5f9" strokeWidth="4" fill="none" />
                        <circle cx="32" cy="32" r="28" stroke={progress > 100 ? "#f43f5e" : "#10b981"} strokeWidth="4" fill="none" strokeDasharray="175.9" strokeDashoffset={175.9 - (175.9 * progress) / 100} strokeLinecap="round" />
                    </svg>
                    <div className="absolute text-[10px] font-black text-slate-900">{Math.round(progress)}%</div>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div><div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1"><span>PRO</span><span>{Math.round(totals.protein)}/{goals.protein}g</span></div><ProgressBar current={totals.protein} max={goals.protein} colorClass="bg-slate-900" bgClass="bg-slate-100" height="h-1.5" /></div>
                <div><div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1"><span>CARB</span><span>{Math.round(totals.carbs)}/{goals.carbs}g</span></div><ProgressBar current={totals.carbs} max={goals.carbs} colorClass="bg-slate-900" bgClass="bg-slate-100" height="h-1.5" /></div>
                <div><div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1"><span>FAT</span><span>{Math.round(totals.fat)}/{goals.fat}g</span></div><ProgressBar current={totals.fat} max={goals.fat} colorClass="bg-slate-900" bgClass="bg-slate-100" height="h-1.5" /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <div className={`p-3 rounded-2xl border text-center ${getStatus(totals.sodium, goals.sodium)}`}><p className="text-[9px] font-black uppercase tracking-wider mb-0.5">Sodium</p><p className="text-sm font-bold">{Math.round(totals.sodium)}<span className="text-[9px] opacity-70">mg</span></p></div>
                <div className={`p-3 rounded-2xl border text-center ${getStatus(totals.sugar, goals.sugar)}`}><p className="text-[9px] font-black uppercase tracking-wider mb-0.5">Sugar</p><p className="text-sm font-bold">{Math.round(totals.sugar)}<span className="text-[9px] opacity-70">g</span></p></div>
                <div className={`p-3 rounded-2xl border text-center ${getStatus(totals.satFat, goals.satFat)}`}><p className="text-[9px] font-black uppercase tracking-wider mb-0.5">Sat. Fat</p><p className="text-sm font-bold">{Math.round(totals.satFat)}<span className="text-[9px] opacity-70">g</span></p></div>
            </div>
        </div>
    );
};

const PreviousDayReview = ({ history, currentDate, goals }) => {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const dateStr = prevDate.toDateString();
    
    const yesterdaysLogs = history.filter(item => new Date(item.timestamp).toDateString() === dateStr && !item.type);

    if (yesterdaysLogs.length === 0) return null; 

    const dailyTotals = yesterdaysLogs.reduce((acc, meal) => ({
        sugar: acc.sugar + (meal.sugar?.amount || 0),
        sodium: acc.sodium + (meal.sodium?.amount || 0),
        protein: acc.protein + (meal.protein?.amount || 0),
        calories: acc.calories + (meal.calories?.amount || 0),
        satFat: acc.satFat + (meal.satFat?.amount || 0),
    }), { sugar: 0, sodium: 0, protein: 0, calories: 0, satFat: 0 });

    const calculateDailyScore = () => {
        let score = 100;
        const reasons = [];

        if (dailyTotals.sugar > goals.sugar * 1.2) { score -= 15; reasons.push("High Sugar"); }
        if (dailyTotals.sodium > goals.sodium * 1.2) { score -= 15; reasons.push("High Sodium"); }
        if (dailyTotals.satFat > goals.satFat * 1.2) { score -= 10; reasons.push("High Sat. Fat"); }
        
        const calRatio = dailyTotals.calories / goals.calories;
        if (calRatio > 1.15) { score -= 10; reasons.push("Calorie Surplus"); }
        else if (calRatio < 0.6) { score -= 10; reasons.push("Low Intake"); }

        if (dailyTotals.protein >= goals.protein * 0.9) { score += 5; reasons.push("Great Protein"); }

        score = Math.min(100, Math.max(0, score));

        let summary = "A balanced day overall.";
        if (reasons.includes("High Sodium") && reasons.includes("High Sugar")) summary = "Watch the processed foods; sodium and sugar were high.";
        else if (reasons.includes("Great Protein") && score > 80) summary = "Solid performance! Protein goals hit and macros balanced.";
        else if (reasons.includes("Low Intake")) summary = "You were significantly under your calorie budget yesterday.";
        else if (reasons.includes("High Sugar")) summary = "Sugar intake spiked yesterday. Try substituting sweets with fruit.";
        else if (reasons.includes("High Sodium")) summary = "Sodium was elevated. Keep an eye on salty snacks.";

        return { 
            score, 
            summary,
            grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D',
            color: score >= 90 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : score >= 75 ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-amber-600 bg-amber-50 border-amber-100'
        };
    };

    const rating = calculateDailyScore();

    return (
        <section className="mx-4 mb-8">
            <div className="flex items-center gap-2 mb-3 px-1">
                <ColoredIcon src={ICONS.history} colorClass="bg-slate-400" sizeClass="w-4 h-4" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Yesterday's Grade</h3>
            </div>
            
            <div className={`w-full p-5 rounded-[2rem] border ${rating.color} flex items-center justify-between shadow-sm relative overflow-hidden`}>
                <div className="z-10 relative">
                    <p className="text-2xl font-black mb-1">{rating.grade} <span className="text-sm font-bold opacity-70 align-middle ml-1">({rating.score})</span></p>
                    <p className="text-xs font-bold opacity-90 leading-relaxed max-w-[240px]">{rating.summary}</p>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-10 transform rotate-12">
                    <ColoredIcon src={ICONS.vitals} colorClass="bg-current" sizeClass="w-32 h-32" />
                </div>
            </div>
        </section>
    );
};

const BarcodeScanner = ({ onResult, onClose }) => {
    const scannerId = "safespoon-barcode-reader";
    const [status, setStatus] = useState("Initializing camera...");
    const scannerRef = useRef(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (scannerRef.current) return;
            const html5QrCode = new Html5Qrcode(scannerId);
            scannerRef.current = html5QrCode;
            html5QrCode.start({ facingMode: "environment" }, { fps: 20, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 }, 
                (decodedText) => {
                    if (navigator.vibrate) navigator.vibrate(200);
                    html5QrCode.stop().then(() => { scannerRef.current = null; onResult(decodedText); });
                }, () => {}
            ).then(() => setStatus("Align barcode in frame")).catch(() => setStatus("Camera Access Denied"));
        }, 300);
        return () => { clearTimeout(timer); if (scannerRef.current?.isScanning) scannerRef.current.stop(); };
    }, [onResult]);

    return (
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center font-['Switzer']">
            <div id={scannerId} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 left-0 right-0 p-10 flex flex-col items-center gap-6 pointer-events-auto">
                <p className="text-white text-[10px] font-black uppercase tracking-widest bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">{status}</p>
                <button onClick={onClose} className="text-white font-bold text-xs uppercase tracking-widest px-4 py-2 bg-white/10 rounded-full backdrop-blur-md">Cancel</button>
            </div>
        </div>
    );
};

const SearchOverlay = ({ isSearching, setIsSearching, searchQuery, setSearchQuery, isApiLoading, suggestions, onSelect, onScanPlate }) => {
    const [isScanning, setIsScanning] = useState(false);
    const handleScanResult = (barcode) => { setSearchQuery(barcode); setIsScanning(false); };

    return (
      <ModalPortal>
        <AnimatePresence>
            {isSearching && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-white flex flex-col font-['Switzer']">
                {isScanning ? (
                    <BarcodeScanner onResult={handleScanResult} onClose={() => setIsScanning(false)} />
                ) : (
                    <>
                        <div className="pt-14 px-5 pb-4 bg-white shadow-sm z-20 border-b border-slate-50">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Add Food</h2>
                                <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 font-bold">✕</button>
                            </div>
                            
                            <div className="flex gap-2 items-center mb-2">
                                <div className="relative group flex-1">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><ColoredIcon src={ICONS.search} colorClass="bg-current" sizeClass="w-5 h-5" /></div>
                                    <input autoFocus type="search" placeholder="Search food or scan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 font-medium text-slate-700 placeholder:text-slate-400 outline-none" />
                                </div>
                                <button onClick={() => setIsScanning(true)} className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                                    <ColoredIcon src={scannerIcon} colorClass="bg-current" sizeClass="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4 no-scrollbar bg-white">
                            <section className="space-y-2 pb-24">
                                {suggestions.map((res) => (
                                    <article key={res.fdcId} onClick={() => onSelect(res)} className="flex items-center gap-4 p-4 active:bg-slate-50 rounded-2xl cursor-pointer border-b border-slate-50 last:border-0 transition-colors">
                                        <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 bg-white p-1 border border-slate-100 shadow-sm"><img src={res.logo} alt="" className="w-full h-full object-contain" onError={(e) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/706/706164.png'} /></div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-900 text-sm leading-tight">{res.name}</h4>
                                                {/* VISUAL BADGES */}
                                                {res.isRestaurant && (
                                                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest border border-emerald-200">
                                                        Menu
                                                    </span>
                                                )}
                                                {res.isLocal && (
                                                    <span className="bg-blue-100 text-blue-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest border border-blue-200">
                                                        Local
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{res.brand}</p>
                                        </div>
                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-200 shadow-sm font-light text-xl">+</div>
                                    </article>
                                ))}
                                {isApiLoading && <div className="text-center py-12"><div className="inline-block w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>}
                                {!isApiLoading && searchQuery.length >= 3 && suggestions.length === 0 && <div className="text-center py-20 opacity-40"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">No Food Records Found</p></div>}
                            </section>
                        </div>
                    </>
                )}
            </motion.div>
            )}
        </AnimatePresence>
      </ModalPortal>
    );
};

const Dashboard = ({ profile, setIsSearching, isSearching, deferredPrompt }) => {
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
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [isPlateScanning, setIsPlateScanning] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);

  useEffect(() => {
    try {
        const cached = localStorage.getItem('safespoon_offline_intake');
        if (cached) setOfflineIntake(JSON.parse(cached));
    } catch (e) { console.error("Local load fail", e); }
  }, []);

  useEffect(() => {
    const isDeviceIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandAlone = window.matchMedia('(display-mode: standalone)').matches;
    if (isDeviceIOS && !isStandAlone) setIsIOS(true);
  }, []);

  useEffect(() => {
    if (profile?.onboardingComplete && profile?.hasSetGoals === false) {
        const timer = setTimeout(() => setShowGoalsModal(true), 1200);
        return () => clearTimeout(timer);
    }
  }, [profile?.hasSetGoals, profile?.onboardingComplete]);

  const handleSaveGoal = async (goalType) => {
      setShowGoalsModal(false);
      if (!profile?.uid) return;
      try {
          await updateDoc(doc(db, "users", profile.uid), { goalType: goalType, hasSetGoals: true });
      } catch (e) { console.error("Error saving goal", e); }
  };

  const handleSkipGoal = async () => {
      setShowGoalsModal(false);
      if (profile?.uid) { await updateDoc(doc(db, "users", profile.uid), { hasSetGoals: true }); }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
  };

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
    
    let tdee = Math.round(bmr * (profile?.activityLevel || 1.2)); 
    const goalType = profile?.goalType || 'maintain';
    if (goalType === 'lose') tdee = Math.round(tdee * 0.85); 
    if (goalType === 'gain') tdee = Math.round(tdee * 1.10); 
    
    const goals = {
        calories: tdee,
        protein: Math.round(tdee * 0.20 / 4),
        carbs: Math.round(tdee * 0.50 / 4),
        fat: Math.round(tdee * 0.30 / 9),
        fiber: 30, sugar: 36, satFat: Math.round(tdee * 0.10 / 9), polyFat: Math.round(tdee * 0.08 / 9), monoFat: Math.round(tdee * 0.12 / 9), transFat: 2, cholesterol: 300, sodium: 2300, potassium: 4700, vitaminA: 900, vitaminC: 90, calcium: 1300, iron: (gender === 'female' && age < 50) ? 18 : 8
    };
    
    const combinedIntake = [...(profile?.dailyIntake || []), ...offlineIntake];
    const dateStr = selectedDate.toDateString();
    
    const totals = combinedIntake.reduce((acc, item) => {
        if (new Date(item.timestamp).toDateString() !== dateStr) return acc;
        return { 
            calories: acc.calories + (item.calories?.amount || 0), 
            protein: acc.protein + (item.protein?.amount || 0), 
            carbs: acc.carbs + (item.carbs?.amount || 0), 
            fat: acc.fat + (item.fat?.amount || 0),
            sugar: acc.sugar + (item.sugar?.amount || 0), fiber: acc.fiber + (item.fiber?.amount || 0), satFat: acc.satFat + (item.satFat?.amount || 0), polyFat: acc.polyFat + (item.polyFat?.amount || 0), monoFat: acc.monoFat + (item.monoFat?.amount || 0), transFat: acc.transFat + (item.transFat?.amount || 0), cholesterol: acc.cholesterol + (item.cholesterol?.amount || 0), sodium: acc.sodium + (item.sodium?.amount || 0), potassium: acc.potassium + (item.potassium?.amount || 0), vitaminA: acc.vitaminA + (item.vitaminA?.amount || 0), vitaminC: acc.vitaminC + (item.vitaminC?.amount || 0), calcium: acc.calcium + (item.calcium?.amount || 0), iron: acc.iron + (item.iron?.amount || 0)
        };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, fiber: 0, satFat: 0, polyFat: 0, monoFat: 0, transFat: 0, cholesterol: 0, sodium: 0, potassium: 0, vitaminA: 0, vitaminC: 0, calcium: 0, iron: 0 });

    const meals = { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] };
    combinedIntake.forEach(item => {
        if (new Date(item.timestamp).toDateString() === dateStr) {
            meals[item.meal || 'Snacks'].push(item);
        }
    });

    return { totals, goals, meals, tdee: Math.round(bmr * (profile?.activityLevel || 1.2)) }; 
  }, [profile, selectedDate, offlineIntake]);

  const handlePlateAnalysis = (data) => {
      setIsPlateScanning(false);
      if (data.segmentation_results && data.segmentation_results.length > 0) {
           const dish = data.segmentation_results[0].recognition_results[0]; 
           const detectedFood = {
               name: dish.name, fullName: dish.name, brand: "AI Detected", servingLabel: "1 serving",
               coreMetrics: { calories: { amount: Math.round(dish.calories || 250) }, protein: { amount: 0 }, fat: { amount: 0 }, carbs: { amount: 0 } }
           };
           setSelectedProduct(detectedFood);
      } else { alert("Could not detect food. Please try again."); }
  };

  // --- UPDATED: HANDLE PRODUCT SELECTION ---
  const handleProductSelect = async (product) => {
      setSelectedProduct({ ...product, fullName: product.name, coreMetrics: { calories: { amount: 0 } } }); 
      
      // CASE A: Local Database Item
      if (product.isLocal) {
           setSelectedProduct(prev => ({
              ...prev,
              servingLabel: "1 serving",
              householdReference: product.details.portion_unit || "serving",
              coreMetrics: {
                  calories: { amount: product.details.calories || 0 },
                  protein: { amount: product.details.protein || 0 },
                  fat: { amount: product.details.fat || 0 },
                  carbs: { amount: product.details.carbs || 0 },
                  sugar: { amount: product.details.sugar || 0 }, 
                  sodium: { amount: product.details.sodium || 0 }
              }
           }));
           return;
      }

      // CASE B: Restaurant Item
      if (product.isRestaurant && product.details.macros) {
          const m = product.details.macros; // Safe access
          setSelectedProduct(prev => ({
              ...prev,
              servingLabel: "1 serving", 
              householdReference: product.details.description,
              coreMetrics: {
                  calories: { amount: m.calories || 0 },
                  protein: { amount: m.protein || 0 },
                  fat: { amount: m.fat || 0 },
                  carbs: { amount: m.carbs || 0 },
                  sugar: { amount: 0 }, fiber: { amount: 0 }, sodium: { amount: 0 }, 
                  satFat: { amount: 0 }, cholesterol: { amount: 0 } 
              }
          }));
          return;
      }

      // CASE C: USDA Item (Existing logic)
      try {
        const response = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${product.fdcId}?api_key=${USDA_API_KEY}`);
        const data = await response.json();
        const rawSize = data.servingSize || 100;
        const multiplier = rawSize / 100;
        const getNut = (ids) => ({ amount: Math.round((data.foodNutrients?.find(nut => ids.includes(String(nut.nutrient.number)))?.amount || 0) * multiplier * 10) / 10 });

        const details = {
            servingLabel: `${rawSize}${data.servingSizeUnit || 'g'}`,
            householdReference: data.householdServingFullText || null, 
            fullName: data.description, brand: data.brandOwner || product.brand,
            coreMetrics: { 
                calories: getNut(['208', '1008']), protein: getNut(['203']), fat: getNut(['204']), carbs: getNut(['205']),
                sugar: getNut(['269']), fiber: getNut(['291']), sodium: getNut(['307']), satFat: getNut(['606']), polyFat: getNut(['646']), monoFat: getNut(['645']), transFat: getNut(['605']), cholesterol: getNut(['601']), potassium: getNut(['306']), vitaminA: getNut(['318', '320']), vitaminC: getNut(['401']), calcium: getNut(['301']), iron: getNut(['303'])
            }
        };
        setSelectedProduct(prev => ({ ...prev, ...details }));
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

  // --- UPDATED: HYBRID SEARCH LOGIC ---
  useEffect(() => {
    if (searchQuery.length < 3) { setSuggestions([]); return; }
    
    const timeoutId = setTimeout(async () => {
        setIsApiLoading(true);
        try {
            // NOTE: Check if your collection is 'foods' or 'groceries' in Firebase
            // Using 'foods' based on your backend routes.
            const localQuery = query(
                collection(db, "foods"), 
                where("name", ">=", searchQuery),
                where("name", "<=", searchQuery + '\uf8ff'),
                limit(10)
            );

            // Run requests in parallel so one failure doesn't block the others
            const [localSnapshot, usdaRes, restaurantRes] = await Promise.all([
                getDocs(localQuery).catch(() => ({ docs: [] })), // Local DB Safe Fallback
                
                fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(searchQuery)}&pageSize=8&dataType=Branded,Foundation`)
                  .then(r => r.json())
                  .catch(() => ({})), // USDA Safe Fallback
                
                searchRestaurantMenu(searchQuery)
                  .catch(() => ({ items: [] })) // Restaurant Safe Fallback
            ]);

            const newSuggestions = [];

            // 1. ADD LOCAL DB RESULTS
            localSnapshot.docs.forEach(doc => {
                const data = doc.data();
                newSuggestions.push({
                    id: doc.id,
                    fdcId: `local-${doc.id}`,
                    name: data.name,
                    brand: data.brand || 'Local Database',
                    logo: getLogoUrl(data.brand),
                    details: data,
                    isLocal: true
                });
            });

            // 2. ADD RESTAURANT ITEMS (If any)
            if (restaurantRes.items && restaurantRes.items.length > 0) {
                restaurantRes.items.forEach(item => {
                    newSuggestions.push({
                        id: item.id,
                        fdcId: `rest-${item.id}`,
                        name: item.name,
                        brand: item.brand,
                        logo: getLogoUrl(item.brand),
                        isRestaurant: true,
                        details: item 
                    });
                });
            }

            // 3. ADD USDA ITEMS
            if (usdaRes.foods) {
                usdaRes.foods.forEach(f => {
                    newSuggestions.push({
                        id: f.fdcId, 
                        fdcId: f.fdcId, 
                        name: f.description, 
                        brand: f.brandOwner || (f.dataType === 'Foundation' ? 'Basic' : 'Generic'), 
                        logo: getLogoUrl(f.brandOwner), 
                        isExternal: true
                    });
                });
            }

            setSuggestions(newSuggestions);

        } catch (e) { console.error("Search failed", e); } 
        finally { setIsApiLoading(false); }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <main className="w-full pb-4 font-['Switzer'] bg-gray-50 min-h-screen text-slate-900">
      
      <AnimatePresence>
        {showGoalsModal && (
            <GoalsModal currentWeight={profile?.weight || 0} tdee={dailyStats.tdee} onSave={handleSaveGoal} onClose={handleSkipGoal} />
        )}
      </AnimatePresence>

      <SearchOverlay 
        isSearching={isSearching} setIsSearching={setIsSearching} 
        searchQuery={searchQuery} setSearchQuery={setSearchQuery} 
        isApiLoading={isApiLoading} suggestions={suggestions} 
        onSelect={handleProductSelect}
        onScanPlate={() => setIsPlateScanning(true)} 
      />
      
      {isPlateScanning && <PlateScanner onResult={handlePlateAnalysis} onClose={() => setIsPlateScanning(false)} />}
      
      {/* --- PWA INSTALL BANNER --- */}
      <AnimatePresence>
        {(deferredPrompt || isIOS) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-900 text-white overflow-hidden relative z-50 border-b border-white/10"
          >
            <div className="p-4 flex items-center justify-between gap-4">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/5">
                    <ColoredIcon src={scannerIcon} colorClass="bg-emerald-400" sizeClass="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-sm font-bold leading-tight text-white">Install SafeSpoon</p>
                    <p className="text-[10px] text-slate-400 font-medium tracking-wide">Add to home screen for full features</p>
                 </div>
               </div>
               <button
                 onClick={isIOS ? () => setShowIOSHint(true) : handleInstallClick}
                 className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20 active:scale-95 transition-all whitespace-nowrap"
               >
                 Install
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HEADER --- */}
      <div className="pt-10 pb-4 px-4">
          <div className="flex justify-between items-start mb-6">
             <div className="flex flex-col">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-tight">
                    {profile?.firstName ? `Hello, ${profile.firstName}` : 'Hello there'} <br/>
                    <span className="text-slate-900 font-black leading-tight tracking-tight text-3xl">Here's your Overview</span>
                </h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
             </div>
          </div>
          
          <DateStrip 
            intakeHistory={[...(profile?.dailyIntake || []), ...offlineIntake]} 
            dailyGoal={dailyStats.goals.calories} 
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
      </div>
      
      <div className="px-4 mb-8">
          <HealthVitalsCard totals={dailyStats.totals} goals={dailyStats.goals} />
      </div>

      <PreviousDayReview 
        history={[...(profile?.dailyIntake || []), ...offlineIntake]} 
        currentDate={selectedDate} 
        goals={dailyStats.goals} 
      />

      <div className="mx-4 bg-white rounded-[1.5rem] border border-slate-50 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden mb-8">
            <button onClick={() => setShowMicros(!showMicros)} className="w-full flex items-center justify-between p-5 bg-slate-50/50 active:bg-slate-100 transition-colors">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Nutrient Breakdown</span>
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

      <div className="px-4 space-y-4 pb-0">
          {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((meal) => {
              const items = dailyStats.meals[meal]; const cals = items.reduce((s, i) => s + (i.calories?.amount || 0), 0);
              return (
                  <section key={meal} className="bg-white rounded-[1.5rem] p-2 shadow-sm border border-slate-50">
                      <div className="flex justify-between items-center p-4 pb-2">
                           <div className="flex items-center gap-3">
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

      <ModalPortal>
        <AnimatePresence>
            {showIOSHint && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[12000] bg-slate-900/40 backdrop-blur-sm flex items-end justify-center sm:items-center p-4">
                    <div className="absolute inset-0" onClick={() => setShowIOSHint(false)} />
                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-white w-full max-w-sm rounded-[2rem] p-6 relative shadow-2xl pointer-events-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-slate-900">Install SafeSpoon</h3>
                            <button onClick={() => setShowIOSHint(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">✕</button>
                        </div>
                        <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
                            Install this app on your iPhone for the best experience. It takes just two taps:
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg text-slate-900 font-bold">1</span>
                                <p className="text-sm font-bold text-slate-900">Tap the <span className="inline-block mx-1"><svg className="w-4 h-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0L8 8m4-4v12" /></svg> Share</span> button below</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg text-slate-900 font-bold">2</span>
                                <p className="text-sm font-bold text-slate-900">Select <span className="font-black">"Add to Home Screen"</span></p>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-slate-50 text-center">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Works best in Safari</p>
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 translate-y-1/2 sm:hidden"></div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
      </ModalPortal>

    </main>
  );
};

export default Dashboard;