import pathlib,bpy,json,hashlib
p=pathlib.Path(__file__).with_name('render-polyhaven-nature-rooted.py');code=p.read_text().split("if '--boulder'")[0]
exec(compile(code,str(p),'exec'))
OUT=R/'public/map-resources/polyhaven-nature-candidate-v3';OUT.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);src=R/'public/map-resources/polyhaven-nature-candidate-v2/tree-mid.glb';bpy.ops.import_scene.gltf(filepath=str(src));objs=[o for o in bpy.data.objects if o.type=='MESH']
oldsetup=setup
def setup(objs,ortho):
 s,c=oldsetup(objs,ortho);s.view_settings.view_transform='Standard'
 for o in bpy.data.objects:
  if o.type=='LIGHT':o.data.energy*=.45
 return s,c
v=render(objs,'tree-standard',0,6.3);(OUT/'light-probe.json').write_text(json.dumps(v,indent=2))
