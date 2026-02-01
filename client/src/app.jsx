import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from './firebase';

// Components
import { Header } from './components/Header';
import Dashboard from './components/Dashboard';
import { GuestDashboard } from './components/GuestDashboard'; 
import { MealHub } from './components/MealHub'; 
import { RecipeDetail } from './components/RecipeDetail'; 
import { Blog } from './components/Blog';
import Settings from './components/settings';
import Onboarding from './components/Onboarding';
import Login from './components/Login';
import RestaurantMenu from './components/RestaurantMenu';

function AppContent() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [minLoadComplete, setMinLoadComplete] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [dashboardLocation, setDashboardLocation] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setMinLoadComplete(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        setIsGuest(false);
      } else {
        setProfileLoading(false);
        setUserProfile(null);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    return onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        setUserProfile(docSnap.exists() ? docSnap.data() : null);
        setProfileLoading(false);
    });
  }, [user]);

  const handleLoginAction = (data) => {
    if (data?.isGuest) setIsGuest(true);
  };

  const handleOpenMenu = (restaurant) => {
    setSelectedRestaurant(restaurant);
    navigate('/restaurant'); 
  };

  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Safespoon';
    if (path === '/explore') return 'Explore';
    if (path === '/meal-hub') return 'Meal Hub';
    if (path.startsWith('/recipe/')) return 'Recipe Details';
    if (path === '/blog') return 'Articles & Blog';
    if (path === '/account') return 'Settings';
    if (path === '/restaurant') return selectedRestaurant?.name || 'Product Details';
    return 'Safespoon';
  };

  // --- SPLASH SCREEN RENDER ---
  if (!minLoadComplete || authLoading || (user && profileLoading)) {
    const letters = "Safespoon".split("");
    return (
      <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center overflow-hidden font-['Host_Grotesk']">
        <div className="flex">
          {letters.map((letter, index) => (
            <span 
              key={index}
              className="text-5xl md:text-7xl font-black tracking-tighter text-black animate-gradient-flow letter-reveal"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {letter}
            </span>
          ))}
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          .letter-reveal { opacity: 0; display: inline-block; animation: reveal-snap 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
          @keyframes reveal-snap { 0% { opacity: 0; transform: translateY(40px) scale(0.8); filter: blur(12px); } 100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); } }
        `}} />
      </div>
    );
  }

  // --- MAIN APP ROUTING ---
  if (!user) {
    return isGuest ? <GuestDashboard onLogin={() => setIsGuest(false)} /> : <Login onLogin={handleLoginAction} />;
  }

  if (!userProfile || !userProfile.onboardingComplete) {
      return <Onboarding onComplete={() => navigate('/')} />;
  }

  // HIDE HEADER LOGIC: Hide on Dashboard, Menu, AND Meal Hub (to fix double heading)
  const shouldHideHeader = isSearching || location.pathname === '/restaurant' || location.pathname === '/' || location.pathname === '/meal-hub';

  return (
    <div className={`min-h-screen bg-white ${isSearching ? 'overflow-hidden' : ''}`}>
       
       {/* Sticky Header */}
       <div className={`${shouldHideHeader ? "hidden" : ""} sticky top-0 z-50 bg-white border-b border-slate-50 transition-all`}>
            <div className="hidden md:block">
                <Header 
                    userPhoto={user.photoURL} 
                    setView={(path) => navigate(path === 'dashboard' ? '/' : `/${path}`)} 
                    title={getHeaderTitle()} 
                    isDashboard={location.pathname === '/'}
                    locationElement={location.pathname === '/' ? dashboardLocation : null}
                />
            </div>
            
            {/* Mobile Header (Only visible if not hidden by logic above) */}
            <div className="md:hidden pt-safe-top px-6 pb-4 flex justify-between items-center bg-white min-h-[60px]">
                <div className="flex items-center gap-2">
                  {location.pathname.startsWith('/recipe/') && (
                      <button onClick={() => navigate('/meal-hub')} className="mr-2 text-black p-2 -ml-2">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                      </button>
                  )}
                  <span className="text-3xl font-bold tracking-tighter text-black font-['Switzer']">
                      {getHeaderTitle()}
                  </span>
                </div>
                <div className="h-9 w-9 rounded-full bg-slate-100 overflow-hidden cursor-pointer shadow-sm border border-white" onClick={() => navigate('/account')}>
                    {user.photoURL ? <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-400">?</div>}
                </div>
            </div>
       </div>

       {/* Main Content */}
       <main className={isSearching ? "w-full h-full p-0 m-0 fixed inset-0 z-[9998]" : (shouldHideHeader ? "w-full pt-0 pb-24" : "px-4 md:px-8 max-w-7xl mx-auto pt-4 pb-24")}>
          <Routes>
              <Route path="/" element={<Dashboard setView={(view) => navigate(view === 'dashboard' ? '/' : `/${view}`)} profile={userProfile} onOpenMenu={handleOpenMenu} setIsSearching={setIsSearching} isSearching={isSearching} setDashboardLocation={setDashboardLocation}/>} />
              <Route path="/meal-hub" element={<MealHub userProfile={userProfile} onOpenMenu={handleOpenMenu} />} />
              
              <Route path="/explore" element={<Navigate to="/meal-hub" replace />} />
              <Route path="/recipes" element={<Navigate to="/meal-hub" replace />} />
              
              <Route path="/recipe/:id" element={<RecipeDetail userProfile={userProfile} />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/account" element={<Settings />} />
              
              <Route path="/restaurant" element={<RestaurantMenu restaurant={selectedRestaurant} onBack={() => navigate('/meal-hub')} userProfile={userProfile} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
       </main>

       {/* Mobile Tab Bar - FIXED WIDTH & ELEVATION */}
       {!isSearching && !location.pathname.startsWith('/restaurant') && !location.pathname.startsWith('/recipe/') && (
           <div className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white border-t border-slate-100 pb-safe-bottom">
              <div className="flex justify-between items-end px-2 h-[60px] relative">
                  
                  {/* 1. Home */}
                  <button onClick={() => navigate('/')} className="flex flex-col items-center justify-center w-1/5 h-full pb-1">
                      <svg className={`w-6 h-6 mb-1 ${location.pathname === '/' ? 'text-black stroke-2' : 'text-slate-300 stroke-[1.5]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span className={`text-[10px] font-bold ${location.pathname === '/' ? 'text-black' : 'text-slate-300'}`}>Home</span>
                  </button>

                  {/* 2. Meal Hub */}
                  <button onClick={() => navigate('/meal-hub')} className="flex flex-col items-center justify-center w-1/5 h-full pb-1">
                      <svg className={`w-6 h-6 mb-1 ${location.pathname === '/meal-hub' ? 'text-black stroke-2' : 'text-slate-300 stroke-[1.5]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className={`text-[10px] font-bold ${location.pathname === '/meal-hub' ? 'text-black' : 'text-slate-300'}`}>Meals</span>
                  </button>

                  {/* 3. CENTER FAB - ELEVATED ABOVE BAR */}
                  <div className="w-1/5 relative h-full flex justify-center items-end pointer-events-none">
                      <button 
                          onClick={() => navigate('/meal-hub')} 
                          className="pointer-events-auto absolute -top-8 w-16 h-16 bg-black rounded-full shadow-xl flex items-center justify-center text-white transform active:scale-95 transition-transform z-50"
                      >
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                          </svg>
                      </button>
                  </div>

                  {/* 4. Blog */}
                  <button onClick={() => navigate('/blog')} className="flex flex-col items-center justify-center w-1/5 h-full pb-1">
                      <svg className={`w-6 h-6 mb-1 ${location.pathname === '/blog' ? 'text-black stroke-2' : 'text-slate-300 stroke-[1.5]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                      <span className={`text-[10px] font-bold ${location.pathname === '/blog' ? 'text-black' : 'text-slate-300'}`}>Blog</span>
                  </button>

                  {/* 5. Account */}
                  <button onClick={() => navigate('/account')} className="flex flex-col items-center justify-center w-1/5 h-full pb-1">
                      <svg className={`w-6 h-6 mb-1 ${location.pathname === '/account' ? 'text-black stroke-2' : 'text-slate-300 stroke-[1.5]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className={`text-[10px] font-bold ${location.pathname === '/account' ? 'text-black' : 'text-slate-300'}`}>Account</span>
                  </button>
              </div>
           </div>
       )}
    </div>
  );
}

function App() { return <Router><AppContent /></Router>; }
export default App;