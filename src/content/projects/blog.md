---
title: "工控笔记博客"
description: "将技术笔记和离线方案组织成可用 Markdown 持续维护的中文站点"
tags: ["Astro", "GitHub Pages"]
status: "网站源码"
topic: desktop
order: 3
---

## 项目结构

博客沿用 AstroPaper 的内容集合、共享布局及主题切换思路。文章和项目分别由 Markdown 文件生成。页面通过 GitHub Actions 构建，由 GitHub Pages 提供静态访问。

## 界面设计

首页的数据链路图使用 SVG，导航和文章标题在支持的浏览器中使用 View Transitions 衔接。主题默认跟随系统，手动设置保存在当前浏览器。启用系统减少动态效果时，页面使用短过渡。

- [本站源码](https://github.com/LiuXin2979/liuxin2979.github.io)
- [AstroPaper](https://github.com/satnaing/astro-paper)
- [Lucide 图标](https://lucide.dev/)
