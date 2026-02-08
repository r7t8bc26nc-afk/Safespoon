import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from "firebase/firestore"; // Changed to onSnapshot for realtime updates
import { db } from '../firebase'; 

// --- ICONS ---
import scannerIcon from '../icons/scanner.svg';
import searchIcon from '../icons/search.svg';
import foodTrayIcon from '../icons/food-tray-filled.svg'; 
import chartIcon from '../icons/chart-line.svg'; 
import userIcon from '../icons/user.svg';
import sunIcon from '../icons/sun.svg'; // Assuming you might have a sun/moon icon, otherwise use text

// --- UTILS ---
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

// --- NEUBRUTALIST COMPONENTS ---

// 1. The "Big Action" Button (For Scan/Search)
const PrimaryActionButton = ({ label, icon, color, onClick }) => (
  <button 
    onClick={onClick}
    className={`
      flex-1 aspect-[4/3] p-4 flex flex-col items-center justify-center gap-3
      border-4 border-black 
      shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] 
      active:shadow-none active:translate-x-[2px] active:translate-y-[2px] 
      transition-all duration-150
      ${color}
    `}
  >
     <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center rounded-full">
        <ColoredIcon src={icon} colorClass="bg-black" sizeClass="w-5 h-5" />
     </div>
     <span className="font-black uppercase text-lg tracking-tight leading-none text-center">{label}</span>
  </button>
);

// 2. The "Menu Link" (For Navigation)
const MenuLink = ({ label, subLabel, icon, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full p-5 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-between group mb-4 last:mb-0"
  >
    <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-100 border-2 border-black flex items-center justify-center shrink-0">
            <ColoredIcon src={icon} colorClass="bg-black" sizeClass="w-6 h-6" />
        </div>
        <div className="text-left">
            <h3 className="text-lg font-black uppercase tracking-tight group-hover:underline decoration-2">{label}</h3>
            <p className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest">{subLabel}</p>
        </div>
    </div>
    <div className="text-2xl font-black">→</div>
  </button>
);

const Dashboard = ({ profile, setIsSearching }) => {
  const navigate = useNavigate();
  const [caloriesToday, setCaloriesToday] = useState(0);
  const [greeting, setGreeting] = useState('HELLO');
  const [dateString, setDateString] = useState('');

  // 1. Time & Date Logic
  useEffect(() => {
    const updateTime = () => {
        const now = new Date();
        const hours = now.getHours();
        
        if (hours < 12) setGreeting('GOOD MORNING');
        else if (hours < 18) setGreeting('GOOD AFTERNOON');
        else setGreeting('GOOD EVENING');

        setDateString(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
    };
    
    updateTime();
    const timer = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // 2. Calorie Calculation (Real-time)
  useEffect(() => {
    if (profile?.dailyIntake) {
      const today = new Date().toISOString().split('T')[0];
      const total = profile.dailyIntake
        .filter(i => i.timestamp && i.timestamp.startsWith(today))
        .reduce((acc, curr) => acc + (parseInt(curr.calories?.amount) || 0), 0);
      setCaloriesToday(total);
    }
  }, [profile]);

  return (
    <div className="flex flex-col gap-8 font-sans text-black pb-12">
      
      {/* SECTION 1: GREETING (Acts as the 'Header') */}
      <section>
          <div className="inline-block bg-black text-white px-3 py-1 mb-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
             <span className="text-xs font-bold uppercase tracking-widest">{dateString}</span>
          </div>
          <h1 className="text-5xl font-black uppercase leading-[0.9] tracking-tighter">
            {greeting},<br/>
            <span className="text-gray-400">{profile?.firstName || 'FRIEND'}.</span>
          </h1>
      </section>
      
      {/* SECTION 2: STATUS CARD (High Visibility) */}
      <section className="bg-[#E0E7FF] border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative">
         <div className="flex justify-between items-start mb-4">
             <h2 className="text-sm font-black uppercase tracking-widest bg-white border-2 border-black px-2 py-1">Today's Energy</h2>
             <div className="text-right">
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-60">Goal</span>
                <span className="block text-xl font-black">{profile?.calorieGoal || 2000}</span>
             </div>
         </div>
         
         <div className="flex items-baseline gap-2 mb-2">
            <span className="text-[5rem] font-black tracking-tighter leading-none">{caloriesToday}</span>
            <span className="text-xl font-black uppercase tracking-tight opacity-50">kcal</span>
         </div>
         
         {/* Progress Bar */}
         <div className="w-full h-6 border-4 border-black bg-white p-0.5">
             <div 
                className="h-full bg-black transition-all duration-500 ease-out" 
                style={{ width: `${Math.min((caloriesToday / (profile?.calorieGoal || 2000)) * 100, 100)}%` }} 
             />
         </div>
      </section>

      {/* SECTION 3: PRIMARY INPUTS (Side-by-Side) */}
      <section>
          <div className="flex items-center gap-2 mb-3">
             <div className="w-2 h-2 bg-black rounded-full"></div>
             <h2 className="text-sm font-black uppercase tracking-widest">Log Your Meal</h2>
          </div>
          
          <div className="flex gap-4">
              <PrimaryActionButton 
                label="Scan Barcode" 
                icon={scannerIcon} 
                color="bg-[#FFD700]" // Yellow for primary
                onClick={() => navigate('/scanner')} 
              />
              <PrimaryActionButton 
                label="Type Search" 
                icon={searchIcon} 
                color="bg-white" 
                onClick={() => setIsSearching(true)} 
              />
          </div>
      </section>

      {/* SECTION 4: MANAGEMENT (Vertical Stack) */}
      <section>
          <div className="flex items-center gap-2 mb-3">
             <div className="w-2 h-2 bg-black rounded-full"></div>
             <h2 className="text-sm font-black uppercase tracking-widest">My Records</h2>
          </div>

          <div className="flex flex-col">
              <MenuLink 
                label="My Food Log" 
                subLabel="View History & Trends" 
                icon={foodTrayIcon} 
                onClick={() => navigate('/meal-hub')} 
              />
              
              <MenuLink 
                label="Smart Planner" 
                subLabel="Weekly Suggestions & Costs" 
                icon={chartIcon} 
                onClick={() => navigate('/planner')} 
              />

              {/* Since we removed the header button, Settings lives here now */}
              <MenuLink 
                label="Profile Settings" 
                subLabel="Diet, Goals & Account" 
                icon={userIcon} 
                onClick={() => navigate('/account')} 
              />
          </div>
      </section>

    </div>
  );
};

export default Dashboard;