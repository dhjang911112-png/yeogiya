(function(){
const L=()=>JSON.parse(localStorage.getItem('mockfb')||'{"users":{},"docs":{},"grants":{}}'), Sv=(d)=>localStorage.setItem('mockfb',JSON.stringify(d));
const cur=()=>sessionStorage.getItem('cur'), setCur=(u)=>u?sessionStorage.setItem('cur',u):sessionStorage.removeItem('cur');
const emailOf=(uid)=>{const d=L();for(const e in d.users)if(d.users[e].uid===uid)return e;return null};
const mkUser=(uid)=>({uid,email:emailOf(uid),delete:async()=>{}});
const auth={onAuthStateChanged(cb){setTimeout(()=>cb(cur()?mkUser(cur()):null),10);return()=>{}},
 async createUserWithEmailAndPassword(e,p){const d=L();if(d.users[e])throw{code:'auth/email-already-in-use'};const uid='U'+Math.random().toString(36).slice(2,10);d.users[e]={p,uid};Sv(d);setCur(uid);return{user:mkUser(uid)}},
 async signInWithEmailAndPassword(e,p){const d=L();const u=d.users[e];if(!u||u.p!==p)throw{code:'auth/invalid-credential'};setCur(u.uid);return{user:mkUser(u.uid)}},
 async signOut(){setCur(null)}};
const gref=(id)=>({id,async get(){const d=L();return{exists:!!d.grants[id],data:()=>d.grants[id]}}});
const fs={collection:(c)=>c==='grants'?{
  async add(v){const d=L();const id='g'+Math.random().toString(36).slice(2,8);
    const admin=emailOf(cur())==='uec9ab4ec9881ec9e90@yeogiya.app'; if(!admin) throw {code:'permission-denied'};
    d.grants[id]=Object.assign({},v,{at:1});Sv(d);return gref(id)},
  where(f,op,v){const fl=[[f,v]];const q={where(f2,o2,v2){fl.push([f2,v2]);return q},onSnapshot(cb){const seen={};const tick=()=>{const d=L();const ch=[];for(const id in d.grants){const g=d.grants[id];if(fl.every(([k,val])=>g[k]===val)&&!seen[id]){seen[id]=1;ch.push({type:'added',doc:{ref:gref(id),data:()=>g}})}}if(ch.length)cb({docChanges:()=>ch})};tick();const iv=setInterval(tick,300);return()=>clearInterval(iv)}};return q}
 }:{doc:(id)=>({async get(){const d=L();return{exists:!!d.docs[id],data:()=>d.docs[id]}},async set(v,o){const d=L();d.docs[id]=o&&o.merge?Object.assign({},d.docs[id],v):v;Sv(d)}})},
 async runTransaction(fn){const ups=[];const tx={get:(r)=>r.get(),update:(r,v)=>ups.push([r.id,v])};const res=await fn(tx);const d=L();ups.forEach(([id,v])=>Object.assign(d.grants[id],v));Sv(d);return res}};
window.firebase={initializeApp(){},auth:()=>auth,firestore:Object.assign(()=>fs,{FieldValue:{serverTimestamp:()=>'TS'}})};
})();
