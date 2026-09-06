import type { Beliefs, Tradition } from "./index.js";

export interface CharacterCard {
  id: string;
  name: string;
  tradition: Tradition;
  disposition: string;
  strength: string;
  tension: string;
  beliefSignals: Beliefs;
}

export interface DilemmaChoice {
  id: string;
  label: string;
  tradeoff: string;
}

export interface DilemmaCard {
  id: string;
  triggerTick: number;
  title: string;
  prompt: string;
  competingValues: string[];
  choices: DilemmaChoice[];
}

export const CHARACTER_CARDS: CharacterCard[] = [
  { id: "mara", name: "Mara", tradition: "Hearthkeepers", disposition: "Protective and quick to notice hunger", strength: "Turns shared concern into practical help", tension: "May spend the common store before consent is clear", beliefSignals: { cooperation: 78, selfReliance: 42, reflection: 64 } },
  { id: "tomas", name: "Tomas", tradition: "Hearthkeepers", disposition: "Patient keeper of routines and promises", strength: "Remembers who has contributed and who is at risk", tension: "Can mistake precedent for justice", beliefSignals: { cooperation: 70, selfReliance: 50, reflection: 72 } },
  { id: "bram", name: "Bram", tradition: "Freehands", disposition: "Energetic maker who trusts direct effort", strength: "Finds useful work when plans fail", tension: "Resists obligations that were not freely chosen", beliefSignals: { cooperation: 45, selfReliance: 84, reflection: 48 } },
  { id: "nessa", name: "Nessa", tradition: "Freehands", disposition: "Independent and alert to unequal burdens", strength: "Spots when a rule rewards idleness or power", tension: "May withdraw instead of repairing trust", beliefSignals: { cooperation: 52, selfReliance: 76, reflection: 61 } },
  { id: "sela", name: "Sela", tradition: "Seekers", disposition: "Curious observer of motives and consequences", strength: "Asks what a decision teaches the village", tension: "Can delay action while seeking a perfect account", beliefSignals: { cooperation: 58, selfReliance: 55, reflection: 88 } },
  { id: "kato", name: "Kato", tradition: "Seekers", disposition: "Skeptical listener who tests inherited stories", strength: "Makes hidden assumptions discussable", tension: "May turn a needed promise into an endless debate", beliefSignals: { cooperation: 48, selfReliance: 62, reflection: 82 } }
];

export const FIRST_WINTER_DILEMMAS: DilemmaCard[] = [
  {
    id: "hungry-neighbor-loan",
    triggerTick: 12,
    title: "The Hungry Neighbor",
    prompt: "A villager asks for food from the shared store but cannot promise when they can repay it.",
    competingValues: ["care", "reciprocity", "trust"],
    choices: [
      { id: "grant", label: "Grant the food", tradeoff: "Immediate care strengthens belonging but lowers the reserve without a repayment promise." },
      { id: "loan", label: "Offer a measured loan", tradeoff: "Reciprocity protects the store but makes help conditional." },
      { id: "refuse", label: "Refuse until work is offered", tradeoff: "The reserve is protected while hunger and grievance rise." }
    ]
  },
  {
    id: "common-repair",
    triggerTick: 24,
    title: "The Common Repair",
    prompt: "Repairing the bridge would help everyone, but the same hours could produce private food before winter.",
    competingValues: ["common good", "self-direction", "urgency"],
    choices: [
      { id: "repair", label: "Repair together", tradeoff: "The village gains access and resilience while private harvest is delayed." },
      { id: "private-work", label: "Work privately", tradeoff: "Immediate individual output rises while the bridge remains a shared risk." },
      { id: "split", label: "Split the hours", tradeoff: "Both needs move forward, but neither receives the full effort." }
    ]
  },
  {
    id: "defensible-promise-breach",
    triggerTick: 36,
    title: "The Broken Promise",
    prompt: "A villager breaks a promise because an unexpected danger makes the original commitment harmful.",
    competingValues: ["reliability", "mercy", "changed circumstances"],
    choices: [
      { id: "repair-publicly", label: "Explain and repair", tradeoff: "Trust can survive an honest breach, but the cost becomes visible." },
      { id: "enforce", label: "Enforce the promise", tradeoff: "Rules stay predictable while the changed danger is treated as an excuse." },
      { id: "release", label: "Release the promise", tradeoff: "Compassion wins now, but future commitments may feel less binding." }
    ]
  }
];
