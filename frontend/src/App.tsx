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

const App = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    if (token) loadFavorites();
  }, []);

  const handleLogin = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    loadFavorites();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {!token ? (
          <Route path="*" element={<Auth onLoginSuccess={handleLogin} />} />
        ) : (
          <Route path="/" element={<MainLayout onLogout={handleLogout} />}>
            <Route index element={<Home />} />
            <Route path="favorites"  element={<Favorites />} />
            <Route path="playlists"  element={<PlaylistsPage />} />
            <Route path="recent"    element={<RecentlyPlayedPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="stats" element={<StatsPage />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
};

export default App;