import React, { useState, useEffect, useMemo } from 'react';
import { getAuth, signOut, deleteUser } from "firebase/auth";
import { doc, setDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from '../firebase';

// --- MAGICOON ICON IMPORTS ---
import heartIcon from '../icons/heart-check.svg';
import lifestyleIcon from '../icons/store.svg';
import filterIcon from '../icons/search.svg';
import userIcon from '../icons/user.svg';
import scaleIcon from '../icons/dumbbell-filled.svg'; 

// Selectable Item Icons
import celiacIcon from '../icons/bread-slice.svg';
import kidneyIcon from '../icons/glass.svg';
import diabetesIcon from '../icons/candy.svg';
import ibdIcon from '../icons/heart-check.svg';
import halalIcon from '../icons/steak.svg';
import kosherIcon from '../icons/steak.svg';
import veganIcon from '../icons/carrot.svg';
import veggieIcon from '../icons/carrot.svg';

const MEDICAL_CONDITIONS = [
    { id: 'celiac', label: "Celiac Disease", impact: "Gluten-Free Required", icon: celiacIcon },
    { id: 'ckd', label: "Kidney Disease", impact: "Low Sodium/Protein", icon: kidneyIcon },
    { id: 'diabetes', label: "Diabetes", impact: "Sugar Management", icon: diabetesIcon },
    { id: 'ibd', label: "IBD/Crohn's", impact: "Gut Health", icon: ibdIcon }
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

const Settings = () => {
  const [originalProfile, setOriginalProfile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    const newList = currentList.includes(item) 
      ? currentList.filter(i => i !== item) 
      : [...currentList, item];
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

  if (loading) return <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-black rounded-full animate-spin"></div></div>;

  return (
    <div className="w-full font-['Switzer'] space-y-12">
      
      {/* 1. IDENTITY SECTION */}
      <section className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
          <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
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
                    className="w-full bg-transparent border-none p-0 text-xl font-bold text-slate-900 outline-none placeholder:text-slate-300"
                  />
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{user?.email}</p>
              </div>
          </div>
      </section>

      {/* 2. PERSONAL DETAILS (Scroll Wheel Logic) */}
      <section>
          <div className="flex items-center gap-3 mb-6 px-1">
              <ColoredIcon src={scaleIcon} colorClass="bg-slate-900" sizeClass="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Personal Details</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
              {/* Height Picker */}
              <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl min-h-[56px]">
                  <span className="text-sm font-bold text-slate-500">Height</span>
                  <div className="flex gap-2">
                      <select 
                        value={Math.floor(profile?.height / 12) || 5} 
                        onChange={(e) => handleFieldChange('height', (parseInt(e.target.value) * 12) + (profile?.height % 12 || 0))}
                        className="bg-slate-50 border-none rounded-lg font-black text-lg p-1 focus:ring-0 appearance-none"
                      >
                          {[3,4,5,6,7,8].map(ft => <option key={ft} value={ft}>{ft} ft</option>)}
                      </select>
                      <select 
                        value={profile?.height % 12 || 0} 
                        onChange={(e) => handleFieldChange('height', (Math.floor(profile?.height / 12) * 12) + parseInt(e.target.value))}
                        className="bg-slate-50 border-none rounded-lg font-black text-lg p-1 focus:ring-0 appearance-none"
                      >
                          {[0,1,2,3,4,5,6,7,8,9,10,11].map(in_ => <option key={in_} value={in_}>{in_} in</option>)}
                      </select>
                  </div>
              </div>

              {/* Weight Picker */}
              <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl min-h-[56px]">
                  <span className="text-sm font-bold text-slate-500">Weight</span>
                  <div className="flex items-center gap-2">
                    <select 
                        value={profile?.weight || 150} 
                        onChange={(e) => handleFieldChange('weight', parseInt(e.target.value))}
                        className="bg-slate-50 border-none rounded-lg font-black text-lg p-1 focus:ring-0 appearance-none"
                    >
                        {Array.from({length: 400}, (_, i) => i + 50).map(lb => <option key={lb} value={lb}>{lb}</option>)}
                    </select>
                    <span className="font-bold text-slate-400">lbs</span>
                  </div>
              </div>

              {/* Age Picker */}
              <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl min-h-[56px]">
                  <span className="text-sm font-bold text-slate-500">Age</span>
                  <select 
                    value={profile?.age || 25} 
                    onChange={(e) => handleFieldChange('age', parseInt(e.target.value))}
                    className="bg-slate-50 border-none rounded-lg font-black text-lg p-1 focus:ring-0 appearance-none"
                  >
                      {Array.from({length: 100}, (_, i) => i + 1).map(age => <option key={age} value={age}>{age}</option>)}
                  </select>
              </div>
          </div>
      </section>

      {/* 3. MEDICAL PROFILE */}
      <section>
          <div className="flex items-center gap-3 mb-6 px-1">
              <ColoredIcon src={heartIcon} colorClass="bg-slate-900" sizeClass="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Medical Profile</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
              {MEDICAL_CONDITIONS.map(cond => {
                  const active = profile?.conditions?.includes(cond.label);
                  return (
                      <button 
                        key={cond.id} 
                        onClick={() => toggleItem(profile?.conditions, cond.label, 'conditions')}
                        className={`w-full min-h-[64px] p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${active ? 'border-black bg-black' : 'border-slate-100 bg-white'}`}
                      >
                          <div className="flex items-center gap-4">
                              <ColoredIcon src={cond.icon} colorClass={active ? 'bg-white' : 'bg-slate-900'} />
                              <div>
                                  <p className={`font-bold text-[15px] ${active ? 'text-white' : 'text-slate-900'}`}>{cond.label}</p>
                                  <p className="text-[10px] font-bold text-slate-400">{cond.impact}</p>
                              </div>
                          </div>
                      </button>
                  );
              })}
          </div>
      </section>

      {/* 4. LIFESTYLE DIETS */}
      <section>
          <div className="flex items-center gap-3 mb-6 px-1">
              <ColoredIcon src={lifestyleIcon} colorClass="bg-slate-900" sizeClass="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Lifestyle Diets</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
              {LIFESTYLE_DIETS.map(diet => {
                  const active = profile?.lifestyles?.includes(diet.label);
                  return (
                      <button 
                        key={diet.id} 
                        onClick={() => toggleItem(profile?.lifestyles, diet.label, 'lifestyles')}
                        className={`min-h-[64px] px-4 rounded-2xl font-bold text-sm border-2 transition-all flex items-center gap-3 ${active ? 'bg-black text-white border-black' : 'bg-white text-slate-900 border-slate-100'}`}
                      >
                          <ColoredIcon src={diet.icon} colorClass={active ? 'bg-white' : 'bg-slate-900'} />
                          <span>{diet.label}</span>
                      </button>
                  );
              })}
          </div>
      </section>

      {/* 5. INGREDIENT FILTERS */}
      <section>
          <div className="flex items-center gap-3 mb-6 px-1">
              <ColoredIcon src={filterIcon} colorClass="bg-slate-900" sizeClass="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Ingredient Filters</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
              {COMMON_ALLERGENS.map(ing => {
                  const active = profile?.restrictions?.includes(ing.label);
                  return (
                      <button 
                        key={ing.label} 
                        onClick={() => toggleItem(profile?.restrictions, ing.label, 'restrictions')}
                        className={`min-h-[64px] px-4 rounded-2xl font-bold text-sm border-2 transition-all flex items-center gap-3 ${active ? 'bg-black text-white border-black' : 'bg-white text-slate-900 border-slate-100'}`}
                      >
                          <ColoredIcon src={ing.icon} colorClass={active ? 'bg-white' : 'bg-slate-900'} />
                          <span>{ing.label}</span>
                      </button>
                  );
              })}
          </div>
      </section>

      {/* 6. SMART SAVE */}
      <section className="pt-10 flex flex-col gap-4">
          <button 
            disabled={!hasChanges || isSaving}
            onClick={saveChanges}
            className={`w-full h-14 font-bold rounded-2xl transition-all ${hasChanges ? 'bg-black text-white shadow-xl active:scale-95' : 'bg-slate-100 text-slate-300'}`}
          >
              {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <div className="flex gap-3">
              <button onClick={() => signOut(auth)} className="flex-1 h-14 border border-slate-200 text-slate-900 font-bold rounded-2xl">Sign Out</button>
              <button onClick={() => setShowDeleteModal(true)} className="flex-1 h-14 border border-rose-100 text-rose-500 font-bold rounded-2xl">Delete Account</button>
          </div>
      </section>
    </div>
  );
};

export default Settings;