export interface FirstGlowCard { id: string; name: string; tendency: "care" | "independence" | "curiosity"; description: string; openingQuestion: string; }
export interface FirstGlowEventCard { id: string; title: string; prompt: string; observableOutcome: string; }
export interface FirstGlowDesign { cards: FirstGlowCard[]; events: FirstGlowEventCard[]; openingQuestion: string; boundary: string; }

export const FIRST_GLOW_DESIGN: FirstGlowDesign = {
  openingQuestion: "What keeps our lights on?",
  boundary: "Sparks know practical local routines, but not their purpose, the Originators, or any mature institution.",
  events: [
    { id: "quieting-pool", title: "A pool grows quiet", prompt: "A nearby charge pool gives less light than it did before.", observableOutcome: "The source charge falls and Sparks must notice the changing route." },
    { id: "unfamiliar-trace", title: "An unfamiliar trace", prompt: "A faint trace appears beyond a familiar circuit path.", observableOutcome: "A Spark can explore it and leave a light mark for another Spark to find." }
  ],
  cards: [
    { id: "glow-care", name: "A careful light", tendency: "care", description: "Notices when another Spark is dimming and offers help before being asked.", openingQuestion: "Who needs a little more time or charge?" },
    { id: "glow-independence", name: "A steady light", tendency: "independence", description: "Prefers to test a route or promise directly before relying on a shared account.", openingQuestion: "What can I learn by trying this myself?" },
    { id: "glow-curiosity", name: "A searching light", tendency: "curiosity", description: "Follows an unfamiliar trace and keeps questions open when a pattern does not fit.", openingQuestion: "What is this pattern asking us to notice?" }
  ]
};
