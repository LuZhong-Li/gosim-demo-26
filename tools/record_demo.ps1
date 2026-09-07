# GX-Sheet Demo 录制引导脚本
# 用法：先开录屏（OBS 等），再在仓库根目录执行：
#   powershell -ExecutionPolicy Bypass -File .\tools\record_demo.ps1
# 每段口播念完后按回车，脚本自动执行下一步命令。
# 口播词参考：docs/demo_video_script.md

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$py = Join-Path $root '.venv\Scripts\python.exe'
Set-Location $root

Write-Host '==============================================' -ForegroundColor Cyan
Write-Host '  GX-Sheet Demo 录制引导' -ForegroundColor Cyan
Write-Host '  全程按提示念口播 -> 按回车 -> 自动跑命令' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ''

Read-Host '【准备】已开录屏、提词器已打开（docs\demo_video_script.md）？就绪后按回车'

Write-Host ''
Write-Host '第 1 段 · 开场（约 15 秒）' -ForegroundColor Yellow
Write-Host '口播：这是 GX-Sheet，用 Excel 电子表格模拟 GitHub 组织管控与自动化 Agent 的开源原型。'
Write-Host '念完按回车，将执行环境自检。'
Read-Host
& $py tools\check_env.py
if ($LASTEXITCODE -ne 0) { throw 'check_env 失败，请先修复环境' }

Write-Host ''
Write-Host '第 2 段 · 种子与轨迹（约 20 秒）' -ForegroundColor Yellow
Write-Host '口播：一份 xlsx 是唯一数据源；init_seed 生成四角色、一个团队和两条规则，并清空旧轨迹保证可复现。'
Write-Host '念完按回车，将生成种子。'
Read-Host
& $py demo\init_seed.py
if ($LASTEXITCODE -ne 0) { throw 'init_seed 失败' }

Write-Host ''
Write-Host '第 3 段 · 一键完整链路（约 60-90 秒，自动执行）' -ForegroundColor Yellow
Write-Host '口播：接下来自动跑完整链路——添加只读成员、创建 PR、P001 权限拦截、R001 规则拦截、审批、运行 ci-check、合并、人工干预、校验 trace。'
Write-Host '黄色 [EXPECTED] 是设计内的拒绝路径，不是错误。'
Write-Host '按回车开始。'
Read-Host
& $py demo\run_demo.py
if ($LASTEXITCODE -ne 0) { throw 'run_demo 失败' }

Write-Host ''
Write-Host '第 4 段 · 轨迹校验（约 20 秒）' -ForegroundColor Yellow
Write-Host '口播：看这条生产轨迹——prompt 记录指令、tool_call 记录工具调用、api_call 记录业务操作、human_intervene 记录人工确认点，共 10 条事件，校验通过。'
Write-Host '念完按回车，将执行 trace 校验。'
Read-Host
& $py tools\check_trace.py
if ($LASTEXITCODE -ne 0) { throw 'check_trace 失败' }

Write-Host ''
Write-Host '第 5 段（可选加分）· Web 形态走查' -ForegroundColor Yellow
Write-Host '如需加分：另开一个 PowerShell 窗口执行：'
Write-Host '  .\.venv\Scripts\python.exe -m web.run --reset' -ForegroundColor Green
Write-Host '然后浏览器打开 http://127.0.0.1:8765/ ，走查：加团队 -> 加成员/改角色 -> 建 PR -> 审批 -> 运行 ci-check -> 合并 -> 加载/导出审计 -> 切换 ruleset。'
Write-Host '口播：同一个 ServiceBus 还有浏览器形态，错误码与 CLI 一致。'
Write-Host '走查完按回车（Web 窗口随后可 Ctrl+C 关闭）。跳过请直接按回车。'
Read-Host

Write-Host ''
Write-Host '第 6 段 · 收尾（约 15 秒）' -ForegroundColor Yellow
Write-Host '口播：四块能力——组织权限、Rulesets、审计留痕、Actions——在一条可复现链路上闭合；项目定位是概念验证原型，已知局限在 README 中说明。谢谢观看。'
Write-Host '念完后：停止录屏，再按回车显示收尾命令。'
Read-Host

Write-Host ''
Write-Host '【录后收尾】在仓库根目录执行（先还原种子，再提交本次正式 trace）：' -ForegroundColor Green
Write-Host '  git restore --source=HEAD -- demo/seed-workbook.xlsx' -ForegroundColor Green
Write-Host '  git add demo/output/trace.jsonl' -ForegroundColor Green
Write-Host '  git commit -m "chore: 更新最终演示 trace"' -ForegroundColor Green
Write-Host '  git push origin main' -ForegroundColor Green
Write-Host ''
Write-Host '完成。感谢录制！' -ForegroundColor Cyan
