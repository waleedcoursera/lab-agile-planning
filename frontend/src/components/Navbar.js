import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'الرئيسية', icon: '🏠' },
    { path: '/cards', label: 'البطاقات', icon: '🃏' },
    { path: '/deck-builder', label: 'منشئ السطح', icon: '🔧' },
    { path: '/multiplayer', label: 'متعدد اللاعبين', icon: '🎮' },
    { path: '/profile/player1', label: 'الملف الشخصي', icon: '👤' },
  ];

  return (
    <nav className="bg-gradient-to-r from-purple-800 to-blue-800 border-b-2 border-yellow-400 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-yellow-400">
                Yu-Gi-Oh! The Duelists of the Roses
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  location.pathname === item.path
                    ? 'bg-yellow-400 text-purple-900'
                    : 'text-white hover:bg-purple-700 hover:text-yellow-400'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;