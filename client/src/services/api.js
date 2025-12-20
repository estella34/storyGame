import axios from 'axios';

// Backend portumuz 5003 (Curl testlerinde 5003 çalışmıştı)
const API_URL = 'http://localhost:5003/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Her isteğe otomatik Token ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mevcut kodların altına ekle...

// ... üstteki kodlar aynı

export const uploadMedia = async (file) => {
    const formData = new FormData();
    formData.append('media', file);
    
    const token = localStorage.getItem('token');
    console.log("📤 Yükleme Başlıyor. Token:", token); // Tarayıcı konsoluna yazdır
  
    if (!token) {
      console.error("❌ HATA: Token yok! Kullanıcı giriş yapmamış olabilir.");
    }
  
    const response = await api.post('/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}` 
      },
    });
    return response.data;
  };
  
  export default api;