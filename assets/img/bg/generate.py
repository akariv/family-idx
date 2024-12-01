from PIL import Image, ImageDraw, ImageFont

# Specifications
width, height = 600, 900
background_color = (173, 216, 230)  # light blue
text_color = (255, 165, 0)  # orange
font_size = 450
num_images = 8

# Function to create an image with a number
def create_image(index):
    # Create an image with light blue background
    image = Image.new('RGB', (width, height), background_color)
    draw = ImageDraw.Draw(image)
    
    # Load a font
    font = ImageFont.truetype("/Users/adam/Library/Fonts/Assistant-Bold.ttf", font_size)
    
    # Calculate text size and position
    text = str(index)
    text_bbox = draw.textbbox((0, 0), text, font=font)
    print(text_bbox)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    text_x = (width - text_width) // 2 - text_bbox[0]
    text_y = (height - text_height) // 2 - text_bbox[1]
    
    # Draw the number in orange
    draw.text((text_x, text_y), text, fill=text_color, font=font)
    
    # Save the image
    image.save(f'bg{index}.jpg')

# Create images
for i in range(1, num_images + 1):
    create_image(i)

print("Images created successfully.")