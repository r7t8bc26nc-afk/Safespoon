import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { db } from './firebase';
import { doc, onSnapshot } from "firebase/firestore";

// --- COMPONENT IMPORTS ---
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { NutrientPanel } from './components/NutrientPanel';
import { RestaurantExplorer } from './components/RestaurantExplorer';
import { RestaurantMenu } from './components/RestaurantMenu';
import { Recipes } from './components/Recipes';
import { Favorites } from './components/Favorites';
import { Blog } from './components/Blog';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import Login from './components/Login';
import Onboarding from './components/Onboarding';

// --- MOBILE BOTTOM NAV COMPONENT ---
const MobileBottomNav = ({ activeView, setView }) => {
  const NavItem = ({ id, label, icon }) => {
    const isActive = activeView === id;
    return (
      <button 
        onClick={() => setView(id)}
        className={`flex flex-col items-center justify-center w-full py-2 ${isActive ? 'text-violet-700' : 'text-gray-400'}`}
      >
        <div className={`transition-transform duration-200 ${isActive ? '-translate-y-1' : ''}`}>
            {icon}
        </div>
        <span className="text-[10px] font-bold mt-1">{label}</span>
      </button>
    );
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe pt-2 px-2 flex justify-around z-50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
        <NavItem id="dashboard" label="Home" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>} />
        <NavItem id="explorer" label="Find" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>} />
        <NavItem id="recipes" label="Cook" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>} />
        <NavItem id="blog" label="Feed" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>} />
        <NavItem id="settings" label="Settings" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>} />
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Navigation & View State
  const [view, setView] = useState('dashboard');
  const [previousView, setPreviousView] = useState('dashboard');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // 1. AUTH LISTENER
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. FIRESTORE REAL-TIME LISTENER
  useEffect(() => {
    if (user) {
      const docRef = doc(db, "users", user.uid);
      const unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        }
        setLoading(false);
      });
      return () => unsubscribeProfile();
    }
  }, [user]);

  // --- ACTIONS ---
  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth);
  };

  const openMenu = (restaurant) => {
    setPreviousView(view); 
    setSelectedRestaurant(restaurant);
    setView('menu');
  };

  const handleBack = () => {
    setView(previousView); 
  };

  // --- ACTIVE TAB LOGIC ---
  const currentActiveTab = view === 'menu' ? 'explorer' : view;

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-900 font-bold">Loading SafeSpoon...</div>;
  }

  if (!user) {
    return <Login />;
  }

  if (userProfile && !userProfile.onboardingComplete) {
    return <Onboarding onComplete={() => {}} />;
  }

  // --- MAIN LAYOUT ---
  return (
    <div className="flex h-screen bg-white font-sans text-gray-900">
      
      {/* DESKTOP SIDEBAR */}
      <div className="hidden md:flex">
        <Sidebar setView={setView} activeView={currentActiveTab} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Pass setView to Header so the profile button works */}
        <Header 
            userPhoto={user.photoURL} 
            onLogout={handleLogout} 
            setView={setView} 
        />

        {/* MAIN SCROLLABLE CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 scroll-smooth bg-white">
          
          {view === 'dashboard' && (
            <Dashboard 
                setView={setView} 
                userEmail={user.email} 
                profile={userProfile} 
                onOpenMenu={openMenu} 
            />
          )}
          
          {view === 'explorer' && (
            <RestaurantExplorer 
                onOpenMenu={openMenu} 
                userProfile={userProfile} 
            />
          )}
          
          {view === 'recipes' && (
            <Recipes 
                userProfile={userProfile} 
            />
          )}

          {view === 'blog' && (
            <Blog />
          )}

          {view === 'menu' && selectedRestaurant && (
            <RestaurantMenu 
                restaurant={selectedRestaurant} 
                userProfile={userProfile} 
                onBack={handleBack} 
            />
          )}
          
          {view === 'saved' && (
             <Favorites 
                userProfile={userProfile} 
             />
          )}

          {view === 'settings' && <Settings />}
          
        </main>
      </div>

      <MobileBottomNav activeView={currentActiveTab} setView={setView} />
      {isPanelOpen && <NutrientPanel closePanel={() => setIsPanelOpen(false)} />}
    </div>
  );
}