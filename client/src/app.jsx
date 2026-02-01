import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from './firebase'; // Fixed import path
import { motion, AnimatePresence } from 'framer-motion';

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

// --- NEW COMPONENTS: SCAN MODAL & PAYWALL ---

const PremiumPaywall = ({ onClose }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="fixed inset-0 z-[10001] flex items-center justify-center px-6"
  >
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
    <div className="relative w-full max-w-sm bg-slate-900 rounded-[2.5rem] p-8 overflow-hidden shadow-2xl border border-slate-700">
        {/* Background Effects */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-500/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 to-transparent" />

        <div className="relative z-10 text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)] rotate-3">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
            </div>

            <h2 className="text-3xl font-black text-white mb-2 tracking-tight leading-tight">
                Unlock Visual <br/><span className="text-emerald-400">Intelligence</span>
            </h2>
            <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed px-2">
                Identify nutritional data instantly. Point your camera at any meal or barcode for real-time AI analysis.
            </p>

            <div className="space-y-3 mb-8 text-left px-4">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">✓</div>
                    <span className="text-slate-300 text-sm font-bold">Unlimited Barcode Scans</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">✓</div>
                    <span className="text-slate-300 text-sm font-bold">AI Meal Recognition</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">✓</div>
                    <span className="text-slate-300 text-sm font-bold">Macro & Micro Breakdown</span>
                </div>
            </div>

            <button className="w-full py-4 bg-white text-slate-900 text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all mb-4">
                Start Free 7-Day Trial
            </button>
            <button onClick={onClose} className="text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">
                Maybe Later
            </button>
        </div>
    </div>
  </motion.div>
);

const ScanModal = ({ isOpen, onClose, isPremium, onScanBarcode, onScanMeal }) => {
    if (!isOpen) return null;

    // If not premium, show paywall immediately inside the modal flow
    if (!isPremium) {
        return <PremiumPaywall onClose={onClose} />;
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-[10000] flex flex-col justify-end pointer-events-none"
        >
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={onClose} />
            
            {/* GAUGE CLUSTER UI */}
            <div className="bg-slate-900 w-full rounded-t-[2.5rem] p-8 pb-12 pointer-events-auto relative overflow-hidden border-t border-slate-800">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-slate-700 rounded-b-full opacity-50" />
                
                <h3 className="text-center text-white font-black text-lg uppercase tracking-widest mb-10">Select Input Source</h3>

                <div className="grid grid-cols-2 gap-6">
                    {/* OPTION 1: BARCODE */}
                    <button 
                        onClick={onScanBarcode}
                        className="group relative aspect-square bg-slate-800 rounded-3xl border border-slate-700 flex flex-col items-center justify-center active:scale-95 transition-all overflow-hidden"
                    >
                         <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                         <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 shadow-lg border border-slate-700 group-hover:border-emerald-500/50 transition-colors">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                         </div>
                         <span className="text-white font-bold text-sm tracking-wide">Barcode Scan</span>
                    </button>

                    {/* OPTION 2: MEAL AI */}
                    <button 
                        onClick={onScanMeal}
                        className="group relative aspect-square bg-slate-800 rounded-3xl border border-slate-700 flex flex-col items-center justify-center active:scale-95 transition-all overflow-hidden"
                    >
                         <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                         <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 shadow-lg border border-slate-700 group-hover:border-blue-500/50 transition-colors">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                         </div>
                         <span className="text-white font-bold text-sm tracking-wide">Meal AI</span>
                    </button>
                </div>
                
                <button onClick={onClose} className="w-full mt-8 py-4 text-slate-500 font-bold uppercase tracking-widest text-xs hover:text-white transition-colors">Cancel</button>
            </div>
        </motion.div>
    );
};

// --- APP CONTENT ---

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

  // New State for Scan Modal
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

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

  const handleScanAction = (type) => {
      console.log(`Scanning ${type}...`);
      setIsScanModalOpen(false);
      // Logic to trigger camera or route to scan page would go here
      // e.g. navigate('/scan', { state: { mode: type } });
      if (type === 'barcode') {
          setIsSearching(true); // Open existing barcode scanner in Dashboard
      }
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

  const shouldHideHeader = isSearching || location.pathname === '/restaurant' || location.pathname === '/' || location.pathname === '/meal-hub';

  return (
    <div className={`min-h-screen bg-white ${isSearching ? 'overflow-hidden' : ''}`}>
       
       <AnimatePresence>
            {isScanModalOpen && (
                <ScanModal 
                    isOpen={isScanModalOpen} 
                    onClose={() => setIsScanModalOpen(false)} 
                    isPremium={userProfile?.isPremium || false} 
                    onScanBarcode={() => handleScanAction('barcode')}
                    onScanMeal={() => handleScanAction('meal')}
                />
            )}
       </AnimatePresence>

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

       {/* Mobile Tab Bar */}
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

                  {/* 3. CENTER FAB - SCAN ICON */}
                  <div className="w-1/5 relative h-full flex justify-center items-end pointer-events-none">
                      <button 
                          onClick={() => setIsScanModalOpen(true)} 
                          className="pointer-events-auto absolute -top-8 w-16 h-16 bg-black rounded-full shadow-xl flex items-center justify-center text-white transform active:scale-95 transition-transform z-50 overflow-hidden"
                      >
                          {/* Camera / Scan Icon */}
                          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
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