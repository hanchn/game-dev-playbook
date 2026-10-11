"""Render original Castle Kit modules to a real reusable PNG sprite, without opening the live Blender session."""
import bpy, math, json, hashlib, pathlib
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view
root=pathlib.Path(__file__).resolve().parents[1];output=root/'public/map-resources/derived-isometric-castle';output.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
modules=[(-.28,-.28,'tower-square',0),(.28,-.28,'tower-square',0),(-.28,.28,'tower-square',0),(.28,.28,'tower-square',0),(0,-.28,'wall',math.pi/2),(0,.28,'wall-doorway',math.pi/2),(-.28,0,'wall',0),(.28,0,'wall',0)]
footprint=22.4;sources=[]
for i,(dx,dz,name,yaw) in enumerate(modules):
 path=root/f'public/map-resources/kenney-castle-kit/assets/Models/GLB format/{name}.glb';sources.append(dict(path=str(path.relative_to(root)),sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
 previous=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));objects=set(bpy.data.objects)-previous;meshes=[o for o in objects if o.type=='MESH'];points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
 low=Vector(tuple(min(v[j] for v in points) for j in range(3)));high=Vector(tuple(max(v[j] for v in points) for j in range(3)));size=high-low;scale=(footprint*.28)/max(size.x,size.y);anchor=Matrix.Translation(Vector((-(low.x+high.x)/2,-(low.y+high.y)/2,-low.z)));placement=Matrix.Translation(Vector((dx*footprint,-dz*footprint,0)))@Matrix.Rotation(yaw,4,'Z')@Matrix.Scale(scale,4)@anchor
 for o in meshes:o.matrix_world=placement@o.matrix_world;o.name=f'castle-module-{i}-{name}'
scene=bpy.context.scene
try:scene.render.engine='BLENDER_EEVEE_NEXT'
except Exception:scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=1024;scene.render.resolution_y=1024;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='Standard';scene.world=bpy.data.worlds.new('sprite-world');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.75,.79,.82,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
for name,loc,power,area in [('key',(-10,-16,30),2300,18),('fill',(20,6,20),1000,14)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=area;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,3))-o.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('isometric-sprite');data.type='ORTHO';camera=bpy.data.objects.new('isometric-sprite',data);scene.collection.objects.link(camera);target=Vector((0,0,3.5));camera.location=target+Vector((30,-30,math.sqrt(1800)*math.tan(math.radians(30))));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=31;scene.camera=camera;scene.render.filepath=str(output/'castle.png');bpy.ops.render.render(write_still=True)
origin=world_to_camera_view(scene,camera,Vector((0,0,0)));anchor=[origin.x*1024,(1-origin.y)*1024]
image=bpy.data.images.load(str(output/'castle.png'));import numpy as np;rgba=np.array(image.pixels[:]).reshape(1024,1024,4);yy,xx=np.where(rgba[:,:,3]>0);sprite_rect=[int(xx.min()),int(1024-yy.max()-1),int(xx.max()-xx.min()+1),int(yy.max()-yy.min()+1)]
source=dict(schema='derived-isometric-sprite/v1',id='derived-isometric-castle',upstreamPack='kenney-castle-kit',upstreamPage='https://kenney.nl/assets/castle-kit',derivation='Offline source GLB module assembly rendered once to PNG, then Canvas2D sprite depth-sort; not a live orthographic 3D map',renderer=dict(blender=bpy.app.version_string,engine=scene.render.engine,resolution=[1024,1024],elevationDegrees=30,orthoScale=data.ortho_scale),sourceFiles=list({s['path']:s for s in sources}.values()),modulePlacements=[dict(x=dx,z=dz,name=name,yaw=yaw) for dx,dz,name,yaw in modules],renderScript=dict(path='scripts/render-isometric-castle.py',sha256=hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()),anchorFullImage=anchor,output=dict(path='castle.png',sha256=hashlib.sha256((output/'castle.png').read_bytes()).hexdigest(),spriteRect=sprite_rect,anchorY=(anchor[1]-sprite_rect[1])/sprite_rect[3]),qa=dict(visualAccepted=False,collisionApproximate=True,gameplayValidated=False));(output/'source.json').write_text(json.dumps(source,indent=2)+'\n');print('SPRITE_SOURCE',json.dumps(source))
