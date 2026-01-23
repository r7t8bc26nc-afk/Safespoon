import React, { useState } from 'react';
import { getAuth, signOut } from "firebase/auth";
import { db } from '../firebase';
import { doc, setDoc } from "firebase/firestore";

// --- DATA ---
const CONDITIONS = [
    { id: 't1', label: "Diabetes T1", size: 'xl' },
    { id: 't2', label: "Diabetes T2", size: 'lg' },
    { id: 'hyp', label: "Hypertension", size: 'xl' },
    { id: 'chol', label: "Cholesterol", size: 'md' },
    { id: 'heart', label: "Heart Disease", size: 'lg' },
    { id: 'asthma', label: "Asthma", size: 'sm' },
    { id: 'arth', label: "Arthritis", size: 'sm' },
    { id: 'celiac', label: "Celiac", size: 'xl' },
    { id: 'ibs', label: "IBS", size: 'md' },
    { id: 'pcos', label: "PCOS", size: 'md' },
    { id: 'gast', label: "Gastritis", size: 'sm' },
    { id: 'acid', label: "Acid Reflux", size: 'md' },
    { id: 'thyroid', label: "Thyroid", size: 'sm' },
    { id: 'anemia', label: "Anemia", size: 'sm' }
];

const RESTRICTIONS = [
    { id: 'gf', label: "Gluten", size: 'xl' },
    { id: 'df', label: "Dairy", size: 'xl' },
    { id: 'nut', label: "Peanuts", size: 'lg' },
    { id: 'tree', label: "Tree Nuts", size: 'lg' },
    { id: 'soy', label: "Soy", size: 'sm' },
    { id: 'egg', label: "Eggs", size: 'md' },
    { id: 'shell', label: "Shellfish", size: 'xl' },
    { id: 'fish', label: "Fish", size: 'md' },
    { id: 'sesame', label: "Sesame", size: 'sm' },
    { id: 'corn', label: "Corn", size: 'sm' },
    { id: 'beef', label: "Beef", size: 'md' },
    { id: 'pork', label: "Pork", size: 'md' },
    { id: 'vegan', label: "Vegan", size: 'xl' },
    { id: 'keto', label: "Keto", size: 'md' },
    { id: 'halal', label: "Halal", size: 'md' }
];

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', mobile: '', dob: '', gender: '' });
  const [conditions, setConditions] = useState(new Set());
  const [restrictions, setRestrictions] = useState(new Set());

  const auth = getAuth();

  const updateForm = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  
  const toggleSet = (set, item, updateFn) => {
    const newSet = new Set(set);
    if (newSet.has(item)) newSet.delete(item);
    else newSet.add(item);
    updateFn(newSet);
  };

  const handleSkip = async () => {
      try {
          await signOut(auth);
      } catch (error) {
          console.error("Error skipping onboarding:", error);
          window.location.reload();
      }
  };

  const handleFinish = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
      await setDoc(doc(db, "users", user.uid), {
        ...formData,
        username: `${formData.firstName} ${formData.lastName}`,
        conditions: Array.from(conditions),
        restrictions: Array.from(restrictions),
        onboardingComplete: true,
        favorites: [],
        createdAt: new Date().toISOString()
      }, { merge: true });
      
      onComplete();
    } catch (err) {
      console.error("Onboarding finish error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getBubbleStyle = (size, isActive) => {
    let base = "rounded-full flex items-center justify-center text-center p-2 font-black leading-tight transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) cursor-pointer shadow-sm animate-float ";
    let sizeClasses = "";
    switch(size) {
        case 'xl': sizeClasses = isActive ? "w-48 h-48 text-2xl" : "w-40 h-40 text-xl"; break;
        case 'lg': sizeClasses = isActive ? "w-40 h-40 text-xl" : "w-32 h-32 text-lg"; break;
        case 'md': sizeClasses = isActive ? "w-32 h-32 text-lg" : "w-28 h-28 text-sm"; break;
        case 'sm': sizeClasses = isActive ? "w-28 h-28 text-sm" : "w-24 h-24 text-xs"; break;
        default: sizeClasses = "w-28 h-28 text-sm";
    }

    let colorClasses = isActive 
        ? "bg-violet-600 text-white shadow-2xl z-50 scale-110" 
        : "bg-slate-100 text-slate-400 hover:bg-white hover:text-slate-900";

    return base + sizeClasses + " " + colorClasses;
  };

  return (
    <div className="min-h-screen bg-white relative flex flex-col font-sans text-slate-900 overflow-hidden">
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .hide-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* --- HEADER (Matched to Login.jsx) --- */}
      <div className="pt-8 pb-4 px-8 bg-white z-30 sticky top-0 flex justify-between items-center">
         <span className="text-3xl font-semibold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 font-['Host_Grotesk']">
            Safespoon
         </span>
         <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Step {step} / 3
         </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-48 no-scrollbar relative">
         {/* STEP 1: IDENTITY */}
         {step === 1 && (
            <div className="px-6 pt-12 animate-fade-in max-w-lg mx-auto">
                <div className="mb-14 text-center">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-4">
                        Let's get <br/> <span className="text-violet-600">started.</span>
                    </h1>
                    <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                        Your profile helps us personalize your safety experience.
                    </p>
                </div>

                <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-3 text-left">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                <svg className="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                First Name
                            </label>
                            <input type="text" value={formData.firstName} onChange={(e) => updateForm('firstName', e.target.value)} className="w-full h-14 bg-slate-50 border-2 border-transparent focus:border-violet-100 focus:bg-white rounded-2xl px-5 font-bold text-xl text-slate-900 outline-none transition-all placeholder-slate-300" placeholder="Jane" />
                        </div>
                        <div className="space-y-3 text-left">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                <svg className="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                Last Name
                            </label>
                            <input type="text" value={formData.lastName} onChange={(e) => updateForm('lastName', e.target.value)} className="w-full h-14 bg-slate-50 border-2 border-transparent focus:border-violet-100 focus:bg-white rounded-2xl px-5 font-bold text-xl text-slate-900 outline-none transition-all placeholder-slate-300" placeholder="Doe" />
                        </div>
                    </div>

                    <div className="space-y-3 text-left">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                            <svg className="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            Mobile Number
                        </label>
                        <input type="tel" value={formData.mobile} onChange={(e) => updateForm('mobile', e.target.value)} className="w-full h-14 bg-slate-50 border-2 border-transparent focus:border-violet-100 focus:bg-white rounded-2xl px-5 font-bold text-xl text-slate-900 outline-none transition-all placeholder-slate-300" placeholder="(555) 123-4567" />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-3 text-left">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                <svg className="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Birthday
                            </label>
                            <input type="date" value={formData.dob} onChange={(e) => updateForm('dob', e.target.value)} className="w-full h-14 bg-slate-50 border-2 border-transparent focus:border-violet-100 focus:bg-white rounded-2xl px-5 font-bold text-xl text-slate-900 outline-none transition-all text-slate-500" />
                        </div>
                        <div className="space-y-3 text-left">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                <svg className="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                Gender
                            </label>
                            <select value={formData.gender} onChange={(e) => updateForm('gender', e.target.value)} className="w-full h-14 bg-slate-50 border-2 border-transparent focus:border-violet-100 focus:bg-white rounded-2xl px-5 font-bold text-xl text-slate-900 outline-none transition-all appearance-none">
                                <option value="" disabled>Select</option>
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                                <option value="Non-binary">Non-binary</option>
                                <option value="Prefer not to say">Prefer not to say</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
         )}

         {/* STEP 2 & 3: BUBBLES */}
         {(step === 2 || step === 3) && (
            <div className="animate-fade-in min-h-full flex flex-col">
                <div className="px-8 pt-8 pb-8 text-center max-w-lg mx-auto">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none mb-3">
                        {step === 2 ? "Medical History." : "Food Shield."}
                    </h1>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed">
                        {step === 2 ? "Tap any conditions you have." : "Tap ingredients to avoid."}
                    </p>
                </div>

                <div className="w-[110%] -ml-[5%] flex flex-wrap justify-center content-center gap-2 md:gap-4 pb-32 px-2 overflow-visible">
                    {(step === 2 ? CONDITIONS : RESTRICTIONS).map((item, i) => {
                        const activeSet = step === 2 ? conditions : restrictions;
                        const isActive = activeSet.has(item.label);
                        return (
                            <button
                                key={item.id}
                                onClick={() => toggleSet(activeSet, item.label, step === 2 ? setConditions : setRestrictions)}
                                style={{ animationDelay: `${(i % 5) * 0.5}s` }}
                                className={getBubbleStyle(item.size, isActive)}
                            >
                                {item.label}
                            </button>
                        )
                    })}
                </div>
            </div>
         )}
      </div>

      {/* --- STICKY BOTTOM CTA --- */}
      <div className="fixed bottom-0 left-0 right-0 p-6 pt-12 bg-gradient-to-t from-white via-white/95 to-transparent z-50 flex justify-center">
         <button 
            onClick={() => step < 3 ? setStep(step + 1) : handleFinish()} 
            disabled={loading} 
            className="w-full max-w-md h-16 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-200 hover:scale-[1.01] active:scale-[0.99] transition-all"
         >
            {loading ? "Saving..." : (step === 3 ? "Launch Dashboard" : "Next")}
         </button>
      </div>
    </div>
  );
};

export default Onboarding;