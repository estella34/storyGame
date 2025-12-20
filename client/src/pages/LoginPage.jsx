import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', formData);
      
      // Token ve Rol Kaydı
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.user.role);
      
      toast.success(`Hoşgeldin, ${res.data.user.username}!`);
      
      // ROL KONTROLÜ (Admin mi User mı?)
      if (res.data.user.role === 'admin') {
        setTimeout(() => navigate('/admin'), 1000);
      } else {
        setTimeout(() => navigate('/dashboard'), 1000);
      }

    } catch (err) {
      toast.error(err.response?.data?.message || 'Giriş başarısız.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Arkaplan Süsleri */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-primary-600/20 rounded-full blur-[128px]" />
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-accent-500/10 rounded-full blur-[128px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <Link to="/" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Ana Sayfaya Dön
        </Link>

        <div className="glass p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Tekrar Hoşgeldin</h2>
            <p className="text-gray-400">Kaldığın yerden devam et.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">E-posta Adresi</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="email" 
                  required
                  className="w-full bg-dark-800 border border-dark-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="ornek@exaline.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            {/* Şifre */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="password" 
                  required
                  className="w-full bg-dark-800 border border-dark-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold shadow-lg shadow-primary-500/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              Giriş Yap
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Hesabın yok mu?{' '}
            <Link to="/register" className="text-primary-500 hover:text-primary-400 font-medium">
              Hemen Kayıt Ol
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;