import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
// Importa tus otros componentes (Lista de canciones, etc.)

const App = () => {
  // 1. Estado para guardar el token (lo buscamos en el almacenamiento del navegador)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  // 2. Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  // 3. RENDERIZADO CONDICIONAL
  // Si NO hay token, forzamos la vista de Auth
  if (!token) {
    return (
      <Auth onLoginSuccess={(newToken) => setToken(newToken)} />
    );
  }

  // Si HAY token, mostramos la interfaz de Echofy
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-[#8B5CF6]">Echofy</h1>
        <button 
          onClick={handleLogout}
          className="bg-[#1E1E1E] px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors"
        >
          Cerrar Sesión
        </button>
      </header>

      <main>
        {/* Aquí va tu componente actual de la lista de canciones */}
        <h2 className="text-xl mb-4">Bienvenido a tu música</h2>
        {/* <SongList /> */}
      </main>
    </div>
  );
};

export default App;