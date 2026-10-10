//#ENGINE-START
/* ============ KANO CITY ENGINE ============
   All game rules live here, away from the UI. State shape mirrors the planned
   Supabase tables (players, npcs, relationships, transactions, jobs, businesses,
   ajos, ajo_members, ajo_contributions, ajo_payouts, events, notifications,
   reputation_history, trust_history) so each slice can move server-side later. */
const KEY='kano-life-v1';
const WD=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const ri=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const fmt=n=>'₦'+Math.round(Math.abs(n)).toLocaleString('en-US');
const hash=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)};
const AJO_BLOCK=7, RENT=3000, LIVING=300, SHOP_COST=15000, UNIT_COST=500, UNIT_PRICE=700;

const LOCS={
 home:{n:'Home',ic:'🏠',area:null,label:'Your compound',d:'Your room in the compound. Quiet, and the ceiling fan mostly works.',
  img:null},
 market:{n:'Kasuwa Market',ic:'🛒',area:'Fagge',label:'Kurmi / city market belt',d:'Stalls, shouting, sacks of rice. Real traders, real deals — and your neighbours shopping too.',
  img:'https://images.unsplash.com/photo-1555529902-5261145633bf?w=800&q=80'},
 restaurant:{n:'Mama Put Row',ic:'🍲',area:'Gwale',label:'Street kitchens & canteens',d:'Jollof, tuwo and gist. Shared tables where trust starts over a plate.',
  img:'https://images.unsplash.com/photo-1604329760661-e7fb410d3ab4?w=800&q=80'},
 park:{n:'Keke Park',ic:'🛺',area:'Kano Municipal',label:'Motor park & junctions',d:'Keke, danfo and drivers who know every shortcut in Kano.',
  img:'https://images.unsplash.com/photo-1544620341-9adcbc10023b?w=800&q=80'},
 work:{n:'Workplace Strip',ic:'💼',area:'Kano Municipal',label:'Offices & workshops',d:'Jobs on the noticeboard. Shops, clerks, and side hustles in one belt.',
  img:'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80'},
 bank:{n:'Arewa Bank Strip',ic:'🏦',area:'Kano Municipal',label:'Banking corridor',d:'Cold air-conditioning and a long queue. Savings, salaries, and serious talk.',
  img:'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80'},
 social:{n:'Suya Junction',ic:'🔥',area:'Nasarawa',label:'Evening suya & hangout',d:'Suya smoke, loud music, louder opinions — where reputation spreads fast.',
  img:'https://images.unsplash.com/photo-1555939594-58edc777ff85?w=800&q=80'},
 ajo:{n:'Ajo Meeting Spots',ic:'🤝',area:'Fagge',label:'Circles meet here',d:'Where savings circles form — mosque yards, shops, and compounds across Kano.',
  img:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80'}
};
const JOBS=[
 {id:'shop',n:'Shop Assistant',ic:'🏪',pay:5000,en:20,d:'Steady work at Mallam Haruna Stores.'},
 {id:'rider',n:'Delivery Rider',ic:'🏍️',pay:8000,en:30,d:'Best pay, hardest on the body.'},
 {id:'sales',n:'Salesperson',ic:'👔',pay:6000,en:20,d:'Talk to customers, close the deal.'}
];
const NP0=[
 {id:'musa',n:'Musa',em:'🧔🏾',occ:'Provisions trader',tags:['trustworthy','ambitious'],w:55,rep:60,tr:78,rel:34,spots:['market','restaurant','social'],bio:'Runs a provisions stall. Always has a plan and a calculator.'},
 {id:'aisha',n:'Aisha',em:'👩🏾',occ:'Tailor',tags:['generous','social'],w:45,rep:62,tr:85,rel:30,spots:['market','social','social'],bio:'Sews the best Ankara in the street. Feeds everyone.'},
 {id:'yusuf',n:'Yusuf',em:'🧑🏾',occ:'Keke rider',tags:['trustworthy','introverted'],w:35,rep:50,tr:90,rel:30,spots:['park','restaurant','park'],bio:'Quiet, punctual, never short with the change.'},
 {id:'fatima',n:'Fatima',em:'👩🏾‍🍳',occ:'Caterer',tags:['generous','social'],w:40,rep:58,tr:80,rel:30,spots:['restaurant','restaurant','social'],bio:'Cooks for weddings and knows every family secret.'},
 {id:'ibrahim',n:'Ibrahim',em:'👨🏾‍💼',occ:'Bank clerk',tags:['wealthy','introverted'],w:72,rep:66,tr:75,rel:28,spots:['bank','restaurant','ajo'],bio:'Careful with money, careful with words.'},
 {id:'maryam',n:'Maryam',em:'👩🏾‍🏫',occ:'Teacher',tags:['trustworthy','poor'],w:38,rep:64,tr:88,rel:30,spots:['ajo','restaurant','social'],bio:'Teaches primary school and runs a tight Ajo.'},
 {id:'sani',n:'Sani',em:'🧑🏾‍🔧',occ:'Phone repairer',tags:['unreliable','opportunistic'],w:30,rep:38,tr:28,rel:30,spots:['market','social','social'],bio:'Fast hands, slow promises.'},
 {id:'hauwa',n:'Hauwa',em:'👩🏾‍🌾',occ:'Fruit seller',tags:['poor','trustworthy'],w:22,rep:48,tr:72,rel:32,spots:['market','market','ajo'],bio:'Up before the sun. Counts every naira twice.'},
 {id:'abdullahi',n:'Abdullahi',em:'👷🏾',occ:'Contractor',tags:['wealthy','ambitious','opportunistic'],w:82,rep:72,tr:45,rel:26,spots:['work','bank','social'],bio:'Big projects, bigger talk. Pays when it suits him.'},
 {id:'zainab',n:'Zainab',em:'👩🏾‍⚕️',occ:'Nurse',tags:['trustworthy','introverted'],w:42,rep:60,tr:84,rel:30,spots:['ajo','restaurant','ajo'],bio:'Calm in every emergency. Rarely smiles, always shows up.'},
 {id:'bashir',n:'Bashir',em:'🧑🏾‍✈️',occ:'Danfo driver',tags:['social','unreliable'],w:44,rep:52,tr:48,rel:30,spots:['park','park','social'],bio:'Loud horn, loud laugh, loose with time.'},
 {id:'halima',n:'Halima',em:'👩🏾‍💼',occ:'Shop owner',tags:['wealthy','trustworthy'],w:78,rep:74,tr:70,rel:28,spots:['work','market','ajo'],bio:'Owns three shops. Everyone calls her Alhaja.'},
 {id:'garba',n:'Garba',em:'💂🏾',occ:'Security guard',tags:['poor','trustworthy','introverted'],w:22,rep:46,tr:80,rel:30,spots:['work','park','ajo'],bio:'Guards the gate and keeps every secret.'},
 {id:'rukayya',n:'Rukayya',em:'💇🏾‍♀️',occ:'Hairdresser',tags:['social','opportunistic'],w:46,rep:56,tr:50,rel:30,spots:['social','market','social'],bio:'Salon gist travels faster than the news.'},
 {id:'dauda',n:'Dauda',em:'🕴🏾',occ:'Money lender',tags:['wealthy','opportunistic'],w:64,rep:44,tr:32,rel:25,spots:['bank','social','social'],bio:'Smiles a lot. Always remembers what you owe.'}
];
const LINES={
 trustworthy:["Wallahi, a promise is a promise. That is how I run my business.","If you say you will come, come. People remember."],
 ambitious:["I am saving for a second shop. Small small, we rise.","Who you know matters more than what you have."],
 generous:["Abeg, eat something! You look tired.","If you need help, ask. We no dey leave people."],
 unreliable:["I will pay you back soon, soon... you know how it is.","Sharp sharp, I will come tomorrow. Or next week."],
 opportunistic:["I know a guy who knows a guy. There is money in it.","Everything has a price, my friend."],
 social:["Have you heard what happened at the junction? Come, let me tell you.","Na so! Everybody dey talk about you small small."],
 introverted:["...Good morning. I do not talk much, but I listen.","Quiet people see the most."],
 poor:["Life is hard but we dey push. One day at a time.","If I get small capital, I would change everything."],
 wealthy:["Money is good, but a good name opens bigger doors.","I only do business with people I trust."]
};

/* Traditional Ajo: creator takes round 1; later order by stone roll; platform fee on pot 1 only */
const AJO_FEE_PCT=0.08;
const STONES=[
 {id:'s1',ic:'🔴',n:'Red'},{id:'s2',ic:'🟠',n:'Orange'},{id:'s3',ic:'🟡',n:'Gold'},
 {id:'s4',ic:'🟢',n:'Green'},{id:'s5',ic:'🔵',n:'Blue'},{id:'s6',ic:'🟣',n:'Purple'},
 {id:'s7',ic:'⚫',n:'Black'},{id:'s8',ic:'⚪',n:'White'},{id:'s9',ic:'🟤',n:'Brown'},
 {id:'s10',ic:'💠',n:'Crystal'},{id:'s11',ic:'⭐',n:'Star'},{id:'s12',ic:'🪨',n:'River'}
];

const SEED=()=>[
 {id:'a1',name:'Kasuwa Kings',host:'musa',size:5,amt:5000,freq:7,members:['musa','aisha','yusuf','fatima']},
 {id:'a2',name:"Alhaja's Circle",host:'halima',size:4,amt:10000,freq:7,members:['halima','ibrahim','zainab']},
 {id:'a3',name:'Teachers & Traders',host:'maryam',size:4,amt:2000,freq:3,members:['maryam','hauwa','garba']}
].map(a=>({...a,status:'open',startDay:null,cycle:0,order:[],prio:[],req:null,nom:null,contribs:[],payouts:[],invited:false,inv:{},mode:'traditional',feePct:AJO_FEE_PCT,stones:{},rolled:false,feeTaken:0,vis:'public',joinReqs:[],chat:[],activity:[]}));

let G=null; const FX=[];
const fx=(t,k='say')=>FX.push({t,k});
const no=m=>{fx(m,'warn');return false};
const npc=id=>G.npcs.find(x=>x.id===id);
const nm=id=>id==='player'?'You':npc(id).n;
const ajoOf=id=>G.ajos.find(a=>a.id===id);
const metNpcs=m=>G.npcs.filter(n=>n.met&&n.rel>=m);
const period=()=>G.hour<12?0:G.hour<17?1:2;
const npcLoc=n=>{const p=period();return hash(n.id+G.day+p)%5===0?n.spots[(p+1)%3]:n.spots[p]};
const here=()=>G.npcs.filter(n=>npcLoc(n)===G.p.loc);
const canTime=h=>G.hour+h<=22;
const LATE="It's too late — go home and sleep.";
const netWorth=()=>G.p.cash+G.p.savings+(G.biz?Math.round(G.biz.stock*G.biz.avg):0);
const blocked=()=>G.p.blockedUntil>G.day;
const myAjos=()=>G.ajos.filter(a=>a.members.includes('player')&&a.status!=='done');

function note(txt,kind='info'){G.notes.unshift({id:G.nid++,day:G.day,txt,kind,read:false});if(G.notes.length>80)G.notes.length=80}
function miles(k,t){if(!G.mile[k])G.mile[k]={day:G.day,txt:t}}
function ledger(amount,label,cat){G.p.cash+=amount;G.tx.unshift({id:G.nid++,day:G.day,amount,label,cat,bal:G.p.cash});if(G.tx.length>250)G.tx.length=250;fx((amount>0?'+':'−')+fmt(amount),amount>0?'gain':'loss')}
const earn=(a,l,c)=>ledger(a,l,c);
function spend(a,l,c){if(G.p.cash<a)return no('Not enough cash — you need '+fmt(a));ledger(-a,l,c);return true}
function addTrust(d,why){const p=G.p,o=p.trust;p.trust=clamp(o+d);const r=Math.round(p.trust-o);if(!r)return;G.th.unshift({day:G.day,d:r,v:Math.round(p.trust),why});if(G.th.length>60)G.th.length=60;fx('TRUST '+(r>0?'↑ +':'↓ ')+r,r>0?'trust':'trustdn');if(r<=-10)fx('People are beginning to question your reliability.','warn')}
function addRep(d,why){const p=G.p,o=p.rep;p.rep=clamp(o+d);const r=Math.round(p.rep-o);if(!r)return;G.rh.unshift({day:G.day,d:r,v:Math.round(p.rep),why});if(G.rh.length>60)G.rh.length=60;fx('REPUTATION '+(r>0?'↑ +':'↓ ')+r,r>0?'rep':'trustdn');if(r>0&&r>=3)note('Your reputation increased: '+why+'.','good')}
function rel(id,d,why){const n=npc(id),o=n.rel;n.rel=clamp(o+d);const r=Math.round(n.rel-o);if(r){n.hist.unshift({day:G.day,d:r,why});if(n.hist.length>20)n.hist.length=20}
 if(d>0&&n.met){if((o<35&&n.rel>=35)||(o<60&&n.rel>=60)||(o<80&&n.rel>=80)){fx("You're becoming closer to "+n.n+".",'warm');if(n.rel>=60)note(n.n+' thinks highly of you.','good')}}
 else if(d<0&&r<0&&n.met)fx(n.n+' thinks less of you.','cold');
 if(n.rel>=60)miles('friend','Made a real friend: '+n.n);
 inviteCheck(n)}
function inviteCheck(n){groupInviteCheck(n);G.ajos.forEach(a=>{if(a.host===n.id&&a.status==='open'&&!a.invited&&n.rel>=36&&n.met&&!a.members.includes('player')){a.invited=true;note(n.n+' invited you to join their Ajo, '+a.name+'.','ajo');fx(n.n+' invited you to join an Ajo!','warm')}})}

function tick(h){const p=G.p;G.hour+=h;p.hunger=clamp(p.hunger+1.5*h);p.energy=clamp(p.energy-h);if(p.hunger>=80)p.happiness=clamp(p.happiness-.6*h);if(G.hour>=22)endDay(true)}

const INTERESTS=['Trade & market','Food & kitchen','Fashion','Phones & tech','Transport','Beauty','Faith & community','Sports','Music','Learning','Business networking','Neighbourhood'];
const BIZ_STATUS=[
  {id:'owner',n:'I run a business',ic:'🏪'},
  {id:'worker',n:'I work for someone',ic:'💼'},
  {id:'student',n:'I am a student',ic:'📚'},
  {id:'seeking',n:'Looking for work',ic:'🔎'},
  {id:'none',n:'Not working right now',ic:'🙂'}
];
function newGame(name,age,gender,extra){
 extra=extra||{};
 const username=(extra.username||name||'').trim().replace(/^@/,'').slice(0,20);
 const interests=(extra.interests||[]).filter(Boolean).slice(0,6);
 const businessStatus=BIZ_STATUS.some(b=>b.id===extra.businessStatus)?extra.businessStatus:'none';
 G={v:1,day:1,hour:6,nid:1,
 p:{name,username,age,gender,interests,businessStatus,job:null,cash:20000,savings:0,energy:100,hunger:20,happiness:60,rep:50,trust:52,biz:10,social:10,reliab:50,loc:'home',blockedUntil:0,shiftDay:0,missed:0,boastDay:0,oppDay:0,oppN:0,bizRepDay:0,avatar:defaultAvatar(gender),work:{cat:'',title:'',set:false},onboarded:false},
 npcs:NP0.map(n=>({...n,met:false,lastSeen:0,hist:[],tk:{d:0,c:0},said:''})),
 tx:[],btx:[],biz:null,ajos:SEED(),debts:[],promises:[],sched:[],notes:[],th:[],rh:[],mile:{},ev:null,lastEv:'',openJobs:['shop','rider','sales'],snap:[]};
 initGroups();initPlaces();ensureSetup();
 // Seed interests onto player ints for groups
 G.p.ints=interests.slice();
 if(businessStatus==='owner') G.p.work={cat:'Trader',title:'Business owner',set:true};
 else if(businessStatus==='worker') G.p.work={cat:'Services',title:'Employed',set:true};
 else if(businessStatus==='student') G.p.work={cat:'Student',title:'Student',set:true};
 snap();
 note('Welcome, '+(username?'@'+username:name)+'. Your circle starts here — meet people, visit places, build trust.','info');
 return G}
function snap(){G.snap.push({day:G.day,cash:G.p.cash,nw:netWorth(),trust:Math.round(G.p.trust),rep:Math.round(G.p.rep)});if(G.snap.length>120)G.snap.shift()}

/* ---- movement & survival ---- */
function travel(to){if(to===G.p.loc)return false;
 G.p.loc=to;fx('You are at '+LOCS[to].n,'warm');return true}
function eat(){if(!canTime(1))return no(LATE);if(!spend(1500,'Food (jollof & chicken)','food'))return false;G.p.hunger=clamp(G.p.hunger-45);G.p.happiness=clamp(G.p.happiness+5);tick(1);return true}
function snack(){if(!canTime(1))return no(LATE);if(!spend(600,'Food (suya snack)','food'))return false;G.p.hunger=clamp(G.p.hunger-18);G.p.happiness=clamp(G.p.happiness+2);tick(1);return true}
function cook(){if(!canTime(1))return no(LATE);if(!spend(500,'Food (cooked at home)','food'))return false;G.p.hunger=clamp(G.p.hunger-30);tick(1);return true}
function rest(){if(!canTime(2))return no(LATE);G.p.energy=clamp(G.p.energy+14);G.p.happiness=clamp(G.p.happiness+2);tick(2);return true}
function call(){if(!canTime(1))return no(LATE);G.p.happiness=clamp(G.p.happiness+6);fx('Family is proud of you. +Happiness');tick(1);return true}
function gig(){if(!canTime(2))return no(LATE);if(G.p.energy<12)return no('Too tired for a keke errand.');earn(1500,'Keke errand','gig');G.p.energy=clamp(G.p.energy-10);G.p.hunger=clamp(G.p.hunger+3);tick(2);return true}
function hang(){if(!canTime(2))return no(LATE);G.p.happiness=clamp(G.p.happiness+8);G.p.social=clamp(G.p.social+1);fx('Good vibes. +Happiness');tick(2);return true}
function round_(){if(!canTime(1))return no(LATE);if(!spend(1500,'Bought a round at Suya Spot','social'))return false;here().forEach(n=>{if(n.met)rel(n.id,3,'You bought a round');else{n.met=true;n.lastSeen=G.day;rel(n.id,3,'You bought a round')}});G.p.happiness=clamp(G.p.happiness+6);addRep(1,'Generous at the Suya Spot');tick(1);return true}
function boast(){if(G.p.boastDay===G.day)return no('You already told your tall story today.');if(!canTime(1))return no(LATE);G.p.boastDay=G.day;addRep(4,'Told a tall story');addTrust(-4,'Exaggerated your success');fx('They believed it... for now.');tick(1);return true}
function sleep(){endDay(false);return true}

/* ---- work & bank ---- */
function hire(id){if(G.p.loc!=='work')return no('Go to the Workplace first.');if(!G.openJobs.includes(id))return no('That role is not hiring today.');G.p.job=id;miles('job','Got your first job: '+JOBS.find(j=>j.id===id).n);note('You are now a '+JOBS.find(j=>j.id===id).n+'.','good');return true}
function quit(){G.p.job=null;return true}
function work(){const p=G.p,j=JOBS.find(x=>x.id===p.job);if(!j)return no('Pick a job first.');if(p.loc!=='work')return no('Go to the Workplace.');if(p.shiftDay===G.day)return no('You already worked today.');if(!canTime(8))return no('Too late for a full shift. Start earlier tomorrow.');if(p.energy<j.en)return no('Too tired — you need '+j.en+' energy.');if(p.hunger>=90)return no('You are too hungry to work. Eat first.');
 p.shiftDay=G.day;earn(j.pay,'Salary — '+j.n,'salary');p.energy=clamp(p.energy-j.en);p.hunger=clamp(p.hunger+6);p.happiness=clamp(p.happiness-2);p.reliab=clamp(p.reliab+1);
 if(p.trust<65)addTrust(1,'Showed up for work');gProgress('work');tick(8);return true}
function deposit(a){if(a>G.p.cash)a=G.p.cash;if(a<=0)return no('No cash to save.');ledger(-a,'Saved at Arewa Bank','savings');G.p.savings+=a;return true}
function withdraw(a){if(a>G.p.savings)a=G.p.savings;if(a<=0)return no('Nothing saved yet.');G.p.savings-=a;ledger(a,'Withdrew from savings','savings');return true}

/* ---- mini shop ---- */
function bizStart(){if(G.biz)return false;if(G.p.loc!=='market')return no('Open your shop at the Market.');if(!spend(SHOP_COST,'Mini Shop startup (stall, permit, first 10 drinks)','business'))return false;G.biz={name:'Mini Shop',stock:10,avg:UNIT_COST,sold:0,rev:0,profit:0,since:G.day};G.btx.unshift({day:G.day,txt:'Opened Mini Shop',amt:-SHOP_COST});miles('shop','Opened the Mini Shop');note('Mini Shop is open! Stock it, sell it, build your name.','good');return true}
function bizBuy(n,cost=UNIT_COST){const b=G.biz;if(!b)return no('Start the Mini Shop first.');if(G.p.loc!=='market')return no('Buy stock at the Market.');if(!canTime(1))return no(LATE);if(!spend(n*cost,'Stock — '+n+' drinks','business'))return false;b.avg=(b.stock*b.avg+n*cost)/(b.stock+n);b.stock+=n;G.btx.unshift({day:G.day,txt:'Bought '+n+' drinks',amt:-n*cost});tick(1);return true}
function bizTend(){const b=G.biz,p=G.p;if(!b)return no('Start the Mini Shop first.');if(p.loc!=='market')return no('Your shop is at the Market.');if(!canTime(2))return no(LATE);if(b.stock<=0)return no('Out of stock — restock first.');if(p.energy<8)return no('Too tired to tend the shop.');
 const friends=Math.min(3,G.npcs.filter(n=>n.met&&n.rel>=60).length);const want=ri(4,8)+Math.floor(p.social/25)+friends;const u=Math.min(b.stock,want);
 b.stock-=u;b.sold+=u;const rev=u*UNIT_PRICE;b.rev+=rev;const pr=Math.round(u*(UNIT_PRICE-b.avg));b.profit+=pr;earn(rev,'Mini Shop sales ('+u+' drinks)','business');G.btx.unshift({day:G.day,txt:'Sold '+u+' drinks',amt:rev});
 p.energy=clamp(p.energy-8);p.biz=clamp(p.biz+1);if(friends)fx('Your friends sent customers your way. 🤝');
 if(u>=5&&p.bizRepDay!==G.day){p.bizRepDay=G.day;addRep(2,'Running a busy shop')}
 miles('profit','Made your first shop profit');gProgress('shop');tick(2);return true}

/* ---- people ---- */
function talk(id){const n=npc(id);if(npcLoc(n)!==G.p.loc)return no(n.n+' just left.');if(!canTime(1))return no(LATE);
 const first=!n.met;if(first){n.met=true;fx('You met '+n.n+' — '+n.occ+'.','warm');miles('met','Met your first neighbour: '+n.n)}
 if(n.tk.d!==G.day)n.tk={d:G.day,c:0};const gain=first?3:[2,1,0,0][Math.min(3,n.tk.c)];n.tk.c++;n.lastSeen=G.day;
 n.said=pick(LINES[pick(n.tags)]);G.p.social=clamp(G.p.social+.4);G.p.happiness=clamp(G.p.happiness+2);
 if(gain)rel(id,gain,'Talked'+(first?' (first meeting)':''));else fx(n.n+' has said all they want to say for now.');gProgress('talk');tick(1);return true}
function eatWith(id){const n=npc(id);if(G.p.loc!=='restaurant')return no('Go to Mama Put Kitchen.');if(npcLoc(n)!==G.p.loc)return no(n.n+' is not here.');if(!canTime(1))return no(LATE);if(!spend(3000,'Meal with '+n.n+' (you paid)','food'))return false;
 if(!n.met){n.met=true;fx('You met '+n.n+'.','warm')}n.lastSeen=G.day;G.p.hunger=clamp(G.p.hunger-45);G.p.happiness=clamp(G.p.happiness+8);rel(id,5,'Ate together');n.said='This jollof is on you? Ah, you are a good person.';tick(1);return true}
function help(id,amt){const n=npc(id);if(npcLoc(n)!==G.p.loc)return no(n.n+' is not here.');if(!spend(amt,'Gave '+n.n+' a hand','help'))return false;if(!n.met){n.met=true}n.lastSeen=G.day;
 rel(id,amt>=5000?8:4,'You helped financially');addTrust(amt>=5000?2:1,'Helped someone');if(amt>=5000)addRep(1,'Helped someone in need');G.p.happiness=clamp(G.p.happiness+3);n.said='God will replenish it. I will not forget this.';return true}

/* ---- promises ---- */
function keepPromise(pid){const pr=G.promises.find(x=>x.id===pid);if(!pr)return false;const n=npc(pr.npc);if(!spend(pr.amt,'Kept promise to '+n.n,'help'))return false;
 G.promises=G.promises.filter(x=>x!==pr);rel(n.id,5,'Kept a promise');addTrust(3,'Kept a promise');G.p.reliab=clamp(G.p.reliab+2);n.lastSeen=G.day;
 G.sched.push({day:G.day+3,type:'repay',npc:n.id,amt:pr.amt+Math.round(pr.amt*.15),p:clamp(n.tr/100*.95+.05,0,.99)});miles('promise','Kept your first promise');note('You kept your word to '+n.n+'. Repayment expected in 3 days.','good');return true}

/* ---- AJO ---- */
const dueDay=a=>a.startDay+a.cycle*a.freq;
const cyc=(a,m,c)=>a.contribs.find(x=>x.cycle===(c===undefined?a.cycle:c)&&x.m===m);
function joinCheck(a){if(a.members.includes('player'))return 'You are already in this Ajo.';if(a.status!=='open')return 'This Ajo is closed.';if(blocked())return 'Blocked for '+(G.p.blockedUntil-G.day)+' more day(s) after your missed payment.';if(G.p.trust<40)return 'Members worry about your reliability (Trust is below 40).';if(myAjos().length>=2)return 'You can only be in 2 Ajo groups at once.';
 if(a.vis==='public'||a.invited)return null;
 const h=npc(a.host);if(h&&h.rel<40)return h.n+' does not know you well enough yet (needs 40 relationship or a public circle).';return null}
function atAjo(){return true}
function joinAjo(id,viaInvite){const a=ajoOf(id);if(!viaInvite&&!atAjo())return false;const why=joinCheck(a);if(why)return no(why);a.members.push('player');miles('ajo','Joined your first Ajo: '+a.name);note('You joined '+a.name+'.','ajo');fx('You joined '+a.name+'!','warm');if(a.members.length>=a.size)toStones(a);return true}

function publicAjos(){
  return G.ajos.filter(a=>a.status==='open'&&a.vis==='public'&&!a.members.includes('player')&&a.members.length<a.size);
}
function ajoAct(a,kind,txt){
  if(!a.activity)a.activity=[];
  a.activity.unshift({id:G.nid++,day:G.day,hour:G.hour,kind,txt});
  if(a.activity.length>40)a.activity.length=40;
}
function requestJoinAjo(id){
  const a=ajoOf(id);if(!a)return false;
  if(!atAjo()&&!G.demo)return false;
  const why=joinCheck(a);if(why)return no(why);
  if(a.vis!=='public'&&!a.invited)return no('This circle is private. Ask the organizer for an invite.');
  if((a.joinReqs||[]).some(r=>r.from==='player'&&r.st==='pending'))return no('Request already sent.');
  if(!a.joinReqs)a.joinReqs=[];
  a.joinReqs.push({id:'jr'+G.nid++,from:'player',day:G.day,st:'pending'});
  ajoAct(a,'join','Someone requested to join.');
  note('Join request sent to '+a.name+'.','ajo');fx('Request sent','warm');
  // NPC hosts auto-decide
  if(a.host!=='player'){
    const h=npc(a.host);const ok=Math.random()<clamp(.4+(G.p.trust-40)/70+(h?h.rel/150:0),.25,.92);
    const req=a.joinReqs[a.joinReqs.length-1];
    if(ok){req.st='accepted';if(!a.members.includes('player')){a.members.push('player');ajoAct(a,'join',G.p.name+' joined the circle.');note(a.name+' accepted you.','ajo');fx('You are in!','good');if(a.members.length>=a.size)toStones(a)}
    }else{req.st='declined';note(a.name+' declined your request.','ajo');fx('Not this time','cold')}
  }
  return true;
}
function answerJoinReq(aid,rid,yes){
  const a=ajoOf(aid);if(!a||a.host!=='player')return no('Only the organizer can decide.');
  const r=(a.joinReqs||[]).find(x=>x.id===rid);if(!r||r.st!=='pending')return no('No pending request.');
  if(!yes){r.st='declined';ajoAct(a,'join','A join request was declined.');fx('Declined','cold');return true}
  if(a.members.length>=a.size)return no('Circle is full.');
  r.st='accepted';
  // offline: requester is always player when pending to host
  if(r.from==='player'&&!a.members.includes('player')){
    a.members.push('player');
    ajoAct(a,'join',G.p.name+' was accepted into the circle.');
    note('You accepted a member into '+a.name+'.','ajo');
  } else if(r.from!=='player'&&!a.members.includes(r.from)){
    a.members.push(r.from);
    ajoAct(a,'join',nm(r.from)+' was accepted.');
  }
  if(a.members.length>=a.size)toStones(a);
  fx('Member added','good');
  return true;
}
function ajoChatSend(id,text){
  const a=ajoOf(id);if(!a)return false;
  if(!a.members.includes('player'))return no('Join the circle to chat.');
  text=(text||'').trim().slice(0,240);if(!text)return;
  if(!a.chat)a.chat=[];
  a.chat.push({by:'player',t:text,day:G.day,hour:G.hour});
  ajoAct(a,'chat',G.p.name+': '+text.slice(0,40));
  // NPC members reply occasionally
  const others=a.members.filter(m=>m!=='player');
  if(others.length&&Math.random()<(G.demo?0.85:0.55)){
    const m=pick(others);const n=npc(m);
    const replies=['Noted, God willing.','We are watching the due date.','Who is paying this week?','Alhamdulillah.','I am around if anyone needs to talk.','Let us keep trust high.'];
    a.chat.push({by:m,t:pick(replies),day:G.day,hour:G.hour});
  }
  if(a.chat.length>80)a.chat=a.chat.slice(-80);
  G.p.trust=clamp(G.p.trust+0.1,0,100);
  fx('Sent','warm');
  return true;
}
function ajoQuickAct(id,kind){
  const a=ajoOf(id);if(!a||!a.members.includes('player'))return no('Members only.');
  const lines={
    remind:{t:'Reminder: contributions are due soon. Please pay on time so everyone stays covered.',rel:1},
    cheers:{t:'Proud of this circle — we keep our word.',rel:1},
    meetup:{t:'Anyone free to meet at a public place this week to check in?',rel:2},
    rules:{t:'Rules: organizer takes round 1 (with platform fee). Stones order the rest. Pay on time.',rel:0}
  };
  const L=lines[kind]||lines.cheers;
  if(!a.chat)a.chat=[];
  a.chat.push({by:'player',t:L.t,day:G.day,hour:G.hour});
  ajoAct(a,'act',L.t.slice(0,48));
  if(L.rel){a.members.filter(m=>m!=='player').forEach(m=>{const n=npc(m);if(n)n.rel=clamp(n.rel+L.rel*0.5,0,100)})}
  G.p.rep=clamp(G.p.rep+0.15,0,100);
  fx('Posted in circle','warm');
  return true;
}

/* ---- Circle games (play with other members in the loop) ---- */
const CIRCLE_GAMES=[
  {id:'lucky',ic:'🎯',n:'Lucky Number',d:'Everyone picks 1–10. Closest to the secret number wins.'},
  {id:'rps',ic:'✊',n:'Rock · Paper · Scissors',d:'Best of three against the circle — simultaneous throw.'},
  {id:'who',ic:'🕵️',n:"Who's Who?",d:'Guess which member matches the clue.'},
  {id:'emoji',ic:'😎',n:'Emoji Match',d:'Pick the emoji that fits the prompt before others.'},
  {id:'scramble',ic:'🔤',n:'Word Scramble',d:'Unscramble a Kano / circle word together.'}
];
function circleGameList(){return CIRCLE_GAMES}
function ajoGameActive(a){return a&&a.game&&a.game.status==='playing'?a.game:null}
function startCircleGame(ajoId,type){
  const a=ajoOf(ajoId);if(!a)return no('Circle not found.');
  if(!a.members.includes('player'))return no('Join the circle to play.');
  if(a.members.length<2)return no('Need at least 2 members to play.');
  if(ajoGameActive(a))return no('Finish the current game first.');
  const def=CIRCLE_GAMES.find(g=>g.id===type);if(!def)return no('Unknown game.');
  const g={id:'cg_'+Date.now().toString(36),type,by:'player',status:'playing',day:G.day,players:a.members.slice(),scores:{},picks:{},winner:null,data:{}};
  if(type==='lucky'){
    g.data.target=1+Math.floor(Math.random()*10);
    g.data.phase='pick'; // player picks, then resolve
  } else if(type==='rps'){
    g.data.round=1;g.data.max=3;g.data.wins=0;g.data.losses=0;g.data.ties=0;
  } else if(type==='who'){
    const others=a.members.filter(m=>m!=='player');
    const target=pick(others)||others[0];
    const n=npc(target);
    const clues=[];
    if(n){
      if(n.occ)clues.push('Works as: '+n.occ);
      if(n.bio)clues.push(n.bio.split('.')[0]+'.');
      if(n.tags&&n.tags[0])clues.push('Known for being '+n.tags[0]);
      if(n.spots&&n.spots[0]&&LOCS[n.spots[0]])clues.push('Often at '+LOCS[n.spots[0]].n);
    }
    g.data.target=target;
    g.data.clue=pick(clues)||'A member of this circle';
    g.data.options=shuffle([target,...shuffle(others.filter(x=>x!==target)).slice(0,3)].slice(0,4));
  } else if(type==='emoji'){
    const prompts=[
      {q:'Celebration!',a:'🎉',opts:['🎉','😴','🌧️','📦']},
      {q:'Market day hustle',a:'🛒',opts:['🛒','🛏️','🌊','🚀']},
      {q:'Keep the promise',a:'🤝',opts:['🤝','🐍','🔥','🧊']},
      {q:'Food is ready',a:'🍛',opts:['🍛','📎','🚲','🌙']},
      {q:'Trust in the circle',a:'💚',opts:['💚','💣','📻','🧊']}
    ];
    const p=pick(prompts);
    g.data.prompt=p.q;g.data.answer=p.a;g.data.opts=shuffle(p.opts.slice());
  } else if(type==='scramble'){
    const words=['TRUST','KANO','CIRCLE','POT','STONE','AJO','MARKET','HUSTLE','PROMISE','NEIGHBOUR'];
    const w=pick(words);
    g.data.word=w;
    g.data.scrambled=shuffle(w.split('')).join('');
    // ensure not same
    if(g.data.scrambled===w) g.data.scrambled=w.split('').reverse().join('');
  }
  a.game=g;
  if(!a.games)a.games=[];
  ajoAct(a,'game',G.p.name+' started '+def.n);
  if(!a.chat)a.chat=[];
  a.chat.push({by:'player',t:'🎮 Let\'s play '+def.n+'!',day:G.day,hour:G.hour});
  fx(def.ic+' '+def.n+' started','warm');
  return true;
}
function playCircleGame(ajoId,choice){
  const a=ajoOf(ajoId);if(!a||!a.game||a.game.status!=='playing')return no('No active game.');
  if(!a.members.includes('player'))return no('Members only.');
  const g=a.game;
  const finish=(win,msg)=>{
    g.status='done';g.winner=win?'player':null;g.result=msg;
    if(win){
      G.p.happiness=clamp(G.p.happiness+6,0,100);
      G.p.rep=clamp(G.p.rep+0.5,0,100);
      G.p.social=clamp((G.p.social||10)+1,0,100);
      a.members.filter(m=>m!=='player').forEach(m=>{const n=npc(m);if(n)n.rel=clamp(n.rel+2,0,100)});
      note(a.name+': '+msg,'good');
      fx('You won! 🏆','good');
    } else {
      G.p.happiness=clamp(G.p.happiness+2,0,100);
      note(a.name+': '+msg,'ajo');
      fx(msg,'warm');
    }
    if(!a.games)a.games=[];
    a.games.unshift({type:g.type,day:G.day,win:!!win,result:msg});
    if(a.games.length>20)a.games=a.games.slice(0,20);
    ajoAct(a,'game',msg);
    if(!a.chat)a.chat=[];
    a.chat.push({by:'system',t:'🎮 '+msg,day:G.day,hour:G.hour});
  };
  if(g.type==='lucky'){
    const pickN=clamp(parseInt(choice)||0,1,10);
    g.picks.player=pickN;
    // NPCs pick
    a.members.filter(m=>m!=='player').forEach(m=>{g.picks[m]=1+Math.floor(Math.random()*10)});
    const target=g.data.target;
    let best=null,bestDist=99;
    Object.keys(g.picks).forEach(m=>{
      const d=Math.abs(g.picks[m]-target);
      if(d<bestDist){bestDist=d;best=m}
      else if(d===bestDist&&m==='player') best=m; // tie-break favor player slightly is ok? better report ties
    });
    // check ties
    const winners=Object.keys(g.picks).filter(m=>Math.abs(g.picks[m]-target)===bestDist);
    const win=winners.includes('player');
    const detail='Secret was '+target+'. You picked '+pickN+'. '+(win?(winners.length>1?'Shared win!':'You were closest!'):nm(best)+' was closest.');
    finish(win,detail);
    return true;
  }
  if(g.type==='rps'){
    const map={rock:'✊',paper:'✋',scissors:'✌️'};
    const you=choice;
    if(!map[you])return no('Pick rock, paper, or scissors.');
    const npcPick=pick(['rock','paper','scissors']);
    const beat={rock:'scissors',paper:'rock',scissors:'paper'};
    let roundWin=null;
    if(you===npcPick){g.data.ties++;roundWin='tie'}
    else if(beat[you]===npcPick){g.data.wins++;roundWin='win'}
    else {g.data.losses++;roundWin='lose'}
    g.data.last={you,npc:npcPick,roundWin};
    g.data.round++;
    if(g.data.wins>=2||g.data.losses>=2||g.data.round>3){
      const win=g.data.wins>g.data.losses;
      finish(win, win
        ?('RPS win '+g.data.wins+'-'+g.data.losses+'! Circle cheered.')
        :(g.data.wins===g.data.losses?'RPS draw '+g.data.wins+'-'+g.data.losses+'.':('Circle edged you '+g.data.losses+'-'+g.data.wins+'.')));
    } else {
      fx(map[you]+' vs '+map[npcPick]+' — '+(roundWin==='win'?'You take the round!':roundWin==='tie'?'Tie': 'They take the round'),roundWin==='win'?'good':'warm');
    }
    return true;
  }
  if(g.type==='who'){
    const win=choice===g.data.target;
    finish(win, win?('Correct — it was '+nm(g.data.target)+'!'):('It was '+nm(g.data.target)+'. Nice try.'));
    return true;
  }
  if(g.type==='emoji'){
    const win=choice===g.data.answer;
    finish(win, win?('Matched '+g.data.answer+' — sharp!'):('The circle went with '+g.data.answer+'.'));
    return true;
  }
  if(g.type==='scramble'){
    const guess=String(choice||'').trim().toUpperCase().replace(/[^A-Z]/g,'');
    const win=guess===g.data.word;
    finish(win, win?('Unscrambled '+g.data.word+'!'):('The word was '+g.data.word+'.'));
    return true;
  }
  return no('Unknown game state.');
}
function skipCircleGame(ajoId){
  const a=ajoOf(ajoId);if(!a||!a.game)return false;
  a.game.status='done';a.game.result='Game closed.';
  ajoAct(a,'game','Game closed without a finish.');
  fx('Game closed','warm');
  return true;
}


function setAjoVis(id,vis){
  const a=ajoOf(id);if(!a||a.host!=='player')return no('Only organizer can change this.');
  a.vis=vis==='private'?'private':'public';
  ajoAct(a,'system','Circle is now '+a.vis+'.');
  note(a.name+' is '+a.vis+'.','ajo');
  return true;
}

function createAjo(name,size,amt,freq){if(!atAjo())return false;if(blocked())return no('You are blocked from forming a new Ajo for '+(G.p.blockedUntil-G.day)+' day(s).');if(G.p.trust<30)return no('People will not join an Ajo run by someone with Trust below 30.');if(myAjos().length>=2)return no('You can only be in 2 Ajo groups at once.');
 const a={id:'p'+G.nid++,name:name||'Kano Hustlers',host:'player',size,amt,freq,members:['player'],status:'open',startDay:null,cycle:0,order:[],prio:[],req:null,nom:null,contribs:[],payouts:[],invited:false,inv:{},mode:'traditional',feePct:AJO_FEE_PCT,stones:{},rolled:false,feeTaken:0,vis:'public',joinReqs:[],chat:[],activity:[]};
 G.ajos.unshift(a);miles('ajohost','Started your own Ajo');ajoAct(a,'system','Circle created. Public discovery is on — people can request to join.');note('Ajo created. Invite your people or wait for public requests. Round 1 goes to you. Fee '+Math.round(AJO_FEE_PCT*100)+'% on first pot only.','ajo');return a.id}
function invite(aid,nid){const a=ajoOf(aid),n=npc(nid);if(a.status!=='open'||a.host!=='player')return false;if(!n.met)return no('Meet '+n.n+' first.');if(a.inv[nid]===G.day)return no(n.n+' already answered today.');a.inv[nid]=G.day;
 const p=clamp(.25+n.rel/100*.7+(G.p.trust-50)/150,.15,.95);if(Math.random()<p){a.members.push(nid);fx(n.n+': "I am in!"','warm');note(n.n+' joined '+a.name+'.','ajo');if(a.members.length>=a.size)toStones(a)}else fx(n.n+': "Let me think about it... not now."','cold');return true}
function toStones(a){
 a.status='stones';if(!a.stones)a.stones={};if(a.feePct==null)a.feePct=AJO_FEE_PCT;if(!a.mode)a.mode='traditional';
 // NPCs auto-pick free stones
 const taken=new Set(Object.values(a.stones));
 a.members.filter(m=>m!=='player'&&m!==a.host&&!a.stones[m]).forEach(m=>{
  const free=STONES.filter(s=>!taken.has(s.id));
  if(!free.length)return;
  const s=pick(free);a.stones[m]=s.id;taken.add(s.id);
 });
 ajoAct(a,'system','Circle is full — time to pick stones.');note(a.name+' is full. Everyone picks a stone. Round 1 always goes to the organizer ('+nm(a.host)+'). Later pots follow the stone roll.','ajo');
 fx('Pick your stone','warm');
}
function toVoting(a){toStones(a)}
function freeStones(a){const taken=new Set(Object.values(a.stones||{}));return STONES.filter(s=>!taken.has(s.id))}
function pickStone(id,stoneId){
 const a=ajoOf(id);if(!a||a.status!=='stones')return no('Stone pick is closed.');
 if(!a.members.includes('player'))return no('You are not in this Ajo.');
 if(a.stones.player)return no('You already chose a stone.');
 if(!freeStones(a).some(s=>s.id===stoneId))return no('That stone is taken.');
 a.stones.player=stoneId;
 const st=STONES.find(s=>s.id===stoneId);
 note('You chose the '+st.n+' stone for '+a.name+'.','ajo');fx(st.ic+' '+st.n,'warm');
 return true;
}
function stonesReady(a){
 // Host is fixed first — every other member needs a stone
 return a.members.filter(m=>m!==a.host).every(m=>a.stones&&a.stones[m]);
}
function rollStones(id){
 const a=ajoOf(id);if(!a||a.status!=='stones')return no('Cannot roll yet.');
 if(a.host==='player'&&!atAjo())return false;
 if(!stonesReady(a))return no('Everyone still needs to pick a stone.');
 const rest=a.members.filter(m=>m!==a.host);
 a.order=[a.host,...shuffle(rest)];
 a.rolled=true;
 note(a.name+' stone roll done. Payout order is set. Organizer first, then the stones.','ajo');
 fx('Stones rolled!','good');
 return true;
}
function stoneOf(a,m){const id=a.stones&&a.stones[m];return id?STONES.find(s=>s.id===id):null}

function voteScore(v,reason){const base=v.rel*.45+G.p.trust*.3+G.p.rep*.1+({emergency:18,business:G.biz?14:6,plain:-8}[reason])+(v.tags.includes('generous')?8:0)-(v.tags.includes('opportunistic')&&v.rel<60?5:0)-G.p.missed*6;return base}
function odds(a,reason){const vs=a.members.filter(m=>m!=='player').map(npc);const yes=vs.filter(v=>voteScore(v,reason)>=52).length/vs.length;return yes>=.75?'Good':yes>=.5?'Fair':'Slim'}
function reqPriority(id,reason){const a=ajoOf(id);if(!a.members.includes('player'))return no('You are not a member of this Ajo.');if(!atAjo())return false;if(a.status!=='voting'||a.req)return no('You already made your case.');
 const votes=a.members.filter(m=>m!=='player').map(m=>{const v=npc(m),s=voteScore(v,reason)+ri(-8,8),y=s>=52;return{id:m,y,why:y?(v.rel>=60?'trusts you':'is willing to give you a chance'):(v.rel<45?'barely knows you':G.p.trust<55?'has doubts about your reliability':'needs the money too')}});
 const yes=votes.filter(v=>v.y).length,passed=yes>votes.length/2;a.req={reason,votes,passed};
 if(passed){a.prio.push('player');votes.filter(v=>v.y).forEach(v=>rel(v.id,2,'Backed your early payout'));fx('The group voted: you get priority!','warm');miles('vote','Won an Ajo vote on trust alone')}else{G.p.happiness=clamp(G.p.happiness-3);fx('The group said no. Build more trust first.','cold')}return true}
function voteNom(id,support){const a=ajoOf(id);if(!a.members.includes('player'))return no('You are not a member of this Ajo.');if(!atAjo())return false;const nm_=a.nom;if(!nm_||nm_.done)return false;const n=npc(nm_.npc);
 const others=a.members.filter(m=>m!=='player'&&m!==nm_.npc);const votes=[{id:'player',y:support}];
 others.forEach(m=>{const s=n.tr*.5+n.rep*.2+12+ri(-10,10);votes.push({id:m,y:s>=45})});
 const yes=votes.filter(v=>v.y).length,passed=yes>votes.length/2;Object.assign(nm_,{done:true,votes,passed});if(passed)a.prio.push(nm_.npc);
 rel(nm_.npc,support?4:-3,support?'You backed their request':'You opposed their request');if(support)n.lastSeen=G.day;
 fx(passed?n.n+' gets early payout.':n.n+"'s request did not pass.");return true}
function startAjo(id){const a=ajoOf(id);if(!a.members.includes('player'))return no('You are not a member of this Ajo.');if(!atAjo())return false;
 if(a.status==='stones'){if(!a.rolled){if(!rollStones(id))return false} }
 else if(a.status!=='voting'&&a.status!=='stones')return no('This Ajo is not ready to start.');
 if(!a.order.length){
  if(a.mode==='traditional'||a.status==='stones'){a.order=[a.host,...shuffle(a.members.filter(m=>m!==a.host))]}
  else{const first=[...new Set(a.prio)];a.order=[...first,...shuffle(a.members.filter(m=>!first.includes(m)))]}
 }
 a.status='active';a.startDay=G.day+1;a.cycle=0;a.rolled=true;
 note(a.name+' starts tomorrow. Round 1 pot goes to the organizer ('+nm(a.order[0])+').'+(a.host==='player'?' Ajoloop fee '+Math.round((a.feePct||AJO_FEE_PCT)*100)+'% comes from that first pot only.':''),'ajo');
 fx(a.name+' begins tomorrow!','warm');return true}
function ontime(a){addTrust(3,'Kept an Ajo contribution');G.p.reliab=clamp(G.p.reliab+1);a.members.forEach(m=>{if(m!=='player')rel(m,1,'You kept your Ajo promise')});miles('contrib','Made your first Ajo contribution')}
function payAjo(id){const a=ajoOf(id);if(!a.members.includes('player'))return no('You are not a member of this Ajo.');if(a.status!=='active')return no('This Ajo is not running.');if(cyc(a,'player'))return no('Already paid this cycle.');if(G.day<dueDay(a)-2)return no('Too early — contributions open 2 days before the due date (Day '+dueDay(a)+').');
 if(!spend(a.amt,'Ajo contribution — '+a.name,'ajo'))return false;a.contribs.push({cycle:a.cycle,m:'player',st:'paid',day:G.day});ontime(a);return true}
function runCycle(a){const c=a.cycle,rec=a.order[c],P=G.p;let pot=0,short=[],ded=0;
 const trad=a.mode==='traditional'||a.feePct!=null;
 G.debts.filter(d=>d.ajo===a.id&&!d.paid&&d.m!=='player').forEach(d=>{if(Math.random()<.8){d.paid=true;pot+=d.amt;note(nm(d.m)+' cleared an earlier shortfall of '+fmt(d.amt)+'.','ajo')}});
 a.members.forEach(m=>{
  // Traditional: organizer does not contribute on round 1 (they receive the pot)
  if(trad&&c===0&&m===a.host){a.contribs.push({cycle:c,m,st:'host_skip',day:G.day});return}
  if(m==='player'){
   if(cyc(a,'player',c)){pot+=a.amt;return}
   if(P.cash>=a.amt){ledger(-a.amt,'Ajo contribution — '+a.name,'ajo');a.contribs.push({cycle:c,m,st:'paid',day:G.day});pot+=a.amt;ontime(a)}
   else if(rec==='player'){ded=a.amt;pot+=a.amt;a.contribs.push({cycle:c,m,st:'paid',day:G.day})}
   else missAjo(a,c,rec)
  }else{const n=npc(m),pm=clamp((100-n.tr)/100*.28,0,.28);
   if(Math.random()<pm){a.contribs.push({cycle:c,m,st:'missed',day:G.day});G.debts.push({id:G.nid++,ajo:a.id,cycle:c,m,to:rec,amt:a.amt,day:G.day,paid:false});short.push(n.n);note(n.n+' missed their '+a.name+' contribution.','bad')}
   else{a.contribs.push({cycle:c,m,st:'paid',day:G.day});pot+=a.amt}}});
 // Platform fee on organizer's first pot only
 let fee=0;
 if(trad&&c===0&&rec===a.host){
  fee=Math.round(pot*(a.feePct||AJO_FEE_PCT));
  a.feeTaken=(a.feeTaken||0)+fee;
  if(fee>0) note('Ajoloop agent fee '+fmt(fee)+' taken from round 1 pot ('+Math.round((a.feePct||AJO_FEE_PCT)*100)+'%). Simulated offline.','ajo');
 }
 if(rec==='player'){
  const adv=(a.advances||[]).filter(x=>x.m==='player'&&!x.settled);
  ded=adv.reduce((s,x)=>s+x.amt,0);
  adv.forEach(x=>{x.settled=true;x.settleDay=G.day});
  const pay=Math.max(0,pot-ded-fee);
  earn(pay,'AJO PAYOUT — '+a.name,'ajo');
  fx('AJO PAYOUT|'+fmt(pay),'payout');
  addRep(2,'Completed an Ajo cycle');
  miles('payout','Received your first Ajo payout');
  note('AJO PAYOUT: '+fmt(pay)+' from '+a.name+'.'+(ded?' Circle credit '+fmt(ded)+' deducted.':'')+(fee?' Fee '+fmt(fee)+'.':'')+(short.length?' Short because '+short.join(', ')+' missed.':''),'good');
  a.payouts.push({cycle:c,to:rec,amt:pay,fee,ded,day:G.day})
 }
 else{const pay=Math.max(0,pot-fee);note(npc(rec).n+' received the '+a.name+' pot ('+fmt(pay)+(fee?'; fee '+fmt(fee):'')+').','ajo');a.payouts.push({cycle:c,to:rec,amt:pay,fee,day:G.day})}
 a.cycle++;if(a.cycle>=a.size){a.status='done';if(a.members.includes('player')){addTrust(5,'Completed an Ajo circle');addRep(5,'Completed an Ajo circle');miles('ajodone','Completed a full Ajo circle');note(a.name+' is complete. Everyone got paid. That is trust.','good')}}}
function missAjo(a,c,rec){const P=G.p,t0=Math.round(P.trust),r0=Math.round(P.rep);a.contribs.push({cycle:c,m:'player',st:'missed',day:G.day});G.debts.push({id:G.nid++,ajo:a.id,cycle:c,m:'player',to:rec,amt:a.amt,day:G.day,paid:false});
 P.missed++;P.blockedUntil=G.day+AJO_BLOCK;P.happiness=clamp(P.happiness-8);addTrust(-20,'Missed an Ajo contribution');addRep(-7,'Missed an Ajo contribution');
 a.members.filter(m=>m!=='player').forEach(m=>rel(m,-10,'Missed Ajo payment'));G.npcs.filter(n=>n.met&&!a.members.includes(n.id)&&n.rel>25).forEach(n=>{n.rel=clamp(n.rel-2);n.hist.unshift({day:G.day,d:-2,why:'Heard you missed an Ajo payment'})});
 note('You missed your Ajo payment. Trust '+t0+' → '+Math.round(P.trust)+', Reputation '+r0+' → '+Math.round(P.rep)+'. Pay what you owe to repair your name.','bad');miles('default','Missed your first Ajo payment')}
function payDebt(did){const d=G.debts.find(x=>x.id===did);if(!d||d.paid||d.m!=='player')return false;if(!spend(d.amt,'Paid Ajo debt — '+nm(d.to),'ajo'))return false;d.paid=true;const a=ajoOf(d.ajo);
 addTrust(10,'Paid an Ajo debt');addRep(3,'Paid an Ajo debt');if(d.to!=='player')rel(d.to,8,'You settled your debt');a.members.filter(m=>m!=='player'&&m!==d.to).forEach(m=>rel(m,3,'You settled your debt'));
 G.p.missed=Math.max(0,G.p.missed-1);if(!G.debts.some(x=>x.m==='player'&&!x.paid)){G.p.blockedUntil=G.day;note('Debt cleared. Ajo doors are reopening for you.','good')}miles('repair','Repaired your name by paying a debt');return true}

/* ---- EVENTS ---- */
const NEEDS=['a supplier is waiting at the door','school fees are due today','a hospital bill came out of nowhere','the shop rent cannot wait'];
const openFor=()=>G.ajos.filter(a=>a.status==='open'&&a.host!=='player'&&!a.members.includes('player')&&G.p.trust>=40&&!blocked()&&myAjos().length<2);
const EV={
emerg:{w:3,ok:()=>metNpcs(30).length>0,make:()=>({npc:pick(metNpcs(30)).id,amt:pick([10000,5000]),why:pick(NEEDS)}),
 view:d=>({t:'Emergency',ic:'🚨',txt:npc(d.npc).n+' needs '+fmt(d.amt)+' urgently — '+d.why+'. Can you help?',ch:[{l:'Give '+fmt(d.amt),need:d.amt},{l:'Give '+fmt(d.amt/2),need:d.amt/2},{l:'Refuse'}]}),
 pick:(d,i)=>{const n=npc(d.npc);if(i<2){const a=i?d.amt/2:d.amt;if(!spend(a,'Helped '+n.n+' in an emergency','help'))return false;rel(n.id,i?6:10,'Helped in an emergency');addTrust(i?2:4,'Helped in an emergency');addRep(i?1:3,'Helped someone in an emergency');n.lastSeen=G.day}else{rel(n.id,-6,'Refused to help in an emergency');note(n.n+' noticed you did not help.','bad')}return true}},
jobtip:{w:2,ok:()=>true,make:()=>({npc:pick(metNpcs(0).length?metNpcs(0):G.npcs).id}),
 view:d=>({t:'Weekend job',ic:'🧱',txt:npc(d.npc).n+' needs strong hands for a one-day site job. Pays '+fmt(12000)+'.',ch:[{l:'Take the job (−30 energy)',dis:G.p.energy<35?'Too tired':''},{l:'Decline'}]}),
 pick:(d,i)=>{if(i===0){earn(12000,'Site job for '+npc(d.npc).n,'gig');G.p.energy=clamp(G.p.energy-30);G.p.reliab=clamp(G.p.reliab+1);npc(d.npc).met&&rel(d.npc,3,'Did a job for them');addRep(1,'Reliable worker')}return true}},
ajoinv:{w:2,ok:()=>openFor().length>0,make:()=>{const a=pick(openFor());a.invited=true;return{ajo:a.id}},
 view:d=>{const a=ajoOf(d.ajo);return{t:'Ajo invitation',ic:'🤝',txt:npc(a.host).n+' invites you to join "'+a.name+'" — '+fmt(a.amt)+' every '+a.freq+' days, '+a.size+' members. Pot: '+fmt(a.amt*a.size)+'. Can you afford the commitment?',ch:[{l:'Join the Ajo'},{l:'Not now'}]}},
 pick:(d,i)=>{const a=ajoOf(d.ajo);if(i===0){if(a.status!=='open')return true;const why=joinCheck(a);if(why){no(why);return true}a.members.push('player');miles('ajo','Joined your first Ajo: '+a.name);fx('You joined '+a.name+'!','warm');note('You joined '+a.name+'.','ajo');if(a.members.length>=a.size)toStones(a)}else rel(a.host,-1,'Declined their Ajo invite');return true}},
invest:{w:2,ok:()=>metNpcs(35).length>0,make:()=>({npc:pick(metNpcs(35)).id,amt:pick([4000,8000])}),
 view:d=>({t:'Investment pitch',ic:'💼',txt:npc(d.npc).n+' wants '+fmt(d.amt)+' to restock and promises '+fmt(d.amt*1.6)+' back in 4 days. Trust them?',ch:[{l:'Invest '+fmt(d.amt),need:d.amt},{l:'Politely decline'}]}),
 pick:(d,i)=>{if(i===0){const n=npc(d.npc);if(!spend(d.amt,'Invested with '+n.n,'invest'))return false;G.sched.push({day:G.day+4,type:'invest',npc:n.id,amt:d.amt,ret:Math.round(d.amt*1.6),p:clamp(n.tr/100*.95,.1,.95)});note('You invested '+fmt(d.amt)+' with '+n.n+'. Outcome in 4 days.','info')}return true}},
bizopp:{w:2,ok:()=>!!G.biz,make:()=>({}),
 view:()=>({t:'Wholesale deal',ic:'📦',txt:'A distributor offers 20 drinks at ₦400 each (₦8,000) — cheaper than the market price.',ch:[{l:'Buy 20 drinks — ₦8,000',need:8000},{l:'Skip'}]}),
 pick:(d,i)=>{if(i===0){if(!spend(8000,'Wholesale stock — 20 drinks','business'))return false;const b=G.biz;b.avg=(b.stock*b.avg+20*400)/(b.stock+20);b.stock+=20;G.btx.unshift({day:G.day,txt:'Wholesale 20 drinks',amt:-8000})}return true}},
breakdown:{w:2,ok:()=>true,make:()=>({}),
 view:()=>({t:'Transport breakdown',ic:'🚌',txt:'The danfo you were in broke down on the road. Sun is hot.',ch:[{l:'Pay ₦1,500 for another keke',need:1500},{l:'Wait it out (−2 hours)',dis:canTime(2)?'':'Too late'}]}),
 pick:(d,i)=>{if(i===0){if(!spend(1500,'Transport (breakdown)','transport'))return false}else{G.p.energy=clamp(G.p.energy-5);tick(2)}return true}},
family:{w:2,ok:()=>true,make:()=>({}),
 view:()=>({t:'Family expense',ic:'👨🏾‍👩🏾‍👧🏾',txt:'Your aunty calls. A cousin needs money for school books. "You are the one doing well now."',ch:[{l:'Send ₦3,000',need:3000},{l:'Send ₦1,500',need:1500},{l:'Say you cannot'}]}),
 pick:(d,i)=>{if(i===0){if(!spend(3000,'Family support','family'))return false;G.p.happiness=clamp(G.p.happiness+5);addRep(1,'Looked after family')}else if(i===1){if(!spend(1500,'Family support','family'))return false;G.p.happiness=clamp(G.p.happiness+1)}else G.p.happiness=clamp(G.p.happiness-8);return true}},
customer:{w:2,ok:()=>true,make:()=>({}),
 view:()=>G.biz&&G.biz.stock>=5?{t:'Unexpected customer',ic:'🧑🏾‍🍳',txt:'A caterer wants 5 drinks right now and will pay ₦800 each.',ch:[{l:'Sell 5 drinks — ₦4,000'},{l:'Keep stock'}]}:{t:'Small favour',ic:'📦',txt:'A neighbour needs help carrying goods to the junction. Tip: ₦1,000.',ch:[{l:'Help (−5 energy)'},{l:'No time'}]},
 pick:(d,i)=>{if(i===0){if(G.biz&&G.biz.stock>=5){G.biz.stock-=5;G.biz.sold+=5;G.biz.rev+=4000;G.biz.profit+=Math.round(5*(800-G.biz.avg));earn(4000,'Mini Shop — caterer order','business');G.btx.unshift({day:G.day,txt:'Caterer bought 5 drinks',amt:4000});addRep(1,'Good service')}else{earn(1000,'Tip for carrying goods','gig');G.p.energy=clamp(G.p.energy-5)}}return true}},
recommend:{w:2,ok:()=>metNpcs(45).length>0,make:()=>({npc:pick(metNpcs(45)).id}),
 view:d=>({t:'Recommended for a job',ic:'🌟',txt:npc(d.npc).n+' recommended you for a quick delivery contract. Signing bonus: ₦4,000.',ch:[{l:'Take it (−15 energy)',dis:G.p.energy<20?'Too tired':''},{l:'Decline politely'}]}),
 pick:(d,i)=>{const n=npc(d.npc);if(i===0){earn(4000,'Referral contract from '+n.n,'gig');G.p.energy=clamp(G.p.energy-15);rel(n.id,3,'Recommended you');addRep(3,n.n+' recommended you');addTrust(1,'Recommended by a friend');note(n.n+' recommended you for a job.','good')}else rel(n.id,-1,'Declined a recommendation');return true}},
gossip:{w:3,ok:()=>G.p.trust<55||G.p.missed>0||G.p.trust>=70,make:()=>({who:pick(G.npcs).n,bad:G.p.trust<55||G.p.missed>0}),
 view:d=>d.bad?{t:'Word is spreading',ic:'🗣️',txt:d.who+' is telling people at the junction that you cannot be relied on.',ch:[{l:'Confront them calmly'},{l:'Ignore it'}]}:{t:'Someone vouches for you',ic:'🌟',txt:d.who+' told a group: "That one? Always keeps their word."',ch:[{l:'Thank them'}]},
 pick:(d,i)=>{if(d.bad){if(i===0){const ok=Math.random()<.35+G.p.social/200+G.p.trust/300;if(ok){addRep(-1,'Gossip (you answered it)');fx('You handled it with calm. People respect that.','warm')}else{addRep(-5,'Gossip about your reliability');addTrust(-2,'Gossip about your reliability')}}else{addRep(-4,'Gossip about your reliability');addTrust(-2,'Gossip about your reliability')}}else{addRep(3,d.who+' vouched for you');addTrust(1,'Vouched for')}return true}},
wedding:{w:2,ok:()=>metNpcs(30).length>0,make:()=>({npc:pick(metNpcs(30)).id}),
 view:d=>({t:'Aso-ebi invitation',ic:'👗',txt:npc(d.npc).n+' invites you to a family wedding. Aso-ebi costs ₦4,000. Showing up says a lot.',ch:[{l:'Buy aso-ebi — ₦4,000',need:4000},{l:'Send ₦1,500 gift',need:1500},{l:'Send apologies'}]}),
 pick:(d,i)=>{const n=npc(d.npc);if(i===0){if(!spend(4000,'Aso-ebi for '+n.n+"'s wedding",'social'))return false;rel(n.id,6,'Came to the wedding');addRep(3,'Showed up at a wedding');G.p.happiness=clamp(G.p.happiness+10)}else if(i===1){if(!spend(1500,'Wedding gift','social'))return false;rel(n.id,2,'Sent a gift')}else{rel(n.id,-2,'Sent apologies');addRep(-1,'Missed a wedding')}return true}},
promise:{w:2,ok:()=>metNpcs(35).length>0&&G.promises.length<2,make:()=>({npc:pick(metNpcs(35)).id,amt:pick([3000,4000,6000]),due:G.day+3}),
 view:d=>({t:'A promise',ic:'🤞🏾',txt:npc(d.npc).n+' needs '+fmt(d.amt)+' for a supplies deal. "Bring it by Day '+d.due+' and I will pay you back with extra." Make the promise only if you will keep it.',ch:[{l:'Promise to bring '+fmt(d.amt)},{l:'Sorry, I cannot promise'}]}),
 pick:(d,i)=>{if(i===0){G.promises.push({id:G.nid++,npc:d.npc,amt:d.amt,due:d.due});note('You promised '+npc(d.npc).n+' '+fmt(d.amt)+' by Day '+d.due+'. Keep it or lose their trust.','info')}else rel(d.npc,-1,'Could not promise');return true}}
};
function rollEvent(pool){const ids=(pool||Object.keys(EV)).filter(id=>EV[id].ok()&&id!==G.lastEv);if(!ids.length)return false;const bag=[];ids.forEach(id=>{for(let i=0;i<EV[id].w;i++)bag.push(id)});const id=pick(bag);G.ev={id,d:EV[id].make()};G.lastEv=id;return true}
function pickEvent(i){const e=G.ev;if(!e)return false;if(EV[e.id].pick(e.d,i)!==false)G.ev=null;return true}
function opp(){if(G.p.loc!=='market')return no('Go to the Market.');if(!canTime(1))return no(LATE);if(G.p.oppDay!==G.day){G.p.oppDay=G.day;G.p.oppN=0}if(G.p.oppN>=2)return no('Nothing new today. Come back tomorrow.');G.p.oppN++;
 if(!rollEvent(['jobtip','ajoinv','invest','bizopp','recommend','customer','promise','wedding'])){fx('Nothing today — keep showing up and people will remember you.')}tick(1);return true}

/* ---- scheduled things + the day ---- */
function runSched(){const due=G.sched.filter(s=>s.day<=G.day);G.sched=G.sched.filter(s=>s.day>G.day);
 due.forEach(s=>{const n=npc(s.npc);
  if(s.type==='invest'){if(Math.random()<s.p){earn(s.ret,'Investment returns — '+n.n,'invest');rel(n.id,6,'Investment paid off');addTrust(1,'Good investment partner');note(n.n+' returned '+fmt(s.ret)+' from your investment.','good')}else{rel(n.id,-8,'Investment went bad');note(n.n+"'s deal collapsed. Your "+fmt(s.amt)+' is gone.','bad')}}
  if(s.type==='repay'){if(Math.random()<s.p){earn(s.amt,n.n+' paid you back','repay');rel(n.id,4,'Paid you back');note(n.n+' paid you back '+fmt(s.amt)+'.','good')}else{rel(n.id,-4,'Did not repay');note(n.n+' has gone quiet about the '+fmt(s.amt)+'...','bad')}}})}
function endDay(auto){const P=G.p;
 G.ajos.filter(a=>a.status==='active'&&dueDay(a)===G.day).forEach(runCycle);
 runSched();
 if(P.cash>=LIVING)ledger(-LIVING,'Light & data','bills');else P.happiness=clamp(P.happiness-3);
 if(G.day%7===0){if(P.cash>=RENT)ledger(-RENT,'Weekly room rent','rent');else{P.happiness=clamp(P.happiness-8);note('You could not pay rent this week. The landlord is not happy.','bad')}}
 P.energy=clamp(P.energy+(P.hunger>70?45:80));P.hunger=clamp(P.hunger+12);P.happiness=clamp(P.happiness+(P.happiness<55?3:-1));
 G.npcs.forEach(n=>{if(n.met&&G.day-n.lastSeen>=6&&n.rel>25&&(G.day-n.lastSeen)%3===0){n.rel=clamp(n.rel-1);n.hist.unshift({day:G.day,d:-1,why:'Lost touch'})}});
 snap();G.day++;G.hour=6;P.loc='home';
 groupsDaily();if(auto)note('Night fell and you went home.','info');
 G.openJobs=shuffle(JOBS.map(j=>j.id)).slice(0,ri(2,3));if(!P.job)note('Hiring today: '+G.openJobs.map(i=>JOBS.find(j=>j.id===i).n).join(', ')+'.','info');
 G.promises.filter(p=>p.due<G.day).forEach(p=>{const n=npc(p.npc);rel(n.id,-15,'Broke a promise');addTrust(-8,'Broke a promise');addRep(-3,'Broke a promise');note('You broke your promise to '+n.n+'. People talk.','bad')});
 G.promises=G.promises.filter(p=>p.due>=G.day);
 G.promises.filter(p=>p.due===G.day).forEach(p=>note('Promise to '+npc(p.npc).n+' ('+fmt(p.amt)+') is due today.','bad'));
 G.ajos.filter(a=>a.status==='active'&&a.members.includes('player')).forEach(a=>{const d=dueDay(a);if(d===G.day+1)note('Your '+a.name+' contribution ('+fmt(a.amt)+') is due tomorrow.','ajo');if(d===G.day)note('Your '+a.name+' contribution ('+fmt(a.amt)+') is due today. It is taken tonight if you have the cash.','ajo')});
 if(!G.ev&&Math.random()<.55)rollEvent();
 if(G.ev)note('Something happened that needs your decision.','info')}

/* ---- SOCIAL GROUPS ----
   Groups are communities, not money. Nothing in this block moves cash, creates a debt or adds anyone to an Ajo.
   Every action takes an `actor` and is permission-checked HERE, in the engine. The screens only hide buttons for convenience.
   Everyone except 'player' is an NPC (simulated). There is no server yet, so "other users" do not exist. */
const G_CATS=['Friends & Family','Business','Creators','Sports','Neighbourhood','Learning','Food & Music','Gaming'];
const G_AVS=['🏘️','⚽','🎨','💼','🍲','🎶','📚','🛺','🤝','🌆'];
const G_AREAS=['Fagge','Nasarawa','Dala','Gwale','Tarauni','Kano Municipal','Kumbotso','Ungogo'];
const G_LOCS=['restaurant','social','market','park'];
const G_MAX=60,OWNER_IDLE=30;
const ROLE_RANK={member:1,mod:2,admin:3,owner:4};
/* minimum role for each action. Anything not listed is owner-only. */
const PERMS={post:'member',report:'member',rsvp:'member',invite:'member',proposeAjo:'member',hidePost:'mod',reviewReport:'mod',
 announce:'admin',approve:'admin',removeMember:'admin',editInfo:'admin',createEvent:'admin',revokeInvite:'admin',
 setRole:'owner',setVisibility:'owner',transfer:'owner',deleteGroup:'owner'};
const NPC_CATS={musa:['Business'],aisha:['Creators','Food & Music'],yusuf:['Neighbourhood','Sports'],fatima:['Food & Music','Friends & Family'],ibrahim:['Business','Learning'],maryam:['Learning','Friends & Family'],sani:['Gaming','Business'],hauwa:['Business','Neighbourhood'],abdullahi:['Business','Sports'],zainab:['Learning','Neighbourhood'],bashir:['Sports','Gaming'],halima:['Business','Friends & Family'],garba:['Sports','Neighbourhood'],rukayya:['Food & Music','Creators'],dauda:['Business','Gaming']};
const CHAT={
 'Sports':['Who is watching the match tonight? Suya is on me if Pillars win.','Training Saturday morning at the park. Come early!'],
 'Business':['Prices at Kasuwa went up again. Anybody buying in bulk?','Small small, the shop is growing. God is faithful.'],
 'Creators':['New Ankara pattern dropping this weekend. Tell your people!','Anybody need a photographer for events? I dey around.'],
 'Neighbourhood':['Please keep the gutter clear before the rains.','Water is back on our street. Alhamdulillah.'],
 'Friends & Family':['Good morning everyone. How una dey?','Who is free for jollof this weekend?'],
 'Learning':['Who can explain the new savings rules at the bank?','Free evening class on bookkeeping, anyone interested?'],
 'Food & Music':['That new suya spot near the junction is fire.','Playlist for Saturday: who has suggestions?'],
 'Gaming':['Anybody up for a game night at the Suya Spot?','New high score at the arcade. Beat that!']};
const REPLY=['Well said!','Ah, I agree with you.','Count me in.','Hmm, let us talk more about this at the Suya Spot.','Na so!'];

const grp=id=>(G.groups||[]).find(g=>g.id===id&&!g.dead);
const roleOf=(g,u)=>g&&g.mem[u]?g.mem[u].role:null;
const rk=(g,u)=>ROLE_RANK[roleOf(g,u)]||0;
const gcan=(g,u,act)=>!!g&&!!g.mem[u]&&rk(g,u)>=ROLE_RANK[PERMS[act]||'owner'];
const gnote=t=>note(t,'grp');
const gcount=g=>Object.keys(g.mem).length;
function gtrack(type,g,meta){G.gev.push({day:G.day,type,g:g?g.id:null,...(meta||{})});if(G.gev.length>400)G.gev.shift()}
/* per-day action limits (reset every morning) */
function grate(u,key,max,why){G.rl=G.rl||{};const k=u+'|'+key;if((G.rl[k]||0)>=max)return no(why||'Easy, you are doing that a lot. Try again tomorrow.');G.rl[k]=(G.rl[k]||0)+1;return true}
/* the one door every protected action goes through. A non-member of a private group gets the same answer as for a group that does not exist. */
function gguard(gid,u,act,msg){if(G.susp.includes(u)){no('This account is suspended.');return null}const g=grp(gid);
 if(!g||g.ban.includes(u)){no('That group is not available.');return null}
 if(!gcan(g,u,act)){no(msg||(g.mem[u]?'You do not have permission to do that in this group.':'That group is not available.'));return null}
 g.mem[u].last=G.day;return g}

function mkGroup(o,owner){const vis=o.vis==='private'?'private':'public';let join=o.join;
 if(vis==='public'&&join!=='approval')join='open';if(vis==='private'&&join!=='approval')join='invite';
 const maxM=clamp(parseInt(o.maxMembers)||30,3,G_MAX);
 const g={id:o.id||'g'+G.nid++,name:o.name,av:G_AVS.includes(o.av)?o.av:'🏘️',desc:String(o.desc||''),cat:G_CATS.includes(o.cat)?o.cat:'Friends & Family',
  tags:(o.tags||[]).filter(t=>G_CATS.includes(t)).slice(0,3),area:G_AREAS.includes(o.area)?o.area:null,vis,disc:vis==='private'&&!!o.disc,join,
  memInvite:o.memInvite==='admins'?'admins':'members',roster:o.roster==='admins'?'admins':'members',rules:(o.rules||[]).map(r=>String(r||'').trim()).filter(Boolean).slice(0,6),
  maxMembers:maxM,
  owner,mem:{},req:[],inv:[],ban:[],posts:[],evs:[],reps:[],ajoP:[],created:G.day,last:G.day,fi:false,dead:false};
 g.mem[owner]={role:'owner',joined:G.day,last:G.day,show:false};return g}
function gCap(g){return clamp(parseInt(g&&g.maxMembers)||G_MAX,3,G_MAX)}
function addMember(g,u,role='member'){g.mem[u]={role,joined:G.day,last:G.day,show:u!=='player'&&g.vis==='public'};g.req=g.req.filter(x=>x!==u);g.last=G.day;if(u==='player')miles('grpjoin','Joined a group: '+g.name)}
function dropMember(g,t){delete g.mem[t];g.req=g.req.filter(x=>x!==t);g.inv.forEach(i=>{if(i.by===t&&invState(i)==='pending')i.rev=true})}

function setGroupPhoto(gid,dataUrl,u='player'){
  const g=grp(gid);if(!g||!g.mem[u])return no('Join the group first.');
  if(rk(g,u)<2&&g.owner!==u)return no('Only admins can change the group photo.');
  if(!dataUrl||typeof dataUrl!=='string'||dataUrl.length>900000)return no('Photo is too large. Try a smaller image.');
  if(!dataUrl.startsWith('data:image/'))return no('Choose an image file.');
  g.photo=dataUrl;g.last=G.day;
  fx('Group photo updated','good');
  return true;
}
function clearGroupPhoto(gid,u='player'){
  const g=grp(gid);if(!g||!g.mem[u])return no('Join the group first.');
  if(rk(g,u)<2&&g.owner!==u)return no('Only admins can change the group photo.');
  delete g.photo;fx('Photo removed','warm');return true;
}
function createGroup(o,u='player'){if(G.susp.includes(u))return no('This account is suspended.');const name=String(o.name||'').trim().replace(/\s+/g,' ');
 if(name.length<3||name.length>30)return no('Give your group a name (3 to 30 characters).');
 if(G.groups.some(g=>!g.dead&&g.name.toLowerCase()===name.toLowerCase()&&(g.vis==='public'||g.disc)))return no('A group with that name already exists. Pick another.');
 if(G.groups.filter(g=>!g.dead&&g.owner===u).length>=5)return no('You can own up to 5 groups.');
 if(!grate(u,'gcreate',3,'You created several groups today. Try again tomorrow.'))return false;
 const g=mkGroup({...o,name,desc:String(o.desc||'').trim().slice(0,240),rules:(o.rules||[]).map(r=>String(r||'').trim().slice(0,100))},u);
 G.groups.unshift(g);gtrack('group_created',g,{by:u,vis:g.vis});miles('grpmk','Created your first group: '+name);fx('Group created!','warm');return g.id}

/* ---- joining, requests, invitations ---- */
function invState(i){if(i.rev)return 'revoked';if(i.to&&i.acc.length)return 'accepted';if(i.dec)return 'declined';if(G.day>i.exp)return 'expired';if(!i.to&&i.uses>=i.max)return 'full';return 'pending'}
function mkCode(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c,t=0;const dup=x=>G.groups.some(g=>g.inv.some(i=>i.code===x));
 do{c='KANO-';for(let k=0;k<6;k++)c+=A[Math.floor(Math.random()*A.length)]}while(dup(c)&&t++<20);if(dup(c))c+=G.nid;return c}
function acceptDirect(g,i,u){i.acc.push({u,day:G.day});addMember(g,u);gtrack('invitation_accepted',g,{by:i.by,u});fx('You joined '+g.name+'!','warm');return true}
function joinGroup(gid,u='player'){if(G.susp.includes(u))return no('This account is suspended.');const g=grp(gid),gone='That group is not available.';
 if(!g||g.ban.includes(u))return no(gone);if(g.mem[u])return no('You are already in this group.');if(gcount(g)>=gCap(g))return no('This group is full.');
 const di=g.inv.find(i=>i.to===u&&invState(i)==='pending');if(di)return acceptDirect(g,di,u);
 if(g.vis==='private'&&!g.disc)return no(gone);
 if(g.join==='open'){addMember(g,u);gtrack('membership_joined',g,{by:u});fx('You joined '+g.name+'!','warm');return true}
 if(g.join==='approval'){if(g.req.includes(u))return no('Your request is already waiting.');if(!grate(u,'jreq',5))return false;g.req.push(u);gtrack('join_request_submitted',g,{by:u});fx('Request sent to the admins.','warm');return true}
 return no('This group is invite-only.')}
function answerInvite(gid,iid,accept,u='player'){const g=grp(gid),i=g&&g.inv.find(x=>x.id===iid&&x.to===u);
 if(!i||invState(i)!=='pending'||g.ban.includes(u))return no('That invitation is no longer valid.');if(g.mem[u])return no('You are already in this group.');
 if(accept)return acceptDirect(g,i,u);i.dec=true;return true}
function npcAnswer(g,i){const n=npc(i.to),p=clamp(.1+n.rel/100*.8+(G.p.trust-50)/200+((NPC_CATS[n.id]||[]).includes(g.cat)?.1:0),.05,.95);
 if(Math.random()<p){i.acc.push({u:n.id,day:G.day});addMember(g,n.id);gtrack('invitation_accepted',g,{by:i.by,u:n.id});fx(n.n+' joined '+g.name+'!','warm')}
 else{i.dec=true;fx(n.n+': "Let me think about it... not now."','cold')}}
function createInvite(gid,by,o={}){const g=gguard(gid,by,'invite');if(!g)return false;
 if(rk(g,by)<2&&g.memInvite==='admins')return no('Only admins can invite people to this group.');
 const to=o.to||null;
 if(to){const n=npc(to);if(!n||!n.met)return no('You can only invite people you know.');if(G.blk.includes(to))return no('You have blocked '+n.n+'.');
  if(g.mem[to])return no(n.n+' is already in the group.');if(g.ban.includes(to))return no(n.n+' cannot be invited.');
  if(g.inv.some(i=>i.to===to&&invState(i)==='pending'))return no('Already invited. Waiting for a reply.');
  if(g.inv.some(i=>i.to===to&&i.day===G.day&&!i.rev))return no(n.n+' already answered today.')}
 if(!grate(by,'invite',15,'That is a lot of invitations today. Give people time to reply.'))return false;
 const i={id:'i'+G.nid++,code:to?null:mkCode(),by,to,day:G.day,exp:G.day+clamp(parseInt(o.ttl)||7,1,30),max:to?1:clamp(parseInt(o.max)||10,1,25),uses:0,acc:[],rev:false,dec:false,resent:0};
 g.inv.push(i);gtrack('invitation_sent',g,{by,direct:!!to});if(rk(g,by)===1)gtrack('member_invited_member',g,{by});
 if(to)npcAnswer(g,i);return i.id}
function inviteMany(gid,by,ids){let sent=0;(ids||[]).forEach(id=>{if(createInvite(gid,by,{to:id}))sent++});return sent}
function revokeInvite(gid,by,iid){const g=gguard(gid,by,'invite');if(!g)return false;const i=g.inv.find(x=>x.id===iid);if(!i)return no('That invitation is gone.');
 if(i.by!==by&&!gcan(g,by,'revokeInvite'))return no('Only the sender or an admin can revoke this.');if(invState(i)!=='pending')return no('That invitation is already '+invState(i)+'.');i.rev=true;return true}
function resendInvite(gid,by,iid){const g=gguard(gid,by,'invite');if(!g)return false;const i=g.inv.find(x=>x.id===iid);if(!i)return no('That invitation is gone.');
 if(i.by!==by&&!gcan(g,by,'revokeInvite'))return no('Only the sender or an admin can resend this.');if(i.rev||i.acc.length&&i.to)return no('That invitation cannot be resent.');
 const st=invState(i);if(st==='pending'||st==='full')return no('It is still active.');if(i.resent>=2)return no('You already resent this twice.');
 if(i.to&&i.day===G.day)return no(npc(i.to).n+' already answered today.');if(!grate(by,'invite',15))return false;
 i.resent++;i.dec=false;i.day=G.day;i.exp=G.day+7;if(i.to)npcAnswer(g,i);return true}
/* link/code invitations. Codes are revocable, expire, have a use limit, and wrong guesses are rate limited. */
function redeemCode(code,u='player'){if(G.susp.includes(u))return no('This account is suspended.');code=String(code||'').trim().toUpperCase();G.cf=G.cf||{};const k=u+'|'+G.day;
 if((G.cf[k]||0)>=6)return no('Too many wrong codes today. Try again tomorrow.');const bad=()=>{G.cf[k]=(G.cf[k]||0)+1;return no('That code is not valid.')};
 let g=null,i=null;for(const x of G.groups){if(x.dead)continue;const f=x.inv.find(y=>!y.to&&y.code===code);if(f){g=x;i=f;break}}
 if(!i||invState(i)!=='pending'||g.ban.includes(u))return bad();if(g.mem[u])return no('You are already in this group.');if(gcount(g)>=gCap(g))return no('This group is full.');
 i.uses++;i.acc.push({u,day:G.day});addMember(g,u);gtrack('invitation_accepted',g,{by:i.by,u});fx('You joined '+g.name+'!','warm');return g.id}

/* ---- conversations ---- */
function gPush(g,u,txt,kind,parent){const p={id:'p'+G.nid++,by:u,day:G.day,hr:G.hour,kind,txt,parent,hid:false};g.posts.push(p);if(g.posts.length>200)g.posts.shift();
 if(g.mem[u])g.mem[u].last=G.day;g.last=G.day;if(!g.fi){g.fi=true;gtrack('first_interaction',g,{by:u})}
 if(kind==='announce'&&u!=='player'&&g.mem.player)gnote(g.name+': new announcement from '+nm(u)+'.');return p}
function gpost(gid,u,txt,o={}){
 const kind=o.kind==='announce'?'announce':(o.kind==='poll'?'poll':(o.kind==='voice'?'voice':'msg'));
 const need=kind==='announce'?'announce':'post';
 const g=gguard(gid,u,need,kind==='announce'?'Only admins can post announcements.':null);if(!g)return false;
 txt=String(txt||'').trim();
 if(kind==='voice'){
  txt=txt||('🎤 Voice note · '+(o.sec||3)+'s');
 } else if(!txt){
  return no(kind==='poll'?'Write a poll question.':'Write something first.');
 }
 if(txt.length>280)return no('Keep it under 280 characters.');
 if(kind!=='poll'&&kind!=='voice'&&(txt.match(/https?:\/\//gi)||[]).length>1)return no('Too many links. That looks like spam.');
 if(kind==='msg'&&g.posts.filter(p=>p.by===u&&p.kind==='msg').slice(-5).some(p=>p.txt.toLowerCase()===txt.toLowerCase()))return no('You already posted that.');
 if(o.parent&&!g.posts.some(p=>p.id===o.parent&&!p.parent))return no('That post is gone.');
 const limit=kind==='announce'?3:(kind==='poll'?6:8);
 if(!grate(u,'post:'+g.id,limit,'You have posted a lot today. Give others a turn.'))return false;
 const p={id:'p'+G.nid++,by:u,day:G.day,hr:G.hour,kind,txt,parent:o.parent||null,hid:false};
 if(kind==='poll'){
  let opts=(o.options||[]).map(t=>String(t||'').trim()).filter(Boolean).slice(0,6);
  if(opts.length<2)return no('Add at least two choices for the poll.');
  p.options=opts.map((t,idx)=>({id:'o'+idx,t:t.slice(0,60),votes:[]}));
 }
 if(kind==='voice'){
  p.sec=Math.max(1,Math.min(60,parseInt(o.sec)||3));
  p.txt='🎤 Voice note · '+p.sec+'s';
 }
 g.posts.push(p);if(g.mem[u])g.mem[u].last=G.day;g.last=G.day;if(!g.fi){g.fi=true;gtrack('first_interaction',g,{by:u})}
 if(kind==='msg'&&Math.random()<0.45){
  const others=Object.keys(g.mem).filter(m=>m!=='player'&&m!==u);
  if(others.length){const m=pick(others);const replies=['Noted.','I agree.','Who is joining?','Count me in.','God willing.','Let us keep it respectful.'];
   g.posts.push({id:'p'+G.nid++,by:m,day:G.day,hr:G.hour,kind:'msg',txt:pick(replies),parent:null,hid:false})}
 }
 if(kind==='poll'){
  Object.keys(g.mem).filter(m=>m!=='player').forEach(m=>{
   if(Math.random()<0.55){const o2=pick(p.options);if(o2&&!(o2.votes||[]).includes(m)){o2.votes=o2.votes||[];o2.votes.push(m)}}
  });
 }
 if(kind==='voice'&&Math.random()<0.35){
  const others=Object.keys(g.mem).filter(m=>m!=='player');
  if(others.length)g.posts.push({id:'p'+G.nid++,by:pick(others),day:G.day,hr:G.hour,kind:'voice',txt:'🎤 Voice note · 2s',sec:2,parent:null,hid:false});
 }
 gtrack(kind==='poll'?'poll_created':(kind==='voice'?'voice_sent':'post_created'),g,{by:u,kind});
 return p.id;
}
function votePoll(gid,pid,oid,u='player'){
 const g=grp(gid);if(!g||!g.mem[u])return no('Join the group to vote.');
 const p=g.posts.find(x=>x.id===pid&&x.kind==='poll'&&!x.hid);if(!p)return no('Poll not found.');
 if(!p.options||!p.options.some(o=>o.id===oid))return no('Invalid choice.');
 p.options.forEach(o=>{o.votes=(o.votes||[]).filter(v=>v!==u)});
 const opt=p.options.find(o=>o.id===oid);opt.votes.push(u);
 if(g.mem[u])g.mem[u].last=G.day;
 fx('Vote recorded','warm');
 return true;
}
function createGroupPoll(gid,question,options){
 return gpost(gid,'player',question,{kind:'poll',options});
}
function npcReply(g,p){if(Math.random()>.6)return;const c=Object.keys(g.mem).filter(m=>m!=='player'&&npc(m)&&!g.ban.includes(m));if(!c.length)return;gPush(g,pick(c),pick(REPLY),'msg',p.parent||p.id)}
function postsFor(gid,v='player'){const g=grp(gid);if(!g||g.ban.includes(v))return null;
 if(!g.mem[v]){if(g.vis==='public')return g.posts.filter(p=>p.kind==='announce'&&!p.hid).map(p=>({...p}));return null}
 const staff=rk(g,v)>=2;return g.posts.filter(p=>(staff||!p.hid)&&!(v==='player'&&G.blk.includes(p.by))).map(p=>({...p}))}
function reportPost(gid,u,pid,why){const g=gguard(gid,u,'report');if(!g)return false;const p=g.posts.find(x=>x.id===pid);if(!p)return no('That post is gone.');
 if(p.by===u)return no('You cannot report your own post.');if(g.reps.some(r=>r.pid===pid&&r.by===u))return no('You already reported this.');if(!grate(u,'report',5))return false;
 g.reps.push({id:'r'+G.nid++,by:u,pid,target:p.by,why:String(why||'Abuse').slice(0,120),day:G.day,st:'open'});fx('Report sent to the moderators. Thank you.','warm');return true}
function hidePost(gid,u,pid){const g=gguard(gid,u,'hidePost','Only moderators and admins can hide posts.');if(!g)return false;const p=g.posts.find(x=>x.id===pid);if(!p)return no('That post is gone.');
 if(p.by!==u&&g.mem[p.by]&&rk(g,p.by)>=rk(g,u))return no('You cannot hide a post from someone of equal or higher role.');p.hid=true;return true}
function reviewReport(gid,u,rid,action){const g=gguard(gid,u,'reviewReport','Only moderators and admins can review reports.');if(!g)return false;const r=g.reps.find(x=>x.id===rid&&x.st==='open');if(!r)return no('That report was already handled.');
 if(action==='dismiss'){r.st='dismissed';return true}
 if(action==='hide'){if(!hidePost(gid,u,r.pid))return false;r.st='actioned';return true}
 if(action==='remove'||action==='ban'){if(!gcan(g,u,'removeMember'))return no('Only admins can remove or ban members.');
  if(g.mem[r.target]){if(!removeMember(gid,u,r.target,action==='ban'))return false}else if(action==='ban'&&!g.ban.includes(r.target))g.ban.push(r.target);r.st='actioned';return true}
 return no('Unknown action.')}

/* ---- membership & roles ---- */
function approveRequest(gid,u,target,yes=true){const g=gguard(gid,u,'approve','Only admins can handle join requests.');if(!g)return false;if(!g.req.includes(target))return no('That request is gone.');
 if(!yes){g.req=g.req.filter(x=>x!==target);return true}if(g.ban.includes(target))return no('That person is banned.');if(gcount(g)>=gCap(g))return no('This group is full.');
 addMember(g,target);gtrack('membership_approved',g,{by:u,u:target});if(target==='player')gnote('You were approved to join '+g.name+'.');return true}
function removeMember(gid,u,target,ban=false){const g=gguard(gid,u,'removeMember','Only admins can remove members.');if(!g)return false;if(!g.mem[target])return no('They are not in this group.');
 if(target===u)return no('Use Leave group instead.');if(rk(g,target)>=rk(g,u))return no('You cannot remove someone with the same or a higher role.');
 dropMember(g,target);if(ban&&!g.ban.includes(target))g.ban.push(target);gtrack(ban?'member_banned':'member_removed',g,{by:u,u:target});return true}
function setRole(gid,u,target,role){const g=gguard(gid,u,'setRole','Only the owner can change roles.');if(!g)return false;if(!['admin','mod','member'].includes(role))return no('Unknown role.');
 if(!g.mem[target])return no('They are not in this group.');if(target===u)return no('You cannot change your own role.');if(g.mem[target].role==='owner')return no('The owner role only moves through an ownership transfer.');
 g.mem[target].role=role;return true}
function transferOwnership(gid,u,target,confirm){const g=gguard(gid,u,'transfer','Only the owner can transfer ownership.');if(!g)return false;
 if(String(confirm||'')!==g.name)return no('Type the group name exactly to confirm the transfer.');
 if(target===u||!g.mem[target]||g.mem[target].role!=='admin')return no('Ownership can only go to one of your administrators. Make them an admin first.');
 g.mem[u].role='admin';g.mem[target].role='owner';g.owner=target;gtrack('ownership_transferred',g,{by:u,u:target});gnote(g.name+': ownership moved to '+nm(target)+'.');return true}
/* who takes over when the owner leaves, is suspended or goes quiet: highest role, then longest-serving */
function nextOwner(g,exclude){return Object.keys(g.mem).filter(m=>m!==exclude).sort((a,b)=>rk(g,b)-rk(g,a)||g.mem[a].joined-g.mem[b].joined)[0]||null}
function succeed(g,why,keep){const n=nextOwner(g,keep);
 if(!n){g.dead=true;g.inv.forEach(i=>{i.rev=true});if(g.mem.player||g.owner==='player')gnote(g.name+' was archived because nobody was left.');gtrack('group_archived',g,{why});return null}
 if(keep&&g.mem[keep])g.mem[keep].role='admin';g.mem[n].role='owner';g.mem[n].last=G.day;g.owner=n;gtrack('ownership_succeeded',g,{why,u:n});
 if(g.mem.player)gnote(g.name+': '+nm(n)+' is the new owner ('+why+').');return n}
function leaveGroup(gid,u='player'){const g=grp(gid);if(!g||!g.mem[u])return no('You are not in this group.');const wasOwner=g.owner===u;dropMember(g,u);if(wasOwner)succeed(g,'the owner left');gtrack('member_left',g,{by:u});return true}
function suspendUser(id){if(!G.susp.includes(id))G.susp.push(id);G.groups.forEach(g=>{if(g.dead||!g.mem[id])return;const wasOwner=g.owner===id;dropMember(g,id);if(wasOwner)succeed(g,'the owner was suspended')});return true}
function deleteGroup(gid,u,confirm){const g=gguard(gid,u,'deleteGroup','Only the owner can delete the group.');if(!g)return false;if(String(confirm||'')!==g.name)return no('Type the group name exactly to confirm.');
 g.dead=true;g.inv.forEach(i=>{i.rev=true});gtrack('group_deleted',g,{by:u});return true}
function editGroup(gid,u,p){const g=gguard(gid,u,'editInfo','Only administrators can change group settings.');if(!g)return false;
 const ownerKeys=['name','vis','disc'];if(ownerKeys.some(k=>k in p)&&!gcan(g,u,'setVisibility'))return no('Only the owner can change the name or visibility.');
 if('name' in p){const n=String(p.name).trim().replace(/\s+/g,' ');if(n.length<3||n.length>30)return no('Name must be 3 to 30 characters.');if(G.groups.some(x=>x!==g&&!x.dead&&x.name.toLowerCase()===n.toLowerCase()&&(x.vis==='public'||x.disc)))return no('A group with that name already exists.');g.name=n}
 if('maxMembers' in p){const m=clamp(parseInt(p.maxMembers)||30,3,G_MAX);if(m<gcount(g))return no('Limit cannot be below current members ('+gcount(g)+').');g.maxMembers=m}
 if('desc' in p)g.desc=String(p.desc).trim().slice(0,240);
 if('rules' in p)g.rules=p.rules.map(r=>String(r||'').trim().slice(0,100)).filter(Boolean).slice(0,6);
 if('av' in p&&G_AVS.includes(p.av))g.av=p.av;
 if('cat' in p&&G_CATS.includes(p.cat))g.cat=p.cat;
 if('tags' in p)g.tags=p.tags.filter(t=>G_CATS.includes(t)).slice(0,3);
 if('area' in p)g.area=G_AREAS.includes(p.area)?p.area:null;
 if('memInvite' in p)g.memInvite=p.memInvite==='admins'?'admins':'members';
 if('roster' in p)g.roster=p.roster==='admins'?'admins':'members';
 if('vis' in p)g.vis=p.vis==='private'?'private':'public';
 if('disc' in p)g.disc=!!p.disc;
 if('join' in p)g.join=p.join==='approval'?'approval':(p.join==='invite'?'invite':'open');
 if(g.vis==='public'){g.disc=false;if(g.join==='invite')g.join='approval'}else{if(g.join==='open')g.join='approval';Object.values(g.mem).forEach(m=>{m.show=false})}
 return true}

/* ---- activities: meetups & challenges ---- */
const gTotal=e=>Object.values(e.prog).reduce((s,v)=>s+v,0);
function gChk(g,e){if(e.done||gTotal(e)<e.target)return;e.done=true;g.last=G.day;
 if(e.going.includes('player')){addRep(2,'Group challenge completed');G.p.happiness=clamp(G.p.happiness+6);gnote(g.name+': challenge complete, '+e.title+'!');fx('Group challenge complete! 🎉','warm');gtrack('activity_completed',g,{by:'player',kind:'challenge'})}}
function createEvent(gid,u,o){const g=gguard(gid,u,'createEvent','Only administrators can organise events.');if(!g)return false;const title=String(o.title||'').trim();
 if(title.length<3||title.length>40)return no('Give the event a title (3 to 40 characters).');
 if(g.evs.filter(e=>!e.done&&!e.fail&&G.day<=e.dl).length>=4)return no('Wait for a current event to finish first.');
 const kind=o.kind==='challenge'?'challenge':'meetup';const e={id:'e'+G.nid++,by:u,title,kind,loc:null,day:null,type:null,target:null,dl:null,going:[u],att:[],prog:{},done:false,fail:false};
 if(kind==='meetup'){if(!G_LOCS.includes(o.loc))return no('Pick a place in town.');e.loc=o.loc;e.day=G.day+(isNaN(parseInt(o.off))?1:clamp(parseInt(o.off),0,14));e.dl=e.day}
 else{if(!['work','talk','shop'].includes(o.type))return no('Pick a goal.');e.type=o.type;e.target=clamp(parseInt(o.target)||10,3,30);e.dl=G.day+clamp(parseInt(o.off)||7,2,14)}
 if(!grate(u,'event',4))return false;g.evs.push(e);g.last=G.day;return e.id}
function rsvp(gid,u,eid,yes=true){const g=gguard(gid,u,'rsvp');if(!g)return false;const e=g.evs.find(x=>x.id===eid);if(!e||e.done||e.fail||G.day>e.dl)return no('That activity is over.');
 if(yes&&!e.going.includes(u))e.going.push(u);if(!yes)e.going=e.going.filter(x=>x!==u);g.mem[u].last=G.day;if(!g.fi){g.fi=true;gtrack('first_interaction',g,{by:u})}return true}
function attendEvent(gid,eid){const g=gguard(gid,'player','rsvp');if(!g)return false;const e=g.evs.find(x=>x.id===eid&&x.kind==='meetup');if(!e)return no('That event is gone.');
 if(!e.going.includes('player'))return no('RSVP first.');if(e.att.includes('player'))return no('You already went.');if(G.day!==e.day)return no(G.day<e.day?'It happens on Day '+e.day+'.':'That event has passed.');
 if(G.p.loc!==e.loc)return no('Go to '+LOCS[e.loc].n+' first.');if(!canTime(2))return no(LATE);
 e.att.push('player');const others=e.going.filter(m=>m!=='player'&&npc(m)&&!G.blk.includes(m));
 others.forEach(m=>{const n=npc(m);if(!n.met)n.met=true;n.lastSeen=G.day;rel(m,2,'Met at a group event')});
 G.p.happiness=clamp(G.p.happiness+8);G.p.social=clamp(G.p.social+1);addRep(1,'Showed up for a group event');
 fx(others.length?others.slice(0,3).map(m=>npc(m).n).join(', ')+' (NPC) joined you.':'You were first there.','warm');
 gtrack('activity_completed',g,{by:'player',kind:'meetup'});g.last=G.day;tick(2);return true}
function gProgress(type,n=1){if(!G.groups)return;G.groups.forEach(g=>{if(g.dead||!g.mem.player)return;g.evs.forEach(e=>{
 if(e.kind!=='challenge'||e.type!==type||e.done||e.fail||G.day>e.dl||!e.going.includes('player'))return;e.prog.player=(e.prog.player||0)+n;g.mem.player.last=G.day;gChk(g,e)})})}

/* ---- Ajo link: a proposal only. The real Ajo is made, joined and paid through the existing Ajo rules. ---- */
function proposeAjo(gid,u,o){const g=gguard(gid,u,'proposeAjo');if(!g)return false;
 if(u==='player'&&(G.p.trust<40||blocked()))return no('You need Trust 40+ and no Ajo block to propose a circle.');
 if(g.ajoP.some(p=>p.st==='proposed'))return no('There is already an open proposal. Settle it first.');
 const size=clamp(parseInt(o.size)||5,3,12),amt=clamp(parseInt(o.amt)||5000,500,500000),freq=[3,7,14].includes(+o.freq)?+o.freq:7;
 if(!grate(u,'ajop',2))return false;
 const p={id:'ap'+G.nid++,by:u,name:String(o.name||g.name+' Ajo').trim().slice(0,24)||'Group Ajo',size,amt,freq,day:G.day,st:'proposed',int:[],ajo:null};g.ajoP.push(p);
 gPush(g,u,'📌 Proposal: a separate Ajo of '+fmt(amt)+' every '+freq+' days for '+size+' people. Nobody is signed up. Read the terms before deciding.','msg',null);return p.id}
function expressInterest(gid,u,pid,yes=true){const g=gguard(gid,u,'rsvp');if(!g)return false;const p=g.ajoP.find(x=>x.id===pid&&x.st==='proposed');if(!p)return no('That proposal is closed.');
 p.int=p.int.filter(x=>x!==u);if(yes)p.int.push(u);return true}
function dismissProposal(gid,u,pid){const g=gguard(gid,u,'proposeAjo');if(!g)return false;const p=g.ajoP.find(x=>x.id===pid&&x.st==='proposed');if(!p)return no('That proposal is closed.');
 if(p.by!==u&&!gcan(g,u,'editInfo'))return no('Only the proposer or an admin can close this.');p.st='closed';return true}
function ajoFromProposal(gid,u,pid){const g=gguard(gid,u,'proposeAjo');if(!g)return false;const p=g.ajoP.find(x=>x.id===pid&&x.st==='proposed');if(!p)return no('That proposal is closed.');
 if(p.by!==u&&!gcan(g,u,'editInfo'))return no('Only the proposer or an admin can set up the Ajo.');
 const id=createAjo(p.name,p.size,p.amt,p.freq);if(!id)return false;ajoOf(id).group=g.id;p.st='created';p.ajo=id;
 gPush(g,u,'✅ "'+p.name+'" now exists as its own Ajo circle. Group membership is not Ajo membership: review the terms and join only if you want to.','msg',null);return id}
function ajosFor(g,v){if(!g||!g.mem[v])return [];return G.ajos.filter(a=>a.group===g.id).map(a=>({id:a.id,name:a.name,status:a.status,amt:a.amt,freq:a.freq,size:a.size,count:a.members.length}))}

/* ---- what each viewer is allowed to see ---- */
function glimpse(g){return {id:g.id,name:g.name,av:g.av,photo:g.photo||null,desc:g.desc,cat:g.cat,tags:g.tags.slice(),vis:g.vis,disc:g.disc,join:g.join,area:g.area,count:gcount(g)}}
const upcoming=g=>g.evs.filter(e=>!e.done&&!e.fail&&G.day<=e.dl).map(e=>({id:e.id,title:e.title,kind:e.kind,loc:e.loc,day:e.day,type:e.type,target:e.target,dl:e.dl,going:e.going.length}));
function viewGroup(gid,v='player'){const g=grp(gid);if(!g||g.ban.includes(v))return null;const b=glimpse(g);
 if(g.mem[v])return {...b,member:true,role:g.mem[v].role,rules:g.rules.slice(),announcements:g.posts.filter(p=>p.kind==='announce'&&!p.hid).slice(-3).reverse().map(p=>({...p})),events:upcoming(g),ajos:ajosFor(g,v)};
 if(g.vis==='public')return {...b,member:false,rules:g.rules.slice(),announcements:g.posts.filter(p=>p.kind==='announce'&&!p.hid).slice(-3).reverse().map(p=>({...p})),events:upcoming(g)};
 if(g.disc||g.inv.some(i=>i.to===v&&invState(i)==='pending'))return {...b,member:false,gated:true};
 return null}
function memberList(gid,v='player'){const g=grp(gid);if(!g||!g.mem[v])return null;if(g.roster==='admins'&&rk(g,v)<3)return {hidden:true,count:gcount(g)};
 return Object.keys(g.mem).sort((a,b)=>rk(g,b)-rk(g,a)||g.mem[a].joined-g.mem[b].joined).map(id=>({id,name:nm(id),role:g.mem[id].role,npc:id!=='player',joined:g.mem[id].joined}))}
function discoverable(v='player'){return G.groups.filter(g=>!g.dead&&!g.mem[v]&&!g.ban.includes(v)&&(g.vis==='public'||g.disc))}
function searchGroups(q='',cat='',v='player'){q=String(q).trim().toLowerCase();return discoverable(v).filter(g=>(!cat||g.cat===cat||g.tags.includes(cat))&&(!q||(g.name+' '+g.desc+' '+g.cat+' '+g.tags.join(' ')).toLowerCase().includes(q))).map(glimpse)}
function discoverSections(v='player'){const all=discoverable(v),ints=G.p.ints||[],P=g=>g.vis==='public';
 const friendsOf=g=>Object.keys(g.mem).filter(m=>m!=='player'&&P(g)&&g.mem[m].show&&npc(m)&&npc(m).met&&npc(m).rel>=60&&!G.blk.includes(m));
 return {rec:all.filter(g=>ints.includes(g.cat)||g.tags.some(t=>ints.includes(t))).map(glimpse),
  friends:all.filter(g=>friendsOf(g).length).map(g=>({...glimpse(g),via:friendsOf(g).map(m=>npc(m).n)})),
  nearby:G.p.shareArea&&G.p.area?all.filter(g=>P(g)&&g.area===G.p.area).map(glimpse):[],
  biz:all.filter(g=>g.cat==='Business'||g.cat==='Creators').map(glimpse),
  game:all.filter(g=>P(g)&&g.evs.some(e=>!e.done&&!e.fail&&G.day<=e.dl)).map(glimpse)}}
/* public profile: only PUBLIC groups the person chose to show. Private memberships never appear. */
function profileGroups(uid){return G.groups.filter(g=>!g.dead&&g.vis==='public'&&g.mem[uid]&&g.mem[uid].show).map(glimpse)}
function setShow(gid,u,on){const g=grp(gid);if(!g||!g.mem[u])return no('You are not in this group.');if(on&&g.vis!=='public')return no('Private group membership never appears on your profile.');g.mem[u].show=!!on;return true}
function blockUser(id){if(!npc(id))return no('You can only block people you can see.');if(!G.blk.includes(id))G.blk.push(id);
 G.groups.forEach(g=>{if(!g.dead&&g.owner==='player'&&g.mem[id]){dropMember(g,id);if(!g.ban.includes(id))g.ban.push(id)}});return true}
function unblockUser(id){G.blk=G.blk.filter(x=>x!==id);return true}
function visitGroup(gid){const g=grp(gid);if(!g||!g.mem.player)return;const m=g.mem.player;if(G.day-m.last>=7)gtrack('group_returned_7d',g,{by:'player'});m.last=G.day}

/* ---- analytics (local only, nothing is sent anywhere). Participation first, invitation volume last. ---- */
function groupMetrics(){const ev=G.gev,c=t=>ev.filter(e=>e.type===t).length,mine=G.groups.filter(g=>!g.dead&&g.mem.player);
 const posted=g=>g.posts.some(p=>p.by==='player'&&p.kind==='msg'&&G.day-p.day<14);
 const sent=c('invitation_sent'),acc=c('invitation_accepted');
 return {groups:mine.length,activeThisWeek:mine.filter(g=>G.day-g.mem.player.last<7).length,conversational:mine.filter(posted).length,activities:c('activity_completed'),
  firstInteractions:c('first_interaction'),returned7:c('group_returned_7d'),inactive:c('group_inactive'),created:c('group_created'),
  requests:c('join_request_submitted'),approved:c('membership_approved'),sent,accepted:acc,acceptRate:sent?acc/sent:null,memberInvites:c('member_invited_member')}}

/* ---- the simulated world moves on each morning ---- */
function groupInviteCheck(n){if(!G.groups)return;G.groups.forEach(g=>{if(g.dead||g.owner!==n.id||g.vis!=='private'||g.mem.player||g.ban.includes('player')||G.blk.includes(n.id))return;
 if(!n.met||n.rel<36||g.inv.some(i=>i.to==='player'))return;
 g.inv.push({id:'i'+G.nid++,code:null,by:n.id,to:'player',day:G.day,exp:G.day+14,max:1,uses:0,acc:[],rev:false,dec:false,resent:0});gtrack('invitation_sent',g,{by:n.id,direct:true});
 note(n.n+' invited you to a private group, '+g.name+'.','grp');fx(n.n+' invited you to a group!','warm')})}
function groupsDaily(){
  maybeNpcFriendRequests();
  resolvePendingFriendReqs();
if(!G.groups)return;G.rl={};G.cf={};
 G.groups.forEach(g=>{if(g.dead)return;const mems=Object.keys(g.mem),npcs=mems.filter(m=>npc(m)&&!G.susp.includes(m)),staffMe=rk(g,'player')>=2;
  if(g.owner!=='player'&&g.mem[g.owner])g.mem[g.owner].last=G.day;
  if(npcs.length&&Math.random()<.5){const t=pick(CHAT[g.cat]||CHAT['Friends & Family']);if(!g.posts.slice(-6).some(p=>p.txt===t))gPush(g,pick(npcs),t,'msg',null)}
  if(g.owner!=='player'&&npc(g.owner)&&Math.random()<.12){
   if(Math.random()<.5&&!g.evs.some(e=>!e.done&&!e.fail&&G.day<=e.dl)){const loc=pick(G_LOCS);const d=G.day+ri(2,3);g.evs.push({id:'e'+G.nid++,by:g.owner,title:'Meet-up at '+LOCS[loc].n,kind:'meetup',loc,day:d,type:null,target:null,dl:d,going:[g.owner],att:[],prog:{},done:false,fail:false});if(g.mem.player)gnote(g.name+': new event, Meet-up at '+LOCS[loc].n+' on Day '+d+'.')}
   else gPush(g,g.owner,pick(['Please read the group rules again before posting.','Thank you all for keeping this a good place.','New members: say hello and tell us what you do!']),'announce',null)}
  g.evs.forEach(e=>{if(e.done||e.fail)return;npcs.forEach(m=>{if(!e.going.includes(m)&&Math.random()<.3)e.going.push(m)});
   if(e.kind==='challenge'){e.going.filter(m=>m!=='player').forEach(m=>{if(Math.random()<.45)e.prog[m]=(e.prog[m]||0)+1});gChk(g,e);
    if(!e.done&&G.day>e.dl){e.fail=true;if(e.going.includes('player'))gnote(g.name+': the challenge "'+e.title+'" ended before the goal.')}}});
  g.evs=g.evs.filter(e=>G.day-e.dl<=10);
  if(g.owner==='player'&&mems.length<14&&Math.random()<.3&&(g.vis==='public'||g.disc)){
   const c=G.npcs.filter(n=>!g.mem[n.id]&&!g.ban.includes(n.id)&&!g.req.includes(n.id)&&(NPC_CATS[n.id]||[]).includes(g.cat)&&!G.blk.includes(n.id));
   if(c.length){const n=pick(c);if(g.vis==='public'&&g.join==='open'){addMember(g,n.id);gtrack('membership_joined',g,{by:n.id});gnote(n.n+' (NPC) joined '+g.name+'.')}
    else if(g.join==='approval'){g.req.push(n.id);gtrack('join_request_submitted',g,{by:n.id});gnote(n.n+' (NPC) asked to join '+g.name+'.')}}}
  if(npc(g.owner)&&g.req.includes('player')){if(Math.random()<clamp(.45+G.p.trust/200,.3,.9)){addMember(g,'player');gtrack('membership_approved',g,{by:g.owner,u:'player'});gnote('You were approved to join '+g.name+'.')}else{g.req=g.req.filter(x=>x!=='player');gnote(g.name+' declined your request to join.')}}
  if(!staffMe)g.reps.filter(r=>r.st==='open'&&r.day<G.day).forEach(r=>{const p=g.posts.find(x=>x.id===r.pid);if(Math.random()<.7){if(p)p.hid=true;r.st='actioned';if(r.by==='player')gnote(g.name+': a moderator (NPC) hid the post you reported.')}else{r.st='dismissed';if(r.by==='player')gnote(g.name+': moderators (NPC) reviewed your report and took no action.')}});
  const o=g.mem[g.owner];if(o&&mems.length>1){const idle=G.day-o.last;
   if(g.owner==='player'&&idle===OWNER_IDLE-5)gnote(g.name+': you have been away 25 days. Ownership will pass to '+nm(nextOwner(g,'player'))+' in 5 days unless you visit.');
   if(idle>=OWNER_IDLE)succeed(g,'the owner was inactive for '+OWNER_IDLE+' days',g.owner)}
  if(g.mem.player&&G.day-g.mem.player.last>=14&&!g.idleFlag){g.idleFlag=true;gtrack('group_inactive',g)}if(g.mem.player&&G.day-g.mem.player.last<14)g.idleFlag=false});
 G.groups=G.groups.filter(g=>!g.dead||G.day-g.created<400)}

function seedGroups(){let k=0;const mk=(o,owner,mem,posts,evs)=>{const g=mkGroup(o,owner);mem.forEach(id=>{if(id!==owner)g.mem[id]={role:'member',joined:0,last:0,show:g.vis==='public'&&id!=='abdullahi'}});
  g.mem[owner].last=0;g.mem[owner].show=g.vis==='public';(posts||[]).forEach(([by,txt,kind])=>g.posts.push({id:'ps'+(++k),by,day:0,hr:9,kind:kind||'msg',txt,parent:null,hid:false}));g.evs=(evs||[]).map(e=>({kind:'meetup',type:null,target:null,att:[],prog:{},done:false,fail:false,...e}));if(g.posts.length)g.fi=true;return g};
 const d=G.day;
 return [
  mk({id:'gs1',name:'Kano Football Lovers',av:'⚽',desc:'Match days, kick-abouts and friendly arguments about the league.',cat:'Sports',tags:['Gaming'],area:'Nasarawa',vis:'public',join:'open',rules:['Respect every club.','No abuse or insults.']},'bashir',['bashir','yusuf','garba','abdullahi'],
   [['bashir','Weekend match at Keke Park. Bring your people!','announce'],['yusuf','I am in. Who is bringing the ball?']],[{id:'es1',by:'bashir',title:'Saturday match at Keke Park',loc:'park',day:d+2,dl:d+2,going:['bashir','yusuf']}]),
  mk({id:'gs2',name:'Northern Creators',av:'🎨',desc:'Tailors, photographers, musicians and makers sharing work and gigs.',cat:'Creators',tags:['Food & Music'],vis:'public',join:'approval',rules:['Share your own work.','Credit other makers.']},'aisha',['aisha','rukayya','fatima'],
   [['aisha','Welcome! Introduce yourself and what you make.','announce'],['rukayya','Anyone need a hairstylist for the next wedding season?']]),
  mk({id:'gs3',name:'Small Business Owners',av:'💼',desc:'Stall owners and shopkeepers swapping tips on stock, prices and customers.',cat:'Business',vis:'public',join:'open',rules:['No selling to the group.','Be honest about prices.']},'halima',['halima','musa','ibrahim','hauwa'],
   [['halima','Shop talk week: let us all talk to more customers. Join the challenge!','announce'],['musa','Rice price dropped slightly at Kasuwa this morning.']],
   [{id:'es2',by:'halima',title:'Shop talk week',kind:'challenge',type:'talk',target:12,dl:d+6,going:['halima','musa']}]),
  mk({id:'gs4',name:'Fagge Neighbourhood',av:'🏘️',desc:'Updates, help and good neighbours on our side of town.',cat:'Neighbourhood',area:'Fagge',vis:'public',join:'open',rules:['Be kind to neighbours.','No politics, please.']},'garba',['garba','hauwa','zainab'],
   [['garba','Gate closes at 10pm. Please carry your keys.','announce']]),
  mk({id:'gs5',name:'Suya Spot Regulars',av:'🔥',desc:'For the people who are always at the Suya Spot.',cat:'Food & Music',vis:'private',join:'invite',rules:['What happens at the Suya Spot stays at the Suya Spot.']},'rukayya',['rukayya','sani','bashir'],
   [['sani','Secret: the new suya guy gives extra on Fridays.']]),
  mk({id:'gs6',name:'Kasuwa Traders Club',av:'🛒',desc:'A private club for market traders. Ask to join.',cat:'Business',vis:'private',disc:true,join:'approval',rules:['Traders only.','Keep prices private.']},'musa',['musa','dauda','aisha'],
   [['musa','Meeting about stall fees next week. Members only.','announce']])]}
function initGroups(){G.groups=seedGroups();G.gev=[];G.blk=[];G.susp=[];G.rl={};G.cf={};G.p.ints=G.p.ints||[];G.p.shareArea=false;G.p.area=null}
/* older saves have no groups yet: add them without touching anything else */

/* ========== PLACES LAYER: Home + Business + Kano map (offline-ready) ==========
 * Approximate areas only — no exact GPS. Businesses are community nodes.
 * Multiplayer: same schema maps to Supabase tables later.
 */
const KANO_MAP={
  // grid positions for stylised city map (0–100) + real lat/lng for live map
  center:{lat:12.0022,lng:8.5919,zoom:13},
  areas:{
    'Fagge':{x:62,y:48,lat:12.0020,lng:8.5355,blurb:'Old trading heart near the city centre.'},
    'Nasarawa':{x:55,y:62,lat:11.9780,lng:8.5520,blurb:'Busy residential and market stretch.'},
    'Dala':{x:40,y:40,lat:12.0180,lng:8.5080,blurb:'Hills, history, tight neighbourhoods.'},
    'Gwale':{x:48,y:55,lat:11.9900,lng:8.5200,blurb:'Dense compounds and street trade.'},
    'Tarauni':{x:70,y:58,lat:11.9720,lng:8.5800,blurb:'Growing residential and small shops.'},
    'Kano Municipal':{x:58,y:42,lat:12.0000,lng:8.5320,blurb:'Core municipal life and offices.'},
    'Kumbotso':{x:75,y:72,lat:11.9400,lng:8.5500,blurb:'Outer growth, workshops, new estates.'},
    'Ungogo':{x:45,y:28,lat:12.0500,lng:8.5000,blurb:'Northern edge of the urban sprawl.'}
  },
  publicNodes:[
    {id:'kn_kasuwa',n:'Kasuwa Market',ic:'🛒',area:'Fagge',x:64,y:46,lat:12.0005,lng:8.5310,kind:'market'},
    {id:'kn_mama',n:'Mama Put Row',ic:'🍲',area:'Gwale',x:50,y:56,lat:11.9915,lng:8.5215,kind:'food'},
    {id:'kn_suya',n:'Suya Junction',ic:'🔥',area:'Nasarawa',x:56,y:64,lat:11.9795,lng:8.5540,kind:'social'},
    {id:'kn_park',n:'Keke Park',ic:'🛺',area:'Kano Municipal',x:60,y:44,lat:12.0015,lng:8.5345,kind:'transport'},
    {id:'kn_bank',n:'Arewa Bank Strip',ic:'🏦',area:'Kano Municipal',x:57,y:40,lat:12.0030,lng:8.5290,kind:'bank'}
  ]
};
function areaCoords(area){
  const a=KANO_MAP.areas[area];
  if(a&&a.lat!=null) return {lat:a.lat,lng:a.lng};
  return {lat:KANO_MAP.center.lat,lng:KANO_MAP.center.lng};
}
function nearestArea(lat,lng){
  let best=null,bd=1e9;
  Object.entries(KANO_MAP.areas).forEach(([name,a])=>{
    if(a.lat==null) return;
    const d=(a.lat-lat)*(a.lat-lat)+(a.lng-lng)*(a.lng-lng);
    if(d<bd){bd=d;best=name}
  });
  return best||'Fagge';
}

function personMapCoords(entity){
  // entity: player object or npc
  if(entity===G.p||(entity&&entity===G.p)){
    const loc=G.p.loc, L=LOCS[loc];
    let base;
    if(L&&L.area) base=areaCoords(L.area);
    else if(G.p.home&&G.p.home.area) base=areaCoords(G.p.home.area);
    else base={lat:KANO_MAP.center.lat,lng:KANO_MAP.center.lng};
    return {lat:base.lat+0.001,lng:base.lng-0.001};
  }
  const n=entity;
  const loc=npcLoc(n);
  const L=LOCS[loc];
  let base;
  if(L&&L.area) base=areaCoords(L.area);
  else if(n.homeArea) base=areaCoords(n.homeArea);
  else base={lat:KANO_MAP.center.lat,lng:KANO_MAP.center.lng};
  // Stable jitter so people don't stack
  const h=hash(n.id+'map');
  const jlat=((h%11)-5)*0.0012;
  const jlng=(((h>>4)%11)-5)*0.0012;
  return {lat:base.lat+jlat,lng:base.lng+jlng};
}
function npcAvatarFor(n){
  if(n.avatar) return n.avatar;
  // Deterministic look from id so each NPC has a stable character face
  const skins=['s2','s3','s4','s5','s6'];
  const hairsM=['fade','short','afro','locs','bald'];
  const hairsF=['braids','longbraids','afro','afropuff','gele'];
  const tops=['tee','dashiki','ankara','shirt'];
  const fem=/aisha|fatima|maryam|hauwa|halima|zainab|aisha/i.test(n.id)||/aisha|fatima|maryam|hauwa|halima/i.test(n.n||'');
  const h=hash(n.id+'av');
  const gender=fem?'Female':'Male';
  return {
    gender,
    skin:skins[h%skins.length],
    face:fem?'heart':'oval',
    hair:fem?hairsF[h%hairsF.length]:hairsM[h%hairsM.length],
    hairColor:'black',
    eyes:'almond',
    brows:fem?'arched':'full',
    nose:'medium',
    mouth:fem?'full':'smile',
    facial:fem?'none':(['none','none','beard','mustache'][h%4]),
    accessory:fem?(h%2?'hoops':'none'):'none',
    top:tops[h%tops.length]
  };
}
function peopleOnMap(){
  const list=[];
  // Player always
  if(G&&G.p){
    const c=personMapCoords(G.p);
    list.push({id:'player',kind:'person',me:true,n:G.p.name||'You',sub:'You · '+(LOCS[G.p.loc]?LOCS[G.p.loc].n:''),lat:c.lat,lng:c.lng,avatar:G.p.avatar||defaultAvatar(G.p.gender),em:null});
  }
  // Met NPCs (and optionally nearby)
  G.npcs.filter(n=>n.met&&!(G.blk||[]).includes(n.id)).forEach(n=>{
    const c=personMapCoords(n);
    const where=LOCS[npcLoc(n)];
    list.push({id:n.id,kind:'person',me:false,n:n.n,sub:(where?where.ic+' '+where.n:'')+' · '+relLabelPeople(n),lat:c.lat,lng:c.lng,avatar:npcAvatarFor(n),em:n.em,npc:n});
  });
  return list;
}
function relLabelPeople(n){
  if(typeof isFriend==='function'&&isFriend(n.id)) return 'Friend';
  if(n.rel>=60) return 'Friend';
  if(n.rel>=35) return 'Acquaintance';
  return 'Neighbour';
}

const BIZ_CATS=['Provisions','Food & Kitchen','Fashion','Phones & Tech','Services','Transport','Beauty','Other'];
const WORK_CATS=['Trader','Food & Kitchen','Fashion','Phones & Tech','Services','Transport','Beauty','Farmer','Teacher','Student','Civil service','Driver','Artisan','Other'];

const HOME_STYLES=[{id:'compound',n:'Family compound',ic:'🏠'},{id:'flat',n:'Self-contain / flat',ic:'🏢'},{id:'room',n:'Single room',ic:'🛏️'},{id:'estate',n:'Estate house',ic:'🏡'}];

function initPlaces(){
  if(!G.p.home) G.p.home={area:G.p.area||'',label:'',style:'compound',done:false};
  if(G.p.area&&!G.p.home.area) G.p.home.area=G.p.area;
  if(!G.bizs) G.bizs=[];
  if(!G.visits) G.visits=[];
  if(!G.chats) G.chats={};
  if(!G.spots) G.spots=[];
  if(!G.friendReqs) G.friendReqs=[];
  if(!G.treatReqs) G.treatReqs=[];
  if(!G.p.nearbyOptIn) G.p.nearbyOptIn=false;
  // Seed a few NPC businesses once
  // Top-up seed Kano businesses (new installs + older saves)
  {
    const seeds=[
      {id:'bz_musa',owner:'musa',name:'Musa Provisions',cat:'Provisions',area:'Fagge',label:'Near Kasuwa gate',loc:'market',ic:'🏪',bio:'Rice, oil, soap — fair measure at the market.',open:true,
        img:'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=80'},
      {id:'bz_aisha',owner:'aisha',name:"Aisha's Stitches",cat:'Fashion',area:'Gwale',label:'By the primary school',loc:'market',ic:'🧵',bio:'Ankara, alterations, school uniforms.',open:true,
        img:'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=600&q=80'},
      {id:'bz_sani',owner:'sani',name:'Sani Phones',cat:'Phones & Tech',area:'Tarauni',label:'Along the main road',loc:'market',ic:'📱',bio:'Screens, chargers, airtime.',open:true,
        img:'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80'},
      {id:'bz_fatima',owner:'fatima',name:"Fatima's Kitchen",cat:'Food & Kitchen',area:'Gwale',label:'Mama Put Row',loc:'restaurant',ic:'🍲',bio:'Jollof, tuwo, and party catering.',open:true,
        img:'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&q=80'},
      {id:'bz_yusuf',owner:'yusuf',name:'Yusuf Keke Hub',cat:'Transport',area:'Kano Municipal',label:'Keke Park stand',loc:'park',ic:'🛺',bio:'Short hops across the municipal.',open:true,
        img:'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&q=80'},
      {id:'bz_halima',owner:'halima',name:'Halima Beauty',cat:'Beauty',area:'Nasarawa',label:'Near Suya Junction',loc:'social',ic:'💅',bio:'Braids, gel, and evening looks.',open:true,
        img:'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80'},
      {id:'bz_ibrahim',owner:'ibrahim',name:'Ibrahim Desk Services',cat:'Services',area:'Kano Municipal',label:'Bank strip offices',loc:'bank',ic:'📋',bio:'Forms, photocopies, small business help.',open:true,
        img:'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80'},
      {id:'bz_hauwa',owner:'hauwa',name:'Hauwa Fresh Fruit',cat:'Provisions',area:'Fagge',label:'Kasuwa edge',loc:'market',ic:'🍊',bio:'Seasonal fruit, early morning stock.',open:true,
        img:'https://images.unsplash.com/photo-1619566636858-adf3ef4644b9?w=600&q=80'}
    ];
    seeds.forEach(b=>{
      if(G.bizs.some(x=>x.id===b.id)) return;
      if(b.owner!=='player'&&!npc(b.owner)) return;
      G.bizs.push({...b,avatar:defaultStoreAvatar(b.cat||'Other'),trust:40+Math.floor(Math.random()*20),visits:0,created:G.day,products:[
        {id:'p1',n:b.cat==='Fashion'?'Alteration / piece':(b.cat==='Food & Kitchen'?'Plate of the day':(b.cat==='Transport'?'Short hop':'Everyday goods')),price:b.cat==='Fashion'?2500:(b.cat==='Food & Kitchen'?1500:2000)}
      ]});
    });
  }
  // Seed a few community spots in Kano if empty (demo neighbours' hangouts)
  if(!(G.spots||[]).some(s=>s.by!=='player'&&!s.removed)){
    const seedSpots=[
      {id:'sp_seed_1',name:'Kurmi Market shade',area:'Fagge',label:'Under the old trees',ic:'🌳',note:'Traders rest here between sales.',by:'community',loc:'market',public:true,created:1,lat:12.0008,lng:8.5305,
        img:'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&q=80'},
      {id:'sp_seed_2',name:'Gwale evening suya bench',area:'Nasarawa',label:'Suya Junction corner',ic:'🔥',note:'Friends meet after work.',by:'community',loc:'social',public:true,created:1,lat:11.9798,lng:8.5542,
        img:'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600&q=80'},
      {id:'sp_seed_3',name:'Municipal motor-park stall',area:'Kano Municipal',label:'Keke Park',ic:'🚏',note:'Drivers and passengers share news.',by:'community',loc:'park',public:true,created:1,lat:12.0018,lng:8.5348,
        img:'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80'},
      {id:'sp_seed_4',name:'Mosque yard circle',area:'Fagge',label:'After jumuah',ic:'🕌',note:'Quiet place for Ajo talk.',by:'community',loc:'ajo',public:true,created:1,lat:12.0035,lng:8.5280,
        img:'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=600&q=80'}
    ];
    seedSpots.forEach(s=>G.spots.push(s));
  }
  // Assign neighbourhoods so "nearby" works offline
  const areaCycle=allAreas();
  G.npcs.forEach((n,i)=>{ if(!n.homeArea) n.homeArea=areaCycle[i%areaCycle.length]; });
}
function setHome(area,label,style){
  if(!GANO_AREAS_HAS(area)) return fx('Pick a real Kano area.','warn');
  G.p.home={area,label:(label||'').slice(0,40),style:style||'compound',done:true};
  G.p.area=area; G.p.shareArea=true;
  note('Home set in '+area+(label?(' · '+label):'')+'. Neighbours in this area can discover you when you opt in.');
  return true;
}
function GANO_AREAS_HAS(a){return !!(KANO_MAP.areas[a]||G_AREAS.includes(a))}
function allAreas(){return Object.keys(KANO_MAP.areas)}
function createPlayerBiz({name,cat,area,label,ic,bio,avatar}){
  name=(name||'').trim().slice(0,28); if(name.length<2) return fx('Name your business.','warn');
  if(!BIZ_CATS.includes(cat)) cat='Other';
  if(!GANO_AREAS_HAS(area)) return fx('Choose an area for the shop.','warn');
  if(G.bizs.some(b=>b.owner==='player'&&!b.closed)) return fx('You already run a listed business. Edit it instead.','warn');
  const id='bz_p_'+Date.now().toString(36);
  const areaLoc={Fagge:'market',Gwale:'restaurant',Nasarawa:'social','Kano Municipal':'work',Tarauni:'market',Dala:'social',Kumbotso:'market',Ungogo:'park'};
  const b={id,owner:'player',name,cat,area,label:(label||'').slice(0,40),ic:ic||'🏪',bio:(bio||'').slice(0,120),open:true,trust:45,visits:0,created:G.day,
    loc:areaLoc[area]||'market',
    products:[{id:'p1',n:'Popular item',price:2000}],
    avatar:(avatar&&avatar.kind==='building'?avatar:null)||defaultStoreAvatar(cat)};
  G.bizs.push(b);
  note('Business listed: '+name+' in '+area+'. Your store character is visible to visitors.');
  return b;
}
function defaultStoreAvatar(cat){
  // Building / storefront character — not a human
  const byCat={
    'Provisions':{style:'kiosk',wall:'cream',roof:'tin',sign:'board',door:'open',window:true},
    'Food & Kitchen':{style:'stall',wall:'red',roof:'awning',sign:'painted',door:'open',window:false},
    'Fashion':{style:'boutique',wall:'blue',roof:'flat',sign:'board',door:'closed',window:true},
    'Phones & Tech':{style:'shop',wall:'blue',roof:'flat',sign:'board',door:'open',window:true},
    'Services':{style:'shop',wall:'sand',roof:'tin',sign:'board',door:'closed',window:true},
    'Transport':{style:'container',wall:'yellow',roof:'flat',sign:'painted',door:'open',window:false},
    'Beauty':{style:'boutique',wall:'green',roof:'awning',sign:'board',door:'curtain',window:true},
    'Other':{style:'shop',wall:'cream',roof:'tin',sign:'board',door:'open',window:true}
  };
  const base=byCat[cat]||byCat['Other'];
  return Object.assign({store:true,kind:'building',ic:'🏪'}, base);
}
function storeAvatarFromBiz(b){
  if(b&&b.avatar&&b.avatar.kind==='building') return b.avatar;
  // Upgrade old human-style store avatars to buildings
  return defaultStoreAvatar(b&&b.cat);
}
function setStoreAvatar(parts){
  const b=playerBiz(); if(!b) return no('List a business first.');
  b.avatar=Object.assign({},storeAvatarFromBiz(b),parts||{},{store:true,kind:'building'});
  return true;
}
function setWorkProfile(cat,title){
  if(!WORK_CATS.includes(cat)) cat='Other';
  G.p.work={cat,title:(title||'').trim().slice(0,40),set:true};
  note('You work as: '+(title||cat)+'.','ajo');
  return true;
}
function playerBiz(){return G.bizs.find(b=>b.owner==='player'&&!b.closed)||null}
function bizById(id){return G.bizs.find(b=>b.id===id)}
function bizesInArea(area){return G.bizs.filter(b=>!b.closed&&b.area===area)}
function nearbyPeople(){
  if(!G.p.home||!G.p.home.area||!G.p.nearbyOptIn) return [];
  const a=G.p.home.area;
  return G.npcs.filter(n=>n.met&&!G.blk.includes(n.id)&&(n.area===a||(n.spots&&n.homeArea===a)||(bizByOwner(n.id)&&bizByOwner(n.id).area===a)));
}

/* ---- Custom spots (community hangouts) ---- */
const SPOT_ICS=['📍','🕌','🏟️','🌳','☕','🛒','🏫','🏥','🚏','🎵'];
function addSpot({name,area,label,ic,note,loc,img,lat,lng,address}){
  name=(name||'').trim().slice(0,32);
  if(name.length<2) return fx('Name your spot.','warn');
  let latN=lat!=null?Number(lat):null, lngN=lng!=null?Number(lng):null;
  if(latN!=null&&lngN!=null&&!isNaN(latN)&&!isNaN(lngN)){
    // Keep pins around Kano metro (rough bounds)
    if(latN<11.7||latN>12.3||lngN<8.2||lngN>8.9) return fx('Pin a location in the Kano area.','warn');
    if(!area||!GANO_AREAS_HAS(area)) area=nearestArea(latN,lngN);
  } else {
    latN=null;lngN=null;
    if(!GANO_AREAS_HAS(area)) return fx('Pick a Kano area or drop a pin on the map.','warn');
  }
  if((G.spots||[]).filter(s=>s.by==='player'&&!s.removed).length>=12) return fx('You already listed 12 spots.','warn');
  const id='sp_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  const locKey=loc&&LOCS[loc]?loc:null;
  if(latN==null){
    const c=areaCoords(area);
    latN=c.lat+(Math.random()-.5)*0.008;
    lngN=c.lng+(Math.random()-.5)*0.008;
  }
  const s={id,name,area,label:(label||'').trim().slice(0,48),ic:ic||'📍',note:(note||'').trim().slice(0,120),by:'player',created:G.day,public:true,loc:locKey,img:(img||'').trim().slice(0,300)||null,lat:latN,lng:lngN,address:(address||'').trim().slice(0,80)||null};
  G.spots.push(s);
  note('Spot added: '+s.name+' in '+s.area+(s.address?(' · '+s.address):'')+'. Friends can find it on the live map.','ajo');
  fx('Spot listed on the map','good');
  return s;
}
function visitSpot(id){
  const s=(G.spots||[]).find(x=>x.id===id&&!x.removed);
  if(!s) return fx('Spot not found.','warn');
  // Travel to linked daily place if any, else stay and open map focus
  if(s.loc&&LOCS[s.loc]&&G.p.loc!==s.loc){
    travel(s.loc);
  }
  G.p.lastSpot=s.id;
  note('You checked in near '+s.name+(s.area?(' · '+s.area):'')+'.','ajo');
  fx('At '+s.name,'good');
  return true;
}
function removeSpot(id){
  const s=(G.spots||[]).find(x=>x.id===id&&x.by==='player');
  if(!s) return fx('Spot not found.','warn');
  s.removed=true;
  note('Removed spot: '+s.name);
  return true;
}
function mySpots(){return (G.spots||[]).filter(s=>s.by==='player'&&!s.removed)}
function communitySpots(){
  // Spots visible to the community: same home area when nearby is on, or any public player spots in known areas
  const area=(G.p.home&&G.p.home.done)?G.p.home.area:null;
  const list=(G.spots||[]).filter(s=>!s.removed&&s.public);
  if(!area||!G.p.nearbyOptIn) return list.filter(s=>s.by==='player');
  return list.filter(s=>s.area===area||s.by==='player');
}

function businessesAtLoc(locId){
  const L=LOCS[locId]; if(!L) return [];
  return (G.bizs||[]).filter(b=>!b.closed&&(b.loc===locId||(L.area&&b.area===L.area)));
}
function spotsAtLoc(locId){
  const L=LOCS[locId]; if(!L) return [];
  return (G.spots||[]).filter(s=>!s.removed&&s.public&&(s.loc===locId||(L.area&&s.area===L.area)));
}
function placeCover(locId){
  const L=LOCS[locId]; if(!L) return null;
  if(L.img) return L.img;
  const b=businessesAtLoc(locId).find(x=>x.img);
  if(b) return b.img;
  const s=spotsAtLoc(locId).find(x=>x.img);
  return s?s.img:null;
}

function peopleAtSpot(spotId){
  const s=(G.spots||[]).find(x=>x.id===spotId);
  if(!s) return [];
  // NPCs whose home area matches, or who have met and "frequent" this area
  return G.npcs.filter(n=>n.met&&!G.blk.includes(n.id)&&(n.homeArea===s.area||(bizByOwner(n.id)&&bizByOwner(n.id).area===s.area))).slice(0,8);
}

/* ---- Friend requests ---- */
function friendStatus(uid){
  if(!uid||uid==='player') return 'none';
  const reqs=G.friendReqs||[];
  if(reqs.some(r=>r.status==='accepted'&&((r.from==='player'&&r.to===uid)||(r.from===uid&&r.to==='player')))) return 'friends';
  if(reqs.some(r=>r.status==='pending'&&r.from==='player'&&r.to===uid)) return 'pending_out';
  if(reqs.some(r=>r.status==='pending'&&r.from===uid&&r.to==='player')) return 'pending_in';
  // Legacy close relationship still counts as friends for chat
  const n=npc(uid);
  if(n&&n.met&&n.rel>=60) return 'friends';
  return 'none';
}
function isFriend(uid){return friendStatus(uid)==='friends'}
function pendingFriendReqs(){return (G.friendReqs||[]).filter(r=>r.status==='pending'&&r.to==='player')}
function outgoingFriendReqs(){return (G.friendReqs||[]).filter(r=>r.status==='pending'&&r.from==='player')}
function sendFriendRequest(uid){
  const n=npc(uid); if(!n) return fx('Person not found.','warn');
  if(!n.met) return fx('Meet them in town first, then add as friend.','warn');
  if(G.blk.includes(uid)) return fx('You blocked this person.','warn');
  const st=friendStatus(uid);
  if(st==='friends') return fx('You are already friends with '+n.n+'.','warm');
  if(st==='pending_out') return fx('Friend request already sent.','warm');
  if(st==='pending_in') return acceptFriendRequest(pendingFriendReqs().find(r=>r.from===uid).id);
  const id='fr_'+Date.now().toString(36);
  G.friendReqs.push({id,from:'player',to:uid,status:'pending',day:G.day});
  note('Friend request sent to '+n.n+'. They can accept or reject.','ajo');
  // NPC auto-responds based on relationship + reliability (demo offline)
  const chance=clamp((n.rel||30)/100*0.7+(n.tr||50)/100*0.35+(n.tags.includes('social')?0.15:0),0.15,0.95);
  if(Math.random()<chance){
    const r=G.friendReqs.find(x=>x.id===id);
    if(r){r.status='accepted';r.resolvedDay=G.day;rel(uid,5,'Accepted your friend request');n.lastSeen=G.day;
      note(n.n+' accepted your friend request. You can chat now.','good');
      fx(n.n+' is now a friend','good');
    }
  } else if(n.rel<25&&Math.random()<0.5){
    const r=G.friendReqs.find(x=>x.id===id);
    if(r){r.status='rejected';r.resolvedDay=G.day;note(n.n+' declined your friend request.','info')}
  } else {
    note(n.n+' has not responded yet — check back later.','info');
  }
  return true;
}
function acceptFriendRequest(id){
  const r=(G.friendReqs||[]).find(x=>x.id===id&&x.status==='pending'&&x.to==='player');
  if(!r) return fx('Request not found.','warn');
  r.status='accepted';r.resolvedDay=G.day;
  const n=npc(r.from);
  if(n){rel(r.from,6,'You accepted their friend request');n.met=true;n.lastSeen=G.day;
    note('You and '+n.n+' are now friends. Chat is open.','good');
    fx('Friends with '+n.n,'good');
  }
  return true;
}
function rejectFriendRequest(id){
  const r=(G.friendReqs||[]).find(x=>x.id===id&&x.status==='pending'&&x.to==='player');
  if(!r) return fx('Request not found.','warn');
  r.status='rejected';r.resolvedDay=G.day;
  const n=npc(r.from);
  note(n?('Declined '+n.n+"'s friend request."):'Request declined.');
  return true;
}
function cancelFriendRequest(uid){
  const r=(G.friendReqs||[]).find(x=>x.status==='pending'&&x.from==='player'&&x.to===uid);
  if(!r) return fx('No pending request.','warn');
  r.status='cancelled';r.resolvedDay=G.day;
  note('Friend request cancelled.');
  return true;
}

function resolvePendingFriendReqs(){
  (G.friendReqs||[]).filter(r=>r.status==='pending'&&r.from==='player'&&r.day<G.day).forEach(r=>{
    const n=npc(r.to); if(!n){r.status='cancelled';return}
    const chance=clamp((n.rel||30)/100*0.75+(n.tr||50)/100*0.3,0.2,0.92);
    if(Math.random()<chance){r.status='accepted';r.resolvedDay=G.day;rel(r.to,4,'Accepted your friend request');note(n.n+' accepted your friend request. You can chat now.','good')}
    else if(Math.random()<0.4){r.status='rejected';r.resolvedDay=G.day;note(n.n+' declined your friend request.','info')}
  });
}

function maybeNpcFriendRequests(){
  // Occasional inbound requests from met NPCs who are not friends yet
  if(Math.random()>0.35) return;
  const cands=G.npcs.filter(n=>n.met&&!G.blk.includes(n.id)&&friendStatus(n.id)==='none'&&n.rel>=28);
  if(!cands.length) return;
  const n=pick(cands);
  if((G.friendReqs||[]).some(r=>r.from===n.id&&r.to==='player'&&r.status==='pending')) return;
  G.friendReqs.push({id:'fr_'+Date.now().toString(36),from:n.id,to:'player',status:'pending',day:G.day});
  note(n.n+' sent you a friend request.','ajo');
}

function bizByOwner(uid){return G.bizs.find(b=>b.owner===uid&&!b.closed)}

/* ---- Circle credit: buy now, deduct from pot on your turn ---- */
function activeCircles(){
  return (G.ajos||[]).filter(a=>a.status==='active'&&a.members.includes('player'));
}
function circleCreditPct(){
  const t=G.p.trust||0, r=G.p.rep||0;
  if(t<55||r<48) return 0;
  if(t>=75&&r>=65) return 0.6;
  if(t>=65&&r>=55) return 0.4;
  return 0.25;
}
function circleCreditEligible(){
  if(!activeCircles().length) return {ok:false,why:'Join an active Ajo circle first.'};
  if((G.p.trust||0)<55) return {ok:false,why:'Need Trust 55+ to use circle credit.'};
  if((G.p.rep||0)<48) return {ok:false,why:'Need Reputation 48+ to use circle credit.'};
  if(blocked()) return {ok:false,why:'You are blocked from Ajo benefits until the block ends.'};
  return {ok:true};
}
function expectedCirclePot(a){
  // Approximate full pot for a round
  return (a.amt||0)*(a.size||0);
}
function advancesOutstanding(a,m){
  return (a.advances||[]).filter(x=>x.m===m&&!x.settled).reduce((s,x)=>s+x.amt,0);
}
function circleCreditAvailable(ajoId){
  const el=circleCreditEligible();
  if(!el.ok) return {ok:false,why:el.why,limit:0,ajo:null};
  const list=ajoId?activeCircles().filter(a=>a.id===ajoId):activeCircles();
  if(!list.length) return {ok:false,why:'No active circle.',limit:0,ajo:null};
  // Prefer circle with most remaining credit and future turn
  let best=null,bestLim=0;
  list.forEach(a=>{
    const idx=(a.order||[]).indexOf('player');
    if(idx>=0&&idx<a.cycle) return; // already paid out
    const pot=expectedCirclePot(a);
    const max=Math.floor(pot*circleCreditPct());
    const used=advancesOutstanding(a,'player');
    const lim=Math.max(0,max-used);
    if(lim>bestLim){bestLim=lim;best=a}
  });
  if(!best||bestLim<=0) return {ok:false,why:'No credit left until your next pot, or your turn already passed.',limit:0,ajo:null};
  return {ok:true,why:'',limit:bestLim,ajo:best,pct:circleCreditPct()};
}
function buyWithCircleCredit(bizId,productId,ajoId){
  const el=circleCreditAvailable(ajoId);
  if(!el.ok) return fx(el.why||'Circle credit not available.','warn');
  const a=el.ajo; if(!a) return fx('No active circle.','warn');
  const b=bizById(bizId); if(!b||b.closed) return fx('Business not found.','warn');
  const products=typeof bizProducts==='function'?bizProducts(b): (b.products||[]);
  const prod=products.find(p=>p.id===productId)||products[0];
  if(!prod) return fx('Nothing to buy here.','warn');
  const price=prod.price||0;
  if(price<=0) return fx('Invalid price.','warn');
  if(price>el.limit) return fx('This costs '+fmt(price)+'. Your circle credit allows up to '+fmt(el.limit)+'.','warn');
  if(!a.advances) a.advances=[];
  a.advances.push({
    id:'adv_'+Date.now().toString(36),m:'player',amt:price,biz:bizId,product:prod.n,
    day:G.day,settled:false
  });
  // Benefits of the purchase
  if(/food|meal|plate|kitchen|suya|jollof/i.test(prod.n)||b.cat==='Food & Kitchen'){
    G.p.hunger=clamp(G.p.hunger-25,0,100);G.p.happiness=clamp(G.p.happiness+4,0,100);
  } else if(/ride|hop|transport|keke|danfo/i.test(prod.n)||b.cat==='Transport'){
    G.p.energy=clamp(G.p.energy+6,0,100);
  } else {
    G.p.happiness=clamp(G.p.happiness+3,0,100);
  }
  b.trust=clamp((b.trust||40)+2,0,100);
  b.visits=(b.visits||0)+1;
  // Small trust reward for using circle responsibly
  G.p.rep=clamp(G.p.rep+0.3,0,100);
  note('Circle credit: '+prod.n+' at '+b.name+' ('+fmt(price)+') — deducted from your '+a.name+' pot when your turn comes.','ajo');
  fx('Bought with circle credit','good');
  miles('circlebuy','Used Ajo circle credit at a shop');
  return true;
}

function visitBiz(bid){
  // legacy alias → request a visit
  return requestBizVisit(bid);
}
function requestBizVisit(bid){
  const b=bizById(bid); if(!b||b.closed) return fx('Business not found.','warn');
  if(b.owner==='player') return fx('This is your own shop.','warm');
  if((G.visits||[]).some(v=>v.biz===bid&&v.by==='player'&&v.st==='pending'))return fx('Visit request already waiting.','warm');
  if((G.visits||[]).some(v=>v.biz===bid&&v.by==='player'&&v.st==='approved'&&v.day===G.day))return fx('Already visited today.','warm');
  const v={id:'v_'+Date.now().toString(36),biz:bid,by:'player',day:G.day,hour:G.hour,st:'pending',bought:false,ack:false};
  if(!G.visits)G.visits=[];
  G.visits.push(v);
  if(b.owner!=='player'){
    const n=npc(b.owner); if(n&&!n.met){n.met=true;n.lastSeen=G.day}
    // NPC owners: simulate review (demo almost always accepts)
    const accept=Math.random()<0.8;
    if(accept) approveBizVisit(v.id,true);
    else {v.st='declined';note(b.name+' could not host a visit today.','ajo');fx('Visit declined','cold')}
  } else {
    note('Visit request sent to '+b.name+'.','ajo');fx('On the way… waiting for approval','warm');
  }
  return v;
}
function pendingVisitsForOwner(){
  return (G.visits||[]).filter(v=>{
    const b=bizById(v.biz);return b&&b.owner==='player'&&v.st==='pending';
  });
}
function approveBizVisit(vid,yes){
  const v=(G.visits||[]).find(x=>x.id===vid);if(!v)return no('Visit not found.');
  const b=bizById(v.biz);if(!b)return no('Shop missing.');
  if(!yes){v.st='declined';note('Visit to '+b.name+' declined.','ajo');fx('Declined','cold');return true}
  v.st='approved';v.ack=true;v.hour=G.hour;
  b.visits=(b.visits||0)+1;
  b.trust=clamp((b.trust||40)+4,0,100);
  // Trust for both sides
  if(v.by==='player'){
    G.p.trust=clamp(G.p.trust+1.2,0,100);
    G.p.rep=clamp(G.p.rep+0.4,0,100);
    if(b.owner!=='player'){const n=npc(b.owner);if(n){n.rel=clamp(n.rel+5,0,100);n.hist.push({day:G.day,why:'Approved your shop visit',d:5});if(n.hist.length>12)n.hist.shift()}}
  }
  note('Visit approved at '+b.name+'. Trust grew — showing up in person matters.','good');
  fx('Visit confirmed ✓','good');
  return true;
}

/* ---- Treat / pay-for-me requests (friends + local businesses) ---- */
function bizProducts(b){
  if(!b) return [];
  if(b.products&&b.products.length) return b.products;
  // defaults by category
  const defaults={
    'Provisions':[{id:'p1',n:'Everyday goods',price:2000},{id:'p2',n:'Rice measure',price:3500}],
    'Food & Kitchen':[{id:'p1',n:'Plate of the day',price:1500},{id:'p2',n:'Shared meal for two',price:3000}],
    'Fashion':[{id:'p1',n:'Alteration',price:2500},{id:'p2',n:'Ankara piece',price:5000}],
    'Phones & Tech':[{id:'p1',n:'Airtime / data',price:1000},{id:'p2',n:'Screen fix',price:8000}],
    'Transport':[{id:'p1',n:'Short hop',price:500},{id:'p2',n:'Cross-town ride',price:1500}],
    'Beauty':[{id:'p1',n:'Quick style',price:2000},{id:'p2',n:'Full look',price:5000}],
    'Services':[{id:'p1',n:'Small service',price:1500},{id:'p2',n:'Document help',price:3000}],
    'Other':[{id:'p1',n:'Popular item',price:2000}]
  };
  return defaults[b.cat]||defaults.Other;
}
function businessesInUserArea(uid){
  let area=null;
  if(uid==='player'){
    area=(G.p.home&&G.p.home.done&&G.p.home.area)||G.p.area||null;
  } else {
    const n=npc(uid);
    area=n&&(n.homeArea||n.area)||null;
  }
  if(!area) return (G.bizs||[]).filter(b=>!b.closed);
  return (G.bizs||[]).filter(b=>!b.closed&&b.area===area);
}
function friendsList(){
  return G.npcs.filter(n=>n.met&&!G.blk.includes(n.id)&&isFriend(n.id));
}
function requestTreat({to,bizId,productId,note,mode}){
  // mode: 'request' = ask friend to pay for me; 'suggest' = suggest this treat to a friend (they might pay for me or we go together)
  if(!to) return fx('Pick a friend.','warn');
  if(to==='player') return fx('Pick someone else.','warn');
  if(!isFriend(to)) return fx('Become friends first.','warn');
  const b=bizById(bizId); if(!b||b.closed) return fx('Pick a business.','warn');
  const products=bizProducts(b);
  const prod=products.find(p=>p.id===productId)||products[0];
  if(!prod) return fx('No activity listed at this shop.','warn');
  if(!G.treatReqs) G.treatReqs=[];
  if(G.treatReqs.filter(t=>t.from==='player'&&t.status==='pending').length>=5)
    return fx('You already have 5 open treat requests.','warn');
  const id='tr_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  const t={
    id,from:'player',to,biz:bizId,productId:prod.id,productName:prod.n,price:prod.price,
    note:(note||'').trim().slice(0,120),mode:mode==='suggest'?'suggest':'request',
    status:'pending',day:G.day,area:b.area
  };
  G.treatReqs.push(t);
  const n=npc(to);
  const label=mode==='suggest'?'suggested':'asked';
  note((n?n.n:'A friend')+' — you '+label+' they cover '+prod.n+' at '+b.name+' ('+fmt(prod.price)+').','ajo');
  fx(mode==='suggest'?'Suggestion sent':'Treat request sent','warm');
  // NPC friends often respond same day
  if(n){
    const chance=n.rel>=70?0.75:n.rel>=50?0.55:0.35;
    if(Math.random()<chance){
      // defer slightly by accepting now in demo offline
      acceptTreat(id,true);
    } else if(Math.random()<0.25){
      rejectTreat(id,true);
    }
  }
  return t;
}
function pendingTreatsIn(){
  return (G.treatReqs||[]).filter(t=>t.status==='pending'&&t.to==='player');
}
function pendingTreatsOut(){
  return (G.treatReqs||[]).filter(t=>t.status==='pending'&&t.from==='player');
}
function acceptTreat(id,auto){
  const t=(G.treatReqs||[]).find(x=>x.id===id&&x.status==='pending');
  if(!t) return fx('Request not found.','warn');
  const b=bizById(t.biz);
  const payerIsPlayer = t.to==='player'; // friend was asked; if to is player, someone asked us to pay
  const price=t.price||0;
  if(payerIsPlayer){
    if(G.p.cash<price) return fx('Not enough cash to cover this treat.','warn');
    if(!spend(price,'Treated friend — '+t.productName+' at '+(b?b.name:'shop'),'treat')) return false;
    t.status='accepted';t.resolved=G.day;
    G.p.rep=clamp(G.p.rep+1.5,0,100);
    G.p.trust=clamp(G.p.trust+0.8,0,100);
    const from=npc(t.from);
    if(from){from.rel=clamp(from.rel+8,0,100);from.hist.push({day:G.day,why:'You paid for their '+t.productName,d:8});}
    note('You covered '+t.productName+(b?' at '+b.name:'')+' for '+(from?from.n:'a friend')+'. Trust grew.','good');
    fx('Treat paid ✓','good');
  } else {
    // NPC pays for player
    t.status='accepted';t.resolved=G.day;
    const n=npc(t.to);
    if(n){n.rel=clamp(n.rel+6,0,100);n.hist.push({day:G.day,why:'Paid for your '+t.productName,d:6});}
    G.p.happiness=clamp(G.p.happiness+8,0,100);
    G.p.trust=clamp(G.p.trust+1.5,0,100);
    G.p.hunger=clamp(G.p.hunger-12,0,100); // small activity benefit
    if(b){b.trust=clamp((b.trust||40)+2,0,100);b.visits=(b.visits||0)+1}
    note((n?n.n:'A friend')+' paid for your '+t.productName+(b?' at '+b.name:'')+' ('+fmt(price)+').','good');
    if(!auto) fx('They covered it ✓','good');
    else fx((n?n.n:'Friend')+' covered your treat','good');
  }
  return true;
}
function rejectTreat(id,auto){
  const t=(G.treatReqs||[]).find(x=>x.id===id&&x.status==='pending');
  if(!t) return fx('Request not found.','warn');
  t.status='rejected';t.resolved=G.day;
  if(t.to==='player'){
    const from=npc(t.from);
    note('You declined a treat request'+(from?' from '+from.n:'')+'.','ajo');
    fx('Declined','cold');
  } else {
    const n=npc(t.to);
    if(!auto) note((n?n.n:'Friend')+' could not cover '+t.productName+' this time.','ajo');
    if(!auto) fx('Not this time','cold');
  }
  return true;
}


function interestBiz(bid){
  // No game-cash purchase — interest is a trust signal
  const b=bizById(bid);if(!b)return;
  if(b.owner==='player')return fx('Your own listing.','warm');
  b.trust=clamp((b.trust||40)+1,0,100);
  const n=npc(b.owner);if(n){n.rel=clamp(n.rel+2,0,100);if(!n.met){n.met=true;n.lastSeen=G.day}}
  G.p.trust=clamp(G.p.trust+0.3,0,100);
  note('You showed interest in '+b.name+'. Chat or request a visit to go further.','ajo');
  fx('Interest noted','warm');
  return true;
}
function buyAtBiz(bid,pid){
  // Kept as alias for older UI — maps to interest, not fake transport/shopping cash
  return interestBiz(bid);
}
function trustActivity(uid,kind){
  const n=npc(uid);if(!n)return;
  if(!n.met){n.met=true;n.lastSeen=G.day}
  const acts={
    wave:{me:'Waved and said sannu.',them:'Waved back.',rel:1,trust:0.2},
    help:{me:'Offered a small favour in the neighbourhood.',them:'Appreciated the help.',rel:3,trust:0.5},
    intro:{me:'Introduced myself properly.',them:'Glad to know you better.',rel:2,trust:0.3},
    vouch:{me:'Spoke well of them to others.',them:'Heard you had their back.',rel:4,trust:0.4,rep:0.3}
  };
  const A=acts[kind]||acts.wave;
  n.rel=clamp(n.rel+A.rel,0,100);
  G.p.trust=clamp(G.p.trust+(A.trust||0),0,100);
  if(A.rep)G.p.rep=clamp(G.p.rep+A.rep,0,100);
  n.hist.push({day:G.day,why:A.me,d:A.rel});
  if(n.hist.length>12)n.hist.shift();
  const th=chatThread(uid);
  th.push({by:'player',t:A.me,day:G.day,hour:G.hour});
  th.push({by:uid,t:A.them,day:G.day,hour:G.hour});
  note(A.me+' Trust +'+(A.trust||0)+'.','ajo');
  fx('Closer to '+n.n,'warm');
}

function chatThread(uid){
  const k=uid<'player'?uid+'_player':'player_'+uid;
  if(!G.chats[k]) G.chats[k]=[];
  return G.chats[k];
}

function chatGame(uid,kind){
  const n=npc(uid); if(!n) return;
  if(!n.met){n.met=true;n.lastSeen=G.day}
  const th=chatThread(uid);
  const lines={
    greet:{me:'Just checking in — how is business?',them:pick(['Alhamdulillah, we are managing.','Quiet today, but we push.','Better when people show up.']),rel:2},
    plan:{me:'We should meet at a public place this week.',them:pick(['Market is fine.','Suya Spot after work?','Tell me a day that works.']),rel:3},
    stone:{me:'Stone toss — I call open hand.',them:pick(['Ha! I take the other. Next time.','You win this one.','Draw — we go again later.']),rel:2}
  };
  const L=lines[kind]||lines.greet;
  th.push({by:'player',t:L.me,day:G.day,hour:G.hour});
  th.push({by:uid,t:L.them,day:G.day,hour:G.hour});
  n.rel=clamp(n.rel+L.rel,0,100);
  if(kind==='plan') G.p.rep=clamp(G.p.rep+0.2,0,100);
  if(kind==='greet') G.p.trust=clamp(G.p.trust+0.15,0,100);
  note('Chat with '+n.n+' — relationship +'+L.rel+'.','ajo');
  fx('Connection +'+L.rel,'warm');
}

function chatSend(uid,text,o={}){
  const kind=o.kind==='voice'?'voice':'msg';
  text=(text||'').trim().slice(0,200);
  if(kind==='voice') text=text||('🎤 Voice note · '+(o.sec||3)+'s');
  if(!text) return;
  if(G.blk.includes(uid)) return fx('You blocked this person.','warn');
  const n=npc(uid); if(!n) return;
  if(!isFriend(uid)) return fx('Become friends first — send a request and wait for them to accept.','warn');
  if(!n.met){n.met=true;n.lastSeen=G.day}
  const th=chatThread(uid);
  const msg={by:'player',t:text,day:G.day,hour:G.hour,kind};
  if(kind==='voice') msg.sec=Math.max(1,Math.min(60,parseInt(o.sec)||3));
  th.push(msg);
  n.rel=clamp(n.rel+(kind==='voice'?2:1.5),0,100);
  const replies=['God bless. How is work?','I am around '+((bizByOwner(uid)||{}).area||'town')+'.','We should meet at the market one day.','Thanks for checking in.','Alhamdulillah.','I heard you — talk soon.'];
  if(Math.random()<0.75){
    if(kind==='voice'&&Math.random()<0.4)
      th.push({by:uid,t:'🎤 Voice note · 2s',day:G.day,hour:G.hour,kind:'voice',sec:2});
    else
      th.push({by:uid,t:pick(replies),day:G.day,hour:G.hour,kind:'msg'});
  }
  G.p.trust=clamp(G.p.trust+0.1,0,100);
  fx(kind==='voice'?'Voice note sent':'Sent','warm');
  return true;
}
function chatVoice(uid){return chatSend(uid,'',{kind:'voice',sec:2+Math.floor(Math.random()*4)})}
function groupVoice(gid){return gpost(gid,'player','',{kind:'voice',sec:2+Math.floor(Math.random()*4)})}

function mapPins(){
  const pins=[];
  Object.entries(KANO_MAP.areas).forEach(([name,a])=>{
    pins.push({id:'area_'+name,kind:'area',n:name,x:a.x,y:a.y,lat:a.lat,lng:a.lng,ic:'📍',sub:a.blurb});
  });
  KANO_MAP.publicNodes.forEach(p=>pins.push({...p,kind:'public',sub:p.area}));
  (G.bizs||[]).filter(b=>!b.closed).forEach(b=>{
    const base=KANO_MAP.areas[b.area]||{x:50,y:50,lat:KANO_MAP.center.lat,lng:KANO_MAP.center.lng};
    const jitter=(b.id.charCodeAt(b.id.length-1)%7)-3;
    const jlat=((b.id.charCodeAt(0)%5)-2)*0.002;
    const jlng=((b.id.charCodeAt(1)%5)-2)*0.002;
    pins.push({id:b.id,kind:'biz',n:b.name,x:clamp(base.x+jitter,5,95),y:clamp(base.y+jitter,5,95),lat:(base.lat||KANO_MAP.center.lat)+jlat,lng:(base.lng||KANO_MAP.center.lng)+jlng,ic:b.ic||'🏪',sub:b.area+' · '+b.cat,biz:b});
  });
  if(G.p.home&&G.p.home.area&&KANO_MAP.areas[G.p.home.area]){
    const h=KANO_MAP.areas[G.p.home.area];
    pins.push({id:'home',kind:'home',n:'Your home',x:h.x-3,y:h.y+3,lat:h.lat,lng:h.lng,ic:'🏠',sub:G.p.home.area+(G.p.home.label?' · '+G.p.home.label:'')});
  }
  communitySpots().forEach(s=>{
    const base=KANO_MAP.areas[s.area]||{x:50,y:50};
    const jitter=(s.id.charCodeAt(s.id.length-1)%9)-4;
    const lat=s.lat!=null?s.lat:(base.lat||KANO_MAP.center.lat);
    const lng=s.lng!=null?s.lng:(base.lng||KANO_MAP.center.lng);
    pins.push({id:s.id,kind:'spot',n:s.name,x:clamp(base.x+jitter,6,94),y:clamp(base.y+jitter+2,6,94),lat,lng,ic:s.ic||'📍',sub:s.area+(s.label?' · '+s.label:''),spot:s});
  });
  return pins;
}



function startDemoPath(){
  G.demo=true;
  G.p.trust=Math.max(G.p.trust,55);
  G.p.rep=Math.max(G.p.rep,50);
  G.p.cash=Math.max(G.p.cash,80000);
  // Meet a cross-section of neighbours
  G.npcs.slice(0,8).forEach((n,i)=>{n.met=true;n.rel=Math.max(n.rel,45+i*3);n.lastSeen=G.day;if(!n.homeArea)n.homeArea=(allAreas()[i%allAreas().length])});
  if(!G.p.home||!G.p.home.done){
    setHome('Fagge','Demo compound','compound');
  }
  G.p.nearbyOptIn=true;
  G.p.loc='ajo';
  note('Demo path on: full flow is unlocked for testing (Ajo anywhere, high invite success, starter cash). Same rules as production.','ajo');
  fx('Demo path ready','good');
  return true;
}
function demoChecklist(){
  const home=!!(G.p.home&&G.p.home.done);
  const biz=!!playerBiz();
  const met=G.npcs.filter(n=>n.met).length>=3;
  const chat=Object.keys(G.chats||{}).some(k=>(G.chats[k]||[]).some(m=>m.by==='player'));
  const grp=G.groups.some(g=>!g.dead&&g.mem.player);
  const ajo=G.ajos.some(a=>a.host==='player'||a.members.includes('player'));
  const stones=G.ajos.some(a=>a.members.includes('player')&&(a.status==='stones'||a.status==='active'||a.status==='done'));
  const paid=G.ajos.some(a=>a.payouts&&a.payouts.length);
  return [
    {id:'home',ok:home,t:'Set home area',a:'homeEdit'},
    {id:'people',ok:met,t:'Know 3+ people',a:'tab',v:'people'},
    {id:'chat',ok:chat,t:'Send a chat',a:'tab',v:'people'},
    {id:'biz',ok:biz,t:'List a business (optional)',a:'bizManage'},
    {id:'group',ok:grp,t:'Join or create a group',a:'tab',v:'groups'},
    {id:'ajo',ok:ajo,t:'Create or join an Ajo',a:'tab',v:'ajo'},
    {id:'stones',ok:stones,t:'Reach stones / running Ajo',a:'tab',v:'ajo'},
    {id:'payout',ok:paid,t:'See a payout (advance days)',a:'sleep'}
  ];
}
function demoFillAjo(id){
  const a=ajoOf(id);if(!a||a.host!=='player'||a.status!=='open')return no('Open your own gathering circle first.');
  const need=a.size-a.members.length;
  const cands=G.npcs.filter(n=>n.met&&!a.members.includes(n.id)).sort((x,y)=>y.rel-x.rel);
  let added=0;
  for(const n of cands){
    if(added>=need)break;
    a.members.push(n.id);added++;
  }
  if(a.members.length>=a.size)toStones(a);
  note('Demo filled '+a.name+' with '+added+' neighbour(s).','ajo');
  fx('Circle filled','good');
  return true;
}
function demoAdvanceToPayout(id){
  const a=ajoOf(id);if(!a)return no('No Ajo');
  if(a.status==='stones'&&!a.rolled)rollStones(id);
  if(a.status==='stones'||a.status==='voting'){a.status='active';a.startDay=G.day;a.cycle=0;if(!a.order.length)a.order=[a.host,...shuffle(a.members.filter(m=>m!==a.host))];a.rolled=true}
  if(a.status!=='active')return no('Ajo not running');
  G.p.cash=Math.max(G.p.cash,a.amt*a.size+20000);
  G.day=Math.max(G.day,dueDay(a));
  runCycle(a);
  fx('Cycle resolved','good');
  return true;
}

function defaultAvatar(gender){
  const g=gender||'Female';
  if(g==='Female')return {gender:'Female',skin:'s4',face:'heart',hair:'longbraids',hairColor:'black',eyes:'almond',brows:'arched',nose:'medium',mouth:'full',facial:'none',accessory:'hoops',top:'ankara'};
  if(g==='Other')return {gender:'Other',skin:'s3',face:'oval',hair:'afro',hairColor:'black',eyes:'almond',brows:'soft',nose:'medium',mouth:'smile',facial:'none',accessory:'none',top:'tee'};
  return {gender:'Male',skin:'s3',face:'oval',hair:'fade',hairColor:'black',eyes:'almond',brows:'full',nose:'medium',mouth:'smile',facial:'none',accessory:'none',top:'dashiki'};
}
function setAvatar(parts){
  if(!G||!G.p)return false;
  G.p.avatar=Object.assign({},G.p.avatar||defaultAvatar(G.p.gender),parts||{});
  return true;
}
function markOnboarded(){G.p.onboarded=true;note('You are set up. Build trust, visit shops, invite people into Ajo.','ajo');fx('Welcome to your circle','good');return true}
function ensureSetup(){
  // After character create, player should set home — not a demo unlock
  if(!G.p.home)G.p.home={area:'',label:'',style:'compound',done:false};
  if(G.p.onboarded==null)G.p.onboarded=false;
}
function migrate(){if(!G.groups){initGroups();G.npcs.forEach(groupInviteCheck)}(G.groups||[]).forEach(g=>{if(g.maxMembers==null)g.maxMembers=30});if(!G.blk)G.blk=[];if(!G.susp)G.susp=[];if(!G.gev)G.gev=[];if(!G.rl)G.rl={};if(!G.cf)G.cf={};if(!G.p.ints)G.p.ints=[];initPlaces();if(!G.p.area&&G.p.home&&G.p.home.area)G.p.area=G.p.home.area;G.ajos.forEach(a=>{if(!a.advances)a.advances=[];if(!a.stones)a.stones={};if(a.feePct==null)a.feePct=AJO_FEE_PCT;if(!a.mode)a.mode='traditional';if(a.feeTaken==null)a.feeTaken=0;if(!a.vis)a.vis='public';if(!a.joinReqs)a.joinReqs=[];if(!a.chat)a.chat=[];if(!a.activity)a.activity=[]});if(G.demo==null)G.demo=false;if(G.p.onboarded==null)G.p.onboarded=!!(G.p.home&&G.p.home.done);if(!G.p.avatar)G.p.avatar=defaultAvatar(G.p.gender);G.npcs.forEach(n=>{if(!n.avatar)n.avatar=npcAvatarFor(n)});if(!G.p.work)G.p.work={cat:'',title:'',set:false};if(!G.p.username)G.p.username=(G.p.name||'').replace(/\s+/g,'').slice(0,20);if(!G.p.interests)G.p.interests=G.p.ints||[];if(!G.p.businessStatus)G.p.businessStatus='none';(G.bizs||[]).forEach(b=>{
  if(!b.avatar||b.avatar.kind!=='building')b.avatar=defaultStoreAvatar(b.cat||'Other');
  if(!b.loc){const areaLoc={Fagge:'market',Gwale:'restaurant',Nasarawa:'social','Kano Municipal':'work',Tarauni:'market',Dala:'social',Kumbotso:'market',Ungogo:'park'};b.loc=areaLoc[b.area]||'market'}
});ensureSetup()}

/* ---- persistence ---- */
const AKEY='ajoloop_account_v1';
const Account={
  mem:null,
  load(){
    try{if(Account.mem)return JSON.parse(Account.mem)}catch(e){}
    try{const v=localStorage.getItem(AKEY);if(v){Account.mem=v;return JSON.parse(v)}}catch(e){}
    return null;
  },
  save(acc){
    if(!acc)return;
    const s=JSON.stringify(acc);Account.mem=s;
    try{localStorage.setItem(AKEY,s)}catch(e){}
  },
  clear(){Account.mem=null;try{localStorage.removeItem(AKEY)}catch(e){}}
};
const Store={async load(){try{if(window.storage){const r=await window.storage.get(KEY,false);if(r&&r.value)return JSON.parse(r.value)}}catch(e){}try{const v=localStorage.getItem(KEY);if(v)return JSON.parse(v)}catch(e){}return Store.mem?JSON.parse(Store.mem):null},
 async save(){if(!G)return;const s=JSON.stringify(G);Store.mem=s;try{if(window.storage){await window.storage.set(KEY,s,false);return}}catch(e){}try{localStorage.setItem(KEY,s)}catch(e){}},
 async clear(){Store.mem=null;try{if(window.storage)await window.storage.delete(KEY,false)}catch(e){}try{localStorage.removeItem(KEY)}catch(e){}}};
//#ENGINE-END
