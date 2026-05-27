import { useState, useEffect } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
const TRONCHI      = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const RAMI         = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const ANIMALI      = ["Ratto","Bue","Tigre","Coniglio","Drago","Serpente","Cavallo","Capra","Scimmia","Gallo","Cane","Maiale"];
const ANIMALI_EMOJI= ["🐀","🐂","🐯","🐇","🐲","🐍","🐎","🐐","🐒","🐓","🐕","🐖"];
const TRONCHI_NOMI = ["Jia","Yi","Bing","Ding","Wu","Ji","Geng","Xin","Ren","Gui"];
const ZODIAC_NOMI  = ["Ariete","Toro","Gemelli","Cancro","Leone","Vergine","Bilancia","Scorpione","Sagittario","Capricorno","Acquario","Pesci"];
const ZODIAC_SYM   = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const MESI_NOMI    = ["Primo","Secondo","Terzo","Quarto","Quinto","Sesto","Settimo","Ottavo","Nono","Decimo","Undicesimo","Dodicesimo","Intercalare"];
const MESI_EL      = ["terra","legno","legno","fuoco","fuoco","terra","metallo","metallo","acqua","acqua","terra","legno","fuoco"];

const EKADASHI_DATES = [
  "2025-01-10","2025-01-25","2025-02-08","2025-02-24","2025-03-10","2025-03-25",
  "2025-04-08","2025-04-27","2025-05-12","2025-05-27","2025-06-10","2025-06-25",
  "2025-07-10","2025-07-24","2025-08-09","2025-08-23","2025-09-07","2025-09-22",
  "2025-10-06","2025-10-21","2025-11-05","2025-11-20","2025-12-04","2025-12-19",
  "2026-01-03","2026-01-18","2026-02-02","2026-02-16","2026-03-03","2026-03-18",
  "2026-04-02","2026-04-13","2026-04-27","2026-05-13","2026-05-27",
  "2026-06-11","2026-06-25","2026-07-10","2026-07-25","2026-08-09","2026-08-23",
  "2026-09-07","2026-09-22","2026-10-06","2026-10-21","2026-11-05","2026-11-20",
  "2026-12-04","2026-12-20",
  "2027-01-03","2027-01-18","2027-02-02","2027-02-17",
].map(s => { const [y,m,d]=s.split("-"); return new Date(+y,+m-1,+d).toDateString(); });

function isEkadashi(date) { return EKADASHI_DATES.includes(date.toDateString()); }

const ANIMALI_INFO = [
  { nome:"Ratto",    emoji:"🐀", el:"acqua",  tratti:"Intelligente, adattabile, arguto, persuasivo. Eccelle nel networking e nel trovare soluzioni creative. Natura Yang.", ore:"23:00–01:00" },
  { nome:"Bue",      emoji:"🐂", el:"terra",  tratti:"Diligente, affidabile, paziente, determinato. Apprezza l'onestà e la perseveranza. Lavora con costanza verso i suoi obiettivi. Natura Yin.", ore:"01:00–03:00" },
  { nome:"Tigre",    emoji:"🐯", el:"legno",  tratti:"Coraggiosa, appassionata, carismatica. Presenza magnetica che ispira gli altri. Competitiva e imprevedibile. Natura Yang.", ore:"03:00–05:00" },
  { nome:"Coniglio", emoji:"🐇", el:"legno",  tratti:"Tranquillo, elegante, gentile, diplomatico. Sensibile alla bellezza, ama la pace. Responsabile e riflessivo. Natura Yin.", ore:"05:00–07:00" },
  { nome:"Drago",    emoji:"🐲", el:"terra",  tratti:"Fiducioso, entusiasta, visionario. Il più potente dello zodiaco cinese. Generoso e capace di grandi imprese. Natura Yang.", ore:"07:00–09:00" },
  { nome:"Serpente", emoji:"🐍", el:"fuoco",  tratti:"Enigmatico, saggio, intuitivo. Pensa in profondità prima di agire. Dotato di grande intelligenza interiore. Natura Yin.", ore:"09:00–11:00" },
  { nome:"Cavallo",  emoji:"🐎", el:"fuoco",  tratti:"Energico, libero, entusiasta. Ama il movimento e l'avventura. Difficile da legare ma leale con chi ama. Natura Yang.", ore:"11:00–13:00" },
  { nome:"Capra",    emoji:"🐐", el:"terra",  tratti:"Calma, creativa, comprensiva. Sensibile all'arte e alla natura. Preferisce la pace ai conflitti. Natura Yin.", ore:"13:00–15:00" },
  { nome:"Scimmia",  emoji:"🐒", el:"metallo",tratti:"Acuta, curiosa, versatile. Risolve i problemi con umorismo. Brillante e imprevedibile, sa adattarsi a tutto. Natura Yang.", ore:"15:00–17:00" },
  { nome:"Gallo",    emoji:"🐓", el:"metallo",tratti:"Attento, preciso, laborioso. Osservatore acuto, diretto nelle opinioni. Molto organizzato e affidabile. Natura Yin.", ore:"17:00–19:00" },
  { nome:"Cane",     emoji:"🐕", el:"terra",  tratti:"Leale, onesto, protettivo. Il più fedele dello zodiaco. Si prende cura degli altri con profonda dedizione. Natura Yang.", ore:"19:00–21:00" },
  { nome:"Maiale",   emoji:"🐖", el:"acqua",  tratti:"Generoso, compassionevole, sincero. Ama i piaceri della vita. Ingenuo ma puro di cuore, porta abbondanza. Natura Yin.", ore:"21:00–23:00" },
];

const TRONCHI_INFO = [
  { nome:"Jia 甲", el:"legno",  polarita:"Yang", desc:"Il primo soffio. Legno Yang: la quercia, la forza che spinge verso la luce. Energia pionieristica, creatività che non si piega." },
  { nome:"Yi 乙",  el:"legno",  polarita:"Yin",  desc:"Legno Yin: il vite rampicante, la flessibilità che avvolge e trova il suo cammino. Grazia, adattamento, tenacia silenziosa." },
  { nome:"Bing 丙",el:"fuoco",  polarita:"Yang", desc:"Fuoco Yang: il sole. Calore generoso che illumina tutto senza discriminare. Carisma naturale, espansione, entusiasmo." },
  { nome:"Ding 丁",el:"fuoco",  polarita:"Yin",  desc:"Fuoco Yin: la fiamma di una candela. Luce interiore, intuizione, calore intimo. Guida delicata che orienta senza abbagliare." },
  { nome:"Wu 戊",  el:"terra",  polarita:"Yang", desc:"Terra Yang: la montagna. Solidità, protezione, stabilità assoluta. Presenza imponente che rassicura e sostiene." },
  { nome:"Ji 己",  el:"terra",  polarita:"Yin",  desc:"Terra Yin: il campo fertile. Capacità di nutrire e contenere, di ricevere e trasformare. Cura, memoria, radicamento." },
  { nome:"Geng 庚",el:"metallo",polarita:"Yang", desc:"Metallo Yang: la spada. Determinazione, precisione, capacità di tagliare l'essenziale dal superfluo. Giustizia ferma." },
  { nome:"Xin 辛", el:"metallo",polarita:"Yin",  desc:"Metallo Yin: il gioiello. Raffinatezza, bellezza nella perfezione. Sensibilità estetica e ricerca della qualità assoluta." },
  { nome:"Ren 壬", el:"acqua",  polarita:"Yang", desc:"Acqua Yang: l'oceano. Profondità inesauribile, potenziale sconfinato. Capacità di contenere tutto e muoversi in grande." },
  { nome:"Gui 癸", el:"acqua",  polarita:"Yin",  desc:"Acqua Yin: la rugiada, la pioggia sottile. Intuizione silenziosa, saggezza che penetra piano ma in profondità." },
];

const ELEMENTI = {
  legno:   { nome:"Legno",   colore:"#4a7c59", bg:"#e8f5e9", char:"木", essenza:"Il Legno è espansione, crescita, visione. Rappresenta la primavera e il risveglio.\n\nAspetto Yang: ambizione, creatività, iniziativa, generosità.\nAspetto Yin: rigidità, frustrazione, difficoltà a lasciar andare." },
  fuoco:   { nome:"Fuoco",   colore:"#b5451b", bg:"#fde8e0", char:"火", essenza:"Il Fuoco è trasformazione, gioia, connessione. Rappresenta l'estate e il cuore.\n\nAspetto Yang: carisma, entusiasmo, passione, chiarezza.\nAspetto Yin: ansia, impulsività, eccesso di stimolazione." },
  terra:   { nome:"Terra",   colore:"#8b6914", bg:"#fdf3dc", char:"土", essenza:"La Terra è centro, stabilità, nutrimento. Rappresenta le transizioni tra stagioni.\n\nAspetto Yang: affidabilità, cura, concretezza, radicamento.\nAspetto Yin: preoccupazione, rimuginio, difficoltà a cambiare." },
  metallo: { nome:"Metallo", colore:"#6b7280", bg:"#f1f1f0", char:"金", essenza:"Il Metallo è purezza, struttura, essenzialità. Rappresenta l'autunno e il discernimento.\n\nAspetto Yang: precisione, integrità, forza interiore.\nAspetto Yin: rigidità, malinconia, perfezionismo." },
  acqua:   { nome:"Acqua",   colore:"#1a5276", bg:"#dceefb", char:"水", essenza:"L'Acqua è profondità, saggezza, flusso. Rappresenta l'inverno e la fonte di tutta la vita.\n\nAspetto Yang: intuizione, adattabilità, intelligenza.\nAspetto Yin: paura, isolamento, stagnazione." },
};
const TRONCO_EL = ["legno","legno","fuoco","fuoco","terra","terra","metallo","metallo","acqua","acqua"];
const RAMO_EL   = ["acqua","terra","legno","legno","terra","fuoco","fuoco","terra","metallo","metallo","terra","acqua"];

const BELLEZZA = {
  "Luna Nuova":        { pelle:"Pelle sensibile e ricettiva — ideale per scrub e pulizia profonda.", capelli:"Momento di rinnovo: ottimo per un nuovo taglio o cambio look.", unghie:"Prova colori nuovi, è il momento giusto per osare.", corpo:"Inizia nuove abitudini e routine di depurazione." },
  "Crescente":         { pelle:"Predisposta ad assorbire: applica maschere nutrienti e sieri.", capelli:"Taglia le punte per stimolare la crescita.", unghie:"Taglia per favorire ricrescita forte e sana.", corpo:"Alta energia: inizia esercizi e trattamenti rigeneranti." },
  "Primo Quarto":      { pelle:"Usa prodotti attivi e antiossidanti.", capelli:"Buon momento per trattamenti rinforzanti e colori brillanti.", unghie:"Cura le cuticole e idrata le mani.", corpo:"Massaggi rigeneranti con oli essenziali." },
  "Gibbosa Crescente": { pelle:"Trattamenti idratanti profondi.", capelli:"Evita lavaggi eccessivi, l'olio naturale protegge.", unghie:"Applica oli nutrienti.", corpo:"Prepara il corpo alla luna piena: riposo e idratazione." },
  "Luna Piena":        { pelle:"Massima permeabilità: ideale per maschere intensive e anti-età.", capelli:"Trattamenti rinforzanti al massimo dell'efficacia.", unghie:"Le unghie crescono velocemente — rinforza e ritocca il colore.", corpo:"Depurazione, sauna, drenaggio linfatico." },
  "Gibbosa Calante":   { pelle:"Elimina impurità e cellule morte.", capelli:"Taglia le punte: la forma si mantiene più a lungo.", unghie:"Taglia per mantenere la forma nel tempo.", corpo:"Depilazione duratura, trattamenti disintossicanti." },
  "Ultimo Quarto":     { pelle:"Usa prodotti leggeri e detossinanti.", capelli:"Ottimo per tagli duraturi e tinte che restano a lungo.", unghie:"Forma duratura: il taglio tiene più a lungo.", corpo:"Ottimo per trattamenti anti-cellulite." },
  "Calante":           { pelle:"Creme calmanti e rigeneranti notturne.", capelli:"Trattamenti lenitivi e nutrienti.", unghie:"Idrata e riposa le mani.", corpo:"Momento di riposo e recupero energetico profondo." },
};

// ── Default data ──────────────────────────────────────────────────────────────
const DEFAULT_ROUTINE_CFG = [
  { id:"r1", label:"Meditazione",  durata:10, attiva:true },
  { id:"r2", label:"Plank",         durata:3,  attiva:true },
  { id:"r3", label:"Acqua tiepida", durata:2,  attiva:true },
  { id:"r4", label:"Stretching",    durata:10, attiva:true },
  { id:"r5", label:"Verticale",     durata:5,  attiva:true },
];

const DEFAULT_HABIT_CFG = [
  { id:"h1", label:"Acqua",       tipo:"numero", unita:"l"   },
  { id:"h2", label:"Sonno",       tipo:"tempo",  unita:"h"   },
  { id:"h3", label:"Passi",       tipo:"numero", unita:""    },
  { id:"h4", label:"Lettura",     tipo:"tempo",  unita:"min" },
  { id:"h5", label:"Meditazione", tipo:"tempo",  unita:"min" },
];

// ── Luna ──────────────────────────────────────────────────────────────────────
const SYNODIC = 29.530588853, SIDEREAL = 27.321661, MOON_REF_JD = 2451549.7597;
function dateToJD(d) {
  const utcNoon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0, 0);
  return utcNoon.getTime() / 864e5 + 2440587.5;
}
function moonPhase(d) { const x=dateToJD(d)-MOON_REF_JD; return((x%SYNODIC)+SYNODIC)%SYNODIC; }
function moonEmoji(p) { if(p<1.85)return"🌑";if(p<5.54)return"🌒";if(p<9.22)return"🌓";if(p<12.91)return"🌔";if(p<16.61)return"🌕";if(p<20.30)return"🌖";if(p<23.99)return"🌗";if(p<27.68)return"🌘";return"🌑"; }
function moonName(p) { if(p<1.85)return"Luna Nuova";if(p<5.54)return"Crescente";if(p<9.22)return"Primo Quarto";if(p<12.91)return"Gibbosa Crescente";if(p<16.61)return"Luna Piena";if(p<20.30)return"Gibbosa Calante";if(p<23.99)return"Ultimo Quarto";if(p<27.68)return"Calante";return"Luna Nuova"; }
function moonKey(p) { const H=0.7,nm=p>SYNODIC-H?p-SYNODIC:p; if(Math.abs(nm)<=H)return"🌑";if(Math.abs(p-7.38)<=H)return"🌓";if(Math.abs(p-14.77)<=H)return"🌕";if(Math.abs(p-22.15)<=H)return"🌗";return""; }
function lunaZodiac(d) { const x=dateToJD(d)-MOON_REF_JD; return Math.floor(((x%SIDEREAL)+SIDEREAL)%SIDEREAL/(SIDEREAL/12))%12; }

// ── Ba-Zi ─────────────────────────────────────────────────────────────────────
function baziDay(d) { const n=Math.floor((d-new Date(1924,1,5))/864e5); return{tronco:((n%10)+10)%10,ramo:((n%12)+12)%12}; }
function baziYear(y) { return{tronco:((y-4)%10+10)%10,ramo:((y-4)%12+12)%12}; }
function baziMonth(i) { return{tronco:(i*2)%10,ramo:(i+2)%12}; }
function lunarMonths(anno) {
  let s=new Date(anno,2,20);
  return[30,29,30,29,30,29,30,29,30,29,30,29,30].map((len,i)=>{
    const days=Array.from({length:len},(_,d)=>new Date(s.getTime()+d*864e5));
    const m={nome:MESI_NOMI[i],elemento:MESI_EL[i],giorni:days,start:new Date(s)};
    s=new Date(s.getTime()+len*864e5); return m;
  });
}
function findTodayMese(ms,oggi){let f=0;ms.forEach((m,i)=>{if(m.giorni.some(d=>d.toDateString()===oggi.toDateString()))f=i;});return f;}

const MODAL_BG = {
  legno:"#f0faf3", fuoco:"#fef3ee", terra:"#fdf8ec", metallo:"#f5f5f4", acqua:"#eef6fd", default:"#f8f8f6",
};

// ── localStorage hook ─────────────────────────────────────────────────────────
function useLS(key, defaultValue) {
  const [val, setVal] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s !== null ? JSON.parse(s) : defaultValue;
    } catch { return defaultValue; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }, [key, val]);
  return [val, setVal];
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function Badge({ el, size="sm" }) {
  const e = ELEMENTI[el];
  return (
    <span style={{background:e.bg,color:e.colore,borderRadius:4,padding:size==="sm"?"1px 5px":"2px 8px",fontSize:size==="sm"?10:12,fontWeight:500,border:`0.5px solid ${e.colore}44`}}>
      {e.char} {e.nome}
    </span>
  );
}

function Toggle({ on, onChange, label }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between"}}>
      <span style={{fontSize:13,color:"#222"}}>{label}</span>
      <div onClick={()=>onChange(!on)} style={{width:40,height:22,borderRadius:11,cursor:"pointer",background:on?"#4a7c59":"transparent",border:"2px solid #4a7c59",position:"relative",flexShrink:0,transition:"background 0.2s"}}>
        <div style={{position:"absolute",top:"50%",transform:"translateY(-50%)",left:on?20:3,width:16,height:16,borderRadius:"50%",background:on?"white":"#4a7c59",transition:"left 0.2s,background 0.2s"}}/>
      </div>
    </div>
  );
}

function ModalBox({ onClose, children, zIndex=100, elKey=null }) {
  const bg = elKey ? MODAL_BG[elKey] : MODAL_BG.default;
  const border = elKey ? `0.5px solid ${ELEMENTI[elKey]?.colore ?? "#ccc"}44` : "0.5px solid #ccc4";
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex,padding:"0 1rem"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:bg,border,borderRadius:16,padding:"1.5rem",width:"100%",maxWidth:340,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontSize:16,fontWeight:600,color:"#111"}}>{title}</div>
      <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#555",lineHeight:1,padding:"0 2px"}}>✕</button>
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────
function ElementoModal({ el, onClose }) {
  const e = ELEMENTI[el];
  return (
    <ModalBox onClose={onClose} zIndex={500} elKey={el}>
      <ModalHeader title={`${e.char} ${e.nome}`} onClose={onClose}/>
      <div style={{fontSize:13,lineHeight:1.8,color:"#222",whiteSpace:"pre-line",borderLeft:`3px solid ${e.colore}`,paddingLeft:12}}>{e.essenza}</div>
    </ModalBox>
  );
}

function TroncoModal({ idx, onClose }) {
  const t = TRONCHI_INFO[idx];
  const e = ELEMENTI[t.el];
  return (
    <ModalBox onClose={onClose} zIndex={600} elKey={t.el}>
      <ModalHeader title={`${TRONCHI[idx]} ${t.nome}`} onClose={onClose}/>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
        <Badge el={t.el} size="md"/>
        <span style={{fontSize:12,color:"#666"}}>{t.polarita}</span>
      </div>
      <div style={{fontSize:13,lineHeight:1.8,color:"#222",borderLeft:`3px solid ${e.colore}`,paddingLeft:12}}>{t.desc}</div>
    </ModalBox>
  );
}

function AnimaleModal({ idx, onClose }) {
  const a = ANIMALI_INFO[idx];
  const e = ELEMENTI[a.el];
  return (
    <ModalBox onClose={onClose} zIndex={600} elKey={a.el}>
      <ModalHeader title={`${a.emoji} ${a.nome}`} onClose={onClose}/>
      <div style={{fontSize:13,lineHeight:1.8,color:"#222",borderLeft:`3px solid ${e.colore}`,paddingLeft:12,marginBottom:12}}>{a.tratti}</div>
      <div style={{fontSize:11,color:e.colore,background:`${e.colore}18`,borderRadius:8,padding:"6px 10px"}}>🕐 Ore associate: {a.ore}</div>
    </ModalBox>
  );
}

function EkadashiModal({ onClose }) {
  return (
    <ModalBox onClose={onClose} zIndex={500} elKey="terra">
      <ModalHeader title="Ekadashi — 11° Tithi" onClose={onClose}/>
      <div style={{fontSize:13,lineHeight:1.8,color:"#222",display:"flex",flexDirection:"column",gap:10}}>
        <p><strong>Ekadashi (एकादशी)</strong> significa "undicesimo" in sanscrito. È l'11° Tithi del ciclo lunare — cade due volte al mese, nella quindicina crescente (Shukla Paksha) e in quella calante (Krishna Paksha).</p>
        <p>Nella tradizione yogica e vedica è il momento in cui i fluidi del corpo sono più influenzati dalla luna, favorendo una purificazione profonda di corpo e mente.</p>
        <p><strong>La pratica:</strong> gli yogi digiunano (Upavasa) per purificare l'organismo e approfondire la meditazione. Il digiuno inizia all'alba e si interrompe il giorno seguente dopo l'alba.</p>
        <div style={{background:"#f5f0e8",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#5a4a1a"}}>
          💧 "Stare vicini al Supremo" — il significato di Upavasa in sanscrito
        </div>
      </div>
    </ModalBox>
  );
}

function InfoModal({ onClose }) {
  const [tab,setTab]=useState("tronchi");
  const [subIdx,setSubIdx]=useState(null);
  const tabs=[{k:"tronchi",l:"10 Celesti"},{k:"rami",l:"12 Terrestri"},{k:"bazi",l:"Ba-Zi"}];

  if (subIdx !== null && tab === "tronchi") return <TroncoModal idx={subIdx} onClose={()=>setSubIdx(null)}/>;
  if (subIdx !== null && tab === "rami")    return <AnimaleModal idx={subIdx} onClose={()=>setSubIdx(null)}/>;

  return (
    <ModalBox onClose={onClose} zIndex={350} elKey="acqua">
      <ModalHeader title="Guida Ba-Zi" onClose={onClose}/>
      <div style={{display:"flex",gap:4,marginBottom:16}}>
        {tabs.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{flex:1,fontSize:11,padding:"5px 0",background:tab===t.k?"#4a7c59":"#e0ede6",color:tab===t.k?"white":"#333",border:"none",borderRadius:6,cursor:"pointer",fontWeight:tab===t.k?600:400}}>{t.l}</button>
        ))}
      </div>

      {tab==="tronchi" && (
        <div style={{fontSize:12,lineHeight:1.7}}>
          <p style={{marginBottom:8,color:"#444"}}>I <strong>10 Tronchi Celesti</strong> (天干) — tocca per il significato:</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
            {TRONCHI.map((t,i)=>{
              const el=ELEMENTI[TRONCO_EL[i]];
              return (
                <div key={i} onClick={()=>setSubIdx(i)} style={{background:el.bg,borderRadius:6,padding:"5px 8px",display:"flex",gap:6,alignItems:"center",border:`0.5px solid ${el.colore}33`,cursor:"pointer"}}>
                  <span style={{fontSize:20}}>{t}</span>
                  <div>
                    <div style={{fontSize:10,fontWeight:600,color:el.colore}}>{TRONCHI_NOMI[i]}</div>
                    <div style={{fontSize:9,color:"#666"}}>{el.nome} {i%2===0?"Yang":"Yin"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab==="rami" && (
        <div style={{fontSize:12,lineHeight:1.7}}>
          <p style={{marginBottom:8,color:"#444"}}>I <strong>12 Rami Terrestri</strong> (地支) — tocca un animale:</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
            {RAMI.map((r,i)=>{
              const el=ELEMENTI[RAMO_EL[i]];
              return (
                <div key={i} onClick={()=>setSubIdx(i)} style={{background:el.bg,borderRadius:6,padding:"5px 8px",display:"flex",gap:6,alignItems:"center",border:`0.5px solid ${el.colore}33`,cursor:"pointer"}}>
                  <span style={{fontSize:18}}>{r}</span><span style={{fontSize:16}}>{ANIMALI_EMOJI[i]}</span>
                  <div>
                    <div style={{fontSize:10,fontWeight:600,color:el.colore}}>{ANIMALI[i]}</div>
                    <div style={{fontSize:9,color:"#666"}}>{el.nome}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab==="bazi" && (
        <div style={{fontSize:12,lineHeight:1.7}}>
          <p style={{marginBottom:10,color:"#444"}}><strong>Ba-Zi (八字)</strong> — "Otto Caratteri". Quattro pilastri:</p>
          {[
            {l:"Anno 年",d:"Energia sociale, karma familiare, come il mondo ti percepisce. Definisce il tuo animale zodiacale."},
            {l:"Mese 月",d:"Carriera, ambizioni, energia del padre. Il ciclo delle stagioni della tua vita."},
            {l:"Giorno 日",d:"Il pilastro più personale: il Sé autentico e le relazioni con il partner."},
            {l:"Ora 時",d:"Pensieri interiori, figli, desideri nascosti, percorso spirituale."},
          ].map((p,i)=>(
            <div key={i} style={{background:"#eef6fd",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
              <div style={{fontWeight:600,marginBottom:2,color:"#111"}}>{p.l}</div>
              <div style={{color:"#444",fontSize:11}}>{p.d}</div>
            </div>
          ))}
        </div>
      )}
    </ModalBox>
  );
}

function MeseModal({ mese, idx, onClose }) {
  const bm=baziMonth(idx), el=ELEMENTI[mese.elemento];
  return (
    <ModalBox onClose={onClose} zIndex={200} elKey={mese.elemento}>
      <ModalHeader title={`${mese.nome} Mese`} onClose={onClose}/>
      <div style={{borderRadius:10,padding:"1rem",textAlign:"center",border:`0.5px solid ${el.colore}44`,marginBottom:12,background:`${el.colore}14`}}>
        <div style={{fontSize:40,marginBottom:4}}>{el.char}</div>
        <div style={{fontSize:17,fontWeight:600,color:el.colore}}>{el.nome}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[{label:"Cielo",ch:TRONCHI[bm.tronco],nome:TRONCHI_NOMI[bm.tronco],el:TRONCO_EL[bm.tronco]},
          {label:"Terra",ch:RAMI[bm.ramo],nome:ANIMALI[bm.ramo],el:RAMO_EL[bm.ramo]}].map(p=>(
          <div key={p.label} style={{background:`${ELEMENTI[p.el].colore}14`,borderRadius:8,padding:10,textAlign:"center",border:`0.5px solid ${ELEMENTI[p.el].colore}33`}}>
            <div style={{fontSize:11,color:"#555",marginBottom:3}}>{p.label}</div>
            <div style={{fontSize:30,color:ELEMENTI[p.el].colore}}>{p.ch}</div>
            <div style={{fontSize:12,color:ELEMENTI[p.el].colore,fontWeight:600}}>{p.nome}</div>
            <Badge el={p.el}/>
          </div>
        ))}
      </div>
      <div style={{marginTop:10,fontSize:11,color:"#666",textAlign:"center"}}>
        Dal {mese.start.toLocaleDateString("it-IT",{day:"numeric",month:"long"})} · {mese.giorni.length} giorni
      </div>
    </ModalBox>
  );
}

// ── Events Section (Calendar) ─────────────────────────────────────────────────
function EventsSection({ events, dateKey, setEvents }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState("");
  const [newEl, setNewEl] = useState("legno");
  const dayEvents = events[dateKey] || [];

  function addEvent() {
    if (!newText.trim()) return;
    const ev = { id: Date.now().toString(), testo: newText.trim(), elemento: newEl };
    setEvents(prev => ({ ...prev, [dateKey]: [...(prev[dateKey] || []), ev] }));
    setNewText("");
    setShowAdd(false);
  }

  function deleteEvent(id) {
    setEvents(prev => ({ ...prev, [dateKey]: (prev[dateKey] || []).filter(e => e.id !== id) }));
  }

  return (
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <div style={{fontSize:12,fontWeight:600,color:"#333"}}>📅 Eventi</div>
        <button onClick={()=>setShowAdd(s=>!s)} style={{
          fontSize:11,padding:"3px 10px",background:showAdd?"#eee":"#4a7c59",
          color:showAdd?"#666":"white",border:"none",borderRadius:10,cursor:"pointer",fontWeight:500
        }}>{showAdd ? "✕ Annulla" : "+ Aggiungi"}</button>
      </div>

      {dayEvents.map(ev => {
        const e = ELEMENTI[ev.elemento] || ELEMENTI.legno;
        return (
          <div key={ev.id} style={{
            display:"flex",alignItems:"center",gap:8,padding:"7px 10px",
            background:e.bg,borderRadius:8,marginBottom:4,border:`0.5px solid ${e.colore}44`
          }}>
            <div style={{width:8,height:8,borderRadius:2,background:e.colore,flexShrink:0}}/>
            <span style={{flex:1,fontSize:12,color:"#333"}}>{ev.testo}</span>
            <button onClick={()=>deleteEvent(ev.id)} style={{
              background:"none",border:"none",color:"#ccc",fontSize:18,cursor:"pointer",
              padding:"0 2px",lineHeight:1,flexShrink:0
            }}>×</button>
          </div>
        );
      })}

      {dayEvents.length === 0 && !showAdd && (
        <div style={{fontSize:11,color:"#ccc",textAlign:"center",padding:"4px 0"}}>Nessun evento</div>
      )}

      {showAdd && (
        <div style={{background:"#f8f8f6",borderRadius:10,padding:"12px",border:"0.5px solid #e0e0e0",marginTop:4}}>
          <input
            autoFocus
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if(e.key==="Enter") addEvent(); if(e.key==="Escape") setShowAdd(false); }}
            placeholder="Nome evento…"
            style={{width:"100%",fontSize:13,marginBottom:10,boxSizing:"border-box"}}
          />
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
            {Object.entries(ELEMENTI).map(([k, e]) => (
              <div key={k} onClick={()=>setNewEl(k)} style={{
                display:"flex",alignItems:"center",gap:3,padding:"4px 9px",borderRadius:12,
                cursor:"pointer",fontSize:11,fontWeight:newEl===k?600:400,
                background: newEl===k ? e.colore : e.bg,
                color: newEl===k ? "white" : e.colore,
                border: `0.5px solid ${e.colore}55`,
                transition:"background 0.15s"
              }}>
                {e.char} {e.nome}
              </div>
            ))}
          </div>
          <button onClick={addEvent} style={{
            width:"100%",padding:"8px",fontSize:13,background:"#4a7c59",
            color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:500
          }}>
            Aggiungi evento
          </button>
        </div>
      )}
    </div>
  );
}

// ── Analog Timer ──────────────────────────────────────────────────────────────
function AnalogTimer({ durata, el, onClose }) {
  const total = Math.max(1, durata) * 60;
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const done = remaining === 0;
  const e = ELEMENTI[el] || ELEMENTI.terra;

  useEffect(() => {
    if (!running || done) return;
    const id = setInterval(() => setRemaining(r => r <= 1 ? 0 : r - 1), 1000);
    return () => clearInterval(id);
  }, [running, done]);

  const pct = remaining / total;
  const R = 44, CX = 55, CY = 55, circ = 2 * Math.PI * R;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const fillColor = done ? "#4a7c59" : e.colore;

  return (
    <div style={{
      background:e.bg,borderRadius:12,padding:"14px 12px",
      border:`0.5px solid ${e.colore}33`,marginTop:6,marginBottom:2,
      display:"flex",flexDirection:"column",alignItems:"center",gap:10
    }}>
      <svg width={110} height={110} viewBox="0 0 110 110">
        {/* Track */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={`${e.colore}22`} strokeWidth={10}/>
        {/* Progress arc */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={fillColor}
          strokeWidth={10}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          style={{
            transform:"rotate(-90deg)",
            transformOrigin:`${CX}px ${CY}px`,
            transition: running ? "stroke-dashoffset 0.9s linear" : "none"
          }}
        />
        {done ? (
          <text x={CX} y={CY+5} textAnchor="middle" fontSize={22} fill="#4a7c59" fontWeight={700} fontFamily="inherit">✓</text>
        ) : (
          <>
            <text x={CX} y={CY+4} textAnchor="middle" fontSize={17} fill={e.colore} fontWeight={600} fontFamily="inherit">
              {String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}
            </text>
            <text x={CX} y={CY+18} textAnchor="middle" fontSize={10} fill="#aaa" fontFamily="inherit">{durata} min</text>
          </>
        )}
      </svg>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        {!done && (
          <button onClick={()=>setRunning(r=>!r)} style={{
            fontSize:18,padding:"7px 16px",background:running?"#f5f5f5":e.colore,
            color:running?"#444":"white",border:"none",borderRadius:8,cursor:"pointer",
            lineHeight:1,fontWeight:600,transition:"background 0.15s"
          }}>
            {running ? "⏸" : "▶"}
          </button>
        )}
        {done && (
          <button onClick={()=>{setRemaining(total);setRunning(false);}} style={{
            fontSize:13,padding:"7px 14px",background:"#4a7c59",color:"white",
            border:"none",borderRadius:8,cursor:"pointer"
          }}>↺ Ripeti</button>
        )}
        {!done && (
          <button onClick={()=>{setRemaining(total);setRunning(false);}} style={{
            fontSize:13,padding:"7px 10px",background:"none",border:"0.5px solid #ddd",
            borderRadius:8,cursor:"pointer",color:"#aaa"
          }}>↺</button>
        )}
        <button onClick={onClose} style={{
          fontSize:13,padding:"7px 12px",background:"none",border:"0.5px solid #ddd",
          borderRadius:8,cursor:"pointer",color:"#666"
        }}>✕</button>
      </div>
    </div>
  );
}

// ── Routine Stats ─────────────────────────────────────────────────────────────
function RoutineStats({ routineLog, routineCfg, onClose }) {
  const oggi = new Date();
  const days = Array.from({length:14}, (_, i) => {
    const d = new Date(oggi.getTime() - (13-i) * 86400000);
    const key = d.toDateString();
    const tasks = routineCfg.filter(t => t.attiva);
    const log = routineLog[key] || {};
    const done = tasks.filter(t => log[t.id]).length;
    return {
      key, d,
      label: d.toLocaleDateString("it-IT",{weekday:"short"}).slice(0,1).toUpperCase(),
      pct: tasks.length ? done / tasks.length : 0,
      done, total: tasks.length,
      isOggi: d.toDateString() === oggi.toDateString()
    };
  });

  const avgPct = days.filter(d=>d.total>0).reduce((a,d)=>a+d.pct,0) / Math.max(1,days.filter(d=>d.total>0).length);
  const streak = (() => {
    let s = 0;
    for (let i = 13; i >= 0; i--) {
      if (days[i].pct === 1) s++;
      else break;
    }
    return s;
  })();

  return (
    <div style={{background:"#f8f8f6",borderRadius:12,padding:"14px",marginBottom:10,border:"0.5px solid #e8e8e8"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:12,fontWeight:600,color:"#333"}}>📊 Storico 14 giorni</div>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:16,color:"#aaa",cursor:"pointer",padding:"0 2px"}}>✕</button>
      </div>

      {/* Summary chips */}
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <div style={{background:"#fff",borderRadius:8,padding:"6px 10px",border:"0.5px solid #eee",flex:1,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#4a7c59"}}>{streak}</div>
          <div style={{fontSize:10,color:"#888"}}>streak oggi</div>
        </div>
        <div style={{background:"#fff",borderRadius:8,padding:"6px 10px",border:"0.5px solid #eee",flex:1,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#333"}}>{Math.round(avgPct*100)}%</div>
          <div style={{fontSize:10,color:"#888"}}>media 14gg</div>
        </div>
        <div style={{background:"#fff",borderRadius:8,padding:"6px 10px",border:"0.5px solid #eee",flex:1,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#333"}}>{days.filter(d=>d.pct===1).length}</div>
          <div style={{fontSize:10,color:"#888"}}>complete</div>
        </div>
      </div>

      {/* Bar chart */}
      <div style={{display:"flex",gap:3,alignItems:"flex-end",padding:"4px 0"}}>
        {days.map(({key, label, pct, isOggi}) => (
          <div key={key} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <div style={{height:40,display:"flex",alignItems:"flex-end",width:"100%"}}>
              <div style={{
                width:"100%",
                height:`${Math.max(2, pct*40)}px`,
                background: pct===1 ? "#4a7c59" : pct>0 ? "#4a7c5966" : "#e8e8e8",
                borderRadius:3,
                transition:"height 0.3s"
              }}/>
            </div>
            <div style={{fontSize:8,color:isOggi?"#4a7c59":"#bbb",fontWeight:isOggi?700:400,lineHeight:1}}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Top Navigation ────────────────────────────────────────────────────────────
function TopNav({ view, setView }) {
  const isUtility = ["routine","habit","todo"].includes(view);
  return (
    <div style={{borderBottom:"0.5px solid #eee",position:"sticky",top:0,background:"#fff",zIndex:50}}>
      <div style={{display:"flex",maxWidth:480,margin:"0 auto"}}>
        {[
          {k:"calendario", label:"Calendario", ico:"🗓"},
          {k:"utility",    label:"Utility",    ico:"⚡"},
          {k:"impostazioni",label:"Impostaz.", ico:"⚙️"},
          {k:"bazi",       label:"Ba-Zi",      ico:"☯"},
        ].map(({k,label,ico})=>{
          const active = k==="utility" ? isUtility : view===k;
          return (
            <div key={k} onClick={()=>setView(k==="utility"?"routine":k)}
                 style={{flex:1,textAlign:"center",padding:"8px 0 6px",cursor:"pointer",
                         color:active?"#4a7c59":"#999",
                         borderBottom:active?"2px solid #4a7c59":"2px solid transparent",
                         fontWeight:active?600:400,userSelect:"none"}}>
              <div style={{fontSize:18,lineHeight:1.2}}>{ico}</div>
              <div style={{fontSize:10,marginTop:2}}>{label}</div>
            </div>
          );
        })}
      </div>

      {/* Utility sub-nav with icons */}
      {isUtility && (
        <div style={{display:"flex",padding:"6px 10px",background:"#fafafa",borderBottom:"0.5px solid #eee",maxWidth:480,margin:"0 auto",gap:6}}>
          {[
            {k:"routine", l:"Routine",  ico:"🌅", desc:"Morning"},
            {k:"habit",   l:"Habit",    ico:"📊", desc:"Tracker"},
            {k:"todo",    l:"To-Do",    ico:"✅", desc:"Liste"},
          ].map(({k,l,ico,desc})=>(
            <button key={k} onClick={()=>setView(k)} style={{
              flex:1,
              display:"flex",flexDirection:"column",alignItems:"center",gap:2,
              padding:"8px 4px",
              borderRadius:12,border:"none",cursor:"pointer",
              background:view===k?"#4a7c59":"transparent",
              color:view===k?"white":"#777",
              fontWeight:view===k?600:400,
              transition:"background 0.15s",
            }}>
              <span style={{fontSize:20,lineHeight:1}}>{ico}</span>
              <span style={{fontSize:11,lineHeight:1}}>{l}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Ba-Zi Calculator ──────────────────────────────────────────────────────────
function BaziView() {
  const [data,setData]=useState(""), [ora,setOra]=useState("12"), [ris,setRis]=useState(null);
  function calcola() {
    if(!data) return;
    const d=new Date(data+"T12:00:00"), h=parseInt(ora);
    setRis([
      {l:"Anno",  b:baziYear(d.getFullYear())},
      {l:"Mese",  b:baziMonth(d.getMonth())},
      {l:"Giorno",b:baziDay(d)},
      {l:"Ora",   b:{tronco:Math.floor(h/2)%10,ramo:Math.floor(h/2)%12}},
    ]);
  }
  return (
    <div style={{padding:"1rem",maxWidth:480,margin:"0 auto"}}>
      <div style={{fontSize:16,fontWeight:600,marginBottom:4}}>Ba-Zi personale</div>
      <div style={{fontSize:12,color:"#666",marginBottom:16}}>Inserisci data e ora di nascita per calcolare i tuoi Quattro Pilastri.</div>
      <div style={{background:"#fff",border:"0.5px solid #ddd",borderRadius:12,padding:"1rem"}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
          <input type="date" value={data} onChange={e=>setData(e.target.value)} style={{flex:1,minWidth:140}}/>
          <select value={ora} onChange={e=>setOra(e.target.value)} style={{width:110}}>
            {Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,"0")}:00</option>)}
          </select>
          <button onClick={calcola} style={{padding:"0 16px",background:"#4a7c59",color:"white",border:"none",borderRadius:6}}>Calcola</button>
        </div>
        {ris && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            {ris.map(({l,b})=>{
              const el=TRONCO_EL[b.tronco];
              return (
                <div key={l} style={{background:ELEMENTI[el].bg,borderRadius:8,padding:8,textAlign:"center",border:`0.5px solid ${ELEMENTI[el].colore}33`}}>
                  <div style={{fontSize:10,color:"#666",marginBottom:3}}>{l}</div>
                  <div style={{fontSize:26,color:ELEMENTI[el].colore}}>{TRONCHI[b.tronco]}</div>
                  <div style={{fontSize:22,color:ELEMENTI[el].colore}}>{RAMI[b.ramo]}</div>
                  <div style={{fontSize:10,color:ELEMENTI[el].colore,marginTop:2}}>{ANIMALI[b.ramo]}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {ris && (
        <div style={{marginTop:12,fontSize:11,color:"#777",background:"#f8f8f6",borderRadius:8,padding:"10px 12px",lineHeight:1.6}}>
          <strong>Pilastro del Giorno</strong> (日主) — è il tuo Sé autentico. L'elemento del Tronco del giorno rappresenta la tua natura fondamentale.
        </div>
      )}
    </div>
  );
}

// ── Morning Routine ───────────────────────────────────────────────────────────
function MorningRoutineView({ routineCfg, routineLog, setRoutineLog, setView }) {
  const oggi = new Date();
  const todayKey = oggi.toDateString();
  const tasks = routineCfg.filter(t=>t.attiva);
  const log = routineLog[todayKey] || {};
  const done = tasks.filter(t=>log[t.id]).length;
  const pct = tasks.length > 0 ? Math.round((done/tasks.length)*100) : 0;
  const dayEl = TRONCO_EL[baziDay(oggi).tronco];
  const e = ELEMENTI[dayEl];

  const [activeTimer, setActiveTimer] = useState(null); // taskId
  const [showStats, setShowStats] = useState(false);

  function toggle(id) {
    setRoutineLog(prev=>({
      ...prev,
      [todayKey]: { ...(prev[todayKey]||{}), [id]: !(prev[todayKey]?.[id]) }
    }));
  }

  return (
    <div style={{padding:"1rem",maxWidth:480,margin:"0 auto"}}>
      {/* Header — tap to toggle stats */}
      <div onClick={()=>setShowStats(s=>!s)} style={{
        background:e.bg,borderRadius:12,padding:"12px 14px",marginBottom:10,
        border:`0.5px solid ${e.colore}33`,cursor:"pointer",userSelect:"none"
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:14,fontWeight:600}}>🌅 Morning Routine</div>
            <div style={{fontSize:11,color:"#666",marginTop:2}}>
              {oggi.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}
              {" — "}{done}/{tasks.length} completate
            </div>
          </div>
          <div style={{fontSize:11,color:e.colore,background:`${e.colore}18`,borderRadius:6,padding:"3px 7px",fontWeight:500,flexShrink:0}}>
            {pct}%
          </div>
        </div>
        <div style={{marginTop:8,height:5,borderRadius:2.5,background:`${e.colore}22`,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:2.5,background:e.colore,width:`${pct}%`,transition:"width 0.4s"}}/>
        </div>
        <div style={{fontSize:10,color:"#bbb",marginTop:4,textAlign:"right"}}>tocca per lo storico</div>
      </div>

      {/* Stats panel */}
      {showStats && (
        <RoutineStats
          routineLog={routineLog}
          routineCfg={routineCfg}
          onClose={()=>setShowStats(false)}
        />
      )}

      {/* Task list */}
      {tasks.map(task=>{
        const isDone = !!log[task.id];
        const timerOpen = activeTimer === task.id;
        return (
          <div key={task.id} style={{marginBottom:8}}>
            <div onClick={()=>toggle(task.id)} style={{
              display:"flex",alignItems:"center",gap:12,padding:"12px 14px",
              background:isDone?"#f0faf3":"#fafafa",
              border:`0.5px solid ${isDone?"#4a7c5944":"#eee"}`,
              borderRadius:10,cursor:"pointer",transition:"background 0.15s"
            }}>
              {/* Checkbox */}
              <div style={{
                width:24,height:24,borderRadius:"50%",flexShrink:0,
                background:isDone?"#4a7c59":"transparent",
                border:`2px solid ${isDone?"#4a7c59":"#ccc"}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                transition:"background 0.2s"
              }}>
                {isDone && <span style={{color:"white",fontSize:12,lineHeight:1}}>✓</span>}
              </div>
              {/* Label */}
              <div style={{flex:1}}>
                <div style={{
                  fontSize:14,fontWeight:isDone?400:500,
                  textDecoration:isDone?"line-through":"none",
                  color:isDone?"#aaa":"#111"
                }}>
                  {task.label}
                </div>
                {task.durata>0 && <div style={{fontSize:10,color:"#bbb"}}>{task.durata} min</div>}
              </div>
              {/* Timer button */}
              {task.durata > 0 && (
                <div onClick={ev=>{ev.stopPropagation();setActiveTimer(timerOpen?null:task.id);}} style={{
                  fontSize:18,lineHeight:1,cursor:"pointer",padding:"2px 4px",
                  color:timerOpen?e.colore:"#ddd",
                  transition:"color 0.15s"
                }}>⏱</div>
              )}
            </div>
            {/* Inline timer */}
            {timerOpen && (
              <AnalogTimer
                durata={task.durata}
                el={dayEl}
                onClose={()=>setActiveTimer(null)}
              />
            )}
          </div>
        );
      })}

      {tasks.length===0 && (
        <div style={{fontSize:13,color:"#888",textAlign:"center",padding:"2rem 1rem"}}>
          Nessun task attivo.<br/>Configurali nelle Impostazioni → Routine.
        </div>
      )}
      {done===tasks.length && tasks.length>0 && (
        <div style={{textAlign:"center",padding:"0.75rem",fontSize:14,color:"#4a7c59",fontWeight:600}}>
          ✅ Routine completata!
        </div>
      )}

      {/* Link to settings */}
      <div style={{textAlign:"center",marginTop:20,paddingTop:14,borderTop:"0.5px solid #f0f0f0"}}>
        <button onClick={()=>setView("impostazioni")} style={{
          background:"none",border:"none",cursor:"pointer",
          fontSize:12,color:"#aaa",padding:"4px 8px"
        }}>
          ⚙ Configura Routine
        </button>
      </div>
    </div>
  );
}

// ── Habit Tracker ─────────────────────────────────────────────────────────────
function HabitTrackerView({ habitCfg, habitLog, setHabitLog, setView }) {
  const oggi = new Date();
  const todayKey = oggi.toDateString();
  const log = habitLog[todayKey] || {};

  function setVal(id, value) {
    setHabitLog(prev=>({
      ...prev,
      [todayKey]: { ...(prev[todayKey]||{}), [id]: value }
    }));
  }

  function getStreak(habitId) {
    let streak = 0;
    for (let i=0; i<30; i++) {
      const key = new Date(oggi.getTime()-i*86400000).toDateString();
      const v = habitLog[key]?.[habitId];
      if (v !== undefined && v !== "" && v !== "0" && +v > 0) streak++;
      else break;
    }
    return streak;
  }

  const days7 = Array.from({length:7},(_,i)=>{
    const d = new Date(oggi.getTime()-(6-i)*86400000);
    return { key:d.toDateString(), label:d.toLocaleDateString("it-IT",{weekday:"short"}).slice(0,1).toUpperCase() };
  });

  return (
    <div style={{padding:"1rem",maxWidth:480,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
        <div style={{fontSize:16,fontWeight:600}}>📊 Habit Tracker</div>
      </div>
      <div style={{fontSize:12,color:"#666",marginBottom:14}}>
        {oggi.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}
      </div>

      {habitCfg.map(habit=>{
        const val = log[habit.id] ?? "";
        const streak = getStreak(habit.id);
        const hasVal = val !== "" && val !== "0" && +val > 0;
        const numVal = parseFloat(val) || 0;

        return (
          <div key={habit.id} style={{
            padding:"12px 14px",background:hasVal?"#f0faf3":"#fafafa",
            border:`0.5px solid ${hasVal?"#4a7c5944":"#eee"}`,
            borderRadius:10,marginBottom:8
          }}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:500}}>{habit.label}</div>
                {streak>1 && <div style={{fontSize:10,color:"#e07b39"}}>🔥 {streak} giorni di fila</div>}
              </div>
              {/* +/- controls */}
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <button
                  onClick={()=>setVal(habit.id, String(Math.max(0, Math.round((numVal-1)*100)/100)))}
                  style={{
                    width:30,height:30,borderRadius:8,border:"0.5px solid #ddd",
                    background:"#f5f5f5",cursor:"pointer",fontSize:18,lineHeight:1,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    flexShrink:0,fontWeight:300,color:"#666"
                  }}>−</button>
                <input
                  type="number" min="0" step="0.1"
                  value={val}
                  onChange={e=>setVal(habit.id,e.target.value)}
                  placeholder="0"
                  style={{width:52,textAlign:"center",fontSize:14,fontWeight:500,padding:"5px 4px",borderRadius:8}}
                />
                <button
                  onClick={()=>setVal(habit.id, String(Math.round((numVal+1)*100)/100))}
                  style={{
                    width:30,height:30,borderRadius:8,border:"none",
                    background:hasVal?"#4a7c59":"#e8e8e8",cursor:"pointer",fontSize:18,lineHeight:1,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    flexShrink:0,fontWeight:400,color:hasVal?"white":"#555",
                    transition:"background 0.15s"
                  }}>+</button>
                {habit.unita && <span style={{fontSize:12,color:"#888",minWidth:20}}>{habit.unita}</span>}
              </div>
            </div>
            <div style={{display:"flex",gap:3,marginTop:8}}>
              {days7.map(({key,label})=>{
                const v = habitLog[key]?.[habit.id];
                const filled = v !== undefined && v !== "" && v !== "0" && +v > 0;
                return (
                  <div key={key} style={{flex:1,textAlign:"center"}}>
                    <div style={{height:4,borderRadius:2,background:filled?"#4a7c59":"#e0e0e0",marginBottom:3}}/>
                    <div style={{fontSize:8,color:key===todayKey?"#4a7c59":"#ccc",fontWeight:key===todayKey?700:400}}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {habitCfg.length===0 && (
        <div style={{fontSize:13,color:"#888",textAlign:"center",padding:"2rem 1rem"}}>
          Nessun habit definito.<br/>Aggiungili nelle Impostazioni → Habit.
        </div>
      )}

      <div style={{textAlign:"center",marginTop:20,paddingTop:14,borderTop:"0.5px solid #f0f0f0"}}>
        <button onClick={()=>setView("impostazioni")} style={{
          background:"none",border:"none",cursor:"pointer",
          fontSize:12,color:"#aaa",padding:"4px 8px"
        }}>
          ⚙ Configura Habit
        </button>
      </div>
    </div>
  );
}

// ── To-Do List ────────────────────────────────────────────────────────────────
function TodoView({ todoLists, setTodoLists }) {
  const [activeId, setActiveId] = useState(()=>todoLists[0]?.id??null);
  const [newListName, setNewListName] = useState("");
  const [showNewList, setShowNewList] = useState(false);
  const [newItemText, setNewItemText] = useState("");

  const list = todoLists.find(l=>l.id===activeId);

  function addList() {
    if (!newListName.trim()) return;
    const id = Date.now().toString();
    setTodoLists(prev=>[...prev,{id,nome:newListName.trim(),items:[]}]);
    setActiveId(id);
    setNewListName("");
    setShowNewList(false);
  }

  function deleteList(id) {
    const remaining = todoLists.filter(l=>l.id!==id);
    setTodoLists(remaining);
    if (activeId===id) setActiveId(remaining[0]?.id??null);
  }

  function addItem() {
    if (!newItemText.trim()||!activeId) return;
    setTodoLists(prev=>prev.map(l=>l.id===activeId
      ? {...l,items:[...l.items,{id:Date.now().toString(),testo:newItemText.trim(),fatto:false}]}
      : l
    ));
    setNewItemText("");
  }

  function toggleItem(itemId) {
    setTodoLists(prev=>prev.map(l=>l.id===activeId
      ? {...l,items:l.items.map(i=>i.id===itemId?{...i,fatto:!i.fatto}:i)}
      : l
    ));
  }

  function deleteItem(itemId) {
    setTodoLists(prev=>prev.map(l=>l.id===activeId
      ? {...l,items:l.items.filter(i=>i.id!==itemId)}
      : l
    ));
  }

  const pending = list?.items.filter(i=>!i.fatto)??[];
  const done    = list?.items.filter(i=>i.fatto)??[];

  return (
    <div style={{padding:"1rem",maxWidth:480,margin:"0 auto"}}>
      {/* List selector */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
        {todoLists.map(l=>(
          <div key={l.id} style={{
            display:"flex",alignItems:"center",gap:4,
            padding:"5px 10px 5px 12px",borderRadius:16,fontSize:12,cursor:"pointer",
            background:activeId===l.id?"#4a7c59":"#f0f0f0",
            color:activeId===l.id?"white":"#444",
          }}>
            <span onClick={()=>setActiveId(l.id)}>{l.nome}</span>
            <span onClick={e=>{e.stopPropagation();deleteList(l.id);}}
                  style={{fontSize:16,lineHeight:1,opacity:0.5,marginLeft:2}}>×</span>
          </div>
        ))}
        {!showNewList
          ? <button onClick={()=>setShowNewList(true)} style={{padding:"5px 10px",fontSize:11,borderRadius:14,background:"transparent",color:"#4a7c59",border:"1px dashed #4a7c59"}}>+ Nuova lista</button>
          : <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <input autoFocus value={newListName} onChange={e=>setNewListName(e.target.value)}
                     onKeyDown={e=>{if(e.key==="Enter")addList();if(e.key==="Escape")setShowNewList(false);}}
                     placeholder="Nome lista" style={{fontSize:12,width:110}}/>
              <button onClick={addList} style={{fontSize:12,padding:"4px 8px"}}>OK</button>
              <button onClick={()=>setShowNewList(false)} style={{fontSize:12,padding:"4px 6px",background:"none",border:"none"}}>✕</button>
            </div>
        }
      </div>

      {list ? (
        <>
          <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:10}}>
            <div style={{fontSize:16,fontWeight:600}}>{list.nome}</div>
            {list.items.length>0 && <div style={{fontSize:11,color:"#aaa"}}>{done.length}/{list.items.length} completati</div>}
          </div>

          {/* Add item input */}
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            <input value={newItemText} onChange={e=>setNewItemText(e.target.value)}
                   onKeyDown={e=>e.key==="Enter"&&addItem()}
                   placeholder="Aggiungi elemento…"
                   style={{flex:1,fontSize:13}}/>
            <button onClick={addItem} style={{padding:"6px 14px",fontWeight:600,background:"#4a7c59",color:"white",border:"none",borderRadius:6}}>+</button>
          </div>

          {/* Pending */}
          {pending.map(item=>(
            <div key={item.id} style={{
              display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
              background:"#fafafa",border:"0.5px solid #eee",borderRadius:8,marginBottom:6
            }}>
              <div onClick={()=>toggleItem(item.id)} style={{
                width:20,height:20,borderRadius:4,cursor:"pointer",flexShrink:0,
                border:"2px solid #ccc",background:"transparent",
                display:"flex",alignItems:"center",justifyContent:"center"
              }}/>
              <span style={{flex:1,fontSize:13}}>{item.testo}</span>
              <span onClick={()=>deleteItem(item.id)} style={{color:"#ddd",cursor:"pointer",fontSize:20,lineHeight:1,padding:"0 2px"}}>×</span>
            </div>
          ))}

          {/* Done section */}
          {done.length>0 && (
            <>
              <div style={{fontSize:10,color:"#bbb",textTransform:"uppercase",letterSpacing:1,marginTop:12,marginBottom:6}}>Completati</div>
              {done.map(item=>(
                <div key={item.id} style={{
                  display:"flex",alignItems:"center",gap:10,padding:"9px 12px",
                  background:"transparent",border:"0.5px solid #f0f0f0",borderRadius:8,marginBottom:4
                }}>
                  <div onClick={()=>toggleItem(item.id)} style={{
                    width:20,height:20,borderRadius:4,cursor:"pointer",flexShrink:0,
                    background:"#4a7c59",border:"2px solid #4a7c59",
                    display:"flex",alignItems:"center",justifyContent:"center"
                  }}>
                    <span style={{color:"white",fontSize:11,lineHeight:1}}>✓</span>
                  </div>
                  <span style={{flex:1,fontSize:13,color:"#bbb",textDecoration:"line-through"}}>{item.testo}</span>
                  <span onClick={()=>deleteItem(item.id)} style={{color:"#e0e0e0",cursor:"pointer",fontSize:20,lineHeight:1,padding:"0 2px"}}>×</span>
                </div>
              ))}
            </>
          )}

          {list.items.length===0 && (
            <div style={{fontSize:13,color:"#bbb",textAlign:"center",padding:"2rem"}}>
              Lista vuota — aggiungi il primo elemento!
            </div>
          )}
        </>
      ) : (
        <div style={{fontSize:13,color:"#aaa",textAlign:"center",padding:"3rem 1rem"}}>
          Crea la tua prima lista.
        </div>
      )}
    </div>
  );
}

// ── Impostazioni ──────────────────────────────────────────────────────────────
function ImpostazioniView({ cfg, setCfg, routineCfg, setRoutineCfg, habitCfg, setHabitCfg }) {
  const [section, setSection] = useState("generale");
  const [newTask, setNewTask] = useState("");
  const [newTaskDur, setNewTaskDur] = useState(5);
  const [newHabit, setNewHabit] = useState("");
  const [newHabitUnit, setNewHabitUnit] = useState("");

  return (
    <div style={{padding:"1rem",maxWidth:480,margin:"0 auto"}}>
      <div style={{fontSize:16,fontWeight:600,marginBottom:12}}>Impostazioni</div>

      <div style={{display:"flex",gap:4,marginBottom:18}}>
        {[{k:"generale",l:"Generale"},{k:"routine",l:"Routine"},{k:"habit",l:"Habit"}].map(t=>(
          <button key={t.k} onClick={()=>setSection(t.k)} style={{
            flex:1,fontSize:12,padding:"7px 0",
            background:section===t.k?"#4a7c59":"#f0f0f0",
            color:section===t.k?"white":"#555",
            border:"none",borderRadius:8,cursor:"pointer",fontWeight:section===t.k?600:400
          }}>{t.l}</button>
        ))}
      </div>

      {section==="generale" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Toggle label="Data gregoriana"            on={cfg.showGreg}    onChange={v=>setCfg(c=>({...c,showGreg:v}))}/>
          <div style={{borderTop:"0.5px solid #eee"}}/>
          <Toggle label="Caratteri cinesi"           on={cfg.showChinese} onChange={v=>setCfg(c=>({...c,showChinese:v}))}/>
          <div style={{borderTop:"0.5px solid #eee"}}/>
          <Toggle label="Segno zodiacale della Luna" on={cfg.showLunaZod} onChange={v=>setCfg(c=>({...c,showLunaZod:v}))}/>
          <div style={{borderTop:"0.5px solid #eee"}}/>
          <Toggle label="Ekadashi"                   on={cfg.showEk}      onChange={v=>setCfg(c=>({...c,showEk:v}))}/>
          <div style={{marginTop:8,fontSize:10,color:"#777",padding:10,background:"#f5f5f5",borderRadius:8,lineHeight:1.6}}>
            <strong>Prossime versioni:</strong> personalizzazione terminologia, fase lunare per GPS, grafici habit, notifiche push.
          </div>
        </div>
      )}

      {section==="routine" && (
        <div>
          <div style={{fontSize:12,color:"#666",marginBottom:12}}>
            Gestisci i task della Morning Routine. Disattiva quelli che non vuoi vedere ogni giorno.
          </div>
          {routineCfg.map(task=>(
            <div key={task.id} style={{
              display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
              background:"#fafafa",border:"0.5px solid #eee",borderRadius:8,marginBottom:6
            }}>
              <div onClick={()=>setRoutineCfg(prev=>prev.map(t=>t.id===task.id?{...t,attiva:!t.attiva}:t))}
                   style={{
                     width:20,height:20,borderRadius:"50%",cursor:"pointer",flexShrink:0,
                     background:task.attiva?"#4a7c59":"transparent",
                     border:`2px solid ${task.attiva?"#4a7c59":"#ccc"}`,
                     display:"flex",alignItems:"center",justifyContent:"center"
                   }}>
                {task.attiva && <span style={{color:"white",fontSize:11,lineHeight:1}}>✓</span>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:task.attiva?"#111":"#aaa"}}>{task.label}</div>
                <div style={{fontSize:10,color:"#bbb"}}>{task.durata} min</div>
              </div>
              <button onClick={()=>setRoutineCfg(prev=>prev.filter(t=>t.id!==task.id))}
                      style={{background:"none",border:"none",color:"#ccc",fontSize:20,cursor:"pointer",padding:"0 4px",lineHeight:1}}>×</button>
            </div>
          ))}
          <div style={{marginTop:12,padding:"10px 12px",background:"#f0faf3",borderRadius:8,border:"0.5px solid #4a7c5933"}}>
            <div style={{fontSize:12,fontWeight:600,color:"#4a7c59",marginBottom:8}}>+ Aggiungi task</div>
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <input value={newTask} onChange={e=>setNewTask(e.target.value)}
                     onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&document.getElementById("btn-add-task")?.click()}
                     placeholder="Nome task" style={{flex:1,minWidth:100,fontSize:12}}/>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <input type="number" value={newTaskDur} onChange={e=>setNewTaskDur(+e.target.value)}
                       min={1} style={{width:52,fontSize:12}}/>
                <span style={{fontSize:11,color:"#888"}}>min</span>
                <button id="btn-add-task" onClick={()=>{
                  if (!newTask.trim()) return;
                  setRoutineCfg(prev=>[...prev,{id:Date.now().toString(),label:newTask.trim(),durata:newTaskDur,attiva:true}]);
                  setNewTask("");
                }} style={{padding:"5px 12px",fontSize:12,background:"#4a7c59",color:"white",border:"none",borderRadius:6,cursor:"pointer"}}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {section==="habit" && (
        <div>
          <div style={{fontSize:12,color:"#666",marginBottom:12}}>
            Definisci i tuoi habit quotidiani da monitorare.
          </div>
          {habitCfg.map(habit=>(
            <div key={habit.id} style={{
              display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
              background:"#fafafa",border:"0.5px solid #eee",borderRadius:8,marginBottom:6
            }}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500}}>{habit.label}</div>
                <div style={{fontSize:10,color:"#bbb"}}>{habit.tipo}{habit.unita?` · ${habit.unita}`:""}</div>
              </div>
              <button onClick={()=>setHabitCfg(prev=>prev.filter(h=>h.id!==habit.id))}
                      style={{background:"none",border:"none",color:"#ccc",fontSize:20,cursor:"pointer",padding:"0 4px",lineHeight:1}}>×</button>
            </div>
          ))}
          <div style={{marginTop:12,padding:"10px 12px",background:"#f0faf3",borderRadius:8,border:"0.5px solid #4a7c5933"}}>
            <div style={{fontSize:12,fontWeight:600,color:"#4a7c59",marginBottom:8}}>+ Aggiungi habit</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <input value={newHabit} onChange={e=>setNewHabit(e.target.value)}
                     placeholder="Nome (es. Acqua)" style={{flex:1,minWidth:100,fontSize:12}}/>
              <input value={newHabitUnit} onChange={e=>setNewHabitUnit(e.target.value)}
                     placeholder="Unità (l, h, min…)" style={{flex:1,minWidth:80,fontSize:12}}/>
              <button onClick={()=>{
                if (!newHabit.trim()) return;
                setHabitCfg(prev=>[...prev,{id:Date.now().toString(),label:newHabit.trim(),tipo:"numero",unita:newHabitUnit.trim()}]);
                setNewHabit(""); setNewHabitUnit("");
              }} style={{padding:"5px 12px",fontSize:12,background:"#4a7c59",color:"white",border:"none",borderRadius:6,cursor:"pointer"}}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const oggi = new Date();
  const initMs = lunarMonths(oggi.getFullYear());

  const [view, setView] = useState("calendario");
  const [anno, setAnno] = useState(oggi.getFullYear());
  const [meseIdx, setMeseIdx] = useState(()=>findTodayMese(initMs,oggi));
  const [selDay, setSelDay] = useState(null);
  const [meseModal, setMeseModal] = useState(false);
  const [elModal, setElModal] = useState(null);
  const [ekModal, setEkModal] = useState(false);
  const [infoModal, setInfoModal] = useState(false);

  // Persistent state via localStorage
  const [cfg, setCfg]             = useLS("bazi_cfg",         {showGreg:false,showChinese:true,showLunaZod:true,showEk:true});
  const [note, setNote]           = useLS("bazi_note",         {});
  const [events, setEvents]       = useLS("bazi_events",       {});
  const [routineCfg, setRoutineCfg] = useLS("bazi_routine_cfg", DEFAULT_ROUTINE_CFG);
  const [routineLog, setRoutineLog] = useLS("bazi_routine_log", {});
  const [habitCfg, setHabitCfg]   = useLS("bazi_habit_cfg",   DEFAULT_HABIT_CFG);
  const [habitLog, setHabitLog]   = useLS("bazi_habit_log",   {});
  const [todoLists, setTodoLists] = useLS("bazi_todo_lists",   []);

  const mesi = lunarMonths(anno);
  const mese = mesi[meseIdx];
  const byYear = baziYear(anno);

  function goOggi(){const a=oggi.getFullYear();setAnno(a);setMeseIdx(findTodayMese(lunarMonths(a),oggi));}
  function prevMese(){if(meseIdx===0){setAnno(a=>a-1);setMeseIdx(12);}else setMeseIdx(m=>m-1);}
  function nextMese(){if(meseIdx===12){setAnno(a=>a+1);setMeseIdx(0);}else setMeseIdx(m=>m+1);}

  const firstDow = mese.giorni[0]?.getDay()??0;
  const cells = [...Array(firstDow).fill(null),...mese.giorni];
  while(cells.length%7!==0) cells.push(null);
  const rows = []; for(let i=0;i<cells.length;i+=7) rows.push(cells.slice(i,i+7));

  return (
    <div style={{fontFamily:"var(--font-sans)",minHeight:"100svh",background:"#fff"}}>
      <TopNav view={view} setView={setView}/>

      <div style={{maxWidth:480,margin:"0 auto"}}>

        {/* ── Calendario ─────────────────────────────────────── */}
        {view==="calendario" && (
          <div style={{padding:"1rem"}}>
            {/* Anno header */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div>
                <div style={{fontSize:20,fontWeight:600}}>{TRONCHI[byYear.tronco]}{RAMI[byYear.ramo]} · {anno}</div>
                <div style={{fontSize:12,color:"#555"}}>{ANIMALI_EMOJI[byYear.ramo]} {ANIMALI[byYear.ramo]} · {ELEMENTI[TRONCO_EL[byYear.tronco]].char} {ELEMENTI[TRONCO_EL[byYear.tronco]].nome}</div>
              </div>
              <div style={{display:"flex",gap:5}}>
                <button onClick={goOggi} style={{fontSize:11,padding:"5px 10px"}}>Oggi</button>
                <button onClick={()=>setInfoModal(true)} style={{fontSize:11,padding:"5px 10px"}}>？</button>
              </div>
            </div>

            {/* Legenda elementi */}
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
              {Object.entries(ELEMENTI).map(([k,e])=>(
                <span key={k} onClick={()=>setElModal(k)} style={{fontSize:11,background:e.bg,color:e.colore,borderRadius:5,padding:"3px 8px",border:`0.5px solid ${e.colore}55`,cursor:"pointer",fontWeight:500}}>{e.char} {e.nome}</span>
              ))}
              <span style={{fontSize:11,color:"#aaa",padding:"3px 4px"}}>🌑🌓🌕🌗</span>
            </div>

            {/* Nav mese */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <button onClick={prevMese} style={{padding:"5px 14px",fontSize:16}}>←</button>
              <div style={{textAlign:"center",cursor:"pointer"}} onClick={()=>setMeseModal(true)}>
                <div style={{fontWeight:600,fontSize:16,textDecoration:"underline",textDecorationStyle:"dotted",textDecorationColor:"#ddd"}}>{mese.nome} Mese</div>
                <div style={{fontSize:12,color:"#555"}}>{ELEMENTI[mese.elemento].char} {ELEMENTI[mese.elemento].nome} · {ANIMALI_EMOJI[baziMonth(meseIdx).ramo]} {ANIMALI[baziMonth(meseIdx).ramo]}</div>
              </div>
              <button onClick={nextMese} style={{padding:"5px 14px",fontSize:16}}>→</button>
            </div>

            {/* Header giorni */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>
              {["Dom","Lun","Mar","Mer","Gio","Ven","Sab"].map(g=>(
                <div key={g} style={{textAlign:"center",fontSize:11,color:"#aaa",padding:"2px 0"}}>{g}</div>
              ))}
            </div>

            {/* Griglia giorni */}
            {rows.map((row,ri)=>(
              <div key={ri} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
                {row.map((d,ci)=>{
                  if(!d) return <div key={ci} style={{height:76}}/>;
                  const bazi=baziDay(d), el=TRONCO_EL[bazi.tronco], e=ELEMENTI[el];
                  const isOggi = d.toDateString()===oggi.toDateString();
                  const isSel  = selDay?.date.toDateString()===d.toDateString();
                  const p=moonPhase(d), mk=moonKey(p);
                  const ek=cfg.showEk&&isEkadashi(d);
                  const lunarDay=mese.giorni.indexOf(d)+1;
                  const haNote=!!note[d.toDateString()];
                  const dayLog=routineLog[d.toDateString()];
                  const hasRoutine=dayLog&&Object.keys(dayLog).some(k=>dayLog[k]);
                  const dayEvents=events[d.toDateString()]||[];
                  const txtColor=isSel?"white":e.colore;
                  return (
                    <div key={ci} onClick={()=>setSelDay(isSel?null:{date:d,bazi})} style={{
                      background:isSel?e.colore:e.bg,
                      border:isOggi?`2px solid ${e.colore}`:`0.5px solid ${e.colore}44`,
                      borderRadius:7,cursor:"pointer",textAlign:"center",
                      height:76,display:"flex",flexDirection:"column",
                      padding:"2px 1px",boxSizing:"border-box",transition:"background 0.15s",
                      position:"relative"
                    }}>
                      {/* Event dots — right side vertical strip */}
                      {dayEvents.length>0 && (
                        <div style={{
                          position:"absolute",right:2,top:5,
                          display:"flex",flexDirection:"column",gap:2,zIndex:1
                        }}>
                          {dayEvents.slice(0,5).map(ev=>(
                            <div key={ev.id} style={{
                              width:3,height:9,borderRadius:1.5,
                              background:isSel?"rgba(255,255,255,0.75)":ELEMENTI[ev.elemento]?.colore||"#666"
                            }}/>
                          ))}
                        </div>
                      )}

                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2px 4px",flexShrink:0}}>
                        <span style={{fontSize:13,fontWeight:800,color:txtColor,lineHeight:1}}>{lunarDay}</span>
                        <span style={{fontSize:12,lineHeight:1}}>{mk}</span>
                      </div>
                      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                        {cfg.showChinese ? (
                          <>
                            <div style={{fontSize:17,lineHeight:1.15,color:txtColor,fontWeight:500}}>{TRONCHI[bazi.tronco]}</div>
                            <div style={{fontSize:15,lineHeight:1.15,color:txtColor}}>{RAMI[bazi.ramo]}</div>
                          </>
                        ) : (
                          <>
                            <div style={{fontSize:9,lineHeight:1.3,color:txtColor,fontWeight:600}}>{TRONCHI_NOMI[bazi.tronco]}</div>
                            <div style={{fontSize:8,lineHeight:1.3,color:isSel?"rgba(255,255,255,0.85)":e.colore}}>{ANIMALI[bazi.ramo]}</div>
                          </>
                        )}
                      </div>
                      <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:3,padding:"2px 4px",flexShrink:0,minHeight:16}}>
                        {cfg.showGreg && <span style={{fontSize:8,color:isSel?"rgba(255,255,255,0.75)":"#aaa"}}>{d.getDate()}/{d.getMonth()+1}</span>}
                        {ek && <div style={{width:7,height:7,borderRadius:"50%",background:isSel?"white":"#2e7d32",flexShrink:0}}/>}
                        {haNote && <div style={{width:5,height:5,borderRadius:"50%",background:isSel?"white":e.colore,flexShrink:0}}/>}
                        {hasRoutine && <div style={{width:5,height:5,borderRadius:"50%",background:isSel?"rgba(255,255,255,0.7)":"#4a7c5966",flexShrink:0}}/>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Pannello giorno selezionato */}
            {selDay && (()=>{
              const p=moonPhase(selDay.date), ph=moonName(p), zod=lunaZodiac(selDay.date);
              const bz=BELLEZZA[ph]||{}, ek=isEkadashi(selDay.date);
              const el=TRONCO_EL[selDay.bazi.tronco], elR=RAMO_EL[selDay.bazi.ramo];
              const dayRoutineLog=routineLog[selDay.date.toDateString()]||{};
              const activeTasks=routineCfg.filter(t=>t.attiva);
              return (
                <div style={{marginTop:12,padding:14,background:ELEMENTI[el].bg,borderRadius:12,border:`0.5px solid ${ELEMENTI[el].colore}33`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,textTransform:"capitalize"}}>
                        {selDay.date.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}
                      </div>
                      {cfg.showGreg && <div style={{fontSize:11,color:"#555"}}>{selDay.date.toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"})}</div>}
                    </div>
                    <button onClick={()=>setSelDay(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#555",padding:"0 4px"}}>✕</button>
                  </div>

                  {/* Events section — above Ba-Zi */}
                  <EventsSection
                    events={events}
                    dateKey={selDay.date.toDateString()}
                    setEvents={setEvents}
                  />

                  {/* Ba-Zi + Luna */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                    <div style={{background:`${ELEMENTI[el].colore}14`,borderRadius:8,padding:"8px 6px",textAlign:"center",border:`1px solid ${ELEMENTI[el].colore}44`}}>
                      <div style={{fontSize:11,color:"#555",marginBottom:3}}>Cielo</div>
                      {cfg.showChinese && <div style={{fontSize:26,lineHeight:1.1,color:ELEMENTI[el].colore}}>{TRONCHI[selDay.bazi.tronco]}</div>}
                      <div style={{fontSize:12,color:ELEMENTI[el].colore,fontWeight:600,marginTop:2}}>{TRONCHI_NOMI[selDay.bazi.tronco]}</div>
                      <Badge el={el}/>
                    </div>
                    <div style={{background:`${ELEMENTI[elR].colore}14`,borderRadius:8,padding:"8px 6px",textAlign:"center",border:`1px solid ${ELEMENTI[elR].colore}44`}}>
                      <div style={{fontSize:11,color:"#555",marginBottom:3}}>Terra</div>
                      {cfg.showChinese && <div style={{fontSize:26,lineHeight:1.1,color:ELEMENTI[elR].colore}}>{RAMI[selDay.bazi.ramo]}</div>}
                      <div style={{fontSize:12,color:ELEMENTI[elR].colore,fontWeight:600,marginTop:2}}>{ANIMALI_EMOJI[selDay.bazi.ramo]} {ANIMALI[selDay.bazi.ramo]}</div>
                      <Badge el={elR}/>
                    </div>
                    <div style={{background:"#f8f8f6",borderRadius:8,padding:"8px 6px",textAlign:"center",border:"0.5px solid #ddd"}}>
                      <div style={{fontSize:11,color:"#555",marginBottom:3}}>Luna</div>
                      <div style={{fontSize:22}}>{moonEmoji(p)}</div>
                      <div style={{fontSize:11,fontWeight:600,marginTop:2}}>{ph}</div>
                      {cfg.showLunaZod && <div style={{fontSize:10,color:"#666",marginTop:1}}>{ZODIAC_SYM[zod]} {ZODIAC_NOMI[zod]}</div>}
                    </div>
                  </div>

                  {/* Ekadashi */}
                  {ek && cfg.showEk && (
                    <div onClick={()=>setEkModal(true)} style={{marginBottom:10,padding:"8px 12px",background:"#f0faf3",borderRadius:8,cursor:"pointer",border:"0.5px solid #2e7d3244",display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:"#2e7d32",flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:"#2e7d32"}}>Ekadashi</div>
                        <div style={{fontSize:10,color:"#555"}}>11° Tithi — tocca per saperne di più</div>
                      </div>
                    </div>
                  )}

                  {/* Consigli bellezza */}
                  {bz.capelli && (
                    <div style={{marginBottom:10,padding:"10px 12px",background:"#fafaf8",borderRadius:8,border:"0.5px solid #ddd"}}>
                      <div style={{fontSize:12,fontWeight:600,marginBottom:6}}>✨ Consigli luna per oggi</div>
                      {[["💆 Pelle",bz.pelle],["💇 Capelli",bz.capelli],["💅 Unghie",bz.unghie],["🧘 Corpo",bz.corpo]].map(([k,v])=>(
                        <div key={k} style={{marginBottom:4}}>
                          <span style={{fontSize:11,fontWeight:600,color:"#555"}}>{k}: </span>
                          <span style={{fontSize:11}}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Morning Routine log per questo giorno */}
                  {activeTasks.length>0 && Object.keys(dayRoutineLog).length>0 && (
                    <div style={{marginBottom:10,padding:"10px 12px",background:"#f0faf3",borderRadius:8,border:"0.5px solid #4a7c5933"}}>
                      <div style={{fontSize:12,fontWeight:600,marginBottom:6,color:"#4a7c59"}}>🌅 Morning Routine</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {activeTasks.map(task=>(
                          <span key={task.id} style={{
                            fontSize:11,padding:"2px 8px",borderRadius:10,
                            background:dayRoutineLog[task.id]?"#4a7c59":"#e8e8e8",
                            color:dayRoutineLog[task.id]?"white":"#888",
                          }}>{task.label}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Note */}
                  <textarea
                    value={note[selDay.date.toDateString()]||""}
                    onChange={e=>setNote(n=>({...n,[selDay.date.toDateString()]:e.target.value}))}
                    placeholder="Aggiungi una nota…"
                    style={{width:"100%",minHeight:48,fontSize:12,border:"0.5px solid #ddd",borderRadius:6,padding:8,background:"#fff",boxSizing:"border-box",resize:"vertical"}}
                  />
                </div>
              );
            })()}
          </div>
        )}

        {view==="routine"      && <MorningRoutineView routineCfg={routineCfg} routineLog={routineLog} setRoutineLog={setRoutineLog} setView={setView}/>}
        {view==="habit"        && <HabitTrackerView habitCfg={habitCfg} habitLog={habitLog} setHabitLog={setHabitLog} setView={setView}/>}
        {view==="todo"         && <TodoView todoLists={todoLists} setTodoLists={setTodoLists}/>}
        {view==="bazi"         && <BaziView/>}
        {view==="impostazioni" && <ImpostazioniView cfg={cfg} setCfg={setCfg} routineCfg={routineCfg} setRoutineCfg={setRoutineCfg} habitCfg={habitCfg} setHabitCfg={setHabitCfg}/>}
      </div>

      {/* Modals */}
      {meseModal && <MeseModal mese={mese} idx={meseIdx} onClose={()=>setMeseModal(false)}/>}
      {elModal   && <ElementoModal el={elModal} onClose={()=>setElModal(null)}/>}
      {ekModal   && <EkadashiModal onClose={()=>setEkModal(false)}/>}
      {infoModal && <InfoModal onClose={()=>setInfoModal(false)}/>}
    </div>
  );
}
