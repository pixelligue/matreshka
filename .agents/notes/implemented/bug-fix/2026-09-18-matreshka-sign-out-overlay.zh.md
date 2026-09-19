# Agent Note: Matreshka sign-in overlay after Sign out

Status: implemented

[English](2026-09-18-matreshka-sign-out-overlay.md) | 中文

## Problem

退出登录会清掉浏览器会话和 Host 凭据，但操作者仍留在界面里。登录页注册在 `settings.onboarding` 上，只有当前聊天为空时才会挂载。已有内容的会话永远不会再次挂载该步骤，因此退出登录无法回到阻断页。

## Decision

`MatreshkaSignInDialog` 占用 `shell.overlay`，id 为 `matreshka-sign-in`。只有 Host 凭据和浏览器令牌都存在时覆盖层才隐藏，并监听 `matreshka-session`，因此退出登录会再次显示该页，而不必等待空 hero 的引导步骤。版本化欢迎声明仍留在 `settings.onboarding`。

## Alternatives considered

**把登录留在 `settings.onboarding` 上并始终运行协调器。** 这也会在已有聊天时重新挂载欢迎声明，并且在 `complete()` 之后仍会跳过登录步骤直到刷新。登录是会话门控，不是首次运行声明。

**依赖退出登录后的 `window.location.reload()`。** 刷新不会改变空 hero 条件。已有内容的聊天仍会跳过引导占用者。

## Consequences

从已有内容的聊天退出登录会回到阻断页。首次运行顺序是先登录，再在空 hero 上显示欢迎声明。组件测试覆盖会话清除后的重新挂载；settings-general 外壳名册在 `settings.onboarding` 上只期望 `welcome-notice`。
