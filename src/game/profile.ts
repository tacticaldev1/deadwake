export interface PlayerProfile {
  name: string;
  outfitColor: string;
  hairColor: string;
  accentColor: string;
}

export interface CharacterColor {
  id: string;
  label: string;
  color: string;
}

export const OUTFIT_COLORS: CharacterColor[] = [
  { id: 'blue', label: 'Sea Blue', color: 'hsl(200, 40%, 65%)' },
  { id: 'red', label: 'Ember Red', color: 'hsl(0, 45%, 58%)' },
  { id: 'green', label: 'Moss Green', color: 'hsl(140, 30%, 48%)' },
  { id: 'gold', label: 'Old Gold', color: 'hsl(42, 55%, 55%)' },
  { id: 'violet', label: 'Dusk Violet', color: 'hsl(270, 28%, 60%)' },
  { id: 'grey', label: 'Storm Grey', color: 'hsl(210, 10%, 62%)' },
];

// Kept as an alias — the shop/pause menu referenced this name before outfit/hair/accent split.
export const CHARACTER_COLORS = OUTFIT_COLORS;

export const HAIR_COLORS: CharacterColor[] = [
  { id: 'brown', label: 'Driftwood Brown', color: 'hsl(25, 20%, 22%)' },
  { id: 'black', label: 'Deep Black', color: 'hsl(230, 15%, 12%)' },
  { id: 'blonde', label: 'Sunbleached', color: 'hsl(42, 45%, 55%)' },
  { id: 'copper', label: 'Copper', color: 'hsl(15, 45%, 40%)' },
  { id: 'grey', label: 'Salt Grey', color: 'hsl(210, 8%, 55%)' },
  { id: 'white', label: 'Moonlit White', color: 'hsl(0, 0%, 88%)' },
];

export const ACCENT_COLORS: CharacterColor[] = [
  { id: 'gold', label: 'Old Gold', color: 'hsl(42, 55%, 55%)' },
  { id: 'red', label: 'Ember Red', color: 'hsl(0, 45%, 58%)' },
  { id: 'teal', label: 'Deep Teal', color: 'hsl(185, 45%, 45%)' },
  { id: 'violet', label: 'Dusk Violet', color: 'hsl(270, 28%, 60%)' },
  { id: 'white', label: 'Bone White', color: 'hsl(0, 0%, 85%)' },
  { id: 'black', label: 'Pitch Black', color: 'hsl(230, 15%, 12%)' },
];

export const DEFAULT_PROFILE: PlayerProfile = {
  name: 'Captain',
  outfitColor: OUTFIT_COLORS[0].color,
  hairColor: HAIR_COLORS[0].color,
  accentColor: ACCENT_COLORS[0].color,
};

const STORAGE_KEY = 'deadwake_profile';

export function loadProfile(): PlayerProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate older saves that only had a single generic `color` field.
      if (parsed.color && !parsed.outfitColor) parsed.outfitColor = parsed.color;
      return { ...DEFAULT_PROFILE, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_PROFILE };
}

export function saveProfile(profile: PlayerProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

function findLabel(color: string, palette: CharacterColor[]): string {
  return palette.find(c => c.color === color)?.label.toLowerCase() || 'plain';
}

// Resolves {name}/{outfit}/{hair}/{accent}/{village} placeholders in dialogue
// lines against the player's current profile (and the village they're
// standing in, for generic outpost NPCs whose dialogue isn't hand-written
// per-place — see dialogue.ts's outpost_* archetypes).
export function resolveDialogueText(text: string, profile: PlayerProfile, villageName?: string): string {
  return text
    .replace(/\{name\}/g, profile.name)
    .replace(/\{outfit\}/g, findLabel(profile.outfitColor, OUTFIT_COLORS))
    .replace(/\{hair\}/g, findLabel(profile.hairColor, HAIR_COLORS))
    .replace(/\{accent\}/g, findLabel(profile.accentColor, ACCENT_COLORS))
    .replace(/\{village\}/g, villageName || 'this port');
}
