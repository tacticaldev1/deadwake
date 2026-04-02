import React from 'react';
import { Mission, MissionState } from '../game/missions';

interface MissionBoardProps {
  missionState: MissionState;
  onAccept: (mission: Mission) => void;
}

const typeIcons: Record<string, string> = {
  delivery: '📦',
  collect: '💰',
  explore: '🗺️',
  survive: '⚔️',
};

const MissionBoard: React.FC<MissionBoardProps> = ({ missionState, onAccept }) => {
  const available = missionState.availableMissions.filter(
    m => !missionState.completedMissions.includes(m.id) && m.id !== missionState.activeMission?.id
  );

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      {/* Active mission */}
      {missionState.activeMission && (
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
          <div className="flex items-center gap-2 mb-1">
            <span>{typeIcons[missionState.activeMission.type] || '📋'}</span>
            <span className="font-display font-bold text-primary text-sm">ACTIVE: {missionState.activeMission.title}</span>
          </div>
          <p className="text-xs text-muted-foreground font-body">{missionState.activeMission.description}</p>
          <div className="text-xs text-accent mt-1 font-body">Reward: {missionState.activeMission.reward.coins} ⬡</div>
        </div>
      )}

      {/* Completed count */}
      {missionState.completedMissions.length > 0 && (
        <div className="text-xs text-muted-foreground/60 font-body text-center">
          {missionState.completedMissions.length} mission{missionState.completedMissions.length !== 1 ? 's' : ''} completed
        </div>
      )}

      {/* Available missions */}
      {available.length === 0 && !missionState.activeMission && (
        <div className="text-center text-sm text-muted-foreground/60 font-body py-8">
          No missions available right now. Talk to the locals.
        </div>
      )}

      {available.map(mission => (
        <button
          key={mission.id}
          onClick={() => onAccept(mission)}
          disabled={!!missionState.activeMission}
          className="flex items-start gap-3 p-3 bg-card/60 rounded-lg border border-border/40 hover:border-accent/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-left disabled:opacity-50 disabled:hover:scale-100"
        >
          <span className="text-xl mt-0.5">{typeIcons[mission.type] || '📋'}</span>
          <div className="flex-1">
            <div className="font-display font-bold text-foreground text-sm">{mission.title}</div>
            <p className="text-xs text-muted-foreground font-body mt-0.5">{mission.description}</p>
            <div className="text-xs text-accent mt-1 font-body">Reward: {mission.reward.coins} ⬡</div>
          </div>
          {!missionState.activeMission && (
            <span className="text-xs text-primary font-display font-semibold mt-1">ACCEPT</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default MissionBoard;
