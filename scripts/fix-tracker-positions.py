#!/usr/bin/env python3
"""
Fix duplicate positions in tracker-data.json.

This script normalizes story positions within each iteration group,
ensuring no two stories share the same position value.

Usage:
    python fix-tracker-positions.py --dry-run  # Preview changes
    python fix-tracker-positions.py            # Apply changes
"""
import json
import argparse
from pathlib import Path
from itertools import groupby


def main():
    parser = argparse.ArgumentParser(description='Fix duplicate positions in tracker data')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without writing')
    args = parser.parse_args()

    data_file = Path(__file__).parent / 'tracker-data.json'

    if not data_file.exists():
        print(f"Error: {data_file} not found")
        return 1

    data = json.loads(data_file.read_text())
    stories = data.get('stories', [])

    if not stories:
        print("No stories found")
        return 0

    # Track changes for reporting
    changes = []

    # Sort stories by iteration (null last), then position, then id (stable)
    def sort_key(s):
        iteration = s.get('iteration')
        # null iterations (icebox) go to a high number to sort last
        iter_key = iteration if iteration is not None else float('inf')
        return (iter_key, s['position'], s['id'])

    stories.sort(key=sort_key)

    # Group by iteration and reassign positions
    for iteration, group in groupby(stories, key=lambda s: s.get('iteration')):
        group_list = list(group)
        iter_name = f"iteration {iteration}" if iteration is not None else "icebox"

        for i, story in enumerate(group_list):
            old_pos = story['position']
            new_pos = i

            if old_pos != new_pos:
                changes.append({
                    'id': story['id'],
                    'title': story['title'][:50],
                    'iteration': iter_name,
                    'old': old_pos,
                    'new': new_pos,
                })
                story['position'] = new_pos

    # Report
    if changes:
        print(f"{'DRY RUN - ' if args.dry_run else ''}Position changes ({len(changes)} stories):\n")
        for c in changes:
            print(f"  [{c['iteration']}] {c['id']}: {c['old']} -> {c['new']}")
            print(f"    \"{c['title']}...\"")
        print()
    else:
        print("No duplicate positions found - no changes needed")
        return 0

    # Write if not dry run
    if not args.dry_run:
        # Create backup
        backup_file = data_file.with_suffix('.json.bak')
        backup_file.write_text(data_file.read_text())
        print(f"Backup created: {backup_file}")

        # Write updated data
        data_file.write_text(json.dumps(data, indent=2))
        print(f"Updated: {data_file}")
    else:
        print("Run without --dry-run to apply changes")

    return 0


if __name__ == '__main__':
    exit(main())
