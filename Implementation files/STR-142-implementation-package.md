# STR-142 — Batch 11 — First BTP Deployment Validation — Implementation Package

## 1. Objective

Prepare and execute only STR-142 / Batch 11 for the EH3 → CAP Conversion POC in repository `Svend-Strandsbjerg/CAP_POC_AI`.

STR-142 is the first SAP BTP deployment validation batch. Its objective is to deploy the already approved CAP implementation exactly as it exists and prove that the completed CAP MVP, already validated locally through STR-141, can be deployed and executed on SAP BTP Cloud Foundry with SAP HANA Cloud / HDI while preserving the approved behaviour already validated locally.

Deployment validation must verify that the approved application can run on SAP BTP. Deployment work must not become an opportunity to redesign or improve the CAP application. If deployment issues are encountered, they should be solved through deployment configuration wherever possible, not by changing approved business behaviour. Deployment configuration takes precedence over CAP redesign.

STR-142 is not a business-functionality batch. It must not add new CAP business behaviour, functional enhancements, validation logic, Responsibility Determination changes, lifecycle changes, production hardening, customer rollout scope, monitoring platform work, or performance optimisation. Codex must not refactor production code merely to simplify deployment.

Codex must not require Linear access. This document is the complete standalone implementation contract and is the authoritative implementation specification for STR-142.

Expected local repository root for Codex:

```text
C:\VSCode\sap-ai-test\CAP_POC_AI
```

Expected implementation package directory supplied to Codex:

```text
C:\VSCode\sap-ai-test\CAP_POC_AI\Implementation files
```

`Implementation files` is the implementation package directory, not the Git repository root. Codex must work in the repository root for Git/build/test/deployment operations and use only implementation-package and repository files explicitly present under the local repository root. Do not assume Codex can access external project governance files, Linear, Discord, OpenClaw workspace files, or this documentation repository unless they have been explicitly copied into `Implementation files`.

## 1.1 Package Governance Status

Quality review status: Prepared for STR-142 before implementation start; STR-142 remains in Backlog.

This implementation package is a first-class project artifact. It must be:

- committed into the project documentation repository,
- attached to the STR-142 Linear task as the actual Markdown file,
- referenced from the STR-142 Linear description or comment,
- used as the authoritative implementation specification for STR-142.

Repository links or Linear comments are not sufficient by themselves. A reviewer must be able to open and download this complete Markdown package directly from the STR-142 Linear task.

## 2. Exact Scope

In scope:

- Start from `main` after STR-141 / PR #11 has been merged.
- Use STR-141 final implementation commit `ecbdc2b90913393c8cbad01c3d42e327ba702bd6` or a later `main` commit that contains it as the completed local CAP MVP baseline.
- Inspect completed CAP baselines STR-133 through STR-141 before making deployment changes.
- Preserve approved behaviour validated locally by STR-141.
- Prepare minimal BTP deployment configuration needed for SAP BTP Cloud Foundry.
- Prepare HANA Cloud / HDI deployment configuration required to move persistence from local SQLite to SAP HANA Cloud / HDI for deployed validation.
- Deploy manually to SAP BTP Cloud Foundry if BTP prerequisites, credentials, entitlement, org/space, HANA Cloud, and HDI permissions are available.
- Run deployment smoke validation and runtime verification against the deployed application.
- Run or adapt existing local validation commands only as needed to prove deployment did not change approved behaviour.
- Make a minimal deployed-authentication decision only if required for deployed validation and simple to configure.
- Produce deployment evidence, runtime evidence, and blocker evidence if the target BTP environment is unavailable or insufficient.

Out of scope:

- New CAP business behaviour.
- Functional enhancements.
- New validation logic.
- Responsibility Determination changes.
- Lifecycle or StatusHistory changes.
- ErrorRecord semantics changes.
- New domain entities, fields, services, handlers, actions, functions, or business rules.
- Production hardening.
- Customer rollout.
- Monitoring platform or observability platform implementation.
- Performance optimisation or load testing.
- CI/CD, GitHub Actions, automated release pipeline, or production deployment automation.
- Production authorization model, roles, scopes, user-management model, or attribute-based access control.
- External SAP / S/4 / ECC integration.
- UI.
- Multitenancy, high availability, backup/restore design, disaster recovery, or production operations model.
- Creating a Codex prompt beyond this implementation package.

## 3. Prerequisites

Before making changes, Codex must verify:

- The current local repository root is `C:\VSCode\sap-ai-test\CAP_POC_AI` and the implementation package directory is `C:\VSCode\sap-ai-test\CAP_POC_AI\Implementation files`.
- Work starts from `main` after STR-141 PR #11 has been merged.
- The latest STR-141 final implementation commit is `ecbdc2b90913393c8cbad01c3d42e327ba702bd6` or a later `main` commit that contains it.
- STR-133 / Batch 2 is complete, approved, merged into `main`, and remains the approved CAP persistence baseline.
- STR-134 / Batch 3 is complete, approved, merged into `main`, and remains the approved CAP deterministic data baseline.
- STR-135 / Batch 4 is complete, approved, merged into `main`, and remains the approved CAP read-only service baseline.
- STR-136 / Batch 5 is complete, approved, merged into `main`, and remains the approved CAP persistent ErrorRecord foundation baseline.
- STR-137 / Batch 6 is complete, approved, merged into `main`, and remains the approved CAP validation baseline.
- STR-138 / Batch 7 is complete, approved, merged into `main`, and remains the approved CAP Responsibility Determination baseline.
- STR-139 / Batch 8 is complete, approved, merged into `main`, and remains the approved CAP Lifecycle and StatusHistory baseline.
- STR-140 / Batch 9 is complete, approved, merged into `main`, and remains the approved CAP automated local behaviour validation baseline.
- STR-141 / Batch 10 is complete, approved, merged into `main`, and remains the approved ABAP-to-CAP comparison evidence baseline.
- STR-141 final evidence recorded: 58 behaviours/scenarios compared, 38 fully preserved behaviours, 2 documented differences, 3 intentional CAP-native deviations, 0 unsupported behaviours, 2 remaining evidence gaps, 0 prerequisites identified before STR-142.
- No CAP business behaviour changed in STR-141.
- The approved Enterprise Architecture remains unchanged.
- The working tree has no unrelated dirty changes.

Recommended prerequisite checks:

```bash
git remote -v
git status --short --branch
git checkout main
git pull --ff-only
git log --oneline -15
git branch --contains ecbdc2b90913393c8cbad01c3d42e327ba702bd6
npm install
npm run build
npm test
npm run validate:local
```

Use a short-lived branch, recommended:

```bash
git checkout -b str-142-btp-deployment-validation
```

Stop if repository state, baseline availability, branch state, STR-141 merge evidence, BTP environment readiness, credentials, permissions, deployment target, HANA/HDI availability, or scope boundary is unclear.

## 4. BTP Prerequisites

STR-142 may proceed only if the target SAP BTP environment is available and authorized for this POC.

Required BTP prerequisites:

- SAP BTP subaccount identified for the POC.
- Cloud Foundry enabled in the subaccount.
- Cloud Foundry org and space identified.
- User has permission to log in, create/push applications, bind services, and view logs in the target org/space.
- SAP HANA Cloud instance available or explicitly approved for creation/use.
- HDI container service/plan available in the target space.
- Required service entitlements available for Cloud Foundry application runtime and HANA/HDI.
- `cf` CLI installed and authenticated.
- CAP deployment dependencies available for HANA/HDI deployment.
- No production/customer tenant is used unless explicitly approved for this POC.
- Credentials are handled through normal BTP/Cloud Foundry mechanisms and must not be committed.

Recommended BTP readiness checks:

```bash
cf version
cf api
cf login
cf target
cf orgs
cf spaces
cf marketplace
cf services
```

If any prerequisite is missing, STR-142 must produce a concrete blocker record instead of inventing or bypassing environment setup.

## 5. Deployment Architecture

STR-142 must follow the approved CAP MVP deployment architecture:

- Runtime: CAP Node.js with TypeScript on SAP BTP Cloud Foundry.
- Local development persistence remains SQLite.
- Deployed persistence uses SAP HANA Cloud with an HDI Container.
- Deployment is manual for the MVP POC.
- No CI/CD pipeline is introduced.
- Minimal authentication is used only if required for deployed validation and simple to configure.
- No production authorization model is created.
- No UI is introduced.
- No external SAP integration is introduced.
- GitHub `main` remains the CAP source of truth.
- EH3 ABAP remains the frozen source baseline; STR-142 does not re-open ABAP behaviour scope.

The deployment should be the minimum technical proof that the completed CAP MVP can run on SAP BTP with HANA/HDI-backed persistence while preserving the approved behaviour validated locally.

## 6. Approved Enterprise Architecture Constraints

STR-142 must follow the approved CAP MVP Enterprise Architecture:

- CAP Node.js with TypeScript.
- Local-first development.
- Manual SAP BTP Cloud Foundry deployment at the end of the POC.
- SQLite for local development.
- SAP HANA Cloud with HDI Container for BTP deployment.
- Database-neutral model preserved.
- No authentication during local development.
- Minimal authentication only for deployed BTP validation, if simple to configure.
- No production authorization model.
- Dedicated GitHub repository for CAP implementation.
- Standard CAP project structure.
- Feature branches with Pull Requests.
- `main` as the approved CAP baseline.
- GitHub as source of truth for the CAP implementation.
- Use only minimum SAP BTP services required for the POC: Cloud Foundry, SAP HANA Cloud, HDI Container, and minimal authentication if needed.
- No additional BTP services unless a concrete blocker proves they are necessary and the architect approves.
- No UI in the CAP MVP.
- Validate through services, tests, and evidence.
- Approved local business behaviour from STR-141 must be preserved.
- Deployment configuration takes precedence over CAP redesign.
- Codex must deploy the already approved CAP implementation exactly as it exists and must not refactor production code merely to simplify deployment.
- Codex must not change CDS model, persistence semantics, service boundaries, validation, Responsibility Determination, lifecycle, StatusHistory, ErrorRecord behaviour, or executing-company semantics unless an explicit Enterprise Architecture decision is required.
- If deployment cannot succeed without changing approved behaviour, Codex must stop and document the blocker rather than implementing a workaround.

The approved Enterprise Architecture must remain unchanged by STR-142.

## 7. Required Files

Follow existing repository conventions. Expected files may include:

```text
mta.yaml                                  # only if needed for manual BTP / MTA deployment
manifest.yml                             # only if the repository uses manifest-based Cloud Foundry deployment
package.json                             # only for existing script conventions or deployment scripts required by CAP
.cdsrc.json / cds configuration files     # only if needed for HANA profile/configuration
xs-security.json                         # only if minimal authentication is required and approved for deployed validation
db/                                      # only database-neutral CDS / HDI generation support; no business model expansion
docs/str-142-btp-deployment-validation.md # required deployment evidence and runtime verification report
```

Do not add files for CI/CD, production monitoring, production authorization, customer rollout, load testing, or unrelated platform services.

Required documentation/evidence content:

- repository root used,
- implementation package directory used,
- branch name and commit hash,
- confirmation that STR-141 PR #11 / commit `ecbdc2b90913393c8cbad01c3d42e327ba702bd6` was the starting baseline,
- CAP baseline references STR-133 through STR-141,
- BTP org/space target used, excluding secrets,
- HANA/HDI service binding evidence, excluding secrets,
- deployment command summary,
- runtime verification summary,
- validation command output summary,
- confirmation that approved local behaviour was preserved or blocker evidence if runtime validation could not complete,
- confirmation that no CAP business behaviour changed,
- confirmation that Enterprise Architecture remains unchanged.

## 8. Implementation Sequence

1. Verify repository, branch, and STR-141 merged baseline.
2. Inspect STR-133 through STR-141 evidence and implementation outputs before making any deployment changes.
3. Run baseline local validation from `main` before deployment changes:
   - `npm run build`
   - `npm test`
   - `npm run validate:local`
4. Confirm BTP readiness: target API, org, space, services, HANA/HDI availability, and permissions.
5. Create the short-lived STR-142 branch.
6. Prepare minimal deployment configuration for Cloud Foundry, treating deployment configuration as the preferred solution path over CAP redesign.
7. Prepare HANA/HDI configuration required for deployed persistence while preserving database-neutral modelling and without changing CDS model or persistence semantics.
8. Keep local SQLite configuration working and keep the approved CAP implementation behaviour exactly as it exists.
9. Decide whether minimal deployed authentication is required for validation:
   - if not required, document why deployed validation can proceed without it;
   - if required and simple, configure the smallest authentication setup needed for deployed validation only;
   - if required but not simple or not approved, stop and document the blocker.
10. Build and package the CAP application for BTP deployment.
11. Deploy manually to Cloud Foundry.
12. Bind the application to HANA/HDI.
13. Run deployed runtime smoke verification.
14. Run behaviour-preservation verification that is feasible in the deployed environment without adding new business behaviour or refactoring production code merely to simplify deployment.
15. If deployment cannot succeed without changing approved behaviour, stop and document the blocker rather than implementing a workaround.
16. Record deployment evidence in `docs/str-142-btp-deployment-validation.md`.
17. Run final local validation and diff checks.
18. Commit only STR-142 deployment-validation changes.
19. Prepare review notes for Enterprise Architecture review.

## 9. Acceptance Criteria

STR-142 is acceptable only if:

- Work starts from STR-141 complete and merged into `main`.
- STR-133 through STR-141 baselines are inspected before deployment changes.
- The application is deployed to SAP BTP Cloud Foundry, or a concrete BTP environment blocker is documented.
- HANA/HDI persistence is configured and validated, or a concrete HANA/HDI blocker is documented.
- Local SQLite development support remains intact.
- Approved behaviour validated locally through STR-141 remains unchanged.
- The already approved CAP implementation is deployed exactly as it exists, with deployment issues solved through deployment configuration wherever possible.
- Runtime smoke verification runs against the deployed application when deployment succeeds.
- Deployment evidence is documented.
- No new CAP business behaviour is introduced.
- No CDS model, persistence semantics, service boundaries, validation, Responsibility Determination, lifecycle, StatusHistory, ErrorRecord behaviour, or executing-company semantics are changed unless an explicit Enterprise Architecture decision is required.
- Codex does not refactor production code merely to simplify deployment.
- If deployment cannot succeed without changing approved behaviour, the blocker is documented instead of implementing a workaround.
- No CI/CD or production deployment automation is introduced.
- No production authorization model, production monitoring platform, performance optimisation, customer rollout, or external SAP integration is introduced.
- Enterprise Architecture remains unchanged.

## 10. Deployment Validation Commands

Run local validation before and after deployment changes:

```bash
npm run build
npm test
npm run validate:local
git diff --check
git status --short
```

Recommended BTP and deployment commands, adjusted only to repository conventions and actual BTP target:

```bash
cf version
cf api
cf login
cf target
cf marketplace
cf services
npm run build
npm test
npm run validate:local
mbt build
cf deploy mta_archives/*.mtar
cf apps
cf services
cf logs <app-name> --recent
```

If the repository uses non-MTA CAP deployment conventions, use the repository-standard CAP deployment commands instead and document the reason.

Do not add a CI/CD pipeline. Do not commit credentials, `.env` secrets, service keys, downloaded credentials, or generated local secret files.

## 11. Required Evidence

Codex must provide evidence for:

- Git branch and starting commit.
- STR-141 PR #11 / final commit `ecbdc2b90913393c8cbad01c3d42e327ba702bd6` presence in `main`.
- CAP baseline inspection completed for STR-133 through STR-141.
- BTP readiness check result.
- Cloud Foundry org/space target used, excluding secrets.
- HANA/HDI service availability and binding result, excluding secrets.
- `npm run build` result.
- `npm test` result.
- `npm run validate:local` result.
- Deployment command result.
- Runtime smoke verification result.
- HANA-backed persistence verification result.
- Minimal authentication decision and evidence, if applicable.
- Deployment evidence report location.
- Confirmation that no CAP business behaviour changed.
- Confirmation that Enterprise Architecture remains unchanged.
- Concrete blocker evidence if deployment or runtime validation cannot proceed because of BTP/environment prerequisites.

## 12. Review Checklist

Reviewer must confirm:

- STR-142 is deployment validation only, not business-functionality implementation.
- STR-142 starts exactly from STR-141 complete and approved.
- STR-133 through STR-141 baselines were inspected.
- BTP deployment configuration is minimal and POC-scoped.
- Deployment configuration was used wherever possible instead of CAP redesign.
- HANA/HDI migration preserves database-neutral model intent.
- Local SQLite development remains supported.
- Approved local behaviour remains preserved.
- Codex did not refactor production code merely to simplify deployment.
- No CDS model, persistence semantics, service boundaries, validation, Responsibility Determination, lifecycle, StatusHistory, ErrorRecord behaviour, or executing-company semantics were changed unless an explicit Enterprise Architecture decision required it.
- No production hardening, customer rollout, monitoring platform, performance optimisation, CI/CD, or external SAP integration was introduced.
- Minimal authentication, if used, is limited to deployed validation and does not define a production authorization model.
- Secrets and credentials were not committed.
- Enterprise Architecture remains unchanged.

## 13. Explicit Out-of-Scope Items

- New CAP business behaviour.
- Functional enhancements.
- New validation logic.
- Responsibility Determination changes.
- Lifecycle or StatusHistory changes.
- ErrorRecord semantics changes.
- Domain model expansion.
- UI.
- External SAP integration.
- CI/CD or GitHub Actions.
- Production deployment automation.
- Production security model.
- Role design, scopes, attributes, user-management model, or customer identity architecture.
- Production monitoring/logging/observability platform.
- Performance or load testing.
- High availability.
- Multitenancy.
- Backup/restore, disaster recovery, or production operations model.
- Customer rollout or customer pilot recommendation.
- Additional BTP services beyond Cloud Foundry, SAP HANA Cloud, HDI Container, and minimal authentication if needed.
- STR-143 or later work.

## 14. Completion Criteria

STR-142 can be marked complete only when:

- Deployment-validation changes are committed.
- STR-133 through STR-141 baseline inspection is documented.
- BTP readiness result is documented.
- Cloud Foundry deployment succeeds or a concrete environment blocker is documented.
- HANA/HDI deployment succeeds or a concrete environment blocker is documented.
- Runtime verification succeeds or a concrete environment blocker is documented.
- Behaviour-preservation evidence is documented.
- The approved CAP implementation was deployed exactly as it exists, except for deployment configuration required for BTP/HANA/HDI.
- Any deployment issue was solved through deployment configuration where possible; if approved behaviour had to change, the work stopped and the blocker was documented.
- Final local validation commands pass or any limitation is explicitly documented.
- No CAP business behaviour changed.
- No CDS model, persistence semantics, service boundaries, validation, Responsibility Determination, lifecycle, StatusHistory, ErrorRecord behaviour, or executing-company semantics changed unless explicitly approved by Enterprise Architecture.
- Enterprise Architecture review is completed.
- Enterprise Architecture remains unchanged.
- Human/architect review accepts the deployment validation evidence or the documented blocker.

## 15. Stop Conditions

Stop immediately and ask for human/architect guidance if:

- STR-141 PR #11 / commit `ecbdc2b90913393c8cbad01c3d42e327ba702bd6` is not present in the starting `main` baseline.
- CAP baseline evidence STR-133 through STR-141 cannot be inspected.
- BTP account, Cloud Foundry org/space, HANA Cloud, HDI service, credentials, or permissions are unavailable or unclear.
- Deployment requires new CAP business behaviour.
- HANA/HDI migration requires changing approved business semantics.
- Deployment cannot succeed without changing approved behaviour, CDS model, persistence semantics, service boundaries, validation, Responsibility Determination, lifecycle, StatusHistory, ErrorRecord behaviour, or executing-company semantics.
- A deployment issue cannot be solved through deployment configuration and would require CAP redesign or refactoring production code merely to simplify deployment.
- Minimal authentication becomes more than a simple deployed-validation access mechanism.
- Any required step would introduce production hardening, customer rollout, monitoring platform, performance optimisation, CI/CD, production authorization design, UI, or external SAP integration.
- A documented STR-141 difference or evidence gap appears to require architectural judgement before deployment.
- Validation fails for reasons unrelated to deployment configuration.
- Secrets or credentials would need to be committed to proceed.
- Enterprise Architecture would need to change.
