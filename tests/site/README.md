# Site browser checks

`site.spec.mjs` runs the public site at 390, 768, and 1440 pixels, checks every
Chinese and English route for horizontal overflow, and saves a full-page
screenshot to the Playwright test output. CI uploads those screenshots as the
`public-site-browser-checks` artifact for visual review.

The screenshots are intentionally not compared pixel-for-pixel. Local baselines
generated on macOS are rendered with different system fonts and antialiasing
than GitHub Actions on Ubuntu, which would turn a visual check into a flaky
gate. Layout, navigation behavior, localized routes, download recommendations,
release assets, and axe WCAG A/AA checks remain hard CI gates.
