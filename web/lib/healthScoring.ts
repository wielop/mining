import type { EconomicHealth, TechnicalHealth } from "@/lib/adminData";

type MetricDetail = { label: string; value: string; impact: number };

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const impactFromScore = (score: number) => Number(((score - 50) / 50).toFixed(2));

const stateFromScore = (score: number) =>
  score >= 80 ? "GREEN" : score >= 50 ? "YELLOW" : "RED";

const formatDays = (days: number | null) =>
  days == null || !Number.isFinite(days) ? "N/A" : `${days.toFixed(1)} days`;

const formatPct = (value: number | null) =>
  value == null || !Number.isFinite(value) ? "N/A" : `${value.toFixed(2)}%`;

const formatXnt = (value: number | null) =>
  value == null || !Number.isFinite(value) ? "N/A" : `${value.toFixed(2)} XNT`;

// Threshold helpers. Adjust here to tune the scoring system later.
export function scoreRunway(days: number | null) {
  if (days == null) return { score: 50, value: "N/A", label: "Rewards runway", impact: 0 };
  if (days >= 30) return { score: 100, value: formatDays(days), label: "Rewards runway", impact: 1 };
  if (days >= 15) return { score: 70, value: formatDays(days), label: "Rewards runway", impact: 0.4 };
  if (days >= 7) return { score: 40, value: formatDays(days), label: "Rewards runway", impact: -0.2 };
  return { score: 10, value: formatDays(days), label: "Rewards runway", impact: -0.8 };
}

export function scoreSplitStability(diffPct: number | null) {
  if (diffPct == null) {
    return { score: 50, value: "N/A", label: "30/70 split stability (7d)", impact: 0 };
  }
  if (diffPct <= 2) return { score: 100, value: formatPct(diffPct), label: "30/70 split stability (7d)", impact: 1 };
  if (diffPct <= 7) return { score: 70, value: formatPct(diffPct), label: "30/70 split stability (7d)", impact: 0.4 };
  if (diffPct <= 15) return { score: 40, value: formatPct(diffPct), label: "30/70 split stability (7d)", impact: -0.2 };
  return { score: 10, value: formatPct(diffPct), label: "30/70 split stability (7d)", impact: -0.8 };
}

export function scoreConcentration(maxSharePct: number | null) {
  if (maxSharePct == null) {
    return { score: 50, value: "N/A", label: "Concentration risk", impact: 0 };
  }
  if (maxSharePct < 25) return { score: 100, value: formatPct(maxSharePct), label: "Concentration risk", impact: 1 };
  if (maxSharePct < 40) return { score: 60, value: formatPct(maxSharePct), label: "Concentration risk", impact: 0.2 };
  return { score: 20, value: formatPct(maxSharePct), label: "Concentration risk", impact: -0.6 };
}

export function scoreTreasuryTrend(netXnt: number | null, ratio: number | null) {
  if (netXnt == null) {
    return { score: 50, value: "N/A", label: "Treasury trend (30d)", impact: 0 };
  }
  if (ratio != null && ratio >= 0.2) {
    return { score: 100, value: formatXnt(netXnt), label: "Treasury trend (30d)", impact: 1 };
  }
  if (ratio != null && ratio > 0) {
    return { score: 70, value: formatXnt(netXnt), label: "Treasury trend (30d)", impact: 0.4 };
  }
  if (netXnt === 0) {
    return { score: 50, value: formatXnt(netXnt), label: "Treasury trend (30d)", impact: 0 };
  }
  if (netXnt < 0) {
    return { score: 20, value: formatXnt(netXnt), label: "Treasury trend (30d)", impact: -0.6 };
  }
  return { score: 50, value: formatXnt(netXnt), label: "Treasury trend (30d)", impact: 0 };
}

export function scoreEconomicHealth(params: {
  runwayDays: number | null;
  splitDiffPct: number | null;
  concentrationPct: number | null;
  treasuryNet: number | null;
  treasuryRatio: number | null;
}): EconomicHealth {
  const runway = scoreRunway(params.runwayDays);
  const split = scoreSplitStability(params.splitDiffPct);
  const concentration = scoreConcentration(params.concentrationPct);
  const treasury = scoreTreasuryTrend(params.treasuryNet, params.treasuryRatio);

  const score =
    0.3 * runway.score +
    0.3 * split.score +
    0.2 * concentration.score +
    0.2 * treasury.score;
  const finalScore = clamp(Number(score.toFixed(1)));
  const state = stateFromScore(finalScore);
  const summary =
    state === "GREEN"
      ? "Healthy runway and balanced flows."
      : state === "YELLOW"
        ? "Some pressure points; monitor runway and concentration."
        : "High risk signals; review runway, concentration and flows.";

  return {
    score: finalScore,
    state,
    summary,
    details: [runway, split, concentration, treasury].map((detail) => ({
      label: detail.label,
      value: detail.value,
      impact: impactFromScore(detail.score),
    })),
  };
}

export function scoreRpcSuccess(rate: number | null): MetricDetail {
  if (rate == null) return { label: "RPC success (15m)", value: "N/A", impact: 0 };
  const score = rate >= 99 ? 100 : rate >= 95 ? 70 : rate >= 85 ? 40 : 10;
  return { label: "RPC success (15m)", value: `${rate.toFixed(1)}%`, impact: impactFromScore(score) };
}

export function scoreTxSuccess(rate: number | null): MetricDetail {
  if (rate == null) return { label: "Tx success (15m)", value: "N/A", impact: 0 };
  const score = rate >= 98 ? 100 : rate >= 95 ? 70 : rate >= 90 ? 50 : 20;
  return { label: "Tx success (15m)", value: `${rate.toFixed(1)}%`, impact: impactFromScore(score) };
}

export function scoreLatency(medianMs: number | null): MetricDetail {
  if (medianMs == null) return { label: "Median latency", value: "N/A", impact: 0 };
  const score = medianMs < 500 ? 100 : medianMs < 1200 ? 70 : medianMs < 2500 ? 40 : 15;
  return { label: "Median latency", value: `${Math.round(medianMs)} ms`, impact: impactFromScore(score) };
}

export function scoreAppErrors(count: number | null): MetricDetail {
  if (count == null) return { label: "App errors (10m)", value: "N/A", impact: 0 };
  const score = count <= 1 ? 100 : count <= 5 ? 70 : count <= 15 ? 40 : 10;
  return { label: "App errors (10m)", value: `${count}`, impact: impactFromScore(score) };
}

export function scoreTechnicalHealth(params: {
  rpcSuccessRate: number | null;
  txSuccessRate: number | null;
  txLatencyMedianMs: number | null;
  appErrors: number | null;
}): TechnicalHealth {
  const rpc = scoreRpcSuccess(params.rpcSuccessRate);
  const tx = scoreTxSuccess(params.txSuccessRate);
  const latency = scoreLatency(params.txLatencyMedianMs);
  const errors = scoreAppErrors(params.appErrors);

  const rpcScore = params.rpcSuccessRate == null ? 50 : rpc.impact * 50 + 50;
  const txScore = params.txSuccessRate == null ? 50 : tx.impact * 50 + 50;
  const latencyScore = params.txLatencyMedianMs == null ? 50 : latency.impact * 50 + 50;
  const errorsScore = params.appErrors == null ? 50 : errors.impact * 50 + 50;

  const score =
    0.35 * rpcScore + 0.3 * txScore + 0.2 * latencyScore + 0.15 * errorsScore;
  const finalScore = clamp(Number(score.toFixed(1)));
  const state = stateFromScore(finalScore);
  const summary =
    state === "GREEN"
      ? "RPC and transaction systems are stable."
      : state === "YELLOW"
        ? "Some instability detected; monitor RPC and tx success."
        : "Critical reliability issues detected.";

  return {
    score: finalScore,
    state,
    summary,
    details: [rpc, tx, latency, errors],
  };
}
