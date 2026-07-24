#!/usr/bin/env python3
"""Generate simple placeholder PNG icons for the extension."""
import struct, zlib, base64

def make_png(size: int, color=(16, 185, 129)) -> bytes:
    """Create a minimal solid-color PNG."""
    r, g, b = color
    # IHDR
    w = h = size
    ihdr_data = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff

    # IDAT - raw pixel data
    raw = b''
    for _ in range(h):
        raw += b'\x00' + bytes([r, g, b] * w)
    compressed = zlib.compress(raw)
    idat_crc = zlib.crc32(b'IDAT' + compressed) & 0xffffffff

    # IEND
    iend_crc = zlib.crc32(b'IEND') & 0xffffffff

    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xffffffff
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', ihdr_data)
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    return png

import os
os.makedirs('icons', exist_ok=True)

for size in [48, 96]:
    with open(f'icons/icon{size}.png', 'wb') as f:
        f.write(make_png(size))
    print(f'Created icons/icon{size}.png')
