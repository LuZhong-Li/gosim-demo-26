"""GX-Sheet 命令行接口（typer，click 之上的一层封装）。

子命令：member / team / role / pr / workflow / ruleset / trace。
上层只调用 core 门面（ServiceBus），不直接碰存储与零散服务。
"""

import os
import shutil
from collections.abc import Callable
from typing import Any

import typer

from config import CLI_ACTOR_ID, SEED_WORKBOOK_PATH, TRACE_OUTPUT_PATH
from constants import ERR_STORAGE_FILE_NOT_FOUND, ERR_STORAGE_IO
from errors import GXError
from gx.core.service_bus import ServiceBus
from gx.services.audit.validator import check_trace, count_by_type, parse_trace
from gx.services.trace_replay import render_trace
from gx.storage.xlsx import LocalXlsxStorage

cli = typer.Typer(help="GX-Sheet：基于电子表格模拟 GitHub 组织管控与自动化 Agent 原型")
member_app = typer.Typer(help="成员管理")
team_app = typer.Typer(help="团队管理")
role_app = typer.Typer(help="角色管理")
pr_app = typer.Typer(help="PR 模拟管理")
workflow_app = typer.Typer(help="工作流管理")
ruleset_app = typer.Typer(help="Rulesets 规则管理")
trace_app = typer.Typer(help="生产轨迹 trace 校验与导出")
cli.add_typer(member_app, name="member")
cli.add_typer(team_app, name="team")
cli.add_typer(role_app, name="role")
cli.add_typer(pr_app, name="pr")
cli.add_typer(workflow_app, name="workflow")
cli.add_typer(ruleset_app, name="ruleset")
cli.add_typer(trace_app, name="trace")


class GxCli:
    """CLI 上下文：仅持有操作者与统一业务门面。"""

    def __init__(self, workbook_path: str, actor: int, trace_path: str = TRACE_OUTPUT_PATH) -> None:
        self.actor = actor
        self.bus = ServiceBus(LocalXlsxStorage(workbook_path), trace_path=trace_path)


def _run_command(func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
    """执行命令并统一格式化错误输出（GXError / 参数错误）。

    P 前缀错误码（权限类）输出为红色提示，仅控制台显示，不写入 trace。
    """
    try:
        return func(*args, **kwargs)
    except GXError as exc:
        line = f"[{exc.code}] {exc.message}"
        if exc.code.startswith("P"):
            typer.echo(typer.style(line, fg=typer.colors.RED), err=True)
        else:
            typer.echo(line, err=True)
        raise typer.Exit(code=1) from exc
    except ValueError as exc:
        typer.echo(f"[参数错误] {exc}", err=True)
        raise typer.Exit(code=1) from exc


def _echo_ok(message: str) -> None:
    """绿色输出 [OK] 成功提示（仅控制台显示，不写入 trace）。"""
    typer.echo(typer.style(message, fg=typer.colors.GREEN))


@cli.callback()
def main(
    ctx: typer.Context,
    actor: int = typer.Option(CLI_ACTOR_ID, "--actor", help="操作者成员ID（默认种子中的 admin=1）"),
    workbook: str = typer.Option(SEED_WORKBOOK_PATH, "--workbook", help="工作簿路径"),
    trace: str = typer.Option(
        None, "--trace", help="trace 输出路径（默认 config.TRACE_OUTPUT_PATH）"
    ),
) -> None:
    ctx.obj = GxCli(workbook_path=workbook, actor=actor, trace_path=trace or TRACE_OUTPUT_PATH)


@member_app.command("add")
def member_add_cmd(
    ctx: typer.Context,
    name: str = typer.Argument(..., help="成员名称"),
    role: str = typer.Argument(..., help="角色枚举 [owner/admin/member/readonly]"),
) -> None:
    app: GxCli = ctx.obj
    member = _run_command(app.bus.member_add, subject_id=app.actor, name=name, role=role)
    _echo_ok(f"[OK] 成员已添加: id={member.id} name={member.name} role={member.role.value}")


@member_app.command("list")
def member_list_cmd(ctx: typer.Context) -> None:
    app: GxCli = ctx.obj
    members = app.bus.list_members()
    if not members:
        typer.echo("（暂无成员）")
        return
    typer.echo("ID\t名称\t角色")
    for member in members:
        typer.echo(f"{member.id}\t{member.name}\t{member.role.value}")


@team_app.command("add")
def team_add_cmd(
    ctx: typer.Context,
    name: str = typer.Argument(..., help="团队名称"),
    description: str = typer.Argument("", help="团队描述"),
) -> None:
    app: GxCli = ctx.obj
    team = _run_command(app.bus.team_add, subject_id=app.actor, name=name, description=description)
    _echo_ok(f"[OK] 团队已创建: id={team.id} name={team.name}")


@team_app.command("list")
def team_list_cmd(ctx: typer.Context) -> None:
    app: GxCli = ctx.obj
    teams = app.bus.list_teams()
    if not teams:
        typer.echo("（暂无团队）")
        return
    typer.echo("ID\t名称\t描述")
    for team in teams:
        typer.echo(f"{team.id}\t{team.name}\t{team.description}")


@role_app.command("assign")
def role_assign_cmd(
    ctx: typer.Context,
    member_id: int = typer.Argument(..., help="成员ID"),
    role: str = typer.Argument(..., help="角色枚举 [owner/admin/member/readonly]"),
) -> None:
    app: GxCli = ctx.obj
    updated = _run_command(
        app.bus.role_assign, subject_id=app.actor, member_id=member_id, role=role
    )
    _echo_ok(f"[OK] 已分配角色: member_id={updated.id} role={updated.role.value}")


@pr_app.command("create")
def pr_create_cmd(
    ctx: typer.Context,
    title: str = typer.Option(..., "--title", help="PR 标题"),
) -> None:
    app: GxCli = ctx.obj
    pr = _run_command(app.bus.create_pr, subject_id=app.actor, title=title)
    _echo_ok(f"[OK] PR 已创建: id={pr.id} title={pr.title} author={pr.author}")


@pr_app.command("list")
def pr_list_cmd(ctx: typer.Context) -> None:
    app: GxCli = ctx.obj
    prs = app.bus.list_prs()
    if not prs:
        typer.echo("（暂无 PR）")
        return
    typer.echo("ID\t标题\t作者\t状态\t审批人")
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
    updated = _run_command(app.bus.approve_pr, subject_id=app.actor, pr_id=pr_id, approver=approver)
    _echo_ok(f"[OK] PR 已审批: id={updated.id} approvers={updated.approvers}")


@pr_app.command("merge")
def pr_merge_cmd(
    ctx: typer.Context,
    pr_id: int = typer.Argument(..., help="PR ID"),
) -> None:
    app: GxCli = ctx.obj
    updated = _run_command(app.bus.merge_pr, subject_id=app.actor, pr_id=pr_id)
    _echo_ok(f"[OK] PR 已合并: id={updated.id} status={updated.status.value}")


@pr_app.command("close")
def pr_close_cmd(
    ctx: typer.Context,
    pr_id: int = typer.Argument(..., help="PR ID"),
    reason: str = typer.Option("", "--reason", help="关闭/驳回原因"),
) -> None:
    app: GxCli = ctx.obj
    updated = _run_command(
        app.bus.close_pr, subject_id=app.actor, pr_id=pr_id, reason=reason
    )
    _echo_ok(f"[OK] PR 已关闭: id={updated.id} status={updated.status.value}")


@pr_app.command("history")
def pr_history_cmd(
    ctx: typer.Context,
    pr_id: int = typer.Argument(..., help="PR ID"),
) -> None:
    app: GxCli = ctx.obj
    rows = _run_command(app.bus.pr_history, pr_id=pr_id)
    typer.echo("时间\t动作\t结果\t错误")
    for row in rows:
        typer.echo(
            f"{row['timestamp']}\t{row['action_type']}\t"
            f"{'成功' if row['success'] else '失败'}\t{row['error_msg']}"
        )


@workflow_app.command("list")
def workflow_list_cmd(ctx: typer.Context) -> None:
    app: GxCli = ctx.obj
    workflows = app.bus.list_workflows()
    if not workflows:
        typer.echo("（暂无工作流）")
        return
    typer.echo("ID\t名称\t状态")
    for workflow in workflows:
        typer.echo(f"{workflow.id}\t{workflow.name}\t{workflow.status.value}")


@workflow_app.command("run")
def workflow_run_cmd(
    ctx: typer.Context,
    name: str = typer.Argument(..., help="工作流名称"),
    pr_id: int = typer.Option(None, "--pr", help="关联 PR id"),
    head_sha: str = typer.Option("", "--head-sha", help="关联提交 SHA"),
) -> None:
    app: GxCli = ctx.obj
    run = _run_command(
        app.bus.run_workflow,
        subject_id=app.actor,
        name=name,
        pr_id=pr_id,
        head_sha=head_sha,
    )
    _echo_ok(f"[OK] 工作流运行完成: run_id={run.id} status={run.status.value}")


@ruleset_app.command("list")
def ruleset_list_cmd(ctx: typer.Context) -> None:
    app: GxCli = ctx.obj
    rulesets = app.bus.list_rulesets()
    if not rulesets:
        typer.echo("（暂无规则）")
        return
    typer.echo("ID\t类型\t状态\t名称")
    for rule in rulesets:
        typer.echo(f"{rule.id}\t{rule.rule_type.value}\t{rule.status.value}\t{rule.name}")


def _toggle_ruleset(ctx: typer.Context, rule_id: str, enabled: bool, verb: str) -> None:
    """启用/禁用规则并输出绿色 [OK]（权限/规则错误统一由 _run_command 处理）。"""
    app: GxCli = ctx.obj
    updated = _run_command(
        app.bus.ruleset_set_enabled,
        subject_id=app.actor,
        rule_id=rule_id,
        enabled=enabled,
    )
    _echo_ok(f"[OK] 规则已{verb}: id={updated.id} status={updated.status.value}")


@ruleset_app.command("enable")
def ruleset_enable_cmd(
    ctx: typer.Context,
    rule_id: str = typer.Argument(..., help="规则 id [approval/required_check]"),
) -> None:
    _toggle_ruleset(ctx, rule_id, enabled=True, verb="启用")


@ruleset_app.command("disable")
def ruleset_disable_cmd(
    ctx: typer.Context,
    rule_id: str = typer.Argument(..., help="规则 id [approval/required_check]"),
) -> None:
    _toggle_ruleset(ctx, rule_id, enabled=False, verb="禁用")


def _print_trace_errors(errors: list[str]) -> None:
    """逐行红色输出 trace 校验错误并退出（仅控制台显示，不写 trace）。"""
    for error in errors:
        typer.echo(typer.style(error, fg=typer.colors.RED), err=True)
    raise typer.Exit(code=1)


@trace_app.command("check")
def trace_check_cmd(
    path: str = typer.Argument(None, help="trace 文件路径（默认 config.TRACE_OUTPUT_PATH）"),
) -> None:
    """校验 trace 文件：schema、type、human_intervene 强制项。"""
    target = path or TRACE_OUTPUT_PATH
    errors = check_trace(target)
    if errors:
        _print_trace_errors(errors)
    objs = parse_trace(target)
    typer.echo(f"[OK] {target}: 校验通过（共 {len(objs)} 条事件）")
    counts = count_by_type(objs)
    if counts:
        breakdown = ", ".join(f"{name}={count}" for name, count in sorted(counts.items()))
        typer.echo(f"[INFO] 事件构成: {breakdown}")


@trace_app.command("export")
def trace_export_cmd(
    dest: str = typer.Argument(..., help="导出目标文件路径"),
    source: str = typer.Option(
        TRACE_OUTPUT_PATH,
        "--source",
        help="源 trace 路径（默认 config.TRACE_OUTPUT_PATH）",
    ),
) -> None:
    """复制并校验 trace 到目标路径（不修改源文件，不新增事件）。"""
    count = _run_command(_export_trace, dest, source)
    typer.echo(f"[OK] 已导出并校验通过: {dest}（共 {count} 条事件）")


@trace_app.command("replay")
def trace_replay_cmd(
    source: str = typer.Option(
        TRACE_OUTPUT_PATH,
        "--source",
        help="源 trace 路径（默认 config.TRACE_OUTPUT_PATH）",
    ),
    out: str = typer.Option(..., "--out", help="HTML 输出文件路径"),
) -> None:
    """把 trace 渲染成只读 HTML 时间线，不修改源文件与 schema。"""
    events = parse_trace(source)
    html = render_trace(events)
    with open(out, "w", encoding="utf-8") as handle:
        handle.write(html)
    typer.echo(f"[OK] 已生成 trace 回放: {out}（共 {len(events)} 条事件）")


def _export_trace(dest: str, source: str) -> int:
    """执行导出与校验，返回事件条数；错误统一抛 GXError/ValueError。"""
    if os.path.abspath(dest) == os.path.abspath(source):
        raise ValueError("导出目标不能与源文件相同")
    if not os.path.isfile(source):
        raise GXError(
            ERR_STORAGE_FILE_NOT_FOUND,
            f"源 trace 不存在: {source}",
            module="trace",
            context={"path": source},
        )
    source_errors = check_trace(source)
    if source_errors:
        _print_trace_errors(source_errors)
    try:
        shutil.copyfile(source, dest)
    except OSError as exc:
        raise GXError(
            ERR_STORAGE_IO,
            f"trace 导出失败: {exc}",
            module="trace",
            context={"source": source, "dest": dest},
        ) from exc
    dest_errors = check_trace(dest)
    if dest_errors:
        _print_trace_errors(dest_errors)
    objs = parse_trace(dest)
    return len(objs)
