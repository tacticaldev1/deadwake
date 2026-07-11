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

export const NPC_PORTRAITS: Record<string, { emoji: string; color: string; name: string; role: string; description: string; village: string }> = {
  // Haven Village
  friend: { emoji: '>', color: 'hsl(180, 30%, 50%)', name: 'Kai', role: 'Old Friend', description: 'Knows the waters. Knew your father.', village: 'haven' },
  mechanic: { emoji: '#', color: 'hsl(40, 50%, 50%)', name: 'Old Mara', role: 'Mechanic', description: 'Built half your boat.', village: 'haven' },
  harbormaster: { emoji: '@', color: 'hsl(0, 35%, 45%)', name: 'Harbormaster', role: 'Keeper of the Dock', description: 'Has some of father\'s old papers.', village: 'haven' },
  // Salt Cove
  fisher: { emoji: '~', color: 'hsl(200, 30%, 45%)', name: 'Old Ren', role: 'Fisher', description: 'Fishes nothing lately. Only bones.', village: 'salt_cove' },
  saltwidow: { emoji: '+', color: 'hsl(280, 15%, 45%)', name: 'The Widow', role: 'Mourner', description: 'Waits at the dock every night.', village: 'salt_cove' },
  // Grey Harbor
  trader: { emoji: '$', color: 'hsl(100, 25%, 40%)', name: 'Naveen', role: 'Trader', description: 'Always has cargo.', village: 'grey_harbor' },
  dockhand: { emoji: '|', color: 'hsl(30, 20%, 45%)', name: 'Bram', role: 'Dockhand', description: 'Hears everything. Says little.', village: 'grey_harbor' },
  // Mistford
  bellkeeper: { emoji: '&', color: 'hsl(220, 25%, 50%)', name: 'Bellkeeper', role: 'Keeper of Bells', description: 'Rings the fog bell. Or something rings it.', village: 'mistford' },
  child: { emoji: '.', color: 'hsl(45, 30%, 60%)', name: 'Nia', role: 'Child', description: 'Sits by the water. Draws maps in the mud.', village: 'mistford' },
  // Ashenreach
  stranger: { emoji: '?', color: 'hsl(0, 40%, 40%)', name: 'The Stranger', role: '???', description: 'Waited for you specifically.', village: 'ashenreach' },
};

export const DIALOGUES: Record<string, DialogueSequence> = {
  // ---- Haven ----
  intro: {
    id: 'intro',
    lines: [
      { speaker: 'friend', portrait: '>', text: "Welcome to Haven, captain. Your father's port." },
      { speaker: 'friend', portrait: '>', text: "The routes he kept... they're falling apart. Traders getting lost." },
      { speaker: 'friend', portrait: '>', text: "There are villages along his old paths. Salt Cove. Grey Harbor. Mistford." },
      { speaker: 'friend', portrait: '>', text: "Take a mission from the board. It'll show you where to sail." },
      { speaker: 'friend', portrait: '>', text: "When you're near a village, dock. Meet the people. They knew him." },
    ],
  },
  mechanic_first: {
    id: 'mechanic_first',
    lines: [
      { speaker: 'mechanic', portrait: '#', text: "So you're the one who got that old wreck." },
      { speaker: 'mechanic', portrait: '#', text: "Bring coins. I'll patch her hull, tune her sails." },
      { speaker: 'mechanic', portrait: '#', text: "...You'll need it, where you're going." },
    ],
  },
  harbormaster_first: {
    id: 'harbormaster_first',
    lines: [
      { speaker: 'harbormaster', portrait: '@', text: "Your father left papers with me. In case." },
      { speaker: 'harbormaster', portrait: '@', text: '"The eastern route stays sealed. Do not open it."' },
      { speaker: 'harbormaster', portrait: '@', text: "Ashenreach. That's what he meant. Don't sail there." },
      { speaker: 'harbormaster', portrait: '@', text: "...Not until you have to." },
    ],
  },
  // ---- Salt Cove ----
  fisher_first: {
    id: 'fisher_first',
    lines: [
      { speaker: 'fisher', portrait: '~', text: "Haven't seen a stranger in weeks. Not one that came back, anyway." },
      { speaker: 'fisher', portrait: '~', text: "Nets come up empty now. Or with things that shouldn't be in nets." },
      { speaker: 'fisher', portrait: '~', text: "Grey Harbor still trades. Take my catch there. What's left of it." },
    ],
    onComplete: 'unlock_fisher_mission',
  },
  saltwidow_first: {
    id: 'saltwidow_first',
    lines: [
      { speaker: 'saltwidow', portrait: '+', text: "..." },
      { speaker: 'saltwidow', portrait: '+', text: "You look like him. The one who kept the lights lit." },
      { speaker: 'saltwidow', portrait: '+', text: "The lights are going out." },
    ],
  },
  // ---- Grey Harbor ----
  trader_first: {
    id: 'trader_first',
    lines: [
      { speaker: 'trader', portrait: '$', text: "New captain. Word travels — even in the fog." },
      { speaker: 'trader', portrait: '$', text: "I have cargo for Mistford. Bells and oil." },
      { speaker: 'trader', portrait: '$', text: "Nobody wants to sail there. You will." },
    ],
    onComplete: 'unlock_grey_mission',
  },
  dockhand_first: {
    id: 'dockhand_first',
    lines: [
      { speaker: 'dockhand', portrait: '|', text: "Heard talk. Ships going east don't come back." },
      { speaker: 'dockhand', portrait: '|', text: "Your father sealed something out there. Now it's leaking." },
    ],
  },
  // ---- Mistford ----
  bellkeeper_first: {
    id: 'bellkeeper_first',
    lines: [
      { speaker: 'bellkeeper', portrait: '&', text: "You hear the bell? It rings when nothing's touching it." },
      { speaker: 'bellkeeper', portrait: '&', text: "Been ringing more lately. Something's answering." },
    ],
  },
  child_first: {
    id: 'child_first',
    lines: [
      { speaker: 'child', portrait: '.', text: "You're the sailor. My mum drew you before you got here." },
      { speaker: 'child', portrait: '.', text: "She said don't go east. But you will anyway." },
    ],
  },
  // ---- Ashenreach ----
  stranger_first: {
    id: 'stranger_first',
    lines: [
      { speaker: 'stranger', portrait: '?', text: "..." },
      { speaker: 'stranger', portrait: '?', text: "You came. He said you would." },
      { speaker: 'stranger', portrait: '?', text: "The seal is breaking. You'll have to choose what to do about it." },
      { speaker: 'stranger', portrait: '?', text: "But not tonight. Sail back home. Think." },
    ],
  },
  // ---- Mission completion ----
  delivery_complete: {
    id: 'delivery_complete',
    lines: [
      { speaker: 'trader', portrait: '$', text: "You made it back. Cargo intact." },
      { speaker: 'trader', portrait: '$', text: "Coin as promised. And a word of warning — the routes are still shifting." },
    ],
  },
};
