<div align="center">
  <img src="site/assets/brand-mark.png" width="120" alt="CoreRobin Logo" />

  <h1>CoreRobin</h1>

  <p><strong>看懂电脑状态，找到问题，安全处理。</strong></p>
  <p>从真实感受出发的桌面状态伙伴：电脑变慢、风扇变响、空间不足或网络异常时，先给你一个稳定结论和下一步。</p>

  <p>
    <a href="https://github.com/JimmyDaddy/corerobin-monitor/releases/latest"><img src="https://img.shields.io/github/v/release/JimmyDaddy/corerobin-monitor?display_name=tag&amp;style=flat-square&amp;color=6477ff" alt="最新版本" /></a>
    <img src="https://img.shields.io/badge/界面语言-10-ff766f?style=flat-square" alt="10 种界面语言" />
  </p>

  <p>
    <a href="https://monitor-app.corerobin.com/download/"><strong>下载 CoreRobin</strong></a>
    · <a href="https://monitor-app.corerobin.com/">产品网站</a>
    · <a href="https://monitor-app.corerobin.com/articles/">电脑排障知识库</a>
    · <a href="docs/user-guide.zh-CN.md">中文指南</a>
    · <a href="https://monitor-app.corerobin.com/releases/">版本记录</a>
    · <a href="README.md">English</a>
    · <a href="https://github.com/JimmyDaddy/corerobin-monitor/issues/new/choose">问题反馈</a>
  </p>
</div>

<p align="center">
  <img src="site/assets/corerobin-daily-overview.jpg" width="100%" alt="CoreRobin 日常模式电脑状态总览" />
</p>

<p align="center"><sub>日常模式 · 先给出稳定结论，再告诉你最值得做的一步</sub></p>

> 截图来自真实中文产品界面，并使用脱敏演示数据；不包含设备名称、用户名、真实路径或网络身份。

## 从你的感受开始

日常模式把“电脑有点卡”“风扇一直很响”“空间快不够了”这类感受放在前面。短暂波动不会立刻变成待处理问题；恢复后也会继续确认，避免让问题数量在不同窗口之间来回跳变。

- 一眼看到当前是否需要处理
- 从实际问题进入引导，而不是先理解技术指标
- 主窗口、状态栏面板和 Robin 伙伴共享同一份结论
- 结束进程、停用启动项和永久删除前都由你确认
- 应用清单显示本地化名称与真实图标，并在 macOS 提供彻底卸载助手

## 需要时，再进入专业模式

专业模式保留实时指标、五分钟趋势、进程树、网络连接、存储分析和历史记录。网络质量页会自动采样并展示最近 15 分钟的延迟、抖动和丢包趋势，适合排查持续占用、异常流量或偶发网络波动。

<p align="center">
  <img src="site/assets/corerobin-professional-overview.jpg" width="100%" alt="CoreRobin 专业模式资源总览与进程详情" />
</p>

## 看清空间，也保留边界

空间清理会扫描系统磁盘的可访问位置，并按真实路径绘制可下钻的扇形图。macOS 可授予完全磁盘访问权限以减少受保护位置的遗漏；不授权时仍可扫描当前可访问区域。扫描只读取文件元数据，不读取文件内容，也不会自动移动或删除任何文件。

清理目标会先进入清理篮，默认移到废纸篓并保留恢复机会；直接删除前会重新核对路径与变化并单独确认。主目录、废纸篓本身、链接、特殊文件和其他磁盘上的内容受到保护。

## 下载与验证

前往[下载页](https://monitor-app.corerobin.com/download/)选择当前系统与芯片对应的安装包。M1、M2、M3、M4 等 M 系列 Mac 使用 Apple Silicon DMG，只有 Intel Mac 才使用 Intel DMG。当前 macOS DMG 已使用 Developer ID 签名、经过 Apple 公证并装订票据；Apple Silicon 已完成实机验证，Intel 已通过自动校验但尚待独立实机验收。Windows x64 和 Linux x64 仍是未配置平台签名的早期预览版本。

每个 Release 同时提供 SHA-256 校验表、SPDX SBOM 和校验表的 Sigstore 签名包。下载页提供可复制的校验命令，用于补充平台签名并核对公开发布文件。

## 隐私、支持与安全

- [隐私说明](PRIVACY.md)：本机数据、保留时间、完全磁盘访问权限和清除方式
- [电脑排障知识库](https://monitor-app.corerobin.com/articles/)：macOS、Windows 和 Linux 的性能、空间、权限与监控指南
- [中文使用指南](docs/user-guide.zh-CN.md) · [English user guide](docs/user-guide.md)
- [支持](SUPPORT.md)：一般问题与功能建议
- [版本记录](https://monitor-app.corerobin.com/releases/)：当前版本变化、平台覆盖与已知限制
- [安全政策](SECURITY.md)：私密报告安全漏洞

提交公开 Issue 前请隐藏用户名、文件路径、IP 地址、访问令牌和截图中的个人信息。

## 本地预览

需要 Node.js 22 或更高版本：

```bash
npm run site:build
npx serve site-dist
```

## Copyright

Copyright © 2026 JimmyDaddy. All rights reserved. 除非文件中另有明确说明，本仓库内容与素材未授予复制、修改或再分发许可。
