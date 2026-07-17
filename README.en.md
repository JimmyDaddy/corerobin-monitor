<div align="center">
  <img src="site/assets/brand-mark.png" width="120" alt="CoreRobin Logo" />

  <h1>CoreRobin</h1>

  <p><strong>Understand your computer, find the cause, and stay in control.</strong></p>
  <p>A desktop status companion that starts with what you notice: a slow computer, loud fan, low storage, or unusual network activity.</p>

  <p>
    <a href="https://monitor-app.corerobin.com/en/download/"><strong>Download CoreRobin</strong></a>
    · <a href="https://monitor-app.corerobin.com/en/">Website</a>
    · <a href="https://monitor-app.corerobin.com/en/articles/">Mac troubleshooting</a>
    · <a href="docs/user-guide.md">User guide</a>
    · <a href="https://monitor-app.corerobin.com/en/releases/">Release Notes</a>
    · <a href="README.md">简体中文</a>
  </p>
</div>

<p align="center">
  <img src="site/assets/corerobin-daily-overview.jpg" width="100%" alt="CoreRobin Everyday mode computer status overview" />
</p>

<p align="center"><sub>Everyday mode · A stable conclusion and the next best action</sub></p>

## Start with what you notice

Everyday mode turns a slow computer, persistent fan noise, low storage, or a network concern into one stable conclusion and a useful next step. Brief spikes do not immediately become issues, and recovery is confirmed before an incident disappears.

- See whether anything needs attention at a glance
- Start from a real problem instead of technical terminology
- Main window, menu bar panel, and Robin companion share one conclusion
- You confirm every process stop, startup change, and permanent deletion

## Go deeper when you need evidence

Professional mode keeps live metrics, five-minute trends, process trees, network connections, storage analysis, and history for sustained load or unusual traffic.

<p align="center">
  <img src="site/assets/corerobin-professional-overview.jpg" width="100%" alt="CoreRobin Professional mode resource overview and process details" />
</p>

## See where space goes, with clear boundaries

Cleanup maps accessible locations on the system disk by real path. On macOS, Full Disk Access can reduce protected-location gaps; you can still scan accessible areas without it. A scan reads metadata, not file contents, and never moves or deletes files automatically.

Items go to a cleanup basket first. CoreRobin rechecks them before permanent deletion and protects the home folder, Trash itself, links, special files, and other disks.

## Download and verify

Use the [download page](https://monitor-app.corerobin.com/en/download/) to choose an installer for your system and chip. macOS has Apple Silicon and Intel DMGs; Windows x64 and Linux x64 are early previews. Current installers do not have platform signing or Apple notarization.

Each release includes SHA-256 checksums, an SPDX SBOM, and a Sigstore bundle for the checksum manifest. The download page has copyable verification commands. These source-integrity records do not replace platform signing.

## Privacy, support, and security

- [Privacy notice](PRIVACY.en.md): local data, retention, Full Disk Access, and clearing data
- [Mac troubleshooting library](https://monitor-app.corerobin.com/en/articles/): slow Macs, low storage, Full Disk Access, and metrics
- [User guide](docs/user-guide.md) · [中文使用指南](docs/user-guide.zh-CN.md)
- [Support](SUPPORT.md): general questions and feature requests
- [Release Notes](https://monitor-app.corerobin.com/en/releases/): version changes, platform coverage, and known limitations
- [Security policy](SECURITY.md): report vulnerabilities privately

Remove usernames, file paths, IP addresses, access tokens, and personal details in screenshots before posting a public Issue.

## Local preview

Node.js 22 or later is required:

```bash
npm run site:build
npx serve site-dist
```

## Copyright

Copyright © 2026 JimmyDaddy. All rights reserved. Unless a file says otherwise, this repository's content and assets are not licensed for copying, modification, or redistribution.
