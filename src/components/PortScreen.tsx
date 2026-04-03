import React, { useState } from 'react';
import { ShopState } from '../game/types';
import { Mission, MissionState } from '../game/missions';
import { DIALOGUES, DialogueSequence } from '../game/dialogue';
import DialogueBox from './DialogueBox';
import MissionBoard from './MissionBoard';
import { sfxButtonClick } from '../game/sfx';

interface PortScreenProps {
  shop: ShopState;
  missionState: MissionState;
  onSetSail: (mission?: Mission) => void;
  onShop: () => void;
  onMissionUpdate: (state: MissionState) => void;
  onShopUpdate: (shop: ShopState) => void;
  firstVisit: boolean;
  onFirstVisitDone: () => void;
}

type PortTab = 'dock' | 'missions' | 'npcs';

const PORT_NPCS = [
  { id: 'friend', name: 'Kai', emoji: '>', role: 'Old Friend', dialogue: 'intro', description: 'Knows the waters well.' },
  { id: 'mechanic', name: 'Old Mara', emoji: '#', role: 'Mechanic', dialogue: 'mechanic_first', description: 'Keeps boats seaworthy.' },
  { id: 'trader', name: 'Naveen', emoji: '$', role: 'Trader', dialogue: 'trader_first', description: 'Always has cargo.' },
];

const PortScreen: React.FC<PortScreenProps> = ({
  shop, missionState, onSetSail, onShop, onMissionUpdate, onShopUpdate, firstVisit, onFirstVisitDone,
}) => {
  const [tab, setTab] = useState<PortTab>('dock');
  const [activeDialogue, setActiveDialogue] = useState<DialogueSequence | null>(
    firstVisit ? DIALOGUES['intro'] : null
  );
  const [talkedTo, setTalkedTo] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('deadwake_talked');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const handleDialogueComplete = (action?: string) => {
    if (firstVisit) onFirstVisitDone();
    setActiveDialogue(null);
  };

  const handleTalkToNPC = (npcId: string, dialogueId: string) => {
    sfxButtonClick();
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
    const updated: MissionState = {
      ...missionState,
      activeMission: { ...mission, status: 'active' },
      availableMissions: missionState.availableMissions.filter(m => m.id !== mission.id),
    };
    onMissionUpdate(updated);
  };

  const handleSetSail = () => {
    sfxButtonClick();
    onSetSail(missionState.activeMission || undefined);
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 scanlines opacity-15" />

      <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-sm px-4 animate-fade-in">
        {/* Port title */}
        <div className="text-center mb-2">
          <h2 className="font-display text-sm md:text-base text-foreground text-glow">
            HAVEN PORT
          </h2>
          <p className="font-body text-sm text-muted-foreground mt-1">Father's home harbor</p>
        </div>

        {/* Stats bar */}
        <div className="flex gap-4 font-body text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="text-accent gold-glow">◆</span>
            <span>{shop.coins} coins</span>
          </div>
          {missionState.activeMission && (
            <div className="flex items-center gap-1">
              <span className="text-primary">●</span>
              <span className="text-primary">{missionState.activeMission.title}</span>
            </div>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-0 w-full pixel-border">
          {(['dock', 'missions', 'npcs'] as PortTab[]).map(t => (
            <button
              key={t}
              onClick={() => { sfxButtonClick(); setTab(t); }}
              className={`flex-1 py-2 px-2 font-display text-[8px] transition-colors ${
                tab === t
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'dock' ? 'DOCK' : t === 'missions' ? 'MISSIONS' : 'NPCS'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="w-full min-h-[220px]">
          {tab === 'dock' && (
            <div className="flex flex-col gap-3 animate-fade-in">
              <button
                onClick={handleSetSail}
                className="px-4 py-3 bg-primary text-primary-foreground font-display text-[10px] pixel-btn transition-colors hover:bg-primary/80"
              >
                {missionState.activeMission ? `SET SAIL - ${missionState.activeMission.title}` : 'FREE SAIL'}
              </button>

              <button
                onClick={() => { sfxButtonClick(); onShop(); }}
                className="px-4 py-3 bg-secondary text-secondary-foreground font-display text-[10px] pixel-btn transition-colors hover:bg-secondary/80 border border-border"
              >
                SHIP UPGRADES
              </button>

              <div className="pixel-border bg-card/60 p-3 mt-2">
                <p className="font-body text-sm text-muted-foreground text-center">
                  {missionState.activeMission
                    ? `Active: ${missionState.activeMission.description}`
                    : 'No active mission. Check the board or talk to locals.'}
                </p>
              </div>
            </div>
          )}

          {tab === 'missions' && (
            <MissionBoard missionState={missionState} onAccept={handleAcceptMission} />
          )}

          {tab === 'npcs' && (
            <div className="flex flex-col gap-2 animate-fade-in">
              {PORT_NPCS.map(npc => (
                <button
                  key={npc.id}
                  onClick={() => handleTalkToNPC(npc.id, npc.dialogue)}
                  className="flex items-center gap-3 p-3 pixel-border bg-card/60 hover:bg-card/80 transition-colors text-left"
                >
                  <span className="font-display text-xs text-primary w-6 text-center">{npc.emoji}</span>
                  <div className="flex-1">
                    <div className="font-display text-[8px] text-foreground">
                      {npc.name}
                      {!talkedTo.has(npc.id) && (
                        <span className="ml-2 font-body text-xs text-primary">[NEW]</span>
                      )}
                    </div>
                    <div className="font-body text-xs text-muted-foreground">{npc.role} - {npc.description}</div>
                  </div>
                  <span className="font-body text-muted-foreground/40">▸</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeDialogue && (
        <DialogueBox sequence={activeDialogue} onComplete={handleDialogueComplete} />
      )}
    </div>
  );
};

export default PortScreen;
