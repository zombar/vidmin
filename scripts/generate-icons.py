#!/usr/bin/env python3
"""Generate Windows .ico file from PNG source."""

from PIL import Image
import os

def generate_ico(source_path, output_path):
    """Generate a Windows .ico file with multiple sizes."""
    # Windows ICO should contain these sizes
    sizes = [16, 24, 32, 48, 64, 128, 256]

    # Open source image
    source = Image.open(source_path)

    # Ensure it's RGBA
    if source.mode != 'RGBA':
        source = source.convert('RGBA')

    # Create resized versions as a list of images
    icons = []
    for size in sizes:
        resized = source.resize((size, size), Image.Resampling.LANCZOS)
        icons.append(resized)

    # Save as ICO - the first image is the base, append_images adds the rest
    # The sizes parameter tells PIL which sizes to include
    icons[-1].save(
        output_path,
        format='ICO',
        append_images=icons[:-1],
    )

    # Verify
    verify = Image.open(output_path)
    print(f"Generated {output_path}")
    print(f"Available sizes: {verify.info.get('sizes', 'unknown')}")

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)

    source = os.path.join(project_root, 'public', 'favicon-512x512.png')
    output = os.path.join(project_root, 'build', 'icon.ico')

    generate_ico(source, output)
