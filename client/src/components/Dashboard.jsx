import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query } from "firebase/firestore";

const LOGO_DEV_PUBLIC_KEY = 'pk_AnZTwqMTQ1ia9Btg_pILzg';

// Categories
const CATEGORIES = [
  { id: 'Fast Food', label: 'Fast Food', icon: '🍔' },
  { id: 'Healthy', label: 'Healthy', icon: '🥗' },
  { id: 'Mexican', label: 'Mexican', icon: '🌮' },
  { id: 'Pizza', label: 'Pizza', icon: '🍕' },
  { id: 'Coffee', label: 'Coffee', icon: '☕' },
  { id: 'Asian', label: 'Asian', icon: '🥢' },
  { id: 'Burgers', label: 'Burgers', icon: '🍔' },
  { id: 'Dessert', label: 'Dessert', icon: '🍰' },
];

// Partner Ads Configuration
const PARTNER_ADS = [
  {
    id: 1,
    name: "Sweetgreen",
    domain: "sweetgreen.com",
    offer: "Get $5 off your first verified gluten-free bowl.",
    highlight: "$5 off",
    gradient: "from-gray-900 to-gray-800",
    buttonColor: "hover:bg-emerald-50 text-gray-900",
    badgeColor: "text-emerald-300",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 2,
    name: "Chipotle",
    domain: "chipotle.com",
    offer: "Free Guac on your first allergen-safe order.",
    highlight: "Free Guac",
    gradient: "from-red-900 to-orange-900",
    buttonColor: "hover:bg-orange-50 text-orange-900",
    badgeColor: "text-orange-300",
    image: "https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 3,
    name: "Cava",
    domain: "cava.com",
    offer: "Double rewards points on Mediterranean greens.",
    highlight: "2x Points",
    gradient: "from-emerald-900 to-teal-900",
    buttonColor: "hover:bg-teal-50 text-teal-900",
    badgeColor: "text-teal-300",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"
  }
];

const Dashboard = ({ setView, userEmail, profile, onOpenMenu }) => {
  const [featured, setFeatured] = useState([]);
  const [recommended, setRecommended] = useState([]); 
  const [categoryResults, setCategoryResults] = useState([]); 
  const [allRestaurants, setAllRestaurants] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  // --- NEW LOCATION STATE ---
  const [locationName, setLocationName] = useState('Current Location');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getLogoUrl = (name) => {
    if (!name) return '';
    const domain = name.includes('.') ? name : name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}&size=100&format=png`;
  };

  // --- NEW FUNCTION: HANDLE LOCATION CLICK ---
  const handleLocationClick = () => {
    setLocationLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Using BigDataCloud's free client-side API (No key required, CORS friendly)
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await response.json();
          
          // Construct a readable location string (e.g., "Rock Hill, South Carolina" or "New York, NY")
          const city = data.city || data.locality || data.principalSubdivision;
          const state = data.principalSubdivisionCode || data.countryName;
          
          if (city) {
            setLocationName(`${city}, ${state}`);
          } else {
            setLocationName("Location Found");
          }
        } catch (error) {
          console.error("Error fetching address:", error);
          setLocationName("Unknown Location");
          setLocationError("Could not fetch address details");
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationError("Permission denied or unavailable");
        setLocationLoading(false);
      }
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
        setCurrentAdIndex((prevIndex) => (prevIndex === PARTNER_ADS.length - 1 ? 0 : prevIndex + 1));
    }, 6000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, "restaurants"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          distance: (Math.random() * 5 + 0.5).toFixed(1) 
        }));
        setAllRestaurants(data);
        setFeatured(data.slice(0, 4)); 
        setRecommended(data.slice(4, 7)); 
      } catch (err) {
        console.error("Error fetching restaurants:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCategoryClick = (catId) => {
    if (activeCategory === catId) {
        setActiveCategory(null);
        setCategoryResults([]);
    } else {
        setActiveCategory(catId);
        const filtered = allRestaurants.filter(r => {
            const dbCategory = (r.category || "").toLowerCase();
            const search = catId.toLowerCase();
            return dbCategory.includes(search);
        });
        setCategoryResults(filtered);
    }
  };

  const displayRestaurants = activeCategory ? categoryResults : featured;
  const finalResults = dashboardSearch 
    ? allRestaurants.filter(r => r.name.toLowerCase().includes(dashboardSearch.toLowerCase()))
    : displayRestaurants;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 min-h-screen bg-white">
      
      {/* --- HERO SECTION --- */}
      <div className="relative pt-2">
          
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div>
                  {/* --- UPDATED LOCATION COMPONENT --- */}
                  <div 
                    onClick={handleLocationClick}
                    className="flex items-center gap-2 mb-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer w-fit group"
                    title="Click to update location"
                  >
                    <svg 
                        className={`w-4 h-4 text-violet-600 ${locationLoading ? 'animate-spin' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        {locationLoading ? (
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        ) : (
                           <>
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                           </>
                        )}
                    </svg>
                    <span className={`text-xs font-bold uppercase tracking-widest ${locationError ? 'text-red-500' : 'text-gray-500 group-hover:text-violet-600'}`}>
                        {locationLoading ? "Locating..." : (locationError || locationName)}
                    </span>
                  </div>

                  <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
                    {getGreeting()}, <span className="text-violet-600">{profile?.username || profile?.firstName || 'Friend'}</span>.
                  </h1>
              </div>

              {/* Safety Filters */}
              {profile?.restrictions && profile.restrictions.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center md:justify-end">
                    {profile.restrictions.map((r, i) => (
                        <div key={i} className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 border border-gray-100 text-gray-600 shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                            {r}
                        </div>
                    ))}
                    <button onClick={() => setView('settings')} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </button>
                </div>
              )}
          </div>

          {/* SEARCH BAR */}
          <div className="relative w-full group z-20 mb-6">
             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400 group-focus-within:text-violet-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
             </div>
             <input 
                type="text" 
                placeholder="Search restaurants, cravings..." 
                value={dashboardSearch}
                onChange={(e) => setDashboardSearch(e.target.value)}
                className="block w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-gray-900 font-medium shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
             />
          </div>

          {/* --- CATEGORY FILTERS --- */}
          {!dashboardSearch && (
            <div className="flex flex-wrap gap-2 items-center pb-2">
                {CATEGORIES.map((cat) => (
                    <button 
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.id)}
                        className={`
                            group flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 border
                            ${activeCategory === cat.id
                                ? 'bg-gray-900 text-white border-gray-900 shadow-md' 
                                : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:bg-violet-50' 
                            }
                        `}
                    >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                    </button>
                ))}
                
                {activeCategory && (
                    <button onClick={() => { setActiveCategory(null); setCategoryResults([]); }} className="text-xs font-bold text-gray-400 hover:text-rose-600 ml-2 transition-colors">
                        ✕ Clear
                    </button>
                )}
            </div>
          )}
      </div>

      {/* --- PARTNER AD CAROUSEL --- */}
      {!dashboardSearch && !activeCategory && (
        <div className="relative overflow-hidden rounded-3xl shadow-xl shadow-gray-200 group cursor-pointer h-[320px] md:h-[260px]">
           <div 
             className="absolute inset-0 flex transition-transform duration-700 ease-out h-full"
             style={{ transform: `translateX(-${currentAdIndex * 100}%)` }}
           >
              {PARTNER_ADS.map((ad) => (
                <div key={ad.id} className={`w-full h-full flex-shrink-0 relative bg-gradient-to-br ${ad.gradient} text-white`}>
                     <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                     <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-8 gap-8 h-full">
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                                <div className={`inline-block bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${ad.badgeColor}`}>Partner</div>
                                <div className="h-8 w-8 bg-white/90 rounded-full p-1 flex items-center justify-center shadow-sm">
                                    <img src={getLogoUrl(ad.domain)} alt={ad.name} className="w-full h-full object-contain rounded-full" />
                                </div>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-extrabold mb-2 tracking-tight">{ad.name}</h2>
                            <p className="text-gray-300 mb-6 max-w-sm mx-auto md:mx-0">
                                {ad.offer.replace(ad.highlight, '')} <span className="text-white font-bold">{ad.highlight}</span>
                            </p>
                            <button className={`bg-white px-6 py-2.5 rounded-xl text-sm font-bold hover:scale-105 transition-all shadow-lg active:scale-95 ${ad.buttonColor}`}>Claim Offer</button>
                        </div>
                        <div className="relative w-full md:w-48 h-32 md:h-auto shrink-0 rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 transform md:rotate-3 group-hover:rotate-0 transition-transform duration-500">
                            <img src={ad.image} alt={ad.name} className="object-cover w-full h-full" />
                        </div>
                     </div>
                </div>
              ))}
           </div>
           <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {PARTNER_ADS.map((_, idx) => (
                    <button key={idx} onClick={(e) => { e.stopPropagation(); setCurrentAdIndex(idx); }} className={`h-2 rounded-full transition-all duration-300 ${currentAdIndex === idx ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'}`} />
                ))}
           </div>
        </div>
      )}

      {/* --- FOOD YOU MAY LIKE --- */}
      {!activeCategory && !dashboardSearch && recommended.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-xl">✨</span> Food you may like
                </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scroll snap-x">
                {recommended.map((restaurant) => (
                     <div 
                        key={restaurant.id} 
                        onClick={() => onOpenMenu(restaurant)}
                        className="min-w-[260px] w-[260px] h-[300px] bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer snap-start flex flex-col overflow-hidden"
                     >
                        <div className="h-[50%] w-full bg-gray-100 relative">
                            <img 
                                src={`https://source.unsplash.com/400x300/?food,${restaurant.category || 'meal'}`} 
                                className="w-full h-full object-cover"
                                alt="Food"
                                onError={(e) => {e.target.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}}
                            />
                            <div className="absolute bottom-2 left-2 z-20 text-white text-xs font-bold bg-black/30 backdrop-blur-sm px-2 py-1 rounded-md">
                                {restaurant.category || 'Recommended'}
                            </div>
                        </div>
                        
                        <div className="h-[50%] p-4 flex flex-col justify-between">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 line-clamp-1 mb-1">{restaurant.name}</h3>
                                <p className="text-xs text-gray-500 mb-2 line-clamp-2">Known for great {restaurant.category} and quick service.</p>
                                <div className="text-xs text-gray-500 font-medium">{restaurant.distance} mi away</div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-auto">
                                <span className="text-violet-600 text-xs font-bold">98% Match</span>
                                <div className="h-6 w-6 rounded-full bg-gray-50 p-0.5 border border-gray-100">
                                    <img src={getLogoUrl(restaurant.name)} className="w-full h-full object-contain rounded-full" alt="" />
                                </div>
                            </div>
                        </div>
                     </div>
                ))}
            </div>
          </div>
      )}

      {/* --- MAIN RESULTS GRID --- */}
      <div>
        <div className="flex items-end justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {dashboardSearch ? (
                    <><span>🔍</span> Results for "{dashboardSearch}"</>
                ) : (
                    activeCategory ? <><span>🍽️</span> {activeCategory} Places</> : <><span>📍</span> Nearby Favorites</>
                )}
            </h2>
            
            {!activeCategory && !dashboardSearch && (
                <button onClick={() => setView('explorer')} className="text-xs font-bold text-gray-400 hover:text-violet-600 transition-colors flex items-center gap-1 group">
                    View All <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
            )}
        </div>

        {loading ? (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-50 rounded-2xl animate-pulse"></div>)}
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
             
             {finalResults.length === 0 && (
                 <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                    <p className="text-gray-400 font-medium">No places found.</p>
                    <button onClick={() => {setActiveCategory(null); setDashboardSearch('')}} className="text-violet-600 text-sm font-bold hover:underline mt-1">Clear Filters</button>
                 </div>
             )}

             {finalResults.map((restaurant) => (
                <div 
                    key={restaurant.id} 
                    onClick={() => onOpenMenu(restaurant)}
                    className="bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_2px_8px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgb(0,0,0,0.06)] hover:border-violet-100 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
                >
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-white p-1 shadow-sm border border-gray-100 group-hover:scale-105 transition-transform">
                               <img 
                                    src={getLogoUrl(restaurant.name)} 
                                    alt={restaurant.name}
                                    className="w-full h-full object-contain rounded-full"
                                    onError={(e) => e.target.style.display = 'none'}
                               />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 group-hover:text-violet-700 transition-colors">
                                    {restaurant.name}
                                </h3>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                    <span>{restaurant.category || "Restaurant"}</span>
                                    <span className="text-gray-300">•</span>
                                    <span>{restaurant.distance} mi</span>
                                </div>
                            </div>
                        </div>
                        <span className="flex items-center gap-1 bg-gray-50 text-gray-700 px-2 py-1 rounded-md text-[10px] font-bold">
                            ★ {restaurant.rating || "New"}
                        </span>
                    </div>

                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                         {restaurant.verified ? (
                             <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                Verified Safe
                            </span>
                         ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                High Rating
                             </span>
                         )}
                    </div>
                </div>
             ))}
           </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;