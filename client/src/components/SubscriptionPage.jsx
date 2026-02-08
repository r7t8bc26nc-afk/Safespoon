import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase'; 

const NeuButton = ({ children, onClick, disabled, variant = "primary" }) => {
  const base = "w-full py-4 border-4 border-black font-black uppercase tracking-widest transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed";
  const colors = variant === 'primary' ? "bg-[#FFD700] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" : "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
  return <button onClick={onClick} disabled={disabled} className={`${base} ${colors}`}>{children}</button>;
};

export const SubscriptionPage = ({ userProfile }) => {
  const [billingCycle, setBillingCycle] = useState('yearly'); 
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;
  const price = billingCycle === 'yearly' ? 19.99 : 2.99;

  const handlePurchase = async () => {
    setLoading(true);
    try {
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
            isPremium: true,
            subscriptionStatus: 'active',
            subscriptionPlan: billingCycle,
            subscriptionRenews: new Date(Date.now() + (billingCycle === 'yearly' ? 31536000000 : 2592000000))
        });
        navigate('/');
      }
    } catch (error) { alert("ERROR"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-black pb-12 pt-6">
    

      <div className="px-6 max-w-lg mx-auto">
        <div className="text-center mb-10">
            <h1 className="text-5xl font-black uppercase leading-[0.85] mb-4">Unlock<br/>Limits</h1>
            <p className="text-sm font-bold font-mono bg-black text-white inline-block px-2 py-1">UNLIMITED SCANS • MACRO DATA • MEAL PLANS</p>
        </div>

        {userProfile?.isPremium ? (
             <div className="bg-[#E0E7FF] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
                <h2 className="text-3xl font-black uppercase mb-2">Pro Member</h2>
                <p className="font-mono font-bold text-sm mb-8">RENEWS: {userProfile.subscriptionRenews?.toDate().toLocaleDateString()}</p>
                <NeuButton variant="secondary" onClick={() => alert("MANAGE VIA STORE")}>Manage Subscription</NeuButton>
             </div>
        ) : (
            <>
                <div className="flex gap-4 mb-8">
                    <button onClick={() => setBillingCycle('monthly')} className={`flex-1 py-4 border-4 border-black font-black uppercase transition-all ${billingCycle === 'monthly' ? 'bg-black text-white' : 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>Monthly</button>
                    <button onClick={() => setBillingCycle('yearly')} className={`flex-1 py-4 border-4 border-black font-black uppercase transition-all relative ${billingCycle === 'yearly' ? 'bg-black text-white' : 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
                        Yearly
                        <div className="absolute -top-3 -right-2 bg-[#FF3B30] text-white text-[10px] font-black px-2 py-1 border-2 border-black">-45%</div>
                    </button>
                </div>

                <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8">
                    <div className="text-center border-b-4 border-black pb-6 mb-6">
                        <div className="flex items-baseline justify-center gap-1"><span className="text-6xl font-black tracking-tighter">${price}</span><span className="text-xl font-bold font-mono text-gray-500">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span></div>
                        <p className="font-bold font-mono text-xs text-gray-400 mt-2 uppercase">{billingCycle === 'yearly' ? 'BILLED ONCE' : 'CANCEL ANYTIME'}</p>
                    </div>
                    <div className="space-y-4 mb-8">
                        {["Unlimited AI Scans", "Macro Breakdown", "Health Alerts", "Meal Prep Guides"].map(t => (
                            <div key={t} className="flex items-center gap-4"><div className="w-6 h-6 bg-[#FFD700] border-2 border-black flex items-center justify-center flex-shrink-0 font-bold text-xs">✓</div><span className="font-bold text-sm uppercase tracking-wide">{t}</span></div>
                        ))}
                    </div>
                    <NeuButton variant="primary" onClick={handlePurchase} disabled={loading}>{loading ? 'PROCESSING...' : 'START PLAN'}</NeuButton>
                </div>
            </>
        )}
      </div>
    </div>
  );
};