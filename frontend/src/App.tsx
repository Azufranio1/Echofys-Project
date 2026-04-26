import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import MainLayout from './components/MainLayout';
import Home from './pages/Home';
import { loadFavorites } from './hooks/useFavorites';

const App = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  // Si ya hay token al montar (sesión guardada), cargamos favoritos
  useEffect(() => {
    if (token) loadFavorites();
  }, []);

  const handleLogin = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    loadFavorites(); // Cargar favoritos justo después del login
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
};

export default App;