import React from 'react';

interface GameHUDProps {
  score: number;
  coins: number;
  distance: number;
  event: 'none' | 'storm' | 'calm' | 'gust';
  speedBoost: boolean;
  health: number;
  maxHealth: number;
}

const eventLabels: Record<string, { text: string; color: string }> = {
  storm: { text: '~ STORM ~', color: 'text-destructive' },
  calm: { text: '~ CALM ~', color: 'text-muted-foreground' },
  gust: { text: '~ GUST ~', color: 'text-primary' },
};

const GameHUD: React.FC<GameHUDProps> = ({ score, coins, distance, event, speedBoost, health, maxHealth }) => {
  const eventInfo = eventLabels[event];

  return (
    <div className="absolute inset-x-0 top-0 z-10 pointer-events-none">
      <div className="flex items-start justify-between p-3 md:p-4">
        {/* Score */}
        <div className="pixel-border bg-card/80 px-3 py-2">
          <div className="font-display text-sm text-foreground">{score}</div>
          <div className="font-body text-sm text-muted-foreground">{distance}m</div>
        </div>

        {/* Event + Boost */}
        <div className="flex flex-col items-center gap-2">
          {eventInfo && (
            <div className={`pixel-border bg-card/80 px-3 py-1 font-display text-[8px] animate-fade-in ${eventInfo.color}`}>
              {eventInfo.text}
            </div>
          )}
          {speedBoost && (
            <div className="pixel-border bg-primary/20 px-3 py-1 font-display text-[8px] text-primary animate-fade-in">
              &gt;&gt; BOOST &lt;&lt;
            </div>
          )}
        </div>

        {/* Health + Coins */}
        <div className="flex flex-col items-end gap-2">
          <div className="pixel-border bg-card/80 px-3 py-2 flex items-center gap-1">
            {Array.from({ length: maxHealth }).map((_, i) => (
              <span key={i} className={`font-body text-lg transition-all duration-200 ${i < health ? 'text-destructive' : 'text-muted-foreground/20'}`}>
                ♥
              </span>
            ))}
          </div>
          <div className="pixel-border bg-card/80 px-3 py-2 flex items-center gap-2">
            <span className="text-accent font-body text-lg">◆</span>
            <span className="font-display text-xs text-foreground">{coins}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameHUD;
