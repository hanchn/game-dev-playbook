import pathlib,json,re
b=pathlib.Path(__file__).resolve().parent;o=json.loads((b/'executable-move-checklist.json').read_text());a=json.loads((b/'author-guide-extended-checklist.json').read_text());result=[]
for oc in o['characters']:
 ac=next(c for c in a['characters'] if c['character']==oc['character']);pairs={(m['motion'],m['button']) for s in ac['sourceMoves'] for m in s['segmentCandidates']};comp=[]
 for m in oc['specialVariants']:
  key=(m['directionNotation'],m['adaptedNeoGeoButton']);comp.append({'officialName':m['name'],'motion':key[0],'button':key[1],'sameMotionButtonExistsInAuthorCharacter':key in pairs,'identityEquivalenceVerified':False,'meaning':'motion/button agreement only; Japanese/romanized move identity and branches need manual match'})
 result.append({'character':oc['character'],'comparison':comp,'authorNamedRows':sum(not m['name'].startswith('UNRESOLVED') for m in ac['sourceMoves']),'authorUnresolvedRows':[m for m in ac['sourceMoves'] if m['name'].startswith('UNRESOLVED')]})
(b/'official-author-command-comparison.json').write_text(json.dumps({'policy':'Nonofficial author research is usable evidence; not authority over observed original game. False sameMotion flag is review queue, not proof either source wrong. Charge, alternatives and compound macros can differ in parser representation.','characters':result},ensure_ascii=False,indent=2))
