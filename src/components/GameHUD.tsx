import React from 'react';

interface GameHUDProps {
  score: number;
  coins: number;
  distance: number;
  event: 'none' | 'storm' | 'calm' | 'gust';
  speedBoost: boolean;
}

const eventLabels: Record<string, { text: string; color: string }> = {
  storm: { text: '⛈ STORM', color: 'text-destructive' },
  calm: { text: '🌊 CALM WIND', color: 'text-muted-foreground' },
  gust: { text: '💨 WIND GUST!', color: 'text-primary' },
};

const GameHUD: React.FC<GameHUDProps> = ({ score, coins, distance, event, speedBoost }) => {
  const eventInfo = eventLabels[event];

  return (
    <div className="absolute inset-x-0 top-0 z-10 pointer-events-none">
      <div className="flex items-start justify-between p-4 md:p-6">
        {/* Score */}
        <div className="bg-card/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-border/40">
          <div className="font-display text-2xl font-bold text-foreground">{score}</div>
          <div className="text-xs text-muted-foreground font-body">{distance}m</div>
        </div>

        {/* Event + Boost */}
        <div className="flex flex-col items-center gap-2">
          {eventInfo && (
            <div className={`bg-card/60 backdrop-blur-sm rounded-lg px-3 py-1 border border-border/40 text-sm font-display font-semibold animate-fade-in ${eventInfo.color}`}>
              {eventInfo.text}
            </div>
          )}
          {speedBoost && (
            <div className="bg-primary/20 backdrop-blur-sm rounded-lg px-3 py-1 border border-primary/40 text-sm font-display font-bold text-primary animate-scale-in">
              ⚡ BOOST
            </div>
          )}
        </div>

        {/* Coins */}
        <div className="bg-card/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-border/40 flex items-center gap-2">
          <span className="text-accent text-lg">⬡</span>
          <span className="font-display text-xl font-bold text-foreground">{coins}</span>
        </div>
      </div>
    </div>
  );
};

export default GameHUD;
