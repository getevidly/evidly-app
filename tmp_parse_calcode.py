#!/usr/bin/env python3
"""Parse CalCode 2026 PDF text into structured sections for citations table seeding."""

import re
import json
import sys

INPUT = r"C:\Users\newpa\AppData\Local\Temp\calcode_full.txt"
OUTPUT = r"C:\Users\newpa\AppData\Local\Temp\calcode_parse_dryrun.txt"
JSON_OUT = r"C:\Users\newpa\AppData\Local\Temp\calcode_sections.json"

# Chapters to INCLUDE (enforcement-relevant)
INCLUDE_CHAPTERS = {1, 3, 4, 5, 6, 7, 8, 9, 13}

# Section pattern: 6-digit number, optional decimal, followed by period+space or just period
# e.g. "113700. Short title" or "114002.1. Cooling methods"
SECTION_RE = re.compile(r'^[\s]*(\d{6}(?:\.\d+)?)\.\s+(.+)$')

# Chapter header pattern
CHAPTER_RE = re.compile(r'^\s*Chapter\s+(\d+(?:\.\d+)?)[.\s]+([A-Za-z].+)$', re.IGNORECASE)

# Article header pattern
ARTICLE_RE = re.compile(r'^\s*Article\s+(\d+)[.\s]+(.+)$', re.IGNORECASE)

def parse():
    with open(INPUT, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()

    sections = []
    current_chapter = None
    current_chapter_title = ""
    current_article = None
    current_article_title = ""

    # First pass: find all section start positions
    section_starts = []
    for i, line in enumerate(lines):
        cm = CHAPTER_RE.match(line)
        if cm:
            continue
        am = ARTICLE_RE.match(line)
        if am:
            continue
        sm = SECTION_RE.match(line)
        if sm:
            section_starts.append((i, sm.group(1), sm.group(2).strip()))

    # Second pass: extract sections with context
    current_chapter = None
    current_chapter_title = ""
    current_article = None
    current_article_title = ""

    for idx, (line_no, sec_num, sec_title) in enumerate(section_starts):
        # Scan backwards from this section to find most recent chapter/article headers
        # But more efficient: scan forward from start tracking context
        pass

    # Better approach: single forward pass
    current_chapter = None
    current_chapter_title = ""
    current_article = None
    current_article_title = ""
    section_index = 0
    enriched = []

    for i, line in enumerate(lines):
        cm = CHAPTER_RE.match(line)
        if cm:
            ch_raw = cm.group(1)
            # Parse chapter number (handle "10.1", "10.5" etc.)
            current_chapter = ch_raw
            current_chapter_title = cm.group(2).strip()
            current_article = None
            current_article_title = ""
            continue

        am = ARTICLE_RE.match(line)
        if am:
            current_article = am.group(1)
            current_article_title = am.group(2).strip()
            continue

        if section_index < len(section_starts) and i == section_starts[section_index][0]:
            _, sec_num, sec_title = section_starts[section_index]

            # Determine body: lines from here+1 to next section start (or EOF)
            if section_index + 1 < len(section_starts):
                end_line = section_starts[section_index + 1][0]
            else:
                end_line = len(lines)

            body_lines = []
            for j in range(i + 1, end_line):
                bl = lines[j]
                # Skip if it's a chapter or article header
                if CHAPTER_RE.match(bl) or ARTICLE_RE.match(bl):
                    continue
                body_lines.append(bl.rstrip())

            body = '\n'.join(body_lines).strip()

            # Determine chapter number as integer for filtering
            ch_num = None
            if current_chapter:
                try:
                    ch_num = float(current_chapter)
                except ValueError:
                    ch_num = None

            enriched.append({
                'section_number': sec_num,
                'section_title': sec_title,
                'body': body,
                'chapter': current_chapter,
                'chapter_title': current_chapter_title,
                'article': current_article,
                'article_title': current_article_title,
                'chapter_num': ch_num,
            })

            section_index += 1

    # Filter to included chapters
    def is_included(s):
        ch = s['chapter_num']
        if ch is None:
            return False
        # Integer chapters: 1, 3, 4, 5, 6, 7, 8, 9, 13
        ch_int = int(ch)
        if ch_int in INCLUDE_CHAPTERS:
            # But exclude sub-chapters like 10.1, 10.5, etc.
            if ch == ch_int or ch == float(ch_int):
                return True
        return False

    all_sections = enriched
    kept = [s for s in all_sections if is_included(s)]

    # Chapter counts
    chapter_counts_all = {}
    for s in all_sections:
        ch = s['chapter'] or 'unknown'
        chapter_counts_all[ch] = chapter_counts_all.get(ch, 0) + 1

    chapter_counts_kept = {}
    for s in kept:
        ch = s['chapter'] or 'unknown'
        chapter_counts_kept[ch] = chapter_counts_kept.get(ch, 0) + 1

    # Write dry-run report
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        f.write("=== CALCODE 2026 PARSE DRY-RUN ===\n\n")
        f.write(f"Total sections found (all chapters): {len(all_sections)}\n")
        f.write(f"Total sections after filtering (included chapters only): {len(kept)}\n\n")

        f.write("--- Sections by chapter (ALL) ---\n")
        for ch in sorted(chapter_counts_all.keys(), key=lambda x: float(x) if x != 'unknown' else 999):
            f.write(f"  Chapter {ch}: {chapter_counts_all[ch]} sections\n")

        f.write("\n--- Sections by chapter (KEPT) ---\n")
        for ch in sorted(chapter_counts_kept.keys(), key=lambda x: float(x) if x != 'unknown' else 999):
            f.write(f"  Chapter {ch}: {chapter_counts_kept[ch]} sections\n")

        f.write("\n--- First 5 kept sections ---\n")
        for s in kept[:5]:
            body_preview = s['body'][:100].replace('\n', ' ') if s['body'] else '(empty)'
            f.write(f"  §{s['section_number']}. {s['section_title']}\n")
            f.write(f"    Chapter {s['chapter']}, Article {s['article'] or 'N/A'}\n")
            f.write(f"    Body: {body_preview}...\n\n")

        f.write("--- Last 5 kept sections ---\n")
        for s in kept[-5:]:
            body_preview = s['body'][:100].replace('\n', ' ') if s['body'] else '(empty)'
            f.write(f"  §{s['section_number']}. {s['section_title']}\n")
            f.write(f"    Chapter {s['chapter']}, Article {s['article'] or 'N/A'}\n")
            f.write(f"    Body: {body_preview}...\n\n")

        # Spot-check key sections
        f.write("--- Spot-check key sections ---\n")
        key_sections = ['113953', '113996', '114000', '114002.1', '114016', '114099.6', '114419']
        for ks in key_sections:
            found = [s for s in kept if s['section_number'] == ks]
            if found:
                s = found[0]
                f.write(f"  ✓ §{s['section_number']}. {s['section_title']}\n")
                f.write(f"    Body length: {len(s['body'])} chars\n")
            else:
                # Check if it's in all_sections but filtered out
                found_all = [s for s in all_sections if s['section_number'] == ks]
                if found_all:
                    s = found_all[0]
                    f.write(f"  ✗ §{s['section_number']} FILTERED OUT (Chapter {s['chapter']})\n")
                else:
                    f.write(f"  ✗ §{ks} NOT FOUND in parse output\n")

    # Write JSON for DB loading
    json_out = []
    for s in kept:
        json_out.append({
            'section_number': s['section_number'],
            'section_title': s['section_title'],
            'body': s['body'],
            'chapter': s['chapter'],
            'chapter_title': s['chapter_title'],
            'article': s['article'],
            'article_title': s['article_title'],
        })

    with open(JSON_OUT, 'w', encoding='utf-8') as f:
        json.dump(json_out, f, indent=2, ensure_ascii=False)

    print(f"Total sections found: {len(all_sections)}")
    print(f"Kept after filtering: {len(kept)}")
    print(f"JSON written to {JSON_OUT}")
    print(f"Report written to {OUTPUT}")

if __name__ == '__main__':
    parse()
