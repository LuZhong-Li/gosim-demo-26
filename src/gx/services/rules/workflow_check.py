"""required-check：读取最新 workflow_runs 状态供规则引擎使用。

按 ``run.pr_id`` 精确关联（第三轮 S2）；未关联运行记录时返回 None（不触发拦截）。
参见 docs/plans/02-核心模块设计.md 3.4、04-里程碑任务.md Phase3。
"""

from gx.domain.repositories import WorkflowRunRepo


class WorkflowCheck:
    """合并前 required-check 校验。"""

    def __init__(self, workflow_run_repo: WorkflowRunRepo) -> None:
        self._runs = workflow_run_repo

    def latest_status(self, pr_id: int | None = None) -> str | None:
        """返回最新一次工作流运行状态；可按 PR 过滤。无运行记录时返回 None。"""
        runs = [run for run in self._runs.list() if pr_id is None or run.pr_id == pr_id]
        if not runs:
            return None
        latest = max(runs, key=lambda run: run.id)
        return latest.status.value
