from PIL import Image, ImageDraw

def draw_pixel_staff(draw, col, cx, cy):
    # Colors
    staff_color = (139, 69, 19, 255) # SaddleBrown
    gem_color = (0, 191, 255, 255)   # DeepSkyBlue
    highlight = (135, 206, 250, 255) # LightSkyBlue
    
    if col == 0:
        sx, sy = cx - 30, cy - 30
        ex, ey = cx + 10, cy + 10
    elif col == 1:
        sx, sy = cx + 30, cy - 10
        ex, ey = cx - 30, cy + 10
    else:
        sx, sy = cx + 30, cy + 20
        ex, ey = cx - 10, cy - 20
        
    # Draw thick line for staff
    draw.line([sx, sy, ex, ey], fill=staff_color, width=4)
    # Highlight
    draw.line([sx+1, sy+1, ex+1, ey+1], fill=(160, 82, 45, 255), width=1)
    
    # The top of the staff is (sx, sy) because it's swung
    # Actually wait.
    # Col 0 (Windup): staff top is back and high (sx, sy) = (cx - 30, cy - 30).
    # Col 1 (Swing): staff top is forward and high (sx, sy) = (cx + 30, cy - 10).
    # Col 2 (Follow): staff top is forward and low (sx, sy) = (cx + 30, cy + 20).
    
    # Draw gem
    draw.ellipse([sx - 4, sy - 4, sx + 4, sy + 4], fill=gem_color)
    draw.ellipse([sx - 2, sy - 2, sx, sy], fill=highlight)

def composite_action():
    neutral = Image.open('atlas/char1_walk.png').convert('RGBA')
    action_ai = Image.open('atlas/char1_jrpg_action.png').convert('RGBA')
    
    result = Image.new('RGBA', action_ai.size, (0, 0, 0, 0))
    cw = 128
    ch = 128
    
    for r in range(4):
        neutral_cell = neutral.crop((r*cw, 0, (r+1)*cw, ch))
        for c in range(3):
            ai_cell = action_ai.crop((c*cw, r*ch, (c+1)*cw, (r+1)*ch))
            combined = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
            
            # 1. Base: The neutral torso.
            # Why neutral torso? Because it guarantees NO JITTER and NO MISSING BITS.
            # We can use the neutral torso, but we need to erase the neutral staff so we can draw the swinging one!
            # The neutral staff is straight up and down on one side.
            # Erasing it cleanly from the pixel art might be tough.
            
            # Let's use the AI cell as the base, because the AI actually drew swinging arms!
            combined.paste(ai_cell, (0, 0))
            
            # 2. Draw the staff OVER the AI cell. This guarantees the staff is 100% visible and swinging perfectly!
            draw = ImageDraw.Draw(combined)
            draw_pixel_staff(draw, c, cw//2, ch//2 - 10) # slightly above center for shoulders
            
            # 3. Paste the neutral legs to completely eliminate jumping!
            split_y = 90
            legs = neutral_cell.crop((0, split_y, cw, ch))
            draw.rectangle([0, split_y, cw, ch], fill=(0,0,0,0))
            combined.paste(legs, (0, split_y), legs)
            
            result.paste(combined, (c*cw, r*ch))
            
    result.save('atlas/char1_jrpg_action.png')
    print("Action cycle perfectly reconstructed!")

if __name__ == "__main__":
    composite_action()
