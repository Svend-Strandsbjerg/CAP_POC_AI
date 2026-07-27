# STR-133 CDS Traceability

This document maps the frozen EH3 ABAP MVP Source Baseline V1.0 business concepts to the CAP-native CDS persistence model for the Synthetic Service Order Management bounded domain.

The CAP model preserves business meaning and traceability. It does not copy ABAP repository patterns, technical table design, class structure, or behavior implementation.

## Concept Mapping

| Frozen ABAP concept | CAP target |
| ------------------- | ---------- |
| `ZEH3_COMPANY` | `SyntheticCompanies` |
| `ZEH3_ASSET` | `SyntheticAssets` |
| `ZEH3_SVCTYPE` | `ServiceTypes` |
| `ZEH3_RESPRULE` | `ResponsibilityRules` |
| `ZEH3_ORDER` | `ServiceOrders` |
| `ZEH3_ORD_HIST` | `StatusHistory` |
| `ZEH3_ORD_ERR` | `ErrorRecords` |

## Behavior Deferred

The following frozen baseline concepts represent later behavior and are not implemented in this persistence-only task:

- `ZCL_EH3SVC_VALIDATOR` is later validation behavior and is not implemented.
- `ZCL_EH3SVC_RESP_DET` is later responsibility determination behavior and is not implemented.
- `ZCL_EH3SVC_STATUS` is later lifecycle status behavior and is not implemented.
- `ZCL_EH3SVC_ERROR_LOG` is later error creation behavior and is not implemented.

## Explicit Exclusions

- Allocation concepts are excluded.
- Posting concepts are excluded.
- ABAP repository patterns are not copied.
- Seed and reset behavior is deferred.
- Runtime validation evidence is deferred.
- No CAP service layer, service projections, handlers, or business logic are included.
- No UI, authentication, authorization, BTP configuration, HANA/HDI artifacts, CI/CD, external integration, ADR, or production hardening is included.

## CAP Model Notes

- The namespace is `cap.poc.eh3.synthetic`.
- Entity names use CAP-native business terminology.
- Field names use lower camel case.
- Keys are deterministic business keys.
- Lifecycle status history remains separate from the current order status.
- Error evidence remains separate from lifecycle status.
- Responsibility rules are represented as data only. No determination algorithm is implemented.

## EH3 MVP Verification

Verified against SAP system EH3, client 300, package `$TMP`, using ARC-1 MCP read-only inspection of the completed STR-126 local MVP implementation.

### DDIC Objects Inspected

| EH3 object | Verification result |
| ---------- | ------------------- |
| `ZEH3_COMPANY` | Confirmed company ID key length 4, company name length 40, request/execute capability flags, restriction flag, and dataset version. |
| `ZEH3_ASSET` | Confirmed asset ID key length 10, owning company relationship, region length 6, active/blocked flags, per-service eligibility flags, and dataset version. |
| `ZEH3_SVCTYPE` | Confirmed service type code length 4 and allowed values, description length 60, base amount decimal precision, currency, active flag, and dataset version. |
| `ZEH3_RESPRULE` | Confirmed rule ID key length 10, requesting company, asset region, service type, priority, executing company, active flag, and dataset version. |
| `ZEH3_ORDER` | Confirmed order ID key length 12, asset, requesting company, executing company, service type, priority, requested date, current status, create/change timestamps, and dataset version. |
| `ZEH3_ORD_HIST` | Confirmed composite deterministic history identity by order and sequence number, old status, new status, processing stage, timestamp, user, reason text length 120, and dataset version. |
| `ZEH3_ORD_ERR` | Confirmed deterministic error ID, order relationship, stage, message ID, message number, message text length 220, severity, timestamp, user, resolved flag, and dataset version. |

### Classes Reviewed

| EH3 class | Verification result |
| --------- | ------------------- |
| `ZCL_EH3SVC_REFDATA_REPO` | Confirmed reference-data persistence boundaries for companies, assets, service types, and active responsibility rules. |
| `ZCL_EH3SVC_ORDER_REPO` | Confirmed separate persistence for orders, status history, and error records; confirmed per-order history sequence generation and deterministic error ID generation. Allocation and posting repository methods were observed but remain explicitly excluded from STR-133. |
| `ZCL_EH3SVC_VALIDATOR` | Confirmed validation uses persisted request capability, active/blocked flags, service eligibility flags, active service type, priority, and requested date. Validation behavior is not implemented in CAP in this task. |
| `ZCL_EH3SVC_RESP_DET` | Confirmed responsibility determination uses requesting company, asset region, service type, and priority to select an executing company from active rules. Determination behavior is not implemented in CAP in this task. |
| `ZCL_EH3SVC_STATUS` | Confirmed lifecycle statuses and transition history evidence: old status, new status, stage, timestamp, user, reason, and dataset version. Transition behavior is not implemented in CAP in this task. |
| `ZCL_EH3SVC_ERROR_LOG` | Confirmed error evidence shape: stage, message ID/number/text, severity, timestamp, user, resolved flag, dataset version, and deterministic error ID assigned by the repository. Error creation behavior is not implemented in CAP in this task. |

### Verification Outcome

The CDS model was adjusted after inspection to better preserve the implemented EH3 MVP baseline while remaining CAP-native. The model now includes persisted benchmark/version evidence, reference-data capability and eligibility flags, service type amount and currency reference fields, order audit timestamps, full status-history transition evidence, and full error/evidence fields.

### Nullable Association Decisions

- `ServiceOrders.executingCompany` is nullable in CAP. EH3 DDIC marks the persisted field as `not null`, but ABAP runtime stores character initial values and `ZCL_EH3SVC_RESP_DET=>ensure_order_input` does not require an executing company before responsibility determination. `ZCL_EH3SVC_RESP_DET=>determine_responsibility` returns the determined executing company and does not update the order itself, so a service order can exist before assignment.
- `ErrorRecords.order` is nullable in CAP. EH3 DDIC marks the persisted field as `not null`, but `ZCL_EH3SVC_VALIDATOR=>validate_order` creates an error when the input order ID is initial, and `ZCL_EH3SVC_ERROR_LOG=>create_error` passes that initial value through to `ZCL_EH3SVC_ORDER_REPO=>create_error_record` without verifying a persisted order. Error evidence can therefore exist without a valid persisted order.

The CAP model still intentionally excludes allocation, posting, validation behavior, responsibility determination behavior, lifecycle transition behavior, error creation behavior, seed/reset behavior, service definitions, handlers, UI, authentication, authorization, BTP configuration, HANA/HDI artifacts, CI/CD, external integrations, ADRs, and production hardening.
