'use client';
import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';

// --- MOCK DATABASE ---
const RESTAURANT_DATA = {
  "McDonald's": [
    { name: "Big Mac", allergens: ["Gluten", "Dairy", "Soy", "Egg"], type: "Burger" },
    { name: "French Fries", allergens: ["Wheat"], type: "Side" },
    { name: "Apple Slices", allergens: [], type: "Side" },
    { name: "Coca-Cola", allergens: [], type: "Drink" }
  ],
  "Chipotle": [
    { name: "Chicken Bowl", allergens: [], type: "Bowl" },
    { name: "Flour Tortilla", allergens: ["Gluten"], type: "Base" },
    { name: "Guacamole", allergens: [], type: "Side" }
  ]
};

export default function Dashboard() {
  const [allergies, setAllergies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);

  // Load the REAL user profile
  useEffect(() => {
    const saved = localStorage.getItem('userAllergies');
    if (saved) setAllergies(JSON.parse(saved));
  }, []);

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    // Exact match for demo
    if (RESTAURANT_DATA[term]) {
      const safeItems = RESTAURANT_DATA[term].filter(item => {
        // FILTER LOGIC: If item has any allergen that matches user's list, remove it.
        return !item.allergens.some(a => allergies.includes(a));
      });
      setResults(safeItems);
    } else {
      setResults([]);
    }
  };

  return (
    <main className="min-h-screen p-6 pb-24">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">SafeSpoon</h1>
        <div className="flex -space-x-2 overflow-hidden">
             {/* Tiny visualization of user profile */}
            {allergies.length > 0 ? (
                <span className="bg-[#0D9488]/10 text-[#0D9488] text-[10px] font-bold px-2 py-1 rounded-full border border-[#0D9488]/20">
                    Avoids {allergies.length} items
                </span>
            ) : (
                <span className="text-slate-400 text-xs">No restrictions</span>
            )}
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative mb-8">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search (e.g. McDonald's)..." 
          className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 shadow-sm focus:outline-none focus:border-[#0D9488]"
          onChange={handleSearch}
        />
      </div>

      {/* RESULTS */}
      <div className="space-y-3">
        {results.map((item, index) => (
          <div key={index} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-[#84CC16] flex justify-between">
            <span className="font-bold text-[#0F172A]">{item.name}</span>
            <span className="text-xs text-slate-400 uppercase mt-1">{item.type}</span>
          </div>
        ))}
        
        {searchTerm && results.length === 0 && (
          <p className="text-center text-slate-400 text-sm mt-10">
            No safe items found (or restaurant unknown).
          </p>
        )}
      </div>
    </main>
  );
}