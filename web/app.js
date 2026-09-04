async function api(method, path, body) {
  const options = { method, headers: {} };
  const actor = document.getElementById("actor").value;
  if (actor) options.headers["X-GX-Actor"] = actor;
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const res = await fetch(path, options);
  const data = await res.json();
  if (!res.ok || data.ok === false) {
    throw new Error(`[${data.code || res.status}] ${data.message || "请求失败"}`);
  }
  return data;
}

function setMsg(text, isError) {
  const msg = document.getElementById("msg");
  msg.textContent = text || "";
  msg.className = isError ? "error" : "ok";
}

async function refreshMeta() {
  const data = await api("GET", "/api/meta");
  renderMembers(data.members);
  renderTeams(data.teams);
  renderPrs(data.prs);
  renderWorkflows(data.workflows);
  renderRulesets(data.rulesets);
  renderActorSelect(data.members, data.roles);
  renderRoleSelect(data.roles);
}

function renderActorSelect(members, roles) {
  const actor = document.getElementById("actor");
  const current = actor.value;
  actor.innerHTML = "";
  for (const m of members) {
    const option = document.createElement("option");
    option.value = String(m.id);
    option.textContent = `${m.name}（${m.role}）`;
    actor.appendChild(option);
  }
  if (current) actor.value = current;
}

function renderRoleSelect(roles) {
  const select = document.getElementById("member-role");
  if (select.options.length === 0) {
    for (const role of roles) {
      const option = document.createElement("option");
      option.value = role;
      option.textContent = role;
      select.appendChild(option);
    }
  }
}

function cell(text) {
  const td = document.createElement("td");
  td.textContent = text == null ? "" : String(text);
  return td;
}

function renderMembers(members) {
  const tbody = document.getElementById("members-tbody");
  tbody.innerHTML = "";
  for (const m of members) {
    const tr = document.createElement("tr");
    tr.append(cell(m.id), cell(m.name), cell(m.role), cell(m.team_id ?? ""));
    tbody.appendChild(tr);
  }
}

function renderTeams(teams) {
  const tbody = document.getElementById("teams-tbody");
  tbody.innerHTML = "";
  for (const team of teams) {
    const tr = document.createElement("tr");
    tr.append(cell(team.id), cell(team.name), cell(team.description));
    tbody.appendChild(tr);
  }
}

function actionButton(label, onClick) {
  const button = document.createElement("button");
  button.textContent = label;
  button.onclick = onClick;
  return button;
}

function renderPrs(prs) {
  const tbody = document.getElementById("pr-tbody");
  tbody.innerHTML = "";
  for (const pr of prs) {
    const tr = document.createElement("tr");
    const ops = document.createElement("td");
    ops.append(
      actionButton("审批", () => prAction(pr.id, "approve", { approver: document.getElementById("pr-approver").value })),
      actionButton("合并", () => prAction(pr.id, "merge", {})),
      actionButton("关闭", () => prAction(pr.id, "close", { reason: prompt("关闭原因", "") || "" }))
    );
    tr.append(cell(pr.id), cell(pr.title), cell(pr.author), cell(pr.status),
      cell((pr.approvers || []).join(",")), ops);
    tbody.appendChild(tr);
  }
}

async function prAction(id, action, body) {
  try {
    await api("POST", `/api/prs/${id}/${action}`, body);
    setMsg(`PR #${id} ${action} 成功`);
    await refreshMeta();
  } catch (err) {
    setMsg(err.message, true);
  }
}

function renderWorkflows(workflows) {
  const tbody = document.getElementById("workflows-tbody");
  tbody.innerHTML = "";
  for (const wf of workflows) {
    const tr = document.createElement("tr");
    const ops = document.createElement("td");
    ops.append(actionButton("运行", async () => {
      try {
        const data = await api("POST", `/api/workflows/${encodeURIComponent(wf.name)}/run`, {});
        setMsg(`工作流 ${wf.name} 状态: ${data.run.status}`);
        await refreshMeta();
      } catch (err) {
        setMsg(err.message, true);
      }
    }));
    tr.append(cell(wf.id), cell(wf.name), cell(wf.trigger), cell(wf.status), ops);
    tbody.appendChild(tr);
  }
}

function renderRulesets(rulesets) {
  const tbody = document.getElementById("rulesets-tbody");
  tbody.innerHTML = "";
  for (const rs of rulesets) {
    const tr = document.createElement("tr");
    const ops = document.createElement("td");
    ops.append(actionButton(rs.status === "active" ? "禁用" : "启用", async () => {
      try {
        await api("POST", `/api/rulesets/${rs.id}`, { enabled: rs.status !== "active" });
        await refreshMeta();
      } catch (err) {
        setMsg(err.message, true);
      }
    }));
    tr.append(cell(rs.id), cell(rs.name), cell(rs.rule_type), cell(rs.status), ops);
    tbody.appendChild(tr);
  }
}

function renderAudit(entries) {
  const tbody = document.getElementById("audit-tbody");
  tbody.innerHTML = "";
  for (const e of entries) {
    const tr = document.createElement("tr");
    tr.append(cell(e.timestamp), cell(e.action_type),
      cell(e.success ? "成功" : "失败"), cell(e.error_msg));
    tbody.appendChild(tr);
  }
}

async function boot() {
  document.getElementById("btn-member-add").onclick = async () => {
    try {
      await api("POST", "/api/members", {
        name: document.getElementById("member-name").value,
        role: document.getElementById("member-role").value
      });
      await refreshMeta();
      setMsg("成员已添加");
    } catch (err) {
      setMsg(err.message, true);
    }
  };
  document.getElementById("btn-pr-create").onclick = async () => {
    try {
      await api("POST", "/api/prs", { title: document.getElementById("pr-title").value });
      await refreshMeta();
      setMsg("PR 已创建");
    } catch (err) {
      setMsg(err.message, true);
    }
  };
  document.getElementById("btn-team-add").onclick = async () => {
    try {
      await api("POST", "/api/teams", {
        name: document.getElementById("team-name").value,
        description: document.getElementById("team-desc").value
      });
      document.getElementById("team-name").value = "";
      document.getElementById("team-desc").value = "";
      await refreshMeta();
      setMsg("团队已添加");
    } catch (err) {
      setMsg(err.message, true);
    }
  };
  document.getElementById("btn-audit").onclick = async () => {
    try {
      const data = await api("GET", "/api/audit");
      renderAudit(data.entries);
      setMsg("审计已加载");
    } catch (err) {
      setMsg(err.message, true);
      renderAudit([]);
    }
  };
  document.getElementById("actor").onchange = () => setMsg("");
  try {
    await refreshMeta();
  } catch (err) {
    setMsg(err.message, true);
  }
}

document.addEventListener("DOMContentLoaded", boot);
