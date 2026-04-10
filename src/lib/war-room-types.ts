/**
 * War Room data shape for Risk & Compliance dashboard (V4.1).
 * Entity-scoped; API requires X-Admin-Entity-Context. Prisma pooler-friendly.
 */
export type WarRoomData = {
  solvencyRatio: number;
  solvencyTarget: number;
  solvencyOk: boolean;
  totalCirculation: number;
  totalReserve: number;
  /** V4.1: Current USDC from ReserveLedgerEntry */
  totalReserves: number;
  /** V4.1: Sovereign cap (80% of USDC) */
  overnightCap: number;
  /** V4.1: Percentage of cap currently used (0–100) */
  capUtilization: number;
  isHalted: boolean;
  driftGuard: {
    status: string;
    ranAt: string;
    discrepancy: number;
  } | null;
  genesisAlpha: {
    userId: string;
    email: string | null;
    legalName: string | null;
    ilocUtilization: { slotNumber: number; status: string }[];
  }[];
  sanctionsPulse: { lastSuccess: string | null; green: boolean };
};
