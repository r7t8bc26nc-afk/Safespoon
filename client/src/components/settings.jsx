import React, { useState, useEffect, useMemo } from 'react';
import { getAuth, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';

// --- ICONS ---
import heartIcon from '../icons/stethoscope.svg';
import lifestyleIcon from '../icons/heart.svg';
import filterIcon from '../icons/virus-covid.svg';
import userIcon from '../icons/user.svg';
import scaleIcon from '../icons/dumbbell-filled.svg'; 
import atrfibIcon from '../icons/wave-pulse.svg'; 
import chevronRight from '../icons/sparkle.svg'; 
import fireIcon from '../icons/fire.svg'; 
import starIcon from '../icons/sparkle.svg'; 

// Selectable Item Icons
import celiacIcon from '../icons/bread-slice.svg';
import kidneyIcon from '../icons/glass.svg';
import diabetesIcon from '../icons/candy-cane.svg';
import ibdIcon from '../icons/heart-check.svg';
import halalIcon from '../icons/mosque.svg';
import kosherIcon from '../icons/steak.svg';
import veganIcon from '../icons/leaf.svg';
import veggieIcon from '../icons/carrot.svg';
import afibIcon from '../icons/wave-pulse.svg'; 

const GOAL_OPTIONS = [
    { id: 'lose', label: "Fat Loss", desc: "Caloric Deficit", icon: fireIcon },
    { id: 'maintain', label: "Maintenance", desc: "Metabolic Baseline", icon: ibdIcon }, 
    { id: 'gain', label: "Muscle Gain", desc: "Caloric Surplus", icon: scaleIcon } 
];

const MEDICAL_CONDITIONS = [
    { id: 'celiac', label: "Celiac Disease", impact: "Gluten-Free Required", icon: celiacIcon },
    { id: 'ckd', label: "Kidney Disease", impact: "Low Sodium/Protein", icon: kidneyIcon },
    { id: 'diabetes', label: "Diabetes", impact: "Sugar Management", icon: diabetesIcon },
    { id: 'ibd', label: "IBD/Crohn's", impact: "Gut Health", icon: ibdIcon },
    { id: 'afib', label: "Atrial Fibrillation", impact: "Heart Rate Management", icon: atrfibIcon }
];

const LIFESTYLE_DIETS = [
    { id: 'vegan', label: "Vegan", icon: veganIcon },
    { id: 'veg', label: "Vegetarian", icon: veggieIcon },
    { id: 'halal', label: "Halal", icon: halalIcon },
    { id: 'kosher', label: "Kosher", icon: kosherIcon }
];

const COMMON_ALLERGENS = [
    { label: "Gluten", icon: celiacIcon },
    { label: "Dairy", icon: kidneyIcon },
    { label: "Peanuts", icon: diabetesIcon },
    { label: "Tree Nuts", icon: heartIcon },
    { label: "Soy", icon: filterIcon },
    { label: "Eggs", icon: userIcon },
    { label: "Shellfish", icon: heartIcon },
    { label: "Fish", icon: heartIcon }
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

// --- REUSABLE SELECTION MODAL (HIG STYLE) ---
const SelectionSheet = ({ isOpen, onClose, title, options, value, onSelect }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[11000] flex flex-col justify-end">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} 
                    />
                    <motion.div 
                        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white w-full rounded-t-[2rem] p-6 pb-10 relative z-10 max-h-[60vh] flex flex-col"
                    >
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />
                        <h3 className="text-xl font-black text-slate-900 text-center mb-6">{title}</h3>
                        
                        <div className="overflow-y-auto flex-1 space-y-2 no-scrollbar">
                            {options.map((opt) => (
                                <button
                                    key={opt.val}
                                    onClick={() => { onSelect(opt.val); onClose(); }}
                                    className={`w-full p-4 rounded-xl text-lg font-bold flex justify-between items-center transition-all ${value === opt.val ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                >
                                    <span>{opt.label}</span>
                                    {value === opt.val && <span className="text-emerald-400">✓</span>}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// --- NEW: SUBTLE SUBSCRIPTION ROW (REPLACES LARGE CARD) ---
const SubscriptionRow = ({ isPremium, onManage }) => (
    <button
        onClick={onManage}
        className="w-full p-4 rounded-2xl border border-slate-100 bg-white flex items-center justify-between shadow-sm active:scale-[0.98] transition-all hover:border-slate-200"
    >
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPremium ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-50 text-amber-500'}`}>
                <ColoredIcon src={starIcon} colorClass="bg-current" sizeClass="w-5 h-5" />
            </div>
            <div className="text-left">
                <p className="font-bold text-slate-900 text-sm leading-tight">
                    {isPremium ? "Premium Plan" : "Starter Plan"}
                </p>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                    {isPremium ? "Active • Auto-renews" : "Upgrade for AI Features"}
                </p>
            </div>
        </div>
        <div className="px-4 py-2 bg-slate-50 rounded-lg">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                {isPremium ? "Manage" : "Upgrade"}
            </span>
        </div>
    </button>
);

const Settings = () => {
  const [originalProfile, setOriginalProfile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeModal, setActiveModal] = useState(null); 

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOriginalProfile(data);
        setProfile(data);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const hasChanges = useMemo(() => JSON.stringify(originalProfile) !== JSON.stringify(profile), [originalProfile, profile]);

  const handleFieldChange = (key, value) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const toggleItem = (currentList = [], item, key) => {
    const newList = currentList?.includes(item) 
      ? currentList.filter(i => i !== item) 
      : [...(currentList || []), item];
    handleFieldChange(key, newList);
  };

  const saveChanges = async () => {
    if (!user || !hasChanges) return;
    setIsSaving(true);
    try {
        await setDoc(doc(db, "users", user.uid), profile, { merge: true });
    } catch (err) { console.error("Save error:", err); }
    setIsSaving(false);
  };

  const handleSubscription = () => {
      if (profile?.isPremium) {
          alert("Redirecting to Stripe Customer Portal...");
      } else {
          alert("Opening Upgrade Options...");
      }
  };

  // --- DATA GENERATORS ---
  const heightOptions = Array.from({length: 49}, (_, i) => { 
      const totalInches = 48 + i;
      const ft = Math.floor(totalInches / 12);
      const inches = totalInches % 12;
      return { val: totalInches, label: `${ft}' ${inches}"` };
  });
  const weightOptions = Array.from({length: 350}, (_, i) => ({ val: i + 50, label: `${i + 50} lbs` })); 
  const ageOptions = Array.from({length: 100}, (_, i) => ({ val: i + 1, label: `${i + 1} years old` }));

  if (loading) return <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-black rounded-full animate-spin"></div></div>;

  return (
    <div className="w-full font-['Switzer'] pb-4 bg-gray-50 min-h-screen text-slate-900">
      
      {/* HEADER */}
      <header className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tight mb-0">Account Details</h1>
          <p className="text-sm font-medium text-slate-400">Manage your profile & preferences</p>
      </header>

      <div className="px-4 space-y-8">
        
        {/* 1. IDENTITY CARD (MOVED TO TOP) */}
        <section className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden shadow-inner">
                {user?.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                    <ColoredIcon src={userIcon} colorClass="bg-slate-300" sizeClass="w-8 h-8" />
                )}
            </div>
            <div className="flex-1">
                <input 
                  type="text" 
                  value={profile?.firstName || ''} 
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  placeholder="First Name"
                  className="w-full bg-transparent border-none p-0 text-xl font-black text-slate-900 outline-none placeholder:text-slate-300 mb-0.5"
                />
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{user?.email}</p>
            </div>
        </section>

        {/* 2. SUBSCRIPTION ROW (NEW SUBTLE DESIGN) */}
        <SubscriptionRow 
            isPremium={profile?.isPremium || false} 
            onManage={handleSubscription} 
        />

        {/* 3. PRIMARY GOAL */}
        <section>
            <div className="flex items-center gap-3 mb-4 px-2">
                <ColoredIcon src={fireIcon} colorClass="bg-slate-900" sizeClass="w-5 h-5" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight pt-2">Primary Goal</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
                {GOAL_OPTIONS.map(goal => {
                    const active = (profile?.goalType || 'maintain') === goal.id;
                    return (
                        <button 
                          key={goal.id} 
                          onClick={() => handleFieldChange('goalType', goal.id)}
                          className={`w-full min-h-[72px] p-4 rounded-2xl border text-left transition-all flex items-center justify-between shadow-sm active:scale-[0.98] ${active ? 'border-emerald-500 bg-emerald-50' : 'border-white bg-white hover:border-slate-200'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                    <ColoredIcon src={goal.icon} colorClass="bg-current" sizeClass="w-5 h-5" />
                                </div>
                                <div>
                                    <p className={`font-bold text-[15px] leading-tight ${active ? 'text-slate-900' : 'text-slate-900'}`}>{goal.label}</p>
                                    <p className="text-[11px] font-bold mt-0.5 text-slate-400">{goal.desc}</p>
                                </div>
                            </div>
                            {active && <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"><svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>}
                        </button>
                    );
                })}
            </div>
        </section>

        {/* 4. PERSONAL DETAILS */}
        <section>
            <div className="flex items-center gap-3 mb-4 px-2">
                <ColoredIcon src={scaleIcon} colorClass="bg-slate-900" sizeClass="w-5 h-5" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight pt-2">Measurements</h3>
            </div>
            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => setActiveModal('height')} className="w-full flex items-center justify-between p-5 border-b border-slate-50 active:bg-slate-50 transition-colors">
                    <span className="text-[15px] font-semibold text-slate-600">Height</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-slate-900">{profile?.height ? `${Math.floor(profile.height / 12)}' ${profile.height % 12}"` : "Set"}</span>
                        <svg className="w-4 h-4 text-slate-300 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </div>
                </button>
                <button onClick={() => setActiveModal('weight')} className="w-full flex items-center justify-between p-5 border-b border-slate-50 active:bg-slate-50 transition-colors">
                    <span className="text-[15px] font-semibold text-slate-600">Weight</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-slate-900">{profile?.weight ? `${profile.weight} lbs` : "Set"}</span>
                        <svg className="w-4 h-4 text-slate-300 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </div>
                </button>
                <button onClick={() => setActiveModal('age')} className="w-full flex items-center justify-between p-5 active:bg-slate-50 transition-colors">
                    <span className="text-[15px] font-semibold text-slate-600">Age</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-slate-900">{profile?.age || "Set"}</span>
                        <svg className="w-4 h-4 text-slate-300 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </div>
                </button>
            </div>
        </section>

        {/* 5. MEDICAL PROFILE */}
        <section>
            <div className="flex items-center gap-3 mb-4 px-2">
                <ColoredIcon src={heartIcon} colorClass="bg-slate-900" sizeClass="w-5 h-5" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight pt-2">Medical Conditions</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
                {MEDICAL_CONDITIONS.map(cond => {
                    const active = profile?.conditions?.includes(cond.label);
                    return (
                        <button 
                          key={cond.id} 
                          onClick={() => toggleItem(profile?.conditions, cond.label, 'conditions')}
                          className={`w-full min-h-[72px] p-4 rounded-2xl border text-left transition-all flex items-center justify-between shadow-sm active:scale-[0.98] ${active ? 'border-slate-900 bg-slate-900' : 'border-white bg-white hover:border-slate-200'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-white/20' : 'bg-slate-50'}`}>
                                    <ColoredIcon src={cond.icon} colorClass={active ? 'bg-white' : 'bg-slate-900'} sizeClass="w-5 h-5" />
                                </div>
                                <div>
                                    <p className={`font-bold text-[15px] leading-tight ${active ? 'text-white' : 'text-slate-900'}`}>{cond.label}</p>
                                    <p className={`text-[11px] font-bold mt-0.5 ${active ? 'text-slate-400' : 'text-slate-400'}`}>{cond.impact}</p>
                                </div>
                            </div>
                            {active && <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"><svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>}
                        </button>
                    );
                })}
            </div>
        </section>

        {/* 6. LIFESTYLE & ALLERGENS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section>
                <div className="flex items-center gap-3 mb-4 px-2">
                    <ColoredIcon src={lifestyleIcon} colorClass="bg-slate-900" sizeClass="w-5 h-5" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight pt-2">Lifestyle</h3>
                </div>
                <div className="flex flex-col gap-2">
                    {LIFESTYLE_DIETS.map(diet => {
                        const active = profile?.lifestyles?.includes(diet.label);
                        return (
                            <button 
                              key={diet.id} 
                              onClick={() => toggleItem(profile?.lifestyles, diet.label, 'lifestyles')}
                              className={`h-14 px-5 rounded-2xl font-bold text-sm border transition-all flex items-center justify-between ${active ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-700 border-white hover:border-slate-200'}`}
                            >
                                <span className="flex items-center gap-3">
                                    <ColoredIcon src={diet.icon} colorClass={active ? 'bg-white' : 'bg-slate-400'} sizeClass="w-4 h-4"/>
                                    {diet.label}
                                </span>
                                {active && <span className="text-emerald-400 text-xs">●</span>}
                            </button>
                        );
                    })}
                </div>
            </section>

            <section>
                <div className="flex items-center gap-3 mb-4 px-2">
                    <ColoredIcon src={filterIcon} colorClass="bg-slate-900" sizeClass="w-5 h-5" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight pt-2">Allergens</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {COMMON_ALLERGENS.map(ing => {
                        const active = profile?.restrictions?.includes(ing.label);
                        return (
                            <button 
                              key={ing.label} 
                              onClick={() => toggleItem(profile?.restrictions, ing.label, 'restrictions')}
                              className={`h-14 px-4 rounded-2xl font-bold text-xs border transition-all flex flex-col items-center justify-center gap-1 ${active ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 border-white hover:border-slate-200'}`}
                            >
                                <span>{ing.label}</span>
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>

        {/* 7. SMART SAVE */}
        <section className="pt-4 flex flex-col gap-4">
            <button 
              disabled={!hasChanges || isSaving}
              onClick={saveChanges}
              className={`w-full py-5 font-semibold text-sm capitalize tracking-tight rounded-2xl transition-all shadow-xl active:scale-[0.98] ${hasChanges ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
            >
                {isSaving ? 'Saving Profile...' : 'Save Changes'}
            </button>
            
            <div className="flex gap-3 mt-2">
                <button onClick={() => signOut(auth)} className="flex-1 py-4 border border-slate-200 bg-white text-slate-900 font-semibold text-xs capitalize tracking-tight rounded-2xl hover:bg-slate-50 transition-colors">Sign Out</button>
                <button className="flex-1 py-4 border border-transparent bg-rose-100 text-rose-600 font-bold text-xs capitalize tracking-tight rounded-2xl hover:bg-rose-100 transition-colors">Delete Account</button>
            </div>
        </section>
      </div>

      {/* MODALS */}
      <SelectionSheet 
        isOpen={activeModal === 'height'} 
        onClose={() => setActiveModal(null)} 
        title="Select Height" 
        options={heightOptions} 
        value={profile?.height} 
        onSelect={(val) => handleFieldChange('height', val)} 
      />
      <SelectionSheet 
        isOpen={activeModal === 'weight'} 
        onClose={() => setActiveModal(null)} 
        title="Select Weight" 
        options={weightOptions} 
        value={profile?.weight} 
        onSelect={(val) => handleFieldChange('weight', val)} 
      />
      <SelectionSheet 
        isOpen={activeModal === 'age'} 
        onClose={() => setActiveModal(null)} 
        title="Select Age" 
        options={ageOptions} 
        value={profile?.age} 
        onSelect={(val) => handleFieldChange('age', val)} 
      />

    </div>
  );
};

export default Settings;