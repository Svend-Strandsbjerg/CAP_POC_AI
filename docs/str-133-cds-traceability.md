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
