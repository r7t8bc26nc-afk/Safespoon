import React from 'react';
import { motion } from 'framer-motion';

export const GuestDashboard = ({ onLogin }) => {
  
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-white font-['Host_Grotesk'] text-slate-900 overflow-x-hidden">
      
      {/* --- HEADER --- */}
      <nav className="flex justify-between items-center px-6 py-6 md:px-12 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <span className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">
            Safespoon
        </span>
        <button 
            onClick={onLogin}
            className="text-sm font-bold text-slate-500 hover:text-violet-600 transition-colors"
        >
            Log In
        </button>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="px-6 pt-12 pb-20 md:text-center max-w-4xl mx-auto">
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }}
        >
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-6">
                Dining out,<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">decoded.</span>
            </h1>
            <p className="text-lg text-slate-400 font-regular leading-relaxed max-w-xl mx-auto mb-10">
                Stop playing Russian Roulette with your menu. Safespoon analyzes restaurant ingredients against your specific health profile instantly.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
                <button 
                    onClick={onLogin}
                    className="h-14 px-8 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    Get Started
                </button>
            </div>
        </motion.div>
      </header>

      {/* --- HOW IT WORKS (STEPS) --- */}
      <section className="px-6 py-16 bg-slate-50 border-t border-b border-slate-100">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <span className="text-xs font-black text-violet-600 uppercase tracking-widest bg-violet-50 px-3 py-1.5 rounded-full border border-violet-100">The Process</span>
                <h2 className="text-3xl font-black mt-4 tracking-tight">How Safespoon protects you</h2>
            </div>

            <motion.div 
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-100px" }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
                {/* Step 1 */}
                <motion.div variants={item} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl font-black text-slate-200 select-none group-hover:scale-110 transition-transform duration-500">1</div>
                    <div className="h-16 w-16 bg-violet-50 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner">🧬</div>
                    <h3 className="text-xl font-bold mb-3">Set Your Profile</h3>
                    <p className="text-slate-500 font-medium leading-relaxed">
                        Input your allergens (nuts, dairy, gluten) and health goals (sodium limits, sugar caps).
                    </p>
                </motion.div>

                {/* Step 2 */}
                <motion.div variants={item} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl font-black text-slate-200 select-none group-hover:scale-110 transition-transform duration-500">2</div>
                    <div className="h-16 w-16 bg-fuchsia-50 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner">🔎</div>
                    <h3 className="text-xl font-bold mb-3">Search or Scan</h3>
                    <p className="text-slate-500 font-medium leading-relaxed">
                        Search any major restaurant chain or grocery item. We pull deep nutritional data directly from the source.
                    </p>
                </motion.div>

                {/* Step 3 */}
                <motion.div variants={item} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl font-black text-slate-200 select-none group-hover:scale-110 transition-transform duration-500">3</div>
                    <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner">✅</div>
                    <h3 className="text-xl font-bold mb-3">Eat with Confidence</h3>
                    <p className="text-slate-500 font-medium leading-relaxed">
                        Get an instant <span className="text-emerald-600 font-bold">Safe</span> or <span className="text-rose-500 font-bold">Unsafe</span> rating based on your unique biological needs.
                    </p>
                </motion.div>
            </motion.div>
        </div>
      </section>

      {/* --- FEATURE HIGHLIGHT --- */}
      <section className="px-6 py-24 max-w-7xl mx-auto">
        <div className="bg-slate-900 rounded-[3rem] p-10 md:p-20 text-white text-center relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black opacity-50"></div>
            <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-6">Stop guessing. <br/>Start knowing.</h2>
                <p className="text-slate-400 font-medium text-lg mb-10 leading-relaxed">
                    Millions of Americans suffer from food anxiety. Safespoon is the digital Epipen for your peace of mind.
                </p>
                <button 
                    onClick={onLogin}
                    className="px-10 py-5 bg-white text-slate-900 font-black rounded-2xl hover:bg-violet-50 transition-colors shadow-2xl shadow-white/10"
                >
                    Get Protected Now
                </button>
            </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="px-6 py-12 text-center border-t border-slate-50">
        <div className="flex justify-center gap-8 mb-8 text-slate-400 font-bold text-xs uppercase tracking-widest">
            <span className="cursor-pointer hover:text-slate-900 transition-colors">Privacy</span>
            <span className="cursor-pointer hover:text-slate-900 transition-colors">Terms</span>
            <span className="cursor-pointer hover:text-slate-900 transition-colors">Contact</span>
        </div>
        <p className="text-slate-300 text-[10px] font-medium">© 2026 Safespoon Inc.</p>
      </footer>

    </div>
  );
};