import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase'; // Ensure these match your path
import { doc, updateDoc } from 'firebase/firestore';

// --- ICONS ---
const Icons = {
  Check: () => <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>,
  Star: () => <svg className="w-6 h-6 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
  Shield: () => <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  ChevronLeft: () => <svg className="w-6 h-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
};

export const SubscriptionPage = ({ userProfile }) => {
  const [billingCycle, setBillingCycle] = useState('yearly'); // 'monthly' | 'yearly'
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = auth.currentUser;

  // Pricing Logic
  const price = billingCycle === 'yearly' ? 19.99 : 2.99;
  const period = billingCycle === 'yearly' ? 'year' : 'month';
  const savings = billingCycle === 'yearly' ? 'Save 45%' : null;

  // --- ACTIONS ---
  
  const handlePurchase = async () => {
    setLoading(true);
    // TODO: Integrate Stripe/RevenueCat here.
    // For now, we simulate a successful purchase update to Firestore.
    try {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            isPremium: true,
            subscriptionStatus: 'active',
            subscriptionPlan: billingCycle,
            subscriptionRenews: new Date(Date.now() + (billingCycle === 'yearly' ? 31536000000 : 2592000000))
        });
        alert("Welcome to Safespoon Premium!");
        navigate('/');
      }
    } catch (error) {
      console.error("Purchase failed", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleManage = () => {
    // TODO: Redirect to Stripe Customer Portal or App Store Subscription settings
    alert("Redirecting to subscription management...");
  };

  return (
    <div className="min-h-screen bg-gray-50 font-['Switzer'] pb-10">
      
      {/* Header */}
      <div className="pt-safe-top px-4 pb-4 sticky top-0 z-30 bg-gray-50/90 backdrop-blur-md flex items-center">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
            <Icons.ChevronLeft />
        </button>
        <span className="font-bold text-lg text-slate-900 ml-2">Premium</span>
      </div>

      <div className="px-6 max-w-lg mx-auto">
        
        {/* Hero Section */}
        <div className="text-center mb-8 mt-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-sm">
                <Icons.Star />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Unlock Full Access</h1>
            <p className="text-slate-500 font-medium leading-relaxed">
                Get unlimited scanning, advanced nutrition insights, and personalized meal planning.
            </p>
        </div>

        {/* User is ALREADY Premium */}
        {userProfile?.isPremium ? (
             <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icons.Shield />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">You are a Pro Member</h2>
                <p className="text-slate-500 text-sm font-medium mb-6">
                    Your plan renews on {userProfile.subscriptionRenews?.toDate().toLocaleDateString()}
                </p>
                <button 
                    onClick={handleManage}
                    className="w-full py-4 bg-slate-100 text-slate-900 rounded-2xl font-bold text-sm transition-transform active:scale-95"
                >
                    Manage Subscription
                </button>
             </div>
        ) : (
            /* Purchase Flow */
            <>
                {/* Billing Toggle */}
                <div className="bg-white p-1.5 rounded-2xl flex mb-8 shadow-sm border border-slate-100">
                    <button 
                        onClick={() => setBillingCycle('monthly')}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Monthly
                    </button>
                    <button 
                        onClick={() => setBillingCycle('yearly')}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all relative ${billingCycle === 'yearly' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Yearly
                        {/* Savings Badge */}
                        <span className="absolute -top-3 -right-2 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm border-2 border-white">
                            SAVE 45%
                        </span>
                    </button>
                </div>

                {/* Pricing Card */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-50 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
                    
                    <div className="flex items-baseline justify-center gap-1 mb-2">
                        <span className="text-5xl font-black text-slate-900 tracking-tight">${price}</span>
                        <span className="text-lg font-bold text-slate-400">/{period}</span>
                    </div>
                    <p className="text-center text-slate-400 text-sm font-bold mb-8">
                        {billingCycle === 'yearly' ? 'Billed as one payment of $19.99' : 'Cancel anytime'}
                    </p>

                    {/* Features */}
                    <div className="space-y-4 mb-8">
                        <FeatureRow text="Unlimited AI Plate Scanning" />
                        <FeatureRow text="Advanced Macro Tracking" />
                        <FeatureRow text="Medical Condition Alerts" />
                        <FeatureRow text="Exclusive Meal Prep Recipes" />
                    </div>

                    <button 
                        onClick={handlePurchase}
                        disabled={loading}
                        className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : billingCycle === 'yearly' ? 'Start Yearly Plan' : 'Start Monthly Plan'}
                    </button>
                </div>

                <div className="text-center">
                    <button className="text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors">
                        Restore Purchases
                    </button>
                    <p className="text-[10px] text-slate-300 font-medium mt-4 leading-relaxed px-4">
                        Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period.
                    </p>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

// Helper for feature list
const FeatureRow = ({ text }) => (
    <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Icons.Check />
        </div>
        <span className="text-slate-700 font-bold text-sm">{text}</span>
    </div>
);