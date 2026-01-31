import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from './firebase';

// Components
import { Header } from './components/Header';
import Dashboard from './components/Dashboard';
import { GuestDashboard } from './components/GuestDashboard'; 
import { RestaurantExplorer } from './components/RestaurantExplorer';
import { Recipes } from './components/Recipes';
import { RecipeDetail } from './components/RecipeDetail'; 
import { Blog } from './components/Blog';
import Settings from './components/settings';
import Onboarding from './components/Onboarding';
import Login from './components/Login';
import RestaurantMenu from './components/RestaurantMenu';

function AppContent() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
  // Loading States
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
    const timer = setTimeout(() => {
      setMinLoadComplete(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

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
    navigate('/restaurant'); 
  };

  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Safespoon';
    if (path === '/explore') return 'Explore';
    if (path === '/recipes') return 'Recipes';
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
      return <Onboarding onComplete={() => navigate('/')} />;
  }

  const isMenu = location.pathname === '/restaurant';
  const isDashboard = location.pathname === '/';

  return (
    <div className={`min-h-screen bg-white ${isSearching ? 'overflow-hidden' : ''}`}>
       
       {/* Sticky Header Container 
          - HIDDEN on Dashboard (isDashboard) so the custom dashboard header takes over
       */}
       <div className={`${isSearching || isMenu || isDashboard ? "hidden" : ""} sticky top-0 z-50 bg-white border-b border-slate-50 transition-all`}>
            
            {/* Desktop Header */}
            <div className="hidden md:block">
                <Header 
                    userPhoto={user.photoURL} 
                    setView={(path) => navigate(path === 'dashboard' ? '/' : `/${path}`)} 
                    title={getHeaderTitle()} 
                    isDashboard={location.pathname === '/'}
                    locationElement={location.pathname === '/' ? dashboardLocation : null}
                />
            </div>
            
            {/* Mobile Header */}
            <div className="md:hidden pt-6 px-6 pb-4 flex justify-between items-center bg-white">
                <div className="flex items-center gap-2">
                  {/* Back button logic */}
                  {location.pathname.startsWith('/recipe/') && (
                      <button onClick={() => navigate('/recipes')} className="mr-2 text-slate-400">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                      </button>
                  )}
                  
                  <span className={`text-3xl font-bold tracking-tighter ${
                      location.pathname === '/' 
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 font-["Host_Grotesk"]' 
                      : 'text-slate-700 font-["Switzer"]'
                  }`}>
                      {getHeaderTitle()}
                  </span>
                </div>
                
                <div className="flex items-center">
                  {location.pathname === '/' ? (
                    dashboardLocation
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-slate-100 overflow-hidden cursor-pointer shadow-sm border border-white" onClick={() => navigate('/account')}>
                        {user.photoURL ? <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-400 font-['Host_Grotesk']">?</div>}
                    </div>
                  )}
                </div>
            </div>
       </div>

       {/* Main Content */}
       <main className={isSearching ? "w-full h-full p-0 m-0 fixed inset-0 z-[9998]" : (isDashboard || isMenu ? "w-full pt-0" : "px-4 md:px-8 max-w-7xl mx-auto pt-4")}>
          <Routes>
              <Route path="/" element={
                  <Dashboard 
                    setView={(view) => navigate(view === 'dashboard' ? '/' : `/${view}`)} 
                    profile={userProfile} 
                    onOpenMenu={handleOpenMenu} 
                    setIsSearching={setIsSearching} 
                    isSearching={isSearching}
                    setDashboardLocation={setDashboardLocation}
                  />
              } />
              <Route path="/explore" element={<RestaurantExplorer userProfile={userProfile} onOpenMenu={handleOpenMenu} />} />
              <Route path="/recipes" element={<Recipes userProfile={userProfile} />} />
              <Route path="/recipe/:id" element={<RecipeDetail userProfile={userProfile} />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/account" element={<Settings />} />
              
              <Route path="/restaurant" element={
                <RestaurantMenu 
                    restaurant={selectedRestaurant} 
                    onBack={() => navigate('/explore')} 
                    userProfile={userProfile} 
                />
              } />
              
              <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
       </main>

       {/* Mobile Tab Bar */}
       {!isSearching && !isMenu && !location.pathname.startsWith('/recipe/') && (
           <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 px-6 py-4 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.02)] safe-area-pb">
              {[
                { path: '/', label: 'Home', icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
                { path: '/explore', label: 'Explore', icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
                { path: '/recipes', label: 'Recipes', icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
                { path: '/blog', label: 'Blog', icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" },
                { path: '/account', label: 'Account', icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
              ].map((item) => (
                <button 
                    key={item.path} 
                    onClick={() => navigate(item.path)} 
                    className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative ${location.pathname === item.path ? 'text-slate-800' : 'text-slate-400'}`}
                >
                  {/* Updated Active Border: Wider rectangle in slate-800 */}
                  {location.pathname === item.path && (
                      <span className="absolute -top-4 w-16 h-1.5 bg-slate-800 rounded-b-sm shadow-sm"></span>
                  )}
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                  <span className="text-[10px] font-bold tracking-wide font-['Host_Grotesk']">{item.label}</span>
                </button>
              ))}
           </div>
       )}
    </div>
  );
}

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;