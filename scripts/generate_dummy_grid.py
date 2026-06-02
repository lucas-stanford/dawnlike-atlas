import os
from PIL import Image, ImageDraw

def create_dummy_grid(filename, columns=3, rows=4, cell_size=128):
    width = columns * cell_size
    height = rows * cell_size
    
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    colors = ['#e74c3c', '#3498db', '#2ecc71']
    
    for r in range(rows):
        for c in range(columns):
            x = c * cell_size
            y = r * cell_size
            
            # Draw cell border
            draw.rectangle([x, y, x + cell_size - 1, y + cell_size - 1], outline='#95a5a6')
            
            # Draw a simple shape representing a character frame
            # We shift the shape slightly per frame to simulate animation
            shape_color = colors[c % len(colors)]
            
            shape_x1 = x + 32 + (c * 10)
            shape_y1 = y + 32
            shape_x2 = shape_x1 + 64
            shape_y2 = shape_y1 + 64
            
            draw.ellipse([shape_x1, shape_y1, shape_x2, shape_y2], fill=shape_color)
            
            # Draw row/col text
            text = f"Row {r}\\nCol {c}"
            draw.text((x + 10, y + 10), text, fill='#2c3e50')
            
    img.save(os.path.join('atlas', filename))
    print(f"Saved {filename}")

if __name__ == "__main__":
    create_dummy_grid('dummy_jrpg_walk.png')
    create_dummy_grid('dummy_jrpg_action.png')
