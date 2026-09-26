from PIL import Image
import sys

img = Image.open("public/miss-minutes.png").convert("RGBA")
width, height = img.size
pixels = img.load()

queue = [(x, y) for x in range(width) for y in (0, height-1)] + [(x, y) for y in range(height) for x in (0, width-1)]
visited = set()

def is_bg(c):
    return c[0] > 230 and c[1] > 230 and c[2] > 230 and c[3] > 100

for start_node in queue:
    if start_node in visited:
        continue
    if not is_bg(pixels[start_node]):
        continue
        
    local_q = [start_node]
    while local_q:
        x, y = local_q.pop(0)
        if (x, y) in visited:
            continue
        visited.add((x, y))
        
        if x < 0 or x >= width or y < 0 or y >= height:
            continue
            
        c = pixels[x, y]
        if is_bg(c):
            pixels[x, y] = (255, 255, 255, 0)
            if x+1 < width: local_q.append((x+1, y))
            if x-1 >= 0: local_q.append((x-1, y))
            if y+1 < height: local_q.append((x, y+1))
            if y-1 >= 0: local_q.append((x, y-1))

left_char = img.crop((0, 0, width // 2, height))
left_char.save("public/miss-minutes-transparent.png")
print("Done!")
