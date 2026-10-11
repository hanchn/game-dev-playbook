"""Download exact public model manifest embedded in official asset HTML; retain original bytes, hashes and dimensions."""
import urllib.request,json,re,hashlib,pathlib,concurrent.futures,sys,time
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'public/map-resources/polyhaven-nature-expansion-v1';OUT.mkdir(exist_ok=True)
HEADERS={'User-Agent':'Mozilla/5.0 (game resource import; official public asset page)'}
def fetch(url):
 if not (url.startswith('https://polyhaven.com/a/') or url.startswith('https://dl.polyhaven.org/file/ph-assets/')):raise ValueError('unexpected official URL')
 with urllib.request.urlopen(urllib.request.Request(url,headers=HEADERS),timeout=90) as r:return r.read()
def sha(b):return hashlib.sha256(b).hexdigest()
def download(asset,item):
 rel,meta=item;target=OUT/asset/rel
 if '..' in pathlib.PurePosixPath(rel).parts or rel.startswith('/'):raise ValueError('unsafe manifest relative path')
 if target.exists():data=target.read_bytes()
 else:
  data=fetch(meta['url']);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 if len(data)!=meta['size'] or hashlib.md5(data).hexdigest()!=meta['md5']:raise ValueError('official size/MD5 mismatch: '+str(target))
 return dict(path=str(target.relative_to(ROOT)),url=meta['url'],bytes=len(data),sha256=sha(data),officialMD5=meta['md5'],officialSizeVerified=True)
source=dict(schema='game-resource-pack/v1',id=OUT.name,upstream='https://polyhaven.com/',discovery='official asset HTML embedded __NEXT_DATA__.props.pageProps.files, public API403 retained separately',license='CC0 official source',assets=[],qa={'visualAccepted':False,'engineImported':False,'completeNaturalTheme':False})
for asset in sys.argv[1:] or ['tree_small_02','shrub_03']:
 page='https://polyhaven.com/a/'+asset;raw=fetch(page);match=re.search(rb'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',raw)
 if not match:raise ValueError('official HTML manifest missing')
 data=json.loads(match.group(1))['props']['pageProps'];meta=data['files']['gltf']['1k']['gltf'];items=[(asset+'_1k.gltf',meta)]+list(meta['include'].items());manifest=dict(asset=asset,sourcePage=page,pageSHA256=sha(raw),data=data['data'],gltf1k=meta)
 manifestPath=OUT/(asset+'-official-manifest.json');manifestPath.write_text(json.dumps(manifest,indent=2)+'\n')
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:files=list(pool.map(lambda item:download(asset,item),items))
 source['assets'].append(dict(id=asset,sourcePage=page,officialManifest=dict(path=str(manifestPath.relative_to(ROOT)),sha256=sha(manifestPath.read_bytes())),officialData=data['data'],files=files))
 (OUT/'source.json').write_text(json.dumps(source,indent=2)+'\n');print(asset,len(files),sum(f['bytes'] for f in files),flush=True)
print('PACK',len(source['assets']),flush=True)
