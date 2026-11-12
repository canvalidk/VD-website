"""Write engine-made trace records for the Workshop doer's tests.

Usage: python tools/export_workbench_fixtures.py <VDfirst checkout> tests/fixtures

The records are made by VDfirst's own workbench (`start_record`, `apply_command`),
so the tests read exactly what the local bridge sends. Re-run after VDfirst changes
its record format, and commit the new files with the VDfirst commit they came from.
"""

from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys

SITE = Path(__file__).resolve().parent.parent


def source_dictionary(path: str, name: str) -> dict:
    """The bridge's dictionary from a site source export: entries in the order the engine added them."""
    data = json.loads((SITE / path).read_text(encoding='utf-8'))
    entries = sorted(data['entries'], key=lambda entry: entry['code_index'])
    return {'name': name, 'entries': [[entry['headword'], entry['definition']] for entry in entries]}


def correction_dictionary() -> dict:
    data = json.loads((SITE / 'src/data/correction-source.json').read_text(encoding='utf-8'))
    return {'name': data['dictionary']['name'], 'entries': [list(pair) for pair in data['dictionary']['entries']]}


def run(workbench, dictionary, demand, context, commands):
    record = workbench.start_record(dictionary, demand, context)
    for command in commands:
        record = workbench.apply_command(record, command)
    return workbench.validate_record(record)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    checkout, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2])
    sys.path.insert(0, str(checkout))
    import workbench  # noqa: E402  (the engine checkout chosen on the command line)

    commit = subprocess.run(['git', '-C', str(checkout), 'rev-parse', '--short', 'HEAD'],
                            capture_output=True, text=True, check=True).stdout.strip()

    # The correction example: a mistaken calculation, issued; reopened, redone and issued again.
    correction = run(workbench, correction_dictionary(), 'force_cart_0',
                     'For cart at time 0: mass 2 kg, acceleration 5 m/s^2. Responses are supplied by hand.', [
        {'operation': 'expand', 'frame_id': 'F', 'position': 0, 'entry_index': 0},
        {'operation': 'inject', 'frame_id': 'F/0', 'position': 0, 'response': '2 kg'},
        {'operation': 'inject', 'frame_id': 'F/0', 'position': 1, 'response': '5 m/s^2'},
        {'operation': 'reduce', 'frame_id': 'F/0', 'response': '12 N', 'note': 'a mistake, on purpose'},
        {'operation': 'reduce', 'frame_id': 'F', 'response': 'Prediction: 12 N'},
        {'operation': 'issue', 'frame_id': 'F'},
        {'operation': 'reopen', 'frame_id': 'F/0'},
        {'operation': 'reduce', 'frame_id': 'F/0', 'response': '10 N'},
        {'operation': 'reduce', 'frame_id': 'F', 'response': 'Prediction: 10 N'},
        {'operation': 'issue', 'frame_id': 'F'},
    ])

    # A Newton trace left open: every hole action, a wording edit, and holes still open.
    newton = run(workbench, source_dictionary('docs/newton-operational-source.json', 'Newton operational'),
                 'the net-force on a point-particle', '', [
        {'operation': 'expand', 'frame_id': 'F', 'position': 0, 'entry_index': 21},
        {'operation': 'flatten', 'frame_id': 'F/0', 'position': 0},
        {'operation': 'recall', 'frame_id': 'F/0', 'position': 1, 'entry_index': 22},
        {'operation': 'inject', 'frame_id': 'F/0', 'position': 3, 'response': 'a cart'},
        {'operation': 'clean', 'frame_id': 'F', 'latents': ['the ', ' on the ', ''], 'note': 'wording only'},
    ])

    out.mkdir(parents=True, exist_ok=True)
    for name, record in (('workbench-correction.json', correction), ('workbench-newton.json', newton)):
        (out / name).write_text(json.dumps(record, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    (out / 'workbench-fixtures.json').write_text(json.dumps({
        'vdfirst_commit': commit, 'producer': workbench.producer(),
        'files': ['workbench-correction.json', 'workbench-newton.json'],
    }, indent=1) + '\n', encoding='utf-8')
    print(f'wrote {out} from VDfirst {commit}')


if __name__ == '__main__':
    main()
