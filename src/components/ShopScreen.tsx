import React, { useState } from 'react';
import { ShopState } from '../game/types';
import { BOAT_SKINS, SAIL_STYLES, TRAIL_EFFECTS, SPEED_UPGRADES } from '../game/shopData';

interface ShopScreenProps {
  shop: ShopState;
  onUpdate: (shop: ShopState) => void;
  onBack: () => void;
}

type ShopTab = 'boats' | 'sails' | 'trails' | 'speed';
type ShopKind = 'skins' | 'sails' | 'trails' | 'speedUpgrades';

const ShopScreen: React.FC<ShopScreenProps> = ({ shop, onUpdate, onBack }) => {
  const [tab, setTab] = useState<ShopTab>('boats');

  const buyAndSelect = (type: ShopKind, id: string, price: number) => {
    const key = type === 'skins' ? 'unlockedSkins' : type === 'sails' ? 'unlockedSails' : type === 'trails' ? 'unlockedTrails' : 'unlockedSpeedUpgrades';
    const selectKey = type === 'skins' ? 'selectedSkin' : type === 'sails' ? 'selectedSail' : type === 'trails' ? 'selectedTrail' : 'selectedSpeedUpgrade';
    const updated = { ...shop };
    if (!updated[key].includes(id)) {
      if (updated.coins < price) return;
      updated.coins -= price;
      updated[key] = [...updated[key], id];
    }
    updated[selectKey] = id;
    onUpdate(updated);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20">
      <div className="absolute inset-0 scanlines opacity-15" />
      <div className="animate-fade-in pixel-border bg-card/95 p-4 md:p-6 max-w-sm w-full mx-4 max-h-[85vh] flex flex-col relative z-10">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
            [back]
          </button>
          <h2 className="font-display text-[10px] text-foreground">SHIP SHOP</h2>
          <div className="flex items-center gap-1 font-body text-sm text-accent">
            ◆ {shop.coins}
          </div>
        </div>

        <div className="flex gap-0 mb-4 pixel-border">
          {(['boats', 'sails', 'trails', 'speed'] as ShopTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 px-2 font-display text-[9px] transition-colors uppercase ${
                tab === t ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {tab === 'boats' && BOAT_SKINS.map(skin => {
            const owned = shop.unlockedSkins.includes(skin.id);
            const selected = shop.selectedSkin === skin.id;
            return (
              <ShopItem key={skin.id} name={skin.name} description={skin.description}
                price={skin.price} owned={owned} selected={selected}
                canAfford={shop.coins >= skin.price}
                onSelect={() => buyAndSelect('skins', skin.id, skin.price)}
                preview={
                  <div className="flex gap-1">
                    <div className="w-3 h-3" style={{ backgroundColor: skin.hullColor }} />
                    <div className="w-3 h-3" style={{ backgroundColor: skin.sailColor }} />
                  </div>
                }
              />
            );
          })}
          {tab === 'sails' && SAIL_STYLES.map(sail => {
            const owned = shop.unlockedSails.includes(sail.id);
            const selected = shop.selectedSail === sail.id;
            return (
              <ShopItem key={sail.id} name={sail.name} description={sail.description}
                price={sail.price} owned={owned} selected={selected}
                canAfford={shop.coins >= sail.price}
                onSelect={() => buyAndSelect('sails', sail.id, sail.price)}
                preview={
                  <div className="flex gap-1">
                    {sail.colors.map((c, i) => (
                      <div key={i} className="w-3 h-3" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                }
              />
            );
          })}
          {tab === 'trails' && TRAIL_EFFECTS.map(trail => {
            const owned = shop.unlockedTrails.includes(trail.id);
            const selected = shop.selectedTrail === trail.id;
            return (
              <ShopItem key={trail.id} name={trail.name} description={trail.description}
                price={trail.price} owned={owned} selected={selected}
                canAfford={shop.coins >= trail.price}
                onSelect={() => buyAndSelect('trails', trail.id, trail.price)}
                preview={<div className="w-6 h-3" style={{ backgroundColor: trail.particleColor }} />}
              />
            );
          })}
          {tab === 'speed' && SPEED_UPGRADES.map(upgrade => {
            const owned = shop.unlockedSpeedUpgrades.includes(upgrade.id);
            const selected = shop.selectedSpeedUpgrade === upgrade.id;
            return (
              <ShopItem key={upgrade.id} name={upgrade.name} description={upgrade.description}
                price={upgrade.price} owned={owned} selected={selected}
                canAfford={shop.coins >= upgrade.price}
                onSelect={() => buyAndSelect('speedUpgrades', upgrade.id, upgrade.price)}
                preview={<div className="font-display text-[8px] text-primary">+{Math.round((upgrade.speedMod - 1) * 100)}%</div>}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface ShopItemProps {
  name: string; description: string; price: number;
  owned: boolean; selected: boolean; canAfford: boolean;
  onSelect: () => void; preview: React.ReactNode;
}

const ShopItem: React.FC<ShopItemProps> = ({ name, description, price, owned, selected, canAfford, onSelect, preview }) => (
  <button
    onClick={onSelect}
    disabled={!owned && !canAfford}
    className={`w-full flex items-center gap-3 p-2 transition-colors text-left ${
      selected ? 'pixel-border bg-primary/10' : owned ? 'pixel-border bg-secondary/20' :
      canAfford ? 'pixel-border bg-secondary/10 hover:bg-secondary/20' : 'pixel-border bg-secondary/5 opacity-40 cursor-not-allowed'
    }`}
  >
    <div className="shrink-0">{preview}</div>
    <div className="flex-1 min-w-0">
      <div className="font-display text-[9px] text-foreground">{name}</div>
      <div className="font-body text-sm text-muted-foreground truncate">{description}</div>
    </div>
    <div className="shrink-0 text-right">
      {selected ? (
        <span className="font-display text-[9px] text-primary">[ON]</span>
      ) : owned ? (
        <span className="font-display text-[9px] text-muted-foreground">[OK]</span>
      ) : (
        <span className="font-body text-sm text-accent">◆{price}</span>
      )}
    </div>
  </button>
);

export default ShopScreen;
