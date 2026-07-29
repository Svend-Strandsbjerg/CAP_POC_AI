# STR-136 Error Evidence Foundation

## EH3 Source

- SAP system: EH3
- Client: 300
- Package: `$TMP`
- Implementation baseline: completed STR-126 local MVP implementation

EH3 remained the authoritative technical baseline for STR-136.

## EH3 Objects Inspected

DDIC:

- `ZEH3_ORDER`
- `ZEH3_ORD_ERR`
- `ZEH3_ORD_HIST`
- `ZEH3_COMPANY`
- `ZEH3_ASSET`
- `ZEH3_SVCTYPE`
- `ZEH3_RESPRULE`

Classes:

- `ZCL_EH3SVC_ERROR_LOG`
- `ZCL_EH3SVC_ORDER_REPO`
- `ZCL_EH3SVC_REFDATA_REPO`

## EH3 Findings

- `ZEH3_ORD_ERR` persists error evidence independently from order status and status history.
- `ZEH3_ORD_ERR` carries deterministic `error_id`, `order_id`, processing `stage`, message identity, message text, severity, timestamp, user, resolved flag, and dataset version.
- `ZCL_EH3SVC_ERROR_LOG->CREATE_ERROR` prepares error evidence with timestamp, user, unresolved flag, and dataset version, then delegates persistence.
- `ZCL_EH3SVC_ORDER_REPO->CREATE_ERROR_RECORD` assigns the next deterministic error ID and inserts one `ZEH3_ORD_ERR` row.
- `ZCL_EH3SVC_ORDER_REPO->READ_ERROR_RECORDS` reads error rows ordered by error ID for an order.
- Error persistence does not update `ZEH3_ORDER` and does not create `ZEH3_ORD_HIST` records.

## Implementation Decisions

- Added one reusable internal TypeScript component in `src/error-records/error-records.ts`.
- The component persists an already prepared ErrorRecord into the approved STR-133 `ErrorRecords` entity.
- The component does not decide when an ErrorRecord is created.
- The component does not perform validation, responsibility determination, lifecycle changes, status changes, status-history creation, or orchestration.
- The approved STR-133 persistence model was not changed.
- Nullable `ErrorRecords.order` semantics are preserved.
- The persisted order association is the CAP business reference available in the approved model. No additional business-reference field was introduced because that would require changing the STR-133 persistence model.
- Readback is verified through the existing STR-135 `ServiceOrderService.ErrorRecords` projection.

## Differences From EH3

- EH3 `ZCL_EH3SVC_ERROR_LOG` sets runtime defaults such as timestamp, user, resolved flag, and dataset version before repository persistence. STR-136 keeps the CAP component infrastructure-only by requiring the caller to provide the prepared values.
- EH3 repository persistence assigns the next error ID. STR-136 persists a provided deterministic identifier to avoid introducing lifecycle or business creation decisions in this batch.
- EH3 DDIC marks `ZEH3_ORD_ERR-ORDER_ID` as technically not null, while prior STR-133 verification established that CAP `ErrorRecords.order` remains nullable to preserve order-independent error evidence.

## Files Changed

- `src/error-records/error-records.ts`
- `test/error-records-smoke.test.ts`
- `docs/str-136-error-evidence-foundation.md`
- `tsconfig.json`

## Validation Evidence

Required validation results:

```powershell
npm install
# passed; up to date; 0 vulnerabilities

npm run build
# passed; tsc --noEmit

npm test
# passed; 2 tests, 0 failures
# smoke test: persists prepared ErrorRecord without changing service order status or status history

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

Smoke test evidence:

- Creates one prepared ErrorRecord.
- Persists it through the internal component.
- Reads it back through `ServiceOrderService.ErrorRecords`.
- Confirms `ServiceOrderService.ServiceOrders` is unchanged.
- Confirms `ServiceOrderService.StatusHistory` is unchanged.

## Scope Confirmation

No handlers, actions, functions, public write API, validation behavior, responsibility determination, lifecycle transition behavior, status changes, status-history creation behavior, posting, allocation, orchestration, logging framework, observability, UI, authentication, authorization, BTP deployment, HANA-specific implementation, production hardening, or later-batch scope were introduced.
