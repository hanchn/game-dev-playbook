"""Render retained source GLBs into style-consistent original PNG assets; does not edit upstream rasters."""
import bpy, pathlib, math, json, hashlib
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view
import numpy as np
root=pathlib.Path(__file__).resolve().parents[1];out=root/'public/map-resources/derived-isometric-nature';out.mkdir(exist_ok=True)
models=['tree_pineTallA','tree_pineTallB','tree_oak','tree_small','plant_bushLarge','rock_largeA','rock_largeB','mushroom_redGroup']
palette={'grass':'596e33','dirt':'88735b','leafsGreen':'426d38','leafsGreenDark':'355637','leafsDark':'355637','leafs':'426d38'}
def rgba(value):
 c=[int(value[i:i+2],16)/255 for i in (0,2,4)];return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c)+(1,)
assets=[]
for name in models:
 bpy.ops.wm.read_factory_settings(use_empty=True);source=root/f'public/map-resources/kenney-nature-kit/assets/Models/GLTF format/{name}.glb';bpy.ops.import_scene.gltf(filepath=str(source));meshes=[o for o in bpy.data.objects if o.type=='MESH'];pts=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box];low=Vector(tuple(min(v[j] for v in pts) for j in range(3)));high=Vector(tuple(max(v[j] for v in pts) for j in range(3)));center=Vector(((low.x+high.x)/2,(low.y+high.y)/2,low.z));anchor=Matrix.Translation(-center)
 for o in meshes:
  o.matrix_world=anchor@o.matrix_world
  for m in o.data.materials:
   hexcolor=('84817b' if name.startswith('rock') and m.name.startswith('grass') else palette.get(m.name))
   if hexcolor:
    m.diffuse_color=rgba(hexcolor)
    if m.use_nodes:
     for node in m.node_tree.nodes:
      if node.type=='BSDF_PRINCIPLED':
       socket=node.inputs['Base Color']
       for link in list(socket.links):m.node_tree.links.remove(link)
       socket.default_value=rgba(hexcolor);node.inputs['Roughness'].default_value=1
 scene=bpy.context.scene
 try:scene.render.engine='BLENDER_EEVEE_NEXT'
 except Exception:scene.render.engine='BLENDER_EEVEE'
 scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='Standard';scene.world=bpy.data.worlds.new('sprite-world');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
 size=high-low;target=Vector((0,0,size.z*.47));data=bpy.data.cameras.new('isometric-source');data.type='ORTHO';data.ortho_scale=max(size.z*1.25,(size.x+size.y)*.85);camera=bpy.data.objects.new('isometric-source',data);scene.collection.objects.link(camera);camera.location=target+Vector((6,-6,math.sqrt(72)*math.tan(math.radians(30))));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();scene.camera=camera
 light=bpy.data.lights.new('key','AREA');light.energy=700;light.size=5;lamp=bpy.data.objects.new('key',light);scene.collection.objects.link(lamp);lamp.location=(-3,-4,8);lamp.rotation_euler=(target-lamp.location).to_track_quat('-Z','Y').to_euler();
 for index,(loc,power) in enumerate([((3,-4,5),1800),((0,3,5),1200)]):
  data_fill=bpy.data.lights.new('fill-'+str(index),'AREA');data_fill.energy=power;data_fill.size=5;obj_fill=bpy.data.objects.new('fill-'+str(index),data_fill);scene.collection.objects.link(obj_fill);obj_fill.location=loc;obj_fill.rotation_euler=(target-obj_fill.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
 image=bpy.data.images.load(scene.render.filepath);pixels=np.array(image.pixels[:]).reshape(512,512,4);yy,xx=np.where(pixels[:,:,3]>0);rect=[int(xx.min()),int(511-yy.max()),int(xx.max()-xx.min()+1),int(yy.max()-yy.min()+1)];origin=world_to_camera_view(scene,camera,Vector((0,0,0)));ground=[origin.x*512,(1-origin.y)*512];raw=(out/(name+'.png')).read_bytes();sha=hashlib.sha256(raw).hexdigest();pinned=name+'-'+sha[:12]+'.png';(out/pinned).write_bytes(raw);assets.append(dict(name=name,path=pinned,sha256=sha,bytes=len(raw),rect=rect,anchorY=(ground[1]-rect[1])/rect[3],source=str(source.relative_to(root)),sourceSHA256=hashlib.sha256(source.read_bytes()).hexdigest(),sourceSize=list(size),qa={'visualAccepted':False}))
source=dict(schema='derived-isometric-nature/v1',id='derived-isometric-nature',upstreamPage='https://kenney.nl/assets/nature-kit',renderer=dict(blender=bpy.app.version_string,engine=scene.render.engine,resolution=[512,512],azimuthDegrees=45,elevationDegrees=30,bitwiseRerenderGuaranteed=False,lighting='key700 + front fill1800 + back fill1200; no black unlit faces'),derivation='Retained GLB meshes rendered offline with coherent forest material palette; originals unmodified',palette=palette,rockGrassOverride='84817b',assets=assets,script=dict(path='scripts/render-isometric-nature.py',sha256=hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()));(out/'source.json').write_text(json.dumps(source,indent=2)+'\n');print('ASSETS',len(assets))
