import React from 'react';
import { Mission } from '../game/missions';

interface MissionHUDProps {
  mission: Mission;
  elapsed?: number;
}

const MissionHUD: React.FC<MissionHUDProps> = ({ mission, elapsed = 0 }) => {
  const raceRemaining = mission.type === 'race' && mission.raceTimeLimit
    ? Math.max(0, mission.raceTimeLimit - elapsed)
    : null;

  return (
    <div className="absolute left-3 top-28 z-10 pointer-events-none">
      <div className="pixel-border bg-card/90 px-3 py-2 max-w-[220px]">
        <div className="font-display text-[9px] text-primary">MISSION</div>
        <div className="font-display text-[10px] text-foreground truncate mt-1">{mission.title}</div>
        {mission.type === 'collect' && mission.collectGoal && (
          <div className="font-body text-sm text-muted-foreground mt-1">
            {mission.collectCurrent || 0} / {mission.collectGoal}
          </div>
        )}
        {mission.type === 'survive' && mission.surviveTime && (
          <div className="font-body text-sm text-muted-foreground mt-1">
            {Math.floor(mission.surviveCurrent || 0)}s / {mission.surviveTime}s
          </div>
        )}
        {mission.type === 'hunt' && mission.huntGoal && (
          <div className="font-body text-sm text-muted-foreground mt-1">
            {mission.huntCurrent || 0} / {mission.huntGoal} sunk
          </div>
        )}
        {mission.type === 'delivery' && mission.target && (
          <div className="font-body text-sm text-muted-foreground mt-1">
            Reach {mission.target.label}
          </div>
        )}
        {mission.type === 'race' && mission.target && raceRemaining !== null && (
          <div className={`font-body text-sm mt-1 ${raceRemaining < 8 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {raceRemaining.toFixed(1)}s to {mission.target.label}
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionHUD;
