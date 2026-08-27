import os
from PIL import Image, ImageDraw

def create_neutral_template(filename, cell_w=128, cell_h=128):
    width = cell_w
    height = 4 * cell_h
    img = Image.new('RGBA', (width, height), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    line_color = '#2c3e50'
    head_color = '#ecf0f1'
    staff_color = '#e67e22'
    
    for row in range(4):
        cx = cell_w // 2
        cy = (row * cell_h) + (cell_h // 2)
        
        # Base body
        draw.ellipse([cx - 15, cy - 40, cx + 15, cy - 10], fill=head_color, outline=line_color, width=2)
        draw.line([cx, cy - 10, cx, cy + 20], fill=line_color, width=4) # spine
        draw.line([cx - 15, cy - 5, cx + 15, cy - 5], fill=line_color, width=4) # shoulders
        
        # Arms straight down
        draw.line([cx - 15, cy - 5, cx - 15, cy + 15], fill=line_color, width=4)
        draw.line([cx + 15, cy - 5, cx + 15, cy + 15], fill=line_color, width=4)
        
        # Legs straight down
        draw.line([cx - 10, cy + 20, cx - 10, cy + 50], fill=line_color, width=4)
        draw.line([cx + 10, cy + 20, cx + 10, cy + 50], fill=line_color, width=4)
        
        # Draw staff in the character's right hand (which is screen left for Down, screen right for Up, etc.)
        # For simplicity, we just draw a vertical staff
        staff_x = cx - 25 if row in [0, 1] else cx + 25
        draw.line([staff_x, cy - 40, staff_x, cy + 50], fill=staff_color, width=6)
        
    img.save(filename)
    print(f"Neutral Template saved to {filename}")

if __name__ == "__main__":
    create_neutral_template('atlas/template_1x4_neutral.png')
