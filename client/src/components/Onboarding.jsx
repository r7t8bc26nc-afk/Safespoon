import React, { useState, useEffect, useRef } from 'react';
import { getAuth, signOut } from "firebase/auth";
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// --- DATA SETS ---
const SEVERITY = {
  STRICT: 'STRICT', 
  LIMIT: 'LIMIT',   
};

const MEDICAL_CONDITIONS = [
    { 
        id: 'celiac', 
        label: "Celiac Disease", 
        impact: "Prevents intestinal damage.",
        expandedDetail: "We strict-filter gluten, wheat, barley, and rye to prevent autoimmune reactions.",
        severity: SEVERITY.STRICT,
        autoShield: ["Gluten", "Wheat", "Barley", "Rye", "Malt"] 
    },
    { 
        id: 'ckd', 
        label: "Kidney Disease (CKD)", 
        impact: "Controls kidney load.", 
        expandedDetail: "We monitor sodium, potassium, and phosphorus to reduce strain on your kidneys.",
        severity: SEVERITY.LIMIT,
        autoShield: ["High Sodium", "High Potassium", "High Phosphorus"] 
    },
    { 
        id: 'diabetes', 
        label: "Diabetes", 
        impact: "Stabilizes blood sugar.", 
        expandedDetail: "We highlight high-glycemic ingredients and refined sugars to help manage glucose.",
        severity: SEVERITY.LIMIT,
        autoShield: ["Refined Sugar", "High Carb"] 
    },
    { 
        id: 'ibd', 
        label: "IBD (Crohn's/Colitis)", 
        impact: "Minimizes gut inflammation.", 
        expandedDetail: "We flag inflammatory triggers like spicy foods and caffeine to reduce flare-ups.",
        severity: SEVERITY.LIMIT,
        autoShield: ["Spicy Foods", "Caffeine"] 
    },
    { 
        id: 'gerd', 
        label: "Severe GERD", 
        impact: "Protects esophagus.", 
        expandedDetail: "We help you avoid acidic and reflux-triggering ingredients to protect esophageal health.",
        severity: SEVERITY.LIMIT,
        autoShield: ["Acidic Foods", "Caffeine", "Chocolate", "Alcohol"] 
    }
];

const COMMON_ALLERGENS = [
    "Peanuts", "Tree Nuts", "Milk", "Eggs", "Shellfish", 
    "Fish", "Soy", "Wheat", "Sesame"
];

const LIFESTYLE_DIETS = [
    { id: 'halal', label: "Halal", description: "Islamic dietary laws", autoShield: ["Pork", "Alcohol"] },
    { id: 'kosher', label: "Kosher", description: "Jewish dietary laws", autoShield: ["Pork", "Shellfish"] },
    { id: 'vegan', label: "Vegan", description: "No animal products", autoShield: ["Meat", "Dairy", "Eggs", "Honey"] },
    { id: 'veg', label: "Vegetarian", description: "No meat", autoShield: ["Meat"] }
];

// --- PICKER DATA ---
const FEET_OPTIONS = [3, 4, 5, 6, 7, 8];
const INCH_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const WEIGHT_OPTIONS = Array.from({ length: 321 }, (_, i) => i + 80);

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Modals state: 'height' | 'weight' | 'exit' | null
  const [activeModal, setActiveModal] = useState(null); 
  
  const [formData, setFormData] = useState({ 
      firstName: '', 
      lastName: '',
      age: '',
      heightFt: '5',
      heightIn: '9',
      weight: '165'
  });
  
  // Selections
  const [conditions, setConditions] = useState([]);
  const [allergens, setAllergens] = useState(new Set());
  const [lifestyles, setLifestyles] = useState([]);

  // Refs for auto-scrolling
  const weightScrollRef = useRef(null);

  // Auto-scroll weight picker
  useEffect(() => {
    if (activeModal === 'weight' && weightScrollRef.current) {
       const selectedEl = document.getElementById(`weight-${formData.weight}`);
       if (selectedEl) {
           selectedEl.scrollIntoView({ block: 'center' });
       }
    }
  }, [activeModal, formData.weight]);

  
  // --- LOGIC ---
  const computeRestrictions = () => {
    const map = {};
    conditions.forEach(cond => {
        cond.autoShield.forEach(ing => {
            if (!map[ing]) map[ing] = { severity: cond.severity, sources: [] };
            map[ing].sources.push(cond.label);
            if (cond.severity === SEVERITY.STRICT) map[ing].severity = SEVERITY.STRICT;
        });
    });
    allergens.forEach(alg => {
        if (!map[alg]) map[alg] = { severity: SEVERITY.STRICT, sources: [] };
        map[alg].sources.push("Allergy");
        map[alg].severity = SEVERITY.STRICT;
    });
    lifestyles.forEach(diet => {
        diet.autoShield.forEach(ing => {
            if (!map[ing]) map[ing] = { severity: SEVERITY.LIMIT, sources: [] };
            map[ing].sources.push(diet.label);
        });
    });
    return map;
  };

  const currentRestrictions = computeRestrictions();

  // VALIDATION
  const isStep1Valid = 
    formData.firstName.trim() !== '' && 
    formData.lastName.trim() !== '' && 
    formData.age.trim() !== '';

  const handleConditionToggle = (condition) => {
    setConditions(prev => {
        const exists = prev.find(c => c.id === condition.id);
        return exists ? prev.filter(c => c.id !== condition.id) : [...prev, condition];
    });
  };

  const handleAllergenToggle = (allergen) => {
      const next = new Set(allergens);
      next.has(allergen) ? next.delete(allergen) : next.add(allergen);
      setAllergens(next);
  };

  const handleLifestyleToggle = (diet) => {
    setLifestyles(prev => {
        const exists = prev.find(l => l.id === diet.id);
        return exists ? prev.filter(l => l.id !== diet.id) : [...prev, diet];
    });
  };

  const getBackLabel = () => {
      switch(step) {
          case 1: return "Exit Sign Up";
          case 2: return "Back to Identity";
          case 3: return "Back to Health Profile";
          case 4: return "Back to Allergens";
          case 5: return "Back to Lifestyle";
          default: return "Go Back";
      }
  };

  const getNextLabel = () => {
      if (loading) return "Syncing Shield...";
      switch (step) {
          case 1: return "Continue to Health Profile";
          case 2: return "Continue to Allergens";
          case 3: return "Continue to Lifestyle";
          case 4: return "Continue to Verification";
          case 5: return "Launch Dashboard";
          default: return "Next";
      }
  };

  // --- EXIT LOGIC FIX ---
  const handleBack = () => {
      if (step === 1) {
          setActiveModal('exit');
      } else {
          setStep(step - 1);
      }
  };

  const handleExit = async () => {
    const auth = getAuth();
    try {
        // Sign out to clear the session. 
        // This will force the main App wrapper to see user === null and show the Login page.
        await signOut(auth);
        window.location.href = '/'; // Fallback redirect to root/login
    } catch (error) {
        console.error("Error signing out:", error);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
        console.error("No authenticated user found");
        setLoading(false);
        return;
    }

    try {
      await setDoc(doc(db, "users", user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        age: formData.age,
        height: `${formData.heightFt}' ${formData.heightIn}"`,
        weight: formData.weight,
        profile: {
            medical: conditions.map(c => c.id),
            allergens: Array.from(allergens),
            lifestyles: lifestyles.map(l => l.id),
        },
        restrictions: currentRestrictions,
        onboardingComplete: true,
        updatedAt: serverTimestamp() 
      }, { merge: true });
      
      onComplete();
    } catch (err) {
      console.error("Database Update Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Shared Styles
  const inputClasses = "w-full h-14 bg-slate-50 rounded-2xl px-5 font-medium outline-none border-2 border-transparent focus:border-violet-100 focus:bg-white placeholder:font-medium placeholder-slate-400 font-sans transition-all";
  const labelClasses = "block text-sm font-semibold text-slate-600 mb-1.5 ml-1 tracking-tight";
  const pickerButtonClasses = "w-full h-14 bg-slate-50 rounded-2xl px-5 flex items-center justify-between font-medium text-slate-900 border-2 border-transparent active:border-violet-100 active:bg-white transition-all";

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 pb-48">
      
      {/* --- HEADER --- */}
      <div className="pt-8 px-8 bg-white sticky top-0 flex justify-between items-center z-50">
         <span className="text-2xl font-extrabold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent font-host tracking-tighter select-none">
            Safespoon
         </span>
         <div className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Step {step} / 5</div>
      </div>

      <div className="px-6 pt-8 max-w-lg mx-auto">
         
         {/* STEP 1: IDENTITY */}
         {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <h1 className="text-3xl font-bold mb-1 leading-tight">Personal Details</h1>
                <p className="text-slate-500 mb-8 font-medium">We'll personalize your experience based on your biology</p>
                
                <div className="space-y-4">
                    {/* First Name */}
                    <div>
                        <label className={labelClasses}>First Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Michael" 
                            value={formData.firstName} 
                            onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                            className={inputClasses} 
                        />
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className={labelClasses}>Last Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Scott" 
                            value={formData.lastName} 
                            onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                            className={inputClasses} 
                        />
                    </div>

                    {/* Age */}
                    <div>
                        <label className={labelClasses}>Age</label>
                        <input 
                            type="number" 
                            placeholder="e.g. 24" 
                            value={formData.age} 
                            onChange={(e) => setFormData({...formData, age: e.target.value})} 
                            className={inputClasses} 
                        />
                    </div>

                    {/* Height / Weight Pickers */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClasses}>Height</label>
                            <button 
                                onClick={() => setActiveModal('height')}
                                className={pickerButtonClasses}
                            >
                                <span>{formData.heightFt}' {formData.heightIn}"</span>
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                        </div>

                        <div>
                            <label className={labelClasses}>Weight</label>
                            <button 
                                onClick={() => setActiveModal('weight')}
                                className={pickerButtonClasses}
                            >
                                <span>{formData.weight} lbs</span>
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
         )}

         {/* STEP 2: HEALTH PROFILE */}
         {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4">
                <h1 className="text-3xl font-black mb-1 leading-tight">Health Profile.</h1>
                <p className="text-slate-500 mb-6 font-medium">Select diagnosed conditions we need to manage.</p>
                <div className="space-y-3">
                    {MEDICAL_CONDITIONS.map(c => {
                        const active = conditions.find(cond => cond.id === c.id);
                        return (
                            <button key={c.id} onClick={() => handleConditionToggle(c)} className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 ${active ? 'border-violet-600 bg-violet-50 shadow-sm' : 'border-slate-100 hover:border-violet-200'}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="font-bold text-slate-900">{c.label}</h3>
                                    {active && <span className="text-[10px] font-black bg-violet-200 text-violet-800 px-2 py-0.5 rounded-full">{c.severity}</span>}
                                </div>
                                <p className={`text-sm leading-relaxed transition-all ${active ? 'text-violet-900 font-medium' : 'text-slate-500'}`}>
                                    {active ? c.expandedDetail : c.impact}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>
         )}

         {/* STEP 3: SPECIFIC ALLERGENS */}
         {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4">
                <h1 className="text-3xl font-black mb-1 leading-tight">Specific Allergens.</h1>
                <p className="text-slate-500 mb-6 font-medium">Select specific ingredients that trigger a reaction.</p>
                <div className="grid grid-cols-2 gap-3">
                    {COMMON_ALLERGENS.map(ing => {
                        const active = allergens.has(ing);
                        return (
                            <button key={ing} onClick={() => handleAllergenToggle(ing)} className={`w-full text-center p-4 rounded-2xl border-2 transition-all ${active ? 'border-red-500 bg-red-50 text-red-900 shadow-sm' : 'border-slate-100 text-slate-600 hover:border-slate-200'}`}>
                                <h3 className="font-bold">{ing}</h3>
                            </button>
                        );
                    })}
                </div>
                <p className="text-center text-xs text-slate-400 mt-6">You can verify strictness in the final review.</p>
            </div>
         )}

         {/* STEP 4: LIFESTYLE */}
         {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4">
                <h1 className="text-3xl font-black mb-1 leading-tight">Lifestyle.</h1>
                <p className="text-slate-500 mb-6 font-medium">Do you follow specific cultural or personal diets?</p>
                <div className="grid grid-cols-1 gap-3">
                    {LIFESTYLE_DIETS.map(diet => {
                        const active = lifestyles.find(l => l.id === diet.id);
                        return (
                            <button key={diet.id} onClick={() => handleLifestyleToggle(diet)} className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${active ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-100 hover:border-emerald-100'}`}>
                                <h3 className="font-bold text-slate-900">{diet.label}</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">{diet.description}</p>
                            </button>
                        );
                    })}
                </div>
            </div>
         )}

         {/* STEP 5: VERIFICATION */}
         {step === 5 && (
            <div className="animate-in fade-in slide-in-from-right-4">
                <h1 className="text-3xl font-black mb-1 leading-tight">Verification.</h1>
                <p className="text-slate-500 mb-8 font-medium">
                    We've built your shield. Review what we are blocking.
                    <br/><span className="text-xs text-slate-400">(These items will be flagged in your scanner)</span>
                </p>
                
                <div className="flex flex-wrap gap-2">
                    {Object.entries(currentRestrictions).length === 0 ? (
                        <div className="w-full text-center py-10 text-slate-300 italic">No active restrictions found.</div>
                    ) : (
                        Object.entries(currentRestrictions).map(([name, data]) => (
                            <div key={name} className={`px-4 py-2 rounded-xl border text-sm flex items-center gap-2 ${data.severity === 'STRICT' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                <div className={`w-2 h-2 rounded-full ${data.severity === 'STRICT' ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                                <span className="font-bold">{name}</span>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-8 bg-violet-50 p-4 rounded-xl">
                    <h4 className="text-violet-900 font-bold text-sm mb-1">Soundness Check</h4>
                    <p className="text-violet-700 text-xs leading-relaxed">
                        We prioritize <strong>Strict</strong> medical needs over lifestyle preferences. Always check packaging directly if you carry an EpiPen.
                    </p>
                </div>
            </div>
         )}
      </div>

      {/* --- CUSTOM MODALS --- */}
      {activeModal && (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setActiveModal(null)}></div>
            
            {/* Modal Content */}
            <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[70] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
                
                {/* HEIGHT MODAL */}
                {activeModal === 'height' && (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold font-host tracking-tight">Select Height</h3>
                            <button onClick={() => setActiveModal(null)} className="bg-slate-100 px-4 py-2 rounded-xl text-sm font-bold text-slate-700">Done</button>
                        </div>
                        <div className="flex h-48 gap-4">
                            {/* Feet Column */}
                            <div className="flex-1 overflow-y-scroll snap-y snap-mandatory bg-slate-50 rounded-2xl no-scrollbar">
                                <div className="py-20 text-center space-y-2">
                                    {FEET_OPTIONS.map(ft => (
                                        <div 
                                            key={ft} 
                                            onClick={() => setFormData({...formData, heightFt: ft})}
                                            className={`snap-center py-2 text-xl font-bold transition-all ${formData.heightFt == ft ? 'text-violet-600 scale-110' : 'text-slate-300'}`}
                                        >
                                            {ft} ft
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Inches Column */}
                            <div className="flex-1 overflow-y-scroll snap-y snap-mandatory bg-slate-50 rounded-2xl no-scrollbar">
                                <div className="py-20 text-center space-y-2">
                                    {INCH_OPTIONS.map(inc => (
                                        <div 
                                            key={inc} 
                                            onClick={() => setFormData({...formData, heightIn: inc})}
                                            className={`snap-center py-2 text-xl font-bold transition-all ${formData.heightIn == inc ? 'text-violet-600 scale-110' : 'text-slate-300'}`}
                                        >
                                            {inc} in
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* WEIGHT MODAL */}
                {activeModal === 'weight' && (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold font-host tracking-tight">Select Weight</h3>
                            <button onClick={() => setActiveModal(null)} className="bg-slate-100 px-4 py-2 rounded-xl text-sm font-bold text-slate-700">Done</button>
                        </div>
                        <div className="h-48 overflow-y-scroll snap-y snap-mandatory bg-slate-50 rounded-2xl" ref={weightScrollRef}>
                            <div className="py-20 text-center space-y-2">
                                {WEIGHT_OPTIONS.map(w => (
                                    <div 
                                        key={w} 
                                        id={`weight-${w}`}
                                        onClick={() => setFormData({...formData, weight: w})}
                                        className={`snap-center py-2 text-xl font-bold transition-all ${formData.weight == w ? 'text-violet-600 scale-125' : 'text-slate-300'}`}
                                    >
                                        {w} lbs
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* EXIT MODAL */}
                {activeModal === 'exit' && (
                    <div className="flex flex-col items-center text-center pb-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
                             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v2"/><path d="m13.5 5.5-7 12a2 2 0 0 0 2 2h10a2 2 0 0 0 1.5-3.5l-5-9a2 2 0 0 0-3.5 0Z"/></svg>
                        </div>
                        <h3 className="text-xl font-bold font-host tracking-tight mb-2">Exit Setup?</h3>
                        <p className="text-slate-500 font-medium mb-8">Your progress will be lost if you leave now.</p>
                        
                        <div className="flex gap-3 w-full">
                            <button 
                                onClick={() => setActiveModal(null)}
                                className="flex-1 h-14 bg-slate-100 text-slate-900 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleExit}
                                className="flex-1 h-14 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-200 hover:bg-red-600 transition-colors"
                            >
                                Exit
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
      )}

      {/* --- BOTTOM NAV --- */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-50 flex flex-col gap-3 z-50">
         <button 
            disabled={loading || (step === 1 && !isStep1Valid)}
            onClick={() => step < 5 ? setStep(step + 1) : handleFinish()}
            className="w-full h-14 bg-slate-900 text-white rounded-2xl font-medium text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:active:scale-100"
         >
            {getNextLabel()}
         </button>

         <button 
            onClick={handleBack}
            className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-slate-500 font-bold text-sm bg-slate-50 hover:bg-slate-100 hover:text-slate-800 transition-colors active:scale-95"
         >
            {step === 1 ? (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    <span>{getBackLabel()}</span>
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                    <span>{getBackLabel()}</span>
                </>
            )}
         </button>
      </div>
    </div>
  );
};

export default Onboarding;