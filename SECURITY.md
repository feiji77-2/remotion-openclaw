# Security Policy

## Supported scope

Security reports should focus on:

- Project JSON validation
- public asset path traversal
- remote asset URL validation
- Remotion rendering and local file handling
- dependency vulnerabilities
- console API path validation and spawned render commands

Local assets must use paths relative to `remotion-video/public/`; absolute paths, `public/` prefixes, and `..` traversal are rejected. Remote assets must use HTTPS.

Do not publish credentials, tokens, private URLs, or directly exploitable details in public issues. Include a concise impact summary, reproduction steps, and the affected Project JSON field when reporting privately.

`remotion-video/projects/**`, `.env*`, generated narration assets, and local render outputs may contain private material. Release staging must inspect these paths explicitly and must never add secrets merely to make a local project reproducible.
