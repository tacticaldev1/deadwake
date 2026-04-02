import React, { useState, useEffect, useCallback } from 'react';
import { DialogueSequence, NPC_PORTRAITS } from '../game/dialogue';

interface DialogueBoxProps {
  sequence: DialogueSequence;
  onComplete: (action?: string) => void;
}

const DialogueBox: React.FC<DialogueBoxProps> = ({ sequence, onComplete }) => {
  const [lineIndex, setLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const currentLine = sequence.lines[lineIndex];
  const npcInfo = NPC_PORTRAITS[currentLine?.speaker] || { emoji: '❓', color: 'hsl(0,0%,60%)', name: 'Unknown' };

  // Typewriter effect
  useEffect(() => {
    if (!currentLine) return;
    setDisplayedText('');
    setIsTyping(true);
    let i = 0;
    const text = currentLine.text;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [lineIndex, currentLine]);

  const handleAdvance = useCallback(() => {
    if (isTyping) {
      // Skip typing, show full text
      setDisplayedText(currentLine.text);
      setIsTyping(false);
      return;
    }
    if (lineIndex < sequence.lines.length - 1) {
      setLineIndex(lineIndex + 1);
    } else {
      onComplete(sequence.onComplete);
    }
  }, [isTyping, lineIndex, sequence, currentLine, onComplete]);

  // Click or key to advance
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleAdvance]);

  if (!currentLine) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-50 p-4 md:p-6" onClick={handleAdvance}>
      <div className="max-w-2xl mx-auto">
        <div className="bg-card/95 backdrop-blur-md rounded-xl border border-border/60 shadow-2xl overflow-hidden animate-fade-in">
          {/* Speaker bar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border/40">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: npcInfo.color + '22', border: `2px solid ${npcInfo.color}` }}
            >
              {npcInfo.emoji}
            </div>
            <span className="font-display font-bold text-foreground text-lg" style={{ color: npcInfo.color }}>
              {npcInfo.name}
            </span>
          </div>

          {/* Dialogue text */}
          <div className="px-5 py-4 min-h-[80px] flex items-center">
            <p className="font-body text-foreground/90 text-base leading-relaxed">
              {displayedText}
              {isTyping && <span className="animate-pulse text-primary">▊</span>}
            </p>
          </div>

          {/* Continue prompt */}
          <div className="px-5 pb-3 flex justify-end">
            <span className="text-xs text-muted-foreground/60 font-body animate-pulse">
              {isTyping ? 'Click to skip...' : lineIndex < sequence.lines.length - 1 ? 'Click to continue ▸' : 'Click to close ▸'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DialogueBox;
