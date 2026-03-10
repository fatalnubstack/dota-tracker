import { useState, useEffect } from "react";

const P1 = 89903273;
const P2 = 42943450;
const API = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

const RANKS = {10:"Herald 1",11:"Herald 2",12:"Herald 3",13:"Herald 4",14:"Herald 5",15:"Herald 6",20:"Guardian 1",21:"Guardian 2",22:"Guardian 3",23:"Guardian 4",24:"Guardian 5",25:"Guardian 6",30:"Crusader 1",31:"Crusader 2",32:"Crusader 3",33:"Crusader 4",34:"Crusader 5",35:"Crusader 6",40:"Archon 1",41:"Archon 2",42:"Archon 3",43:"Archon 4",44:"Archon 5",45:"Archon 6",50:"Legend 1",51:"Legend 2",52:"Legend 3",53:"Legend 4",54:"Legend 5",55:"Legend 6",60:"Ancient 1",61:"Ancient 2",62:"Ancient 3",63:"Ancient 4",64:"Ancient 5",65:"Ancient 6",70:"Divine 1",71:"Divine 2",72:"Divine 3",73:"Divine 4",74:"Divine 5",75:"Divine 6",80:"Immortal"};
const fmtDur = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
const timeAgo = ts => { if(!ts) return ""; const d=Math.floor(Date.now()/1000-ts); if(d<3600) return `${Math.floor(d/60)}m zpět`; if(d<86400) return `${Math.floor(d/3600)}h zpět`; return `${Math.floor(d/86400)}d zpět`; };

export default function App() {
  const [phase, setPhase] = useState("loading");
  const [status, setStatus] = useState("Inicializuji…");
  const [p1, setP1] = useState(null);
  const [p2, setP2] = useState(null);
  const [lastMatch, setLastMatch] = useState(null);
  const [sharedMatch, setSharedMatch] = useState(null);
  const [heroes, setHeroes] = useState({});
  const [err, setErr] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setPhase("loading"); setErr(null);
    try {
      setStatus("Načítám seznam hrdinů…");
      try {
        const hs = await fetch(`${API}/heroes`).then(r => r.json());
        const map = {};
        hs.forEach(h => { map[h.id] = { name: h.localized_name, slug: h.name.replace("npc_dota_hero_","") }; });
        setHeroes(map);
      } catch {}

      setStatus("Načítám profily hráčů…");
      const [d1, d2] = await Promise.all([
        fetch(`${API}/player/${P1}`).then(r => r.json()),
        fetch(`${API}/player/${P2}`).then(r => r.json()),
      ]);

      const parsePlayer = (d, id) => {
        const pr = d.profile?.profile || {};
        return {
          name: pr.personaname || `Player #${id}`,
          avatar: pr.avatarfull || null,
          rank: RANKS[d.profile?.rank_tier] || "Unranked",
          wins: d.wl?.win || 0,
          losses: d.wl?.lose || 0,
        };
      };
      setP1(parsePlayer(d1, P1));
      setP2(parsePlayer(d2, P2));

      setStatus("Načítám poslední hru…");
      const recent = await fetch(`${API}/player/${P1}/recent`).then(r => r.json());
      if (recent?.length) setLastMatch(recent[0]);

      setStatus("Hledám společnou výhru…");
      const [m1, m2] = await Promise.all([
        fetch(`${API}/player/${P1}/matches?limit=100`).then(r => r.json()),
        fetch(`${API}/player/${P2}/matches?limit=100`).then(r => r.json()),
      ]);
      const s2 = new Set(m2.map(m => m.match_id));
      const wins = m1.filter(m => s2.has(m.match_id) && (m.radiant_win === (m.player_slot < 128)));
      if (wins.length) setSharedMatch(wins[0]);
      else {
        const any = m1.filter(m => s2.has(m.match_id));
        if (any.length) setSharedMatch({ ...any[0], _noWin: true });
      }

      setPhase("done");
    } catch(e) {
      setErr(e.message);
      setPhase("error");
    }
  }

  function SecHdr({ title }) {
    return (
      <div style={{display:"flex",alignItems:"center",gap:12,margin:"28px 0 12px"}}>
        <div style={{flex:1,height:1,background:"linear-gradient(90deg,#2a3a50,transparent)"}}/>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:12,letterSpacing:3,color:"#c89b3c",textTransform:"uppercase",filter:"drop-shadow(0 0 4px rgba(200,155,60,.5))"}}>{title}</div>
        <div style={{flex:1,height:1,background:"linear-gradient(90deg,transparent,#2a3a50)"}}/>
      </div>
    );
  }

  function PlayerCard({ data, id }) {
    if (!data) return <div style={S.dimBox}>—</div>;
    const wr = (data.wins+data.losses)>0 ? ((data.wins/(data.wins+data.losses))*100).toFixed(1) : "—";
    return (
      <div style={S.card}>
        <div style={S.cardTop}/>
        {data.avatar ? <img src={data.avatar} alt="" style={S.ava}/> : <div style={S.avaPh}>⚔</div>}
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:"#f0c050",letterSpacing:1}}>{data.name}</div>
          <div style={{fontSize:11,color:"#6888a0",letterSpacing:2,textTransform:"uppercase",marginTop:2}}>🏅 {data.rank}</div>
          <div style={{display:"flex",gap:16,marginTop:10}}>
            {[{v:data.wins,l:"Výhry",c:"#4caf6a"},{v:data.losses,l:"Prohry",c:"#e05050"},{v:`${wr}%`,l:"Winrate"}].map(({v,l,c})=>(
              <div key={l}><div style={{fontSize:17,fontWeight:700,color:c||"#c8d8e8"}}>{v}</div><div style={{fontSize:10,color:"#6888a0",letterSpacing:2,textTransform:"uppercase"}}>{l}</div></div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4,textAlign:"right"}}>
          <a href={`https://www.dotabuff.com/players/${id}`} target="_blank" rel="noreferrer" style={S.lnk}>DOTABUFF →</a>
          <a href={`https://www.opendota.com/players/${id}`} target="_blank" rel="noreferrer" style={S.lnk}>OPENDOTA →</a>
        </div>
      </div>
    );
  }

  function MatchCard({ data, badge }) {
    if (!data) return <div style={S.dimBox}>Hra nenalezena</div>;
    const won = !data._noWin && (data.radiant_win === (data.player_slot < 128));
    const ac  = data._noWin?"#c89b3c":won?"#4caf6a":"#e05050";
    const lbl = data._noWin?"SPOLEČNÁ HRA":won?"VÝHRA":"PROHRA";
    const bg  = data._noWin?"rgba(200,155,60,.15)":won?"rgba(45,122,58,.25)":"rgba(163,48,48,.25)";
    const bd  = data._noWin?"#c89b3c":won?"#2d7a3a":"#a33030";
    const hero = heroes[data.hero_id]||{name:`Hero #${data.hero_id}`,slug:null};
    const hi = hero.slug ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${hero.slug}.png` : null;
    const items = [data.item_0,data.item_1,data.item_2,data.item_3,data.item_4,data.item_5].filter(Boolean);
    return (
      <div>
        {badge && (
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(200,155,60,.08)",border:"1px solid rgba(200,155,60,.3)",padding:"6px 14px",borderRadius:1,marginBottom:10}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#4caf6a",boxShadow:"0 0 6px #4caf6a",animation:"pulse 2s infinite"}}/>
            <span style={{fontSize:11,letterSpacing:2,color:"#c89b3c",textTransform:"uppercase"}}>{badge}</span>
          </div>
        )}
        <div style={{...S.card,display:"block",padding:0,borderLeft:`3px solid ${ac}`}}>
          <div style={{background:"#0f1822",padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,borderBottom:"1px solid #2a3a50"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontFamily:"'Cinzel',serif",fontSize:11,fontWeight:700,letterSpacing:3,padding:"3px 12px",borderRadius:1,background:bg,color:ac,border:`1px solid ${bd}`}}>{lbl}</span>
              <span style={{fontSize:11,color:"#6888a0"}}>⏱ {fmtDur(data.duration)}</span>
            </div>
            <span style={{fontSize:11,color:"#6888a0"}}>{timeAgo(data.start_time)} · #{data.match_id}</span>
          </div>
          <div style={{padding:"16px 18px",display:"grid",gridTemplateColumns:"auto 1fr auto",gap:14,alignItems:"center"}}>
            {hi ? <img src={hi} alt="" style={{width:80,height:45,objectFit:"cover",border:"1px solid #2a3a50",borderRadius:1}} onError={e=>e.target.style.display="none"}/>
               : <div style={{width:80,height:45,background:"#0d1520",border:"1px solid #2a3a50",borderRadius:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#6888a0"}}>?</div>}
            <div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:14,fontWeight:700,color:"#f0c050",letterSpacing:1}}>{hero.name}</div>
              <div style={{fontSize:10,color:"#6888a0",letterSpacing:2,textTransform:"uppercase",marginTop:2}}>Dota 2</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:22,fontWeight:700,letterSpacing:2}}>
                <span style={{color:"#4caf6a"}}>{data.kills}</span><span style={{color:"#2a3a50"}}>/</span>
                <span style={{color:"#e05050"}}>{data.deaths}</span><span style={{color:"#2a3a50"}}>/</span>
                <span style={{color:"#80b0d0"}}>{data.assists}</span>
              </div>
              <div style={{fontSize:10,color:"#6888a0",letterSpacing:3,textTransform:"uppercase"}}>K / D / A</div>
            </div>
          </div>
          <div style={{padding:"0 18px 12px",display:"flex",gap:20,flexWrap:"wrap"}}>
            {[{v:data.gold_per_min||0,l:"GPM",c:"#c89b3c"},{v:data.xp_per_min||0,l:"XPM",c:"#a0c0ff"},{v:data.last_hits||0,l:"LH"},{v:`${((data.hero_damage||0)/1000).toFixed(1)}k`,l:"DMG",c:"#e05050"}].map(({v,l,c})=>(
              <div key={l} style={{display:"flex",alignItems:"baseline",gap:5}}>
                <span style={{fontSize:15,fontWeight:700,color:c||"#c8d8e8"}}>{v}</span>
                <span style={{fontSize:10,color:"#6888a0",letterSpacing:2,textTransform:"uppercase"}}>{l}</span>
              </div>
            ))}
          </div>
          {items.length>0&&<div style={{padding:"0 18px 12px",display:"flex",gap:4,flexWrap:"wrap"}}>
            {items.map((id,i)=><img key={i} style={{width:36,height:27,objectFit:"cover",border:"1px solid #2a3a50",borderRadius:1}} src={`https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/${id}_lg.png`} onError={e=>e.target.style.display="none"} alt=""/>)}
          </div>}
          <a href={`https://www.dotabuff.com/matches/${data.match_id}`} target="_blank" rel="noreferrer" style={{fontSize:10,color:"#6888a0",textDecoration:"none",padding:"0 18px 12px",display:"block",letterSpacing:1}}>→ Zobrazit na Dotabuff</a>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Rajdhani:wght@300;400;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{background:#080c10}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.8)}}`}</style>
      <div style={{background:"#080c10",color:"#c8d8e8",fontFamily:"'Rajdhani',sans-serif",minHeight:"100vh"}}>
        <div style={{position:"fixed",inset:0,pointerEvents:"none",background:"radial-gradient(ellipse 80% 60% at 20% 10%,rgba(30,80,160,.12) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 80% 90%,rgba(163,48,48,.10) 0%,transparent 60%)"}}/>
        <div style={{maxWidth:920,margin:"0 auto",padding:"0 16px 60px",position:"relative",zIndex:1}}>
          <div style={{textAlign:"center",padding:"40px 0 24px"}}>
            <div style={{fontSize:11,fontFamily:"'Cinzel',serif",letterSpacing:6,color:"#c89b3c",opacity:.8,marginBottom:6}}>⚔ DOTA 2 ⚔</div>
            <h1 style={{fontFamily:"'Cinzel',serif",fontSize:"clamp(26px,5vw,48px)",fontWeight:900,letterSpacing:4,background:"linear-gradient(180deg,#f0c050 0%,#c89b3c 50%,#7a5a1a 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>Match Tracker</h1>
            <p style={{fontSize:13,letterSpacing:3,color:"#6888a0",marginTop:6,textTransform:"uppercase"}}>Player Statistics & Shared Victories</p>
            <div style={{height:2,marginTop:18,background:"linear-gradient(90deg,transparent,#c89b3c,#f0c050,#c89b3c,transparent)",filter:"drop-shadow(0 0 6px #c89b3c)"}}/>
          </div>

          {phase==="loading"&&<div style={{textAlign:"center",padding:"80px 20px"}}>
            <div style={{width:48,height:48,border:"3px solid #2a3a50",borderTopColor:"#c89b3c",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 20px"}}/>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:14,letterSpacing:3,color:"#c89b3c",marginBottom:8}}>{status}</div>
            <div style={{fontSize:12,color:"#6888a0",letterSpacing:2}}>Prosím čekej…</div>
          </div>}

          {phase==="error"&&<div style={{padding:30,textAlign:"center",color:"#e05050",background:"rgba(163,48,48,.08)",border:"1px solid #a33030",borderRadius:2,margin:"20px 0"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:16,marginBottom:8}}>⚠ Chyba připojení</div>
            <div style={{fontSize:13,marginBottom:16}}>{err}</div>
            <button onClick={loadAll} style={{background:"transparent",border:"1px solid #c89b3c",color:"#c89b3c",padding:"8px 20px",fontFamily:"'Rajdhani',sans-serif",fontSize:13,letterSpacing:2,cursor:"pointer",textTransform:"uppercase"}}>↺ Zkusit znovu</button>
          </div>}

          {phase==="done"&&<>
            <SecHdr title="⚡ Primární Hráč"/><PlayerCard data={p1} id={P1}/>
            <SecHdr title="🗡 Poslední Hra"/><MatchCard data={lastMatch}/>
            <SecHdr title="🛡 Spoluhráč"/><PlayerCard data={p2} id={P2}/>
            <SecHdr title="🏆 Poslední Společná Výhra"/><MatchCard data={sharedMatch} badge="Oba hráči ⚔ společná hra"/>
          </>}

          <div style={{textAlign:"center",paddingTop:50,fontSize:11,color:"#6888a0",letterSpacing:2,textTransform:"uppercase",opacity:.4}}>Data: OpenDota API</div>
        </div>
      </div>
    </>
  );
}

const S = {
  card:{background:"#111a25",border:"1px solid #2a3a50",borderRadius:2,padding:"18px 22px",display:"flex",alignItems:"center",gap:16,position:"relative",overflow:"hidden"},
  cardTop:{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,#c89b3c,transparent)"},
  ava:{width:60,height:60,borderRadius:"50%",border:"2px solid #c89b3c",objectFit:"cover",flexShrink:0,filter:"drop-shadow(0 0 8px rgba(200,155,60,.4))"},
  avaPh:{width:60,height:60,borderRadius:"50%",border:"2px solid #2a3a50",background:"#0d1520",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#6888a0"},
  lnk:{fontSize:11,color:"#1e90ff",textDecoration:"none",letterSpacing:1,opacity:.7},
  dimBox:{background:"#111a25",border:"1px solid #2a3a50",borderRadius:2,padding:20,textAlign:"center",color:"#6888a0",fontSize:13},
};
