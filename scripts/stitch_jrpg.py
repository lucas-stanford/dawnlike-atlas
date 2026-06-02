import os
from PIL import Image

def remove_white(img):
    img = img.convert("RGBA")
    data = img.getdata()
    new_data = []
    for item in data:
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    return img

def stitch_jrpg(paths, output_path, target_slot=128):
    canvas = Image.new("RGBA", (target_slot * 3, target_slot * 4), (0, 0, 0, 0))
    
    # Calculate a unified scale factor based on the Down walk to maintain consistent sizing across all views
    down_img = remove_white(Image.open(paths[0]))
    down_bbox = down_img.getbbox()
    raw_char_height = down_bbox[3] - down_bbox[1]
    scale = 96.0 / raw_char_height
    
    for row, path in enumerate(paths):
        if not os.path.exists(path):
            print(f"Missing {path}")
            continue
            
        img = remove_white(Image.open(path))
        slot_width_raw = img.width // 3
        
        # We need the local top/bottom of this specific directional strip to prevent vertical jitter
        bbox = img.getbbox()
        if not bbox: continue
        this_top = bbox[1]
        this_bottom = bbox[3]
        
        for col in range(3):
            # Crop the raw cell, using this_top and this_bottom to ensure we crop tightly to the sprite
            box = (col * slot_width_raw, this_top, (col + 1) * slot_width_raw, this_bottom)
            slot_img = img.crop(box)
            
            new_w = int(slot_img.width * scale)
            new_h = int(slot_img.height * scale)
            if new_w == 0 or new_h == 0: continue
            
            slot_scaled = slot_img.resize((new_w, new_h), Image.Resampling.NEAREST)
            
            # Bottom center within its 128x128 slot
            y_offset = (row * target_slot) + (target_slot - new_h)
            x_offset = (col * target_slot) + (target_slot - new_w) // 2
            
            canvas.paste(slot_scaled, (x_offset, y_offset), slot_scaled)
            
    canvas.save(output_path)
    print(f"Successfully stitched and normalized into {output_path}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) == 6:
        paths = sys.argv[1:5]
        out_path = sys.argv[5]
        stitch_jrpg(paths, out_path)
    else:
        print("Usage: python stitch_jrpg.py <down> <left> <right> <up> <output>")
