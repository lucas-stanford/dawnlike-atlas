import os
from PIL import Image

def split_template(input_path):
    img = Image.open(input_path)
    w, h = img.size
    row_h = h // 4
    
    directions = ['down', 'left', 'right', 'up']
    
    for i, d in enumerate(directions):
        box = (0, i * row_h, w, (i + 1) * row_h)
        row_img = img.crop(box)
        row_img.save(f"atlas/template_1x3_{d}.png")
        print(f"Saved atlas/template_1x3_{d}.png")

if __name__ == "__main__":
    split_template("atlas/template_3x4_walk.png")
