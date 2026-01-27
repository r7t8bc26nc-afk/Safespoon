import React, { useState, useEffect } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth";

const Login = ({ onLogin }) => { 
  // REMOVED: showSplash state and useEffect timer
  const [isSignup, setIsSignup] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Validation State
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordSuggestion, setPasswordSuggestion] = useState('');
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  const auth = getAuth();

  // Password Logic
  useEffect(() => {
    let score = 0;
    let suggestion = '';

    if (!password) {
        setPasswordStrength(0);
        setPasswordSuggestion('');
        return;
    }

    if (password.length > 5) score += 1;
    if (password.length > 9) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9!@#$%^&*]/.test(password)) score += 1;

    if (password.length < 6) suggestion = "Use at least 6 characters.";
    else if (!/[0-9]/.test(password)) suggestion = "Add a number (0-9).";
    else if (!/[!@#$%^&*]/.test(password)) suggestion = "Add a special character (!@#$).";
    else if (!/[A-Z]/.test(password)) suggestion = "Add an uppercase letter.";
    else suggestion = "Great password!";

    setPasswordStrength(score);
    setPasswordSuggestion(suggestion);

    if (confirmPassword) {
        setPasswordsMatch(password === confirmPassword);
    } else {
        setPasswordsMatch(true);
    }
  }, [password, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isSignup) {
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (passwordStrength < 2) {
            setError("Please choose a stronger password.");
            return;
        }
    }

    setLoading(true);

    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      if (onLogin) onLogin(); 
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') setError("Incorrect email or password.");
      else if (err.code === 'auth/email-already-in-use') setError("That email is already registered.");
      else if (err.code === 'auth/weak-password') setError("Password should be at least 6 characters.");
      else setError("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      if (onLogin) onLogin();
    } catch (err) {
      console.error(err);
      setError("Unable to connect with Google.");
    }
  };

  const handleGuestAccess = () => {
    if (onLogin) onLogin({ isGuest: true }); 
  };

  const getStrengthColor = () => {
    if (passwordStrength === 0) return 'bg-slate-200';
    if (passwordStrength === 1) return 'bg-rose-500';
    if (passwordStrength === 2) return 'bg-amber-500';
    if (passwordStrength === 3) return 'bg-emerald-400';
    return 'bg-emerald-600';
  };

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength === 1) return 'Weak';
    if (passwordStrength === 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    return 'Strong';
  };

  // REMOVED: Splash Screen Render Block

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-['Host_Grotesk'] text-slate-900 bg-white overflow-hidden animate-fade-in relative">
      
      {/* Desktop Visual Side */}
      <div className="hidden md:flex md:w-1/2 lg:w-5/12 bg-slate-900 relative flex-col justify-between p-12 text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80" className="w-full h-full object-cover opacity-40 mix-blend-overlay" alt="Food background" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-violet-900/20"></div>
        </div>
        <div className="relative z-10"><h1 className="text-3xl font-black tracking-tighter">Safespoon</h1></div>
        <div className="relative z-10 space-y-8">
          <blockquote className="text-3xl font-bold leading-tight">"Stop guessing. Start knowing.<br/>Dining out is finally safe again."</blockquote>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
             <div className="flex items-center gap-3 mb-2"><span className="text-xl">👑</span><span className="font-bold text-sm uppercase tracking-widest text-violet-200">Safespoon Pro</span></div>
             <p className="text-sm text-slate-300 leading-relaxed">Unlock daily intake tracking, automated allergen alerts, and detailed macro breakdowns. Your personal health shield, activated.</p>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto">
        <div className="absolute top-0 left-0 w-full p-6 flex items-center justify-between z-40">
           <div className="md:hidden"><span className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">Safespoon</span></div>
           <div className="hidden md:block"></div>
           <button onClick={handleGuestAccess} className="text-xs font-bold text-slate-400 hover:text-violet-600 transition-colors flex items-center gap-1 group">Explore <span className="group-hover:translate-x-1 transition-transform">→</span></button>
        </div>

        <div className="flex-1 flex flex-col justify-center relative z-10 py-12">
          <div className="w-full max-w-md mx-auto p-8 pt-12 md:pt-8">
              <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
                      {isSignup ? "Create Account" : "Welcome back"}
                  </h2>
                  <p className="text-slate-400 font-medium text-base leading-relaxed">
                      {isSignup ? "The smartest way to find food that fits your life." : "Access your personal dietary dashboard."}
                  </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Email Field */}
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    className="w-full h-14 bg-slate-50 border-2 border-transparent focus:border-violet-100 focus:bg-white rounded-2xl px-5 font-bold text-slate-900 outline-none transition-all placeholder-slate-300"
                    placeholder="harveyspecter@example.com"
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    className="w-full h-14 bg-slate-50 border-2 border-transparent focus:border-violet-100 focus:bg-white rounded-2xl px-5 font-bold text-slate-900 outline-none transition-all placeholder-slate-300"
                    placeholder="••••••••"
                  />
                  
                  {/* Password Strength & Suggestions */}
                  {isSignup && password.length > 0 && (
                    <div className="animate-in slide-in-from-top-1 fade-in duration-300">
                        <div className="flex gap-1 h-1 mt-2 px-1 mb-2">
                            {[1, 2, 3, 4].map((step) => (
                                <div key={step} className={`h-full rounded-full flex-1 transition-all duration-500 ${passwordStrength >= step ? getStrengthColor() : 'bg-slate-100'}`}></div>
                            ))}
                        </div>
                        <div className="flex justify-between items-start px-1">
                            <span className={`text-[10px] font-medium uppercase tracking-widest transition-colors ${getStrengthColor().replace('bg-', 'text-')}`}>
                                {getStrengthLabel()}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 text-right">
                                {passwordSuggestion}
                            </span>
                        </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                {isSignup && (
                    <div className="space-y-2 text-left animate-fade-in">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                        <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required 
                            className={`w-full h-14 bg-slate-50 border-2 focus:bg-white rounded-2xl px-5 font-bold text-slate-900 outline-none transition-all placeholder-slate-300 ${!passwordsMatch ? 'border-rose-200 bg-rose-50' : 'border-transparent focus:border-violet-100'}`}
                            placeholder="••••••••"
                        />
                        {!passwordsMatch && (
                            <div className="flex items-center gap-1.5 ml-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                <span className="text-xs font-medium text-rose-500">Passwords don't match</span>
                            </div>
                        )}
                    </div>
                )}

                {error && (
                  <div className="text-rose-500 text-xs font-bold text-center bg-rose-50 py-3 rounded-xl border border-rose-100 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-16 bg-slate-900 text-white font-bold text-lg rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-200 mt-4 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                  {loading ? "Verifying..." : (isSignup ? "Create Account" : "Login")}
                </button>
              </form>

              <div className="relative flex py-8 items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink-0 mx-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Or</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <div className="space-y-3">
                <button 
                    onClick={handleGoogleLogin} 
                    className="w-full h-14 flex items-center justify-center gap-3 bg-white border-2 border-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-[0.98]"
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Continue with Google
                </button>
              </div>

              <p className="text-center text-sm text-slate-500 font-medium mt-8">
                {isSignup ? "Returning user?" : "Don't have an account?"}
                <button 
                  onClick={() => { setIsSignup(!isSignup); setError(''); setPasswordsMatch(true); setPasswordSuggestion(''); }} 
                  className="font-black text-violet-600 hover:text-violet-700 ml-1 transition-colors"
                >
                  {isSignup ? "Login" : "Sign up"}
                </button>
              </p>
          </div>
          
          <div className="mt-auto pt-6 pb-8 border-t border-slate-50 px-8">
             <div className="flex flex-wrap justify-center gap-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <a href="#" className="hover:text-slate-600 transition-colors">Terms of Use</a>
                <a href="#" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-slate-600 transition-colors">Help Center</a>
             </div>
             <p className="text-center text-[10px] text-slate-300 font-medium mt-4">
                © {new Date().getFullYear()} Safespoon Inc. All rights reserved.
             </p>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
      `}} />
    </div>
  );
};

export default Login;