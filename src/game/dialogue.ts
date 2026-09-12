export interface DialogueChoice {
  label: string;
  nextId?: string;
  action?: string;
}

export interface DialogueLine {
  speaker: string;
  portrait: string;
  text: string;
  choices?: DialogueChoice[];
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
  // Generic archetypes for founded outposts (see outposts.ts) — no single
  // named village, since the same archetype id can end up staffing many
  // different outposts. Their dialogue leans on the {village} placeholder
  // instead of being hand-written per place.
  outpost_keeper: { emoji: '=', color: 'hsl(160, 25%, 45%)', name: 'The Keeper', role: 'Outpost Keeper', description: 'Watches over this new stretch of coast.', village: 'outpost' },
  outpost_trader: { emoji: '$', color: 'hsl(90, 25%, 42%)', name: 'A Trader', role: 'Trader', description: 'Set up shop the moment the ink dried on the charter.', village: 'outpost' },
  outpost_lookout: { emoji: '^', color: 'hsl(200, 25%, 48%)', name: 'The Lookout', role: 'Lookout', description: "Keeps watch from the highest point around.", village: 'outpost' },
};

export const DIALOGUES: Record<string, DialogueSequence> = {
  // ================= ACT 1 — first meetings =================
  intro: {
    id: 'intro',
    lines: [
      { speaker: 'friend', portrait: '>', text: "Welcome to Haven, {name}. Your father's port." },
      { speaker: 'friend', portrait: '>', text: "The routes he kept... they're falling apart. Traders getting lost." },
      { speaker: 'friend', portrait: '>', text: "There are villages along his old paths. Salt Cove. Grey Harbor. Mistford." },
      { speaker: 'friend', portrait: '>', text: "Take a mission from the board. It'll show you where to sail." },
      { speaker: 'friend', portrait: '>', text: "When you're near a village, dock. Meet the people. They knew him." },
    ],
  },
  mechanic_first: {
    id: 'mechanic_first',
    lines: [
      { speaker: 'mechanic', portrait: '#', text: "So you're the one who got that old wreck, {name}." },
      { speaker: 'mechanic', portrait: '#', text: "That {outfit} coat won't keep the spray off in a storm." },
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
  fisher_first: {
    id: 'fisher_first',
    lines: [
      { speaker: 'fisher', portrait: '~', text: "Haven't seen a stranger in weeks. Not one that came back, anyway." },
      { speaker: 'fisher', portrait: '~', text: "Nets come up empty now. Or with things that shouldn't be in nets." },
      { speaker: 'fisher', portrait: '~', text: "Grey Harbor still trades. Take my catch there. What's left of it." },
    ],
  },
  saltwidow_first: {
    id: 'saltwidow_first',
    lines: [
      { speaker: 'saltwidow', portrait: '+', text: "..." },
      { speaker: 'saltwidow', portrait: '+', text: "You look like him, {name}. That {hair} hair — same as his." },
      { speaker: 'saltwidow', portrait: '+', text: "The lights are going out." },
    ],
  },
  trader_first: {
    id: 'trader_first',
    lines: [
      { speaker: 'trader', portrait: '$', text: "New captain. Word travels — even in the fog." },
      { speaker: 'trader', portrait: '$', text: "I have cargo for Mistford. Bells and oil." },
      { speaker: 'trader', portrait: '$', text: "Nobody wants to sail there. You will." },
    ],
  },
  dockhand_first: {
    id: 'dockhand_first',
    lines: [
      { speaker: 'dockhand', portrait: '|', text: "Nice {accent} trim on that coat, {name}. Didn't peg you for particular." },
      { speaker: 'dockhand', portrait: '|', text: "Heard talk. Ships going east don't come back." },
      { speaker: 'dockhand', portrait: '|', text: "Your father sealed something out there. Now it's leaking." },
    ],
  },
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
      { speaker: 'child', portrait: '.', text: "You're the sailor, {name}. My mum drew you before you got here." },
      { speaker: 'child', portrait: '.', text: "I like your {outfit} coat. Did you pick it yourself?" },
      { speaker: 'child', portrait: '.', text: "She said don't go east. But you will anyway." },
    ],
  },
  stranger_first: {
    id: 'stranger_first',
    lines: [
      { speaker: 'stranger', portrait: '?', text: "..." },
      { speaker: 'stranger', portrait: '?', text: "You came. He said you would." },
      { speaker: 'stranger', portrait: '?', text: "The seal is breaking. You'll have to choose what to do about it." },
      { speaker: 'stranger', portrait: '?', text: "But not tonight. Sail back home. Think." },
      { speaker: 'stranger', portrait: '?', text: "When you're ready to answer, come back. I'll be waiting. I'm always waiting." },
    ],
  },
  delivery_complete: {
    id: 'delivery_complete',
    lines: [
      { speaker: 'trader', portrait: '$', text: "You made it back. Cargo intact." },
      { speaker: 'trader', portrait: '$', text: "Coin as promised. And a word of warning — the routes are still shifting." },
    ],
  },

  // ================= ACT 2 — after the delivery loop (return_haven done) =================
  friend_later: {
    id: 'friend_later',
    lines: [
      { speaker: 'friend', portrait: '>', text: "You did the whole loop. Salt Cove, Grey Harbor, Mistford — same as he used to." },
      { speaker: 'friend', portrait: '>', text: "He never told me what was east of here. Just that he'd 'handled it.'" },
      { speaker: 'friend', portrait: '>', text: "Whatever it is, I don't think it's staying handled." },
    ],
  },
  mechanic_later: {
    id: 'mechanic_later',
    lines: [
      { speaker: 'mechanic', portrait: '#', text: "Hull's holding. Good. You'll want it tight where you're headed next." },
      { speaker: 'mechanic', portrait: '#', text: "I patched a ship for your father once, after an east run. Wood was warped like it'd been somewhere warm. Underwater shouldn't be warm." },
    ],
  },
  harbormaster_later: {
    id: 'harbormaster_later',
    lines: [
      { speaker: 'harbormaster', portrait: '@', text: "You've walked his whole route now. Every village. Every name." },
      { speaker: 'harbormaster', portrait: '@', text: "There's one more paper. I kept it separate. Wasn't going to give it to you unless you got this far." },
      { speaker: 'harbormaster', portrait: '@', text: '"If she asks to go east, let her. She has to see it to understand what I did."', },
      { speaker: 'harbormaster', portrait: '@', text: "So. Ashenreach, when you're ready. I'll have work waiting when — if — you're back." },
    ],
  },
  fisher_later: {
    id: 'fisher_later',
    lines: [
      { speaker: 'fisher', portrait: '~', text: "Nets came up with ash in them yesterday. Ash, out here, over open water." },
      { speaker: 'fisher', portrait: '~', text: "Wind's carrying it from the east. From wherever you're not supposed to go." },
    ],
  },
  saltwidow_later: {
    id: 'saltwidow_later',
    lines: [
      { speaker: 'saltwidow', portrait: '+', text: "My husband went east, once. Before your father sealed it." },
      { speaker: 'saltwidow', portrait: '+', text: "He didn't come back wrong. He didn't come back at all. There's a difference, and I've had years to learn it." },
    ],
  },
  trader_later: {
    id: 'trader_later',
    lines: [
      { speaker: 'trader', portrait: '$', text: "Business is bad. Nobody's buying when the world's creaking at the seams." },
      { speaker: 'trader', portrait: '$', text: "Go see what's out there, captain. A closed question is worse for trade than a bad answer." },
    ],
  },
  dockhand_later: {
    id: 'dockhand_later',
    lines: [
      { speaker: 'dockhand', portrait: '|', text: "Heard the harbormaster gave you a paper. Heard it had your father's hand on it." },
      { speaker: 'dockhand', portrait: '|', text: "I don't listen at doors on purpose. It just happens. Go careful east." },
    ],
  },
  bellkeeper_later: {
    id: 'bellkeeper_later',
    lines: [
      { speaker: 'bellkeeper', portrait: '&', text: "The bell rang three times last night, all on its own. Never done that before." },
      { speaker: 'bellkeeper', portrait: '&', text: "I think it's counting down to something. I don't want to know what." },
    ],
  },
  child_later: {
    id: 'child_later',
    lines: [
      { speaker: 'child', portrait: '.', text: "I drew the black island again. It's bigger in the new drawing." },
      { speaker: 'child', portrait: '.', text: "Mum says drawings don't mean anything. I don't think she believes that either." },
    ],
  },

  // ================= ACT 3 — after Ashenreach is first visited (east_forbidden done) =================
  friend_later2: {
    id: 'friend_later2',
    lines: [
      { speaker: 'friend', portrait: '>', text: "You went. I can see it on you, {name} — that place leaves something behind." },
      { speaker: 'friend', portrait: '>', text: "Whatever you decide out there, I'm not going to pretend I know better than you do." },
      { speaker: 'friend', portrait: '>', text: "Just come back after. However it goes." },
    ],
  },
  mechanic_later2: {
    id: 'mechanic_later2',
    lines: [
      { speaker: 'mechanic', portrait: '#', text: "Brought her back in one piece. Barely. That place fights you even when it isn't trying." },
      { speaker: 'mechanic', portrait: '#', text: "I'll have her ready whenever you go back to finish it." },
    ],
  },
  harbormaster_later2: {
    id: 'harbormaster_later2',
    lines: [
      { speaker: 'harbormaster', portrait: '@', text: "So you met him. The one who waits." },
      { speaker: 'harbormaster', portrait: '@', text: "Your father met him too, once. Came back different. Sealed the route the next morning and never spoke of it again." },
      { speaker: 'harbormaster', portrait: '@', text: "I have one more thing for you. Not a paper this time. A choice, waiting where he left it." },
      { speaker: 'harbormaster', portrait: '@', text: "Take the board's last posting when you're ready. There's no undoing it once it's done." },
    ],
  },
  fisher_later2: {
    id: 'fisher_later2',
    lines: [
      { speaker: 'fisher', portrait: '~', text: "Nets are still now. Not empty — still. Like the whole sea is holding its breath." },
      { speaker: 'fisher', portrait: '~', text: "Whatever you do out there, do it soon." },
    ],
  },
  saltwidow_later2: {
    id: 'saltwidow_later2',
    lines: [
      { speaker: 'saltwidow', portrait: '+', text: "You went and came back. That's more than my husband managed." },
      { speaker: 'saltwidow', portrait: '+', text: "I'm not going to tell you what to choose. I'm just glad someone finally gets to." },
    ],
  },
  trader_later2: {
    id: 'trader_later2',
    lines: [
      { speaker: 'trader', portrait: '$', text: "Ashenreach and back. That's a story that'll outsell any cargo I've got." },
      { speaker: 'trader', portrait: '$', text: "Whatever's coming, captain — the villages are with you. For what that's worth." },
    ],
  },
  dockhand_later2: {
    id: 'dockhand_later2',
    lines: [
      { speaker: 'dockhand', portrait: '|', text: "You're quieter since you went east. Everyone is, after." },
      { speaker: 'dockhand', portrait: '|', text: "Whatever you decide, I won't say a word against it." },
    ],
  },
  bellkeeper_later2: {
    id: 'bellkeeper_later2',
    lines: [
      { speaker: 'bellkeeper', portrait: '&', text: "The bell stopped the day you went east. Hasn't rung since." },
      { speaker: 'bellkeeper', portrait: '&', text: "I don't know if that's relief or the quiet before something worse." },
    ],
  },
  child_later2: {
    id: 'child_later2',
    lines: [
      { speaker: 'child', portrait: '.', text: "The black island in my drawing has a little boat next to it now. That's you." },
      { speaker: 'child', portrait: '.', text: "I haven't drawn what happens after. I'm waiting to see." },
    ],
  },

  // ================= FINALE — Ashenreach, the choice =================
  stranger_finale: {
    id: 'stranger_finale',
    lines: [
      { speaker: 'stranger', portrait: '?', text: "You came back. Good. It doesn't get easier with waiting." },
      { speaker: 'stranger', portrait: '?', text: "Your father built the seal from grief. Mine, from guilt. It's held twenty years on borrowed time." },
      { speaker: 'stranger', portrait: '?', text: "It's failing now regardless of what either of us wants. The only choice left is what happens when it does." },
      { speaker: 'stranger', portrait: '?', text: "So, {name}. What do we do?",
        choices: [
          { label: 'Seal it forever — bury it, whatever the cost.', action: 'ending_seal' },
          { label: 'Break it wide open — the sea deserves the truth.', action: 'ending_break' },
          { label: "Walk away. Some tides aren't yours to turn.", action: 'ending_flee' },
        ],
      },
    ],
  },

  // ================= OUTPOSTS — generic, reused across every founded outpost =================
  outpost_keeper_first: {
    id: 'outpost_keeper_first',
    lines: [
      { speaker: 'outpost_keeper', portrait: '=', text: "Captain {name}. Word of your empire reaches even {village}." },
      { speaker: 'outpost_keeper', portrait: '=', text: "We're new here, but the board's open and the goods post is stocked. Same as anywhere." },
    ],
  },
  outpost_keeper_later: {
    id: 'outpost_keeper_later',
    lines: [
      { speaker: 'outpost_keeper', portrait: '=', text: "{village}'s holding steady. Routes through here are busier every week." },
    ],
  },
  outpost_keeper_later2: {
    id: 'outpost_keeper_later2',
    lines: [
      { speaker: 'outpost_keeper', portrait: '=', text: "Whatever's happening out east, it hasn't reached us yet. Small mercies." },
    ],
  },
  outpost_trader_first: {
    id: 'outpost_trader_first',
    lines: [
      { speaker: 'outpost_trader', portrait: '$', text: "First captain to dock at {village} in person. Good for business, that." },
      { speaker: 'outpost_trader', portrait: '$', text: "Cargo moves through here now. Your cargo, if you keep at it." },
    ],
  },
  outpost_trader_later: {
    id: 'outpost_trader_later',
    lines: [
      { speaker: 'outpost_trader', portrait: '$', text: "That {outfit} coat's seen some miles since I last saw you." },
    ],
  },
  outpost_trader_later2: {
    id: 'outpost_trader_later2',
    lines: [
      { speaker: 'outpost_trader', portrait: '$', text: "An empire built on trade routes. Your father would've charged you docking fees." },
    ],
  },
  outpost_lookout_first: {
    id: 'outpost_lookout_first',
    lines: [
      { speaker: 'outpost_lookout', portrait: '^', text: "I saw your sail before you saw the shore, {name}. Good instincts, claiming this spot." },
    ],
  },
  outpost_lookout_later: {
    id: 'outpost_lookout_later',
    lines: [
      { speaker: 'outpost_lookout', portrait: '^', text: "Quiet watch from up here. {village}'s lucky so far." },
    ],
  },
  outpost_lookout_later2: {
    id: 'outpost_lookout_later2',
    lines: [
      { speaker: 'outpost_lookout', portrait: '^', text: "Whatever you decided out east, {name} — it hasn't shown up on my watch. Yet." },
    ],
  },
};

export interface Ending {
  title: string;
  lines: string[];
}

export const ENDINGS: Record<string, Ending> = {
  ending_seal: {
    title: 'THE SEAL HOLDS',
    lines: [
      "You and the Stranger work through the night, stone and old iron and a promise neither of you says aloud.",
      "By morning, Ashenreach is quiet again — quieter than before. The ash stops falling. The bell in Mistford does not ring.",
      "You sail home carrying your father's silence, now yours to keep. Haven never learns what almost happened.",
      "Some captains are remembered for what they found. You'll be remembered for what you buried, and for saying nothing about it, the way he did.",
    ],
  },
  ending_break: {
    title: 'THE TIDE DECIDES',
    lines: [
      "You pull the last stone free yourself. The Stranger doesn't stop you — he looks almost relieved.",
      "Whatever was sealed does not roar out. It simply goes, quietly, into open water, the way a held breath finally leaves.",
      "The ash clears in a week. The fish come back to Salt Cove. Nia draws a new picture: an open sea, no black island in it.",
      "Nobody in Haven ever finds out exactly what you let out into the world. You're not entirely sure yourself. But the sea feels less afraid.",
    ],
  },
  ending_flee: {
    title: 'A DOOR LEFT SHUT',
    lines: [
      "You look at the cracked seal, at the Stranger's tired face, and you turn the boat around without answering.",
      "\"That's an answer too,\" he calls after you, and he isn't wrong.",
      "You sail back to Haven and take up your father's old routes exactly as he left them — visiting every village, never mentioning Ashenreach.",
      "Some nights you still see the black smudge on the horizon to the east. You choose, every time, not to look too long.",
    ],
  },
};
