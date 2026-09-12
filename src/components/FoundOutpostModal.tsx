import React from 'react';
import { outpostCost } from '../game/outposts';
import { sfxButtonClick } from '../game/sfx';

interface FoundOutpostModalProps {
  coins: number;
  outpostCount: number;
  onFound: () => void;
  onBack: () => void;
}

// Rendered as its own top-level screen (mirrors ShopScreen) rather than
// nested inside VillageWalkScene — that component only ever calls a parent
// intent callback, never the RNG-driven foundNewOutpost() itself, so solo
// and host-authoritative co-op share one trigger path with no divergence risk.
const FoundOutpostModal: React.FC<FoundOutpostModalProps> = ({ coins, outpostCount, onFound, onBack }) => {
  const cost = outpostCost(outpostCount);
  const canAfford = coins >= cost;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20">
      <div className="absolute inset-0 scanlines opacity-15" />
      <div className="animate-fade-in pixel-border bg-card/95 p-6 max-w-sm w-full mx-4 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { sfxButtonClick(); onBack(); }} className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
            [back]
          </button>
          <h2 className="font-display text-[10px] text-foreground">CHART TABLE</h2>
          <div className="flex items-center gap-1 font-body text-sm text-accent">
            ◆ {coins}
          </div>
        </div>

        <p className="font-body text-lg text-foreground/90 mb-4 leading-relaxed">
          Commission a new outpost somewhere unclaimed on the map. It starts undiscovered — you'll need to sail out and find it.
        </p>

        <div className="pixel-border bg-secondary/20 p-3 mb-4 flex items-center justify-between">
          <span className="font-display text-[9px] text-muted-foreground">OUTPOSTS FOUNDED</span>
          <span className="font-display text-[10px] text-primary">{outpostCount}</span>
        </div>

        <button
          onClick={() => { sfxButtonClick(); onFound(); }}
          disabled={!canAfford}
          className="w-full py-3 bg-primary text-primary-foreground font-display text-xs pixel-btn transition-colors hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          FOUND NEW OUTPOST — ◆{cost}
        </button>
      </div>
    </div>
  );
};

export default FoundOutpostModal;
