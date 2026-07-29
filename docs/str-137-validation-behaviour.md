# STR-137 Validation Behaviour

## EH3 Source

- SAP system: EH3
- Client: 300
- Package: `$TMP`
- Implementation baseline: completed STR-126 local MVP implementation

EH3 remained the authoritative technical baseline. The CAP implementation preserves validation meaning while keeping CAP-native structure.

## EH3 Objects Inspected

DDIC and reference tables:

- `ZEH3_ORDER`
- `ZEH3_ORD_ERR`
- `ZEH3_ORD_HIST`
- `ZEH3_COMPANY`
- `ZEH3_ASSET`
- `ZEH3_SVCTYPE`
- `ZEH3_RESPRULE`

Classes:

- `ZCL_EH3SVC_VALIDATOR`
- `ZCL_EH3SVC_ORDER_REPO`
- `ZCL_EH3SVC_REFDATA_REPO`
- `ZCL_EH3SVC_ERROR_LOG`
- `ZCL_EH3SVC_CONST`

Message handling:

- `ZCL_EH3SVC_VALIDATOR` uses message ID `ZEH3_SVC_MSG`, validation stage `VALID`, and severity `E`.
- No standalone message class object was found through ARC-1 lookup; the validator carries the message numbers and texts directly.

## EH3 Validation Rules Found

EH3 `ZCL_EH3SVC_VALIDATOR->VALIDATE_ORDER` evaluates rules in this deterministic order:

| Message | Rule |
| ------- | ---- |
| `027` | Order ID is missing. |
| `026` | Order was not found. |
| `028` | Asset ID is missing. |
| `020` | Requesting company is missing. |
| `029` | Service type is missing. |
| `030` | Priority is missing. |
| `031` | Requested date is missing. |
| `021` | Asset is unknown. |
| `032` | Asset is inactive. |
| `022` | Asset is blocked. |
| `033` | Requesting company is unknown. |
| `034` | Requesting company is not allowed to request service. |
| `035` | Service type is unknown. |
| `036` | Service type is inactive. |
| `023` | Service type is not allowed for the asset. |
| `024` | Priority is not one of `LOW`, `NORM`, or `EMER`. |
| `025` | Requested date is before the validation date. |

EH3 appends persisted error IDs in the same order errors are found.

## Implemented Rules

`src/validation/service-order-validation.ts` implements the EH3 validation rule order against the approved STR-133 CAP model:

- order ID missing or not found
- required order field checks where representable
- asset existence, active, and blocked checks
- requesting-company existence and request eligibility checks
- service-type existence and active checks
- service-type allowed-for-asset checks
- priority value check
- requested-date rule

The automated tests focus on rules supported by the approved deterministic STR-134 reference data:

- positive valid order using `C100`, `A100-LOCAL`, `INSP`, `NORM`
- negative order using `C400`, `A200-XCMP`, `INSP`, `NORM`, and a past requested date

## Unsupported or Excluded Scope

- Missing mandatory persisted fields are constrained by the approved CAP model and are not normal local seed scenarios.
- Responsibility determination is not called or implemented.
- Executing-company determination and mutation are not implemented.
- Lifecycle status mutation and status-history creation are not implemented.
- Allocation, posting, orchestration, handlers, actions, functions, CLI utilities, admin endpoints, and public write APIs are excluded.

## Component Responsibility

`ServiceOrderValidator` is an internal business component. It:

- reads the persisted service order and reference data
- returns a validation result with deterministic issue order
- persists negative validation evidence through STR-136 `persistPreparedErrorRecord`
- keeps runtime validation results separate from persistent evidence

It does not expose a public API surface through CAP services and does not register handlers.

## ErrorRecord Evidence

Negative validation creates `ErrorRecords` with:

- `processingStage`: `VALID`
- `messageId`: `ZEH3_SVC_MSG`
- `severity`: `E`
- deterministic error IDs based on current persisted maximum error ID
- nullable order semantics preserved from STR-133
- readback through STR-135 `ServiceOrderService.ErrorRecords`

## Deterministic Ordering

The validator evaluates rules in EH3 order and persists evidence immediately as each issue is found. The negative smoke test verifies message ordering:

```text
034, 023, 025
```

and matching deterministic error IDs:

```text
0000000001, 0000000002, 0000000003
```

## Validation Results Approach

Validation returns:

- `orderId`
- `valid`
- ordered `issues`

Each issue contains:

- `errorId`
- `messageId`
- `messageNumber`
- `messageText`
- `severity`

This is internal application evidence only and is not a public write API.

## Validation Evidence

Required validation results:

```powershell
npm install
# passed; up to date; 0 vulnerabilities

npm run build
# passed; tsc --noEmit

npm test
# passed; 5 tests, 0 failures

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

- positive validation returns `valid: true`
- positive validation creates no `ErrorRecords`
- negative validation returns deterministic ordered issues
- negative validation persists expected `ErrorRecords`
- persisted `ErrorRecords` are readable through STR-135 service projection
- `ServiceOrders.currentLifecycleStatus` remains unchanged
- `StatusHistory` remains unchanged
- `ServiceOrders.executingCompany` remains unchanged
- local reset restores deterministic baseline row counts

## Differences From EH3

- EH3 exposes validation through an ABAP class with repository dependencies. CAP implements one internal TypeScript validation component and does not copy the ABAP class or repository structure.
- EH3 uses `sy-datum`, `sy-uname`, and timestamp defaults. CAP tests inject deterministic `now` and `createdBy` values for repeatable evidence.
- EH3 can technically evaluate initial field values in ABAP structures. CAP persisted rows normally respect the approved CDS model constraints, so tests avoid invalid persisted shapes that are not part of STR-134 deterministic data.

## Files Changed

- `src/validation/service-order-validation.ts`
- `test/validation-behaviour.test.ts`
- `docs/str-137-validation-behaviour.md`

## Scope Confirmation

No lifecycle transitions, lifecycle status mutation, status-history creation, responsibility determination, executing-company determination or mutation, allocation, posting, orchestration, handlers, actions, functions, public generic ErrorRecord API, CLI utilities, admin endpoints, UI, authentication, authorization, CI/CD, BTP deployment, HANA/HDI artifacts, external SAP runtime integration, logging framework, observability framework, production hardening, or STR-138-or-later work were introduced.
