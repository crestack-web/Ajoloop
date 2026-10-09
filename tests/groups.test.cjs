/* Headless tests for the Social Groups engine.  Run:  node groups.test.js [path/to/kano-city.html]
   The game's rules sit between //#ENGINE-START and //#ENGINE-END in the HTML, so the tests run the real engine code, not a copy. */
const fs=require('fs');
const path=require('path');
const defaultEngine=path.join(__dirname,'../src/engine/game.js');
const html=fs.readFileSync(process.argv[2]||defaultEngine,'utf8');
const engine=html.slice(html.indexOf('//#ENGINE-START'),html.indexOf('//#ENGINE-END'));
const body=`
const results=[];let cur='';
const ok=(c,m)=>{results.push({t:cur,ok:!!c,m:m||''})};
const eq=(a,b,m)=>ok(JSON.stringify(a)===JSON.stringify(b),(m||'')+' expected '+JSON.stringify(b)+' got '+JSON.stringify(a));
const T=(name,fn)=>{cur=name;try{fresh();fn()}catch(e){results.push({t:name,ok:false,m:'THREW '+e.stack.split('\\n').slice(0,3).join(' | ')})}};
const R=v=>{Math.random=()=>v};            // 0 => every chance succeeds, .999 => every chance fails
const fresh=()=>{R(.5);newGame('Tester',25,'Male');FX.length=0;G.day=5;G.hour=8};
const lastWarn=()=>{const w=FX.filter(f=>f.k==='warn');return w.length?w[w.length-1].t:null};
const meet=(id,rel=60)=>{const n=npc(id);n.met=true;n.rel=rel};
const money=()=>JSON.stringify({c:G.p.cash,s:G.p.savings,tx:G.tx.length,d:G.debts.length});
const ajoMembers=()=>JSON.stringify(G.ajos.map(a=>[a.id,a.members]));
const mine=(o={})=>createGroup({name:'My Crew',vis:'public',join:'open',...o});
const nextDay=()=>{G.hour=21;G.p.cash=Math.max(G.p.cash,50000);sleep()};

T('1. ordinary user can create a group (no Ajo agent role, no money, no Ajo)',()=>{
 const m0=money(),a0=ajoMembers();const id=mine();ok(id,'created');eq(grp(id).owner,'player');eq(roleOf(grp(id),'player'),'owner');
 eq(money(),m0,'no money moved');eq(ajoMembers(),a0,'no Ajo changed');eq(myAjos().length,0,'not in any Ajo');ok(!('agent' in G.p),'no agent concept needed')});

T('2. creator can pick public or private',()=>{
 const a=mine({name:'Open House',vis:'public'}),b=mine({name:'Closed Door',vis:'private'});eq(grp(a).vis,'public');eq(grp(b).vis,'private');
 eq(grp(b).join,'invite','private defaults to invite-only');ok(!grp(b).disc,'private is not searchable by default');
 ok(searchGroups('Open House','','maryam').some(x=>x.id===a),'public is searchable');ok(!searchGroups('Closed Door','','maryam').some(x=>x.id===b),'private is not');
 const c=mine({name:'Findable Club',vis:'private',disc:true,join:'approval'});ok(searchGroups('Findable','','maryam').some(x=>x.id===c),'invite-discoverable private shows up');
 ok(!createGroup({name:'ab'}),'too short name refused')});

T('3. private groups cannot be reached by unauthorized users (view, posts, roster, direct id)',()=>{
 const id=mine({name:'Secret Club',vis:'private'});gpost(id,'player','TOP-SECRET-PLAN');
 for(const who of ['maryam','zainab','nobody']){eq(viewGroup(id,who),null,who+' view');eq(postsFor(id,who),null,who+' posts');eq(memberList(id,who),null,who+' roster');
  ok(!gpost(id,who,'hi'),who+' cannot post');ok(!createInvite(id,who,{ttl:7}),who+' cannot invite');ok(!rsvp(id,who,'x'),who+' cannot rsvp');ok(!reportPost(id,who,'x','y'),who+' cannot report')}
 // same answer as a group that does not exist, so existence does not leak
 FX.length=0;joinGroup('gs5','player');const real=lastWarn();FX.length=0;joinGroup('g_nope','player');eq(real,lastWarn(),'private group and missing group look identical');
 eq(viewGroup('gs5','player'),null,'NPC-owned private group is invisible to non-member');eq(postsFor('gs5','player'),null)});

T('4a. direct invitations: accept, decline, revoke, no spam',()=>{
 const id=mine({name:'Invite Test',vis:'private'});meet('musa',70);R(0);const iid=createInvite(id,'player',{to:'musa'});ok(iid,'sent');
 const i=grp(id).inv.find(x=>x.id===iid);eq(invState(i),'accepted','NPC friend accepted');ok(grp(id).mem.musa,'now a member');ok(i.acc[0].day===G.day,'acceptance day recorded');
 ok(gcount(grp(id))===2);ok(!createInvite(id,'player',{to:'musa'}),'already a member');
 meet('aisha',30);R(.999);const j=createInvite(id,'player',{to:'aisha'});eq(invState(grp(id).inv.find(x=>x.id===j)),'declined');ok(!createInvite(id,'player',{to:'aisha'}),'cannot re-ask the same day');
 nextDay();R(0);ok(resendInvite(id,'player',j),'resend next day');ok(grp(id).mem.aisha,'accepted after resend');
 meet('yusuf',60);R(.999);const k=createInvite(id,'player',{to:'yusuf'});ok(grp(id).inv.find(x=>x.id===k).dec);
 ok(!createInvite(id,'player',{to:'maryam'}),'cannot invite someone you have not met')});

T('4b. link codes: accept, revoke, expire, use-limit, wrong-guess limit',()=>{
 const id=mine({name:'Code Club',vis:'private'});const a=createInvite(id,'player',{ttl:3,max:2}),code=grp(id).inv.find(x=>x.id===a).code;ok(/^KANO-[A-Z0-9]{6}$/.test(code),'code format');
 // another "person" redeems (NPC actor)
 ok(redeemCode(code,'zainab'),'first redeem');ok(grp(id).mem.zainab);ok(redeemCode(code,'maryam'),'second redeem');ok(!redeemCode(code,'sani'),'use limit reached');
 const b=createInvite(id,'player',{ttl:7,max:5}),c2=grp(id).inv.find(x=>x.id===b).code;ok(revokeInvite(id,'player',b),'revoke');ok(!redeemCode(c2,'sani'),'revoked code fails');
 FX.length=0;redeemCode(c2,'sani');const rv=lastWarn();FX.length=0;redeemCode('KANO-WRONG1','sani');eq(rv,lastWarn(),'revoked and wrong codes give the same answer');
 const c3=createInvite(id,'player',{ttl:1,max:5}),code3=grp(id).inv.find(x=>x.id===c3).code;G.day+=3;ok(!redeemCode(code3,'sani'),'expired code fails');
 for(let n=0;n<8;n++)redeemCode('KANO-NOPE'+n,'bashir');ok(/Too many/.test(lastWarn()),'guessing is rate-limited');
 const real=createInvite(id,'player',{ttl:7,max:5}),rc=grp(id).inv.find(x=>x.id===real).code;ok(!redeemCode(rc,'bashir'),'locked out for the day even with a real code');nextDay();ok(redeemCode(rc,'bashir'),'works again tomorrow')});

T('4c. NPC invites you to a private group; you can accept or decline',()=>{
 const n=npc('rukayya');n.met=true;rel('rukayya',10,'test');ok(n.rel>=36,'rel high enough');ok(grp('gs5').inv.some(i=>i.to==='player'),'invitation arrived');
 const i=grp('gs5').inv.find(x=>x.to==='player');ok(viewGroup('gs5','player')&&viewGroup('gs5','player').gated,'invitee sees a gated preview only');eq(postsFor('gs5','player'),null,'still no content before accepting');
 ok(answerInvite('gs5',i.id,true),'accept');ok(grp('gs5').mem.player);ok(postsFor('gs5','player').length>0,'content visible after joining');
 const i2=grp('gs5').inv.find(x=>x.to==='player');ok(!answerInvite('gs5',i2.id,true),'cannot accept twice')});

T('5. users cannot grant themselves administrator',()=>{
 ok(joinGroup('gs1'));ok(!setRole('gs1','player','player','admin'),'member cannot self-promote');eq(roleOf(grp('gs1'),'player'),'member');
 ok(!editGroup('gs1','player',{desc:'hax'}),'member cannot edit');
 // a moderator or admin cannot hand out roles either
 const id=mine();meet('musa',70);meet('aisha',70);R(0);createInvite(id,'player',{to:'musa'});createInvite(id,'player',{to:'aisha'});setRole(id,'player','musa','mod');setRole(id,'player','aisha','admin');
 ok(!setRole(id,'musa','musa','admin'),'mod cannot self-promote');ok(!setRole(id,'aisha','aisha','owner'),'admin cannot self-promote');ok(!setRole(id,'aisha','musa','admin'),'admin cannot appoint');
 ok(!setRole(id,'player','player','member'),'owner cannot demote self');eq(roleOf(grp(id),'musa'),'mod');
 ok(!setRole(id,'player','musa','owner'),'owner role only via transfer')});

T('6. only authorised roles change settings / announce',()=>{
 const id=mine();meet('musa',70);meet('aisha',70);meet('yusuf',70);R(0);['musa','aisha','yusuf'].forEach(n=>createInvite(id,'player',{to:n}));setRole(id,'player','musa','mod');setRole(id,'player','aisha','admin');
 ok(!editGroup(id,'yusuf',{desc:'x'}),'member cannot');ok(!editGroup(id,'musa',{desc:'x'}),'moderator cannot');ok(editGroup(id,'aisha',{desc:'Admin wrote this'}),'admin can edit description');eq(grp(id).desc,'Admin wrote this');
 ok(!editGroup(id,'aisha',{vis:'private'}),'admin cannot change visibility');ok(!editGroup(id,'aisha',{name:'Renamed'}),'admin cannot rename');ok(editGroup(id,'player',{vis:'private'}),'owner can');eq(grp(id).vis,'private');
 ok(!gpost(id,'yusuf','news',{kind:'announce'}),'member cannot announce');ok(!gpost(id,'musa','news',{kind:'announce'}),'mod cannot announce');ok(gpost(id,'aisha','Big news',{kind:'announce'}),'admin can');
 ok(!createEvent(id,'yusuf',{title:'Party',kind:'meetup',loc:'social'}),'member cannot create events');ok(createEvent(id,'aisha',{title:'Party',kind:'meetup',loc:'social'}),'admin can');
 ok(!deleteGroup(id,'aisha','My Crew'),'admin cannot delete');ok(!transferOwnership(id,'aisha','aisha','My Crew'),'admin cannot transfer')});

T('7. owner appoints moderators; moderator powers are limited; admin cannot remove peers',()=>{
 const id=mine();['musa','aisha','yusuf'].forEach(n=>meet(n,70));R(0);['musa','aisha','yusuf'].forEach(n=>createInvite(id,'player',{to:n}));
 ok(setRole(id,'player','musa','mod'),'appoint mod');ok(setRole(id,'player','aisha','admin'),'appoint admin');
 const p=gpost(id,'yusuf','rude post');ok(reportPost(id,'aisha',p,'rude'));const rid=grp(id).reps[0].id;
 ok(!removeMember(id,'musa','yusuf'),'mod cannot remove members');ok(!reviewReport(id,'musa',rid,'ban'),'mod cannot ban');ok(reviewReport(id,'musa',rid,'hide'),'mod can hide');ok(grp(id).posts.find(x=>x.id===p).hid);
 ok(removeMember(id,'aisha','musa'),'admin can remove a lower role');
 const g=grp(id);addMember(g,'zainab','admin');ok(!removeMember(id,'aisha','zainab'),'admin cannot remove a peer admin');ok(!removeMember(id,'aisha','player'),'nobody removes the owner')});

T('8. report abuse and block users',()=>{
 const id=mine();meet('sani',60);R(0);createInvite(id,'player',{to:'sani'});const p=gpost(id,'sani','buy my stuff!!');
 ok(!reportPost(id,'sani',p,'x'),'cannot report own post');ok(reportPost(id,'player',p,'spam'),'report works');ok(!reportPost(id,'player',p,'spam'),'no duplicate reports');ok(!reportPost(id,'maryam',p,'x'),'outsiders cannot report');
 ok(postsFor(id,'player').some(x=>x.id===p),'visible before block');ok(blockUser('sani'));ok(!postsFor(id,'player').some(x=>x.id===p),'blocked author hidden');ok(!grp(id).mem.sani,'removed from your group');ok(grp(id).ban.includes('sani'),'and banned from it');
 ok(!createInvite(id,'player',{to:'sani'}),'cannot invite a blocked person');ok(!joinGroup(id,'sani'),'banned cannot rejoin');unblockUser('sani');ok(!G.blk.includes('sani'));
 ok(!blockUser('nobody'),'cannot block a non-person')});

T('9. social group membership never becomes Ajo membership',()=>{
 const a0=ajoMembers();joinGroup('gs1');joinGroup('gs3');const id=mine();['musa','aisha'].forEach(n=>meet(n,70));R(0);createInvite(id,'player',{to:'musa'});nextDay();nextDay();
 eq(myAjos().length,0);eq(JSON.stringify(G.ajos.map(a=>[a.id,a.members.includes('player')])),JSON.stringify(G.ajos.map(a=>[a.id,false])));
 eq(a0,ajoMembers(),'no Ajo membership changed (host NPC members untouched)')});

T('10. social group actions never create a financial obligation',()=>{
 const m0=money();const id=mine();joinGroup('gs1');joinGroup('gs3');gpost(id,'player','hello');meet('musa',70);R(0);createInvite(id,'player',{to:'musa'});proposeAjo(id,'player',{amt:10000});leaveGroup('gs1');eq(money(),m0,'no cash, savings, ledger or debt change from group actions');
 for(let n=0;n<8;n++)nextDay();ok(!G.tx.some(t=>t.cat==='ajo'),'8 days later: no Ajo ledger entries');eq(G.debts.length,0,'no debts');ok(!G.ajos.some(a=>a.members.includes('player')),'still in no Ajo')});

T('11a. a group-linked Ajo keeps its own membership and permissions',()=>{
 const id=mine();G.p.trust=60;const pid=proposeAjo(id,'player',{name:'Crew Ajo',size:3,amt:2000,freq:7});ok(pid);
 const aid=ajoFromProposal(id,'player',pid);ok(aid,'created through the existing createAjo (no location gate)');
 const a=ajoOf(aid);eq(a.group,id);eq(a.members,['player'],'only the organiser is in; group members are NOT copied');eq(a.status,'open');eq(grp(id).ajoP[0].st,'created');
 meet('musa',70);R(0);createInvite(id,'player',{to:'musa'});ok(!a.members.includes('musa'),'group member is still not an Ajo member');
 ok(invite(aid,'musa'),'they are asked through the normal Ajo invite');ok(a.members.includes('musa'),'and join the Ajo on its own terms');
 ok(ajosFor(grp(id),'player').length===1,'members see the link');eq(ajosFor(grp(id),'zainab'),[],'outsiders do not');
 ok(!JSON.stringify(ajosFor(grp(id),'player')).includes('contribs'),'no payment records on the social page')});

T('11b. group membership does not unlock someone else\\'s Ajo',()=>{
 ok(joinGroup('gs1'));G.ajos[0].group='gs1';G.p.loc='ajo';G.p.trust=30;ok(!joinAjo(G.ajos[0].id),'trust rule still applies');
 const a=G.ajos[0];a.status='active';a.startDay=G.day;ok(!payAjo(a.id),'a non-member cannot pay into the circle');ok(!reqPriority(a.id,'plain'),'cannot ask for payout');ok(!startAjo(a.id),'cannot start it');ok(!voteNom(a.id,true),'cannot vote in it');
 G.p.cash=99999;payAjo(a.id);eq(G.p.cash,99999,'no money moved');eq(G.debts.length,0)});

T('11c. leaving a group does not cancel an Ajo or a debt',()=>{
 const id=mine();G.p.trust=60;G.p.loc='ajo';const pid=proposeAjo(id,'player',{size:3});const aid=ajoFromProposal(id,'player',pid);const a=ajoOf(aid);
 G.debts.push({id:G.nid++,ajo:aid,cycle:0,m:'player',to:'musa',amt:2000,day:G.day,paid:false});
 ok(leaveGroup(id),'leave');ok(a.members.includes('player'),'still in the Ajo');eq(G.debts.filter(d=>!d.paid).length,1,'debt still owed');ok(ajoOf(aid).group===id,'link survives');
 ok(!grp(id),'group archived (it had no other members)');eq(ajosFor(grp(id),'player'),[],'no page to show it on')});

T('12. private content does not leak through search, recommendations, profile or APIs',()=>{
 const secret='TOP-SECRET-TOKEN-7731';const id=mine({name:'Hidden Circle',vis:'private',desc:'quiet'});gpost(id,'player',secret);createEvent(id,'player',{title:'Quiet meetup',kind:'meetup',loc:'social'});
 G.p.ints=['Friends & Family'];G.p.shareArea=true;G.p.area='Fagge';
 const dump=JSON.stringify([searchGroups('','','maryam'),searchGroups(secret,'','maryam'),searchGroups('Hidden','','maryam'),discoverSections('maryam'),discoverSections('player'),profileGroups('player'),profileGroups('musa')]);
 const v=JSON.stringify([viewGroup(id,'maryam'),postsFor(id,'maryam'),memberList(id,'maryam'),viewGroup(id,'player')]);
 ok(!dump.includes(secret)&&!dump.includes('Hidden Circle'),'search, recommendations and profiles show nothing about it');
 eq(searchGroups(secret,'','maryam'),[]);eq(viewGroup(id,'maryam'),null);eq(postsFor(id,'maryam'),null);eq(memberList(id,'maryam'),null);
 // discoverable-private shows a glimpse only
 const d=mine({name:'Findable Two',vis:'private',disc:true,join:'approval'});gpost(d,'player',secret);const f=JSON.stringify(searchGroups('Findable','','maryam'));ok(f.includes('Findable Two')&&!f.includes(secret),'glimpse only, no posts');
 eq(postsFor(d,'maryam'),null,'and no content for a non-member');
 // public membership only shows on a profile if chosen
 const pub=mine({name:'Public One'});eq(profileGroups('player'),[],'off by default');ok(setShow(pub,'player',true));eq(profileGroups('player').length,1);ok(!setShow(id,'player',true),'private cannot be shown');
 editGroup(pub,'player',{vis:'private'});eq(profileGroups('player'),[],'turning a group private removes it from profiles');
 // public group: outsiders see announcements only, never chat
 const ann=postsFor('gs1','maryam');ok(ann.length>0&&ann.every(p=>p.kind==='announce'),'outsiders see announcements only');
 eq(memberList('gs1','maryam'),null,'public rosters are members-only too')});

T('13. rate limits and spam prevention',()=>{
 const id=mine();let okc=0;for(let n=0;n<10;n++)if(gpost(id,'player','msg number '+n))okc++;eq(okc,8,'8 posts a day');nextDay();ok(gpost(id,'player','new day'),'resets next day');
 ok(!gpost(id,'player','new day'),'duplicate refused');ok(!gpost(id,'player','http://a.co http://b.co'),'link spam refused');ok(!gpost(id,'player','x'.repeat(281)),'too long refused');ok(!gpost(id,'player','   '),'empty refused');
 nextDay();mine({name:'Two'});mine({name:'Three'});mine({name:'Four'});ok(!mine({name:'Five'}),'3 new groups a day');
 nextDay();const g5=mine({name:'Six'});mine({name:'Seven'});ok(!mine({name:'Eight'})&&G.groups.filter(g=>g.owner==='player').length===5,'owner cap of 5');
 const id2=g5;let sent=0;for(const n of G.npcs){n.met=true;n.rel=50}R(.999);for(let n=0;n<20;n++)if(createInvite(id2,'player',{ttl:7}))sent++;ok(sent<=15,'invite cap per day: '+sent)});

T('14a. owner leaves: ownership passes to longest-serving admin, then mod, then member',()=>{
 const id=mine();['musa','aisha','yusuf'].forEach(n=>meet(n,70));R(0);['musa','aisha','yusuf'].forEach(n=>{createInvite(id,'player',{to:n});G.day++});
 setRole(id,'player','aisha','admin');setRole(id,'player','musa','admin');setRole(id,'player','yusuf','mod');G.day=100;
 ok(leaveGroup(id));eq(grp(id).owner,'musa','earliest-joined admin (musa joined before aisha)');eq(roleOf(grp(id),'musa'),'owner');eq(roleOf(grp(id),'aisha'),'admin');ok(!grp(id).mem.player);
 ok(!leaveGroup(id),'cannot leave twice')});
T('14b. last member leaves, owner suspended, or transfers explicitly',()=>{
 const a=mine({name:'Solo'});ok(leaveGroup(a));ok(!grp(a),'archived when empty');
 const b=mine({name:'Pair'});meet('musa',70);R(0);createInvite(b,'player',{to:'musa'});ok(!transferOwnership(b,'player','musa','Pair'),'target must be admin');setRole(b,'player','musa','admin');
 ok(!transferOwnership(b,'player','musa','wrong name'),'needs typed confirmation');ok(transferOwnership(b,'player','musa','Pair'));eq(grp(b).owner,'musa');eq(roleOf(grp(b),'player'),'admin');ok(!setRole(b,'player','musa','member'),'old owner lost owner rights');
 suspendUser('musa');eq(grp(b).owner,'player','suspension hands the group to the next person');ok(!gpost(b,'musa','hi'),'suspended user cannot act')});
T('14c. inactive owner: group passes on after 30 days',()=>{
 const id=mine();meet('musa',70);R(0);createInvite(id,'player',{to:'musa'});grp(id).mem.player.last=G.day;const d0=G.day;
 for(let n=0;n<26;n++){G.day=d0+n+1;groupsDaily()}ok(G.notes.some(n=>/away 25 days/.test(n.txt)),'warning at day 25');
 for(let n=26;n<32;n++){G.day=d0+n+1;groupsDaily()}eq(grp(id).owner,'musa');eq(roleOf(grp(id),'player'),'admin','former owner keeps admin')});

T('15. events, challenges and game integration',()=>{
 const id=mine();ok(!createEvent(id,'player',{title:'x',kind:'meetup',loc:'social'}),'bad title');const e=createEvent(id,'player',{title:'Suya night',kind:'meetup',loc:'social',off:0});ok(e);
 ok(rsvp(id,'player',e),'rsvp');G.p.loc='home';ok(!attendEvent(id,e),'must be at the venue');G.p.loc='social';const h0=G.p.happiness,hr=G.hour;ok(attendEvent(id,e),'attend');ok(G.hour===hr+2,'costs 2 game hours');ok(G.p.happiness>h0);ok(!attendEvent(id,e),'only once');
 const c=createEvent(id,'player',{title:'Work week',kind:'challenge',type:'work',target:3,off:7});rsvp(id,'player',c);const rep0=G.p.rep;
 G.p.loc='work';G.p.job='shop';G.openJobs=['shop'];G.p.energy=100;G.hour=6;for(let n=0;n<3;n++){G.p.shiftDay=0;G.p.hunger=0;G.p.energy=100;G.hour=6;ok(work(),'shift '+n)}
 ok(grp(id).evs.find(x=>x.id===c).done,'challenge done by shared shifts');ok(G.p.rep>rep0,'reward');ok(G.gev.some(x=>x.type==='activity_completed'));
 ok(!rsvp(id,'player',c),'finished activities cannot be joined')});

T('16. discovery: interests, friends, local (opt-in), business, game activities',()=>{
 G.p.ints=['Sports'];let s=discoverSections();ok(s.rec.some(g=>g.id==='gs1'),'interest match');ok(!s.rec.some(g=>g.id==='gs3'));
 eq(s.nearby,[],'local is off until you opt in');G.p.shareArea=true;G.p.area='Fagge';s=discoverSections();ok(s.nearby.some(g=>g.id==='gs4'));
 ok(s.biz.some(g=>g.id==='gs3')&&s.biz.some(g=>g.id==='gs2'),'business and creators');ok(s.game.some(g=>g.id==='gs1'||g.id==='gs3'),'groups with activities');
 meet('bashir',70);s=discoverSections();ok(s.friends.some(g=>g.id==='gs1'&&g.via.includes('Bashir')),'friend is in this public group');
 grp('gs1').mem.bashir.show=false;s=discoverSections();ok(!s.friends.some(g=>g.id==='gs1'),'friend hid their membership');
 ok(!JSON.stringify(s).includes('gs5'),'private non-discoverable never recommended');ok(JSON.stringify(searchGroups('')).includes('Kasuwa Traders Club'),'invite-discoverable private is searchable');ok(!JSON.stringify(searchGroups('')).includes('Suya Spot Regulars'))});

T('17. requests: approval flow, banned users, full groups',()=>{
 const id=mine({name:'Approval Only',join:'approval'});ok(joinGroup(id,'maryam'),'request');ok(grp(id).req.includes('maryam'));ok(!joinGroup(id,'maryam'),'no duplicate request');ok(!approveRequest(id,'maryam','maryam'),'cannot approve self');
 ok(approveRequest(id,'player','maryam'),'owner approves');ok(grp(id).mem.maryam);const o=mine({name:'Another',join:'approval'});joinGroup(o,'zainab');ok(approveRequest(o,'player','zainab',false),'reject');ok(!grp(o).mem.zainab&&!grp(o).req.length);
 ok(removeMember(id,'player','maryam',true),'ban');ok(!joinGroup(id,'maryam'),'banned cannot rejoin');ok(joinGroup('gs2','player'),'player can request to join an NPC group');R(0);nextDay();ok(grp('gs2').mem.player,'simulated admins approve next morning');eq(grp('gs2').req.includes('player'),false)});

T('18. analytics events recorded; metrics prefer participation',()=>{
 const id=mine({name:'Metrics Crew'});meet('musa',70);R(0);createInvite(id,'player',{to:'musa'});gpost(id,'player','first!');joinGroup('gs2');G.day+=9;visitGroup(id);
 const types=new Set(G.gev.map(e=>e.type));['group_created','invitation_sent','invitation_accepted','first_interaction','join_request_submitted','group_returned_7d'].forEach(t=>ok(types.has(t),'logged '+t));
 const m=groupMetrics();ok(m.groups>=1&&'activities'in m&&'acceptRate'in m);G.day+=20;groupsDaily();ok(G.gev.some(e=>e.type==='group_inactive'),'inactivity logged')});

T('19. saves: groups survive a save/load round trip; old saves migrate',()=>{
 const id=mine({name:'Persist'});gpost(id,'player','still here');const s=JSON.stringify(G);G=JSON.parse(s);ok(grp(id)&&grp(id).posts.some(p=>p.txt==='still here'));
 const old=JSON.parse(s);delete old.groups;delete old.gev;delete old.blk;delete old.susp;G=old;migrate();ok(Array.isArray(G.groups)&&G.groups.length===6&&Array.isArray(G.blk),'migrated');ok(G.p.cash>0,'game state untouched')});

T('20. deleting a group',()=>{
 const id=mine({name:'Doomed'});const c=createInvite(id,'player',{});const code=grp(id).inv[0].code;ok(!deleteGroup(id,'player','nope'),'needs the name');ok(deleteGroup(id,'player','Doomed'));ok(!grp(id));ok(!redeemCode(code,'zainab'),'its codes die with it')});

const fails=results.filter(r=>!r.ok);const byT={};results.forEach(r=>{(byT[r.t]=byT[r.t]||{p:0,f:[]});r.ok?byT[r.t].p++:byT[r.t].f.push(r.m)});
Object.keys(byT).forEach(t=>console.log((byT[t].f.length?'FAIL ':'PASS ')+t+'  ('+byT[t].p+' checks'+(byT[t].f.length?', '+byT[t].f.length+' failed':'')+')'+byT[t].f.map(m=>'\\n      ✗ '+m).join('')));
console.log('\\n'+(results.length-fails.length)+'/'+results.length+' checks passed');process.exit(fails.length?1:0);
`;
new Function(engine+body)();
