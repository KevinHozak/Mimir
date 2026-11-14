import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { advanceWorld, summarizeFirstGlowGoals } from '../packages/engine/dist/index.js';
import { startGoalFixture } from '../packages/engine/dist/first-glow-goals-fixture.js';

// Deliberately offline. This controller is not the paid AI pilot or a deployment launcher.
globalThis.fetch = async () => { throw new Error('Goal-loop review forbids network/provider access'); };
const directory = fs.mkdtempSync(path.resolve('.tmp/goal-loop-review-'));
let world = await startGoalFixture();
const checkpoints = [world], events = [], ledger = [];
for (let i = 0; i < 128 && world.firstGlowState.goalLoops.goals.some(g => g.status === 'active'); i++) {
  const result = advanceWorld(world);
  world = result.state;
  checkpoints.push(world); events.push(...result.events);
  ledger.push({ pulse: world.pulse, entries: world.firstGlowState.ledger });
}
const summary = {
  date: '2026-11-13', scenario: 'Controlled two-contact rendezvous fixture',
  worldId: world.worldId, seed: world.seed, bundleHash: world.firstGlowState.settlements[0].bundle.bundle.contentHash,
  firstPulse: checkpoints[0].pulse, finalPulse: world.pulse,
  provider: 'deterministic-goal-fixture', simulatedProviderAttempts: world.firstGlowState.goalLoops.providerAttempts,
  realProviderCalls: 0, hosted: false, defaultWorldChanged: false,
  goals: summarizeFirstGlowGoals(world.firstGlowState),
  encounters: events.filter(e => e.structuredKind === 'meet'),
  conversations: world.firstGlowState.history.conversations,
  finalStateSha256: createHash('sha256').update(JSON.stringify(world)).digest('hex'),
  limits: [
    'Controlled high-resource opening and one-pulse reflection cadence; not ordinary-world emergence.',
    'Synthetic bundle supplies a second same-cell contact. Existing active maps have one light-mark contact.',
    'Provider source ai identifies the fake adapter; no real-model benefit or cost finding.',
    'Online server admission, expanded authored regions and human acceptance remain unfinished.'
  ]
};
for (const [name,value] of Object.entries({ summary, checkpoints, events, ledger })) fs.writeFileSync(path.join(directory,`${name}.json`),JSON.stringify(value,null,2));
fs.writeFileSync(path.join(directory,'README.md'),`# Controlled Spark goal loop\n\n${summary.goals.filter(g=>g.status==='completed').length}/${summary.goals.length} goals completed by pulse ${world.pulse}; ${summary.encounters.length} physical encounter; ${summary.simulatedProviderAttempts} fake-provider selections, zero real calls.\n\nSee summary.json for exact pulse/event evidence and limits. This is an isolated local fixture, not a running online world.\n`);
console.log(JSON.stringify({ directory, goals: summary.goals, encounters: summary.encounters.length, realProviderCalls: 0 },null,2));
if (summary.goals.some(g => g.status !== 'completed')) process.exitCode=1;
