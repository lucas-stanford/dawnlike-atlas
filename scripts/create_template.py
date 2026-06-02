import os
from PIL import Image, ImageDraw

def create_walk_template(filename, cell_w=128, cell_h=128):
    width = 3 * cell_w
    height = 4 * cell_h
    img = Image.new('RGBA', (width, height), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Simple color palette
    body_color = '#3498db'
    head_color = '#ecf0f1'
    foot_color = '#e74c3c'
    
    for row in range(4):
        for col in range(3):
            # Base center of the character in this cell
            cx = (col * cell_w) + (cell_w // 2)
            cy = (row * cell_h) + (cell_h // 2) + 10
            
            # Head
            draw.ellipse([cx - 15, cy - 40, cx + 15, cy - 10], fill=head_color)
            # Body
            draw.rectangle([cx - 20, cy - 10, cx + 20, cy + 30], fill=body_color)
            
            # Feet animation logic
            # Col 0: Left foot forward (or right foot forward depending on view)
            # Col 1: Standing (feet together)
            # Col 2: Right foot forward
            
            left_foot_y = cy + 30
            right_foot_y = cy + 30
            left_foot_x = cx - 15
            right_foot_x = cx + 5
            
            if col == 0:
                if row in [0, 3]: # Down or Up
                    left_foot_y -= 10
                elif row == 1: # Left
                    left_foot_x -= 15
                    right_foot_x += 10
                elif row == 2: # Right
                    left_foot_x += 10
                    right_foot_x -= 15
            elif col == 2:
                if row in [0, 3]:
                    right_foot_y -= 10
                elif row == 1: # Left
                    left_foot_x += 10
                    right_foot_x -= 15
                elif row == 2: # Right
                    left_foot_x -= 15
                    right_foot_x += 10
                    
            # Draw feet
            draw.rectangle([left_foot_x, left_foot_y, left_foot_x + 10, left_foot_y + 10], fill=foot_color)
            draw.rectangle([right_foot_x, right_foot_y, right_foot_x + 10, right_foot_y + 10], fill=foot_color)
            
    img.save(filename)
    print(f"Template saved to {filename}")

if __name__ == "__main__":
    create_walk_template('atlas/template_3x4_walk.png')
