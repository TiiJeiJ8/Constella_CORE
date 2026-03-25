# Security Policy

## Supported Scope

This policy applies to the Constella server repository, including:

- REST APIs
- Authentication and authorization flows
- Yjs / WebSocket collaboration services
- Database access and persistence
- Configuration and deployment tooling

## How to Report a Vulnerability

Please do **not** open a public GitHub issue for security reports.

Instead:

- Contact the repository maintainer privately through GitHub
- If GitHub Security Advisories are enabled for this repository, prefer that channel

Please include:

- Affected endpoint, feature, or file
- Reproduction steps
- Impact assessment
- Logs, stack traces, or proof of concept if safe to share

## In-Scope Examples

- Authentication bypass or token handling issues
- Authorization flaws
- WebSocket or Yjs room isolation problems
- Sensitive data exposure
- Unsafe file upload or path handling
- Configuration or deployment defaults that create exploitable risk

## Response Expectations

The maintainer will try to:

- Acknowledge the report within 7 days
- Confirm whether the issue is in scope
- Share remediation progress once a fix path is known

## Disclosure

Please allow reasonable time for investigation and remediation before public disclosure.
