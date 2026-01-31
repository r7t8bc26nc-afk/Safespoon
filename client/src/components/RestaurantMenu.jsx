import React, { useMemo } from 'react';

// --- CUSTOM ICONS (Imported as URLs) ---
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

// --- HELPER: COLORED ICON (ROBUST SAFARI FIX) ---
// Uses explicit Webkit properties and quoted URLs to ensure 
// masks render correctly on iOS/Safari.
const ColoredIcon = ({ src, colorClass, sizeClass = "w-8 h-8" }) => (
  <div 
    className={`${sizeClass} ${colorClass}`}
    style={{
      // 1. Webkit prefix (Critical for Safari/iOS)
      WebkitMaskImage: `url("${src}")`,
      WebkitMaskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',

      // 2. Standard syntax
      maskImage: `url("${src}")`,
      maskSize: 'contain',
      maskRepeat: 'no-repeat',
      maskPosition: 'center',
    }}
  />
);

const RestaurantMenu = ({ restaurant, onBack, userProfile }) => {
  const item = restaurant;
  
  // --- ANALYSIS LOGIC ---
  const analysis = useMemo(() => {
    if (!item || !userProfile) return null;

    const issues = [];
    let status = 'safe'; // 'safe', 'warning', 'unsafe'

    // 1. ALLERGENS (Medical - High Risk)
    const userAllergens = userProfile.allergens || {};
    const itemAllergens = item.safetyProfile?.allergens || {};
    
    // Check for direct allergen matches
    const detectedAllergens = Object.keys(userAllergens).filter(
      key => userAllergens[key] && itemAllergens[key]
    );

    if (detectedAllergens.length > 0) {
      status = 'unsafe';
      detectedAllergens.forEach(allergen => {
        issues.push({
          type: 'allergen',
          title: `Contains ${allergen}`,
          message: `This item lists ${allergen} as an ingredient. Based on your medical profile, this is strictly unsafe for you to ingest.`,
          severity: 'critical'
        });
      });
    }

    // 2. LIFESTYLE (Dietary Preferences - Medium Risk)
    const lifestyle = userProfile.lifestyle || {};
    const category = (item.taxonomy?.category || '').toLowerCase();
    const macros = item.macros || {};

    // KETO CHECK
    if (lifestyle.isKeto) {
        const carbs = macros.carbs || 0;
        if (carbs > 10) {
            status = status === 'unsafe' ? 'unsafe' : 'warning';
            issues.push({
                type: 'lifestyle',
                title: 'High Carb Content',
                message: `This item contains ${carbs}g of carbohydrates. This significantly eats into your daily allowance for a strict Keto diet.`,
                severity: 'warning'
            });
        }
    }

    // VEGAN CHECK
    if (lifestyle.isVegan) {
        const animalCategories = ['meat', 'dairy', 'poultry', 'fish', 'seafood', 'cheese', 'yogurt', 'milk', 'egg'];
        if (animalCategories.some(cat => category.includes(cat))) {
             status = status === 'unsafe' ? 'unsafe' : 'warning';
             issues.push({
                type: 'lifestyle',
                title: 'Not Plant-Based',
                message: `This item is categorized under '${item.taxonomy?.category}', which typically indicates animal-derived ingredients.`,
                severity: 'warning'
             });
        }
    }

    // GLUTEN FREE CHECK
    if (lifestyle.isGlutenFree && itemAllergens.wheat) {
         status = 'unsafe';
         issues.push({
            type: 'lifestyle',
            title: 'Contains Gluten',
            message: "This item contains Wheat, which is a primary source of Gluten. It is not suitable for a Gluten-Free diet.",
            severity: 'critical'
         });
    }

    return { status, issues };
  }, [item, userProfile]);


  if (!item) return null;

  // Data Normalization
  const title = (item.name && item.name !== "Unknown") ? item.name : (item.taxonomy?.category || "Unknown Item");
  const brand = item.brand || "Generic Brand";
  const category = item.taxonomy?.category || "Grocery";
  const allergens = item.safetyProfile?.allergens || {};
  const ingredients = item.ingredients || "No ingredient data available.";

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* HEADER */}
        <div className="flex items-center px-4 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
            <button 
                onClick={onBack}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 transition-colors -ml-2"
            >
                <BackArrow />
            </button>
            <span className="text-sm font-bold text-slate-900 ml-2">
                Product Details
            </span>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 pb-24">
            
            {/* PRODUCT HEADER */}
            <div className="mb-8 text-center">
                 <span className="inline-block px-3 py-1 mb-3 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider">
                    {category}
                </span>
                <h2 className="text-3xl font-black text-slate-900 leading-tight mb-2">
                    {title}
                </h2>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                    {brand}
                </p>
            </div>

            {/* SAFETY ANALYSIS REPORT */}
            {analysis && analysis.issues.length > 0 ? (
                <div className="flex flex-col gap-3 mb-8">
                    {analysis.issues.map((issue, i) => (
                        <div 
                            key={i} 
                            className={`p-5 rounded-2xl border ${
                                issue.severity === 'critical' 
                                ? 'bg-red-50 border-red-100 text-red-900' 
                                : 'bg-amber-50 border-amber-100 text-amber-900'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                {issue.severity === 'critical' ? (
                                    <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">!</div>
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">?</div>
                                )}
                                <h3 className="font-bold uppercase tracking-wide text-xs">
                                    {issue.severity === 'critical' ? 'Strictly Avoid' : 'Lifestyle Conflict'}
                                </h3>
                            </div>
                            
                            <h4 className="font-bold text-lg leading-tight mb-1">{issue.title}</h4>
                            <p className="text-sm opacity-90 leading-relaxed">
                                {issue.message}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                /* SAFE INDICATOR */
                <div className="mb-8 p-5 bg-teal-50 border border-teal-100 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                    {/* UPDATED: Uses ColoredIcon helper with bg-teal-600 */}
                    <ColoredIcon 
                        src={safeSrc} 
                        colorClass="bg-teal-800" 
                        sizeClass="w-8 h-8" 
                    />
                    <div>
                        <h3 className="font-bold text-teal-800">Safe to Consume</h3>
                        <p className="text-xs text-teal-600 mt-1">
                            This item matches your profile and contains no flagged allergens.
                        </p>
                    </div>
                </div>
            )}

            {/* SAFETY BADGES GRID */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <SafetyBadge 
                    label="Wheat" 
                    icon={breadSrc} 
                    detected={allergens.wheat} 
                    isUserAllergen={userProfile?.allergens?.wheat}
                />
                <SafetyBadge 
                    label="Dairy" 
                    icon={glassSrc} 
                    detected={allergens.milk} 
                    isUserAllergen={userProfile?.allergens?.dairy}
                />
                <SafetyBadge 
                    label="Soy" 
                    icon={beanSrc} 
                    detected={allergens.soy} 
                    isUserAllergen={userProfile?.allergens?.soy}
                />
                <SafetyBadge 
                    label="Shellfish" 
                    icon={fishSrc} 
                    detected={allergens.shellfish} 
                    isUserAllergen={userProfile?.allergens?.shellfish}
                />
            </div>

            {/* INGREDIENTS */}
            <div>
                <h3 className="text-[16px] font-semibold text-slate-700 capitalize tracking-tight mb-3">
                    Ingredients
                </h3>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500 leading-relaxed tracking-tight font-medium text-lg">
                    {ingredients.toLowerCase()}
                </div>
            </div>
        </div>
    </div>
  );
};

// --- SUB-COMPONENT FOR BADGES ---
const SafetyBadge = ({ label, icon, detected, isUserAllergen }) => {
    
    // Define Styles
    let containerStyle = "bg-slate-50 border-transparent";
    let textClass = "text-slate-400";
    let iconColor = "bg-slate-400"; // Default Gray Icon

    if (detected) {
        if (isUserAllergen) {
             // DANGER: Detected & Allergic
             containerStyle = "bg-white border-red-200 shadow-sm ring-2 ring-red-100";
             textClass = "text-red-600";
             iconColor = "bg-red-500";
        } else {
             // INFO: Detected but Neutral
             containerStyle = "bg-yellow-100 border-yellow-200";
             textClass = "text-yellow-500";
             iconColor = "bg-yellow-500";
        }
    } else {
        // EMPTY: Not Detected
        containerStyle = "bg-slate-50 border-transparent opacity-50 grayscale";
    }

    return (
        <div className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${containerStyle}`}>
            <div className="mb-2 relative">
                {/* USE COLORED ICON HELPER */}
                <ColoredIcon src={icon} colorClass={iconColor} sizeClass="w-8 h-8" />

                {detected && (
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${isUserAllergen ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                )}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider ${textClass}`}>
                {detected ? `${label} Detected` : label}
            </span>
        </div>
    );
};

export default RestaurantMenu;