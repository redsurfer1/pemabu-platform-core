> **LEGAL REVIEW REQUIRED** — Brief **3** in `FLOMISMA_PLATFORM/docs/legal-review-briefs.md` (canonical).  
> Do not publish externally until counsel clears and records response under **Counsel Response**.

# Model Card — Pemabu Platform Access Engine v1.2

**Version:** 1.2  
**Last Updated:** 2026-04-02  
**Classification:** Platform access & agent-entity capability — **not** natural-person consumer credit  
**Sync:** Keep aligned with `FLOMISMA_PLATFORM/docs/compliance/Model-Card-V1.md`.

---

## LEGAL_REVIEW — Counsel confirmation required

1. **Non-monetary framing:** “Platform access allocation” and “access tier limit” language means **platform usage caps and workflow entitlements** (e.g. concurrent tasks, automation depth), **not** dollars the platform extends, holds, or repays. Counsel should confirm this matches all **external-facing** copy and contracts.

2. **Platform access allocation:** Operational rewards, reputation, and access tier signals are **not** described as “money owed by the platform” absent a separate compliant compensation program.

3. **ECOA / Regulation B:** Reason codes describe **operator / agent-level platform access tier** decisions from operational data. **This model card describes access tier decisions only, not natural-person consumer credit.** Counsel should confirm this distinction is documented and maintained in all external-facing materials.

---

## 1. Model Details

| Field | Value |
|-------|--------|
| **Name** | Pemabu Platform Access Engine v1.2 |
| **Type** | Outcome-Based Verification (OBV) scoring for **platform entitlements** |
| **Purpose** | Determining **non-monetary access tier limits** (usage caps, eligibility flags) for AI agents and operator-led entities from verified operational outcomes. **Does not** extend cash credit or hold user funds. |
| **Owner** | Pemabu Platform — Regulatory Compliance & Data Science |
| **Model Version** | 1.2 |

---

## 2. Intended Use

This engine determines platform feature access and operational limits for AI agents and operator entities. It does not extend monetary credit, hold monetary value, or make consumer credit decisions as defined under the Equal Credit Opportunity Act (ECOA) or Regulation B. All outputs are platform access entitlements only, with no monetary value attached.

- **Primary use:** Assessing **operational reliability and verified activity** to set **access tier limits** — e.g. how many sub-tasks, which automation features, and what **workflow velocity** is permitted. **No** allocation of bank-money **platform access allocations** as spendable cash or custodial wallet top-ups by Pemabu.
- **In scope:** Operator / agent **access tier limits**, workflow throttles, and **reporting-only** eligibility signals tied to OBV.
- **Out of scope:** **Individual consumer (retail) lending** and **any** decision that constitutes a **consumer credit** decision under ECOA/Reg B. The engine is **not** used to approve or deny **personal** credit products.

---

## 3. Factors & Weights

| Factor | Description | Role in access tier decision |
|--------|-------------|------------------------------|
| **T30 verified activity** | Sum of **verified operational throughput** attributed to the agent/entity over the trailing 30 days (task- or reporting-backed signals). | Primary driver of **higher access tier limit**; not “income” for lending. |
| **Reserve / solvency signal (reporting)** | Ratio of **reported** reserve or collateral markers to exposure **in the product model** for **risk of platform harm**, not investment management. | Caps **automation** when ratio falls below thresholds. |
| **Historical slash rate** | Proportion of verification tasks ending in `SLASHED` or failed outcomes. | Reduces **trust / entitlement** for unreliable execution. |

**Weights:** Proprietary mapping to discrete **access tiers**. Inputs are **operational** only.

### Fair Lending — No Protected Class Data

**No protected class data (Race, Gender, Age) is used as an input or proxy.**

---

## 4. Quantitative Analysis

Bias and fairness validation via **Model Stress Test** (`tests/risk/credit-model-bias.test.ts` on Pemabu where present). Method and variance thresholds are unchanged technically; interpretation is **platform access**, not **allocate access** decisions for consumer lending.

---

## 5. Explainability — Reason Codes

Every access tier decision is accompanied by a **Reason Code** for support and audit. These explain **why an operator / agent’s access tier limit changed**, not why a **consumer credit** product was denied.

| Code | Meaning (access context) |
|------|---------------------------|
| **INCOME_THRESHOLD_MET** | Verified **activity / throughput** threshold met for requested **tier** (legacy code name; **not** personal income underwriting). |
| **INCOME_BELOW_THRESHOLD** | Verified **activity** below minimum for requested **tier**. |
| **REVENUE_VOLATILITY_HIGH** | Activity pattern too volatile to support requested **automation depth**. |
| **INSUFFICIENT_COLLATERAL** | **Reporting** reserve signal below policy for requested exposure **in the product model**. |
| **SLASH_RATE_ELEVATED** | Failure rate too high for requested **trust level**. |
| **MANUAL_REVIEW_REQUIRED** | Human review for edge cases. |

---

## 6. Governance & Audit

- Model changes are versioned; this card is updated accordingly.
- Linked from Trust Center for SOC2 and policy review.

---

*Maintained by Pemabu / Flomisma compliance stakeholders. Not a legal opinion.*
