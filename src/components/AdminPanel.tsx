import React, { useState } from 'react';
import { ShopState } from '../game/types';
import { BOAT_SKINS } from '../game/shopData';

interface AdminPanelProps {
  shop: ShopState;
  onUpdate: (shop: ShopState) => void;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ shop, onUpdate, onClose }) => {
  const [coinInput, setCoinInput] = useState(String(shop.coins));

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
    });
  };

  const resetProgress = () => {
    const fresh: ShopState = {
      coins: 0, unlockedSkins: ['classic'], unlockedSails: ['plain'],
      unlockedTrails: ['default'], selectedSkin: 'classic',
      selectedSail: 'plain', selectedTrail: 'default', highScore: 0,
    };
    onUpdate(fresh);
    setCoinInput('0');
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
      <div className="absolute inset-0 scanlines opacity-20" />
      <div className="animate-fade-in pixel-border bg-card/95 p-4 md:p-6 max-w-sm w-full mx-4 relative z-10">
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
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
