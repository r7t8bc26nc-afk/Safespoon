import React, { useState } from 'react';
import { getAuth } from "firebase/auth";
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// --- DATA SETS ---

// Severity Levels for Logic
const SEVERITY = {
  STRICT: 'STRICT', // Medical necessity (Celiac, Anaphylaxis)
  LIMIT: 'LIMIT',   // Management (Diabetes, CKD) or Lifestyle (Vegan)
};

const MEDICAL_CONDITIONS = [
    { 
        id: 'celiac', 
        label: "Celiac Disease", 
        impact: "Prevents intestinal damage.", 
        severity: SEVERITY.STRICT,
        autoShield: ["Gluten", "Wheat", "Barley", "Rye", "Malt"] 
    },
    { 
        id: 'ckd', 
        label: "Kidney Disease (CKD)", 
        impact: "Controls kidney load and waste buildup.", 
        severity: SEVERITY.LIMIT,
        autoShield: ["High Sodium", "High Potassium", "High Phosphorus"] 
    },
    { 
        id: 'diabetes', 
        label: "Diabetes", 
        impact: "Stabilizes blood sugar levels.", 
        severity: SEVERITY.LIMIT,
        autoShield: ["Refined Sugar", "High Carb"] 
    },
    { 
        id: 'ibd', 
        label: "IBD (Crohn's/Colitis)", 
        impact: "Minimizes gut inflammation.", 
        severity: SEVERITY.LIMIT,
        autoShield: ["Spicy Foods", "Caffeine"] 
    },
    { 
        id: 'gerd', 
        label: "Severe GERD", 
        impact: "Protects esophagus from acid damage.", 
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

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  // Reverted to First/Last Name
  const [formData, setFormData] = useState({ firstName: '', lastName: '' });
  
  // Selections
  const [conditions, setConditions] = useState([]);
  const [allergens, setAllergens] = useState(new Set());
  const [lifestyles, setLifestyles] = useState([]);
  
  // Logic to build the sound restriction map
  const computeRestrictions = () => {
    const map = {};

    // 1. Process Medical Conditions
    conditions.forEach(cond => {
        cond.autoShield.forEach(ing => {
            if (!map[ing]) map[ing] = { severity: cond.severity, sources: [] };
            map[ing].sources.push(cond.label);
            if (cond.severity === SEVERITY.STRICT) map[ing].severity = SEVERITY.STRICT;
        });
    });

    // 2. Process Specific Allergens (Always Strict)
    allergens.forEach(alg => {
        if (!map[alg]) map[alg] = { severity: SEVERITY.STRICT, sources: [] };
        map[alg].sources.push("Allergy");
        map[alg].severity = SEVERITY.STRICT;
    });

    // 3. Process Lifestyles
    lifestyles.forEach(diet => {
        diet.autoShield.forEach(ing => {
            if (!map[ing]) map[ing] = { severity: SEVERITY.LIMIT, sources: [] };
            map[ing].sources.push(diet.label);
        });
    });

    return map;
  };

  const currentRestrictions = computeRestrictions();

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

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 pb-32">
      
      {/* --- HEADER --- */}
      <div className="pt-8 px-8 bg-white sticky top-0 flex justify-between items-center z-50 h-20">
         {/* Back Button (Only shows if step > 1) */}
         {step > 1 ? (
             <button 
                onClick={() => setStep(step - 1)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-900 hover:bg-slate-100 transition-colors"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
                </svg>
             </button>
         ) : (
             <div className="w-10" /> // Spacer
         )}
         
         <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Step {step} / 5</div>
      </div>

      <div className="px-6 pt-6 max-w-lg mx-auto">
         
         {/* STEP 1: IDENTITY (Reverted to First/Last Name) */}
         {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <h1 className="text-3xl font-black mb-2">Create Profile.</h1>
                <p className="text-slate-500 mb-8 font-medium">We personalize guidance based on your biology.</p>
                <div className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="First Name" 
                        value={formData.firstName} 
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                        className="w-full h-14 bg-slate-50 rounded-2xl px-5 font-bold outline-none border-2 border-transparent focus:border-violet-100 placeholder-slate-300" 
                    />
                    <input 
                        type="text" 
                        placeholder="Last Name" 
                        value={formData.lastName} 
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                        className="w-full h-14 bg-slate-50 rounded-2xl px-5 font-bold outline-none border-2 border-transparent focus:border-violet-100 placeholder-slate-300" 
                    />
                </div>
            </div>
         )}

         {/* STEP 2: MEDICAL CONDITIONS */}
         {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4">
                <h1 className="text-3xl font-black mb-2">Medical Shield.</h1>
                <p className="text-slate-500 mb-6 font-medium">Select diagnosed conditions we need to manage.</p>
                <div className="space-y-3">
                    {MEDICAL_CONDITIONS.map(c => {
                        const active = conditions.find(cond => cond.id === c.id);
                        return (
                            <button key={c.id} onClick={() => handleConditionToggle(c)} className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${active ? 'border-violet-600 bg-violet-50' : 'border-slate-100 hover:border-violet-200'}`}>
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-slate-900">{c.label}</h3>
                                    {active && <span className="text-[10px] font-black bg-violet-200 text-violet-800 px-2 py-1 rounded-full">{c.severity}</span>}
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-1">{c.impact}</p>
                            </button>
                        );
                    })}
                </div>
            </div>
         )}

         {/* STEP 3: SPECIFIC ALLERGENS */}
         {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4">
                <h1 className="text-3xl font-black mb-2">Specific Allergens.</h1>
                <p className="text-slate-500 mb-6 font-medium">Select specific ingredients that trigger a reaction.</p>
                <div className="grid grid-cols-2 gap-3">
                    {COMMON_ALLERGENS.map(ing => {
                        const active = allergens.has(ing);
                        return (
                            <button key={ing} onClick={() => handleAllergenToggle(ing)} className={`w-full text-center p-4 rounded-2xl border-2 transition-all ${active ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-100 text-slate-600 hover:border-slate-200'}`}>
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
                <h1 className="text-3xl font-black mb-2">Lifestyle.</h1>
                <p className="text-slate-500 mb-6 font-medium">Do you follow specific cultural or personal diets?</p>
                <div className="grid grid-cols-1 gap-3">
                    {LIFESTYLE_DIETS.map(diet => {
                        const active = lifestyles.find(l => l.id === diet.id);
                        return (
                            <button key={diet.id} onClick={() => handleLifestyleToggle(diet)} className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-emerald-100'}`}>
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
                <h1 className="text-3xl font-black mb-2">Verification.</h1>
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

      {/* --- CTA --- */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-50">
         <button 
            disabled={loading || (step === 1 && (!formData.firstName || !formData.lastName))}
            onClick={() => step < 5 ? setStep(step + 1) : handleFinish()}
            className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
         >
            {loading ? "Syncing Shield..." : (step === 5 ? "Launch Dashboard" : "Next")}
         </button>
      </div>
    </div>
  );
};

export default Onboarding;