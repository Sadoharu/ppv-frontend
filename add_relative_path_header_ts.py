#!/usr/bin/env python3
from pathlib import Path

ROOT = Path.cwd()

EXTENSIONS = {".ts", ".tsx"}

IGNORE_DIRS = {
    "node_modules",
    "dist",
    "build",
    ".next",
    ".git",
    ".turbo",
    ".vercel",
    "coverage",
}


def is_ignored(path: Path) -> bool:
    return any(part in IGNORE_DIRS for part in path.parts)


def process_file(file: Path):
    rel_path = file.relative_to(ROOT).as_posix()
    comment_line = f"// {rel_path}\n"

    lines = file.read_text(encoding="utf-8").splitlines(keepends=True)

    if not lines:
        file.write_text(comment_line, encoding="utf-8")
        return

    # Уже є такий коментар
    if lines[0].strip() == comment_line.strip():
        return

    # shebang (node cli)
    if lines[0].startswith("#!"):
        if len(lines) > 1 and lines[1].strip() == comment_line.strip():
            return
        lines.insert(1, comment_line)
    else:
        lines.insert(0, comment_line)

    file.write_text("".join(lines), encoding="utf-8")


def main():
    for file in ROOT.rglob("*"):
        if not file.is_file():
            continue

        if file.suffix not in EXTENSIONS:
            continue

        if is_ignored(file):
            continue

        process_file(file)


if __name__ == "__main__":
    main()
