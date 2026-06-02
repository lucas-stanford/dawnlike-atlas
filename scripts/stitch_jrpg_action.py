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

def extract_3_frames(img):
    frames = []
    w, h = img.size
    
    # If the image is wide and short, it's likely a 1x3 or 1x4 strip
    if w / h > 2.0:
        slot_w = w // 3
        for i in range(3):
            frames.append(img.crop((i * slot_w, 0, (i + 1) * slot_w, h)))
    # If the image is relatively square, it's likely a 2x2 grid
    else:
        slot_w = w // 2
        slot_h = h // 2
        # Extract Top Left, Top Right, Bottom Left
        frames.append(img.crop((0, 0, slot_w, slot_h)))
        frames.append(img.crop((slot_w, 0, w, slot_h)))
        frames.append(img.crop((0, slot_h, slot_w, h)))
        
    return frames

def stitch_jrpg_action(paths, output_path, target_slot=128):
    canvas = Image.new("RGBA", (target_slot * 3, target_slot * 4), (0, 0, 0, 0))
    
    # Base scale off the Down image (which we know is 1x3)
    down_img = remove_white(Image.open(paths[0]))
    down_frames = extract_3_frames(down_img)
    base_bbox = down_frames[0].getbbox()
    raw_char_height = base_bbox[3] - base_bbox[1]
    scale = 96.0 / raw_char_height
    
    for row, path in enumerate(paths):
        if not os.path.exists(path):
            print(f"Missing {path}")
            continue
            
        img = remove_white(Image.open(path))
        frames = extract_3_frames(img)
        
        for col in range(3):
            slot_img = frames[col]
            bbox = slot_img.getbbox()
            if not bbox: continue
            
            # Crop to the actual sprite within this cell
            cropped_sprite = slot_img.crop(bbox)
            
            new_w = int(cropped_sprite.width * scale)
            new_h = int(cropped_sprite.height * scale)
            if new_w == 0 or new_h == 0: continue
            
            slot_scaled = cropped_sprite.resize((new_w, new_h), Image.Resampling.NEAREST)
            
            # Bottom center within its 128x128 slot
            y_offset = (row * target_slot) + (target_slot - new_h)
            x_offset = (col * target_slot) + (target_slot - new_w) // 2
            
            canvas.paste(slot_scaled, (x_offset, y_offset), slot_scaled)
            
    canvas.save(output_path)
    print(f"Successfully stitched action grid into {output_path}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) == 6:
        paths = sys.argv[1:5]
        out_path = sys.argv[5]
        stitch_jrpg_action(paths, out_path)
    else:
        print("Usage: python stitch_jrpg_action.py <down> <left> <right> <up> <output>")
