import React from 'react';

export const Header = ({ userPhoto, onLogout, setView, title = "Discover" }) => {
  return (
    <header className="h-20 bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 md:px-8 flex items-center justify-between sticky top-0 z-50 transition-all duration-300">
      
      {/* LEFT: Page Heading (Replaces Logo) */}
      <div className="flex-1 flex items-center">
         <div className="flex flex-col">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">
                {title}
            </h1>
            <p className="hidden md:block text-gray-400 font-bold text-[10px] capitalize tracking-widest">
                Safespoon Dashboard
            </p>
         </div>
      </div>

      {/* RIGHT: User Actions */}
      <div className="flex items-center gap-6 ml-auto">
        
        {/* Profile Avatar */}
        <div className="flex items-center">
          <button 
            type="button"
            onClick={() => {
                if (setView) setView('settings');
            }}
            className="group relative focus:outline-none transition-transform active:scale-95"
            title="Go to Settings"
          >
            {userPhoto ? (
              <img 
                src={userPhoto} 
                alt="Profile" 
                className="h-10 w-10 rounded-full shadow-md object-cover group-hover:border-violet-200 transition-all" 
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600 flex items-center justify-center font-black text-sm shadow-md group-hover:scale-105 transition-transform">
                U
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};