import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';

const Home = () => {
  const [songs, setSongs] = useState([]);
  const { setCurrentSong } = usePlayerStore(); // Traemos la acción de Zustand

  useEffect(() => {
    fetch('http://localhost:8080/api/songs')
      .then(res => res.json())
      .then(data => setSongs(data))
      .catch(err => console.error("Error cargando catálogo:", err));
  }, []);

  return (
    <div>
      <h2 className="text-xl mb-6 font-semibold">Descubrir música</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {songs.map((song: any) => (
          <div 
            key={song._id} 
            className="p-4 bg-[#1E1E1E] rounded-xl hover:bg-[#2A2A2A] transition-all cursor-pointer group"
            onClick={() => setCurrentSong(song)}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold">{song.title}</h3>
                <p className="text-sm text-gray-400">{song.artist}</p>
              </div>
              <button className="w-10 h-10 rounded-full bg-[#8B5CF6] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                ▶️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;