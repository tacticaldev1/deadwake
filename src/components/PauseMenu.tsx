import React from 'react';
import { sfxButtonClick } from '../game/sfx';

interface PauseMenuProps {
  isSailing: boolean;
  muted: boolean;
  onResume: () => void;
  onToggleSound: () => void;
  onAbandonVoyage?: () => void;
  onReturnHome?: () => void;
  onCharacter: () => void;
  onControls: () => void;
  onSettings: () => void;
  onMainMenu: () => void;
}

const PauseMenu: React.FC<PauseMenuProps> = ({ isSailing, muted, onResume, onToggleSound, onAbandonVoyage, onReturnHome, onCharacter, onControls, onSettings, onMainMenu }) => {
  const click = (fn: () => void) => () => { sfxButtonClick(); fn(); };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
      <div className="absolute inset-0 scanlines opacity-20" />
      <div className="animate-fade-in flex flex-col items-center gap-6 pixel-border bg-card/95 p-6 md:p-8 max-w-xs w-full mx-4 relative z-10">
        <h2 className="font-display text-sm text-foreground text-center">PAUSED</h2>

        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={click(onResume)}
            className="px-4 py-3 bg-primary text-primary-foreground font-display text-[10px] pixel-btn transition-colors hover:bg-primary/80"
          >
            RESUME
          </button>

          <button
            onClick={click(onToggleSound)}
            className="px-4 py-3 bg-secondary text-secondary-foreground font-display text-[10px] pixel-btn transition-colors hover:bg-secondary/80 border border-border"
          >
            SOUND: {muted ? 'OFF' : 'ON'}
          </button>

          <button
            onClick={click(onCharacter)}
            className="px-4 py-3 bg-secondary text-secondary-foreground font-display text-[10px] pixel-btn transition-colors hover:bg-secondary/80 border border-border"
          >
            CHARACTER
          </button>

          <button
            onClick={click(onControls)}
            className="px-4 py-3 bg-secondary text-secondary-foreground font-display text-[10px] pixel-btn transition-colors hover:bg-secondary/80 border border-border"
          >
            CONTROLS
          </button>

          <button
            onClick={click(onSettings)}
            className="px-4 py-3 bg-secondary text-secondary-foreground font-display text-[10px] pixel-btn transition-colors hover:bg-secondary/80 border border-border"
          >
            SETTINGS
          </button>

          {isSailing && onAbandonVoyage && (
            <button
              onClick={click(onAbandonVoyage)}
              className="px-4 py-3 bg-secondary text-secondary-foreground font-display text-[10px] pixel-btn transition-colors hover:bg-secondary/80 border border-border"
            >
              RETURN TO PORT
            </button>
          )}

          {onReturnHome && (
            <button
              onClick={click(onReturnHome)}
              className="px-4 py-3 bg-secondary text-secondary-foreground font-display text-[10px] pixel-btn transition-colors hover:bg-secondary/80 border border-border"
            >
              RETURN HOME
            </button>
          )}

          <button
            onClick={click(onMainMenu)}
            className="px-4 py-3 bg-destructive/20 text-destructive font-display text-[10px] pixel-btn transition-colors hover:bg-destructive/30 border border-border"
          >
            MAIN MENU
          </button>
        </div>

        <p className="font-body text-sm text-muted-foreground text-center">Press ESC to resume</p>
      </div>
    </div>
  );
};

export default PauseMenu;
