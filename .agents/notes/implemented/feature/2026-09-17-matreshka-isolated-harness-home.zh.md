# Agent Note: Matreshka 隔离 harness home

Status: implemented

[English](2026-09-17-matreshka-isolated-harness-home.md) | 中文

## 问题

Matreshka 与 DeepSeek Harness 在未设置 `$DSH_HOME` 时都解析到 `~/.dsh`。于是同一份 `settings.yaml` 把 Grok 设为默认模型，而 `.credentials.yaml` 里又存着 `MATRESHKA_SESSION_TOKEN`。在普通 DSH 里打开 Matreshka 工作区会把该轮发到 `grok` / `XAI_API_KEY`；Matreshka 对着同一主目录启动时也可能捡到残留的 Grok 配置。只在组合里过滤多余提供方，并不能拆开会话、凭据或默认模型覆盖层。

## 决策

`@deepseek-ai/dsh-home-paths` 中的 `DSH_HOME_DIR_NAME` 为 `.matreshka`。优先级不变：显式配置路径，然后 `$DSH_HOME`，然后 `~/.matreshka`。DeepSeek Harness 继续使用 `~/.dsh`。解析策略仍由[单一 harness home 解析器](../architecture/2026-07-24-single-harness-home-resolver.zh.md)负责。不会从 `~/.dsh` 自动拷贝：共享主目录的拷贝会再次把两个产品绑在一起。已在 `~/.dsh` 登录过的操作者只需把 `MATRESHKA_SESSION_TOKEN` 复制到 `~/.matreshka/.credentials.yaml`。

## 备选方案

**继续用 `~/.dsh`，只在启动脚本里设置 `$DSH_HOME`。** `pnpm dsh web`、桌面宿主以及任何忘记包装器的进程仍会落到 DeepSeek Harness 的数据上。

**在 `$DSH_HOME` 之外再加 `MATRESHKA_HOME`。** 第二个变量会拆掉单一根目录解析器，而且两个产品都不设置环境变量时冲突依旧存在。

**共用主目录，只从 settings 丢掉非 `matreshka` 的提供方。** 会话、凭据和 `agent-default-model` 仍会混在一起；Matreshka 保存设置时，普通 DSH 还会丢掉自己的 Grok 覆盖层。

## 影响

- 未设置 `$DSH_HOME` 时，Matreshka 把设置、凭据和会话写到 `~/.matreshka`。
- 普通 DSH 的 Grok 密钥和会话留在 `~/.dsh`。
- 若导出的 `$DSH_HOME` 指向 `~/.dsh`，主目录仍然共用；启动 Matreshka 时请取消该变量。
