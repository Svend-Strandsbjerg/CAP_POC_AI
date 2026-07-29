# STR-138 Responsibility Determination

## EH3 Source

- SAP system: EH3
- Client: 300
- Package: `$TMP`
- Implementation baseline: completed STR-126 local MVP implementation

EH3 remained the authoritative technical baseline. The CAP implementation preserves the responsibility-determination meaning without copying ABAP class or repository structure.

## EH3 Objects Inspected

DDIC and reference objects:

- `ZEH3_ORDER`
- `ZEH3_ORD_ERR`
- `ZEH3_ORD_HIST`
- `ZEH3_COMPANY`
- `ZEH3_ASSET`
- `ZEH3_SVCTYPE`
- `ZEH3_RESPRULE`

Classes:

- `ZCL_EH3SVC_RESP_DET`
- `ZCL_EH3SVC_ORDER_REPO`
- `ZCL_EH3SVC_REFDATA_REPO`
- `ZCL_EH3SVC_ERROR_LOG`
- `ZCL_EH3SVC_VALIDATOR`
- `ZCL_EH3SVC_CONST`

## EH3 Rule-Matching Semantics

EH3 `ZCL_EH3SVC_RESP_DET->DETERMINE_RESPONSIBILITY`:

- requires a non-empty order ID
- reads the service order
- requires order inputs: requesting company, asset, service type, and priority
- reads the asset and requires a non-empty asset region
- reads active responsibility rules using:
  - requesting company
  - asset region
  - service type
  - priority
  - active flag
- orders matching rules by `rule_id`
- returns a determined executing company only when exactly one active rule matches
- creates responsibility ErrorRecord evidence when zero or multiple rules match

EH3 `ZCL_EH3SVC_REFDATA_REPO->READ_ACTIVE_RESP_RULES` orders active rule matches by `rule_id`.

## Precondition Approach

The CAP component operates on an explicitly already-validated order.

STR-138 does not reimplement STR-137 validation and does not call validation internally. This matches EH3 responsibility determination, which assumes required order inputs and raises an application exception for missing preconditions instead of performing full validation.

## Executing-Company Decision

EH3 returns `ev_executing_company_id` and `ev_determined`.

EH3 does not call `ZCL_EH3SVC_ORDER_REPO->UPDATE_ORDER` inside responsibility determination, so STR-138 returns the executing company only and does not persist it to `ServiceOrders.executingCompany`.

## Implemented Component

`src/responsibility/responsibility-determination.ts` adds one internal `ResponsibilityDeterminer` component.

It:

- reads the persisted service order
- reads asset reference data for region
- reads active responsibility rules
- applies EH3 zero, one, and multiple match semantics
- returns the executing company for exactly one match
- persists `RESP` ErrorRecords through STR-136 infrastructure for zero or multiple matches

It does not expose handlers, actions, functions, or public write APIs.

## Positive and Negative Scenarios

Positive single match:

- order: `C100`, `A200-XCMP`, `REPR`, `NORM`
- asset region: `R2`
- active rule: `RULE000003`
- result: determined, executing company `C200`
- no ErrorRecord
- order remains unchanged

No match:

- order: `C100`, `A100-LOCAL`, `EMRG`, `NORM`
- only matching seeded rule is inactive
- result: not determined
- ErrorRecord `040`, `No executing company rule found`

Multiple match:

- order: `C100`, `A400-LIMIT`, `INSP`, `NORM`
- asset region: `R3`
- active matching rules: `RULE000005`, `RULE000006`
- result: not determined
- ErrorRecord `041`, `Multiple executing company rules found`

Missing precondition:

- missing service order
- throws an application error
- creates no responsibility ErrorRecord

## Deterministic Ordering

Active responsibility rules are read ordered by `ruleId`, matching EH3 `ORDER BY rule_id`.

For zero and multiple matches, a single deterministic responsibility ErrorRecord is persisted with the next deterministic error ID. Tests verify `0000000001` for isolated negative responsibility scenarios.

## ErrorRecord Evidence

Responsibility errors use:

- `processingStage`: `RESP`
- `messageId`: `ZEH3_SVC_MSG`
- `severity`: `E`
- `messageNumber`: `040` for no match
- `messageNumber`: `041` for multiple matches

Evidence is persisted through STR-136 `persistPreparedErrorRecord` and read through STR-135 `ServiceOrderService.ErrorRecords`.

## Validation Evidence

Required validation results:

```powershell
npm install
# passed; up to date; 0 vulnerabilities

npm run build
# passed; tsc --noEmit

npm test
# passed; 10 tests, 0 failures

npm run reset:local
# passed; reset restored deterministic baseline row counts:
# SyntheticCompanies 4
# SyntheticAssets 7
# ServiceTypes 4
# ResponsibilityRules 7
# ServiceOrders 0
# StatusHistory 0
# ErrorRecords 0

npx cds compile db/schema.cds
# passed

npx cds compile srv/service-order-service.cds
# passed

npx cds compile srv/service-order-service.cds --to edmx
# passed
```

## Test Evidence

Automated tests verify:

- successful single match returns executing company `C200`
- executing company is not persisted to the order
- no-match scenario persists `RESP` ErrorRecord `040`
- multiple-match scenario persists `RESP` ErrorRecord `041`
- missing precondition creates no responsibility ErrorRecord
- deterministic evidence IDs and rule ordering
- lifecycle status remains unchanged
- `StatusHistory` remains unchanged
- STR-137 validation remains unchanged for the positive scenario
- local reset restores deterministic baseline row counts

## Differences From EH3

- EH3 uses ABAP classes and repository dependencies. CAP uses one internal TypeScript component and does not copy ABAP class/repository structure.
- EH3 raises `ZCX_EH3SVC_APP` for missing preconditions. CAP raises normal internal `Error` instances because STR-138 does not introduce a public API or error contract.
- EH3 runtime supplies `sy-uname` and timestamps through the error log. CAP tests inject deterministic values for repeatable local evidence.
- ARC-1 data preview for EH3 table contents was blocked by safety configuration; seeded CAP rules from the approved STR-134 baseline were used for local test scenarios.

## Scope Confirmation

No duplicated validation logic, validation semantic changes, lifecycle transitions, lifecycle status mutation, `StatusHistory` creation, executing-company mutation, allocation, posting, orchestration, handlers, actions, functions, public write APIs, generic ErrorRecord APIs, CLI utilities, admin endpoints, UI, authentication, authorization, CI/CD, BTP deployment, HANA/HDI artifacts, external SAP runtime integration, production logging, production hardening, or STR-139-or-later work were introduced.
