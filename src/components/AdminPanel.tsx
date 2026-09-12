import React, { useState } from 'react';
import { ShopState } from '../game/types';
import { BOAT_SKINS, SPEED_UPGRADES } from '../game/shopData';
import { MissionState, jumpToAct, completeAllMissions, getCurrentAct } from '../game/missions';
import { DiscoveryState, Village, VILLAGES, getAllVillages } from '../game/villages';
import { CargoState, createCargoState } from '../game/cargo';
import { FriendshipState, getFriendshipLevel, getFriendshipTier, increaseFriendship } from '../game/friendship';
import { NPC_PORTRAITS } from '../game/dialogue';
import { sfxButtonClick } from '../game/sfx';

interface AdminPanelProps {
  shop: ShopState;
  onUpdate: (shop: ShopState) => void;
  onClose: () => void;
  missionState: MissionState;
  onMissionUpdate: (state: MissionState) => void;
  discovery: DiscoveryState;
  onDiscoveryUpdate: (state: DiscoveryState) => void;
  currentVillageId: string;
  onTeleport: (villageId: string) => void;
  cargo: CargoState;
  onCargoUpdate: (state: CargoState) => void;
  outposts: Village[];
  onPreviewMilestone: (milestoneId: string) => void;
  muted: boolean;
  onToggleSound: () => void;
  friendship: FriendshipState;
  onFriendshipUpdate: (state: FriendshipState) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  shop, onUpdate, onClose, missionState, onMissionUpdate, discovery, onDiscoveryUpdate,
  currentVillageId, onTeleport, cargo, onCargoUpdate, outposts, onPreviewMilestone, muted, onToggleSound,
  friendship, onFriendshipUpdate,
}) => {
  const [coinInput, setCoinInput] = useState(String(shop.coins));

  const click = (fn: () => void) => () => { sfxButtonClick(); fn(); };

  const addCoins = (amount: number) => {
    const updated = { ...shop, coins: shop.coins + amount };
    onUpdate(updated);
    setCoinInput(String(updated.coins));
  };

  const setCoins = () => {
    const val = parseInt(coinInput) || 0;
    onUpdate({ ...shop, coins: val });
  };

  const unlockAll = () => {
    onUpdate({
      ...shop,
      unlockedSkins: BOAT_SKINS.map(s => s.id),
      unlockedSails: ['plain', 'striped', 'sunset', 'ocean'],
      unlockedTrails: ['default', 'golden', 'emerald', 'fire'],
      unlockedSpeedUpgrades: SPEED_UPGRADES.map(u => u.id),
    });
  };

  const resetProgress = () => {
    const fresh: ShopState = {
      coins: 0, unlockedSkins: ['classic'], unlockedSails: ['plain'],
      unlockedTrails: ['default'], unlockedSpeedUpgrades: ['standard'], selectedSkin: 'classic',
      selectedSail: 'plain', selectedTrail: 'default', selectedSpeedUpgrade: 'standard', highScore: 0,
    };
    onUpdate(fresh);
    setCoinInput('0');
  };

  const goToAct = (act: 1 | 2 | 3 | 4) => {
    onMissionUpdate(jumpToAct(missionState, act));
  };

  const finishEverything = () => {
    const { state, rewardCoins } = completeAllMissions(missionState);
    onMissionUpdate(state);
    if (rewardCoins > 0) onUpdate({ ...shop, coins: shop.coins + rewardCoins });
  };

  const clearActiveMission = () => {
    onMissionUpdate({ ...missionState, activeMission: null });
  };

  const discoverAll = () => {
    onDiscoveryUpdate({ discovered: getAllVillages(outposts).map(v => v.id) });
  };

  const resetDiscovery = () => {
    onDiscoveryUpdate({ discovered: ['haven'] });
  };

  const resetCargo = () => {
    onCargoUpdate(createCargoState());
  };

  const resetTalkedTo = () => {
    localStorage.removeItem('deadwake_talked');
  };

  const bumpNpcFriendship = (npcId: string, amount: number) => {
    onFriendshipUpdate(increaseFriendship(friendship, npcId, amount));
  };

  const maxAllFriendship = () => {
    const levels: Record<string, number> = {};
    for (const id of Object.keys(NPC_PORTRAITS)) levels[id] = 100;
    onFriendshipUpdate({ levels });
  };

  const resetFriendship = () => {
    onFriendshipUpdate({ levels: {} });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
      <div className="absolute inset-0 scanlines opacity-20" />
      <div className="animate-fade-in pixel-border bg-card/95 p-4 md:p-6 max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-[10px] text-destructive">ADMIN PANEL</h2>
            <p className="font-body text-xs text-muted-foreground mt-1">dev tools</p>
          </div>
          <button onClick={onClose} className="font-body text-lg text-muted-foreground hover:text-foreground">[X]</button>
        </div>

        <div className="space-y-3">
          <div className="pixel-border bg-secondary/30 p-3 space-y-2">
            <label className="font-display text-[7px] text-foreground">COINS</label>
            <div className="flex gap-2">
              <input type="number" value={coinInput} onChange={e => setCoinInput(e.target.value)}
                className="flex-1 bg-muted/50 border-2 border-border px-2 py-1 font-body text-sm text-foreground outline-none focus:border-primary" />
              <button onClick={setCoins}
                className="px-3 py-1 bg-primary text-primary-foreground font-display text-[7px] pixel-btn">SET</button>
            </div>
            <div className="flex gap-2">
              {[100, 500, 1000, 9999].map(amt => (
                <button key={amt} onClick={() => addCoins(amt)}
                  className="flex-1 py-1 bg-accent/20 text-accent font-body text-xs pixel-btn hover:bg-accent/30">+{amt}</button>
              ))}
            </div>
          </div>

          <div className="pixel-border bg-secondary/30 p-3 space-y-2">
            <label className="font-display text-[7px] text-foreground">UNLOCKS</label>
            <div className="flex gap-2">
              <button onClick={unlockAll}
                className="flex-1 py-2 bg-primary/20 text-primary font-display text-[7px] pixel-btn hover:bg-primary/30">UNLOCK ALL</button>
              <button onClick={resetProgress}
                className="flex-1 py-2 bg-destructive/20 text-destructive font-display text-[7px] pixel-btn hover:bg-destructive/30">RESET</button>
            </div>
          </div>

          <div className="pixel-border bg-secondary/30 p-3 space-y-2">
            <label className="font-display text-[7px] text-foreground">STORY ACT (current: {getCurrentAct(missionState)})</label>
            <div className="flex gap-2">
              {([1, 2, 3, 4] as const).map(act => (
                <button key={act} onClick={click(() => goToAct(act))}
                  className="flex-1 py-2 bg-primary/20 text-primary font-display text-[7px] pixel-btn hover:bg-primary/30">ACT {act}</button>
              ))}
            </div>
          </div>

          <div className="pixel-border bg-secondary/30 p-3 space-y-2">
            <label className="font-display text-[7px] text-foreground">MISSIONS</label>
            <button onClick={click(finishEverything)}
              className="w-full py-2 bg-primary/20 text-primary font-display text-[7px] pixel-btn hover:bg-primary/30">COMPLETE ALL MISSIONS</button>
            <button onClick={click(clearActiveMission)} disabled={!missionState.activeMission}
              className="w-full py-2 bg-secondary/40 text-foreground font-display text-[7px] pixel-btn hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed">CLEAR ACTIVE MISSION</button>
          </div>

          <div className="pixel-border bg-secondary/30 p-3 space-y-2">
            <label className="font-display text-[7px] text-foreground">FRIENDSHIP</label>
            <div className="flex gap-2">
              <button onClick={click(maxAllFriendship)}
                className="flex-1 py-2 bg-primary/20 text-primary font-display text-[7px] pixel-btn hover:bg-primary/30">MAX ALL</button>
              <button onClick={click(resetFriendship)}
                className="flex-1 py-2 bg-destructive/20 text-destructive font-display text-[7px] pixel-btn hover:bg-destructive/30">RESET</button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {Object.keys(NPC_PORTRAITS).map(npcId => {
                const info = NPC_PORTRAITS[npcId];
                const level = getFriendshipLevel(friendship, npcId);
                const tier = getFriendshipTier(level);
                return (
                  <div key={npcId} className="flex items-center justify-between gap-2">
                    <span className="font-body text-xs text-foreground truncate">
                      {info.name} <span className="text-muted-foreground">({tier.name} {level})</span>
                    </span>
                    <button onClick={click(() => bumpNpcFriendship(npcId, 10))}
                      className="px-2 py-1 bg-accent/20 text-accent font-body text-xs pixel-btn hover:bg-accent/30 shrink-0">+10</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pixel-border bg-secondary/30 p-3 space-y-2">
            <label className="font-display text-[7px] text-foreground">PREVIEW CAPTAIN'S TITLE</label>
            <div className="flex gap-2">
              <button onClick={click(() => onPreviewMilestone('ending_seal'))}
                className="flex-1 py-2 bg-primary/20 text-primary font-display text-[7px] pixel-btn hover:bg-primary/30">SEAL</button>
              <button onClick={click(() => onPreviewMilestone('ending_break'))}
                className="flex-1 py-2 bg-primary/20 text-primary font-display text-[7px] pixel-btn hover:bg-primary/30">BREAK</button>
              <button onClick={click(() => onPreviewMilestone('ending_flee'))}
                className="flex-1 py-2 bg-primary/20 text-primary font-display text-[7px] pixel-btn hover:bg-primary/30">FLEE</button>
            </div>
          </div>

          <div className="pixel-border bg-secondary/30 p-3 space-y-2">
            <label className="font-display text-[7px] text-foreground">TELEPORT (at: {currentVillageId})</label>
            <div className="grid grid-cols-2 gap-2">
              {getAllVillages(outposts).map(v => (
                <button key={v.id} onClick={click(() => onTeleport(v.id))} disabled={v.id === currentVillageId}
                  className="py-2 bg-secondary/40 text-foreground font-display text-[7px] pixel-btn hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed">{v.name}</button>
              ))}
            </div>
          </div>

          <div className="pixel-border bg-secondary/30 p-3 space-y-2">
            <label className="font-display text-[7px] text-foreground">DISCOVERY ({discovery.discovered.length}/{VILLAGES.length})</label>
            <div className="flex gap-2">
              <button onClick={click(discoverAll)}
                className="flex-1 py-2 bg-primary/20 text-primary font-display text-[7px] pixel-btn hover:bg-primary/30">DISCOVER ALL</button>
              <button onClick={click(resetDiscovery)}
                className="flex-1 py-2 bg-destructive/20 text-destructive font-display text-[7px] pixel-btn hover:bg-destructive/30">RESET</button>
            </div>
          </div>

          <div className="pixel-border bg-secondary/30 p-3 space-y-2">
            <label className="font-display text-[7px] text-foreground">CARGO (hold: {cargo.hold.length})</label>
            <button onClick={click(resetCargo)}
              className="w-full py-2 bg-destructive/20 text-destructive font-display text-[7px] pixel-btn hover:bg-destructive/30">RESET CARGO</button>
          </div>

          <div className="pixel-border bg-secondary/30 p-3 space-y-2">
            <label className="font-display text-[7px] text-foreground">MISC</label>
            <div className="flex gap-2">
              <button onClick={click(resetTalkedTo)}
                className="flex-1 py-2 bg-secondary/40 text-foreground font-display text-[7px] pixel-btn hover:bg-secondary/60">RESET NPC MEMORY</button>
              <button onClick={click(onToggleSound)}
                className="flex-1 py-2 bg-secondary/40 text-foreground font-display text-[7px] pixel-btn hover:bg-secondary/60">SOUND: {muted ? 'OFF' : 'ON'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
