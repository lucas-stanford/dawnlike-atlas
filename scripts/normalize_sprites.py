import os
from PIL import Image

def process_sprite(walk_path, action_path, target_slot_width=128, target_height=128, frames_x=4, frames_y=1):
    if not os.path.exists(walk_path) or not os.path.exists(action_path):
        return

    walk_img = Image.open(walk_path).convert("RGBA")
    action_img = Image.open(action_path).convert("RGBA")

    def remove_white(img):
        data = img.getdata()
        new_data = []
        for item in data:
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        img.putdata(new_data)
        return img

    walk_img = remove_white(walk_img)
    action_img = remove_white(action_img)

    walk_bbox = walk_img.getbbox()
    if not walk_bbox: return
    
    global_top = walk_bbox[1]
    global_bottom = walk_bbox[3]
    raw_char_height = global_bottom - global_top
    scale = 96.0 / raw_char_height
    
    def layout_frames(img):
        slot_width_raw = img.width // frames_x
        slot_height_raw = img.height // frames_y
        
        bbox = img.getbbox()
        if not bbox: return None
        
        this_top = bbox[1]
        this_bottom = bbox[3]
        
        canvas = Image.new("RGBA", (target_slot_width * frames_x, target_height * frames_y), (0, 0, 0, 0))
        
        for r in range(frames_y):
            for c in range(frames_x):
                # Crop the cell
                box = (c * slot_width_raw, r * slot_height_raw, (c + 1) * slot_width_raw, (r + 1) * slot_height_raw)
                slot_img = img.crop(box)
                
                # Further crop vertically to standard bounds
                # But wait! If we crop using global this_top/this_bottom, it assumes 1x4 horizontal!
                # If it's a 3x4 grid, the global top/bottom is over the entire 12-frame image.
                # If we crop (this_top, this_bottom), those bounds might extend OUTSIDE the current cell's `slot_height_raw`!
                # For a grid, we should just scale the entire cell down and center it.
                # Since the AI spaces them evenly, the cell itself acts as the bounds.
                # Actually, to prevent jitter, we scale the cell contents.
                cell_bbox = slot_img.getbbox()
                if not cell_bbox: continue
                
                # Instead of cropping vertically to a global bound, we crop to the cell's own bounding box
                # But to prevent vertical jitter, we find the floor of the specific row.
                # For simplicity in 3x4 RPG Maker grids, we just scale the whole cell.
                new_w = int(slot_img.width * scale)
                new_h = int(slot_img.height * scale)
                
                slot_scaled = slot_img.resize((new_w, new_h), Image.Resampling.NEAREST)
                
                # Bottom center within its 128x128 slot
                y_offset = (r * target_height) + (target_height - new_h)
                x_offset = (c * target_slot_width) + (target_slot_width - new_w) // 2
                
                canvas.paste(slot_scaled, (x_offset, y_offset), slot_scaled)
            
        return canvas

    final_walk = layout_frames(walk_img)
    final_action = layout_frames(action_img)

    if final_walk: final_walk.save(walk_path)
    if final_action: final_action.save(action_path)

if __name__ == "__main__":
    for i in range(1, 4):
        # Process 16-bit 1x4 style
        process_sprite(f"atlas/char{i}_walk.png", f"atlas/char{i}_action.png", frames_x=4, frames_y=1)
        # Process JRPG 3x4 style
        process_sprite(f"atlas/char{i}_jrpg_walk.png", f"atlas/char{i}_jrpg_action.png", frames_x=3, frames_y=4)
