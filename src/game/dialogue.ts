export interface DialogueLine {
  speaker: string;
  portrait: string;
  text: string;
  choices?: { label: string; nextId?: string; action?: string }[];
}

export interface DialogueSequence {
  id: string;
  lines: DialogueLine[];
  onComplete?: string;
}

export const NPC_PORTRAITS: Record<string, { emoji: string; color: string; name: string }> = {
  friend: { emoji: '>', color: 'hsl(180, 30%, 50%)', name: 'Kai' },
  mechanic: { emoji: '#', color: 'hsl(40, 50%, 50%)', name: 'Old Mara' },
  trader: { emoji: '$', color: 'hsl(100, 25%, 40%)', name: 'Naveen' },
  harbormaster: { emoji: '@', color: 'hsl(0, 35%, 45%)', name: 'Harbormaster' },
};

export const DIALOGUES: Record<string, DialogueSequence> = {
  intro: {
    id: 'intro',
    lines: [
      { speaker: 'friend', portrait: '>', text: "...Hey. I'm sorry about your father." },
      { speaker: 'friend', portrait: '>', text: "He left you the boat. And that old chart. Said you'd understand." },
      { speaker: 'friend', portrait: '>', text: "The routes he kept... they're falling apart. Traders are getting lost out there." },
      { speaker: 'friend', portrait: '>', text: "Some haven't come back." },
      { speaker: 'friend', portrait: '>', text: "Start small. Naveen has cargo that needs moving. Get your bearings." },
    ],
    onComplete: 'unlock_first_mission',
  },
  mechanic_first: {
    id: 'mechanic_first',
    lines: [
      { speaker: 'mechanic', portrait: '#', text: "So you're the one who got that old wreck." },
      { speaker: 'mechanic', portrait: '#', text: "Your father kept her in shape. I built half of her." },
      { speaker: 'mechanic', portrait: '#', text: "Bring coins. I'll make her seaworthy again." },
      { speaker: 'mechanic', portrait: '#', text: "...You'll need it, where you're going." },
    ],
  },
  trader_first: {
    id: 'trader_first',
    lines: [
      { speaker: 'trader', portrait: '$', text: "The new captain. Your father's shipments were always on time." },
      { speaker: 'trader', portrait: '$', text: "I have cargo. Supplies for the outer markers." },
      { speaker: 'trader', portrait: '$', text: "Deliver safe and I pay well." },
      { speaker: 'trader', portrait: '$', text: "Lose it... and we both lose." },
      { speaker: 'trader', portrait: '$', text: "The waters have been strange lately. Be careful." },
    ],
    onComplete: 'unlock_delivery',
  },
  return_port: {
    id: 'return_port',
    lines: [
      { speaker: 'harbormaster', portrait: '@', text: "Back safe. That's what matters." },
      { speaker: 'harbormaster', portrait: '@', text: "...For now." },
    ],
  },
  dad_log_1: {
    id: 'dad_log_1',
    lines: [
      { speaker: 'harbormaster', portrait: '@', text: "Found this behind the dock master's desk. Your father's writing." },
      { speaker: 'harbormaster', portrait: '@', text: '"The eastern routes must stay sealed."' },
      { speaker: 'harbormaster', portrait: '@', text: '"What sleeps beneath those waters... is best left undisturbed."' },
      { speaker: 'harbormaster', portrait: '@', text: "...He had his reasons." },
    ],
  },
};
