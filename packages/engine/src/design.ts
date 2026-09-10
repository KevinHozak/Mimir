export type FirstGlowValueTendency = "care" | "caution" | "curiosity" | "independence" | "patience" | "reciprocity";
export interface FirstGlowRelationship { sparkId: string; kind: "companionship" | "reliance" | "tension" | "curiosity"; note: string; }
export interface FirstGlowKnowledgeBoundary { knows: string[]; doesNotKnow: string[]; }
export interface FirstGlowCard {
  id: string;
  name: string;
  valueTendencies: FirstGlowValueTendency[];
  practicalNeeds: string[];
  initialRelationships: FirstGlowRelationship[];
  knowledgeBoundary: FirstGlowKnowledgeBoundary;
  description: string;
  openingQuestion: string;
}
export interface FirstGlowDilemmaAlternative { id: string; label: string; resourceEffects: string[]; socialEffects: string[]; durableConsequences: string[]; }
export interface FirstGlowKnowledgeView { sparkId: string; knows: string[]; doesNotKnow: string[]; }
export interface FirstGlowDilemma {
  id: string;
  title: string;
  prompt: string;
  objectiveFacts: string[];
  alternatives: FirstGlowDilemmaAlternative[];
  knowledgeBoundaries: FirstGlowKnowledgeView[];
}
export interface FirstGlowDesign { cards: FirstGlowCard[]; dilemmas: FirstGlowDilemma[]; events: FirstGlowEventCard[]; openingQuestion: string; boundary: string; }
export interface FirstGlowEventCard { id: string; title: string; prompt: string; observableOutcome: string; }

export interface FirstGlowSocialScenario {
  seed: number;
  cards: FirstGlowCard[];
  dilemmas: FirstGlowDilemma[];
  openingDilemmaId: string;
}

export const FIRST_GLOW_DESIGN: FirstGlowDesign = {
  openingQuestion: "What keeps our lights on?",
  boundary: "Sparks know practical local routines, but not their purpose, the Originators, or any mature institution.",
  events: [
    { id: "quieting-pool", title: "A pool grows quiet", prompt: "A nearby charge pool gives less light than it did before.", observableOutcome: "The source charge falls and Sparks must notice the changing route." },
    { id: "unfamiliar-trace", title: "An unfamiliar trace", prompt: "A faint trace appears beyond a familiar circuit path.", observableOutcome: "A Spark can explore it and leave a light mark for another Spark to find." },
    { id: "wild-cache-signal", title: "A wild cache signal", prompt: "A side branch ends at a faint cache signal whose return path is less familiar.", observableOutcome: "A Spark can spend charge and readiness to test the cache, leaving a witnessed record of the risk." }
  ],
  dilemmas: [
    {
      id: "weakening-pool-report",
      title: "The quiet pool",
      prompt: "A charge pool is weakening, and another Spark is approaching without seeing the change.",
      objectiveFacts: ["The pool gives less charge than before.", "The approaching Spark can reach the pool before its next rest.", "No Spark can yet explain why the pool is weakening."],
      alternatives: [
        { id: "reveal-pool", label: "Reveal the weakening pool", resourceEffects: ["The approaching Spark can choose a safer route before spending its travel charge."], socialEffects: ["The other Spark has direct evidence that the warning was offered."], durableConsequences: ["The pool is recorded as weakening for later choices.", "The warned Spark is more likely to seek this Spark's signal again."] },
        { id: "withhold-pool", label: "Withhold the warning", resourceEffects: ["The approaching Spark may spend effort reaching a pool that yields little charge."], socialEffects: ["No shared warning is attached to the approach."], durableConsequences: ["The pool remains an uncertain private observation until another Spark tests it.", "Later help may be judged by whether this Spark speaks up next time."] }
      ],
      knowledgeBoundaries: [
        { sparkId: "spark-lumen", knows: ["The pool's latest visible brightness.", "The approaching Spark's route toward the pool."], doesNotKnow: ["The cause of the weakening."] },
        { sparkId: "spark-rill", knows: ["The route it can currently follow.", "What it can see when it arrives."], doesNotKnow: ["The pool's changed yield until it is told or tested."] }
      ]
    },
    {
      id: "shelter-or-trace",
      title: "The tired traveler",
      prompt: "A tired Spark can reach a shelter niche if helped, but an unfamiliar trace is open for exploration now.",
      objectiveFacts: ["The tired Spark's readiness is low enough that another long route carries risk.", "The shelter niche is reachable by a short shared route.", "The unfamiliar trace will remain visible, but its next branch is not mapped."],
      alternatives: [
        { id: "help-shelter", label: "Help the tired Spark reach shelter", resourceEffects: ["The helper spends time and route capacity.", "The tired Spark can recover readiness in the shelter niche."], socialEffects: ["The action is visible to both Sparks at the shelter route."], durableConsequences: ["The tired Spark starts the next choice rested.", "The pair retain a concrete history of cooperation."] },
        { id: "continue-exploration", label: "Continue exploring", resourceEffects: ["The exploring Spark reaches the trace sooner.", "The tired Spark remains low on readiness and may wait or turn back."], socialEffects: ["The tired Spark receives no immediate route assistance."], durableConsequences: ["The trace gains an earlier observation.", "The tired Spark's next willingness to follow this Spark is uncertain."] }
      ],
      knowledgeBoundaries: [
        { sparkId: "spark-rill", knows: ["Its own low readiness.", "The shelter niche's visible entrance.", "The helper's current route."], doesNotKnow: ["What the unexplored trace leads to."] },
        { sparkId: "spark-ora", knows: ["The trace's visible branch.", "The tired Spark's position if it is watching."], doesNotKnow: ["How much readiness the other Spark can safely spend."] }
      ]
    },
    {
      id: "public-or-private-mark",
      title: "A useful light mark",
      prompt: "A Spark finds a reliable trace junction and can leave its light mark where others can see it or keep the location private.",
      objectiveFacts: ["The trace junction connects two currently walkable cells.", "A light mark can be seen from the nearby route.", "The mark does not prove what lies beyond the junction."],
      alternatives: [
        { id: "make-mark-public", label: "Make the mark public", resourceEffects: ["Other Sparks spend less effort finding the junction."], socialEffects: ["Any nearby Spark can observe who left the mark and compare the route for itself."], durableConsequences: ["The junction becomes shared local evidence.", "Later Sparks may follow the mark without sharing the same interpretation."] },
        { id: "keep-mark-private", label: "Keep the mark private", resourceEffects: ["Other Sparks must spend their own effort locating the junction."], socialEffects: ["The finding remains attached to one Spark's local knowledge."], durableConsequences: ["The junction stays less crowded for the next exploration.", "The private Spark carries responsibility for deciding when the evidence is ready to share."] }
      ],
      knowledgeBoundaries: [
        { sparkId: "spark-ora", knows: ["The junction's position.", "The two visible walkable connections."], doesNotKnow: ["Whether the trace continues safely beyond what is visible."] },
        { sparkId: "spark-nix", knows: ["Any mark visible from its current route."], doesNotKnow: ["Who made a private mark or why it was kept private."] }
      ]
    },
    {
      id: "wild-cache-risk",
      title: "The wild cache",
      prompt: "A faint cache signal is reachable, but probing it costs charge and makes the return route less certain.",
      objectiveFacts: ["The Wild Cache is reachable from the known trace branch.", "Probing costs one carried charge or adds one charge deficit and reduces readiness.", "The cache signal is observed, but its wider purpose is unknown."],
      alternatives: [
        { id: "enter-wild-cache", label: "Probe the Wild Cache", resourceEffects: ["Spend one carried charge, or accept one charge deficit when dim."], socialEffects: ["The probing Spark creates a witnessed record that the branch is uncertain."], durableConsequences: ["The Spark learns a local cache signal without learning its purpose.", "The return route remains a practical question for later choices."] },
        { id: "stay-on-trace", label: "Stay on the known trace", resourceEffects: ["Keep charge and readiness for a more familiar route."], socialEffects: ["A cautious choice can be compared with the probe when another Spark tests the branch."], durableConsequences: ["The cache remains an untested possibility.", "The known trace stays the safer shared reference."] }
      ],
      knowledgeBoundaries: [
        { sparkId: "spark-ora", knows: ["The branch reaches a visible cache signal.", "The return route is less familiar."], doesNotKnow: ["What the cache signal is for or whether it continues beyond the visible point."] },
        { sparkId: "spark-nix", knows: ["The known trace route and its own charge."], doesNotKnow: ["Whether the Wild Cache contains anything useful until a Spark probes it."] }
      ]
    }
  ],
  cards: [
    { id: "spark-lumen", name: "Lumen", valueTendencies: ["care", "reciprocity"], practicalNeeds: ["a nearby charge pool", "time to notice dimming Sparks"], initialRelationships: [{ sparkId: "spark-rill", kind: "companionship", note: "Often travels beside Rill when routes are clear." }, { sparkId: "spark-ora", kind: "curiosity", note: "Watches Ora's unfamiliar-route choices." }], knowledgeBoundary: { knows: ["Visible pool brightness and nearby Spark positions."], doesNotKnow: ["Why a pool weakens or what a hidden trace branch contains."] }, description: "Notices when another Spark is dimming and offers help before being asked.", openingQuestion: "Who needs a little more time or charge?" },
    { id: "spark-rill", name: "Rill", valueTendencies: ["patience", "care"], practicalNeeds: ["a shelter niche after long routes", "a predictable return path"], initialRelationships: [{ sparkId: "spark-lumen", kind: "reliance", note: "Accepts Lumen's steady route signals." }, { sparkId: "spark-nix", kind: "tension", note: "Nix's sudden detours make Rill cautious." }], knowledgeBoundary: { knows: ["Its own readiness and visible shelter entrances."], doesNotKnow: ["How much charge another Spark carries or what a mark means to its maker."] }, description: "Protects readiness and prefers a safe return before taking a longer route.", openingQuestion: "When is it wise to pause?" },
    { id: "spark-ora", name: "Ora", valueTendencies: ["curiosity", "independence"], practicalNeeds: ["an unfamiliar trace", "time to compare route changes"], initialRelationships: [{ sparkId: "spark-lumen", kind: "curiosity", note: "Uses Lumen as a careful second set of eyes." }, { sparkId: "spark-nix", kind: "companionship", note: "Invites Nix to follow new branches." }], knowledgeBoundary: { knows: ["Visible route shapes and marks it personally observes."], doesNotKnow: ["Whether an unexplored branch is safe beyond its visible cells."] }, description: "Follows an unfamiliar trace and keeps questions open when a pattern does not fit.", openingQuestion: "What is this pattern asking us to notice?" },
    { id: "spark-nix", name: "Nix", valueTendencies: ["independence", "caution"], practicalNeeds: ["a clear route choice", "space to test a mark alone"], initialRelationships: [{ sparkId: "spark-ora", kind: "companionship", note: "Enjoys Ora's willingness to look again." }, { sparkId: "spark-rill", kind: "tension", note: "Finds Rill's pauses difficult to read." }], knowledgeBoundary: { knows: ["What it has personally traversed and any visible light mark."], doesNotKnow: ["Private observations held by other Sparks."] }, description: "Tests a route directly before depending on a shared account of it.", openingQuestion: "What can I learn by trying this myself?" },
    { id: "spark-veil", name: "Veil", valueTendencies: ["caution", "reciprocity"], practicalNeeds: ["a reliable charge source", "a chance to confirm reports"], initialRelationships: [{ sparkId: "spark-lumen", kind: "reliance", note: "Trusts Lumen's warnings when evidence is visible." }, { sparkId: "spark-ora", kind: "tension", note: "Wants Ora to separate a sighting from a guess." }], knowledgeBoundary: { knows: ["Observed charge changes and its own route history."], doesNotKnow: ["The reasons behind another Spark's choice to reveal or withhold."] }, description: "Checks a report against what the light and route actually show.", openingQuestion: "What do we know, and what are we adding?" },
    { id: "spark-sel", name: "Sel", valueTendencies: ["care", "independence"], practicalNeeds: ["a sheltered rest point", "a useful task with a visible result"], initialRelationships: [{ sparkId: "spark-rill", kind: "companionship", note: "Shares quiet rest without needing a full explanation." }, { sparkId: "spark-nix", kind: "curiosity", note: "Wonders why Nix keeps findings close." }], knowledgeBoundary: { knows: ["Visible tiredness, shelter access, and marks on the route."], doesNotKnow: ["A Spark's private intention when it leaves no mark."] }, description: "Offers practical help, but keeps its own next route open.", openingQuestion: "What small action would make the next choice easier?" }
  ]
};

export function validateFirstGlowDesign(design: FirstGlowDesign = FIRST_GLOW_DESIGN): void {
  const cardIds = new Set<string>();
  for (const card of design.cards) {
    if (cardIds.has(card.id) || !card.id.startsWith("spark-")) throw new Error(`duplicate or unstable Spark card id: ${card.id}`);
    cardIds.add(card.id);
    for (const relationship of card.initialRelationships) if (!cardIds.has(relationship.sparkId) && !design.cards.some(candidate => candidate.id === relationship.sparkId)) throw new Error(`unknown Spark relationship: ${relationship.sparkId}`);
  }
  const dilemmaIds = new Set<string>();
  for (const dilemma of design.dilemmas) {
    if (dilemmaIds.has(dilemma.id) || dilemma.alternatives.length < 2) throw new Error(`invalid First Glow dilemma: ${dilemma.id}`);
    dilemmaIds.add(dilemma.id);
    const alternativeIds = new Set(dilemma.alternatives.map(alternative => alternative.id));
    if (alternativeIds.size !== dilemma.alternatives.length || dilemma.objectiveFacts.length === 0) throw new Error(`incomplete First Glow dilemma: ${dilemma.id}`);
    for (const view of dilemma.knowledgeBoundaries) if (!cardIds.has(view.sparkId)) throw new Error(`unknown dilemma Spark: ${view.sparkId}`);
  }
}

export function createFirstGlowSocialScenario(seed = 1): FirstGlowSocialScenario {
  validateFirstGlowDesign();
  const openingDilemmaId = FIRST_GLOW_DESIGN.dilemmas[Math.abs(Math.trunc(seed)) % FIRST_GLOW_DESIGN.dilemmas.length].id;
  return { seed, cards: structuredClone(FIRST_GLOW_DESIGN.cards), dilemmas: structuredClone(FIRST_GLOW_DESIGN.dilemmas), openingDilemmaId };
}
