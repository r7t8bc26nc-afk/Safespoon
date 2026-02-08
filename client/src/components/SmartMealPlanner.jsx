import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc } from "firebase/firestore";
import { db } from '../firebase'; 

// --- ICONS ---
import arrowLeftIcon from '../icons/angle-left-small.svg';
import walletIcon from '../icons/wallet.svg';
import fireIcon from '../icons/fire.svg';
import basketIcon from '../icons/shopping-basket-minus.svg';
import chartIcon from '../icons/chart-line.svg';
import linkIcon from '../icons/tag.svg';
import lockIcon from '../icons/lock.svg';
import starIcon from '../icons/sparkle.svg';
import refreshIcon from '../icons/rotate.svg';

// --- MOCK DATA ---
const STORE_DATA = [
    { id: 'walmart', name: 'Walmart', logo: 'https://img.logo.dev/walmart.com?token=pk_AnZTwqMTQ1ia9Btg_pILzg', markupFactor: 1.0, checkoutUrl: 'https://www.walmart.com/cart' },
    { id: 'kroger', name: 'Kroger', logo: 'https://img.logo.dev/kroger.com?token=pk_AnZTwqMTQ1ia9Btg_pILzg', markupFactor: 1.15, checkoutUrl: 'https://www.kroger.com/cart' },
    { id: 'wholefoods', name: 'Whole Foods', logo: 'https://img.logo.dev/wholefoodsmarket.com?token=pk_AnZTwqMTQ1ia9Btg_pILzg', markupFactor: 1.45, checkoutUrl: 'https://www.wholefoodsmarket.com' },
];

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

// --- COMPONENTS ---

const NeuRange = ({ label, value, min, max, step, onChange, valueLabel }) => (
    <div className="mb-6">
        <div className="flex justify-between items-end mb-2">
            <label className="text-sm font-black uppercase tracking-widest">{label}</label>
            <span className="text-lg font-black bg-black text-white px-2 py-0.5 transform -rotate-1">{valueLabel}</span>
        </div>
        <input 
            type="range" min={min} max={max} step={step} 
            value={value} onChange={onChange}
            className="w-full h-4 bg-white border-2 border-black rounded-full appearance-none cursor-pointer accent-black focus:outline-none focus:ring-2 focus:ring-yellow-400"
            style={{
                WebkitAppearance: 'none',
            }}
        />
    </div>
);

const PremiumGate = ({ onUnlockOneTime, onSubscribe }) => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center font-sans">
        <div className="w-24 h-24 bg-white border-4 border-black flex items-center justify-center mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
            <ColoredIcon src={chartIcon} colorClass="bg-black" sizeClass="w-12 h-12" />
            <div className="absolute -top-4 -right-4 w-10 h-10 bg-[#FFD700] border-4 border-black flex items-center justify-center">
                <ColoredIcon src={lockIcon} colorClass="bg-black" sizeClass="w-5 h-5" />
            </div>
        </div>
        
        <h2 className="text-4xl font-black uppercase leading-[0.9] mb-4">Smart Meal<br/>Bundles</h2>
        <p className="text-sm font-bold font-mono text-gray-500 max-w-xs mb-10 uppercase tracking-tight">
            Auto-generate plans & optimize grocery costs across stores.
        </p>

        {/* OPTIONS */}
        <div className="w-full max-w-xs space-y-4">
            <button 
                onClick={onUnlockOneTime}
                className="w-full p-4 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-between group"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-black text-lg border-2 border-black">
                        $1
                    </div>
                    <div className="text-left">
                        <span className="block text-lg font-black uppercase">One-Time</span>
                        <span className="text-[10px] font-bold bg-gray-200 px-1 uppercase">7 Day Access</span>
                    </div>
                </div>
                <div className="text-2xl font-black">→</div>
            </button>

            <div className="flex items-center gap-4 opacity-50">
                <div className="h-1 bg-black flex-1" />
                <span className="text-xs font-black uppercase">OR</span>
                <div className="h-1 bg-black flex-1" />
            </div>

            <button 
                onClick={onSubscribe}
                className="w-full py-4 bg-[#FFD700] text-black border-4 border-black font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2"
            >
                <ColoredIcon src={starIcon} colorClass="bg-black" sizeClass="w-5 h-5" />
                <span>Unlock with Premium</span>
            </button>
        </div>
    </div>
);

export const SmartMealPlanner = ({ userProfile }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);

    // --- CHECK ACCESS ---
    useEffect(() => {
        if (!userProfile) return;
        if (userProfile.isPremium) {
            setIsUnlocked(true);
        } else if (userProfile.plannerUnlockedUntil && userProfile.plannerUnlockedUntil > Date.now()) {
            setIsUnlocked(true);
        } else {
            setIsUnlocked(false);
        }
    }, [userProfile]);

    // --- HANDLERS ---
    const handleOneTimePurchase = async () => {
        const confirmed = window.confirm("Confirm $1.00 charge for 7-day access?");
        if (confirmed) {
            setLoading(true);
            try {
                const unlockDate = Date.now() + (7 * 24 * 60 * 60 * 1000); 
                await updateDoc(doc(db, "users", userProfile.uid), { plannerUnlockedUntil: unlockDate });
                setIsUnlocked(true);
            } catch (e) {
                console.error("Payment failed", e);
                alert("Transaction failed.");
            } finally {
                setLoading(false);
            }
        }
    };

    // --- PLANNER LOGIC ---
    const [config, setConfig] = useState({ calories: 2000, budget: 120, days: 5 });
    const [mealPlan, setMealPlan] = useState([]);
    const [shoppingBundle, setShoppingBundle] = useState([]);
    const [priceComparison, setPriceComparison] = useState([]);

    const generatePlan = async () => {
        setLoading(true);
        setTimeout(async () => {
            try {
                const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=Chicken`);
                const data = await res.json();
                const totalMeals = config.days * 2; 
                const shuffled = data.meals.sort(() => 0.5 - Math.random()).slice(0, totalMeals);

                const detailedPlan = shuffled.map(m => ({
                    id: m.idMeal,
                    title: m.strMeal,
                    image: m.strMealThumb,
                    calories: Math.floor(Math.random() * (800 - 400) + 400),
                    ingredients: [
                        { name: 'Chicken Breast', qty: 1, unit: 'lb', baseCost: 4.99 },
                        { name: 'Rice', qty: 0.5, unit: 'cup', baseCost: 0.50 },
                        { name: 'Mixed Veggies', qty: 1, unit: 'cup', baseCost: 1.25 },
                        { name: 'Olive Oil', qty: 1, unit: 'tbsp', baseCost: 0.20 }
                    ]
                }));

                setMealPlan(detailedPlan);
                setStep(2);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        }, 1500);
    };

    const optimizeBundle = () => {
        setLoading(true);
        setTimeout(() => {
            const bundleMap = {};
            mealPlan.forEach(meal => {
                meal.ingredients.forEach(ing => {
                    const key = ing.name;
                    if (!bundleMap[key]) bundleMap[key] = { name: ing.name, totalQty: 0, unit: ing.unit, baseCostPerUnit: ing.baseCost };
                    bundleMap[key].totalQty += ing.qty;
                });
            });

            const bundleArray = Object.values(bundleMap);
            setShoppingBundle(bundleArray);

            const comparisons = STORE_DATA.map(store => {
                let cartTotal = 0;
                bundleArray.forEach(item => { cartTotal += (item.baseCostPerUnit * item.totalQty) * store.markupFactor; });
                return { ...store, total: cartTotal.toFixed(2), savings: 0 };
            }).sort((a, b) => parseFloat(a.total) - parseFloat(b.total));
            
            comparisons[0].savings = (parseFloat(comparisons[comparisons.length - 1].total) - parseFloat(comparisons[0].total)).toFixed(2);
            setPriceComparison(comparisons);
            setStep(3);
            setLoading(false);
        }, 2000);
    };

    return (
        <main className="min-h-screen bg-white font-sans text-black pb-24">
            <Helmet><title>Smart Planner</title></Helmet>

            {/* HEADER */}
            <div className="pt-6 px-6 pb-4 bg-[#E0E7FF] border-b-4 border-black sticky top-0 z-30 flex items-center justify-between">
                <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none">
                    ←
                </button>
                <h2 className="text-lg font-black uppercase tracking-tight">
                    {!isUnlocked ? 'LOCKED' : step === 1 ? 'CONFIG' : step === 2 ? 'MENU' : 'OPTIMIZER'}
                </h2>
                <div className="w-10"></div>
            </div>

            {!isUnlocked ? (
                <PremiumGate onUnlockOneTime={handleOneTimePurchase} onSubscribe={() => navigate('/subscription')} />
            ) : (
                <div className="max-w-md mx-auto p-6">
                    {/* --- STEP 1: CONFIG --- */}
                    {step === 1 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="mb-8 border-4 border-black p-6 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                <h1 className="text-3xl font-black uppercase leading-none mb-2">Planner<br/>Setup</h1>
                                <p className="text-sm font-bold font-mono text-gray-500">Define your week.</p>
                            </div>

                            <div className="space-y-8">
                                <NeuRange label="Duration" min="3" max="14" step="1" value={config.days} onChange={(e) => setConfig({...config, days: parseInt(e.target.value)})} valueLabel={`${config.days} Days`} />
                                <NeuRange label="Calories / Day" min="1200" max="3500" step="50" value={config.calories} onChange={(e) => setConfig({...config, calories: parseInt(e.target.value)})} valueLabel={`${config.calories}`} />
                                <NeuRange label="Budget" min="50" max="300" step="10" value={config.budget} onChange={(e) => setConfig({...config, budget: parseInt(e.target.value)})} valueLabel={`$${config.budget}`} />
                            </div>

                            <button 
                                onClick={generatePlan}
                                disabled={loading}
                                className="w-full mt-10 py-5 bg-black text-white text-xl font-black uppercase border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
                            >
                                {loading ? 'GENERATING...' : 'GENERATE PLAN'}
                            </button>
                        </motion.div>
                    )}

                    {/* --- STEP 2: REVIEW --- */}
                    {step === 2 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="flex justify-between items-end mb-6 border-b-4 border-black pb-2">
                                <h3 className="font-black text-xl uppercase">Your Menu</h3>
                                <button onClick={generatePlan} className="bg-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all">
                                    <ColoredIcon src={refreshIcon} colorClass="bg-black" sizeClass="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4 mb-24">
                                {mealPlan.map((meal, i) => (
                                    <div key={i} className="flex gap-4 p-3 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <img src={meal.image} className="w-20 h-20 border-2 border-black object-cover grayscale hover:grayscale-0 transition-all" alt={meal.title} />
                                        <div className="flex-1 flex flex-col justify-between">
                                            <h4 className="font-black uppercase leading-tight text-sm line-clamp-2">{meal.title}</h4>
                                            <div className="flex gap-2">
                                                <span className="text-[10px] font-bold bg-[#FFD700] border border-black px-1">{meal.calories} kcal</span>
                                                <span className="text-[10px] font-bold bg-white border border-black px-1">{meal.ingredients.length} ings</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="fixed bottom-6 left-6 right-6 z-20">
                                <button 
                                    onClick={optimizeBundle}
                                    className="w-full py-4 bg-[#FFD700] text-black border-4 border-black font-black uppercase text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2"
                                >
                                    <ColoredIcon src={walletIcon} colorClass="bg-black" sizeClass="w-6 h-6" />
                                    OPTIMIZE COSTS
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* --- STEP 3: OPTIMIZER --- */}
                    {step === 3 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            {loading ? (
                                <div className="text-center py-20 font-black uppercase animate-pulse">Running Price Algorithms...</div>
                            ) : (
                                <>
                                    <div className="bg-black text-white p-6 border-4 border-black mb-8 shadow-[8px_8px_0px_0px_rgba(100,100,100,1)] relative">
                                        <div className="absolute top-4 right-4 bg-[#FFD700] text-black text-[10px] font-black px-2 py-1 border border-white">BEST VALUE</div>
                                        <h2 className="text-6xl font-black mb-2">${priceComparison[0].total}</h2>
                                        <p className="font-bold font-mono text-sm uppercase text-gray-400">at {priceComparison[0].name}</p>
                                        
                                        <div className="mt-6 pt-4 border-t border-gray-800 flex justify-between">
                                            <div><span className="block text-[10px] font-bold uppercase text-gray-500">Savings</span><span className="text-[#FFD700] font-black">-${priceComparison[0].savings}</span></div>
                                            <div className="text-right"><span className="block text-[10px] font-bold uppercase text-gray-500">Items</span><span className="font-black">{shoppingBundle.length}</span></div>
                                        </div>
                                    </div>

                                    <h3 className="font-black text-lg uppercase mb-4 border-b-4 border-black inline-block">Comparison</h3>
                                    <div className="space-y-3 mb-10">
                                        {priceComparison.map((store, i) => (
                                            <div key={store.id} className={`flex items-center justify-between p-4 border-4 border-black ${i === 0 ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-white border-2 border-black flex items-center justify-center p-1">
                                                        <img src={store.logo} className="w-full h-full object-contain grayscale" alt={store.name} />
                                                    </div>
                                                    <span className="font-bold uppercase">{store.name}</span>
                                                </div>
                                                <span className="font-black">${store.total}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-[#FF3B30] text-white p-4 border-4 border-black mb-8">
                                        <div className="flex gap-3">
                                            <span className="font-black text-xl">!</span>
                                            <p className="text-[10px] font-bold uppercase leading-relaxed">
                                                Estimates only. Prices vary by location. Bundled to nearest unit.
                                            </p>
                                        </div>
                                    </div>

                                    <a 
                                        href={priceComparison[0].checkoutUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block w-full py-4 bg-[#FFD700] text-black text-center border-4 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                                    >
                                        START ORDER
                                    </a>
                                </>
                            )}
                        </motion.div>
                    )}
                </div>
            )}
        </main>
    );
};