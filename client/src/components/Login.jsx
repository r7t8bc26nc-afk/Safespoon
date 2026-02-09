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

// --- BRAND IDENTITY COMPONENTS ---

// 1. The Pictorial Mark (Icon Only)
const LogoMark = ({ className }) => (
  <svg 
    viewBox="0 0 750 250" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    preserveAspectRatio="xMinYMid meet"
  >
    <path 
      d="M587.94,178.86c40.05-41.58,66.25-103.72,50.96-117.94-13.28-12.35-47.3,21.29-105.96,32.94-64.04,12.71-121.61-7.9-158.7-26.02,11.52,12.08,47.36,46.57,105.67,56.4,68.33,11.51,119.94-18.85,132.62-26.82-25.76,33.83-69.98,80.64-130.6,87.44C340.22,200.76,256.78-18.67,143.94,1.86,36.51,21.4-8.83,242.29,2.08,247.53c10.48,5.03,67.21-191.66,169.9-197.41,106.23-5.95,152.55,198.52,285.95,194.74,68.28-1.93,121.67-57.36,130-66Z"
      fill="currentColor" 
    />
  </svg>
);

// 2. The Full Vertical Lockup (Icon + Text)
const SafeSpoonLogo = ({ dark = false }) => (
  <div className="flex items-center gap-3">
    <LogoMark className={`h-10 md:h-12 w-auto ${dark ? 'text-black' : 'text-white'}`} />
    <span className={`font-black text-2xl md:text-3xl tracking-tighter uppercase ${dark ? 'text-black' : 'text-white'} leading-none`}>
      Safespoon
    </span>
  </div>
);

const GoogleLogo = () => (
  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// --- FORM FIELD SUB-COMPONENT ---

const InputField = ({ label, type, value, onChange, placeholder, children }) => (
  <div className="relative mb-6">
    <label className="block text-sm font-black text-black uppercase tracking-widest mb-2 border-2 border-black bg-[#FFD700] w-fit px-2 py-0.5 transform -rotate-1">
      {label}
    </label>
    <div className="relative">
      <input 
        type={type} 
        value={value}
        onChange={onChange}
        required 
        className="w-full bg-white border-4 border-black p-4 text-lg font-bold text-black placeholder:text-gray-400 outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all" 
        placeholder={placeholder}
      />
      {children}
    </div>
  </div>
);

// --- MAIN LOGIN COMPONENT ---

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
    
    // Simple validation
    if (isSignup && password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
    }
    
    setLoading(true);
    
    // Simulate slight delay for UX if network is too fast (optional, but good for "processing" feel)
    // await new Promise(resolve => setTimeout(resolve, 500)); 

    try {
      if (isSignup) {
          await createUserWithEmailAndPassword(auth, email, password);
      } else {
          await signInWithEmailAndPassword(auth, email, password);
      }
      if (onLogin) onLogin(); 
    } catch (err) {
      const errorMap = {
        'auth/invalid-credential': "Incorrect email or password.",
        'auth/email-already-in-use': "Email already registered.",
        'auth/weak-password': "Password must be at least 6 characters.",
        'auth/user-not-found': "No account found with this email."
      };
      setError(errorMap[err.code] || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      if (onLogin) onLogin();
    } catch (err) { 
        setError("Unable to connect with Google."); 
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-black bg-white overflow-hidden">
      <Helmet>
        <title>{isSignup ? "Join Us | SafeSpoon" : "Access | SafeSpoon"}</title>
      </Helmet>

      {/* --- LEFT SIDE: BRANDING (DESKTOP) --- */}
      <div className="hidden md:flex md:w-5/12 lg:w-1/2 bg-[#000000] relative flex-col justify-between p-12 lg:p-16 border-r-4 border-black">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
        
        <div className="relative z-20">
            <SafeSpoonLogo />
        </div>
        
        <div className="relative z-20 max-w-lg">
            <div className="inline-block bg-[#10B981] border-2 border-white px-4 py-2 mb-6 transform -rotate-2">
                <span className="font-bold text-white uppercase tracking-widest">The Food Scanner</span>
            </div>
            <h2 className="text-6xl lg:text-7xl font-black leading-[0.9] mb-8 tracking-tighter text-white">
                EAT<br/> 
                WITHOUT<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10B981] to-[#FFD700]">FEAR.</span>
            </h2>
            <p className="text-xl text-gray-300 font-bold font-mono border-l-4 border-[#10B981] pl-6 py-2">
                Advanced filtration for allergies, medical conditions, and lifestyle diets.
            </p>
        </div>
        
        <div className="relative z-20 text-xs font-black uppercase tracking-widest text-white/50">
            © {new Date().getFullYear()} Safespoon Inc. // All Rights Reserved
        </div>
      </div>

      {/* --- RIGHT SIDE: FORM --- */}
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto bg-white">
        
        {/* Mobile Header */}
        <div className="md:hidden p-6 border-b-4 border-black bg-white z-20 sticky top-0 flex justify-between items-center">
           <SafeSpoonLogo dark={true} />
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-24 py-10 max-w-xl mx-auto w-full">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full">
                
                <div className="mb-10 text-left border-l-8 border-black pl-6">
                    <h1 className="text-4xl md:text-5xl font-black text-black tracking-tighter uppercase mb-2">
                        {isSignup ? "Get Started" : "Welcome Back"}
                    </h1>
                    <p className="font-bold font-mono text-gray-500 uppercase tracking-tight">
                        {isSignup ? "Enter your details to begin" : "Access your dashboard"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-2">
                    <InputField 
                        label="Email Address" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="HARVEYSPECTER@EMAIL.COM" 
                    />

                    <InputField 
                        label="Password" 
                        type={showPassword ? "text" : "password"} 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="••••••••"
                    >
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-widest bg-black text-white px-2 py-1 hover:bg-[#FFD700] hover:text-black transition-colors"
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </InputField>

                    <AnimatePresence>
                        {isSignup && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1 }} 
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <InputField 
                                    label="Confirm Password" 
                                    type="password" 
                                    value={confirmPassword} 
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    placeholder="••••••••" 
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {error && (
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="p-4 bg-[#ff5252] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-start gap-3 mb-6">
                            <div className="bg-black text-white w-6 h-6 flex items-center justify-center font-black shrink-0">!</div>
                            <p className="text-sm font-bold text-black uppercase">{error}</p>
                        </motion.div>
                    )}

                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-5 bg-black text-white font-black text-xl uppercase border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-[#10B981] hover:text-black hover:border-black active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <>Processing...</>
                            ) : (
                                isSignup ? "Create Account" : "Login"
                            )}
                        </button>
                    </div>
                </form>

                <div className="relative flex py-8 items-center">
                    <div className="flex-grow border-t-4 border-black"></div>
                    <span className="flex-shrink-0 mx-4 text-xs font-black bg-white border-2 border-black px-2 py-1 uppercase tracking-widest">Or</span>
                    <div className="flex-grow border-t-4 border-black"></div>
                </div>

                <button 
                    type="button" 
                    onClick={handleGoogleLogin} 
                    className="w-full py-4 flex items-center justify-center bg-white text-black font-bold uppercase border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 hover:bg-gray-50 transition-all"
                >
                    <GoogleLogo /> 
                    Continue with Google
                </button>

                <div className="mt-8 text-center">
                    <p className="text-sm font-bold text-gray-500 uppercase">
                        {isSignup ? "Returning user?" : "No account?"}
                        <button 
                            onClick={() => { setIsSignup(!isSignup); setError(''); }} 
                            className="ml-2 text-black font-black underline decoration-4 decoration-[#FFD700] hover:decoration-[#10B981] hover:bg-black hover:text-white px-1 transition-all"
                        >
                            {isSignup ? "Login Here" : "Join Now"}
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