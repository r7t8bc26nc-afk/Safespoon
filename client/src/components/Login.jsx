import React, { useState, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const Login = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = getAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000); 
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (fullName) await updateProfile(cred.user, { displayName: fullName });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') setError("Invalid email or password.");
      else if (err.code === 'auth/email-already-in-use') setError("Email already in use.");
      else setError("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setError("Social login failed.");
    }
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
        <h1 className="text-5xl font-semibold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 animate-pulse font-['Host_Grotesk']">
            Safespoon
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-900 bg-white overflow-hidden animate-fade-in relative">
      
      {/* Desktop Visual Side */}
      <div className="hidden md:flex md:w-1/2 lg:w-5/12 bg-slate-900 relative flex-col justify-between p-12 text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80" 
            className="w-full h-full object-cover opacity-60" 
            alt="Food background" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
        </div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-semibold tracking-tighter font-['Host_Grotesk']">Safespoon</h1>
        </div>

        <div className="relative z-10">
          <blockquote className="text-3xl font-bold leading-tight mb-8">
            "I used to guess. Now I know. Dining out is fun again."
          </blockquote>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Consistent Pinned Logo for Mobile */}
        <div className="md:hidden pt-8 px-8 bg-white z-30 sticky top-0">
           <span className="text-3xl font-semibold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 font-['Host_Grotesk']">
              Safespoon
           </span>
        </div>

        <div className="flex-1 flex flex-col justify-center relative z-10">
          <div className="w-full max-w-md mx-auto p-8 pt-0">
              {/* Centered Heading with Improved Copy */}
              <div className="text-center mb-16 mt-4">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                      {isSignup ? "Join the table." : "Welcome back."}
                  </h2>
                  <p className="text-lg text-slate-500 font-medium">
                      {isSignup ? "Start dining out with complete confidence." : "Log in to manage your safety shield."}
                  </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {isSignup && (
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                      <svg className="w-3 h-3 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      Full Name
                    </label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-14 bg-slate-50 border-2 border-transparent focus:border-violet-100 focus:bg-white rounded-2xl px-5 font-bold text-slate-900 outline-none transition-all placeholder-slate-300"
                      placeholder="Harvey Specter"
                    />
                  </div>
                )}

                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                    <svg className="w-3 h-3 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Email
                  </label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    className="w-full h-14 bg-slate-50 border-2 border-transparent focus:border-violet-100 focus:bg-white rounded-2xl px-5 font-bold text-slate-900 outline-none transition-all placeholder-slate-300"
                    placeholder="harveyspecter@example.com"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                    <svg className="w-3 h-3 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Password
                  </label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    className="w-full h-14 bg-slate-50 border-2 border-transparent focus:border-violet-100 focus:bg-white rounded-2xl px-5 font-bold text-slate-900 outline-none transition-all placeholder-slate-300"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div className="text-rose-500 text-xs font-bold text-center bg-rose-50 py-3 rounded-xl border border-rose-100">
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-16 bg-slate-900 text-white font-semibold text-lg rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-200 mt-4 disabled:opacity-70"
                >
                  {loading ? "Processing..." : (isSignup ? "Create Account" : "Login")}
                </button>
              </form>

              <div className="relative flex py-8 items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink-0 mx-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Or continue with</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <button 
                onClick={handleGoogleLogin} 
                className="w-full h-14 flex items-center justify-center gap-3 bg-white border-2 border-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <p className="text-center text-sm text-slate-500 font-medium mt-8">
                {isSignup ? "Already have an account?" : "Don't have an account?"}
                <button 
                  onClick={() => { setIsSignup(!isSignup); setError(''); }} 
                  className="font-bold text-violet-600 hover:text-violet-700 ml-1 transition-colors"
                >
                  {isSignup ? "Sign in" : "Sign up"}
                </button>
              </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;