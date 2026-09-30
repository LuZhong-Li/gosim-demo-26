# r35 之后的修复（2026-09-30）

r35 的 GitHub run `7ce848683477` 首次跑通了整条链路（探活 OK、6 次真实模型调用、
32 个文件、构建成功、启动演练通过、评测机 npm install + vite build 成功），
但分数仍是 0/100。日志暴露了三个具体问题，这一轮针对它们修。

## 问题与修法

### 1. 两个模块整块丢失

```
REQ-2: model returned no usable files (tokens=44318)
REQ-4: model returned no usable files (tokens=91579)
```

REQ-2（组织与治理）和 REQ-4（代码与版本控制）一个文件都没写出来，
而 selfcheck 报缺的那 41 个名称里有 30 多个正好属于这两个模块。

旧解析器只认 `{"files":[{"path":...,"content":...}]}` 这一种形状，其余一律
静默丢弃，而且失败时**只打印一句"no usable files"**，没有任何原因。现在：

- 接受 `files` 为数组或 `{"路径": "正文"}` 映射；正文键兼容
  `content/body/source/text/code`；路径键兼容 `path/file/filename/filepath/name`。
- **绝对路径会被归一化**：`/workspace/template/frontend/src/x.jsx` →
  `frontend/src/x.jsx`。旧代码直接丢弃这类路径，这本身就是整模块丢光的可能原因。
- 顶层是数组、被 markdown 围栏包住、以及**被截断的 JSON** 都能救回来（截断时按
  `"path"…, "content"…` 逐对象打捞完整文件）。
- 真的救不回来时，把原因打进日志：payload 类型、键名、`finish_reason`、
  回复长度和结尾 200 字符。
- 一个模块产出为 0 时，**追加一次聚焦重试**：把上一次回复原样回喂，并明确指出
  必须是单个 JSON 对象、路径必须是相对路径、每个文件必须完整。

### 2. 提示词没有把"必须逐字出现"的名称变成清单

selfcheck 事后报 `68/109 present`，但生成时模型并不知道这 109 个名字是什么。
现在每个模块的提示词里都带上**该模块的精确可访问名称清单**（来自需求树的引号
文本），并写明这些字符串必须逐字出现在控件上。

顺带修了名称抽取的噪声：`quoted_names` 过去把 scenario 的 Python dict 结构
字符串化后再抽引号内容，于是 `"}, {'keyword': 'THEN', 'content':` 这种东西
被当成"缺失的名称"报出来，还会被塞进提示词。现在按
`scenario.name` + `steps[].content` 正确展开。github 六个模块共 109 个名称
（97 个唯一），无残留噪声。

### 3. `llm.py` 缺少失败诊断

新增 `last_finish_reason` 与 `last_error`，调用方现在能把"为什么这条回复不可用"
和 `finish_reason` 一起打进日志。

## 验证

解析器（`python -c` 直接调用 `main.parse_generation`）：

| 输入形状 | 结果 |
| --- | --- |
| 标准数组形式 | 1 个文件 ✓ |
| `files` 为映射 | 1 个文件 ✓ |
| 绝对路径 | 归一化后 2 个文件 ✓ |
| markdown 围栏 | 1 个文件 ✓ |
| 别名字段（filename/body） | 1 个文件 ✓ |
| 顶层数组 | 1 个文件 ✓ |
| 被截断的 JSON | 打捞出 2 个完整文件 ✓ |
| 纯说明文字 | 拒绝，并给出原因 ✓ |
| 正文为空白 | 拒绝，并给出原因 ✓ |
| `../evil.js` / `frontend/../../evil.js` | 拒绝（路径逃逸仍然拦住）✓ |

重试路径：给 `notes/llm_stub.py` 加了 `ARC_STUB_PROSE_FIRST=1`（每次模块的首个
回复返回说明文字），端到端跑出来是：

```
REQ-2: unusable reply (no JSON object in the reply ...); finish=stop chars=69 ...
REQ-2: recovered on retry (1 file(s))
```

REQ-2 至 REQ-6 全部在重试后恢复；正常路径（不开这个开关）行为不变。

## 还没做

- 没有把 selfcheck 的输出改成 stdout+stderr 双写（它只写 stdout，平台能收到，
  但本地只看 stderr 时看不到）。
- 没有进一步拆分模块调用。REQ-4 消耗了 28k token 却没产出，若重试后仍然失败，
  下一版可以考虑把大模块再切成两半（按原子需求分组），让单次回复更小。
