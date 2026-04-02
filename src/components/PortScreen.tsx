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
  { id: 'friend', name: 'Kai', emoji: '🧑‍🦱', role: 'Old Friend', dialogue: 'intro', description: 'Your childhood friend. Knows the waters well.' },
  { id: 'mechanic', name: 'Old Mara', emoji: '🔧', role: 'Dock Mechanic', dialogue: 'mechanic_first', description: 'Keeps every boat in the harbor seaworthy.' },
  { id: 'trader', name: 'Naveen', emoji: '🏪', role: 'Trader', dialogue: 'trader_first', description: 'Runs the local trade post. Always has cargo.' },
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

    if (action === 'unlock_first_mission' || action === 'unlock_delivery') {
      // Missions are already available
    }
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
      {/* Port background overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/80 to-background" />

      <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-md px-4 animate-fade-in">
        {/* Port title */}
        <div className="text-center mb-2">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-foreground text-glow">
            ⚓ Haven Port
          </h2>
          <p className="font-body text-sm text-muted-foreground mt-1">Your father's home harbor</p>
        </div>

        {/* Stats bar */}
        <div className="flex gap-4 text-sm text-muted-foreground font-body">
          <div className="flex items-center gap-1">
            <span className="text-accent gold-glow">⬡</span>
            <span>{shop.coins} coins</span>
          </div>
          {missionState.activeMission && (
            <div className="flex items-center gap-1">
              <span className="text-primary">◉</span>
              <span className="text-primary font-semibold">{missionState.activeMission.title}</span>
            </div>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-secondary/50 rounded-lg p-1 w-full">
          {(['dock', 'missions', 'npcs'] as PortTab[]).map(t => (
            <button
              key={t}
              onClick={() => { sfxButtonClick(); setTab(t); }}
              className={`flex-1 py-2 px-3 rounded-md font-display text-sm font-semibold transition-all duration-200 ${
                tab === t
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'dock' ? '⚓ Dock' : t === 'missions' ? '📋 Missions' : '👥 NPCs'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="w-full min-h-[240px]">
          {tab === 'dock' && (
            <div className="flex flex-col gap-3 animate-fade-in">
              <button
                onClick={handleSetSail}
                className="group relative px-6 py-4 bg-primary text-primary-foreground font-display text-lg font-bold rounded-lg btn-glow transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <span className="relative z-10">
                  {missionState.activeMission ? `⛵ Set Sail — ${missionState.activeMission.title}` : '⛵ Free Sail'}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-ocean-light opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>

              <button
                onClick={() => { sfxButtonClick(); onShop(); }}
                className="px-6 py-3 bg-secondary text-secondary-foreground font-display text-base font-semibold rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 border border-border hover:border-primary/30"
              >
                🔧 Ship Upgrades
              </button>

              <div className="bg-card/60 rounded-lg p-3 border border-border/40 mt-2">
                <p className="text-xs text-muted-foreground font-body text-center">
                  {missionState.activeMission
                    ? `Active mission: ${missionState.activeMission.description}`
                    : 'No active mission. Check the mission board or talk to the locals.'}
                </p>
              </div>
            </div>
          )}

          {tab === 'missions' && (
            <MissionBoard
              missionState={missionState}
              onAccept={handleAcceptMission}
            />
          )}

          {tab === 'npcs' && (
            <div className="flex flex-col gap-2 animate-fade-in">
              {PORT_NPCS.map(npc => (
                <button
                  key={npc.id}
                  onClick={() => handleTalkToNPC(npc.id, npc.dialogue)}
                  className="flex items-center gap-3 p-3 bg-card/60 rounded-lg border border-border/40 hover:border-primary/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-left"
                >
                  <span className="text-2xl">{npc.emoji}</span>
                  <div className="flex-1">
                    <div className="font-display font-bold text-foreground text-sm">
                      {npc.name}
                      {!talkedTo.has(npc.id) && (
                        <span className="ml-2 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">NEW</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{npc.role} — {npc.description}</div>
                  </div>
                  <span className="text-muted-foreground/40">▸</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogue overlay */}
      {activeDialogue && (
        <DialogueBox sequence={activeDialogue} onComplete={handleDialogueComplete} />
      )}
    </div>
  );
};

export default PortScreen;
