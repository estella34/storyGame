import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Gamepad2, Users, Settings, LogOut, Plus } from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Panel Özeti', path: '/admin' },
    { icon: Gamepad2, label: 'Oyunlarım', path: '/admin/games' },
    { icon: Users, label: 'Oyuncular', path: '/admin/users' },
  ];

  return (
    <div className="flex h-screen bg-dark-900 text-white overflow-hidden">
      {/* SOL SIDEBAR */}
      <aside className="w-64 glass border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-accent-500">
            EXALINE
          </h2>
          <p className="text-xs text-gray-500 mt-1">Admin Yönetim Paneli</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-primary-600/20 text-primary-500 border border-primary-500/20' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* SAĞ İÇERİK ALANI */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        {/* Arkaplan Süsleri */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/5 rounded-full blur-[100px] pointer-events-none" />
        
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;