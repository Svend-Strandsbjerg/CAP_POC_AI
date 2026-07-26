# CAP_POC_AI

This repository is the SAP CAP foundation for the EH3 ABAP to CAP modernization proof of concept.

The project is intentionally initialized as a local-first SAP CAP Node.js project using TypeScript and SQLite for local development. GitHub is the source of truth for CAP-side work.

## Current Status

Domain implementation has not started.

The repository currently contains only the project foundation: package configuration, TypeScript configuration, documentation, placeholder project folders, and a pull request template.

## Technology Choices

- SAP CAP Node.js
- TypeScript
- SQLite for local development through `@cap-js/sqlite`
- No UI
- No CI/CD
- No authentication or authorization setup
- No BTP deployment configuration
- No external S/4 integration

## Frozen Source Reference

EH3 ABAP MVP Source Baseline V1.0 remains the frozen source reference for later modernization work.

Do not treat the ABAP repository structure as a CAP design to copy mechanically.

## Local Setup

```powershell
npm install
```

## Validation

```powershell
npm run build
npm test
npx cds version
```

To perform a bounded CAP startup check in PowerShell:

```powershell
$proc = Start-Process npm -ArgumentList "start" -PassThru -NoNewWindow
Start-Sleep -Seconds 8
if (-not $proc.HasExited) { Stop-Process -Id $proc.Id }
```

An empty foundation-only CAP project may exit or report no served application services because no domain model or service definitions have been created.

## Non-Goals

This foundation does not include:

- CDS domain entities
- Persistence models
- Seed data or test data
- CAP service definitions
- Handlers or business logic
- ABAP inspection or ABAP-to-CAP transformation
- UI
- Authentication
- Authorization
- BTP or HANA deployment configuration
- MTA files
- CI/CD or GitHub Actions
- External integrations
- Production hardening
- ADRs
- Any later implementation batch
