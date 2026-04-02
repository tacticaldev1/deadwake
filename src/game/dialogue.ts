export interface DialogueLine {
  speaker: string;
  portrait: string; // emoji or key for portrait
  text: string;
  choices?: { label: string; nextId?: string; action?: string }[];
}

export interface DialogueSequence {
  id: string;
  lines: DialogueLine[];
  onComplete?: string; // action key
}

// NPC definitions
export const NPC_PORTRAITS: Record<string, { emoji: string; color: string; name: string }> = {
  friend: { emoji: '🧑‍🦱', color: 'hsl(195, 85%, 50%)', name: 'Kai' },
  mechanic: { emoji: '🔧', color: 'hsl(45, 90%, 55%)', name: 'Old Mara' },
  trader: { emoji: '🏪', color: 'hsl(140, 60%, 45%)', name: 'Naveen' },
  harbormaster: { emoji: '⚓', color: 'hsl(0, 60%, 55%)', name: 'Harbormaster' },
};

// Act 1 dialogues
export const DIALOGUES: Record<string, DialogueSequence> = {
  intro: {
    id: 'intro',
    lines: [
      { speaker: 'friend', portrait: '🧑‍🦱', text: "Hey... I'm sorry about your father. He was a good man." },
      { speaker: 'friend', portrait: '🧑‍🦱', text: "He left you the boat. And this old sea chart. Said you'd know what to do with it." },
      { speaker: 'friend', portrait: '🧑‍🦱', text: "The routes he maintained... they're already falling apart. Traders are getting hit out there." },
      { speaker: 'friend', portrait: '🧑‍🦱', text: "Look — start small. Take a delivery from Naveen at the trade post. Get your sea legs back." },
    ],
    onComplete: 'unlock_first_mission',
  },
  mechanic_first: {
    id: 'mechanic_first',
    lines: [
      { speaker: 'mechanic', portrait: '🔧', text: "So you're the one who inherited that heap of driftwood, eh?" },
      { speaker: 'mechanic', portrait: '🔧', text: "Your father kept that boat in perfect shape. I should know — I built half of it." },
      { speaker: 'mechanic', portrait: '🔧', text: "Bring me coins and I'll fix her up. Hull reinforcement, better sails... the works." },
    ],
  },
  trader_first: {
    id: 'trader_first',
    lines: [
      { speaker: 'trader', portrait: '🏪', text: "Ah, you must be the new captain. Your father's shipments were always on time." },
      { speaker: 'trader', portrait: '🏪', text: "I have cargo that needs moving. Nothing fancy — just supplies to the outer buoys." },
      { speaker: 'trader', portrait: '🏪', text: "Deliver safely and I'll pay well. Lose the cargo... and we both lose." },
    ],
    onComplete: 'unlock_delivery',
  },
  return_port: {
    id: 'return_port',
    lines: [
      { speaker: 'harbormaster', portrait: '⚓', text: "Welcome back to port, captain. Your father would be proud." },
    ],
  },
  dad_log_1: {
    id: 'dad_log_1',
    lines: [
      { speaker: 'harbormaster', portrait: '⚓', text: "Found this tucked behind the dock master's desk. It's your father's handwriting..." },
      { speaker: 'harbormaster', portrait: '⚓', text: '"The eastern routes must stay sealed. What sleeps beneath those waters... is best left undisturbed."' },
      { speaker: 'harbormaster', portrait: '⚓', text: "Make of that what you will. Your father had his reasons." },
    ],
  },
};
