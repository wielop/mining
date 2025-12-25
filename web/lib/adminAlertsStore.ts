// In-memory alert resolution store.
// TODO: Replace with a persistent DB (Postgres/Redis) so resolves survive restarts.
const resolvedAlerts = new Map<string, { resolvedAt: string }>();

export const isAlertResolved = (id: string) => resolvedAlerts.has(id);

export const markAlertResolved = (id: string) => {
  resolvedAlerts.set(id, { resolvedAt: new Date().toISOString() });
};
