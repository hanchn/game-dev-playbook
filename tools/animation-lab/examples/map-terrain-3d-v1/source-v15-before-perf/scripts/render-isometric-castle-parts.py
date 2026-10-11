"""Render retained castle module assembly into separate depth-sortable 2D sprite layers."""
import bpy, math, json, hashlib, pathlib
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view
import numpy as np
root=pathlib.Path(__file__).resolve().parents[1];out=root/'public/map-resources/derived-isometric-castle';out.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
placements=[(-.28,-.28,'tower-square',0),(.28,-.28,'tower-square',0),(-.28,.28,'tower-square',0),(.28,.28,'tower-square',0),(0,-.28,'wall',math.pi/2),(0,.28,'wall-doorway',math.pi/2),(-.28,0,'wall',0),(.28,0,'wall',0)];parts=[];footprint=22.4
for i,(dx,dz,name,yaw) in enumerate(placements):
 src=root/f'public/map-resources/kenney-castle-kit/assets/Models/GLB format/{name}.glb';previous=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(src));meshes=[o for o in set(bpy.data.objects)-previous if o.type=='MESH'];pts=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box];low=Vector(tuple(min(v[j] for v in pts) for j in range(3)));high=Vector(tuple(max(v[j] for v in pts) for j in range(3)));size=high-low;scale=footprint*.28/max(size.x,size.y);anchor=Matrix.Translation(Vector((-(low.x+high.x)/2,-(low.y+high.y)/2,-low.z)));transform=Matrix.Translation(Vector((dx*footprint,-dz*footprint,0)))@Matrix.Rotation(yaw,4,'Z')@Matrix.Scale(scale,4)@anchor
 for o in meshes:o.matrix_world=transform@o.matrix_world
 parts.append((i,dx,dz,name,src,meshes))
scene=bpy.context.scene
try:scene.render.engine='BLENDER_EEVEE_NEXT'
except Exception:scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=1024;scene.render.resolution_y=1024;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='Standard';scene.world=bpy.data.worlds.new('sprite-world');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.75,.79,.82,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
for name,loc,power,area in [('key',(-10,-16,30),2300,18),('fill',(20,6,20),1000,14)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=area;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,3))-o.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('isometric-sprite');data.type='ORTHO';data.ortho_scale=31;camera=bpy.data.objects.new('isometric-sprite',data);scene.collection.objects.link(camera);target=Vector((0,0,3.5));camera.location=target+Vector((30,-30,math.sqrt(1800)*math.tan(math.radians(30))));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();scene.camera=camera;assets=[]
for i,dx,dz,name,src,meshes in parts:
 for _,_,_,_,_,group in parts:
  for o in group:o.hide_render=o not in meshes
 file=out/f'module-{i}.png';scene.render.filepath=str(file);bpy.ops.render.render(write_still=True);image=bpy.data.images.load(str(file));rgba=np.array(image.pixels[:]).reshape(1024,1024,4);yy,xx=np.where(rgba[:,:,3]>0);rect=[int(xx.min()),int(1023-yy.max()),int(xx.max()-xx.min()+1),int(yy.max()-yy.min()+1)];anchor=world_to_camera_view(scene,camera,Vector((dx*footprint,-dz*footprint,0)));ground=[anchor.x*1024,(1-anchor.y)*1024];raw=file.read_bytes();sha=hashlib.sha256(raw).hexdigest();pinned=f'module-{i}-{sha[:12]}.png';(out/pinned).write_bytes(raw);assets.append(dict(id=i,name=name,path=pinned,sha256=sha,rect=rect,anchorX=(ground[0]-rect[0])/rect[2],anchorY=(ground[1]-rect[1])/rect[3],sourceX=dx*footprint,sourceZ=dz*footprint,source=str(src.relative_to(root)),sourceSHA256=hashlib.sha256(src.read_bytes()).hexdigest()))
(out/'parts.json').write_text(json.dumps(dict(schema='source-model-isometric-parts/v1',assets=assets,renderer={'blender':bpy.app.version_string,'orthoScale':31,'elevation':30,'azimuth':45,'resolution':1024},script={'path':'scripts/render-isometric-castle-parts.py','sha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()},qa={'visualAccepted':False,'engineImported':False}),indent=2)+'\n');print('CASTLE_LAYERS',len(assets))
