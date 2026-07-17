# Security Policy

## Supported versions

Security fixes are provided for the latest published CoreRobin version. Please update to the latest release before reporting a problem when possible.

## Report a vulnerability privately

Do not open a public issue for a suspected vulnerability. Use [GitHub Private Vulnerability Reporting](https://github.com/JimmyDaddy/corerobin-monitor/security/advisories/new) so details remain private while the report is reviewed.

Please include:

- affected CoreRobin version and operating system;
- impact and the conditions required to reproduce it;
- minimal reproduction steps or a proof of concept;
- whether the issue has been disclosed elsewhere.

Remove usernames, personal file paths, IP addresses, access tokens, and unrelated user data. You should receive an acknowledgement within seven days. A remediation and disclosure timeline will be agreed after the report is reproduced and assessed.

## Security boundaries

CoreRobin does not silently elevate privileges, terminate processes, or delete files. Monitoring data and local history remain on the device. File deletion and process-control actions require explicit confirmation and are revalidated immediately before execution.

For local-data retention, Full Disk Access, and data-clearing details, see the [Privacy Notice](PRIVACY.en.md) or [隐私说明](PRIVACY.md).
