import React from 'react';
import { Clock, Plus } from '@phosphor-icons/react';

export function Feed({ items, onAdd }) {
  if (items.length === 0) return <div className="text-center text-gray-400 mt-10 font-bold">No items found in database.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
      {items.map(item => (
        <div key={item.id} className="bg-white p-4 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all border border-indigo-50 flex flex-col h-full group cursor-default">
          <div className="h-40 w-full rounded-2xl overflow-hidden relative mb-4 bg-indigo-50">
            <img src={item.img_url || 'https://placehold.co/400x300'} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            {item.type === 'recipe' && (
              <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm text-[#1E1B4B]">
                <Clock weight="bold" className="text-[#8B5CF6]" /> 20 min
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-bold text-lg text-[#1E1B4B] leading-tight">{item.name}</h4>
              <span className="bg-[#F5F3FF] text-[#1E1B4B] text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">{item.type}</span>
            </div>
            
            <p className="text-xs text-gray-400 font-bold mb-4">{item.brand || 'Homemade'}</p>
            
            <div className="mt-auto flex items-center justify-between">
               <div className="text-2xl font-black text-[#1E1B4B]">
                {item.cals} <span className="text-xs font-bold text-gray-400 align-middle">kcal</span>
              </div>
              <button 
                onClick={() => onAdd(item)}
                className="bg-[#1E1B4B] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#8B5CF6] active:scale-95 transition-all shadow-lg flex items-center gap-2"
              >
                <Plus weight="bold" /> Add
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}