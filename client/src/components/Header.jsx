import React from 'react';

export const Header = ({ userPhoto, onLogout, setView }) => {
  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 md:px-8 flex items-center justify-between sticky top-0 z-50">
      
      {/* LEFT: Mobile Logo (Hidden on Desktop) */}
      <div className="flex-1 flex items-center">
         <span 
            className="text-xl font-bold text-gray-900 md:hidden"
            style={{ fontFamily: '"Host Grotesk", sans-serif', fontWeight: 700, letterSpacing: '-0.03em' }}
        >
            Safespoon
        </span>
      </div>

      {/* RIGHT: User Actions */}
      <div className="flex items-center gap-6 ml-auto">
        

        {/* Profile */}
        <div className="flex items-center">
          
          {/* Avatar - Clickable for Settings */}
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
                className="h-10 w-10 rounded-full border-2 border-white shadow-sm object-cover group-hover:border-violet-100 transition-all" 
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm group-hover:bg-violet-100 transition-colors">
                U
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};