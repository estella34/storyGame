import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gamepad2, LogIn, UserPlus, LayoutDashboard, LogOut } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  // Basitçe localStorage kontrolü (İlerde Context ile yapacağız)
  const isAuthenticated = !!localStorage.getItem('token');
  const userRole = localStorage.getItem('role'); // 'admin' veya 'user'

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
    window.location.reload(); // State'i temizlemek için (Geçici)
  };

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 w-full z-50 glass border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-primary-600 rounded-lg shadow-lg shadow-primary-500/30 group-hover:scale-110 transition-transform">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              EXALINE
            </span>
          </Link>

          {/* ORTA MENÜ */}
          <div className="hidden md:flex space-x-8">
            <Link to="/" className="text-gray-300 hover:text-primary-500 transition-colors">Ana Sayfa</Link>
            <Link to="/games" className="text-gray-300 hover:text-primary-500 transition-colors">Oyunlar</Link>
            <a href="#about" className="text-gray-300 hover:text-primary-500 transition-colors">Hakkımızda</a>
          </div>

          {/* SAĞ TARAF (Giriş Durumuna Göre) */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link 
                  to={userRole === 'admin' ? '/admin' : '/dashboard'} 
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 transition-all border border-white/5"
                >
                  <LayoutDashboard className="w-4 h-4 text-primary-500" />
                  <span className="text-sm font-medium">Panel</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden md:flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                  <LogIn className="w-4 h-4" />
                  Giriş Yap
                </Link>
                <Link 
                  to="/register" 
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 transition-all hover:scale-105"
                >
                  <UserPlus className="w-4 h-4" />
                  Kayıt Ol
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;