# STR-135 Service Boundary

## EH3 Source

- SAP system: EH3
- Client: 300
- Package: `$TMP`
- Implementation baseline: completed STR-126 local MVP implementation

## EH3 Objects Inspected

- `ZEH3_ORDER`
- `ZEH3_ORD_HIST`
- `ZEH3_ORD_ERR`
- `ZEH3_COMPANY`
- `ZEH3_ASSET`
- `ZEH3_SVCTYPE`
- `ZEH3_RESPRULE`
- `ZCL_EH3SVC_ORDER_REPO`
- `ZCL_EH3SVC_REFDATA_REPO`

## Service

- Service name: `ServiceOrderService`
- Service path: `/service-orders`
- Implementation file: `srv/service-order-service.cds`
- Read-only mechanism: service-level and projection-level `@readonly` annotations with CAP generic read behavior

## Exposed Projections

| Projection | Source | Justification |
| ---------- | ------ | ------------- |
| `ServiceOrders` | `persistence.ServiceOrders` | Main service-order readback entity with current lifecycle status and order relationships. |
| `StatusHistory` | `persistence.StatusHistory` | Separate lifecycle evidence readback, preserving history apart from current status. |
| `ErrorRecords` | `persistence.ErrorRecords` | Separate error/evidence readback, preserving nullable order relationship. |
| `SyntheticCompanies` | `persistence.SyntheticCompanies` | Reference data for requesting, executing, and owning company readback. |
| `SyntheticAssets` | `persistence.SyntheticAssets` | Reference data needed to understand order asset and region context. |
| `ServiceTypes` | `persistence.ServiceTypes` | Reference data needed to understand order service type and inactive service scenarios. |
| `ResponsibilityRules` | `persistence.ResponsibilityRules` | Read-only reference data for later responsibility comparison; no determination behavior is exposed. |

## EH3-to-CAP Design Notes

- EH3 repository read methods expose order, status-history, error-record, company, asset, service-type, and active responsibility-rule readback.
- EH3 also contains company relationship readback, allocation readback, and posting readback. Those are not exposed because they are outside the approved STR-133 persistence model and STR-135 scope.
- The CAP service uses CAP-native projection names and does not copy ABAP table or repository names into the API.
- `ServiceOrders.executingCompany` remains nullable.
- `ErrorRecords.order` remains nullable.

## Validation Evidence

Metadata command:

```powershell
npx cds compile srv/service-order-service.cds --to edmx
```

Result: passed. The installed CAP CLI did not resolve the literal PowerShell command `npx cds compile srv/*.cds` and returned `Couldn't find a CDS model for 'srv/*.cds'`; the equivalent explicit file command above was used.

Endpoint readback commands use bounded local CAP startup against the STR-134 deterministic SQLite data.

| Endpoint | Expected result | Actual result |
| -------- | --------------- | ------------- |
| `/service-orders/$metadata` | HTTP 200 metadata document | HTTP 200 |
| `/service-orders/ServiceOrders` | HTTP 200 empty value array | HTTP 200, 0 rows |
| `/service-orders/StatusHistory` | HTTP 200 empty value array | HTTP 200, 0 rows |
| `/service-orders/ErrorRecords` | HTTP 200 empty value array | HTTP 200, 0 rows |
| `/service-orders/SyntheticCompanies` | HTTP 200 with 4 rows | HTTP 200, 4 rows |
| `/service-orders/SyntheticAssets` | HTTP 200 with 7 rows | HTTP 200, 7 rows |
| `/service-orders/ServiceTypes` | HTTP 200 with 4 rows | HTTP 200, 4 rows |
| `/service-orders/ResponsibilityRules` | HTTP 200 with 7 rows | HTTP 200, 7 rows |

Read-only verification:

- `POST /service-orders/SyntheticCompanies` returned HTTP 405 with `ENTITY_IS_READ_ONLY`.

## Scope Confirmation

Generic CAP read behavior is used.

No handlers, actions, functions, validation behavior, responsibility determination, lifecycle transition behavior, runtime error creation, orchestration, allocation, posting, UI, authentication, authorization, BTP configuration, HANA/HDI artifacts, CI/CD, external SAP integration, production API commitment, production hardening, or later-batch scope were introduced.
