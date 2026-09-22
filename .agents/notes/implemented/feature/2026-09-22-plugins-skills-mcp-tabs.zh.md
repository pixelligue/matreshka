# Agent Note: Plugins page skills and MCP tabs

Status: implemented

[English](2026-09-22-plugins-skills-mcp-tabs.md) | 中文

## Problem

操作者通过改文件或在聊天里为 Matrena 添加技能和自定义 MCP 服务器。插件页只列出独联体集成和一份手填 MCP 表单，因此粘贴的 Claude 或 Cursor 配置不能询问空的 API 密钥，SKILL.md 也不能按始终可用或手动、并限定到一个项目来保存。

## Decision

`@deepseek-ai/dsh-client-ui-plugins-matreshka` 的插件面板保留标题 Plugins，并在同一目录里列出集成、技能和 MCP 服务器。已保存的行保持可见。加号或「添加」菜单打开技能或 MCP 表单；菜单里没有市场入口。amoCRM、Bitrix24 和 Tilda 的连接字段由该行的加号打开。文案由 locale 拥有。独联体连接仍在 FastAPI 上，见 [独联体插件目录](2026-09-18-matreshka-cis-plugins.zh.md)。

- **技能。** `dshDesktop.skills` 读写 `{DSH_HOME}/skills.json`。启用的技能写成 `{DSH_HOME}/skills/<name>/SKILL.md`；若设置了绝对项目路径，则写成 `{project}/.dsh/skills/<name>/SKILL.md`。`invocation: manual` 写入 `disable-model-invocation: true`。禁用或移除的技能会删除该技能目录。新会话通过文件系统技能提供者加载该文件。
- **GitHub 导入。** `dshDesktop.importGithub(url, kind)` 从 `raw.githubusercontent.com` 下载一个公开文件。仓库 URL 在 kind 为 `skill` 时依次尝试 `main` 和 `master` 上的 `SKILL.md`。kind 为 `mcp` 时依次尝试这两个分支上的 `.mcp.json` 和 `mcp.json`。`github.com/.../blob/<ref>/<path>` 下载该文件。主进程只接受 HTTPS，且最终主机必须是 `raw.githubusercontent.com`。
- **MCP 粘贴。** MCP 区块解析 Claude 的 `mcpServers` 映射、`servers` 映射或单个服务器对象。空值、占位符和 `${...}` 的 env 与 header 会变成密码字段。填好的值按传输写入 `mcp-servers.json`：stdio 用 `env`，streamable HTTP 用 `headers`。Header 名称可以含连字符。手填命令和 URL 的表单仍然保留。从页面保存的服务器在重启 Desktop 后的新会话里出现工具。

## Alternatives considered

- **单独的技能侧边栏行。** 拒绝：操作者要求一个插件页里放三个标签。
- **由渲染进程抓取 GitHub。** 拒绝：渲染进程请桌面主进程下载文件，该下载拒绝任何离开 `raw.githubusercontent.com` 的重定向。
- **把技能文件和 MCP 密钥放在 FastAPI。** 拒绝：这些是本地进程凭据，放在宿主已经挂载的同一份 `mcp-servers.json` 里。amoCRM、Bitrix24 和 Tilda 的令牌仍在 FastAPI。

## Consequences

- Web 目录显示三个标签；没有桌面桥时，说明技能和 MCP 要在桌面应用里添加。
- 被移除的技能会从磁盘消失，因此技能提供者不会继续提供它。
- 粘贴的令牌留在操作者机器上的 `mcp-servers.json`。插件页不把这些值发到 Matreshka API。
- GitHub 导入不会遍历仓库。不在仓库根目录 `SKILL.md` 的技能需要 blob URL。粘贴里的 `cwd` 不会被保存。
