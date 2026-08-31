"""环境自检：Python 版本与依赖版本是否齐全。

用法：
    python tools/check_env.py

对应 docs/plans/05-排期与工程化保障.md 7.1/7.2。
"""

import importlib.metadata
import sys

# 与 pyproject.toml requires-python 对齐（3.11-3.12）
MIN_PYTHON = (3, 11)
MAX_PYTHON = (3, 13)

# 与 requirements.txt 锁定的版本一致
REQUIRED_PACKAGES = {
    "openpyxl": "3.1.5",
    "pydantic": "2.8.2",
    "click": "8.1.8",
    "typer": "0.12.5",
    "pytest": "8.3.2",
}


def check_python() -> list[str]:
    """返回 Python 版本问题列表。"""
    errors: list[str] = []
    version = sys.version_info[:3]
    if version < MIN_PYTHON:
        errors.append(
            f"Python 版本过低: {'.'.join(map(str, version))}，"
            f"需要 >= {'.'.join(map(str, MIN_PYTHON))}"
        )
    if version >= MAX_PYTHON:
        errors.append(
            f"Python 版本过高: {'.'.join(map(str, version))}，"
            f"需要 < {'.'.join(map(str, MAX_PYTHON))}"
        )
    return errors


def check_packages() -> list[str]:
    """返回依赖缺失或版本不符的问题列表。"""
    errors: list[str] = []
    for name, expected in REQUIRED_PACKAGES.items():
        try:
            actual = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            errors.append(f"缺少依赖: {name}=={expected}")
            continue
        if actual != expected:
            errors.append(f"依赖版本不符: {name} 期望 {expected}，实际 {actual}")
    return errors


def main() -> None:
    errors = check_python() + check_packages()
    python_version = ".".join(map(str, sys.version_info[:3]))
    print(f"Python {python_version}")
    if errors:
        for error in errors:
            print(f"[FAIL] {error}")
        raise SystemExit(1)
    print("[OK] 环境就绪：Python 版本与全部依赖均符合要求")


if __name__ == "__main__":
    main()
