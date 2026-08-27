from PIL import Image

def split_templates():
    template = Image.open('atlas/template_3x4_walk.png').convert('RGBA')
    
    # Template is 384 x 512. Columns are 128px wide.
    left_foot = Image.new('RGBA', (128, 512), (255, 255, 255, 255))
    right_foot = Image.new('RGBA', (128, 512), (255, 255, 255, 255))
    
    # Left foot is col 0
    left_col = template.crop((0, 0, 128, 512))
    left_foot.paste(left_col, (0, 0))
    left_foot.save('atlas/template_1x4_left_foot.png')
    
    # Right foot is col 2
    right_col = template.crop((256, 0, 384, 512))
    right_foot.paste(right_col, (0, 0))
    right_foot.save('atlas/template_1x4_right_foot.png')
    
    print("Created template_1x4_left_foot.png and template_1x4_right_foot.png")

if __name__ == "__main__":
    split_templates()
