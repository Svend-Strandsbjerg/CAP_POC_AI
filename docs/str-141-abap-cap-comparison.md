# STR-141 ABAP-to-CAP Behavioural Comparison Evidence

## 1. Scope And Method

- Repository root: `C:\VSCode\sap-ai-test\CAP_POC_AI`
- Implementation package path: `C:\VSCode\sap-ai-test\CAP_POC_AI\Implementation files\STR-141-implementation-package.md`
- Starting CAP baseline: `main` at `1d06a41`, merge of PR #10, containing `21e6773876acd7afaf6ea650718cc461cbcf68a8`
- EH3 source baseline: system EH3, client 300, package `$TMP`, `EH3 ABAP MVP Source Baseline V1.0`
- CAP baseline: merged STR-133 through STR-140 implementation in GitHub
- Role: technical audit and comparison only

Method:

1. Read the local STR-141 implementation package before comparison.
2. Confirm PR #10 / `21e6773` is contained in `main`.
3. Run the CAP baseline validation commands before evidence work.
4. Inspect actual EH3 DDIC objects, class methods, seed/reset source, and available runtime validation report source through ARC-1 MCP.
5. Inspect actual CAP source, tests, scripts, seed data, service projections, and documentation from `main`.
6. Compare observable behaviour scenario by scenario.
7. Classify each scenario using only the allowed STR-141 classifications.

Limitations:

- ARC-1 table data preview is disabled by server safety configuration (`allowDataPreview=false`), so live EH3 table rows could not be read directly.
- EH3 Batch 6C runtime result `91 checks, 91 passed, 0 failed, PASS` is a reported baseline result. The inspected evidence available to Codex was the actual report source that produces pass/fail output, not an executed report transcript.
- EH3 transaction rollback failure injection was not directly executed. EH3 source uses one ABAP LUW without explicit commit between status update and history insert. CAP has explicit rollback tests with SQLite triggers.
- STR-141 did not modify CAP behaviour, add tests, or create runtime harnesses.

## 2. EH3 Evidence Inventory

Objects found in `$TMP` by ARC-1 TADIR lookup:

- `ZCL_EH3SVC_VALIDATOR`
- `ZCL_EH3SVC_RESP_DET`
- `ZCL_EH3SVC_STATUS`
- `ZCL_EH3SVC_ORDER_REPO`
- `ZCL_EH3SVC_ERROR_LOG`
- `ZCL_EH3SVC_REFDATA_REPO`
- `ZCL_EH3SVC_RESET`
- `ZCL_EH3SVC_SEED`
- `ZEH3_SVC_BATCH4_TEST`
- `ZEH3_SVC_BATCH5B_TEST`
- `ZEH3_SVC_BATCH6C_TEST`
- `ZEH3_COMPANY`
- `ZEH3_ASSET`
- `ZEH3_SVCTYPE`
- `ZEH3_RESPRULE`
- `ZEH3_ORDER`
- `ZEH3_ORD_HIST`
- `ZEH3_ORD_ERR`

DDIC tables inspected:

- `ZEH3_COMPANY`: company ID, name, request/execute/restricted flags, dataset version.
- `ZEH3_ASSET`: asset ID, owning company, region, active/blocked flags, service allowance flags, dataset version.
- `ZEH3_SVCTYPE`: service type, description, amount, currency, active flag, dataset version.
- `ZEH3_RESPRULE`: rule ID, requester, region, service type, priority, executor, active flag, dataset version.
- `ZEH3_ORDER`: order ID, asset, requester, executor, service type, priority, requested date, status, timestamps, dataset version.
- `ZEH3_ORD_HIST`: order ID, sequence number, old/new status, stage, changed timestamp/user, reason, dataset version.
- `ZEH3_ORD_ERR`: error ID, order ID, stage, message ID/number/text, severity, created timestamp/user, resolved flag, dataset version.

Methods inspected:

- `ZCL_EH3SVC_VALIDATOR->VALIDATE_ORDER`
- `ZCL_EH3SVC_VALIDATOR->ADD_ERROR`
- `ZCL_EH3SVC_RESP_DET->DETERMINE_RESPONSIBILITY`
- `ZCL_EH3SVC_RESP_DET->CREATE_RESP_ERROR`
- `ZCL_EH3SVC_RESP_DET->ENSURE_ORDER_INPUT`
- `ZCL_EH3SVC_REFDATA_REPO->READ_ACTIVE_RESP_RULES`
- `ZCL_EH3SVC_STATUS->IS_TRANSITION_ALLOWED`
- `ZCL_EH3SVC_STATUS->EXECUTE_TRANSITION`
- `ZCL_EH3SVC_STATUS->RECORD_INITIAL_CRT_HISTORY`
- `ZCL_EH3SVC_STATUS->BUILD_STATUS_HISTORY`
- `ZCL_EH3SVC_STATUS->CREATE_STATUS_ERROR`
- `ZCL_EH3SVC_ORDER_REPO->UPDATE_ORDER`
- `ZCL_EH3SVC_ORDER_REPO->CREATE_STATUS_HISTORY`
- `ZCL_EH3SVC_ORDER_REPO->CREATE_ERROR_RECORD`
- `ZCL_EH3SVC_ORDER_REPO->READ_STATUS_HISTORY`
- `ZCL_EH3SVC_ORDER_REPO->READ_ERROR_RECORDS`
- `ZCL_EH3SVC_ERROR_LOG->CREATE_ERROR`
- `ZCL_EH3SVC_SEED->INSERT_REFERENCE_DATA`
- `ZCL_EH3SVC_SEED->DELETE_V1_RECORDS`
- `ZCL_EH3SVC_RESET->RESET_TX`
- `ZCL_EH3SVC_RESET->RESET_ALL`

Runtime/report evidence inspected:

- `ZEH3_SVC_BATCH4_TEST`: lifecycle, status history, direct error logging, invalid transitions, summary writer.
- `ZEH3_SVC_BATCH5B_TEST`: validation cases, message ordering checks, no downstream side effects, summary writer.
- `ZEH3_SVC_BATCH6C_TEST`: responsibility determination cases, no side effects, allocation/posting absence checks, summary writer.
- Reported Batch 6C result: 91 checks, 91 passed, 0 failed, PASS.

Evidence not accessible:

- Direct EH3 table-content row previews, because ARC-1 returned `allowDataPreview=false`.
- Executed report transcript from EH3 at STR-141 time.
- Direct EH3 failure-injection run for database rollback semantics.

## 3. CAP Evidence Inventory

Source files inspected:

- `db/schema.cds`
- `srv/service-order-service.cds`
- `src/error-records/error-records.ts`
- `src/validation/service-order-validation.ts`
- `src/responsibility/responsibility-determination.ts`
- `src/lifecycle/lifecycle-status.ts`
- `scripts/reset-local.mjs`
- `scripts/validate-local.mjs`
- `package.json`

Seed files inspected:

- `db/data/cap.poc.eh3.synthetic-SyntheticCompanies.csv`
- `db/data/cap.poc.eh3.synthetic-SyntheticAssets.csv`
- `db/data/cap.poc.eh3.synthetic-ServiceTypes.csv`
- `db/data/cap.poc.eh3.synthetic-ResponsibilityRules.csv`
- `db/data/cap.poc.eh3.synthetic-ServiceOrders.csv`
- `db/data/cap.poc.eh3.synthetic-StatusHistory.csv`
- `db/data/cap.poc.eh3.synthetic-ErrorRecords.csv`

Test files inspected:

- `test/error-records-smoke.test.ts`
- `test/validation-behaviour.test.ts`
- `test/responsibility-determination.test.ts`
- `test/lifecycle-status.test.ts`
- `test/integrated-local-validation.test.ts`
- `test/foundation.test.ts`

Documentation inspected:

- `docs/str-133-cds-traceability.md`
- `docs/str-134-seed-reset-traceability.md`
- `docs/str-135-service-boundary.md`
- `docs/str-136-error-evidence-foundation.md`
- `docs/str-137-validation-behaviour.md`
- `docs/str-138-responsibility-determination.md`
- `docs/str-139-lifecycle-transitions-status-history.md`
- `docs/str-140-automated-local-validation.md`

Service projections inspected:

- `ServiceOrderService.ServiceOrders`
- `ServiceOrderService.StatusHistory`
- `ServiceOrderService.ErrorRecords`
- `ServiceOrderService.SyntheticCompanies`
- `ServiceOrderService.SyntheticAssets`
- `ServiceOrderService.ServiceTypes`
- `ServiceOrderService.ResponsibilityRules`

Validation commands executed before evidence work:

- `npm install`: passed, 0 vulnerabilities.
- `npm run build`: passed.
- `npm test`: passed, 19 tests, 18 passed, 1 skipped, 0 failed.
- `npm run validate:local`: passed. Baseline phase 19 tests, 18 passed, 1 skipped, 0 failed. STR-140 phase 3 tests, 3 passed, 0 skipped, 0 failed.

## 4. Detailed Comparison Matrix

| # | Area | Scenario / behaviour | EH3 evidence | EH3 observable behaviour and evidence effect | CAP evidence | CAP observable behaviour and evidence effect | Classification | Impact / STR-142 prerequisite |
|---:|---|---|---|---|---|---|---|---|
| 1 | Validation | Valid order | `VALIDATE_ORDER`; `ZEH3_SVC_BATCH5B_TEST` valid inspection/repair/emergency cases | Returns valid, no ErrorRecords | `ServiceOrderValidator.validateOrder`; `validation-behaviour.test.ts` positive test | Returns `valid: true`, no `ErrorRecords`, order/history unchanged | Fully preserved behaviour | Strong local evidence; no prerequisite |
| 2 | Validation | Missing order ID | `VALIDATE_ORDER` message `027`, early return | Persists `VALID` ErrorRecord for missing ID | `validateOrder(null/undefined)` path, source | Persists `VALID` ErrorRecord `027`; order ID null supported in CAP | Fully preserved behaviour | Preserved with CAP nullable error-order representation |
| 3 | Validation | Unknown order | `VALIDATE_ORDER` message `026`, early return | Persists `VALID` ErrorRecord for requested order ID | `ServiceOrderValidator` unknown-order path | Persists `VALID` ErrorRecord `026` | Fully preserved behaviour | No prerequisite |
| 4 | Validation | Missing input fields | `VALIDATE_ORDER` messages `028`, `020`, `029`, `030`, `031` | Adds findings in source order | `ServiceOrderValidator` same checks | Adds same message numbers in same order | Fully preserved behaviour | Source evidence; subset exercised by tests |
| 5 | Validation | Unknown references | `VALIDATE_ORDER` messages `021`, `033`, `035` | Adds unknown asset/company/service type errors | CAP validator reference reads | Adds same message numbers/text patterns | Fully preserved behaviour | Source evidence; subset exercised by tests |
| 6 | Validation | Inactive/blocked reference data | `VALIDATE_ORDER` messages `032`, `022`, `036`; `ZCL_EH3SVC_SEED` inactive rows | Adds inactive/blocked findings | CAP validator active/blocked checks and inactive CSV rows | Adds same message numbers where scenario is run | Fully preserved behaviour | No prerequisite |
| 7 | Validation | Service not allowed for asset | `IS_SERVICE_ALLOWED_FOR_ASSET`; message `023` | Adds unsupported service/asset finding | `isServiceAllowedForAsset`; validation tests | Adds `023` for `A200-XCMP` + `INSP` | Fully preserved behaviour | No prerequisite |
| 8 | Validation | Invalid priority and past requested date | `IS_PRIORITY_VALID`; messages `024`, `025` | Adds invalid priority / date findings | `isPriorityValid`; date comparison to configured `now` | Adds `024` and `025`; negative test covers `025` | Fully preserved behaviour | No prerequisite |
| 9 | Validation | Multiple validation findings ordering | `ZEH3_SVC_BATCH5B_TEST` expects `028,020,029,024,025` and checks `ERROR_ID ordering` | Deterministic source-order findings and error IDs | `validation-behaviour.test.ts`; `integrated-local-validation.test.ts` | Negative scenario produces ordered `034,023,025` with `0000000001..3` | Fully preserved behaviour | Strong subset evidence; no prerequisite |
| 10 | Validation | `VALID` ErrorRecords | `ADD_ERROR` calls `CREATE_ERROR` with stage `VALID`, message ID `ZEH3_SVC_MSG`, severity `E` | Persistent validation evidence separate from result | `#addError` uses stage `VALID`, message ID `ZEH3_SVC_MSG`, severity `E` | Error rows readable via `ServiceOrderService.ErrorRecords` | Fully preserved behaviour | No prerequisite |
| 11 | Validation | No lifecycle/status-history mutation | `ZEH3_SVC_BATCH5B_TEST->CHECK_NO_DOWNSTREAM` checks no history/allocation/posting and unchanged status | Validation does not advance lifecycle | `validation-behaviour.test.ts` | Order, executing company, and StatusHistory unchanged | Fully preserved behaviour | No prerequisite |
| 12 | Responsibility | Precondition: already valid input | `DETERMINE_RESPONSIBILITY` reads order and checks required fields; no validation reimplementation | Missing input raises app exception | `ResponsibilityDeterminer.determineForValidatedOrder`; responsibility tests call validator for positive case | Responsibility assumes validated input and throws on missing order/input | Fully preserved behaviour | No prerequisite |
| 13 | Responsibility | Single match | `READ_ACTIVE_RESP_RULES` ordered by `RULE_ID`; `DETERMINE_RESPONSIBILITY` `WHEN 1` | Returns executing company; no error | CAP ordered rule read and positive test | Returns `C200`, `determined: true`, no error | Fully preserved behaviour | No prerequisite |
| 14 | Responsibility | No match | `WHEN 0`, message `040` | Returns not determined and persists one `RESP` ErrorRecord | CAP no-match test | Returns `errorId 0000000001`, `RESP` `040` | Fully preserved behaviour | No prerequisite |
| 15 | Responsibility | Multiple match | `WHEN OTHERS`, message `041` | Returns not determined and persists one `RESP` ErrorRecord | CAP multiple-match test using `A400-LIMIT` / R3 rules | Returns `RESP` `041` deterministically | Fully preserved behaviour | No prerequisite |
| 16 | Responsibility | Rule ordering | EH3 `ORDER BY rule_id` | Deterministic result ordering for matched rules | CAP `.orderBy("ruleId")` | Deterministic no/multiple match evidence | Fully preserved behaviour | No prerequisite |
| 17 | Responsibility | Executing company returned only | EH3 result parameter `EV_EXECUTING_COMPANY_ID`; no `UPDATE_ORDER` in method; Batch 6C `No order change` | Does not persist executing company | CAP result object plus test asserts persisted `executingCompany_companyId` remains null | Returned `C200`; order unchanged | Fully preserved behaviour | Critical preserved MVP semantic |
| 18 | Responsibility | Missing precondition | EH3 raises `ZCX_EH3SVC_APP`; Batch 6C checks no `RESP` error | No responsibility evidence for technical precondition failure | CAP throws and test asserts no ErrorRecords/StatusHistory | Same observable no-evidence behaviour | Fully preserved behaviour | No prerequisite |
| 19 | Responsibility | No lifecycle/status-history mutation | Batch 6C `CHECK_NO_SIDE_EFFECTS` | No order/status history/allocation/posting changes | CAP tests assert order and history unchanged | No lifecycle side effects | Fully preserved behaviour | No prerequisite |
| 20 | Lifecycle | `CRT -> RDY` | `IS_TRANSITION_ALLOWED`; Batch 4 scenario 2 | Status changes to `RDY`, history row created, no error | `LifecycleStatusManager`; lifecycle tests | Status `RDY` then `CMP`; history row `[CRT,RDY,STATUS]` | Fully preserved behaviour | No prerequisite |
| 21 | Lifecycle | `CRT -> CAN` | `IS_TRANSITION_ALLOWED`; Batch 4 scenario `scenario_crt_can` | Created order can be cancelled; history row created | CAP `isTransitionAllowed`; lifecycle and integrated tests | Status `CAN`; history `[CRT,CAN,STATUS]` | Fully preserved behaviour | Important EH3-preserving behaviour |
| 22 | Lifecycle | `RDY -> CMP` | `IS_TRANSITION_ALLOWED`; Batch 4 scenario 3 | Status changes to `CMP`, history row created | CAP lifecycle tests | Status `CMP`; history `[RDY,CMP,STATUS]` | Fully preserved behaviour | No prerequisite |
| 23 | Lifecycle | `RDY -> CAN` | `IS_TRANSITION_ALLOWED`; Batch 4 scenario | Status changes to `CAN`, history row created | CAP lifecycle tests | Status `CAN`; history `[RDY,CAN]` | Fully preserved behaviour | No prerequisite |
| 24 | Lifecycle | Invalid direct `CRT -> CMP` | Batch 4 `scenario_crt_cmp`; `CREATE_STATUS_ERROR` | No status change, no history, `STATUS` error `100` | CAP invalid-transition test | `changed:false`, status `CRT`, no history, `STATUS` `100` | Fully preserved behaviour | No prerequisite |
| 25 | Lifecycle | Completed terminal status | EH3 only allows transitions from `CRT` or `RDY`; Batch 4 CMP terminal check | `CMP -> CAN/RDY` rejected with `STATUS` error | CAP invalid/terminal test | `CMP` remains terminal; `STATUS` errors | Fully preserved behaviour | No prerequisite |
| 26 | Lifecycle | Cancelled terminal status | EH3 only allows transitions from `CRT` or `RDY`; Batch 4 CAN terminal check | `CAN -> RDY/CMP` rejected with `STATUS` error | CAP invalid/terminal test | `CAN` remains terminal; `STATUS` errors | Fully preserved behaviour | No prerequisite |
| 27 | Lifecycle | Same-status transition | `IS_TRANSITION_ALLOWED` rejects same status because no same-target branch | Invalid transition error | CAP duplicate transition test includes `CRT -> CRT` | Rejected, status unchanged, `STATUS` error | Fully preserved behaviour | No prerequisite |
| 28 | Lifecycle | Unknown target status | `IS_KNOWN_STATUS` false; Batch 4 `BAD` status check | Rejected; unknown status not persisted | CAP unknown-status test | Rejected; status stays `CRT`; message text references `BAD` | Fully preserved behaviour | No prerequisite |
| 29 | Lifecycle | Missing order transition | `EXECUTE_TRANSITION` creates status error when read not found | No status/history; `STATUS` error | CAP missing-order transition test | `changed:false`, `STATUS` error text | Fully preserved behaviour | No prerequisite |
| 30 | StatusHistory | Initial CRT history | `RECORD_INITIAL_CRT_HISTORY`; Batch 4 scenario 1 | Creates sequence 1, old blank, new `CRT`, stage `CREATE` | CAP `recordInitialCreatedHistory`; lifecycle test | Same fields and sequence | Fully preserved behaviour | No prerequisite |
| 31 | StatusHistory | Duplicate initial history | EH3 loops existing initial history and creates `STATUS` error | No duplicate row; order remains `CRT` | CAP reads initial history and creates `STATUS` error | No duplicate row; ErrorRecord `100` | Fully preserved behaviour | No prerequisite |
| 32 | StatusHistory | Successful transition history | `BUILD_STATUS_HISTORY`; `CREATE_STATUS_HISTORY` | One row per transition with old/new status and reason | CAP inserts history inside transition transaction | One row per transition; service readback verified | Fully preserved behaviour | No prerequisite |
| 33 | StatusHistory | Sequence semantics | EH3 `MAX(sequence_no)+1` per order | Deterministic per-order sequence | CAP `#nextStatusHistorySequence` same approach | Deterministic `1,2,3` sequence in tests | Fully preserved behaviour | No prerequisite |
| 34 | StatusHistory | Timestamp and user semantics | EH3 uses `GET TIME STAMP` and `sy-uname` | Runtime user/time supplied by SAP session | CAP injects deterministic `now` and `changedBy` in tests; defaults use runtime date/user constants | Field meaning preserved, exact actor/time source intentionally differs for deterministic local evidence | Documented difference | Does not reduce local POC credibility; useful for repeatability |
| 35 | StatusHistory | Service readback | EH3 repo `READ_STATUS_HISTORY` orders by sequence | Readback returns ordered history | STR-135 projections; lifecycle/integrated tests read `ServiceOrderService.StatusHistory` | Ordered readback by service projection verified | Fully preserved behaviour | No prerequisite |
| 36 | ErrorRecords | Deterministic identifiers | EH3 `MAX(error_id)+1` padded NUMC10 | Sequential `0000000001...` IDs | CAP `#nextErrorId` in validation/responsibility/lifecycle | Same padded IDs in tests | Fully preserved behaviour | No prerequisite |
| 37 | ErrorRecords | Stage separation | EH3 uses `VALID`, `RESP`, `STATUS` stages; lifecycle status remains separate | Error evidence is not lifecycle status | CAP ErrorRecords use `processingStage`; lifecycle status remains on ServiceOrders | STR-140 integrated test reads `VALID`, `RESP`, `STATUS` rows | Fully preserved behaviour | No prerequisite |
| 38 | ErrorRecords | Optional order relation | EH3 DDIC `ORDER_ID not null`, but ABAP method accepts initial `IV_ORDER_ID` and stores character initial | Runtime can represent order-independent evidence through initial value | CAP models `ErrorRecords.order` nullable and smoke test persists null order | CAP-native null preserves runtime meaning rather than ABAP technical initial | Intentional deviation | No prerequisite |
| 39 | ErrorRecords | Persistence and service readback | EH3 `CREATE_ERROR` -> repo insert; `READ_ERROR_RECORDS` ordered by error ID | Error rows persisted and read back | STR-136 smoke and STR-140 integrated tests | Error rows persisted and read through `ServiceOrderService.ErrorRecords` | Fully preserved behaviour | No prerequisite |
| 40 | ErrorRecords | Resolved flag representation | EH3 uses `resolved_flag` char1, initial space | Unresolved evidence is blank char | CAP uses Boolean `resolved:false` | Same business meaning with CAP-native Boolean | Intentional deviation | No prerequisite |
| 41 | Transaction | Status update and history commit together | EH3 `EXECUTE_TRANSITION` updates order and inserts history in one method/LUW with no intermediate commit | Single logical unit of work expected | CAP `executeTransition` wraps update and history insert in one CAP transaction | Atomic success path and rollback tests pass | Fully preserved behaviour | No prerequisite |
| 42 | Transaction | Rollback when status update fails | EH3 source has no explicit failure-injection runtime report available | Expected by ABAP LUW, but not directly executed during STR-141 | CAP trigger test forces update failure and verifies no history/status change | CAP rollback evidence is stronger than inspected EH3 runtime evidence | Remaining modernization gap | Evidence gap only; no code prerequisite identified |
| 43 | Transaction | Rollback when history insert fails | EH3 source has no explicit failure-injection runtime report available | Expected by ABAP LUW, but not directly executed during STR-141 | CAP trigger test forces history insert failure and verifies status rollback | CAP rollback evidence is stronger than inspected EH3 runtime evidence | Remaining modernization gap | Evidence gap only; no code prerequisite identified |
| 44 | Deterministic reset | Reference/transaction row counts | EH3 seed inserts 4 companies, 4 service types, 7 assets, 7 rules, 3 company relationships; reset clears transactional tables | EH3 includes `ZEH3_CMPREL` outside approved CAP model | CAP CSV/reset validates 4/7/4/7/0/0/0 | CAP intentionally excludes `ZEH3_CMPREL`; allocation/posting out of scope | Documented difference | Does not block local MVP comparison; outside approved CAP persistence |
| 45 | Deterministic local operation | Full baseline tests before STR-140 integration | No EH3 equivalent local npm command | CAP-only validation operation | `validate-local.mjs` deletes `STR140_VALIDATE_LOCAL` for baseline phase, then enables it | Baseline tests fail first if STR-136..139 regress | Not applicable / outside MVP | CAP evidence operation only |
| 46 | Deterministic local operation | Reset-repeatability exactly once | No EH3 equivalent npm skip flag | CAP-only test runner concern | STR-140 test skip guard and `validate-local.mjs` second phase | Reset-repeatability skipped in baseline and run once in STR-140 phase | Not applicable / outside MVP | CAP evidence operation only |
| 47 | Deterministic local operation | Integrated rerun comparison | EH3 reports use ABAP harnesses by batch | CAP-only integration evidence command | `integrated-local-validation.test.ts` positive scenario runs twice and compares normalized summary | Repeatability proven locally | Not applicable / outside MVP | CAP evidence operation only |
| 48 | Read-only service | CAP OData readback boundary | EH3 has repository/report readback, not CAP OData service | No public OData service in EH3 MVP evidence | `srv/service-order-service.cds` `@readonly` projections | CAP exposes read-only projections for review evidence | Intentional deviation | CAP-native audit surface; no prerequisite |
| 49 | Outside MVP | Allocation | EH3 has constants/tables/repo reset/read helpers and Batch 6C no-allocation checks | No allocation behaviour in compared validation/responsibility/lifecycle scope | CAP excludes allocation model and tests assert none introduced | Outside approved CAP MVP | Not applicable / outside MVP | STR-142 not dependent on this batch |
| 50 | Outside MVP | Posting | EH3 has constants/tables/repo reset/read helpers and Batch 6C no-posting checks | No posting behaviour in compared scope | CAP excludes posting model and tests assert none introduced | Outside approved CAP MVP | Not applicable / outside MVP | No prerequisite |
| 51 | Outside MVP | Workflow | No workflow behaviour inspected in EH3 MVP classes/reports | Not part of frozen MVP comparison | No CAP workflow artifacts | Not implemented | Not applicable / outside MVP | No prerequisite |
| 52 | Outside MVP | Orchestration | EH3 batch reports call components directly; no orchestration layer inspected | Not part of frozen MVP comparison | CAP STR-140 coordinates only at test level | No production orchestration | Not applicable / outside MVP | No prerequisite |
| 53 | Outside MVP | UI | No UI inspected in EH3 MVP baseline | Not part of MVP | No CAP `app` UI content | Not implemented | Not applicable / outside MVP | No prerequisite |
| 54 | Outside MVP | Authentication/authorization | No production auth behaviour inspected in EH3 MVP evidence | Not part of MVP comparison | No CAP auth configuration | Not implemented | Not applicable / outside MVP | No prerequisite |
| 55 | Outside MVP | BTP/HANA/HDI deployment | EH3 is SAP source system; not deployment target for CAP STR-141 | STR-142 owns deployment evidence | No BTP/HANA/HDI artifacts | Not implemented | Not applicable / outside MVP | Architect decides STR-142 |
| 56 | Outside MVP | External SAP runtime integration | EH3 inspection uses ARC-1 only for audit | No CAP runtime integration expected | No external integration code | Not implemented | Not applicable / outside MVP | No prerequisite |
| 57 | Outside MVP | CI/CD | EH3 ABAP reports are manual/runtime evidence | No GitHub Actions expected | No `.github/workflows` | Not implemented | Not applicable / outside MVP | No prerequisite |
| 58 | Outside MVP | Production logging, performance/load, hardening | No production-hardening behaviour in MVP source evidence | Outside local POC comparison | No CAP production logging/perf harness | Not implemented | Not applicable / outside MVP | No prerequisite |

## 5. Classification Summary

| Classification | Count |
|---|---:|
| Fully preserved behaviour | 38 |
| Documented difference | 2 |
| Unsupported behaviour | 0 |
| Intentional deviation | 3 |
| Remaining modernization gap | 2 |
| Prerequisite that should be addressed before STR-142 | 0 |
| Not applicable / outside MVP | 13 |
| Total scenarios / behaviours compared | 58 |

## 6. Fully Preserved Behaviours

Strong evidence-backed matches:

- Validation preserves EH3 rule ordering, message numbers, `VALID` ErrorRecords, and no lifecycle/status-history mutation.
- Responsibility Determination preserves single-match, no-match, multiple-match, deterministic rule ordering, `RESP` ErrorRecord numbers `040/041`, and returned-only executing company.
- Lifecycle preserves `CRT -> RDY`, `CRT -> CAN`, `RDY -> CMP`, `RDY -> CAN`, invalid transition rejection, terminal statuses, same-status rejection, unknown target rejection, and missing-order status evidence.
- StatusHistory preserves initial CRT history, duplicate initial-history rejection, per-order `MAX(sequence)+1` sequencing, stage values, reason text, and readback.
- ErrorRecord evidence preserves deterministic numeric IDs, message ID `ZEH3_SVC_MSG`, stage separation, severity `E`, persistence, and service readback.
- Local reset preserves the approved CAP MVP row counts and empty transactional baseline after reset.

## 7. Documented Differences

### Timestamp And User Source

- EH3 reference: `ZCL_EH3SVC_STATUS->BUILD_STATUS_HISTORY` uses `GET TIME STAMP` and `sy-uname`; `ZCL_EH3SVC_ERROR_LOG->CREATE_ERROR` uses `GET TIME STAMP` and `sy-uname`.
- CAP reference: validation/responsibility/lifecycle components accept deterministic `now`, `createdBy`, and `changedBy` options in tests; defaults are batch-specific local actors.
- Observable difference: local CAP tests use deterministic actors such as `STR137`, `STR138`, `STR139`, `STR140` and fixed timestamps.
- Reason: deterministic local evidence and repeatable test output.
- POC credibility impact: positive. The field meaning is preserved while test evidence is stable.

### Reset Dataset Boundary

- EH3 reference: `ZCL_EH3SVC_SEED->INSERT_REFERENCE_DATA` also inserts `ZEH3_CMPREL`; `ZCL_EH3SVC_RESET->RESET_TX` also clears allocation/posting tables.
- CAP reference: `db/schema.cds`, `db/data/*`, `scripts/reset-local.mjs`.
- Observable difference: CAP reset validates 4 companies, 7 assets, 4 service types, 7 responsibility rules, and empty orders/history/errors. It excludes company relationship, allocation, and posting tables.
- Reason: approved STR-133 persistence boundary excluded allocation/posting/company-relationship concepts from the MVP CAP model.
- POC credibility impact: no impact on the compared validation, responsibility, lifecycle, StatusHistory, and ErrorRecord behaviours.

## 8. Unsupported Behaviours

No compared MVP behaviour was classified as unsupported.

The ABAP allocation/posting table scaffolding is not treated as unsupported CAP behaviour because allocation and posting are outside the approved STR-133 through STR-141 MVP boundary and no compared EH3 validation/responsibility/lifecycle scenario requires them.

## 9. Intentional Deviations

### CAP Nullable ErrorRecord Order

- EH3 DDIC marks `ZEH3_ORD_ERR-ORDER_ID` as `not null`, but `ZCL_EH3SVC_ERROR_LOG->CREATE_ERROR` accepts `IV_ORDER_ID` and can persist the ABAP character initial value.
- CAP models `ErrorRecords.order` as nullable and STR-136 smoke test persists an order-independent error.
- This is CAP-native preservation of EH3 runtime meaning, not mechanical copying of ABAP technical field encoding.

### CAP Boolean Resolved Flag

- EH3 uses `RESOLVED_FLAG : char1`, initial space for unresolved.
- CAP uses `resolved : Boolean`, with `false` for unresolved.
- This preserves the business meaning with CAP-native typing.

### CAP Read-Only OData Service

- EH3 uses ABAP repositories and reports for readback.
- CAP uses `ServiceOrderService` read-only projections to provide reviewable local evidence.
- This is a CAP-native audit/readback surface and does not introduce public write behaviour.

## 10. Remaining Modernization Gaps

Evidence gaps, not implemented behaviour gaps:

- EH3 rollback failure paths for status-update failure were not executed during STR-141 because no failure-injection report/runtime transcript was accessible. CAP has explicit trigger-based rollback evidence.
- EH3 rollback failure paths for StatusHistory insert failure were not executed during STR-141. CAP has explicit trigger-based rollback evidence.

Business behaviour gaps found in the compared MVP scope: none.

Production-readiness gaps remain outside STR-141:

- BTP/HANA/HDI deployment evidence.
- Production authentication/authorization.
- CI/CD.
- Performance/load testing.
- Production logging/monitoring/hardening.

## 11. Prerequisites Before STR-142

Evidence-based prerequisites identified by this audit: none.

This document does not recommend whether STR-142 should begin. The architect retains that decision.

## 12. Objective Local POC Assessment

What has been proven:

- CAP persistence and deterministic reset reproduce the approved MVP CAP data baseline derived from EH3 STR-126.
- CAP validation preserves inspected EH3 message ordering, `VALID` ErrorRecord evidence, and no lifecycle side effects.
- CAP Responsibility Determination preserves EH3 single/no/multiple rule semantics, deterministic rule ordering, `RESP` evidence, and returned-only executing company.
- CAP lifecycle preserves inspected EH3 transition matrix, including `CRT -> CAN`.
- CAP StatusHistory preserves initial-history, duplicate-history rejection, per-order sequence, and successful-transition evidence.
- CAP ErrorRecords remain separate from lifecycle status and readable through the approved service projection.
- `validate:local` now runs the full baseline before STR-140 integration and runs reset-repeatability exactly once.

What has not been proven:

- Production deployment behaviour.
- HANA/HDI runtime behaviour.
- Authenticated/authorized runtime behaviour.
- External SAP integration.
- Performance/load characteristics.
- Direct live EH3 table-row contents at STR-141 time due ARC-1 data-preview restriction.
- Direct EH3 failure-injection rollback runtime transcript.

Evidence quality:

- Strong for CAP: source, tests, reset output, and `validate:local` runtime output are all inspectable.
- Strong for EH3 source semantics: DDIC and class/report source were inspectable through ARC-1.
- Moderate for EH3 runtime evidence: report source and reported Batch 6C PASS result were available, but direct report execution/transcript and live table contents were not available through the current ARC-1 configuration.

Open questions:

- None requiring implementation or Enterprise Architecture change were identified in the compared MVP scope.

## 13. Validation Evidence

Pre-branch baseline validation from `main`:

```powershell
npm install
# passed; up to date; 0 vulnerabilities

npm run build
# passed

npm test
# passed; 19 tests, 18 passed, 1 skipped, 0 failed

npm run validate:local
# passed
# baseline phase: 19 tests, 18 passed, 1 skipped, 0 failed
# STR-140 phase: 3 tests, 3 passed, 0 skipped, 0 failed
# reset row counts: SyntheticCompanies 4, SyntheticAssets 7, ServiceTypes 4,
# ResponsibilityRules 7, ServiceOrders 0, StatusHistory 0, ErrorRecords 0
```

Final validation after preparing this evidence:

```powershell
npm run build
# passed

npm test
# passed; 19 tests, 18 passed, 1 skipped, 0 failed

npm run validate:local
# passed
# baseline phase: 19 tests, 18 passed, 1 skipped, 0 failed
# STR-140 phase: 3 tests, 3 passed, 0 skipped, 0 failed
# reset row counts: SyntheticCompanies 4, SyntheticAssets 7, ServiceTypes 4,
# ResponsibilityRules 7, ServiceOrders 0, StatusHistory 0, ErrorRecords 0

git diff --check
# passed

git status --short
# reviewed before commit
```

## 14. Scope Confirmation

- No CAP business behaviour changed.
- No production source was modified.
- No CDS model, seed/reset data, service definition, validation logic, Responsibility Determination logic, lifecycle logic, StatusHistory logic, ErrorRecord logic, or executing-company semantics were changed.
- No handlers, actions, functions, public APIs, BTP, HANA/HDI, deployment, CI/CD, UI, authentication, authorization, external integration, production logging, performance/load testing, production hardening, STR-142, or later-batch work was introduced.
- Enterprise Architecture remains unchanged.
- The architect retains the STR-142 decision.
