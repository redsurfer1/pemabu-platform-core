import type { PortfolioAssumptionsValidated } from './schema';

/** Workbook defaults (rows 129–138 style) — Scenario Lab baseline. */
export const DEFAULT_MFO_ASSUMPTIONS: PortfolioAssumptionsValidated = {
  returnHorizons: {
    threeMo: 0.4,
    sixMo: 0.25,
    oneYr: 0.2,
    threeYr: 0.1,
    fiveYr: 0.05,
  },
  factors: {
    expense: 0.3,
    pctWeight: 0.3,
    divApy: 0.15,
    volatility: 0.25,
  },
};
