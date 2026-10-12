"""Rerender source/low-LOD reference with current mid-LOD's exact camera, no image edits."""
import pathlib,json,bpy,math,hashlib
from mathutils import Vector
script=pathlib.Path(__file__).with_name('render-polyhaven-nature-rooted.py');exec(compile(script.read_text().split("if '--boulder'")[0],str(script),'exec'))
REPORT=json.loads((OUT/'manifest.json').read_text());mid=next(a for a in REPORT['assets'] if a['id']=='tree-mid');target_z=mid['sizeMeters'][2]*.47
oldsetup=setup
def setup(objs,ortho):
 scene,camera=oldsetup(objs,ortho);target=Vector((0,0,target_z));camera.location=target+Vector((8,-8,math.sqrt(128)*math.tan(math.radians(30))));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();return scene,camera
src=R/'public/map-resources/polyhaven-nature-expansion-v1/tree_small_02/tree_small_02_1k.gltf';bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(src));objs=[o for o in bpy.data.objects if o.type=='MESH'];normalize(objs);REPORT['nativeTree']['render']=render(objs,'tree-native',0,6.3)
for key in ['tree-lod']:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(OUT/(key+'.glb')));objs=[o for o in bpy.data.objects if o.type=='MESH'];a=next(a for a in REPORT['assets'] if a['id']==key);a['views']=[render(objs,key,yaw,6.3) for yaw in [0,90,180,270]]
REPORT['treeCamera']={'position':[8,-8,target_z+math.sqrt(128)*math.tan(math.radians(30))],'target':[0,0,target_z],'orthoMeters':6.3,'resolution':[512,512],'fixedNativeLowMid':True,'scriptSHA256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()};flush()
