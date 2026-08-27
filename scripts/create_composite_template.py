from PIL import Image

def create_composite():
    walk_img = Image.open('atlas/char1_jrpg_walk.png').convert('RGBA')
    template = Image.open('atlas/template_3x4_walk.png').convert('RGBA')
    
    # walk_img is 384x512, each cell is 128x128.
    # We want to extract column 1 (x: 128 to 256)
    middle_col = walk_img.crop((128, 0, 256, 512))
    
    # Create a new white image of the same size as template
    composite = Image.new('RGBA', template.size, (255, 255, 255, 255))
    
    # Paste the stick figure template
    composite.paste(template, (0, 0), template)
    
    # Create a white mask over the middle column of the template to hide the stick figures
    from PIL import ImageDraw
    draw = ImageDraw.Draw(composite)
    draw.rectangle([128, 0, 256, 512], fill=(255, 255, 255, 255))
    
    # Paste the extracted character middle column
    composite.paste(middle_col, (128, 0), middle_col)
    
    composite.save('atlas/composite_3x4_walk.png')
    print("Composite template created at atlas/composite_3x4_walk.png")

if __name__ == "__main__":
    create_composite()
