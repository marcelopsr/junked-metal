# Export: Blender -b --python assets-src/cars/monster/export.py
import os, runpy
runpy.run_path(os.path.join(os.path.dirname(__file__), "build.py"), run_name="__main__")
