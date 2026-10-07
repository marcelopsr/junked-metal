# Export: /Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/cars/buggy/export.py
import os, runpy
runpy.run_path(os.path.join(os.path.dirname(__file__), "build.py"), run_name="__main__")
