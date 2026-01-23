import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from './firebase';

// Components
import { Header } from './components/Header';
import Dashboard from './components/Dashboard';
import { RestaurantExplorer } from './components/RestaurantExplorer';
import { Recipes } from './components/Recipes';
import { Blog } from './components/Blog';
import Settings from './components/settings';
import Onboarding from './components/Onboarding';
import Login from './components/Login';

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [view, setView] = useState('dashboard');

  // 1. Listen for Authentication
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (!currentUser) {
        setProfileLoading(false);
        setUserProfile(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. Listen for User Profile
  useEffect(() => {
    if (!user) return;
    
    const unsubProfile = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
            setUserProfile(docSnap.data());
        } else {
            setUserProfile(null);
        }
        setProfileLoading(false);
    });

    return () => unsubProfile();
  }, [user]);

  // --- RENDERING LOGIC ---

  // A. Loading State
  if (authLoading || (user && profileLoading)) {
    return (
        <div className="h-screen w-full flex items-center justify-center bg-white">
            <div className="animate-pulse">
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">
                    Safespoon.
                </span>
            </div>
        </div>
    );
  }

  // B. Not Logged In -> Login Screen
  if (!user) {
      return <Login />; 
  }

  // C. Onboarding Check (FIXED LOGIC)
  // If Profile is NULL (New User) OR Profile exists but is incomplete -> Show Onboarding
  if (!userProfile || !userProfile.onboardingComplete) {
      return <Onboarding onComplete={() => setView('dashboard')} />;
  }

  // D. Main App
  return (
    <div className="min-h-screen bg-white pb-24 md:pb-0">
       
       {/* Desktop Header */}
       <div className="hidden md:block">
           <Header userPhoto={user.photoURL} setView={setView} />
       </div>

       {/* Mobile Header */}
       <div className="md:hidden pt-6 px-6 pb-2 flex justify-between items-center">
            <span className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">
                Safespoon.
            </span>
            <div className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden cursor-pointer" onClick={() => setView('settings')}>
                {user.photoURL ? <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-400">?</div>}
            </div>
       </div>

       {/* Main Content */}
       <main className="px-4 md:px-8 max-w-7xl mx-auto pt-2">
          {view === 'dashboard' && <Dashboard setView={setView} userEmail={user.email} profile={userProfile} onOpenMenu={(r) => console.log(r)} />}
          {view === 'find' && <RestaurantExplorer userProfile={userProfile} onOpenMenu={(r) => console.log(r)} />}
          {view === 'cook' && <Recipes userProfile={userProfile} />}
          {view === 'feed' && <Blog />}
          {view === 'settings' && <Settings />}
       </main>

       {/* --- MOBILE BOTTOM NAVIGATION --- */}
       <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 px-6 py-4 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.02)] safe-area-pb">
          {[
            { id: 'dashboard', label: 'Home', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
            { id: 'find', label: 'Explore', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> },
            { id: 'cook', label: 'Recipes', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> },
            { id: 'feed', label: 'Blog', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /> },
            { id: 'settings', label: 'My Account', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
          ].map((item) => {
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative ${isActive ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {isActive && <span className="absolute -top-4 w-8 h-1 bg-violet-600 rounded-b-full shadow-sm shadow-violet-200"></span>}
                <svg className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {item.icon}
                </svg>
                <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
              </button>
            );
          })}
       </div>
    </div>
  );
}

export default App;