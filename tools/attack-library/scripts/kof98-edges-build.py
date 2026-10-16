#!/usr/bin/env python3
"""Supplementary original inputs, isolated from the baseline and other capture jobs."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data/research/kof98-edges-20261016';OUT.mkdir(exist_ok=True)
BATCHES={
 'turn-super':[('idle',90),('p2-approach',80),('opponent-cross-turn',120),('settle',90)]+[(f'super-{d}',105) for d in ['neutral','forward','back']]+[(f'hyper-{d}',95) for d in ['forward','back']],
 'air-forward':[(f'air-forward-{b}',125) for b in ['A','B','C','D','CD']],
 'air-back':[(f'air-back-{b}',125) for b in ['A','B','C','D','CD']],
 'air-short':[(f'air-short-{b}',125) for b in ['A','B','C','D','CD']],
 'extra-reactions':[('p2-approach',80),('crouch-hurt-light',160),('crouch-hurt-heavy',180),('air-hurt-light',180),('air-hurt-heavy',180),('air-guard-attempt',180)]}
BATCHES['extra-reactions-v2']=BATCHES['extra-reactions']
src=(ROOT/'scripts/kof98-multichar-capture.lua').read_text().replace('KOF_MULTI_REGISTERED','KOF_EDGES_REGISTERED')
a=src.index('local acts=');b=src.index('\nlocal total',a)
table='local batches={'+','.join("['"+name+"']={"+','.join("{'"+label+"',"+str(length)+'}' for label,length in phases)+'}' for name,phases in BATCHES.items())+'}\nlocal acts=assert(batches[os.getenv("KOF_EDGE_BATCH")])'
src=src[:a]+table+src[b:];a=src.index(' local pressed={}');b=src.index('\n if rel==0 then',a)
inputs=r''' local pressed={}
 local function key(player,name) set('P'..player..' '..name,1);pressed['P'..player..' '..name]=true end
 local function approach2()
  local delta=ram:read_i16(0x108318)-ram:read_i16(0x108118)
  if math.abs(delta)>28 then key(2,delta>=0 and 'Left' or 'Right') end
 end
 if phase=='p2-approach' then approach2() end
 if phase=='opponent-cross-turn' then
  if t==0 then crossDirection=dx>=0 and 'Left' or 'Right' end
  if t>=15 and t<27 then key(2,'Up') end
  if t>=15 and t<65 then key(2,crossDirection) end
 end
 if phase:find('super%-') or phase:find('hyper%-') then
  if t>=15 and t<18 then key(1,'Down') end
  local hold=phase:find('hyper') and 3 or 12
  if t>=18 and t<18+hold then key(1,'Up');if phase:find('forward') then key(1,forward) elseif phase:find('back') then key(1,back) end end
 end
 local direction,buttons=phase:match('^air%-(%a+)%-(%u+)$')
 if direction then
  local short=direction=='short'
  if t>=20 and t<20+(short and 3 or 12) then key(1,'Up');if direction=='forward' then key(1,forward) elseif direction=='back' then key(1,back) end end
  local attack=short and 31 or 36
  if t>=attack and t<attack+3 then for button in buttons:gmatch('.') do key(1,button) end end
 end
 if phase:find('crouch%-hurt') then
  if t<55 then approach2() end
  if t>=60 and t<135 then key(1,'Down') end
  if os.getenv('KOF_EDGE_BATCH')=='extra-reactions-v2' and t>=65 and t<100 then key(2,'Down') end
  if t>=82 and t<85 then key(2,'Down');key(2,phase:find('light') and 'A' or 'C') end
 end
 if phase=='air-hurt-light' or phase=='air-hurt-heavy' or phase=='air-guard-attempt' then
  if t<45 then approach2() end
  if t>=55 and t<67 then key(1,'Up');key(2,'Up') end
  if phase=='air-guard-attempt' and t>=68 and t<110 then key(1,back) end
  if t>=80 and t<83 then key(2,phase=='air-hurt-heavy' and 'C' or 'A') end
 end
 for player=1,2 do for _,name in ipairs({'Up','Down','Left','Right','A','B','C','D'}) do
  local field='P'..player..' '..name;local value=pressed[field] and 1 or 0
  if prev[field]~=value then input:write(tick..','..field..','..value..'\n');prev[field]=value end
 end end
'''
src=src[:a]+inputs+src[b:];src=src.replace('local tick=0','local crossDirection=nil;local tick=0')
(ROOT/'scripts/kof98-edges-capture.lua').write_text(src)
(OUT/'plan.json').write_text(json.dumps({'batches':BATCHES,'scope':'Supplementary inputs and condition observations, not all-move acceptance','memoryWrites':False},indent=2)+'\n')
print('supplementary original-input script generated')
