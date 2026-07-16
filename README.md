# CoreRobin

CoreRobin 是一款桌面端电脑状态和空间管理工具，帮助用户理解电脑为什么变慢、空间被什么占用，以及哪些项目值得处理。

这个公开仓库用于承载 CoreRobin 的官方网站、用户文档、公开安装包和问题反馈。桌面应用源码在私有仓库中维护，本仓库不包含应用源码，也不代表应用已采用开源许可证。

## Public resources

- [官方网站](https://monitor-app.corerobin.com/)
- [使用指南](https://monitor-app.corerobin.com/guide/)
- [下载最新版本](https://github.com/JimmyDaddy/corerobin-monitor/releases/latest)
- [提交问题或建议](https://github.com/JimmyDaddy/corerobin-monitor/issues/new/choose)
- [私密报告安全漏洞](https://github.com/JimmyDaddy/corerobin-monitor/security/advisories/new)

## What belongs here

- `site/`：官方网站和网页版使用指南
- `docs/`：可在 GitHub 中直接阅读的中英文用户指南
- `.github/ISSUE_TEMPLATE/`：问题与功能建议模板
- `scripts/build-site.mjs`：独立的静态站点构建与本地链接检查

应用源码、内部设计文档、构建密钥和发布凭据不会进入这个仓库。

## Local preview

需要 Node.js 22 或更高版本：

```bash
npm run site:build
npx serve site-dist
```

## Feedback

一般问题和功能建议请使用 [GitHub Issues](https://github.com/JimmyDaddy/corerobin-monitor/issues/new/choose)。提交前请隐藏用户名、文件路径、IP 地址和其他隐私信息。安全漏洞请通过 [Private vulnerability reporting](https://github.com/JimmyDaddy/corerobin-monitor/security/advisories/new) 私密提交。

## Copyright

Copyright © 2026 JimmyDaddy. All rights reserved. 除非文件中另有明确说明，本仓库内容与素材未授予复制、修改或再分发许可。
