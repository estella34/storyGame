import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Image as ImageIcon, Film, X, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { uploadMedia } from '../../services/api';

const MediaUploader = ({ onUploadComplete, initialPreview = null, initialType = 'image' }) => {
  const [previewUrl, setPreviewUrl] = useState(initialPreview);
  const [mediaType, setMediaType] = useState(initialType);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Backend sunucu adresi
  const SERVER_URL = 'http://localhost:5003'; 

  // 👇 İŞTE BU KISIM EKSİKTİ:
  // Sahne değiştiğinde (initialPreview değişince) görüntüyü güncelle veya sıfırla
  useEffect(() => {
    setPreviewUrl(initialPreview);
    setMediaType(initialType);
  }, [initialPreview, initialType]);

  const handleFile = async (file) => {
    if (!file) return;

    const fileType = file.type.split('/')[0];
    if (fileType !== 'image' && fileType !== 'video') {
      toast.error('Sadece resim veya video dosyası yükleyebilirsiniz.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setMediaType(fileType);
    setIsUploading(true);

    try {
      const res = await uploadMedia(file);
      toast.success('Medya başarıyla yüklendi.');
      
      const fullUrl = SERVER_URL + res.url; 
      setPreviewUrl(fullUrl);
      
      onUploadComplete({ url: res.url, type: res.type }); 

    } catch (error) {
      toast.error('Yükleme başarısız oldu.');
      setPreviewUrl(initialPreview); // Hata olursa eskiye dön
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const removeMedia = () => {
    setPreviewUrl(null);
    onUploadComplete(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*,video/*"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {!previewUrl ? (
        <motion.div
          onClick={() => !isUploading && fileInputRef.current.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          animate={{ scale: isDragging ? 1.02 : 1 }}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging ? 'border-primary-500 bg-primary-500/10' : 'border-dark-700 hover:border-primary-500/50 hover:bg-white/5'
          } ${isUploading ? 'pointer-events-none opacity-70' : ''}`}
        >
          {isUploading ? (
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
          ) : (
            <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-4" />
          )}
          <p className="text-gray-300 font-medium mb-1">
            {isUploading ? 'Yükleniyor...' : 'Medya Yüklemek İçin Tıkla veya Sürükle'}
          </p>
          <p className="text-xs text-gray-500">PNG, JPG, MP4, WebM (Max 50MB)</p>
        </motion.div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-white/10 glass group">
          {mediaType === 'image' ? (
            <img src={previewUrl} alt="Preview" className="w-full h-64 object-cover" />
          ) : (
            <video src={previewUrl} controls className="w-full h-64 object-cover bg-black" />
          )}

          <div className="absolute top-3 left-3 p-2 bg-black/50 rounded-lg backdrop-blur-md text-white">
            {mediaType === 'image' ? <ImageIcon className="w-4 h-4" /> : <Film className="w-4 h-4" />}
          </div>

          {!isUploading && (
            <button 
              onClick={removeMedia} 
              className="absolute top-3 right-3 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaUploader;