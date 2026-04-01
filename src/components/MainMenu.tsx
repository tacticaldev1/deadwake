import React, { useState } from 'react';
import { sfxButtonClick } from '../game/sfx';

interface MainMenuProps {
  onPlay: () => void;
  onShop: () => void;
  onAdmin: () => void;
  highScore: number;
  coins: number;
}

const MainMenu: React.FC<MainMenuProps> = ({ onPlay, onShop, onAdmin, highScore, coins }) => {
  const [sailClicks, setSailClicks] = useState(0);

  const handleSailClick = () => {
    sfxButtonClick();
    const next = sailClicks + 1;
    if (next >= 10) {
      setSailClicks(0);
      onAdmin();
      return;
    }
    setSailClicks(next);
    onPlay();
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
      <div className="animate-fade-in flex flex-col items-center gap-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="font-display text-6xl md:text-8xl font-extrabold tracking-tight text-foreground text-glow mb-2">
            SAIL
          </h1>
          <p className="font-body text-lg text-muted-foreground tracking-widest uppercase">
            Navigate the Open Sea
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-6 text-sm text-muted-foreground font-body">
          <div className="flex items-center gap-2">
            <span className="text-accent gold-glow">⬡</span>
            <span>{coins} coins</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary">★</span>
            <span>Best: {highScore}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-64">
          <button
            onClick={handleSailClick}
            className="group relative px-8 py-4 bg-primary text-primary-foreground font-display text-xl font-bold rounded-lg btn-glow transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
          >
            <span className="relative z-10">Set Sail</span>
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-ocean-light opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>

          <button
            onClick={() => { sfxButtonClick(); onShop(); }}
            className="px-8 py-3 bg-secondary text-secondary-foreground font-display text-lg font-semibold rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 border border-border hover:border-primary/30"
          >
            Ship Shop
          </button>
        </div>

        {/* Controls hint */}
        <div className="text-xs text-muted-foreground/60 font-body text-center mt-4">
          <p>WASD / Arrow keys to sail • Click/touch to steer</p>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
