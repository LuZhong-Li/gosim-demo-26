# 官方逐条报告摘要（GitHub 原题，100 条）

> 来源：arcbench/downloads/agent-packages/a128c4309297-template.zip → template/.arc/playwright-report.json（328 KB）
> 生成方式：python arcbench/runs/_report_digest.py <解压后的 json>
> 这份报告是"生成型连续 0 分"的直接证据：入口 frontend/src/App.tsx 只有 286 字节，
> 是 stub_unparseable_sources 写的占位组件，同工程的 25 个生成页面一个也挂不上。
> 于是 73 条用例 10s 超时、27 条"找不到可见导航目标"。
```
====================================================================================================
REPORT arcbench\runs\_report_extract_a128c4309297\template\.arc\playwright-report.json
  expected=0 unexpected=100 flaky=0 skipped=0 duration=844121.999
  testDir=None timeout=None
  results collected=100
    timedOut   73
    failed     27
  --- error fingerprints (most common first) ---
     73x  Test timeout of Nms exceeded.
      9x  Error: Could not find a visible navigation target named "acme-docs"
      3x  Error: Could not find a visible navigation target named "Improve onboarding"
      3x  Error: Could not find a visible navigation target named "Pull requests"
      3x  Error: Could not find a visible navigation target named "Overview onboarding PR"
      2x  Error: Could not find a visible navigation target named "Acme Demo"
      2x  Error: Could not find a visible navigation target named "branch-switch-demo"
      2x  Error: Could not find a visible navigation target named "Issues"
      1x  Error: Could not find a visible navigation target named "Document search flow"
      1x  Error: Could not find a visible navigation target named "Public onboarding PR"
      1x  ReferenceError: uniqueAccount is not defined
  --- failing specs ---
    [timedOut] REQ-1-1-1: Register a New GitHub Account - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-1-1-1: Register a New GitHub Account - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-1-1-1: Register a New GitHub Account - Scenario 3
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-1-1-2: Sign In with an Existing Account - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-1-1-2: Sign In with an Existing Account - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-1-1-2: Sign In with an Existing Account - Scenario 3
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-1-1-2: Sign In with an Existing Account - Scenario 4
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-1-1-3: Recover Account Access Through a Verified Email - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-1-1-3: Recover Account Access Through a Verified Email - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-1-1-3: Recover Account Access Through a Verified Email - Scenario 3
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-1-2: Sign Out and End the Current Web Session - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-1-2: Sign Out and End the Current Web Session - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-1-3: Change Account Password - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-1-3: Change Account Password - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-1-3: Change Account Password - Scenario 3
            Test timeout of 10000ms exceeded.
    [failed] REQ-2-1-1: Browse Organization Repositories - Scenario 1
            Error: Could not find a visible navigation target named "Acme Demo"
    [failed] REQ-2-1-1: Browse Organization Repositories - Scenario 2
            Error: Could not find a visible navigation target named "Acme Demo"
    [timedOut] REQ-2-1-2: Create an Organization After Authentication - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-2-1-2: Create an Organization After Authentication - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-2-1-2: Create an Organization After Authentication - Scenario 3
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-2-2-1: Create an Organization Team - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-2-2-1: Create an Organization Team - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-2-2-2: Manage Organization Team Members and Hierarchy - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-2-2-2: Manage Organization Team Members and Hierarchy - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-2-2-3: Directly Add a User as an Organization Member - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-2-2-3: Directly Add a User as an Organization Member - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-2-2-4: Remove a Member from an Organization - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-2-2-4: Remove a Member from an Organization - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-2-3: Grant Repository Access to People and Teams - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-2-3: Grant Repository Access to People and Teams - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-3-1: Search for and Locate Repositories - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-3-1: Search for and Locate Repositories - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-3-1: Search for and Locate Repositories - Scenario 3
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-3-1: Search for and Locate Repositories - Scenario 4
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-3-2-1: Create a Repository with Owner, Visibility, and Initialization Options - Scenar
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-3-2-1: Create a Repository with Owner, Visibility, and Initialization Options - Scenar
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-3-2-1: Create a Repository with Owner, Visibility, and Initialization Options - Scenar
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-3-2-2: Fork a Repository into Another Namespace - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-3-2-2: Fork a Repository into Another Namespace - Scenario 2
            Test timeout of 10000ms exceeded.
    [failed] REQ-3-2-3: Copy a Repository Clone Value - Scenario 1
            Error: Could not find a visible navigation target named "acme-docs"
    [failed] REQ-3-2-3: Copy a Repository Clone Value - Scenario 2
            Error: Could not find a visible navigation target named "acme-docs"
    [failed] REQ-3-3: View a Public Repository Overview - Scenario 1
            Error: Could not find a visible navigation target named "acme-docs"
    [timedOut] REQ-3-4: Change Repository Visibility with Permission Checks - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-3-4: Change Repository Visibility with Permission Checks - Scenario 2
            Test timeout of 10000ms exceeded.
    [failed] REQ-4-1: Browse Repository Files and Directories - Scenario 1
            Error: Could not find a visible navigation target named "acme-docs"
    [failed] REQ-4-2-1: View Repository Commit History - Scenario 1
            Error: Could not find a visible navigation target named "acme-docs"
    [failed] REQ-4-2-2: Inspect Commit and Revision Differences - Scenario 1
            Error: Could not find a visible navigation target named "Document search flow"
    [failed] REQ-4-2-3: Search Code Within a Repository - Scenario 1
            Error: Could not find a visible navigation target named "acme-docs"
    [failed] REQ-4-2-3: Search Code Within a Repository - Scenario 2
            Error: Could not find a visible navigation target named "acme-docs"
    [failed] REQ-4-2-3: Search Code Within a Repository - Scenario 3
            Error: Could not find a visible navigation target named "acme-docs"
    [failed] REQ-4-2-3: Search Code Within a Repository - Scenario 4
            Error: Could not find a visible navigation target named "acme-docs"
    [failed] REQ-4-3-1: List and Switch Repository Branches - Scenario 1
            Error: Could not find a visible navigation target named "branch-switch-demo"
    [failed] REQ-4-3-1: List and Switch Repository Branches - Scenario 2
            Error: Could not find a visible navigation target named "branch-switch-demo"
    [timedOut] REQ-4-3-2: Create a Branch from an Existing Revision - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-4-3-2: Create a Branch from an Existing Revision - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-4-3-3: Change the Repository Default Branch - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-4-3-3: Change the Repository Default Branch - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-4-4: Manage Repository Files Through the Web Interface - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-4-4: Manage Repository Files Through the Web Interface - Scenario 2
            Test timeout of 10000ms exceeded.
    [failed] REQ-5-1-1: List and Filter Repository Issues - Scenario 1
            Error: Could not find a visible navigation target named "Issues"
    [failed] REQ-5-1-1: List and Filter Repository Issues - Scenario 2
            Error: Could not find a visible navigation target named "Issues"
    [failed] REQ-5-1-2: View an Issue and Its Discussion - Scenario 1
            Error: Could not find a visible navigation target named "Improve onboarding"
    [failed] REQ-5-1-2: View an Issue and Its Discussion - Scenario 2
            Error: Could not find a visible navigation target named "Improve onboarding"
    [failed] REQ-5-1-2: View an Issue and Its Discussion - Scenario 3
            Error: Could not find a visible navigation target named "Improve onboarding"
    [timedOut] REQ-5-2-1: Create a Repository Issue - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-5-2-1: Create a Repository Issue - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-5-2-2: Edit an Issue Title and Description - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-5-2-2: Edit an Issue Title and Description - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-5-2-3: Comment on an Issue Discussion - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-5-2-3: Comment on an Issue Discussion - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-5-3-1: Assign or Unassign Issue Participants - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-5-3-2: Apply Labels to an Issue - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-5-3-3: Assign Issues and Pull Requests to a Milestone - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-5-4: Close or Reopen an Issue - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-5-4: Close or Reopen an Issue - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-6-1: Protect Branches with Review and Status-Check Requirements - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-6-1: Protect Branches with Review and Status-Check Requirements - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-6-1: Protect Branches with Review and Status-Check Requirements - Scenario 3
            Test timeout of 10000ms exceeded.
    [failed] REQ-6-2-1: List and Filter Repository Pull Requests - Scenario 1
            Error: Could not find a visible navigation target named "Pull requests"
    [failed] REQ-6-2-1: List and Filter Repository Pull Requests - Scenario 2
            Error: Could not find a visible navigation target named "Pull requests"
    [failed] REQ-6-2-1: List and Filter Repository Pull Requests - Scenario 3
            Error: Could not find a visible navigation target named "Pull requests"
    [timedOut] REQ-6-2-2: Compare Branches Before Opening a Pull Request - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-6-2-2: Compare Branches Before Opening a Pull Request - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-6-2-3: Create a Pull Request from Comparison Results - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-6-2-3: Create a Pull Request from Comparison Results - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-6-2-4: Create a Draft Pull Request - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-6-2-4: Create a Draft Pull Request - Scenario 2
            Test timeout of 10000ms exceeded.
    [failed] REQ-6-3-1: View Pull Request Overview and Commits - Scenario 1
            Error: Could not find a visible navigation target named "Overview onboarding PR"
    [failed] REQ-6-3-1: View Pull Request Overview and Commits - Scenario 2
            Error: Could not find a visible navigation target named "Overview onboarding PR"
    [failed] REQ-6-3-1: View Pull Request Overview and Commits - Scenario 3
            Error: Could not find a visible navigation target named "Overview onboarding PR"
    [failed] REQ-6-3-2: Inspect Changed Files and Aggregate Diff - Scenario 1
            Error: Could not find a visible navigation target named "Public onboarding PR"
    [timedOut] REQ-6-3-3: Add Review Comments to Changed Code Lines - Scenario 1
            Test timeout of 10000ms exceeded.
    [failed] REQ-6-3-3: Add Review Comments to Changed Code Lines - Scenario 2
            ReferenceError: uniqueAccount is not defined
    [timedOut] REQ-6-3-4: Submit a Pull Request Review - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-6-3-4: Submit a Pull Request Review - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-6-4: Request or Remove Pull Request Reviewers - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-6-5: Merge an Eligible Pull Request - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-6-5: Merge an Eligible Pull Request - Scenario 2
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-6-6: Close or Reopen a Pull Request Without Merging - Scenario 1
            Test timeout of 10000ms exceeded.
    [timedOut] REQ-6-6: Close or Reopen a Pull Request Without Merging - Scenario 2
            Test timeout of 10000ms exceeded.
```
