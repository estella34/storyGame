import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


// Sayfalar
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Admin Sayfaları
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';

import GameEditor from './pages/admin/GameEditor'; // Dosyayı import etmeyi unutma
import GamePlayer from './pages/GamePlayer';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-dark-900 text-white font-sans selection:bg-primary-500 selection:text-white">
        <ToastContainer 
          theme="dark" 
          position="top-center"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Dashboard Route */}
          <Route path="/dashboard" element={<div className="p-20 text-center">User Dashboard Gelecek</div>} />
          <Route path="/play/:id" element={<GamePlayer />} />

          {/* ADMIN ROUTES (Nested Routing) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/games" replace />} /> {/* İlk açılışta oyunlara git */}
            <Route path="games" element={<AdminDashboard />} />
            <Route path="users" element={<div className="text-center p-10">Kullanıcı Yönetimi - Yakında</div>} />
            <Route path="game/:slug" element={<GameEditor />} /> {/* YENİ ROTA */}
            {/* Buraya birazdan Oyun Editör rotasını ekleyeceğiz */}
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;