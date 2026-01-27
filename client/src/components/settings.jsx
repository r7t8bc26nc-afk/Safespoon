import React, { useState, useEffect } from 'react';
import { getAuth, signOut, deleteUser } from "firebase/auth";
import { doc, setDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from '../firebase';

// --- MODELS ---
const MEDICAL_CONDITIONS = [
    { id: 'celiac', label: "Celiac Disease", impact: "Intestinal Healing" },
    { id: 'ckd', label: "Chronic Kidney Disease", impact: "Waste Management" },
    { id: 'diabetes', label: "Diabetes", impact: "Blood Sugar Stability" },
    { id: 'ibd', label: "IBD (Crohn's/Colitis)", impact: "Gut Inflammation" },
    { id: 'gerd', label: "Severe GERD", impact: "Esophagus Protection" }
];

const LIFESTYLE_DIETS = [
    { id: 'halal', label: "Halal" },
    { id: 'kosher', label: "Kosher" },
    { id: 'vegan', label: "Vegan" },
    { id: 'veg', label: "Vegetarian" }
];

const INGREDIENT_LIST = [
    "Gluten", "Dairy", "Peanuts", "Tree Nuts", "Soy", "Eggs", "Shellfish", 
    "Fish", "Sesame", "Pork", "Beef", "Alcohol", "Caffeine", "Refined Sugar"
];

const Settings = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        setEditName(data.username || `${data.firstName} ${data.lastName}` || '');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const updateProfileData = async (key, value) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    try {
        await setDoc(userRef, { [key]: value }, { merge: true });
    } catch (err) {
        console.error("Save error:", err);
    }
  };

  const toggleItem = (currentList = [], itemLabel, key) => {
    const newList = currentList.includes(itemLabel) 
      ? currentList.filter(i => i !== itemLabel) 
      : [...currentList, itemLabel];
    updateProfileData(key, newList);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
        await deleteDoc(doc(db, "users", user.uid));
        await deleteUser(user);
        signOut(auth);
    } catch (err) {
        console.error("Deletion failed:", err);
        alert("For security reasons, please log in again before deleting your account.");
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">Syncing Profile Data...</div>;

  return (
    <div className="w-full max-w-4xl mx-auto pb-32">
      
      {/* Spacer for the new Header integration */}
      <div className="h-6" />

      <div className="space-y-12">
        
        {/* 1. IDENTITY & ACCOUNT */}
        <section className="flex flex-col md:flex-row items-center gap-8 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
            <div className="h-20 w-20 rounded-full bg-white overflow-hidden shrink-0 border border-gray-200 shadow-sm">
                {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-violet-600 bg-violet-50">{editName.charAt(0)}</div>
                )}
            </div>
            
            <div className="flex-1 text-center md:text-left">
                {isEditing ? (
                    <div className="flex flex-col md:flex-row gap-3">
                        <input 
                            type="text" 
                            value={editName} 
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <div className="flex gap-2 justify-center">
                            <button onClick={() => { updateProfileData('username', editName); setIsEditing(false); }} className="px-6 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold">Save</button>
                            <button onClick={() => setIsEditing(false)} className="px-6 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-500">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 leading-tight">{profile?.username || "Authorized User"}</h2>
                        <p className="text-gray-400 font-medium text-sm">{user?.email}</p>
                        <button onClick={() => setIsEditing(true)} className="mt-3 text-xs font-bold text-violet-600 hover:text-violet-700 uppercase tracking-widest">Edit Account Identity</button>
                    </div>
                )}
            </div>
        </section>

        {/* 2. MEDICAL CONDITIONS (Improved UI for interactivity) */}
        <section>
            <div className="mb-6">
                <h3 className="text-lg font-black text-gray-900">Medical Conditions</h3>
                <p className="text-gray-400 text-xs font-medium">Selecting a condition applies automated high-priority ingredient filters.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {MEDICAL_CONDITIONS.map(condition => {
                    const active = profile?.conditions?.includes(condition.label);
                    return (
                        <button 
                            key={condition.id} 
                            onClick={() => toggleItem(profile?.conditions, condition.label, 'conditions')} 
                            className={`p-5 rounded-2xl border-2 text-left transition-all group ${
                                active 
                                ? 'border-violet-600 bg-violet-50 shadow-sm' 
                                : 'border-gray-100 bg-white hover:border-gray-300'
                            }`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className={`font-bold transition-colors ${active ? 'text-violet-900' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                    {condition.label}
                                </span>
                                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                    active ? 'bg-violet-600 border-violet-600' : 'border-gray-200'
                                }`}>
                                    {active && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                                </div>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{condition.impact}</p>
                        </button>
                    );
                })}
            </div>
        </section>

        {/* 3. LIFESTYLE & FAITH DIETS */}
        <section>
            <div className="mb-6">
                <h3 className="text-lg font-black text-gray-900">Lifestyle & Values</h3>
                <p className="text-gray-400 text-xs font-medium">Standardized dietary protocols for personal or religious compliance.</p>
            </div>
            <div className="flex flex-wrap gap-3">
                {LIFESTYLE_DIETS.map(diet => {
                    const active = profile?.lifestyles?.includes(diet.label);
                    return (
                        <button 
                            key={diet.id} 
                            onClick={() => toggleItem(profile?.lifestyles, diet.label, 'lifestyles')}
                            className={`px-8 py-4 rounded-2xl font-black text-sm transition-all border-2 ${
                                active 
                                ? 'bg-gray-900 text-white border-gray-900 shadow-lg' 
                                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                            }`}
                        >
                            {diet.label}
                        </button>
                    );
                })}
            </div>
        </section>

        {/* 4. ACTIVE INGREDIENT FILTERS */}
        <section>
            <div className="mb-6">
                <h3 className="text-lg font-black text-gray-900">Active Filters</h3>
                <p className="text-slate-500 text-xs font-medium">Ingredients removed from search results. Tap to toggle manually.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                {INGREDIENT_LIST.map(ing => {
                    const active = profile?.restrictions?.includes(ing);
                    return (
                        <button 
                            key={ing} 
                            onClick={() => toggleItem(profile?.restrictions, ing, 'restrictions')}
                            className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border-2 ${
                                active 
                                ? 'bg-rose-500 text-white border-rose-500 shadow-md' 
                                : 'bg-white text-gray-300 border-gray-100 hover:border-gray-400 hover:text-gray-500'
                            }`}
                        >
                            {ing}
                        </button>
                    );
                })}
            </div>
        </section>

        {/* 5. ACCOUNT ACTIONS */}
        <section className="flex flex-col md:flex-row gap-4 pt-10 border-t border-gray-100">
            <button onClick={() => signOut(auth)} className="flex-1 bg-white border border-gray-200 text-gray-900 font-bold py-4 rounded-2xl hover:bg-gray-50 transition-colors">Log Out</button>
            <button onClick={() => setShowDeleteModal(true)} className="flex-1 bg-white border border-rose-100 text-rose-500 font-bold py-4 rounded-2xl hover:bg-rose-50 transition-colors">Terminate Account</button>
        </section>

      </div>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-4">Are you sure?</h2>
                  <p className="text-gray-500 font-medium leading-relaxed mb-8">
                    Deleting your account is permanent. All of your personalized safety profiles, verified medical history, and saved locations will be erased from our systems immediately.
                  </p>
                  
                  <div className="space-y-3">
                      <button 
                        onClick={handleDeleteAccount}
                        className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100"
                      >
                        Confirm Deletion
                      </button>
                      <button 
                        onClick={() => setShowDeleteModal(false)}
                        className="w-full py-4 bg-gray-100 text-gray-900 rounded-2xl font-black hover:bg-gray-200 transition-colors"
                      >
                        Keep My Account
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Settings;