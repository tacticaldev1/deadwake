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
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-background/60 backdrop-blur-sm">
      <div className="animate-scale-in flex flex-col items-center gap-6 bg-card/80 backdrop-blur-md rounded-2xl p-8 md:p-12 border border-border/50 card-glow max-w-sm w-full mx-4">
        <h2 className="font-display text-4xl font-extrabold text-foreground">
          {isNewBest ? '🏆 New Best!' : 'Shipwrecked!'}
        </h2>

        <div className="grid grid-cols-2 gap-4 w-full text-center">
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="font-display text-2xl font-bold text-foreground">{score}</div>
            <div className="text-xs text-muted-foreground font-body">Score</div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="font-display text-2xl font-bold text-accent gold-glow">{coins}</div>
            <div className="text-xs text-muted-foreground font-body">Coins</div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="font-display text-xl font-bold text-foreground">{distance}m</div>
            <div className="text-xs text-muted-foreground font-body">Distance</div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="font-display text-xl font-bold text-primary">{highScore}</div>
            <div className="text-xs text-muted-foreground font-body">Best</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onRestart}
            className="px-6 py-3 bg-primary text-primary-foreground font-display text-lg font-bold rounded-lg btn-glow transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Sail Again
          </button>
          <button
            onClick={onMenu}
            className="px-6 py-3 bg-secondary text-secondary-foreground font-display text-base font-semibold rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 border border-border"
          >
            Return to Port
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;
