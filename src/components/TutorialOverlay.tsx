import React, { useState } from 'react';

interface TutorialOverlayProps {
  onDismiss: () => void;
}

const steps = [
  {
    title: 'WELCOME, CAPTAIN',
    desc: 'Navigate the dark waters. Avoid what lurks beneath.',
    icon: '~',
  },
  {
    title: 'CONTROLS',
    desc: 'WASD or Arrows to steer. W to accelerate. Click/drag to aim.',
    icon: '>',
  },
  {
    title: 'THE WIND',
    desc: 'Wind affects your speed. Sail with it, not against it.',
    icon: '=',
  },
  {
    title: 'SURVIVE',
    desc: 'Collect coins. Grab crates. Avoid rocks and enemy ships.',
    icon: '!',
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
      className={`absolute inset-0 z-30 flex items-center justify-center bg-background/80 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="absolute inset-0 scanlines opacity-20" />
      <div className="animate-fade-in pixel-border bg-card/95 p-6 md:p-8 max-w-xs w-full mx-4 text-center relative z-10">
        <div className="font-display text-lg text-primary mb-4">{current.icon}</div>
        <h2 className="font-display text-[10px] text-foreground mb-3">{current.title}</h2>
        <p className="font-body text-sm text-muted-foreground leading-relaxed mb-6">{current.desc}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={skip}
            className="font-body text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            [skip]
          </button>

          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 transition-colors ${
                    i === step ? 'bg-primary' : i < step ? 'bg-primary/30' : 'bg-border'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="px-4 py-2 bg-primary text-primary-foreground font-display text-[8px] pixel-btn transition-colors hover:bg-primary/80"
            >
              {step < steps.length - 1 ? 'NEXT' : 'SAIL'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
