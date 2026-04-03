import React, { useState, useEffect, useCallback } from 'react';

interface HouseSceneProps {
  onComplete: () => void;
  isFirstTime: boolean;
}

const INTRO_LINES = [
  { text: "...", delay: 1500 },
  { text: "The house is quiet now.", delay: 80 },
  { text: "Father's coat still hangs by the door.", delay: 80 },
  { text: "The kettle is cold.", delay: 80 },
  { text: "On the table — a letter, a map, and a key.", delay: 80 },
  { text: '"If you\'re reading this, the tide has taken me."', delay: 60 },
  { text: '"The boat is yours. The routes are yours."', delay: 60 },
  { text: '"Keep them safe. Keep them hidden."', delay: 60 },
  { text: '"Something stirs in the deep water, child."', delay: 60 },
  { text: '"Do not sail east. Not yet."', delay: 60 },
  { text: "You fold the letter. You take the key.", delay: 80 },
  { text: "The harbor is waiting.", delay: 80 },
];

const RETURN_LINES = [
  { text: "Home.", delay: 80 },
  { text: "The map spreads across the table, routes marked in father's hand.", delay: 80 },
  { text: "Some paths are fading. New ones need charting.", delay: 80 },
];

const HouseScene: React.FC<HouseSceneProps> = ({ onComplete, isFirstTime }) => {
  const lines = isFirstTime ? INTRO_LINES : RETURN_LINES;
  const [lineIndex, setLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showScene, setShowScene] = useState(true);
  const [flickerPhase, setFlickerPhase] = useState(0);

  const currentLine = lines[lineIndex];

  // Candle flicker
  useEffect(() => {
    const interval = setInterval(() => {
      setFlickerPhase(p => p + 1);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Typewriter
  useEffect(() => {
    if (!currentLine) return;
    setDisplayedText('');
    setIsTyping(true);
    let i = 0;
    const text = currentLine.text;
    const speed = currentLine.delay || 80;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, speed === 1500 ? 500 : 35);
    return () => clearInterval(interval);
  }, [lineIndex, currentLine]);

  const handleAdvance = useCallback(() => {
    if (isTyping) {
      setDisplayedText(currentLine.text);
      setIsTyping(false);
      return;
    }
    if (lineIndex < lines.length - 1) {
      setLineIndex(lineIndex + 1);
    } else {
      setShowScene(false);
      setTimeout(onComplete, 600);
    }
  }, [isTyping, lineIndex, lines, currentLine, onComplete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'e') {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleAdvance]);

  const candleGlow = Math.sin(flickerPhase * 0.7) * 0.15 + 0.85;

  return (
    <div
      className={`absolute inset-0 z-20 transition-opacity duration-500 ${showScene ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleAdvance}
      style={{ cursor: 'pointer' }}
    >
      {/* Dark room background */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Pixel art room scene */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ width: 320, height: 240 }}>
          {/* Floor */}
          <div className="absolute bottom-0 left-0 right-0 h-16" 
            style={{ background: 'hsl(25, 15%, 12%)' }} />
          <div className="absolute bottom-16 left-0 right-0 h-[2px]" 
            style={{ background: 'hsl(25, 10%, 18%)' }} />
          
          {/* Back wall */}
          <div className="absolute top-0 left-0 right-0 bottom-16" 
            style={{ background: 'hsl(220, 10%, 8%)' }} />
          
          {/* Window - moonlight */}
          <div className="absolute top-8 right-8 w-16 h-20 border-2"
            style={{ 
              borderColor: 'hsl(220, 8%, 15%)',
              background: `radial-gradient(ellipse at center, hsl(210, 20%, 15%) 0%, hsl(220, 15%, 6%) 100%)`,
            }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[1px] h-full" style={{ background: 'hsl(220, 8%, 15%)' }} />
              <div className="absolute w-full h-[1px]" style={{ background: 'hsl(220, 8%, 15%)' }} />
            </div>
          </div>

          {/* Table */}
          <div className="absolute bottom-14 left-12 w-24 h-6"
            style={{ background: 'hsl(25, 20%, 15%)' }} />
          <div className="absolute bottom-8 left-14 w-2 h-6"
            style={{ background: 'hsl(25, 15%, 12%)' }} />
          <div className="absolute bottom-8 left-32 w-2 h-6"
            style={{ background: 'hsl(25, 15%, 12%)' }} />
          
          {/* Letter on table */}
          {isFirstTime && (
            <div className="absolute bottom-[76px] left-20 w-6 h-4"
              style={{ background: 'hsl(40, 15%, 55%)', opacity: candleGlow }} />
          )}

          {/* Candle on table */}
          <div className="absolute bottom-[76px] left-28">
            <div className="w-2 h-4" style={{ background: 'hsl(40, 20%, 60%)' }} />
            {/* Flame */}
            <div 
              className="absolute -top-3 left-0 w-2 h-3"
              style={{ 
                background: `radial-gradient(ellipse at bottom, hsl(40, 80%, 60%) 0%, hsl(25, 70%, 40%) 60%, transparent 100%)`,
                opacity: candleGlow,
              }} 
            />
            {/* Candle light radius */}
            <div 
              className="absolute -top-16 -left-16 w-36 h-32"
              style={{ 
                background: `radial-gradient(ellipse at 50% 80%, hsl(40, 50%, 30% / ${candleGlow * 0.12}) 0%, transparent 70%)`,
              }} 
            />
          </div>

          {/* Coat hook by door */}
          <div className="absolute top-12 left-4 w-1 h-3" style={{ background: 'hsl(220, 8%, 18%)' }} />
          <div className="absolute top-14 left-2 w-5 h-8" 
            style={{ background: 'hsl(220, 10%, 14%)', opacity: 0.7 }} />

          {/* Door frame */}
          <div className="absolute top-4 left-0 w-10 bottom-16 border-r-2"
            style={{ borderColor: 'hsl(220, 8%, 13%)' }} />
        </div>
      </div>

      {/* Scanlines overlay */}
      <div className="absolute inset-0 scanlines opacity-30" />

      {/* Text area at bottom */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="max-w-lg mx-auto pixel-border bg-card/95 p-4">
          <p className="font-body text-foreground text-lg leading-relaxed min-h-[2em]">
            {displayedText}
            {isTyping && <span className="animate-typewriter-cursor text-primary">_</span>}
          </p>
          <div className="text-right mt-2">
            <span className="font-body text-xs text-muted-foreground">
              {isTyping ? '[click to skip]' : lineIndex < lines.length - 1 ? '[click to continue]' : '[click to leave]'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HouseScene;
