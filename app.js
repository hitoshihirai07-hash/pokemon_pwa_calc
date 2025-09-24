
(function(){
'use strict';

function $(id){ return document.getElementById(id); }
function esc(s){ s=String(s==null?'':s); return s.replace(/[&<>\"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
function downloadBlob(name, mime, text){
  var blob=new Blob([text],{type:mime});
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.style.display='none';
  document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 100);
}

/* tabs */
(function(){
  var tabs=document.querySelectorAll('.tabs button');
  for (var i=0;i<tabs.length;i++){
    (function(btn){
      btn.addEventListener('click', function(){
        for (var j=0;j<tabs.length;j++) tabs[j].classList.remove('active');
        var panes=document.querySelectorAll('.tab-pane');
        for (var k=0;k<panes.length;k++) panes[k].classList.remove('active');
        btn.classList.add('active');
        var pane=document.getElementById(btn.getAttribute('data-tab'));
        if(pane) pane.classList.add('active');
        window.scrollTo(0,0);
      });
    })(tabs[i]);
  }
})();

/* timer */
(function(){
  var view=$('timerView'), start=$('timerStart'), pause=$('timerPause'), reset=$('timerReset'), minI=$('timerMin');
  if(!view) return;
  var remain=0, running=false, timerId=null;
  function fmt(s){ var m=Math.floor(s/60), r=s%60; return (m<10?'0':'')+m+':'+(r<10?'0':'')+r; }
  function tick(){ if(!running) return; if(remain<=0){ running=false; view.textContent='00:00'; return; } remain--; view.textContent=fmt(remain); timerId=setTimeout(tick,1000); }
  start.addEventListener('click', function(){ var m=Math.max(1,Math.min(180, +minI.value||10)); remain=m*60; running=true; view.textContent=fmt(remain); if(timerId) clearTimeout(timerId); tick(); });
  pause.addEventListener('click', function(){ running=false; if(timerId) clearTimeout(timerId); });
  reset.addEventListener('click', function(){ running=false; if(timerId) clearTimeout(timerId); view.textContent='00:00'; });
})();

/* data */
var DEX=null, MOVES=null;
function loadDex(cb){
  if (DEX) return cb();
  fetch('./pokemon_master.json',{cache:'no-store'}).then(function(r){return r.json();}).then(function(j){DEX=j||[];cb();}).catch(function(){DEX=[];cb();});
}
function splitCSVLine(line){
  var res=[],cur='',q=false;
  for (var i=0;i<line.length;i++){
    var c=line[i];
    if (c=='"'){ if(q && line[i+1]=='"'){cur+='"';i++;} else q=!q; }
    else if (c==',' && !q){ res.push(cur); cur=''; }
    else cur+=c;
  }
  res.push(cur); return res;
}
function parseCSV(text){
  var lines=text.split(/\r?\n/).filter(function(x){return x.trim().length>0;});
  if(!lines.length) return [];
  var head=splitCSVLine(lines[0]);
  var out=[];
  for (var i=1;i<lines.length;i++){
    var cols=splitCSVLine(lines[i]); var row={};
    for (var j=0;j<head.length && j<cols.length;j++){ row[head[j].trim()]=cols[j].trim(); }
    out.push(row);
  }
  return out;
}
function loadMoves(cb){
  if (MOVES) return cb();
  fetch('./moves.csv',{cache:'no-store'}).then(function(r){return r.text();}).then(function(t){MOVES=parseCSV(t);cb();}).catch(function(){MOVES=[];cb();});
}
function guessKey(cands){ if(!MOVES||!MOVES.length) return cands[0]; var row=MOVES[0]; for (var i=0;i<cands.length;i++){ if(row.hasOwnProperty(cands[i])) return cands[i]; } return cands[0]; }

/* datalists */
(function(){
  loadDex(function(){
    var dl=$('dexNames'); if(!dl) return;
    var html=''; for (var i=0;i<DEX.length;i++){ var p=DEX[i]; html+='<option value="'+esc(p.名前)+'">'; }
    dl.innerHTML=html;
  });
  loadMoves(function(){
    var dl=$('moveNames'); if(!dl) return;
    var nameKey=guessKey(['技','name','ワザ','move','技名']);
    var html=''; for (var i=0;i<MOVES.length;i++){ var v=MOVES[i][nameKey]||''; if(v) html+='<option value="'+esc(v)+'">'; }
    dl.innerHTML=html;
  });
})();

/* helpers */
var RANK={"-6":0.25,"-5":2/7,"-4":2/6,"-3":2/5,"-2":0.5,"-1":2/3,"0":1,"1":1.5,"2":2,"3":2.5,"4":3,"5":3.5,"6":4};
function nonHP(base,iv,ev,mul){ base=+base||0; iv=+iv||0; ev=+ev||0; mul=+mul||1; var t=Math.floor(((2*base+iv+Math.floor(ev/4))*50)/100)+5; return Math.floor(t*mul); }
function HP(base,iv,ev){ base=+base||0; iv=+iv||0; ev=+ev||0; return Math.floor(((2*base+iv+Math.floor(ev/4))*50)/100)+60; }
function dmgRange(o){
  var level=50, base=Math.floor((level*2)/5)+2;
  var df=o.df, cat=o.cat, defTypes=o.defTypes||[];
  if (o.weather==='sand' && cat==='special' && defTypes.indexOf('いわ')>=0){ df=Math.floor(df*1.5); }
  if (o.weather==='snow' && cat==='physical' && defTypes.indexOf('こおり')>=0){ df=Math.floor(df*1.5); }
  var core=Math.floor(Math.floor(base*o.power*o.rAtk*o.atk/(o.rDef*df))/50)+2;
  var wmul=1.0;
  if (o.weather==='sun'){ if (o.moveType==='ほのお') wmul=1.5; if (o.moveType==='みず') wmul=0.5; }
  else if (o.weather==='rain'){ if (o.moveType==='みず') wmul=1.5; if (o.moveType==='ほのお') wmul=0.5; }
  var critMul=o.crit?1.5:1.0;
  var itemMul=1.0; if (o.item==='atk1.5' && cat==='physical') itemMul=1.5; if (o.item==='spa1.5' && cat==='special') itemMul=1.5; if (o.item==='lo1.3') itemMul*=1.3;
  var mult=o.stab*o.typeMul*wmul*o.extra*critMul*itemMul;
  var mn=Math.floor(core*mult*0.85), mx=Math.floor(core*mult*1.00);
  return [mn,mx];
}
function currentCat(){ var c=$('move_cat').value; if(c==='auto'){ var a=+$('atk_fin_攻撃').textContent||0, s=+$('atk_fin_特攻').textContent||0; return (a>=s)?'physical':'special'; } return c; }

/* rank selects */
(function(){
  var a=$('atk_stage'), d=$('def_stage'); if (!(a&&d)) return;
  for (var i=-6;i<=6;i++){
    var o=document.createElement('option'); o.value=String(i); o.textContent=(i>0?('+'+i):String(i)); if (i===0) o.selected=true; a.appendChild(o);
    var p=document.createElement('option'); p.value=String(i); p.textContent=(i>0?('+'+i):String(i)); if (i===0) p.selected=true; d.appendChild(p);
  }
})();

/* 1v1 */
(function(){
  var keys=['HP','攻撃','防御','特攻','特防','素早'];
  var sideA={}, sideD={};
  for (var i=0;i<keys.length;i++){
    var k=keys[i];
    sideA['base_'+k]=$('atk_base_'+k); sideA['iv_'+k]=$('atk_iv_'+k); sideA['ev_'+k]=$('atk_ev_'+k); sideA['mul_'+k']=$('atk_mul_'+k); sideA['fin_'+k]=$('atk_fin_'+k);
    sideD['base_'+k]=$('def_base_'+k); sideD['iv_'+k]=$('def_iv_'+k); sideD['ev_'+k]=$('def_ev_'+k); sideD['mul_'+k']=$('def_mul_'+k); sideD['fin_'+k']=$('def_fin_'+k);
  }
  function findMon(n){ if(!n) return null; n=String(n).trim(); for (var i=0;i<(DEX||[]).length;i++){ var p=DEX[i]; if (p && (p.名字===n || p.名前===n || String(p.No)===n)) return p; } return null; }
  function fillBase(side, mon){ for (var i=0;i<keys.length;i++){ var k=keys[i]; var b=mon?(+mon[k]||50):50; side['base_'+k].textContent=b; } }
  function recalc(side){
    side['fin_HP'].textContent=HP(+side['base_HP'].textContent,+side['iv_HP'].value,+side['ev_HP'].value);
    for (var i=1;i<keys.length;i++){ var k=keys[i]; var mul=side['mul_'+k]? +side['mul_'+k].value : 1.0; side['fin_'+k].textContent=nonHP(+side['base_'+k].textContent,+side['iv_'+k].value,+side['ev_'+k].value,mul); }
  }
  function hook(sidePrefix,onFn){
    var nameI=$(sidePrefix+'_name');
    if (nameI){ nameI.addEventListener('input',onFn); nameI.addEventListener('change',onFn); }
    for (var i=0;i<keys.length;i++){
      var k=keys[i];
      var evI=$(sidePrefix+'_ev_'+k), ivI=$(sidePrefix+'_iv_'+k), muI=$(sidePrefix+'_mul_'+k);
      if (evI) evI.addEventListener('input', function(){ recalc(sidePrefix==='atk'?sideA:sideD); });
      if (ivI) ivI.addEventListener('input', function(){ recalc(sidePrefix==='atk'?sideA:sideD); });
      if (muI) muI.addEventListener('change', function(){ recalc(sidePrefix==='atk'?sideA:sideD); });
    }
  }
  function onAtk(){ loadDex(function(){ var m=findMon($('atk_name').value); fillBase(sideA,m); recalc(sideA); }); }
  function onDef(){ loadDex(function(){ var m=findMon($('def_name').value); fillBase(sideD,m); recalc(sideD); }); }
  hook('atk', onAtk); hook('def', onDef); loadDex(function(){ onAtk(); onDef(); });

  var moveName=$('move_name'), movePower=$('move_power'), moveType=$('move_type'), moveCat=$('move_cat'), moveHits=$('move_hits'), crit=$('crit'), critBadge=$('crit_force'), hint=$('move_hint');
  function normalizeCat(v){
    v=String(v||'').trim();
    var map={'物理':'physical','Physical':'physical','physical':'physical','特殊':'special','Special':'special','special':'special','auto':'auto','Auto':'auto','自動':'auto'};
    return map[v]||v;
  }
  function onMoveSel(){
    loadMoves(function(){
      if (!MOVES || !MOVES.length) return;
      var keyName=guessKey(['技','name','ワザ','move','技名']);
      var keyPow =guessKey(['威力','power']);
      var keyType=guessKey(['タイプ','type']);
      var keyCat =guessKey(['分類','category','class']);
      var keyHit =guessKey(['連続','hits']);
      var keyCrit=guessKey(['必ず急所','crit','always_crit']);
      var keyTera=guessKey(['テラ','tera']);
      var keyNote=guessKey(['notes','備考','メモ','note']);

      var q=String(moveName.value||'').trim();
      var row=null;
      for (var i=0;i<MOVES.length;i++){ if ((MOVES[i][keyName]||'')===q){ row=MOVES[i]; break; } }
      if (!row){ hint.textContent=''; critBadge.style.display='none'; return; }

      if (row[keyPow] and not isNaN(+row[keyPow])) movePower.value=+row[keyPow];
      if (row[keyType]) moveType.value=row[keyType];

      var cat=normalizeCat(row[keyCat]);
      if (/テラバースト/.test(q) && String(row[keyTera]||'').toLowerCase().indexOf('auto')>=0){ cat='auto'; }
      if (cat==='physical'||cat==='special'||cat==='auto') moveCat.value=cat;

      var hitsRaw=String(row[keyHit]||'').trim();
      var hInfo='';
      if (hitsRaw){
        var m=hitsRaw.match(/^(\d+)\s*[-~～]\s*(\d+)$/);
        if (m){ var hi=parseInt(m[2],10); if(!isNaN(hi)) moveHits.value=Math.min(10,Math.max(1,hi)); hInfo='連続:'+m[1]+'～'+m[2]; }
        else{ var n=parseInt(hitsRaw,10); if(!isNaN(n)) { moveHits.value=Math.min(10,Math.max(1,n)); hInfo='連続:'+n+'回'; } }
      }

      var force=false; var cv=String(row[keyCrit]||'').trim().toLowerCase();
      if (['true','1','はい','y','yes','必ず','必ず急所','always','always crit','always_crit'].indexOf(cv)>=0) force=true;
      $('crit').checked=force; critBadge.style.display=force?'':'none';

      var notes=String(row[keyNote]||'').trim(); var parts=[];
      if (hInfo) parts.push(hInfo); if (notes) parts.push(notes);
      hint.textContent=parts.join(' / ');
    });
  }
  if (moveName){ moveName.addEventListener('input',onMoveSel); moveName.addEventListener('change',onMoveSel); }

  function currentMoveCat(){ return currentCat(); }

  function compute(){
    var cat=currentMoveCat();
    var atkStat=(cat==='physical')?(+sideA['fin_攻撃'].textContent||0):(+sideA['fin_特攻'].textContent||0);
    var defStat=(cat==='physical')?(+sideD['fin_防御'].textContent||0):(+sideD['fin_特防'].textContent||0);
    var params={
      power:+$('move_power').value||1,
      atk:atkStat||1,
      df:defStat||1,
      cat:cat,
      rAtk:RANK[$('atk_stage').value]||1,
      rDef:RANK[$('def_stage').value]||1,
      moveType:$('move_type').value||'',
      defTypes:[ $('def_t1').value||'', $('def_t2').value||'' ].filter(function(x){return x;}),
      weather:$('weather').value,
      stab:+$('stab').value||1,
      typeMul:+$('type_mul').value||1,
      extra:+$('extra_mul').value||1,
      crit:$('crit').checked,
      item:$('item_mul').value
    };
    var dm=dmgRange(params), mn=dm[0], mx=dm[1];
    var hits=Math.min(10,Math.max(1, +$('move_hits').value||1));
    var totalMin=mn*hits, totalMax=mx*hits;
    var defHP=+sideD['fin_HP'].textContent||1;
    var remainMin=Math.max(0, defHP-totalMax), remainMax=Math.max(0, defHP-totalMin);
    var label='';
    if (totalMin>=defHP) label='確定1発';
    else if (totalMax>=defHP) label='乱数1発（高乱数）';
    else { var minH=Math.ceil(defHP/Math.max(1,mn)), maxH=Math.ceil(defHP/Math.max(1,mx)); label=(minH===maxH)?('確定'+minH+'発'):('乱数'+minH+'～'+maxH+'発'); }

    $('result').innerHTML='<div>1発: <b>'+mn+'</b>～<b>'+mx+'</b>（'+hits+'回合計: <b>'+totalMin+'</b>～<b>'+totalMax+'</b>）</div>'
      +'<div>残りHP: '+remainMin+'～'+remainMax+' / '+defHP+'（'+(remainMin/defHP*100).toFixed(1)+'%～'+(remainMax/defHP*100).toFixed(1)+'%）</div>'
      +'<div>'+label+'</div>';
    $('hpbar_inner').style.width = Math.max(0, 100 - (remainMax/defHP*100)) + '%';

    var line=[ ($('atk_name').value||'攻撃側')+'→'+($('def_name').value||'防御側'),
      '技:'+($('move_name').value||'-')+' 威力:'+params.power+' '+(cat==='physical'?'物':'特'),
      'STAB:'+params.stab+' 相性:'+params.typeMul+' 天候:'+params.weather+' 急所:'+($('crit').checked?'あり':'なし'),
      'ランク:攻'+$('atk_stage').value+' 防'+$('def_stage').value,
      '結果:1発'+mn+'-'+mx+' / '+hits+'回'+totalMin+'-'+totalMax+' | '+label].join(' | ');
    var logs=$('atk_logs'); logs.value=(logs.value?logs.value+'\n':'')+line; localStorage.setItem('calc_logs',logs.value);
  }
  var btn=$('btn_calc'); if (btn) btn.addEventListener('click',compute);
  var mvClear=$('move_clear'); if (mvClear) mvClear.addEventListener('click', function(){ $('move_name').value=''; $('move_power').value=80; $('move_type').value=''; $('move_cat').value='physical'; $('move_hits').value=1; $('crit').checked=false; $('crit_force').style.display='none'; $('move_hint').textContent=''; });
  var resetBtn=$('calc_reset'); if (resetBtn) resetBtn.addEventListener('click',function(){ ['atk_name','def_name','move_name','move_type'].forEach(function(id){ var el=$(id); if(el) el.value=''; }); $('move_power').value=80; $('move_cat').value='physical'; $('move_hits').value=1; $('crit').checked=false; $('stab').value='1.0'; $('type_mul').value='1.0'; $('weather').value='none'; $('extra_mul').value='1.0'; $('item_mul').value='1.0'; $('result').innerHTML=''; $('hpbar_inner').style.width='0%'; });

  var srBtn=$('sr_apply'); if (srBtn) srBtn.addEventListener('click', function(){ var defHP=+$('def_fin_HP').textContent||1; var mul=+$('sr_vs_rock').value||1; var dmg=Math.floor(defHP*0.125*mul); var remain=Math.max(0,defHP-dmg); $('sr_info').textContent='SRダメージ:'+dmg+' → 残りHP:'+remain; });

  var saved=localStorage.getItem('calc_logs'); if(saved) $('atk_logs').value=saved;
  $('log_clear')&&$('log_clear').addEventListener('click', function(){ $('atk_logs').value=''; localStorage.removeItem('calc_logs'); });
  $('log_copy')&&$('log_copy').addEventListener('click', function(){ $('atk_logs').select(); document.execCommand('copy'); });
  $('log_export_txt')&&$('log_export_txt').addEventListener('click', function(){ downloadBlob('calc_logs.txt','text/plain;charset=utf-8', $('atk_logs').value||''); });
  $('log_export_csv')&&$('log_export_csv').addEventListener('click', function(){
    var rows=(($('atk_logs').value||'').split('\n')).filter(function(x){return x.trim().length>0;}).map(function(line){ return [line]; });
    var csv='ログ\n'+rows.map(function(r){return '"'+String(r[0]).replace(/"/g,'""')+'"';}).join('\n');
    downloadBlob('calc_logs.csv','text/csv;charset=utf-8', csv);
  });
  $('log_import_btn')&&$('log_import_btn').addEventListener('click', function(){
    var f=$('log_import_file').files[0]; if(!f) return;
    var fr=new FileReader();
    fr.onload=function(){ var t=String(fr.result||''); if (f.name.toLowerCase().endswith('.csv')){ var lines=t.split(/\r?\n/); if(lines.length) lines.shift(); t=lines.join('\n'); } $('atk_logs').value=t; localStorage.setItem('calc_logs',t); };
    fr.readAsText(f, 'utf-8');
  });
})();

/* 1v3 */
(function(){
  var mount=$('v13-self-mount'), foesWrap=$('v13-foes'), out=$('v13_out'); if(!(mount&&foesWrap)) return;
  mount.innerHTML=''
    +'<div id="v13-self">'
      +'<div class="left">'
        +'<div class="row"><div class="label">自分</div><input id="v13_self_name" list="dexNames" placeholder="例: ドラパルト"></div>'
        +'<div class="row"><div class="label">攻</div><input id="v13_ev_atk" type="number" min="0" max="252" step="4" placeholder="EV"><input id="v13_iv_atk" type="number" min="0" max="31" value="31" placeholder="IV"><select id="v13_mul_atk"><option value="0.9">0.9</option><option value="1.0" selected>1.0</option><option value="1.1">1.1</option></select></div>'
        +'<div class="row"><div class="label">特</div><input id="v13_ev_spa" type="number" min="0" max="252" step="4" placeholder="EV"><input id="v13_iv_spa" type="number" min="0" max="31" value="31" placeholder="IV"><select id="v13_mul_spa"><option value="0.9">0.9</option><option value="1.0" selected>1.0</option><option value="1.1">1.1</option></select></div>'
      +'</div>'
      +'<div class="right">'
        +'<div class="row"><div class="label">分類</div><select id="v13_cat"><option value="physical">物理</option><option value="special">特殊</option></select><div class="label">威力</div><input id="v13_power" type="number" min="1" max="500" value="80"></div>'
        +'<div class="row"><div class="label">STAB</div><select id="v13_stab"><option>1.0</option><option>1.5</option><option>2.0</option></select><div class="label">天候</div><select id="v13_weather"><option value="none">なし</option><option value="sun">晴れ</option><option value="rain">雨</option><option value="sand">砂嵐</option><option value="snow">雪</option></select></div>'
        +'<div class="row"><div class="label">補正</div><input id="v13_extra" type="number" step="0.05" value="1.0"><div class="label">相性</div><select id="v13_type_mul"><option>0.25</option><option>0.5</option><option selected>1.0</option><option>2.0</option><option>4.0</option></select></div>'
      +'</div>'
    +'</div>';

  function foeCell(i){
    return '<div class="card-sub">'
      +'<h3>#'+(i+1)+'</h3>'
      +'<div class="grid three"><label>名前<input id="f'+i+'_name" list="dexNames"></label><label>T1<input id="f'+i+'_t1" list="typeList"></label><label>T2<input id="f'+i+'_t2" list="typeList"></label></div>'
      +'<div class="grid three"><label>HP個体<input id="f'+i+'_iv_hp" type="number" min="0" max="31" value="31"></label><label>HP努力<input id="f'+i+'_ev_hp" type="number" min="0" max="252" step="4" value="252"></label><label>HP実数<b id="f'+i+'_fin_hp">-</b></label></div>'
      +'<div class="grid three"><label>防個体<input id="f'+i+'_iv_def" type="number" min="0" max="31" value="31"></label><label>防努力<input id="f'+i+'_ev_def" type="number" min="0" max="252" step="4"></label><label>防実数<b id="f'+i+'_fin_def">-</b></label></div>'
      +'<div class="grid three"><label>特防個体<input id="f'+i+'_iv_spd" type="number" min="0" max="31" value="31"></label><label>特防努力<input id="f'+i+'_ev_spd" type="number" min="0" max="252" step="4"></label><label>特防実数<b id="f'+i+'_fin_spd">-</b></label></div>'
    +'</div>';
  }
  foesWrap.innerHTML=foeCell(0)+foeCell(1)+foeCell(2);

  var baseAtk=100, baseSpa=100;
  function findMon(n){ if(!n) return null; n=String(n).trim(); for (var i=0;i<(DEX||[]).length;i++){ var p=DEX[i]; if(p && (p.名前===n || String(p.No)===n)) return p; } return null; }
  function recalcSelf(){
    var a=nonHP(baseAtk,+$('v13_iv_atk').value,+$('v13_ev_atk').value,+$('v13_mul_atk').value);
    var s=nonHP(baseSpa,+$('v13_iv_spa').value,+$('v13_ev_spa').value,+$('v13_mul_spa').value);
    return {atk:a, spa:s};
  }
  function onSelf(){ loadDex(function(){ var m=findMon($('v13_self_name').value); baseAtk=m?(+m.攻撃||100):100; baseSpa=m?(+m.特攻||100):100; recalcSelf(); }); }
  ['v13_self_name','v13_ev_atk','v13_iv_atk','v13_mul_atk','v13_ev_spa','v13_iv_spa','v13_mul_spa'].forEach(function(id){ var el=$(id); if(el){ el.addEventListener('input', onSelf); el.addEventListener('change', onSelf);} });
  onSelf();

  function fillFoeBase(i, mon){
    var hp=(mon?(+mon.HP||50):50); var d=(mon?(+mon.防御||50):50); var s=(mon?(+mon.特防||50):50);
    $('f'+i+'_fin_hp').dataset.base=hp;
    $('f'+i+'_fin_def').dataset.base=d;
    $('f'+i+'_fin_spd').dataset.base=s;
  }
  function recalcFoe(i){
    var fh=$('f'+i+'_fin_hp'), fd=$('f'+i+'_fin_def'), fs=$('f'+i+'_fin_spd');
    var hp=HP(+fh.dataset.base||50, +$('f'+i+'_iv_hp').value, +$('f'+i+'_ev_hp').value);
    var de=nonHP(+fd.dataset.base||50, +$('f'+i+'_iv_def').value, +$('f'+i+'_ev_def').value, 1.0);
    var sp=nonHP(+fs.dataset.base||50, +$('f'+i+'_iv_spd').value, +$('f'+i+'_ev_spd').value, 1.0);
    fh.textContent=hp; fd.textContent=de; fs.textContent=sp;
  }
  function onFoeName(i){ loadDex(function(){ var mon=findMon($('f'+i+'_name').value); fillFoeBase(i,mon); recalcFoe(i); }); }
  for (var idx=0; idx<=2; idx++){
    (function(i){
      var nm=$('f'+i+'_name'); if(nm){ nm.addEventListener('input', function(){ onFoeName(i); }); nm.addEventListener('change', function(){ onFoeName(i); }); }
      ['iv_hp','ev_hp','iv_def','ev_def','iv_spd','ev_spd'].forEach(function(suf){
        var el=$('f'+i+'_'+suf); if(el){ el.addEventListener('input', function(){ recalcFoe(i); }); }
      });
    })(idx);
  }

  var btn=$('v13_calc');
  if (btn){
    btn.addEventListener('click', function(){
      var cat=$('v13_cat').value, power=+$('v13_power').value||1, weather=$('v13_weather').value, stab=+$('v13_stab').value||1, extra=+$('v13_extra').value||1, typeMul=+$('v13_type_mul').value||1;
      var self=recalcSelf();
      var atkStat=(cat==='physical')?self.atk:self.spa;
      var html='';
      for (var i=0;i<3;i++){
        var defHP=+$('f'+i+'_fin_hp').textContent||1;
        var defStat=(cat==='physical')?(+$('f'+i+'_fin_def').textContent||1):(+$('f'+i+'_fin_spd').textContent||1);
        var params={power:power, atk:atkStat, df:defStat, cat:cat, rAtk:1, rDef:1, moveType:'', defTypes:[ $('f'+i+'_t1').value||'', $('f'+i+'_t2').value||'' ].filter(function(x){return x;}), weather:weather, stab:stab, typeMul:typeMul, extra:extra, crit:false, item:'1.0'};
        var dm=dmgRange(params), mn=dm[0], mx=dm[1];
        var remainMin=Math.max(0, defHP-mx), remainMax=Math.max(0, defHP-mn);
        var label=''; if (mn>=defHP) label='確定1発'; else if (mx>=defHP) label='乱数1発（高乱数）';
        html += '<div class="card-sub"><b>#'+(i+1)+' '+esc($('f'+i+'_name').value||'相手')+'</b> | HP:'+defHP+' → 1発:'+mn+'～'+mx+' / 残り:'+remainMin+'～'+remainMax+' '+label+'</div>';
      }
      out.innerHTML=html;
    });
  }
})();

/* party */
(function(){
  var grid=$('partyGrid'); if(!grid) return;
  function cell(i){
    return '<div class="card-sub">'
      +'<h3>#'+(i+1)+'</h3>'
      +'<div class="grid three"><label>名前<input id="pt'+i+'_name" list="dexNames"></label><label>持ち物<input id="pt'+i+'_item"></label><label>性格<select id="pt'+i+'_nat"><option>補正なし</option><option>いじっぱり</option><option>ひかえめ</option><option>ようき</option><option>ずぶとい</option><option>おだやか</option></select></label></div>'
      +'<div class="grid three"><label>技1<input id="pt'+i+'_m1"></label><label>技2<input id="pt'+i+'_m2"></label><label>技3<input id="pt'+i+'_m3"></label></div>'
      +'<div class="grid two"><label>技4<input id="pt'+i+'_m4"></label><label>備考<input id="pt'+i+'_note"></label></div>'
      +'<div class="grid three"><label>攻EV<input id="pt'+i+'_ev_atk" type="number" min="0" max="252" step="4"></label><label>防EV<input id="pt'+i+'_ev_def" type="number" min="0" max="252" step="4"></label><label>HP EV<input id="pt'+i+'_ev_hp" type="number" min="0" max="252" step="4"></label></div>'
    +'</div>';
  }
  var html=''; for (var i=0;i<6;i++) html+=cell(i); grid.innerHTML=html;
  function save(){
    var name=$('partyName').value||('PT_'+Date.now());
    var team=[];
    for (var i=0;i<6;i++){
      team.push({name:$('pt'+i+'_name').value||'', item:$('pt'+i+'_item').value||'', nat:$('pt'+i+'_nat').value||'',
        m:[1,2,3,4].map(function(n){return $('pt'+i+'_m'+n).value||'';}),
        note:$('pt'+i+'_note').value||'',
        ev:{atk:+($('pt'+i+'_ev_atk').value||0),def:+($('pt'+i+'_ev_def').value||0),hp:+($('pt'+i+'_ev_hp').value||0)}});
    }
    var all=JSON.parse(localStorage.getItem('parties')||'[]'); all=all.filter(function(x){return x.name!==name;}); all.push({name:name,team:team}); localStorage.setItem('parties',JSON.stringify(all)); alert('保存しました');
  }
  function load(){
    var all=JSON.parse(localStorage.getItem('parties')||'[]'); if(!all.length){ alert('保存がありません'); return; }
    var name=prompt('読み込む保存名を入力', all[all.length-1].name); var it=null; for (var i=0;i<all.length;i++){ if (all[i].name===name){ it=all[i]; break; } } if(!it) it=all[all.length-1];
    $('partyName').value=it.name;
    for (var i=0;i<6;i++){ var p=it.team[i]; if(!p) continue;
      $('pt'+i+'_name').value=p.name||''; $('pt'+i+'_item').value=p.item||''; $('pt'+i+'_nat').value=p.nat||'補正なし';
      for (var n=1;n<=4;n++) $('pt'+i+'_m'+n).value=(p.m&&p.m[n-1])||'';
      $('pt'+i+'_note').value=p.note||'';
      if (p.ev){ $('pt'+i+'_ev_atk').value=p.ev.atk||0; $('pt'+i+'_ev_def').value=p.ev.def||0; $('pt'+i+'_ev_hp').value=p.ev.hp||0; }
    }
  }
  function clearAll(){ grid.querySelectorAll('input,select').forEach(function(e){ if(e.id!=='partyName') e.value=''; }); }
  $('partySave').addEventListener('click',save); $('partyLoad').addEventListener('click',load); $('partyClear').addEventListener('click',clearAll);
})();

/* builds (file picker) */
(function(){
  var pick=$('builds_pick'), btn=$('builds_load'); if(!pick||!btn) return;
  btn.addEventListener('click', function(){
    var f=pick.files && pick.files[0]; if(!f){ alert('JSONファイルを選択してください'); return; }
    var fr=new FileReader();
    fr.onload=function(){
      try{
        var j=JSON.parse(fr.result);
        var teams=j.teams||[]; var list=$('builds_list'); if(!teams.length){ list.innerHTML='<div class="small">0件</div>'; return; }
        var html=''; for (var i=0;i<teams.length && i<200;i++){ var t=teams[i], mons=t.team||[]; html+='<div class="card-sub"><div><b>#'+esc(t.rank)+'</b> Rating:'+esc(t.rating_value||'')+'</div><div>'+mons.map(function(m){return esc(m.pokemon+(m.form?('（'+m.form+'）'):''));}).join(' / ')+'</div></div>'; } list.innerHTML=html;
      }catch(e){ alert('JSONの読み込みに失敗しました'); }
    };
    fr.readAsText(f, 'utf-8');
  });
})();

/* diary (対戦ログ) */
(function(){
  var save=$('diary_save'), clearBtn=$('diary_clear'), title=$('diary_title'), dateI=$('diary_date'), body=$('diary_body'), list=$('diary_list');
  if (!save) return;
  function render(){ var all=JSON.parse(localStorage.getItem('diary')||'[]'); list.innerHTML=all.map(function(d,i){ return '<div class="card-sub"><div><b>'+esc(d.title||('No.'+i))+'</b> '+esc(d.date||'')+'</div><pre class="small">'+esc(d.body||'')+'</pre></div>'; }).join(''); }
  save.addEventListener('click', function(){ var all=JSON.parse(localStorage.getItem('diary')||'[]'); all.push({title:title.value||('ログ'+(all.length+1)), date:dateI.value||'', body:body.value||''}); localStorage.setItem('diary', JSON.stringify(all)); title.value=''; body.value=''; render(); });
  clearBtn.addEventListener('click', function(){ localStorage.removeItem('diary'); render(); });
  render();
  $('diary_export_txt')&&$('diary_export_txt').addEventListener('click', function(){
    var all=JSON.parse(localStorage.getItem('diary')||'[]'); var t=all.map(function(d){ return '['+(d.date||'')+'] '+(d.title||'')+'\n'+(d.body||''); }).join('\n\n---\n\n'); downloadBlob('battle_diary.txt','text/plain;charset=utf-8', t);
  });
  $('diary_export_csv')&&$('diary_export_csv').addEventListener('click', function(){
    var all=JSON.parse(localStorage.getItem('diary')||'[]'); var lines=['date,title,body']; for (var i=0;i<all.length;i++){ var d=all[i]; var r=[d.date||'', d.title||'', (d.body||'').replace(/\r?\n/g,'\\n')]; lines.push(r.map(function(x){ return '"'+String(x).replace(/"/g,'""')+'"'; }).join(',')); } downloadBlob('battle_diary.csv','text/csv;charset=utf-8', lines.join('\n'));
  });
})();

})();