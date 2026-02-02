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

// IMPORTANT: Ensure you have created this file from the previous step
import BarcodeScannerPage from './components/BarcodeScannerPage'; 

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
      backgroundColor: 'currentColor'
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
                        <h3 className="text-xl font-black text-slate-900 text-center mb-8">Choose Scanner</h3>
                        
                        <div className="space-y-4">
                            <button onClick={onSelectBarcode} className="w-full p-5 bg-slate-50 rounded-2xl flex items-center gap-5 active:scale-[0.98] transition-all hover:bg-slate-100 border border-slate-100">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-900">
                                    <ColoredIcon src={scannerIcon} colorClass="bg-current" sizeClass="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <span className="block font-black text-lg text-slate-900">Barcode Scanner</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Packaged Foods</span>
                                </div>
                            </button>

                            <button onClick={onSelectPlate} className="w-full p-5 bg-slate-900 rounded-2xl flex items-center gap-5 active:scale-[0.98] transition-all shadow-xl shadow-slate-200">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white">
                                    <ColoredIcon src={cameraIcon} colorClass="bg-current" sizeClass="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <span className="block font-black text-lg text-white">Plate Scanner</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">AI Food Recognition</span>
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

// --- INSTALL SUCCESS MODAL (NEW) ---
const InstallSuccessModal = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-6 font-['Switzer']">
           {/* Backdrop */}
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="absolute inset-0 bg-emerald-900/40 backdrop-blur-md"
           />
           
           {/* Card */}
           <motion.div 
             initial={{ scale: 0.8, opacity: 0 }} 
             animate={{ scale: 1, opacity: 1 }} 
             exit={{ scale: 0.8, opacity: 0 }}
             className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 relative z-10 shadow-2xl text-center"
           >
              {/* Animated Checkmark Circle */}
              <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                 <motion.svg 
                    className="w-12 h-12 text-emerald-500" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                 >
                    <motion.path 
                      initial={{ pathLength: 0 }} 
                      animate={{ pathLength: 1 }} 
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
                      d="M20 6L9 17l-5-5" 
                    />
                 </motion.svg>
                 {/* Pulse Effect */}
                 <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-emerald-500/20"
                 />
              </div>

              <h2 className="text-2xl font-black text-slate-900 mb-2">App Installed!</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                SafeSpoon is now added to your home screen. You can now access it instantly.
              </p>

              <button 
                onClick={onClose} 
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all"
              >
                Open Application
              </button>
           </motion.div>
        </div>
      )}
    </AnimatePresence>
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
  
  // Navigation & Modal States
  const [isSearching, setIsSearching] = useState(false); 
  const [isPlateScanning, setIsPlateScanning] = useState(false); 
  const [scannerMenuOpen, setScannerMenuOpen] = useState(false); 
  
  // PWA Install Success State
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

  // --- PWA LISTENERS ---
  useEffect(() => {
    // 1. Capture the install prompt for Android/Desktop
    const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
    };

    // 2. Listen for successful installation
    const handleAppInstalled = () => {
        setInstallSuccess(true);
        setDeferredPrompt(null);
        // Optional: Analytics tracking here
        console.log('PWA was installed');
    };

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

  // --- SCANNER LOGIC ---
  const handleScannerClick = () => {
      setScannerMenuOpen(true);
  };

  const activateBarcodeScanner = () => {
      setScannerMenuOpen(false);
      setIsSearching(false);
      setIsPlateScanning(false);
      navigate('/scanner'); 
  };

  const activatePlateScanner = () => {
      setScannerMenuOpen(false);
      navigate('/'); 
      setIsPlateScanning(true);
      setIsSearching(false);
  };

  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Safespoon';
    if (path === '/explore') return 'Explore';
    if (path === '/meal-hub') return 'Meal Hub';
    if (path.startsWith('/recipe/')) return 'Recipe Details';
    if (path === '/blog') return 'Articles & Blog';
    if (path === '/account') return 'Settings';
    if (path === '/scanner') return 'Scanner';
    if (path === '/restaurant') return selectedRestaurant?.name || 'Product Details';
    return 'Safespoon';
  };

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

  if (!user) {
    return isGuest ? <GuestDashboard onLogin={() => setIsGuest(false)} /> : <Login onLogin={handleLoginAction} />;
  }

  if (!userProfile || !userProfile.onboardingComplete) {
      return <Onboarding onComplete={() => navigate('/')} />;
  }

  const shouldHideHeader = isSearching || 
                           isPlateScanning ||
                           location.pathname === '/scanner' || 
                           location.pathname === '/restaurant' || 
                           location.pathname === '/' || 
                           location.pathname === '/meal-hub' || 
                           location.pathname === '/blog' || 
                           location.pathname === '/account';

  return (
    <div className={`min-h-screen bg-gray-50 ${isSearching || isPlateScanning || location.pathname === '/scanner' ? 'overflow-hidden' : ''}`}>
       
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
       <main className={isSearching || isPlateScanning || location.pathname === '/scanner' ? "w-full h-full p-0 m-0 fixed inset-0 z-[9998]" : (shouldHideHeader ? "w-full pt-0 pb-24" : "px-4 md:px-8 max-w-7xl mx-auto pt-4 pb-24")}>
          <Routes>
              <Route path="/" element={
                  <Dashboard 
                    setView={(view) => navigate(view === 'dashboard' ? '/' : `/${view}`)} 
                    profile={userProfile} 
                    onOpenMenu={handleOpenMenu} 
                    setIsSearching={setIsSearching} 
                    isSearching={isSearching} 
                    isPlateScanning={isPlateScanning}
                    setIsPlateScanning={setIsPlateScanning}
                    setDashboardLocation={setDashboardLocation}
                    deferredPrompt={deferredPrompt} // Pass prompt to Dashboard
                  />
              } />
              <Route path="/meal-hub" element={<MealHub userProfile={userProfile} onOpenMenu={handleOpenMenu} />} />
              <Route path="/explore" element={<Navigate to="/meal-hub" replace />} />
              <Route path="/recipes" element={<Navigate to="/meal-hub" replace />} />
              <Route path="/scanner" element={<BarcodeScannerPage userProfile={userProfile} />} />
              <Route path="/recipe/:id" element={<RecipeDetail userProfile={userProfile} />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/account" element={<Settings />} />
              <Route path="/restaurant" element={<RestaurantMenu restaurant={selectedRestaurant} onBack={() => navigate('/meal-hub')} userProfile={userProfile} onItemClick={(item) => setSelectedRestaurant(item)} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
       </main>

       {/* MODALS */}
       <ScannerOptionModal 
          isOpen={scannerMenuOpen} 
          onClose={() => setScannerMenuOpen(false)} 
          onSelectBarcode={activateBarcodeScanner}
          onSelectPlate={activatePlateScanner}
       />
       
       {/* SUCCESS INSTALL MODAL */}
       <InstallSuccessModal 
          isOpen={installSuccess} 
          onClose={() => setInstallSuccess(false)} 
       />

       {/* Mobile Tab Bar */}
       {!isSearching && !isPlateScanning && !location.pathname.startsWith('/restaurant') && location.pathname !== '/scanner' && !location.pathname.startsWith('/recipe/') && (
           <div className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white border-t border-slate-100 pb-safe-bottom">
              <div className="flex justify-between items-end px-2 h-[60px] relative">
                  <button onClick={() => navigate('/')} className="flex flex-col items-center justify-center w-1/5 h-full pb-1">
                      <svg className={`w-6 h-6 mb-1 ${location.pathname === '/' ? 'text-black stroke-2' : 'text-slate-300 stroke-[1.5]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span className={`text-[10px] font-bold ${location.pathname === '/' ? 'text-black' : 'text-slate-300'}`}>Dashboard</span>
                  </button>
                  <button onClick={() => navigate('/meal-hub')} className="flex flex-col items-center justify-center w-1/5 h-full pb-1">
                      <ColoredIcon src={foodTrayIcon} colorClass={location.pathname === '/meal-hub' ? 'text-black' : 'text-slate-300'} sizeClass="w-6 h-6 mb-1" />
                      <span className={`text-[10px] font-bold ${location.pathname === '/meal-hub' ? 'text-black' : 'text-slate-300'}`}>Meals</span>
                  </button>
                  <div className="w-1/5 relative h-full flex justify-center items-end pointer-events-none">
                      <button onClick={handleScannerClick} className="pointer-events-auto absolute -top-8 w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white transform active:scale-95 transition-transform z-50 overflow-hidden border-4 border-white">
                          <ColoredIcon src={scannerIcon} colorClass="bg-white" sizeClass="w-7 h-7" />
                      </button>
                  </div>
                  <button onClick={() => navigate('/blog')} className="flex flex-col items-center justify-center w-1/5 h-full pb-1">
                      <svg className={`w-6 h-6 mb-1 ${location.pathname === '/blog' ? 'text-black stroke-2' : 'text-slate-300 stroke-[1.5]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                      <span className={`text-[10px] font-bold ${location.pathname === '/blog' ? 'text-black' : 'text-slate-300'}`}>Blog</span>
                  </button>
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

// WRAP APP WITH HELPER PROVIDER
function App() { 
  return (
    <HelmetProvider>
      <Router><AppContent /></Router>
    </HelmetProvider>
  ); 
}
export default App;