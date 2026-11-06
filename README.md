# 工控笔记

围绕 C#、WinForms、SQL Server、MES、PLC 与 OPC 的中文技术博客。

## 本地运行

使用 Node.js 24。安装依赖后运行开发服务器。

```sh
npm ci
npm run dev
```

- 在 `src/content/posts/` 中新增 Markdown 文章，保留现有示例的头部字段。
- 在 `src/content/projects/` 中新增 Markdown 项目页。
- 在 `src/pages/about.astro` 中编辑关于页。
- `npm run build` 生成静态网站，`npm run preview` 预览构建结果。

`main` 分支更新后，GitHub Actions 将构建结果部署到 GitHub Pages。发布用内容和示例数据可公开访问。

## 开源基础

部分布局、内容集合和主题切换逻辑改编自 [AstroPaper](https://github.com/satnaing/astro-paper)（MIT，许可见 LICENSE）。界面图标来自 [Lucide](https://github.com/lucide-icons/lucide)。
