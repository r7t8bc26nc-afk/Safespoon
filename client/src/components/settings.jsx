import React, { useState, useEffect, useMemo } from 'react';
import { getAuth, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// --- ICONS ---
import heartIcon from '../icons/stethoscope.svg';
import lifestyleIcon from '../icons/heart.svg';
import filterIcon from '../icons/virus-covid.svg';
import userIcon from '../icons/user.svg';
import scaleIcon from '../icons/dumbbell-filled.svg'; 
import atrfibIcon from '../icons/wave-pulse.svg'; 
import fireIcon from '../icons/fire.svg'; 
import starIcon from '../icons/sparkle.svg'; 
import celiacIcon from '../icons/bread-slice.svg';
import kidneyIcon from '../icons/glass.svg';
import diabetesIcon from '../icons/candy-cane.svg';
import ibdIcon from '../icons/heart-check.svg';
import halalIcon from '../icons/mosque.svg';
import kosherIcon from '../icons/steak.svg';
import veganIcon from '../icons/leaf.svg';
import veggieIcon from '../icons/carrot.svg';

// --- DATA ---
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
    { label: "Gluten", icon: celiacIcon }, { label: "Dairy", icon: kidneyIcon },
    { label: "Peanuts", icon: diabetesIcon }, { label: "Tree Nuts", icon: heartIcon },
    { label: "Soy", icon: filterIcon }, { label: "Eggs", icon: userIcon },
    { label: "Shellfish", icon: heartIcon }, { label: "Fish", icon: heartIcon }
];

const ColoredIcon = ({ src, colorClass, sizeClass = "w-5 h-5" }) => (
  <div className={`${sizeClass} ${colorClass}`} style={{ 
      WebkitMaskImage: `url("${src}")`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: `url("${src}")`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', backgroundColor: 'currentColor' 
  }} />
);

// --- MODAL ---
const SelectionSheet = ({ isOpen, onClose, title, options, value, onSelect }) => (
    <AnimatePresence>
        {isOpen && (
            <div className="fixed inset-0 z-[11000] flex flex-col justify-end">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full border-t-4 border-black p-6 pb-12 relative z-10 max-h-[70vh] flex flex-col">
                    <div className="w-16 h-2 bg-black mx-auto mb-6" />
                    <h3 className="text-2xl font-black text-black uppercase text-center mb-6">{title}</h3>
                    <div className="overflow-y-auto flex-1 space-y-3 p-1">
                        {options.map((opt) => (
                            <button key={opt.val} onClick={() => { onSelect(opt.val); onClose(); }} className={`w-full p-4 border-4 border-black font-bold uppercase flex justify-between items-center transition-all active:scale-[0.98] ${value === opt.val ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}>
                                <span>{opt.label}</span>
                                {value === opt.val && <span>✓</span>}
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);

const Settings = () => {
  const [profile, setProfile] = useState(null);
  const [originalProfile, setOriginalProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null); 
  
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
          const d = docSnap.data();
          setProfile(d);
          setOriginalProfile(d);
      }
      setLoading(false);
    });
  }, [user]);

  const hasChanges = useMemo(() => JSON.stringify(originalProfile) !== JSON.stringify(profile), [originalProfile, profile]);

  const handleFieldChange = (key, value) => setProfile(prev => ({ ...prev, [key]: value }));
  const toggleItem = (currentList = [], item, key) => {
    const list = currentList || [];
    const newList = list.includes(item) ? list.filter(i => i !== item) : [...list, item];
    handleFieldChange(key, newList);
  };

  const saveChanges = async () => {
    if (!user || !hasChanges) return;
    try { await setDoc(doc(db, "users", user.uid), profile, { merge: true }); alert("SAVED."); } 
    catch (err) { console.error(err); }
  };

  const heightOptions = Array.from({length: 49}, (_, i) => { const t = 48 + i; return { val: t, label: `${Math.floor(t / 12)}' ${t % 12}"` }; });
  const weightOptions = Array.from({length: 350}, (_, i) => ({ val: i + 50, label: `${i + 50} lbs` })); 
  const ageOptions = Array.from({length: 100}, (_, i) => ({ val: i + 1, label: `${i + 1} years old` }));

  if (loading) return <div className="p-10 font-black text-center pt-32">LOADING...</div>;

  return (
    // FIX: Added 'pt-24' (padding-top: 6rem) so content starts below the fixed header
    <div className="w-full pb-12 text-black space-y-10 min-h-screen bg-white">
      
      {/* 1. IDENTITY & SUBSCRIPTION */}
      <div className="space-y-4">
          <div className="border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white flex items-center gap-6 mb-8 mx-4">
              <div className="h-16 w-16 border-2 border-black bg-gray-100 flex items-center justify-center overflow-hidden">
                  {user?.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full object-cover" /> : <ColoredIcon src={userIcon} colorClass="bg-black" sizeClass="w-8 h-8" />}
              </div>
              <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500 tracking-widest">First Name</label>
                  <input type="text" value={profile?.firstName || ''} onChange={(e) => handleFieldChange('firstName', e.target.value)} placeholder="NAME" className="w-full border-b-4 border-black p-1 text-2xl font-black uppercase outline-none bg-transparent" />
                  <p className="text-xs font-bold font-mono text-gray-400 mt-2 truncate">{user?.email}</p>
              </div>
          </div>

          <button onClick={() => navigate('/subscription')} className={`mx-4 w-[calc(100%-2rem)] p-4 border-4 border-black flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all ${profile?.isPremium ? 'bg-black text-white' : 'bg-white'}`}>
              <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 border-2 flex items-center justify-center ${profile?.isPremium ? 'border-white bg-white/20' : 'border-black bg-gray-100'}`}><ColoredIcon src={starIcon} colorClass={profile?.isPremium ? 'bg-white' : 'bg-black'} /></div>
                  <div className="text-left"><p className="font-black uppercase text-sm">{profile?.isPremium ? "Premium Active" : "Basic Plan"}</p><p className="text-[10px] font-bold uppercase opacity-70">{profile?.isPremium ? "Manage" : "Upgrade Now"}</p></div>
              </div>
              <div className="text-2xl font-black">→</div>
          </button>
      </div>

      {/* 2. STATS */}
      <section className="px-4">
          <div className="flex items-center gap-3 mb-4 border-b-4 border-black pb-2 w-full">
              <ColoredIcon src={scaleIcon} colorClass="bg-black" />
              <h3 className="text-lg font-black uppercase">Body Stats</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
              {[
                { key: 'height', label: 'Height', val: profile?.height ? `${Math.floor(profile.height / 12)}' ${profile.height % 12}"` : "SET", modal: 'height' },
                { key: 'weight', label: 'Weight', val: profile?.weight ? `${profile.weight} lbs` : "SET", modal: 'weight' },
                { key: 'age', label: 'Age', val: profile?.age || "SET", modal: 'age' }
              ].map(stat => (
                  <button key={stat.key} onClick={() => setActiveModal(stat.modal)} className="flex justify-between items-center p-5 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all">
                      <span className="font-bold uppercase text-sm tracking-wide">{stat.label}</span>
                      <span className="font-black text-xl uppercase">{stat.val}</span>
                  </button>
              ))}
          </div>
      </section>

      {/* 3. GOALS */}
      <section className="px-4">
          <div className="flex items-center gap-3 mb-4 border-b-4 border-black pb-2 w-full">
              <ColoredIcon src={fireIcon} colorClass="bg-black" />
              <h3 className="text-lg font-black uppercase">Goal</h3>
          </div>
          <div className="space-y-3">
            {GOAL_OPTIONS.map(goal => (
                <button key={goal.id} onClick={() => handleFieldChange('goalType', goal.id)} className={`w-full p-4 border-4 border-black flex items-center gap-4 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 ${profile?.goalType === goal.id ? 'bg-black text-white' : 'bg-white'}`}>
                    <div className={`w-12 h-12 border-2 flex items-center justify-center shrink-0 ${profile?.goalType === goal.id ? 'border-white' : 'border-black bg-gray-100'}`}><ColoredIcon src={goal.icon} colorClass={profile?.goalType === goal.id ? 'bg-white' : 'bg-black'} /></div>
                    <div className="text-left"><p className="font-black uppercase text-base">{goal.label}</p><p className="text-[10px] font-bold uppercase opacity-70 tracking-wide">{goal.desc}</p></div>
                </button>
            ))}
          </div>
      </section>

      {/* 4. ALLERGENS */}
      <section className="px-4">
          <div className="flex items-center gap-3 mb-4 border-b-4 border-black pb-2 w-full">
              <ColoredIcon src={filterIcon} colorClass="bg-black" />
              <h3 className="text-lg font-black uppercase">Allergens</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
              {COMMON_ALLERGENS.map(item => {
                  const active = profile?.restrictions?.includes(item.label);
                  return (
                      <button key={item.label} onClick={() => toggleItem(profile?.restrictions, item.label, 'restrictions')} className={`p-4 border-4 border-black font-bold uppercase text-xs flex flex-col items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all ${active ? 'bg-black text-white' : 'bg-white text-black'}`}>
                          <ColoredIcon src={item.icon} colorClass={active ? 'bg-white' : 'bg-black'} sizeClass="w-6 h-6"/>
                          {item.label}
                      </button>
                  );
              })}
          </div>
      </section>

      {/* 5. SAVE & EXIT */}
      <div className="pt-8 px-4 space-y-4 pb-8">
          <button 
            onClick={saveChanges} 
            disabled={!hasChanges}
            // FIX: Correct logic for button styling
            className={`w-full py-5 font-black text-xl uppercase border-4 border-black transition-all ${
                hasChanges 
                ? 'bg-[#FFD700] text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1' 
                : 'bg-gray-100 text-gray-400 border-gray-300 shadow-none cursor-not-allowed'
            }`}
          >
            {hasChanges ? 'Save Changes' : 'No Changes'}
          </button>
          
          <button onClick={() => signOut(auth)} className="w-full py-4 border-4 border-black bg-white font-bold uppercase hover:bg-red-50 hover:text-red-600 hover:border-red-600 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1">Sign Out</button>
      </div>

      {/* MODALS */}
      <SelectionSheet isOpen={activeModal === 'height'} onClose={() => setActiveModal(null)} title="Select Height" options={heightOptions} value={profile?.height} onSelect={(val) => handleFieldChange('height', val)} />
      <SelectionSheet isOpen={activeModal === 'weight'} onClose={() => setActiveModal(null)} title="Select Weight" options={weightOptions} value={profile?.weight} onSelect={(val) => handleFieldChange('weight', val)} />
      <SelectionSheet isOpen={activeModal === 'age'} onClose={() => setActiveModal(null)} title="Select Age" options={ageOptions} value={profile?.age} onSelect={(val) => handleFieldChange('age', val)} />
    </div>
  );
};

export default Settings;