import React from 'react';

export const Header = ({ userPhoto, onLogout, setView }) => {
  return (
    <header className="h-20 bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 md:px-8 flex items-center justify-between sticky top-0 z-50 transition-all duration-300">
      
      {/* LEFT: Logo (Prominent Mobile Version) */}
      <div className="flex-1 flex items-center">
         <button 
            onClick={() => setView('dashboard')}
            className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-80 transition-opacity"
            style={{ fontFamily: '"Host Grotesk", sans-serif', letterSpacing: '-0.05em' }}
        >
            Safespoon
        </button>
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