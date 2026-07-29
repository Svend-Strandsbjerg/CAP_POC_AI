# STR-139 — Batch 8 — CAP Lifecycle Transitions and Status History — Implementation Package

## 1. Objective

Implement only STR-139 / Batch 8 for the EH3 → CAP Conversion POC in repository `Svend-Strandsbjerg/CAP_POC_AI`.

The objective is to implement the minimum CAP-native lifecycle transition behaviour and persistent status-history evidence required by the frozen EH3 ABAP MVP baseline, after CAP validation and Responsibility Determination are approved, while preserving the approved separation between validation, Responsibility Determination, lifecycle status, status history, error/evidence records, allocation, posting, and orchestration.

STR-139 must implement controlled lifecycle transitions for the approved MVP lifecycle and persist status-history evidence for successful transitions. Updating the current lifecycle status and creating the corresponding StatusHistory entry must always occur atomically within the same database transaction. If either operation fails, the transaction must be rolled back so that no lifecycle status change is persisted, no partial StatusHistory is created, and the repository can never end up in an inconsistent lifecycle/history state. Invalid transitions must not update current lifecycle status and must produce controlled ErrorRecord evidence where required by the inspected EH3 baseline. STR-139 must not reimplement or change STR-137 validation, must not reimplement or change STR-138 Responsibility Determination, and must not allocate, post, orchestrate downstream process flow, introduce workflow, or introduce UI/auth/deployment/production concerns.

Codex must not require Linear access. This document is the complete standalone implementation contract and is the authoritative implementation specification for STR-139.

## 1.1 Package Governance Status

Quality review status: Reviewed and strengthened before Codex prompt creation.

This implementation package is a first-class project artifact. It must be:

- committed into the project documentation repository,
- attached to the STR-139 Linear task as the actual Markdown file,
- referenced from the STR-139 Linear description or comment,
- used as the authoritative implementation specification for STR-139.

Repository links or Linear comments are not sufficient by themselves. A reviewer must be able to open and download this complete Markdown package directly from the STR-139 Linear task.

## 1.2 Mandatory EH3 Baseline Inspection

Before implementation, Codex must inspect the completed STR-126 local MVP implementation in EH3 and treat that inspection as mandatory baseline discovery for lifecycle transition and status-history behaviour.

The source baseline for STR-139 lifecycle/status-history design is:

- System: EH3
- Client: 300
- Package: `$TMP`
- Source implementation: completed STR-126 local MVP implementation
- CAP persistence baseline: STR-133 / Batch 2 merged into `main`
- CAP deterministic data baseline: STR-134 / Batch 3 merged into `main`
- CAP read-only service baseline: STR-135 / Batch 4 merged into `main`
- CAP ErrorRecord infrastructure baseline: STR-136 / Batch 5 merged into `main`
- CAP validation baseline: STR-137 / Batch 6 merged into `main`
- CAP Responsibility Determination baseline: STR-138 / Batch 7 merged into `main`
- Difference rule: actual EH3 implementation overrides documentation if they differ; preserve EH3 and document the difference

Codex must inspect the actual EH3 STR-126 objects relevant to lifecycle and status history before implementation. At minimum, inspect the EH3 lifecycle ownership and evidence path, including the equivalent of:

- lifecycle/status component or method,
- current service-order status field semantics,
- status-history table structure and fields,
- initial status and history creation semantics,
- allowed MVP transitions,
- invalid transition handling,
- terminal status handling,
- duplicate initial-history handling,
- timestamp/user/sequence semantics where implemented,
- message/stage/key semantics for lifecycle errors,
- whether invalid transitions create persistent ErrorRecords,
- whether successful transitions create persistent StatusHistory rows,
- whether Ready transition depends on successful STR-137 validation, STR-138 Responsibility Determination, or explicitly already-satisfied preconditions,
- explicit separation from validation implementation changes,
- explicit separation from Responsibility Determination implementation changes,
- explicit separation from allocation, posting, workflow, and orchestration.

The completed EH3 STR-126 implementation is the authoritative technical baseline for STR-139. STR-139 must preserve the EH3 lifecycle/status-history meaning and comparison requirements while implementing CAP-native code and avoiding ABAP class/repository structure copying by default.

Where implementation details differ between documentation and the actual EH3 implementation, Codex must preserve the actual EH3 implementation as authoritative and document the difference. Documentation, Linear text, or prior package wording must not override the inspected EH3 technical baseline.

Codex remains independent of Linear access. Linear must not be used as an implementation input, validation source, or dependency.

## 2. Exact Scope

In scope:

- Work in the existing CAP repository `Svend-Strandsbjerg/CAP_POC_AI`.
- Start from `main` after PR #7 / STR-138 has been merged.
- Confirm STR-133 / Batch 2 is the approved CAP persistence baseline.
- Confirm STR-134 / Batch 3 is the approved CAP deterministic data baseline.
- Confirm STR-135 / Batch 4 is the approved CAP read-only service baseline.
- Confirm STR-136 / Batch 5 is the approved CAP persistent ErrorRecord foundation baseline.
- Confirm STR-137 / Batch 6 is the approved CAP validation baseline.
- Confirm STR-138 / Batch 7 is the approved CAP Responsibility Determination baseline.
- Implement CAP-native lifecycle transition behaviour for the MVP service-order lifecycle only.
- Implement allowed transitions from the approved MVP lifecycle and inspected EH3 baseline, expected: Created → Ready, Ready → Completed, Ready → Cancelled.
- Reject invalid lifecycle transitions deterministically.
- Persist StatusHistory rows for successful lifecycle transitions according to the inspected EH3 baseline and approved CAP model.
- Reuse approved STR-136 ErrorRecord infrastructure for controlled invalid-transition evidence where the inspected EH3 baseline requires it.
- Keep lifecycle transitions separate from validation, Responsibility Determination, allocation, posting, workflow, orchestration, UI, auth, deployment, and production concerns.
- Add automated tests for positive transitions, invalid transitions, terminal status behaviour, duplicate/initial-history behaviour where required by EH3, ErrorRecord evidence where applicable, and unchanged non-lifecycle business data.
- Document EH3 lifecycle/status-history comparison, implemented lifecycle scope, validation commands, and review evidence.
- Keep all implementation decisions inside this package; do not depend on Linear for scope, acceptance criteria, or architectural decisions.
- Introduce only approved Batch 8 scope; do not introduce any STR-140 / Batch 9 or later implementation.

Out of scope is everything beyond lifecycle transition/status-history behaviour and its direct local validation/evidence proof.

## 3. Prerequisites

Before making changes, Codex must verify:

- The current repository is `Svend-Strandsbjerg/CAP_POC_AI`.
- Work starts from `main` after PR #7 / STR-138 has been merged.
- STR-133 / Batch 2 is complete, approved, merged into `main`, and remains the approved CAP persistence baseline.
- STR-134 / Batch 3 is complete, approved, merged into `main`, and remains the approved CAP deterministic data baseline.
- STR-135 / Batch 4 is complete, approved, merged into `main`, and remains the approved CAP read-only service baseline.
- STR-136 / Batch 5 is complete, approved, merged into `main`, and remains the approved CAP persistent ErrorRecord foundation baseline.
- STR-137 / Batch 6 is complete, approved, merged into `main`, and remains the approved CAP validation baseline.
- STR-138 / Batch 7 is complete, approved, merged into `main`, and is now the approved CAP Responsibility Determination baseline.
- The approved Enterprise Architecture remains unchanged.
- Mandatory EH3 baseline inspection has been completed before implementation.
- The frozen source baseline is the completed STR-126 local MVP implementation in EH3 client 300 package `$TMP`.
- The STR-134 deterministic SQLite dataset is available locally through the approved reset command.
- The STR-137 validation baseline is available and validated locally.
- The STR-138 Responsibility Determination baseline is available and validated locally.
- The inspected EH3 baseline and existing CAP architecture make clear which lifecycle transitions are allowed, which are terminal, and how invalid transitions are handled.
- The inspected EH3 baseline and existing CAP architecture make clear whether Ready transition requires STR-137 validation, STR-138 Responsibility Determination, explicitly already-satisfied preconditions, or no additional runtime precondition.
- No STR-140 or later implementation has started.
- The working tree has no unrelated dirty changes.

Recommended prerequisite checks:

```bash
git remote -v
git status --short --branch
git checkout main
git pull --ff-only
git log --oneline -5
npm install
npm run build
npm test
npm run reset:local
npx cds compile db/schema.cds
npx cds compile srv/service-order-service.cds
npx cds compile srv/service-order-service.cds --to edmx
```

Use a short-lived branch, recommended:

```bash
git checkout -b str-139-lifecycle-transitions-status-history
```

Stop if repository state, baseline, branch, lifecycle/status rules, transition preconditions, status-history semantics, ErrorRecord evidence requirements, or EH3 inspection evidence is unclear.

## 4. Approved Enterprise Architecture Constraints and Embedded Decisions

STR-139 must follow the approved CAP MVP Enterprise Architecture:

- Runtime: CAP Node.js with TypeScript.
- Persistence: CAP-native, database-neutral CDS from STR-133.
- Local database: SQLite.
- Deterministic local dataset: STR-134 / Batch 3 baseline.
- Read-only service boundary: STR-135 / Batch 4 baseline.
- Persistent ErrorRecord infrastructure: STR-136 / Batch 5 baseline.
- Validation behaviour: STR-137 / Batch 6 baseline.
- Responsibility Determination behaviour: STR-138 / Batch 7 baseline.
- Future deployment database: SAP HANA Cloud with HDI Container, but no HANA/HDI artifacts in this batch.
- Development model: local-first.
- GitHub is the CAP source of truth.
- EH3 ABAP remains the frozen source baseline.
- CAP implementation must be CAP-native and must not copy ABAP repository/class structure by default.
- No UI, authentication, authorization, CI/CD, BTP deployment, HANA-specific artifacts, production logging, observability platform, external logging service, or production hardening.

The approved Enterprise Architecture remains unchanged by STR-139.

Embedded architectural decisions for STR-139:

1. **Lifecycle ownership is its own business responsibility.** STR-139 implements lifecycle transitions and StatusHistory only; it must not reimplement validation, reimplement Responsibility Determination, allocate, post, or orchestrate process flow.
2. **StatusHistory is lifecycle evidence, not error evidence.** Successful lifecycle transitions create StatusHistory according to EH3 semantics. Invalid transition evidence uses ErrorRecords only where EH3 requires it.
3. **ErrorRecords are not lifecycle statuses.** Error/evidence records must remain separate from current lifecycle status and StatusHistory.
4. **Validation and Responsibility Determination remain pre-existing baselines.** STR-139 must reuse, call, or depend on STR-137/STR-138 only where EH3 and existing CAP architecture require lifecycle preconditions; it must not change their semantics.
5. **Ready transition preconditions must be explicit.** If EH3 and the existing CAP architecture do not make clear whether Ready requires validation, Responsibility Determination, explicitly already-satisfied preconditions, or no additional runtime precondition, Codex must stop.
6. **Current status and StatusHistory must be atomic.** Updating the current lifecycle status and creating the corresponding StatusHistory entry must always occur within the same database transaction. If either operation fails, the transaction must be rolled back so no lifecycle status change is persisted, no partial StatusHistory is created, and the repository cannot end up in an inconsistent lifecycle/history state. This requirement is implementation-neutral and must not prescribe a specific transaction API or mechanism.
7. **Terminal and invalid transitions must be deterministic.** Transition decisions, invalid-transition feedback, ErrorRecord ordering, and status-history ordering must be deterministic where EH3 comparison requires it.
8. **Preserve approved persistence/service semantics.** STR-139 must not redesign STR-133 persistence, STR-134 deterministic data, STR-135 service semantics, STR-136 ErrorRecord infrastructure, STR-137 validation semantics, or STR-138 Responsibility Determination semantics unless a stop condition is reached.
9. **EH3 technical baseline is authoritative.** Preserve actual EH3 lifecycle/status-history meaning and document differences while keeping CAP-native implementation structure.
10. **No Linear dependency for Codex.** All required scope, constraints, commands, evidence, and stop conditions are embedded here.

## 5. Required Files

Use the existing CAP project conventions from STR-132 through STR-138. Follow the repository structure already established by the CAP implementation; do not force a new folder pattern if the repository has a clear convention.

Expected files may include:

```text
existing repository structure # one focused internal lifecycle/status component following project conventions
existing repository structure # reuse approved STR-136 ErrorRecord infrastructure when invalid-transition evidence is required; do not duplicate it
existing repository structure # reuse approved STR-137/STR-138 only as lifecycle preconditions where required; do not change them
test/*                        # automated lifecycle transition and status-history behaviour tests
docs/str-139-lifecycle-transitions-status-history.md
package.json                  # only if a minimal validation/test script is needed
```

Required documentation content, either in `docs/str-139-lifecycle-transitions-status-history.md` or the closest existing repository documentation location:

- EH3 baseline source inspected: system EH3, client 300, package `$TMP`, completed STR-126 local MVP implementation,
- actual EH3 lifecycle/status-history baseline facts and any documented differences,
- STR-133 persistence baseline used,
- STR-134 deterministic data baseline used,
- STR-135 read-only service baseline used,
- STR-136 ErrorRecord infrastructure baseline used,
- STR-137 validation baseline used,
- STR-138 Responsibility Determination baseline used,
- lifecycle/status component and why it owns lifecycle transitions only,
- allowed transition matrix and terminal-status semantics,
- status-history row semantics for successful transitions,
- atomic lifecycle/status-history transaction behaviour and rollback evidence,
- invalid transition scenarios tested,
- ErrorRecord evidence produced for invalid transitions where applicable,
- precondition approach for Ready transition and any other transition preconditions,
- validation commands used,
- confirmation that ErrorRecords are not lifecycle statuses,
- confirmation that STR-137 validation was not reimplemented or changed,
- confirmation that STR-138 Responsibility Determination was not reimplemented or changed,
- confirmation that allocation, posting, workflow, orchestration, UI, auth, BTP, HANA/HDI, CI/CD, logging platform, or later-batch scope was not introduced.

Do not create:

```text
app/* UI content
.github/workflows/*
mta.yaml
xs-security.json
xs-app.json
hdb/*
production logging or observability framework
external logging integration
external SAP integration code
public CAP action/function for arbitrary ErrorRecord creation
CLI utility, manual admin endpoint, or other production-facing mechanism for creating ErrorRecords
validation semantic changes
Responsibility Determination semantic changes
allocation logic
posting logic
workflow/orchestration logic
production authorization model
```

## 6. Lifecycle Transition and Status-History Requirements

The lifecycle transition behaviour must be intentionally small, deterministic, and reviewable.

Minimum requirements:

- Implement lifecycle transitions required by the inspected EH3 baseline and supported by the approved CAP model/dataset.
- Use only approved deterministic data from the STR-134 baseline unless a stop condition is raised.
- Treat STR-137 validation and STR-138 Responsibility Determination as approved baselines; reuse them only where EH3 lifecycle semantics require preconditions.
- Implement the approved MVP transition matrix, expected: Created → Ready, Ready → Completed, Ready → Cancelled.
- Reject invalid transitions deterministically.
- Preserve EH3 terminal-status behaviour where present.
- Preserve EH3 duplicate initial-history behaviour where present.
- Persist StatusHistory rows for successful transitions according to EH3 and approved CAP model semantics.
- Update current lifecycle status and create the corresponding StatusHistory entry atomically in the same database transaction.
- Roll back the transaction if either the current lifecycle status update or corresponding StatusHistory creation fails, ensuring no lifecycle status change is persisted, no partial StatusHistory is created, and no inconsistent lifecycle/history repository state can remain.
- Preserve EH3 message/stage/key meaning for persistent ErrorRecord evidence where invalid transitions require evidence.
- Use deterministic ordering for StatusHistory rows and lifecycle ErrorRecords where EH3 comparison requires deterministic ordering.
- Do not change validation semantics.
- Do not change Responsibility Determination semantics.
- Do not change executing-company semantics from STR-138; executing company remains returned only and not persisted unless a stop condition identifies an approved baseline conflict.
- Do not allocate, post, orchestrate, introduce workflow, introduce UI/auth/deployment/production logging, or begin STR-140 automated integrated validation scope.
- Document any difference between EH3 lifecycle/status-history semantics and the CAP implementation.

## 7. Implementation Sequence

1. Confirm STR-138 / PR #7 is merged into `main` and run baseline validation before changes.
2. Run the STR-134 local reset command so the deterministic SQLite dataset is available.
3. Inspect the completed STR-126 local MVP implementation in EH3 client 300 package `$TMP`, focusing on lifecycle ownership, current status semantics, StatusHistory persistence, allowed transitions, invalid transitions, terminal statuses, initial-history behaviour, ErrorRecord evidence, and separation from validation/responsibility/allocation/posting/orchestration.
4. Inspect the STR-133 model for status and StatusHistory fields available to lifecycle behaviour.
5. Inspect the STR-134 dataset for lifecycle-positive and lifecycle-negative scenarios.
6. Inspect the STR-137 validation baseline and avoid reimplementing or changing its semantics.
7. Inspect the STR-138 Responsibility Determination baseline and avoid reimplementing or changing its semantics.
8. Inspect EH3 and existing CAP architecture to determine lifecycle preconditions, especially for Created → Ready. Stop if unclear.
9. Inspect the STR-136 ErrorRecord infrastructure and reuse it when persistent invalid-transition evidence is required.
10. Design the smallest CAP-native lifecycle/status component following existing repository structure.
11. Implement only lifecycle transition and StatusHistory behaviour and the automated tests needed to prove it.
12. Add positive transition tests for approved transitions without allocation, posting, workflow, or orchestration.
13. Add negative transition tests for invalid, duplicate, terminal, or missing-precondition scenarios required by EH3.
14. Verify StatusHistory rows are created for successful transitions and readable through the STR-135 service/projection.
15. Verify current lifecycle status update and corresponding StatusHistory creation occur atomically within the same database transaction.
16. Verify rollback behaviour for lifecycle/status-history write failure scenarios so no lifecycle status change, partial StatusHistory, or inconsistent repository state remains.
17. Verify invalid-transition ErrorRecords are produced through STR-136 infrastructure where applicable and readable through the STR-135 service/projection.
18. Verify validation semantics, Responsibility Determination semantics, executing-company semantics, allocation, posting, and orchestration remain unchanged.
19. Document EH3 comparison, implementation decisions, validation evidence, atomicity/rollback evidence, and out-of-scope confirmations.
20. Run validation commands and capture evidence.
21. Open a STR-139-only PR and stop for review.

## 8. Acceptance Criteria

STR-139 is acceptable only when all of the following measurable checks are true:

- EH3 baseline inspection was completed before implementation and documented as source evidence.
- Work starts from `main` after PR #7 / STR-138 is merged.
- STR-138 / Batch 7 is confirmed as the approved CAP Responsibility Determination baseline.
- A focused CAP-native lifecycle/status component exists following existing repository structure.
- Approved lifecycle transitions succeed according to inspected EH3 and existing CAP architecture.
- StatusHistory rows are persisted for successful transitions according to inspected EH3 and approved CAP model semantics.
- Current lifecycle status update and corresponding StatusHistory creation occur atomically within the same database transaction.
- If either current lifecycle status update or corresponding StatusHistory creation fails, the transaction is rolled back so no lifecycle status change, partial StatusHistory, or inconsistent lifecycle/history repository state remains.
- Invalid, duplicate, terminal, missing-precondition, or unsupported transition scenarios required by EH3 are rejected deterministically.
- Persistent ErrorRecords are produced through STR-136 infrastructure where the inspected EH3 baseline requires invalid-transition evidence.
- Persisted lifecycle StatusHistory and ErrorRecords can be read back through the STR-135 service/projection where applicable.
- Lifecycle behaviour traces to the inspected EH3 baseline or documented baseline responsibilities.
- Validation semantics from STR-137 are unchanged and not reimplemented.
- Responsibility Determination semantics from STR-138 are unchanged and not reimplemented.
- Executing-company semantics from STR-138 remain returned only and not persisted.
- ErrorRecords are not used as lifecycle statuses.
- No allocation, posting, workflow, orchestration, UI, authentication, authorization, CI/CD, BTP deployment, HANA/HDI, external SAP integration, production logging/observability, or production-hardening scope is introduced.
- STR-133 persistence semantics, STR-134 data semantics, STR-135 service semantics, STR-136 ErrorRecord infrastructure semantics, STR-137 validation semantics, and STR-138 Responsibility Determination semantics remain unchanged.
- The approved Enterprise Architecture remains unchanged.

## 9. Validation Commands

Run the smallest meaningful local validation set available in the repository. Expected commands:

```bash
npm install
npm run build
npm test
npm run reset:local
npx cds compile db/schema.cds
npx cds compile srv/service-order-service.cds
npx cds compile srv/service-order-service.cds --to edmx
```

Run the repository's STR-139 lifecycle/status-history automated tests. The exact command must follow repository conventions and must be documented in evidence.

Read StatusHistory and ErrorRecords back through the approved STR-135 service/projection where applicable. Example endpoint shapes may differ by repository convention:

```bash
curl http://localhost:<port>/service-orders/StatusHistory
curl http://localhost:<port>/service-orders/ErrorRecords
```

Also inspect row counts or query output as needed to prove:

- expected current lifecycle status exists after successful transitions,
- expected StatusHistory rows exist after successful transitions,
- current lifecycle status update and corresponding StatusHistory creation are proven atomic,
- rollback proof shows failed lifecycle/status-history writes leave no lifecycle status change, no partial StatusHistory, and no inconsistent repository state,
- invalid transitions do not update current lifecycle status,
- expected ErrorRecords exist for invalid transitions where applicable,
- STR-137 validation semantics are unchanged and not reimplemented,
- STR-138 Responsibility Determination semantics are unchanged and not reimplemented,
- executing-company semantics remain returned only and not persisted,
- reset can restore the deterministic baseline after lifecycle tests.

Do not add a command merely to satisfy this document if an existing simpler repository command already validates the same thing.

## 10. Required Evidence

The PR or repository documentation must include:

- Branch name.
- Commit hash.
- Confirmation that STR-138 / PR #7 was the starting baseline and had been merged into `main`.
- Confirmation that STR-138 is the approved CAP Responsibility Determination baseline.
- Confirmation that EH3 baseline inspection was completed before implementation.
- EH3 source details: system EH3, client 300, package `$TMP`, completed STR-126 local MVP implementation.
- Confirmation that the actual EH3 implementation was treated as the authoritative technical baseline.
- Documented differences where repository documentation, Linear text, or package wording differed from inspected EH3 implementation, with EH3 preserved as authoritative.
- List of files changed.
- Lifecycle/status component location and responsibility.
- Allowed transition matrix implemented.
- Positive transition scenarios tested.
- Negative/invalid/duplicate/terminal/precondition scenarios tested where applicable.
- StatusHistory row evidence for successful transitions.
- Evidence that current lifecycle status update and corresponding StatusHistory creation occur atomically within the same database transaction.
- Rollback evidence proving that if either operation fails, no lifecycle status change, partial StatusHistory, or inconsistent lifecycle/history repository state remains.
- ErrorRecord evidence for invalid transitions where applicable.
- Readback evidence through the STR-135 service/projection for StatusHistory and ErrorRecords where applicable.
- Confirmation that ErrorRecords are not lifecycle statuses.
- Confirmation that STR-137 validation was not reimplemented or changed.
- Confirmation that STR-138 Responsibility Determination was not reimplemented or changed.
- Confirmation that executing-company semantics remain returned only and not persisted.
- Validation command output summary.
- Confirmation that no STR-140 or later scope was implemented.
- Confirmation that the approved Enterprise Architecture remains unchanged.

## 11. Review Checklist

Reviewer should confirm:

- Lifecycle transition behaviour is minimal, deterministic, and CAP-native.
- The actual EH3 STR-126 implementation was treated as the authoritative technical baseline, and any differences from documentation were preserved/documented.
- Lifecycle ownership is separate from validation, Responsibility Determination, allocation, posting, workflow, and orchestration.
- Allowed transitions and terminal-status behaviour match the inspected EH3 baseline and approved architecture.
- StatusHistory is created only as lifecycle evidence for successful transitions according to EH3 semantics.
- Current lifecycle status update and corresponding StatusHistory creation are atomic within the same database transaction.
- Failure of either lifecycle status update or StatusHistory creation rolls back both operations, leaving no lifecycle status change, partial StatusHistory, or inconsistent repository state.
- ErrorRecords are produced only as controlled invalid-transition evidence where applicable and are not lifecycle statuses.
- STR-137 validation was not reimplemented or changed.
- STR-138 Responsibility Determination was not reimplemented or changed.
- Executing-company semantics from STR-138 remain returned only and not persisted.
- Persisted StatusHistory and ErrorRecords can be read through the STR-135 service/projection where applicable.
- STR-133 remains the approved CAP persistence baseline.
- STR-134 remains the approved CAP deterministic data baseline.
- STR-135 remains the approved CAP read-only service baseline.
- STR-136 remains the approved CAP persistent ErrorRecord foundation baseline.
- STR-137 remains the approved CAP validation baseline.
- STR-138 remains the approved CAP Responsibility Determination baseline.
- No allocation, posting, workflow, orchestration, UI/auth/BTP/HANA/CI/CD/external integration/production logging scope was introduced.
- Approved Enterprise Architecture remains unchanged.

## 12. Explicit Out-of-Scope Items

- Validation semantic changes.
- Reimplementation of STR-137 validation.
- Responsibility Determination semantic changes.
- Reimplementation of STR-138 Responsibility Determination.
- Executing-company persistence changes.
- Allocation.
- Posting.
- Workflow.
- Orchestration.
- Event publishing.
- UI draft/state handling.
- Public CAP action/function for arbitrary ErrorRecord creation.
- CLI utilities, manual admin endpoints, or other production-facing mechanisms for creating ErrorRecords.
- New public write service operations beyond the minimum lifecycle transition behaviour approved for Batch 8.
- UI and app content.
- Authentication and authorization.
- CI/CD.
- BTP deployment.
- HANA/HDI artifacts.
- External SAP or EH3 runtime integration beyond the mandatory EH3 baseline inspection.
- Centralized production logging/observability.
- External logging services.
- Production audit framework.
- Production hardening.
- Changes to STR-133 persistence semantics.
- Changes to STR-134 seed/reset semantics or dataset content, unless a stop condition is raised.
- Changes to STR-135 read-only service semantics, unless a stop condition is raised.
- Changes to STR-136 ErrorRecord infrastructure semantics, unless a stop condition is raised.
- Changes to STR-137 validation semantics, unless a stop condition is raised.
- Changes to STR-138 Responsibility Determination semantics, unless a stop condition is raised.
- STR-140 automated integrated validation suite scope.
- Linear access or Linear updates by Codex.

## 13. Completion Criteria

STR-139 is complete when:

- Minimal CAP-native lifecycle transition behaviour is implemented.
- Approved positive transition scenarios update current lifecycle status as expected.
- Successful transitions create StatusHistory according to inspected EH3 semantics.
- Current lifecycle status update and corresponding StatusHistory creation are atomic within the same database transaction.
- Failure of either lifecycle status update or StatusHistory creation rolls back both operations, leaving no lifecycle status change, partial StatusHistory, or inconsistent lifecycle/history repository state.
- Negative/invalid/duplicate/terminal/precondition scenarios required by EH3 are handled deterministically.
- Lifecycle ErrorRecords are persisted through STR-136 infrastructure where applicable and readable through the STR-135 service/projection.
- StatusHistory is readable through the STR-135 service/projection.
- ErrorRecords remain separate from lifecycle status and StatusHistory.
- STR-137 validation semantics remain unchanged and not reimplemented.
- STR-138 Responsibility Determination semantics remain unchanged and not reimplemented.
- Executing-company semantics remain returned only and not persisted.
- Lifecycle transition behaviour documentation and evidence are committed.
- Validation commands pass or any limitation is explicitly documented.
- A reviewable STR-139-only PR exists.
- Review evidence confirms no later-batch scope was introduced.
- Codex stops after preparing STR-139 for review and does not begin STR-140.

## 14. Stop Conditions

Codex must stop and ask for human guidance if:

- STR-138 / PR #7 is not merged into `main`.
- STR-138 cannot be confirmed as the approved CAP Responsibility Determination baseline.
- The STR-133 persistence model, STR-134 dataset, STR-135 service boundary, STR-136 ErrorRecord infrastructure, STR-137 validation behaviour, or STR-138 Responsibility Determination behaviour appears inconsistent with this package.
- EH3 baseline inspection cannot be completed sufficiently to understand lifecycle transitions, current status semantics, status-history semantics, Ready preconditions, invalid-transition handling, terminal statuses, messages, ordering, evidence creation, and separation from validation/responsibility/allocation/posting/orchestration.
- Documentation, Linear text, or package wording conflicts with the inspected EH3 implementation and the difference cannot be preserved/documented within the approved Batch 8 scope.
- Required lifecycle statuses, allowed transitions, invalid transitions, terminal behaviour, preconditions, StatusHistory fields, atomic lifecycle/status-history transaction behaviour, evidence fields, deterministic ordering, or ErrorRecord semantics are unclear.
- The Ready transition precondition cannot be determined from EH3 and the existing CAP architecture.
- Lifecycle transitions cannot be implemented without changing the approved STR-133 persistence model.
- Lifecycle transitions require changing STR-137 validation semantics.
- Lifecycle transitions require changing STR-138 Responsibility Determination semantics.
- Lifecycle transitions require changing executing-company persistence/return semantics.
- Invalid-transition evidence cannot be produced through the approved STR-136 infrastructure where evidence is required.
- StatusHistory or lifecycle ErrorRecord readback cannot be performed through the approved STR-135 service/projection where evidence is required.
- Current lifecycle status update and corresponding StatusHistory creation cannot be made atomic within the same database transaction.
- Rollback cannot guarantee that failed lifecycle/status-history writes leave no lifecycle status change, no partial StatusHistory, and no inconsistent repository state.
- Lifecycle behaviour appears to require allocation, posting, workflow, orchestration, event publishing, UI state handling, or production authorization.
- A public generic ErrorRecord creation API, CLI utility, manual admin endpoint, or other production-facing creation mechanism appears necessary.
- Production logging, observability, audit, or external logging scope appears necessary.
- Any Enterprise Architecture change seems required.
- Any STR-140 or later scope is needed to make progress.
- The working tree contains unrelated changes that would be mixed into STR-139.
- Validation fails for reasons unrelated to STR-139 changes.
- The existing repository scripts make the documented validation commands incorrect or misleading.
- Any need arises for Linear access, Linear issue reads, or Linear updates during Codex implementation.
- Any required architectural decision is not already embedded in this document.
