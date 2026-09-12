import React from 'react';
import { CoopPlayer } from '../net/useCoopSession';

interface CoopPlayersListProps {
  players: Record<string, CoopPlayer>;
  selfId: string | null;
  empireRank?: string;
}

// `players` already includes the local player (the host sends everyone,
// self included, in WELCOME/PLAYER_JOINED) — no separate "you" entry needed.
const CoopPlayersList: React.FC<CoopPlayersListProps> = ({ players, selfId, empireRank }) => {
  const list = Object.values(players);
  if (list.length === 0) return null;

  return (
    <div className="absolute top-28 right-3 z-20 pixel-border bg-card/90 px-3 py-2 pointer-events-none">
      {empireRank && <div className="font-display text-[7px] text-accent/90 mb-1.5">{empireRank}</div>}
      <div className="font-display text-[8px] text-muted-foreground mb-1">PARTY ({list.length})</div>
      {list.map(p => (
        <div key={p.id} className="font-body text-sm text-foreground flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 shrink-0" style={{ backgroundColor: p.outfitColor || '#888' }} />
          {p.name}{p.id === selfId ? ' (you)' : ''}
        </div>
      ))}
    </div>
  );
};

export default CoopPlayersList;
