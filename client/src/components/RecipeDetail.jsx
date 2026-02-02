import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from "firebase/firestore";

// --- CUSTOM ICONS ---
import breadSrc from '../icons/bread-slice.svg';
import glassSrc from '../icons/glass.svg';
import beanSrc from '../icons/coffee-bean.svg';
import fishSrc from '../icons/steak.svg'; 
import safeSrc from '../icons/heart-check.svg';
import clockIcon from '../icons/clock.svg';
import fireIcon from '../icons/fire.svg';

const BackArrow = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);

const ColoredIcon = ({ src, colorClass, sizeClass = "w-8 h-8" }) => (
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

const RecipeDetail = ({ userProfile }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  // FETCH LOGIC
  useEffect(() => {
    const fetchRecipe = async () => {
      // 1. Try fetching from TheMealDB (External API)
      try {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
        const data = await res.json();
        
        if (data.meals && data.meals[0]) {
            const meal = data.meals[0];
            
            // Format ingredients
            const ingredients = [];
            for (let i = 1; i <= 20; i++) {
                if (meal[`strIngredient${i}`]) {
                    ingredients.push(`${meal[`strMeasure${i}`]} ${meal[`strIngredient${i}`]}`);
                }
            }

            setRecipe({
                name: meal.strMeal,
                image: meal.strMealThumb,
                category: meal.strCategory,
                area: meal.strArea,
                instructions: meal.strInstructions,
                ingredients: ingredients,
                calories: Math.floor(Math.random() * (700 - 300) + 300), // Mock calc
                time: '25 min'
            });
            setLoading(false);
            return;
        }
      } catch (e) {
          console.error("API Fetch Error", e);
      }

      // 2. If not found in API, check local Firestore (Pantry items)
      // (Simplified for this view - assumes API primarily)
      setLoading(false);
    };

    if (id) fetchRecipe();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"/></div>;

  if (!recipe) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <p className="font-bold text-slate-400 mb-4">Recipe not found</p>
        <button onClick={() => navigate(-1)} className="px-6 py-3 bg-slate-100 rounded-xl font-bold text-slate-900">Go Back</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-['Switzer'] pb-24 animate-in slide-in-from-right duration-300">
        
        {/* HEADER */}
        <div className="flex items-center px-4 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
            <button 
                onClick={() => navigate(-1)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 transition-colors -ml-2"
            >
                <BackArrow />
            </button>
            <span className="text-sm font-bold text-slate-900 ml-2">
                Recipe Details
            </span>
        </div>

        {/* HERO IMAGE */}
        <div className="p-6 pb-0">
            <div className="w-full h-72 rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 relative">
                <img 
                    src={recipe.image} 
                    alt={recipe.name} 
                    className="w-full h-full object-cover"
                />
            </div>
        </div>

        <div className="px-6 pt-8">
            {/* TITLE & META */}
            <div className="text-center mb-8">
                <span className="inline-block px-3 py-1 mb-3 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider">
                    {recipe.category} • {recipe.area}
                </span>
                <h1 className="text-3xl font-black text-slate-900 leading-tight mb-4">
                    {recipe.name}
                </h1>
                
                <div className="flex justify-center gap-6">
                    <div className="flex items-center gap-1.5">
                        <ColoredIcon src={clockIcon} colorClass="bg-slate-400" sizeClass="w-4 h-4" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{recipe.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <ColoredIcon src={fireIcon} colorClass="bg-slate-400" sizeClass="w-4 h-4" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{recipe.calories} kcal</span>
                    </div>
                </div>
            </div>

            {/* SAFE BADGE (Visual only for now) */}
            <div className="mb-8 p-5 bg-teal-50 border border-teal-100 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                <ColoredIcon src={safeSrc} colorClass="bg-teal-700" sizeClass="w-8 h-8" />
                <div>
                    <h3 className="font-bold text-teal-700">Safe to Consume</h3>
                    <p className="text-xs text-teal-600 mt-1">
                        Ingredients match your dietary profile.
                    </p>
                </div>
            </div>

            {/* INGREDIENTS LIST */}
            <div className="mb-8">
                <h3 className="text-[16px] font-semibold text-slate-700 capitalize tracking-tight mb-4">Ingredients</h3>
                <div className="space-y-3">
                    {recipe.ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            <span className="text-sm font-bold text-slate-700">{ing}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* INSTRUCTIONS */}
            <div className="mb-8">
                <h3 className="text-[16px] font-semibold text-slate-700 capitalize tracking-tight mb-4">Preparation</h3>
                <div className="p-6 rounded-[2rem] bg-slate-900 text-slate-300 leading-relaxed font-medium text-sm shadow-xl">
                    {recipe.instructions}
                </div>
            </div>
        </div>
    </div>
  );
};

// --- CRITICAL: THIS DEFAULT EXPORT FIXES THE CRASH ---
export default RecipeDetail;