import React, { useState, useEffect } from 'react';
import { sfxButtonClick } from '../game/sfx';

interface MainMenuProps {
  onPlay: () => void;
  onShop: () => void;
  onAdmin: () => void;
  highScore: number;
  coins: number;
}

const MainMenu: React.FC<MainMenuProps> = ({ onPlay, onShop, onAdmin, highScore, coins }) => {
  const [titleClicks, setTitleClicks] = useState(0);
  const [flickerPhase, setFlickerPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setFlickerPhase(p => p + 1), 200);
    return () => clearInterval(interval);
  }, []);

  const handleTitleClick = () => {
    const next = titleClicks + 1;
    if (next >= 10) {
      setTitleClicks(0);
      sfxButtonClick();
      onAdmin();
      return;
    }
    setTitleClicks(next);
  };

  const handlePlay = () => {
    sfxButtonClick();
    onPlay();
  };

  const glowOpacity = Math.sin(flickerPhase * 0.3) * 0.1 + 0.9;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
      {/* Scanlines */}
      <div className="absolute inset-0 scanlines opacity-20" />
      
      <div className="animate-fade-in flex flex-col items-center gap-6 relative z-10">
        {/* Title */}
        <div className="text-center" style={{ opacity: glowOpacity }}>
          <h1
            onClick={handleTitleClick}
            className="font-display text-2xl md:text-4xl font-bold tracking-wide text-foreground text-glow mb-3 cursor-pointer select-none"
          >
            DEADWAKE
          </h1>
          <p className="font-body text-lg text-muted-foreground tracking-widest uppercase">
            Inherit the Tide
          </p>
        </div>

        {/* Pixel divider */}
        <div className="flex gap-1">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="w-2 h-2 bg-primary/30" />
          ))}
        </div>

        {/* Stats */}
        <div className="flex gap-6 text-sm text-muted-foreground font-body">
          <div className="flex items-center gap-2">
            <span className="text-accent gold-glow">◆</span>
            <span>{coins} coins</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary">★</span>
            <span>Best: {highScore}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-56">
          <button
            onClick={handlePlay}
            className="px-6 py-3 bg-primary text-primary-foreground font-display text-xs font-bold pixel-btn transition-colors hover:bg-primary/80"
          >
            BEGIN VOYAGE
          </button>

          <button
            onClick={() => { sfxButtonClick(); onShop(); }}
            className="px-6 py-3 bg-secondary text-secondary-foreground font-display text-xs font-bold pixel-btn transition-colors hover:bg-secondary/80 border border-border"
          >
            SHIP SHOP
          </button>
        </div>

        {/* Controls hint */}
        <div className="font-body text-sm text-muted-foreground/50 text-center mt-4">
          <p>WASD / Arrow keys to sail</p>
          <p>Click/touch to steer</p>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
