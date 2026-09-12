import React from 'react';
import { ENDINGS } from '../game/dialogue';
import { sfxButtonClick } from '../game/sfx';

interface MilestoneBannerProps {
  milestoneId: string;
  coins: number;
  onDismiss: () => void;
}

// Replaces the old full-screen "ending" takeover. The finale mystery still
// pays off with real flavor text, but this is an overlay on top of whatever
// screen the player is already on, not a screen transition — dismissing it
// just closes the card, no reset, no return-to-menu. The story is a
// milestone in an ongoing shipping empire, not a stopping point.
const MilestoneBanner: React.FC<MilestoneBannerProps> = ({ milestoneId, coins, onDismiss }) => {
  const milestone = ENDINGS[milestoneId];
  if (!milestone) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 bg-background/85">
      <div className="absolute inset-0 scanlines opacity-20 pointer-events-none" />
      <div className="animate-fade-in flex flex-col items-center gap-6 pixel-border bg-card/95 p-6 md:p-8 max-w-lg w-full mx-4 relative z-10">
        <div className="pixel-border bg-primary/10 px-3 py-1">
          <span className="font-display text-[9px] text-primary">MILESTONE REACHED</span>
        </div>

        <h2 className="font-display text-base text-primary text-glow text-center">{milestone.title}</h2>

        <div className="flex flex-col gap-3">
          {milestone.lines.map((line, i) => (
            <p key={i} className="font-body text-xl text-foreground leading-relaxed">{line}</p>
          ))}
        </div>

        <div className="pixel-border bg-secondary/40 px-4 py-2 flex items-center gap-2">
          <span className="text-accent gold-glow">◆</span>
          <span className="font-body text-base text-foreground">{coins} coins in the treasury so far</span>
        </div>

        <button
          onClick={() => { sfxButtonClick(); onDismiss(); }}
          className="px-6 py-3 bg-primary text-primary-foreground font-display text-xs pixel-btn transition-colors hover:bg-primary/80"
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
};

export default MilestoneBanner;
