import React from 'react';

interface GameOverScreenProps {
  score: number;
  coins: number;
  distance: number;
  highScore: number;
  onRestart: () => void;
  onMenu: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ score, coins, distance, highScore, onRestart, onMenu }) => {
  const isNewBest = score >= highScore && score > 0;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-background/70">
      <div className="absolute inset-0 scanlines opacity-20" />
      <div className="animate-fade-in flex flex-col items-center gap-6 pixel-border bg-card/95 p-6 md:p-8 max-w-xs w-full mx-4 relative z-10">
        <h2 className="font-display text-sm text-foreground text-center">
          {isNewBest ? '* NEW BEST *' : 'SHIPWRECKED'}
        </h2>

        <div className="grid grid-cols-2 gap-3 w-full">
          <div className="pixel-border bg-secondary/50 p-2 text-center">
            <div className="font-display text-xs text-foreground">{score}</div>
            <div className="font-body text-sm text-muted-foreground">Score</div>
          </div>
          <div className="pixel-border bg-secondary/50 p-2 text-center">
            <div className="font-display text-xs text-accent gold-glow">{coins}</div>
            <div className="font-body text-sm text-muted-foreground">Coins</div>
          </div>
          <div className="pixel-border bg-secondary/50 p-2 text-center">
            <div className="font-display text-[10px] text-foreground">{distance}m</div>
            <div className="font-body text-sm text-muted-foreground">Distance</div>
          </div>
          <div className="pixel-border bg-secondary/50 p-2 text-center">
            <div className="font-display text-[10px] text-primary">{highScore}</div>
            <div className="font-body text-sm text-muted-foreground">Best</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={onRestart}
            className="px-4 py-3 bg-primary text-primary-foreground font-display text-[10px] pixel-btn transition-colors hover:bg-primary/80"
          >
            SAIL AGAIN
          </button>
          <button
            onClick={onMenu}
            className="px-4 py-3 bg-secondary text-secondary-foreground font-display text-[10px] pixel-btn transition-colors hover:bg-secondary/80 border border-border"
          >
            RETURN TO PORT
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;
