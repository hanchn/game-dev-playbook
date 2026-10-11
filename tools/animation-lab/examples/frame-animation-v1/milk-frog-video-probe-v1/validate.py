from pathlib import Path
import json,zipfile,re,hashlib
p=Path(__file__).resolve().parent
with zipfile.ZipFile(p/'browser-generated-video.zip') as z:
 assert z.testzip() is None
 m=json.loads(z.read('animation.json'));assert m['visualQA']=='failed';assert m['provenance']['sha256']=='1d1b51730f661075374ce1438b1d76f6773042bd3bcb9a648e9646f4c667c973';assert len(m['frames'])==54
 assert hashlib.sha256(z.read('sheet.png')).hexdigest()==m['sheet']['sha256']
 for f in m['frames']: assert hashlib.sha256(z.read(f['file'])).hexdigest()==f['pngSha256'] and f['review']['state']=='failed'
 z.extractall(p/'browser-generated-video')
report={'technicalStatus':'passed','sourceArtStatus':'failed','actualVideoSHA':m['provenance']['sha256'],'sourceTaskId':m['provenance']['generatedVideo']['receipt']['taskId'],'actualBrowserFrameCount':54,'actualWholePlaybackSeenCount':54,'zipCRC':'passed','pngAndSheetSHA':'passed','eachFrameFailedReviewRetained':True,'browserAccuracy':'actual request and decoded mediaTime retained; boundary seek can select previous source frame, CLI sourceIndex is exact','actualUIResult':json.loads(re.search(r'### Result\n(.*?)\n### Ran', (p/'browser-playback.log').read_text(),re.S).group(1))}
cm=json.loads((p/'extracted-bound/animation.json').read_text());assert cm['visualQA']=='failed';assert len(cm['frames'])==54
exact=[]
for f in cm['frames']:
 actual=(p/'extracted-bound'/f['file']).read_bytes();orig=(p/'native-frames'/f"{f['sourceIndex']+1:03}.png").read_bytes();exact.append(actual==orig)
assert all(exact)
report['CLI']={'frames':54,'sourceIndices':[f['sourceIndex'] for f in cm['frames']],'eachPNGEqualsOriginalDecodedBitmapBytes':all(exact),'sourceFailedQA':'preserved via --video-receipt','receiptSHAValidated':True}
(p/'technical-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print({'browser54':True,'CLI54ExactOriginalPNGBytes':all(exact),'sourceArt':'failed'})
