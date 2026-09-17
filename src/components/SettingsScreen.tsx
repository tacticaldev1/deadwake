import React from 'react';
import { sfxButtonClick } from '../game/sfx';
import { DeviceMode, GameSettings } from '../game/settings';
import { ResolvedDevice } from '../hooks/use-device-mode';

interface SettingsScreenProps {
  settings: GameSettings;
  onUpdate: (next: GameSettings) => void;
  resolvedDevice: ResolvedDevice;
  gamepadConnected: boolean;
  onClose: () => void;
}

const DEVICE_OPTIONS: { id: DeviceMode; label: string; desc: string }[] = [
  { id: 'auto', label: 'AUTO-DETECT', desc: 'Uses a gamepad if one\'s connected, touch controls on phones/tablets, otherwise keyboard & mouse.' },
  { id: 'desktop', label: 'DESKTOP', desc: 'Always keyboard & mouse — hides touch controls even on a touchscreen.' },
  { id: 'touch', label: 'TOUCH', desc: 'Always show the on-screen joystick and D-pad, even on a mouse-driven desktop.' },
  { id: 'gamepad', label: 'GAMEPAD', desc: 'Optimized for controller play — hides touch controls; plug in a controller any time.' },
];

const RESOLVED_LABEL: Record<ResolvedDevice, string> = {
  desktop: 'Keyboard & Mouse',
  touch: 'Touch',
  gamepad: 'Gamepad',
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({ settings, onUpdate, resolvedDevice, gamepadConnected, onClose }) => {
  const setDeviceMode = (deviceMode: DeviceMode) => {
    sfxButtonClick();
    onUpdate({ ...settings, deviceMode });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/85">
      <div className="absolute inset-0 scanlines opacity-20" />
      <div className="animate-fade-in pixel-border bg-card/95 p-4 md:p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[10px] text-primary">SETTINGS</h2>
          <button onClick={() => { sfxButtonClick(); onClose(); }} className="font-body text-lg text-muted-foreground hover:text-foreground">[X]</button>
        </div>

        <label className="font-display text-[7px] text-muted-foreground block mb-2">
          DEVICE — CURRENTLY: {RESOLVED_LABEL[resolvedDevice].toUpperCase()}
        </label>
        <div className="flex flex-col gap-1.5 mb-2">
          {DEVICE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setDeviceMode(opt.id)}
              className={`text-left p-2.5 pixel-border transition-colors ${
                settings.deviceMode === opt.id ? 'bg-primary/20 border-primary' : 'bg-secondary/10 hover:bg-secondary/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-[9px] text-foreground">{opt.label}</span>
                {settings.deviceMode === opt.id && <span className="font-display text-[8px] text-primary">✓</span>}
              </div>
              <p className="font-body text-xs text-muted-foreground mt-1 leading-snug">{opt.desc}</p>
            </button>
          ))}
        </div>
        {!gamepadConnected && settings.deviceMode !== 'desktop' && (
          <p className="font-body text-xs text-muted-foreground/70">No gamepad detected right now — plug one in any time, no need to change this setting.</p>
        )}
      </div>
    </div>
  );
};

export default SettingsScreen;
