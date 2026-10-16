local out=assert(os.getenv('KOF_STUDY_OUT'));local m=manager.machine;local s=m.screens[':screen'];local fields={};local tick=0
for _,p in pairs(m.ioport.ports) do for n,v in pairs(p.fields) do fields[n]=v end end
local function set(n,v) assert(fields[n],n):set_value(v) end
emu.register_frame_done(function()
 tick=tick+1
 for p=1,2 do for _,n in ipairs({'Up','Down','Left','Right','A','B','C','D'}) do set('P'..p..' '..n,0) end end
 set('Coin 1',tick>=600 and tick<2400 and tick%300<5 and 1 or 0);set('Coin 2',tick>=600 and tick<2400 and tick%300<5 and 1 or 0)
 set('1 Player Start',tick>=660 and tick<2400 and tick%300>=60 and tick%300<65 and 1 or 0);set('2 Players Start',tick>=680 and tick<2400 and tick%300>=80 and tick%300<85 and 1 or 0)
 if tick<2400 then for p=1,2 do set('P'..p..' A',tick>=800 and tick<2200 and tick%90<3 and 1 or 0) end end
 if tick>=600 and tick%30==0 then s:snapshot(out..'/snap/'..tick..'.png') end
 if tick==2500 then m:exit() end
end)
