import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, MapPin, Folder, ChevronDown, ChevronRight, Clock, Film, ArrowDown, X, AlertTriangle, Zap, Split, PlayCircle, Flag, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import MediaUploader from '../ui/MediaUploader';
import AudioUploader from '../ui/AudioUploader';

const SceneManager = ({ gameId, statDefinitions = [] }) => {
  const [chapters, setChapters] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [selectedScene, setSelectedScene] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [expandedChoices, setExpandedChoices] = useState({});
  const [previewMode, setPreviewMode] = useState(false);
  const [previewStats, setPreviewStats] = useState({});

  // --- VERİ ÇEKME ---
  const fetchData = async () => { try { const res = await api.get(`/scenes/${gameId}`); setChapters(res.data.data.chapters); setScenes(res.data.data.scenes); } catch (err) { toast.error('Hata.'); } };
  useEffect(() => { fetchData(); }, [gameId]);
  
  // --- TEMEL İŞLEMLER ---
  const handleAddChapter = async () => { const t=prompt("Chapter:"); if(t) { await api.post(`/scenes/${gameId}/chapters`,{title:t}); fetchData(); }};
  const handleDeleteChapter = async (id, e) => { 
    e.stopPropagation(); 
    const chapter = chapters.find(c => c.id === id);
    const chapterScenes = scenes.filter(s => s.chapter_id === id);
    const sceneCount = chapterScenes.length;
    
    if (chapter) {
      const confirmMessage = sceneCount > 0 
        ? `${chapter.title} bölümü ve içindeki ${sceneCount} sahne silinecek. Emin misiniz?`
        : `${chapter.title} bölümü silinecek. Emin misiniz?`;
      
      if (confirm(confirmMessage)) {
        try {
          await api.delete(`/scenes/chapters/${id}`);
          toast.success('Bölüm ve içindeki sahneler silindi.');
          fetchData();
          setSelectedScene(null);
        } catch (err) {
          toast.error('Bölüm silinirken hata oluştu.');
        }
      }
    }
  };
  const handleAddScene = async (cid) => { const t=prompt("Sahne:"); if(t) { const r=await api.post(`/scenes/${gameId}`,{title:t, chapter_id:cid}); setScenes([...scenes,r.data.data]); setSelectedScene(r.data.data); setExpandedChapters(p=>({...p,[cid]:true})); }};
  const handleDeleteScene = async (id) => { if(confirm("Silinsin mi?")) { await api.delete(`/scenes/${id}`); setScenes(scenes.filter(s=>s.id!==id)); setSelectedScene(null); }};
  const handleUpdateScene = async () => { if(!selectedScene)return; setLoading(true); try { await api.put(`/scenes/${selectedScene.id}`, selectedScene); toast.success('Kaydedildi!'); fetchData(); } catch (err) { toast.error('Hata.'); } finally { setLoading(false); } };

  // --- TIMELINE YÖNETİMİ ---
  const addBlock = (targetList = 'content', choiceIndex = null) => {
    const newBlock = { id: Date.now(), media_type: 'image', duration: 5, subtitles: [], bg_audio: null, sfx_audio: null, voiceover_audio: null, conditions: [], relation_start: [], relation_stop: [] };
    if (targetList === 'content') {
        setSelectedScene({ ...selectedScene, content: [...(selectedScene.content || []), newBlock] });
    } else if (choiceIndex !== null) {
        const nc = [...selectedScene.choices];
        if (!nc[choiceIndex].result_content) nc[choiceIndex].result_content = [];
        nc[choiceIndex].result_content.push(newBlock);
        setSelectedScene({ ...selectedScene, choices: nc });
    }
  };

  const updateBlock = (idx, field, val, targetList = 'content', choiceIndex = null) => {
      if (targetList === 'content') {
          const c = [...selectedScene.content]; c[idx][field] = val; setSelectedScene({...selectedScene, content: c});
      } else {
          const nc = [...selectedScene.choices]; nc[choiceIndex].result_content[idx][field] = val; setSelectedScene({...selectedScene, choices: nc});
      }
  };

  const removeBlock = (idx, targetList = 'content', choiceIndex = null) => {
      if (targetList === 'content') {
          const c = [...selectedScene.content]; c.splice(idx, 1); setSelectedScene({...selectedScene, content: c});
      } else {
          const nc = [...selectedScene.choices]; nc[choiceIndex].result_content.splice(idx, 1); setSelectedScene({...selectedScene, choices: nc});
      }
  };

  const addSub = (bIdx, targetList='content', cIdx=null) => {
      const sub = {text:'', duration:3};
      if(targetList==='content') { const c=[...selectedScene.content]; c[bIdx].subtitles.push(sub); setSelectedScene({...selectedScene, content:c}); }
      else { const nc=[...selectedScene.choices]; nc[cIdx].result_content[bIdx].subtitles.push(sub); setSelectedScene({...selectedScene, choices:nc}); }
  };

  // --- LOGIC YÖNETİMİ ---
  const addItemToChoice = (cIdx, listName, item) => {
      const nc = [...selectedScene.choices];
      if (!nc[cIdx][listName]) nc[cIdx][listName] = [];
      nc[cIdx][listName].push(item);
      setSelectedScene({...selectedScene, choices: nc});
  };
  const removeItemFromChoice = (cIdx, listName, itemIdx) => {
      const nc = [...selectedScene.choices];
      nc[cIdx][listName].splice(itemIdx, 1);
      setSelectedScene({...selectedScene, choices: nc});
  };

  // --- RENDER TIMELINE ---
  const renderTimeline = (blocks, targetList, choiceIndex = null) => (
      <div className="space-y-4">
        {blocks?.map((block, bIdx) => (
            <div key={block.id} className="bg-dark-800/50 border border-white/10 rounded-xl p-3 relative group">
                <div className="absolute top-2 right-2 flex gap-2">
                    <span className="text-xs bg-dark-900 px-2 rounded text-gray-400">{bIdx + 1}</span>
                    <button onClick={()=>removeBlock(bIdx, targetList, choiceIndex)} className="text-gray-600 hover:text-red-500"><X size={16}/></button>
                </div>
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-5 space-y-3">
                        <MediaUploader initialPreview={block.media_url?`http://localhost:5003${block.media_url}`:null} initialType={block.media_type} onUploadComplete={f=>{updateBlock(bIdx,'media_url',f?.url,targetList,choiceIndex); updateBlock(bIdx,'media_type',f?.type,targetList,choiceIndex)}} />
                        
                        {/* 👇 BURASI DÜZELTİLDİ: GÖRSEL SÜRESİ ARTIK GÖRÜNÜYOR */}
                        {block.media_type !== 'video' && (
                            <div className="flex items-center gap-2 bg-dark-900 p-2 rounded border border-white/5">
                                <Clock size={14} className="text-primary-500"/>
                                <span className="text-xs text-gray-400">Süre:</span>
                                <input 
                                    type="number" 
                                    className="bg-dark-800 w-16 text-xs text-white rounded px-2 py-1 border border-white/10" 
                                    value={block.duration || 5} 
                                    onChange={e=>updateBlock(bIdx,'duration',parseInt(e.target.value),targetList,choiceIndex)}
                                /> 
                                <span className="text-xs text-gray-500">sn</span>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-2">
                            <AudioUploader label="Arka Plan" folderType="background" currentUrl={block.bg_audio} onAudioSelect={(url) => updateBlock(bIdx, 'bg_audio', url, targetList, choiceIndex)} />
                            <AudioUploader label="Duygu/SFX" folderType="emotion" currentUrl={block.sfx_audio} onAudioSelect={(url) => updateBlock(bIdx, 'sfx_audio', url, targetList, choiceIndex)} />
                            <AudioUploader label="Seslendirme" folderType="background" currentUrl={block.voiceover_audio} onAudioSelect={(url) => updateBlock(bIdx, 'voiceover_audio', url, targetList, choiceIndex)} />
                        </div>
                         <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] text-gray-500">Gözükme Şartları</span>
                                <button onClick={()=>{
                                    const nc = targetList==='content' ? [...selectedScene.content] : [...selectedScene.choices[choiceIndex].result_content];
                                    if(!nc[bIdx].conditions) nc[bIdx].conditions = [];
                                    nc[bIdx].conditions.push({key:'', operator:'>=', val:0});
                                    if(targetList==='content') setSelectedScene({...selectedScene, content:nc});
                                    else { const sc = [...selectedScene.choices]; sc[choiceIndex].result_content = nc; setSelectedScene({...selectedScene, choices:sc}); }
                                }} className="text-[9px] bg-white/10 px-1 rounded text-white">+</button>
                            </div>
                            {(block.conditions || []).map((cond, cIdx)=>(<div key={cIdx} className="flex gap-1 items-center">
                                <select className="bg-dark-900 text-[9px] text-white flex-1 rounded" value={cond.key||''} onChange={e=>{
                                    const nc = targetList==='content' ? [...selectedScene.content] : [...selectedScene.choices[choiceIndex].result_content];
                                    nc[bIdx].conditions[cIdx].key = e.target.value;
                                    if(targetList==='content') setSelectedScene({...selectedScene, content:nc});
                                    else { const sc = [...selectedScene.choices]; sc[choiceIndex].result_content = nc; setSelectedScene({...selectedScene, choices:sc}); }
                                }}><option value="">Stat/İlişki...</option>{statDefinitions.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select>
                                <select className="bg-dark-900 text-[9px] text-white w-10 rounded" value={cond.operator||'>='} onChange={e=>{
                                    const nc = targetList==='content' ? [...selectedScene.content] : [...selectedScene.choices[choiceIndex].result_content];
                                    nc[bIdx].conditions[cIdx].operator = e.target.value;
                                    if(targetList==='content') setSelectedScene({...selectedScene, content:nc});
                                    else { const sc = [...selectedScene.choices]; sc[choiceIndex].result_content = nc; setSelectedScene({...selectedScene, choices:sc}); }
                                }}><option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="=">=</option><option value=">">&gt;</option><option value="<">&lt;</option></select>
                                <input type="number" className="bg-dark-900 text-[9px] text-white w-16 rounded px-1" value={cond.val||0} onChange={e=>{
                                    const nc = targetList==='content' ? [...selectedScene.content] : [...selectedScene.choices[choiceIndex].result_content];
                                    nc[bIdx].conditions[cIdx].val = e.target.value;
                                    if(targetList==='content') setSelectedScene({...selectedScene, content:nc});
                                    else { const sc = [...selectedScene.choices]; sc[choiceIndex].result_content = nc; setSelectedScene({...selectedScene, choices:sc}); }
                                }}/>
                                <button onClick={()=>{
                                    const nc = targetList==='content' ? [...selectedScene.content] : [...selectedScene.choices[choiceIndex].result_content];
                                    nc[bIdx].conditions.splice(cIdx,1);
                                    if(targetList==='content') setSelectedScene({...selectedScene, content:nc});
                                    else { const sc = [...selectedScene.choices]; sc[choiceIndex].result_content = nc; setSelectedScene({...selectedScene, choices:sc}); }
                                }} className="text-red-500 text-[9px]">x</button>
                            </div>))}
                            <div className="pt-1 border-t border-white/5 space-y-2">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] text-gray-500">İlişki Başlat</span>
                                        <button onClick={()=>{
                                            const nc = targetList==='content' ? [...selectedScene.content] : [...selectedScene.choices[choiceIndex].result_content];
                                            if(!nc[bIdx].relation_start) nc[bIdx].relation_start = [];
                                            if(Array.isArray(nc[bIdx].relation_start)) {
                                                nc[bIdx].relation_start.push('');
                                            } else {
                                                nc[bIdx].relation_start = [nc[bIdx].relation_start, ''].filter(Boolean);
                                            }
                                            if(targetList==='content') setSelectedScene({...selectedScene, content:nc});
                                            else { const sc = [...selectedScene.choices]; sc[choiceIndex].result_content = nc; setSelectedScene({...selectedScene, choices:sc}); }
                                        }} className="text-[9px] bg-white/10 px-1 rounded text-white">+</button>
                                    </div>
                                    {(Array.isArray(block.relation_start) ? block.relation_start : (block.relation_start ? [block.relation_start] : [])).map((rel, rIdx)=>(<div key={rIdx} className="flex gap-1 items-center mb-1">
                                        <select className="bg-dark-900 text-[9px] text-white flex-1 rounded" value={rel||''} onChange={e=>{
                                            const nc = targetList==='content' ? [...selectedScene.content] : [...selectedScene.choices[choiceIndex].result_content];
                                            if(!nc[bIdx].relation_start) nc[bIdx].relation_start = [];
                                            if(Array.isArray(nc[bIdx].relation_start)) {
                                                nc[bIdx].relation_start[rIdx] = e.target.value;
                                            } else {
                                                nc[bIdx].relation_start = [e.target.value];
                                            }
                                            if(targetList==='content') setSelectedScene({...selectedScene, content:nc});
                                            else { const sc = [...selectedScene.choices]; sc[choiceIndex].result_content = nc; setSelectedScene({...selectedScene, choices:sc}); }
                                        }}>
                                            <option value="">İlişki seç...</option>
                                            {statDefinitions.filter(s=>s.type==='relation').map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                                        </select>
                                        <button onClick={()=>{
                                            const nc = targetList==='content' ? [...selectedScene.content] : [...selectedScene.choices[choiceIndex].result_content];
                                            if(Array.isArray(nc[bIdx].relation_start)) {
                                                nc[bIdx].relation_start.splice(rIdx,1);
                                            } else {
                                                nc[bIdx].relation_start = [];
                                            }
                                            if(targetList==='content') setSelectedScene({...selectedScene, content:nc});
                                            else { const sc = [...selectedScene.choices]; sc[choiceIndex].result_content = nc; setSelectedScene({...selectedScene, choices:sc}); }
                                        }} className="text-red-500 text-[9px]">x</button>
                                    </div>))}
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] text-gray-500">İlişki Bitir</span>
                                        <button onClick={()=>{
                                            const nc = targetList==='content' ? [...selectedScene.content] : [...selectedScene.choices[choiceIndex].result_content];
                                            if(!nc[bIdx].relation_stop) nc[bIdx].relation_stop = [];
                                            if(Array.isArray(nc[bIdx].relation_stop)) {
                                                nc[bIdx].relation_stop.push('');
                                            } else {
                                                nc[bIdx].relation_stop = [nc[bIdx].relation_stop, ''].filter(Boolean);
                                            }
                                            if(targetList==='content') setSelectedScene({...selectedScene, content:nc});
                                            else { const sc = [...selectedScene.choices]; sc[choiceIndex].result_content = nc; setSelectedScene({...selectedScene, choices:sc}); }
                                        }} className="text-[9px] bg-white/10 px-1 rounded text-white">+</button>
                                    </div>
                                    {(Array.isArray(block.relation_stop) ? block.relation_stop : (block.relation_stop ? [block.relation_stop] : [])).map((rel, rIdx)=>(<div key={rIdx} className="flex gap-1 items-center mb-1">
                                        <select className="bg-dark-900 text-[9px] text-white flex-1 rounded" value={rel||''} onChange={e=>{
                                            const nc = targetList==='content' ? [...selectedScene.content] : [...selectedScene.choices[choiceIndex].result_content];
                                            if(!nc[bIdx].relation_stop) nc[bIdx].relation_stop = [];
                                            if(Array.isArray(nc[bIdx].relation_stop)) {
                                                nc[bIdx].relation_stop[rIdx] = e.target.value;
                                            } else {
                                                nc[bIdx].relation_stop = [e.target.value];
                                            }
                                            if(targetList==='content') setSelectedScene({...selectedScene, content:nc});
                                            else { const sc = [...selectedScene.choices]; sc[choiceIndex].result_content = nc; setSelectedScene({...selectedScene, choices:sc}); }
                                        }}>
                                            <option value="">İlişki seç...</option>
                                            {statDefinitions.filter(s=>s.type==='relation').map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                                        </select>
                                        <button onClick={()=>{
                                            const nc = targetList==='content' ? [...selectedScene.content] : [...selectedScene.choices[choiceIndex].result_content];
                                            if(Array.isArray(nc[bIdx].relation_stop)) {
                                                nc[bIdx].relation_stop.splice(rIdx,1);
                                            } else {
                                                nc[bIdx].relation_stop = [];
                                            }
                                            if(targetList==='content') setSelectedScene({...selectedScene, content:nc});
                                            else { const sc = [...selectedScene.choices]; sc[choiceIndex].result_content = nc; setSelectedScene({...selectedScene, choices:sc}); }
                                        }} className="text-red-500 text-[9px]">x</button>
                                    </div>))}
                                </div>
                            </div>
                         </div>
                    </div>
                    <div className="col-span-7 space-y-2">
                        <div className="flex justify-between"><span className="text-xs text-gray-500">Metinler</span><button onClick={()=>addSub(bIdx,targetList,choiceIndex)} className="text-[10px] bg-white/10 px-2 rounded text-white">+</button></div>
                        {block.subtitles?.map((sub, sIdx)=>(
                            <div key={sIdx} className="flex gap-2">
                                <textarea rows={2} className="flex-1 bg-dark-900 text-xs text-white rounded p-1" value={sub.text} onChange={e=>{
                                    if(targetList==='content'){const c=[...selectedScene.content]; c[bIdx].subtitles[sIdx].text=e.target.value; setSelectedScene({...selectedScene, content:c})}
                                    else{const nc=[...selectedScene.choices]; nc[choiceIndex].result_content[bIdx].subtitles[sIdx].text=e.target.value; setSelectedScene({...selectedScene, choices:nc})}
                                }}/>
                                <input type="number" className="w-10 bg-dark-900 text-xs text-white p-1 rounded h-8 text-center" value={sub.duration} onChange={e=>{
                                    if(targetList==='content'){const c=[...selectedScene.content]; c[bIdx].subtitles[sIdx].duration=parseInt(e.target.value); setSelectedScene({...selectedScene, content:c})}
                                    else{const nc=[...selectedScene.choices]; nc[choiceIndex].result_content[bIdx].subtitles[sIdx].duration=parseInt(e.target.value); setSelectedScene({...selectedScene, choices:nc})}
                                }}/>
                                <button onClick={()=>{
                                     if(targetList==='content'){const c=[...selectedScene.content]; c[bIdx].subtitles.splice(sIdx,1); setSelectedScene({...selectedScene, content:c})}
                                     else{const nc=[...selectedScene.choices]; nc[choiceIndex].result_content[bIdx].subtitles.splice(sIdx,1); setSelectedScene({...selectedScene, choices:nc})}
                                }} className="text-red-500"><X size={12}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        ))}
        <button onClick={()=>addBlock(targetList, choiceIndex)} className="w-full py-2 border border-dashed border-white/20 text-gray-500 text-xs hover:bg-white/5 rounded">+ Medya/Ses Bloğu Ekle</button>
      </div>
  );

  return (
    <div className="flex h-[850px] border border-white/10 rounded-2xl overflow-hidden glass">
      {/* SOL MENÜ */}
      <div className="w-72 border-r border-white/10 flex flex-col bg-dark-800/50">
         <div className="p-4 flex justify-between"><h3 className="font-bold text-white text-sm">Bölümler</h3><button onClick={handleAddChapter} className="text-xs bg-accent-600/20 text-accent-500 px-2 rounded">+</button></div>
         <div className="flex-1 overflow-y-auto p-2">{chapters.map(c=>(<div key={c.id} className="mb-1"><div onClick={()=>setExpandedChapters(p=>({...p,[c.id]:!p[c.id]}))} className="flex gap-2 p-2 hover:bg-white/5 rounded cursor-pointer text-gray-300 text-sm">{expandedChapters[c.id]?<ChevronDown size={14}/>:<ChevronRight size={14}/>} {c.title} <button onClick={(e)=>{e.stopPropagation();handleAddScene(c.id)}} className="ml-auto text-primary-500 px-1">+</button><button onClick={(e)=>{e.stopPropagation();handleDeleteChapter(c.id, e)}} className="text-red-500 hover:text-red-400 px-1"><Trash2 size={12}/></button></div>{expandedChapters[c.id]&&scenes.filter(s=>s.chapter_id===c.id).map(s=>(
             <div key={s.id} onClick={()=>setSelectedScene(s)} className={`ml-6 p-2 text-xs rounded cursor-pointer flex items-center gap-1 ${selectedScene?.id===s.id?'bg-primary-600 text-white':'text-gray-500'}`}>
                 {s.is_starting_scene && <Flag size={10} className="text-green-400"/>} 
                 {s.title} 
                 {s.is_end_scene && <span className="ml-auto">🏁</span>}
             </div>
         ))}</div>))}</div>
      </div>

      {/* ÖNİZLEME MODU */}
      {previewMode && selectedScene && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={() => setPreviewMode(false)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold"
            >
              Kapat (ESC)
            </button>
          </div>
          <ScenePreview 
            scene={selectedScene} 
            stats={previewStats}
            statDefinitions={statDefinitions}
            onClose={() => setPreviewMode(false)}
          />
        </div>
      )}

      {/* SAĞ EDİTÖR */}
      <div className="flex-1 flex flex-col bg-dark-900/50">
        {selectedScene ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* ÜST BAŞLIK & AYARLAR */}
            <div className="flex justify-between items-start pb-4 border-b border-white/5">
                <div className="flex-1 mr-4">
                    <label className="text-xs text-gray-500">Sahne Başlığı</label>
                    <input type="text" className="bg-transparent text-xl font-bold text-white w-full outline-none" value={selectedScene.title} onChange={e=>setSelectedScene({...selectedScene, title:e.target.value})} />
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => {
                            // Geçici stat değerleri oluştur
                            const tempStats = {};
                            statDefinitions.forEach(stat => {
                                const min = stat.type === 'relation' ? 0 : 0;
                                const max = stat.type === 'relation' ? 100 : 100;
                                // Orta değerler ver (test için)
                                tempStats[stat.key] = Math.floor((min + max) / 2);
                            });
                            setPreviewStats(tempStats);
                            setPreviewMode(true);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/20 border border-blue-500 text-blue-400 hover:bg-blue-500/30 transition-colors flex items-center gap-2"
                    >
                        <PlayCircle size={12} /> Önizle
                    </button>
                    <div onClick={()=>{
                        const newIsStarting = !selectedScene.is_starting_scene;
                        if (newIsStarting) {
                            // Eğer bu sahne başlangıç yapılıyorsa, diğer tüm sahnelerin başlangıç işaretini kaldır
                            const updatedScenes = scenes.map(s => 
                                s.id === selectedScene.id 
                                    ? {...s, is_starting_scene: true}
                                    : {...s, is_starting_scene: false}
                            );
                            setScenes(updatedScenes);
                            setSelectedScene({...selectedScene, is_starting_scene: true});
                        } else {
                            setSelectedScene({...selectedScene, is_starting_scene: false});
                        }
                    }} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border flex items-center gap-2 transition-colors ${selectedScene.is_starting_scene ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-white/10 text-gray-500 hover:bg-white/5'}`}>
                        <Flag size={12} /> {selectedScene.is_starting_scene ? 'BAŞLANGIÇ' : 'Başlangıç Yap'}
                    </div>
                    <div onClick={()=>setSelectedScene({...selectedScene, is_end_scene: !selectedScene.is_end_scene})} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border flex items-center gap-2 transition-colors ${selectedScene.is_end_scene ? 'bg-red-500/20 border-red-500 text-red-500' : 'border-white/10 text-gray-500 hover:bg-white/5'}`}>
                        <CheckCircle size={12} /> {selectedScene.is_end_scene ? 'BÖLÜM SONU' : 'Son Sahne Yap'}
                    </div>
                    <div onClick={()=>setSelectedScene({...selectedScene, is_final: !selectedScene.is_final})} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border flex items-center gap-2 transition-colors ${selectedScene.is_final ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'border-white/10 text-gray-500 hover:bg-white/5'}`}>
                        <Flag size={12} /> {selectedScene.is_final ? 'OYUN SONU' : 'Final Yap'}
                    </div>
                    <button onClick={handleUpdateScene} disabled={loading} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-gray-600 rounded-lg text-white font-bold text-sm transition-colors flex items-center gap-2">
                        {loading ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} {loading ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                    <button onClick={()=>handleDeleteScene(selectedScene.id)} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg"><Trash2 size={16}/></button>
                </div>
            </div>

            {/* ANA AKIŞ */}
            <div className="space-y-2">
                <h4 className="text-sm font-bold text-white flex gap-2"><Film size={16}/> Sahne Akışı</h4>
                {renderTimeline(selectedScene.content, 'content')}
            </div>
            
            <div className="flex justify-center"><ArrowDown className="text-white/20"/></div>

            {/* SEÇENEKLER & DETAYLAR */}
            <div className="space-y-4">
                {/* 👇 BURASI DÜZELTİLDİ: KARAR SÜRESİ ARTIK BURADA */}
                <div className="flex justify-between items-center bg-dark-800 p-3 rounded-xl border border-white/10">
                    <h4 className="text-sm font-bold text-white">Seçimler</h4>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-dark-900 px-3 py-1 rounded-lg border border-white/5">
                            <Clock size={14} className="text-yellow-500"/>
                            <span className="text-xs text-gray-400">Karar Süresi:</span>
                            <input 
                                type="number" 
                                className="bg-transparent w-10 text-xs text-white text-center font-bold outline-none" 
                                value={selectedScene.choice_timeout || 0}
                                onChange={e=>setSelectedScene({...selectedScene, choice_timeout: parseInt(e.target.value)})}
                                placeholder="0"
                            />
                            <span className="text-xs text-gray-500">sn</span>
                        </div>
                        <button onClick={()=>setSelectedScene({...selectedScene, choices:[...(selectedScene.choices||[]),{text:'Yeni',result_content:[]}]})} className="text-xs bg-primary-600 hover:bg-primary-500 px-3 py-1.5 rounded-lg text-white font-bold transition-colors">+ Seçenek Ekle</button>
                    </div>
                </div>

                {selectedScene.choices?.map((choice, cIdx)=>(
                    <div key={cIdx} className="bg-dark-800/80 border border-white/10 rounded-xl p-4 space-y-3">
                        <div className="flex gap-3 items-center">
                            <button onClick={()=>setExpandedChoices(p=>({...p,[cIdx]:!p[cIdx]}))} className="text-gray-400 hover:text-white">{expandedChoices[cIdx]?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</button>
                            <input type="text" className="flex-1 bg-dark-900 border border-white/10 rounded px-3 py-2 text-white text-sm" value={choice.text} onChange={e=>{const nc=[...selectedScene.choices]; nc[cIdx].text=e.target.value; setSelectedScene({...selectedScene, choices:nc})}}/>
                            <select className="w-1/3 bg-dark-900 border border-white/10 rounded px-2 text-xs text-white" value={choice.target_scene_id||''} onChange={e=>{const nc=[...selectedScene.choices]; nc[cIdx].target_scene_id=e.target.value; setSelectedScene({...selectedScene, choices:nc})}}>
                                <option value="">Hedef...</option>
                                {(() => {
                                    // Eğer bu sahne bölüm sonu ise, kendi bölümü hariç diğer tüm bölümlerden sahneleri göster
                                    if (selectedScene.is_end_scene) {
                                        const currentChapter = chapters.find(c => c.id === selectedScene.chapter_id);
                                        if (currentChapter) {
                                            // Kendi bölümü hariç tüm sahneleri göster
                                            const otherScenes = scenes.filter(s => s.chapter_id !== currentChapter.id);
                                            if (otherScenes.length > 0) {
                                                // Bölümlere göre grupla
                                                const scenesByChapter = {};
                                                otherScenes.forEach(s => {
                                                    const chapter = chapters.find(c => c.id === s.chapter_id);
                                                    const chapterTitle = chapter ? chapter.title : 'Bilinmeyen Bölüm';
                                                    if (!scenesByChapter[chapterTitle]) {
                                                        scenesByChapter[chapterTitle] = [];
                                                    }
                                                    scenesByChapter[chapterTitle].push(s);
                                                });
                                                
                                                return Object.entries(scenesByChapter).map(([chapterTitle, chapterScenes]) => (
                                                    <optgroup key={chapterTitle} label={chapterTitle}>
                                                        {chapterScenes.map(s => (
                                                            <option key={s.id} value={s.id}>{s.title}</option>
                                                        ))}
                                                    </optgroup>
                                                ));
                                            }
                                            return <option value="">Başka bölüm yok</option>;
                                        }
                                    }
                                    // Normal sahne ise tüm sahneleri göster
                                    return scenes.map(s=><option key={s.id} value={s.id}>{s.title}</option>);
                                })()}
                            </select>
                            <button onClick={()=>{const nc=[...selectedScene.choices]; nc.splice(cIdx,1); setSelectedScene({...selectedScene, choices:nc})}} className="text-red-500"><Trash2 size={16}/></button>
                        </div>
                        {expandedChoices[cIdx] && (
                            <div className="ml-8 border-l-2 border-white/10 pl-4 space-y-4 pt-2">
                                <div className="bg-black/20 p-3 rounded-lg border border-dashed border-white/10"><h5 className="text-xs font-bold text-accent-400 mb-2 flex items-center gap-2"><PlayCircle size={12}/> Ara Sahne (Opsiyonel)</h5>{renderTimeline(choice.result_content, 'result_content', cIdx)}</div>
                                <div className="grid grid-cols-3 gap-4">
                                     <div className="bg-dark-900/50 p-2 rounded border border-white/5"><div className="flex justify-between mb-2"><span className="text-[10px] font-bold text-yellow-500 flex items-center gap-1"><AlertTriangle size={10}/> ŞARTLAR</span><button onClick={()=>addItemToChoice(cIdx,'requirements',{key:'',val:0})} className="text-[10px] bg-white/10 px-1 rounded text-white">+</button></div>{choice.requirements?.map((req, rIdx)=>(<div key={rIdx} className="flex gap-1 mb-1"><select className="bg-dark-900 text-[9px] text-gray-300 w-full rounded" value={req.key} onChange={e=>{const nc=[...selectedScene.choices]; nc[cIdx].requirements[rIdx].key=e.target.value; setSelectedScene({...selectedScene,choices:nc})}}><option value="">Stat..</option>{statDefinitions.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select><input type="number" className="bg-dark-900 text-[9px] text-white w-12 rounded px-1" value={req.val} onChange={e=>{const nc=[...selectedScene.choices]; nc[cIdx].requirements[rIdx].val=e.target.value; setSelectedScene({...selectedScene,choices:nc})}}/><button onClick={()=>removeItemFromChoice(cIdx,'requirements',rIdx)} className="text-red-500 text-[10px]">x</button></div>))}</div>
                                     <div className="bg-dark-900/50 p-2 rounded border border-white/5"><div className="flex justify-between mb-2"><span className="text-[10px] font-bold text-blue-500 flex items-center gap-1"><Zap size={10}/> ETKİLER</span><button onClick={()=>addItemToChoice(cIdx,'effects',{key:'',val:0})} className="text-[10px] bg-white/10 px-1 rounded text-white">+</button></div>{choice.effects?.map((eff, eIdx)=>(<div key={eIdx} className="flex gap-1 mb-1"><select className="bg-dark-900 text-[9px] text-gray-300 w-full rounded" value={eff.key} onChange={e=>{const nc=[...selectedScene.choices]; nc[cIdx].effects[eIdx].key=e.target.value; setSelectedScene({...selectedScene,choices:nc})}}><option value="">Stat..</option>{statDefinitions.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select><input type="number" className="bg-dark-900 text-[9px] text-white w-12 rounded px-1" value={eff.val} onChange={e=>{const nc=[...selectedScene.choices]; nc[cIdx].effects[eIdx].val=e.target.value; setSelectedScene({...selectedScene,choices:nc})}}/><button onClick={()=>removeItemFromChoice(cIdx,'effects',eIdx)} className="text-red-500 text-[10px]">x</button></div>))}</div>
                                     <div className="bg-dark-900/50 p-2 rounded border border-white/5"><div className="flex justify-between mb-2"><span className="text-[10px] font-bold text-purple-500 flex items-center gap-1"><Split size={10}/> ROTA</span><button onClick={()=>addItemToChoice(cIdx,'dynamic_routes',{keys:[], val:0, operator:'>', target:''})} className="text-[10px] bg-white/10 px-1 rounded text-white">+</button></div>{choice.dynamic_routes?.map((route, rtIdx)=>(<div key={rtIdx} className="flex flex-col gap-2 mb-2 border-b border-white/5 pb-2">
                                        <div className="flex gap-1 items-center"><span className="text-[9px] text-gray-500">Eğer</span>
                                            <div className="flex-1 flex flex-wrap gap-1">
                                                {(route.keys || (route.key ? [route.key] : [])).map((k, kIdx)=>(<div key={kIdx} className="flex gap-1 items-center"><select className="bg-dark-900 text-[9px] rounded" value={k} onChange={e=>{const nc=[...selectedScene.choices]; const newKeys=[...(route.keys || (route.key ? [route.key] : []))]; newKeys[kIdx]=e.target.value; nc[cIdx].dynamic_routes[rtIdx]={...nc[cIdx].dynamic_routes[rtIdx], keys:newKeys, key:undefined}; setSelectedScene({...selectedScene,choices:nc})}}><option value="">Stat...</option>{statDefinitions.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select>{kIdx < (route.keys || (route.key ? [route.key] : [])).length - 1 && <span className="text-[9px] text-gray-500">+</span>}</div>))}
                                                <button onClick={()=>{const nc=[...selectedScene.choices]; const newKeys=[...(route.keys || (route.key ? [route.key] : []))]; newKeys.push(''); nc[cIdx].dynamic_routes[rtIdx]={...nc[cIdx].dynamic_routes[rtIdx], keys:newKeys, key:undefined}; setSelectedScene({...selectedScene,choices:nc})}} className="text-[9px] bg-white/10 px-1 rounded text-white">+</button>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 items-center"><select className="bg-dark-900 text-[9px] w-10 rounded" value={route.operator} onChange={e=>{const nc=[...selectedScene.choices]; nc[cIdx].dynamic_routes[rtIdx].operator=e.target.value; setSelectedScene({...selectedScene,choices:nc})}}><option value=">">&gt;</option><option value="<">&lt;</option><option value="=">=</option></select><input type="number" className="bg-dark-900 text-[9px] w-12 rounded px-1" value={route.val} onChange={e=>{const nc=[...selectedScene.choices]; nc[cIdx].dynamic_routes[rtIdx].val=e.target.value; setSelectedScene({...selectedScene,choices:nc})}}/></div>
                                        <div className="flex gap-1 items-center"><span className="text-[9px] text-gray-500">Git</span><select className="bg-dark-900 text-[9px] flex-1 rounded" value={route.target} onChange={e=>{const nc=[...selectedScene.choices]; nc[cIdx].dynamic_routes[rtIdx].target=e.target.value; setSelectedScene({...selectedScene,choices:nc})}}><option value="">Seç...</option>{scenes.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select><button onClick={()=>removeItemFromChoice(cIdx,'dynamic_routes',rtIdx)} className="text-red-500 text-[9px]">x</button></div>
                                    </div>))}</div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
          </div>
        ) : <div className="flex justify-center items-center flex-1 text-gray-500">Seçim yapın.</div>}
      </div>
    </div>
  );
};
// ÖNİZLEME KOMPONENTİ
const ScenePreview = ({ scene, stats, statDefinitions, onClose }) => {
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [showChoices, setShowChoices] = useState(false);
  const currentBlock = scene.content?.[currentBlockIndex] || null;

  // ESC tuşu ile kapat
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Blok yükleme
  useEffect(() => {
    if (!currentBlock) {
      setShowChoices(true);
      return;
    }

    setCurrentText("");
    const duration = Number(currentBlock.duration) || 5;
    
    // Altyazıları göster
    if (currentBlock.subtitles?.length > 0) {
      let totalDelay = 0;
      currentBlock.subtitles.forEach((sub, idx) => {
        setTimeout(() => {
          setCurrentText(sub.text);
          if (idx === currentBlock.subtitles.length - 1) {
            setTimeout(() => setCurrentText(""), Number(sub.duration) * 1000);
          }
        }, totalDelay * 1000);
        totalDelay += Number(sub.duration);
      });
    }

    // Blok süresi bitince sonrakine geç
    const timer = setTimeout(() => {
      if (currentBlockIndex < (scene.content?.length || 0) - 1) {
        setCurrentBlockIndex(currentBlockIndex + 1);
      } else {
        setShowChoices(true);
      }
    }, duration * 1000);

    return () => clearTimeout(timer);
  }, [currentBlockIndex, currentBlock, scene.content]);

  const handleChoice = (choice) => {
    alert(`Seçim: ${choice.text}\nHedef Sahne ID: ${choice.target_scene_id || 'Yok'}`);
    // Önizlemede seçim yapıldığında sadece alert göster
  };

  const filteredContent = (scene.content || []).filter(block => {
    if (!block.condition_key) return true;
    return (Number(stats[block.condition_key]) || 0) >= Number(block.condition_val || 0);
  });

  const visibleChoices = (scene.choices || []).filter(c => {
    if (!c.requirements || c.requirements.length === 0) return true;
    return c.requirements.every(req => (Number(stats[req.key]) || 0) >= Number(req.val));
  });

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Arkaplan */}
      <div className="absolute inset-0 z-0">
        {currentBlock?.media_type === 'video' ? (
          <video 
            src={`http://localhost:5003${currentBlock.media_url}`} 
            className="w-full h-full object-cover" 
            autoPlay 
            loop
          />
        ) : currentBlock?.media_url ? (
          <img 
            src={`http://localhost:5003${currentBlock.media_url}`} 
            className="w-full h-full object-cover opacity-80"
            alt="Scene background"
          />
        ) : (
          <div className="bg-gray-900 w-full h-full opacity-80"/>
        )}
      </div>

      {/* Statlar (Sağ Alt) */}
      <div className="absolute bottom-6 right-6 z-20 space-y-2 text-right">
        {statDefinitions.filter(s => s.type === 'stat').map(s => (
          <div key={s.key} className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-white text-xs">
            <span className="text-gray-400">{s.label}: </span>
            <span className="text-primary-400 font-bold">{stats[s.key] || 0}</span>
          </div>
        ))}
      </div>

      {/* İlişkiler (Sol Alt) */}
      <div className="absolute bottom-6 left-6 z-20 space-y-2">
        {statDefinitions.filter(s => s.type === 'relation').map(s => (
          <div key={s.key} className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-white text-xs flex gap-2 items-center">
            <span className="text-accent-400 font-bold">{s.label}</span>
            <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-accent-500" style={{width:`${Math.min(stats[s.key]||0,100)}%`}} />
            </div>
            <span className="text-gray-400">{stats[s.key] || 0}%</span>
          </div>
        ))}
      </div>

      {/* Metin */}
      <div className="absolute bottom-12 left-0 w-full z-10 p-6 flex flex-col items-center pointer-events-none">
        {currentText && (
          <div className="mb-8 text-xl md:text-2xl font-medium text-white text-center bg-black/60 backdrop-blur px-6 py-3 rounded-2xl max-w-3xl pointer-events-auto shadow-2xl">
            {currentText}
          </div>
        )}

        {/* Seçenekler */}
        {showChoices && visibleChoices.length > 0 && (
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 pointer-events-auto">
            {visibleChoices.map((choice, i) => (
              <button
                key={i}
                onClick={() => handleChoice(choice)}
                className="p-4 font-bold text-lg backdrop-blur bg-white/10 hover:bg-primary-600 border border-white/20 text-white rounded-xl transition-all hover:scale-[1.02]"
              >
                {choice.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SceneManager;