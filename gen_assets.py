from PIL import Image, ImageDraw, ImageFont

def create_img(name, color, size=(128, 128), text=""):
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Draw circle or square
    if 'com' in name or 'merged' in name or '_1' in name or '_2' in name or '_3' in name:
        # Square-ish
        draw.rectangle([10, 10, size[0]-10, size[1]-10], fill=color, outline='white', width=4)
    else:
        # Circle
        draw.ellipse([5, 5, size[0]-5, size[1]-5], fill=color, outline='white', width=4)
    
    if text:
        # draw text roughly center
        draw.text((size[0]//4, size[1]//2), text, fill="white")
    
    img.save(f"static/assets/{name}")

# Normal (Spheres)
create_img('202601_r.png', (231, 76, 60)) # Red
create_img('202601_y.png', (241, 196, 15)) # Yellow
create_img('202601_p.png', (155, 89, 182)) # Purple

# Merged (Squares)
create_img('202601_1.png', (192, 57, 43), size=(256, 256), text="RED+")
create_img('202601_2.png', (243, 156, 18), size=(256, 256), text="YEL+")
create_img('202601_3.png', (142, 68, 173), size=(256, 256), text="PUR+")

# Final
create_img('202601_com.png', (46, 204, 113), size=(512, 512), text="2026")
