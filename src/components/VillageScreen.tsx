import React, { useState, useEffect } from 'react';
import { ShopState } from '../game/types';
import { Mission, MissionState, getMissionsForVillage } from '../game/missions';
import { DIALOGUES, DialogueSequence, NPC_PORTRAITS } from '../game/dialogue';
import { Village } from '../game/villages';
import { loadProfile } from '../game/profile';
import DialogueBox from './DialogueBox';
import { sfxButtonClick } from '../game/sfx';

interface VillageScreenProps {
  village: Village;
  shop: ShopState;
  missionState: MissionState;
  onSetSail: (mission?: Mission) => void;
  onShop: () => void;
  onMissionUpdate: (state: MissionState) => void;
  isFirstVisit: boolean;
  onFirstVisitDone: () => void;
}

type Tab = 'town' | 'npcs' | 'missions';

const VillageScreen: React.FC<VillageScreenProps> = ({
  village, shop, missionState, onSetSail, onShop, onMissionUpdate, isFirstVisit, onFirstVisitDone,
}) => {
  const [tab, setTab] = useState<Tab>('town');
  const [activeDialogue, setActiveDialogue] = useState<DialogueSequence | null>(null);
  const [talkedTo, setTalkedTo] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('deadwake_talked');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  // Show intro on first visit to Haven
  useEffect(() => {
    if (isFirstVisit && village.id === 'haven') {
      setActiveDialogue(DIALOGUES['intro']);
    }
  }, [isFirstVisit, village.id]);

  const villageNpcs = village.npcs.map(id => ({ id, ...NPC_PORTRAITS[id] })).filter(n => n.name);
  const availableMissions = getMissionsForVillage(missionState, village.id);
  const activeMissionHere = missionState.activeMission?.giverVillage === village.id ? missionState.activeMission : null;

  // Check if the active mission's destination IS this village → complete it
  const isDeliveryDestination =
    missionState.activeMission?.type === 'delivery' &&
    missionState.activeMission?.toVillage === village.id;

  const handleTalk = (npcId: string) => {
    sfxButtonClick();
    const dialogueId = `${npcId}_first`;
    const seq = DIALOGUES[dialogueId];
    if (seq) {
      setActiveDialogue(seq);
      const next = new Set(talkedTo);
      next.add(npcId);
      setTalkedTo(next);
      localStorage.setItem('deadwake_talked', JSON.stringify([...next]));
    }
  };

  const handleAcceptMission = (mission: Mission) => {
    sfxButtonClick();
    onMissionUpdate({
      ...missionState,
      activeMission: { ...mission, status: 'active' },
      availableMissions: missionState.availableMissions.filter(m => m.id !== mission.id),
    });
  };

  const handleDeliverCargo = () => {
    if (!missionState.activeMission) return;
    sfxButtonClick();
    const mission = missionState.activeMission;
    // Trigger completion dialogue if exists, otherwise just complete
    if (mission.onCompleteDialogue && DIALOGUES[mission.onCompleteDialogue]) {
      setActiveDialogue(DIALOGUES[mission.onCompleteDialogue]);
    }
    onMissionUpdate({
      ...missionState,
      completedMissions: [...missionState.completedMissions, mission.id],
      activeMission: null,
    });
    // Reward is handled by parent when it detects completion — but here we hand off via missionUpdate
    // Actually just call onSetSail? No — parent gives coins on delivery-complete detection.
    // Simpler: give coins right here.
    // We'll trust the parent to award reward via a callback... let's do it inline.
  };

  const handleDialogueComplete = () => {
    if (isFirstVisit && village.id === 'haven') onFirstVisitDone();
    setActiveDialogue(null);
  };

  const handleSetSail = () => {
    sfxButtonClick();
    onSetSail(missionState.activeMission || undefined);
  };

  const vibeColorClass = {
    home: 'text-primary',
    fishing: 'text-primary',
    trade: 'text-accent',
    foggy: 'text-muted-foreground',
    forbidden: 'text-destructive',
  }[village.vibe];

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 scanlines opacity-15" />

      {/* Pixel village silhouette background */}
      <div className="absolute inset-x-0 bottom-0 h-40 pointer-events-none opacity-30">
        <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 400 100">
          {/* Water line */}
          <rect x="0" y="80" width="400" height="20" fill="hsl(210, 25%, 8%)" />
          {/* Dock */}
          <rect x="180" y="75" width="40" height="4" fill="hsl(25, 15%, 15%)" />
          <rect x="185" y="79" width="2" height="8" fill="hsl(25, 15%, 12%)" />
          <rect x="213" y="79" width="2" height="8" fill="hsl(25, 15%, 12%)" />
          {/* Houses (silhouettes) */}
          <polygon points="60,70 60,50 75,40 90,50 90,70" fill={village.color} opacity="0.7" />
          <polygon points="100,70 100,45 115,35 130,45 130,70" fill={village.color} opacity="0.5" />
          <polygon points="270,70 270,52 285,42 300,52 300,70" fill={village.color} opacity="0.6" />
          <polygon points="310,70 310,48 325,38 340,48 340,70" fill={village.color} opacity="0.5" />
          {/* Windows glowing */}
          <rect x="72" y="60" width="4" height="4" fill="hsl(40, 60%, 40%)" opacity="0.8" />
          <rect x="115" y="55" width="4" height="4" fill="hsl(40, 60%, 40%)" opacity="0.6" />
          <rect x="285" y="60" width="4" height="4" fill="hsl(40, 60%, 40%)" opacity="0.7" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-sm px-4 animate-fade-in">
        {/* Village title */}
        <div className="text-center mb-2">
          <div className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1">
            [ You have docked at ]
          </div>
          <h2 className={`font-display text-sm md:text-base text-glow ${vibeColorClass}`}>
            {village.name.toUpperCase()}
          </h2>
          <p className="font-body text-sm text-muted-foreground/80 mt-2 italic max-w-xs">
            {village.description}
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex gap-4 font-body text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="text-accent gold-glow">◆</span>
            <span>{shop.coins}</span>
          </div>
          {missionState.activeMission && (
            <div className="flex items-center gap-1">
              <span className="text-primary">●</span>
              <span className="text-primary text-xs">{missionState.activeMission.title}</span>
            </div>
          )}
        </div>

        {/* Delivery arrival banner */}
        {isDeliveryDestination && (
          <div className="w-full pixel-border bg-primary/15 p-3 text-center animate-fade-in">
            <div className="font-display text-[8px] text-primary mb-2">CARGO ARRIVED</div>
            <p className="font-body text-sm text-foreground mb-3">
              Deliver your cargo to complete: <br />
              <span className="text-primary">{missionState.activeMission?.title}</span>
            </p>
            <button
              onClick={handleDeliverCargo}
              className="w-full py-2 bg-primary text-primary-foreground font-display text-[9px] pixel-btn hover:bg-primary/80"
            >
              DELIVER (+{missionState.activeMission?.reward.coins} ◆)
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 w-full pixel-border">
          {(['town', 'npcs', 'missions'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { sfxButtonClick(); setTab(t); }}
              className={`flex-1 py-2 px-2 font-display text-[8px] transition-colors ${
                tab === t ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'town' ? 'DOCKS' : t === 'npcs' ? 'PEOPLE' : 'MISSIONS'}
              {t === 'missions' && availableMissions.length > 0 && (
                <span className="ml-1 text-primary">*</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="w-full min-h-[200px]">
          {tab === 'town' && (
            <div className="flex flex-col gap-3 animate-fade-in">
              <button
                onClick={handleSetSail}
                className="px-4 py-3 bg-primary text-primary-foreground font-display text-[10px] pixel-btn hover:bg-primary/80"
              >
                {missionState.activeMission
                  ? `SET SAIL → ${missionState.activeMission.toVillage
                      ? (NPC_PORTRAITS[missionState.activeMission.giver]?.village || 'sea')
                      : 'sea'}`
                  : 'LEAVE PORT'}
              </button>

              {village.id === 'haven' && (
                <button
                  onClick={() => { sfxButtonClick(); onShop(); }}
                  className="px-4 py-3 bg-secondary text-secondary-foreground font-display text-[10px] pixel-btn hover:bg-secondary/80 border border-border"
                >
                  SHIP UPGRADES
                </button>
              )}

              <div className="pixel-border bg-card/60 p-3 mt-2">
                <p className="font-body text-sm text-muted-foreground text-center">
                  {activeMissionHere
                    ? `Active: ${activeMissionHere.description}`
                    : missionState.activeMission
                    ? `Delivering to ${missionState.activeMission.toVillage ? (missionState.activeMission.target?.label || '???') : '???'}`
                    : 'Speak to the people. Check the mission board.'}
                </p>
              </div>
            </div>
          )}

          {tab === 'npcs' && (
            <div className="flex flex-col gap-2 animate-fade-in">
              {villageNpcs.length === 0 && (
                <div className="text-center font-body text-sm text-muted-foreground/50 py-6">
                  Empty streets.
                </div>
              )}
              {villageNpcs.map(npc => (
                <button
                  key={npc.id}
                  onClick={() => handleTalk(npc.id)}
                  className="flex items-center gap-3 p-3 pixel-border bg-card/60 hover:bg-card/80 transition-colors text-left"
                >
                  <span className="font-display text-xs w-6 text-center" style={{ color: npc.color }}>{npc.emoji}</span>
                  <div className="flex-1">
                    <div className="font-display text-[8px] text-foreground">
                      {npc.name}
                      {!talkedTo.has(npc.id) && (
                        <span className="ml-2 font-body text-xs text-primary">[NEW]</span>
                      )}
                    </div>
                    <div className="font-body text-xs text-muted-foreground">{npc.role} — {npc.description}</div>
                  </div>
                  <span className="font-body text-muted-foreground/40">▸</span>
                </button>
              ))}
            </div>
          )}

          {tab === 'missions' && (
            <div className="flex flex-col gap-2 animate-fade-in">
              {activeMissionHere && (
                <div className="p-3 pixel-border bg-primary/10">
                  <div className="font-display text-[8px] text-primary mb-1">ACTIVE: {activeMissionHere.title}</div>
                  <p className="font-body text-xs text-muted-foreground">{activeMissionHere.description}</p>
                </div>
              )}
              {availableMissions.length === 0 && !activeMissionHere && (
                <div className="text-center font-body text-sm text-muted-foreground/50 py-6">
                  {missionState.activeMission
                    ? 'You already have an active mission.'
                    : 'No missions here right now.'}
                </div>
              )}
              {!missionState.activeMission && availableMissions.map(mission => (
                <button
                  key={mission.id}
                  onClick={() => handleAcceptMission(mission)}
                  className="flex items-start gap-3 p-3 pixel-border bg-card/60 hover:bg-card/80 transition-colors text-left"
                >
                  <div className="flex-1">
                    <div className="font-display text-[8px] text-foreground">{mission.title}</div>
                    <p className="font-body text-xs text-muted-foreground mt-1">{mission.description}</p>
                    <div className="font-body text-xs text-accent mt-1">Reward: {mission.reward.coins} ◆</div>
                  </div>
                  <span className="font-display text-[7px] text-primary mt-1">ACCEPT</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeDialogue && (
        <DialogueBox sequence={activeDialogue} onComplete={handleDialogueComplete} profile={loadProfile()} />
      )}
    </div>
  );
};

export default VillageScreen;
