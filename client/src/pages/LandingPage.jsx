import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
// HATA BURADAYDI: Gamepad2'yi buraya ekledik 👇
import { Play, Shield, Zap, ChevronRight, Gamepad2 } from 'lucide-react'; 
import Navbar from '../components/layout/Navbar';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-dark-900 relative overflow-hidden">
      <Navbar />

      {/* ARKAPLAN EFEKTLERİ */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-[128px]" />

      {/* HERO SECTION */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4">
        <div className="max-w-7xl mx-auto text-center">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary-500/30 text-primary-400 mb-8"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
            </span>
            <span className="text-sm font-medium">Yeni Nesil Hikaye Motoru</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-5xl lg:text-7xl font-bold text-white mb-6 tracking-tight"
          >
            Kendi Hikayeni <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-accent-500">
              Kendin Yaz, Kendin Oyna
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Sıradan oyunlardan sıkıldın mı? Seçimlerinle kaderini belirle, istatistiklerini yönet ve Exaline dünyasında efsane ol.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link 
              to="/register" 
              className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary-500/20 transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              Hemen Başla
            </Link>
            <Link 
              to="/games" 
              className="w-full sm:w-auto px-8 py-4 glass hover:bg-white/5 text-white rounded-2xl font-bold text-lg border border-white/10 transition-all flex items-center justify-center gap-2"
            >
              Oyunları İncele
              <ChevronRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* ÖZELLİKLER KUTULARI */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Zap, title: "Hızlı Etkileşim", desc: "Seçimlerin anında sonucu etkiler." },
            { icon: Shield, title: "Güvenli Platform", desc: "Hesabın ve ilerlemelerin güvende." },
            { icon: Gamepad2, title: "Sürükleyici Kurgu", desc: "Seni içine çeken derin hikayeler." }
          ].map((item, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-8 rounded-3xl glass border border-white/5 hover:border-primary-500/30 transition-colors group"
            >
              <div className="w-12 h-12 bg-dark-800 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary-500/20 transition-colors">
                <item.icon className="w-6 h-6 text-primary-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
              <p className="text-gray-400">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;