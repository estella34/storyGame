import React, { useState, useRef } from 'react';
import { Music, Upload, X, Volume2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/api';

const AudioUploader = ({ label, folderType, currentUrl, onAudioSelect }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Sadece mp3 dosyalarını kabul et
    if (!file.name.toLowerCase().endsWith('.mp3') && file.type !== 'audio/mpeg' && file.type !== 'audio/mp3') {
      toast.error('Sadece MP3 dosyası yükleyebilirsiniz.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('media', file);
    formData.append('folderType', folderType); // 'background' veya 'emotion'

    try {
      const token = localStorage.getItem('token');
      const res = await api.post('/uploads', formData, {
        headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
        }
      });
      onAudioSelect(res.data.url);
      toast.success('Ses yüklendi!');
    } catch (err) {
      toast.error('Ses yüklenemedi.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-dark-900 border border-white/10 rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <label className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">
          {label} {folderType === 'emotion' ? '🗣️' : '🎵'}
        </label>
        {currentUrl && (
          <button onClick={() => onAudioSelect(null)} className="text-red-500 hover:bg-white/10 p-1 rounded"><X size={12}/></button>
        )}
      </div>

      {currentUrl ? (
        <div className="flex items-center gap-2 bg-black/20 p-2 rounded border border-white/5">
          <Volume2 className="text-primary-500 w-4 h-4" />
          <audio controls src={`http://localhost:5003${currentUrl}`} className="h-6 w-full max-w-[150px]" />
        </div>
      ) : (
        <div 
            onClick={() => fileInputRef.current.click()}
            className="border border-dashed border-white/20 rounded hover:bg-white/5 cursor-pointer p-2 flex flex-col items-center justify-center text-gray-500 text-xs gap-1"
        >
            <Upload size={14} />
            <span>{uploading ? '...' : 'Yükle'}</span>
        </div>
      )}
      <input type="file" ref={fileInputRef} className="hidden" accept="audio/mpeg,audio/mp3,.mp3" onChange={handleFile} />
    </div>
  );
};

export default AudioUploader;