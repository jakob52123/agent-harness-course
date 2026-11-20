"""Build the single original pixel pushpin glyph used by material placeholders.
SPDX-License-Identifier: CC0-1.0
No system font or network dependency; U+1F4CD remains the original page text.
"""
import sys
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

rows = [
    '000000000000',
    '000011110000',
    '000111111000',
    '001111111100',
    '001111111100',
    '000111111000',
    '000011110000',
    '000001100000',
    '000001100000',
    '000001100000',
    '000001100000',
    '000000000000',
]
pen = TTGlyphPen(None)
for y, row in enumerate(rows):
    for x, cell in enumerate(row):
        if cell != '1':
            continue
        left, bottom = x * 100, (10 - y) * 100
        pen.moveTo((left, bottom))
        pen.lineTo((left, bottom + 100))
        pen.lineTo((left + 100, bottom + 100))
        pen.lineTo((left + 100, bottom))
        pen.closePath()
font = FontBuilder(1200, isTTF=True)
font.setupGlyphOrder(['.notdef', 'pushpin'])
font.setupCharacterMap({0x1F4CD: 'pushpin'})
font.setupGlyf({'.notdef': TTGlyphPen(None).glyph(), 'pushpin': pen.glyph()})
font.setupHorizontalMetrics({name: (1200, 0) for name in ('.notdef', 'pushpin')})
font.setupHorizontalHeader(ascent=1100, descent=-100)
font.setupNameTable({'familyName': 'AH Pin', 'styleName': 'Regular', 'uniqueFontIdentifier': 'AH-Pin-1', 'fullName': 'AH Pin', 'psName': 'AH-Pin', 'version': 'Version 1.0', 'licenseDescription': 'CC0-1.0; original pixel pushpin outline'})
font.setupOS2(sTypoAscender=1100, sTypoDescender=-100, usWinAscent=1100, usWinDescent=100)
font.setupPost()
font.setupMaxp()
font.font.flavor = 'woff2'
font.save(sys.argv[1])
