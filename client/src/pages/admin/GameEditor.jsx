import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, Image as ImageIcon, Layers, Settings, Plus, Trash2, Loader2, PlayCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import MediaUploader from '../../components/ui/MediaUploader';
import AudioUploader from '../../components/ui/AudioUploader';
import SceneManager from '../../components/admin/SceneManager';

const GameEditor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const [game, setGame] = useState({
    id: null,
    title: '',
    description: '',
    cover_image: '',
    is_published: false,
    stat_definitions: [], 
    initial_stats: {},
    game_config: { 
        // VARSAYILAN AYARLAR (GÜNCELLENDİ)
        stat_visibility: 'always', 
        relation_visibility: 'always',
        
        stat_distribution: 'admin', 
        stat_pool: 10, // Stat için dağıtılacak puan
        
        relation_distribution: 'admin',
        relation_pool: 10 // İlişki için dağıtılacak puan
      }
  });

  // Verileri Çek
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await api.get(`/games/${slug}`);
        setGame({
          ...res.data.data,
          stat_definitions: res.data.data.stat_definitions || [],
          initial_stats: res.data.data.initial_stats || {},
          game_config: {
             stat_visibility: 'always',
             relation_visibility: 'always',
             stat_distribution: 'admin',
             stat_pool: 10,
             relation_distribution: 'admin',
             relation_pool: 10,
             ...res.data.data.game_config // Veritabanından gelenleri üzerine yaz
          }
        });
      } catch (err) {
        toast.error('Oyun bilgileri alınamadı.');
        navigate('/admin/games');
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [slug, navigate]);

  // Kaydetme İşlemi
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/games/${game.id}`, game);
      toast.success('Değişiklikler kaydedildi!');
      return Promise.resolve();
    } catch (err) {
      toast.error('Kaydetme başarısız.');
      return Promise.reject(err);
    } finally {
      setSaving(false);
    }
  };

  // Stat Ekleme/Silme/Güncelleme Fonksiyonları (Aynı)
  const addStat = () => {
    const newKey = `stat_${Date.now()}`;
    setGame({
      ...game,
      stat_definitions: [...game.stat_definitions, { key: newKey, label: 'Yeni Stat', type: 'stat', visible: true }],
      initial_stats: { ...game.initial_stats, [newKey]: 0 }
    });
  };

  const removeStat = (key) => {
    const newStats = game.stat_definitions.filter(s => s.key !== key);
    const newInitial = { ...game.initial_stats };
    delete newInitial[key];
    setGame({ ...game, stat_definitions: newStats, initial_stats: newInitial });
  };

  const updateStat = (index, field, value) => {
    const newStats = [...game.stat_definitions];
    if (field === 'key') return; 
    newStats[index][field] = value;
    setGame({ ...game, stat_definitions: newStats });
  };

  const updateInitialValue = (key, value) => {
    setGame({
      ...game,
      initial_stats: { ...game.initial_stats, [key]: parseInt(value) || 0 }
    });
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary-500 w-8 h-8" /></div>;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* HEADER (Aynı) */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/games')} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white"><ArrowLeft className="w-6 h-6" /></button>
          <div><h1 className="text-2xl font-bold text-white">{game.title}</h1><p className="text-sm text-gray-500">Oyun Düzenleyici</p></div>
        </div>
        <div className="flex gap-3">
            {/* Önizle butonu kaldırıldı - SceneManager içinde önizleme var */}
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl shadow-lg shadow-primary-500/20 font-bold transition-all">
            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />} Kaydet
            </button>
        </div>
      </div>

      {/* TABS (Aynı) */}
      <div className="flex gap-6 border-b border-white/5 mb-8">
        {[{ id: 'general', label: 'Genel Ayarlar', icon: Settings }, { id: 'design', label: 'Oyun Tasarımı', icon: ImageIcon }, { id: 'stats', label: 'Statlar & İlişkiler', icon: Layers }, { id: 'scenes', label: 'Bölümler (Hikaye)', icon: ImageIcon }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 pb-4 text-sm font-medium transition-colors relative ${activeTab === tab.id ? 'text-primary-500' : 'text-gray-400 hover:text-white'}`}>
                <tab.icon className="w-4 h-4" /> {tab.label}
                {activeTab === tab.id && (<motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500" />)}
            </button>
        ))}
      </div>

      <div className="space-y-6">
        
        {/* TAB 1: GENEL AYARLAR */}
        {activeTab === 'general' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {/* Kapak Resmi ve Başlık (Aynı - Kısaltıldı) */}
                <div className="glass p-6 rounded-2xl border border-white/5"><h3 className="text-lg font-bold text-white mb-4">Kapak Resmi</h3><div className="max-w-md"><MediaUploader initialPreview={game.cover_image ? `http://localhost:5003${game.cover_image}` : null} onUploadComplete={(fileData) => {setGame({ ...game, cover_image: fileData ? fileData.url : '' });}} /></div></div>
                <div className="glass p-6 rounded-2xl border border-white/5 space-y-4"><div><label className="text-sm text-gray-400 block mb-1">Oyun Başlığı</label><input type="text" className="w-full bg-dark-900 border border-dark-700 text-white px-4 py-3 rounded-xl focus:border-primary-500 outline-none" value={game.title} onChange={(e) => setGame({...game, title: e.target.value})}/></div><div><label className="text-sm text-gray-400 block mb-1">Açıklama</label><textarea className="w-full bg-dark-900 border border-dark-700 text-white px-4 py-3 rounded-xl focus:border-primary-500 outline-none h-32" value={game.description} onChange={(e) => setGame({...game, description: e.target.value})}/></div><div className="flex items-center gap-3 pt-2"><div onClick={() => setGame({...game, is_published: !game.is_published})} className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${game.is_published ? 'bg-accent-500' : 'bg-dark-700'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${game.is_published ? 'left-7' : 'left-1'}`} /></div><span className="text-gray-300 font-medium">Oyunu Yayına Al</span></div></div>

                {/* ANA KARAKTER AYARLARI */}
                <div className="glass p-6 rounded-2xl border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4">Ana Karakter</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm text-gray-400 block mb-2">Karakter İsmi</label>
                            <input 
                                type="text" 
                                className="w-full bg-dark-900 border border-dark-700 text-white px-4 py-3 rounded-xl focus:border-primary-500 outline-none" 
                                value={game.default_char_name || 'Gezgin'} 
                                onChange={(e) => setGame({...game, default_char_name: e.target.value})}
                                placeholder="Karakter İsmi"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 block mb-2">Karakter Fotoğrafı</label>
                            <MediaUploader 
                                initialPreview={game.default_char_image ? `http://localhost:5003${game.default_char_image}` : null} 
                                onUploadComplete={(fileData) => {
                                    setGame({ ...game, default_char_image: fileData ? fileData.url : '' });
                                }} 
                            />
                        </div>
                    </div>
                    <div className="mt-6">
                        <label className="text-sm text-gray-400 block mb-2">Karakter Ayarlama Ekranı Arkaplan Müziği</label>
                        <p className="text-xs text-gray-500 mb-2">Kullanıcı stat ve ilişki dağıtımı yaparken çalacak müzik</p>
                        <AudioUploader 
                            folderType="background"
                            currentUrl={game.character_setup_audio || null}
                            onAudioSelect={(url) => {
                                setGame({ ...game, character_setup_audio: url || '' });
                            }}
                        />
                        {game.character_setup_audio && (
                            <audio 
                                src={`http://localhost:5003${game.character_setup_audio}`} 
                                controls 
                                className="w-full mt-2"
                            />
                        )}
                    </div>
                </div>

                {/* YENİ OYUN MEKANİKLERİ KUTUSU */}
                <div className="glass p-6 rounded-2xl border border-white/5 mt-6">
                    <h3 className="text-lg font-bold text-white mb-4">Oyun Mekanikleri</h3>
                    
                    <div className="grid grid-cols-2 gap-6">
                        {/* STAT AYARLARI */}
                        <div className="space-y-4 border-r border-white/10 pr-6">
                            <h4 className="text-primary-500 font-bold text-sm">Statlar (Can, Para vb.)</h4>
                            
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Görünürlük</label>
                                <select className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm" value={game.game_config?.stat_visibility || 'always'} onChange={(e) => setGame({...game, game_config: {...game.game_config, stat_visibility: e.target.value}})}>
                                    <option value="always">Her Zaman Gözüksün (Sağ Alt)</option>
                                    <option value="always_and_notify">Her Zaman Gözüksün + Bildirim</option>
                                    <option value="on_change">Sadece Değişince (Üst Bildirim)</option>
                                    <option value="hidden">Asla Gözükmesin</option>
                                </select>
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 block mb-1">Dağıtım Yöntemi</label>
                                    <select className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm" value={game.game_config?.stat_distribution || 'admin'} onChange={(e) => setGame({...game, game_config: {...game.game_config, stat_distribution: e.target.value}})}>
                                        <option value="admin">Admin Belirler</option>
                                        <option value="user">Kullanıcı Dağıtsın</option>
                                    </select>
                                </div>
                                {game.game_config?.stat_distribution === 'user' && (
                                    <div className="w-24">
                                        <label className="text-xs text-gray-500 block mb-1">Havuz Puanı</label>
                                        <input type="number" className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm" value={game.game_config?.stat_pool || 10} onChange={(e) => setGame({...game, game_config: {...game.game_config, stat_pool: parseInt(e.target.value)}})} />
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Min Değer</label>
                                    <input type="number" className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm" value={game.game_config?.stat_min || 0} onChange={(e) => setGame({...game, game_config: {...game.game_config, stat_min: parseInt(e.target.value) || 0}})} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Max Değer</label>
                                    <input type="number" className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm" value={game.game_config?.stat_max || 100} onChange={(e) => setGame({...game, game_config: {...game.game_config, stat_max: parseInt(e.target.value) || 100}})} />
                                </div>
                            </div>
                        </div>

                        {/* İLİŞKİ AYARLARI */}
                        <div className="space-y-4">
                            <h4 className="text-accent-500 font-bold text-sm">İlişkiler (Ayşe, Ahmet vb.)</h4>
                            
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Görünürlük</label>
                                <select className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm" value={game.game_config?.relation_visibility || 'always'} onChange={(e) => setGame({...game, game_config: {...game.game_config, relation_visibility: e.target.value}})}>
                                    <option value="always">Her Zaman Gözüksün (Sol Alt)</option>
                                    <option value="always_and_notify">Her Zaman Gözüksün + Bildirim</option>
                                    <option value="on_change">Sadece Değişince</option>
                                    <option value="hidden">Asla Gözükmesin</option>
                                </select>
                            </div>

                             <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 block mb-1">Dağıtım Yöntemi</label>
                                    <select className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm" value={game.game_config?.relation_distribution || 'admin'} onChange={(e) => setGame({...game, game_config: {...game.game_config, relation_distribution: e.target.value}})}>
                                        <option value="admin">Admin Belirler</option>
                                        <option value="user">Kullanıcı Dağıtsın</option>
                                    </select>
                                </div>
                                {game.game_config?.relation_distribution === 'user' && (
                                    <div className="w-24">
                                        <label className="text-xs text-gray-500 block mb-1">Havuz Puanı</label>
                                        <input type="number" className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm" value={game.game_config?.relation_pool || 10} onChange={(e) => setGame({...game, game_config: {...game.game_config, relation_pool: parseInt(e.target.value)}})} />
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Min Değer</label>
                                    <input type="number" className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm" value={game.game_config?.relation_min || 0} onChange={(e) => setGame({...game, game_config: {...game.game_config, relation_min: parseInt(e.target.value) || 0}})} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Max Değer</label>
                                    <input type="number" className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm" value={game.game_config?.relation_max || 100} onChange={(e) => setGame({...game, game_config: {...game.game_config, relation_max: parseInt(e.target.value) || 100}})} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}

        {/* TAB 2: OYUN TASARIMI */}
        {activeTab === 'design' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="glass p-6 rounded-2xl border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4">Oyun Tasarım Teması</h3>
                    <p className="text-sm text-gray-400 mb-6">Oyununuzun görsel temasını seçin. Bu tema oyunun tüm arayüzüne uygulanacaktır.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div 
                            onClick={() => setGame({...game, design_theme: 'default'})}
                            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                                (game.design_theme || 'default') === 'default' 
                                    ? 'border-primary-500 bg-primary-500/10' 
                                    : 'border-white/10 bg-dark-900/50 hover:border-white/20'
                            }`}
                        >
                            <h4 className="text-lg font-bold text-white mb-2">Varsayılan Tasarım</h4>
                            <p className="text-sm text-gray-400">Modern ve minimal tasarım</p>
                        </div>
                        
                        <div 
                            onClick={() => setGame({...game, design_theme: 'roma'})}
                            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                                game.design_theme === 'roma' 
                                    ? 'border-primary-500 bg-primary-500/10' 
                                    : 'border-white/10 bg-dark-900/50 hover:border-white/20'
                            }`}
                        >
                            <h4 className="text-lg font-bold text-white mb-2">Roma Tasarımı</h4>
                            <p className="text-sm text-gray-400">Antik Roma mimarisi ve Metin2/Mount & Blade tarzı</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}

        {/* TAB 3: STATLAR (Aynı) */}
        {activeTab === 'stats' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-6 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-6"><div><h3 className="text-lg font-bold text-white">Oyun Değişkenleri</h3><p className="text-sm text-gray-400">Karakterin canı, parası veya diğer karakterlerle ilişkileri.</p></div><button onClick={addStat} className="flex items-center gap-2 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-primary-500 rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> Değişken Ekle</button></div>
                <div className="space-y-3">
                    {game.stat_definitions.map((stat, index) => (
                        <div key={index} className="flex gap-4 items-start bg-dark-900/50 p-4 rounded-xl border border-white/5">
                            <div className="flex-1"><label className="text-xs text-gray-500 block mb-1">Görünecek İsim</label><input type="text" className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white" value={stat.label} onChange={(e) => updateStat(index, 'label', e.target.value)} /></div>
                            <div className="w-32"><label className="text-xs text-gray-500 block mb-1">Tip</label><select className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white" value={stat.type} onChange={(e) => updateStat(index, 'type', e.target.value)}><option value="stat">Sayısal (Stat)</option><option value="relation">İlişki</option><option value="hidden">Gizli Stat</option></select></div>
                            <div className="w-24"><label className="text-xs text-gray-500 block mb-1">Başlangıç</label><input type="number" className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white" value={game.initial_stats[stat.key] || 0} onChange={(e) => updateInitialValue(stat.key, e.target.value)} /></div>
                            <div className="pt-6"><button onClick={() => removeStat(stat.key)} className="text-gray-500 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button></div>
                        </div>
                    ))}
                </div>
            </motion.div>
        )}

        {/* TAB 4: BÖLÜMLER (Aynı) */}
        {activeTab === 'scenes' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {game.id ? (<SceneManager gameId={game.id} statDefinitions={game.stat_definitions || []} />) : (<div className="text-center p-10 text-red-400">Bölüm eklemeden önce oyunu bir kez kaydetmelisin.</div>)}
            </motion.div>
        )}
      </div>
    </div>
  );
};

export default GameEditor;