import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import MainLayout from './components/MainLayout';
import Home from './pages/Home'; // Crea esta página con tu lista de canciones

const App = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  const handleLogin = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Si NO hay token, cualquier ruta nos manda a Auth */}
        {!token ? (
          <Route path="*" element={<Auth onLoginSuccess={handleLogin} />} />
        ) : (
          /* Si HAY token, entramos al layout persistente */
          <Route path="/" element={<MainLayout onLogout={handleLogout} />}>
            <Route index element={<Home />} />
            {/* <Route path="profile" element={<Profile />} /> */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
};

export default App;