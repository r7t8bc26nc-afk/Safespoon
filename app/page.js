// app/page.js
'use client';
import { useState } from 'react';

// --- MOCK DATABASE ---
const RESTAURANT_DATA = {
  "mcdonalds": [
    { name: "Big Mac", allergens: ["Gluten", "Dairy", "Soy", "Egg"] },
    { name: "Quarter Pounder (No Bun)", allergens: ["Dairy", "Soy"] },
    { name: "French Fries", allergens: ["Wheat"] },
    { name: "Apple Slices", allergens: [] },
    { name: "Coca-Cola", allergens: [] }
  ],
  "chipotle": [
    { name: "Chicken Bowl", allergens: [] },
    { name: "Flour Tortilla", allergens: ["Gluten"] },
    { name: "Guacamole", allergens: [] },
    { name: "Steak", allergens: [] }
  ]
};

export default function Home() {
  const [avoid, setAvoid] = useState(["Gluten", "Dairy"]); 
  const [results, setResults] = useState(null);
  const [inputValue, setInputValue] = useState("");

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setInputValue(term);

    // Find Restaurant Key
    const matchKey = Object.keys(RESTAURANT_DATA).find(k => k.includes(term));

    if (matchKey && term.length > 2) {
      // Filter Logic
      const safeItems = RESTAURANT_DATA[matchKey].filter(item => 
        !item.allergens.some(allergen => avoid.includes(allergen))
      );
      setResults(safeItems);
    } else {
      setResults(null);
    }
  };

  const toggleAllergy = (allergen) => {
    setAvoid(prev => 
      prev.includes(allergen) ? prev.filter(a => a !== allergen) : [...prev, allergen]
    );
    // Reset search on toggle so user doesn't see stale data
    setResults(null);
    setInputValue("");
  };

  return (
    <main>
      
      {/* 1. FILTER TOGGLES */}
      <div className="toggle-container">
        {["Gluten", "Dairy", "Peanuts", "Soy", "Egg"].map(allergen => (
          <button 
            key={allergen}
            onClick={() => toggleAllergy(allergen)}
            className={`toggle-btn ${avoid.includes(allergen) ? 'active' : ''}`}
          >
            {avoid.includes(allergen) ? "NO " : ""} {allergen}
          </button>
        ))}
      </div>

      {/* 2. SEARCH INPUT */}
      <div className="input-wrapper">
        <input 
          autoFocus
          type="text" 
          value={inputValue}
          placeholder="Type a restaurant..." 
          className="main-input"
          onChange={handleSearch}
        />
      </div>

      {/* 3. RESULTS */}
      {results && (
        <ul className="results-list">
          {results.length > 0 ? results.map((item, i) => (
            <li key={i} className="result-item">
              {item.name}
              <span className="badge-safe">Safe</span>
            </li>
          )) : (
            <li className="error-msg">
              Nothing matches your profile.
            </li>
          )}
        </ul>
      )}

    </main>
  );
}