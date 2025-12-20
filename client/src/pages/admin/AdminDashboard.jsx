import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Gamepad2, Edit3, Trash2, Eye, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';

const AdminDashboard = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Yeni Oyun Formu State'leri
  const [showModal, setShowModal] = useState(false);
  const [newGame, setNewGame] = useState({ title: '', slug: '', description: '' });

  // Oyunları Çek
  const fetchGames = async () => {
    try {
      const res = await api.get('/games');
      setGames(res.data.data);
    } catch (err) {
      toast.error('Oyunlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  // Oyun Oluşturma Fonksiyonu
  const handleCreateGame = async (e) => {
    e.preventDefault();
    try {
      // Basit başlangıç verisi gönderiyoruz, detayları sonra editörde yapacağız
      await api.post('/games', {
        ...newGame,
        stat_definitions: [], // Şimdilik boş
        initial_stats: {}     // Şimdilik boş
      });
      toast.success('Oyun başarıyla oluşturuldu!');
      setShowModal(false);
      setNewGame({ title: '', slug: '', description: '' });
      fetchGames(); // Listeyi yenile
    } catch (err) {
      toast.error(err.response?.data?.message || 'Oyun oluşturulamadı.');
    }
  };

  // --- OYUN SİLME FONKSİYONU ---
const handleDeleteGame = async (e, id, title) => {
  // Tıklamanın karta yayılmasını engelle
  e.preventDefault();
  e.stopPropagation();

  // 1. Onay Kutusu
  if (!window.confirm(`"${title}" adlı oyunu ve tüm içeriğini silmek istediğine emin misin?`)) return;

  // 2. Güvenlik Onayı (İstersen kaldırabilirsin)
  const check = window.prompt(`Silmek için lütfen "SİL" yazınız:`);
  if (check !== "SİL") return;

  try {
    await api.delete(`/games/${id}`);
    toast.success('Oyun başarıyla silindi.');
    // Listeden anlık olarak kaldır
    setGames(prev => prev.filter(game => game.id !== id));
  } catch (err) {
    toast.error('Silinemedi.');
  }
};

  // URL Dostu İsim Oluşturucu (Slug)
  const handleTitleChange = (e) => {
    const title = e.target.value;
    const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    setNewGame({ ...newGame, title, slug });
  };

  return (
    <div>
      {/* ÜST BAŞLIK */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Oyunlarım</h1>
          <p className="text-gray-400">Yönettiğin interaktif hikayeler.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl shadow-lg shadow-primary-500/25 transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Yeni Oyun Oluştur
        </button>
      </div>

      {/* OYUN LİSTESİ */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : games.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
          <Gamepad2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-400">Henüz oyun yok</h3>
          <p className="text-gray-500 mb-6">İlk hikayeni oluşturmak için yukarıdaki butona bas.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game, index) => (
            <motion.div 
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass p-6 rounded-2xl border border-white/5 hover:border-primary-500/30 group transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-dark-800 rounded-xl text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                  <Gamepad2 className="w-6 h-6" />
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${game.is_published ? 'bg-accent-500/10 text-accent-500' : 'bg-gray-700/50 text-gray-400'}`}>
                  {game.is_published ? 'Yayında' : 'Taslak'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{game.title}</h3>
              <p className="text-gray-400 text-sm mb-6 line-clamp-2">{game.description}</p>
              
              <div className="flex gap-2">
                <Link to={`/admin/game/${game.slug}`} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white text-center rounded-lg text-sm font-medium transition-colors">
                  Düzenle
                </Link>
                {/* SİLME BUTONU */}
                  <button 
                    onClick={(e) => handleDeleteGame(e, game.id, game.title)}
                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors z-20 relative"
                    type="button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* YENİ OYUN MODAL (POPUP) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-dark-800 w-full max-w-lg rounded-2xl border border-white/10 p-6 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Yeni Oyun Oluştur</h2>
            <form onSubmit={handleCreateGame} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Oyun Adı</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-dark-900 border border-dark-700 text-white px-4 py-2 rounded-xl mt-1 focus:border-primary-500 outline-none"
                  value={newGame.title}
                  onChange={handleTitleChange}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">URL Adresi (Otomatik)</label>
                <input 
                  type="text" 
                  disabled
                  className="w-full bg-dark-900/50 border border-dark-700 text-gray-500 px-4 py-2 rounded-xl mt-1"
                  value={newGame.slug}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Kısa Açıklama</label>
                <textarea 
                  className="w-full bg-dark-900 border border-dark-700 text-white px-4 py-2 rounded-xl mt-1 focus:border-primary-500 outline-none h-24"
                  value={newGame.description}
                  onChange={(e) => setNewGame({...newGame, description: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-xl">İptal</button>
                <button type="submit" className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold">Oluştur</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;