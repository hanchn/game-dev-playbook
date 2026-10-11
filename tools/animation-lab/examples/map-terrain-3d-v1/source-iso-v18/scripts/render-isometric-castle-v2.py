"""Derive 33 cropped Canvas2D sprite layers from the same source-measured 3D castle layout."""
import bpy, math, json, hashlib, pathlib
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view
import numpy as np
root=pathlib.Path(__file__).resolve().parents[1];out=root/'public/map-resources/derived-isometric-castle';layout=json.loads((out/'layout-v3.json').read_text());parts=[];resolution=1024;ortho=48
bpy.ops.wm.read_factory_settings(use_empty=True)
for i,p in enumerate(layout['props']):
 src=root/'public'/p['model'].lstrip('/');previous=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(src));meshes=[o for o in set(bpy.data.objects)-previous if o.type=='MESH'];pts=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box];low=Vector(tuple(min(v[j] for v in pts) for j in range(3)));high=Vector(tuple(max(v[j] for v in pts) for j in range(3)));size=high-low;scale=p['height']/size.z;anchor=Matrix.Translation(Vector((-(low.x+high.x)/2,-(low.y+high.y)/2,-low.z)));pos=p['position'];transform=Matrix.Translation(Vector((pos[0],-pos[2],pos[1])))@Matrix.Rotation(p['yaw'],4,'Z')@Matrix.Scale(scale,4)@Matrix.Diagonal(Vector((p.get('sourceScale',[1,1,1])[0],p.get('sourceScale',[1,1,1])[2],p.get('sourceScale',[1,1,1])[1],1)))@anchor
 for o in meshes:o.matrix_world=transform@o.matrix_world
 parts.append((i,p,src,meshes))
scene=bpy.context.scene
try:scene.render.engine='BLENDER_EEVEE_NEXT'
except Exception:scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=resolution;scene.render.resolution_y=resolution;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='Standard';scene.world=bpy.data.worlds.new('sprite-world');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.75,.79,.82,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
for name,loc,power,area in [('key',(-10,-16,30),2300,18),('fill',(20,6,20),1000,14)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=area;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,5))-o.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('isometric-sprite');data.type='ORTHO';data.ortho_scale=ortho;camera=bpy.data.objects.new('isometric-sprite',data);scene.collection.objects.link(camera);target=Vector((0,0,6));camera.location=target+Vector((40,-40,math.sqrt(3200)*math.tan(math.radians(30))));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();scene.camera=camera;assets=[]
for i,p,src,meshes in parts:
 for _,_,_,group in parts:
  for o in group:o.hide_render=o not in meshes
 file=pathlib.Path('/tmp')/f'castle-v3-module-{i}.png';scene.render.filepath=str(file);assert scene.camera is not None;bpy.ops.render.render(write_still=True);image=bpy.data.images.load(str(file));rgba=np.array(image.pixels[:]).reshape(resolution,resolution,4);yy,xx=np.where(rgba[:,:,3]>0);left,right,bottom,top=int(xx.min()),int(xx.max())+1,int(yy.min()),int(yy.max())+1;assert left>0 and right<resolution and bottom>0 and top<resolution,'clipped source module';cropped=bpy.data.images.new('alpha-crop-'+str(i),width=right-left,height=top-bottom,alpha=True);cropped.pixels.foreach_set(rgba[bottom:top,left:right,:].astype(np.float32).flatten());cropped.filepath_raw=str(out/f'v3-module-{i}.png');cropped.file_format='PNG';cropped.save();raw=pathlib.Path(cropped.filepath_raw).read_bytes();sha=hashlib.sha256(raw).hexdigest();pinned=f'v3-module-{i}-{sha[:12]}.png';(out/pinned).write_bytes(raw);pos=p['position'];anchor=world_to_camera_view(scene,camera,Vector((pos[0],-pos[2],0)));ground=[anchor.x*resolution,(1-anchor.y)*resolution];rect=[left,resolution-top,right-left,top-bottom];assets.append(dict(id=i,name=src.stem,path=pinned,sha256=sha,rect=[0,0,right-left,top-bottom],renderedRect=rect,anchorX=(ground[0]-left)/(right-left),anchorY=(ground[1]-rect[1])/(top-bottom),sourceX=pos[0],sourceY=pos[1],sourceZ=pos[2],height=p['height'],yaw=p['yaw'],role=p['sceneRole'],source=str(src.relative_to(root)),sourceSHA256=hashlib.sha256(src.read_bytes()).hexdigest()));bpy.data.images.remove(image);bpy.data.images.remove(cropped)
for _,_,_,group in parts:
 for o in group:o.hide_render=False
scene.render.filepath=str(out/'castle-v3.png');bpy.ops.render.render(write_still=True);raw=(out/'castle-v3.png').read_bytes();sha=hashlib.sha256(raw).hexdigest();pinned=f'castle-v3-{sha[:12]}.png';(out/pinned).write_bytes(raw)
meta=dict(schema='source-model-isometric-parts/v2',assets=assets,assembly=layout,renderer={'blender':bpy.app.version_string,'orthoScale':ortho,'elevation':30,'azimuth':45,'resolution':resolution,'alphaCropOnly':True,'bitwiseRerenderGuaranteed':False},combined={'path':pinned,'sha256':sha},script={'path':'scripts/render-isometric-castle-v2.py','sha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()},qa={'visualAccepted':False,'engineImported':False})
(out/'parts-v3.json').write_text(json.dumps(meta,indent=2)+'\n');print('CASTLE_V2_LAYERS',len(assets),flush=True)
