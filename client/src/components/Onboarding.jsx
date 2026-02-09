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
  
  // Logic to scroll to selected item on mount
  useEffect(() => {
    if (scrollRef.current) {
        const idx = items.indexOf(selected);
        // Approximation: 48px is the item height (h-12)
        if (idx !== -1) scrollRef.current.scrollTop = idx * 48;
    }
  }, [selected, items]); 

  return (
    <div className="h-64 overflow-y-auto snap-y snap-mandatory scroll-smooth py-24 border-4 border-black bg-white shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]" ref={scrollRef}>
      {items.map((item) => (
        <div 
            key={item} 
            onClick={() => onSelect(item)} 
            className={`h-12 flex items-center justify-center snap-center text-2xl font-black uppercase transition-all cursor-pointer ${selected === item ? 'text-black bg-[#FFD700]' : 'text-gray-300 hover:text-gray-500'}`}
        >
          {item}{suffix}
        </div>
      ))}
    </div>
  );
};

const InputField = ({ label, value, onChange, placeholder, type = "text" }) => (
    <div className="mb-6">
        <label className="block text-xs font-black uppercase tracking-widest mb-2 border-2 border-black bg-white w-fit px-2 py-0.5">
            {label}
        </label>
        <input 
            type={type} 
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full border-4 border-black p-4 text-xl font-bold text-black placeholder:text-gray-300 outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all bg-white" 
        />
    </div>
);

const SelectionButton = ({ label, icon, onClick, active, subLabel }) => (
    <button 
        onClick={onClick} 
        className={`w-full text-left p-4 border-4 border-black flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all ${active ? 'bg-black text-white' : 'bg-white text-black'}`}
    >
        <div className="flex items-center gap-4">
            {icon && (
                <div className={`w-8 h-8 flex items-center justify-center border-2 border-current ${active ? 'bg-white text-black' : 'bg-gray-100 text-black'}`}>
                    <ColoredIcon src={icon} colorClass="bg-current" sizeClass="w-5 h-5" />
                </div>
            )}
            <div>
                <span className="block font-black uppercase tracking-tight text-sm">{label}</span>
                {subLabel && <span className="block text-[10px] font-bold uppercase opacity-60">{subLabel}</span>}
            </div>
        </div>
        {active && <div className="text-xl font-black">✓</div>}
    </button>
);

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
    allergens.forEach(a => list.add(a));
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
      const totalInches = (formData.heightFt * 12) + formData.heightIn;
      const profileData = {
        firstName: formData.firstName || "Member",
        lastName: formData.lastName || "",
        age: Number(formData.age),
        gender: formData.gender || "Not Specified",
        race: formData.race || "Not Specified",
        height: totalInches, 
        weight: Number(formData.weight),
        conditions: conditions.map(c => c.label), 
        lifestyles: lifestyles.map(l => l.label),
        restrictions: computeRestrictions(), 
        onboardingComplete: true,
        updatedAt: serverTimestamp() 
      };

      await setDoc(doc(db, "users", auth.currentUser.uid), profileData, { merge: true });
      onComplete(); 
      
    } catch (err) { 
        console.error("Onboarding Save Error:", err);
        alert("Unable to save profile.");
    } finally { 
        setLoading(false); 
    }
  };

  const steps = [
      { id: 1, label: "Identity" },
      { id: 2, label: "Health" }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-black pb-32">
      
      {/* HEADER */}
      <div className="pt-10 pb-6 px-6 bg-white sticky top-0 z-40 border-b-4 border-black">
         <div className="flex justify-between items-start mb-6">
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">
                Profile <br/>
                <span className="text-white bg-black px-1">Setup</span>
            </h1>

            <button 
                onClick={() => {
                    if(window.confirm("Quit Setup? Progress will be lost.")) {
                        signOut(getAuth());
                    }
                }}
                className="w-10 h-10 border-4 border-black bg-[#FF5252] flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
            >
                <span className="text-white font-black text-xl">✕</span>
            </button>
         </div>
            
         {/* Step Progress */}
         <div className="space-y-2">
            <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                <span>Phase {step}</span>
                <span>{steps[step - 1].label}</span>
            </div>
            <div className="flex gap-2 h-4">
                {steps.map((s) => (
                    <div key={s.id} className={`flex-1 border-2 border-black transition-all ${step >= s.id ? 'bg-[#FFD700]' : 'bg-gray-200'}`} />
                ))}
            </div>
         </div>
      </div>

      {/* CONTENT FEED */}
      <div className="px-6 py-8">
         <AnimatePresence mode='wait'>
            
            {/* STEP 1: DEMOGRAPHICS */}
            {step === 1 && (
                <motion.div key="1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                    
                    <div className="space-y-0">
                        <InputField label="First Name" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} placeholder="JANE" />
                        <InputField label="Last Name" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} placeholder="DOE" />
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-black uppercase border-b-4 border-black inline-block">Biometrics</h3>
                        
                        <button onClick={() => setActiveModal('gender')} className="w-full flex justify-between items-center p-4 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all group">
                             <div className="flex flex-col text-left">
                                <span className="text-[10px] font-black uppercase bg-[#FFD700] border-2 border-black px-1 w-fit mb-1">Gender</span>
                                <span className={`text-xl font-black uppercase ${formData.gender ? 'text-black' : 'text-gray-300'}`}>{formData.gender || "Select"}</span>
                             </div>
                             <ColoredIcon src={arrowRightIcon} colorClass="bg-black" />
                        </button>

                        <button onClick={() => setActiveModal('race')} className="w-full flex justify-between items-center p-4 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all">
                             <div className="flex flex-col text-left">
                                <span className="text-[10px] font-black uppercase bg-[#FFD700] border-2 border-black px-1 w-fit mb-1">Ethnicity</span>
                                <span className={`text-xl font-black uppercase ${formData.race ? 'text-black' : 'text-gray-300'}`}>{formData.race || "Select"}</span>
                             </div>
                             <ColoredIcon src={arrowRightIcon} colorClass="bg-black" />
                        </button>

                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Age', val: formData.age, modal: 'age' },
                                { label: 'Height', val: `${formData.heightFt}'${formData.heightIn}"`, modal: 'height' },
                                { label: 'Weight', val: `${formData.weight}lbs`, modal: 'weight' }
                            ].map(item => (
                                <button key={item.label} onClick={() => setActiveModal(item.modal)} className="border-4 border-black p-2 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex flex-col items-center justify-center h-24">
                                    <span className="text-[9px] font-black uppercase mb-1">{item.label}</span>
                                    <span className="text-xl font-black">{item.val}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* STEP 2: HEALTH PROFILE */}
            {step === 2 && (
                <motion.div key="2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                    
                    {/* Medical */}
                    <div>
                        <div className="mb-4 bg-black text-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(100,100,100,1)]">
                             <h3 className="text-xl font-black uppercase">Medical Conditions</h3>
                             <p className="text-xs font-bold font-mono text-gray-400 mt-1 uppercase">Enables strict filtering.</p>
                        </div>
                        <div className="space-y-3">
                            {MEDICAL_CONDITIONS.map(c => {
                                const active = conditions.find(i => i.id === c.id);
                                return (
                                    <SelectionButton 
                                        key={c.id} 
                                        label={c.label} 
                                        icon={c.icon} 
                                        active={active} 
                                        onClick={() => setConditions(handleArrayToggle(conditions, c))}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* Allergens */}
                    <div>
                        <h3 className="text-xl font-black uppercase border-b-4 border-black inline-block mb-4">Allergens</h3>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_ALLERGENS.map(a => (
                                <button key={a} onClick={() => setAllergens(handleToggle(allergens, a))} className={`px-4 py-3 border-4 border-black text-xs font-black uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 ${allergens.has(a) ? 'bg-[#FF5252] text-white' : 'bg-white text-black hover:bg-gray-100'}`}>
                                    {a}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Lifestyle */}
                    <div>
                        <h3 className="text-xl font-black uppercase border-b-4 border-black inline-block mb-4">Lifestyle</h3>
                        <div className="flex flex-wrap gap-2">
                            {LIFESTYLE_DIETS.map(l => {
                                const active = lifestyles.find(i => i.id === l.id);
                                return (
                                    <button key={l.id} onClick={() => setLifestyles(handleArrayToggle(lifestyles, l))} className={`px-4 py-3 border-4 border-black text-xs font-black uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 ${active ? 'bg-[#10B981] text-black' : 'bg-white text-black hover:bg-gray-100'}`}>
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
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t-4 border-black z-50 flex flex-col gap-3">
         <button 
            disabled={loading || (step === 1 && (!formData.firstName || !formData.race || !formData.gender))}
            onClick={() => step < 2 ? setStep(step + 1) : handleFinish()}
            className={`w-full py-5 border-4 border-black font-black text-xl uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${step === 2 ? 'bg-[#10B981] text-black' : 'bg-black text-white hover:bg-gray-800'}`}
         >
            {loading ? "INITIALIZING..." : (step === 2 ? "FINISH SETUP" : "NEXT PHASE")}
         </button>
         
         <button 
            onClick={step === 1 ? () => {} : () => setStep(step - 1)} 
            disabled={step === 1}
            className={`w-full py-2 font-bold uppercase text-xs tracking-widest hover:bg-gray-100 transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100 text-black'}`}
         >
            ← Go Back
         </button>
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {activeModal && (
            <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative bg-white border-t-4 border-black p-6 pb-12 w-full max-h-[80vh] flex flex-col z-10">
                    <div className="w-16 h-2 bg-black mx-auto mb-6" />
                    <div className="flex justify-between items-center mb-6 border-b-4 border-black pb-2">
                        <h3 className="text-2xl font-black uppercase text-black">{activeModal === 'race' ? 'Ethnicity' : activeModal}</h3>
                        <button onClick={() => setActiveModal(null)} className="bg-black text-white px-4 py-2 text-xs font-bold uppercase hover:bg-gray-800">Done</button>
                    </div>
                    
                    <div className="overflow-y-auto flex-1 p-1">
                        {activeModal === 'race' && (
                            <div className="space-y-3">
                                {ETHNICITY_OPTIONS.map(r => (
                                    <button key={r} onClick={() => { setFormData({...formData, race: r}); setActiveModal(null); }} className={`w-full text-left p-4 border-4 border-black font-bold uppercase text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all ${formData.race === r ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}`}>
                                        {r}
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeModal === 'gender' && (
                            <div className="space-y-3">
                                {GENDER_OPTIONS.map(g => (
                                    <button key={g} onClick={() => { setFormData({...formData, gender: g}); setActiveModal(null); }} className={`w-full text-left p-4 border-4 border-black font-bold uppercase text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all ${formData.gender === g ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}`}>
                                        {g}
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeModal === 'age' && <ScrollPicker items={AGES} selected={formData.age} onSelect={(v) => setFormData({...formData, age: v})} suffix=" YRS" />}
                        {activeModal === 'weight' && <ScrollPicker items={WEIGHTS} selected={formData.weight} onSelect={(v) => setFormData({...formData, weight: v})} suffix=" LBS" />}
                        {activeModal === 'height' && (
                            <div className="flex gap-4">
                                <div className="flex-1 text-center"><h4 className="font-black uppercase mb-2">Feet</h4><ScrollPicker items={FEET} selected={formData.heightFt} onSelect={(v) => setFormData({...formData, heightFt: v})} suffix="'" /></div>
                                <div className="flex-1 text-center"><h4 className="font-black uppercase mb-2">Inches</h4><ScrollPicker items={INCHES} selected={formData.heightIn} onSelect={(v) => setFormData({...formData, heightIn: v})} suffix='"' /></div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;