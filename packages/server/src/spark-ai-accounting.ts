export const ORIGINAL_SPARK_ALLOCATION_ID = "original-spark-usd5-20261108";
export const ORIGINAL_SPARK_IDENTITY = "2026-11-08/khozak@gmail.com/mimir-realm/gemini-3.5-flash-lite/us";
export const RECORDED_COST_POLICY = "recorded-cost-v1";
export const COST_BUFFER_MULTIPLIER = 2;
export const ALLOCATION_CONTINGENCY_MICROUSD = 100_000;
export const REQUEST_HOLD_MICROUSD = 500_000;
export function allocationIdentity(id: string): string {
  return id === ORIGINAL_SPARK_ALLOCATION_ID ? ORIGINAL_SPARK_IDENTITY : `spark-online-v1/${id}/mimir-realm/gemini-3.5-flash-lite/us`;
}
export interface AccountingAttempt { status: string; reservation: number; usage_json: string | null; }
export function accountingTotals(rows: AccountingAttempt[], recorded: boolean) {
  let historicalReservedMicrousd = 0, estimatedTokenCostMicrousd = 0, unsettledMicrousd = 0;
  for (const row of rows) {
    if (!Number.isSafeInteger(row.reservation) || row.reservation < 0) throw Error("Invalid request hold");
    historicalReservedMicrousd += row.reservation;
    const usage = row.usage_json ? JSON.parse(row.usage_json) : undefined;
    const cost = usage?.estimatedTokenCostMicrousd;
    const known = (row.status === "completed" || row.status === "rejected") && Number.isSafeInteger(cost) && cost >= 0;
    if (known) estimatedTokenCostMicrousd += cost;
    else unsettledMicrousd += row.reservation;
  }
  const bufferedTokenCostMicrousd = estimatedTokenCostMicrousd * COST_BUFFER_MULTIPLIER;
  const accountedMicrousd = recorded ? bufferedTokenCostMicrousd + unsettledMicrousd + ALLOCATION_CONTINGENCY_MICROUSD : historicalReservedMicrousd;
  if (![historicalReservedMicrousd, estimatedTokenCostMicrousd, accountedMicrousd].every(Number.isSafeInteger)) throw Error("Invalid allocation total");
  return { historicalReservedMicrousd, estimatedTokenCostMicrousd, bufferedTokenCostMicrousd, unsettledMicrousd, contingencyMicrousd: recorded ? ALLOCATION_CONTINGENCY_MICROUSD : 0, accountedMicrousd };
}
