import React, { useState } from 'react';
import { ShopState } from '../game/types';
import { loadShopState, saveShopState, BOAT_SKINS } from '../game/shopData';

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
    const updated = {
      ...shop,
      unlockedSkins: BOAT_SKINS.map(s => s.id),
      unlockedSails: ['plain', 'striped', 'sunset', 'ocean'],
      unlockedTrails: ['default', 'golden', 'emerald', 'fire'],
    };
    onUpdate(updated);
  };

  const resetProgress = () => {
    const fresh: ShopState = {
      coins: 0,
      unlockedSkins: ['classic'],
      unlockedSails: ['plain'],
      unlockedTrails: ['default'],
      selectedSkin: 'classic',
      selectedSail: 'plain',
      selectedTrail: 'default',
      highScore: 0,
    };
    onUpdate(fresh);
    setCoinInput('0');
  };

  const setHighScore = (score: number) => {
    onUpdate({ ...shop, highScore: score });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="animate-scale-in bg-card/95 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-destructive/30 card-glow max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl font-bold text-destructive">🔧 Admin Panel</h2>
            <p className="text-xs text-muted-foreground font-body mt-1">Secret developer tools</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Coins */}
          <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
            <label className="font-display text-sm font-semibold text-foreground">Coins</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={coinInput}
                onChange={e => setCoinInput(e.target.value)}
                className="flex-1 bg-muted/50 border border-border rounded-md px-3 py-1.5 text-sm font-body text-foreground outline-none focus:border-primary"
              />
              <button
                onClick={setCoins}
                className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-display font-bold rounded-md hover:scale-105 active:scale-95 transition-transform"
              >
                Set
              </button>
            </div>
            <div className="flex gap-2">
              {[100, 500, 1000, 9999].map(amt => (
                <button
                  key={amt}
                  onClick={() => addCoins(amt)}
                  className="flex-1 py-1 bg-accent/20 text-accent text-xs font-display font-bold rounded-md hover:bg-accent/30 transition-colors"
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Unlocks */}
          <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
            <label className="font-display text-sm font-semibold text-foreground">Unlocks</label>
            <div className="flex gap-2">
              <button
                onClick={unlockAll}
                className="flex-1 py-2 bg-primary/20 text-primary text-sm font-display font-bold rounded-md hover:bg-primary/30 transition-colors"
              >
                🔓 Unlock All
              </button>
              <button
                onClick={resetProgress}
                className="flex-1 py-2 bg-destructive/20 text-destructive text-sm font-display font-bold rounded-md hover:bg-destructive/30 transition-colors"
              >
                🗑 Reset All
              </button>
            </div>
          </div>

          {/* High Score */}
          <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
            <label className="font-display text-sm font-semibold text-foreground">High Score: {shop.highScore}</label>
            <div className="flex gap-2">
              {[0, 1000, 5000, 99999].map(s => (
                <button
                  key={s}
                  onClick={() => setHighScore(s)}
                  className="flex-1 py-1 bg-muted/50 text-muted-foreground text-xs font-display rounded-md hover:text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Current state */}
          <div className="text-[10px] text-muted-foreground/50 font-body">
            Skins: {shop.unlockedSkins.length}/{BOAT_SKINS.length} •
            Sails: {shop.unlockedSails.length}/4 •
            Trails: {shop.unlockedTrails.length}/4
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
