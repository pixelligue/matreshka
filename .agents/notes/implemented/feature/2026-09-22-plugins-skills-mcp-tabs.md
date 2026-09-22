# Agent Note: Plugins page skills and MCP tabs

Status: implemented

English | [中文](2026-09-22-plugins-skills-mcp-tabs.zh.md)

## Problem

Operators add Matrena skills and custom MCP servers by editing files or from chat. The Plugins page listed CIS integrations and a manual MCP form, so a pasted Claude or Cursor config could not ask for an empty API key, and a SKILL.md could not be saved as always-on or manual for one project.

## Decision

The Plugins pane in `@deepseek-ai/dsh-client-ui-plugins-matreshka` keeps the heading Plugins and lists integrations, skills, and MCP servers on one catalog. Saved rows stay visible. A plus, or the Add menu, opens the skill or MCP form; the menu has no marketplace entry. amoCRM, Bitrix24, and Tilda open their connect fields from a plus on the row. Copy is locale-owned. CIS connections stay on FastAPI, as recorded in [the CIS plugins catalog](2026-09-18-matreshka-cis-plugins.md).

- **Skills.** `dshDesktop.skills` reads and writes `{DSH_HOME}/skills.json`. An enabled skill is materialized as `SKILL.md` under `{DSH_HOME}/skills/<name>/`, or under `{project}/.dsh/skills/<name>/` when an absolute project path is set. `invocation: manual` writes `disable-model-invocation: true`. A disabled or removed skill deletes that skill directory. A new session loads the file through the filesystem skill provider.
- **GitHub import.** `dshDesktop.importGithub(url, kind)` downloads one public file from `raw.githubusercontent.com`. A repository URL with kind `skill` tries `SKILL.md` on `main`, then `master`. Kind `mcp` tries `.mcp.json`, then `mcp.json`, on those branches. A `github.com/.../blob/<ref>/<path>` URL downloads that file. The main process accepts only HTTPS and only a final host of `raw.githubusercontent.com`.
- **MCP paste.** The MCP section parses a Claude `mcpServers` map, a `servers` map, or one server object. Empty, placeholder, and `${...}` env and header values become password fields. Filled values are stored on the server record as `env` for stdio or `headers` for streamable HTTP in `mcp-servers.json`. Header names may contain hyphens. The manual command and URL form remains. Tools from a page-saved server appear after Desktop restarts, in a new session.

## Alternatives considered

- **A separate Skills sidebar row.** Rejected: the operator asked for one Plugins page with three tabs.
- **Fetch GitHub from the renderer.** Rejected: the renderer asks the desktop main process to download the file, and that download refuses any redirect off `raw.githubusercontent.com`.
- **Store skill files and MCP secrets on FastAPI.** Rejected: these are local process credentials, in the same `mcp-servers.json` store the host already mounts. amoCRM, Bitrix24, and Tilda tokens stay on FastAPI.

## Consequences

- The web catalog shows the three tabs and, without the desktop bridge, says that skills and MCP are added in the desktop app.
- A removed skill disappears from disk, so the skill provider does not keep serving it.
- Pasted tokens live in `mcp-servers.json` on the operator's machine. The Plugins page does not send them to the Matreshka API.
- GitHub import does not walk a repository. A skill that is not `SKILL.md` at the repository root needs a blob URL. A pasted `cwd` is not stored.
