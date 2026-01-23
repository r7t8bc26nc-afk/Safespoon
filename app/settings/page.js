'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ALLERGENS = ["Gluten", "Dairy", "Peanuts", "Soy", "Egg", "Shellfish"];

export default function SettingsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState([]);

  // Load saved allergies on startup
  useEffect(() => {
    const saved = localStorage.getItem('userAllergies');
    if (saved) setSelected(JSON.parse(saved));
  }, []);

  const toggleAllergen = (allergen) => {
    if (selected.includes(allergen)) {
      setSelected(selected.filter(a => a !== allergen));
    } else {
      setSelected([...selected, allergen]);
    }
  };

  const handleSave = () => {
    localStorage.setItem('userAllergies', JSON.stringify(selected));
    router.push('/dashboard'); // Send them back to search
  };

  return (
    <main className="min-h-screen p-6 pb-24">
      <h1 className="text-2xl font-bold mb-6">My Dietary Profile</h1>
      
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6">
        <h2 className="font-bold text-lg mb-4">What do you avoid?</h2>
        <div className="grid grid-cols-2 gap-3">
          {ALLERGENS.map(allergen => (
            <button
              key={allergen}
              onClick={() => toggleAllergen(allergen)}
              className={`p-4 rounded-xl font-bold text-sm transition-all border ${
                selected.includes(allergen)
                ? 'bg-[#0D9488] text-white border-[#0D9488]'
                : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100'
              }`}
            >
              {allergen}
            </button>
          ))}
        </div>
      </div>

      <button 
        onClick={handleSave}
        className="w-full bg-[#0F172A] text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform"
      >
        Save Profile
      </button>
    </main>
  );
}