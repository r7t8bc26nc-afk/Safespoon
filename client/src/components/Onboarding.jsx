import React, { useState, useEffect, useRef } from 'react';
import { getAuth, signOut } from "firebase/auth";
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { motion, AnimatePresence } from 'framer-motion';

// --- UI ICONS ---
import searchIcon from '../icons/search.svg';
import genderIcon from '../icons/user-viewfinder.svg';
import ethnicIcon from '../icons/users-group-alt.svg';
import arrowRightIcon from '../icons/angle-right.svg';

// --- MEDICAL ICONS ---
import breadIcon from '../icons/bread-slice.svg'; 
import glassIcon from '../icons/glass.svg'; 
import candyIcon from '../icons/candy-cane.svg'; 
import heartCheckIcon from '../icons/heart-check.svg'; 
import fireIcon from '../icons/fire.svg'; 
import waveIcon from '../icons/wave-pulse.svg'; 

// --- HELPER COMPONENT ---
const ColoredIcon = ({ src, colorClass, sizeClass = "w-5 h-5" }) => (
  <div className={`${sizeClass} ${colorClass}`} style={{ WebkitMaskImage: `url("${src}")`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: `url("${src}")`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', backgroundColor: 'currentColor' }} />
);

const ArrowIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
);

// --- DATA SETS ---
const ETHNICITY_OPTIONS = [
    "American Indian or Alaska Native", "Asian", "Black or African American", 
    "Hispanic or Latino", "Native Hawaiian or Pacific Islander", "White", 
    "Two or More Races", "Prefer not to say"
];

const GENDER_OPTIONS = ["Male", "Female"];

const MEDICAL_CONDITIONS = [
    { id: 'celiac', label: "Celiac Disease", icon: breadIcon, autoShield: ["Gluten", "Wheat", "Barley", "Rye"] },
    { id: 'ckd', label: "Kidney Disease", icon: glassIcon, autoShield: ["High Sodium", "High Potassium"] },
    { id: 'diabetes', label: "Diabetes", icon: candyIcon, autoShield: ["Refined Sugar", "High Carb"] },
    { id: 'ibd', label: "IBD/Crohn's", icon: heartCheckIcon, autoShield: ["Spicy Foods", "Caffeine"] },
    { id: 'gerd', label: "Severe GERD", icon: fireIcon, autoShield: ["Acidic Foods", "Caffeine", "Alcohol"] },
    { id: 'afib', label: "Atrial Fibrillation", icon: waveIcon, autoShield: ["Caffeine", "Alcohol", "High Sodium"] }
];

const COMMON_ALLERGENS = ["Peanuts", "Tree Nuts", "Milk", "Eggs", "Shellfish", "Fish", "Soy", "Wheat", "Sesame"];
const LIFESTYLE_DIETS = [
    { id: 'vegan', label: "Vegan", autoShield: ["Meat", "Dairy", "Eggs"] },
    { id: 'veg', label: "Vegetarian", autoShield: ["Meat"] },
    { id: 'keto', label: "Keto", autoShield: ["High Carb", "Sugar"] },
    { id: 'paleo', label: "Paleo", autoShield: ["Grains", "Legumes", "Dairy"] },
    { id: 'halal', label: "Halal", autoShield: ["Pork", "Alcohol"] },
    { id: 'kosher', label: "Kosher", autoShield: ["Pork", "Shellfish"] }
];

// --- PICKER ARRAYS ---
const FEET = [4, 5, 6, 7];
const INCHES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const WEIGHTS = Array.from({ length: 350 }, (_, i) => i + 80);
const AGES = Array.from({ length: 83 }, (_, i) => i + 18);

// --- SCROLL PICKER ---
const ScrollPicker = ({ items, selected, onSelect, suffix = "" }) => {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
        const idx = items.indexOf(selected);
        if (idx !== -1) scrollRef.current.scrollTop = idx * 40;
    }
  }, []); 
  return (
    <div className="h-48 overflow-y-auto snap-y snap-mandatory no-scrollbar py-20" ref={scrollRef}>
      {items.map((item) => (
        <div key={item} onClick={() => onSelect(item)} className={`h-10 flex items-center justify-center snap-center text-xl font-bold transition-all cursor-pointer ${selected === item ? 'text-emerald-600 scale-110' : 'text-slate-300'}`}>
          {item}{suffix}
        </div>
      ))}
    </div>
  );
};

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null); 

  // State
  const [formData, setFormData] = useState({ 
      firstName: '', lastName: '', 
      gender: '', race: '', age: 25, 
      heightFt: 5, heightIn: 9, 
      weight: 160
  });
  const [conditions, setConditions] = useState([]);
  const [allergens, setAllergens] = useState(new Set());
  const [lifestyles, setLifestyles] = useState([]);
  
  // Logic
  const handleToggle = (set, item) => { const next = new Set(set); next.has(item) ? next.delete(item) : next.add(item); return next; };
  const handleArrayToggle = (arr, item) => { const exists = arr.find(i => i.id === item.id); return exists ? arr.filter(i => i.id !== item.id) : [...arr, item]; };

  const computeRestrictions = () => {
    const list = new Set();
    // Add explicit allergens selected by user
    allergens.forEach(a => list.add(a));
    // Add implied restrictions from conditions/lifestyle
    conditions.forEach(c => c.autoShield.forEach(i => list.add(i)));
    lifestyles.forEach(l => l.autoShield.forEach(i => list.add(i)));
    return Array.from(list);
  };

  const handleFinish = async () => {
    setLoading(true);
    const auth = getAuth();
    if (!auth.currentUser) {
        console.error("No authenticated user found.");
        setLoading(false);
        return;
    }

    try {
      // Calculate total height in inches for Settings page compatibility
      const totalInches = (formData.heightFt * 12) + formData.heightIn;

      // Construct Profile Data (Flat structure for Settings.jsx compatibility)
      const profileData = {
        firstName: formData.firstName || "Member",
        lastName: formData.lastName || "",
        age: Number(formData.age),
        gender: formData.gender || "Not Specified",
        race: formData.race || "Not Specified",
        
        // Critical: Settings.jsx expects a Number for height/weight
        height: totalInches, 
        weight: Number(formData.weight),
        
        // Critical: Settings.jsx expects Arrays of Strings (Labels), not IDs or Objects
        conditions: conditions.map(c => c.label), 
        lifestyles: lifestyles.map(l => l.label),
        restrictions: computeRestrictions(), // Saves full list of active filters
        
        onboardingComplete: true,
        updatedAt: serverTimestamp() 
      };

      await setDoc(doc(db, "users", auth.currentUser.uid), profileData, { merge: true });
      onComplete(); 
      
    } catch (err) { 
        console.error("Onboarding Save Error:", err);
        alert("Unable to save profile. Please check your internet connection.");
    } finally { 
        setLoading(false); 
    }
  };

  const steps = [
      { id: 1, label: "Demographics" },
      { id: 2, label: "Health Profile" }
  ];

  return (
    <div className="min-h-screen bg-white font-['Switzer'] text-slate-900 pb-40">
      
      {/* HEADER */}
      <div className="pt-10 pb-4 px-6 bg-white sticky top-0 z-40 border-b border-slate-50">
         
         {/* Top Row: Title + Quit Button */}
         <div className="flex justify-between items-start mb-6">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-tight">
                Setup <br/>
                <span className="text-emerald-600">New Profile</span>
            </h1>

            {/* Quit Button (Sign Out) */}
            <button 
                onClick={() => {
                    if(window.confirm("Are you sure you want to sign out? Your progress will be lost.")) {
                        const auth = getAuth();
                        signOut(auth);
                    }
                }}
                className="group flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 hover:bg-rose-50 transition-colors"
                aria-label="Sign Out"
            >
                <svg className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
            </button>
         </div>
            
         {/* Step Progress */}
         <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span>{steps[step - 1].label}</span>
                <span>Step {step} of 2</span>
            </div>
            <div className="flex gap-2 h-1.5 w-full">
                {steps.map((s) => (
                    <div key={s.id} className={`h-full flex-1 rounded-full transition-all duration-300 ${step >= s.id ? 'bg-slate-900' : 'bg-slate-100'}`} />
                ))}
            </div>
         </div>
      </div>

      {/* CONTENT FEED */}
      <div className="px-6 py-6">
         <AnimatePresence mode='wait'>
            
            {/* STEP 1: DEMOGRAPHICS */}
            {step === 1 && (
                <motion.div key="1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                    
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mt-4 mb-4 pl-1">Identity</h3>
                        <div className="space-y-3">
                            <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} placeholder="First Name" className="w-full bg-slate-50 px-4 py-4 rounded-2xl font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:bg-slate-100 transition-colors" />
                            <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} placeholder="Last Name" className="w-full bg-slate-50 px-4 py-4 rounded-2xl font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:bg-slate-100 transition-colors" />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-4 pl-1">Biometrics</h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <button onClick={() => setActiveModal('gender')} className="w-full bg-slate-50 px-4 py-4 rounded-2xl flex justify-between items-center text-left active:bg-slate-100 transition-colors">
                                    <span className={`font-medium text-sm ${formData.gender ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {formData.gender || "Select Gender"}
                                    </span>
                                    <ColoredIcon src={genderIcon} colorClass="bg-slate-300" sizeClass="w-4 h-4" />
                                </button>
                                <p className="text-[10px] text-slate-400 font-medium px-2 leading-tight">
                                    *Use gender assigned at birth for accurate metabolic calibration.
                                </p>
                            </div>

                            <button onClick={() => setActiveModal('race')} className="w-full bg-slate-50 px-4 py-4 rounded-2xl flex justify-between items-center text-left active:bg-slate-100 transition-colors">
                                <span className={`font-medium text-sm ${formData.race ? 'text-slate-900' : 'text-slate-400'}`}>
                                    {formData.race || "Select Ethnicity"}
                                </span>
                                <ColoredIcon src={ethnicIcon} colorClass="bg-slate-300" sizeClass="w-4 h-4" />
                            </button>

                            <div className="grid grid-cols-3 gap-3">
                                <button onClick={() => setActiveModal('age')} className="bg-slate-50 rounded-2xl p-4 text-center active:bg-slate-100 transition-colors">
                                    <span className="block text-[9px] font-bold text-slate-400 capitalize tracking-tight mb-1">Age</span>
                                    <span className="text-xl font-black text-slate-900">{formData.age}</span>
                                </button>
                                <button onClick={() => setActiveModal('height')} className="bg-slate-50 rounded-2xl p-4 text-center active:bg-slate-100 transition-colors">
                                    <span className="block text-[9px] font-bold text-slate-400 capitalize tracking-tight mb-1">Height</span>
                                    <span className="text-xl font-black text-slate-900">{formData.heightFt}'{formData.heightIn}"</span>
                                </button>
                                <button onClick={() => setActiveModal('weight')} className="bg-slate-50 rounded-2xl p-4 text-center active:bg-slate-100 transition-colors">
                                    <span className="block text-[9px] font-bold text-slate-400 capitalize tracking-tight mb-1">Weight</span>
                                    <span className="text-xl font-black text-slate-900">{formData.weight}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* STEP 2: HEALTH PROFILE */}
            {step === 2 && (
                <motion.div key="2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                    
                    {/* Medical */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-4 mt-4 pl-1">Medical Conditions</h3>
                        <p className="text-xs text-slate-400 mb-4 pl-1 font-medium leading-relaxed">
                            Select diagnosed conditions to enable strict ingredient filtering for your safety.
                        </p>
                        <div className="space-y-2">
                            {MEDICAL_CONDITIONS.map(c => {
                                const active = conditions.find(i => i.id === c.id);
                                return (
                                    <button 
                                        key={c.id} 
                                        onClick={() => setConditions(handleArrayToggle(conditions, c))} 
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border border-transparent ${active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <ColoredIcon src={c.icon} colorClass={active ? 'bg-white' : 'bg-slate-400'} sizeClass="w-5 h-5" />
                                            <span className="font-bold text-sm">{c.label}</span>
                                        </div>
                                        {active && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Allergens */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-4 pl-1">Allergens</h3>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_ALLERGENS.map(a => (
                                <button key={a} onClick={() => setAllergens(handleToggle(allergens, a))} className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all ${allergens.has(a) ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                                    {a}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Lifestyle */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-4 pl-1">Lifestyle Preferences</h3>
                        <div className="flex flex-wrap gap-2">
                            {LIFESTYLE_DIETS.map(l => {
                                const active = lifestyles.find(i => i.id === l.id);
                                return (
                                    <button key={l.id} onClick={() => setLifestyles(handleArrayToggle(lifestyles, l))} className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all ${active ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                                        {l.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            )}

         </AnimatePresence>
      </div>

      {/* --- FOOTER NAV --- */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-100 flex flex-col gap-3 z-50 pb-8">
         <button 
            disabled={loading || (step === 1 && (!formData.firstName || !formData.race || !formData.gender))}
            onClick={() => step < 2 ? setStep(step + 1) : handleFinish()}
            className={`w-full h-14 rounded-2xl font-bold text-sm capitalize tracking-tight shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100 ${step === 2 ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}
         >
            {loading ? "Configuring..." : (step === 2 ? "Complete Setup" : "Next Step")}
            {!loading && <ArrowIcon />}
         </button>
         
         <button 
            onClick={step === 1 ? () => {} : () => setStep(step - 1)} 
            disabled={step === 1}
            className={`w-full h-10 rounded-2xl flex items-center justify-center text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
         >
            Previous
         </button>
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {activeModal && (
            <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/20 z-[60]" onClick={() => setActiveModal(null)} />
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2rem] z-[70] p-6 shadow-2xl pb-10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-black capitalize text-slate-900">{activeModal === 'race' ? 'Ethnicity' : activeModal}</h3>
                        <button onClick={() => setActiveModal(null)} className="bg-slate-100 px-4 py-2 rounded-xl text-xs font-bold text-slate-700">Done</button>
                    </div>
                    
                    {activeModal === 'race' && (
                        <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                            {ETHNICITY_OPTIONS.map(r => (
                                <button key={r} onClick={() => { setFormData({...formData, race: r}); setActiveModal(null); }} className={`w-full text-left p-4 rounded-xl font-bold text-xs uppercase tracking-wide transition-all ${formData.race === r ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500'}`}>
                                    {r}
                                </button>
                            ))}
                        </div>
                    )}

                    {activeModal === 'gender' && (
                        <div className="space-y-2">
                            {GENDER_OPTIONS.map(g => (
                                <button key={g} onClick={() => { setFormData({...formData, gender: g}); setActiveModal(null); }} className={`w-full text-left p-4 rounded-xl font-bold text-xs uppercase tracking-wide transition-all ${formData.gender === g ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500'}`}>
                                    {g}
                                </button>
                            ))}
                        </div>
                    )}

                    {activeModal === 'age' && <ScrollPicker items={AGES} selected={formData.age} onSelect={(v) => setFormData({...formData, age: v})} suffix=" years" />}
                    {activeModal === 'weight' && <ScrollPicker items={WEIGHTS} selected={formData.weight} onSelect={(v) => setFormData({...formData, weight: v})} suffix=" lbs" />}
                    {activeModal === 'height' && (
                        <div className="flex gap-4">
                             <div className="flex-1"><ScrollPicker items={FEET} selected={formData.heightFt} onSelect={(v) => setFormData({...formData, heightFt: v})} suffix=" ft" /></div>
                             <div className="flex-1"><ScrollPicker items={INCHES} selected={formData.heightIn} onSelect={(v) => setFormData({...formData, heightIn: v})} suffix=" in" /></div>
                        </div>
                    )}
                </motion.div>
            </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;