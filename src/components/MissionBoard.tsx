import React from 'react';
import { Mission, MissionState } from '../game/missions';

interface MissionBoardProps {
  missionState: MissionState;
  onAccept: (mission: Mission) => void;
}

const typeIcons: Record<string, string> = {
  delivery: '[D]',
  collect: '[C]',
  explore: '[E]',
  survive: '[S]',
};

const MissionBoard: React.FC<MissionBoardProps> = ({ missionState, onAccept }) => {
  const available = missionState.availableMissions.filter(
    m => !missionState.completedMissions.includes(m.id) && m.id !== missionState.activeMission?.id
  );

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      {missionState.activeMission && (
        <div className="p-3 pixel-border bg-primary/10">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display text-[8px] text-primary">{typeIcons[missionState.activeMission.type] || '[?]'}</span>
            <span className="font-display text-[8px] text-primary">ACTIVE: {missionState.activeMission.title}</span>
          </div>
          <p className="font-body text-xs text-muted-foreground">{missionState.activeMission.description}</p>
          <div className="font-body text-xs text-accent mt-1">Reward: {missionState.activeMission.reward.coins} ◆</div>
        </div>
      )}

      {missionState.completedMissions.length > 0 && (
        <div className="font-body text-xs text-muted-foreground/50 text-center">
          {missionState.completedMissions.length} completed
        </div>
      )}

      {available.length === 0 && !missionState.activeMission && (
        <div className="text-center font-body text-sm text-muted-foreground/50 py-8">
          No missions. Talk to the locals.
        </div>
      )}

      {available.map(mission => (
        <button
          key={mission.id}
          onClick={() => onAccept(mission)}
          disabled={!!missionState.activeMission}
          className="flex items-start gap-3 p-3 pixel-border bg-card/60 hover:bg-card/80 transition-colors text-left disabled:opacity-40"
        >
          <span className="font-display text-[8px] text-muted-foreground mt-0.5">{typeIcons[mission.type] || '[?]'}</span>
          <div className="flex-1">
            <div className="font-display text-[8px] text-foreground">{mission.title}</div>
            <p className="font-body text-xs text-muted-foreground mt-0.5">{mission.description}</p>
            <div className="font-body text-xs text-accent mt-1">Reward: {mission.reward.coins} ◆</div>
          </div>
          {!missionState.activeMission && (
            <span className="font-display text-[7px] text-primary mt-1">ACCEPT</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default MissionBoard;
