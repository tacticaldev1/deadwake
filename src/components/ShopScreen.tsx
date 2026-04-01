import React, { useState } from 'react';
import { ShopState } from '../game/types';
import { BOAT_SKINS, SAIL_STYLES, TRAIL_EFFECTS } from '../game/shopData';

interface ShopScreenProps {
  shop: ShopState;
  onUpdate: (shop: ShopState) => void;
  onBack: () => void;
}

type ShopTab = 'boats' | 'sails' | 'trails';

const ShopScreen: React.FC<ShopScreenProps> = ({ shop, onUpdate, onBack }) => {
  const [tab, setTab] = useState<ShopTab>('boats');

  const buyAndSelect = (type: 'skins' | 'sails' | 'trails', id: string, price: number) => {
    const key = type === 'skins' ? 'unlockedSkins' : type === 'sails' ? 'unlockedSails' : 'unlockedTrails';
    const selectKey = type === 'skins' ? 'selectedSkin' : type === 'sails' ? 'selectedSail' : 'selectedTrail';
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
      <div className="animate-scale-in bg-card/90 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-border/50 card-glow max-w-lg w-full mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors font-body text-sm">
            ← Back
          </button>
          <h2 className="font-display text-2xl font-bold text-foreground">Ship Shop</h2>
          <div className="flex items-center gap-1 text-accent font-display font-bold">
            <span>⬡</span> {shop.coins}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-secondary/50 rounded-lg p-1">
          {(['boats', 'sails', 'trails'] as ShopTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 px-3 rounded-md font-display text-sm font-semibold transition-all duration-200 capitalize ${
                tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {tab === 'boats' && BOAT_SKINS.map(skin => {
            const owned = shop.unlockedSkins.includes(skin.id);
            const selected = shop.selectedSkin === skin.id;
            return (
              <ShopItem
                key={skin.id}
                name={skin.name}
                description={skin.description}
                price={skin.price}
                owned={owned}
                selected={selected}
                canAfford={shop.coins >= skin.price}
                onSelect={() => buyAndSelect('skins', skin.id, skin.price)}
                preview={
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: skin.hullColor }} />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: skin.sailColor }} />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: skin.accentColor }} />
                  </div>
                }
              />
            );
          })}
          {tab === 'sails' && SAIL_STYLES.map(sail => {
            const owned = shop.unlockedSails.includes(sail.id);
            const selected = shop.selectedSail === sail.id;
            return (
              <ShopItem
                key={sail.id}
                name={sail.name}
                description={sail.description}
                price={sail.price}
                owned={owned}
                selected={selected}
                canAfford={shop.coins >= sail.price}
                onSelect={() => buyAndSelect('sails', sail.id, sail.price)}
                preview={
                  <div className="flex gap-1">
                    {sail.colors.map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />
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
              <ShopItem
                key={trail.id}
                name={trail.name}
                description={trail.description}
                price={trail.price}
                owned={owned}
                selected={selected}
                canAfford={shop.coins >= trail.price}
                onSelect={() => buyAndSelect('trails', trail.id, trail.price)}
                preview={
                  <div className="w-8 h-4 rounded-full" style={{ backgroundColor: trail.particleColor }} />
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface ShopItemProps {
  name: string;
  description: string;
  price: number;
  owned: boolean;
  selected: boolean;
  canAfford: boolean;
  onSelect: () => void;
  preview: React.ReactNode;
}

const ShopItem: React.FC<ShopItemProps> = ({ name, description, price, owned, selected, canAfford, onSelect, preview }) => (
  <button
    onClick={onSelect}
    disabled={!owned && !canAfford}
    className={`w-full flex items-center gap-4 p-3 rounded-lg transition-all duration-200 text-left ${
      selected
        ? 'bg-primary/15 border border-primary/40'
        : owned
        ? 'bg-secondary/30 border border-border/30 hover:border-primary/20'
        : canAfford
        ? 'bg-secondary/20 border border-border/20 hover:border-accent/30'
        : 'bg-secondary/10 border border-border/10 opacity-50 cursor-not-allowed'
    }`}
  >
    <div className="shrink-0">{preview}</div>
    <div className="flex-1 min-w-0">
      <div className="font-display text-sm font-semibold text-foreground">{name}</div>
      <div className="text-xs text-muted-foreground font-body truncate">{description}</div>
    </div>
    <div className="shrink-0 text-right">
      {selected ? (
        <span className="text-xs font-display font-bold text-primary">EQUIPPED</span>
      ) : owned ? (
        <span className="text-xs font-display text-muted-foreground">OWNED</span>
      ) : (
        <span className="text-xs font-display font-bold text-accent">⬡ {price}</span>
      )}
    </div>
  </button>
);

export default ShopScreen;
