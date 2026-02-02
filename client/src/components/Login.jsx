import React, { useState } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from 'framer-motion';

const GoogleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
);

const Login = ({ onLogin }) => { 
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const auth = getAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (isSignup && password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
    }
    setLoading(true);
    try {
      if (isSignup) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
      if (onLogin) onLogin(); 
    } catch (err) {
      if (err.code === 'auth/invalid-credential') setError("Incorrect email or password.");
      else if (err.code === 'auth/email-already-in-use') setError("Email already registered.");
      else if (err.code === 'auth/weak-password') setError("Password must be at least 6 characters.");
      else setError("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      if (onLogin) onLogin();
    } catch (err) { setError("Unable to connect with Google."); }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-['Switzer'] text-slate-900 bg-white overflow-hidden">
      <Helmet>
        <title>{isSignup ? "Create Account | Safespoon" : "Sign In | Safespoon"}</title>
        <meta name="description" content="Login to Safespoon. Your personal food safety assistant for navigating allergies and dietary restrictions." />
      </Helmet>

      {/* --- LEFT SIDE: BRANDING --- */}
      <div className="hidden md:flex md:w-5/12 lg:w-1/2 bg-slate-50 relative flex-col justify-between p-16 overflow-hidden border-r border-slate-100">
        <div className="relative z-20">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Safespoon</h1>
        </div>
        <div className="relative z-20 max-w-lg">
            <h2 className="text-5xl font-black leading-tight mb-6 tracking-tight text-slate-900">
                Eat without<br/> 
                <span className="text-emerald-600">hesitation.</span>
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed font-medium mb-10">
                The most advanced food scanner for allergies, medical conditions, and lifestyle diets.
            </p>
        </div>
        <div className="relative z-20 text-xs text-slate-400 font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} Safespoon Inc.
        </div>
      </div>

      {/* --- RIGHT SIDE: FORM --- */}
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto bg-white">
        
        {/* Mobile Header (Button Removed) */}
        <div className="md:hidden pt-safe-top px-6 pb-2 flex justify-between items-center bg-white z-20 mt-6">
           <span className="text-xl font-black tracking-tight text-slate-900">Safespoon</span>
           {/* Button removed here per request */}
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-24 py-12 max-w-xl mx-auto w-full">
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
                
                {/* Changed text-center to text-left */}
                <div className="mb-8 text-left">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-0">
                        {isSignup ? "Get started" : "Welcome back"}
                    </h1>
                    <p className="text-slate-500 font-medium text-lg">
                        {isSignup ? "Create your free account." : "Sign in to continue."}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    <div className="space-y-4">
                        {/* Email Input */}
                        <div className="group bg-slate-50 focus-within:bg-white border-2 border-transparent focus-within:border-slate-900 focus-within:ring-4 focus-within:ring-slate-100 rounded-2xl transition-all duration-200">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 pt-3 mb-0 group-focus-within:text-slate-900 transition-colors">
                                Email
                            </label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                                className="w-full bg-transparent px-4 pb-3 pt-1 text-lg font-bold text-slate-900 outline-none placeholder:text-slate-300"
                                placeholder="name@example.com"
                            />
                        </div>

                        {/* Password Input */}
                        <div className="group bg-slate-50 focus-within:bg-white border-2 border-transparent focus-within:border-slate-900 focus-within:ring-4 focus-within:ring-slate-100 rounded-2xl transition-all duration-200 relative">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 pt-3 mb-0 group-focus-within:text-slate-900 transition-colors">
                                Password
                            </label>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required 
                                className="w-full bg-transparent px-4 pb-3 pt-1 text-lg font-bold text-slate-900 outline-none placeholder:text-slate-300"
                                placeholder="••••••••"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 p-2"
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>

                        {/* Confirm Password (Signup Only) */}
                        <AnimatePresence>
                            {isSignup && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }} 
                                    animate={{ height: 'auto', opacity: 1 }} 
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="group bg-slate-50 focus-within:bg-white border-2 border-transparent focus-within:border-slate-900 focus-within:ring-4 focus-within:ring-slate-100 rounded-2xl transition-all duration-200 mt-4">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 pt-3 mb-0 group-focus-within:text-slate-900 transition-colors">
                                            Confirm Password
                                        </label>
                                        <input 
                                            type="password" 
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required 
                                            className="w-full bg-transparent px-4 pb-3 pt-1 text-lg font-bold text-slate-900 outline-none placeholder:text-slate-300"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-3">
                            <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <p className="text-xs font-bold text-rose-600 pt-0.5">{error}</p>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-16 bg-slate-900 text-white font-bold text-lg rounded-2xl hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl shadow-slate-200 mt-2 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isSignup ? "Create Account" : "Sign In")}
                    </button>
                    
                    {!isSignup && (
                        <div className="text-center">
                            <button type="button" className="text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">
                                Forgot Password?
                            </button>
                        </div>
                    )}
                </form>

                <div className="relative flex py-8 items-center">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink-0 mx-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest">Or continue with</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <button type="button" onClick={handleGoogleLogin} className="w-full h-14 flex items-center justify-center bg-white text-slate-900 font-bold rounded-2xl border-2 border-slate-100 active:bg-slate-50 transition-all hover:border-slate-200">
                    <span className="mr-3"><GoogleLogo /></span> Google
                </button>

                <div className="mt-8 text-center md:hidden">
                    <p className="text-sm font-medium text-slate-400">
                        {isSignup ? "Already have an account?" : "Don't have an account?"}
                        <button onClick={() => { setIsSignup(!isSignup); setError(''); }} className="ml-1 text-slate-900 font-bold underline decoration-2 decoration-emerald-400">
                            {isSignup ? "Log In" : "Sign Up"}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;