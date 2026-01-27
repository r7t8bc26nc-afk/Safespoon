import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from './firebase';

// Components
import { Header } from './components/Header';
import Dashboard from './components/Dashboard';
import { GuestDashboard } from './components/GuestDashboard'; // Ensure this path matches your file structure
import { RestaurantExplorer } from './components/RestaurantExplorer';
import { Recipes } from './components/Recipes';
import { Blog } from './components/Blog';
import Settings from './components/settings';
import Onboarding from './components/Onboarding';
import Login from './components/Login';
import { RestaurantMenu } from './components/RestaurantMenu';

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
  // Loading States
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [minLoadComplete, setMinLoadComplete] = useState(false); // NEW: Enforces animation duration

  const [isGuest, setIsGuest] = useState(false);
  const [view, setView] = useState('dashboard');
  const [isSearching, setIsSearching] = useState(false);
  const [dashboardLocation, setDashboardLocation] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  // 1. Enforce Splash Screen Minimum Duration (2.5s)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadComplete(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // 2. Firebase Auth Listener
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
        setIsGuest(false);
      } else {
        setProfileLoading(false);
        setUserProfile(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 3. User Profile Listener
  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
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

  const handleLoginAction = (data) => {
    if (data?.isGuest) setIsGuest(true);
  };

  const handleOpenMenu = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setView('restaurant-menu');
  };

  const getHeaderTitle = () => {
    if (view === 'dashboard') return 'Safespoon';
    if (view === 'find') return 'Explore';
    if (view === 'cook') return 'Recipes';
    if (view === 'feed') return 'Blog';
    if (view === 'settings') return 'Settings';
    if (view === 'restaurant-menu') return selectedRestaurant?.name || 'Menu';
    return 'Safespoon';
  };

  // --- SPLASH SCREEN RENDER ---
  // Only remove splash screen when Auth is done AND the animation timer (2.5s) is finished
  if (!minLoadComplete || authLoading || (user && profileLoading)) {
    const letters = "Safespoon".split("");
    return (
      <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center overflow-hidden font-['Host_Grotesk']">
        <div className="flex">
          {letters.map((letter, index) => (
            <span 
              key={index}
              className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 bg-[length:200%_auto] animate-gradient-flow letter-reveal"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {letter}
            </span>
          ))}
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          .letter-reveal {
            opacity: 0;
            display: inline-block;
            animation: reveal-snap 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards, gradient-flow 3s linear infinite;
          }
          @keyframes reveal-snap { 
            0% { opacity: 0; transform: translateY(40px) scale(0.8); filter: blur(12px); }
            100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); }
          }
          @keyframes gradient-flow { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
        `}} />
      </div>
    );
  }

  // --- MAIN APP ROUTING ---
  if (!user) {
    if (isGuest) {
      return <GuestDashboard onLogin={() => setIsGuest(false)} />;
    }
    return <Login onLogin={handleLoginAction} />;
  }

  if (!userProfile || !userProfile.onboardingComplete) {
      return <Onboarding onComplete={() => setView('dashboard')} />;
  }

  // Authenticated View
  return (
    <div className={`min-h-screen bg-white ${isSearching ? 'overflow-hidden' : ''}`}>
       <div className={isSearching || view === 'restaurant-menu' ? "hidden" : ""}>
            <div className="hidden md:block">
                <Header 
                    userPhoto={user.photoURL} 
                    setView={setView} 
                    title={getHeaderTitle()} 
                    isDashboard={view === 'dashboard'}
                    locationElement={view === 'dashboard' ? dashboardLocation : null}
                />
            </div>
            <div className="md:hidden pt-6 px-6 pb-2 flex justify-between items-center bg-white sticky top-0 z-40">
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-black tracking-tighter ${view === 'dashboard' ? 'text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 font-["Host_Grotesk"]' : 'text-gray-900 font-["Host_Grotesk"]'}`}>
                      {getHeaderTitle()}
                  </span>
                </div>
                <div className="flex items-center">
                  {view === 'dashboard' ? (
                    dashboardLocation
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden cursor-pointer shadow-sm border border-white" onClick={() => setView('settings')}>
                        {user.photoURL ? <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-400 font-['Host_Grotesk']">?</div>}
                    </div>
                  )}
                </div>
            </div>
       </div>

       <main className={isSearching ? "w-full h-full p-0 m-0 fixed inset-0 z-[9998]" : (view === 'dashboard' || view === 'restaurant-menu' ? "w-full pt-0" : "px-4 md:px-8 max-w-7xl mx-auto pt-2")}>
          {view === 'dashboard' && (
              <Dashboard 
                setView={setView} 
                profile={userProfile} 
                onOpenMenu={handleOpenMenu} 
                setIsSearching={setIsSearching} 
                isSearching={isSearching}
                setDashboardLocation={setDashboardLocation}
              />
          )}
          {view === 'restaurant-menu' && (
            <RestaurantMenu 
              restaurant={selectedRestaurant} 
              onBack={() => setView('dashboard')} 
              userProfile={userProfile} 
            />
          )}
          {view === 'find' && <RestaurantExplorer userProfile={userProfile} onOpenMenu={handleOpenMenu} />}
          {view === 'cook' && <Recipes userProfile={userProfile} />}
          {view === 'feed' && <Blog />}
          {view === 'settings' && <Settings />}
       </main>

       {!isSearching && view !== 'restaurant-menu' && (
           <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 px-6 py-4 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.02)] safe-area-pb">
              {[
                { id: 'dashboard', label: 'Home', icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
                { id: 'find', label: 'Explore', icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
                { id: 'cook', label: 'Recipes', icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
                { id: 'feed', label: 'Blog', icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" },
                { id: 'settings', label: 'Account', icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
              ].map((item) => (
                <button key={item.id} onClick={() => setView(item.id)} className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative ${view === item.id ? 'text-violet-600' : 'text-slate-400'}`}>
                  {view === item.id && <span className="absolute -top-4 w-8 h-1 bg-violet-600 rounded-b-full"></span>}
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                  <span className="text-[10px] font-bold tracking-wide font-['Host_Grotesk']">{item.label}</span>
                </button>
              ))}
           </div>
       )}
    </div>
  );
}

export default App;