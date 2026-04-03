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
  const npcInfo = NPC_PORTRAITS[currentLine?.speaker] || { emoji: '?', color: 'hsl(0,0%,50%)', name: '???' };

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
    }, 30);
    return () => clearInterval(interval);
  }, [lineIndex, currentLine]);

  const handleAdvance = useCallback(() => {
    if (isTyping) {
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
    <div className="absolute inset-x-0 bottom-0 z-50 p-4" onClick={handleAdvance}>
      <div className="max-w-xl mx-auto">
        <div className="pixel-border bg-card/95 overflow-hidden animate-fade-in">
          {/* Speaker */}
          <div className="flex items-center gap-2 px-4 py-2 border-b-2 border-border">
            <span className="font-display text-[10px]" style={{ color: npcInfo.color }}>
              {npcInfo.emoji}
            </span>
            <span className="font-display text-[10px]" style={{ color: npcInfo.color }}>
              {npcInfo.name}
            </span>
          </div>

          {/* Text */}
          <div className="px-4 py-3 min-h-[60px] flex items-center">
            <p className="font-body text-lg text-foreground/90 leading-relaxed">
              {displayedText}
              {isTyping && <span className="animate-typewriter-cursor text-primary">_</span>}
            </p>
          </div>

          {/* Prompt */}
          <div className="px-4 pb-2 flex justify-end">
            <span className="font-body text-xs text-muted-foreground/50">
              {isTyping ? '[click]' : lineIndex < sequence.lines.length - 1 ? '[continue ▸]' : '[close ▸]'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DialogueBox;
