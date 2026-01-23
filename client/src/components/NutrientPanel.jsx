import React from 'react';
import { X } from '@phosphor-icons/react';

export function NutrientPanel({ log, isOpen, onRemove, closeMobile }) {
  // Goals (Hardcoded for MVP)
  const goals = { cals: 2200, p: 150, c: 200, f: 65 };

  // Calculate Totals
  const totals = log.reduce((acc, item) => ({
    cals: acc.cals + item.cals,
    p: acc.p + (item.protein || 0),
    c: acc.c + (item.carbs || 0),
    f: acc.f + (item.fat || 0),
  }), { cals: 0, p: 0, c: 0, f: 0 });

  const RingChart = ({ label, value, max, color }) => {
    const radius = 28;
    const circumference = 2 * Math.PI * radius; 
    const percent = Math.min(value / max, 1);
    const offset = circumference - percent * circumference;

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative h-16 w-16">
          <svg className="h-full w-full -rotate-90">
            <circle cx="32" cy="32" r={radius} stroke="#F5F3FF" strokeWidth="6" fill="transparent" />
            <circle 
              cx="32" cy="32" r={radius} 
              stroke={color} strokeWidth="6" fill="transparent" 
              strokeDasharray={circumference} 
              strokeDashoffset={offset} 
              strokeLinecap="round" 
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col leading-none">
            <span className="text-[10px] font-bold text-gray-400">{label}</span>
          </div>
        </div>
        <span className="text-sm font-black text-[#1E1B4B]">{Math.round(value)}g</span>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={closeMobile}
      />

      <aside className={`
        fixed inset-y-0 right-0 w-full sm:w-96 lg:w-80 bg-white border-l border-indigo-50 shadow-2xl z-50 flex flex-col
        transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:shadow-none
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="p-6 border-b border-indigo-50 flex justify-between items-center">
          <h2 className="text-lg font-black text-[#1E1B4B]">Daily Intake</h2>
          <button onClick={closeMobile} className="lg:hidden p-2 bg-gray-100 rounded-full"><X weight="bold"/></button>
          <span className="hidden lg:block text-xs font-bold text-gray-400">TODAY</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-3 gap-2">
            <RingChart label="PRO" value={totals.p} max={goals.p} color="#8B5CF6" />
            <RingChart label="CARB" value={totals.c} max={goals.c} color="#F59E0B" />
            <RingChart label="FAT" value={totals.f} max={goals.f} color="#1E1B4B" />
          </div>

          <div className="bg-[#F5F3FF] p-4 rounded-2xl border border-indigo-50/50">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase">Calories</span>
                <span className="text-xs font-bold text-[#8B5CF6]">{totals.cals} / {goals.cals}</span>
             </div>
             <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#1E1B4B] transition-all duration-700" 
                  style={{ width: `${Math.min((totals.cals/goals.cals)*100, 100)}%` }}
                ></div>
             </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Today's Log</h3>
            <div className="space-y-3">
              {log.length === 0 ? (
                <div className="text-center py-6 text-gray-300 text-xs italic">Your plate is empty</div>
              ) : (
                log.map((item) => (
                  <div key={item.log_id || Math.random()} className="flex items-center justify-between text-sm bg-[#F5F3FF] p-3 rounded-2xl border border-indigo-50/50 group">
                    <span className="font-bold text-[#1E1B4B] truncate max-w-[140px]">{item.name}</span>
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-400 text-xs">{item.cals}</span>
                        <button 
                          onClick={() => onRemove(item.log_id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <X weight="bold"/>
                        </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}