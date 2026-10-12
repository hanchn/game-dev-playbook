"""Source-locked GLB derivatives + four camera-aligned PNG views. No source raster edits."""
import bpy,pathlib,json,math,hashlib,time,sys
from mathutils import Vector,Matrix
from bpy_extras.object_utils import world_to_camera_view
import numpy as np
R=pathlib.Path(__file__).resolve().parents[1]; OUT=R/'public/map-resources/polyhaven-nature-candidate-v1';OUT.mkdir(exist_ok=True)
REPORT={'schema':'same-source-nature-candidate/v1','visualAccepted':False,'engineImported':False,'completeNaturalTheme':False,'renderer':{'blender':bpy.app.version_string,'engine':'EEVEE','pixels':512,'elevation':30,'azimuth':45,'colorManagement':'AgX','sourceTexturesUnchanged':True},'assets':[]}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def triangles(objs):
 total=0
 for o in objs:o.data.calc_loop_triangles();total+=len(o.data.loop_triangles)
 return total
def bounds(objs):
 pts=[o.matrix_world@Vector(c) for o in objs for c in o.bound_box]
 return [min(p[j] for p in pts) for j in range(3)],[max(p[j] for p in pts) for j in range(3)]
def normalize(objs):
 lo,hi=bounds(objs);v=Vector(((lo[0]+hi[0])/2,(lo[1]+hi[1])/2,lo[2]))
 for o in objs:o.matrix_world=Matrix.Translation(-v)@o.matrix_world
 return lo,hi
def setup(objs,ortho):
 s=bpy.context.scene
 try:s.render.engine='BLENDER_EEVEE_NEXT'
 except:s.render.engine='BLENDER_EEVEE'
 s.render.resolution_x=512;s.render.resolution_y=512;s.render.resolution_percentage=100;s.render.film_transparent=True;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.view_settings.view_transform='AgX'
 s.world=bpy.data.worlds.new('candidate-world');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.8,.87,1,1);s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7
 for i,(loc,power,size) in enumerate([((-5,-7,9),1400,6),((6,-3,6),900,7),((0,5,7),1000,6)]):
  d=bpy.data.lights.new('light'+str(i),'AREA');d.energy=power;d.size=size;o=bpy.data.objects.new('light'+str(i),d);s.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1.5))-o.location).to_track_quat('-Z','Y').to_euler()
 lo,hi=bounds(objs);target=Vector((0,0,(hi[2]-lo[2])*.47));d=bpy.data.cameras.new('source-camera');d.type='ORTHO';d.ortho_scale=ortho;c=bpy.data.objects.new('source-camera',d);s.collection.objects.link(c);c.location=target+Vector((8,-8,math.sqrt(128)*math.tan(math.radians(30))));c.rotation_euler=(target-c.location).to_track_quat('-Z','Y').to_euler();s.camera=c
 return s,c

def render(objs,name,yaw,ortho):
 s,c=setup(objs,ortho)
 for o in objs:o.matrix_world=Matrix.Rotation(math.radians(yaw),4,'Z')@o.matrix_world
 p=OUT/f'{name}-yaw{yaw}.png';s.render.filepath=str(p);t=time.monotonic();bpy.ops.render.render(write_still=True)
 im=bpy.data.images.load(str(p));pix=np.array(im.pixels[:]).reshape(512,512,4);yy,xx=np.where(pix[:,:,3]>.04);rect=[int(xx.min()),int(511-yy.max()),int(xx.max()-xx.min()+1),int(yy.max()-yy.min()+1)]
 a=world_to_camera_view(s,c,Vector((0,0,0)));result={'yaw':yaw,'path':p.name,'sha256':sha(p),'bytes':p.stat().st_size,'rect':rect,'groundPixel':[a.x*512,(1-a.y)*512],'orthoMeters':ortho,'renderSeconds':round(time.monotonic()-t,3),'clipped':rect[0]<=0 or rect[1]<=0 or rect[0]+rect[2]>=512 or rect[1]+rect[3]>=512}
 for o in objs:o.matrix_world=Matrix.Rotation(math.radians(-yaw),4,'Z')@o.matrix_world
 for o in list(bpy.data.objects):
  if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
 bpy.data.images.remove(im);return result

def flush(): (OUT/'manifest.json').write_text(json.dumps(REPORT,indent=2)+'\n')
mid='--tree-mid' in sys.argv
if mid:REPORT=json.loads((OUT/'manifest.json').read_text())
# High-density original is preserved; material-separated collapse is strictly a candidate.
src=R/'public/map-resources/polyhaven-nature-expansion-v1/tree_small_02/tree_small_02_1k.gltf'
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(src));objs=[o for o in bpy.data.objects if o.type=='MESH'];original=triangles(objs);normalize(objs)
if not mid:
 native=render(objs,'tree-native',0,6.3);REPORT['nativeTree']={'triangles':original,'render':native,'source':str(src.relative_to(R)),'sourceSHA256':sha(src)};flush()
bpy.ops.object.select_all(action='DESELECT');objs[0].select_set(True);bpy.context.view_layer.objects.active=objs[0];bpy.ops.mesh.separate(type='MATERIAL');objs=[o for o in bpy.data.objects if o.type=='MESH'];parts=[]
for o in objs:
 n=o.data.materials[0].name;count=triangles([o]);target=(145000 if 'leaves' in n else 9000 if 'branches' in n else 6000) if mid else (45000 if 'leaves' in n else 6000 if 'branches' in n else 5000)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;m=o.modifiers.new('candidate-source-collapse','DECIMATE');m.ratio=min(1,target/count);m.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=m.name);parts.append({'material':n,'before':count,'after':triangles([o]),'target':target})
assets=[('tree-mid' if mid else 'tree-lod',objs,src,6.3,{'type':'circle','radius':.16,'height':4.65,'policy':'trunk-only conservative approximation; canopy pass-through'},parts)]
def emit(name,objs,src,ortho,collider,parts=[]):
 lo,hi=bounds(objs);bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 glb=OUT/(name+'.glb');bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT',export_texcoords=True,export_normals=True,export_tangents=True)
 entry={'id':name,'source':str(src.relative_to(R)),'sourceSHA256':sha(src),'glb':glb.name,'sha256':sha(glb),'bytes':glb.stat().st_size,'triangles':triangles(objs),'boundsBlenderZUp':[lo,hi],'sizeMeters':[hi[j]-lo[j] for j in range(3)],'collider':collider,'lodParts':parts,'views':[],'visualAccepted':False};REPORT['assets'].append(entry);flush()
 for yaw in [0,90,180,270]:entry['views'].append(render(objs,name,yaw,ortho));flush()
emit(*assets[0])
if mid:REPORT['scriptSHA256']=sha(pathlib.Path(__file__));flush();sys.exit(0)
# Each native shrub root is an individual source variant; source transforms are normalized only.
src=R/'public/map-resources/polyhaven-nature-expansion-v1/shrub_03/shrub_03_1k.gltf'
for variant in ['a','b','c','d']:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(src));keep=next(o for o in bpy.data.objects if o.type=='MESH' and o.name=='shrub_03_'+variant)
 for o in list(bpy.data.objects):
  if o!=keep:bpy.data.objects.remove(o,do_unlink=True)
 normalize([keep]);emit('shrub-'+variant,[keep],src,.65,{'type':'none','policy':'low foliage is pass-through; no invented hard wall'})
# Retain previously derived original PBR boulder and its LOD report.
src=R/'public/map-resources/polyhaven-models/boulder_01/boulder_01_lod1.glb';bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(src));objs=[o for o in bpy.data.objects if o.type=='MESH'];normalize(objs)
for o in objs:o.matrix_world=Matrix.Scale(.25,4)@o.matrix_world
lo,hi=bounds(objs);emit('boulder',objs,src,max(hi[2]*1.5,(hi[0]-lo[0]+hi[1]-lo[1])*.85),{'type':'circle','radius':max(hi[0]-lo[0],hi[1]-lo[1])*.5,'height':hi[2],'policy':'conservative horizontal bounding circle'})
REPORT['scriptSHA256']=sha(pathlib.Path(__file__));flush();print('NATURE_CANDIDATE_DONE',len(REPORT['assets']))
