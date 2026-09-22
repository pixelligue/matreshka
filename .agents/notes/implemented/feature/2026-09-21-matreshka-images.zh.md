# Agent Note: Matreshka 图片生成与编辑

Status: implemented

[English](2026-09-21-matreshka-images.md) | 中文

## 问题

操作员需要在聊天中处理图片：生成、编辑、同一风格的批次。OpenRouter 密钥必须留在 FastAPI。聊天已能渲染附件，但批次只是 64px 方块，没有下载、复制或分享。

## 决定

`POST /v1/images/generate` 调用 OpenRouter `/api/v1/images`。Jev 在 `gpt-image-2`（默认，`quality: low`）、`qwen-image-3` 与 `grok-imagine-image-2.0` 中选择。Host 工具 `generate_image` 和 `edit_image` 用 `saveImage` 持久化栅格并渲染图片内容块。聊天批次用上一张/下一张切换。灯箱提供下载、复制、分享。图片留在普通聊天记录里（没有「图片」侧栏）。正在运行的 `generate_image` / `edit_image` 行在最终图片的位置显示图片尺寸的骨架帧（批次为 `n` 帧）；`tool.call.images` 不能声明第二次，因此生成/编辑行自己加载缩略图。Host 从 `lib/index.js` 加载 `@deepseek-ai/dsh-images-matreshka`；没有该产物时工具不会注册，Matrena 会声称无法画图。未打包 Desktop 镜像 `.pnpm/node_modules`；只作为 `dsh-web-app` 下 pnpm 嵌套符号链接存在的插件，经 Windows junction 后对 `existsSync` 不可见，因此 `prepareDevelopmentProject` 把嵌套的 `@deepseek-ai` 包提升到扁平图。

## 考虑过的替代方案

- **默认 Grok。** 未采用：大约是 GPT Image 2 low 的 7 倍，且 `n` 为 1。
- **设置里的模型选择器。** v1 不做；Jev 按任务选择。

## 后果

图片调用使用现有 300 秒 HTTP 读超时。当 `n>1` 或引用超过三张时不选 Grok。浏览器不能分享文件时，分享回退为复制。
