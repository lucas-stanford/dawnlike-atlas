from PIL import Image

def create_composite():
    walk_1x4 = Image.open('atlas/char1_walk.png').convert('RGBA')
    template = Image.open('atlas/template_3x4_walk.png').convert('RGBA')
    
    # walk_1x4 is 512x128. Cell size is 128x128.
    # Frame 0: Down, Frame 1: Left, Frame 2: Right, Frame 3: Up
    
    composite = Image.new('RGBA', template.size, (255, 255, 255, 255))
    
    # Paste the stick figure template
    composite.paste(template, (0, 0), template)
    
    # Erase the middle column of the template
    from PIL import ImageDraw
    draw = ImageDraw.Draw(composite)
    draw.rectangle([128, 0, 256, 512], fill=(255, 255, 255, 255))
    
    # Paste the characters from walk_1x4 into the middle column
    for i in range(4):
        char_cell = walk_1x4.crop((i*128, 0, (i+1)*128, 128))
        composite.paste(char_cell, (128, i*128), char_cell)
        
    composite.save('atlas/perfect_composite_3x4.png')
    print("Perfect composite template created at atlas/perfect_composite_3x4.png")

if __name__ == "__main__":
    create_composite()
