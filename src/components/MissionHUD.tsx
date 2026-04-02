import React from 'react';
import { Mission } from '../game/missions';

interface MissionHUDProps {
  mission: Mission;
}

const MissionHUD: React.FC<MissionHUDProps> = ({ mission }) => {
  return (
    <div className="absolute left-4 top-20 z-10 pointer-events-none">
      <div className="bg-card/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/40 max-w-[200px]">
        <div className="text-xs text-primary font-display font-semibold">MISSION</div>
        <div className="text-sm text-foreground font-display font-bold truncate">{mission.title}</div>
        {mission.type === 'collect' && mission.collectGoal && (
          <div className="text-xs text-muted-foreground font-body mt-1">
            Collected: {mission.collectCurrent || 0} / {mission.collectGoal}
          </div>
        )}
        {mission.type === 'survive' && mission.surviveTime && (
          <div className="text-xs text-muted-foreground font-body mt-1">
            Survived: {Math.floor(mission.surviveCurrent || 0)}s / {mission.surviveTime}s
          </div>
        )}
        {mission.type === 'delivery' && mission.target && (
          <div className="text-xs text-muted-foreground font-body mt-1">
            Reach {mission.target.label}
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionHUD;
