# STR-142 BTP Deployment Validation

## 1. Scope

- Repository root: `C:\VSCode\sap-ai-test\CAP_POC_AI`
- Branch: `str-142-btp-deployment-validation`
- Starting commit: `f71aa269856e76878aba92c30f2ae26c0ca015e6`
- Implementation package: `Implementation files/STR-142-implementation-package.md`
- Objective: validate first deployment of the approved CAP POC to SAP BTP Cloud Foundry with SAP HANA Cloud and an HDI container.
- Scope decision: deployment validation only. No CAP business behaviour, persistence semantics, service definitions, seed data, validation, responsibility determination, lifecycle, StatusHistory, ErrorRecord, or executing-company semantics were changed.

## 2. Baseline Evidence

The approved STR-133 through STR-141 implementation was inspected before deployment configuration work.

Inspected baseline files:

- `package.json`
- `db/schema.cds`
- `srv/service-order-service.cds`
- `src/error-records/error-records.ts`
- `src/validation/service-order-validation.ts`
- `src/responsibility/responsibility-determination.ts`
- `src/lifecycle/lifecycle-status.ts`
- `scripts/reset-local.mjs`
- `scripts/validate-local.mjs`
- `db/data/*`
- `test/*`
- `docs/str-133*` through `docs/str-141*`

Pre-change local validation:

| Command | Result |
| --- | --- |
| `npm install` | Passed. Packages were up to date; 0 vulnerabilities. |
| `npm run build` | Passed. `tsc --noEmit` completed successfully. |
| `npm test` | Passed. 19 tests, 18 passed, 0 failed, 1 skipped. |
| `npm run validate:local` | Passed. Baseline phase: 19 tests, 18 passed, 0 failed, 1 skipped. STR-140 phase: 3 tests, 3 passed, 0 failed, 0 skipped. |

Deterministic local seed counts inspected from `db/data`:

| Entity | Rows |
| --- | ---: |
| SyntheticCompanies | 4 |
| SyntheticAssets | 7 |
| ServiceTypes | 4 |
| ResponsibilityRules | 7 |
| ServiceOrders | 0 |
| StatusHistory | 0 |
| ErrorRecords | 0 |

## 3. BTP Readiness

Readiness commands were executed with the Cloud Foundry CLI against the currently configured target.

| Check | Result |
| --- | --- |
| `cf version` | `cf.exe version 8.18.3+83ce51d9c.2026-04-16` |
| `cf api` | API endpoint `https://api.cf.eu10-004.hana.ondemand.com`, API version `3.224.0` |
| `cf target` | User `sst@2bm.dk`, org `2BM A-S_2bm-sap-erp-udv-clean-core-dhkdgq3h`, space `ARC-1` |
| `cf orgs` | Org available: `2BM A-S_2bm-sap-erp-udv-clean-core-dhkdgq3h` |
| `cf spaces` | Spaces available: `ARC-1`, `UDV` |
| `cf space ARC-1` | Existing app `arc1-mcp-server`; existing services `arc1-application-logs`, `arc1-connectivity`, `arc1-destination`, `arc1-xsuaa`; staging/running security groups present |
| `cf apps` | Existing app `arc1-mcp-server` is started |
| `cf marketplace` | Marketplace is reachable, but no SAP HANA Cloud or HDI offering is listed |
| `cf marketplace -e hana` | `No service offerings found.` |
| `cf marketplace -e hana-cloud` | `No service offerings found.` |
| `cf services` | Existing services only: application logs, connectivity, destination, xsuaa. No HANA or HDI container service instance exists. |

Tooling:

| Tool | Result |
| --- | --- |
| `mbt --version` | Cloud MTA Build Tool version `1.2.47` |
| `cf plugins` | `multiapps` plugin version `3.11.1` installed |

Readiness conclusion:

- Cloud Foundry is enabled and the CLI can inspect the target org and space.
- MTA build and deploy tooling is available.
- HANA Cloud / HDI readiness is blocked because neither `hana`, `hana-cloud`, nor an `hdi-shared` service plan is available in the targeted marketplace, and no existing HDI service instance is present in the target space.
- Because STR-142 requires SAP HANA Cloud / HDI deployed persistence, deployment configuration and deployment were not attempted.
- The blocker is an environment entitlement/service-availability blocker, not a CAP code blocker.

### 3.1 Recheck Against `cap-modernization-poc` on 2026-08-07

The BTP readiness check was repeated after the target environment was updated.

Target used:

- API endpoint: `https://api.cf.eu10-004.hana.ondemand.com`
- User: `sst@2bm.dk`
- Org: `2BM A-S_2bm-sap-erp-udv-clean-core-dhkdgq3h`
- Space: `cap-modernization-poc`

Commands executed:

| Command | Result |
| --- | --- |
| `cf target -s cap-modernization-poc` | Passed. Target set to org `2BM A-S_2bm-sap-erp-udv-clean-core-dhkdgq3h`, space `cap-modernization-poc`. |
| `cf marketplace -e hana` | Passed. Service offering `hana` is visible. Plans available: `hdi-shared`, `schema`. |
| `cf marketplace -e hana-cloud` | Passed. Service offering `hana-cloud` is visible. Plan available: `hana-cloud-option`. |
| `cf services` | Passed, but no service instances found in the target space. |
| `cf service-access` | `hana/hdi-shared`, `hana/schema`, and `hana-cloud/hana-cloud-option` have limited access for the target org. |
| `cf apps` | No applications found in the target space. |

Updated readiness conclusion:

- `hdi-shared` is now available in the marketplace for the target org/space.
- `hana-cloud` is now available in the marketplace as `hana-cloud-option`.
- No actual service instances exist in `cap-modernization-poc`.
- No HDI container exists.
- No deployed CAP app exists.
- A usable HANA-backed persistence target is not yet verifiable from Cloud Foundry, because there is no existing HDI service instance and no visible database-bound service instance in the space.

Remaining blocker:

- The entitlement/service offering blocker from the first run is resolved.
- The deployment is still blocked at the environment-instance level: a HANA Cloud database must exist and be mapped/usable for this org/space, and an HDI container service instance must be available for the CAP app.

Human/BTP-admin action required before deployment can continue:

- Confirm or create the intended non-production SAP HANA Cloud database for this POC subaccount.
- Ensure the HANA database is mapped/usable from Cloud Foundry org `2BM A-S_2bm-sap-erp-udv-clean-core-dhkdgq3h`, space `cap-modernization-poc`.
- Approve creation of the HDI container service instance in the space, likely using service offering `hana`, plan `hdi-shared`, with the service name that will be referenced by the CAP/MTA deployment configuration.
- Confirm that the user/deployment principal may create, bind, and use the HDI container in this space.

No CAP code or deployment configuration was changed during this recheck because proceeding would require creating or targeting runtime infrastructure that is not yet present as a service instance in the target space.

## 4. Deployment Architecture

Intended deployment architecture from the STR-142 package:

- CAP Node.js application on SAP BTP Cloud Foundry.
- SQLite retained for local development.
- SAP HANA Cloud / HDI container for deployed persistence.
- Manual deployment.
- No CI/CD.
- No UI.
- No external SAP integration.
- No production authorization model.

No `mta.yaml`, HANA deployer module, HDI resource, production profile, or authentication configuration was added because the target BTP environment did not expose the required HANA/HDI service offering. Adding deployment files without a clear target HDI resource would be speculative and would not satisfy the STR-142 deployment-validation contract.

## 5. Files Changed

- `docs/str-142-btp-deployment-validation.md`: records the STR-142 readiness checks, blocker, baseline preservation evidence, and final validation.
- `Implementation files/STR-142-implementation-package.md`: added to repository traceability for the authoritative STR-142 implementation package.

No production source files were changed.

## 6. Build Evidence

Deployment artifact build was not attempted because the HANA/HDI prerequisite is unavailable in the target BTP space.

Available build tooling:

- `mbt --version`: `1.2.47`
- `cf plugins`: `multiapps 3.11.1`

Generated output handling:

- No MTAR archive was generated.
- No `mta_archives` output was committed.

## 7. Deployment Evidence

Deployment was not attempted.

Reason:

- The target marketplace does not expose SAP HANA Cloud / HDI service offerings or an `hdi-shared` plan.
- No existing HDI container service instance is available in the target space.
- Proceeding would require guessing deployment resources or changing the approved deployment architecture.

## 8. HANA/HDI Evidence

HANA/HDI validation result:

- `cf marketplace -e hana`: no service offerings found.
- `cf marketplace -e hana-cloud`: no service offerings found.
- `cf services`: no HANA or HDI service instance present.

Binding result:

- No application-to-HDI binding was created.
- No schema deployment was executed.

## 9. Runtime Verification

No deployed runtime endpoint was available because deployment was blocked before application deployment.

Local read-only service behaviour remains evidenced by the unchanged STR-135 through STR-141 baseline tests and `validate:local`.

## 10. Behaviour-Preservation Evidence

Behaviours directly verified on BTP:

- Cloud Foundry target inspection only.
- No deployed CAP business behaviour was executed.

Behaviours preserved through unchanged source and passing local validation:

- STR-133 persistence model and nullable association semantics.
- STR-134 deterministic local SQLite seed/reset.
- STR-135 read-only service projections.
- STR-136 ErrorRecord persistence infrastructure.
- STR-137 validation behaviour.
- STR-138 Responsibility Determination behaviour, including executing company returned only and not persisted.
- STR-139 lifecycle transitions and StatusHistory behaviour.
- STR-140 integrated local validation and reset-repeatability.
- STR-141 comparison evidence remains unchanged.

Behaviours not exercised remotely:

- HANA-backed persistence.
- HDI schema deployment.
- Deployed service metadata/readback.
- Deployed reference-data readback.
- Deployed transactional projection readback.

## 11. Blockers and Limitations

Original blocker:

- SAP HANA Cloud / HDI is not available in the current Cloud Foundry marketplace for org `2BM A-S_2bm-sap-erp-udv-clean-core-dhkdgq3h`, space `ARC-1`.

Updated blocker after 2026-08-07 recheck:

- SAP HANA Cloud and HDI service offerings are now visible in org `2BM A-S_2bm-sap-erp-udv-clean-core-dhkdgq3h`, space `cap-modernization-poc`.
- `hana/hdi-shared` is available.
- `hana-cloud/hana-cloud-option` is available.
- `cf services` shows no service instances in `cap-modernization-poc`.
- No HDI container exists yet.
- No HANA Cloud database instance is visible as a usable/bound service from the target CF space.
- Deployment remains blocked until the HANA Cloud database and HDI container target are confirmed or created.

Classification:

- Original run: environment entitlement or service-availability blocker.
- Current run: environment instance/mapping blocker.

Human action required:

- Confirm the intended BTP org and space for this POC remains `2BM A-S_2bm-sap-erp-udv-clean-core-dhkdgq3h` / `cap-modernization-poc`.
- Confirm or create a non-production SAP HANA Cloud database for this POC.
- Confirm that the database is mapped/usable from the target Cloud Foundry org/space.
- Approve or create the HDI container service instance using `hana` / `hdi-shared`.
- Confirm the target remains a non-production POC environment.

Limitations:

- No MTA deployment was performed.
- No HDI container was created or bound.
- No HANA schema deployment was validated.
- No deployed CAP endpoint was tested.

No workaround or CAP business change was introduced.

## 12. Final Validation

Final local validation was run after preparing this evidence document.

| Command | Result |
| --- | --- |
| `npm install` | Passed. Packages were up to date; 0 vulnerabilities. |
| `npm run build` | Passed. |
| `npm test` | Passed. 19 tests, 18 passed, 0 failed, 1 skipped. |
| `npm run validate:local` | Passed. Baseline phase: 19 tests, 18 passed, 0 failed, 1 skipped. STR-140 phase: 3 tests, 3 passed, 0 failed, 0 skipped. |
| `git diff --check` | Passed. |
| `git status --short` | Only STR-142 documentation/package changes plus unrelated historical untracked implementation-package files. Only STR-142 files were staged for commit. |

## 13. Scope Confirmation

- No business behaviour changed.
- No production source was refactored for deployment convenience.
- No CDS business model or persistence semantics changed.
- No service boundary changed.
- No validation, Responsibility Determination, lifecycle, StatusHistory, ErrorRecord, or executing-company semantics changed.
- No CI/CD was introduced.
- No production security architecture was introduced.
- No external SAP integration was introduced.
- No STR-143 scope was introduced.
- Enterprise Architecture remains unchanged.
