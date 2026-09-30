# r34 平台运行的实测证据（2026-09-30，UTC 时间来自运行页 Stdout）

## 日志原文（GitHub run `d6cc7d54e4ea`）

```text
[2026-09-30 09:51:23] [agent-pip-install.stdout] Requirement already satisfied: PyYAML>=6.0 ...
[2026-09-30 09:51:23] [generation-agent.stdout] [arc-agent] task=github template=scaffold
[2026-09-30 09:51:23] [generation-agent.stdout] [arc-agent] requirement map loaded from assets/github
[2026-09-30 09:57:31] [generation-agent.stdout] [arc-agent] REQ-1: files=0 covered=0 tokens=0
[2026-09-30 10:03:38] [generation-agent.stdout] [arc-agent] REQ-2: files=0 covered=0 tokens=0
[2026-09-30 10:09:45] [generation-agent.stdout] [arc-agent] REQ-3: files=0 covered=0 tokens=0
[2026-09-30 10:15:53] [generation-agent.stdout] [arc-agent] REQ-4: files=0 covered=0 tokens=0
[2026-09-30 10:22:00] [generation-agent.stdout] [arc-agent] REQ-5: files=0 covered=0 tokens=0
[2026-09-30 10:28:08] [generation-agent.stdout] [arc-agent] REQ-6: files=0 covered=0 tokens=0
[2026-09-30 10:28:08] [generation-agent.stdout] [arc-agent] model generation done: files=0 covered=0 calls=0 tokens=0
[2026-09-30 10:28:08] [generation-agent.stdout] [arc-agent] no local Playwright specs under /workspace/template/tests; skipping self-test
```

## 结论

1. **每个模块固定 367 秒**（6 分 07 秒），六个模块完全一致。这正是
   `120s 超时 × 3 次重试 + 退避` 的时长 —— 模型在 120 秒内从未返回过。
2. **`calls=0`**：`LlmUsage.calls` 只在成功解析出响应时自增，所以这不是"解析失败"，
   而是**每一次 HTTP 请求都超时/抛异常**，根本没有任何响应抵达。
3. 于是 37 分钟全部花在等待上，任务代码一个文件都没生成，交付物退化成裸脚手架。
4. `tokens=0` 与平台卡片上的 `Tokens 0 / Cost 0.0000 CNY` 一致，也解释了为什么
   r30–r33 的费用都是 0。

这就是 `octos-org/arc-adapter` 反复记录的同一个坑：**单次推理请求要几分钟，
120 秒的客户端超时会把每一次调用都掐死**。官方把单请求时限设成 900 秒，
并把 `max_tokens` 下限设成 32768。

顺带确认的平台事实：生成期的输出目录是 **`/workspace/template`**
（`ARCBENCH_TEMPLATE_DIR`），自测目录是 `/workspace/template/tests`。
平台运行页显示的日志时间戳是 **UTC**（本地 18:28 对应 10:28）。

## r35 对应的改动

| 参数 | r34 | r35 |
| --- | --- | --- |
| 单次模型请求超时 | 120 s | 600 s（`ARC_LLM_TIMEOUT`） |
| `max_tokens` | 4096 | 32768（`ARC_LLM_MAX_TOKENS`） |
| 失败处理 | 三次超时后静默产出 0 个文件 | 记录 `finish_reason`，截断/空回复翻倍预算重试，并打印每一步 |
| 生成后校验 | 无 | 构建 + 启动演练，失败回喂一次修复轮 |
| 墙钟预算 | 无 | 3600 s（`ARC_TIME_BUDGET`） |

按 r34 的实测节奏（每模块约 6 分钟）推算，r35 六个模块约需 30–40 分钟，
仍在 3600 秒预算内；但若单次调用真的接近 600 秒，六个模块会顶到预算上限，
届时会停止开新轮并照常收尾（不会像 r34 那样白等到超时）。
