import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import MainLayout from './components/MainLayout';
import Home from './pages/Home';
import Favorites from './pages/Favorites';
import PlaylistsPage from './pages/Playlists';
import { loadFavorites } from './hooks/useFavorites';
import RecentlyPlayedPage from './pages/RecentlyPlayedPage';
import StatsPage from './pages/Stats';
import SubscriptionsPage from './pages/SubscriptionsPage';
import { usePremium } from './hooks/usePremium';

const App = () => {
  // Lógica de estado y hooks (unificada)
  const checkPremium = usePremium(s => s.check);
  const resetPremium = usePremium(s => s.reset);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      loadFavorites();
      checkPremium(); // Verificar suscripción al iniciar si hay token
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    loadFavorites();
    checkPremium(); // Verificar suscripción al iniciar sesión
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    resetPremium(); // Limpiar el estado premium al cerrar sesión
  };

  // Renderizado
  return (
    <BrowserRouter>
      <Routes>
        {!token ? (
          <Route path="*" element={<Auth onLoginSuccess={handleLogin} />} />
        ) : (
          <Route path="/" element={<MainLayout onLogout={handleLogout} />}>
            <Route index element={<Home />} />
            <Route path="favorites" element={<Favorites />} />
            <Route path="playlists" element={<PlaylistsPage />} />
            <Route path="recent" element={<RecentlyPlayedPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            
            {/* El catch-all (*) siempre debe ir al final */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
};

export default App;