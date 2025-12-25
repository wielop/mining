type RpcSample = { ts: number; ok: boolean; latencyMs: number };
type TxSample = { ts: number; ok: boolean; latencyMs: number; action: string };
type ErrorSample = { ts: number; message?: string };

const rpcSamples: RpcSample[] = [];
const txSamples: TxSample[] = [];
const errorSamples: ErrorSample[] = [];

const prune = <T extends { ts: number }>(list: T[], windowMs: number) => {
  const cutoff = Date.now() - windowMs;
  while (list.length > 0 && list[0].ts < cutoff) {
    list.shift();
  }
};

const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

export const recordRpcSample = (sample: RpcSample, windowMs: number) => {
  rpcSamples.push(sample);
  prune(rpcSamples, windowMs);
};

export const recordTxSample = (sample: TxSample, windowMs: number) => {
  txSamples.push(sample);
  prune(txSamples, windowMs);
};

export const recordAppError = (sample: ErrorSample, windowMs: number) => {
  errorSamples.push(sample);
  prune(errorSamples, windowMs);
};

export const getRpcStats = (windowMs: number) => {
  prune(rpcSamples, windowMs);
  if (rpcSamples.length === 0) return { successRate: null, medianLatency: null };
  const okCount = rpcSamples.filter((s) => s.ok).length;
  const successRate = (okCount / rpcSamples.length) * 100;
  const medianLatency = median(rpcSamples.map((s) => s.latencyMs));
  return { successRate, medianLatency };
};

export const getTxStats = (windowMs: number) => {
  prune(txSamples, windowMs);
  if (txSamples.length === 0) return { successRate: null, medianLatency: null };
  const okCount = txSamples.filter((s) => s.ok).length;
  const successRate = (okCount / txSamples.length) * 100;
  const medianLatency = median(txSamples.map((s) => s.latencyMs));
  return { successRate, medianLatency };
};

export const getErrorCount = (windowMs: number) => {
  prune(errorSamples, windowMs);
  return errorSamples.length;
};
