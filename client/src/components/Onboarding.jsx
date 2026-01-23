import React, { useState } from 'react';
import { getAuth } from "firebase/auth";
import { db } from '../firebase';
import { doc, setDoc } from "firebase/firestore";

const CONDITIONS_LIST = [
    "Diabetes (T1)", "Diabetes (T2)", "Hypertension", "Cholesterol", "Heart Disease", 
    "Asthma", "Arthritis", "Kidney Issue", "Liver Issue", "PCOS", "Celiac", "IBS", "Obesity",
    "Migraines", "Gout", "Anemia", "Acid Reflux", "Lupus", "Thyroid"
];

const RESTRICTIONS_LIST = [
    "Gluten", "Dairy", "Soy", "Peanuts", "Tree Nuts", "Eggs", "Shellfish", "Fish",
    "Sodium", "Sugar", "Keto", "Vegan", "Vegetarian", "Paleo", "Halal", "Kosher",
    "Pork", "Beef", "Chicken", "Sesame", "Corn", "Mustard"
];

// Helper for varied bubble sizes
const getBubbleSize = (index) => {
    const sizes = [
      "w-24 h-24 text-xs md:w-28 md:h-28 md:text-sm", 
      "w-28 h-28 text-sm md:w-32 md:h-32 md:text-sm", 
      "w-32 h-32 text-sm md:w-40 md:h-40 md:text-base" 
    ];
    return sizes[index % sizes.length];
};

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const auth = getAuth();

  // Updated Data State (Removed Height/Weight, Added DOB/Mobile)
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', mobile: '',
    dob: '', gender: ''
  });
  
  const [conditions, setConditions] = useState(new Set());
  const [restrictions, setRestrictions] = useState(new Set());

  const updateForm = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  
  const toggleSet = (set, item, updateFn) => {
    const newSet = new Set(set);
    if (newSet.has(item)) newSet.delete(item);
    else newSet.add(item);
    updateFn(newSet);
  };

  const handleFinish = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
      await setDoc(doc(db, "users", user.uid), {
        ...formData,
        conditions: Array.from(conditions),
        restrictions: Array.from(restrictions),
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }, { merge: true });
      onComplete(); 
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-white overflow-hidden font-sans text-slate-800">
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .bubble-selected {
          transform: scale(1.1);
          box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.5);
          z-index: 20;
        }
        /* Hide Scrollbar */
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* LEFT SIDE: SIDEBAR */}
      <div className="hidden md:block w-1/3 bg-gray-900 relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80" className="absolute inset-0 w-full h-full object-cover opacity-90" alt="Sidebar" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h1 className="text-3xl font-bold leading-tight mb-4">Precision nutrition,<br />simplified.</h1>
          <div className="flex gap-2 mt-6">
             <div className="h-1 bg-white/30 w-full rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all duration-500" style={{ width: `${step * 33.33}%` }}></div>
             </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: INTERACTIVE AREA */}
      <div className="flex-1 flex flex-col h-full relative bg-slate-50">
        
        {/* Header */}
        <div className="h-16 flex justify-between items-center px-8 z-20 shrink-0">
           {step > 1 ? (
             <button onClick={() => setStep(step - 1)} className="text-slate-400 font-bold text-sm flex items-center gap-2 hover:text-violet-600 transition-colors">
               ← Back
             </button>
           ) : <div />}
           <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Step {step} / 3</span>
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 hide-scroll relative">
          <div className="max-w-4xl mx-auto py-4 text-center"> 
            
            {/* STEP 1: BASIC INFO (Cleaned Up) */}
            {step === 1 && (
              <div className="animate-fade-in max-w-xl mx-auto text-left">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Let's get to know you.</h2>
                <p className="text-slate-500 text-base mb-10">We need your baseline to calculate safety metrics.</p>

                {/* NO CONTAINER BOX - Clean Layout */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">First Name</label>
                        <input type="text" value={formData.firstName} onChange={(e) => updateForm('firstName', e.target.value)} className="w-full bg-transparent border-b-2 border-slate-200 py-3 font-semibold text-lg focus:border-violet-500 outline-none transition-all placeholder-slate-300" placeholder="Jane" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">Last Name</label>
                        <input type="text" value={formData.lastName} onChange={(e) => updateForm('lastName', e.target.value)} className="w-full bg-transparent border-b-2 border-slate-200 py-3 font-semibold text-lg focus:border-violet-500 outline-none transition-all placeholder-slate-300" placeholder="Doe" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">Date of Birth</label>
                        <input type="date" value={formData.dob} onChange={(e) => updateForm('dob', e.target.value)} className="w-full bg-transparent border-b-2 border-slate-200 py-3 font-semibold text-lg focus:border-violet-500 outline-none transition-all text-slate-600" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">Mobile Number</label>
                        <input type="tel" value={formData.mobile} onChange={(e) => updateForm('mobile', e.target.value)} className="w-full bg-transparent border-b-2 border-slate-200 py-3 font-semibold text-lg focus:border-violet-500 outline-none transition-all placeholder-slate-300" placeholder="(555) 000-0000" />
                      </div>
                  </div>

                  <div className="pt-4">
                     <label className="text-xs font-bold text-slate-400 uppercase block mb-3 ml-1">Gender Identity</label>
                     <div className="flex flex-wrap gap-2">
                        {['Female', 'Male', 'Non-binary', 'Prefer not to say'].map(g => (
                            <button 
                                key={g} 
                                onClick={() => updateForm('gender', g)}
                                className={`px-5 py-2.5 rounded-full border font-bold text-sm transition-all ${
                                    formData.gender === g 
                                    ? 'bg-slate-900 text-white border-slate-900' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                     </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: CONDITIONS (Organic Layout) */}
            {step === 2 && (
              <div>
                 <h2 className="text-3xl font-bold text-slate-900 mb-2">Medical History</h2>
                 <p className="text-slate-500 text-base mb-8">Tap the bubbles that apply to you.</p>
                 
                 {/* Flex container with negative margins to simulate organic packing */}
                 <div className="flex flex-wrap justify-center items-center content-center px-2 pb-24 gap-4 max-w-3xl mx-auto">
                    {CONDITIONS_LIST.map((item, index) => {
                        const isSelected = conditions.has(item);
                        const sizeClass = getBubbleSize(index);
                        const delay = { animationDelay: `${(index % 5) * 0.2}s` };
                        
                        // STAGGER LOGIC: Push every even item down, every 3rd item up
                        let staggerClass = "";
                        if (index % 2 === 0) staggerClass = "translate-y-4"; 
                        if (index % 3 === 0) staggerClass = "-translate-y-2";

                        return (
                          <button
                            key={item}
                            style={delay}
                            onClick={() => toggleSet(conditions, item, setConditions)}
                            className={`
                                ${sizeClass} ${staggerClass} rounded-full 
                                animate-float transition-all duration-300 ease-out
                                flex items-center justify-center text-center leading-tight p-3
                                font-semibold cursor-pointer
                                ${isSelected 
                                    ? 'bg-violet-500 text-white bubble-selected' 
                                    : 'bg-white text-slate-500 shadow-sm hover:text-violet-600 hover:shadow-md hover:scale-105'
                                }
                            `}
                          >
                            {item}
                          </button>
                        );
                    })}
                 </div>
              </div>
            )}

            {/* STEP 3: RESTRICTIONS (Organic Layout) */}
            {step === 3 && (
              <div>
                 <h2 className="text-3xl font-bold text-slate-900 mb-2">Food Shield</h2>
                 <p className="text-slate-500 text-base mb-8">Select ingredients to block completely.</p>
                 
                 <div className="flex flex-wrap justify-center items-center content-center px-2 pb-24 gap-4 max-w-3xl mx-auto">
                    {RESTRICTIONS_LIST.map((item, index) => {
                        const isSelected = restrictions.has(item);
                        const sizeClass = getBubbleSize(index + 2);
                        const delay = { animationDelay: `${(index % 4) * 0.3}s` };
                        
                        // Random-ish stagger for variety
                        let staggerClass = "";
                        if (index % 2 !== 0) staggerClass = "translate-y-6";
                        
                        return (
                          <button
                            key={item}
                            style={delay}
                            onClick={() => toggleSet(restrictions, item, setRestrictions)}
                            className={`
                                ${sizeClass} ${staggerClass} rounded-full 
                                animate-float transition-all duration-300 ease-out
                                flex items-center justify-center text-center leading-tight p-3
                                font-semibold cursor-pointer
                                ${isSelected 
                                    ? 'bg-violet-600 text-white bubble-selected' 
                                    : 'bg-white text-slate-500 shadow-sm hover:text-violet-600 hover:shadow-md hover:scale-105'
                                }
                            `}
                          >
                            {item}
                          </button>
                        );
                    })}
                 </div>
              </div>
            )}

          </div>
        </div>

        {/* FOOTER */}
        <div className="absolute bottom-0 left-0 right-0 py-6 flex justify-center z-50 pointer-events-none">
            <div className="pointer-events-auto">
              {step < 3 ? (
                  <button 
                    onClick={() => setStep(step + 1)}
                    className="bg-violet-500 text-white px-10 py-3 rounded-full font-bold text-sm hover:bg-violet-600 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-violet-500/20"
                  >
                    Continue
                  </button>
              ) : (
                  <button 
                    onClick={handleFinish}
                    disabled={loading}
                    className="bg-violet-600 text-white px-10 py-3 rounded-full font-bold text-sm hover:bg-violet-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-violet-600/30 disabled:opacity-70"
                  >
                    {loading ? "Building Profile..." : "Launch Dashboard 🚀"}
                  </button>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;