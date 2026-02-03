import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from './firebase'; 
import { motion, AnimatePresence } from 'framer-motion';
import { HelmetProvider } from 'react-helmet-async'; 

// --- ICON IMPORTS ---
import foodTrayIcon from './icons/food-tray.svg'; 
import scannerIcon from './icons/scanner.svg';
import cameraIcon from './icons/camera.svg'; 
import gridIcon from './icons/grid-square-circle.svg'; 
import blogIcon from './icons/users-group-alt.svg'; 
import userIcon from './icons/user.svg'; 

import gridFilledIcon from './icons/grid-square-circle-filled.svg';
import foodTrayFilledIcon from './icons/food-tray-filled.svg';
import blogFilledIcon from './icons/users-group-alt-filled.svg';
import userFilledIcon from './icons/user-filled.svg';

// Components
import { Header } from './components/Header';
import Dashboard from './components/Dashboard';
import { GuestDashboard } from './components/GuestDashboard'; 
import { MealHub } from './components/MealHub'; 
import RecipeDetail from './components/RecipeDetail'; 
import { Blog } from './components/Blog';
import Settings from './components/settings';
import Onboarding from './components/Onboarding';
import Login from './components/Login';
import RestaurantMenu from './components/RestaurantMenu';
import BarcodeScannerPage from './components/BarcodeScannerPage'; 
import NotificationManager from './components/NotificationManager';
// Integration of PlateScanner
import { PlateScanner } from './components/PlateScanner'; 
// NEW: Import Subscription Page
import { SubscriptionPage } from './components/SubscriptionPage';

// --- HELPER COMPONENT ---
const ColoredIcon = ({ src, colorClass, sizeClass = "w-6 h-6" }) => (
  <div 
    className={`${sizeClass} ${colorClass}`}
    style={{
      WebkitMaskImage: `url("${src}")`,
      WebkitMaskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskImage: `url("${src}")`,
      maskSize: 'contain',
      maskRepeat: 'no-repeat',
      maskPosition: 'center',
    }}
  />
);

// --- SCANNER SELECTION MODAL ---
const ScannerOptionModal = ({ isOpen, onClose, onSelectBarcode, onSelectPlate }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[11000] flex items-end sm:items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
                        onClick={onClose}
                    />
                    <motion.div 
                        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 relative z-10 shadow-2xl pb-10"
                    >
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                        <h3 className="text-xl font-bold text-slate-900 text-center mb-8">Choose Scanner</h3>
                        
                        <div className="space-y-4">
                            <button onClick={onSelectBarcode} className="w-full p-5 bg-slate-50 rounded-2xl flex items-center gap-5 active:scale-[0.98] transition-all hover:bg-slate-100 border border-slate-100">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-900">
                                    <ColoredIcon src={scannerIcon} colorClass="bg-slate-900" sizeClass="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <span className="block font-bold text-lg text-slate-900">Barcode Scanner</span>
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Packaged Foods</span>
                                </div>
                            </button>

                            <button onClick={onSelectPlate} className="w-full p-5 bg-slate-900 rounded-2xl flex items-center gap-5 active:scale-[0.98] transition-all shadow-xl shadow-slate-200">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white">
                                    <ColoredIcon src={cameraIcon} colorClass="bg-white" sizeClass="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <span className="block font-bold text-lg text-white">AI Plate Scanner</span>
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">AI Food & Calorie Recognition</span>
                                </div>
                            </button>
                        </div>
                        
                        <button onClick={onClose} className="w-full mt-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600">Cancel</button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// --- INSTALL SUCCESS MODAL ---
const InstallSuccessModal = ({ isOpen, onOpenApp }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-6 font-['Switzer']">
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-emerald-900/60 backdrop-blur-lg" />
           <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white w-full max-w-xs rounded-[3rem] p-8 relative z-10 shadow-2xl flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white rounded-3xl shadow-lg border border-slate-100 flex items-center justify-center mb-6 p-4">
                 <img src="/app-icon.png" alt="App Icon" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Welcome Home</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">Safespoon has been successfully installed on your device.</p>
              <button onClick={onOpenApp} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 active:scale-95 transition-all">Open Application</button>
           </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

function AppContent() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [minLoadComplete, setMinLoadComplete] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  
  const [isSearching, setIsSearching] = useState(false); 
  const [isPlateScanning, setIsPlateScanning] = useState(false); 
  const [scannerMenuOpen, setScannerMenuOpen] = useState(false); 
  
  const [installSuccess, setInstallSuccess] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null); 
  const [dashboardLocation, setDashboardLocation] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setMinLoadComplete(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    const handleAppInstalled = () => { setInstallSuccess(true); setDeferredPrompt(null); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) { setProfileLoading(false); setUserProfile(null); }
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

  const activateBarcodeScanner = () => { setScannerMenuOpen(false); setIsSearching(false); setIsPlateScanning(false); navigate('/scanner'); };
  const activatePlateScanner = () => { setScannerMenuOpen(false); setIsPlateScanning(true); setIsSearching(false); navigate('/'); };

  // --- SPLASH SCREEN ---
  if (!minLoadComplete || authLoading || (user && profileLoading)) {
    const letters = "Safespoon".split("");
    return (
      <div className="fixed inset-0 bg-emerald-500 z-[100] flex flex-col items-center justify-center overflow-hidden font-['Host_Grotesk']">
        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="flex overflow-hidden">
          {letters.map((letter, index) => (
            <motion.span key={index} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 + (index * 0.05), type: "spring", stiffness: 150, damping: 15 }} className="text-6xl md:text-8xl font-black tracking-tighter text-white">{letter}</motion.span>
          ))}
        </motion.div>
      </div>
    );
  }

  if (!user) return isGuest ? <GuestDashboard onLogin={() => setIsGuest(false)} /> : <Login onLogin={(data) => data?.isGuest && setIsGuest(true)} />;
  if (!userProfile?.onboardingComplete) return <Onboarding onComplete={() => navigate('/')} />;

  // LOGIC TO DETERMINE LAYOUT MODE
  // 1. Is it a full-screen feature that needs ZERO padding? (Scanner, Map, etc.)
  const isFullScreen = isSearching || isPlateScanning || location.pathname === '/scanner' || location.pathname === '/restaurant';
  
  // 2. Is it a page that hides the global header?
  // We add '/subscription' here because it has its own dedicated header
  const shouldHideHeader = isFullScreen || location.pathname === '/' || location.pathname === '/meal-hub' || location.pathname === '/blog' || location.pathname === '/account' || location.pathname === '/subscription';

  return (
    <div className={`min-h-screen bg-gray-50 ${isFullScreen ? 'overflow-hidden' : ''}`}>
       {user && !isGuest && <NotificationManager user={user} />}

       {/* Logic for PlateScanner rendering */}
       {isPlateScanning && (
         <PlateScanner 
           onClose={() => setIsPlateScanning(false)}
           onResult={(result) => {
             console.log("Plate result received:", result);
             setIsPlateScanning(false);
           }}
         />
       )}

       {/* GLOBAL HEADER (Only shows on pages not in shouldHideHeader list) */}
       <div className={`${shouldHideHeader ? "hidden" : ""} sticky top-0 z-50 bg-white border-b border-slate-50 transition-all`}>
            <div className="hidden md:block">
                <Header userPhoto={user.photoURL} setView={(path) => navigate(path === 'dashboard' ? '/' : `/${path}`)} title={location.pathname === '/' ? 'Safespoon' : 'Details'} isDashboard={location.pathname === '/'} />
            </div>
            
            {/* Mobile Header */}
            <div className="md:hidden px-6 pb-4 flex justify-between items-center bg-white min-h-[60px]" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
                <div className="flex items-center gap-2">
                  {location.pathname.startsWith('/recipe/') && (
                      <button onClick={() => navigate('/meal-hub')} className="mr-2 text-black p-2 -ml-2">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                      </button>
                  )}
                  <span className="text-3xl font-bold tracking-tighter text-black font-['Switzer']">Safespoon</span>
                </div>
                <div className="h-9 w-9 rounded-full bg-slate-100 overflow-hidden cursor-pointer shadow-sm border border-white" onClick={() => navigate('/account')}>
                    {user.photoURL ? <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-400">?</div>}
                </div>
            </div>
       </div>

       {/* MAIN CONTENT WRAPPER 
          - Logic updated to separate "Full Screen" from "Content with Hidden Header" 
       */}
       <main className={
           isFullScreen 
           ? "w-full h-full p-0 m-0 fixed inset-0 z-[9998]" // Full Screen Mode (No padding)
           : shouldHideHeader 
             ? "w-full pb-24 px-0 pt-[calc(env(safe-area-inset-top)+2rem)] md:pt-8" // Hidden Header Mode: Adds Safe Area Padding for iOS
             : "px-4 md:px-8 max-w-7xl mx-auto pt-4 pb-24" // Standard Mode
       }>
          <Routes>
              <Route path="/" element={<Dashboard setView={(view) => navigate(view === 'dashboard' ? '/' : `/${view}`)} profile={userProfile} onOpenMenu={setSelectedRestaurant} setIsSearching={setIsSearching} isSearching={isSearching} isPlateScanning={isPlateScanning} setIsPlateScanning={setIsPlateScanning} setDashboardLocation={setDashboardLocation} deferredPrompt={deferredPrompt} />} />
              <Route path="/meal-hub" element={<MealHub userProfile={userProfile} onOpenMenu={setSelectedRestaurant} />} />
              <Route path="/scanner" element={<BarcodeScannerPage userProfile={userProfile} />} />
              <Route path="/recipe/:id" element={<RecipeDetail userProfile={userProfile} />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/account" element={<Settings />} />
              {/* NEW: Subscription Route */}
              <Route path="/subscription" element={<SubscriptionPage userProfile={userProfile} />} />
              <Route path="/restaurant" element={<RestaurantMenu restaurant={selectedRestaurant} onBack={() => navigate('/meal-hub')} userProfile={userProfile} onItemClick={setSelectedRestaurant} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
       </main>

       <ScannerOptionModal isOpen={scannerMenuOpen} onClose={() => setScannerMenuOpen(false)} onSelectBarcode={activateBarcodeScanner} onSelectPlate={activatePlateScanner} />
       <InstallSuccessModal isOpen={installSuccess} onOpenApp={() => setInstallSuccess(false)} />

       {/* Mobile Tab Bar 
           - Updated condition to hide on /subscription so it doesn't overlap purchase buttons 
       */}
       {!isSearching && !isPlateScanning && !location.pathname.startsWith('/restaurant') && location.pathname !== '/scanner' && !location.pathname.startsWith('/recipe/') && location.pathname !== '/subscription' && (
           <div className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white border-t border-slate-100 pb-safe-bottom">
              <div className="flex justify-between items-end px-2 h-[60px] relative">
                  <button onClick={() => navigate('/')} className="flex flex-col items-center justify-center w-1/5 h-full pb-1">
                      <ColoredIcon src={location.pathname === '/' ? gridFilledIcon : gridIcon} colorClass={location.pathname === '/' ? 'bg-emerald-500' : 'bg-slate-400'} sizeClass="w-6 h-6 mb-1" />
                      <span className={`text-[10px] ${location.pathname === '/' ? 'text-emerald-500 font-bold' : 'text-slate-400 font-medium'}`}>Dashboard</span>
                  </button>
                  <button onClick={() => navigate('/meal-hub')} className="flex flex-col items-center justify-center w-1/5 h-full pb-1">
                      <ColoredIcon src={location.pathname === '/meal-hub' ? foodTrayFilledIcon : foodTrayIcon} colorClass={location.pathname === '/meal-hub' ? 'bg-emerald-500' : 'bg-slate-400'} sizeClass="w-6 h-6 mb-1" />
                      <span className={`text-[10px] ${location.pathname === '/meal-hub' ? 'text-emerald-500 font-bold' : 'text-slate-400 font-medium'}`}>Meals</span>
                  </button>
                  <div className="w-1/5 relative h-full flex justify-center items-end pointer-events-none">
                      <button onClick={() => setScannerMenuOpen(true)} className="pointer-events-auto absolute -top-8 w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-white"><ColoredIcon src={scannerIcon} colorClass="bg-white" sizeClass="w-7 h-7" /></button>
                  </div>
                  <button onClick={() => navigate('/blog')} className="flex flex-col items-center justify-center w-1/5 h-full pb-1">
                      <ColoredIcon src={location.pathname === '/blog' ? blogFilledIcon : blogIcon} colorClass={location.pathname === '/blog' ? 'bg-emerald-500' : 'bg-slate-400'} sizeClass="w-6 h-6 mb-1" />
                      <span className={`text-[10px] ${location.pathname === '/blog' ? 'text-emerald-500 font-bold' : 'text-slate-400 font-medium'}`}>Community</span>
                  </button>
                  <button onClick={() => navigate('/account')} className="flex flex-col items-center justify-center w-1/5 h-full pb-1">
                      <ColoredIcon src={location.pathname === '/account' ? userFilledIcon : userIcon} colorClass={location.pathname === '/account' ? 'bg-emerald-500' : 'bg-slate-400'} sizeClass="w-6 h-6 mb-1" />
                      <span className={`text-[10px] ${location.pathname === '/account' ? 'text-emerald-500 font-bold' : 'text-slate-400 font-medium'}`}>Account</span>
                  </button>
              </div>
           </div>
       )}
    </div>
  );
}

const App = () => (<HelmetProvider><Router><AppContent /></Router></HelmetProvider>);
export default App;