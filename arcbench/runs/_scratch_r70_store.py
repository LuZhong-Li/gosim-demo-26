"""The r69 Stage 2 store contract: calls must be checked against the module the
caller actually imports (``gh_store.js``), not only ``backend/src/store.js``."""

from __future__ import annotations

import sys
from pathlib import Path

AGENT = Path("D:/gosim-demo-26/arcbench/agent")
sys.path.insert(0, str(AGENT))

import guard  # noqa: E402
import verify  # noqa: E402

WORK = Path("D:/gosim-demo-26/arcbench/runs/_scratch_r70_store")


def write(relative: str, body: str) -> Path:
    path = WORK / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")
    return path


def main() -> None:
    # The shape r69 Stage 2 ended with: auth.js keeps a "store." alias that points
    # at gh_store.js, and gh_store.js has no hashPassword.
    write("backend/src/gh_store.js", (
        "const state = { users: [] };\n"
        "function createUser(user) { state.users.push(user); return user; }\n"
        "module.exports = { state, createUser };\n"
    ))
    write("backend/src/auth.js", (
        "const store = require('./gh_store');\n"
        "const express = require('express');\n"
        "const router = express.Router();\n"
        "router.post('/api/auth/register', (req, res) => {\n"
        "  const hash = store.hashPassword(req.body.password);\n"
        "  store.createUser({ username: req.body.username, password: hash });\n"
        "  res.json({ ok: true });\n"
        "});\n"
        "module.exports = router;\n"
    ))
    write("backend/src/app.js", "module.exports = require('./auth');\n")
    write("backend/src/index.js", "require('./app');\n")

    issues = verify.backend_store_contract(WORK)
    print("issues:", issues)
    assert issues, "the call against gh_store.js must be reported"
    assert "gh_store.js" in issues[0], issues[0]

    fixed = guard.complete_store_methods(WORK, issues)
    print("complete_store_methods ->", fixed)
    assert "hashPassword" in fixed, fixed
    body = (WORK / "backend" / "src" / "gh_store.js").read_text(encoding="utf-8")
    assert "api.hashPassword = function" in body, body[-400:]
    assert verify.backend_store_contract(WORK) == [], verify.backend_store_contract(WORK)

    # A second pass must be a no-op rather than duplicating the layer.
    again = guard.complete_store_methods(WORK, issues)
    print("second pass ->", again)
    assert again == [], again

    # And the classic store.js shape still works.
    other = Path("D:/gosim-demo-26/arcbench/runs/_scratch_r70_store_classic")
    (other / "backend" / "src").mkdir(parents=True, exist_ok=True)
    (other / "backend" / "src" / "store.js").write_text(
        "module.exports = { createUser() {} };\n", encoding="utf-8")
    (other / "backend" / "src" / "routes.js").write_text(
        "const store = require('./store');\nstore.save();\nstore.getSessions();\n",
        encoding="utf-8")
    classic = verify.backend_store_contract(other)
    print("classic issues:", classic)
    assert classic and "store.js" in classic[0]
    classic_fixed = guard.complete_store_methods(other, classic)
    print("classic fixed ->", classic_fixed)
    assert "save" in classic_fixed and "getSessions" in classic_fixed, classic_fixed
    print("DONE")


if __name__ == "__main__":
    main()
