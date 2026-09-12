import React, { useState, useEffect, useCallback } from 'react';
import { DialogueSequence, DialogueChoice, NPC_PORTRAITS } from '../game/dialogue';
import { PlayerProfile, resolveDialogueText } from '../game/profile';
import { FriendshipProgress } from '../game/friendship';
import { sfxButtonClick } from '../game/sfx';

interface DialogueBoxProps {
  sequence: DialogueSequence;
  onComplete: (action?: string) => void;
  onChoice?: (choice: DialogueChoice) => void;
  profile: PlayerProfile;
  villageName?: string;
  // Friendship meter for whoever is speaking — undefined for narrator/letter
  // sequences with no trackable NPC (see pickNpcDialogue's callers).
  friendshipProgress?: FriendshipProgress;
}

const DialogueBox: React.FC<DialogueBoxProps> = ({ sequence, onComplete, onChoice, profile, villageName, friendshipProgress }) => {
  const [lineIndex, setLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const currentLine = sequence.lines[lineIndex];
  const npcInfo = NPC_PORTRAITS[currentLine?.speaker] || { emoji: '?', color: 'hsl(0,0%,50%)', name: '???' };
  const resolvedText = currentLine ? resolveDialogueText(currentLine.text, profile, villageName) : '';
  const isChoiceLine = !isTyping && !!currentLine?.choices?.length;

  useEffect(() => {
    setLineIndex(0);
  }, [sequence]);

  useEffect(() => {
    if (!currentLine) return;
    setDisplayedText('');
    setIsTyping(true);
    let i = 0;
    const text = resolvedText;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [lineIndex, currentLine, resolvedText]);

  const handleAdvance = useCallback(() => {
    if (isChoiceLine) return;
    if (isTyping) {
      setDisplayedText(resolvedText);
      setIsTyping(false);
      return;
    }
    if (lineIndex < sequence.lines.length - 1) {
      setLineIndex(lineIndex + 1);
    } else {
      onComplete(sequence.onComplete);
    }
  }, [isTyping, isChoiceLine, lineIndex, sequence, currentLine, onComplete]);

  const handleChoice = (choice: DialogueChoice) => {
    sfxButtonClick();
    onChoice?.(choice);
  };

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
    <div className="absolute inset-x-0 bottom-0 z-50 p-4" onClick={isChoiceLine ? undefined : handleAdvance}>
      <div className="max-w-xl mx-auto">
        <div className="pixel-border bg-card/95 overflow-hidden animate-fade-in">
          {/* Speaker */}
          <div className="flex items-center gap-2 px-4 py-2 border-b-2 border-border bg-black/20">
            <span className="font-display text-xs" style={{ color: npcInfo.color, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              {npcInfo.emoji}
            </span>
            <span className="font-display text-xs" style={{ color: npcInfo.color, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              {npcInfo.name}
            </span>
            {friendshipProgress && (
              <div className="ml-auto flex flex-col items-end gap-0.5 min-w-[84px]">
                <span className="font-display text-[6px] text-muted-foreground">
                  {friendshipProgress.tierName.toUpperCase()}
                  {friendshipProgress.nextThreshold != null ? ` ${friendshipProgress.level}/${friendshipProgress.nextThreshold}` : ' ★ MAX'}
                </span>
                <div className="w-full h-1.5 bg-muted/40 border border-border">
                  <div
                    className="h-full bg-primary transition-[width]"
                    style={{ width: `${friendshipProgress.pct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Text */}
          <div className="px-4 py-3 min-h-[60px] flex items-center">
            <p className="font-body text-xl text-foreground leading-relaxed">
              {displayedText}
              {isTyping && <span className="animate-typewriter-cursor text-primary">_</span>}
            </p>
          </div>

          {/* Choices */}
          {isChoiceLine ? (
            <div className="px-4 pb-4 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              {currentLine.choices!.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => handleChoice(choice)}
                  className="text-left px-3 py-2 pixel-border bg-secondary/70 hover:bg-primary/30 hover:text-primary transition-colors font-body text-lg text-foreground pixel-btn"
                >
                  ▸ {choice.label}
                </button>
              ))}
            </div>
          ) : (
            /* Prompt */
            <div className="px-4 pb-2 flex justify-end">
              <span className="font-body text-sm text-muted-foreground">
                {isTyping ? '[click]' : lineIndex < sequence.lines.length - 1 ? '[continue ▸]' : '[close ▸]'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DialogueBox;
