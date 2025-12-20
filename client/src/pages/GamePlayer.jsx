import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Plus, Minus } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';

const GamePlayer = () => {
  const { id } = useParams();
  
  // Veriler
  const [game, setGame] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [chapters, setChapters] = useState([]);
  
  // Modlar
  const [playMode, setPlayMode] = useState('loading'); 
  const [currentScene, setCurrentScene] = useState(null);
  const [playerStats, setPlayerStats] = useState({});
  const [characterName, setCharacterName] = useState('');
  const [characterImage, setCharacterImage] = useState('');
  const [nextSceneId, setNextSceneId] = useState(null); 
  const [nextChapterTitle, setNextChapterTitle] = useState("");
  const [currentChapterId, setCurrentChapterId] = useState(null);
  const [hasShownStoryStart, setHasShownStoryStart] = useState(false);
  const [hasShownChapterTitle, setHasShownChapterTitle] = useState(false);

  // Akış
  const [activeContent, setActiveContent] = useState([]); 
  const [activeBlockIndex, setActiveBlockIndex] = useState(0); 
  const [currentBlock, setCurrentBlock] = useState(null);      
  const [currentText, setCurrentText] = useState("");          
  const [showChoices, setShowChoices] = useState(false);       
  const [timeLeft, setTimeLeft] = useState(null);              

  // Bildirimler (Kuyruk mantığı - sadece zaman bitti için)
  const [notifications, setNotifications] = useState([]);
  const notificationIdRef = useRef(0);
  const notificationQueueRef = useRef([]);
  const isProcessingQueueRef = useRef(false);
  
  // Stat/ilişki değişim bildirimleri (her statın yanında)
  const [statNotifications, setStatNotifications] = useState({}); // { statKey: { percentChange, id } }
  
  // Aktif ilişkiler (start edilmiş)
  const [activeRelations, setActiveRelations] = useState(new Set());
  
  // Pause menü ve ses ayarları
  const [isPaused, setIsPaused] = useState(false);
  const [volumeSettings, setVolumeSettings] = useState({
    background: 0.5,
    emotion: 0.5,
    voiceover: 0.5
  });
  
  // Ses referansları - Her blok için ayrı
  const voiceoverAudioRef = useRef(new Audio());
  const bgAudioRef = useRef(new Audio());
  const sfxAudioRef = useRef(new Audio());
  
  // Aktif ses referansları (şu anki blok için)
  const currentBgAudioRef = useRef(null);
  const currentSfxAudioRef = useRef(null);
  const currentVoiceoverAudioRef = useRef(null);
  const currentVideoRef = useRef(null);
  
  const timeoutsRef = useRef([]);
  const timeoutHandledRef = useRef(false);

  const clearAllTimeouts = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };

  // Q tuşu ile pause
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key.toLowerCase() === 'q' && playMode === 'scene') {
        setIsPaused(prev => {
          const newPaused = !prev;
          // Pause yapıldığında sadece seslendirmeyi durdur, arka plan ve duygu sesi devam etsin
          if (newPaused) {
            if (currentVoiceoverAudioRef.current) {
              currentVoiceoverAudioRef.current.pause();
            }
            // Video'yu da durdur
            if (currentVideoRef.current) {
              currentVideoRef.current.pause();
            }
          } else {
            // Resume yapıldığında seslendirme devam etsin (eğer varsa)
            if (currentVoiceoverAudioRef.current) {
              currentVoiceoverAudioRef.current.play().catch(() => {});
            }
            // Video'yu da devam ettir
            if (currentVideoRef.current) {
              currentVideoRef.current.play().catch(() => {});
            }
          }
          return newPaused;
        });
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playMode]);

  // Ses seviyelerini güncelle - hem eski hem de aktif referanslara uygula
  useEffect(() => {
    bgAudioRef.current.volume = volumeSettings.background;
    sfxAudioRef.current.volume = volumeSettings.emotion;
    voiceoverAudioRef.current.volume = volumeSettings.voiceover;
    
    // Aktif ses referanslarına da uygula
    if (currentBgAudioRef.current) {
      currentBgAudioRef.current.volume = volumeSettings.background;
    }
    if (currentSfxAudioRef.current) {
      currentSfxAudioRef.current.volume = volumeSettings.emotion;
    }
    if (currentVoiceoverAudioRef.current) {
      currentVoiceoverAudioRef.current.volume = volumeSettings.voiceover;
    }
  }, [volumeSettings]);

  // Tema CSS sınıfı
  const getThemeClass = (baseClass) => {
    const theme = game?.design_theme || 'default';
    if (theme === 'roma') {
      return `${baseClass} theme-roma`;
    }
    return baseClass;
  };

  // Bildirim ekleme (kuyruk mantığı)
  const addNotification = (message, value) => {
    const id = notificationIdRef.current++;
    const newNotif = { id, message, value, timestamp: Date.now() };
    setNotifications(prev => [...prev, newNotif]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  // Bildirim kuyruğunu işle (sıra sıra göster)
  const processNotificationQueue = () => {
    if (isProcessingQueueRef.current || notificationQueueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;
    const notif = notificationQueueRef.current.shift();
    
    if (notif) {
      addNotification(notif.label, notif.val);
      // Bir sonraki bildirimi 500ms sonra göster (önceki bildirim gösterildikten sonra)
      setTimeout(() => {
        isProcessingQueueRef.current = false;
        processNotificationQueue();
      }, 500);
    } else {
      isProcessingQueueRef.current = false;
    }
  };

  // 1. BAŞLANGIÇ
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await api.get(`/games/play/${id}`);
        const g = res.data.data.game;
        setGame(g); 
        setScenes(res.data.data.scenes || []); 
        setChapters(res.data.data.chapters || []);
        setPlayerStats(g.initial_stats || {});
        setCharacterName(g.default_char_name || 'Gezgin');
        setCharacterImage(g.default_char_image || '');
        bgAudioRef.current.loop = true; 

        // Karakter seçimi kontrolü
        const needsStatDist = g.game_config?.stat_distribution === 'user';
        const needsRelationDist = g.game_config?.relation_distribution === 'user';
        
        if (needsStatDist || needsRelationDist) {
          setPlayMode('character');
        } else {
          // Önce "HİKAYE BAŞLIYOR" ekranını göster
          setPlayMode('storyStart');
        }
      } catch (err) { 
        toast.error('Oyun yüklenemedi.'); 
        setPlayMode('error');
      }
    };
    fetchGame();
    return () => { 
      clearAllTimeouts(); 
      if (currentBgAudioRef.current) {
        currentBgAudioRef.current.pause();
        currentBgAudioRef.current = null;
      }
      if (currentSfxAudioRef.current) {
        currentSfxAudioRef.current.pause();
        currentSfxAudioRef.current = null;
      }
      if (currentVoiceoverAudioRef.current) {
        currentVoiceoverAudioRef.current.pause();
        currentVoiceoverAudioRef.current = null;
      }
      if (currentVideoRef.current) {
        currentVideoRef.current.pause();
        currentVideoRef.current = null;
      }
    };
  }, [id]);

  const startGame = (sceneList, stats) => {
      setPlayerStats(stats || playerStats);
      const startScene = sceneList.find(s => s.is_starting_scene);
      if (startScene) {
        // Bölüm başlığını göster
        const chapter = chapters.find(c => c.id === startScene.chapter_id);
        if (chapter && !hasShownChapterTitle) {
          setNextChapterTitle(chapter.title);
          setCurrentChapterId(chapter.id);
          setPlayMode('chapterStart');
        } else {
          startFlow(startScene, 'scene');
        }
      } else { 
        setPlayMode('error'); 
        toast.error("Başlangıç Sahnesi Bulunamadı!"); 
      }
  };

  // 2. AKIŞ BAŞLATICI
  const startFlow = (sceneOrResult, mode, targetId = null) => {
    clearAllTimeouts();
    timeoutHandledRef.current = false;
    setPlayMode(mode);
    setActiveBlockIndex(0);
    setCurrentText("");
    setShowChoices(false);
    setTimeLeft(null);

    // Yeni sahne başladığında seslendirmeyi durdur (diğer sesler devam edecek)
    if (mode === 'scene') {
      voiceoverAudioRef.current.pause();
    }

    if (mode === 'scene') {
      setCurrentScene(sceneOrResult);
      // Bölüm değişikliği kontrolü
      if (sceneOrResult.chapter_id !== currentChapterId) {
        const chapter = chapters.find(c => c.id === sceneOrResult.chapter_id);
        if (chapter) {
          setNextChapterTitle(chapter.title);
          setCurrentChapterId(chapter.id);
          setPlayMode('chapterStart');
          return;
        }
      }
    }
    if (mode === 'result') setNextSceneId(targetId);

    const rawContent = mode === 'scene' ? sceneOrResult.content : sceneOrResult;
    const content = (rawContent || []).filter(block => {
        // Yeni şart sistemi - conditions array'i varsa onu kullan
        if (block.conditions && block.conditions.length > 0) {
            return block.conditions.every(cond => {
                if (!cond.key) return true;
                const statVal = Number(playerStats[cond.key]) || 0;
                const checkVal = Number(cond.val || 0);
                const operator = cond.operator || '>=';
                
                switch(operator) {
                    case '>=': return statVal >= checkVal;
                    case '<=': return statVal <= checkVal;
                    case '=': return statVal === checkVal;
                    case '>': return statVal > checkVal;
                    case '<': return statVal < checkVal;
                    default: return statVal >= checkVal;
                }
            });
        }
        // Eski sistem desteği (geriye dönük uyumluluk)
        if (block.condition_key) {
            return (Number(playerStats[block.condition_key]) || 0) >= Number(block.condition_val || 0);
        }
        return true;
    });

    setActiveContent(content);

    if (content.length > 0) {
        loadBlock(content, 0);
    } else {
        if (mode === 'scene') {
            setShowChoices(true);
            const timeoutVal = parseInt(sceneOrResult.choice_timeout) || 0;
            if (timeoutVal > 0) {
              setTimeLeft(timeoutVal);
              timeoutHandledRef.current = false;
            } else {
              setTimeLeft(null);
            }
        } else {
            finishResultFlow(targetId);
        }
    }
  };

  // 3. BLOK YÜKLEME
  const loadBlock = (contentList, index) => {
    const block = contentList[index];
    setCurrentBlock(block);
    setCurrentText("");

    // Önceki blok seslerini durdur (arka plan ve duygu sesi)
    if (currentBgAudioRef.current) {
      currentBgAudioRef.current.pause();
      currentBgAudioRef.current = null;
    }
    if (currentSfxAudioRef.current) {
      currentSfxAudioRef.current.pause();
      currentSfxAudioRef.current = null;
    }
    
    // Video referansını temizle
    currentVideoRef.current = null;

    // Yeni blok için sesleri başlat
    if (block.bg_audio) {
        const bgAudio = new Audio(`http://localhost:5003${block.bg_audio}`);
        bgAudio.volume = volumeSettings.background;
        bgAudio.loop = true; // Arkaplan müziği loop yapabilir
        bgAudio.play().catch(() => {});
        currentBgAudioRef.current = bgAudio;
    }

    if (block.sfx_audio) { 
        const sfxAudio = new Audio(`http://localhost:5003${block.sfx_audio}`);
        sfxAudio.volume = volumeSettings.emotion;
        sfxAudio.loop = true; // Duygu sesi loop yapabilir
        sfxAudio.play().catch(() => {});
        currentSfxAudioRef.current = sfxAudio;
    }
    
    // Konuşma sesi - sadece yeni konuşma sesi varsa eskisini durdur
    if (block.voiceover_audio) {
        // Önceki konuşma sesini durdur
        if (currentVoiceoverAudioRef.current) {
          currentVoiceoverAudioRef.current.pause();
          currentVoiceoverAudioRef.current = null;
        }
        
        const voiceAudio = new Audio(`http://localhost:5003${block.voiceover_audio}`);
        voiceAudio.volume = volumeSettings.voiceover;
        // Konuşma loop yapmaz, sadece bir kez çalar
        voiceAudio.play().catch(() => {});
        currentVoiceoverAudioRef.current = voiceAudio;
        
        // Seslendirme seçimler gelene kadar devam etmeli
    }
    // Eğer bu blokta konuşma sesi yoksa, önceki bloğun konuşma sesi devam edebilir

    clearAllTimeouts();
    if (block.subtitles?.length > 0) {
        let totalDelay = 0;
        block.subtitles.forEach((sub, idx) => {
            timeoutsRef.current.push(setTimeout(() => {
                setCurrentText(sub.text);
                if (idx === block.subtitles.length - 1) timeoutsRef.current.push(setTimeout(() => setCurrentText(""), Number(sub.duration) * 1000));
            }, totalDelay * 1000));
            totalDelay += Number(sub.duration);
        });
    }
    
    // İlişki start/stop sistemi - birden fazla ilişki aynı anda
    const duration = Number(block.duration) || 5;
    const startDelay = duration > 3 ? (duration - 3) * 1000 : 0;
    
    // İlişki başlatma - array veya tek değer desteği
    const relationsToStart = Array.isArray(block.relation_start) 
        ? block.relation_start.filter(r => r) 
        : (block.relation_start ? [block.relation_start] : []);
    
    if (relationsToStart.length > 0) {
        timeoutsRef.current.push(setTimeout(() => {
            const relationConf = game.game_config || {};
            const viz = relationConf.relation_visibility;
            const newRelations = [];
            
            relationsToStart.forEach(relKey => {
                // İlişki daha önce start edilmemişse başlat
                if (!activeRelations.has(relKey)) {
                    newRelations.push(relKey);
                    
                    // Bildirim göster
                    if (viz === 'on_change' || viz === 'always_and_notify') {
                        const relationDef = game.stat_definitions.find(s => s.key === relKey);
                        const label = relationDef?.label || relKey;
                        notificationQueueRef.current.push({ label: `${label} ilişkisi başladı`, val: 0 });
                    }
                }
            });
            
            if (newRelations.length > 0) {
                setActiveRelations(prev => new Set([...prev, ...newRelations]));
                if (notificationQueueRef.current.length > 0) {
                    processNotificationQueue();
                }
            }
        }, startDelay));
    }
    
    // İlişki durdurma - array veya tek değer desteği
    const relationsToStop = Array.isArray(block.relation_stop) 
        ? block.relation_stop.filter(r => r) 
        : (block.relation_stop ? [block.relation_stop] : []);
    
    if (relationsToStop.length > 0) {
        timeoutsRef.current.push(setTimeout(() => {
            const relationConf = game.game_config || {};
            const viz = relationConf.relation_visibility;
            const stoppedRelations = [];
            
            relationsToStop.forEach(relKey => {
                // İlişki aktifse durdur
                if (activeRelations.has(relKey)) {
                    stoppedRelations.push(relKey);
                    
                    // Bildirim göster
                    if (viz === 'on_change' || viz === 'always_and_notify') {
                        const relationDef = game.stat_definitions.find(s => s.key === relKey);
                        const label = relationDef?.label || relKey;
                        notificationQueueRef.current.push({ label: `${label} ilişkisi bitti`, val: 0 });
                    }
                }
            });
            
            if (stoppedRelations.length > 0) {
                setActiveRelations(prev => {
                    const newSet = new Set(prev);
                    stoppedRelations.forEach(rel => newSet.delete(rel));
                    return newSet;
                });
                if (notificationQueueRef.current.length > 0) {
                    processNotificationQueue();
                }
            }
        }, startDelay));
    }
  };

  // 4. GÖRSEL SÜRE YÖNETİMİ
  useEffect(() => {
    if (!currentBlock || currentBlock.media_type === 'video' || isPaused) return;
    const duration = Number(currentBlock.duration) || 5; 
    const timer = setTimeout(() => { handleBlockEnd(activeContent, activeBlockIndex); }, duration * 1000);
    return () => clearTimeout(timer);
  }, [currentBlock, isPaused]);

  const handleBlockEnd = (contentList, finishedIndex) => {
      // Pause durumunda blok bitişini işleme
      if (isPaused) return;
      
      const nextIndex = finishedIndex + 1;
      if (nextIndex < contentList.length) {
          setActiveBlockIndex(nextIndex);
          loadBlock(contentList, nextIndex);
      } else {
          // Tüm bloklar bittiğinde sesleri durdurma - seçenekler gelince seçeneğe tıklanana kadar çalacak
          // Sadece seçim yapıldığında durdurulacak (handleChoice içinde)
          
          if (playMode === 'scene') {
              // Final sahne ise seçim olmadan direkt oyun sonu ekranına git
              if (currentScene?.is_final) {
                  setPlayMode('gameEnd');
              } else {
                  setCurrentText("");
                  setShowChoices(true);
                  const timeoutVal = parseInt(currentScene.choice_timeout) || 0;
                  if(timeoutVal > 0) {
                    setTimeLeft(timeoutVal);
                    timeoutHandledRef.current = false;
                  } else {
                    setTimeLeft(null);
                  }
              }
          } else if (playMode === 'result') {
              finishResultFlow(nextSceneId);
          }
      }
  };

  const finishResultFlow = (targetId) => {
      const finalTargetId = Number(targetId) || Number(nextSceneId);

      // Sahne bittiğinde tüm sesleri durdur
      if (currentVoiceoverAudioRef.current) {
        currentVoiceoverAudioRef.current.pause();
        currentVoiceoverAudioRef.current = null;
      }
      if (currentBgAudioRef.current) {
        currentBgAudioRef.current.pause();
        currentBgAudioRef.current = null;
      }
      if (currentSfxAudioRef.current) {
        currentSfxAudioRef.current.pause();
        currentSfxAudioRef.current = null;
      }
      if (currentVideoRef.current) {
        currentVideoRef.current.pause();
        currentVideoRef.current = null;
      }
      if (currentVideoRef.current) {
        currentVideoRef.current.pause();
        currentVideoRef.current = null;
      }

      if (currentScene?.is_final) {
          // Final sahne - oyun bitti ekranı göster
          setPlayMode('gameEnd');
      } else if (currentScene?.is_end_scene) {
          setNextSceneId(finalTargetId);
          setNextChapterTitle("Bölüm Bitti"); 
          setPlayMode('transition'); 
      } else {
          const next = scenes.find(s => s.id === finalTargetId);
          if (next) {
              if (next.is_final) {
                  // Bir sonraki sahne final ise direkt oyun bitti ekranına git
                  setPlayMode('gameEnd');
              } else {
                  startFlow(next, 'scene');
              }
          } else {
              toast.error("Hedef sahne bulunamadı veya oyun sonu.");
          }
      }
  };

  
  useEffect(() => {
      if (!timeLeft || timeLeft <= 0 || isPaused) return;
      const t = setInterval(() => {
          setTimeLeft(p => { 
            if (p <= 1) { 
              clearInterval(t); 
              if (!timeoutHandledRef.current) handleTimeout(); 
              return 0; 
            } 
            return p - 1; 
          });
      }, 1000);
      return () => clearInterval(t);
  }, [timeLeft, isPaused]);

  const handleTimeout = () => {
      timeoutHandledRef.current = true;
      if (!currentScene) return;
      const choices = currentScene.choices || [];
      
      // Ekranda gözüken seçimleri filtrele (sadece requirements sağlananlar)
      const visibleChoices = choices.filter(c => {
          const isVisible = (c.requirements || []).every(req => {
              if (!req.key) return true;
              return (Number(playerStats[req.key]) || 0) >= Number(req.val);
          });
          return isVisible;
      });
      
      // Süre bitti bildirimi kuyruğa ekle
      const theme = game?.design_theme || 'default';
      let selectedChoice = null;
      
      if (visibleChoices.length > 0) {
          // Rastgele bir seçim yap
          const randomIndex = Math.floor(Math.random() * visibleChoices.length);
          selectedChoice = visibleChoices[randomIndex];
      }
      
      if (theme === 'roma') {
        notificationQueueRef.current.push({ label: "Süre doldu!", val: 0 });
        if (selectedChoice) {
          notificationQueueRef.current.push({ label: `Seçildi: ${selectedChoice.text}`, val: 0 });
        }
        processNotificationQueue();
      } else {
        toast.info("Süre doldu!", {
          position: "top-center",
          autoClose: 2000
        });
        if (selectedChoice) {
          setTimeout(() => {
            toast.info(`Seçildi: ${selectedChoice.text}`, {
              position: "top-center",
              autoClose: 2000
            });
          }, 500);
        }
      }
      
      setTimeout(() => { 
        if (selectedChoice) { 
          handleChoice(selectedChoice); 
        } else {
          if (theme === 'roma') {
            notificationQueueRef.current.push({ label: "Seçenek yok.", val: 0 });
            processNotificationQueue();
          } else {
            toast.error("Seçenek yok.", {
              position: "top-center",
              autoClose: 2000
            });
          }
        }
      }, selectedChoice ? 1500 : 500); // Seçim varsa biraz daha bekle
  };

  // --- LOGIC ENGINE ---
  const handleChoice = (choice) => {
      // Seçim yapıldığında tüm sesleri durdur
      if (currentVoiceoverAudioRef.current) {
        currentVoiceoverAudioRef.current.pause();
        currentVoiceoverAudioRef.current = null;
      }
      if (currentBgAudioRef.current) {
        currentBgAudioRef.current.pause();
        currentBgAudioRef.current = null;
      }
      if (currentSfxAudioRef.current) {
        currentSfxAudioRef.current.pause();
        currentSfxAudioRef.current = null;
      }
      
      let newStats = { ...playerStats };
      const newStatNotifications = { ...statNotifications };

      // 1. Etkiler - Her statın yanında bildirim göster
      if (choice.effects && choice.effects.length > 0) {
          choice.effects.forEach((eff) => {
              if (eff.key) {
                  const val = Number(eff.val) || 0;
                  const currentVal = Number(newStats[eff.key]) || 0;
                  const effDef = game.stat_definitions.find(s => s.key === eff.key);
                  const effConf = game.game_config || {};
                  const isHidden = effDef?.type === 'hidden';
                  const isRelationType = effDef?.type === 'relation';
                  
                  // Max/min kontrolü
                  const min = isRelationType ? (effConf.relation_min || 0) : (effConf.stat_min || 0);
                  const max = isRelationType ? (effConf.relation_max || 100) : (effConf.stat_max || 100);
                  const newVal = Math.max(min, Math.min(max, currentVal + val));
                  newStats[eff.key] = newVal;
                  
                  const viz = isRelationType ? effConf.relation_visibility : effConf.stat_visibility;
                  
                  // Bildirim ekle (on_change, always_and_notify modunda ve gizli değilse)
                  if (!isHidden && val !== 0) {
                      if (viz === 'on_change') {
                          // Sadece bildirim - kuyruk sistemine ekle
                          const label = effDef?.label || eff.key;
                          const range = max - min;
                          const percentChange = range > 0 ? ((val / range) * 100) : 0;
                          notificationQueueRef.current.push({ 
                            label: `${label} ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%`, 
                            val: 0 
                          });
                      } else if (viz === 'always_and_notify') {
                          // Her zaman gözüksün + bildirim - statın yanında göster
                          const range = max - min;
                          const percentChange = range > 0 ? ((val / range) * 100) : 0;
                          
                          const notifId = notificationIdRef.current++;
                          newStatNotifications[eff.key] = { 
                            percentChange, 
                            id: notifId,
                            timestamp: Date.now()
                          };
                          
                          // 3 saniye sonra bildirimi kaldır
                          setTimeout(() => {
                            setStatNotifications(prev => {
                              const updated = { ...prev };
                              if (updated[eff.key]?.id === notifId) {
                                delete updated[eff.key];
                              }
                              return updated;
                            });
                          }, 3000);
                      }
                  }
              }
          });
          setPlayerStats(newStats);
          setStatNotifications(newStatNotifications);
          
          // Bildirim kuyruğunu işlemeye başla (on_change modunda)
          if (notificationQueueRef.current.length > 0) {
              processNotificationQueue();
          }
      }

      // 2. Dinamik Rota
      let targetId = choice.target_scene_id;
      let routes = choice.dynamic_routes;
      
      if (typeof routes === 'string') {
          try { routes = JSON.parse(routes); } catch(e) { routes = []; }
      }

      if (routes && routes.length > 0) {
          for (const route of routes) {
              if (route.target) {
                 // Eski format desteği (tek stat)
                 if (route.key) {
                     const curr = Number(newStats[route.key]) || 0; 
                     const chk = Number(route.val);
                     
                     let match = false;
                     if (route.operator === '>' && curr > chk) match = true;
                     else if (route.operator === '<' && curr < chk) match = true;
                     else if (route.operator === '=' && curr === chk) match = true;
                     
                     if (match) { 
                         targetId = route.target; 
                         break; 
                     }
                 }
                 // Yeni format (birden fazla stat toplamı)
                 else if (route.keys && route.keys.length > 0) {
                     // Tüm statların toplamını hesapla
                     const total = route.keys.reduce((sum, key) => {
                         return sum + (Number(newStats[key]) || 0);
                     }, 0);
                     
                     const chk = Number(route.val);
                     let match = false;
                     if (route.operator === '>' && total > chk) match = true;
                     else if (route.operator === '<' && total < chk) match = true;
                     else if (route.operator === '=' && total === chk) match = true;
                     
                     if (match) { 
                         targetId = route.target; 
                         break; 
                     }
                 }
              }
          }
      }

      // 3. Geçiş
      if (choice.result_content && choice.result_content.length > 0) {
          startFlow(choice.result_content, 'result', targetId);
      } else {
          finishResultFlow(targetId);
      }
  };

  // --- RENDER ---
  if (playMode === 'error') {
    return (
      <div className="bg-black h-screen flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-bold text-red-500">Hata: Başlangıç Sahnesi Yok</h2>
        <p>Admin panelinden ayarlayın.</p>
      </div>
    );
  }

  // KARAKTER SEÇİM EKRANI (Stat ve İlişki dağıtımı tek ekranda)
  if (playMode === 'character') {
    return (
      <CharacterSetup 
        game={game} 
        initialStats={playerStats}
        characterName={characterName}
        characterImage={characterImage}
        onCharacterNameChange={setCharacterName}
        onCharacterImageChange={setCharacterImage}
        onComplete={(stats, name, image) => {
          setPlayerStats(stats);
          setCharacterName(name);
          setCharacterImage(image);
          setPlayMode('storyStart');
        }}
        getThemeClass={getThemeClass}
      />
    );
  }

  // HİKAYE BAŞLIYOR EKRANI
  if (playMode === 'storyStart') {
    return (
      <StoryStartScreen 
        game={game}
        onContinue={() => {
          setHasShownStoryStart(true);
          startGame(scenes, playerStats);
        }}
        getThemeClass={getThemeClass}
      />
    );
  }

  // BÖLÜM BAŞLIK EKRANI
  if (playMode === 'chapterStart') {
    return (
      <ChapterStartScreen 
        game={game}
        chapterTitle={nextChapterTitle}
        onContinue={() => {
          setHasShownChapterTitle(true);
          const startScene = scenes.find(s => s.is_starting_scene && s.chapter_id === currentChapterId) || 
                           scenes.find(s => s.chapter_id === currentChapterId);
          if (startScene) {
            startFlow(startScene, 'scene');
          } else {
            toast.error("Bölümün ilk sahnesi bulunamadı!");
          }
        }}
        getThemeClass={getThemeClass}
      />
    );
  }

  if (playMode === 'transition') {
    const theme = game?.design_theme || 'default';
    const isRoma = theme === 'roma';
    
    return (
      <div className={`h-screen ${isRoma ? 'bg-gradient-to-b from-amber-950 via-amber-900 to-black' : 'bg-black'} flex flex-col items-center justify-center text-white space-y-6 select-none relative overflow-hidden ${getThemeClass('')}`}>
        {isRoma && (
          <>
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-800/40 to-transparent"></div>
              <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-amber-800/40 to-transparent"></div>
            </div>
            <div className="absolute top-8 left-8 w-24 h-24 border-4 border-amber-600/60 rotate-45" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'}}></div>
            <div className="absolute top-8 right-8 w-24 h-24 border-4 border-amber-600/60 -rotate-45" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'}}></div>
            <div className="absolute bottom-8 left-8 w-24 h-24 border-4 border-amber-600/60 rotate-45" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'}}></div>
            <div className="absolute bottom-8 right-8 w-24 h-24 border-4 border-amber-600/60 -rotate-45" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'}}></div>
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-600/40 to-transparent"></div>
          </>
        )}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className={`z-10 text-center ${isRoma ? 'font-serif' : ''}`}
        >
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className={`${isRoma ? 'text-amber-300 font-serif tracking-widest' : 'text-red-600'} text-5xl md:text-7xl font-bold mb-4 tracking-widest uppercase`}
            style={isRoma ? { textShadow: '0 0 20px rgba(217,119,6,0.8), 0 0 40px rgba(217,119,6,0.5)' } : {}}
          >
            BÖLÜM SONU
          </motion.h1>
          <p className={`${isRoma ? 'text-amber-200' : 'text-gray-400'} mb-6 text-xl`}>{nextChapterTitle}</p>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            onClick={() => { 
                const next = scenes.find(s => s.id === Number(nextSceneId)); 
                if(next) startFlow(next, 'scene'); 
                else toast.error("Diğer bölümün ilk sahnesi bulunamadı.");
            }} 
            className={`px-8 py-4 ${isRoma ? 'bg-amber-700 hover:bg-amber-600 border-4 border-amber-500 shadow-[0_0_30px_rgba(217,119,6,0.6)] font-serif' : 'bg-primary-600 hover:bg-primary-500 border border-white/20'} ${isRoma ? 'rounded' : 'rounded-full'} flex items-center gap-2 group transition-all hover:scale-105 shadow-xl font-bold text-lg`}
          >
            Devam Et <ArrowRight className="group-hover:translate-x-1 transition-transform"/>
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // OYUN BİTTİ EKRANI
  if (playMode === 'gameEnd') {
    const theme = game?.design_theme || 'default';
    const isRoma = theme === 'roma';
    
    return (
      <div className={`h-screen ${isRoma ? 'bg-gradient-to-b from-amber-950 via-amber-900 to-black' : 'bg-black'} flex flex-col items-center justify-center text-white space-y-6 select-none relative overflow-hidden ${getThemeClass('')}`}>
        {isRoma && (
          <>
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-800/40 to-transparent"></div>
              <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-amber-800/40 to-transparent"></div>
            </div>
            <div className="absolute top-8 left-8 w-24 h-24 border-4 border-amber-600/60 rotate-45" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'}}></div>
            <div className="absolute top-8 right-8 w-24 h-24 border-4 border-amber-600/60 -rotate-45" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'}}></div>
            <div className="absolute bottom-8 left-8 w-24 h-24 border-4 border-amber-600/60 rotate-45" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'}}></div>
            <div className="absolute bottom-8 right-8 w-24 h-24 border-4 border-amber-600/60 -rotate-45" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'}}></div>
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-600/40 to-transparent"></div>
          </>
        )}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className={`z-10 text-center ${isRoma ? 'font-serif' : ''}`}
        >
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className={`${isRoma ? 'text-amber-300 font-serif tracking-widest' : 'text-primary-400'} text-6xl md:text-8xl font-bold mb-4 tracking-widest uppercase`}
            style={isRoma ? { textShadow: '0 0 20px rgba(217,119,6,0.8), 0 0 40px rgba(217,119,6,0.5)' } : {}}
          >
            OYUN BİTTİ
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className={`${isRoma ? 'text-amber-200' : 'text-gray-400'} mb-6 text-xl`}
          >
            Hikayenizi tamamladınız!
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (!currentBlock && !showChoices) {
    return <div className="bg-black h-screen text-white flex justify-center items-center">Yükleniyor...</div>;
  }

  // Pause menü
  if (isPaused) {
    return (
      <PauseMenu 
        game={game}
        volumeSettings={volumeSettings}
        setVolumeSettings={setVolumeSettings}
        onResume={() => setIsPaused(false)}
        getThemeClass={getThemeClass}
      />
    );
  }

  return (
    <div className={`relative w-full h-screen bg-black overflow-hidden font-sans select-none ${getThemeClass('')}`}>
      <div className="absolute inset-0 z-0 bg-black">
        <AnimatePresence>
            {currentBlock && (
            <motion.div 
              key={currentBlock.id} 
              initial={{opacity:0}} 
              animate={{opacity:1}} 
              exit={{opacity:0}} 
              transition={{duration:0.5}} 
              className="absolute inset-0 w-full h-full"
            >
                    {currentBlock.media_type === 'video' ? (
                <video 
                  ref={currentVideoRef}
                  src={`http://localhost:5003${currentBlock.media_url}`} 
                  className="w-full h-full object-cover" 
                  autoPlay 
                  onEnded={() => {
                    // Pause durumunda video bitince seçimler gelmesin
                    if (isPaused) return;
                    // Video bitince blok sonu - seslendirme seçimler gelene kadar çalacak
                    handleBlockEnd(activeContent, activeBlockIndex);
                  }}
                />
                    ) : currentBlock.media_url ? (
                <img 
                  src={`http://localhost:5003${currentBlock.media_url}`} 
                  className="w-full h-full object-cover opacity-80"
                  alt="Scene background"
                />
              ) : (
                <div className="bg-gray-900 w-full h-full opacity-80"/>
              )}
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Karakter Görseli Sol Üstte */}
      {characterImage && (
        <div className={`absolute top-4 left-4 z-30 ${getThemeClass('character-portrait')}`}>
          <div className="bg-black/60 backdrop-blur border-2 border-white/20 rounded-lg p-2 flex items-center gap-3">
            <img 
              src={`http://localhost:5003${characterImage}`} 
              alt={characterName}
              className="w-16 h-16 rounded object-cover border-2 border-white/30"
            />
            <div>
              <p className="text-white font-bold text-sm">{characterName}</p>
            </div>
          </div>
        </div>
      )}

        {/* Bildirimler (Orta Üst, Kuyruk Mantığı) */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40 space-y-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map((notif, idx) => {
            const theme = game?.design_theme || 'default';
            const isRoma = theme === 'roma';
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: -20, x: -50 }}
                animate={{ opacity: 1, y: 0, x: -50 }}
                exit={{ opacity: 0, y: -40, x: -50 }}
                transition={{ duration: 0.3 }}
                className={`${isRoma ? 'bg-amber-900/90 border-4 border-amber-700/60 shadow-[0_0_20px_rgba(217,119,6,0.6)] font-serif' : 'bg-black/80 border-2 border-white/20'} backdrop-blur px-4 py-2 ${isRoma ? 'rounded' : 'rounded-lg'} text-white font-bold shadow-xl`}
                style={{ 
                  marginTop: `${idx * 60}px`,
                  clipPath: isRoma ? 'polygon(3% 0%, 97% 0%, 100% 3%, 100% 97%, 97% 100%, 3% 100%, 0% 97%, 0% 3%)' : undefined
                }}
              >
                <span className={isRoma ? 'text-amber-200' : 'text-primary-400'}>{notif.message}</span>
                {notif.value !== 0 && (
                  <span className={`ml-2 ${notif.value > 0 ? (isRoma ? 'text-amber-300' : 'text-green-400') : (isRoma ? 'text-red-300' : 'text-red-400')}`}>
                    {notif.value > 0 ? '+' : ''}{notif.value}
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <StatDisplay game={game} stats={playerStats} statNotifications={statNotifications} activeRelations={activeRelations} getThemeClass={getThemeClass} />

      <div className="absolute bottom-12 left-0 w-full z-10 p-6 flex flex-col items-center pointer-events-none">
        <AnimatePresence mode='wait'>
          {currentText && (
            <motion.div 
              key={currentText} 
              initial={{opacity:0, y:20}} 
              animate={{opacity:1,y:0}} 
              exit={{opacity:0,y:-20}} 
              className={`mb-8 text-xl md:text-2xl font-medium text-white text-center bg-black/60 backdrop-blur px-6 py-3 rounded-2xl max-w-3xl pointer-events-auto shadow-2xl ${getThemeClass('dialogue-text')}`}
            >
              {currentText}
            </motion.div>
          )}
        </AnimatePresence>

        {showChoices && (
          <motion.div 
            initial={{opacity:0}} 
            animate={{opacity:1}} 
            className={`w-full max-w-4xl ${currentScene?.choices?.filter(c => {
              const isVisible = (c.requirements || []).every(req => {
                if (!req.key) return true;
                return (Number(playerStats[req.key]) || 0) >= Number(req.val);
              });
              return isVisible;
            }).length === 1 ? 'flex justify-center' : 'grid grid-cols-1 md:grid-cols-2'} gap-4 pointer-events-auto ${getThemeClass('choices-container')}`}
          >
            {currentScene?.choices?.map((c, i) => {
                    const isVisible = (c.requirements || []).every(req => {
                        if (!req.key) return true;
                        return (Number(playerStats[req.key]) || 0) >= Number(req.val);
                    });
                    if (!isVisible) return null;
              const theme = game?.design_theme || 'default';
              const isRoma = theme === 'roma';
              const totalTimeout = parseInt(currentScene?.choice_timeout) || 0;
              const hasTimeout = totalTimeout > 0 && timeLeft !== null && timeLeft > 0;
              const timeoutPercent = hasTimeout ? (timeLeft / totalTimeout) * 100 : 100;
              
              return (
                <ChoiceButton
                  key={i}
                  choice={c}
                  onClick={() => handleChoice(c)}
                  theme={theme}
                  isRoma={isRoma}
                  timeLeft={hasTimeout ? timeLeft : null}
                  timeoutPercent={timeoutPercent}
                  totalTimeout={totalTimeout}
                />
              );
                })}
            </motion.div>
        )}
      </div>
    </div>
  );
};

// KARAKTER KURULUM EKRANI (Stat ve İlişki dağıtımı tek ekranda)
const CharacterSetup = ({ game, initialStats, characterName, characterImage, onCharacterNameChange, onCharacterImageChange, onComplete, getThemeClass }) => {
  const name = game?.default_char_name || 'Gezgin'; // Admin'in belirlediği isim
  const [image, setImage] = useState(characterImage || game?.default_char_image || '');
  const [statPoints, setStatPoints] = useState(game?.game_config?.stat_pool || 10);
  const [relationPoints, setRelationPoints] = useState(game?.game_config?.relation_pool || 10);
  const [myStats, setMyStats] = useState(initialStats || {});
  const setupAudioRef = useRef(new Audio());
  
  const needsStatDist = game?.game_config?.stat_distribution === 'user';
  const needsRelationDist = game?.game_config?.relation_distribution === 'user';
  
  const statDefs = (game?.stat_definitions || []).filter(d => d.type === 'stat');
  const relationDefs = (game?.stat_definitions || []).filter(d => d.type === 'relation');
  const theme = game?.design_theme || 'default';
  const isRoma = theme === 'roma';

  // Stat ayarlama sesi
  useEffect(() => {
    if (game?.character_setup_audio) {
      setupAudioRef.current.src = `http://localhost:5003${game.character_setup_audio}`;
      setupAudioRef.current.loop = true;
      setupAudioRef.current.volume = 0.5;
      setupAudioRef.current.play().catch(() => {});
    }
    return () => {
      setupAudioRef.current.pause();
    };
  }, [game?.character_setup_audio]);

  const changeStat = (key, delta, type) => {
    const pool = type === 'stat' ? statPoints : relationPoints;
    const setPool = type === 'stat' ? setStatPoints : setRelationPoints;
    
    if ((delta > 0 && pool <= 0) || (delta < 0 && (myStats[key] || 0) <= 0)) return;
    
    setMyStats(p => ({...p, [key]: (p[key] || 0) + delta}));
    setPool(p => p - delta);
  };

  const handleComplete = () => {
    setupAudioRef.current.pause();
    onComplete(myStats, name, image);
  };

  return (
    <div className={`h-screen ${isRoma ? 'bg-gradient-to-b from-amber-950 via-amber-900 to-black' : 'bg-dark-900'} flex flex-col items-center justify-center text-white p-6 relative ${getThemeClass('character-setup')}`}>
      {isRoma && (
        <>
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAwTDEwMCAxMDBMMCAxMDBaIiBmaWxsPSIjZGY5NzA2IiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')]"></div>
          </div>
          <div className="absolute inset-0 border-8 border-amber-800/30" style={{clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'}}></div>
        </>
      )}
      <div className={`absolute inset-0 ${isRoma ? '' : 'bg-gradient-to-br from-primary-900/20 to-accent-900/20'} pointer-events-none`} />
      <motion.div 
        initial={{opacity:0,y:20}} 
        animate={{opacity:1,y:0}} 
        className={`w-full max-w-4xl z-10 space-y-6 ${isRoma ? 'font-serif' : ''}`}
      >
        <div className="text-center mb-8">
          <h1 className={`text-4xl font-bold mb-2 ${isRoma ? 'text-amber-300 font-serif tracking-wider' : ''}`}>Karakter Oluştur</h1>
          <div className="space-y-4 mt-6">
            <div>
              <p className={`text-lg ${isRoma ? 'text-amber-200 font-serif' : 'text-gray-300'}`}>
                <span className="font-bold">{name}</span>
              </p>
            </div>
            {game?.default_char_image && (
              <div className="flex justify-center">
                <div className={`${isRoma ? 'border-4 border-amber-600 shadow-[0_0_30px_rgba(217,119,6,0.5)]' : 'border-2 border-white/20'} rounded-lg p-2`}>
                  <img 
                    src={`http://localhost:5003${game.default_char_image}`} 
                    alt={name}
                    className={`w-32 h-32 ${isRoma ? 'rounded' : 'rounded-lg'} object-cover`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`grid gap-6 ${needsStatDist && needsRelationDist ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto'}`}>
          {/* STATLAR */}
          {needsStatDist && statDefs.length > 0 && (
            <div className={`${isRoma ? 'bg-amber-900/40 border-4 border-amber-700/50 shadow-[0_0_20px_rgba(217,119,6,0.3)]' : 'bg-white/5 border border-white/10'} p-6 ${isRoma ? 'rounded' : 'rounded-xl'}`}>
              <h2 className={`text-2xl font-bold mb-2 ${isRoma ? 'text-amber-200 font-serif' : ''}`}>Statlar</h2>
              <p className={`${isRoma ? 'text-amber-300' : 'text-gray-400'} mb-4 text-sm`}>
                Kalan Puan: <span className={`${isRoma ? 'text-amber-200' : 'text-primary-500'} font-bold text-xl ml-2`}>{statPoints}</span>
              </p>
              <div className="space-y-3">
                {statDefs.map(s => (
                  <div key={s.key} className={`flex justify-between items-center ${isRoma ? 'bg-amber-800/30 border-2 border-amber-700/40' : 'bg-white/5'} p-3 ${isRoma ? 'rounded' : 'rounded-lg'}`}>
                    <span className={`font-bold ${isRoma ? 'text-amber-100 font-serif' : ''}`}>{s.label}</span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => changeStat(s.key, -1, 'stat')} 
                        className={`w-8 h-8 flex justify-center items-center ${isRoma ? 'bg-amber-700/50 hover:bg-amber-600/50 border border-amber-600' : 'bg-white/10 hover:bg-white/20'} ${isRoma ? 'rounded' : 'rounded'}`}
                        disabled={(myStats[s.key] || 0) <= 0}
                      >
                        <Minus className="w-4 h-4"/>
                      </button>
                      <span className={`w-8 text-center font-bold text-xl ${isRoma ? 'text-amber-200' : ''}`}>{myStats[s.key] || 0}</span>
                      <button 
                        onClick={() => changeStat(s.key, 1, 'stat')} 
                        className={`w-8 h-8 flex justify-center items-center ${isRoma ? 'bg-amber-600 hover:bg-amber-500 border border-amber-500' : 'bg-primary-600 hover:bg-primary-500'} ${isRoma ? 'rounded' : 'rounded'}`}
                        disabled={statPoints <= 0}
                      >
                        <Plus className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* İLİŞKİLER */}
          {needsRelationDist && relationDefs.length > 0 && (
            <div className={`${isRoma ? 'bg-amber-900/40 border-4 border-amber-700/50 shadow-[0_0_20px_rgba(217,119,6,0.3)]' : 'bg-white/5 border border-white/10'} p-6 ${isRoma ? 'rounded' : 'rounded-xl'}`}>
              <h2 className={`text-2xl font-bold mb-2 ${isRoma ? 'text-amber-200 font-serif' : ''}`}>İlişkiler</h2>
              <p className={`${isRoma ? 'text-amber-300' : 'text-gray-400'} mb-4 text-sm`}>
                Kalan Puan: <span className={`${isRoma ? 'text-amber-200' : 'text-primary-500'} font-bold text-xl ml-2`}>{relationPoints}</span>
              </p>
              <div className="space-y-3">
                {relationDefs.map(r => (
                  <div key={r.key} className={`flex justify-between items-center ${isRoma ? 'bg-amber-800/30 border-2 border-amber-700/40' : 'bg-white/5'} p-3 ${isRoma ? 'rounded' : 'rounded-lg'}`}>
                    <span className={`font-bold ${isRoma ? 'text-amber-100 font-serif' : ''}`}>{r.label}</span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => changeStat(r.key, -1, 'relation')} 
                        className={`w-8 h-8 flex justify-center items-center ${isRoma ? 'bg-amber-700/50 hover:bg-amber-600/50 border border-amber-600' : 'bg-white/10 hover:bg-white/20'} ${isRoma ? 'rounded' : 'rounded'}`}
                        disabled={(myStats[r.key] || 0) <= 0}
                      >
                        <Minus className="w-4 h-4"/>
                      </button>
                      <span className={`w-8 text-center font-bold text-xl ${isRoma ? 'text-amber-200' : ''}`}>{myStats[r.key] || 0}</span>
                      <button 
                        onClick={() => changeStat(r.key, 1, 'relation')} 
                        className={`w-8 h-8 flex justify-center items-center ${isRoma ? 'bg-amber-600 hover:bg-amber-500 border border-amber-500' : 'bg-primary-600 hover:bg-primary-500'} ${isRoma ? 'rounded' : 'rounded'}`}
                        disabled={relationPoints <= 0}
                      >
                        <Plus className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleComplete}
          disabled={(needsStatDist && statPoints > 0) || (needsRelationDist && relationPoints > 0)}
          className={`w-full py-4 ${isRoma ? 'bg-amber-700 hover:bg-amber-600 border-4 border-amber-500 shadow-[0_0_30px_rgba(217,119,6,0.6)]' : 'bg-accent-600 hover:bg-accent-500 border-2 border-accent-400'} disabled:bg-gray-600 disabled:cursor-not-allowed ${isRoma ? 'rounded' : 'rounded-2xl'} font-bold text-xl flex justify-center gap-2 shadow-xl mt-6 ${isRoma ? 'font-serif' : ''} transition-all hover:scale-105`}
          style={isRoma ? { clipPath: 'polygon(3% 0%, 97% 0%, 100% 3%, 100% 97%, 97% 100%, 3% 100%, 0% 97%, 0% 3%)' } : {}}
        >
          Başla <ArrowRight className="w-6 h-6"/>
        </button>
      </motion.div>
    </div>
  );
};

// HİKAYE BAŞLIYOR EKRANI
const StoryStartScreen = ({ game, onContinue, getThemeClass }) => {
  const theme = game?.design_theme || 'default';
  const isRoma = theme === 'roma';
  const soundRef = useRef(new Audio());

  useEffect(() => {
    // "Bum" sesi - basit bir thud ses efekti için placeholder
    // Gerçek ses dosyası admin tarafından eklenebilir
    if (isRoma) {
      // Basit bir ses efekti oluştur (gerçek ses dosyası için game.story_start_sound kullanılabilir)
      const playSound = () => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 60;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      };
      
      const timer = setTimeout(playSound, 300);
      return () => clearTimeout(timer);
    }
  }, [isRoma]);

    return (
    <div className={`h-screen ${isRoma ? 'bg-gradient-to-b from-amber-950 via-amber-900 to-black' : 'bg-black'} flex flex-col items-center justify-center text-white relative overflow-hidden ${getThemeClass('story-start')}`}>
      {isRoma && (
        <>
          {/* Antik Roma dekoratif elementler */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-800/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-amber-800/40 to-transparent"></div>
          </div>
          {/* Köşe süslemeleri - Metin2 tarzı */}
          <div className="absolute top-8 left-8 w-24 h-24 border-4 border-amber-600/60 rotate-45" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'}}></div>
          <div className="absolute top-8 right-8 w-24 h-24 border-4 border-amber-600/60 -rotate-45" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'}}></div>
          <div className="absolute bottom-8 left-8 w-24 h-24 border-4 border-amber-600/60 rotate-45" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'}}></div>
          <div className="absolute bottom-8 right-8 w-24 h-24 border-4 border-amber-600/60 -rotate-45" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'}}></div>
          {/* Orta dekoratif çizgiler */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-600/40 to-transparent"></div>
        </>
      )}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className={`z-10 text-center ${isRoma ? 'font-serif' : ''}`}
      >
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className={`${isRoma ? 'text-amber-300 font-serif tracking-widest' : 'text-primary-400'} text-6xl md:text-8xl font-bold mb-4 ${isRoma ? 'text-shadow-[0_0_20px_rgba(217,119,6,0.8)] drop-shadow-[0_0_30px_rgba(217,119,6,0.5)]' : ''}`}
          style={isRoma ? { textShadow: '0 0 20px rgba(217,119,6,0.8), 0 0 40px rgba(217,119,6,0.5)' } : {}}
        >
          HİKAYE BAŞLIYOR
        </motion.h1>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          onClick={onContinue}
          className={`mt-8 px-8 py-4 ${isRoma ? 'bg-amber-700 hover:bg-amber-600 border-4 border-amber-500 shadow-[0_0_30px_rgba(217,119,6,0.6)] font-serif' : 'bg-primary-600 hover:bg-primary-500 border-2 border-primary-400'} ${isRoma ? 'rounded' : 'rounded-xl'} font-bold text-xl flex items-center gap-2 mx-auto transition-all hover:scale-105 shadow-xl`}
          style={isRoma ? { clipPath: 'polygon(3% 0%, 97% 0%, 100% 3%, 100% 97%, 97% 100%, 3% 100%, 0% 97%, 0% 3%)' } : {}}
        >
          Devam Et <ArrowRight className="w-6 h-6"/>
        </motion.button>
      </motion.div>
    </div>
  );
};

// BÖLÜM BAŞLIK EKRANI
const ChapterStartScreen = ({ game, chapterTitle, onContinue, getThemeClass }) => {
  const theme = game?.design_theme || 'default';
  const isRoma = theme === 'roma';

  useEffect(() => {
    // "Bum" sesi
    if (isRoma) {
      const playSound = () => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 60;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      };
      
      const timer = setTimeout(playSound, 300);
      return () => clearTimeout(timer);
    }
  }, [isRoma]);

    return (
    <div className={`h-screen ${isRoma ? 'bg-gradient-to-b from-amber-950 via-amber-900 to-black' : 'bg-black'} flex flex-col items-center justify-center text-white relative overflow-hidden ${getThemeClass('chapter-start')}`}>
      {isRoma && (
        <>
          {/* Antik Roma dekoratif elementler */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-800/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-amber-800/40 to-transparent"></div>
          </div>
          {/* Köşe süslemeleri */}
          <div className="absolute top-8 left-8 w-24 h-24 border-4 border-amber-600/60 rotate-45" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'}}></div>
          <div className="absolute top-8 right-8 w-24 h-24 border-4 border-amber-600/60 -rotate-45" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'}}></div>
          <div className="absolute bottom-8 left-8 w-24 h-24 border-4 border-amber-600/60 rotate-45" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'}}></div>
          <div className="absolute bottom-8 right-8 w-24 h-24 border-4 border-amber-600/60 -rotate-45" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'}}></div>
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-600/40 to-transparent"></div>
        </>
      )}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className={`z-10 text-center ${isRoma ? 'font-serif' : ''}`}
      >
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className={`${isRoma ? 'text-amber-300 font-serif tracking-widest' : 'text-primary-300'} text-5xl md:text-7xl font-bold mb-4 ${isRoma ? '' : 'tracking-wider'}`}
          style={isRoma ? { textShadow: '0 0 20px rgba(217,119,6,0.8), 0 0 40px rgba(217,119,6,0.5)' } : {}}
        >
          {chapterTitle}
        </motion.h1>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          onClick={onContinue}
          className={`mt-8 px-8 py-4 ${isRoma ? 'bg-amber-700 hover:bg-amber-600 border-4 border-amber-500 shadow-[0_0_30px_rgba(217,119,6,0.6)] font-serif' : 'bg-primary-600 hover:bg-primary-500 border-2 border-primary-400'} ${isRoma ? 'rounded' : 'rounded-xl'} font-bold text-xl flex items-center gap-2 mx-auto transition-all hover:scale-105 shadow-xl`}
          style={isRoma ? { clipPath: 'polygon(3% 0%, 97% 0%, 100% 3%, 100% 97%, 97% 100%, 3% 100%, 0% 97%, 0% 3%)' } : {}}
        >
          Devam Et <ArrowRight className="w-6 h-6"/>
        </motion.button>
            </motion.div>
        </div>
    );
};

// SEÇİM BUTONU (Asimetrik, toz/duman efekti ile)
const ChoiceButton = ({ choice, onClick, theme, isRoma, timeLeft, timeoutPercent, totalTimeout }) => {
  const [particles, setParticles] = useState([]);
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    // Toz/duman partikülleri oluştur
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 0.3,
      size: Math.random() * 8 + 4,
    }));
    setParticles(newParticles);
    
    setTimeout(() => {
      onClick();
      setIsClicked(false);
      setParticles([]);
    }, 300);
  };

  // Asimetrik transform için rastgele değerler
  const rotation = useRef(Math.random() * 4 - 2); // -2 ile +2 derece arası
  const skewX = useRef(Math.random() * 2 - 1); // -1 ile +1 derece arası
  const skewY = useRef(Math.random() * 2 - 1);

  return (
    <div className="relative" style={{ transform: `rotate(${rotation.current}deg) skew(${skewX.current}deg, ${skewY.current}deg)` }}>
      <button
        onClick={handleClick}
        disabled={isClicked}
        className={`
          relative w-full p-4 font-bold text-lg backdrop-blur transition-all shadow-lg overflow-hidden
          ${isRoma 
            ? 'bg-amber-900/60 hover:bg-amber-800/70 border-4 border-amber-700/60 text-amber-100 font-serif' 
            : 'bg-white/10 hover:bg-primary-600 border border-white/20 text-white'
          }
          ${isRoma ? 'rounded' : 'rounded-xl'}
          ${isClicked ? 'scale-95' : 'hover:scale-[1.02]'}
          ${isRoma ? 'shadow-[0_0_20px_rgba(217,119,6,0.4)]' : ''}
        `}
        style={{
          clipPath: isRoma ? 'polygon(5% 0%, 95% 0%, 100% 5%, 100% 95%, 95% 100%, 5% 100%, 0% 95%, 0% 5%)' : undefined
        }}
      >
        {/* Süre göstergesi - butonun içinde */}
        {timeLeft !== null && totalTimeout > 0 && timeLeft > 0 && (
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${isRoma ? 'bg-amber-950' : 'bg-gray-800'} overflow-hidden`}>
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: `${timeoutPercent}%` }}
              transition={{ duration: timeLeft, ease: "linear" }}
              className={`h-full ${isRoma ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-red-500'}`}
            />
          </div>
        )}
        
        <span className="relative z-10">{choice.text}</span>
        
        {/* Toz/duman partikülleri */}
        <AnimatePresence>
          {particles.map(particle => (
            <motion.div
              key={particle.id}
              initial={{ 
                opacity: 0.8, 
                scale: 0,
                x: `${particle.x}%`,
                y: `${particle.y}%`
              }}
              animate={{ 
                opacity: 0,
                scale: 1.5,
                x: `${particle.x + (Math.random() - 0.5) * 50}%`,
                y: `${particle.y - 30}%`,
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 0.8,
                delay: particle.delay,
                ease: "easeOut"
              }}
              className="absolute pointer-events-none"
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                background: isRoma 
                  ? 'radial-gradient(circle, rgba(217,119,6,0.6) 0%, rgba(217,119,6,0) 100%)'
                  : 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)',
                borderRadius: '50%',
                filter: 'blur(2px)',
              }}
            />
          ))}
        </AnimatePresence>
      </button>
    </div>
  );
};

// PAUSE MENÜ
const PauseMenu = ({ game, volumeSettings, setVolumeSettings, onResume, getThemeClass }) => {
  const theme = game?.design_theme || 'default';
  const isRoma = theme === 'roma';

  return (
    <div className={`h-screen ${isRoma ? 'bg-gradient-to-b from-amber-950 via-amber-900 to-black' : 'bg-black'} flex items-center justify-center text-white relative overflow-hidden ${getThemeClass('')}`}>
      {isRoma && (
        <>
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-800/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-amber-800/40 to-transparent"></div>
          </div>
        </>
      )}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`z-10 ${isRoma ? 'bg-amber-900/80 border-4 border-amber-700/60' : 'bg-dark-900/90 border border-white/20'} p-8 ${isRoma ? 'rounded' : 'rounded-2xl'} backdrop-blur-md ${isRoma ? 'font-serif' : ''}`}
        style={isRoma ? { clipPath: 'polygon(3% 0%, 97% 0%, 100% 3%, 100% 97%, 97% 100%, 3% 100%, 0% 97%, 0% 3%)' } : {}}
      >
        <h2 className={`text-3xl font-bold mb-6 text-center ${isRoma ? 'text-amber-200' : ''}`}>Oyun Duraklatıldı</h2>
        
        <div className="space-y-4 min-w-[300px]">
          <div>
            <label className={`block mb-2 ${isRoma ? 'text-amber-200' : 'text-gray-300'}`}>Arkaplan Müziği</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volumeSettings.background}
              onChange={(e) => setVolumeSettings({...volumeSettings, background: parseFloat(e.target.value)})}
              className="w-full"
            />
            <span className="text-sm text-gray-400">{Math.round(volumeSettings.background * 100)}%</span>
          </div>
          
          <div>
            <label className={`block mb-2 ${isRoma ? 'text-amber-200' : 'text-gray-300'}`}>Duygu Sesi</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volumeSettings.emotion}
              onChange={(e) => setVolumeSettings({...volumeSettings, emotion: parseFloat(e.target.value)})}
              className="w-full"
            />
            <span className="text-sm text-gray-400">{Math.round(volumeSettings.emotion * 100)}%</span>
          </div>
          
          <div>
            <label className={`block mb-2 ${isRoma ? 'text-amber-200' : 'text-gray-300'}`}>Seslendirme</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volumeSettings.voiceover}
              onChange={(e) => setVolumeSettings({...volumeSettings, voiceover: parseFloat(e.target.value)})}
              className="w-full"
            />
            <span className="text-sm text-gray-400">{Math.round(volumeSettings.voiceover * 100)}%</span>
          </div>
        </div>
        
        <button
          onClick={onResume}
          className={`mt-6 w-full py-3 ${isRoma ? 'bg-amber-700 hover:bg-amber-600 border-4 border-amber-500' : 'bg-primary-600 hover:bg-primary-500'} ${isRoma ? 'rounded' : 'rounded-xl'} font-bold text-lg transition-all hover:scale-105`}
          style={isRoma ? { clipPath: 'polygon(3% 0%, 97% 0%, 100% 3%, 100% 97%, 97% 100%, 3% 100%, 0% 97%, 0% 3%)' } : {}}
        >
          Devam Et (Q)
        </button>
      </motion.div>
    </div>
  );
};

// STAT GÖSTERİMİ
const StatDisplay = ({ game, stats, statNotifications = {}, activeRelations = new Set(), getThemeClass }) => {
  const c = game?.game_config || {}; 
  const d = game?.stat_definitions || [];
  const theme = game?.design_theme || 'default';
  const isRoma = theme === 'roma';

  // İlişki yüzdesine göre renk belirleme
  const getRelationColor = (value, min = 0, max = 100) => {
    const percentage = ((value - min) / (max - min)) * 100;
    if (percentage < 25) return 'red'; // Kırmızı
    if (percentage < 50) return 'orange'; // Turuncu
    if (percentage < 75) return 'yellow'; // Sarı
    return 'green'; // Yeşil
  };

  const getRelationColorClass = (color, isRoma) => {
    if (isRoma) {
      switch(color) {
        case 'red': return 'bg-red-600 border-red-500';
        case 'orange': return 'bg-orange-600 border-orange-500';
        case 'yellow': return 'bg-yellow-600 border-yellow-500';
        case 'green': return 'bg-green-600 border-green-500';
        default: return 'bg-amber-500 border-amber-400';
      }
    } else {
      switch(color) {
        case 'red': return 'bg-red-500';
        case 'orange': return 'bg-orange-500';
        case 'yellow': return 'bg-yellow-500';
        case 'green': return 'bg-green-500';
        default: return 'bg-accent-500';
      }
    }
  };

  return (
    <>
      {/* Aktif ilişkileri göster - sadece start edilmiş olanlar ve sol altta gözüksün seçeneği seçiliyse */}
      {activeRelations.size > 0 && (c.relation_visibility === 'always' || c.relation_visibility === 'always_and_notify') && (
        <div className={`absolute bottom-6 left-6 z-20 space-y-2 ${getThemeClass('relations-display')}`}>
          {d.filter(x => x.type === 'relation' && activeRelations.has(x.key)).map(r => {
            const min = c.relation_min || 0;
            const max = c.relation_max || 100;
            const value = Math.max(min, Math.min(max, stats[r.key] || 0));
            const percentage = ((value - min) / (max - min)) * 100;
            const color = getRelationColor(value, min, max);
            const colorClass = getRelationColorClass(color, isRoma);
            const notif = statNotifications[r.key];
            
            return (
              <div 
                key={r.key} 
                className={`${isRoma ? `bg-amber-900/80 border-4 ${color === 'red' ? 'border-red-700/60' : color === 'orange' ? 'border-orange-700/60' : color === 'yellow' ? 'border-yellow-700/60' : 'border-green-700/60'} shadow-[0_0_15px_rgba(217,119,6,0.4)]` : 'bg-black/40 border border-white/10'} backdrop-blur ${isRoma ? 'px-4 py-2 rounded' : 'px-3 py-1.5 rounded-lg'} text-white text-sm flex gap-3 items-center ${isRoma ? 'font-serif' : ''}`}
              >
                <span className={`${isRoma ? 'text-amber-200' : 'text-accent-400'} font-bold ${isRoma ? 'text-base' : ''}`}>{r.label}</span>
                <div className={`w-24 h-2 ${isRoma ? 'bg-amber-950 border-2 border-amber-800' : 'bg-gray-700'} ${isRoma ? 'rounded' : 'rounded-full'} overflow-hidden`}>
                  <div 
                    className={`h-full ${isRoma ? colorClass : colorClass}`} 
                    style={{width:`${Math.min(Math.max(percentage, 0), 100)}%`}}
                  />
                </div>
                <span className={`text-xs ${isRoma ? 'text-amber-300' : 'text-gray-400'}`}>{Math.round(percentage)}%</span>
                {notif && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={`text-sm font-bold ${notif.percentChange > 0 ? (isRoma ? 'text-green-300' : 'text-green-400') : (isRoma ? 'text-red-300' : 'text-red-400')}`}
                  >
                    {notif.percentChange > 0 ? '+' : ''}{notif.percentChange.toFixed(1)}%
                  </motion.span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {(c.stat_visibility === 'always' || c.stat_visibility === 'always_and_notify') && (
        <div className={`absolute bottom-6 right-6 z-20 ${isRoma ? 'space-y-1' : 'space-y-2'} ${getThemeClass('stats-display')}`}>
          {d.filter(x => x.type === 'stat').map(s => {
            const min = c.stat_min || 0;
            const max = c.stat_max || 100;
            const value = Math.max(min, Math.min(max, stats[s.key] || 0));
            const notif = statNotifications[s.key];
            
            return (
              <div 
                key={s.key} 
                className={`${isRoma ? 'bg-amber-900/60 border-2 border-amber-700/40 shadow-[0_0_10px_rgba(217,119,6,0.3)]' : 'bg-black/40 border border-white/10'} backdrop-blur ${isRoma ? 'px-3 py-1.5 rounded' : 'px-4 py-2 rounded-xl'} text-white font-bold flex gap-2 items-center justify-end ${isRoma ? 'font-serif text-xs' : ''}`}
              >
                <span className={`${isRoma ? 'text-amber-200' : 'text-gray-400'} ${isRoma ? 'text-xs' : 'text-xs uppercase'}`}>{s.label}</span>
                <span className={`${isRoma ? 'text-amber-200' : 'text-primary-400'} ${isRoma ? 'text-lg' : 'text-xl'}`}>{value}</span>
                {notif && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={`text-sm font-bold ${notif.percentChange > 0 ? (isRoma ? 'text-green-300' : 'text-green-400') : (isRoma ? 'text-red-300' : 'text-red-400')}`}
                  >
                    {notif.percentChange > 0 ? '+' : ''}{notif.percentChange.toFixed(1)}%
                  </motion.span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default GamePlayer;
