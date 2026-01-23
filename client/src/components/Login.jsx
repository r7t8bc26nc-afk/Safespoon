import React, { useState, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const Login = () => {
  // --- SPLASH STATE ---
  const [showSplash, setShowSplash] = useState(true);

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = getAuth();

  // --- SPLASH TIMER ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); 
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

  // --- SPLASH SCREEN (Wordmark Only) ---
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center text-white transition-opacity duration-700 ease-out">
        {/* Icon removed, just text now */}
        <h1 className="text-5xl font-extrabold tracking-tight text-center animate-pulse">Safespoon</h1>
        <p className="text-gray-400 mt-3 text-center font-medium tracking-wide">Eat without worry.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row font-sans text-slate-800 bg-white overflow-hidden animate-fade-in">
      
      {/* LEFT SIDE: BRANDING */}
      <div className="hidden md:flex md:w-1/2 lg:w-5/12 bg-gray-900 relative flex-col justify-between p-12 text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80" 
            className="w-full h-full object-cover" 
            alt="Food background" 
          />
          <div className="absolute inset-0 bg-black/60"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            {/* Icon removed */}
            <h1 className="text-3xl font-bold tracking-tight">Safespoon</h1>
          </div>
        </div>

        <div className="relative z-10">
          <blockquote className="text-2xl font-bold leading-relaxed mb-6">
            "Finally, I can eat out without fear. Safespoon helps me navigate menus instantly."
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full border-2 border-white/20 bg-gray-500 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100" alt="User" />
            </div>
            <div>
              <p className="text-sm font-bold">Alex M.</p>
              <p className="text-xs text-gray-400">Pro Member</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: FORM */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 overflow-y-auto">
          <div className="w-full max-w-sm">
            
            {/* Mobile Branding (Wordmark Only) */}
            <div className="md:hidden flex justify-center mb-8">
               <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">SafeSpoon</h1>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                {isSignup ? "Create an account" : "Welcome back"}
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                {isSignup ? "Enter your details to get started." : "Please enter your details to sign in."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 ml-1">Full Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                    placeholder="Quajaee Simmons"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 ml-1">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                  placeholder="harveyspecter@email.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 ml-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black active:scale-[0.98] transition-all shadow-lg shadow-gray-900/20 disabled:opacity-50"
              >
                {loading ? "Processing..." : (isSignup ? "Create account" : "Login")}
              </button>
            </form>

            <div className="relative flex py-6 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-xs font-bold text-gray-400 uppercase">Other options</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <div className="space-y-3 mb-8">
              <button 
                onClick={handleGoogleLogin} 
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>

            <p className="text-center text-sm text-gray-500">
              {isSignup ? "Already have an account?" : "Don't have an account?"}
              <button 
                onClick={() => { setIsSignup(!isSignup); setError(''); }} 
                className="font-bold text-gray-900 hover:underline ml-1"
              >
                {isSignup ? "Sign in" : "Get Started"}
              </button>
            </p>
          </div>
        </div>

        <div className="p-6 text-center w-full">
            <div className="flex justify-center gap-4 text-xs font-bold text-gray-400">
                <button className="hover:text-gray-900 transition-colors">Privacy</button>
                <span>•</span>
                <button className="hover:text-gray-900 transition-colors">Terms</button>
                <span>•</span>
                <button className="hover:text-gray-900 transition-colors">Help</button>
            </div>
            <p className="text-[10px] text-gray-300 mt-2">© 2026 SafeSpoon Inc.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;