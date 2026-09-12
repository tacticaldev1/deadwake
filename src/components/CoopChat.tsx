import React, { useEffect, useRef, useState } from 'react';
import { ChatEntry } from '../net/useCoopSession';

interface CoopChatProps {
  entries: ChatEntry[];
  onSend: (text: string) => void;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
}

// Press Enter to open, type, Enter to send. Keystrokes are stopped from
// bubbling to `window` while composing so they never leak into the game's
// own WASD/interact key listeners (VillageWalkScene, useGameLoop) — on top of
// that, onOpenChange feeds into the screen's existing `paused` gate so the
// boat/character doesn't drift while a message is being typed.
const CoopChat: React.FC<CoopChatProps> = ({ entries, onSend, onOpenChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { onOpenChange(open); }, [open, onOpenChange]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [entries]);

  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open || disabled) return;
      if (e.key === 'Enter') { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, disabled]);

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed) onSend(trimmed);
    setText('');
    setOpen(false);
  };

  return (
    <div className="absolute bottom-3 right-3 z-20 w-64 flex flex-col items-end gap-1 pointer-events-none">
      {entries.length > 0 && (
        <div ref={logRef} className="w-full pixel-border bg-card/85 px-2 py-1.5 max-h-32 overflow-y-auto flex flex-col gap-0.5 pointer-events-auto">
          {entries.map(e => (
            <div key={e.id} className={`font-body text-sm leading-tight break-words ${e.kind === 'system' ? 'text-muted-foreground italic' : 'text-foreground'}`}>
              {e.kind === 'chat' ? <><span className="text-primary">{e.name}:</span> {e.text}</> : e.text}
            </div>
          ))}
        </div>
      )}
      {open ? (
        <input
          ref={inputRef}
          value={text}
          onChange={ev => setText(ev.target.value)}
          onKeyDown={ev => {
            ev.stopPropagation();
            if (ev.key === 'Enter') { ev.preventDefault(); submit(); }
            if (ev.key === 'Escape') { ev.preventDefault(); setText(''); setOpen(false); }
          }}
          onKeyUp={ev => ev.stopPropagation()}
          onBlur={() => setOpen(false)}
          maxLength={240}
          placeholder="Say something…"
          className="w-full bg-muted/90 border-2 border-primary px-2 py-1 font-body text-sm text-foreground outline-none pointer-events-auto"
        />
      ) : (
        !disabled && (
          <button
            onClick={() => setOpen(true)}
            className="font-body text-xs text-muted-foreground hover:text-foreground pointer-events-auto pixel-border bg-card/70 px-2 py-1"
          >
            Press ENTER to chat
          </button>
        )
      )}
    </div>
  );
};

export default CoopChat;
