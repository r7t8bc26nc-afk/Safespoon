import React from 'react';

export const Sidebar = ({ setView, activeView }) => {
  const mainNavItems = [
    { 
      id: 'dashboard', 
      label: 'Home', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> 
    },
    { 
      id: 'explorer', 
      label: 'Explore', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> 
    },
    { 
      id: 'recipes', 
      label: 'Recipes', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> 
    },
    { 
      id: 'blog', 
      label: 'Articles', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /> 
    },
    { 
      id: 'saved', 
      label: 'Saved', 
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /> 
    },
  ];

  return (
    <div className="w-72 h-full bg-white border-r border-gray-100 flex flex-col py-8 z-20">
      
      {/* Brand - Updated Font */}
      <div className="px-8 mb-10">
        <span 
            className="text-2xl text-gray-900"
            style={{ fontFamily: '"Host Grotesk", sans-serif', fontWeight: 600, letterSpacing: '-0.03em' }}
        >
            Safespoon
        </span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1">
        {mainNavItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`
                relative w-full flex items-center gap-4 px-8 py-4 transition-all duration-200 group
                ${isActive ? 'bg-violet-50/50' : 'hover:bg-gray-50'}
              `}
            >
              <svg 
                className={`w-6 h-6 transition-colors duration-200 ${isActive ? 'text-violet-600' : 'text-gray-400 group-hover:text-gray-600'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                  {item.icon}
              </svg>

              <span className={`text-sm font-medium transition-colors duration-200 ${isActive ? 'text-violet-900 font-bold' : 'text-gray-500 group-hover:text-gray-900'}`}>
                {item.label}
              </span>
              
              {/* Right Vertical Line Indicator */}
              {isActive && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-violet-600 rounded-l-sm"></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Premium Card */}
      <div className="px-8 mt-auto mb-4">
        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
          <p className="text-sm font-bold text-gray-900 mb-1">Go Premium</p>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Unlock advanced allergen filters and unlimited recipes.
          </p>
          <button className="w-full py-2.5 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-sm">
              Upgrade
          </button>
        </div>
      </div>
    </div>
  );
};