import {readFileSync} from "node:fs";
import {createWorldFromBundle, type FirstGlowState} from "./index.js";
const raw=JSON.parse(readFileSync(new URL("../../../assets/world/fixtures/first-glow-schema-3.json",import.meta.url),"utf8"));
/** Declared unit pause one cell from shelter, without modifying authored bundles. */
export function sharingContinuationFixture(enabled=true):FirstGlowState {
 const state=createWorldFromBundle(raw,2,"sharing-unit",2,enabled?{sharingRouteContinuation:true}:{}).firstGlowState;
 const [donor,reader]=state.settlements[0].sparks;
 donor.position={x:2,y:2};donor.status="choosing";donor.intendedActivity="share-charge";donor.carriedCharge=2;
 reader.position={x:2,y:2};reader.status="traveling";reader.intendedActivity="seek-shelter";reader.carriedCharge=0;reader.readiness=40;
 reader.destinationObjectId="niche-a";reader.destinationSlotId="rest";reader.remainingRoute=[{x:3,y:2}];
 state.settlements[0].runtime.reservations=[{actorId:reader.id,objectId:"niche-a",slotId:"rest"}];return state;
}
