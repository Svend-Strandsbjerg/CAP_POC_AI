# STR-139 Lifecycle Transitions and Status History

## Source Baseline

- SAP system: EH3
- Client: 300
- Package: `$TMP`
- Implementation baseline: completed STR-126 local MVP implementation
- Authoritative package read before implementation: `Implementation files/STR-139-implementation-package.md`

The actual EH3 implementation was treated as the authoritative technical baseline.

## EH3 Objects Inspected

DDIC:

- `ZEH3_ORDER`
- `ZEH3_ORD_HIST`
- `ZEH3_ORD_ERR`

Classes and runtime evidence:

- `ZCL_EH3SVC_STATUS`
- `ZCL_EH3SVC_ORDER_REPO`
- `ZCL_EH3SVC_ERROR_LOG`
- `ZCL_EH3SVC_CONST`
- `ZEH3_SVC_BATCH4_TEST`

## EH3 Lifecycle Findings

- Lifecycle ownership is in `ZCL_EH3SVC_STATUS`.
- Current status is persisted on `ZEH3_ORDER-STATUS`.
- Successful transitions update the order status and create one `ZEH3_ORD_HIST` row.
- StatusHistory rows are ordered by deterministic per-order `sequence_no`.
- `create_status_history` assigns `MAX(sequence_no) + 1` per order.
- Successful transition history uses stage `STATUS`.
- Initial CRT history uses old status blank, new status `CRT`, stage `CREATE`, and sequence `1`.
- Duplicate initial CRT history is rejected with a `STATUS` ErrorRecord.
- Invalid transition evidence uses message ID `ZEH3_SVC_MSG`, message number `100`, stage `STATUS`, and severity `E`.
- ErrorRecords remain separate from lifecycle status and StatusHistory.
- `ZCL_EH3SVC_STATUS` does not call validation or Responsibility Determination.
- `CRT -> RDY` has no lifecycle-owned runtime precondition beyond the order existing and the transition being allowed.
- Allocation, posting, workflow, orchestration, and event publishing are not part of the EH3 lifecycle component.

## Transition Matrix

The implemented matrix follows EH3:

| Current | Target | Result |
| ------- | ------ | ------ |
| `CRT` | `RDY` | Allowed |
| `CRT` | `CAN` | Allowed |
| `RDY` | `CMP` | Allowed |
| `RDY` | `CAN` | Allowed |
| `CMP` | Any other known status | Rejected |
| `CAN` | Any other known status | Rejected |
| Same current and target status | Rejected |
| Unknown target status | Rejected |

Difference from package expectation: the package expected `CRT -> CAN` to be discovered if present; EH3 explicitly allows `CRT -> CAN`, so CAP preserves that EH3 behavior.

## Component

`src/lifecycle/lifecycle-status.ts` adds one internal `LifecycleStatusManager`.

Responsibilities:

- record initial CRT history
- execute allowed lifecycle transitions
- reject invalid lifecycle transitions deterministically
- update current lifecycle status
- create StatusHistory evidence
- persist invalid-transition ErrorRecords through STR-136 infrastructure

It does not expose handlers, actions, functions, public write APIs, CLI utilities, or admin endpoints.

## Ready Preconditions

Confirmed Ready precondition:

- `CRT -> RDY` requires the order to exist and the transition to be allowed by lifecycle state.
- STR-139 does not reimplement or call STR-137 validation.
- STR-139 does not reimplement or call STR-138 Responsibility Determination.
- Executing-company semantics remain STR-138 return-only and are not persisted.

## StatusHistory Semantics

Successful transitions create one StatusHistory row:

- `order`: transitioned order
- `sequenceNo`: next per-order sequence number
- `oldStatus`: previous current lifecycle status
- `newStatus`: target lifecycle status
- `stage`: `STATUS`
- `changedAt`: transition timestamp
- `changedBy`: technical actor supplied to the internal component
- `reasonText`: caller-provided reason text
- `datasetVersion`: source order dataset version

Initial CRT history:

- `oldStatus`: blank string
- `newStatus`: `CRT`
- `stage`: `CREATE`
- duplicate initial CRT history is rejected and does not create a duplicate row

## ErrorRecord Semantics

Invalid lifecycle and duplicate-initial-history evidence uses:

- `processingStage`: `STATUS`
- `messageId`: `ZEH3_SVC_MSG`
- `messageNumber`: `100`
- `severity`: `E`
- deterministic next `errorId`

Invalid transitions do not update current lifecycle status and do not create StatusHistory.

## Atomicity

`executeTransition` updates `ServiceOrders.currentLifecycleStatus` and inserts the matching `StatusHistory` row inside one CAP database transaction via the existing database service transaction convention.

Rollback proof uses real SQLite trigger failures:

- forced status-update failure: update aborts, current status remains unchanged, no StatusHistory row exists
- forced StatusHistory insert failure: insert aborts after attempted status update, transaction rolls back, current status remains unchanged, no StatusHistory row exists

## Test Evidence

Automated tests cover:

- initial CRT history creation
- duplicate initial-history rejection
- `CRT -> RDY`
- `RDY -> CMP`
- `RDY -> CAN`
- `CRT -> CAN`
- `CRT -> CMP` rejection
- same-status duplicate transition rejection
- unknown target status rejection
- `CMP` terminal rejection
- `CAN` terminal rejection
- missing order rejection
- ErrorRecord evidence for invalid transitions
- StatusHistory readback through `ServiceOrderService.StatusHistory`
- ErrorRecord readback through `ServiceOrderService.ErrorRecords`
- status-update rollback
- StatusHistory-insert rollback
- STR-137 validation regression
- STR-138 Responsibility Determination regression
- deterministic reset baseline

## Validation Evidence

Required validation results:

```powershell
npm install
# passed; up to date; 0 vulnerabilities

npm run build
# passed; tsc --noEmit

npm test
# passed; 16 tests, 0 failures

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

## Files Changed

- `Implementation files/STR-139-implementation-package.md`
- `src/lifecycle/lifecycle-status.ts`
- `test/lifecycle-status.test.ts`
- `docs/str-139-lifecycle-transitions-status-history.md`

## Scope Confirmation

- STR-133 persistence semantics remain unchanged.
- STR-134 dataset and reset semantics remain unchanged.
- STR-135 read-only service semantics remain unchanged.
- STR-136 ErrorRecord infrastructure semantics remain unchanged.
- STR-137 validation was not reimplemented or changed.
- STR-138 Responsibility Determination was not reimplemented or changed.
- Executing company remains returned only and not persisted.
- ErrorRecords are not lifecycle statuses.
- StatusHistory remains lifecycle evidence for successful transitions.
- No allocation, posting, workflow, orchestration, event publishing, UI, authentication, authorization, CI/CD, BTP deployment, HANA/HDI artifacts, external SAP runtime integration, production logging, production observability, production hardening, Linear access, or STR-140-or-later scope was introduced.
- Approved Enterprise Architecture remains unchanged.
