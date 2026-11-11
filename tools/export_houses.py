"""Export law-houses for a bundled dictionary, as detected by the VDfirst engine.

The website does not detect laws itself. This script loads a checked-in source
extract (docs/*-source.json) into a VDfirst ``VDInstance`` and writes what
``detect_houses()`` returns, with entry ids mapped back to the source's own ids.

Usage (from the website repository root):

    py -3 tools/export_houses.py <VDfirst checkout> docs/newton-current-source.json src/data/newton-current-houses.json

Requires networkx (VDfirst's own requirement). Nothing is fetched or installed.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path


def git(checkout: Path, *args: str) -> str:
    return subprocess.run(["git", "-C", str(checkout), *args], capture_output=True, text=True, check=True).stdout.strip()


def parts(entry: dict) -> list[dict]:
    """Interleave the extract's residual chunks with its headword occurrences.

    Each occurrence keeps the definition's own spelling (for example a capital
    letter at the start of a sentence). The parts must rebuild the definition
    exactly, apart from line wrapping, or the export stops.
    """
    chunks, occurrences = entry["residual_chunks"], entry["reference_occurrences"]
    if len(chunks) != len(occurrences) + 1:
        raise SystemExit(f"{entry['id']}: {len(chunks)} chunks for {len(occurrences)} occurrences")
    flat = " ".join(entry["definition"].split())
    out: list[dict] = []
    position = 0
    for index, chunk in enumerate(chunks):
        # The tokeniser normalises spacing inside residual chunks, so align on the
        # non-space characters and keep the definition's own text.
        start = position
        for wanted in "".join(chunk.split()):
            while position < len(flat) and flat[position] == " ":
                position += 1
            if position >= len(flat) or flat[position] != wanted:
                raise SystemExit(f"{entry['id']}: residual chunk {index} does not match the definition at {position}")
            position += 1
        if index < len(occurrences):
            while position < len(flat) and flat[position] == " ":
                position += 1
        else:
            position = len(flat) if not flat[position:].strip() else position
        if position > start:
            out.append({"text": flat[start:position]})
        if index < len(occurrences):
            occurrence = occurrences[index]
            literal = flat[position:position + len(occurrence["headword"])]
            if literal.lower() != occurrence["headword"].lower():
                raise SystemExit(f"{entry['id']}: expected {occurrence['headword']!r} at {position}, found {literal!r}")
            out.append({"headword": occurrence["headword"], "text": literal, "self": occurrence["self_reference"]})
            position += len(literal)
    if position != len(flat):
        raise SystemExit(f"{entry['id']}: parts cover {position} of {len(flat)} characters")
    return out


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    checkout, source_path, out_path = Path(sys.argv[1]).resolve(), Path(sys.argv[2]), Path(sys.argv[3])
    if git(checkout, "status", "--porcelain", "--untracked-files=no"):
        raise SystemExit("VDfirst checkout has uncommitted changes; export from a clean commit.")
    sys.path.insert(0, str(checkout))
    from engine import VDInstance  # noqa: E402  (imported from the given checkout)

    source_bytes = source_path.read_bytes()
    source = json.loads(source_bytes)
    entries = sorted(source["entries"], key=lambda item: item["code_index"])
    if [item["code_index"] for item in entries] != list(range(len(entries))):
        raise SystemExit("Source entries are not a complete 0..n-1 log.")

    vd = VDInstance(name=source_path.stem)
    vd.append_many([(item["headword"], item["definition"]) for item in entries])

    # The extract's references came from this tokeniser. Refuse to export if they no longer agree.
    for item, engine_entry in zip(entries, vd.entries):
        if sorted(engine_entry.hw_tokens) != sorted(item["reference_headwords"]):
            raise SystemExit(f"{item['id']}: engine references {sorted(engine_entry.hw_tokens)} differ from the extract.")

    by_index = {item["code_index"]: item for item in entries}
    ident = lambda engine_entry: None if engine_entry is None else by_index[engine_entry.index]["id"]  # noqa: E731

    houses = []
    for house in sorted(vd.detect_houses(), key=lambda item: min(e.index for e in item["triplet"])):
        law = house["law"]
        corner = {e.headword: e for e in house["triplet"]}
        winters = sorted(law["cyclic"], key=lambda headword: corner[headword].index)
        walls = {house["wall_1"]["headword"]: house["wall_1"]["entry"], house["wall_2"]["headword"]: house["wall_2"]["entry"]}
        used = [e for e in [house["chimney"], *house["triplet"], *walls.values()] if e is not None]
        houses.append({
            "anchor": law["anchor"],
            "winters": winters,
            "chimney": ident(house["chimney"]),
            "triplet": {headword: ident(corner[headword]) for headword in [law["anchor"], *winters]},
            "walls": {headword: ident(walls[headword]) for headword in winters},
            "entries": {by_index[e.index]["id"]: parts(by_index[e.index]) for e in sorted(used, key=lambda e: e.index)},
        })

    law_trios = {tuple(sorted([house["anchor"], *house["winters"]])) for house in houses}
    result = {
        "format": "vd-website-houses",
        "version": 1,
        "producer": {
            "name": "VDfirst",
            "commit": git(checkout, "rev-parse", "HEAD"),
            "method": "VDInstance.append_many, then detect_houses()",
        },
        "source": {
            "file": source_path.name,
            "file_sha256": hashlib.sha256(source_bytes.replace(b"\r\n", b"\n")).hexdigest(),
            "source_sha256": source["source_sha256"],
            "entry_count": len(entries),
        },
        "houses": houses,
        "three_cycles_that_are_not_laws": sorted(list(trio) for trio in set(vd.find_3_cycles()) - law_trios),
    }
    out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(f"{out_path}: {len(houses)} houses, {len(result['three_cycles_that_are_not_laws'])} other 3-cycles")


if __name__ == "__main__":
    main()
