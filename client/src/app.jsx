import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from './firebase'; 
import { HelmetProvider } from 'react-helmet-async'; 

// --- COMPONENTS ---
import Dashboard from './components/Dashboard'; 
import { MealHub } from './components/MealHub'; 
import RecipeDetail from './components/RecipeDetail'; 
import { Blog } from './components/Blog';
import Settings from './components/settings';
import Onboarding from './components/Onboarding';
import Login from './components/Login';
import RestaurantMenu from './components/RestaurantMenu';
import BarcodeScannerPage from './components/BarcodeScannerPage'; 
import NotificationManager from './components/NotificationManager';
import { SubscriptionPage } from './components/SubscriptionPage';
import { SmartMealPlanner } from './components/SmartMealPlanner';
import { GuestDashboard } from './components/GuestDashboard';

// --- ASSETS ---
const LogoMark = ({ className }) => (
  <svg viewBox="0 0 750 250" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M587.94,178.86c40.05-41.58,66.25-103.72,50.96-117.94-13.28-12.35-47.3,21.29-105.96,32.94-64.04,12.71-121.61-7.9-158.7-26.02,11.52,12.08,47.36,46.57,105.67,56.4,68.33,11.51,119.94-18.85,132.62-26.82-25.76,33.83-69.98,80.64-130.6,87.44C340.22,200.76,256.78-18.67,143.94,1.86,36.51,21.4-8.83,242.29,2.08,247.53c10.48,5.03,67.21-191.66,169.9-197.41,106.23-5.95,152.55,198.52,285.95,194.74,68.28-1.93,121.67-57.36,130-66Z" />
  </svg>
);

// --- MAIN CONTENT ---
function AppContent() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [minLoadComplete, setMinLoadComplete] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  
  // SHARED STATE
  // We keep this here so Dashboard can toggle it, but App.jsx WON'T render the overlay itself.
  const [isSearching, setIsSearching] = useState(false); 
  
  const [deferredPrompt, setDeferredPrompt] = useState(null); 
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const lastActivityRef = useRef(Date.now());

  // --- AUTO-REFRESH LOGIC ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastActivityRef.current > (30 * 60 * 1000)) {
          window.location.reload();
        }
        lastActivityRef.current = now;
      }
    };
    const handleInteraction = () => { lastActivityRef.current = Date.now(); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('click', handleInteraction);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('click', handleInteraction);
    };
  }, []);

  useEffect(() => { setTimeout(() => setMinLoadComplete(true), 2500); }, []);

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

  // --- SPLASH SCREEN ---
  if (!minLoadComplete || authLoading || (user && profileLoading)) {
    return (
      <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
        <div className="w-48 h-48 text-white">
           <LogoMark className="w-full h-full" />
        </div>
      </div>
    );
  }

  if (!user) return isGuest ? <GuestDashboard onLogin={() => setIsGuest(false)} /> : <Login onLogin={(data) => data?.isGuest && setIsGuest(true)} />;
  if (!userProfile?.onboardingComplete) return <Onboarding onComplete={() => navigate('/')} />;

  const isFullScreen = isSearching || location.pathname === '/scanner' || location.pathname === '/restaurant';

  return (
    <div className={`min-h-screen bg-white font-sans text-black ${isFullScreen ? 'overflow-hidden' : ''}`}>
       {user && !isGuest && <NotificationManager user={user} />}

       {/* HEADER (Only show back button on subpages) */}
       {!isFullScreen && location.pathname !== '/' && (
           <div className="sticky top-0 z-40 bg-white border-b-4 border-black px-4 py-3">
               <button onClick={() => navigate(-1)} className="flex items-center gap-2 font-black uppercase hover:underline decoration-4 decoration-[#FFD700]">
                   <span>← Back</span>
               </button>
           </div>
       )}

       {/* MAIN CONTENT */}
       <main className={
           isFullScreen 
           ? "fixed inset-0 z-[50] bg-white" 
           : `px-4 md:px-8 max-w-md mx-auto pb-12 ${location.pathname === '/meal-hub' ? 'pt-0' : 'pt-6'}`
       }>
          <Routes>
              <Route path="/" element={
                  <Dashboard 
                    profile={userProfile} 
                    setIsSearching={setIsSearching} 
                    isSearching={isSearching} 
                    deferredPrompt={deferredPrompt}
                  />
              } />
              <Route path="/meal-hub" element={<MealHub userProfile={userProfile} onOpenMenu={setSelectedRestaurant} />} />
              <Route path="/planner" element={<SmartMealPlanner userProfile={userProfile} />} />
              <Route path="/scanner" element={<BarcodeScannerPage userProfile={userProfile} />} />
              <Route path="/recipe/:id" element={<RecipeDetail userProfile={userProfile} />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/account" element={<Settings />} />
              <Route path="/subscription" element={<SubscriptionPage userProfile={userProfile} />} />
              <Route path="/restaurant" element={<RestaurantMenu restaurant={selectedRestaurant} onBack={() => navigate('/meal-hub')} userProfile={userProfile} onItemClick={setSelectedRestaurant} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
       </main>
    </div>
  );
}

const App = () => (<HelmetProvider><Router><AppContent /></Router></HelmetProvider>);
export default App;