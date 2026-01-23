import React, { useState, useEffect } from 'react';
import { getAuth, signOut } from "firebase/auth";
import { doc, updateDoc, setDoc, arrayUnion, arrayRemove, onSnapshot } from "firebase/firestore";
import { db } from '../firebase';

const DIETARY_OPTIONS = [
  'Gluten', 'Dairy', 'Peanuts', 'Tree Nuts', 'Soy', 
  'Shellfish', 'Eggs', 'Fish', 'Corn', 'Sesame',
  'Beef', 'Pork', 'Poultry', 'Vegan', 'Vegetarian'
];

const Settings = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // --- EDIT STATE ---
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const auth = getAuth();
  const user = auth.currentUser;

  // 1. Fetch & Listen
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        setEditName(data.username || user.displayName || ''); // Initialize edit name
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // 2. Toggle Restrictions
  const toggleRestriction = async (restriction) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const isActive = profile?.restrictions?.includes(restriction);

    try {
      // ✅ FIX: Use setDoc with merge to ensure document exists
      // This prevents the "crash -> redirect to signup" loop on mobile
      if (isActive) {
        await updateDoc(userRef, { restrictions: arrayRemove(restriction) });
      } else {
        await setDoc(userRef, { restrictions: arrayUnion(restriction) }, { merge: true });
      }
    } catch (err) {
      console.error("Error updating settings:", err);
    }
  };

  // 3. Save Profile Logic (CRASH FIX)
  const handleSaveProfile = async () => {
    if (!user || !editName.trim()) return;
    const userRef = doc(db, "users", user.uid);
    try {
        // ✅ FIX: Use setDoc with { merge: true } instead of updateDoc
        // This creates the missing database file if it doesn't exist yet.
        await setDoc(userRef, { username: editName }, { merge: true });
        setIsEditing(false);
    } catch (err) {
        console.error("Error saving profile:", err);
        alert("Could not save profile. Please try again.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) return <div className="p-8 text-center text-gray-400 font-bold">Loading Settings...</div>;

  return (
    <div className="w-full max-w-4xl mx-auto pb-24 relative">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-50 rounded-full blur-[100px] -z-10 opacity-60"></div>
      <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-fuchsia-50 rounded-full blur-[100px] -z-10 opacity-60"></div>

      {/* --- HEADER --- */}
      <div className="pt-6 pb-8 space-y-2">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none">
            Settings.
        </h1>
        <p className="text-lg text-gray-500 font-medium">
            Manage your profile and safety preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* 1. PROFILE CARD (With Edit Mode) */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_2px_15px_rgb(0,0,0,0.03)] border border-gray-100 relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-8 transition-all">
            
            {/* Avatar */}
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 p-[3px] shadow-lg shrink-0">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                     {user?.photoURL ? (
                         <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                     ) : (
                         <span className="text-3xl font-black text-violet-600">
                             {(profile?.username || user?.email || "U").charAt(0).toUpperCase()}
                         </span>
                     )}
                </div>
            </div>
            
            <div className="flex-1 text-center md:text-left w-full">
                {isEditing ? (
                    // --- EDIT MODE ---
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Display Name</label>
                            <input 
                                type="text" 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
                                className="w-full md:w-2/3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                        <div className="flex gap-2 justify-center md:justify-start">
                            <button 
                                onClick={handleSaveProfile}
                                className="px-6 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold shadow-md hover:bg-black transition-all"
                            >
                                Save Changes
                            </button>
                            <button 
                                onClick={() => { setIsEditing(false); setEditName(profile?.username || ''); }}
                                className="px-6 py-2 rounded-xl bg-white border border-gray-200 text-gray-500 text-sm font-bold hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    // --- VIEW MODE ---
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
                            {profile?.username || "SafeSpoon User"}
                        </h2>
                        <p className="text-gray-400 font-medium mb-4">{user?.email}</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-2">
                            <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider">
                                Free Plan
                            </span>
                            <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                                Verified
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Button (Only visible in View Mode) */}
            {!isEditing && (
                <button 
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2.5 rounded-full border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
                >
                    Edit Profile
                </button>
            )}
        </div>

        {/* 2. RESTRICTIONS */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_2px_15px_rgb(0,0,0,0.03)] border border-gray-100">
             <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">Dietary Restrictions</h3>
                <p className="text-gray-400 text-sm mt-1">Select the ingredients you need to avoid.</p>
             </div>

             <div className="flex flex-wrap gap-3">
                 {DIETARY_OPTIONS.map((item) => {
                     const isActive = profile?.restrictions?.includes(item);
                     return (
                         <button
                            key={item}
                            onClick={() => toggleRestriction(item)}
                            className={`
                                px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 border flex items-center gap-2
                                ${isActive 
                                    ? 'bg-gray-900 text-white border-gray-900 shadow-md transform scale-105' 
                                    : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:text-gray-900'
                                }
                            `}
                         >
                            {isActive && <span className="text-emerald-400">✓</span>}
                            {item}
                         </button>
                     );
                 })}
             </div>
        </div>

        {/* 3. APP PREFERENCES */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_2px_15px_rgb(0,0,0,0.03)] border border-gray-100">
             <h3 className="text-xl font-bold text-gray-900 mb-6">Preferences</h3>
             
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-gray-900">Strict Safety Mode</p>
                        <p className="text-xs text-gray-400 mt-0.5">Hide restaurants with cross-contamination risks.</p>
                    </div>
                    <div className="w-12 h-7 bg-gray-200 rounded-full relative cursor-pointer hover:bg-gray-300 transition-colors">
                        <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-sm"></div>
                    </div>
                </div>
                <div className="w-full h-px bg-gray-50"></div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-gray-900">Notifications</p>
                        <p className="text-xs text-gray-400 mt-0.5">Alerts for new safe restaurants nearby.</p>
                    </div>
                    <div className="w-12 h-7 bg-violet-500 rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full shadow-sm"></div>
                    </div>
                </div>
             </div>
        </div>

        {/* 4. DANGER ZONE */}
        <div className="flex flex-col md:flex-row gap-4 pt-4">
            <button 
                onClick={handleLogout}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-4 rounded-2xl transition-all"
            >
                Log Out
            </button>
            <button className="flex-1 bg-white border border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200 font-bold py-4 rounded-2xl transition-all">
                Delete Account
            </button>
        </div>

        <div className="text-center pt-8 pb-4">
            <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">SafeSpoon v1.2.0</p>
        </div>

      </div>
    </div>
  );
};

export default Settings;