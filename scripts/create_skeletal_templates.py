import os
from PIL import Image, ImageDraw

def create_walk_template(filename, cell_w=128, cell_h=128):
    width = 3 * cell_w
    height = 4 * cell_h
    img = Image.new('RGBA', (width, height), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    line_color = '#2c3e50'
    head_color = '#ecf0f1'
    
    for row in range(4):
        for col in range(3):
            cx = (col * cell_w) + (cell_w // 2)
            cy = (row * cell_h) + (cell_h // 2)
            
            # Head
            draw.ellipse([cx - 15, cy - 40, cx + 15, cy - 10], fill=head_color, outline=line_color, width=2)
            
            # Spine
            draw.line([cx, cy - 10, cx, cy + 20], fill=line_color, width=4)
            
            # Shoulders
            draw.line([cx - 15, cy - 5, cx + 15, cy - 5], fill=line_color, width=4)
            
            # Hips
            draw.line([cx - 10, cy + 20, cx + 10, cy + 20], fill=line_color, width=4)
            
            # Legs and Arms
            # 0: Down, 1: Left, 2: Right, 3: Up
            
            arm_y_rest = cy + 15
            arm_y_swing = cy - 5
            
            leg_y_rest = cy + 50
            leg_y_swing_f = cy + 40
            leg_y_swing_b = cy + 45
            
            if col == 1: # Neutral
                # Arms straight down
                draw.line([cx - 15, cy - 5, cx - 15, arm_y_rest], fill=line_color, width=4)
                draw.line([cx + 15, cy - 5, cx + 15, arm_y_rest], fill=line_color, width=4)
                # Legs straight down
                draw.line([cx - 10, cy + 20, cx - 10, leg_y_rest], fill=line_color, width=4)
                draw.line([cx + 10, cy + 20, cx + 10, leg_y_rest], fill=line_color, width=4)
                
            elif col == 0: # Left foot forward
                # Right arm forward, Left arm back
                draw.line([cx - 15, cy - 5, cx - 25, arm_y_swing], fill=line_color, width=4) # Left arm back
                draw.line([cx + 15, cy - 5, cx + 25, arm_y_swing], fill=line_color, width=4) # Right arm fwd
                # Left leg forward, Right leg back
                draw.line([cx - 10, cy + 20, cx - 20, leg_y_swing_f], fill=line_color, width=4) # Left leg fwd
                draw.line([cx + 10, cy + 20, cx + 20, leg_y_swing_b], fill=line_color, width=4) # Right leg back
                
            elif col == 2: # Right foot forward
                # Left arm forward, Right arm back
                draw.line([cx - 15, cy - 5, cx - 25, arm_y_swing], fill=line_color, width=4) # Left arm fwd
                draw.line([cx + 15, cy - 5, cx + 25, arm_y_swing], fill=line_color, width=4) # Right arm back
                # Right leg forward, Left leg back
                draw.line([cx - 10, cy + 20, cx - 20, leg_y_swing_b], fill=line_color, width=4) # Left leg back
                draw.line([cx + 10, cy + 20, cx + 20, leg_y_swing_f], fill=line_color, width=4) # Right leg fwd
                
    img.save(filename)
    print(f"Walk Template saved to {filename}")

def create_action_template(dir_name, row_idx, filename, cell_w=128, cell_h=128):
    width = 3 * cell_w
    height = cell_h
    img = Image.new('RGBA', (width, height), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    line_color = '#2c3e50'
    head_color = '#ecf0f1'
    staff_color = '#e67e22'
    
    for col in range(3):
        cx = (col * cell_w) + (cell_w // 2)
        cy = (cell_h // 2)
        
        # Base body
        draw.ellipse([cx - 15, cy - 40, cx + 15, cy - 10], fill=head_color, outline=line_color, width=2)
        draw.line([cx, cy - 10, cx, cy + 20], fill=line_color, width=4) # spine
        draw.line([cx - 15, cy - 5, cx + 15, cy - 5], fill=line_color, width=4) # shoulders
        
        # Legs spread in combat stance
        draw.line([cx, cy + 20, cx - 15, cy + 50], fill=line_color, width=4)
        draw.line([cx, cy + 20, cx + 15, cy + 50], fill=line_color, width=4)
        
        # Action phases: 0 = Windup, 1 = Swing, 2 = Follow through
        # We will just draw the staff at different angles
        staff_len = 40
        if col == 0:
            sx, sy = cx - 30, cy - 30
            ex, ey = cx + 10, cy + 10
        elif col == 1:
            sx, sy = cx + 30, cy - 10
            ex, ey = cx - 30, cy + 10
        else:
            sx, sy = cx + 30, cy + 20
            ex, ey = cx - 10, cy - 20
            
        # Draw arms holding staff
        draw.line([cx - 15, cy - 5, (sx+ex)/2 - 10, (sy+ey)/2], fill=line_color, width=4)
        draw.line([cx + 15, cy - 5, (sx+ex)/2 + 10, (sy+ey)/2], fill=line_color, width=4)
        
        # Draw staff
        draw.line([sx, sy, ex, ey], fill=staff_color, width=6)
        
    img.save(filename)
    print(f"Action Template {dir_name} saved to {filename}")

if __name__ == "__main__":
    create_walk_template('atlas/template_3x4_walk.png')
    create_action_template('down', 0, 'atlas/template_1x3_action_down.png')
    create_action_template('left', 1, 'atlas/template_1x3_action_left.png')
    create_action_template('right', 2, 'atlas/template_1x3_action_right.png')
    create_action_template('up', 3, 'atlas/template_1x3_action_up.png')
