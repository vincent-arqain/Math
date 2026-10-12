# 数学手记 · GitHub 公开书房

网站、字体、数学公式和附件全部托管在 GitHub。读者无需登录；站主通过 GitHub 登录管理仓库，提交后由 GitHub Actions 自动检查、构建和发布。

部署目标：https://vincent-arqain.github.io/Math/

## 上传资料

打开网站底部的“管理资料”，选择栏目中的“上传文件”，在 GitHub 页面拖入文件，然后点击 **Commit changes**，提交到 **main** 分支。打开仓库 **Actions**，等待最新的 **Publish mathematics website** 显示绿色成功标记，再刷新网站。

也可以在本仓库打开对应目录，选择 **Add file → Upload files**：

| 目录 | 栏目 |
| --- | --- |
| `content/notes/` | 讲义 |
| `content/problems/` | 题库 |
| `content/essays/` | 随笔 |
| `content/books/` | 书架 |
| `content/papers/` | 论文 |
| `content/links/` | 链接，使用下述 Markdown 格式并填写 source_url |
| `content/english/` | 英语 |

支持 PDF、Markdown、TXT、ZIP、RAR、7Z。单个文件不超过 25 MB。文件名默认用作标题；PDF 和压缩包按原始字节发布，压缩包不会解压。搜索覆盖文章标题、简介、主题、标签、网址和网页正文，不搜索 PDF 内文。

**公开仓库里的全部文件和提交历史都可访问。草稿、私人文件、密码及密钥不要上传；即使从网页隐藏，也不能让仓库文件变成私有。** 已误传敏感资料时，仅删除最新版本不能清除历史。

## 写文章与公式

管理页的“新建文章”会打开 GitHub 编辑器。输入以 `.md` 结尾的文件名，填写文字后提交。格式如下（这段仅为格式说明，不会生成示例文章）：

```markdown
---
title: "文章标题"
description: "简介"
subject: "数学分析"
tags: [极限, 证明]
updated_at: "2026-10-12"
---

在这里写正文。行内公式写作 $a^2+b^2=c^2$。

$$
\sum_{k=1}^{n} k = \frac{n(n+1)}{2}
$$
```

可选字段：`source_url` 为完整的 HTTP/HTTPS 来源网址；`attachment` 为相对于 `content/` 的原始附件路径，例如 `notes/讲义.pdf`。附件必须已经存在，或与 Markdown 在同一次提交中上传。被引用的附件不会重复生成一篇文章。`created_at` / `updated_at` 未填写时使用文件最近 Git 提交日期。日期建议加双引号。

在 `content/links/` 新建 Markdown 时必须填写 `source_url`。站点不执行 Markdown 内的 HTML 和脚本。为保持原网站行为，Markdown 图片显示替代文字。

在 GitHub 中打开 `.md` 文件并点击铅笔可修改。移动或重命名文件会改变网页地址。删除资料并成功发布后，网站入口和网站地图会移除它；GitHub 提交历史仍保留，可在 GitHub 恢复。

## 英语目录

目录与分类一致：`exams`（考研真题）、`vocabulary`（熟词生义）、`sentences`（长难句）、`writing`（作文模板）、`translation`（翻译技巧）、`reading-logic`（阅读逻辑）、`reading-types`（阅读题型分类）。

七种阅读题型位于 `content/english/reading-types/` 下：`detail`、`main-idea`、`inference`、`meaning`、`attitude`、`example`、`structure`，对应细节题、主旨题、推理题、词义句意题、作者态度题、例证题、篇章结构题。放在 `content/english/` 根目录的文件为待分类；Markdown 也可用 `category` 字段指定同名分类。

## 自动发布与本机检查

GitHub 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。推送到 main 会运行检查、内容测试、构建、链接验证，全部成功后才发布；失败会保留上一个成功版本。在 Actions 查看错误，修正资料并再次提交即可。

本机使用 Node.js 22.13 或更新版本：

```sh
npm ci
npm run check
npm test
npm run build
npm run verify
npm run preview
```

预览：http://127.0.0.1:4178/Math/ 。发布只上传 `dist/`，不依赖本机电脑持续运行。

`site.config.json` 集中配置仓库和网址。首页、栏目、文章均预先生成完整 HTML；搜索在浏览器内进行。`robots.txt` 和 `sitemap.xml` 随构建生成，搜索与管理页为 noindex。搜索引擎收录由搜索引擎决定，GitHub Pages 无法保证所有网络均可访问。

## 字体与内容

保留原书房纯白背景、宋体风格中文、Times New Roman 英文、KaTeX 公式和阅读字号。Noto Serif SC 字体随站部署，许可证见 `public/fonts/noto-serif-sc/OFL.txt`；KaTeX 许可证随构建产物提供。附件和外部资料的使用条件以原作者和来源说明为准。

此目录不包含原 Sites 的数据库、R2 数据、草稿或本机私有资料。2026-10-12 迁移时，原站公开网站地图没有文章条目，因此初始目录保留真实空状态。
