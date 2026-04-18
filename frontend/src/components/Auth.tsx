import React, { useState } from 'react';
import { Mail, Lock, User, Music } from 'lucide-react';

const Auth = ({ onLoginSuccess }: { onLoginSuccess: (token: string) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', username: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const response = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email, 
          password: formData.password, 
          username: formData.username // El SP lo necesita
        }),
      });
      const data = await response.json();
      
      if (response.ok) {
        if (isLogin) {
          localStorage.setItem('token', data.token);
          onLoginSuccess(data.token);
        } else {
          alert("¡Cuenta creada! Ahora inicia sesión.");
          setIsLogin(true);
        }
      } else {
        alert(data.error || "Algo salió mal");
      }
    } catch (err) {
      console.error("Error en auth:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0B] text-white font-sans">
      <div className="bg-[#121212] p-8 rounded-2xl w-full max-w-md border border-[#1E1E1E] shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#8B5CF6] p-3 rounded-full mb-4">
            <Music size={32} color="white" />
          </div>
          <h1 className="text-3xl font-bold">Echofy</h1>
          <p className="text-[#B3B3B3] mt-2">
            {isLogin ? 'Bienvenido de nuevo' : 'Únete a la comunidad'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-3 text-[#B3B3B3]" size={20} />
              <input
                type="text"
                placeholder="Nombre de usuario"
                className="w-full bg-[#1E1E1E] border-none rounded-lg p-3 pl-12 text-white focus:ring-2 focus:ring-[#8B5CF6] outline-none"
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-[#B3B3B3]" size={20} />
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-[#1E1E1E] border-none rounded-lg p-3 pl-12 text-white focus:ring-2 focus:ring-[#8B5CF6] outline-none"
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-[#B3B3B3]" size={20} />
            <input
              type="password"
              placeholder="Contraseña"
              className="w-full bg-[#1E1E1E] border-none rounded-lg p-3 pl-12 text-white focus:ring-2 focus:ring-[#8B5CF6] outline-none"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] transition-colors font-bold p-3 rounded-lg mt-4">
            {isLogin ? 'Entrar' : 'Registrarse'}
          </button>
        </form>

        <p className="text-center mt-6 text-[#B3B3B3] text-sm">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya eres miembro?'} 
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#8B5CF6] ml-1 font-semibold hover:underline"
          >
            {isLogin ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;