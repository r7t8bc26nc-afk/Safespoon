import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from './firebase'; 
import { HelmetProvider } from 'react-helmet-async'; 

// Components
import Dashboard from './components/Dashboard'; 
import { MealHub } from './components/MealHub'; 
import RecipeDetail from './components/RecipeDetail'; 
import Settings from './components/settings'; 
import Login from './components/Login';
import BarcodeScannerPage from './components/BarcodeScannerPage'; 
import { SmartMealPlanner } from './components/SmartMealPlanner'; 
import { SubscriptionPage } from './components/SubscriptionPage'; 

// --- HEADER LOGIC ---
const NavigationHeader = ({ navigate, location }) => {
  const isHome = location.pathname === '/';
  
  // 1. DASHBOARD: NO HEADER (Per your request)
  if (isHome) return null;

  // 2. DYNAMIC TITLES FOR SUB-PAGES
  let pageTitle = "RETURN";
  if (location.pathname === '/account') pageTitle = "PROFILE";
  if (location.pathname === '/meal-hub') pageTitle = "LOG";
  if (location.pathname === '/planner') pageTitle = "PLANNER";
  if (location.pathname === '/subscription') pageTitle = "PREMIUM";
  if (location.pathname === '/scanner') pageTitle = "SCANNER";

  // 3. SUB-PAGE HEADER (Big Yellow Back Button)
  return (
    <header className="sticky top-0 z-50 px-4 py-4 bg-[#FFF8DC] border-b-4 border-black">
      <button 
        onClick={() => navigate(-1)} 
        className="w-full bg-[#FFD700] text-black border-2 border-black p-4 flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
      >
        <div className="w-8 h-8 bg-white border-2 border-black flex items-center justify-center font-black text-xl">
            ←
        </div>
        <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">GO BACK TO</span>
            <span className="text-2xl font-black uppercase tracking-tight leading-none">{pageTitle}</span>
        </div>
      </button>
    </header>
  );
};

function AppContent() {
  const [user, setUser] = React.useState(null);
  const [userProfile, setUserProfile] = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [isSearching, setIsSearching] = React.useState(false); 
  
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) { setProfileLoading(false); setUserProfile(null); }
    });
  }, []);

  React.useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    return onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        setUserProfile(docSnap.exists() ? docSnap.data() : null);
        setProfileLoading(false);
    });
  }, [user]);

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-6 border-8 border-black">
        <h1 className="text-4xl font-black uppercase animate-pulse">SAFESPOON</h1>
      </div>
    );
  }

  if (!user) return <Login onLogin={() => {}} />;

  const isScanner = location.pathname === '/scanner';
  const isHome = location.pathname === '/';

  return (
    <div className={`min-h-screen bg-white text-black font-sans ${isScanner ? 'overflow-hidden' : ''}`}>
       <NavigationHeader navigate={navigate} location={location} />
       
       {/* Main Container Padding Logic:
          - If Home: pt-12 (No header, so we need padding for status bar/notch)
          - If Subpage: pt-6 (Header handles the top spacing)
       */}
       <main className={`min-h-screen max-w-xl mx-auto pb-12 px-4 ${isHome ? 'pt-12' : 'pt-6'}`}>
          <Routes>
              <Route path="/" element={<Dashboard profile={userProfile} setIsSearching={setIsSearching} />} />
              <Route path="/meal-hub" element={<MealHub userProfile={userProfile} />} />
              <Route path="/scanner" element={<BarcodeScannerPage userProfile={userProfile} />} />
              <Route path="/recipe/:id" element={<RecipeDetail userProfile={userProfile} />} />
              <Route path="/account" element={<Settings />} />
              <Route path="/subscription" element={<SubscriptionPage userProfile={userProfile} />} />
              <Route path="/planner" element={<SmartMealPlanner userProfile={userProfile} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
       </main>
    </div>
  );
}

const App = () => (<HelmetProvider><Router><AppContent /></Router></HelmetProvider>);
export default App;