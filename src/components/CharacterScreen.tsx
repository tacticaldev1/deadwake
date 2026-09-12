import React, { useState } from 'react';
import { PlayerProfile, OUTFIT_COLORS, HAIR_COLORS, ACCENT_COLORS, DEFAULT_PROFILE, CharacterColor } from '../game/profile';
import { sfxButtonClick } from '../game/sfx';

interface CharacterScreenProps {
  profile: PlayerProfile;
  onUpdate: (profile: PlayerProfile) => void;
  onClose: () => void;
}

const MAX_NAME_LEN = 16;

const CharacterScreen: React.FC<CharacterScreenProps> = ({ profile, onUpdate, onClose }) => {
  const [name, setName] = useState(profile.name);
  const [outfitColor, setOutfitColor] = useState(profile.outfitColor);
  const [hairColor, setHairColor] = useState(profile.hairColor);
  const [accentColor, setAccentColor] = useState(profile.accentColor);

  const commit = () => {
    sfxButtonClick();
    const cleanName = name.trim().slice(0, MAX_NAME_LEN) || DEFAULT_PROFILE.name;
    onUpdate({ name: cleanName, outfitColor, hairColor, accentColor });
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
      <div className="absolute inset-0 scanlines opacity-20" />
      <div className="animate-fade-in pixel-border bg-card/95 p-4 md:p-6 max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[10px] text-foreground">CAPTAIN</h2>
          <button onClick={() => { sfxButtonClick(); onClose(); }} className="font-body text-lg text-muted-foreground hover:text-foreground">[X]</button>
        </div>

        <div className="flex flex-col items-center gap-4 mb-4">
          <PixelPortrait outfitColor={outfitColor} hairColor={hairColor} accentColor={accentColor} />

          <div className="w-full">
            <label className="font-display text-[7px] text-muted-foreground block mb-1">NAME</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value.slice(0, MAX_NAME_LEN))}
              placeholder="Captain"
              maxLength={MAX_NAME_LEN}
              className="w-full bg-muted/50 border-2 border-border px-3 py-2 font-body text-base text-foreground outline-none focus:border-primary"
            />
          </div>
        </div>

        <ColorRow label="OUTFIT" options={OUTFIT_COLORS} value={outfitColor} onChange={c => { sfxButtonClick(); setOutfitColor(c); }} />
        <ColorRow label="HAIR" options={HAIR_COLORS} value={hairColor} onChange={c => { sfxButtonClick(); setHairColor(c); }} />
        <ColorRow label="ACCENT (BELT / TRIM)" options={ACCENT_COLORS} value={accentColor} onChange={c => { sfxButtonClick(); setAccentColor(c); }} />

        <button
          onClick={commit}
          className="w-full px-4 py-3 bg-primary text-primary-foreground font-display text-[10px] pixel-btn transition-colors hover:bg-primary/80 mt-2"
        >
          SAVE
        </button>
      </div>
    </div>
  );
};

const ColorRow: React.FC<{ label: string; options: CharacterColor[]; value: string; onChange: (color: string) => void }> = ({ label, options, value, onChange }) => (
  <div className="mb-4">
    <label className="font-display text-[7px] text-muted-foreground block mb-2">{label}</label>
    <div className="grid grid-cols-3 gap-2">
      {options.map(c => (
        <button
          key={c.id}
          onClick={() => onChange(c.color)}
          className={`flex flex-col items-center gap-1 p-2 pixel-border transition-colors ${
            value === c.color ? 'bg-primary/20 border-primary' : 'bg-secondary/10 hover:bg-secondary/20'
          }`}
        >
          <div className="w-5 h-5" style={{ backgroundColor: c.color }} />
          <span className="font-body text-xs text-muted-foreground">{c.label}</span>
        </button>
      ))}
    </div>
  </div>
);

const PixelPortrait: React.FC<{ outfitColor: string; hairColor: string; accentColor: string }> = ({ outfitColor, hairColor, accentColor }) => (
  <div className="relative" style={{ width: 64, height: 64, imageRendering: 'pixelated' }}>
    <svg width={64} height={64} viewBox="0 0 16 16" shapeRendering="crispEdges">
      {/* Hair */}
      <rect x={5} y={1} width={6} height={2} fill={hairColor} />
      {/* Head */}
      <rect x={6} y={2} width={4} height={4} fill="hsl(25, 25%, 55%)" />
      {/* Body (outfit) */}
      <rect x={5} y={6} width={6} height={6} fill={outfitColor} />
      {/* Belt / trim accent */}
      <rect x={5} y={9} width={6} height={1} fill={accentColor} />
      {/* Legs */}
      <rect x={5} y={12} width={2} height={3} fill="hsl(25, 15%, 10%)" />
      <rect x={9} y={12} width={2} height={3} fill="hsl(25, 15%, 10%)" />
    </svg>
  </div>
);

export default CharacterScreen;
