// SONDER's curated catalogue: verified Apple Music album IDs and artist releases.
// A release can be independent even if an artist has also worked with major labels.
const catalogue = [
  {id:'arctic',artist:'Arctic Monkeys',album:'Favourite Worst Nightmare',genre:'Indie Rock',label:'Domino · Warner distribution (US)',year:2007,appleId:'251499221',tone:'t1',songs:['505','Fluorescent Adolescent','Brianstorm','Teddy Picker']},
  {id:'mac',artist:'Mac DeMarco',album:'Salad Days',genre:'Indie Rock',label:'Captured Tracks',year:2014,appleId:'6789834398',tone:'t2',songs:['Chamber of Reflection','Salad Days','Passing Out Pieces','Let Her Go']},
  {id:'radiohead',artist:'Radiohead',album:'A Moon Shaped Pool',genre:'Alternative',label:'XL Recordings',year:2016,appleId:'1111577743',tone:'t3',songs:['Daydreaming','Burn the Witch','Decks Dark','True Love Waits']},
  {id:'phoebe',artist:'Phoebe Bridgers',album:'Punisher',genre:'Indie Folk',label:'Dead Oceans',year:2020,appleId:'1504699857',tone:'t4',songs:['Moon Song','Kyoto','Garden Song','I Know the End']},
  {id:'mitski',artist:'Mitski',album:'Be the Cowboy',genre:'Indie Rock',label:'Dead Oceans',year:2018,appleId:'1373892692',tone:'t5',songs:['Washing Machine Heart','Nobody','Me and My Husband','A Pearl']},
  {id:'beach',artist:'Beach House',album:'Depression Cherry',genre:'Dream Pop',label:'Sub Pop',year:2015,appleId:'997913392',tone:'t6',songs:['Space Song','PPP','Sparks','Wildflower']},
  {id:'pixies',artist:'Pixies',album:'Doolittle',genre:'Alternative',label:'4AD',year:1989,appleId:'7060469',tone:'t7',songs:['Here Comes Your Man','Hey','Debaser','Wave of Mutilation']},
  {id:'alvvays',artist:'Alvvays',album:'Blue Rev',genre:'Dream Pop',label:'Polyvinyl',year:2022,appleId:'1651269389',tone:'t8',songs:['Pharmacist','Belinda Says','Easy on Your Own?','After the Earthquake']},
  {id:'bigthief',artist:'Big Thief',album:'Dragon New Warm Mountain I Believe in You',genre:'Indie Folk',label:'4AD',year:2022,appleId:'1591284600',tone:'t9',songs:['Simulation Swarm','Spud Infinity','Red Moon','Change']},
  {id:'japanese',artist:'Japanese Breakfast',album:'Jubilee',genre:'Indie Pop',label:'Dead Oceans',year:2021,appleId:'1553364590',tone:'t10',songs:['Be Sweet','Paprika','Kokomo, IN','Posing in Bondage']},
  {id:'beach2',artist:'Beach House',album:'Bloom',genre:'Dream Pop',label:'Sub Pop',year:2012,appleId:'509665145',tone:'t11',songs:['Myth','Lazuli','Other People','On the Sea']}
];
const el=id=>document.getElementById(id);
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
let likes=store('sonder-v2-likes',[]), interpretations=store('sonder-v2-interpretations',{}), view='home', filter='All', search='', artistFilter='', current=null;
const genres=['All','Indie Rock','Dream Pop','Alternative','Indie Folk','Indie Pop'];
const musicUrl=a=>`https://music.apple.com/us/album/${a.appleId}`;
const embedUrl=a=>`https://embed.music.apple.com/us/album/${a.appleId}`;
// Real album art comes from Apple's public iTunes catalogue; decorative fallback is retained.
const albumArt = {};
const artistArt = {};
// Some freely-licensed artist portraits can be loaded directly without API calls.
// Wikimedia Commons uses the original file titles shown below.
const chosenArtistPhotos = {
  'Arctic Monkeys': 'assets/artists/arctic-monkeys.jpg',
  'Mac DeMarco': 'assets/artists/mac-demarco.jpg',
  'Radiohead': 'assets/artists/radiohead.jpg',
  'Phoebe Bridgers': 'assets/artists/phoebe-bridgers.jpg',
  'Mitski': 'assets/artists/mitski.jpg',
  'Beach House': 'assets/artists/beach-house.jpg',
  'Pixies': 'assets/artists/pixies.jpg',
  'Alvvays': 'assets/artists/alvvays.jpg',
  'Big Thief': 'assets/artists/big-thief.jpg',
  'Japanese Breakfast': 'assets/artists/japanese-breakfast.jpg'
};
Object.assign(artistArt, chosenArtistPhotos);

const cover=a=> albumArt[a.id]
  ? `<div class="cover picture-cover"><img src="${safe(albumArt[a.id])}" alt="${safe(a.album.replace(' · More music',''))} album artwork" loading="lazy" decoding="async"></div>`
  : `<div class="cover ${a.tone}"><div class="cover-mark"><span>SONDER SELECTS</span><b>${safe(a.album.replace(' · More music',''))}</b><small>${safe(a.artist)}</small></div></div>`;
// APIs are only used for display images; audio still plays through official Apple embeds.
// Apple's public API supports JSONP, which avoids browsers blocking cross-origin fetches.
let requestIndex = 0;
function appleJsonp(url){
  return new Promise((resolve,reject)=>{
    const name = '__sonderApple' + (++requestIndex);
    const node=document.createElement('script');
    const timer=setTimeout(()=>finish(new Error('Image service timed out')),10000);
    function finish(err,data){clearTimeout(timer);node.remove();delete window[name];err?reject(err):resolve(data);}
    window[name]=data=>finish(null,data);
    node.onerror=()=>finish(new Error('Image service unavailable'));
    node.src=url+(url.includes('?')?'&':'?')+'callback='+name;
    document.head.appendChild(node);
  });
}
async function loadAlbumArt(a){
  const clean=t=>(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const expected=clean(a.album);
  const verify=result=>result && result.artworkUrl100 &&
    clean(result.artistName)===clean(a.artist) &&
    (clean(result.collectionName)===expected || clean(result.collectionName).startsWith(expected+'deluxe'));
  function useArt(result){
    if(!verify(result)) return false;
    albumArt[a.id]=result.artworkUrl100.replace(/100x100[^/]*$/, '600x600bb.jpg');
    render();refreshNowArt();return true;
  }
  try{
    // An exact Apple Music release ID gives us a more reliable original cover.
    const direct=await appleJsonp(`https://itunes.apple.com/lookup?id=${encodeURIComponent(a.appleId)}&country=us`);
    if((direct.results||[]).some(useArt)) return;
    const results=await appleJsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(a.artist+' '+a.album)}&entity=album&limit=100&country=us`);
    const candidate=(results.results||[]).find(verify);
    if(candidate)useArt(candidate);
    else console.warn('Official cover not found for',a.artist,a.album);
  }catch(err){console.warn('Official album art unavailable:',a.artist,a.album,err.message);}
}
const wikipediaTitles = {
 'Arctic Monkeys':'Arctic Monkeys','Mac DeMarco':'Mac DeMarco','Radiohead':'Radiohead',
 'Phoebe Bridgers':'Phoebe Bridgers','Mitski':'Mitski (singer)','Beach House':'Beach House',
 'Pixies':'Pixies (band)','Alvvays':'Alvvays','Big Thief':'Big Thief',
 'Japanese Breakfast':'Japanese Breakfast'
};
async function loadArtistArt(name){
  if (chosenArtistPhotos[name]) return;
  try{
    const params=new URLSearchParams({action:'query',titles:wikipediaTitles[name]||name,prop:'pageimages',format:'json',pithumbsize:'650',origin:'*'});
    const response=await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
    if(!response.ok) return;
    const pages=Object.values((await response.json()).query?.pages||{});
    const photo=pages[0]?.thumbnail?.source;
    if(photo && /^https:\/\//.test(photo)){artistArt[name]=photo;render();}
  }catch(e){ console.warn('Artist image unavailable:',name,e); }
}
function refreshNowArt(){
  if(!current)return;
  const art=el('nowArt');
  art.innerHTML=albumArt[current.id]?`<img src="${safe(albumArt[current.id])}" alt="">`:safe(current.artist.slice(0,1));
}
function loadArtwork(){
  catalogue.forEach(a=>loadAlbumArt(a));
  [...new Set(catalogue.map(a=>a.artist))].forEach(loadArtistArt);
}

function save(){localStorage.setItem('sonder-v2-likes',JSON.stringify(likes));localStorage.setItem('sonder-v2-interpretations',JSON.stringify(interpretations));}
function updateLikes(){el('likedCount').textContent=likes.length;el('heart').textContent=current&&likes.includes(current.id)?'♥':'♡';}
function selectNav(next){view=next;filter='All';artistFilter='';el('eventsView').hidden=next!=='events';el('communityView').hidden=next!=='community';document.querySelector('.body-content').hidden=next==='events'||next==='community';if(next==='events'){renderEvents();}if(next==='community'){renderCommunity();}document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('selected',b.dataset.nav===next));el('hero').hidden=next!=='home';el('artistsSection').hidden=next==='library';el('contentTitle').textContent=({home:'On repeat.',discover:'Discover.',artists:'Explore artists.',library:'Your collection.',events:'Concerts.',community:'Fans.'})[next];el('contentSubtitle').textContent=next==='library'?'Albums you saved on this device.':next==='artists'?'Choose an artist to see their releases.':'Independently released albums you can listen to through Apple Music.';render();window.scrollTo({top:0,behavior:'smooth'});}
function render(){el('filters').innerHTML=genres.map(g=>`<button class="chip ${g===filter?'active':''}" data-filter="${safe(g)}">${safe(g)}</button>`).join('');let items=catalogue.filter(a=>(filter==='All'||a.genre===filter)&&(!artistFilter||a.artist===artistFilter)&&(!search||`${a.artist} ${a.album} ${a.genre} ${a.songs.join(' ')}`.toLowerCase().includes(search))&&(view!=='library'||likes.includes(a.id)));if(view==='artists'&&!artistFilter)items=[];
 el('albums').innerHTML=items.length?items.map(a=>`<article class="album-card"><button class="cover-button" data-open="${a.id}" aria-label="Listen to ${safe(a.album)} by ${safe(a.artist)}">${cover(a)}<span class="cover-play">▶</span></button><div class="album-line"><div><strong>${safe(a.album.replace(' · More music',''))}</strong><button class="artist-text" data-artist="${safe(a.artist)}">${safe(a.artist)}</button><small>${safe(a.genre)} · ${a.year}</small></div><button class="card-heart" data-like="${a.id}" aria-label="Like ${safe(a.album)}">${likes.includes(a.id)?'♥':'♡'}</button></div><button class="listen-link" data-open="${a.id}">Listen on SONDER ↗</button></article>`).join(''):`<div class="no-results">${view==='artists'&&!artistFilter?'Select an artist below to view their music.':'Nothing matched your search. Try another artist, song or genre.'}</div>`;
 const arts=[...new Set(catalogue.map(a=>a.artist))].filter(name=>!search||name.toLowerCase().includes(search)||catalogue.some(a=>a.artist===name&&a.songs.some(s=>s.toLowerCase().includes(search))));el('artistList').innerHTML=arts.map((name,i)=>{const a=catalogue.find(v=>v.artist===name);return `<button class="artist-tile" data-artist="${safe(name)}"><div class="artist-symbol ${a.tone}">${artistArt[name]?`<img src="${safe(artistArt[name])}" alt="${safe(name)}" loading="lazy" decoding="async">`:`<span>${safe(name.split(' ').map(w=>w[0]).join('').slice(0,2))}</span>`}</div><strong>${safe(name)}</strong><small>${safe(a.genre)} · Explore ↗</small></button>`}).join('');updateLikes();}
function openAlbum(id){const a=catalogue.find(a=>a.id===id);if(!a)return;current=a;el('nowTitle').textContent=a.album.replace(' · More music','');el('nowArtist').textContent=a.artist;el('nowArt').className=`mini-art ${a.tone}`;refreshNowArt();updateLikes();el('dialogBody').innerHTML=`<div class="modal-head"><span class="eyebrow dark">SONDER LISTENING ROOM</span><h2>${safe(a.album.replace(' · More music',''))}</h2><p>${safe(a.artist)} · ${safe(a.genre)} · ${a.year} · ${safe(a.label)}</p></div><div class="embed-note">Play officially through Apple Music. Guests can hear previews; signed-in subscribers may hear full tracks. Playback controls are inside Apple's player.</div><iframe class="apple-frame" title="Apple Music player for ${safe(a.album)}" src="${embedUrl(a)}" allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" loading="eager" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"></iframe><a class="apple-link" href="${musicUrl(a)}" target="_blank" rel="noopener noreferrer">Open this album in Apple Music ↗</a><h3>Explore tracks</h3><div class="track-list">${a.songs.map((song,i)=>`<button data-track="${safe(song)}" data-album="${a.id}"><span>${String(i+1).padStart(2,'0')}</span><strong>${safe(song)}</strong><small>Interpretations ↗</small></button>`).join('')}</div><div id="trackDetails" class="track-details"><p>Select a track to read or share an interpretation.</p></div>`;el('musicDialog').showModal();}
function openTrack(aid,title){const a=catalogue.find(a=>a.id===aid);if(!a)return;const key=`${aid}:${title}`, posts=interpretations[key]||[];el('trackDetails').innerHTML=`<span class="eyebrow dark">BEYOND THE SOUND</span><h3>${safe(title)}</h3><p class="artist-story">No artist-submitted story has been added for this track. SONDER only shows a backstory if the artist chooses to share it.</p><h4>Listener interpretations <span>(${posts.length})</span></h4><div class="posts">${posts.length?posts.map(p=>`<div class="post"><small>Listener · ${safe(p.date)}</small><p>${safe(p.text)}</p></div>`).join(''):'<p class="muted">No interpretations yet. Be the first to share yours.</p>'}</div><form id="interpretForm"><label for="interpretText">What does this song mean to you?</label><textarea id="interpretText" rows="3" minlength="2" maxlength="500" required placeholder="Share your interpretation (2–500 characters)…"></textarea><button type="submit" class="primary-btn">Post interpretation ↗</button><small>Saved only on this browser, not publicly shared.</small></form>`;el('interpretForm').addEventListener('submit',e=>{e.preventDefault();const t=el('interpretText').value.trim();if(t.length<2||t.length>500)return;interpretations[key]=[...(interpretations[key]||[]),{text:t,date:new Date().toLocaleDateString()}];save();openTrack(aid,title);});el('trackDetails').scrollIntoView({behavior:'smooth',block:'nearest'});}
document.addEventListener('click',e=>{const nav=e.target.closest('[data-nav]');if(nav){selectNav(nav.dataset.nav);return;}const fil=e.target.closest('[data-filter]');if(fil){filter=fil.dataset.filter;render();return;}const art=e.target.closest('[data-artist]');if(art){view='artists';artistFilter=art.dataset.artist;filter='All';el('hero').hidden=true;el('contentTitle').textContent=artistFilter+'.';el('contentSubtitle').textContent='Selected releases · Official Apple Music players';render();window.scrollTo({top:0,behavior:'smooth'});return;}const like=e.target.closest('[data-like]');if(like){const id=like.dataset.like;likes=likes.includes(id)?likes.filter(s=>s!==id):[...likes,id];save();render();return;}const open=e.target.closest('[data-open]');if(open){openAlbum(open.dataset.open);return;}const track=e.target.closest('[data-track]');if(track){openTrack(track.dataset.album,track.dataset.track);return;}});
el('search').addEventListener('input',e=>{search=e.target.value.toLowerCase().trim();if(search&&view==='artists'&&artistFilter)artistFilter='';render();});el('discoverButton').addEventListener('click',()=>selectNav('discover'));el('storyButton').addEventListener('click',()=>{openAlbum(catalogue[0].id);openTrack(catalogue[0].id,catalogue[0].songs[0]);});el('openPlayer').addEventListener('click',()=>openAlbum((current||catalogue[0]).id));el('heart').addEventListener('click',()=>{if(!current)return;likes=likes.includes(current.id)?likes.filter(id=>id!==current.id):[...likes,current.id];save();render();});el('closeMusic').addEventListener('click',()=>el('musicDialog').close());el('aboutOpen').addEventListener('click',()=>el('aboutDialog').showModal());el('closeAbout').addEventListener('click',()=>el('aboutDialog').close());el('musicDialog').addEventListener('close',()=>{el('dialogBody').innerHTML='';});render();loadArtwork();


// Event cards are clearly labelled fictional demo listings. No actual tickets are issued.
const demoEvents = [
 {id:'ev01',artist:'Arctic Monkeys',date:'2027-04-17',location:'In person',venue:'SONDER Studio · Demo venue',city:'London',price:28,capacity:60},
 {id:'ev02',artist:'Mac DeMarco',date:'2027-05-08',location:'Online',venue:'SONDER Digital Stage',city:'Online',price:8,capacity:120},
 {id:'ev03',artist:'Phoebe Bridgers',date:'2027-06-11',location:'In person',venue:'SONDER Studio · Demo venue',city:'New York',price:32,capacity:50},
 {id:'ev04',artist:'Mitski',date:'2027-07-06',location:'Online',venue:'SONDER Digital Stage',city:'Online',price:10,capacity:120},
 {id:'ev05',artist:'Beach House',date:'2027-08-20',location:'In person',venue:'SONDER Studio · Demo venue',city:'Paris',price:25,capacity:45},
 {id:'ev06',artist:'Japanese Breakfast',date:'2027-09-12',location:'Online',venue:'SONDER Digital Stage',city:'Online',price:9,capacity:100}
];
const artistNames=[...new Set(catalogue.map(a=>a.artist))];
let reservations=store('sonder-demo-reservations',[]), follows=store('sonder-demo-follows',[]), fanNotes=store('sonder-demo-fan-notes',[]);
function persistFan(){localStorage.setItem('sonder-demo-reservations',JSON.stringify(reservations));localStorage.setItem('sonder-demo-follows',JSON.stringify(follows));localStorage.setItem('sonder-demo-fan-notes',JSON.stringify(fanNotes));}
function renderEvents(){
 const af=el('eventArtist'), lf=el('eventLocation'); if(!af.options.length){af.innerHTML='<option value="all">All artists</option>'+artistNames.map(n=>`<option value="${safe(n)}">${safe(n)}</option>`).join('');}
 const events=demoEvents.filter(e=>(af.value==='all'||e.artist===af.value)&&(lf.value==='all'||e.location===lf.value));
 el('eventCards').innerHTML=events.length?events.map(e=>`<article class="event-card"><div class="event-date"><strong>${new Date(e.date+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</strong><span>2027 · DEMO</span></div><div class="event-description"><span class="eyebrow dark">${safe(e.location)} · FICTIONAL EVENT</span><h3>${safe(e.artist)}</h3><p>${safe(e.venue)} · ${safe(e.city)}</p><small>Illustrative entry €${e.price} · Not a real ticket sale</small></div><button class="outline-dark" data-reserve="${e.id}">Reserve demo ticket ↗</button></article>`).join(''):'<p>No example concerts match these filters.</p>';
 el('reservationList').innerHTML=reservations.length?reservations.map((r,i)=>`<div class="reservation"><span><strong>${safe(r.artist)}</strong><small>Demo reservation · ${safe(r.date)} · ${r.quantity} ticket(s) · €${r.total}</small></span><button data-cancel-reservation="${i}" aria-label="Remove reservation">Remove</button></div>`).join(''):'<p class="muted">No demo reservations yet.</p>';
}
function reserveDemo(id){let e=demoEvents.find(x=>x.id===id);if(!e)return;
 const existing=reservations.filter(r=>r.id===id).reduce((a,r)=>a+r.quantity,0);
 const maximum=Math.min(4,e.capacity-existing);
 if(maximum<1){alert('This demo event is fully reserved in this browser.');return;}
 const answer=prompt(`DEMO ONLY — ${e.artist}\n${e.date} · ${e.city}\n€${e.price} per ticket.\nHow many tickets? (1–${maximum})`, '1');
 if(answer===null)return; const quantity=Number(answer);
 if(!Number.isInteger(quantity)||quantity<1||quantity>maximum){alert(`Enter a whole number from 1 to ${maximum}.`);return;}
 reservations.push({id:e.id,artist:e.artist,date:e.date,quantity,total:quantity*e.price});persistFan();renderEvents();alert(`Demo reservation saved: ${quantity} ticket(s), €${quantity*e.price}. No payment taken and no real ticket issued.`);
}
function renderCommunity(){
 if(!el('fanArtist').options.length){el('fanArtist').innerHTML=artistNames.map(n=>`<option value="${safe(n)}">${safe(n)}</option>`).join('');el('fanFilter').innerHTML='<option value="all">All artists</option>'+artistNames.map(n=>`<option value="${safe(n)}">${safe(n)}</option>`).join('');}
 el('followGrid').innerHTML=artistNames.map(n=>`<div class="follow-row"><span>${safe(n)}</span><button data-follow="${safe(n)}" class="follow-button ${follows.includes(n)?'following':''}" aria-pressed="${follows.includes(n)}">${follows.includes(n)?'Following ✓':'Follow +'}</button></div>`).join('');
 const filtered=fanNotes.filter(note=>el('fanFilter').value==='all'||note.artist===el('fanFilter').value);
 el('fanPosts').innerHTML=filtered.length?filtered.map(note=>`<article class="fan-note"><small>${safe(note.artist)} · ${safe(note.date)}</small><h4>${safe(note.alias)}</h4><p>${safe(note.message)}</p></article>`).join(''):'<p class="muted">No fan notes yet. Start the conversation!</p>';
}
document.addEventListener('click',e=>{const ticket=e.target.closest('[data-reserve]');if(ticket){reserveDemo(ticket.dataset.reserve);return;}const cancel=e.target.closest('[data-cancel-reservation]');if(cancel){reservations.splice(Number(cancel.dataset.cancelReservation),1);persistFan();renderEvents();return;}const follow=e.target.closest('[data-follow]');if(follow){const artist=follow.dataset.follow;follows=follows.includes(artist)?follows.filter(x=>x!==artist):[...follows,artist];persistFan();renderCommunity();}});
el('eventArtist').addEventListener('change',renderEvents);el('eventLocation').addEventListener('change',renderEvents);el('fanFilter').addEventListener('change',renderCommunity);
el('fanForm').addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget;if(!f.reportValidity())return;const alias=el('fanAlias').value.trim(),message=el('fanMessage').value.trim(),artist=el('fanArtist').value;
 if(alias.length<2||message.length<5||!artistNames.includes(artist)){el('fanFeedback').textContent='Please check your display name and message.';return;}
 fanNotes.unshift({artist,alias,message,date:new Date().toLocaleDateString('en-GB')});persistFan();f.reset();el('fanFeedback').textContent='Your demo message was saved on this device only.';renderCommunity();});
