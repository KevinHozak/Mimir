import {readFileSync} from "node:fs";
import {bundleHash, decodeWorldBundle, type FirstGlowWorldBundle} from "@mimir/world-data";
import {createFirstGlowState, initializeBoundedSharingAdmission, initializeGeometricShardRoutes, initializePostProbeContinuation, initializeRecoveryAdmission, initializePatternPreparation, initializeActivityCompletion, validateFirstGlowState, type FirstGlowState} from "./index.js";

// Small declared unit world; no authored or generated production bundle is edited.
const raw = JSON.parse(readFileSync(new URL("../../../assets/world/fixtures/first-glow-schema-3.json", import.meta.url), "utf8"));
raw.objectDefinitions["wild-cache"] = {...raw.objectDefinitions["charge-pool"], id:"wild-cache", label:"Wild Cache", capabilities:["wild-cache"]};
raw.objectDefinitions["pattern-shard"] = {...raw.objectDefinitions["charge-pool"], id:"pattern-shard", label:"Pattern Shard", capabilities:["pattern-shard"]};
raw.objects.push({id:"cache-a",definitionId:"wild-cache",origin:{x:4,y:0},orientation:0},{id:"shard-a",definitionId:"pattern-shard",origin:{x:0,y:2},orientation:0});
raw.objectDefinitions["pattern-shard"].slots=[{id:"shape",offset:{x:0,y:-1},capacity:1}];
raw.bundle.contentHash=bundleHash(raw);
const bundle=decodeWorldBundle(raw) as FirstGlowWorldBundle;
export function preparationFixture(charge=0, readiness=60, deficit=10, recoveryAdmission=false, postProbeContinuation=false, geometricShardRoutes=false, boundedSharingAdmission=false): FirstGlowState {
 const state=createFirstGlowState(bundle,"first-glow-region","Preparation unit world",2); initializePatternPreparation(state);initializeActivityCompletion(state); if(recoveryAdmission) initializeRecoveryAdmission(state); if(postProbeContinuation) initializePostProbeContinuation(state);
 if(geometricShardRoutes) initializeGeometricShardRoutes(state);
 if(boundedSharingAdmission) initializeBoundedSharingAdmission(state);
 state.pulse=3; const [creator,reader]=state.settlements[0].sparks;
 creator.position={x:2,y:2}; creator.status="waiting"; creator.intention={version:"rule-executed-v1",id:"unit-idle",sparkId:creator.id,activity:"idle",createdPulse:1,source:"rules",contextHash:"unit",evidenceEventIds:[],causalEventIds:[],status:"active",summary:"unit fixture"};
 reader.position={x:0,y:1};reader.carriedCharge=charge;reader.readiness=readiness;reader.chargeDeficit=deficit;
 reader.wildCacheChoice={pulse:1,alternative:"conserve",cacheObjectId:"cache-a",decisionEventId:"prior-choice",outcomeEventId:"prior-conserve",nextActivity:"seek-charge"};
 reader.knownEvidenceEventIds=["prior-choice","prior-conserve","encounter"];
 creator.knownEvidenceEventIds=["created","survey","shape"];
 state.routePatterns!.patterns=[{id:"unit-pattern",public:true,creatorId:creator.id,settlementId:"first-glow-region",createdPulse:2,creationEventId:"created",sourceEventIds:["survey","shape"],at:{x:0,y:1},targetObjectId:"cache-a",navigationRevision:0,encounters:[{sparkId:reader.id,pulse:3,eventId:"encounter"}]}];
 validateFirstGlowState(state);return state;
}
