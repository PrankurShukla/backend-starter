# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Report it privately to the repository owner with the affected version, reproduction steps, impact and any suggested mitigation. Never include real credentials, tokens or personal data in a report.

## Supported versions

Until version 1.0, only the latest commit on `main` receives security fixes. Applications created from the template must pin a commit or release and regularly merge upstream security updates.

## Baseline requirements

- Never commit `.env` files, credentials or production data.
- Use different secrets for every environment.
- Run the service as a non-root container user.
- Protect `/metrics` in production with `METRICS_TOKEN` or private networking.
- Configure CORS with exact owned origins or an application-supplied policy.
- Apply authorization in the application; this template only supplies the contracts.
- Treat audit records as sensitive and apply retention and access policies.
- Run `npm run quality` and `npm run audit:production` before deployment.
