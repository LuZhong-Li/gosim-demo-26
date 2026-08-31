"""GX-Sheet 命令行接口（typer，click 之上的一层封装）。

子命令：member add/list、team add/list、role assign。
所有修改操作经 @require_permission 权限校验；读写统一走领域仓储。
"""

from datetime import datetime, timezone
from typing import Any, Callable

import typer

from config import CLI_ACTOR_ID, SEED_WORKBOOK_PATH, TRACE_OUTPUT_PATH
from constants import TEAMS
from errors import GXError
from gx.domain.enums import Action, Role as RoleEnum
from gx.domain.models import Member, Team
from gx.core.service_bus import ServiceBus
from gx.services.perms.permission import require_permission
from gx.storage.xlsx import LocalXlsxStorage

cli = typer.Typer(
    help="GX-Sheet：基于电子表格模拟 GitHub 组织管控与自动化 Agent 原型"
)
member_app = typer.Typer(help="成员管理")
team_app = typer.Typer(help="团队管理")
role_app = typer.Typer(help="角色管理")
pr_app = typer.Typer(help="PR 模拟管理")
workflow_app = typer.Typer(help="工作流管理")
cli.add_typer(member_app, name="member")
cli.add_typer(team_app, name="team")
cli.add_typer(role_app, name="role")
cli.add_typer(pr_app, name="pr")
cli.add_typer(workflow_app, name="workflow")


class GxCli:
    """CLI 业务门面：封装仓储与权限服务。"""

    def __init__(
        self, workbook_path: str, actor: int, trace_path: str = TRACE_OUTPUT_PATH
    ) -> None:
        self.actor = actor
        storage = LocalXlsxStorage(workbook_path)
        self.bus = ServiceBus(storage, trace_path=trace_path)
        self.member_repo = self.bus.member_repo
        self.team_repo = self.bus.team_repo
        self.permissions = self.bus.permissions

    @require_permission(Action.ADMIN, "workbook")
    def member_add(self, subject_id: int, name: str, role: str) -> Member:
        member = Member(
            id=self._next_id(self.member_repo),
            name=name,
            role=RoleEnum(role),
            created_at=datetime.now(timezone.utc),
        )
        self.member_repo.create(member)
        return member

    @require_permission(Action.WRITE, "sheet", resource_id=TEAMS)
    def team_add(self, subject_id: int, name: str, description: str = "") -> Team:
        team = Team(
            id=self._next_id(self.team_repo), name=name, description=description
        )
        self.team_repo.create(team)
        return team

    @require_permission(Action.ADMIN, "workbook")
    def role_assign(self, subject_id: int, member_id: int, role: str) -> Member:
        current = self.member_repo.get(member_id)
        new_role = RoleEnum(role)
        updated = self.member_repo.update(member_id, {"role": new_role.value})
        self.permissions.record_permission_change(
            actor_id=subject_id,
            subject_id=member_id,
            old_role=current.role.value,
            new_role=new_role.value,
        )
        return updated

    def list_members(self) -> list[Member]:
        return self.member_repo.list()

    def list_teams(self) -> list[Team]:
        return self.team_repo.list()

    @staticmethod
    def _next_id(repo: Any) -> int:
        existing = [getattr(item, "id") for item in repo.list()]
        return max(existing, default=0) + 1


def _run_command(func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
    """执行命令并统一格式化错误输出（GXError / 参数错误）。"""
    try:
        return func(*args, **kwargs)
    except GXError as exc:
        typer.echo(f"[{exc.code}] {exc.message}", err=True)
        raise typer.Exit(code=1) from exc
    except ValueError as exc:
        typer.echo(f"[参数错误] {exc}", err=True)
        raise typer.Exit(code=1) from exc


@cli.callback()
def main(
    ctx: typer.Context,
    actor: int = typer.Option(
        CLI_ACTOR_ID, "--actor", help="操作者成员ID（默认种子中的 admin=1）"
    ),
    workbook: str = typer.Option(
        SEED_WORKBOOK_PATH, "--workbook", help="工作簿路径"
    ),
    trace: str = typer.Option(
        None, "--trace", help="trace 输出路径（默认 config.TRACE_OUTPUT_PATH）"
    ),
) -> None:
    ctx.obj = GxCli(workbook_path=workbook, actor=actor, trace_path=trace or TRACE_OUTPUT_PATH)


@member_app.command("add")
def member_add_cmd(
    ctx: typer.Context,
    name: str = typer.Argument(..., help="成员名称"),
    role: str = typer.Argument(..., help="角色：owner/admin/member/readonly"),
) -> None:
    app: GxCli = ctx.obj
    member = _run_command(app.member_add, subject_id=app.actor, name=name, role=role)
    typer.echo(
        f"[OK] 成员已添加: id={member.id} name={member.name} role={member.role.value}"
    )


@member_app.command("list")
def member_list_cmd(ctx: typer.Context) -> None:
    app: GxCli = ctx.obj
    members = app.list_members()
    if not members:
        typer.echo("（暂无成员）")
        return
    for member in members:
        typer.echo(f"{member.id}\t{member.name}\t{member.role.value}")


@team_app.command("add")
def team_add_cmd(
    ctx: typer.Context,
    name: str = typer.Argument(..., help="团队名称"),
    description: str = typer.Argument("", help="团队描述"),
) -> None:
    app: GxCli = ctx.obj
    team = _run_command(
        app.team_add, subject_id=app.actor, name=name, description=description
    )
    typer.echo(f"[OK] 团队已创建: id={team.id} name={team.name}")


@team_app.command("list")
def team_list_cmd(ctx: typer.Context) -> None:
    app: GxCli = ctx.obj
    teams = app.list_teams()
    if not teams:
        typer.echo("（暂无团队）")
        return
    for team in teams:
        typer.echo(f"{team.id}\t{team.name}\t{team.description}")


@role_app.command("assign")
def role_assign_cmd(
    ctx: typer.Context,
    member_id: int = typer.Argument(..., help="成员ID"),
    role: str = typer.Argument(..., help="角色：owner/admin/member/readonly"),
) -> None:
    app: GxCli = ctx.obj
    updated = _run_command(
        app.role_assign, subject_id=app.actor, member_id=member_id, role=role
    )
    typer.echo(f"[OK] 已分配角色: member_id={updated.id} role={updated.role.value}")


@pr_app.command("create")
def pr_create_cmd(
    ctx: typer.Context,
    title: str = typer.Option(..., "--title", help="PR 标题"),
) -> None:
    app: GxCli = ctx.obj
    pr = _run_command(app.bus.create_pr, subject_id=app.actor, title=title)
    typer.echo(f"[OK] PR 已创建: id={pr.id} title={pr.title} author={pr.author}")


@pr_app.command("list")
def pr_list_cmd(ctx: typer.Context) -> None:
    app: GxCli = ctx.obj
    prs = app.bus.list_prs()
    if not prs:
        typer.echo("（暂无 PR）")
        return
    for pr in prs:
        approvers = ",".join(pr.approvers) or "-"
        typer.echo(f"{pr.id}\t{pr.title}\t{pr.author}\t{pr.status.value}\t{approvers}")


@pr_app.command("approve")
def pr_approve_cmd(
    ctx: typer.Context,
    pr_id: int = typer.Argument(..., help="PR ID"),
    approver: str = typer.Argument(..., help="审批人成员名称"),
) -> None:
    app: GxCli = ctx.obj
    updated = _run_command(
        app.bus.approve_pr, subject_id=app.actor, pr_id=pr_id, approver=approver
    )
    typer.echo(f"[OK] PR 已审批: id={updated.id} approvers={updated.approvers}")


@pr_app.command("merge")
def pr_merge_cmd(
    ctx: typer.Context,
    pr_id: int = typer.Argument(..., help="PR ID"),
) -> None:
    app: GxCli = ctx.obj
    updated = _run_command(app.bus.merge_pr, subject_id=app.actor, pr_id=pr_id)
    typer.echo(f"[OK] PR 已合并: id={updated.id} status={updated.status.value}")


@workflow_app.command("list")
def workflow_list_cmd(ctx: typer.Context) -> None:
    app: GxCli = ctx.obj
    workflows = app.bus.list_workflows()
    if not workflows:
        typer.echo("（暂无工作流）")
        return
    for workflow in workflows:
        typer.echo(f"{workflow.id}\t{workflow.name}\t{workflow.status.value}")


@workflow_app.command("run")
def workflow_run_cmd(
    ctx: typer.Context,
    name: str = typer.Argument(..., help="工作流名称"),
) -> None:
    app: GxCli = ctx.obj
    run = _run_command(app.bus.run_workflow, subject_id=app.actor, name=name)
    typer.echo(f"[OK] 工作流运行完成: run_id={run.id} status={run.status.value}")
