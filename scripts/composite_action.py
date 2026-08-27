from PIL import Image

def composite_action():
    # The perfect 1x4 neutral poses
    neutral = Image.open('atlas/char1_walk.png').convert('RGBA')
    # The JRPG 3x4 action cycle that has missing staffs and jitter
    action_ai = Image.open('atlas/char1_jrpg_action.png').convert('RGBA')
    
    result = Image.new('RGBA', action_ai.size, (0, 0, 0, 0))
    
    cw = 128
    ch = 128
    
    for r in range(4):
        # Extract the perfect neutral pose for this row
        neutral_cell = neutral.crop((r*cw, 0, (r+1)*cw, ch))
        
        for c in range(3):
            # Extract the AI generated action cell
            ai_cell = action_ai.crop((c*cw, r*ch, (c+1)*cw, (r+1)*ch))
            
            combined = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
            
            # The action frames have swinging arms. The neutral pose has straight arms.
            # If we paste the neutral body (legs and torso) and then the AI's swinging arms on top...
            # The AI's arms might be hard to isolate without background. 
            # But the AI generated images have transparent backgrounds (thanks to normalize_sprites)!
            # So we can just paste the AI cell over the neutral body?
            # No, because the AI cell has its own body which might be jittery.
            
            # Since the user specifically complained about missing staffs and feet jumping:
            # We can paste the AI cell first (which provides the swinging staff and arms)
            # Then paste the neutral legs over it to fix the jumping feet!
            # Wait, if we paste neutral legs over AI legs, the feet will never jump!
            # And to fix the missing staff... if the staff is missing in the AI cell, pasting neutral legs won't bring it back.
            # But the neutral pose HAS the staff!
            # If we paste the neutral torso (which has the staff), it ruins the swing animation.
            
            # Let's paste the AI cell FIRST.
            combined.paste(ai_cell, (0, 0))
            
            # Then paste the neutral LEGS to firmly plant the character and prevent jumping!
            split_y = 90
            legs = neutral_cell.crop((0, split_y, cw, ch))
            
            # We can optionally clear the bottom half of the combined cell to ensure no AI legs peek through
            from PIL import ImageDraw
            draw = ImageDraw.Draw(combined)
            draw.rectangle([0, split_y, cw, ch], fill=(0,0,0,0))
            
            combined.paste(legs, (0, split_y), legs)
            
            result.paste(combined, (c*cw, r*ch))
            
    result.save('atlas/char1_jrpg_action.png')
    print("Action cycle feet fixed via Frankenstein compositing!")

if __name__ == "__main__":
    composite_action()
