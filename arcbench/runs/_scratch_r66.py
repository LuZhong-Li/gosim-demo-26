"""Local probe: does the guard repair the r65 missing-export class?

r65's grading build still warned about names that ``pages/PullsTab.tsx``
imported from ``src/api/index.ts`` even though ``ensure_named_exports`` ran.
This rebuilds that shape on disk and prints what the guard does with it.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

AGENT = Path(r"D:\gosim-demo-26\arcbench\agent")
sys.path.insert(0, str(AGENT))

import guard  # noqa: E402

STAGE = Path(r"D:\gosim-demo-26\arcbench\runs\_scratch_proj_r66")

API = """import axios from 'axios';

const client = axios.create({ baseURL: '/api' });

export async function request(path) {
  const response = await client.get(path);
  return response.data;
}

export async function listRepos() {
  return request('/repos');
}

export default client;
"""

PULLS = """import { useEffect, useState } from 'react';
import {
  listPulls,
  getPull,
  mergePull,
  setPullState,
} from '../api';

export default function PullsTab() {
  const [pulls, setPulls] = useState([]);
  useEffect(() => {
    listPulls('acme', 'demo').then((rows) => setPulls(rows || []));
  }, []);
  return <ul>{pulls.map((pull) => <li key={pull.id}>{pull.title}</li>)}</ul>;
}
"""


def main() -> int:
    frontend = STAGE / "frontend"
    (frontend / "src" / "pages").mkdir(parents=True, exist_ok=True)
    (frontend / "src" / "api").mkdir(parents=True, exist_ok=True)
    (frontend / "package.json").write_text(
        json.dumps({
            "name": "frontend",
            "dependencies": {"react": "^19.2.0", "react-router-dom": "^7.11.0"},
        }),
        encoding="utf-8",
    )
    (frontend / "src" / "api" / "index.ts").write_text(API, encoding="utf-8")
    (frontend / "src" / "pages" / "PullsTab.tsx").write_text(PULLS, encoding="utf-8")

    before = guard.ensure_named_exports(STAGE)
    print(f"ensure_named_exports -> {len(before)} name(s)")
    for item in before[:6]:
        print(f"   {item}")

    body = (frontend / "src" / "api" / "index.ts").read_text(encoding="utf-8")
    names = guard.exported_names(body) or set()
    wanted = ["listPulls", "getPull", "mergePull", "setPullState"]
    print("after:", {name: (name in names) for name in wanted})
    return 0 if all(name in names for name in wanted) else 1


if __name__ == "__main__":
    raise SystemExit(main())
