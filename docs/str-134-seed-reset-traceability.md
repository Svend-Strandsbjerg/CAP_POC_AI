# STR-134 Seed and Reset Traceability

This document traces the local CAP SQLite seed/reset data to the actual EH3 STR-126 MVP seed/reset implementation.

## EH3 Source

- SAP system: EH3
- Client: 300
- Package: `$TMP`
- Implementation baseline: completed STR-126 local MVP implementation
- Data classification: synthetic POC-only data

## Objects Inspected

- `ZEH3_SVC_SEED_RESET`
- `ZCL_EH3SVC_SEED`
- `ZCL_EH3SVC_RESET`
- `ZCL_EH3SVC_CONST`
- `ZEH3_COMPANY`
- `ZEH3_ASSET`
- `ZEH3_SVCTYPE`
- `ZEH3_RESPRULE`
- `ZEH3_ORDER`
- `ZEH3_ORD_HIST`
- `ZEH3_ORD_ERR`

Direct table-content preview was blocked by ARC-1 server safety configuration (`allowDataPreview=false`). The seed/reset source objects were inspected as the authoritative deterministic dataset definition.

## Dataset Version

- EH3 dataset version: `V1.0`
- CAP dataset version: `V1.0`

## Reset Behavior

EH3 `ZCL_EH3SVC_RESET=>reset_all` deletes transactional records, then runs `ZCL_EH3SVC_SEED=>seed`.

CAP local reset command:

```powershell
npm run reset:local
```

The CAP reset removes only the local `db.sqlite` development database, recreates the schema with `cds deploy`, loads deterministic CSV seed data, and verifies row counts.

## Row Counts

| Entity | EH3 reset-all baseline | CAP expected | CAP reset #1 | CAP reset #2 |
| ------ | ---------------------- | ------------ | ------------ | ------------ |
| SyntheticCompanies | 4 | 4 | 4 | 4 |
| SyntheticAssets | 7 | 7 | 7 | 7 |
| ServiceTypes | 4 | 4 | 4 | 4 |
| ResponsibilityRules | 7 | 7 | 7 | 7 |
| ServiceOrders | 0 | 0 | 0 | 0 |
| StatusHistory | 0 | 0 | 0 | 0 |
| ErrorRecords | 0 | 0 | 0 | 0 |

## EH3-to-CAP Comparison

| EH3 source | CAP target | Comparison |
| ---------- | ---------- | ---------- |
| `ZEH3_COMPANY` | `SyntheticCompanies` | Seeds four synthetic companies covering requester/executor eligibility and restricted/non-requesting scenarios. |
| `ZEH3_ASSET` | `SyntheticAssets` | Seeds seven synthetic assets covering local, cross-company, blocked, limited, inactive, inactive-blocked, and missing-region scenarios. |
| `ZEH3_SVCTYPE` | `ServiceTypes` | Seeds inspection, repair, emergency repair, and an inactive service type for validation scenario coverage. |
| `ZEH3_RESPRULE` | `ResponsibilityRules` | Seeds seven rules covering local execution, cross-company execution, duplicate responsibility, and inactive rule scenarios. |
| `ZEH3_ORDER` | `ServiceOrders` | EH3 reset-all leaves transactional orders empty; CAP reset does the same. |
| `ZEH3_ORD_HIST` | `StatusHistory` | EH3 reset-all leaves status history empty; CAP reset does the same. |
| `ZEH3_ORD_ERR` | `ErrorRecords` | EH3 reset-all leaves error evidence empty; CAP reset does the same. |

## Documented Differences

- EH3 also seeds `ZEH3_CMPREL` with three company relationship rows. That table is outside the approved STR-133 CAP persistence model and is not reproduced in STR-134.
- EH3 also resets allocation and posting tables. Allocation and posting are explicitly out of scope and are not reproduced in STR-134.
- EH3 includes inactive service type `INAC` for validation scenario coverage. The CAP seed preserves this inactive reference row without changing the STR-133 persistence model.
- Direct EH3 table-content inspection was unavailable because ARC-1 data preview is disabled; source-level seed/reset inspection was used for the authoritative deterministic values.

## Scenario Purpose

- Companies cover requester/executor eligibility, restricted execution, and no-request scenarios.
- Assets cover valid local service, cross-company service, blocked asset, limited service eligibility, inactive asset, inactive blocked asset, and missing-region responsibility scenarios.
- Service types cover active inspection, repair, emergency repair, and inactive service-type validation scenarios.
- Responsibility rules cover active local execution, active cross-company execution, duplicate matches, and inactive rule exclusion.
- Orders, status history, and errors remain empty after reset so later runtime batches can create deterministic transactional evidence.

## Scope Confirmation

All data is synthetic and POC-only.

No services, handlers, validation behavior, responsibility determination, lifecycle transition behavior, runtime error creation, UI, authentication, authorization, BTP configuration, HANA/HDI artifacts, CI/CD, external integrations, production reset tooling, ADRs, or later-batch behavior were introduced.
