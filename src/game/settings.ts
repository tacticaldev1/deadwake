// Player-configurable settings that aren't tied to a save-file profile —
// currently just the input/device override, but the shape leaves room to
// grow (e.g. HUD scale, colorblind palette) without a migration.
export type DeviceMode = 'auto' | 'desktop' | 'touch' | 'gamepad';

export interface GameSettings {
  deviceMode: DeviceMode;
}

const STORAGE_KEY = 'deadwake_settings';

const DEFAULT_SETTINGS: GameSettings = { deviceMode: 'auto' };

export function loadSettings(): GameSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: GameSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
