import React, { useState, useEffect } from 'react';

interface TutorialOverlayProps {
  onDismiss: () => void;
}

const steps = [
  {
    title: 'Welcome, Captain!',
    desc: 'Navigate the open sea, avoid obstacles, and collect treasure.',
    icon: '⛵',
  },
  {
    title: 'Controls',
    desc: 'Use WASD or Arrow Keys to steer. W/↑ to accelerate, A/D or ←/→ to turn. You can also click and drag to steer.',
    icon: '🎮',
  },
  {
    title: 'Watch the Wind',
    desc: 'The wind indicator (top right) shows wind direction. Sailing with the wind is faster — sailing against it slows you down.',
    icon: '💨',
  },
  {
    title: 'Collect & Avoid',
    desc: 'Grab coins ⬡ and crates for currency. Pick up blue arrows for speed boosts. Avoid rocks, reefs, boats, and storms!',
    icon: '💰',
  },
];

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onDismiss }) => {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  const next = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }
  };

  const skip = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  const current = steps[step];

  return (
    <div
      className={`absolute inset-0 z-30 flex items-center justify-center bg-background/70 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="animate-scale-in bg-card/90 backdrop-blur-md rounded-2xl p-8 md:p-10 border border-border/50 card-glow max-w-md w-full mx-4 text-center">
        <div className="text-5xl mb-4">{current.icon}</div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-3">{current.title}</h2>
        <p className="font-body text-sm text-muted-foreground leading-relaxed mb-6">{current.desc}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={skip}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors font-body"
          >
            Skip tutorial
          </button>

          <div className="flex items-center gap-4">
            {/* Dots */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === step ? 'bg-primary scale-125' : i < step ? 'bg-primary/40' : 'bg-border'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="px-5 py-2 bg-primary text-primary-foreground font-display text-sm font-bold rounded-lg btn-glow transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {step < steps.length - 1 ? 'Next' : 'Let\'s Sail!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
