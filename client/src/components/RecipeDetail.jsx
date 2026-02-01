import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import { Helmet } from "react-helmet"; 

// --- SHARED ASSETS (Matching RestaurantMenu styling) ---
import breadSrc from '../icons/bread-slice.svg';
import glassSrc from '../icons/glass.svg';
import beanSrc from '../icons/coffee-bean.svg';
import fishSrc from '../icons/steak.svg'; 
import safeSrc from '../icons/heart-check.svg';

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
    }}
  />
);

export const RecipeDetail = ({ userProfile }) => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchDetails = async () => {
        setLoading(true);
        try {
            const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
            const data = await res.json();
            if (data.meals) {
                const m = data.meals[0];
                const ingredients = [];
                for (let i = 1; i <= 20; i++) {
                    const ing = m[`strIngredient${i}`];
                    const measure = m[`strMeasure${i}`];
                    if (ing && ing.trim()) ingredients.push(`${measure || ''} ${ing}`.trim());
                }
                setRecipe({
                    id: m.idMeal,
                    name: m.strMeal,
                    image: m.strMealThumb,
                    category: m.strCategory,
                    instructions: m.strInstructions ? m.strInstructions.split(/\n\s*\n/).filter(c => c.length > 5) : [],
                    ingredients,
                    // Simple heuristic for allergen detection in recipes
                    allergens: {
                        wheat: ingredients.some(i => i.toLowerCase().match(/flour|bread|wheat|pasta/)),
                        milk: ingredients.some(i => i.toLowerCase().match(/milk|cream|butter|cheese/)),
                        soy: ingredients.some(i => i.toLowerCase().match(/soy|tofu|edamame/)),
                        shellfish: ingredients.some(i => i.toLowerCase().match(/shrimp|prawn|crab|lobster/))
                    }
                });
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    };
    if (id) fetchDetails();
  }, [id]);

  // --- ANALYSIS ENGINE (Mirrored from RestaurantMenu.jsx) ---
  const analysis = useMemo(() => {
    if (!recipe || !userProfile) return null;
    const issues = [];
    let status = 'safe';

    const userAllergens = userProfile.allergens || {};
    const recipeAllergens = recipe.allergens || {};
    
    // 1. Critical Allergens
    const detectedAllergens = Object.keys(userAllergens).filter(
      key => userAllergens[key] && recipeAllergens[key]
    );

    if (detectedAllergens.length > 0) {
      status = 'unsafe';
      detectedAllergens.forEach(allergen => {
        issues.push({
          title: `Contains ${allergen}`,
          message: `This recipe utilizes ${allergen}. Based on your medical profile, this is strictly unsafe.`,
          severity: 'critical'
        });
      });
    }

    // 2. Lifestyle Conflicts (Vegan/Keto)
    const lifestyle = userProfile.lifestyle || {};
    if (lifestyle.isVegan && ['Beef', 'Chicken', 'Pork', 'Seafood'].includes(recipe.category)) {
        status = status === 'unsafe' ? 'unsafe' : 'warning';
        issues.push({
            title: 'Not Plant-Based',
            message: `This recipe is categorized under '${recipe.category}', which conflicts with your Vegan lifestyle.`,
            severity: 'warning'
        });
    }

    return { status, issues };
  }, [recipe, userProfile]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-slate-200 border-t-black rounded-full animate-spin"></div></div>;
  if (!recipe) return <div className="p-10 text-center font-bold">Recipe not found</div>;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-right duration-300">
        <Helmet><title>{recipe.name} | Safespoon</title></Helmet>

        {/* STICKY HEADER */}
        <div className="flex items-center px-4 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 transition-colors -ml-2">
                <BackArrow />
            </button>
            <span className="text-sm font-bold text-slate-900 ml-2">Recipe Details</span>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 pb-32">
            
            {/* HERO SECTION */}
            <div className="mb-8">
                <div className="aspect-[16/10] w-full rounded-3xl overflow-hidden bg-slate-100 mb-6 shadow-sm">
                    <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
                </div>
                <div className="text-center">
                    <span className="inline-block px-3 py-1 mb-3 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider">
                        {recipe.category}
                    </span>
                    <h2 className="text-3xl font-black text-slate-900 leading-tight mb-2">{recipe.name}</h2>
                </div>
            </div>

            {/* SAFETY ANALYSIS REPORT (Matching RestaurantMenu) */}
            {analysis && analysis.issues.length > 0 ? (
                <div className="flex flex-col gap-3 mb-8">
                    {analysis.issues.map((issue, i) => (
                        <div key={i} className={`p-5 rounded-2xl border ${issue.severity === 'critical' ? 'bg-red-50 border-red-100 text-red-900' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${issue.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}>
                                    {issue.severity === 'critical' ? '!' : '?'}
                                </div>
                                <h3 className="font-bold uppercase tracking-wide text-xs">
                                    {issue.severity === 'critical' ? 'Strictly Avoid' : 'Lifestyle Conflict'}
                                </h3>
                            </div>
                            <h4 className="font-bold text-lg leading-tight mb-1">{issue.title}</h4>
                            <p className="text-sm opacity-90 leading-relaxed">{issue.message}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="mb-8 p-5 bg-teal-50 border border-teal-100 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                    <ColoredIcon src={safeSrc} colorClass="bg-teal-800" sizeClass="w-8 h-8" />
                    <h3 className="font-bold text-teal-800">Safe to Prepare</h3>
                    <p className="text-xs text-teal-600">This recipe matches your medical profile and dietary preferences.</p>
                </div>
            )}

            {/* SAFETY BADGES GRID */}
            <div className="grid grid-cols-2 gap-4 mb-10">
                <SafetyBadge label="Wheat" icon={breadSrc} detected={recipe.allergens.wheat} isUserAllergen={userProfile?.allergens?.wheat} />
                <SafetyBadge label="Dairy" icon={glassSrc} detected={recipe.allergens.milk} isUserAllergen={userProfile?.allergens?.dairy} />
                <SafetyBadge label="Soy" icon={beanSrc} detected={recipe.allergens.soy} isUserAllergen={userProfile?.allergens?.soy} />
                <SafetyBadge label="Shellfish" icon={fishSrc} detected={recipe.allergens.shellfish} isUserAllergen={userProfile?.allergens?.shellfish} />
            </div>

            {/* INGREDIENTS LIST */}
            <div className="mb-10">
                <h3 className="text-[16px] font-semibold text-slate-700 capitalize tracking-tight mb-3">Ingredients</h3>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                    <ul className="flex flex-col gap-3">
                        {recipe.ingredients.map((ing, i) => (
                            <li key={i} className="text-slate-600 font-medium text-lg leading-relaxed lowercase border-b border-slate-200/50 pb-2 last:border-0 last:pb-0">
                                {ing}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* DIRECTIONS */}
            <div className="mb-10">
                <h3 className="text-[16px] font-semibold text-slate-700 capitalize tracking-tight mb-3">Preparation</h3>
                <div className="flex flex-col gap-6">
                    {recipe.instructions.map((step, i) => (
                        <div key={i} className="flex gap-4">
                            <span className="text-2xl font-black text-slate-200 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                            <p className="text-slate-500 font-medium text-lg leading-relaxed tracking-tight">{step}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* STICKY CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-sm border-t border-slate-100 z-20">
            <button className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all">
                Mark as Cooked
            </button>
        </div>
    </div>
  );
};

const SafetyBadge = ({ label, icon, detected, isUserAllergen }) => {
    let containerStyle = "bg-slate-50 border-transparent opacity-50 grayscale";
    let textClass = "text-slate-400";
    let iconColor = "bg-slate-400";

    if (detected) {
        if (isUserAllergen) {
             containerStyle = "bg-white border-red-200 shadow-sm ring-2 ring-red-100";
             textClass = "text-red-600";
             iconColor = "bg-red-500";
        } else {
             containerStyle = "bg-yellow-100 border-yellow-200";
             textClass = "text-yellow-500";
             iconColor = "bg-yellow-500";
        }
    }

    return (
        <div className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${containerStyle}`}>
            <div className="mb-2 relative">
                <ColoredIcon src={icon} colorClass={iconColor} sizeClass="w-8 h-8" />
                {detected && <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${isUserAllergen ? 'bg-red-500' : 'bg-slate-400'}`}></div>}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider ${textClass}`}>
                {detected ? `${label} Detected` : label}
            </span>
        </div>
    );
};