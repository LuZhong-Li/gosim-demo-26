"""Mock Agent 的最小 Turn/Step 运行时。

一个 Turn 表示一次用户指令消费周期；每个 Step 记录意图识别、工具调用、
结果回填或停止判断。该模块只服务 Agent 解析层，不触碰业务门面与存储。
"""

from dataclasses import dataclass, field


@dataclass
class StepResult:
    """Turn 中的一个执行步骤。"""

    kind: str  # intent | tool_call | result | stop
    name: str = ""
    params: dict = field(default_factory=dict)
    output: str = ""


@dataclass
class TurnResult:
    """一次用户指令的完整执行结果。"""

    instruction: str
    steps: list[StepResult] = field(default_factory=list)
    response: str = ""
