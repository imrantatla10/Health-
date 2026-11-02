import sys, os
from PIL import Image, ImageDraw, ImageFont
ts = sys.argv[1].split(','); out = sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
w, h = 270, 480; rows = (len(ts) + cols - 1) // cols
s = Image.new('RGB', (cols * w, rows * h), 'black'); d = ImageDraw.Draw(s)
f = ImageFont.truetype('/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf', 22)
for i, t in enumerate(ts):
    im = Image.open(f'build/preview/f_{float(t):.2f}.jpg').resize((w, h)); s.paste(im, ((i % cols) * w, (i // cols) * h))
    d.rectangle([(i % cols) * w, (i // cols) * h, (i % cols) * w + 70, (i // cols) * h + 28], fill='black'); d.text(((i % cols) * w + 4, (i // cols) * h + 2), t, fill='yellow', font=f)
s.save(out, quality=88)
