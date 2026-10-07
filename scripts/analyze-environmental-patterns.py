"""Read-only archive layout analysis for the environmental template implementation plan."""
import argparse
import collections
import hashlib
import io
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as E

NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W = '{' + NS['w'] + '}'

def text(node):
    return re.sub(r'\s+', ' ', ''.join(t.text or '' for t in node.findall('.//w:t', NS))).strip()

def inspect(blob):
    with zipfile.ZipFile(io.BytesIO(blob)) as doc:
        root = E.fromstring(doc.read('word/document.xml'))
        tables = []
        for ti, table in enumerate(root.findall('.//w:tbl', NS)):
            grid = table.findall('./w:tblGrid/w:gridCol', NS)
            rows = []
            for ri, row in enumerate(table.findall('./w:tr', NS)):
                before = row.find('./w:trPr/w:gridBefore', NS)
                col = int(before.get(W+'val', '0')) if before is not None else 0
                cells = []
                for cell in row.findall('./w:tc', NS):
                    span = cell.find('./w:tcPr/w:gridSpan', NS)
                    merge = cell.find('./w:tcPr/w:vMerge', NS)
                    width = int(span.get(W+'val', '1')) if span is not None else 1
                    cells.append({'col': col, 'span': width, 'merge': merge.get(W+'val', 'continue') if merge is not None else '', 'text': text(cell)})
                    col += width
                rows.append({'row': ri, 'cells': cells})
            header = next((r['row'] for r in rows if re.search(r'results?', ' '.join(c['text'] for c in r['cells']), re.I) and re.search(r'analysis|specification|standard', ' '.join(c['text'] for c in r['cells']), re.I)), None)
            if header is not None:
                tables.append({'index': ti, 'gridColumns': len(grid), 'headerRow': header, 'rows': rows})
        paragraphs = [text(p) for p in root.findall('.//w:p', NS)]
        return tables, paragraphs

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--archive', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    years, extensions, locks = collections.Counter(), collections.Counter(), collections.Counter()
    families, products, failures, records = {}, collections.Counter(), [], []
    with zipfile.ZipFile(args.archive) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            parts = info.filename.split('/')
            year = parts[1] if len(parts) > 1 else 'unknown'
            if parts[-1].startswith('~$'):
                locks[year] += 1
                continue
            extensions[Path(info.filename).suffix.lower()] += 1
            if not info.filename.lower().endswith('.docx'):
                continue
            try:
                blob = archive.read(info)
                tables, paragraphs = inspect(blob)
                years[year] += 1
                full = ' '.join(paragraphs)
                method = 'Accupoint' if re.search('accupoint|RLU', full, re.I) else 'SPC/MY' if re.search('Standard Plate Count|Molds? and Yeast|SPC', full, re.I) else 'other'
                mode = 'open-plate' if re.search(r'open\s*plate', info.filename+' '+full, re.I) else 'surface'
                product = parts[2] if len(parts) > 3 else '(root-level file)'
                if year == '2026':
                    products[product] += 1
                # A coarse layout family ignores variable body length and all historical readings.
                layout = [{'columns': t['gridColumns'], 'header': [c['text'].lower() for c in t['rows'][t['headerRow']]['cells']], 'hasVerticalMerges': any(c['merge'] for r in t['rows'][t['headerRow']+1:] for c in r['cells'])} for t in tables]
                fingerprint = hashlib.sha256(json.dumps(layout, sort_keys=True).encode()).hexdigest()[:12]
                family = families.setdefault(fingerprint, {'layout': layout, 'years': collections.Counter(), 'methods': collections.Counter(), 'products2026': collections.Counter(), 'examples': []})
                family['years'][year] += 1
                family['methods'][method+' / '+mode] += 1
                if year == '2026':
                    family['products2026'][product] += 1
                    if len(family['examples']) < 3:
                        family['examples'].append(info.filename)
                    records.append({'path': info.filename, 'sha256': hashlib.sha256(blob).hexdigest(), 'productFolder': product, 'method': method, 'mode': mode, 'layoutFamily': fingerprint, 'paragraphs': paragraphs, 'tables': tables})
            except Exception as exc:
                failures.append({'path': info.filename, 'error': str(exc)})
    result = {'archive': args.archive, 'documentsByYear': years, 'extensionsExcludingLocks': extensions, 'locksByYear': locks, 'products2026': products, 'layoutFamilies': families, 'failures': failures, 'documents2026': records}
    (out/'archive-pattern-analysis.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k not in ['documents2026', 'layoutFamilies']}, indent=2))
    print('LAYOUT FAMILIES')
    for key, value in sorted(families.items(), key=lambda item: item[1]['years']['2026'], reverse=True):
        print(json.dumps({'id':key, **value}))

if __name__ == '__main__':
    main()
