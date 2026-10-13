/**
 * Claim run — homepage agent board (#chs) and stepped stage (#chx), from hero preview v7.
 * Loaded with defer, so the markup is parsed before this runs.
 */
(function(){
var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Swarm clock from swarm-v2.html BEATS (b1 2.0, b2 5.2, b3 8.6, b4 11.0, b5 14.4, b6 18.0, b8 26.0, b9 30.0, end 32.0).
   b7 (Support) cut, so b8+ shift -4.4 s. Played at SPEED x. */
var SPEED=1.25, END=28.6/SPEED;
var N=[
 ['email','in','Input','Claim email',20,40],['photos','in','Input','24 roof photos',20,175],['pdf','in','Input','Policy PDF',20,310],['voice','in','Input','Voice note',20,445],
 ['sort','ag','Intake','Claim Sorter',225,20],['read','ag','Intake','Policy Reader',225,165],['wx','ag','Intake','Weather Check',225,310],['flag','ag','Intake','Red-Flag Screen',225,455],
 ['lic','ag','Legal','License Check',480,20],['paper','ag','Representation','Paperwork Drafter',480,165],['pol','ag','POL','Proof-of-Loss Builder',480,330],['dl','ag','POL','Deadline Watch',480,475],
 ['gate','hum','Approval gate','Assigned PA',755,20],['carrier','ag','Carrier response','Carrier Pushback',755,150],['fu','ag','Carrier response','Follow-up Writer',755,280],['chk','ag','Checks','Check Router',755,410],['inv','ag','Invoicing','Invoice Tracker',755,530]];
var E=[['email','sort'],['photos','sort'],['pdf','sort'],['voice','sort'],['sort','read'],['sort','wx'],['sort','flag'],['flag','lic'],['lic','paper'],['paper','gate'],['read','pol'],['pol','dl'],['pol','gate'],['carrier','fu'],['fu','gate'],['dl','gate'],['chk','inv']];
var EV=[
 [2.0,'email','lit','received'],[2.3,'photos','lit','24 attached'],[2.6,'pdf','lit','policy + dec page'],[2.9,'voice','lit','0:42'],
 [2.6,'sort','work','sorting'],[3.2,'sort','work','route: new_lead','Claim Sorter|route: new_lead'],[3.9,'sort','work','filing docs','Claim Sorter|filed policy, dec_page, 24 photo'],[4.6,'sort','done','filed · handed off'],
 [5.2,'read','work','reading policy'],[5.35,'wx','work','checking date of loss'],[5.5,'flag','work','screening'],
 [6.0,'read','work','peril = wind_hail','Policy Reader|peril = wind_hail'],[6.4,'flag','work','prior denial ≠ flag','Red-Flag Screen|prior denial alone → not a flag'],
 [6.8,'wx','done','radar_indicated','Weather Check|radar_indicated (indicative only)'],[7.1,'read','work','policy # · mortgagee','Policy Reader|date of loss, policy #, mortgagee read'],[7.6,'read','done','fields + evidence'],
 [7.8,'flag','done','red flags: none','Red-Flag Screen|red flags → none'],
 [8.6,'lic','work','checking'],[9.4,'lic','done','license + bond found','License Check|license + bond → found'],
 [11.0,'paper','work','fee review'],[11.5,'paper','work','fee within cap','Paperwork Drafter|fee review → within cap'],[12.1,'paper','done','signature_package','Paperwork Drafter|signature_package drafted'],
 [12.6,'gate','wait','holds for PA','Approval gate|holds for PA'],[13.8,'gate','hum','approved · sent','PA|approved + sent',1],
 [14.4,'pol','work','building POL'],[15.0,'pol','work','deductible $1,000','Proof-of-Loss Builder|deductible $1,000 ← dec page'],[15.2,'dl','work','statute dates'],
 [15.6,'pol','work','totals_match_estimate ✓','Proof-of-Loss Builder|totals_match_estimate → pass'],[16.4,'dl','wait','needs_human','Deadline Watch|statute date → needs_human'],[17.0,'pol','done','POL checks pass'],
 [18.0,'carrier','work','reading carrier estimate','Carrier Pushback|carrier letter classified'],[19.0,'carrier','done','gap found','Carrier Pushback|estimate comparison → gap found'],
 [19.4,'fu','work','drafting reply'],[20.2,'fu','done','reply drafted','Follow-up Writer|reply drafted'],
 [20.6,'gate','wait','holds for PA','Approval gate|holds for PA'],[22.0,'gate','hum','approved · sent','PA|approved + sent',1],[22.0,'dl','done','PA confirmed date'],
 [22.6,'chk','work','check received'],[23.2,'chk','work','matched by claim #','Check Router|check matched to claim'],[23.8,'chk','done','lender_endorsement','Check Router|route → lender_endorsement'],
 [24.2,'inv','work','tracking'],[24.8,'inv','done','invoice not_due','Invoice Tracker|invoice → not_due'],
 [25.6,'gate','wait','package ready','Approval gate|claim package → ready for PA'],[26.9,'gate','hum','PA approved ✓','PA|claim package approved',1]
];
var CAPS=[[0,'00','A claim comes in','email · photos · policy · voice note'],[2.0,'01','Claim in','sorted, typed and filed'],[5.2,'02','Read & screened','three agents at once'],[8.6,'03','License checked','before the firm engages'],[11.0,'04','Paperwork drafted','the PA approves the send'],[14.4,'05','Proof of loss built','checked in code, dates held for a person'],[18.0,'06','Carrier pushes back','reply drafted · human in the loop'],[22.6,'07','Check routed','matched by claim # · lender path'],[25.6,'08','Ready for you','one approval and it goes']];
var CH=[[5.4,7.8,'3 agents in parallel','wx',220,30],[12.6,13.8,'review LOR + W-9','gate',-150,96,1],[16.4,18.6,'needs a person','dl',-10,-30],[20.6,22.0,'review reply','gate',-110,96,1],[25.6,26.9,'one click to approve','gate',-150,96,1]];
EV.forEach(function(e){e[0]/=SPEED});CAPS.forEach(function(c){c[0]/=SPEED});CH.forEach(function(c){c[0]/=SPEED;c[1]/=SPEED});
var stage=document.getElementById('chsStage'),svg=document.getElementById('chsSvg'),box=document.getElementById('chsBox'),NE={},PATH={};
var r=(function(s){return function(){s=(s*16807)%2147483647;return s/2147483647}})(7),bgs=[];
[[150,120],[370,90],[400,250],[640,95],[650,250],[640,410],[350,410],[380,560],[640,570],[150,580],[900,90]].forEach(function(p,i){var d=document.createElement('div');d.className='chs-bg';d.style.left=(p[0]-40+r()*30)+'px';d.style.top=(p[1]-10+r()*20)+'px';d.innerHTML='SYN-'+(1043+Math.floor(r()*90))+' · example<i><b></b></i>';stage.insertBefore(d,svg);bgs.push(d)});
N.forEach(function(n){var d=document.createElement('div');d.className='chs-n'+(n[1]==='in'?' in':'');d.style.left=n[4]+'px';d.style.top=n[5]+'px';
 d.innerHTML='<div class="chs-nh"><span>'+(n[1]==='hum'?'Human · '+n[2]:n[2])+'</span></div><div class="chs-nb"><div class="chs-nn">'+n[3]+'</div><div class="chs-ns"></div><div class="chs-bar"><b></b></div></div>';
 stage.appendChild(d);NE[n[0]]={el:d,n:n,st:d.querySelector('.chs-ns'),bar:d.querySelector('.chs-bar b')}});
function ctr(id){var n=NE[id].n,w=n[1]==='in'?150:212;return {l:n[4],r:n[4]+w,y:n[5]+40}}
E.forEach(function(e){var a=ctr(e[0]),b=ctr(e[1]),p=document.createElementNS('http://www.w3.org/2000/svg','path'),d;
 if(b.l>a.r){d='M'+a.r+' '+a.y+' C'+(a.r+60)+' '+a.y+' '+(b.l-60)+' '+b.y+' '+b.l+' '+b.y}
 else{var ax=a.l+106,bx=b.l+106,dn=b.y>a.y,y1=a.y+(dn?50:-40),y2=b.y+(dn?-40:50),m=(y1+y2)/2;d='M'+ax+' '+y1+' C'+ax+' '+m+' '+bx+' '+m+' '+bx+' '+y2}
 p.setAttribute('d',d);p.setAttribute('class','chs-e');svg.appendChild(p);PATH[e[0]+'>'+e[1]]=p});
var dots=document.getElementById('chsDots'),AG=N.filter(function(n){return n[1]==='ag'});dots.innerHTML=AG.map(function(){return '<i></i>'}).join('');
var chips=CH.map(function(c){var d=document.createElement('div');d.className='chs-chip'+(c[6]?' hu':'');var n=NE[c[3]].n;d.style.left=(n[4]+c[4])+'px';d.style.top=(n[5]+c[5])+'px';d.textContent=c[2];stage.appendChild(d);return d});
var PUL=[],seen={};EV.forEach(function(e){var k=e[1]+e[2]+Math.round(e[0]*2);if((e[2]==='work'||e[2]==='wait')&&!seen[k]){seen[k]=1;
 E.forEach(function(ed){if(ed[1]===e[1])PUL.push([e[0]-0.4,0.4,PATH[ed[0]+'>'+ed[1]],0])})}
 if(e[2]==='hum')E.forEach(function(ed){if(ed[1]==='gate')PUL.push([e[0],0.5,PATH[ed[0]+'>'+ed[1]],1,1])})});
var pdots=PUL.map(function(p){var c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('r',5);c.setAttribute('class','chs-p'+(p[3]?' hu':''));c.style.display='none';svg.appendChild(c);return c});
var cap=document.getElementById('chsCap'),num=document.getElementById('chsNum'),ct=document.getElementById('chsCt'),cs=document.getElementById('chsCs'),
 cnt=document.getElementById('chsCount'),app=document.getElementById('chsApp'),log=document.getElementById('chsLog'),t1=document.getElementById('chsT1'),t2=document.getElementById('chsT2'),pay=document.getElementById('chsPay'),prog=document.getElementById('chsProg'),wk=document.getElementById('chsWork'),dn=document.getElementById('chsDone'),lastCap=-1,lastLog=-1;
function setAt(t){
 var S={};EV.forEach(function(e){if(t>=e[0])S[e[1]]=[e[2],e[3],e[0]]});
 var working=0,done=0;
 N.forEach(function(n){var o=NE[n[0]],s=S[n[0]],cls='chs-n'+(n[1]==='in'?' in':'');
  if(s){cls+=' '+s[0];o.st.textContent=s[1];o.bar.style.width=(s[0]==='work'?Math.min(90,20+(t-s[2])*60):100)+'%'}else{o.st.textContent=n[1]==='in'?'waiting':n[1]==='hum'?'available':'standby';o.bar.style.width='0'}
  if(n[1]==='hum'&&!s)cls+=' hu0';o.el.className=cls;
  if(n[1]==='ag'&&s){if(s[0]==='work')working++;else done++}});
 [].forEach.call(dots.children,function(d,i){var s=S[AG[i][0]];d.className=s?(s[0]==='work'?'on':'ok'):''});wk.textContent=working;dn.textContent=done;
 E.forEach(function(e){PATH[e[0]+'>'+e[1]].setAttribute('class','chs-e'+(S[e[0]]&&S[e[1]]?' on':''))});
 PUL.forEach(function(p,i){var u=(t-p[0])/p[1];if(u>0&&u<1){var L=p[2].getTotalLength(),pt=p[2].getPointAtLength(L*(p[4]?1-u:u));pdots[i].setAttribute('cx',pt.x);pdots[i].setAttribute('cy',pt.y);pdots[i].style.display=''}else pdots[i].style.display='none'});
 chips.forEach(function(c,i){c.classList.toggle('on',t>=CH[i][0]&&t<CH[i][1])});
 var ci=0;CAPS.forEach(function(c,i){if(t>=c[0])ci=i});if(cap&&ci!==lastCap){lastCap=ci;num.textContent=CAPS[ci][1];ct.textContent=CAPS[ci][2];cs.textContent=CAPS[ci][3];cap.classList.remove('flip');void cap.offsetWidth;cap.classList.add('flip')}
 var L=EV.filter(function(e){return e[4]&&t>=e[0]});if(L.length!==lastLog){lastLog=L.length;log.innerHTML=L.slice(-14).map(function(e){var p=e[4].split('|');return '<li'+(e[5]?' class="hu"':'')+'><b>'+p[0]+'</b><span>'+p[1]+'</span></li>'}).join('')}
 var nD=L.filter(function(e){return !e[5]&&e[4].indexOf('Approval gate')!==0}).length,nA=L.filter(function(e){return e[5]}).length;cnt.textContent=nD;app.textContent=nA;t1.textContent=nD;t2.textContent=nA;
 pay.classList.toggle('on',t>=EV[EV.length-1][0]+0.3);
 bgs.forEach(function(b,i){b.querySelector('b').style.width=(15+((t*9+i*23)%80))+'%'});
 prog.style.width=Math.min(100,t/END*100)+'%';
}
function fit(){stage.style.transform=innerWidth<=700?'':'scale('+(box.clientWidth/1000)+') translateY(-12px)'}
addEventListener('resize',fit);fit();
var raf,t0=0,started=false;function tick(ts){if(!t0)t0=ts;var t=(ts-t0)/1000;setAt(t);if(t<END)raf=requestAnimationFrame(tick)}
function play(){cancelAnimationFrame(raf);t0=0;started=true;raf=requestAnimationFrame(tick)}
window.__chsSeek=function(t){cancelAnimationFrame(raf);started=true;setAt(t)};
setAt(0);
if(rm){setAt(99)}else{var io=new IntersectionObserver(function(es){if(es[0].isIntersecting&&!started)play()},{threshold:.25});io.observe(box)}
document.getElementById('chxReplay').onclick=function(){rm?setAt(99):play()};
var modal=document.getElementById('chxModal'),vid=document.getElementById('chxVid'),opener;
/* the 17 MB video loads only once someone asks for it */
document.getElementById('chxWatch').onclick=function(e){opener=e.currentTarget;if(!vid.getAttribute('src'))vid.src=vid.getAttribute('data-src');modal.classList.add('open');document.getElementById('chxClose').focus();vid.play&&vid.play().catch(function(){})};
function close(){modal.classList.remove('open');vid.pause();opener&&opener.focus()}
document.getElementById('chxClose').onclick=close;modal.onclick=function(e){if(e.target===modal)close()};
addEventListener('keydown',function(e){if(e.key==='Escape'&&modal.classList.contains('open'))close()});
})();

(function(){
var root=document.getElementById('chx');
var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* stepped section */
var STEPS=[
 ['Agent A · Intake','The claim is sorted and filed.','Each document gets a type (<code>policy</code>, <code>dec_page</code>, <code>photo</code>) and is filed once. Date of loss, peril, policy number and mortgagee are read with the quote kept as evidence. Missing items become a list of gaps.'],
 ['Agent A · Intake','Red flags are checked first.','Flood, EUO, litigation, another PA, a cited exclusion and other flags send the intake to the firm owner before anyone engages. A weather check is recorded, marked indicative only.'],
 ['Agent H · Legal & Licensing','License and bond are on file.','Licenses, bonds and CE are tracked as found, missing or needs review, with expiry alerts.'],
 ['Agent B · Representation','Paperwork drafted, then approved.','Fee review, signature tracking, carrier contact and a delivery check. The signature package and representation email are drafts until the PA approves.'],
 ['Agent C · POL & Claim Package','The proof of loss is built and checked.','Totals come from the estimate and the deductible from the dec page, computed in code. Checks run for things like <code>insured_matches_policy</code> and <code>totals_match_estimate</code>. Statute dates stay unverified until a person confirms them.'],
 ['Agent D · Carrier Response','Carrier replies are read and compared.','Letters are classified, estimates compared and follow-ups planned. Money, legal and low-confidence items go to a person. Replies wait at the approval gate.'],
 ['Agents F & G · Checks, Invoicing','Checks routed, invoices tracked.','A check is matched to its claim and routed: iink, lender endorsement, endorse and invoice, call the policyholder, or void and reissue. Invoicing tracks what is due and drafts reminders for review.']
];
var VIZ=[['A','Intake: documents filed'],['A','Red flags: none'],['H','License + bond: found'],['B','Signature package drafted'],['PA','PA approved and sent','hu'],['C','POL checks: pass'],['D','Reply drafted · waits for PA'],['F','Check routed'],['G','Invoice tracked']];
var VMAP=[[0],[1],[2],[3,4],[5],[6],[7,8]];
var stEl=document.getElementById('chxSteps'),dots=document.getElementById('chxDots'),viz=document.getElementById('chxViz'),trav=document.getElementById('chxTravel');
trav.style.setProperty('--n',STEPS.length);
viz.innerHTML='<div class="chx-cardh"><b style="color:#aab6d3;font-size:12px;letter-spacing:.08em">SYN-1042 · EXAMPLE CLAIM</b></div>'+VIZ.map(function(v){return '<div class="chx-vrow'+(v[2]?' hu':'')+'"><span>'+(v[0]==='PA'?'Human':'Agent '+v[0])+'</span><span>'+v[1]+'</span></div>'}).join('');
stEl.innerHTML=STEPS.map(function(s){return '<div class="chx-step"><div class="k">'+s[0]+'</div><h3>'+s[1]+'</h3><p>'+s[2]+'</p></div>'}).join('');
dots.innerHTML=STEPS.map(function(){return '<i></i>'}).join('');
var steps=stEl.children,dd=dots.children,rows=viz.querySelectorAll('.chx-vrow');
function show(i){for(var k=0;k<steps.length;k++){steps[k].classList.toggle('on',k===i);dd[k].classList.toggle('on',k<=i)}
 var cur=VMAP[i],mx=Math.max.apply(null,cur);for(var r=0;r<rows.length;r++){rows[r].classList.toggle('on',r<=mx);rows[r].classList.toggle('cur',cur.indexOf(r)>=0)}}
if(rm){for(var k=0;k<steps.length;k++)steps[k].classList.add('on');show(STEPS.length-1);for(var k=0;k<steps.length;k++)steps[k].classList.add('on');}
else{show(0);var tk=false,stick=trav.firstElementChild;function upd(){tk=false;var r=trav.getBoundingClientRect(),span=r.height-innerHeight;var p=Math.min(.999,Math.max(0,-r.top/span));show(Math.floor(p*STEPS.length));
 /* pin by hand: sticky never engages under body{overflow-x:hidden} (components.css) */
 stick.classList.toggle('fix',r.top<=0&&r.bottom>innerHeight);stick.classList.toggle('end',r.bottom<=innerHeight);}
 addEventListener('scroll',function(){if(!tk){tk=true;requestAnimationFrame(upd)}},{passive:true});addEventListener('resize',upd);upd();}
var rv=[].slice.call(root.querySelectorAll('.chx-rv'));
if(rm||!('IntersectionObserver' in window)){rv.forEach(function(e){e.classList.add('in')})}
else{var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.15,rootMargin:'0px 0px -8% 0px'});rv.forEach(function(e){io.observe(e)})}
})();
