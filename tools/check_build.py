#!/usr/bin/env python3
"""Check a build: the bundled script parses, every file the code asks for is in dist/, and no comment has swallowed code.

    python3 build.py && python3 tools/check_build.py

Needs Node.js (for `node --check`). Exits non-zero on a problem. Used by the GitHub Actions workflow.
"""
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def main():
    problems = []
    page = read("dist/index.html")

    # 1) the inlined game script is valid JavaScript
    scripts = re.findall(r"<script>(.*?)</script>", page, re.S)
    game = max(scripts, key=len)
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as tmp:
        tmp.write(game)
    try:
        r = subprocess.run(["node", "--check", tmp.name], capture_output=True, text=True)
        if r.returncode:
            problems.append("script does not parse:\n" + r.stderr[-2000:])
    finally:
        os.unlink(tmp.name)

    # 2) every model, texture and sound the code loads is in dist/
    need = []
    boot = read("src/12c_boot.js")
    for m in re.findall(r'"([\w-]+\.glb)"', boot):
        need.append("models/" + m + ".txt")
    for t in re.findall(r'"([\w-]+\.jpg)"', boot):
        need.append("models/" + t)
    need += ["audio/soundtrack.mp3", "audio/silence.mp3"]
    siege = read("src/12d_siege.js")
    clips = re.search(r"const SIEGE_CLIPS = \[(.*?)\];", siege, re.S).group(1)
    need += ["audio/sfx/" + c + ".mp3" for c in re.findall(r'"(\w+)"', clips)]
    words = read("src/11_words.js")
    quips = re.search(r"const QUIPS = \{(.*?)\n\};", words, re.S).group(1)
    for kind, lines in re.findall(r"(\w+): \[(.*?)\]", quips, re.S):
        n = len(re.findall(r'"((?:[^"\\]|\\.)*)"', lines))
        need += [f"audio/voice/{kind}{i}.mp3" for i in range(n)]
    need += ["audio/voice/" + v + ".mp3" for v in re.findall(r'= \["(siege\d)"', words)]
    missing = [n for n in need if not os.path.isfile(os.path.join(ROOT, "dist", n))]
    if missing:
        problems.append("missing from dist/: " + ", ".join(missing))

    # 3) no line comment that swallows code after it: a "// (note)" put in the middle of a line turns the rest of the line into
    #    comment. It still parses, so 1) can't see it. Flag a comment that ends like code or carries a statement after its note
    swallowed = []
    for name in sorted(os.listdir(os.path.join(ROOT, "src"))):
        if not name.endswith(".js"):
            continue
        for n, line in enumerate(read("src/" + name).split("\n"), 1):
            i = line.find(" // ")
            if i < 0 or line.lstrip().startswith("//") or any(line[:i].count(q) % 2 for q in "\"'`"):
                continue
            c = line[i + 4:].rstrip()
            if (re.search(r"\)\s*[A-Za-z_$][\w.\[\]]*\s*(=|\(|\+=|-=)", c) or (c.endswith(("}", ";", "{")) and not c.endswith(")"))
                    or re.search(r";\s*(const|let|if|for|return)\b", c)):
                swallowed.append(f"src/{name}:{n}: {c[:120]}")
    if swallowed:
        problems.append("a comment in the middle of a line has swallowed the code after it:\n  " + "\n  ".join(swallowed))

    print(f"script: {len(game):,} characters; files the code asks for: {len(need)}, missing: {len(missing)}")
    for p in problems:
        print("PROBLEM:", p)
    print("OK" if not problems else "FAILED")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
