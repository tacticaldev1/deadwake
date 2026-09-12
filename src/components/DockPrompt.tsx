import React from 'react';
import { Village } from '../game/villages';

interface DockPromptProps {
  village: Village;
  onDock: () => void;
}

const DockPrompt: React.FC<DockPromptProps> = ({ village, onDock }) => {
  return (
    <div className="absolute left-1/2 bottom-24 -translate-x-1/2 z-20 animate-fade-in">
      <button
        onClick={onDock}
        className="pixel-border bg-primary text-primary-foreground px-6 py-3 font-display text-xs pointer-events-auto hover:bg-primary/80 transition-colors pixel-btn"
      >
        [E] DOCK AT {village.name.toUpperCase()}
      </button>
      <div className="text-center mt-2 pixel-border bg-card/90 px-3 py-1.5 max-w-xs mx-auto">
        <p className="font-body text-base text-foreground/90">{village.description}</p>
      </div>
    </div>
  );
};

export default DockPrompt;
