"""Extract per-page text from the rulebook PDFs in source-files/.

Writes source-text/<pdf stem>/page-NN.txt. The output is copyrighted
rulebook text, so source-text/ is gitignored and never served.

Usage: python tools/extract_sources.py [source_dir] [out_dir]
"""
import sys
from pathlib import Path

from pypdf import PdfReader


def extract(source_dir: Path, out_dir: Path) -> None:
    for pdf in sorted(source_dir.glob('*.pdf')):
        reader = PdfReader(pdf)
        target = out_dir / pdf.stem
        target.mkdir(parents=True, exist_ok=True)
        for number, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ''
            (target / f'page-{number:02d}.txt').write_text(text, encoding='utf-8')
        print(f'{pdf.name}: {len(reader.pages)} pages')


if __name__ == '__main__':
    root = Path(__file__).resolve().parent.parent
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'source-files'
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else root / 'source-text'
    extract(source, out)
