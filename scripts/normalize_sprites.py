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

    def get_max_char_height(img, fx, fy):
        max_h = 1
        sw = img.width // fx
        sh = img.height // fy
        for r in range(fy):
            for c in range(fx):
                box = (c * sw, r * sh, (c + 1) * sw, (r + 1) * sh)
                bbox = img.crop(box).getbbox()
                if bbox:
                    max_h = max(max_h, bbox[3] - bbox[1])
        return max_h

    walk_h = get_max_char_height(walk_img, frames_x, frames_y)
    scale = 96.0 / walk_h
    
    def layout_frames(img):
        slot_width_raw = img.width // frames_x
        slot_height_raw = img.height // frames_y
        
        canvas = Image.new("RGBA", (target_slot_width * frames_x, target_height * frames_y), (0, 0, 0, 0))
        
        for r in range(frames_y):
            # Find the max bottom for this row to prevent vertical jitter
            row_max_bottom = 0
            for c in range(frames_x):
                box = (c * slot_width_raw, r * slot_height_raw, (c + 1) * slot_width_raw, (r + 1) * slot_height_raw)
                cell_bbox = img.crop(box).getbbox()
                if cell_bbox:
                    row_max_bottom = max(row_max_bottom, cell_bbox[3])
                    
            if row_max_bottom == 0:
                row_max_bottom = slot_height_raw # fallback
                
            scaled_row_bottom = int(row_max_bottom * scale)
            # Align the lowest foot in this row to 16px from the bottom of the slot
            paste_y = (target_height - 16) - scaled_row_bottom
            
            for c in range(frames_x):
                box = (c * slot_width_raw, r * slot_height_raw, (c + 1) * slot_width_raw, (r + 1) * slot_height_raw)
                slot_img = img.crop(box)
                
                new_w = int(slot_width_raw * scale)
                new_h = int(slot_height_raw * scale)
                
                slot_scaled = slot_img.resize((new_w, new_h), Image.Resampling.NEAREST)
                
                # Center horizontally based on the cell
                paste_x = (target_slot_width - new_w) // 2
                
                x_offset = (c * target_slot_width) + paste_x
                y_offset = (r * target_height) + paste_y
                
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
