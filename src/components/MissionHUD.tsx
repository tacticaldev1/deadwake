import React from 'react';
import { Mission } from '../game/missions';

interface MissionHUDProps {
  mission: Mission;
}

const MissionHUD: React.FC<MissionHUDProps> = ({ mission }) => {
  return (
    <div className="absolute left-3 top-16 z-10 pointer-events-none">
      <div className="pixel-border bg-card/80 px-3 py-2 max-w-[180px]">
        <div className="font-display text-[7px] text-primary">MISSION</div>
        <div className="font-display text-[8px] text-foreground truncate mt-1">{mission.title}</div>
        {mission.type === 'collect' && mission.collectGoal && (
          <div className="font-body text-xs text-muted-foreground mt-1">
            {mission.collectCurrent || 0} / {mission.collectGoal}
          </div>
        )}
        {mission.type === 'survive' && mission.surviveTime && (
          <div className="font-body text-xs text-muted-foreground mt-1">
            {Math.floor(mission.surviveCurrent || 0)}s / {mission.surviveTime}s
          </div>
        )}
        {mission.type === 'delivery' && mission.target && (
          <div className="font-body text-xs text-muted-foreground mt-1">
            Reach {mission.target.label}
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionHUD;
