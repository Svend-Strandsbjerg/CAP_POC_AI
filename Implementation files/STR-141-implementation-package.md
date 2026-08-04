# STR-141 — Batch 10 — ABAP-to-CAP Behavioural Comparison Evidence and Local POC Assessment — Implementation Package

## 1. Objective

Prepare and execute only STR-141 / Batch 10 for the EH3 → CAP Conversion POC in repository `Svend-Strandsbjerg/CAP_POC_AI`.

STR-141 is an ABAP ↔ CAP behavioural comparison batch. Its objective is to compare the completed local CAP implementation against the frozen EH3 STR-126 baseline and produce reviewable evidence that classifies observed behaviour as behaviours fully preserved, documented differences, unsupported behaviours, intentional deviations, remaining modernization gaps, and prerequisites that should be addressed before STR-142.

STR-141 is not another implementation batch. It must not add, change, or repair CAP business behaviour. It must not perform BTP deployment, CI/CD, production hardening, or production-readiness work.

Codex must not require Linear access. This document is the complete standalone implementation contract and is the authoritative implementation specification for STR-141.

Expected local repository root for Codex:

```text
C:\VSCode\sap-ai-test\CAP_POC_AI
```

Expected implementation package directory supplied to Codex:

```text
C:\VSCode\sap-ai-test\CAP_POC_AI\Implementation files
```

`Implementation files` is the implementation package directory, not the Git repository root. Codex must work in the repository root for Git/build/test operations and use only implementation-package and repository files explicitly present under the local repository root. Do not assume Codex can access external project governance files, Linear, Discord, OpenClaw workspace files, or this documentation repository unless they have been explicitly copied into `Implementation files`.

## 1.1 Package Governance Status

Quality review status: Prepared for STR-141 before implementation start; STR-141 remains in Backlog.

This implementation package is a first-class project artifact. It must be:

- committed into the project documentation repository,
- attached to the STR-141 Linear task as the actual Markdown file,
- referenced from the STR-141 Linear description or comment,
- used as the authoritative implementation specification for STR-141.

Repository links or Linear comments are not sufficient by themselves. A reviewer must be able to open and download this complete Markdown package directly from the STR-141 Linear task.

## 2. Exact Scope

In scope:

- Compare the completed local CAP implementation against the frozen EH3 STR-126 baseline.
- Use STR-140 as the CAP starting point; STR-140 is complete, Enterprise Architecture reviewed, and merged into `main` via PR #10 at final commit `21e6773876acd7afaf6ea650718cc461cbcf68a8`.
- Inspect completed CAP baselines STR-133 through STR-140 before writing comparison evidence.
- Inspect the frozen EH3 STR-126 baseline before making any comparison conclusions.
- Compare validation behaviour, Responsibility Determination, lifecycle transitions, StatusHistory behaviour, ErrorRecord/evidence behaviour, deterministic reset/readback assumptions, and executing-company semantics.
- Classify each compared behaviour as one of: fully preserved behaviour, documented difference, unsupported behaviour, intentional deviation, remaining modernization gap, prerequisite that should be addressed before STR-142, or not applicable/outside MVP.
- Produce reviewable comparison evidence and an objective local POC assessment.
- Present evidence for architect review; the architect decides whether STR-142 should begin.

Out of scope:

- New CAP business behaviour.
- Fixing CAP behaviour defects.
- Changing CDS model, seed data, service definitions, validation semantics, Responsibility Determination semantics, lifecycle semantics, StatusHistory semantics, ErrorRecord semantics, or executing-company semantics.
- Deployment, BTP work, HANA/HDI artifacts, CI/CD, GitHub Actions, authentication/authorization, production hardening, load/performance testing, UI, external SAP integration, production monitoring, or customer pilot recommendation.
- Creating Linear defects automatically.
- Creating a Codex prompt beyond this implementation package.

## 3. Prerequisites

Before making changes, Codex must verify:

- The current local repository root is `C:\VSCode\sap-ai-test\CAP_POC_AI` and the implementation package directory is `C:\VSCode\sap-ai-test\CAP_POC_AI\Implementation files`.
- Work starts from `main` after STR-140 PR #10 has been merged.
- The latest STR-140 final commit is `21e6773876acd7afaf6ea650718cc461cbcf68a8` or a later `main` commit that contains it.
- STR-133 / Batch 2 is complete, approved, merged into `main`, and remains the approved CAP persistence baseline.
- STR-134 / Batch 3 is complete, approved, merged into `main`, and remains the approved CAP deterministic data baseline.
- STR-135 / Batch 4 is complete, approved, merged into `main`, and remains the approved CAP read-only service baseline.
- STR-136 / Batch 5 is complete, approved, merged into `main`, and remains the approved CAP persistent ErrorRecord foundation baseline.
- STR-137 / Batch 6 is complete, approved, merged into `main`, and remains the approved CAP validation baseline.
- STR-138 / Batch 7 is complete, approved, merged into `main`, and remains the approved CAP Responsibility Determination baseline.
- STR-139 / Batch 8 is complete, approved, merged into `main`, and remains the approved CAP Lifecycle and StatusHistory baseline.
- STR-140 / Batch 9 is complete, approved, merged into `main`, and remains the approved CAP automated local behaviour validation baseline.
- `validate:local` executes the complete baseline `npm test` suite before STR-140-specific validation.
- STR-136 through STR-139 regressions fail `validate:local`.
- Reset-repeatability runs exactly once.
- `STR140_VALIDATE_LOCAL` is removed from the baseline environment and enabled only for the STR-140 phase.
- The approved Enterprise Architecture remains unchanged.
- No STR-142 or later implementation has started.
- The working tree has no unrelated dirty changes.

Recommended prerequisite checks:

```bash
git remote -v
git status --short --branch
git checkout main
git pull --ff-only
git log --oneline -12
git branch --contains 21e6773876acd7afaf6ea650718cc461cbcf68a8
npm install
npm run build
npm test
npm run validate:local
```

Use a short-lived branch, recommended:

```bash
git checkout -b str-141-abap-cap-behaviour-comparison
```

Stop if repository state, baseline availability, branch state, STR-140 merge evidence, EH3 inspection access, comparison evidence, or scope boundary is unclear.

## 4. Mandatory EH3 Inspection

Codex must inspect the actual completed STR-126 local MVP implementation in EH3 before producing comparison conclusions.

The source baseline is:

- System: EH3
- Client: 300
- Package: `$TMP`
- Source implementation: completed STR-126 local MVP implementation
- Baseline name: `EH3 ABAP MVP Source Baseline V1.0`
- Runtime evidence: Batch 6C, 91 checks, 91 passed, 0 failed, PASS

At minimum, inspect or confirm the equivalent of:

- validation scenarios, positive and negative validation outcomes, and negative validation evidence,
- Responsibility Determination scenarios, no-match and multiple-match outcomes, and responsibility error evidence,
- lifecycle transition matrix, including `CRT → CAN`, `CRT → RDY`, `RDY → CMP`, and `RDY → CAN`,
- current lifecycle status update semantics,
- StatusHistory semantics, including initial `CRT` history and duplicate initial-history handling,
- invalid transition behaviour and STATUS ErrorRecord evidence,
- atomic lifecycle/status-history persistence and rollback expectations,
- deterministic seed/reset expectations,
- deterministic ordering expectations for ErrorRecords and StatusHistory,
- executing-company semantics: returned only and not persisted,
- explicit absence of allocation, posting, workflow, orchestration, UI, production auth, BTP deployment, and external SAP integration in the frozen MVP baseline.

Actual EH3 behaviour overrides secondary documentation if they differ. Any difference between durable documentation and inspected EH3 behaviour must be recorded as a documented source-baseline difference, not silently resolved.

## 5. Comparison Methodology

Use evidence-based comparison only. Do not infer matching behaviour from similar code names or structural resemblance.

For each preserved behaviour:

1. Identify the EH3 source behaviour and evidence reference.
2. Identify the CAP behaviour and evidence reference, starting from STR-140 `validate:local` evidence.
3. Compare observable inputs, outputs, persistence effects, evidence records, ordering, and failure semantics.
4. Classify the comparison result as one of:
   - Fully preserved behaviour.
   - Documented difference.
   - Unsupported behaviour.
   - Intentional deviation.
   - Remaining modernization gap.
   - Prerequisite that should be addressed before STR-142.
   - Not applicable / outside MVP.
5. Record objective evidence for the classification and any effect on local POC evidence quality.
6. Record any prerequisite that should be addressed before STR-142, without recommending whether STR-142 should begin.

The comparison must cover both positive and negative scenarios. It must distinguish business behaviour gaps from production-readiness gaps.

## 6. Approved Enterprise Architecture Constraints

STR-141 must follow the approved CAP MVP Enterprise Architecture:

- Runtime: CAP Node.js with TypeScript.
- Persistence: CAP-native, database-neutral CDS from STR-133.
- Local database: SQLite.
- Deterministic local dataset: STR-134 / Batch 3 baseline.
- Read-only service boundary: STR-135 / Batch 4 baseline.
- Persistent ErrorRecord infrastructure: STR-136 / Batch 5 baseline.
- Validation behaviour: STR-137 / Batch 6 baseline.
- Responsibility Determination behaviour: STR-138 / Batch 7 baseline.
- Lifecycle and StatusHistory behaviour: STR-139 / Batch 8 baseline.
- Automated local behaviour validation: STR-140 / Batch 9 baseline.
- Future deployment database: SAP HANA Cloud with HDI Container, but no HANA/HDI artifacts in this batch.
- Development model: local-first.
- GitHub is the CAP source of truth.
- EH3 ABAP remains the frozen source baseline.
- CAP implementation is CAP-native and must not copy ABAP repository/class structure by default.
- No UI, authentication, authorization, CI/CD, BTP deployment, HANA-specific artifacts, production logging, observability platform, external logging service, production monitoring, load testing, or production hardening.

The approved Enterprise Architecture must remain unchanged by STR-141.

## 7. Required Files

Follow existing repository conventions. Expected files may include:

```text
docs/str-141-abap-cap-comparison.md       # required comparison evidence and objective local POC assessment
test/*                                    # only if a small evidence harness is needed to rerun existing behaviours
package.json                              # only if an existing script convention requires a minimal comparison/evidence command
```

Required documentation/evidence content:

- repository root used,
- implementation package directory used,
- branch name and commit hash,
- confirmation that STR-140 PR #10 / commit `21e6773876acd7afaf6ea650718cc461cbcf68a8` was the starting baseline,
- EH3 inspection date/source/object references,
- CAP baseline references STR-133 through STR-140,
- comparison matrix,
- classification summary,
- objective local POC assessment,
- behaviours fully preserved,
- documented differences,
- unsupported behaviours,
- intentional deviations,
- remaining modernization gaps,
- prerequisites that should be addressed before STR-142,
- validation command output summary.

## 8. Implementation Sequence

1. Verify repository, branch, and STR-140 merged baseline.
2. Run baseline CAP validation commands.
3. Inspect completed CAP baselines STR-133 through STR-140 and identify available evidence.
4. Inspect the frozen EH3 STR-126 baseline and runtime evidence.
5. Create the comparison matrix structure before filling conclusions.
6. Populate EH3 evidence references for each preserved behaviour.
7. Populate CAP evidence references for each preserved behaviour.
8. Compare observable behaviour and classify each result.
9. Record documented differences, unsupported behaviours, intentional deviations, and modernization gaps.
10. Produce the objective local POC assessment, including behaviours fully preserved, documented differences, unsupported behaviours, intentional deviations, remaining modernization gaps, and prerequisites that should be addressed before STR-142.
11. Run final validation commands.
12. Review changed files and confirm no CAP business behaviour changed.
13. Commit only STR-141 comparison/evidence package changes.

## 9. Acceptance Criteria

STR-141 is acceptable only if:

- It starts from STR-140 complete and merged into `main`.
- EH3 STR-126 inspection is completed and documented.
- CAP baseline inspection STR-133 through STR-140 is completed and documented.
- Every preserved MVP behaviour has an EH3 evidence reference and CAP evidence reference or a documented reason why comparison is not applicable.
- Validation behaviour comparison is complete.
- Responsibility Determination comparison is complete.
- Lifecycle transition comparison is complete, including `CRT → CAN`.
- StatusHistory comparison is complete.
- ErrorRecord/evidence comparison is complete.
- Executing-company returned-only/not-persisted semantics are compared.
- Deterministic reset/readback assumptions are compared where relevant.
- All comparison results are classified.
- The objective assessment lists behaviours fully preserved, documented differences, unsupported behaviours, intentional deviations, remaining modernization gaps, and prerequisites that should be addressed before STR-142.
- The package leaves the STR-142 start decision to the architect.
- No CAP business behaviour is added or changed.
- No BTP, deployment, CI/CD, or production-hardening work is introduced.
- The approved Enterprise Architecture remains unchanged.
- Reviewable evidence is committed.

## 10. Validation Commands

Run the repository's normal validation commands after comparison evidence is prepared:

```bash
npm run build
npm test
npm run validate:local
git diff --check
git status --short
```

If a dedicated documentation lint/check command already exists, run it as well. Do not add a new CI/CD pipeline.

## 11. Required Evidence

Codex must provide evidence for:

- Git branch and starting commit.
- STR-140 PR #10 / final commit presence in `main`.
- EH3 inspection completed against client 300 package `$TMP`.
- CAP baseline inspection completed for STR-133 through STR-140.
- `npm run build` result.
- `npm test` result.
- `npm run validate:local` result.
- Comparison matrix location.
- Counts by classification: fully preserved behaviour, documented difference, unsupported behaviour, intentional deviation, remaining modernization gap, prerequisite before STR-142, not applicable/outside MVP.
- Objective local POC assessment containing behaviours fully preserved, documented differences, unsupported behaviours, intentional deviations, remaining modernization gaps, and prerequisites that should be addressed before STR-142.
- Confirmation that no CAP business behaviour changed.
- Confirmation that Enterprise Architecture remains unchanged.

## 12. Review Checklist

Reviewer must confirm:

- STR-141 is comparison only, not implementation.
- EH3 evidence is based on the frozen STR-126 baseline.
- CAP evidence starts from completed STR-140.
- Behaviour comparison is observable and evidence-based.
- Differences are documented rather than hidden.
- Unsupported behaviour and remaining modernization gaps are explicit.
- Intentional deviations are justified and traceable.
- The objective assessment presents evidence for architect review and does not recommend whether STR-142 should begin.
- No new CAP business behaviour, BTP work, CI/CD, deployment, or production hardening was introduced.
- Enterprise Architecture remains unchanged.

## 13. Explicit Out-of-Scope Items

- New CAP business behaviour.
- Defect fixes or remediation implementation.
- New domain entities, fields, services, handlers, actions, functions, or production scripts.
- BTP deployment.
- HANA/HDI artifacts.
- CI/CD or GitHub Actions.
- Authentication or authorization.
- UI.
- External SAP integration.
- Performance/load testing.
- Production monitoring/logging/observability platform work.
- Production hardening.
- Customer pilot recommendation.
- Automatic Linear issue creation.
- STR-142 implementation.

## 14. Completion Criteria

STR-141 can be marked complete only when:

- Comparison evidence is committed.
- EH3 inspection evidence is documented.
- CAP baseline evidence STR-133 through STR-140 is documented.
- Comparison classifications are complete.
- Objective local POC assessment is complete.
- Behaviours fully preserved, documented differences, unsupported behaviours, intentional deviations, remaining modernization gaps, and prerequisites that should be addressed before STR-142 are explicit.
- Validation commands have passed or any limitation is explicitly documented.
- No CAP business behaviour changed.
- Enterprise Architecture remains unchanged.
- Human/architect review has accepted the comparison evidence.

## 15. Stop Conditions

Stop immediately and ask for human/architect guidance if:

- STR-140 PR #10 / commit `21e6773876acd7afaf6ea650718cc461cbcf68a8` is not present in the starting `main` baseline.
- EH3 STR-126 baseline cannot be inspected or evidence is unavailable.
- CAP baseline evidence STR-133 through STR-140 cannot be inspected.
- Comparison reveals a CAP behaviour defect that would require implementation changes.
- A classification cannot be made without architectural judgement.
- A documented difference appears to change the approved Enterprise Architecture.
- Validation fails for reasons unrelated to STR-141 evidence work.
- Any required comparison would require new CAP business behaviour, deployment, BTP, CI/CD, production hardening, credentials, external approval, or Linear access.
