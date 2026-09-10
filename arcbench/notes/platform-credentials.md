# 平台凭据与公开接口（2026-09-10 核查）

## 1. `/api-doc` 是什么

`https://arc-bench.com/api-doc` 的标题是 **ArcBench Runtime API / Agent Runtime
Visualization**，内容只有四块：

- Execution Flow：agent 调 `arcbench_agent_runtime`，SDK 写
  `.arc/runner-events.jsonl` 与 `.arc/traceability/*.json`，后端 watcher 推前端刷新；
- Upload Entry Contract：Python 用 `main.py` + `requirements.txt`，JS 用
  `index.js` + `package.json`，TS 用 `index.ts` + `package.json`；
- What The Frontend Does / Usage Rule：不要手写 event payload，只用高层 SDK 方法。

**该页不包含任何 LLM API Key、endpoint 或申请入口**，也没有平台 REST API 参考。
“找不到官方 API”属于预期结果。

## 2. LLM 凭据出现在哪里

任务页与比赛页的提交表单底部都有三个字段（playground 与 competition 完全一致）：

| 标签 | DOM id | 默认值 | 备注 |
| --- | --- | --- | --- |
| `SUBMISSION NAME` | `playground-submission-name` | 空 | placeholder=`submission` |
| `BASE URL` | `playground-submission-base-url` | `https://api.arc-bench.com/v1` | type=url |
| `API KEY` | `playground-submission-api-key` | 空 | **type=password，placeholder=`Required`** |
| `MODEL` | `playground-submission-model` | `deepseek-v4-flash` | type=text |

这三个值就是 agent 侧模型的连接参数；官方 ARC CLI 读的正是同名环境变量
（见 `arcbench/upstream/agentic-requirement-compiler/.env_example`）：

```text
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
MODEL=gpt-4o
ARC_OPENAI_API_MODE=chat_completions
```

## 3. 结论

- 平台只**提供 endpoint**（`https://api.arc-bench.com/v1`）与**默认模型**
  （`deepseek-v4-flash`，与排行榜 MODEL 列一致）；
- 站内**没有任何发放/申请 API Key 的页面或文案**：导航只有
  Playground / Competition / Research / API Doc 四个入口，表单里 API KEY
  只有一个 `Required` 占位符；
- 因此 API KEY 必须由主办方发放或参赛者自备 OpenAI 兼容 key；
  空值时点 Submit 直接报 `API key is required.`。
- 本仓库 agent 是模板化生成、不调用任何 LLM，但平台表单仍强制该字段非空，
  是否可以填占位值需登录后实测一次。

## 4. 平台公开 HTTP 接口（可用的“官方 API”）

| 用途 | URL |
| --- | --- |
| 任务需求 JSON | `http://arc-bench.com/api/requirements/{task}?catalog=playground` |
| 需求截图/引用 | `http://arc-bench.com/api/requirements/{task}/references/{file}?catalog=playground` |
| 需求资源 | `http://arc-bench.com/api/requirements/{task}/assets?catalog=playground` |

`{task}` 取值：`ticketbooking`、`github`、`sheet`（`catalog=playground`）。

## 5. 评分赛清单（`/competition`）

Smoke Competition、Smoke Competition (Evolution)、Ticket Booking、
Ticket Booking (Evolution)，均 OPEN，时间跨度 2026-09-01 ~ 10-17。
比赛页提示第 1 步为 “Upload an agent snapshot or **select a built-in one**”。
