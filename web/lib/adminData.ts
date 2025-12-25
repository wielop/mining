// Data Center types for admin analytics and alerts.
// TODO: Back this with a real datastore for historical flows + resolved alerts.
export type ProtocolSnapshot = {
  timestamp: string;
  mining: {
    networkHp: number;
    maxHp: number;
    dailyEmissionMind: number;
    totalMindMined: number;
  };
  staking: {
    totalStakedMind: number;
    rewardPoolXnt: number;
    epochEndsAt: string | null;
  };
  treasury: {
    totalXntIn: number;
    available: number;
    inStakingBucket: number;
    inLp: number;
    inInvestments: number;
    inReserve: number;
  };
};

export type FlowStats = {
  window: "24h" | "7d" | "30d";
  xntFromMining: number;
  xntToStakingRewards: number;
  xntToTreasury: number;
  xntUsedForBuyback: number;
  xntAddedToLp: number;
};

export type AlertLevel = "INFO" | "WARN" | "CRITICAL";

export type AlertEntry = {
  id: string;
  level: AlertLevel;
  createdAt: string;
  message: string;
  details?: string;
  resolved: boolean;
};
