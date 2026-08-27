from PIL import Image

def composite_walk():
    # The perfect 1x4 neutral poses
    neutral = Image.open('atlas/char1_walk.png').convert('RGBA')
    # The JRPG 3x4 walk cycle that has good legs but bad staffs/jitter
    walk_ai = Image.open('atlas/char1_jrpg_walk.png').convert('RGBA')
    
    # We will create a new 3x4 grid
    result = Image.new('RGBA', walk_ai.size, (0, 0, 0, 0))
    
    # Cell size is 128x128
    cw = 128
    ch = 128
    
    # Let's say the split point between torso and legs is around y=90
    split_y = 90
    
    for r in range(4):
        # Extract the perfect neutral pose for this row
        neutral_cell = neutral.crop((r*cw, 0, (r+1)*cw, ch))
        
        for c in range(3):
            # Extract the AI generated walk cell
            ai_cell = walk_ai.crop((c*cw, r*ch, (c+1)*cw, (r+1)*ch))
            
            # Create a combined cell
            combined = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
            
            # Paste the AI legs (bottom part)
            legs = ai_cell.crop((0, split_y, cw, ch))
            combined.paste(legs, (0, split_y))
            
            # Paste the neutral upper body (top part)
            torso = neutral_cell.crop((0, 0, cw, split_y))
            
            # To simulate walking, we can bounce the torso down by 2 pixels on the stepping frames (cols 0 and 2)
            bounce = 2 if c != 1 else 0
            
            # If we bounce the torso, we need to make sure we don't leave a gap.
            # So we'll paste the torso slightly lower, and maybe crop the legs slightly lower.
            # Actually, a simpler way is to paste the torso OVER the legs.
            # But the torso has transparent background. So we just paste the torso over the legs!
            # Wait, if we paste torso over legs, the legs behind the torso might show if the torso is thinner.
            # But they are the same character.
            
            # Let's just paste the neutral torso!
            combined.paste(torso, (0, bounce), torso)
            
            result.paste(combined, (c*cw, r*ch))
            
    result.save('atlas/char1_jrpg_walk.png')
    print("Perfect JRPG walk cycle generated via Frankenstein compositing!")

if __name__ == "__main__":
    composite_walk()
