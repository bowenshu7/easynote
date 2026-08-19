# EasyNote

[English](#english) · [中文](#中文)

## English

EasyNote is a lightweight Windows desktop note app with always-on-top mode, local text storage, image insertion, customizable appearance, and a freely positioned floating bubble.

### Features

- Toggle always-on-top with a polished visual pin indicator
- Save note text as standard UTF-8 `.txt` files
- Insert PNG, JPG, JPEG, GIF, WebP, and BMP images
- Search note content without matching the search interface itself
- Configure a global background or a background for the current note only
- Adjust background opacity, font size, line spacing, word wrapping, and ruled lines
- Choose font colors using RGB, a channel mixer, or indexed colors
- Change selected text color from the editor context menu
- Persist display settings and remember separate folders for notes, inserted images, and backgrounds
- Switch between English and Chinese
- Use a compact always-available toolbar; press `Ctrl+F` to reveal the normally hidden search bar
- Minimize to a freely positioned floating bubble; move it near the left or right edge to collapse it into a small position marker
- Prompt to save unsaved changes before closing

### Quick start

Install dependencies and start the app:

```powershell
npm install
npm start
```

On Windows, you can also double-click `start-edge-note.bat` after dependencies are installed.

### Usage

- **New:** Start a blank note. EasyNote asks for confirmation when the current note has unsaved changes.
- **Open:** Open a local `.txt` note and restore its companion metadata when available.
- **Save:** Choose a path the first time; later saves overwrite the same file directly.
- **Save As:** Save the current note to a new path.
- **Insert Image:** Insert a local image at the current cursor position.
- **Settings:** Preview and apply appearance, language, and word-wrap settings globally or to the current note.
- **Right-click in the editor:** Apply a color to selected text.
- **Help:** View keyboard shortcuts inside the app.

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+F` | Show and focus search |
| `Enter` / `Shift+Enter` | Next / previous search result |
| `Ctrl+T` | Toggle always-on-top |
| `Esc` | Close a dialog |

### Note files

Each note can use two files:

```text
My Note.txt
My Note.txt.edgenote.json
```

The `.txt` file contains plain text. The `.edgenote.json` companion stores image placement, rich formatting, and per-note display settings. Keep both files together when moving or backing up a formatted note.

Global settings and recently used folders are stored in Electron's local application-data directory and are not written into note text files.

### Development

Requirements: Windows 10/11, Node.js 20 or newer, and npm.

```powershell
npm run check
npm run dist
```

`npm run check` validates the JavaScript sources. `npm run dist` builds the Windows portable target into `dist`.

### AI-assisted development

This project was designed, programmed, and documented with assistance from generative AI tools. If you find a problem while using EasyNote, feedback through a GitHub Issue is welcome.

## 中文

贴边笔记是一款面向 Windows 的轻量桌面笔记应用，支持窗口置顶、本地文本保存、图片插入、个性化显示和自由放置的悬浮球。

### 主要功能

- 一键切换窗口置顶，并通过美化后的图钉显示状态
- 笔记正文保存为标准 UTF-8 `.txt` 文件
- 支持插入 PNG、JPG、JPEG、GIF、WebP 和 BMP 图片
- 只搜索笔记正文，不会错误识别搜索界面自身
- 背景图片可设为全局默认，也可仅应用于当前笔记
- 调整背景透明度、字号、行距、自动换行和行间横线
- 通过 RGB、通道混合器或索引颜色选择字体颜色
- 在编辑区右键修改选中文字的颜色
- 持久化显示设置，并分别记忆笔记、插入图片和背景图片路径
- 支持中文和 English 界面
- 使用始终可用的紧凑功能栏；搜索栏常态隐藏，可按 `Ctrl+F` 呼出
- 最小化为可自由放置的悬浮球；靠近屏幕左右边缘时会收起为小型位置标记
- 关闭应用前提示保存尚未保存的修改

### 快速开始

安装依赖并启动：

```powershell
npm install
npm start
```

安装依赖后，也可以在 Windows 中双击 `start-edge-note.bat`。

### 使用方法

- **新建：** 创建空白笔记；当前内容未保存时会请求确认。
- **打开：** 打开本地 `.txt` 文件；存在辅助文件时会恢复图片、格式和显示设置。
- **保存：** 首次保存时选择路径，之后直接覆盖原文件。
- **另存为：** 将当前笔记保存到新路径。
- **插入图片：** 在当前光标位置插入本地图片。
- **设置：** 实时预览并将外观、语言和自动换行设置应用到全局或当前笔记。
- **编辑区右键：** 修改选中文字的颜色。
- **帮助：** 在应用内查看快捷键。

### 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Ctrl+S` | 保存 |
| `Ctrl+Shift+S` | 另存为 |
| `Ctrl+F` | 显示并聚焦搜索 |
| `Enter` / `Shift+Enter` | 下一个／上一个搜索结果 |
| `Ctrl+T` | 切换窗口置顶 |
| `Esc` | 关闭弹窗 |

### 笔记文件

每篇笔记最多包含两个文件：

```text
我的笔记.txt
我的笔记.txt.edgenote.json
```

`.txt` 保存纯文字；`.edgenote.json` 保存图片位置、富文本格式和当前笔记的显示设置。移动或备份带格式的笔记时，请将两个文件放在一起。

全局设置和最近使用的文件夹保存在 Electron 的本机应用数据目录中，不会写入笔记正文。

### 开发

环境要求：Windows 10/11、Node.js 20 或更高版本、npm。

```powershell
npm run check
npm run dist
```

`npm run check` 用于检查 JavaScript 源码；`npm run dist` 将 Windows 便携版构建到 `dist` 目录。

### AI 工具说明

本项目使用了 AI 生成式工具辅助设计、编程和文档编写。如果使用过程中发现任何问题，欢迎通过 GitHub Issue 指出。

## License / 开源许可

EasyNote is available under the [MIT License](LICENSE).
本项目采用 [MIT License](LICENSE) 开源。
