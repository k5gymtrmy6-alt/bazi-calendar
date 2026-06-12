import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import SunCalc from "suncalc";
import { useTranslation } from "react-i18next";
import i18n from "./i18n/index.js";
import { LogoOttagono } from "./assets/icons/index.jsx";

// Locale context — provides translated data objects to all sub-components
const LC = createContext(null);
function useL() { return useContext(LC); }
import {
  firebaseEnabled, onAuthChange, signInAnon, signInEmail, createAccount,
  signOutUser, sendPasswordReset, updateUserEmail, signInWithGoogle,
  pushKey, loadAllKeys, listenUserData, SYNC_KEYS,
} from "./firebase.js";

// ── Constants ─────────────────────────────────────────────────────────────────
const TRONCHI      = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const RAMI         = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const ANIMALI      = ["Ratto","Bue","Tigre","Coniglio","Drago","Serpente","Cavallo","Capra","Scimmia","Gallo","Cane","Maiale"];
const ANIMALI_EMOJI= ["🐀","🐂","🐯","🐇","🐲","🐍","🐎","🐐","🐒","🐓","🐕","🐖"];
const TRONCHI_NOMI  = ["Jia","Yi","Bing","Ding","Wu","Ji","Geng","Xin","Ren","Gui"];
const TRONCHI_EMOJI = ["🌳","🌿","☀️","🕯️","⛰️","🌾","⚔️","💎","🌊","🌧️"];
const ZODIAC_NOMI  = ["Ariete","Toro","Gemelli","Cancro","Leone","Vergine","Bilancia","Scorpione","Sagittario","Capricorno","Acquario","Pesci"];
const ZODIAC_SYM   = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const MESI_NOMI    = ["Primo","Secondo","Terzo","Quarto","Quinto","Sesto","Settimo","Ottavo","Nono","Decimo","Undicesimo","Dodicesimo","Intercalare"];
// Ba-Zi solar months: Yin→Legno, Mao→Legno, Chen→Terra, Si→Fuoco, Wu→Fuoco,
// Wei→Terra, Shen→Metallo, You→Metallo, Xu→Terra, Hai→Acqua, Zi→Acqua, Chou→Terra
const MESI_EL      = ["legno","legno","terra","fuoco","fuoco","terra","metallo","metallo","terra","acqua","acqua","terra"];

const ANIMALI_COSMICI = {
  legno:   { nome:"Drago Azzurro",    dir:"Est",    stagione:"Primavera" },
  fuoco:   { nome:"Fenice Vermiglia", dir:"Sud",    stagione:"Estate" },
  terra:   { nome:"Drago Giallo",     dir:"Centro", stagione:"Transizioni" },
  metallo: { nome:"Tigre Bianca",     dir:"Ovest",  stagione:"Autunno" },
  acqua:   { nome:"Tartaruga Nera",   dir:"Nord",   stagione:"Inverno" },
};
const MODAL_BG_EL = {
  legno:"#f0faf3", fuoco:"#fef3ee", terra:"#fdf8ec", metallo:"#f5f5f4", acqua:"#eef6fd", default:"#f8f8f6",
};

// Algorithmic Ekadashi — works for any year using moon phase (Tithi approximation)
// Shukla Ekadashi ≈ phase 0.33 (11th day waxing), Krishna Ekadashi ≈ phase 0.83 (11th day waning)
const _ekadashiCache = {};
function getEkadashiSet(year) {
  if (_ekadashiCache[year]) return _ekadashiCache[year];
  const set = new Set();
  const start = new Date(year, 0, 1);
  const end   = new Date(year, 11, 31);
  let prev = SunCalc.getMoonIllumination(new Date(start.getTime()-86400000)).phase;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
    const curr = SunCalc.getMoonIllumination(new Date(d)).phase;
    // Shukla Ekadashi: phase crosses ~0.34 (11/30 of waxing half = 11/30 of 0-0.5)
    const SH = 0.340, KR = 0.840;
    if (prev < SH && curr >= SH) set.add(new Date(d).toDateString());
    if (prev < KR && curr >= KR) set.add(new Date(d).toDateString());
    // Handle wrap-around (phase resets from ~1 to ~0 at new moon)
    if (prev > 0.95 && curr < 0.05) prev = 0; // reset for wrap
    prev = curr;
  }
  _ekadashiCache[year] = set;
  return set;
}
function isEkadashi(date) {
  return getEkadashiSet(date.getFullYear()).has(date.toDateString());
}

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
const EL_ORDER  = ["legno","fuoco","terra","metallo","acqua"];

// ── Relazioni cinque elementi 十神 (semplificato) ──────────────────────────────
// Ciclo generazione: legno→fuoco→terra→metallo→acqua→legno
// Ciclo controllo:   legno→terra, fuoco→metallo, terra→acqua, metallo→legno, acqua→fuoco
const EL_GEN=[1,2,3,4,0]; // EL_GEN[i] = elemento generato dall'elemento i
const EL_CTR=[2,3,4,0,1]; // EL_CTR[i] = elemento controllato dall'elemento i
// Relazioni complete per ogni elemento (lookup)
const EL_RELATIONS = Object.fromEntries(EL_ORDER.map((el,i)=>[el,{
  genera:      EL_ORDER[EL_GEN[i]],
  generato_da: EL_ORDER[(i+4)%5],
  controlla:   EL_ORDER[EL_CTR[i]],
  ctrl_da:     EL_ORDER[(i+3)%5],
}]));
function dayRelation(selfEl,dayEl){
  const s=EL_ORDER.indexOf(selfEl),d=EL_ORDER.indexOf(dayEl);
  if(s===d)         return"stesso";
  if(EL_GEN[s]===d) return"esprimo";  // io genero l'elemento del giorno
  if(EL_CTR[s]===d) return"domino";   // io controllo l'elemento del giorno
  if(EL_GEN[d]===s) return"nutrito";  // il giorno mi genera/nutre
  return                  "sfidato";  // il giorno mi controlla/sfida
}
const REL_INFO={
  stesso: {nome:"Compagno",   cin:"比劫",emoji:"🤝",bar:3,
    desc:"Il giorno rispecchia la tua essenza. Energia familiare, forte senso di sé e indipendenza.",
    bene:"Decisioni autonome, iniziative personali, riaffermare la propria identità.",
    cura:"Tendenza ad imporsi sugli altri — bilancia con apertura e ascolto."},
  nutrito:{nome:"Supporto",   cin:"印星",emoji:"🌿",bar:5,
    desc:"Il giorno ti nutre e sostiene. L'ambiente lavora per te: recupero e apprendimento facilitati.",
    bene:"Studio, meditazione, scrittura, riflessione, raccogliere forze interiori.",
    cura:"Può creare passività — agisci anche quando ti senti già a tuo agio."},
  esprimo:{nome:"Espressione",cin:"食傷",emoji:"✨",bar:5,
    desc:"La tua energia fluisce verso il mondo. Giornata creativa: ciò che esprimi trova risonanza.",
    bene:"Arte, comunicazione, insegnamento, performance, nuovi progetti.",
    cura:"Rischio dispersione — scegli su cosa concentrare la tua energia creativa."},
  domino: {nome:"Ricchezza",  cin:"財星",emoji:"💰",bar:4,
    desc:"Il tuo elemento domina l'energia del giorno. Sei in posizione di forza e lucidità pratica.",
    bene:"Affari, trattative, gestione risorse, organizzazione, acquisizioni.",
    cura:"Eccesso di controllo può chiudere opportunità — lascia spazio all'imprevisto."},
  sfidato:{nome:"Autorità",   cin:"官殺",emoji:"⚖️",bar:2,
    desc:"Il giorno sfida la tua natura. Struttura esterna, responsabilità e pressione costruttiva.",
    bene:"Disciplina, doveri formali, crescita sotto pressione, rispetto delle regole.",
    cura:"Evita conflitti inutili — usa la tensione come carburante per superare i tuoi limiti."},
};

// Element background — light pastel in light mode, proper dark tint in dark mode
const ELEMENTI_DARK_BG = { legno:"#111a12", fuoco:"#1a1009", terra:"#1a1709", metallo:"#131314", acqua:"#09101a" };
function elbg(el, dark) {
  const e = ELEMENTI[el];
  if (!e) return dark ? "#1a1a1a" : "#f8f8f6"; // fallback per elemento undefined
  return dark ? (ELEMENTI_DARK_BG[el] || "#1a1a1a") : e.bg;
}

function formatDaysAgo(ts) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  return d === 0 ? "oggi" : d === 1 ? "ieri" : `${d} giorni fa`;
}
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
function cleanOld(arr) { return (arr||[]).filter(x => Date.now() - x.deletedAt < THIRTY_DAYS); }

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

const LUNA_CORPO = {
  "Luna Nuova":        { em:"🌑", corpo:"Energia vitale bassa, corpo ricettivo. Ottimo per digiuni leggeri, depurazione e nuovi inizi. Le ferite cicatrizzano più lentamente — evita interventi se possibile.", natura:"La linfa scende alle radici: semina bulbi e radici. Niente potature.", psiche:"Introversione naturale. Il momento migliore per impostare nuove intenzioni." },
  "Crescente":         { em:"🌒", corpo:"L'energia sale, il corpo assorbe meglio nutrienti e integratori. Aumenta la vitalità e la forza muscolare.", natura:"I succhi salgono: semina piante da frutto e fiori. Irrigazione più efficace.", psiche:"Motivazione e volontà crescono. Affronta le sfide con più slancio." },
  "Primo Quarto":      { em:"🌓", corpo:"Picco di forza e resistenza. Ideale per sport intenso e trattamenti attivi. Sistema circolatorio reattivo.", natura:"Linfa in movimento equilibrato. Buon momento per potatura leggera.", psiche:"Energia decisionale alta. Risolvi conflitti e porta avanti i progetti." },
  "Gibbosa Crescente": { em:"🌔", corpo:"Il corpo trattiene acqua e sostanze. Attenzione al gonfiore. Massima permeabilità intestinale: cura l'alimentazione.", natura:"Frutti al massimo della turgidità. Raccolta di qualità.", psiche:"Tensione crescente, mente affollata. Rallenta e integra prima della piena." },
  "Luna Piena":        { em:"🌕", corpo:"Massima energia vitale. I fluidi corporei al picco: ideale per trattamenti intensivi, ma maggiore rischio di sanguinamento. Evita estrazioni dentali.", natura:"Evita tagli e potature: i tessuti sono gonfi di linfa. Raccolta di frutti maturi.", psiche:"Emozioni amplificate, creatività alta ma anche instabilità. Sonno più leggero." },
  "Gibbosa Calante":   { em:"🌖", corpo:"Il corpo inizia a liberare tossine. Ottimo per massaggi drenanti, trattamenti detox e depilazione duratura.", natura:"La linfa scende: potatura efficace, i tagli cicatrizzano bene.", psiche:"Lucidità crescente. Elimina ciò che non serve, fisicamente e mentalmente." },
  "Ultimo Quarto":     { em:"🌗", corpo:"Energia in progressivo calo. Depurazione profonda, digiuni terapeutici e riposo molto efficaci.", natura:"Lavora il suolo, estirpa le erbacce. Le radici tengono meglio.", psiche:"Bilancio e riflessione. Chiudi i cicli aperti, prepara spazio al nuovo." },
  "Calante":           { em:"🌘", corpo:"Metabolismo al minimo, rigenerazione cellulare intensa durante il riposo. Evita interventi chirurgici se possibile.", natura:"Suolo a riposo. Minima attività vegetativa, il terreno si rigenera.", psiche:"Introversione profonda. Meditazione, silenzio e recupero energetico." },
};

// ── Agricoltura ───────────────────────────────────────────────────────────────
// Seasonal data for Italy (biodynamic + traditional agricultural calendars)
const AGRICOLTURA_MESI = [
  { cover:"🍊", nome:"Gennaio",   prodotti:["🍊 Arance e mandarini","🍋 Limoni","🥦 Broccoli e cavoli","🥬 Spinaci e radicchio","🧅 Porri e finocchio","🌰 Frutta secca"] },
  { cover:"🥦", nome:"Febbraio",  prodotti:["🍊 Arance (ultime)","🥦 Broccoli e cavoli","🥬 Spinaci e verza","🧅 Porri e cipolle","🌿 Carciofi (inizio)","🥝 Kiwi"] },
  { cover:"🌿", nome:"Marzo",     prodotti:["🌿 Asparagi (inizio)","🌿 Carciofi","🥬 Spinaci e insalate","🌱 Piselli (inizio)","🥕 Carote primaticce","🍋 Agrumi (fine)"] },
  { cover:"🍓", nome:"Aprile",    prodotti:["🍓 Fragole (inizio)","🌿 Asparagi","🌿 Carciofi","🫘 Fave e piselli","🥬 Insalate varie","🌱 Ravanelli e erbe aromatiche"] },
  { cover:"🍓", nome:"Maggio",    prodotti:["🍓 Fragole","🍒 Ciliegie (inizio)","🌿 Asparagi (fine)","🫘 Fave e piselli","🥒 Zucchine (inizio)","🥬 Lattuga e insalate"] },
  { cover:"🍒", nome:"Giugno",    prodotti:["🍒 Ciliegie","🍑 Albicocche","🍑 Pesche (inizio)","🍓 Fragole (fine)","🥒 Zucchine","🍅 Pomodori (inizio)","🫑 Melanzane e peperoni"] },
  { cover:"🍉", nome:"Luglio",    prodotti:["🍉 Anguria","🍈 Melone","🍑 Pesche e nettarine","🍒 Ciliegie (fine)","🫐 Mirtilli e more","🍅 Pomodori","🥒 Cetrioli e zucchine"] },
  { cover:"🍑", nome:"Agosto",    prodotti:["🍑 Pesche e nettarine","🍉 Anguria","🍈 Melone","🍑 Fichi (inizio)","🍑 Prugne","🫐 More e mirtilli","🍅 Pomodori","🌽 Mais"] },
  { cover:"🍇", nome:"Settembre", prodotti:["🍇 Uva","🍑 Fichi","🍑 Prugne (fine)","🍎 Mele (inizio)","🍐 Pere","🍄 Funghi","🎃 Zucca","🍅 Pomodori (fine)"] },
  { cover:"🍎", nome:"Ottobre",   prodotti:["🍎 Mele","🍐 Pere","🍅 Cachi","🌰 Castagne","🍄 Funghi","🍇 Uva (fine)","🎃 Zucca","🥦 Cavolfiore e broccoli","🍁 Radicchio"] },
  { cover:"🌰", nome:"Novembre",  prodotti:["🌰 Castagne (fine)","🍅 Cachi","🍎 Mele e pere","🥝 Kiwi","🍎 Melograni","🥦 Broccoli e cavolfiore","🌿 Carciofi","🥬 Cavoli e radicchio"] },
  { cover:"🍊", nome:"Dicembre",  prodotti:["🍊 Arance e mandarini","🍋 Limoni (inizio)","🥝 Kiwi","🍎 Mele e pere","🥦 Broccoli e verza","🥬 Radicchio e finocchio","🧅 Porri"] },
];

// Advice by moon phase (biodynamic + traditional Italian)
const LUNA_AGRICOLTURA = {
  "Luna Nuova":        { icon:"🌑", semina:"Evita semine — la terra è a riposo. Prepara il suolo, aggiungi compost.", potatura:"Non potare. Giorno ideale per pulire attrezzi e pianificare.", raccolta:"Evita raccolte se possibile.", note:"Giorno di pausa: la linfa è alle radici, il terreno si rigenera." },
  "Crescente":         { icon:"🌒", semina:"Ottimo per seminare piante da frutto e foglia. I succhi salgono — la germogliazione è più rapida.", potatura:"Leggera potatura formativa. Evita tagli importanti.", raccolta:"Raccolta di piante aromatiche e da foglia — sapore più intenso.", note:"Fase di crescita: tutto ciò che semini ha slancio in più." },
  "Primo Quarto":      { icon:"🌓", semina:"Semina di cereali, legumi e piante da frutto. Alta energia di crescita.", potatura:"Potatura leggera per stimolare rami laterali.", raccolta:"Buona raccolta di frutti e cereali.", note:"Linfa in equilibrio ascendente — ottimo per trapianti." },
  "Gibbosa Crescente": { icon:"🌔", semina:"Semina fiori e piante da bacca. Irrigazione più efficace.", potatura:"Evita potature importanti — linfa abbondante.", raccolta:"Ottima raccolta di frutti al massimo della turgidità.", note:"Frutti al picco succoso: ideale per conserve e marmellate." },
  "Luna Piena":        { icon:"🌕", semina:"Evita semina — energia dispersa. Concentra su raccolta e conservazione.", potatura:"Non potare — i tessuti sono gonfi e la pianta sanguina.", raccolta:"Raccolta di frutti maturi al picco aromatico. Eccellente per vino e olio.", note:"Massima carica energetica: harvesting day per eccellenza." },
  "Gibbosa Calante":   { icon:"🌖", semina:"Semina radici e bulbi: cipolla, aglio, patate.", potatura:"Ottima potatura: i tagli cicatrizzano bene, la linfa scende.", raccolta:"Raccolta di radici e tuberi. Ottimo per essiccare erbe.", note:"Linfa discendente: i tagli richiudono velocemente." },
  "Ultimo Quarto":     { icon:"🌗", semina:"Semina radici, bulbi e piante da radice. Ottimo per concimare.", potatura:"Potatura principale: forma duratura, guarigione rapida.", raccolta:"Raccolta di radici, patate e prodotti da conservare.", note:"Lavora il suolo, estirpa le malerbe — le radici non ricrescono." },
  "Calante":           { icon:"🌘", semina:"Semina bulbi e radici. Evita piante da foglia.", potatura:"Potatura tardiva prima del riposo vegetativo.", raccolta:"Raccolta di tutto ciò da conservare a lungo.", note:"Terra a riposo. Irrigazione ridotta al minimo." },
};

// Zodiac-based biodynamic calendar (Maria Thun system)
const LUNA_ZODIACO_AGRI = {
  0:  { tipo:"Frutto",  icon:"🍎", desc:"Ariete — Frutto. Ideale per raccolta di frutti, viticoltura, semina di pomodori e peperoni." },
  1:  { tipo:"Radice",  icon:"🥕", desc:"Toro — Radice. Ottimo per patate, carote, bulbi. Lavorazione del suolo produttiva." },
  2:  { tipo:"Fiore",   icon:"🌸", desc:"Gemelli — Fiore. Perfetto per piante aromatiche, fiori commestibili, api e impollinatori." },
  3:  { tipo:"Foglia",  icon:"🥬", desc:"Cancro — Foglia. Ideale per insalate, spinaci, cavoli. Irrigazione efficace." },
  4:  { tipo:"Frutto",  icon:"🍅", desc:"Leone — Frutto. Raccolta di frutti e cereali al massimo. Evita trapianti." },
  5:  { tipo:"Radice",  icon:"🧅", desc:"Vergine — Radice. Semina radici e bulbi. Concimazione radicale efficace." },
  6:  { tipo:"Fiore",   icon:"🌻", desc:"Bilancia — Fiore. Ottimo per fiori e piante ornamentali. Potatura estetica." },
  7:  { tipo:"Foglia",  icon:"🌿", desc:"Scorpione — Foglia. Erbe medicinali al picco. Semina foglie a crescita lenta." },
  8:  { tipo:"Frutto",  icon:"🍇", desc:"Sagittario — Frutto. Vendemmia, raccolta olive, frutta secca. Eccellente per vini." },
  9:  { tipo:"Radice",  icon:"🌰", desc:"Capricorno — Radice. Tartufi, tuberi, radici medicinali. Potatura resistente." },
  10: { tipo:"Fiore",   icon:"🌼", desc:"Acquario — Fiore. Semina fiori da taglio. Buono per api e biodiversità." },
  11: { tipo:"Foglia",  icon:"🫧", desc:"Pesci — Foglia. Semina lattughe e piante acquatiche. Attenzione a funghi." },
};

// ── Default data ──────────────────────────────────────────────────────────────
const DEFAULT_ROUTINE_CFG = [
  { id:"r1", label:"Meditazione",  durata:10, tipo:"tempo", attiva:true },
  { id:"r2", label:"Plank",         durata:3,  tipo:"rep",   attiva:true },
  { id:"r3", label:"Acqua tiepida", durata:2,  tipo:"tempo", attiva:true },
  { id:"r4", label:"Stretching",    durata:10, tipo:"tempo", attiva:true },
  { id:"r5", label:"Verticale",     durata:5,  tipo:"rep",   attiva:true },
];

const DEFAULT_HABIT_CFG = [
  { id:"h1", label:"Acqua",       tipo:"numero", unita:"l",   attiva:true, colore:"#1a5276" },
  { id:"h2", label:"Sonno",       tipo:"tempo",  unita:"h",   attiva:true, colore:"#4a7c59" },
  { id:"h3", label:"No fumo",      tipo:"numero", unita:"gg",  attiva:true, colore:"#8b6914", modoSmettere:true },
  { id:"h4", label:"Lettura",     tipo:"tempo",  unita:"min", attiva:true, colore:"#b5451b" },
  { id:"h5", label:"Meditazione", tipo:"tempo",  unita:"min", attiva:true, colore:"#6b7280" },
];
const HABIT_COLORS = ["#4a7c59","#b5451b","#8b6914","#6b7280","#1a5276"];

// ── Luna ──────────────────────────────────────────────────────────────────────
const SYNODIC = 29.530588853, SIDEREAL = 27.321661, MOON_REF_JD = 2451549.7597;
const RAD = Math.PI / 180;

function dateToJD(d) {
  // JD at noon UTC for the given local date
  const utcNoon = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));
  return utcNoon.getTime() / 864e5 + 2440587.5;
}
// Use SunCalc for accurate moon phase (corrects planetary perturbations)
function moonPhase(d) {
  const illum = SunCalc.getMoonIllumination(d);
  return illum.phase * SYNODIC; // 0-29.53 days
}
function moonEmoji(p) { if(p<1.85)return"🌑";if(p<5.54)return"🌒";if(p<9.22)return"🌓";if(p<12.91)return"🌔";if(p<16.61)return"🌕";if(p<20.30)return"🌖";if(p<23.99)return"🌗";if(p<27.68)return"🌘";return"🌑"; }
function moonName(p) { if(p<1.85)return"Luna Nuova";if(p<5.54)return"Crescente";if(p<9.22)return"Primo Quarto";if(p<12.91)return"Gibbosa Crescente";if(p<16.61)return"Luna Piena";if(p<20.30)return"Gibbosa Calante";if(p<23.99)return"Ultimo Quarto";if(p<27.68)return"Calante";return"Luna Nuova"; }
function moonKey(p) { const H=0.7,nm=p>SYNODIC-H?p-SYNODIC:p; if(Math.abs(nm)<=H)return"🌑";if(Math.abs(p-7.38)<=H)return"🌓";if(Math.abs(p-14.77)<=H)return"🌕";if(Math.abs(p-22.15)<=H)return"🌗";return""; }
// Translated display name for a moon phase key (Italian key → current locale label)
function moonDisplayName(phaseKey) {
  return i18n.t(`moonPhaseNames.${phaseKey}`, { defaultValue: phaseKey });
}
// Use ecliptic longitude for accurate tropical zodiac sign (0=Ariete...11=Pesci)
function lunaZodiac(d) {
  const t = dateToJD(d) - 2451545.0;
  const L = ((218.316 + 13.176396 * t) % 360 + 360) % 360;
  const M = ((134.963 + 13.064993 * t) % 360 + 360) % 360 * RAD;
  const F = ((93.272  + 13.229350 * t) % 360 + 360) % 360 * RAD;
  const lam = ((L + 6.289*Math.sin(M) + 1.274*Math.sin(2*dateToJD(d)*RAD-M) - 0.658*Math.sin(2*F)) % 360 + 360) % 360;
  return Math.floor(lam / 30); // 0=Ariete...11=Pesci
}

// Moon rise/set times via suncalc (professional accuracy, same as weather apps)
// lat/lon in degrees; returns {rise:"HH:MM", set:"HH:MM"} or null
function moonTimesForDate(date, lat, lon) {
  const times = SunCalc.getMoonTimes(date, lat, lon);
  if (times.alwaysUp || times.alwaysDown || !times.rise || !times.set) return null;
  const fmt = d => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return { rise: fmt(times.rise), set: fmt(times.set) };
}

// ── Ba-Zi ─────────────────────────────────────────────────────────────────────

// Li Chun (立春) date — sun at 315° ecliptic longitude, ~Feb 3–5
function liChunDate(year) {
  const T   = (year - 2000) / 1000;
  const veJDE = 2451623.80984 + 365242.37404*T + 0.05169*T*T - 0.00411*T*T*T;
  const jde   = veJDE - 44.02; // Li Chun ≈ 44 days before vernal equinox
  const utc   = new Date((jde - 2440587.5) * 86400000);
  return new Date(utc.getFullYear(), utc.getMonth(), utc.getDate()); // local midnight
}

// ── 24 Jieqi (节气) — precise Ba-Zi month boundaries ─────────────────────────
// Solar longitude of the Sun (Meeus simplified, accuracy ~0.01°)
function solarLongitude(jd) {
  const T  = (jd - 2451545.0) / 36525.0;
  const L0 = ((280.46646 + 36000.76983*T + 0.0003032*T*T) % 360 + 360) % 360;
  const M  = ((357.52911 + 35999.05029*T - 0.0001537*T*T) % 360 + 360) % 360 * RAD;
  const C  = (1.914602 - 0.004817*T - 0.000014*T*T)*Math.sin(M)
           + (0.019993 - 0.000101*T)*Math.sin(2*M)
           + 0.000289*Math.sin(3*M);
  return ((L0 + C) % 360 + 360) % 360;
}
// Find JD when sun reaches targetLon° (Newton's method, ±1 min accuracy)
function solarTermJDE(year, targetLon) {
  const lcJD = dateToJD(liChunDate(year)); // anchor at Li Chun = 315°
  const deltaLon = ((targetLon - 315) % 360 + 360) % 360;
  let jd = lcJD + deltaLon / 360 * 365.25;
  for (let i = 0; i < 30; i++) {
    let diff = targetLon - solarLongitude(jd);
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const step = diff / 360 * 365.25;
    jd += step;
    if (Math.abs(step) < 1/1440) break;
  }
  return jd;
}
// Solar longitudes of the 12 "Jie" that open each Ba-Zi solar month
// Month 0=Yin (立春315°), 1=Mao (惊蛰345°), ..., 11=Chou (小寒285°)
const JIEQI_LONS = [315,345,15,45,75,105,135,165,195,225,255,285];
const _baziJieqiCache = {};
function getBaziJieqi(year) {
  if (_baziJieqiCache[year]) return _baziJieqiCache[year];
  const dates = JIEQI_LONS.map(lon => {
    const jd = solarTermJDE(year, lon);
    const d  = new Date((jd - 2440587.5) * 86400000);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });
  _baziJieqiCache[year] = dates;
  return dates;
}
// Returns 0–11: Ba-Zi solar month index for a given date (0=Yin…11=Chou)
function baziSolarMonthIdx(d) {
  const y = d.getFullYear();
  let best = { idx: 11, date: getBaziJieqi(y - 1)[11] };
  for (let yr = y - 1; yr <= y; yr++) {
    const jq = getBaziJieqi(yr);
    for (let i = 0; i < 12; i++) {
      if (jq[i] <= d && jq[i] > best.date) best = { idx: i, date: jq[i] };
    }
  }
  return best.idx;
}

// ── Astronomical New Moons (Jean Meeus Ch.49, accuracy ±2 min) ────────────────
function newMoonJDE(k) {
  const T = k / 1236.85;
  const J0 = 2451550.09766 + 29.530588861*k + 0.00015437*T*T - 0.000000150*T*T*T;
  const M  = ((2.5534   + 29.10535669*k  - 0.0000218*T*T) % 360 + 360) % 360 * RAD;
  const Mp = ((201.5643 + 385.81693528*k + 0.0107438*T*T) % 360 + 360) % 360 * RAD;
  const F  = ((160.7108 + 390.67050274*k - 0.0016341*T*T) % 360 + 360) % 360 * RAD;
  const Om = ((124.7746 - 1.5637558*k   + 0.0020691*T*T) % 360 + 360) % 360 * RAD;
  const E  = 1 - 0.002516*T;
  return J0
    - 0.40720*Math.sin(Mp)    + 0.17241*E*Math.sin(M)
    + 0.01608*Math.sin(2*Mp)  + 0.01039*Math.sin(2*F)
    + 0.00739*E*Math.sin(Mp-M)- 0.00514*E*Math.sin(Mp+M)
    + 0.00208*E*E*Math.sin(2*M)- 0.00111*Math.sin(Mp-2*F)
    - 0.00057*Math.sin(Mp+2*F)+ 0.00056*E*Math.sin(2*Mp+M)
    - 0.00042*Math.sin(3*Mp)
    + 0.00042*E*Math.sin(M+2*F)+ 0.00038*E*Math.sin(M-2*F)
    - 0.00024*E*Math.sin(2*Mp-M)- 0.00017*Math.sin(Om)
    - 0.00007*Math.sin(Mp+2*M);
}
function jdeToLocalDate(jde) {
  const d = new Date((jde - 2440587.5) * 86400000);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
// 18 consecutive new moon dates starting ~3 months before anno's CNY
function newMoonsAroundYear(anno) {
  const k0 = Math.round((anno - 2000) * 12.3685) - 3;
  return Array.from({length:18}, (_,i) => jdeToLocalDate(newMoonJDE(k0+i)));
}

function baziDay(d) {
  // Normalizza a mezzanotte locale per evitare off-by-one da DST (ora legale)
  const mid = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const ref = new Date(1924,1,5);
  const n=Math.floor((mid-ref)/864e5);
  return{tronco:((n%10)+10)%10,ramo:((n%12)+12)%12};
}

// baziYear: accepts a Date (uses Li Chun boundary) or plain year number
function baziYear(dateOrYear) {
  if (typeof dateOrYear === 'number') {
    return{tronco:((dateOrYear-4)%10+10)%10,ramo:((dateOrYear-4)%12+12)%12};
  }
  const d = dateOrYear;
  const y = d.getFullYear();
  const baziY = d < liChunDate(y) ? y-1 : y;
  return{tronco:((baziY-4)%10+10)%10,ramo:((baziY-4)%12+12)%12};
}

// baziMonth: yearTronco = heavenly stem of the Ba-Zi year (0–9)
// Five Tigers rule: month 1 (Yin) tronco = (yearTronco%5)*2+2, then +1 per month
function baziMonth(i, yearTronco) {
  const base = yearTronco !== undefined ? ((yearTronco % 5) * 2 + 2) % 10 : 2;
  return{tronco:(base + i)%10, ramo:(i+2)%12};
}

// Lunar months based on astronomical new moons.
// Month 1 starts at the Chinese New Year (new moon Jan 20 – Feb 22 of anno).
function lunarMonths(anno) {
  const moons = newMoonsAroundYear(anno);
  // CNY: new moon in Jan 20 – Feb 22 window
  let cnyIdx = moons.findIndex(d =>
    (d.getMonth()===0 && d.getDate()>=20) || (d.getMonth()===1 && d.getDate()<=22));
  if (cnyIdx < 0) cnyIdx = 2; // should never happen
  return Array.from({length:12}, (_,i) => {
    const start = moons[cnyIdx + i];
    const end   = moons[cnyIdx + i + 1];
    if (!start || !end) return null;
    const len = Math.round((end - start) / 864e5);
    const giorni = Array.from({length:len}, (_,d) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate()+d));
    return {nome:MESI_NOMI[i], elemento:MESI_EL[i], giorni, start};
  }).filter(Boolean);
}

// Returns -1 if today is not found in any month
function findTodayMese(ms,oggi){
  let f=-1;
  ms.forEach((m,i)=>{if(m.giorni.some(d=>d.toDateString()===oggi.toDateString()))f=i;});
  return f;
}

// ── localStorage hook ─────────────────────────────────────────────────────────
function _setLocalTs(key) {
  try {
    const ts = JSON.parse(localStorage.getItem('bazi_sync_ts') || '{}');
    ts[key] = Date.now();
    localStorage.setItem('bazi_sync_ts', JSON.stringify(ts));
  } catch {}
}

function useLS(key, defaultValue) {
  const [val, setVal] = useState(() => {
    try { const s=localStorage.getItem(key); return s!==null?JSON.parse(s):defaultValue; }
    catch { return defaultValue; }
  });

  const setValTracked = useCallback((updater) => {
    setVal(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      _setLocalTs(key);
      return next;
    });
  }, [key]);

  return [val, setValTracked];
}

// ── Logo ──────────────────────────────────────────────────────────────────────
// Nav logo: solo taijitu, nessun ottagono, usa currentColor (adattivo come gli altri tab)
// Home tab logo — ottagono + taijitu, usa currentColor per adattarsi ad attivo/inattivo
function BaziLogo({ size=28 }) {
  return (
    <svg viewBox="-32 -32 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{display:"block",flexShrink:0}}>
      {/* Ottagono */}
      <polygon points="0,-28 20,-20 28,0 20,20 0,28 -20,20 -28,0 -20,-20"
        fill="none" stroke="currentColor" strokeWidth="1.4"/>
      {/* Cerchio intermedio */}
      <circle cx="0" cy="0" r="20" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.35"/>
      {/* Base yang (sfondo nav trasparisce) */}
      <circle cx="0" cy="0" r="16" fill="var(--bg)"/>
      {/* Metà yin */}
      <path d="M0,-16 A16,16 0 0,0 0,16 A8,8 0 0,1 0,0 A8,8 0 0,0 0,-16 Z" fill="currentColor"/>
      {/* Pallino chiaro nel lato yin */}
      <circle cx="0" cy="-8" r="4" fill="var(--bg)"/>
      {/* Pallino scuro nel lato yang */}
      <circle cx="0" cy="8" r="4" fill="currentColor"/>
      {/* Bordo taijitu + curva S */}
      <circle cx="0" cy="0" r="16" fill="none" stroke="currentColor" strokeWidth="0.8"/>
      <path d="M0,-16 A8,8 0 0,1 0,0 A8,8 0 0,0 0,16" fill="none" stroke="currentColor" strokeWidth="0.8"/>
      {/* Pallino verde brand */}
      <circle cx="22" cy="-22" r="3" fill="#4a7c59"/>
    </svg>
  );
}

// Ba-Zi tab icon — taijitu con entrambi i pallini visibili
function IconBaZi({ size=28 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{display:"block",flexShrink:0}}>
      <circle cx="50" cy="50" r="44" fill="var(--bg)" stroke="currentColor" strokeWidth="5"/>
      <path d="M50,6 A44,44 0 0,0 50,94 A22,22 0 0,1 50,50 A22,22 0 0,0 50,6 Z" fill="currentColor"/>
      {/* Pallino chiaro (visibile nel lato scuro) */}
      <circle cx="50" cy="28" r="10" fill="var(--bg)"/>
      {/* Pallino scuro (visibile nel lato chiaro) */}
      <circle cx="50" cy="72" r="10" fill="currentColor"/>
    </svg>
  );
}

// Sub-utility icons
function IconRoutine({ size=20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"block"}}>
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2" x2="12" y2="5"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="5" y2="12"/>
      <line x1="19" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="4.93" x2="7.05" y2="7.05"/>
      <line x1="16.95" y1="16.95" x2="19.07" y2="19.07"/>
      <line x1="19.07" y1="4.93" x2="16.95" y2="7.05"/>
      <line x1="7.05" y1="16.95" x2="4.93" y2="19.07"/>
    </svg>
  );
}
function IconHabit({ size=20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{display:"block"}}>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12,7 L12,12 L15,15" strokeLinejoin="round"/>
    </svg>
  );
}
function IconTodo({ size=20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"block"}}>
      <polyline points="9,11 12,14 22,4"/>
      <path d="M21,12v7a2,2,0,0,1-2,2H5a2,2,0,0,1-2-2V5a2,2,0,0,1,2-2h11"/>
    </svg>
  );
}
function IconMemo({ size=20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"block"}}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
// Edit icon (replaces ✏️)
function IconEdit({ size=16, color="var(--text-ter)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline-block",verticalAlign:"middle",flexShrink:0}}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
// Habit type icons (replace ✅ / 🚫)
function IconCost({ size=18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{display:"inline-block",verticalAlign:"middle",flexShrink:0}}>
      <circle cx="12" cy="12" r="11" fill="#2e7d32"/>
      <polyline points="12,15 12,8 8.5,11.5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="8" x2="15.5" y2="11.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconSmett({ size=18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{display:"inline-block",verticalAlign:"middle",flexShrink:0}}>
      <circle cx="12" cy="12" r="11" fill="#c0392b"/>
      <line x1="7" y1="12" x2="17" y2="12" stroke="white" strokeWidth="2.8" strokeLinecap="round"/>
    </svg>
  );
}

// ── Nav Icons ─────────────────────────────────────────────────────────────────
function IconUtility({ size=26 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}>
      <rect x="3" y="13" width="4" height="7" rx="1"/>
      <rect x="10" y="8" width="4" height="12" rx="1"/>
      <rect x="17" y="4" width="4" height="16" rx="1"/>
    </svg>
  );
}
function IconImpostazioni({ size=26 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{display:"block",flexShrink:0}}>
      <line x1="3" y1="7" x2="21" y2="7"/>
      <circle cx="8" cy="7" r="2.5" fill="var(--bg)" stroke="currentColor" strokeWidth="2"/>
      <line x1="3" y1="13" x2="21" y2="13"/>
      <circle cx="16" cy="13" r="2.5" fill="var(--bg)" stroke="currentColor" strokeWidth="2"/>
      <line x1="3" y1="19" x2="21" y2="19"/>
      <circle cx="10" cy="19" r="2.5" fill="var(--bg)" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
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
      <span style={{fontSize:13,color:"var(--text)"}}>{label}</span>
      <div onClick={()=>onChange(!on)} style={{width:40,height:22,borderRadius:11,cursor:"pointer",background:on?"var(--accent)":"transparent",border:"2px solid #4a7c59",position:"relative",flexShrink:0,transition:"background 0.2s"}}>
        <div style={{position:"absolute",top:"50%",transform:"translateY(-50%)",left:on?20:3,width:16,height:16,borderRadius:"50%",background:on?"white":"var(--accent)",transition:"left 0.2s,background 0.2s"}}/>
      </div>
    </div>
  );
}

function DotsMenu({ render }) {
  const [open,setOpen]=useState(false);
  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(s=>!s)} style={{width:30,height:30,borderRadius:"50%",border:"0.5px solid var(--border-sec)",background:open?"var(--bg-gray2)":"var(--bg-gray)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"var(--text-sec)",letterSpacing:1.5,padding:0,flexShrink:0,lineHeight:1}}>•••</button>
      {open && <>
        <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:299}}/>
        <div style={{position:"absolute",right:0,top:"calc(100% + 6px)",background:"var(--bg-gray)",borderRadius:12,border:"1px solid var(--border)",boxShadow:"0 6px 32px rgba(0,0,0,0.38)",minWidth:190,zIndex:300,overflow:"hidden"}}>
          {render(()=>setOpen(false))}
        </div>
      </>}
    </div>
  );
}
function DotsItem({ label, onClick, color }) {
  return (
    <div onClick={onClick} style={{padding:"13px 18px",fontSize:14,cursor:"pointer",color:color||"var(--text)",borderTop:"1px solid var(--border-sec)",display:"flex",alignItems:"center",gap:8,WebkitTapHighlightColor:"transparent"}}>
      {label}
    </div>
  );
}

function ModalBox({ onClose, children, zIndex=100, elKey=null, dark=false }) {
  const bg = elKey
    ? (dark ? "#1e1e1e" : ({legno:"#f0faf3",fuoco:"#fef3ee",terra:"#fdf8ec",metallo:"#f5f5f4",acqua:"#eef6fd"}[elKey]||"#f8f8f6"))
    : (dark ? "#1e1e1e" : "#f8f8f6");
  const border2 = elKey ? `1px solid ${ELEMENTI[elKey]?.colore ?? "#ccc"}55` : "1px solid var(--border)";
  const border = elKey ? `0.5px solid ${ELEMENTI[elKey]?.colore ?? "#ccc"}44` : "0.5px solid var(--border)";
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex,padding:"0 1rem"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:bg,border:border2,borderRadius:16,padding:"1.5rem",width:"100%",maxWidth:340,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 40px rgba(0,0,0,0.45)"}}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontSize:16,fontWeight:600,color:"var(--text)"}}>{title}</div>
      <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"var(--text-sec)",lineHeight:1,padding:"0 2px"}}>✕</button>
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────
function ElementoModal({ el, onClose, dark }) {
  const e = ELEMENTI[el];
  return (
    <ModalBox onClose={onClose} zIndex={500} elKey={el} dark={dark}>
      <ModalHeader title={`${e.char} ${e.nome}`} onClose={onClose}/>
      <div style={{fontSize:13,lineHeight:1.8,color:"var(--text)",whiteSpace:"pre-line",borderLeft:`3px solid ${e.colore}`,paddingLeft:12}}>{e.essenza}</div>
    </ModalBox>
  );
}

function TroncoModal({ idx, onClose, dark }) {
  const L = useL() || {};
  const t = TRONCHI_INFO[idx];
  const e = ELEMENTI[t.el];
  const desc = (L.tronchiInfo?.[idx]?.desc) || t.desc;
  return (
    <ModalBox onClose={onClose} zIndex={600} elKey={t.el} dark={dark}>
      <ModalHeader title={`${TRONCHI[idx]} ${t.nome}`} onClose={onClose}/>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
        <Badge el={t.el} size="md"/>
        <span style={{fontSize:12,color:"var(--text-sec)"}}>{t.polarita}</span>
      </div>
      <div style={{fontSize:13,lineHeight:1.8,color:"var(--text)",borderLeft:`3px solid ${e.colore}`,paddingLeft:12}}>{desc}</div>
    </ModalBox>
  );
}

function AnimaleModal({ idx, onClose, dark }) {
  const L = useL() || {};
  const a = ANIMALI_INFO[idx];
  const e = ELEMENTI[a.el];
  const nomeLocale = (L.animali?.[idx]) || a.nome;
  const tratti = (L.animaliInfo?.[idx]?.tratti) || a.tratti;
  return (
    <ModalBox onClose={onClose} zIndex={600} elKey={a.el} dark={dark}>
      <ModalHeader title={`${a.emoji} ${nomeLocale}`} onClose={onClose}/>
      <div style={{fontSize:13,lineHeight:1.8,color:"var(--text)",borderLeft:`3px solid ${e.colore}`,paddingLeft:12,marginBottom:12}}>{tratti}</div>
      <div style={{fontSize:11,color:e.colore,background:`${e.colore}18`,borderRadius:8,padding:"6px 10px"}}>🕐 Ore associate: {a.ore}</div>
    </ModalBox>
  );
}

function EkadashiModal({ onClose, dark }) {
  return (
    <ModalBox onClose={onClose} zIndex={500} elKey="terra" dark={dark}>
      <ModalHeader title="Ekadashi — 11° Tithi" onClose={onClose}/>
      <div style={{fontSize:13,lineHeight:1.8,color:"var(--text)",display:"flex",flexDirection:"column",gap:10}}>
        <p><strong>Ekadashi (एकादशी)</strong> significa "undicesimo" in sanscrito. È l'11° Tithi del ciclo lunare — cade due volte al mese, nella quindicina crescente (Shukla Paksha) e in quella calante (Krishna Paksha).</p>
        <p>Nella tradizione yogica e vedica è il momento in cui i fluidi del corpo sono più influenzati dalla luna, favorendo una purificazione profonda di corpo e mente.</p>
        <p><strong>La pratica:</strong> gli yogi digiunano (Upavasa) per purificare l'organismo e approfondire la meditazione. Il digiuno inizia all'alba e si interrompe il giorno seguente dopo l'alba.</p>
        <div style={{background:dark?"#2a2a1a":"#f5f0e8",borderRadius:8,padding:"8px 12px",fontSize:12,color:dark?"#c8b870":"#5a4a1a"}}>
          💧 "Stare vicini al Supremo" — il significato di Upavasa in sanscrito
        </div>
      </div>
    </ModalBox>
  );
}

function MoonBodyModal({ currentPhase, currentZodiac, onClose, dark }) {
  const L = useL() || {};
  const lunaCorpo = L.lunaCorpo || LUNA_CORPO;
  const uiL = L.ui?.luna || {};
  const phases = Object.entries(LUNA_CORPO); // always use Italian keys for order
  const currentInfo = lunaCorpo[currentPhase];
  return (
    <ModalBox onClose={onClose} dark={dark} zIndex={400}>
      <ModalHeader title={uiL.lunacorpoTitolo || "🌙 Luna & Corpo"} onClose={onClose}/>
      {currentInfo && (
        <div style={{marginBottom:12,padding:"12px",background:"var(--accent-22)",borderRadius:12,border:"1px solid var(--accent-44)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:24,lineHeight:1}}>{LUNA_CORPO[currentPhase]?.em}</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"var(--accent)"}}>{moonDisplayName(currentPhase)}</div>
              <span style={{fontSize:9,background:"var(--accent)",color:"white",borderRadius:4,padding:"1px 7px"}}>{L.ui?.oggi || "oggi"}</span>
            </div>
          </div>
          {[["🧬",currentInfo.corpo],["🌱",currentInfo.natura],["🧘",currentInfo.psiche]].map(([ico,txt],k)=>(
            <div key={k} style={{fontSize:11,lineHeight:1.6,color:"var(--text)",marginBottom:2}}>
              <span style={{marginRight:4}}>{ico}</span>{txt}
            </div>
          ))}
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {phases.filter(([ph])=>ph!==currentPhase).map(([ph])=>{
          const info = lunaCorpo[ph] || LUNA_CORPO[ph];
          return (
            <div key={ph} style={{borderRadius:10,border:"0.5px solid var(--border-ter)",overflow:"hidden",background:"var(--bg-card)"}}>
              <div style={{padding:"8px 12px",background:"var(--bg-wash)",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:16}}>{LUNA_CORPO[ph]?.em}</span>
                <span style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{moonDisplayName(ph)}</span>
              </div>
              <div style={{padding:"8px 12px",display:"flex",flexDirection:"column",gap:4}}>
                {[["🧬",info?.corpo],["🌱",info?.natura],["🧘",info?.psiche]].map(([ico,txt],k)=>(
                  <div key={k} style={{fontSize:11,lineHeight:1.6,color:"var(--text)"}}>
                    <span style={{marginRight:4}}>{ico}</span>{txt}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ModalBox>
  );
}

function AgricolturaModal({ meseGrego, moonPhaseStr, zodiacIdx, onClose, dark }) {
  const L = useL() || {};
  const agriMesi  = L.agricolturaMesi  || AGRICOLTURA_MESI;
  const lunaAgriT = L.lunaAgricoltura  || LUNA_AGRICOLTURA;
  const zodAgriT  = L.lunaZodiacoAgri  || LUNA_ZODIACO_AGRI;
  const uiA = L.ui?.agricoltura || {};
  const mData   = agriMesi[meseGrego]           || agriMesi[0];
  const lunaAgri = lunaAgriT[moonPhaseStr]      || lunaAgriT["Crescente"];
  const zodAgri  = zodAgriT[zodiacIdx]          || zodAgriT[0];
  const [zodiacOpen, setZodiacOpen] = useState(false);
  return (
    <ModalBox onClose={onClose} zIndex={400} elKey="legno" dark={dark}>
      <ModalHeader title={`🌱 ${uiA.titolo || "Agricoltura"} — ${mData.nome}`} onClose={onClose}/>
      <div style={{fontSize:10,color:"var(--text-sub)",textAlign:"center",marginBottom:8}}>{uiA.stagionale || "🌍 Stagionale emisfero nord · Italia"}</div>
      {/* Monthly produce */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:600,color:"var(--text-sec)",marginBottom:6}}>🧺 Prodotti di stagione</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {mData.prodotti.map((p,i)=>(
            <span key={i} style={{fontSize:11,padding:"3px 8px",borderRadius:12,background:dark?"#1a2a1a":"#e8f5e9",color:"var(--text)",border:"0.5px solid #4a7c5933"}}>{p}</span>
          ))}
        </div>
      </div>
      {/* Moon phase advice */}
      <div style={{marginBottom:14,padding:"10px 12px",background:dark?"#0d1a0d":"#f0faf3",borderRadius:10,border:"0.5px solid #4a7c5944"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
          <span style={{fontSize:16}}>{lunaAgri.icon}</span>
          <span style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{moonDisplayName(moonPhaseStr)}</span>
        </div>
        <div style={{fontSize:11,color:"var(--text-sec)",lineHeight:1.6,marginBottom:6}}>{lunaAgri.note}</div>
        {[[uiA.semina||"🌱 Semina",lunaAgri.semina],[uiA.potatura||"✂️ Potatura",lunaAgri.potatura],[uiA.raccolta||"🧺 Raccolta",lunaAgri.raccolta]].map(([label,val])=>(
          <div key={label} style={{fontSize:11,color:"var(--text)",marginBottom:3}}>
            <span style={{fontWeight:600}}>{label}: </span>{val}
          </div>
        ))}
      </div>
      {/* Today's zodiac */}
      <div onClick={()=>setZodiacOpen(s=>!s)} style={{marginBottom:zodiacOpen?8:0,padding:"10px 12px",background:dark?"#1a1a0d":"#fffbeb",borderRadius:10,border:`1px solid ${zodiacOpen?"#8b6914":"#8b691433"}`,cursor:"pointer",userSelect:"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:16}}>{zodAgri.icon}</span>
          <span style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{uiA.lunaIn||"Oggi — Luna in"} {zodAgri.tipo}</span>
        </div>
        <div style={{fontSize:11,color:"var(--text-sec)",lineHeight:1.6,marginTop:4}}>{zodAgri.desc}</div>
      </div>
      {/* Full zodiac guide */}
      {zodiacOpen && (
        <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:4}}>
          {Object.entries(LUNA_ZODIACO_AGRI).map(([idx])=>{
            const z = zodAgriT[parseInt(idx)] || zodAgriT[idx] || LUNA_ZODIACO_AGRI[idx];
            const isCurr = parseInt(idx)===zodiacIdx;
            return (
              <div key={idx} style={{padding:"7px 10px",borderRadius:8,background:isCurr?(dark?"#1a2a0a":"#f0faf3"):"var(--bg-card)",border:`0.5px solid ${isCurr?"#4a7c59":"var(--border-ter)"}`,display:"flex",gap:8,alignItems:"flex-start"}}>
                <span style={{fontSize:14,flexShrink:0}}>{z?.icon}</span>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:isCurr?"#4a7c59":"var(--text)",marginBottom:1}}>
                    {z?.desc?.split(" — ")[0]} — {z?.tipo}
                    {isCurr && <span style={{fontSize:9,background:"#4a7c59",color:"white",borderRadius:4,padding:"1px 5px",marginLeft:5}}>{L.ui?.oggi||"ora"}</span>}
                  </div>
                  <div style={{fontSize:10,color:"var(--text-sec)",lineHeight:1.5}}>{z?.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ModalBox>
  );
}

function InfoModal({ onClose, dark }) {
  const [tab,setTab]=useState("tronchi");
  const [subIdx,setSubIdx]=useState(null);
  const tabs=[{k:"tronchi",l:"10 Celesti"},{k:"rami",l:"12 Terrestri"},{k:"bazi",l:"Ba-Zi"}];

  if (subIdx !== null && tab === "tronchi") return <TroncoModal idx={subIdx} onClose={()=>setSubIdx(null)} dark={dark}/>;
  if (subIdx !== null && tab === "rami")    return <AnimaleModal idx={subIdx} onClose={()=>setSubIdx(null)} dark={dark}/>;

  return (
    <ModalBox onClose={onClose} zIndex={350} elKey="acqua" dark={dark}>
      <ModalHeader title="Guida Ba-Zi" onClose={onClose}/>
      <div style={{display:"flex",gap:4,marginBottom:16}}>
        {tabs.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{flex:1,fontSize:11,padding:"5px 0",background:tab===t.k?"var(--accent)":dark?"#1a2a1a":"#e0ede6",color:tab===t.k?"white":dark?"#aaa":"#333",border:"none",borderRadius:6,cursor:"pointer",fontWeight:tab===t.k?600:400}}>{t.l}</button>
        ))}
      </div>

      {tab==="tronchi" && (
        <div style={{fontSize:12,lineHeight:1.7}}>
          <p style={{marginBottom:8,color:"var(--text-sec)"}}>I <strong>10 Tronchi Celesti</strong> (天干) — tocca per il significato:</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
            {TRONCHI.map((t,i)=>{
              const el=ELEMENTI[TRONCO_EL[i]];
              return (
                <div key={i} onClick={()=>setSubIdx(i)} style={{background:elbg(TRONCO_EL[i],dark),borderRadius:6,padding:"5px 8px",display:"flex",gap:6,alignItems:"center",border:`0.5px solid ${el.colore}33`,cursor:"pointer"}}>
                  <span style={{fontSize:20}}>{t}</span>
                  <div>
                    <div style={{fontSize:10,fontWeight:600,color:el.colore}}>{TRONCHI_NOMI[i]}</div>
                    <div style={{fontSize:9,color:"var(--text-sec)"}}>{el.nome} {i%2===0?"Yang":"Yin"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab==="rami" && (
        <div style={{fontSize:12,lineHeight:1.7}}>
          <p style={{marginBottom:8,color:"var(--text-sec)"}}>I <strong>12 Rami Terrestri</strong> (地支) — tocca un animale:</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
            {RAMI.map((r,i)=>{
              const el=ELEMENTI[RAMO_EL[i]];
              return (
                <div key={i} onClick={()=>setSubIdx(i)} style={{background:elbg(RAMO_EL[i],dark),borderRadius:6,padding:"5px 8px",display:"flex",gap:6,alignItems:"center",border:`0.5px solid ${el.colore}33`,cursor:"pointer"}}>
                  <span style={{fontSize:18}}>{r}</span><span style={{fontSize:16}}>{ANIMALI_EMOJI[i]}</span>
                  <div>
                    <div style={{fontSize:10,fontWeight:600,color:el.colore}}>{ANIMALI[i]}</div>
                    <div style={{fontSize:9,color:"var(--text-sec)"}}>{el.nome}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab==="bazi" && (
        <div style={{fontSize:12,lineHeight:1.7}}>
          <p style={{marginBottom:10,color:"var(--text-sec)"}}><strong>Ba-Zi (八字)</strong> — "Otto Caratteri". Quattro pilastri:</p>
          {[
            {l:"Anno 年",d:"Energia sociale, karma familiare, come il mondo ti percepisce. Definisce il tuo animale zodiacale."},
            {l:"Mese 月",d:"Ambiente di crescita, relazione con i genitori, carriera e ambizioni. Il ciclo delle stagioni professionali."},
            {l:"Giorno 日",d:"Il pilastro più personale: il Sé autentico e le relazioni con il partner."},
            {l:"Ora 時",d:"Pensieri interiori, figli, desideri nascosti, percorso spirituale."},
          ].map((p,i)=>(
            <div key={i} style={{background:dark?"#1a2030":"#eef6fd",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
              <div style={{fontWeight:600,marginBottom:2,color:"var(--text)"}}>{p.l}</div>
              <div style={{color:"var(--text-sec)",fontSize:11}}>{p.d}</div>
            </div>
          ))}
        </div>
      )}
    </ModalBox>
  );
}

function MeseModal({ mese, idx, byYear, onClose, dark }) {
  const bm=baziMonth(idx, byYear?.tronco), el=ELEMENTI[mese.elemento];
  return (
    <ModalBox onClose={onClose} zIndex={200} elKey={mese.elemento} dark={dark}>
      <ModalHeader title={`${mese.nome} Mese`} onClose={onClose}/>
      <div style={{borderRadius:10,padding:"1rem",textAlign:"center",border:`0.5px solid ${el.colore}44`,marginBottom:12,background:`${el.colore}14`}}>
        <div style={{fontSize:40,marginBottom:4}}>{el.char}</div>
        <div style={{fontSize:17,fontWeight:600,color:el.colore}}>{el.nome}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[{label:"Cielo",ch:TRONCHI[bm.tronco],nome:TRONCHI_NOMI[bm.tronco],el:TRONCO_EL[bm.tronco]},
          {label:"Terra",ch:RAMI[bm.ramo],nome:ANIMALI[bm.ramo],el:RAMO_EL[bm.ramo]}].map(p=>(
          <div key={p.label} style={{background:elbg(p.el,dark),borderRadius:8,padding:10,textAlign:"center",border:`0.5px solid ${ELEMENTI[p.el].colore}33`}}>
            <div style={{fontSize:11,color:"var(--text-sec)",marginBottom:3}}>{p.label}</div>
            <div style={{fontSize:30,color:ELEMENTI[p.el].colore}}>{p.ch}</div>
            <div style={{fontSize:12,color:ELEMENTI[p.el].colore,fontWeight:600}}>{p.nome}</div>
            <Badge el={p.el}/>
          </div>
        ))}
      </div>
      <div style={{marginTop:10,fontSize:11,color:"var(--text-sec)",textAlign:"center"}}>
        Dal {mese.start.toLocaleDateString("it-IT",{day:"numeric",month:"long"})} · {mese.giorni.length} giorni
      </div>
    </ModalBox>
  );
}

function AnnoModal({ anno, byYear, onClose, dark }) {
  const elT=TRONCO_EL[byYear.tronco], elR=RAMO_EL[byYear.ramo];
  const eT=ELEMENTI[elT], eR=ELEMENTI[elR];
  return (
    <ModalBox onClose={onClose} zIndex={200} elKey={elT} dark={dark}>
      <ModalHeader title={`${TRONCHI[byYear.tronco]}${RAMI[byYear.ramo]} · ${anno}`} onClose={onClose}/>
      <div style={{textAlign:"center",marginBottom:12}}>
        <div style={{fontSize:32}}>{ANIMALI_EMOJI[byYear.ramo]}</div>
        <div style={{fontSize:16,fontWeight:600,color:eR.colore,marginTop:4}}>{ANIMALI[byYear.ramo]}</div>
        <div style={{fontSize:12,color:"var(--text-sec)",marginTop:2}}>{eT.char} {eT.nome} · {eR.char} {eR.nome}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        <div style={{background:elbg(elT,dark),borderRadius:8,padding:10,textAlign:"center",border:`0.5px solid ${eT.colore}44`}}>
          <div style={{fontSize:10,color:"var(--text-sec)",marginBottom:3}}>Cielo dell'Anno</div>
          <div style={{fontSize:30,color:dark?"white":eT.colore}}>{TRONCHI[byYear.tronco]}</div>
          <div style={{fontSize:12,fontWeight:600,color:dark?"rgba(255,255,255,0.85)":eT.colore}}>{TRONCHI_NOMI[byYear.tronco]}</div>
        </div>
        <div style={{background:elbg(elR,dark),borderRadius:8,padding:10,textAlign:"center",border:`0.5px solid ${eR.colore}44`}}>
          <div style={{fontSize:10,color:"var(--text-sec)",marginBottom:3}}>Terra dell'Anno</div>
          <div style={{fontSize:30,color:dark?"white":eR.colore}}>{RAMI[byYear.ramo]}</div>
          <div style={{fontSize:12,fontWeight:600,color:dark?"rgba(255,255,255,0.85)":eR.colore}}>{ANIMALI[byYear.ramo]}</div>
        </div>
      </div>
      <div style={{fontSize:12,color:"var(--text-sec)",lineHeight:1.7,borderLeft:`3px solid ${eT.colore}`,paddingLeft:10}}>
        {ANIMALI_INFO[byYear.ramo]?.tratti}
      </div>
    </ModalBox>
  );
}

// ── Promemoria Section (Calendar day panel) ───────────────────────────────────
function PromemoriaSection({ promemoria, dateKey, setPromemoria, dark }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState("");
  const [newEl, setNewEl] = useState("fuoco");
  const dayProm = promemoria[dateKey] || [];
  const pending = dayProm.filter(p => p.fatto !== true);
  const done    = dayProm.filter(p => p.fatto === true);

  function addProm() {
    if (!newText.trim()) return;
    const p = { id: Date.now().toString(), testo: newText.trim(), elemento: newEl, fatto: false };
    setPromemoria(prev => ({ ...prev, [dateKey]: [...(prev[dateKey] || []), p] }));
    setNewText(""); setShowAdd(false);
  }
  function toggleFatto(id) {
    setPromemoria(prev => ({ ...prev, [dateKey]: (prev[dateKey]||[]).map(p => p.id===id ? {...p, fatto:!p.fatto, fattoAt:!p.fatto?Date.now():undefined} : p) }));
  }
  function deleteProm(id) {
    setPromemoria(prev => ({ ...prev, [dateKey]: (prev[dateKey] || []).filter(p => p.id !== id) }));
  }

  return (
    <div style={{marginBottom:10}}>
      {/* Centered box header */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <div style={{flex:1,height:"0.5px",background:"var(--border-sec)"}}/>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"3px 12px",borderRadius:12,border:"0.5px solid var(--border-sec)",background:"var(--bg-card)",whiteSpace:"nowrap"}}>
          <span style={{fontSize:11,fontWeight:600,color:"var(--text-sec)"}}>🔔 Promemoria</span>
          <button onClick={()=>setShowAdd(s=>!s)} style={{fontSize:11,padding:"1px 8px",background:showAdd?"var(--bg-gray)":"var(--accent)",color:showAdd?"var(--text-sec)":"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,lineHeight:1.7}}>{showAdd?"✕":"+"}</button>
        </div>
        <div style={{flex:1,height:"0.5px",background:"var(--border-sec)"}}/>
      </div>
      {pending.map(p => {
        const e = ELEMENTI[p.elemento] || ELEMENTI.fuoco;
        return (
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:elbg(p.elemento,dark),borderRadius:8,marginBottom:4,border:`0.5px solid ${e.colore}44`}}>
            <div onClick={()=>toggleFatto(p.id)} style={{width:18,height:18,borderRadius:"50%",flexShrink:0,cursor:"pointer",border:`2px solid ${e.colore}`,background:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}/>
            <span style={{flex:1,fontSize:12,color:"var(--text)"}}>{p.testo}</span>
            <button onClick={()=>deleteProm(p.id)} style={{background:"none",border:"none",color:"var(--text-dim)",fontSize:18,cursor:"pointer",padding:"0 2px",lineHeight:1,flexShrink:0}}>×</button>
          </div>
        );
      })}
      {done.map(p => {
        const e = ELEMENTI[p.elemento] || ELEMENTI.fuoco;
        return (
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"var(--bg-card)",borderRadius:8,marginBottom:3,border:"0.5px solid var(--border-ter)",opacity:0.55}}>
            <div onClick={()=>toggleFatto(p.id)} style={{width:18,height:18,borderRadius:"50%",flexShrink:0,cursor:"pointer",border:`2px solid ${e.colore}`,background:e.colore,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{color:"white",fontSize:10,lineHeight:1}}>✓</span>
            </div>
            <span style={{flex:1,fontSize:12,color:"var(--text-sub)",textDecoration:"line-through"}}>{p.testo}</span>
            <button onClick={()=>deleteProm(p.id)} style={{background:"none",border:"none",color:"var(--text-dim)",fontSize:18,cursor:"pointer",padding:"0 2px",lineHeight:1,flexShrink:0}}>×</button>
          </div>
        );
      })}
      {dayProm.length===0 && !showAdd && (
        <div style={{fontSize:11,color:"var(--text-sub)",textAlign:"center",padding:"4px 0"}}>Nessun promemoria</div>
      )}
      {showAdd && (
        <div style={{background:"var(--bg-wash)",borderRadius:10,padding:"12px",border:"0.5px solid var(--border-sec)",marginTop:4}}>
          <input autoFocus value={newText} onChange={e=>setNewText(e.target.value)}
                 onKeyDown={e=>{if(e.key==="Enter")addProm();if(e.key==="Escape")setShowAdd(false);}}
                 placeholder="Promemoria…"
                 style={{width:"100%",fontSize:13,marginBottom:10,boxSizing:"border-box"}}/>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
            {Object.entries(ELEMENTI).map(([k,e])=>(
              <div key={k} onClick={()=>setNewEl(k)} style={{
                display:"flex",alignItems:"center",gap:3,padding:"4px 9px",borderRadius:12,
                cursor:"pointer",fontSize:11,fontWeight:newEl===k?600:400,
                background:newEl===k?e.colore:elbg(k,dark),
                color:newEl===k?"white":e.colore,
                border:`0.5px solid ${e.colore}55`,transition:"background 0.15s"
              }}>{e.char} {e.nome}</div>
            ))}
          </div>
          <button onClick={addProm} style={{width:"100%",padding:"8px",fontSize:13,background:"var(--accent)",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:500}}>
            Aggiungi promemoria
          </button>
        </div>
      )}
    </div>
  );
}

// ── Events Section (Calendar) ─────────────────────────────────────────────────
function EventsSection({ events, dateKey, setEvents, dark }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState("");
  const [newEl, setNewEl] = useState("legno");
  const dayEvents = events[dateKey] || [];

  function addEvent() {
    if (!newText.trim()) return;
    const ev = { id: Date.now().toString(), testo: newText.trim(), elemento: newEl };
    setEvents(prev => ({ ...prev, [dateKey]: [...(prev[dateKey] || []), ev] }));
    setNewText(""); setShowAdd(false);
  }
  function deleteEvent(id) {
    setEvents(prev => ({ ...prev, [dateKey]: (prev[dateKey] || []).filter(e => e.id !== id) }));
  }

  return (
    <div style={{marginBottom:12}}>
      {/* Centered box header */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <div style={{flex:1,height:"0.5px",background:"var(--border-sec)"}}/>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"3px 12px",borderRadius:12,border:"0.5px solid var(--border-sec)",background:"var(--bg-card)",whiteSpace:"nowrap"}}>
          <span style={{fontSize:11,fontWeight:600,color:"var(--text-sec)"}}>📅 Eventi</span>
          <button onClick={()=>setShowAdd(s=>!s)} style={{fontSize:11,padding:"1px 8px",background:showAdd?"var(--bg-gray)":"var(--accent)",color:showAdd?"var(--text-sec)":"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,lineHeight:1.7}}>{showAdd?"✕":"+"}</button>
        </div>
        <div style={{flex:1,height:"0.5px",background:"var(--border-sec)"}}/>
      </div>
      {dayEvents.map(ev => {
        const e = ELEMENTI[ev.elemento] || ELEMENTI.legno;
        return (
          <div key={ev.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:elbg(ev.elemento,dark),borderRadius:8,marginBottom:4,border:`0.5px solid ${e.colore}44`}}>
            <div style={{width:8,height:8,borderRadius:2,background:e.colore,flexShrink:0}}/>
            <span style={{flex:1,fontSize:12,color:"var(--text)"}}>{ev.testo}</span>
            <button onClick={()=>deleteEvent(ev.id)} style={{background:"none",border:"none",color:"var(--text-dim)",fontSize:18,cursor:"pointer",padding:"0 2px",lineHeight:1,flexShrink:0}}>×</button>
          </div>
        );
      })}
      {dayEvents.length===0 && !showAdd && (
        <div style={{fontSize:11,color:"var(--text-sub)",textAlign:"center",padding:"4px 0"}}>Nessun evento</div>
      )}
      {showAdd && (
        <div style={{background:"var(--bg-wash)",borderRadius:10,padding:"12px",border:"0.5px solid var(--border-sec)",marginTop:4}}>
          <input autoFocus value={newText} onChange={e=>setNewText(e.target.value)}
                 onKeyDown={e=>{if(e.key==="Enter")addEvent();if(e.key==="Escape")setShowAdd(false);}}
                 placeholder="Nome evento…"
                 style={{width:"100%",fontSize:13,marginBottom:10,boxSizing:"border-box"}}/>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
            {Object.entries(ELEMENTI).map(([k,e])=>(
              <div key={k} onClick={()=>setNewEl(k)} style={{
                display:"flex",alignItems:"center",gap:3,padding:"4px 9px",borderRadius:12,
                cursor:"pointer",fontSize:11,fontWeight:newEl===k?600:400,
                background:newEl===k?e.colore:elbg(k,dark),
                color:newEl===k?"white":e.colore,
                border:`0.5px solid ${e.colore}55`,transition:"background 0.15s"
              }}>{e.char} {e.nome}</div>
            ))}
          </div>
          <button onClick={addEvent} style={{width:"100%",padding:"8px",fontSize:13,background:"var(--accent)",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:500}}>
            Aggiungi evento
          </button>
        </div>
      )}
    </div>
  );
}

// ── Analog Timer ──────────────────────────────────────────────────────────────
function AnalogTimer({ durata, el, onClose }) {
  const total = Math.max(1,durata)*60;
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const done = remaining===0;
  const e = ELEMENTI[el]||ELEMENTI.terra;

  useEffect(()=>{
    if (!running||done) return;
    const id = setInterval(()=>setRemaining(r=>r<=1?0:r-1),1000);
    return ()=>clearInterval(id);
  },[running,done]);

  const pct=remaining/total, R=44, CX=55, CY=55, circ=2*Math.PI*R;
  const mins=Math.floor(remaining/60), secs=remaining%60;
  const fillColor=done?"var(--accent)":e.colore;

  return (
    <div style={{background:elbg(el,false),borderRadius:12,padding:"14px 12px",border:`0.5px solid ${e.colore}33`,marginTop:6,marginBottom:2,display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
      <svg width={110} height={110} viewBox="0 0 110 110">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={`${e.colore}22`} strokeWidth={10}/>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={fillColor} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round"
          style={{transform:"rotate(-90deg)",transformOrigin:`${CX}px ${CY}px`,transition:running?"stroke-dashoffset 0.9s linear":"none"}}/>
        {done ? (
          <text x={CX} y={CY+5} textAnchor="middle" fontSize={22} fill="var(--accent)" fontWeight={700} fontFamily="inherit">✓</text>
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
          <button onClick={()=>setRunning(r=>!r)} style={{fontSize:18,padding:"7px 16px",background:running?"var(--bg-gray)":e.colore,color:running?"var(--text)":"white",border:"none",borderRadius:8,cursor:"pointer",lineHeight:1,fontWeight:600}}>
            {running?"⏸":"▶"}
          </button>
        )}
        {done && <button onClick={()=>{setRemaining(total);setRunning(false);}} style={{fontSize:13,padding:"7px 14px",background:"var(--accent)",color:"white",border:"none",borderRadius:8,cursor:"pointer"}}>↺ Ripeti</button>}
        {!done && <button onClick={()=>{setRemaining(total);setRunning(false);}} style={{fontSize:13,padding:"7px 10px",background:"none",border:"0.5px solid var(--border-sec)",borderRadius:8,cursor:"pointer",color:"var(--text-sub)"}}>↺</button>}
        <button onClick={onClose} style={{fontSize:13,padding:"7px 12px",background:"none",border:"0.5px solid var(--border-sec)",borderRadius:8,cursor:"pointer",color:"var(--text-sec)"}}>✕</button>
      </div>
    </div>
  );
}

// ── Routine Stats ─────────────────────────────────────────────────────────────
// ── 14-day grid (shared for Routine + Habit) ─────────────────────────────────
// items: [{id, label, ...}], log14: {dateString: {id: value}}
// isQuit mode: "done" = no value logged (for quitting habits)
function StoricoGrid({ items, log14, isQuit=false, onClose, dark }) {
  const oggi = new Date();
  const days = Array.from({length:14}, (_,i) => {
    const d = new Date(oggi.getTime() - (13-i) * 86400000);
    return {d, key:d.toDateString(), isOggi:d.toDateString()===oggi.toDateString()};
  });
  const isDone = (key, it) => {
    const v = (log14[key]||{})[it.id];
    return isQuit ? !(+v>0) : (+v>0 || v===true);
  };
  const streak = (()=>{
    let s=0;
    for(let i=13;i>=0;i--){
      if(items.length>0 && items.every(it=>isDone(days[i].key,it))) s++;
      else break;
    }
    return s;
  })();
  const complete = days.filter(({key})=>items.length>0&&items.every(it=>isDone(key,it))).length;
  return (
    <div style={{background:"var(--bg-wash)",borderRadius:12,padding:"12px",marginBottom:10,border:"0.5px solid var(--border-ter)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:11,color:"var(--text-sec)"}}>streak {streak} · {complete} complete su 14</span>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:16,color:"var(--text-sub)",cursor:"pointer",padding:"0 2px"}}>✕</button>
      </div>
      <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{minWidth: Math.max(260, 58+14*22)}}>
          <div style={{display:"flex",marginBottom:3}}>
            <div style={{width:58,flexShrink:0}}/>
            {days.map(({d,isOggi})=>(
              <div key={d.toDateString()} style={{width:22,flexShrink:0,textAlign:"center",fontSize:7,color:isOggi?"var(--accent)":"var(--text-sub)",fontWeight:isOggi?700:400,lineHeight:1.3}}>
                {d.getDate()}<br/><span style={{fontSize:6,opacity:0.7}}>{d.getMonth()+1}</span>
              </div>
            ))}
          </div>
          {items.map(it=>{
            const itemColor = it.colore || "var(--accent)";
            return (
            <div key={it.id} style={{display:"flex",alignItems:"center",marginBottom:2}}>
              <div style={{width:58,flexShrink:0,fontSize:9,color:itemColor,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:4,fontWeight:500}}>{it.label}</div>
              {days.map(({key,isOggi})=>{
                const done = isDone(key, it);
                return (
                  <div key={key} style={{width:22,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <div style={{
                      width:16,height:16,borderRadius:3,
                      background:done?itemColor:dark?"#2a2a2a":"var(--bg-gray)",
                      border:isOggi?`1px solid ${itemColor}66`:`0.5px solid ${dark?"#333":"var(--border-ter)"}`,
                      display:"flex",alignItems:"center",justifyContent:"center"
                    }}>
                      {done&&<span style={{fontSize:7,color:"white",lineHeight:1}}>✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          );})}

        </div>
      </div>
    </div>
  );
}

function RoutineStats({ routineLog, routineCfg, onClose, dark }) {
  return <StoricoGrid items={routineCfg.filter(t=>t.attiva)} log14={routineLog} onClose={onClose} dark={dark}/>;
}

// ── Habit 30-day Chart ────────────────────────────────────────────────────────
function HabitChart({ habitId, habitLog }) {
  const oggi = new Date();
  const days30 = Array.from({length:30},(_,i)=>{
    const d=new Date(oggi.getTime()-(29-i)*86400000);
    const key=d.toDateString();
    return {key, val:parseFloat(habitLog[key]?.[habitId]||0), isOggi:d.toDateString()===oggi.toDateString()};
  });
  const maxVal = Math.max(...days30.map(d=>d.val), 0.01);
  const total = days30.reduce((a,d)=>a+d.val,0);
  const nonZero = days30.filter(d=>d.val>0).length;
  const avg = nonZero>0 ? total/nonZero : 0;

  return (
    <div style={{padding:"10px 0 6px"}}>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        {[
          {v:nonZero, l:"giorni attivi"},
          {v:avg.toFixed(1), l:"media/giorno"},
          {v:total.toFixed(1), l:"totale 30gg"},
        ].map(({v,l})=>(
          <div key={l} style={{flex:1,background:"var(--bg-card)",borderRadius:6,padding:"5px 6px",textAlign:"center",border:"0.5px solid var(--border-ter)"}}>
            <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>{v}</div>
            <div style={{fontSize:9,color:"var(--text-sub)"}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:1.5,alignItems:"flex-end",height:44}}>
        {days30.map(({key,val,isOggi})=>(
          <div key={key} style={{
            flex:1,
            height:`${Math.max(2,(val/maxVal)*44)}px`,
            background:isOggi?"var(--accent)":val>0?"var(--accent-77)":"var(--bg-gray2)",
            borderRadius:"2px 2px 0 0",
            transition:"height 0.2s"
          }}/>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"var(--text-sub)",marginTop:3}}>
        <span>30 gg fa</span>
        <span>oggi</span>
      </div>
    </div>
  );
}

// ── Top Navigation ────────────────────────────────────────────────────────────
function TopNav({ view, setView, syncStatus, userEmail, setImpTab, dark=false }) {
  const isUtility = ["routine","habit","todo","memo"].includes(view);
  const isCal = view === "calendario";
  const syncDot = syncStatus==="syncing" ? "#f59e0b" : syncStatus==="synced" ? "#4a7c59" : syncStatus==="error" ? "#e53e3e" : null;
  return (
    <div style={{borderBottom:"0.5px solid var(--border-ter)",position:"sticky",top:0,background:"var(--bg)",zIndex:50}}>
      <div style={{display:"flex",alignItems:"stretch",maxWidth:480,margin:"0 auto"}}>
        {/* Logo — tab Calendario */}
        <div onClick={()=>setView("calendario")} style={{
          flex:1,textAlign:"center",padding:"6px 0 5px",cursor:"pointer",
          color:isCal?"var(--accent)":"var(--text-sub)",
          borderBottom:isCal?"2px solid var(--accent)":"2px solid transparent",
          fontWeight:isCal?600:400,userSelect:"none",
          opacity: isCal ? 1 : 0.38,
          display:"flex",flexDirection:"column",alignItems:"center",
        }}>
          <LogoOttagono size={28} theme={dark ? "dark" : "light"}/>
          <div style={{fontSize:10,marginTop:1}}>Home</div>
        </div>
        {/* Nav items */}
        {[
          {k:"utility",     label:"Utility",   ico:<IconUtility size={26}/>},
          {k:"bazi",        label:"Ba-Zi",     ico:<IconBaZi size={28}/>},
          {k:"impostazioni",label:"Impostaz.", ico:<IconImpostazioni size={26}/>},
        ].map(({k,label,ico})=>{
          const active = k==="utility" ? isUtility : view===k;
          return (
            <div key={k}
              onClick={()=>{
                if(k==="impostazioni") setImpTab?.("generali");
                setView(k==="utility"?"routine":k);
              }}
              style={{flex:1,textAlign:"center",padding:"6px 0 5px",cursor:"pointer",
                      color:active?"var(--accent)":"var(--text-sub)",
                      borderBottom:active?"2px solid var(--accent)":"2px solid transparent",
                      fontWeight:active?600:400,userSelect:"none",
                      opacity: !active ? 0.38 : 1,
                      display:"flex",flexDirection:"column",alignItems:"center"}}>
              {ico}
              <div style={{fontSize:10,marginTop:1}}>{label}</div>
            </div>
          );
        })}
        {/* Sync/user indicator */}
        <div style={{display:"flex",alignItems:"center",padding:"0 8px",flexShrink:0}}>
          {syncDot
            ? <div style={{width:7,height:7,borderRadius:"50%",background:syncDot}}/>
            : userEmail
              ? <div title={userEmail} style={{width:20,height:20,borderRadius:"50%",background:"var(--accent)",color:"white",fontSize:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {userEmail[0].toUpperCase()}
                </div>
              : null
          }
        </div>
      </div>
      {isUtility && (
        <div style={{display:"flex",padding:"6px 10px",background:"var(--bg-card)",borderBottom:"0.5px solid var(--border-ter)",maxWidth:480,margin:"0 auto",gap:6}}>
          {[
            {k:"routine",l:"Routine",ico:<IconRoutine size={20}/>},
            {k:"habit",  l:"Habit",  ico:<IconHabit size={20}/>},
            {k:"todo",   l:"To-Do",  ico:<IconTodo size={20}/>},
            {k:"memo",   l:"Memo",   ico:<IconMemo size={20}/>},
          ].map(({k,l,ico})=>(
            <button key={k} onClick={()=>setView(k)} style={{
              flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,
              padding:"6px 2px",borderRadius:12,border:"none",cursor:"pointer",
              background:view===k?"var(--accent)":"transparent",
              color:view===k?"white":"var(--text-ter)",
              fontWeight:view===k?600:400,transition:"background 0.15s",
            }}>
              {ico}
              <span style={{fontSize:10,lineHeight:1}}>{l}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shichen Picker ────────────────────────────────────────────────────────────
function ShichenPicker({ value, onChange, dark }) {
  const selIdx = Math.floor((parseInt(value)||0)/2) % 12;
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,marginTop:4}}>
      {ANIMALI_INFO.map((a,i)=>{
        const el=ELEMENTI[a.el], sel=selIdx===i;
        const startH=i*2, endH=(startH+2);
        return (
          <div key={i} onClick={()=>onChange(String(startH))} style={{
            background:sel?el.colore:elbg(a.el,dark),
            border:`0.5px solid ${el.colore}${sel?"":"44"}`,
            borderRadius:8,padding:"7px 4px",textAlign:"center",cursor:"pointer",transition:"background 0.15s"
          }}>
            <div style={{fontSize:17}}>{a.emoji}</div>
            <div style={{fontSize:9,fontWeight:600,color:sel?"white":el.colore,marginTop:1}}>{a.nome}</div>
            <div style={{fontSize:8,color:sel?"rgba(255,255,255,0.75)":"var(--text-sub)"}}>{String(startH).padStart(2,"0")}–{String(endH).padStart(2,"0")}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Compatibilità con il Giorno ───────────────────────────────────────────────
function CompatibilitaGiorno({ dmEl, dark }) {
  const L = useL() || {};
  const relInfoL = L.relInfo || REL_INFO;
  const uiB = L.ui?.bazi || {};
  const oggi = new Date();
  const todayB   = baziDay(oggi);
  const todayTEl = TRONCO_EL[todayB.tronco];
  const todayREl = RAMO_EL[todayB.ramo];
  const tEl = ELEMENTI[todayTEl] || ELEMENTI.terra;
  const rEl = ELEMENTI[todayREl] || ELEMENTI.acqua;
  const safeDmEl = dmEl && ELEMENTI[dmEl] ? dmEl : null;
  const rel     = safeDmEl ? dayRelation(safeDmEl, todayTEl) : null;
  const relRaw  = rel ? REL_INFO[rel] : null;
  const info    = rel ? { ...relRaw, ...(relInfoL[rel] || {}) } : null;
  const dmElObj = safeDmEl ? ELEMENTI[safeDmEl] : null;

  return (
    <div style={{marginTop:14,background:"var(--bg-card)",borderRadius:12,border:"0.5px solid var(--border-ter)",overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"9px 14px",borderBottom:"0.5px solid var(--border-ter)",display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{uiB.energiaOggi||"☀️ Energia di Oggi"}</span>
        <span style={{fontSize:10,color:"var(--text-sec)",marginLeft:"auto"}}>
          {oggi.toLocaleDateString(i18n.language||"it-IT",{weekday:"short",day:"numeric",month:"short"})}
        </span>
      </div>

      <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
        {/* Tronco + Ramo del giorno */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div style={{background:elbg(todayTEl,dark),borderRadius:8,padding:"8px 10px",border:`0.5px solid ${tEl.colore}44`}}>
            <div style={{fontSize:9,color:"var(--text-sec)",marginBottom:3}}>{uiB.tronco||"Tronco 天干"}</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:16,lineHeight:1}}>{TRONCHI_EMOJI[todayB.tronco]}</span>
              <span style={{fontSize:22,color:dark?"white":tEl.colore,fontWeight:500,lineHeight:1}}>{TRONCHI[todayB.tronco]}</span>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:dark?"rgba(255,255,255,0.9)":tEl.colore}}>{TRONCHI_NOMI[todayB.tronco]}</div>
                <Badge el={todayTEl}/>
              </div>
            </div>
          </div>
          <div style={{background:elbg(todayREl,dark),borderRadius:8,padding:"8px 10px",border:`0.5px solid ${rEl.colore}44`}}>
            <div style={{fontSize:9,color:"var(--text-sec)",marginBottom:3}}>{uiB.ramo||"Ramo 地支"}</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:20,lineHeight:1}}>{ANIMALI_EMOJI[todayB.ramo]}</span>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:dark?"rgba(255,255,255,0.9)":rEl.colore}}>{(L.animali||ANIMALI)[todayB.ramo]}</div>
                <Badge el={todayREl}/>
              </div>
            </div>
          </div>
        </div>

        {/* Compatibilità personalizzata (solo se dmEl disponibile) */}
        {info && dmElObj ? (
          <div style={{background:elbg(safeDmEl,dark),borderRadius:10,padding:"12px",border:`0.5px solid ${dmElObj.colore}44`}}>
            {/* 日主 ← emoji → Giorno */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div style={{flex:1,background:`${dmElObj.colore}18`,borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"var(--text-sec)"}}>{uiB.tuSelf||"日主 Tu"}</div>
                <div style={{fontSize:28,lineHeight:1.1,color:dark?"white":dmElObj.colore}}>{dmElObj.char}</div>
                <div style={{fontSize:9,fontWeight:600,color:dark?"rgba(255,255,255,0.8)":dmElObj.colore}}>{dmElObj.nome}</div>
              </div>
              <div style={{textAlign:"center",flexShrink:0}}>
                <div style={{fontSize:28,lineHeight:1}}>{info.emoji}</div>
              </div>
              <div style={{flex:1,background:`${tEl.colore}18`,borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"var(--text-sec)"}}>{L.ui?.oggi||"Oggi"}</div>
                <div style={{fontSize:28,lineHeight:1.1,color:dark?"white":tEl.colore}}>{tEl.char}</div>
                <div style={{fontSize:9,fontWeight:600,color:dark?"rgba(255,255,255,0.8)":tEl.colore}}>{tEl.nome}</div>
              </div>
            </div>
            {/* Nome relazione + barre energia */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{info.nome}</div>
                <div style={{fontSize:10,color:"var(--text-sec)"}}>{info.cin}</div>
              </div>
              <div style={{display:"flex",gap:3}}>
                {Array.from({length:5},(_,i)=>(
                  <div key={i} style={{width:18,height:5,borderRadius:2,background:i<info.bar?dmElObj.colore:(dark?"#333":"var(--bg-gray2)"),transition:"background 0.2s"}}/>
                ))}
              </div>
            </div>
            {/* Descrizione */}
            <div style={{fontSize:12,lineHeight:1.7,color:"var(--text)",marginBottom:8}}>{info.desc}</div>
            {/* Consigli */}
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <div style={{fontSize:11,lineHeight:1.5,color:"var(--text-sec)"}}><span style={{color:"var(--accent)",fontWeight:600,marginRight:4}}>✓</span>{info.bene}</div>
              <div style={{fontSize:11,lineHeight:1.5,color:"var(--text-sec)"}}><span style={{color:"#e07b39",fontWeight:600,marginRight:4}}>⚠</span>{info.cura}</div>
            </div>
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"10px 12px",background:"var(--bg-wash)",borderRadius:10,border:"0.5px solid var(--border-ter)"}}>
            <div style={{fontSize:12,color:"var(--text-sec)",lineHeight:1.7}}>
              Inserisci la tua data di nascita nel calcolatore<br/>per vedere la compatibilità personale.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Wu Xing Star SVG ─────────────────────────────────────────────────────────
function WuXingStar({ dark }) {
  // Pentagon arranged clockwise from top = generation cycle
  // 木(top) → 火(upper-right) → 土(lower-right) → 金(lower-left) → 水(upper-left)
  const CX=100, CY=100, R=66, NR=19;
  const ELS=["legno","fuoco","terra","metallo","acqua"];
  const ANGS=[-90,-18,54,126,198];
  const rad=a=>a*Math.PI/180;
  const pts=ELS.map((el,i)=>({
    x:+(CX+R*Math.cos(rad(ANGS[i]))).toFixed(1),
    y:+(CY+R*Math.sin(rad(ANGS[i]))).toFixed(1),
    c:ELEMENTI[el].colore, bg:dark?ELEMENTI[el].colore+"2a":ELEMENTI[el].bg,
    ch:ELEMENTI[el].char, nome:ELEMENTI[el].nome,
  }));
  function seg(ax,ay,bx,by,d){
    const dx=bx-ax,dy=by-ay,len=Math.sqrt(dx*dx+dy*dy),u=d/len;
    return {x1:ax+dx*u,y1:ay+dy*u,x2:bx-dx*u,y2:by-dy*u};
  }
  const GEN=[[0,1],[1,2],[2,3],[3,4],[4,0]];
  const CTR=[[0,2],[2,4],[4,1],[1,3],[3,0]];
  return (
    <svg viewBox="0 0 200 200" width="100%" style={{maxWidth:220,display:"block",margin:"0 auto 2px"}}>
      <defs>
        {pts.map((p,i)=>[
          <marker key={`ag${i}`} id={`ag${i}`} viewBox="0 0 8 6" refX="7" refY="3" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L8,3 L0,6" fill="none" stroke={p.c} strokeWidth="1.3"/>
          </marker>,
          <marker key={`ac${i}`} id={`ac${i}`} viewBox="0 0 8 6" refX="7" refY="3" markerWidth="4" markerHeight="4" orient="auto">
            <path d="M0,0 L8,3 L0,6" fill="none" stroke={p.c} strokeWidth="1" opacity="0.5"/>
          </marker>,
        ])}
      </defs>
      {/* Generazione — linee solide */}
      {GEN.map(([a,b])=>{
        const s=seg(pts[a].x,pts[a].y,pts[b].x,pts[b].y,NR+3);
        return <line key={`g${a}${b}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke={pts[a].c} strokeWidth="2" strokeLinecap="round" markerEnd={`url(#ag${a})`}/>;
      })}
      {/* Controllo — linee tratteggiate */}
      {CTR.map(([a,b])=>{
        const s=seg(pts[a].x,pts[a].y,pts[b].x,pts[b].y,NR+3);
        return <line key={`c${a}${b}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke={pts[a].c} strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round"
          markerEnd={`url(#ac${a})`} opacity="0.6"/>;
      })}
      {/* Nodi elementi */}
      {pts.map((p,i)=>(
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={NR} fill={p.bg} stroke={p.c} strokeWidth="1.8"/>
          <text x={p.x} y={p.y-1} textAnchor="middle" dominantBaseline="middle"
            fontSize="14" fontWeight="700" fill={dark?"white":p.c}>{p.ch}</text>
          <text x={p.x} y={p.y+10} textAnchor="middle"
            fontSize="6.5" fill={dark?"rgba(255,255,255,0.55)":p.c}>{p.nome}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Ba-Zi Informazioni Tab ────────────────────────────────────────────────────
function InfoTabContent({ dark }) {
  const [subtab, setSubtab] = useState("tronchi");
  const [subIdx, setSubIdx] = useState(null);
  const [elOpen, setElOpen] = useState(null); // accordion 5 elementi

  if (subIdx !== null && subtab === "tronchi") return <TroncoModal idx={subIdx} onClose={()=>setSubIdx(null)} dark={dark}/>;
  if (subIdx !== null && subtab === "rami")    return <AnimaleModal idx={subIdx} onClose={()=>setSubIdx(null)} dark={dark}/>;

  return (
    <div>
      <div style={{display:"flex",gap:4,marginBottom:14}}>
        {[{k:"tronchi",l:"10 Tronchi 天干"},{k:"rami",l:"12 Rami 地支"},{k:"wuxing",l:"5 Elem. 五行"}].map(t=>(
          <button key={t.k} onClick={()=>setSubtab(t.k)} style={{flex:1,fontSize:10,padding:"7px 2px",background:subtab===t.k?"var(--accent)":"var(--bg-gray)",color:subtab===t.k?"white":"var(--text-sec)",border:"none",borderRadius:6,cursor:"pointer",fontWeight:subtab===t.k?600:400}}>{t.l}</button>
        ))}
      </div>
      {subtab==="tronchi" && (
        <div>
          <p style={{fontSize:11,marginBottom:8,color:"var(--text-sec)"}}>I <strong>10 Tronchi Celesti</strong> (天干) — tocca per il significato:</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
            {TRONCHI.map((t,i)=>{
              const el=ELEMENTI[TRONCO_EL[i]];
              return (
                <div key={i} onClick={()=>setSubIdx(i)} style={{background:elbg(TRONCO_EL[i],dark),borderRadius:8,padding:"7px 10px",display:"flex",gap:6,alignItems:"center",border:`0.5px solid ${el.colore}33`,cursor:"pointer"}}>
                  <span style={{fontSize:17,lineHeight:1}}>{TRONCHI_EMOJI[i]}</span>
                  <span style={{fontSize:19,lineHeight:1,color:dark?"rgba(255,255,255,0.9)":el.colore,fontWeight:500}}>{t}</span>
                  <div>
                    <div style={{fontSize:10,fontWeight:600,color:el.colore}}>{TRONCHI_NOMI[i]}</div>
                    <div style={{fontSize:9,color:"var(--text-sec)"}}>{el.nome} {i%2===0?"Yang":"Yin"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {subtab==="rami" && (
        <div>
          <p style={{fontSize:11,marginBottom:8,color:"var(--text-sec)"}}>I <strong>12 Rami Terrestri</strong> (地支) — tocca un animale:</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
            {RAMI.map((r,i)=>{
              const el=ELEMENTI[RAMO_EL[i]];
              return (
                <div key={i} onClick={()=>setSubIdx(i)} style={{background:elbg(RAMO_EL[i],dark),borderRadius:8,padding:"7px 10px",display:"flex",gap:8,alignItems:"center",border:`0.5px solid ${el.colore}33`,cursor:"pointer"}}>
                  <span style={{fontSize:18,lineHeight:1}}>{r}</span>
                  <span style={{fontSize:16,lineHeight:1}}>{ANIMALI_EMOJI[i]}</span>
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:el.colore}}>{ANIMALI[i]}</div>
                    <div style={{fontSize:9,color:"var(--text-sec)"}}>{el.nome}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subtab==="wuxing" && (
        <div>
          {/* Wu Xing Star */}
          <div style={{marginBottom:8}}>
            <WuXingStar dark={dark}/>
          </div>
          {/* Legenda cicli */}
          <div style={{display:"flex",gap:16,justifyContent:"center",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:"var(--text-sec)"}}>
              <svg width="26" height="8" style={{flexShrink:0}}>
                <line x1="1" y1="4" x2="19" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M17,1 L25,4 L17,7" fill="none" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
              相生 Generazione
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:"var(--text-sec)"}}>
              <svg width="26" height="8" style={{flexShrink:0}}>
                <line x1="1" y1="4" x2="19" y2="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4,2.5" strokeLinecap="round"/>
                <path d="M17,1 L25,4 L17,7" fill="none" stroke="currentColor" strokeWidth="1"/>
              </svg>
              相克 Controllo
            </div>
          </div>
          {/* Cinque elementi — accordion */}
          {Object.entries(ELEMENTI).map(([k,e])=>{
            const r=EL_RELATIONS[k];
            const open=elOpen===k;
            return (
              <div key={k} style={{marginBottom:5}}>
                <div onClick={()=>setElOpen(open?null:k)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",
                    background:elbg(k,dark),
                    borderRadius:open?"8px 8px 0 0":8,
                    border:`0.5px solid ${e.colore}44`,
                    cursor:"pointer",userSelect:"none"}}>
                  <span style={{fontSize:26,lineHeight:1,color:dark?"white":e.colore,fontWeight:700}}>{e.char}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:dark?"rgba(255,255,255,0.9)":e.colore}}>{e.nome}</div>
                    <div style={{fontSize:9,color:"var(--text-sec)",marginTop:2}}>
                      生 {ELEMENTI[r.genera].char} · 克 {ELEMENTI[r.controlla].char} · 受生 {ELEMENTI[r.generato_da].char} · 受克 {ELEMENTI[r.ctrl_da].char}
                    </div>
                  </div>
                  <span style={{fontSize:11,color:"var(--text-sub)",flexShrink:0}}>{open?"▲":"▼"}</span>
                </div>
                {open && (
                  <div style={{padding:"10px 14px",background:elbg(k,dark),
                    borderRadius:"0 0 8px 8px",border:`0.5px solid ${e.colore}44`,borderTop:"none"}}>
                    <div style={{fontSize:11,lineHeight:1.85,color:"var(--text)",whiteSpace:"pre-line",
                      borderLeft:`3px solid ${e.colore}`,paddingLeft:10,marginBottom:10}}>
                      {e.essenza}
                    </div>
                    {/* Relazioni rapide */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                      {[
                        {label:"生 Nutre",   el:r.genera,      sym:"→"},
                        {label:"克 Controlla",el:r.controlla,  sym:"→"},
                        {label:"受生 Riceve", el:r.generato_da, sym:"←"},
                        {label:"受克 Cede",   el:r.ctrl_da,     sym:"←"},
                      ].map(({label,el:relEl,sym})=>{
                        const re=ELEMENTI[relEl];
                        return (
                          <div key={label} style={{background:`${re.colore}14`,borderRadius:6,padding:"5px 8px",
                            border:`0.5px solid ${re.colore}44`}}>
                            <div style={{fontSize:9,color:"var(--text-sec)",marginBottom:2}}>{label}</div>
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              <span style={{fontSize:16,color:re.colore,fontWeight:700}}>{re.char}</span>
                              <span style={{fontSize:10,fontWeight:600,color:re.colore}}>{re.nome}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Ba-Zi Calculator ──────────────────────────────────────────────────────────
function BaziView({ dark, baziPersonal, setBaziPersonal }) {
  const [tab, setTab] = useState("calcola");
  const [shichenOpen, setShichenOpen] = useState(false);
  const [lmtOpen, setLmtOpen] = useState(false);
  const {data="", ora="12", lonNascita="", fusoNascita=""} = baziPersonal || {};
  function setData(v){setBaziPersonal(p=>({...p,data:v}));}
  function setOra(v){setBaziPersonal(p=>({...p,ora:v}));setShichenOpen(false);}
  function setLon(v){setBaziPersonal(p=>({...p,lonNascita:v}));}
  function setFusoN(v){setBaziPersonal(p=>({...p,fusoNascita:v}));}

  // LMT correction: each 15° of longitude = 1 hour from UTC
  const lonVal    = lonNascita !== "" ? parseFloat(lonNascita) : NaN;
  const tzVal     = fusoNascita !== "" ? parseFloat(fusoNascita) : (!isNaN(lonVal) ? Math.round(lonVal / 15) : NaN);
  const lmtDeltaH = !isNaN(lonVal) && !isNaN(tzVal) ? lonVal / 15 - tzVal : 0;
  const lmtDeltaMin = Math.round(lmtDeltaH * 60);
  const hasLmt = !isNaN(lonVal);
  // Corrected LMT display (for UI only, not for Ba-Zi calc — that uses hLmt)
  const lmtRaw  = ((parseInt(ora) || 0) + lmtDeltaH + 48) % 24;
  const lmtHH   = String(Math.floor(lmtRaw)).padStart(2,"0");
  const lmtMM   = String(Math.round((lmtRaw % 1) * 60)).padStart(2,"0");

  const ris = data ? (()=>{
    const d = new Date(data+"T12:00:00");
    const h = parseInt(ora);
    // LMT correction: adjust birth hour to Local Mean Time
    let hLmt = h + lmtDeltaH, dLmt = d;
    if (hasLmt) {
      if (hLmt < 0)   { hLmt += 24; dLmt = new Date(d.getTime() - 86400000); }
      if (hLmt >= 24) { hLmt -= 24; dLmt = new Date(d.getTime() + 86400000); }
    }
    // Precise month via astronomical 24 Jieqi (节气)
    const yearBazi      = baziYear(dLmt);
    const solarMonthIdx = baziSolarMonthIdx(dLmt);
    // 五鼠遁日法 — hour stem depends on day stem
    const dayT     = baziDay(dLmt).tronco;
    const hourBase = (dayT % 5) * 2;
    const hourIdx  = Math.floor(hLmt / 2) % 12;
    return [
      {l:"Anno",  b:yearBazi},
      {l:"Mese",  b:baziMonth(solarMonthIdx, yearBazi.tronco)},
      {l:"Giorno",b:baziDay(dLmt)},
      {l:"Ora",   b:{tronco:(hourBase+hourIdx)%10, ramo:Math.floor(hLmt/2)%12}},
    ];
  })() : null;

  const selIdx = Math.floor((parseInt(ora)||0)/2) % 12;
  const selA = ANIMALI_INFO[selIdx];

  return (
    <div style={{padding:"1rem",maxWidth:480,margin:"0 auto"}}>
      {/* Tab bar */}
      <div style={{display:"flex",gap:4,marginBottom:16}}>
        {[{k:"calcola",l:"☯ Ba-Zi"},{k:"info",l:"📖 Guida"},{k:"informazioni",l:"🗂 Info"}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{flex:1,fontSize:11,padding:"7px 2px",background:tab===t.k?"var(--accent)":"var(--bg-gray)",color:tab===t.k?"white":"var(--text-sec)",border:"none",borderRadius:8,cursor:"pointer",fontWeight:tab===t.k?600:400}}>{t.l}</button>
        ))}
      </div>

      {tab==="calcola" && (
        <>
          <div style={{fontSize:13,color:"var(--text-sec)",marginBottom:12}}>Inserisci data e ora di nascita per calcolare i tuoi Quattro Pilastri.</div>
          <div style={{background:"var(--bg-card)",border:"0.5px solid var(--border-sec)",borderRadius:12,padding:"1rem"}}>
            <input type="date" value={data} onChange={e=>setData(e.target.value)} style={{width:"100%",marginBottom:10}}/>
            <div style={{fontSize:11,color:"var(--text-sec)",marginBottom:6}}>Ora di nascita — seleziona il 時辰:</div>
            {/* Shichen: collapsed chip when selected, expand on tap */}
            {ora && !shichenOpen ? (
              <div onClick={()=>setShichenOpen(true)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:ELEMENTI[selA.el].colore,borderRadius:10,cursor:"pointer",marginBottom:8}}>
                <span style={{fontSize:24}}>{selA.emoji}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"white"}}>{selA.nome}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.75)"}}>{String(selIdx*2).padStart(2,"0")}:00 – {String(selIdx*2+2).padStart(2,"0")}:00 · tocca per cambiare</div>
                </div>
              </div>
            ) : (
              <ShichenPicker value={ora} onChange={setOra} dark={dark}/>
            )}
            {/* LMT correction — collapsibile */}
            <div style={{marginTop:8}}>
              <div onClick={()=>setLmtOpen(o=>!o)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",borderRadius:8,background:"var(--bg-wash)",border:"0.5px solid var(--border-ter)",cursor:"pointer",userSelect:"none"}}>
                <span style={{fontSize:11,color:"var(--text-sec)"}}>📍 Luogo di nascita — correzione LMT{hasLmt ? ` (${lmtDeltaMin >= 0 ? "+" : ""}${lmtDeltaMin} min)` : ""}</span>
                <span style={{fontSize:10,color:"var(--text-ter)"}}>{lmtOpen?"▲":"▼"}</span>
              </div>
              {lmtOpen && (
                <div style={{padding:"10px",background:"var(--bg-wash)",borderRadius:"0 0 8px 8px",border:"0.5px solid var(--border-ter)",borderTop:"none"}}>
                  <div style={{fontSize:10,color:"var(--text-sec)",lineHeight:1.5,marginBottom:8}}>
                    Il Ba-Zi usa l'<strong>ora solare locale (LMT)</strong>, non quella dell'orologio. Inserisci la longitudine del luogo di nascita per una correzione precisa del Pilastro dell'Ora.
                  </div>
                  <div style={{display:"flex",gap:8,marginBottom:hasLmt?6:0}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:"var(--text-sec)",marginBottom:3}}>Longitudine (°E positivo, °W negativo)</div>
                      <input type="number" placeholder="es. 12.5 Roma · 9.2 Milano" value={lonNascita} onChange={e=>setLon(e.target.value)} min="-180" max="180" step="0.1" style={{width:"100%",fontSize:12,padding:"5px 8px",borderRadius:6,border:"0.5px solid var(--border)"}}/>
                    </div>
                    <div style={{width:72}}>
                      <div style={{fontSize:10,color:"var(--text-sec)",marginBottom:3}}>Fuso UTC</div>
                      <input type="number" placeholder="auto" value={fusoNascita} onChange={e=>setFusoN(e.target.value)} min="-12" max="14" step="0.5" style={{width:"100%",fontSize:12,padding:"5px 8px",borderRadius:6,border:"0.5px solid var(--border)"}}/>
                    </div>
                  </div>
                  {hasLmt && (
                    <div style={{fontSize:10,color:"var(--text-sec)",background:"var(--accent-bg)",borderRadius:6,padding:"5px 8px",border:"0.5px solid var(--accent-border)"}}>
                      Correzione: {lmtDeltaMin >= 0 ? "+" : ""}{lmtDeltaMin} min → Ora solare: {lmtHH}:{lmtMM} LMT
                    </div>
                  )}
                </div>
              )}
            </div>
            {ris && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:10}}>
                {ris.map(({l,b})=>{
                  const el=TRONCO_EL[b.tronco];
                  return (
                    <div key={l} style={{background:elbg(el,dark),borderRadius:8,padding:8,textAlign:"center",border:`0.5px solid ${ELEMENTI[el].colore}33`}}>
                      <div style={{fontSize:10,color:"var(--text-sec)",marginBottom:3}}>{l}</div>
                      <div style={{fontSize:26,color:dark?"white":ELEMENTI[el].colore}}>{TRONCHI[b.tronco]}</div>
                      <div style={{fontSize:22,color:dark?"white":ELEMENTI[el].colore}}>{RAMI[b.ramo]}</div>
                      <div style={{fontSize:10,color:dark?"rgba(255,255,255,0.75)":ELEMENTI[el].colore,marginTop:2}}>{(L.animali||ANIMALI)[b.ramo]}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {ris && (
            <div style={{marginTop:12,fontSize:11,color:"var(--text-sec)",background:"var(--bg-wash)",borderRadius:8,padding:"10px 12px",lineHeight:1.6}}>
              <strong>Pilastro del Giorno</strong> (日主) — è il tuo Sé autentico. L'elemento del Tronco del giorno rappresenta la tua natura fondamentale.
            </div>
          )}
          {/* Compatibilità con Oggi — sempre visibile, personalizzata se c'è la data di nascita */}
          <CompatibilitaGiorno dmEl={ris ? TRONCO_EL[ris[2].b.tronco] : null} dark={dark}/>
        </>
      )}

      {tab==="informazioni" && <InfoTabContent dark={dark}/>}

      {tab==="info" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"var(--bg-card)",borderRadius:12,padding:"14px",border:"0.5px solid var(--border-ter)"}}>
            <div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:8}}>📖 Leggere il Ba-Zi</div>
            <div style={{fontSize:12,color:"var(--text-sec)",lineHeight:1.7}}>
              Il <strong>Ba-Zi (八字)</strong> — otto caratteri — è il sistema di astrologia cinese basato sull'anno, mese, giorno e ora di nascita.<br/><br/>
              Ogni pilastro ha un <strong>Tronco Celeste (天干)</strong> e un <strong>Ramo Terrestre (地支)</strong>, che si combinano in coppie. I quattro pilastri rivelano diversi aspetti della vita.
            </div>
          </div>
          {[
            {ico:"📅",tit:"Anno (年)",desc:"Energia sociale, karma familiare, come il mondo ti percepisce. Definisce il tuo animale zodiacale."},
            {ico:"🗓",tit:"Mese (月)",desc:"Ambiente di crescita, relazione con i genitori, carriera e ambizioni. Il ciclo delle stagioni professionali."},
            {ico:"☀️",tit:"Giorno (日)",desc:"Il tuo Sé autentico. Il Tronco del giorno è il tuo elemento dominante — la tua natura fondamentale."},
            {ico:"⏰",tit:"Ora (時)",desc:"Il tuo mondo interiore, aspirazioni, relazioni con i figli. Ciò che cerchi nella vita."},
          ].map(({ico,tit,desc})=>(
            <div key={tit} style={{background:"var(--bg-card)",borderRadius:10,padding:"12px",border:"0.5px solid var(--border-ter)"}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:4}}>{ico} {tit}</div>
              <div style={{fontSize:12,color:"var(--text-sec)",lineHeight:1.6}}>{desc}</div>
            </div>
          ))}
          <div style={{background:"var(--bg-card)",borderRadius:10,padding:"12px",border:"0.5px solid var(--border-ter)"}}>
            <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:6}}>🌏 I 5 Elementi</div>
            {Object.entries(ELEMENTI).map(([k,e])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:e.colore,flexShrink:0}}/>
                <div style={{fontSize:12,color:"var(--text-sec)"}}><strong style={{color:e.colore}}>{e.char} {e.nome}</strong> — {e.essenza.split("\n")[0]}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Morning Routine ───────────────────────────────────────────────────────────
function MorningRoutineView({ routineCfg, setRoutineCfg, routineLog, setRoutineLog, setView, setImpTab, routineDeleted, setRoutineDeleted, dark }) {
  const oggi=new Date(), todayKey=oggi.toDateString();
  const tasks=routineCfg.filter(t=>t.attiva), log=routineLog[todayKey]||{};
  const done=tasks.filter(t=>log[t.id]).length;
  const pct=tasks.length>0?Math.round((done/tasks.length)*100):0;
  const dayEl=TRONCO_EL[baziDay(oggi).tronco], e=ELEMENTI[dayEl];
  const [activeTimer,setActiveTimer]=useState(null);
  const [showStats,setShowStats]=useState(false);
  const [showDeleted,setShowDeleted]=useState(false);
  const recentDeleted=cleanOld(routineDeleted);
  const L = useL() || {};

  function toggle(id) {
    setRoutineLog(prev=>({...prev,[todayKey]:{...(prev[todayKey]||{}),[id]:!(prev[todayKey]?.[id])}}));
  }
  function restoreTask(task) {
    const {deletedAt,...clean}=task;
    setRoutineCfg(prev=>[...prev,clean]);
    setRoutineDeleted(prev=>prev.filter(t=>t.id!==task.id));
  }

  return (
    <div style={{padding:"1rem",maxWidth:480,margin:"0 auto"}}>
      {/* Header row */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:16,fontWeight:600,color:"var(--text)"}}>{L.ui?.routine?.titolo || "🌅 Morning Routine"}</div>
        <DotsMenu render={close=>(
          <>
            <DotsItem label={L.ui?.routine?.impostazioni || "Impostazioni Routine"} onClick={()=>{setImpTab("routine");setView("impostazioni");close();}}/>
            <DotsItem label={`${L.ui?.routine?.eliminateRecente || "Eliminate di recente"}${recentDeleted.length>0?` (${recentDeleted.length})`:""}`} color="#e53e3e" onClick={()=>{setShowDeleted(true);close();}} sep/>
          </>
        )}/>
      </div>

      {/* Summary card */}
      <div onClick={()=>setShowStats(s=>!s)} style={{background:"var(--accent-bg)",borderRadius:12,padding:"12px 14px",marginBottom:10,border:"0.5px solid var(--accent-border)",cursor:"pointer",userSelect:"none"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:11,color:"var(--text-sec)"}}>
            {oggi.toLocaleDateString(i18n.language,{weekday:"long",day:"numeric",month:"long"})}
            {" — "}{done}/{tasks.length} {L.ui?.routine?.completateLabel || "completate"}
          </div>
          <div style={{fontSize:11,color:"var(--accent)",background:"var(--accent-18)",borderRadius:6,padding:"3px 7px",fontWeight:500,flexShrink:0}}>{pct}%</div>
        </div>
        <div style={{marginTop:8,height:5,borderRadius:2.5,background:"var(--accent-22)",overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:2.5,background:"var(--accent)",width:`${pct}%`,transition:"width 0.4s"}}/>
        </div>
        <div style={{fontSize:10,color:"var(--text-sub)",marginTop:4,textAlign:"right"}}>{L.ui?.routine?.storico || "tocca per lo storico"}</div>
      </div>

      {showStats && <RoutineStats routineLog={routineLog} routineCfg={routineCfg} onClose={()=>setShowStats(false)} dark={dark}/>}

      {tasks.map(task=>{
        const isDone=!!log[task.id], timerOpen=activeTimer===task.id;
        const tipo=task.tipo||"tempo";
        return (
          <div key={task.id} style={{marginBottom:8}}>
            <div onClick={()=>toggle(task.id)} style={{
              display:"flex",alignItems:"center",gap:12,padding:"12px 14px",
              background:isDone?"var(--accent-bg)":"var(--bg-card)",
              border:`0.5px solid ${isDone?"var(--accent-44)":"var(--border-ter)"}`,
              borderRadius:10,cursor:"pointer",transition:"background 0.15s"
            }}>
              <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,background:isDone?"var(--accent)":"transparent",border:`2px solid ${isDone?"var(--accent)":"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.2s"}}>
                {isDone && <span style={{color:"white",fontSize:12,lineHeight:1}}>✓</span>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:isDone?400:500,textDecoration:isDone?"line-through":"none",color:isDone?"var(--text-sec)":"var(--text)"}}>{task.label}</div>
                {task.durata>0 && <div style={{fontSize:10,color:"var(--text-sub)"}}>{task.durata} {tipo==="rep"?L.ui?.routine?.rip||"rip.":L.ui?.routine?.min||"min"}</div>}
              </div>
              {tipo==="tempo" && task.durata>0 && (
                <div onClick={ev=>{ev.stopPropagation();setActiveTimer(timerOpen?null:task.id);}} style={{fontSize:18,lineHeight:1,cursor:"pointer",padding:"2px 4px",color:timerOpen?e.colore:"var(--text-dim)",transition:"color 0.15s"}}>⏱</div>
              )}
            </div>
            {timerOpen && tipo==="tempo" && <AnalogTimer durata={task.durata} el={dayEl} onClose={()=>setActiveTimer(null)}/>}
          </div>
        );
      })}

      {tasks.length===0 && (
        <div style={{fontSize:13,color:"var(--text-sec)",textAlign:"center",padding:"2rem 1rem",whiteSpace:"pre-line"}}>
          {L.ui?.routine?.nessunTask || "Nessun task attivo.\nConfigurali nelle Impostazioni → Routine."}
        </div>
      )}
      {done===tasks.length && tasks.length>0 && (
        <div style={{textAlign:"center",padding:"0.75rem",fontSize:14,color:"var(--accent)",fontWeight:600}}>{L.ui?.routine?.completata || "✅ Routine completata!"}</div>
      )}

      {/* Recently deleted modal */}
      {showDeleted && (
        <ModalBox onClose={()=>setShowDeleted(false)} dark={dark} zIndex={400}>
          <ModalHeader title={`🗑 ${L.ui?.routine?.eliminati || "Task eliminati di recente"}`} onClose={()=>setShowDeleted(false)}/>
          <div style={{fontSize:11,color:"var(--text-sub)",textAlign:"center",padding:"8px 10px",background:"var(--bg-wash)",borderRadius:8,marginBottom:10,border:"0.5px solid var(--border-ter)"}}>
            ⚠️ {L.ui?.routine?.conservati || "Conservati per 30 giorni, poi rimossi definitivamente"}
          </div>
          {recentDeleted.length===0
            ? <div style={{fontSize:13,color:"var(--text-sub)",textAlign:"center",padding:"1rem"}}>{L.ui?.routine?.nessunEliminato || "Nessun task eliminato di recente."}</div>
            : recentDeleted.map(task=>(
              <div key={task.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--bg-card)",border:"0.5px solid var(--border-ter)",borderRadius:8,marginBottom:6}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:"var(--text)"}}>{task.label}</div>
                  <div style={{fontSize:10,color:"var(--text-sub)"}}>{task.durata} {task.tipo==="rep"?L.ui?.routine?.rip||"rip.":L.ui?.routine?.min||"min"} · {formatDaysAgo(task.deletedAt)}</div>
                </div>
                <button onClick={()=>{restoreTask(task);}} style={{fontSize:11,padding:"4px 10px",background:"var(--accent)",color:"white",border:"none",borderRadius:6,cursor:"pointer"}}>{L.ui?.ripristina || "Ripristina"}</button>
              </div>
            ))
          }
        </ModalBox>
      )}
    </div>
  );
}

function HabitStats({ habitCfg, habitLog, onClose, dark }) {
  const activeH = habitCfg.filter(h=>h.attiva!==false);
  return <StoricoGrid items={activeH} log14={habitLog} onClose={onClose} dark={dark}/>;
}

// ── Habit Tracker ─────────────────────────────────────────────────────────────
function HabitTrackerView({ habitCfg, setHabitCfg, habitLog, setHabitLog, setView, setImpTab, habitDeleted, setHabitDeleted, dark }) {
  const oggi=new Date(), todayKey=oggi.toDateString(), log=habitLog[todayKey]||{};
  const [chartHabit, setChartHabit] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const recentDeleted = cleanOld(habitDeleted);
  const dayEl = TRONCO_EL[baziDay(oggi).tronco], eDayEl = ELEMENTI[dayEl];
  const L = useL() || {};

  // Only active habits shown in tracker
  const activeHabits = habitCfg.filter(h=>h.attiva!==false);

  // Recap stats (active only)
  const logged=activeHabits.filter(h=>{const v=log[h.id]; return h.modoSmettere ? !(+v>0) : (v!==undefined&&v!==""&&v!=="0"&&+v>0);}).length;
  const pctLogged=activeHabits.length>0?Math.round((logged/activeHabits.length)*100):0;

  function restoreHabit(habit) {
    const {deletedAt,...clean}=habit;
    setHabitCfg(prev=>[...prev,clean]);
    setHabitDeleted(prev=>prev.filter(h=>h.id!==habit.id));
  }

  function setVal(id,value) {
    setHabitLog(prev=>({...prev,[todayKey]:{...(prev[todayKey]||{}),[id]:value}}));
  }
  function getStreak(habit) {
    const isQuit = habit.modoSmettere;
    let streak=0;
    for(let i=0;i<30;i++){
      const key=new Date(oggi.getTime()-i*86400000).toDateString();
      const v=habitLog[key]?.[habit.id];
      const done = isQuit ? !(+v>0) : (v!==undefined&&v!==""&&v!=="0"&&+v>0);
      if(done)streak++;else break;
    }
    return streak;
  }
  const days7=Array.from({length:7},(_,i)=>{
    const d=new Date(oggi.getTime()-(6-i)*86400000);
    return{key:d.toDateString(),label:d.toLocaleDateString(i18n.language,{weekday:"short"}).slice(0,1).toUpperCase()};
  });

  return (
    <div style={{padding:"1rem",maxWidth:480,margin:"0 auto"}}>
      {/* Header row */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:16,fontWeight:600,color:"var(--text)"}}>{L.ui?.habit?.titolo || "📊 Habit Tracker"}</div>
        <DotsMenu render={close=>(
          <>
            <DotsItem label={L.ui?.habit?.impostazioni || "Impostazioni Habit"} onClick={()=>{setImpTab("habit");setView("impostazioni");close();}}/>
            <DotsItem label={`${L.ui?.habit?.eliminateRecente || "Eliminate di recente"}${recentDeleted.length>0?` (${recentDeleted.length})`:""}`} color="#e53e3e" onClick={()=>{setShowDeleted(true);close();}} sep/>
          </>
        )}/>
      </div>

      {/* Recap card — tappable for 14-day stats */}
      <div onClick={()=>setShowStats(s=>!s)} style={{background:"var(--accent-bg)",borderRadius:12,padding:"12px 14px",marginBottom:showStats?8:12,border:"0.5px solid var(--accent-border)",cursor:"pointer",userSelect:"none"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:11,color:"var(--text-sec)"}}>
            {oggi.toLocaleDateString(i18n.language,{weekday:"long",day:"numeric",month:"long"})}
            {" — "}{logged}/{activeHabits.length} {L.ui?.habit?.registratiLabel || "registrati"}
          </div>
          <div style={{fontSize:11,color:"var(--accent)",background:"var(--accent-18)",borderRadius:6,padding:"3px 7px",fontWeight:500}}>{pctLogged}%</div>
        </div>
        <div style={{marginTop:8,height:5,borderRadius:2.5,background:"var(--accent-22)",overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:2.5,background:"var(--accent)",width:`${pctLogged}%`,transition:"width 0.4s"}}/>
        </div>
        <div style={{fontSize:10,color:"var(--text-sub)",marginTop:4,textAlign:"right"}}>{L.ui?.routine?.storico || "tocca per lo storico"}</div>
      </div>
      {showStats && <HabitStats habitCfg={habitCfg} habitLog={habitLog} onClose={()=>setShowStats(false)} dark={dark}/>}

      {activeHabits.map(habit=>{
        const hc=habit.colore||"var(--accent)";
        const val=log[habit.id]??"", numVal=parseFloat(val)||0;
        const streak=getStreak(habit), hasVal=val!==""&&val!=="0"&&+val>0;
        const expanded=chartHabit===habit.id;
        return (
          <div key={habit.id} style={{padding:"8px 10px",background:hasVal?(dark?hc+"22":hc+"14"):"var(--bg-card)",border:`0.5px solid ${hasVal?hc+"55":"var(--border-ter)"}`,borderRadius:10,marginBottom:5}}>
            {/* Main row */}
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,cursor:"pointer"}} onClick={()=>setChartHabit(expanded?null:habit.id)}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:12,height:12,borderRadius:"50%",background:hc,flexShrink:0}}/>
                  <div style={{fontSize:13,fontWeight:500,color:"var(--text)"}}>{habit.label}</div>
                  {streak>1 && <div style={{fontSize:10,color:"#e07b39"}}>🔥 {streak}</div>}
                </div>
              </div>
              {/* +/- controls */}
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <button onClick={()=>setVal(habit.id,String(Math.max(0,Math.round((numVal-1)*100)/100)))} style={{width:28,height:28,borderRadius:7,border:"0.5px solid var(--border-sec)",background:"var(--bg-gray)",cursor:"pointer",fontSize:17,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:300,color:"var(--text-sec)"}}>−</button>
                <input type="number" min="0" step="0.1" value={val} onChange={e=>setVal(habit.id,e.target.value)} placeholder="0" style={{width:48,textAlign:"center",fontSize:13,fontWeight:500,padding:"4px 3px",borderRadius:7}}/>
                <button onClick={()=>setVal(habit.id,String(Math.round((numVal+1)*100)/100))} style={{width:28,height:28,borderRadius:7,border:"none",background:hasVal?hc:"var(--bg-gray2)",cursor:"pointer",fontSize:17,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:400,color:hasVal?"white":"var(--text)",transition:"background 0.15s"}}>+</button>
                {habit.unita && <span style={{fontSize:11,color:"var(--text-sub)",minWidth:18}}>{habit.unita}</span>}
              </div>
            </div>
            {/* 7-day strip */}
            <div style={{display:"flex",gap:3,marginTop:5}}>
              {days7.map(({key,label})=>{
                const v=habitLog[key]?.[habit.id], filled=v!==undefined&&v!==""&&v!=="0"&&+v>0;
                return (
                  <div key={key} style={{flex:1,textAlign:"center"}}>
                    <div style={{height:3,borderRadius:2,background:filled?hc:"var(--bg-gray2)",marginBottom:2}}/>
                    <div style={{fontSize:8,color:key===todayKey?hc:"var(--text-sub)",fontWeight:key===todayKey?700:400}}>{label}</div>
                  </div>
                );
              })}
            </div>
            {/* 30-day chart — expanded */}
            {expanded && <HabitChart habitId={habit.id} habitLog={habitLog}/>}
          </div>
        );
      })}

      {habitCfg.length===0 && (
        <div style={{fontSize:13,color:"var(--text-sec)",textAlign:"center",padding:"2rem 1rem",whiteSpace:"pre-line"}}>
          {L.ui?.habit?.nessunDefinito || "Nessun habit definito.\nAggiungili dalle Impostazioni (⋯ in alto)."}
        </div>
      )}

      {showDeleted && (
        <ModalBox onClose={()=>setShowDeleted(false)} dark={dark} zIndex={400}>
          <ModalHeader title={L.ui?.habit?.eliminati || "🗑 Habit eliminati di recente"} onClose={()=>setShowDeleted(false)}/>
          <div style={{fontSize:11,color:"var(--text-sub)",textAlign:"center",padding:"8px 10px",background:"var(--bg-wash)",borderRadius:8,marginBottom:10,border:"0.5px solid var(--border-ter)"}}>
            ⚠️ {L.ui?.routine?.conservati || "Conservati per 30 giorni, poi rimossi definitivamente"}
          </div>
          {recentDeleted.length===0
            ? <div style={{fontSize:13,color:"var(--text-sub)",textAlign:"center",padding:"1rem"}}>{L.ui?.habit?.nessunEliminato || "Nessun habit eliminato di recente."}</div>
            : recentDeleted.map(habit=>(
              <div key={habit.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--bg-card)",border:"0.5px solid var(--border-ter)",borderRadius:8,marginBottom:6}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:"var(--text)"}}>{habit.label}</div>
                  <div style={{fontSize:10,color:"var(--text-sub)"}}>{habit.unita||"—"} · {formatDaysAgo(habit.deletedAt)}</div>
                </div>
                <button onClick={()=>restoreHabit(habit)} style={{fontSize:11,padding:"4px 10px",background:"var(--accent)",color:"white",border:"none",borderRadius:6,cursor:"pointer"}}>{L.ui?.ripristina || "Ripristina"}</button>
              </div>
            ))
          }
        </ModalBox>
      )}
    </div>
  );
}

// ── To-Do List ────────────────────────────────────────────────────────────────
function TodoView({ todoLists, setTodoLists, todoDeleted, setTodoDeleted, dark }) {
  const [activeId,setActiveId]=useState(()=>todoLists[0]?.id??null);
  const [newListName,setNewListName]=useState(""), [showNewList,setShowNewList]=useState(false);
  const [newItemText,setNewItemText]=useState("");
  const [showDeleted,setShowDeleted]=useState(false);
  const list=todoLists.find(l=>l.id===activeId);
  const recentDeleted=cleanOld(todoDeleted);
  const L = useL() || {};

  function addList() {
    if(!newListName.trim())return;
    const id=Date.now().toString();
    setTodoLists(prev=>[...prev,{id,nome:newListName.trim(),items:[]}]);
    setActiveId(id); setNewListName(""); setShowNewList(false);
  }
  function deleteList(id) {
    const found=todoLists.find(l=>l.id===id);
    if(found) setTodoDeleted(prev=>[...cleanOld(prev),{...found,deletedAt:Date.now()}]);
    const r=todoLists.filter(l=>l.id!==id); setTodoLists(r);
    if(activeId===id)setActiveId(r[0]?.id??null);
  }
  function restoreList(lst) {
    const {deletedAt,...clean}=lst;
    setTodoLists(prev=>[...prev,clean]);
    setTodoDeleted(prev=>prev.filter(l=>l.id!==lst.id));
    setActiveId(clean.id);
  }
  function addItem() {
    if(!newItemText.trim()||!activeId)return;
    setTodoLists(prev=>prev.map(l=>l.id===activeId?{...l,items:[...l.items,{id:Date.now().toString(),testo:newItemText.trim(),fatto:false}]}:l));
    setNewItemText("");
  }
  function toggleItem(itemId) {
    setTodoLists(prev=>prev.map(l=>l.id===activeId?{...l,items:l.items.map(i=>i.id===itemId?{...i,fatto:!i.fatto}:i)}:l));
  }
  function deleteItem(itemId) {
    setTodoLists(prev=>prev.map(l=>l.id===activeId?{...l,items:l.items.filter(i=>i.id!==itemId)}:l));
  }
  const pending=list?.items.filter(i=>!i.fatto)??[], done=list?.items.filter(i=>i.fatto)??[];

  return (
    <div style={{padding:"1rem",maxWidth:480,margin:"0 auto"}}>
      {/* Header row */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:16,fontWeight:600,color:"var(--text)"}}>✅ To-Do</div>
        <DotsMenu render={close=>(
          <>
            {activeId && <DotsItem label={L.ui?.todo?.eliminaLista || "Elimina lista"} color="#e53e3e" onClick={()=>{deleteList(activeId);close();}}/>}
            <DotsItem label={`${L.ui?.todo?.eliminateRecente || "Eliminate di recente"}${recentDeleted.length>0?` (${recentDeleted.length})`:""}`} onClick={()=>{setShowDeleted(true);close();}} sep={!!activeId}/>
          </>
        )}/>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
        {todoLists.map(l=>(
          <div key={l.id} onClick={()=>setActiveId(l.id)} style={{padding:"5px 12px",borderRadius:16,fontSize:12,cursor:"pointer",background:activeId===l.id?"var(--accent)":"var(--bg-gray)",color:activeId===l.id?"white":"var(--text)"}}>
            {l.nome}
          </div>
        ))}
        {!showNewList
          ? <button onClick={()=>setShowNewList(true)} style={{padding:"5px 10px",fontSize:11,borderRadius:14,background:"transparent",color:"var(--accent)",border:"1px dashed #4a7c59"}}>{L.ui?.todo?.nuovaLista || "+ Nuova lista"}</button>
          : <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <input autoFocus value={newListName} onChange={e=>setNewListName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addList();if(e.key==="Escape")setShowNewList(false);}} placeholder={L.ui?.todo?.nomeLista || "Nome lista"} style={{fontSize:12,width:110}}/>
              <button onClick={addList} style={{fontSize:12,padding:"4px 8px"}}>OK</button>
              <button onClick={()=>setShowNewList(false)} style={{fontSize:12,padding:"4px 6px",background:"none",border:"none"}}>✕</button>
            </div>
        }
      </div>
      {list ? (
        <>
          <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:10}}>
            <div style={{fontSize:16,fontWeight:600,color:"var(--text)"}}>{list.nome}</div>
            {list.items.length>0 && <div style={{fontSize:11,color:"var(--text-sub)"}}>{done.length}/{list.items.length} completati</div>}
          </div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            <input value={newItemText} onChange={e=>setNewItemText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addItem()} placeholder={L.ui?.todo?.aggiungiElemento || "Aggiungi elemento…"} style={{flex:1,fontSize:13}}/>
            <button onClick={addItem} style={{padding:"6px 14px",fontWeight:600,background:"var(--accent)",color:"white",border:"none",borderRadius:6}}>+</button>
          </div>
          {pending.map(item=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--bg-card)",border:"0.5px solid var(--border-ter)",borderRadius:8,marginBottom:6}}>
              <div onClick={()=>toggleItem(item.id)} style={{width:20,height:20,borderRadius:4,cursor:"pointer",flexShrink:0,border:"2px solid var(--border)",background:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}/>
              <span style={{flex:1,fontSize:13,color:"var(--text)"}}>{item.testo}</span>
              <span onClick={()=>deleteItem(item.id)} style={{color:"var(--text-dim)",cursor:"pointer",fontSize:20,lineHeight:1,padding:"0 2px"}}>×</span>
            </div>
          ))}
          {done.length>0 && (
            <>
              <div style={{fontSize:10,color:"var(--text-sub)",textTransform:"uppercase",letterSpacing:1,marginTop:12,marginBottom:6}}>{L.ui?.todo?.completati || "Completati"}</div>
              {done.map(item=>(
                <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"transparent",border:"0.5px solid var(--border-ter)",borderRadius:8,marginBottom:4}}>
                  <div onClick={()=>toggleItem(item.id)} style={{width:20,height:20,borderRadius:4,cursor:"pointer",flexShrink:0,background:"var(--accent)",border:"2px solid #4a7c59",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{color:"white",fontSize:11,lineHeight:1}}>✓</span>
                  </div>
                  <span style={{flex:1,fontSize:13,color:"var(--text-sub)",textDecoration:"line-through"}}>{item.testo}</span>
                  <span onClick={()=>deleteItem(item.id)} style={{color:"var(--text-dim)",cursor:"pointer",fontSize:20,lineHeight:1,padding:"0 2px"}}>×</span>
                </div>
              ))}
            </>
          )}
          {list.items.length===0 && <div style={{fontSize:13,color:"var(--text-sub)",textAlign:"center",padding:"2rem"}}>{L.ui?.todo?.listaVuota || "Lista vuota — aggiungi il primo elemento!"}</div>}
        </>
      ) : (
        <div style={{fontSize:13,color:"var(--text-sub)",textAlign:"center",padding:"3rem 1rem"}}>{L.ui?.todo?.primaLista || "Crea la tua prima lista."}</div>
      )}

      {showDeleted && (
        <ModalBox onClose={()=>setShowDeleted(false)} dark={dark} zIndex={400}>
          <ModalHeader title={L.ui?.todo?.listeEliminate || "🗑 Liste eliminate di recente"} onClose={()=>setShowDeleted(false)}/>
          <div style={{fontSize:11,color:"var(--text-sub)",textAlign:"center",padding:"8px 10px",background:"var(--bg-wash)",borderRadius:8,marginBottom:10,border:"0.5px solid var(--border-ter)"}}>
            ⚠️ {L.ui?.todo?.conservate || "Conservate per 30 giorni, poi rimosse definitivamente"}
          </div>
          {recentDeleted.length===0
            ? <div style={{fontSize:13,color:"var(--text-sub)",textAlign:"center",padding:"1rem"}}>{L.ui?.todo?.nessunEliminato || "Nessuna lista eliminata di recente."}</div>
            : recentDeleted.map(lst=>(
              <div key={lst.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--bg-card)",border:"0.5px solid var(--border-ter)",borderRadius:8,marginBottom:6}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:"var(--text)"}}>{lst.nome}</div>
                  <div style={{fontSize:10,color:"var(--text-sub)"}}>{lst.items?.length||0} elementi · {formatDaysAgo(lst.deletedAt)}</div>
                </div>
                <button onClick={()=>restoreList(lst)} style={{fontSize:11,padding:"4px 10px",background:"var(--accent)",color:"white",border:"none",borderRadius:6,cursor:"pointer"}}>{L.ui?.ripristina || "Ripristina"}</button>
              </div>
            ))
          }
        </ModalBox>
      )}
    </div>
  );
}

// ── Touch + mouse drag-to-reorder list ───────────────────────────────────────
// renderItem(item, idx, dragHandle) — place dragHandle in the item's layout
function SortableList({ items, onReorder, renderItem }) {
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null); // keeps state in sync for window-level handlers
  const refs = useRef([]);
  refs.current = refs.current.slice(0, items.length);

  const getOverIdx = (y) => {
    let best = dragRef.current?.overIdx ?? 0;
    refs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) best = i;
    });
    return best;
  };

  const startDrag = (srcIdx) => {
    const s = { srcIdx, overIdx: srcIdx };
    dragRef.current = s;
    setDrag(s);
  };

  const moveDrag = (y) => {
    if (!dragRef.current) return;
    const overIdx = getOverIdx(y);
    if (overIdx !== dragRef.current.overIdx) {
      const s = { ...dragRef.current, overIdx };
      dragRef.current = s;
      setDrag(s);
    }
  };

  const endDrag = () => {
    if (!dragRef.current) return;
    const { srcIdx, overIdx } = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (srcIdx !== overIdx) {
      const next = [...items];
      const [item] = next.splice(srcIdx, 1);
      next.splice(overIdx, 0, item);
      onReorder(next);
    }
  };

  // Attach mouse move/up to window while dragging (works outside container)
  useEffect(() => {
    if (!drag) return;
    const mm = (e) => moveDrag(e.clientY);
    const mu = () => endDrag();
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    return () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', mu);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  const makeHandle = (i) => (
    <div
      onTouchStart={(e) => { e.preventDefault(); startDrag(i); }}
      onMouseDown={(e) => { e.preventDefault(); startDrag(i); }}
      style={{ touchAction:"none", cursor:"grab", padding:"4px 8px", fontSize:20, color:"var(--n400)", lineHeight:1, flexShrink:0, userSelect:"none" }}
    >⠿</div>
  );

  return (
    <div
      onTouchMove={(e) => moveDrag(e.touches[0].clientY)}
      onTouchEnd={endDrag}
      style={{userSelect:"none"}}
    >
      {items.map((item, i) => {
        const isDragging = drag?.srcIdx === i;
        const isOver = drag !== null && drag.overIdx === i && !isDragging;
        return (
          <div key={item.id} ref={el => refs.current[i] = el} style={{
            opacity: isDragging ? 0.35 : 1,
            borderTop: isOver && i <= drag.srcIdx ? "2px solid var(--accent)" : "none",
            borderBottom: isOver && i > drag.srcIdx ? "2px solid var(--accent)" : "none",
            transition: "opacity 0.12s",
          }}>
            {renderItem(item, i, makeHandle(i))}
          </div>
        );
      })}
    </div>
  );
}

// ── Onboarding ────────────────────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  { key:"intro",     icon:"☯️",  setup:false },
  { key:"home",      icon:"🏠",  setup:false },
  { key:"bazi",      icon:"☯️",  setup:false },
  { key:"luna",      icon:"🌙",  setup:false },
  { key:"utility",   icon:"🛠️", setup:false },
  { key:"posizione", icon:"📍",  setup:true  },
  { key:"nascita",   icon:"🎂",  setup:true  },
  { key:"lingua",    icon:"🌐",  setup:true  },
  { key:"tema",      icon:"🎨",  setup:true  },
];

function OnboardingModal({ cfg, setCfg, baziPersonal, setBaziPersonal, onClose, dark }) {
  const L = useL() || {};
  const uiO = L.ui?.onboarding || {};
  const passi = uiO.passi || {};
  const [step, setStep] = useState(0);
  const [birthDate, setBirthDate] = useState(baziPersonal?.data || "");
  const [birthHour, setBirthHour] = useState(baziPersonal?.ora || "12");
  const [localLat, setLocalLat] = useState(String(cfg.lat ?? 41.9));
  const [localLon, setLocalLon] = useState(String(cfg.lon ?? 12.5));
  const [detecting, setDetecting] = useState(false);
  const total = ONBOARDING_STEPS.length;
  const cur   = ONBOARDING_STEPS[step];

  function finish() {
    // Persist collected settings
    if (birthDate) setBaziPersonal(p => ({...p, data: birthDate, ora: birthHour}));
    const lat = parseFloat(localLat), lon = parseFloat(localLon);
    if (!isNaN(lat) && !isNaN(lon)) setCfg(c => ({...c, lat, lon}));
    setCfg(c => ({...c, onboardingDone: true}));
    onClose();
  }

  function detectPos() {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setLocalLat(pos.coords.latitude.toFixed(4)); setLocalLon(pos.coords.longitude.toFixed(4)); setDetecting(false); },
      ()  => setDetecting(false),
      { timeout: 8000 }
    );
  }

  const inputStyle = { width:"100%", fontSize:14, padding:"10px 12px", borderRadius:10,
    border:"0.5px solid var(--border-sec)", background:"var(--bg-card)", color:"var(--text)", boxSizing:"border-box" };
  const langBtnStyle = (active) => ({ flex:1, padding:"10px 4px", borderRadius:10, cursor:"pointer", textAlign:"center",
    background:active?"var(--accent)":dark?"var(--bg-gray)":"var(--bg-wash)",
    color:active?"white":"var(--text-sec)", border:`1px solid ${active?"var(--accent)":"var(--border-sec)"}`,
    fontSize:12, fontWeight:active?600:400, transition:"all 0.15s" });

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:dark?"#0d0d0d":"#ffffff",
      display:"flex",flexDirection:"column",overflowY:"auto"}}>

      {/* Progress bar */}
      <div style={{height:3,background:"var(--bg-gray)",flexShrink:0}}>
        <div style={{height:"100%",background:"var(--accent)",width:`${((step+1)/total)*100}%`,transition:"width 0.35s"}}/>
      </div>

      {/* Header with skip */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px",flexShrink:0}}>
        <div style={{fontSize:13,fontWeight:600,color:"var(--accent)"}}>
          {step+1} / {total}
        </div>
        <button onClick={finish} style={{fontSize:12,color:"var(--text-ter)",background:"none",border:"none",cursor:"pointer",padding:"4px 8px"}}>
          {uiO.salta || "Salta"}
        </button>
      </div>

      {/* Content */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        padding:"1rem 1.75rem",textAlign:"center",maxWidth:440,margin:"0 auto",width:"100%"}}>

        {/* Icon */}
        <div style={{fontSize:52,marginBottom:20,lineHeight:1}}>{cur.icon}</div>

        {/* Title + description */}
        <div style={{fontSize:20,fontWeight:700,marginBottom:10,color:"var(--text)",lineHeight:1.3}}>
          {passi[cur.key]?.titolo || cur.key}
        </div>
        <div style={{fontSize:14,color:"var(--text-sec)",lineHeight:1.7,marginBottom:24}}>
          {passi[cur.key]?.desc || ""}
        </div>

        {/* Setup controls */}
        {cur.key === "posizione" && (
          <div style={{width:"100%",display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:"var(--text-sec)",marginBottom:4,textAlign:"left"}}>{L.ui?.impostazioni?.latitudine||"Latitudine"}</div>
                <input type="number" value={localLat} onChange={e=>setLocalLat(e.target.value)} step="0.001" style={inputStyle}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:"var(--text-sec)",marginBottom:4,textAlign:"left"}}>{L.ui?.impostazioni?.longitudine||"Longitudine"}</div>
                <input type="number" value={localLon} onChange={e=>setLocalLon(e.target.value)} step="0.001" style={inputStyle}/>
              </div>
            </div>
            <button onClick={detectPos} disabled={detecting} style={{...inputStyle,
              background:"var(--accent)",color:"white",border:"none",cursor:"pointer",fontWeight:600,fontSize:13}}>
              {detecting ? "…" : `📡 ${L.ui?.impostazioni?.rilevaPosizione||"Rileva posizione"}`}
            </button>
          </div>
        )}

        {cur.key === "nascita" && (
          <div style={{width:"100%",display:"flex",flexDirection:"column",gap:10}}>
            <input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)} style={inputStyle}/>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:11,color:"var(--text-sec)",marginBottom:6}}>{L.ui?.bazi?.oraLabel||"Ora di nascita:"}</div>
              <ShichenPicker value={birthHour} onChange={setBirthHour} dark={dark}/>
            </div>
          </div>
        )}

        {cur.key === "lingua" && (
          <div style={{display:"flex",gap:8,width:"100%"}}>
            {[{k:"it",l:"🇮🇹 Italiano"},{k:"en",l:"🇬🇧 English"},{k:"es",l:"🇪🇸 Español"}].map(({k,l})=>(
              <div key={k} onClick={()=>i18n.changeLanguage(k)} style={langBtnStyle(i18n.language===k||i18n.language.startsWith(k))}>{l}</div>
            ))}
          </div>
        )}

        {cur.key === "tema" && (
          <div style={{display:"flex",gap:12,width:"100%"}}>
            {[{k:false,l:"☀️",label:"Light"},{k:true,l:"🌙",label:"Dark"}].map(({k,l,label})=>(
              <div key={String(k)} onClick={()=>setCfg(c=>({...c,darkMode:k}))}
                style={{flex:1,padding:"20px 8px",borderRadius:12,cursor:"pointer",textAlign:"center",
                  background:dark===k?"var(--accent)":dark?"var(--bg-gray)":"var(--bg-wash)",
                  color:dark===k?"white":"var(--text-sec)",
                  border:`1px solid ${dark===k?"var(--accent)":"var(--border-sec)"}`,transition:"all 0.2s"}}>
                <div style={{fontSize:28,marginBottom:4}}>{l}</div>
                <div style={{fontSize:12,fontWeight:dark===k?600:400}}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{padding:"12px 20px 8px",display:"flex",gap:10,flexShrink:0,maxWidth:440,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>
        {step > 0 && (
          <button onClick={()=>setStep(s=>s-1)} style={{padding:"13px 20px",borderRadius:12,border:"0.5px solid var(--border-sec)",
            background:"var(--bg-card)",color:"var(--text-sec)",cursor:"pointer",fontSize:13,fontWeight:500}}>
            {uiO.indietro||"←"}
          </button>
        )}
        <button onClick={()=>{ if(step===total-1){finish();}else setStep(s=>s+1); }}
          style={{flex:1,padding:"13px",borderRadius:12,background:"var(--accent)",color:"white",
            border:"none",cursor:"pointer",fontSize:15,fontWeight:700}}>
          {step===total-1 ? (uiO.fine||"Inizia →") : (uiO.avanti||"Avanti →")}
        </button>
      </div>

      {/* Dots */}
      <div style={{display:"flex",justifyContent:"center",gap:5,padding:"10px 0 20px",flexShrink:0}}>
        {ONBOARDING_STEPS.map((_,i)=>(
          <div key={i} onClick={()=>setStep(i)} style={{height:6,borderRadius:3,cursor:"pointer",
            width:i===step?22:6,
            background:i===step?"var(--accent)":i<step?"var(--accent-44)":"var(--border)",
            transition:"all 0.3s"}}/>
        ))}
      </div>
    </div>
  );
}

// ── Impostazioni ──────────────────────────────────────────────────────────────
function ImpostazioniView({ cfg, setCfg, routineCfg, setRoutineCfg, routineDeleted, setRoutineDeleted, habitCfg, setHabitCfg, habitDeleted, setHabitDeleted, todoDeleted, setTodoDeleted, defaultSection="generali", authUser, syncStatus, syncMsg, signInEmail, createAccount, signOutUser, signInAnon, signInWithGoogle, sendPasswordReset, updateUserEmail, events, promemoria, onOpenTour }) {
  const dark = cfg.darkMode || false;
  const [section, setSection] = useState(defaultSection);
  const [authMode, setAuthMode] = useState("login"); // login | register
  const [authEmail, setAuthEmail] = useState("");
  const [authPwd, setAuthPwd] = useState("");
  const [authPwd2, setAuthPwd2] = useState(""); // confirm password
  const [showPwd, setShowPwd] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [authMsg, setAuthMsg] = useState(""); // success message
  const [confirmReset, setConfirmReset] = useState(false);
  // Change email form
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPwd, setEmailPwd] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [newTask, setNewTask] = useState(""), [newTaskDur, setNewTaskDur] = useState(5), [newTaskTipo, setNewTaskTipo] = useState("tempo");
  const [newHabit, setNewHabit] = useState(""), [newHabitUnit, setNewHabitUnit] = useState(""), [newHabitColore, setNewHabitColore] = useState(HABIT_COLORS[0]);
  const [editingTask, setEditingTask] = useState(null), [editLabel, setEditLabel] = useState(""), [editDur, setEditDur] = useState(0), [editTipo, setEditTipo] = useState("tempo");
  const [editingHabit, setEditingHabit] = useState(null), [editHLabel, setEditHLabel] = useState(""), [editHUnit, setEditHUnit] = useState(""), [editHColore, setEditHColore] = useState(HABIT_COLORS[0]), [editHSmettere, setEditHSmettere] = useState(false);
  const [newHabitSmettere, setNewHabitSmettere] = useState(false);
  const [showRDel, setShowRDel] = useState(false), [showHDel, setShowHDel] = useState(false);
  const recentRDel = cleanOld(routineDeleted), recentHDel = cleanOld(habitDeleted);
  const recentTDel = cleanOld(todoDeleted||[]);
  const totalTrash = recentRDel.length + recentHDel.length + recentTDel.length;
  const L = useL() || {};

  // keep section in sync when navigating from DotsMenu
  useEffect(() => { setSection(defaultSection); }, [defaultSection]);

  function requestNotifPermission(enable) {
    if (!enable) { setCfg(c=>({...c,reminderEnabled:false})); return; }
    if (!("Notification" in window)) { alert("Notifiche non supportate su questo browser."); return; }
    Notification.requestPermission().then(perm => {
      if (perm==="granted") setCfg(c=>({...c,reminderEnabled:true}));
      else alert("Permesso notifiche negato. Abilitalo nelle impostazioni del browser.");
    });
  }

  const TipoToggle = ({value, onChange}) => (
    <div style={{display:"flex",borderRadius:6,overflow:"hidden",border:"0.5px solid var(--border-sec)",flexShrink:0}}>
      {[["tempo","⏱ min"],["rep","🔄 rip"]].map(([t,l])=>(
        <div key={t} onClick={()=>onChange(t)} style={{padding:"4px 8px",fontSize:10,cursor:"pointer",background:value===t?"var(--accent)":"transparent",color:value===t?"white":"var(--text-sub)",lineHeight:1.4}}>{l}</div>
      ))}
    </div>
  );

  const DeletedNote = () => (
    <div style={{fontSize:11,color:"var(--text-sub)",textAlign:"center",padding:"8px 10px",background:"var(--bg-wash)",borderRadius:8,marginBottom:10,border:"0.5px solid var(--border-ter)"}}>
      ⚠️ Gli elementi eliminati restano in memoria per <strong>30 giorni</strong>, poi vengono rimossi definitivamente.
    </div>
  );

  return (
    <div style={{padding:"1rem",maxWidth:480,margin:"0 auto"}}>
      <div style={{fontSize:16,fontWeight:500,marginBottom:12,color:"var(--text)",letterSpacing:"0.5px"}}>Impostazioni</div>
      <div style={{display:"flex",gap:3,marginBottom:18,flexWrap:"wrap"}}>
        {[{k:"generali",l:L.ui?.impostazioni?.generali||"Generali"},{k:"calendario",l:L.ui?.impostazioni?.calendario||"Calendario"},{k:"routine",l:L.ui?.impostazioni?.routineTab||"Routine"},{k:"habit",l:L.ui?.impostazioni?.habit||"Habit"},{k:"account",l:L.ui?.impostazioni?.account||"Account"}].map(t=>(
          <button key={t.k} onClick={()=>setSection(t.k)} style={{flex:1,minWidth:58,fontSize:10,padding:"7px 2px",background:section===t.k?"var(--accent)":"var(--bg-gray)",color:section===t.k?"white":"var(--text-sec)",border:"none",borderRadius:8,cursor:"pointer",fontWeight:section===t.k?600:400}}>{t.l}</button>
        ))}
      </div>

      {/* ── Generali ── */}
      {section==="generali" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Tema colore */}
          <div>
            <div style={{fontSize:12,color:"var(--text-sec)",marginBottom:8}}>{L.ui?.impostazioni?.temaColore || "Colore tema app"}</div>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
              {Object.entries(ELEMENTI).map(([k,e])=>(
                <div key={k} onClick={()=>setCfg(c=>({...c,accentColor:e.colore,followDayElement:false}))} style={{width:28,height:28,borderRadius:"50%",background:e.colore,cursor:"pointer",border:(cfg.accentColor===e.colore&&!cfg.followDayElement)?`3px solid ${dark?"#fff":"#111"}`:"2px solid transparent",flexShrink:0,transition:"border 0.1s"}}/>
              ))}
            </div>
            <Toggle label={L.ui?.impostazioni?.seguiElemento || "Segui elemento del giorno"} on={cfg.followDayElement||false} onChange={v=>setCfg(c=>({...c,followDayElement:v}))}/>
            {cfg.followDayElement && (()=>{
              const todayEl=TRONCO_EL[baziDay(new Date()).tronco];
              const e=ELEMENTI[todayEl];
              return (
                <div style={{marginTop:6,padding:"6px 10px",background:elbg(todayEl,dark),borderRadius:8,border:`0.5px solid ${e.colore}44`,display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:e.colore,flexShrink:0}}/>
                  <span style={{fontSize:11,color:dark?"rgba(255,255,255,0.85)":e.colore,fontWeight:500}}>
                    Oggi: {e.char} {e.nome} — <span style={{fontWeight:400,color:"var(--text-sec)"}}>{L.ui?.impostazioni?.seguiDescTheme || "il tema segue il pilastro del giorno"}</span>
                  </span>
                </div>
              );
            })()}
          </div>
          <div style={{borderTop:"0.5px solid var(--border-ter)"}}/>
          <Toggle label="🌙 Tema scuro" on={cfg.darkMode||false} onChange={v=>setCfg(c=>({...c,darkMode:v}))}/>
          <div style={{borderTop:"0.5px solid var(--border-ter)"}}/>
          {/* Selezione lingua */}
          <div>
            <div style={{fontSize:12,color:"var(--text-sec)",marginBottom:8}}>🌐 Lingua — Language — Idioma</div>
            <div style={{display:"flex",gap:8}}>
              {[{k:"it",l:"🇮🇹 Italiano"},{k:"en",l:"🇬🇧 English"},{k:"es",l:"🇪🇸 Español"}].map(({k,l})=>{
                const active = i18n.language === k || i18n.language.startsWith(k);
                return (
                  <div key={k} onClick={()=>i18n.changeLanguage(k)} style={{flex:1,padding:"8px 4px",borderRadius:8,cursor:"pointer",textAlign:"center",background:active?"var(--accent)":dark?"var(--bg-gray)":"var(--bg-wash)",color:active?"white":"var(--text-sec)",border:`1px solid ${active?"var(--accent)":"var(--border-sec)"}`,fontSize:11,fontWeight:active?600:400,transition:"all 0.15s"}}>{l}</div>
                );
              })}
            </div>
          </div>
          <div style={{borderTop:"0.5px solid var(--border-ter)"}}/>
          {/* Unità di misura */}
          <div>
            <div style={{fontSize:12,color:"var(--text-sec)",marginBottom:8}}>{L.ui?.impostazioni?.misura || "Unità di misura"}</div>
            <div style={{display:"flex",gap:16}}>
              <div>
                <div style={{fontSize:11,color:"var(--text-ter)",marginBottom:5}}>{L.ui?.impostazioni?.temperatura || "Temperatura"}</div>
                <div style={{display:"flex",gap:4}}>
                  {[{k:"C",l:"°C"},{k:"F",l:"°F"}].map(({k,l})=>{
                    const a=(cfg.tempUnit||"C")===k;
                    return <div key={k} onClick={()=>setCfg(c=>({...c,tempUnit:k}))} style={{padding:"5px 14px",borderRadius:8,cursor:"pointer",background:a?"var(--accent)":dark?"var(--bg-gray)":"var(--bg-wash)",color:a?"white":"var(--text-sec)",border:`1px solid ${a?"var(--accent)":"var(--border-sec)"}`,fontSize:12,fontWeight:a?600:400,transition:"all 0.15s"}}>{l}</div>;
                  })}
                </div>
              </div>
              <div>
                <div style={{fontSize:11,color:"var(--text-ter)",marginBottom:5}}>{L.ui?.impostazioni?.distanza || "Distanza"}</div>
                <div style={{display:"flex",gap:4}}>
                  {[{k:"km",l:"km"},{k:"mi",l:"mi"}].map(({k,l})=>{
                    const a=(cfg.distUnit||"km")===k;
                    return <div key={k} onClick={()=>setCfg(c=>({...c,distUnit:k}))} style={{padding:"5px 14px",borderRadius:8,cursor:"pointer",background:a?"var(--accent)":dark?"var(--bg-gray)":"var(--bg-wash)",color:a?"white":"var(--text-sec)",border:`1px solid ${a?"var(--accent)":"var(--border-sec)"}`,fontSize:12,fontWeight:a?600:400,transition:"all 0.15s"}}>{l}</div>;
                  })}
                </div>
              </div>
            </div>
          </div>
          <div style={{borderTop:"0.5px solid var(--border-ter)"}}/>
          {/* Tour dell'app */}
          <button onClick={onOpenTour} style={{width:"100%",padding:"11px",borderRadius:10,
            background:dark?"var(--bg-sec)":"var(--bg-wash)",color:"var(--text-sec)",
            border:"0.5px solid var(--border-sec)",cursor:"pointer",fontSize:13,fontWeight:500,textAlign:"center"}}>
            {L.ui?.impostazioni?.tourApp || "🗺️ Tour dell'app"}
          </button>
          <div style={{borderTop:"0.5px solid var(--border-ter)"}}/>
          {/* Posizione */}
          <div>
            <div style={{fontSize:12,color:"var(--text-sec)",marginBottom:8}}>{L.ui?.impostazioni?.posizioneLabel || "📍 Posizione (orari luna + Ba-Zi preciso)"}</div>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:"var(--text-ter)",marginBottom:3}}>Latitudine</div>
                <input type="number" step="0.1" min="-90" max="90"
                  value={cfg.lat??41.9} onChange={e=>setCfg(c=>({...c,lat:parseFloat(e.target.value)||41.9}))}
                  style={{width:"100%",fontSize:12}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:"var(--text-ter)",marginBottom:3}}>Longitudine</div>
                <input type="number" step="0.1" min="-180" max="180"
                  value={cfg.lon??12.5} onChange={e=>setCfg(c=>({...c,lon:parseFloat(e.target.value)||12.5}))}
                  style={{width:"100%",fontSize:12}}/>
              </div>
            </div>
            <button onClick={()=>{
              if(!("geolocation" in navigator)) return alert("GPS non disponibile");
              navigator.geolocation.getCurrentPosition(
                pos=>setCfg(c=>({...c,lat:Math.round(pos.coords.latitude*10)/10,lon:Math.round(pos.coords.longitude*10)/10})),
                ()=>alert("Impossibile ottenere la posizione GPS")
              );
            }} style={{width:"100%",fontSize:11,padding:"7px",background:"var(--bg-sec)",border:"0.5px solid var(--border-sec)",borderRadius:6,cursor:"pointer",color:"var(--text-sec)"}}>
              📡 Usa posizione GPS
            </button>
          </div>
        </div>
      )}

      {section==="calendario" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Tronchi Celesti */}
          <div>
            <Toggle label="Mostra 10 Tronchi Celesti (天干)" on={cfg.showTronco!==false} onChange={v=>setCfg(c=>({...c,showTronco:v}))}/>
            {cfg.showTronco!==false && (
              <div style={{display:"flex",gap:4,marginTop:8,paddingLeft:8}}>
                {[{k:"chars",l:"甲子 Segni"},{k:"nomi",l:"Abc Nomi"},{k:"emoji",l:"🌳 Emoji"}].map(({k,l})=>{
                  const active=(cfg.troncoMode||"chars")===k;
                  return <div key={k} onClick={()=>setCfg(c=>({...c,troncoMode:k}))} style={{flex:1,textAlign:"center",padding:"7px 4px",borderRadius:8,cursor:"pointer",background:active?"var(--accent)":dark?"var(--bg-gray)":"var(--bg-wash)",color:active?"white":"var(--text-sec)",border:`1px solid ${active?"var(--accent)":"var(--border-sec)"}`,fontSize:11,fontWeight:active?600:400,transition:"all 0.15s"}}>{l}</div>;
                })}
              </div>
            )}
          </div>
          <div style={{borderTop:"0.5px solid var(--border-ter)"}}/>
          {/* Rami Terrestri */}
          <div>
            <Toggle label="Mostra 12 Rami Terrestri (地支)" on={cfg.showRamo!==false} onChange={v=>setCfg(c=>({...c,showRamo:v}))}/>
            {cfg.showRamo!==false && (
              <div style={{display:"flex",gap:4,marginTop:8,paddingLeft:8}}>
                {[{k:"emoji",l:"🐉 Emoji"},{k:"nomi",l:"Abc Nomi"},{k:"chars",l:"子丑 Segni"}].map(({k,l})=>{
                  const active=(cfg.ramoMode||"nomi")===k;
                  return <div key={k} onClick={()=>setCfg(c=>({...c,ramoMode:k}))} style={{flex:1,textAlign:"center",padding:"7px 4px",borderRadius:8,cursor:"pointer",background:active?"var(--accent)":dark?"var(--bg-gray)":"var(--bg-wash)",color:active?"white":"var(--text-sec)",border:`1px solid ${active?"var(--accent)":"var(--border-sec)"}`,fontSize:11,fontWeight:active?600:400,transition:"all 0.15s"}}>{l}</div>;
                })}
              </div>
            )}
          </div>
          <div style={{borderTop:"0.5px solid var(--border-ter)"}}/>
          <Toggle label="Data gregoriana"            on={cfg.showGreg}    onChange={v=>setCfg(c=>({...c,showGreg:v}))}/>
          <div style={{borderTop:"0.5px solid var(--border-ter)"}}/>
          <Toggle label="Segno zodiacale della Luna" on={cfg.showLunaZod} onChange={v=>setCfg(c=>({...c,showLunaZod:v}))}/>
          <div style={{borderTop:"0.5px solid var(--border-ter)"}}/>
          <Toggle label="Ekadashi"                   on={cfg.showEk}      onChange={v=>setCfg(c=>({...c,showEk:v}))}/>
          {cfg.showEk && (
            <div style={{paddingLeft:14,borderLeft:"2px solid var(--border-sec)"}}>
              <Toggle label="🔔 Notifica il giorno prima" on={cfg.ekNotif||false} onChange={v=>{
                if (v && !cfg.reminderEnabled) requestNotifPermission(true);
                setCfg(c=>({...c,ekNotif:v}));
              }}/>
            </div>
          )}
          <div style={{borderTop:"0.5px solid var(--border-ter)"}}/>
          <Toggle label={L.ui?.impostazioni?.proRutina || "🔔 Promemoria routine"} on={cfg.reminderEnabled||false} onChange={requestNotifPermission}/>
          {cfg.reminderEnabled && (
            <div style={{display:"flex",alignItems:"center",gap:10,paddingLeft:4}}>
              <span style={{fontSize:12,color:"var(--text-sec)"}}>{L.ui?.impostazioni?.orario || "Orario"}</span>
              <input type="time" value={cfg.reminderTime||"07:00"} onChange={e=>setCfg(c=>({...c,reminderTime:e.target.value}))} style={{fontSize:13,width:110,flex:"none"}}/>
              <span style={{fontSize:11,color:"var(--text-sub)"}}>{L.ui?.impostazioni?.ogniGiorno || "ogni giorno"}</span>
            </div>
          )}
          <div style={{borderTop:"0.5px solid var(--border-ter)"}}/>
          {/* Svuota cestini */}
          <div style={{paddingTop:2}}>
            <div style={{fontSize:12,color:"var(--text-sec)",marginBottom:8}}>{L.ui?.impostazioni?.cestini || "Cestini eliminati"}</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:totalTrash>0?(dark?"#2a0a0a":"#fff5f5"):"var(--bg-card)",borderRadius:10,border:`0.5px solid ${totalTrash>0?"#e53e3e33":"var(--border-ter)"}`}}>
              <div>
                <div style={{fontSize:13,color:totalTrash>0?"#e53e3e":"var(--text-sub)",fontWeight:500}}>
                  {totalTrash>0 ? `${totalTrash} element${totalTrash===1?"o":"i"} nel cestino` : (L.ui?.impostazioni?.cestiniVuoti || "Cestini vuoti")}
                </div>
                <div style={{fontSize:10,color:"var(--text-ter)",marginTop:2}}>
                  Routine: {recentRDel.length} · Habit: {recentHDel.length} · To-Do: {recentTDel.length}
                </div>
              </div>
              {totalTrash>0 && (
                <button onClick={()=>{if(window.confirm(i18n.t("ui.impostazioni.confermaEliminazione",{n:totalTrash}))){setRoutineDeleted([]);setHabitDeleted([]);setTodoDeleted([]);}}} style={{fontSize:11,padding:"5px 12px",background:"#e53e3e",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:500,flexShrink:0}}>
                  {L.ui?.impostazioni?.svuota || "🗑 Svuota"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {section==="routine" && (
        <div>
          <div style={{fontSize:12,color:"var(--text-sec)",marginBottom:12}}>{L.ui?.impostazioni?.gestioneRoutine || "Gestisci i task della Morning Routine. Tieni ≡ per riordinare."}</div>
          <SortableList items={routineCfg} onReorder={setRoutineCfg} renderItem={(task, _i, dragHandle) => {
            const tipo = task.tipo||"tempo";
            if (editingTask === task.id) return (
              <div style={{padding:"10px 12px",background:"var(--accent-bg)",border:"0.5px solid var(--accent-border)",borderRadius:8,marginBottom:5}}>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:8}}>
                  <input autoFocus value={editLabel} onChange={e=>setEditLabel(e.target.value)} style={{flex:1,minWidth:100,fontSize:12}}/>
                  <input type="number" value={editDur} onChange={e=>setEditDur(+e.target.value)} min={0} style={{width:52,fontSize:12}}/>
                  <TipoToggle value={editTipo} onChange={setEditTipo}/>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>{setRoutineCfg(prev=>prev.map(t=>t.id===task.id?{...t,label:editLabel.trim()||t.label,durata:editDur,tipo:editTipo}:t));setEditingTask(null);}} style={{flex:1,fontSize:12,padding:"6px",background:"var(--accent)",color:"white",border:"none",borderRadius:6,cursor:"pointer"}}>{"✓ " + (L.ui?.salva || "Salva")}</button>
                  <button onClick={()=>setEditingTask(null)} style={{fontSize:12,padding:"6px 10px",background:"none",border:"0.5px solid var(--border-sec)",borderRadius:6,cursor:"pointer",color:"var(--text-sec)"}}>✕</button>
                </div>
              </div>
            );
            return (
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",background:"var(--bg-card)",border:"0.5px solid var(--border-ter)",borderRadius:8,marginBottom:5}}>
                {dragHandle}
                <div onClick={()=>setRoutineCfg(prev=>prev.map(t=>t.id===task.id?{...t,attiva:!t.attiva}:t))}
                     style={{width:18,height:18,borderRadius:"50%",cursor:"pointer",flexShrink:0,background:task.attiva?"var(--accent)":"transparent",border:`2px solid ${task.attiva?"var(--accent)":"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {task.attiva && <span style={{color:"white",fontSize:10,lineHeight:1}}>✓</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:500,color:task.attiva?"var(--text)":"var(--text-sub)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.label}</div>
                  <div style={{fontSize:9,color:"var(--text-sub)"}}>{task.durata} {tipo==="rep"?"rip.":"min"}</div>
                </div>
                <button onClick={()=>{setEditingTask(task.id);setEditLabel(task.label);setEditDur(task.durata);setEditTipo(tipo);}} style={{background:"none",border:"none",cursor:"pointer",padding:"2px",lineHeight:1,display:"flex",alignItems:"center"}}><IconEdit size={15}/></button>
                <button onClick={()=>{setRoutineDeleted(prev=>[...cleanOld(prev),{...task,deletedAt:Date.now()}]);setRoutineCfg(prev=>prev.filter(t=>t.id!==task.id));}} style={{background:"none",border:"none",color:"var(--text-dim)",fontSize:18,cursor:"pointer",padding:"0 1px",lineHeight:1}}>×</button>
              </div>
            );
          }}/>
          {/* Add task form */}
          <div style={{marginTop:12,padding:"10px 12px",background:"var(--accent-bg)",borderRadius:8,border:"0.5px solid var(--accent-border)"}}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--accent)",marginBottom:8}}>{L.ui?.impostazioni?.aggiungiTask || "+ Aggiungi task"}</div>
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&document.getElementById("btn-add-task")?.click()} placeholder={L.ui?.impostazioni?.nomeTask || "Nome task"} style={{flex:1,minWidth:100,fontSize:12}}/>
              <input type="number" value={newTaskDur} onChange={e=>setNewTaskDur(+e.target.value)} min={0} style={{width:52,fontSize:12}}/>
              <TipoToggle value={newTaskTipo} onChange={setNewTaskTipo}/>
              <button id="btn-add-task" onClick={()=>{if(!newTask.trim())return;setRoutineCfg(prev=>[...prev,{id:Date.now().toString(),label:newTask.trim(),durata:newTaskDur,tipo:newTaskTipo,attiva:true}]);setNewTask("");setNewTaskDur(5);setNewTaskTipo("tempo");}} style={{padding:"5px 12px",fontSize:12,background:"var(--accent)",color:"white",border:"none",borderRadius:6,cursor:"pointer"}}>OK</button>
            </div>
          </div>
          {/* Link to recently deleted */}
          <div style={{marginTop:14,paddingTop:12,borderTop:"0.5px solid var(--border-ter)",textAlign:"center"}}>
            <button onClick={()=>setShowRDel(true)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#e53e3e",padding:"4px 8px"}}>
              {L.ui?.impostazioni?.eliminateRecente || "🗑 Eliminate di recente"}{recentRDel.length>0?` (${recentRDel.length})`:""}
            </button>
          </div>
        </div>
      )}

      {section==="habit" && (
        <div>
          <div style={{fontSize:12,color:"var(--text-sec)",marginBottom:12}}>{L.ui?.impostazioni?.gestioneHabit || "Definisci i tuoi habit. Tieni ≡ per riordinare, icona matita per modificare o cambiare tipo."}</div>
          <SortableList items={habitCfg} onReorder={setHabitCfg} renderItem={(habit, _i, dragHandle) => {
            const hc = habit.colore||HABIT_COLORS[0];
            if (editingHabit === habit.id) return (
              <div style={{padding:"10px 12px",background:"var(--accent-bg)",border:"0.5px solid var(--accent-border)",borderRadius:8,marginBottom:5}}>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:8}}>
                  <input autoFocus value={editHLabel} onChange={e=>setEditHLabel(e.target.value)} placeholder={L.ui?.impostazioni?.nomeEdit || "Nome"} style={{flex:1,minWidth:100,fontSize:12}}/>
                  <input value={editHUnit} onChange={e=>setEditHUnit(e.target.value)} placeholder={L.ui?.impostazioni?.unitaEdit || "Unità"} style={{width:64,fontSize:12}}/>
                </div>
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  {HABIT_COLORS.map(c=>(<div key={c} onClick={()=>setEditHColore(c)} style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",border:editHColore===c?`3px solid ${dark?"#fff":"#111"}`:"2px solid transparent",flexShrink:0}}/>))}
                </div>
                <div style={{display:"flex",gap:4,marginBottom:10}}>
                  {[{k:false,ico:<IconCost size={18}/>,l:L.ui?.impostazioni?.costruire||"Costruire",desc:L.ui?.impostazioni?.streakCon||"streak = giorni con"},{k:true,ico:<IconSmett size={18}/>,l:L.ui?.impostazioni?.smettere||"Smettere",desc:L.ui?.impostazioni?.streakSenza||"streak = giorni senza"}].map(({k,ico,l,desc})=>(
                    <div key={String(k)} onClick={()=>setEditHSmettere(k)} style={{
                      flex:1,textAlign:"center",padding:"8px 4px",borderRadius:8,cursor:"pointer",
                      background:editHSmettere===k?(k?"#e53e3e22":"var(--accent-bg)"):"transparent",
                      border:editHSmettere===k?`1.5px solid ${k?"#e53e3e":"var(--accent)"}`:"1px solid var(--border-sec)",
                      color:editHSmettere===k?(k?"#e53e3e":"var(--accent)"):"var(--text-sub)"
                    }}>
                      <div style={{fontSize:16,lineHeight:1.2}}>{ico}</div>
                      <div style={{fontSize:10,fontWeight:editHSmettere===k?600:400,marginTop:1}}>{l}</div>
                      <div style={{fontSize:8,opacity:0.7}}>{desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>{setHabitCfg(prev=>prev.map(h=>h.id===habit.id?{...h,label:editHLabel.trim()||h.label,unita:editHUnit.trim(),colore:editHColore,modoSmettere:editHSmettere}:h));setEditingHabit(null);}} style={{flex:1,fontSize:12,padding:"6px",background:"var(--accent)",color:"white",border:"none",borderRadius:6,cursor:"pointer"}}>{"✓ " + (L.ui?.salva || "Salva")}</button>
                  <button onClick={()=>setEditingHabit(null)} style={{fontSize:12,padding:"6px 10px",background:"none",border:"0.5px solid var(--border-sec)",borderRadius:6,cursor:"pointer",color:"var(--text-sec)"}}>✕</button>
                </div>
              </div>
            );
            return (
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",background:"var(--bg-card)",border:"0.5px solid var(--border-ter)",borderRadius:8,marginBottom:5}}>
                {dragHandle}
                <div onClick={()=>setHabitCfg(prev=>prev.map(h=>h.id===habit.id?{...h,attiva:!(h.attiva!==false)}:h))}
                     style={{width:18,height:18,borderRadius:"50%",cursor:"pointer",flexShrink:0,background:habit.attiva!==false?hc:"transparent",border:`2px solid ${habit.attiva!==false?hc:"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {habit.attiva!==false && <span style={{color:"white",fontSize:10,lineHeight:1}}>✓</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:500,color:habit.attiva!==false?"var(--text)":"var(--text-sub)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{habit.label}</div>
                  <div style={{fontSize:9,color:"var(--text-sub)"}}>{habit.unita||"—"}</div>
                </div>
                <div style={{width:8,height:8,borderRadius:"50%",background:hc,flexShrink:0}}/>
                {/* Indicatore tipo — solo icona, nessun testo */}
                <span style={{fontSize:15,flexShrink:0,opacity:0.65}} title={habit.modoSmettere?"Smettere (streak=giorni senza)":"Costruire (streak=giorni con)"}>
                  {habit.modoSmettere?<IconSmett size={16}/>:<IconCost size={16}/>}
                </span>
                <button onClick={()=>{setEditingHabit(habit.id);setEditHLabel(habit.label);setEditHUnit(habit.unita||"");setEditHColore(hc);setEditHSmettere(habit.modoSmettere||false);}} style={{background:"none",border:"none",cursor:"pointer",padding:"2px",lineHeight:1,display:"flex",alignItems:"center"}}><IconEdit size={15}/></button>
                <button onClick={()=>{setHabitDeleted(prev=>[...cleanOld(prev),{...habit,deletedAt:Date.now()}]);setHabitCfg(prev=>prev.filter(h=>h.id!==habit.id));}} style={{background:"none",border:"none",color:"var(--text-dim)",fontSize:18,cursor:"pointer",padding:"0 1px",lineHeight:1}}>×</button>
              </div>
            );
          }}/>
          <div style={{marginTop:12,padding:"10px 12px",background:"var(--accent-bg)",borderRadius:8,border:"0.5px solid var(--accent-border)"}}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--accent)",marginBottom:8}}>{L.ui?.impostazioni?.aggiungiHabit || "+ Aggiungi habit"}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              <input value={newHabit} onChange={e=>setNewHabit(e.target.value)} placeholder={L.ui?.impostazioni?.nomeHabit || "Nome (es. Acqua)"} style={{flex:1,minWidth:100,fontSize:12}}/>
              <input value={newHabitUnit} onChange={e=>setNewHabitUnit(e.target.value)} placeholder={L.ui?.impostazioni?.unitaHabit || "Unità (l, h, min…)"} style={{flex:1,minWidth:80,fontSize:12}}/>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8}}>
              {HABIT_COLORS.map(c=>(
                <div key={c} onClick={()=>setNewHabitColore(c)} style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",border:newHabitColore===c?`3px solid ${dark?"#fff":"#111"}`:"2px solid transparent",flexShrink:0,transition:"border 0.1s"}}/>
              ))}
            </div>
            {/* Tipo: costruire vs eliminare */}
            <div style={{display:"flex",gap:4,marginBottom:10}}>
              {[{k:false,ico:<IconCost size={16}/>,l:L.ui?.impostazioni?.costruire||"Costruire"},{k:true,ico:<IconSmett size={16}/>,l:L.ui?.impostazioni?.smettere||"Smettere"}].map(({k,ico,l})=>(
                <div key={String(k)} onClick={()=>setNewHabitSmettere(k)} style={{
                  flex:1,textAlign:"center",padding:"7px 4px",borderRadius:8,cursor:"pointer",
                  background:newHabitSmettere===k?(k?"#e53e3e22":"var(--accent-bg)"):"transparent",
                  border:newHabitSmettere===k?`1.5px solid ${k?"#e53e3e":"var(--accent)"}`:"1px solid var(--border-sec)",
                  color:newHabitSmettere===k?(k?"#e53e3e":"var(--accent)"):"var(--text-sub)",fontSize:11,fontWeight:newHabitSmettere===k?600:400
                }}>
                  <span style={{fontSize:16,display:"block",marginBottom:2}}>{ico}</span>{l}
                </div>
              ))}
            </div>
            <button onClick={()=>{if(!newHabit.trim())return;setHabitCfg(prev=>[...prev,{id:Date.now().toString(),label:newHabit.trim(),tipo:"numero",unita:newHabitUnit.trim(),attiva:true,colore:newHabitColore,modoSmettere:newHabitSmettere}]);setNewHabit("");setNewHabitUnit("");setNewHabitColore(HABIT_COLORS[0]);setNewHabitSmettere(false);}} style={{width:"100%",padding:"5px 12px",fontSize:12,background:"var(--accent)",color:"white",border:"none",borderRadius:6,cursor:"pointer"}}>OK</button>
          </div>
          {/* Link to recently deleted */}
          <div style={{marginTop:14,paddingTop:12,borderTop:"0.5px solid var(--border-ter)",textAlign:"center"}}>
            <button onClick={()=>setShowHDel(true)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#e53e3e",padding:"4px 8px"}}>
              {L.ui?.impostazioni?.eliminateRecente || "🗑 Eliminate di recente"}{recentHDel.length>0?` (${recentHDel.length})`:""}
            </button>
          </div>
        </div>
      )}

      {/* ── Account ── */}
      {section==="account" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>

          {/* Step 1: scegli modalità storage se non ancora scelto */}
          {cfg.cloudMode === null || cfg.cloudMode === undefined ? (
            <>
              <div style={{fontSize:13,color:"var(--text-sec)",lineHeight:1.6,padding:"4px 0"}}>
                Dove vuoi salvare i tuoi dati?
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div onClick={()=>setCfg(c=>({...c,cloudMode:"cloud"}))} style={{padding:"16px 12px",background:"var(--bg-card)",borderRadius:12,border:"1px solid var(--border-sec)",cursor:"pointer",textAlign:"center",transition:"border-color 0.15s"}}>
                  <div style={{fontSize:24,marginBottom:6}}>☁️</div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:4}}>Sul cloud</div>
                  <div style={{fontSize:11,color:"var(--text-sec)",lineHeight:1.5}}>Sincronizza tra dispositivi. Richiede un account.</div>
                </div>
                <div onClick={()=>setCfg(c=>({...c,cloudMode:"local"}))} style={{padding:"16px 12px",background:"var(--bg-card)",borderRadius:12,border:"1px solid var(--border-sec)",cursor:"pointer",textAlign:"center",transition:"border-color 0.15s"}}>
                  <div style={{fontSize:24,marginBottom:6}}>📱</div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:4}}>Solo locale</div>
                  <div style={{fontSize:11,color:"var(--text-sec)",lineHeight:1.5}}>Dati solo su questo dispositivo. Nessun account.</div>
                </div>
              </div>
            </>
          ) : cfg.cloudMode === "local" ? (
            <>
              <div style={{padding:"14px 16px",background:"var(--bg-card)",borderRadius:12,border:"0.5px solid var(--border-sec)",textAlign:"center"}}>
                <div style={{fontSize:20,marginBottom:6}}>📱</div>
                <div style={{fontSize:13,fontWeight:500,color:"var(--text)",marginBottom:4}}>Dati locali</div>
                <div style={{fontSize:11,color:"var(--text-sec)",lineHeight:1.6}}>I tuoi dati sono salvati solo su questo dispositivo.</div>
              </div>
              <button onClick={()=>setCfg(c=>({...c,cloudMode:null}))} style={{padding:"10px",fontSize:12,background:"var(--bg-sec)",color:"var(--text-sec)",border:"0.5px solid var(--border-sec)",borderRadius:8,cursor:"pointer"}}>
                Cambia modalità storage
              </button>
            </>
          ) : (
            /* cloudMode === "cloud" */
            <>
              {authUser ? (
                /* Loggato */
                <>
                  <div style={{padding:"14px 16px",background:"var(--accent-bg)",borderRadius:12,border:"0.5px solid var(--accent-border)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
                      <div style={{width:36,height:36,borderRadius:"50%",background:"var(--accent)",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:600,flexShrink:0}}>
                        {authUser.email ? authUser.email[0].toUpperCase() : "👤"}
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:"var(--text)"}}>{authUser.email || "Utente anonimo"}</div>
                      </div>
                    </div>
                    {/* Sync status with detail message */}
                    <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 8px",background:"var(--bg-wash)",borderRadius:6}}>
                      <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:syncStatus==="synced"?"#4a7c59":syncStatus==="syncing"?"#f59e0b":syncStatus==="error"?"#e53e3e":"#9a9690"}}/>
                      <span style={{fontSize:11,color:"var(--text-sec)",flex:1}}>
                        {syncMsg || (syncStatus==="synced"?"Sincronizzato":syncStatus==="syncing"?"In corso…":syncStatus==="error"?"Errore di connessione":"Offline")}
                      </span>
                    </div>
                  </div>

                  {/* Reset password — con conferma */}
                  {authUser.email && (
                    !confirmReset ? (
                      <button onClick={()=>setConfirmReset(true)} style={{padding:"10px",fontSize:13,background:"var(--bg-card)",color:"var(--text)",border:"0.5px solid var(--border-sec)",borderRadius:8,cursor:"pointer",textAlign:"left"}}>
                        Reimposta password (via email)
                      </button>
                    ) : (
                      <div style={{padding:"12px",background:"var(--bg-wash)",borderRadius:8,border:"0.5px solid var(--border-sec)"}}>
                        <div style={{fontSize:12,color:"var(--text-sec)",marginBottom:8,lineHeight:1.5}}>
                          Invieremo un'email di reset a <strong>{authUser.email}</strong>. Continuare?
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={()=>setConfirmReset(false)} style={{flex:1,padding:"7px",fontSize:12,background:"var(--bg-sec)",color:"var(--text-sec)",border:"0.5px solid var(--border-sec)",borderRadius:6,cursor:"pointer"}}>Annulla</button>
                          <button onClick={async()=>{
                            try { await sendPasswordReset(authUser.email); setAuthMsg("Email inviata!"); }
                            catch(e) { setAuthErr(e.message||"Errore"); }
                            setConfirmReset(false);
                          }} style={{flex:1,padding:"7px",fontSize:12,background:"var(--accent)",color:"white",border:"none",borderRadius:6,cursor:"pointer",fontWeight:500}}>Conferma</button>
                        </div>
                      </div>
                    )
                  )}

                  {/* Change email */}
                  {authUser.email && (
                    <div>
                      <button onClick={()=>{setChangeEmailOpen(s=>!s);setEmailErr("");setEmailMsg("");}} style={{padding:"10px",fontSize:13,background:"var(--bg-card)",color:"var(--text)",border:"0.5px solid var(--border-sec)",borderRadius:8,cursor:"pointer",width:"100%",textAlign:"left"}}>
                        ✉️ Cambia email {changeEmailOpen?"▲":"▼"}
                      </button>
                      {changeEmailOpen && (
                        <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:8}}>
                          <input type="email" value={newEmail} onChange={e=>{setNewEmail(e.target.value);setEmailErr("");}} placeholder="Nuova email" style={{fontSize:13}}/>
                          <div style={{position:"relative"}}>
                            <input type={showPwd?"text":"password"} value={emailPwd} onChange={e=>{setEmailPwd(e.target.value);setEmailErr("");}} placeholder="Password attuale (per conferma)" style={{fontSize:13,width:"100%",boxSizing:"border-box",paddingRight:36}}/>
                            <button onClick={()=>setShowPwd(s=>!s)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"var(--text-sec)",padding:0,lineHeight:1}}>{showPwd?"🙈":"👁"}</button>
                          </div>
                          {emailErr && <div style={{fontSize:11,color:"#e53e3e"}}>{emailErr}</div>}
                          {emailMsg && <div style={{fontSize:11,color:"#4a7c59"}}>{emailMsg}</div>}
                          <button onClick={async()=>{
                            setEmailErr(""); setEmailMsg("");
                            if (!newEmail.trim()) { setEmailErr("Inserisci la nuova email"); return; }
                            if (!emailPwd) { setEmailErr("Inserisci la password attuale"); return; }
                            try {
                              await updateUserEmail(newEmail.trim(), emailPwd);
                              setEmailMsg("Email aggiornata!"); setChangeEmailOpen(false);
                            } catch(e) {
                              setEmailErr(e.code==="auth/wrong-password"?"Password errata":e.code==="auth/email-already-in-use"?"Email già in uso":e.message||"Errore");
                            }
                          }} style={{padding:"9px",fontSize:13,background:"var(--accent)",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:500}}>
                            Aggiorna email
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {authMsg && <div style={{fontSize:11,color:"#4a7c59",padding:"4px 8px",background:"#f0faf3",borderRadius:6,border:"0.5px solid #4a7c5933"}}>{authMsg}</div>}
                  {authErr && <div style={{fontSize:11,color:"#e53e3e",padding:"4px 8px"}}>{authErr}</div>}

                  <button onClick={()=>{signOutUser();setAuthMsg("");setAuthErr("");}} style={{padding:"10px",fontSize:13,background:"var(--bg-sec)",color:"#e53e3e",border:"0.5px solid #e53e3e44",borderRadius:8,cursor:"pointer"}}>
                    Esci dall'account
                  </button>
                  <button onClick={()=>setCfg(c=>({...c,cloudMode:null}))} style={{padding:"8px",fontSize:11,background:"none",color:"var(--text-ter)",border:"none",cursor:"pointer"}}>
                    Cambia modalità storage
                  </button>
                </>
              ) : (
                /* Non loggato — form login/registrazione */
                <>
                  <div style={{padding:"12px 14px",background:"var(--bg-card)",borderRadius:10,border:"0.5px solid var(--border-sec)"}}>
                    <div style={{fontSize:12,color:"var(--text-sec)",lineHeight:1.6}}>
                      ☁️ Accedi o registrati per sincronizzare i dati tra dispositivi.
                    </div>
                  </div>
                  <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:"0.5px solid var(--border-sec)"}}>
                    {[{k:"login",l:"Accedi"},{k:"register",l:"Registrati"}].map(({k,l})=>(
                      <div key={k} onClick={()=>{setAuthMode(k);setAuthErr("");setAuthMsg("");}} style={{flex:1,textAlign:"center",padding:"8px",cursor:"pointer",background:authMode===k?"var(--accent)":"transparent",color:authMode===k?"white":"var(--text-sec)",fontSize:12,fontWeight:authMode===k?600:400}}>{l}</div>
                    ))}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <input type="email" value={authEmail} onChange={e=>{setAuthEmail(e.target.value);setAuthErr("");}} placeholder="Email" style={{fontSize:13}}/>
                    {/* Password field with eye icon */}
                    <div style={{position:"relative"}}>
                      <input type={showPwd?"text":"password"} value={authPwd} onChange={e=>{setAuthPwd(e.target.value);setAuthErr("");}}
                        placeholder="Password (min 6 caratteri)"
                        onKeyDown={e=>authMode==="login"&&e.key==="Enter"&&document.getElementById("btn-auth")?.click()}
                        style={{fontSize:13,width:"100%",boxSizing:"border-box",paddingRight:36}}/>
                      <button onClick={()=>setShowPwd(s=>!s)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"var(--text-sec)",padding:0,lineHeight:1}}>{showPwd?"🙈":"👁"}</button>
                    </div>
                    {/* Conferma password solo in registrazione */}
                    {authMode==="register" && (
                      <div style={{position:"relative"}}>
                        <input type={showPwd?"text":"password"} value={authPwd2} onChange={e=>{setAuthPwd2(e.target.value);setAuthErr("");}}
                          placeholder="Conferma password"
                          onKeyDown={e=>e.key==="Enter"&&document.getElementById("btn-auth")?.click()}
                          style={{fontSize:13,width:"100%",boxSizing:"border-box",paddingRight:36,borderColor:authPwd2&&authPwd!==authPwd2?"#e53e3e":undefined}}/>
                        {authPwd2 && authPwd !== authPwd2 && <span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#e53e3e"}}>✗</span>}
                        {authPwd2 && authPwd === authPwd2 && <span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#4a7c59"}}>✓</span>}
                      </div>
                    )}
                    {authErr && <div style={{fontSize:11,color:"#e53e3e",padding:"4px 8px"}}>{authErr}</div>}
                    {authMsg && <div style={{fontSize:11,color:"#4a7c59",padding:"4px 8px"}}>{authMsg}</div>}
                    <button id="btn-auth" onClick={async()=>{
                      setAuthErr(""); setAuthMsg("");
                      if (authMode==="register" && authPwd !== authPwd2) { setAuthErr("Le password non coincidono"); return; }
                      try {
                        if (authMode==="login") await signInEmail(authEmail, authPwd);
                        else await createAccount(authEmail, authPwd);
                      } catch(e) {
                        const msg = e.code==="auth/wrong-password"?"Password errata":
                                    e.code==="auth/user-not-found"?"Email non trovata":
                                    e.code==="auth/email-already-in-use"?"Email già registrata":
                                    e.code==="auth/weak-password"?"Password troppo corta (min 6)":
                                    e.code==="auth/invalid-email"?"Email non valida":
                                    e.message||"Errore di accesso";
                        setAuthErr(msg);
                      }
                    }} style={{padding:"10px",fontSize:13,background:"var(--accent)",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:500}}>
                      {authMode==="login"?"Accedi":"Crea account"}
                    </button>
                    {/* Divider */}
                    <div style={{display:"flex",alignItems:"center",gap:8,margin:"2px 0"}}>
                      <div style={{flex:1,height:"0.5px",background:"var(--border-sec)"}}/>
                      <span style={{fontSize:10,color:"var(--text-ter)"}}>oppure</span>
                      <div style={{flex:1,height:"0.5px",background:"var(--border-sec)"}}/>
                    </div>
                    {/* Google sign-in */}
                    <button onClick={async()=>{
                      setAuthErr(""); setAuthMsg("");
                      try { await signInWithGoogle(); }
                      catch(e) {
                        if (e.code !== "auth/popup-closed-by-user") setAuthErr(e.message||"Errore Google");
                      }
                    }} style={{padding:"10px",fontSize:13,background:"var(--bg-card)",color:"var(--text)",border:"0.5px solid var(--border-sec)",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontWeight:500}}>
                      <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      Continua con Google
                    </button>
                    {authMode==="login" && (
                      <div style={{textAlign:"center"}}>
                        <button onClick={async()=>{
                          if (!authEmail.trim()) { setAuthErr("Inserisci l'email prima"); return; }
                          try { await sendPasswordReset(authEmail.trim()); setAuthMsg("Email di reset inviata!"); setAuthErr(""); }
                          catch(e) { setAuthErr(e.code==="auth/user-not-found"?"Email non trovata":e.message||"Errore"); }
                        }} style={{background:"none",border:"none",fontSize:11,color:"var(--text-ter)",cursor:"pointer",padding:"4px"}}>
                          Password dimenticata?
                        </button>
                      </div>
                    )}
                    <div style={{display:"flex",justifyContent:"center",gap:16}}>
                      <button onClick={async()=>{
                        try { await signInAnon(); } catch(e) { setAuthErr(e.message||"Errore"); }
                      }} style={{background:"none",border:"none",fontSize:11,color:"var(--text-ter)",cursor:"pointer",padding:"4px"}}>
                        Accedi anonimamente
                      </button>
                      <button onClick={()=>setCfg(c=>({...c,cloudMode:null}))} style={{background:"none",border:"none",fontSize:11,color:"var(--text-ter)",cursor:"pointer",padding:"4px"}}>
                        Torna alla scelta
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Routine deleted modal */}
      {showRDel && (
        <ModalBox onClose={()=>setShowRDel(false)} dark={dark} zIndex={400}>
          <ModalHeader title="🗑 Task eliminati di recente" onClose={()=>setShowRDel(false)}/>
          <DeletedNote/>
          {recentRDel.length===0
            ? <div style={{fontSize:13,color:"var(--text-sub)",textAlign:"center",padding:"1rem"}}>Nessun task eliminato di recente.</div>
            : recentRDel.map(task=>(
              <div key={task.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--bg-card)",border:"0.5px solid var(--border-ter)",borderRadius:8,marginBottom:6}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:"var(--text)"}}>{task.label}</div>
                  <div style={{fontSize:10,color:"var(--text-sub)"}}>{task.durata} {task.tipo==="rep"?"rip.":"min"} · {formatDaysAgo(task.deletedAt)}</div>
                </div>
                <button onClick={()=>{const{deletedAt,...c}=task;setRoutineCfg(prev=>[...prev,c]);setRoutineDeleted(prev=>prev.filter(t=>t.id!==task.id));setShowRDel(false);}} style={{fontSize:11,padding:"4px 10px",background:"var(--accent)",color:"white",border:"none",borderRadius:6,cursor:"pointer"}}>Ripristina</button>
              </div>
            ))
          }
        </ModalBox>
      )}

      {/* Habit deleted modal */}
      {showHDel && (
        <ModalBox onClose={()=>setShowHDel(false)} dark={dark} zIndex={400}>
          <ModalHeader title="🗑 Habit eliminati di recente" onClose={()=>setShowHDel(false)}/>
          <DeletedNote/>
          {recentHDel.length===0
            ? <div style={{fontSize:13,color:"var(--text-sub)",textAlign:"center",padding:"1rem"}}>Nessun habit eliminato di recente.</div>
            : recentHDel.map(habit=>(
              <div key={habit.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--bg-card)",border:"0.5px solid var(--border-ter)",borderRadius:8,marginBottom:6}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:"var(--text)"}}>{habit.label}</div>
                  <div style={{fontSize:10,color:"var(--text-sub)"}}>{habit.unita||"—"} · {formatDaysAgo(habit.deletedAt)}</div>
                </div>
                <button onClick={()=>{const{deletedAt,...c}=habit;setHabitCfg(prev=>[...prev,c]);setHabitDeleted(prev=>prev.filter(h=>h.id!==habit.id));setShowHDel(false);}} style={{fontSize:11,padding:"4px 10px",background:"var(--accent)",color:"white",border:"none",borderRadius:6,cursor:"pointer"}}>Ripristina</button>
              </div>
            ))
          }
        </ModalBox>
      )}
    </div>
  );
}

// ── Promemoria Utility View ───────────────────────────────────────────────────
function PromemoriaMemoView({ promemoria, setPromemoria, dark }) {
  const oggi = new Date();
  const todayStr = oggi.toISOString().split("T")[0];
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState("");
  const [newEl, setNewEl] = useState("fuoco");
  const [newDate, setNewDate] = useState(todayStr);
  const [showDone, setShowDone] = useState(false);

  const allItems = Object.entries(promemoria).flatMap(([dk,items])=>
    (items||[]).map(p=>({...p, dateKey:dk, dateObj:new Date(dk)}))
  );
  const THIRTY_MS = 30*86400000;
  const pending = allItems.filter(p=>p.fatto!==true).sort((a,b)=>a.dateObj-b.dateObj);
  const done    = allItems.filter(p=>p.fatto===true&&(!p.fattoAt||Date.now()-p.fattoAt<THIRTY_MS)).sort((a,b)=>b.dateObj-a.dateObj);

  const grouped = {};
  pending.forEach(p=>{ if(!grouped[p.dateKey])grouped[p.dateKey]=[]; grouped[p.dateKey].push(p); });

  function dateLabel(dateKey) {
    const d = new Date(dateKey);
    const today0 = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
    const diff = Math.round((d - today0) / 86400000);
    if (diff===0) return "Oggi";
    if (diff===1) return "Domani";
    if (diff===-1) return "Ieri";
    return d.toLocaleDateString("it-IT",{weekday:"short",day:"numeric",month:"long"});
  }
  function isPast(dateKey) {
    const d = new Date(dateKey);
    const today0 = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
    return d < today0;
  }

  function toggleFatto(dateKey, id) {
    setPromemoria(prev=>({...prev,[dateKey]:(prev[dateKey]||[]).map(p=>p.id===id?{...p,fatto:!p.fatto,fattoAt:!p.fatto?Date.now():undefined}:p)}));
  }
  function deleteProm(dateKey, id) {
    setPromemoria(prev=>({...prev,[dateKey]:(prev[dateKey]||[]).filter(p=>p.id!==id)}));
  }
  function addProm() {
    if (!newText.trim()) return;
    const d = new Date(newDate+"T12:00:00");
    const dk = d.toDateString();
    const p = {id:Date.now().toString(), testo:newText.trim(), elemento:newEl, fatto:false};
    setPromemoria(prev=>({...prev,[dk]:[...(prev[dk]||[]),p]}));
    setNewText(""); setShowAdd(false);
  }

  return (
    <div style={{padding:"1rem",maxWidth:480,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:600,color:"var(--text)"}}>🔔 Promemoria</div>
        <button onClick={()=>setShowAdd(s=>!s)} style={{fontSize:11,padding:"5px 12px",background:showAdd?"var(--bg-gray)":"var(--accent)",color:showAdd?"var(--text-sec)":"white",border:"none",borderRadius:10,cursor:"pointer",fontWeight:500}}>
          {showAdd ? "✕ Annulla" : "+ Aggiungi"}
        </button>
      </div>

      {showAdd && (
        <div style={{background:"var(--bg-wash)",borderRadius:12,padding:"14px",border:"0.5px solid var(--border-sec)",marginBottom:16}}>
          <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} style={{width:"100%",marginBottom:10,fontSize:13}}/>
          <input autoFocus value={newText} onChange={e=>setNewText(e.target.value)}
                 onKeyDown={e=>{if(e.key==="Enter")addProm();if(e.key==="Escape")setShowAdd(false);}}
                 placeholder="Scrivi il promemoria…"
                 style={{width:"100%",fontSize:13,marginBottom:10,boxSizing:"border-box"}}/>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
            {Object.entries(ELEMENTI).map(([k,e])=>(
              <div key={k} onClick={()=>setNewEl(k)} style={{
                display:"flex",alignItems:"center",gap:3,padding:"4px 9px",borderRadius:12,cursor:"pointer",
                fontSize:11,fontWeight:newEl===k?600:400,
                background:newEl===k?e.colore:elbg(k,dark),
                color:newEl===k?"white":e.colore,
                border:`0.5px solid ${e.colore}55`
              }}>{e.char} {e.nome}</div>
            ))}
          </div>
          <button onClick={addProm} style={{width:"100%",padding:"8px",fontSize:13,background:"var(--accent)",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:500}}>
            Aggiungi
          </button>
        </div>
      )}

      {Object.keys(grouped).length===0 && !showAdd && (
        <div style={{fontSize:13,color:"var(--text-sub)",textAlign:"center",padding:"3rem 1rem"}}>
          Nessun promemoria in sospeso.<br/>
          <span style={{fontSize:11}}>Aggiungine uno con il tasto + in alto.</span>
        </div>
      )}

      {Object.entries(grouped).map(([dk,items])=>{
        const past = isPast(dk);
        return (
          <div key={dk} style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <div style={{flex:1,height:"0.5px",background:past?"var(--border-ter)":"var(--border-sec)"}}/>
              <span style={{fontSize:11,fontWeight:600,color:past?"var(--text-ter)":"var(--text-sec)",padding:"2px 10px",borderRadius:10,border:`0.5px solid ${past?"var(--border-ter)":"var(--border-sec)"}`,background:"var(--bg-card)",whiteSpace:"nowrap"}}>{dateLabel(dk)}</span>
              <div style={{flex:1,height:"0.5px",background:past?"var(--border-ter)":"var(--border-sec)"}}/>
            </div>
            {items.map(p=>{
              const e=ELEMENTI[p.elemento]||ELEMENTI.fuoco;
              return (
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:elbg(p.elemento,dark),borderRadius:10,marginBottom:5,border:`0.5px solid ${e.colore}${past?"22":"44"}`}}>
                  <div onClick={()=>toggleFatto(dk,p.id)} style={{width:22,height:22,borderRadius:"50%",flexShrink:0,cursor:"pointer",border:`2px solid ${e.colore}`,background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.15s"}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:past?"var(--text-sec)":"var(--text)",fontWeight:past?400:500}}>{p.testo}</div>
                  </div>
                  <div style={{width:8,height:8,borderRadius:"50%",background:e.colore,flexShrink:0}}/>
                  <button onClick={()=>deleteProm(dk,p.id)} style={{background:"none",border:"none",color:"var(--text-dim)",fontSize:18,cursor:"pointer",padding:"0 2px",lineHeight:1,flexShrink:0}}>×</button>
                </div>
              );
            })}
          </div>
        );
      })}

      {done.length>0 && (
        <>
          <div onClick={()=>setShowDone(s=>!s)} style={{display:"flex",alignItems:"center",gap:8,marginTop:8,marginBottom:showDone?8:0,cursor:"pointer"}}>
            <div style={{flex:1,height:"0.5px",background:"var(--border-ter)"}}/>
            <span style={{fontSize:10,color:"var(--text-ter)",padding:"2px 10px",borderRadius:10,border:"0.5px solid var(--border-ter)",background:"var(--bg-card)",whiteSpace:"nowrap"}}>
              ✓ Completati ({done.length}) {showDone?"▲":"▼"}
            </span>
            <div style={{flex:1,height:"0.5px",background:"var(--border-ter)"}}/>
          </div>
          {showDone && done.map(p=>{
            const e=ELEMENTI[p.elemento]||ELEMENTI.fuoco;
            return (
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"var(--bg-card)",borderRadius:10,marginBottom:4,border:"0.5px solid var(--border-ter)",opacity:0.65}}>
                <div onClick={()=>toggleFatto(p.dateKey,p.id)} style={{width:22,height:22,borderRadius:"50%",flexShrink:0,cursor:"pointer",border:`2px solid ${e.colore}`,background:e.colore,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{color:"white",fontSize:11,lineHeight:1}}>✓</span>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:"var(--text-sub)",textDecoration:"line-through"}}>{p.testo}</div>
                  <div style={{fontSize:10,color:"var(--text-ter)",marginTop:1}}>{dateLabel(p.dateKey)}</div>
                </div>
                <button onClick={()=>deleteProm(p.dateKey,p.id)} style={{background:"none",border:"none",color:"var(--text-dim)",fontSize:18,cursor:"pointer",padding:"0 2px",lineHeight:1,flexShrink:0}}>×</button>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const oggi = new Date();
  // Find Ba-Zi anno whose lunar months contain today
  const initAnno = (()=>{
    const y = oggi.getFullYear();
    const base = oggi < liChunDate(y) ? y-1 : y;
    if (findTodayMese(lunarMonths(base), oggi) >= 0) return base;
    return base + 1; // CNY falls before LiChun edge case
  })();

  const [view, setView] = useState("calendario");
  const [anno, setAnno] = useState(initAnno);
  const [meseIdx, setMeseIdx] = useState(()=>Math.max(0, findTodayMese(lunarMonths(initAnno),oggi)));
  const [selDay, setSelDay] = useState(null);
  const [meseModal, setMeseModal] = useState(false);
  // elModal rimosso — info 5 elementi ora in Ba-Zi → 🗂 Info → 五行
  const [ekModal, setEkModal] = useState(false);
  const [moonBodyModal, setMoonBodyModal] = useState(false);
  const [agriModal, setAgriModal] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [moonTap, setMoonTap] = useState(false);
  const [annoModal, setAnnoModal] = useState(false);
  const [impTab, setImpTab] = useState("generali");

  // Auth + sync state
  const [authUser, setAuthUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState("offline"); // offline|syncing|synced|error
  const [syncMsg, setSyncMsg] = useState(""); // descriptive status message
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [conflictData, setConflictData] = useState(null); // {remote, offline, localCounts}
  const syncTimerRef = useRef(null);
  const remoteListenerRef = useRef(null);
  const utilSwipeX = useRef(null);
  const utilSwipeY = useRef(null);
  const utilSwipeDir = useRef(null); // 'h' | 'v' | null

  const [cfg, setCfg]               = useLS("bazi_cfg",         {showGreg:false,showChinese:true,showLunaZod:true,showEk:true,ekNotif:false,darkMode:false,reminderEnabled:false,reminderTime:"07:00",showTronco:true,troncoMode:"chars",showRamo:true,ramoMode:"nomi",accentColor:"#4a7c59",followDayElement:false,tempUnit:"C",distUnit:"km",lat:41.9,lon:12.5,cloudMode:null});
  const [baziPersonal, setBaziPersonal] = useLS("bazi_personal", {data:"",ora:"12"});
  const [note, setNote]             = useLS("bazi_note",         {});
  const [events, setEvents]         = useLS("bazi_events",       {});
  const [routineCfg, setRoutineCfg] = useLS("bazi_routine_cfg", DEFAULT_ROUTINE_CFG);
  const [routineLog, setRoutineLog] = useLS("bazi_routine_log", {});
  const [routineDeleted, setRoutineDeleted] = useLS("bazi_routine_del", []);
  const [habitCfg, setHabitCfg]     = useLS("bazi_habit_cfg",   DEFAULT_HABIT_CFG);
  const [habitLog, setHabitLog]     = useLS("bazi_habit_log",   {});
  const [habitDeleted, setHabitDeleted]     = useLS("bazi_habit_del",   []);
  const [todoLists, setTodoLists]   = useLS("bazi_todo_lists",   []);
  const [todoDeleted, setTodoDeleted]       = useLS("bazi_todo_del",    []);
  const [promemoria, setPromemoria] = useLS("bazi_promemoria",   {});

  // i18n — locale data loaded from JSON; language stored in localStorage bazi_lang
  const { i18n: i18nInst } = useTranslation();
  const L = i18n.getDataByLanguage(i18nInst.language)?.translation
         || i18n.getDataByLanguage('it')?.translation
         || {};

  const dark = cfg.darkMode || false;
  const accent = cfg.followDayElement
    ? ELEMENTI[TRONCO_EL[baziDay(oggi).tronco]].colore
    : (cfg.accentColor || "#4a7c59");

  // Cleanup fatto promemoria older than 30 days (runs once on mount)
  useEffect(()=>{
    const THIRTY_MS = 30*86400000;
    setPromemoria(prev=>{
      let changed=false;
      const cleaned={};
      Object.entries(prev).forEach(([dk,items])=>{
        const filtered=(items||[]).filter(p=>!(p.fatto&&p.fattoAt&&Date.now()-p.fattoAt>THIRTY_MS));
        if(filtered.length!==(items||[]).length) changed=true;
        if(filtered.length>0) cleaned[dk]=filtered;
      });
      return changed?cleaned:prev;
    });
  },[]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update CSS accent variables whenever accent or dark mode changes
  useEffect(()=>{
    const r = document.documentElement.style;
    r.setProperty('--accent', accent);
    r.setProperty('--accent-18', accent + '18');
    r.setProperty('--accent-22', accent + '22');
    r.setProperty('--accent-44', accent + '44');
    r.setProperty('--accent-66', accent + '66');
    r.setProperty('--accent-77', accent + '77');
    r.setProperty('--accent-bg', dark ? accent + '22' : accent + '12');
    r.setProperty('--accent-border', accent + '40');
  },[accent, dark]);

  // Daily routine reminder notification
  useEffect(()=>{
    if (!cfg.reminderEnabled || !cfg.reminderTime) return;
    const now = new Date();
    const [h,m] = cfg.reminderTime.split(":").map(Number);
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    const todayStr = oggi.toDateString();

    function showNotif() {
      const lastShown = localStorage.getItem("bazi_notif_last");
      if (lastShown === todayStr) return;
      const log = routineLog[todayStr] || {};
      const tasks = routineCfg.filter(t=>t.attiva);
      const doneN = tasks.filter(t=>log[t.id]).length;
      if (doneN < tasks.length && Notification.permission==="granted") {
        new Notification("🌅 Morning Routine", {
          body: `Hai completato ${doneN}/${tasks.length} task oggi. Buona pratica!`,
          icon: "/icon-192.png",
        });
        localStorage.setItem("bazi_notif_last", todayStr);
      }
    }

    if (now >= target) {
      showNotif();
    } else {
      const delay = target.getTime() - now.getTime();
      const id = setTimeout(showNotif, delay);
      return () => clearTimeout(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[cfg.reminderEnabled, cfg.reminderTime]);

  // Ekadashi notification — fires at 08:00 the day before (only if cfg.ekNotif is on)
  useEffect(()=>{
    if (!cfg.ekNotif || Notification.permission !== "granted") return;
    const tomorrow = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()+1);
    if (!isEkadashi(tomorrow)) return;
    const notifKey = "bazi_ek_notif_" + tomorrow.toDateString();
    if (localStorage.getItem(notifKey)) return;
    const target = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 8, 0, 0);
    const now = new Date();
    function fire() {
      localStorage.setItem(notifKey, "1");
      new Notification("🙏 Domani è Ekadashi", {
        body: "Giorno di digiuno e purificazione — preparati dalla sera.",
        icon: "/icon-192.png",
      });
    }
    if (now >= target) { fire(); return; }
    const id = setTimeout(fire, target.getTime() - now.getTime());
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[cfg.ekNotif, oggi.toDateString()]);

  // ── Utility swipe — start+end only, check |dx|>|dy| to distinguish from scroll ──
  useEffect(()=>{
    const TABS = ["routine","habit","todo","memo"];
    if (!TABS.includes(view)) return;
    // Attach to document to bypass inner scroll containers
    let sx = null, sy = null;
    const onStart = e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    const onEnd = e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      sx = null;
      if (Math.abs(dx) < 45 || Math.abs(dy) > Math.abs(dx)) return;
      const idx = TABS.indexOf(view);
      if (dx < 0 && idx < TABS.length-1) setView(TABS[idx+1]);
      if (dx > 0 && idx > 0) setView(TABS[idx-1]);
    };
    document.addEventListener('touchstart', onStart, {passive:true});
    document.addEventListener('touchend', onEnd, {passive:true});
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[view]);

  const mesi=lunarMonths(anno), mese=mesi[meseIdx], byYear=baziYear(anno);

  function goOggi(){
    let a = oggi<liChunDate(oggi.getFullYear())?oggi.getFullYear()-1:oggi.getFullYear();
    let idx = findTodayMese(lunarMonths(a), oggi);
    if (idx < 0) { a++; idx = findTodayMese(lunarMonths(a), oggi); }
    setAnno(a); setMeseIdx(Math.max(0, idx));
    setSelDay({date:oggi,bazi:baziDay(oggi)}); setMoonTap(false);
  }
  function prevMese(){if(meseIdx===0){setAnno(a=>a-1);setMeseIdx(11);}else setMeseIdx(m=>m-1);}
  function nextMese(){if(meseIdx===11){setAnno(a=>a+1);setMeseIdx(0);}else setMeseIdx(m=>m+1);}
  function selectDay(d,bazi){setSelDay(prev=>prev?.date.toDateString()===d.toDateString()?null:{date:d,bazi});setMoonTap(false);}

  // ── Data sync helpers ─────────────────────────────────────────────────────
  const allSetters = useRef(null);
  useEffect(()=>{
    // Store setter refs so sync can update them
    allSetters.current = {
      bazi_cfg: setCfg, bazi_note: setNote, bazi_events: setEvents,
      bazi_routine_cfg: setRoutineCfg, bazi_routine_log: setRoutineLog,
      bazi_routine_del: setRoutineDeleted, bazi_habit_cfg: setHabitCfg,
      bazi_habit_log: setHabitLog, bazi_habit_del: setHabitDeleted,
      bazi_todo_lists: setTodoLists, bazi_todo_del: setTodoDeleted,
      bazi_promemoria: setPromemoria, bazi_personal: setBaziPersonal,
    };
  });

  // ── Merge helpers ──────────────────────────────────────────────────────────
  function mergeById(cloudArr, localArr) {
    const m = [...(cloudArr||[])];
    (localArr||[]).forEach(it => { if (it?.id && !m.find(c=>c?.id===it.id)) m.push(it); });
    return m;
  }
  // Merge {date: [{id,...}]} — per eventi e promemoria
  function mergeObjOfArrays(cloudObj, localObj) {
    const m = {...(cloudObj||{})};
    Object.entries(localObj||{}).forEach(([k,arr])=>{
      if (!m[k]) m[k] = arr;
      else if (Array.isArray(arr)) m[k] = mergeById(m[k], arr);
    });
    return m;
  }
  // Merge shallow objects (log per data) — cloud ha precedenza, aggiunge date mancanti dal locale
  function mergeShallowObj(cloudObj, localObj) {
    return {...(localObj||{}), ...(cloudObj||{})};
  }
  function mergeData(remote, localData) {
    return {
      bazi_cfg:         remote.bazi_cfg ?? localData.bazi_cfg,
      bazi_personal:    remote.bazi_personal ?? localData.bazi_personal,
      // Note = {dateString: text} — merge aggiungendo date locali non presenti nel cloud
      bazi_note:        mergeShallowObj(remote.bazi_note, localData.bazi_note),
      // Events/promemoria = {dateString: [{id,...}]}
      bazi_events:      mergeObjOfArrays(remote.bazi_events, localData.bazi_events),
      bazi_promemoria:  mergeObjOfArrays(remote.bazi_promemoria, localData.bazi_promemoria),
      // Cfg = array di oggetti con id
      bazi_routine_cfg: mergeById(remote.bazi_routine_cfg, localData.bazi_routine_cfg),
      bazi_habit_cfg:   mergeById(remote.bazi_habit_cfg, localData.bazi_habit_cfg),
      bazi_todo_lists:  mergeById(remote.bazi_todo_lists, localData.bazi_todo_lists),
      // Log = {dateString: {taskId: value}} — cloud ha precedenza
      bazi_routine_log: mergeShallowObj(remote.bazi_routine_log, localData.bazi_routine_log),
      bazi_habit_log:   mergeShallowObj(remote.bazi_habit_log, localData.bazi_habit_log),
      // Del = array di oggetti con id
      bazi_routine_del: mergeById(remote.bazi_routine_del, localData.bazi_routine_del),
      bazi_habit_del:   mergeById(remote.bazi_habit_del, localData.bazi_habit_del),
      bazi_todo_del:    mergeById(remote.bazi_todo_del, localData.bazi_todo_del),
    };
  }

  // ── Firebase auth listener ────────────────────────────────────────────────
  useEffect(()=>{
    if (!firebaseEnabled) return;
    const unsub = onAuthChange(async (user) => {
      setAuthUser(user);
      if (!user) { setSyncStatus("offline"); setSyncMsg(""); return; }
      setSyncStatus("syncing");
      setSyncMsg("Recupero dati dal cloud…");
      try {
        const remote = await loadAllKeys(user.uid);
        const remoteHasData = remote && Object.keys(remote).filter(k=>k!=='__remoteTs').length > 0;

        if (remoteHasData) {
          // ALWAYS apply settings from cloud
          if (remote.bazi_cfg && allSetters.current?.bazi_cfg) allSetters.current.bazi_cfg(remote.bazi_cfg);
          if (remote.bazi_personal && allSetters.current?.bazi_personal) allSetters.current.bazi_personal(remote.bazi_personal);

          // Check if device has pre-existing personal data (never synced before)
          const neverPushed = !localStorage.getItem('bazi_last_push');
          const localTs = JSON.parse(localStorage.getItem('bazi_sync_ts')||'{}');
          const hasLocalChanges = Object.keys(localTs).length > 0;
          const localEventsCount = Object.keys(JSON.parse(localStorage.getItem('bazi_events')||'{}')).length;
          const localPromsCount = Object.keys(JSON.parse(localStorage.getItem('bazi_promemoria')||'{}')).length;
          const localTodoCount = JSON.parse(localStorage.getItem('bazi_todo_lists')||'[]').length;
          const localHasPersonal = localEventsCount > 0 || localPromsCount > 0 || localTodoCount > 0;

          if (neverPushed && hasLocalChanges && localHasPersonal) {
            // Device has pre-existing user data — ask what to do
            setSyncStatus("offline");
            setSyncMsg("Dati locali trovati");
            setConflictData({ remote, offline: false, localCounts: { eventi: localEventsCount, promemoria: localPromsCount, todo: localTodoCount } });
            return; // listener started after user chooses
          }

          // No conflict: apply remote data
          setSyncMsg("Applicazione dati cloud…");
          const DATA_KEYS = SYNC_KEYS.filter(k => k !== 'bazi_cfg' && k !== 'bazi_personal');
          DATA_KEYS.forEach(k => { if (remote[k] !== undefined && allSetters.current?.[k]) allSetters.current[k](remote[k]); });
        } else {
          // First use of this account: push local to cloud
          setSyncMsg("Prima sincronizzazione…");
          const currentData = {
            bazi_cfg:cfg, bazi_note:note, bazi_events:events,
            bazi_routine_cfg:routineCfg, bazi_routine_log:routineLog,
            bazi_routine_del:routineDeleted, bazi_habit_cfg:habitCfg,
            bazi_habit_log:habitLog, bazi_habit_del:habitDeleted,
            bazi_todo_lists:todoLists, bazi_todo_del:todoDeleted,
            bazi_promemoria:promemoria, bazi_personal:baziPersonal,
          };
          setSyncMsg(`Caricamento 0/${SYNC_KEYS.length}…`);
          for (let i=0; i<SYNC_KEYS.length; i++) {
            await pushKey(user.uid, SYNC_KEYS[i], currentData[SYNC_KEYS[i]]);
            setSyncMsg(`Caricamento ${i+1}/${SYNC_KEYS.length}…`);
          }
          localStorage.setItem('bazi_last_push', Date.now().toString());
        }
        const now = new Date();
        setSyncStatus("synced");
        setSyncMsg(`Sincronizzato alle ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
        setLastSyncTime(now);
        // Start real-time listener
        if (remoteListenerRef.current) remoteListenerRef.current();
        remoteListenerRef.current = listenUserData(user.uid, (lsKey, value) => {
          if (allSetters.current?.[lsKey]) allSetters.current[lsKey](value);
        });
      } catch(e) {
        console.error('[Sync]', e);
        if (!navigator.onLine || e.code === 'unavailable' || e.message?.includes('offline')) {
          setSyncStatus("offline"); setSyncMsg("Offline — dati locali al sicuro");
          setConflictData({ remote: null, offline: true });
        } else {
          setSyncStatus("error"); setSyncMsg("Errore connessione: " + (e.message||"riprovare"));
        }
      }
    });
    return ()=>{
      unsub();
      if (remoteListenerRef.current) remoteListenerRef.current();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // ── Debounced push on local changes ───────────────────────────────────────
  useEffect(()=>{
    if (!firebaseEnabled || !authUser) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async ()=>{
      setSyncStatus("syncing"); setSyncMsg("Sincronizzando…");
      try {
        const data = {
          bazi_cfg:cfg, bazi_note:note, bazi_events:events,
          bazi_routine_cfg:routineCfg, bazi_routine_log:routineLog,
          bazi_routine_del:routineDeleted, bazi_habit_cfg:habitCfg,
          bazi_habit_log:habitLog, bazi_habit_del:habitDeleted,
          bazi_todo_lists:todoLists, bazi_todo_del:todoDeleted,
          bazi_promemoria:promemoria, bazi_personal:baziPersonal,
        };
        await Promise.all(SYNC_KEYS.map(k => pushKey(authUser.uid, k, data[k])));
        localStorage.setItem('bazi_last_push', Date.now().toString());
        const now = new Date();
        setSyncStatus("synced");
        setSyncMsg(`Sincronizzato alle ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
        setLastSyncTime(now);
      } catch(e) { setSyncStatus("error"); setSyncMsg("Errore sincronizzazione"); }
    }, 2000);
    return ()=>{ if(syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[cfg,note,events,routineCfg,routineLog,routineDeleted,habitCfg,habitLog,habitDeleted,todoLists,todoDeleted,promemoria,baziPersonal,authUser]);

  const firstDow=mese.giorni[0]?.getDay()??0;
  const cells=[...Array(firstDow).fill(null),...mese.giorni];
  while(cells.length%7!==0) cells.push(null);
  const rows=[]; for(let i=0;i<cells.length;i+=7)rows.push(cells.slice(i,i+7));

  return (
    <LC.Provider value={L}>
    <div className={dark?"dark":""} style={{fontFamily:"var(--font-sans)",minHeight:"100svh",background:"var(--bg)",color:"var(--text)"}}>
      <TopNav view={view} setView={setView} syncStatus={syncStatus} userEmail={authUser?.email} setImpTab={setImpTab} dark={dark}/>

      <div style={{maxWidth:480,margin:"0 auto"}}>

        {/* ── Calendario ─────────────────────────────────────── */}
        {view==="calendario" && (
          <div style={{padding:"1rem"}}>
            {/* Row 1: Anno + Oggi + Cinque Elementi inline */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div onClick={()=>setAnnoModal(true)} style={{cursor:"pointer",userSelect:"none",flex:1,minWidth:0}}>
                <div style={{fontSize:18,fontWeight:500,color:"var(--text)",letterSpacing:"0.5px"}}>{TRONCHI[byYear.tronco]}{RAMI[byYear.ramo]} · {anno}</div>
                <div style={{fontSize:11,color:"var(--text-sec)"}}>{ANIMALI_EMOJI[byYear.ramo]} {(L.animali||ANIMALI)[byYear.ramo]} · {ELEMENTI[TRONCO_EL[byYear.tronco]].char} {ELEMENTI[TRONCO_EL[byYear.tronco]].nome}</div>
              </div>
              <button onClick={goOggi} style={{fontSize:12,padding:"7px 14px",background:"var(--accent)",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:500,flexShrink:0}}>{L.ui?.oggi||"Oggi"}</button>
            </div>
            {/* Row 2: Luna widget + Agricoltura widget */}
            {(()=>{
              const todayP = moonPhase(oggi);
              const todayMt = moonTimesForDate(oggi, cfg.lat??41.9, cfg.lon??12.5);
              const illum = Math.round(50*(1-Math.cos(todayP/SYNODIC*2*Math.PI)));
              const todayPhaseStr = moonName(todayP);
              const todayZod = lunaZodiac(oggi);
              const mGrego = mese.start.getMonth();
              const agriData = AGRICOLTURA_MESI[mGrego];
              return (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  {/* Luna widget */}
                  <div onClick={()=>setMoonBodyModal(true)} style={{cursor:"pointer",padding:"8px 12px",borderRadius:10,background:"var(--bg-card)",border:"0.5px solid var(--border-sec)",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:22,lineHeight:1,flexShrink:0}}>{moonEmoji(todayP)}</span>
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                        <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{illum}%</span>
                        <span style={{fontSize:10,color:"var(--text-sec)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{moonDisplayName(todayPhaseStr)}</span>
                      </div>
                      {todayMt && <div style={{fontSize:10,color:"var(--text-ter)",letterSpacing:"0.3px",marginTop:1}}>↑{todayMt.rise} ↓{todayMt.set}</div>}
                    </div>
                  </div>
                  {/* Agricoltura widget */}
                  <div onClick={()=>setAgriModal(true)} style={{cursor:"pointer",padding:"8px 12px",borderRadius:10,background:dark?"#0d1a0d":"#f0faf3",border:"0.5px solid #4a7c5944",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:22,lineHeight:1,flexShrink:0}}>{agriData.cover}</span>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:dark?"#81c784":"#4a7c59",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{i18n.t('ui.agricoltura.titolo',{defaultValue:"Stagione"})}</div>
                      <div style={{fontSize:10,color:"var(--text-sec)",marginTop:1}}>{LUNA_ZODIACO_AGRI[todayZod].icon} {(L.lunaZodiacoAgri?.[todayZod]||LUNA_ZODIACO_AGRI[todayZod]).tipo}</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Nav mese */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <button onClick={prevMese} style={{padding:"5px 14px",fontSize:16}}>←</button>
              <div style={{textAlign:"center",cursor:"pointer"}} onClick={()=>setMeseModal(true)}>
                <div style={{fontWeight:600,fontSize:16,color:"var(--text)",textDecoration:"underline",textDecorationStyle:"dotted",textDecorationColor:"var(--border-sec)"}}>{mese.nome} Mese</div>
                <div style={{fontSize:12,color:"var(--text-sec)"}}>{ELEMENTI[mese.elemento].char} {ELEMENTI[mese.elemento].nome} · {ANIMALI_EMOJI[baziMonth(meseIdx,byYear.tronco).ramo]} {(L.animali||ANIMALI)[baziMonth(meseIdx,byYear.tronco).ramo]}</div>
              </div>
              <button onClick={nextMese} style={{padding:"5px 14px",fontSize:16}}>→</button>
            </div>

            {/* Header giorni */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>
              {(i18n.language.startsWith("en") ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] : i18n.language.startsWith("es") ? ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"] : ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"]).map(g=>(
                <div key={g} style={{textAlign:"center",fontSize:11,color:"var(--text-sub)",padding:"2px 0"}}>{g}</div>
              ))}
            </div>

            {/* Griglia giorni */}
            {rows.map((row,ri)=>(
              <div key={ri} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
                {row.map((d,ci)=>{
                  if(!d) return <div key={ci} style={{height:76}}/>;
                  const bazi=baziDay(d), el=TRONCO_EL[bazi.tronco], e=ELEMENTI[el];
                  const isOggi=d.toDateString()===oggi.toDateString();
                  const isSel=selDay?.date.toDateString()===d.toDateString();
                  const p=moonPhase(d), mk=moonKey(p);
                  const ek=cfg.showEk&&isEkadashi(d);
                  const lunarDay=mese.giorni.indexOf(d)+1;
                  const haNote=!!note[d.toDateString()];
                  const dayLog=routineLog[d.toDateString()];
                  const hasRoutine=dayLog&&Object.keys(dayLog).some(k=>dayLog[k]);
                  const dayEvs=events[d.toDateString()]||[];
                  const dayProm=((promemoria||{})[d.toDateString()]||[]).filter(p=>p.fatto!==true);
                  const txtColor=isSel?"white":(dark?"rgba(255,255,255,0.88)":e.colore);
                  return (
                    <div key={ci} onClick={()=>selectDay(d,bazi)} style={{
                      background:isSel?e.colore:elbg(el,dark),
                      border:isSel?`2px solid white`:isOggi?`2px solid ${e.colore}`:`0.5px solid ${e.colore}${dark?"55":"33"}`,
                      boxShadow:isOggi&&!isSel?`0 0 0 1.5px ${e.colore}`:"none",
                      borderRadius:7,cursor:"pointer",textAlign:"center",
                      height:76,display:"flex",flexDirection:"column",
                      padding:"2px 1px",boxSizing:"border-box",transition:"background 0.15s",
                      position:"relative",overflow:"hidden"
                    }}>
                      {/* Piano-key promemoria bars — full left edge */}
                      {dayProm.length>0 && (()=>{
                        const sorted=EL_ORDER.flatMap(ek=>dayProm.filter(p=>p.elemento===ek));
                        return (
                          <div style={{position:"absolute",left:0,top:0,bottom:0,width:4,display:"flex",flexDirection:"column",zIndex:2}}>
                            {sorted.map((p,idx)=>(
                              <div key={p.id} style={{flex:1,background:isSel?"rgba(255,255,255,0.5)":ELEMENTI[p.elemento]?.colore||"#888",borderTop:idx>0?"1px solid rgba(0,0,0,0.08)":"none"}}/>
                            ))}
                          </div>
                        );
                      })()}
                      {/* Piano-key event bars — full right edge */}
                      {dayEvs.length>0 && (()=>{
                        const sorted=EL_ORDER.flatMap(ek=>dayEvs.filter(ev=>ev.elemento===ek));
                        return (
                          <div style={{position:"absolute",right:0,top:0,bottom:0,width:6,display:"flex",flexDirection:"column",zIndex:2}}>
                            {sorted.map((ev,idx)=>(
                              <div key={ev.id} style={{flex:1,background:isSel?"rgba(255,255,255,0.5)":ELEMENTI[ev.elemento]?.colore||"#888",borderTop:idx>0?"1px solid rgba(0,0,0,0.08)":"none"}}/>
                            ))}
                          </div>
                        );
                      })()}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2px 4px",flexShrink:0,paddingLeft:dayProm.length?8:4,paddingRight:dayEvs.length?10:4}}>
                        <span style={{fontSize:13,fontWeight:800,color:txtColor,lineHeight:1}}>{lunarDay}</span>
                        <span style={{fontSize:12,lineHeight:1}}>{mk}</span>
                      </div>
                      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",paddingLeft:dayProm.length?4:0,paddingRight:dayEvs.length?4:0}}>
                        {(()=>{
                          const showT=cfg.showTronco!==false, showR=cfg.showRamo!==false;
                          const tMode=cfg.troncoMode||"chars", rMode=cfg.ramoMode||"nomi";
                          const ramoEl = showR&&(rMode==="emoji"
                            ? <div style={{fontSize:showT?14:20,lineHeight:1.2}}>{ANIMALI_EMOJI[bazi.ramo]}</div>
                            : rMode==="chars"
                              ? <div style={{fontSize:showT?14:18,lineHeight:1.2,color:txtColor,fontWeight:600}}>{RAMI[bazi.ramo]}</div>
                              : <div style={{fontSize:showT?7:9,lineHeight:1.3,color:txtColor,opacity:0.85}}>{(L.animali||ANIMALI)[bazi.ramo]}</div>);
                          const troncoEl = showT&&(tMode==="chars"
                            ? <div style={{fontSize:showR?15:18,lineHeight:1.15,color:txtColor,fontWeight:500}}>{TRONCHI[bazi.tronco]}</div>
                            : tMode==="emoji"
                              ? <div style={{fontSize:showR?15:20,lineHeight:1.2}}>{TRONCHI_EMOJI[bazi.tronco]}</div>
                              : <div style={{fontSize:showR?8:10,lineHeight:1.3,color:txtColor,fontWeight:600}}>{TRONCHI_NOMI[bazi.tronco]}</div>);
                          if(!showT&&!showR) return null;
                          // ramo on top, tronco below
                          return <>{ramoEl}{troncoEl}</>;
                        })()}
                      </div>
                      <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:3,padding:"2px 4px",flexShrink:0,minHeight:16}}>
                        {cfg.showGreg && <span style={{fontSize:8,color:isSel?"rgba(255,255,255,0.92)":(dark?"rgba(255,255,255,0.7)":"rgba(0,0,0,0.58)"),fontWeight:500}}>{d.getDate()}/{d.getMonth()+1}</span>}
                        {ek && <div style={{width:7,height:7,borderRadius:"50%",background:isSel?"white":"#2e7d32",flexShrink:0}}/>}
                        {haNote && <div style={{width:5,height:5,borderRadius:"50%",background:isSel?"white":e.colore,flexShrink:0}}/>}
                        {hasRoutine && <div style={{width:5,height:5,borderRadius:"50%",background:isSel?"rgba(255,255,255,0.7)":"var(--accent-66)",flexShrink:0}}/>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Pannello giorno selezionato */}
            {selDay && (()=>{
              const p=moonPhase(selDay.date), ph=moonName(p), zod=lunaZodiac(selDay.date);
              const bz=(L.bellezza||BELLEZZA)[ph]||{}, ek=isEkadashi(selDay.date);
              const el=TRONCO_EL[selDay.bazi.tronco], elR=RAMO_EL[selDay.bazi.ramo];
              const dayRoutineLog=routineLog[selDay.date.toDateString()]||{};
              const activeTasks=routineCfg.filter(t=>t.attiva);
              return (
                <div style={{marginTop:12,padding:14,background:elbg(el,dark),borderRadius:12,border:`1px solid ${ELEMENTI[el].colore}66`}}>
                  {(()=>{const lDay=mese.giorni.findIndex(d=>d.toDateString()===selDay.date.toDateString())+1; return(
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:700,color:"var(--text)"}}>{lDay}° giorno lunare</div>
                      <div style={{fontSize:12,color:"var(--text-sec)",textTransform:"capitalize",marginTop:2}}>
                        {selDay.date.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
                      </div>
                    </div>
                    <button onClick={()=>setSelDay(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"var(--text-sec)",padding:"0 4px"}}>✕</button>
                  </div>
                  );})()}

                  {/* Promemoria — above Events */}
                  <PromemoriaSection promemoria={promemoria} dateKey={selDay.date.toDateString()} setPromemoria={setPromemoria} dark={dark}/>
                  {/* Events — above Ba-Zi */}
                  <EventsSection events={events} dateKey={selDay.date.toDateString()} setEvents={setEvents} dark={dark}/>

                  {/* Ba-Zi + Luna */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                    <div style={{background:elbg(el,dark),borderRadius:8,padding:"8px 6px",textAlign:"center",border:`1px solid ${ELEMENTI[el].colore}44`}}>
                      <div style={{fontSize:11,color:dark?"rgba(255,255,255,0.6)":"var(--text-sec)",marginBottom:3}}>Cielo</div>
                      {cfg.showChinese && <div style={{fontSize:26,lineHeight:1.1,color:dark?"white":ELEMENTI[el].colore}}>{TRONCHI[selDay.bazi.tronco]}</div>}
                      <div style={{fontSize:12,color:dark?"rgba(255,255,255,0.9)":ELEMENTI[el].colore,fontWeight:600,marginTop:2}}>{TRONCHI_NOMI[selDay.bazi.tronco]}</div>
                      <Badge el={el}/>
                    </div>
                    <div style={{background:elbg(elR,dark),borderRadius:8,padding:"8px 6px",textAlign:"center",border:`1px solid ${ELEMENTI[elR].colore}44`}}>
                      <div style={{fontSize:11,color:dark?"rgba(255,255,255,0.6)":"var(--text-sec)",marginBottom:3}}>Terra</div>
                      {cfg.showChinese && <div style={{fontSize:26,lineHeight:1.1,color:dark?"white":ELEMENTI[elR].colore}}>{RAMI[selDay.bazi.ramo]}</div>}
                      <div style={{fontSize:12,color:dark?"rgba(255,255,255,0.9)":ELEMENTI[elR].colore,fontWeight:600,marginTop:2}}>{ANIMALI_EMOJI[selDay.bazi.ramo]} {ANIMALI[selDay.bazi.ramo]}</div>
                      <Badge el={elR}/>
                    </div>
                    {(()=>{
                      const mt = moonTimesForDate(selDay.date, cfg.lat??41.9, cfg.lon??12.5);
                      return (
                        <div onClick={()=>setMoonTap(s=>!s)} style={{background:dark?"#1a1a20":"#f8f8f6",borderRadius:8,padding:"8px 6px",textAlign:"center",border:`0.5px solid ${moonTap?"var(--accent)":"var(--border-sec)"}`,cursor:"pointer",transition:"border-color 0.15s"}}>
                          <div style={{fontSize:11,color:"var(--text-sec)",marginBottom:3}}>Luna</div>
                          <div style={{fontSize:22}}>{moonEmoji(p)}</div>
                          <div style={{fontSize:11,fontWeight:600,marginTop:2,color:"var(--text)"}}>{moonDisplayName(ph)}</div>
                          {cfg.showLunaZod && <div style={{fontSize:10,color:"var(--text-sec)",marginTop:1}}>{ZODIAC_SYM[zod]} {ZODIAC_NOMI[zod]}</div>}
                          {mt && <div style={{fontSize:9,color:"var(--text-sub)",marginTop:3,lineHeight:1.5}}>↑{mt.rise} ↓{mt.set}</div>}
                          <div style={{fontSize:8,color:"var(--text-sub)",marginTop:2}}>{moonTap?"▲ chiudi":"▼ consigli"}</div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Compatibilità Ba-Zi personale con il giorno */}
                  {baziPersonal?.data && (()=>{
                    const birthD=new Date(baziPersonal.data+"T12:00:00");
                    if (isNaN(birthD.getTime())) return null; // data non valida
                    const dmEl=TRONCO_EL[baziDay(birthD).tronco];
                    if (!dmEl) return null;
                    const rel=dayRelation(dmEl, el);
                    const info=REL_INFO[rel];
                    if (!info) return null;
                    const dmElObj=ELEMENTI[dmEl];
                    return (
                      <div style={{marginBottom:10,padding:"10px 12px",background:elbg(dmEl,dark),borderRadius:8,border:`0.5px solid ${dmElObj.colore}44`}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:22,lineHeight:1,flexShrink:0}}>{info.emoji}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:dark?"rgba(255,255,255,0.88)":dmElObj.colore}}>
                              {info.nome} <span style={{fontSize:10,fontWeight:400,opacity:0.7}}>{info.cin}</span>
                            </div>
                            <div style={{fontSize:10,color:"var(--text-sec)",marginTop:1,lineHeight:1.45}}>{info.desc}</div>
                          </div>
                          {/* barre energia verticali */}
                          <div style={{display:"flex",gap:2,flexShrink:0,alignItems:"flex-end"}}>
                            {Array.from({length:5},(_,i)=>(
                              <div key={i} style={{width:5,borderRadius:2,background:i<info.bar?dmElObj.colore:(dark?"#333":"var(--bg-gray2)"),height:i<info.bar?`${8+i*4}px`:"8px"}}/>
                            ))}
                          </div>
                        </div>
                        <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:3}}>
                          <div style={{fontSize:10,lineHeight:1.5,color:"var(--text-sec)"}}><span style={{color:"var(--accent)",fontWeight:600,marginRight:4}}>✓</span>{info.bene}</div>
                          <div style={{fontSize:10,lineHeight:1.5,color:"var(--text-sec)"}}><span style={{color:"#e07b39",fontWeight:600,marginRight:4}}>⚠</span>{info.cura}</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Ekadashi */}
                  {ek && cfg.showEk && (
                    <div onClick={()=>setEkModal(true)} style={{marginBottom:10,padding:"8px 12px",background:dark?"#0d2010":"#f0faf3",borderRadius:8,cursor:"pointer",border:"0.5px solid #2e7d3244",display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:"#2e7d32",flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:"#2e7d32"}}>Ekadashi</div>
                        <div style={{fontSize:10,color:"var(--text-sec)"}}>11° Tithi — tocca per saperne di più</div>
                      </div>
                    </div>
                  )}

                  {/* Consigli bellezza — visibile solo dopo tap Luna */}
                  {moonTap && bz.capelli && (
                    <div style={{marginBottom:10,padding:"10px 12px",background:dark?"var(--bg-card)":"#fafaf8",borderRadius:8,border:"0.5px solid var(--border-sec)"}}>
                      <div style={{fontSize:12,fontWeight:600,marginBottom:6,color:"var(--text)"}}>✨ {i18n.t('ui.luna.bellezzaTitolo',{defaultValue:"Consigli luna per oggi"})}</div>
                      {[[`💆 ${i18n.t('ui.luna.pelle',{defaultValue:"Pelle"})}`,bz.pelle],[`💇 ${i18n.t('ui.luna.capelli',{defaultValue:"Capelli"})}`,bz.capelli],[`💅 ${i18n.t('ui.luna.unghie',{defaultValue:"Unghie"})}`,bz.unghie],[`🧘 ${i18n.t('ui.luna.corpo2',{defaultValue:"Corpo"})}`,bz.corpo]].map(([k,v])=>(
                        <div key={k} style={{marginBottom:4}}>
                          <span style={{fontSize:11,fontWeight:600,color:"var(--text-sec)"}}>{k}: </span>
                          <span style={{fontSize:11,color:"var(--text)"}}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Morning Routine log */}
                  {activeTasks.length>0 && Object.keys(dayRoutineLog).length>0 && (
                    <div onClick={()=>setView("routine")} style={{marginBottom:10,padding:"10px 12px",background:elbg(el,dark),borderRadius:8,border:`0.5px solid ${ELEMENTI[el].colore}44`,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <div style={{fontSize:12,fontWeight:600,color:ELEMENTI[el].colore}}>🌅 Morning Routine</div>
                        <div style={{fontSize:11,color:ELEMENTI[el].colore,opacity:0.7}}>→</div>
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {activeTasks.map(task=>(
                          <span key={task.id} style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:dayRoutineLog[task.id]?ELEMENTI[el].colore:dark?"#222":"#e8e8e8",color:dayRoutineLog[task.id]?"white":"var(--text-sec)"}}>{task.label}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Note */}
                  <textarea
                    value={note[selDay.date.toDateString()]||""}
                    onChange={e=>setNote(n=>({...n,[selDay.date.toDateString()]:e.target.value}))}
                    placeholder="Aggiungi una nota…"
                    style={{width:"100%",minHeight:48,fontSize:12,border:"0.5px solid var(--border-sec)",borderRadius:6,padding:8,background:dark?"var(--bg-card)":"#fff",boxSizing:"border-box",resize:"vertical",color:"var(--text)"}}
                  />
                </div>
              );
            })()}
          </div>
        )}

        {["routine","habit","todo","memo"].includes(view) && (
          <div id="util-swipe-area">
            {view==="routine" && <MorningRoutineView routineCfg={routineCfg} setRoutineCfg={setRoutineCfg} routineLog={routineLog} setRoutineLog={setRoutineLog} setView={setView} setImpTab={setImpTab} routineDeleted={routineDeleted} setRoutineDeleted={setRoutineDeleted} dark={dark}/>}
            {view==="habit"   && <HabitTrackerView habitCfg={habitCfg} setHabitCfg={setHabitCfg} habitLog={habitLog} setHabitLog={setHabitLog} setView={setView} setImpTab={setImpTab} habitDeleted={habitDeleted} setHabitDeleted={setHabitDeleted} dark={dark}/>}
            {view==="todo"    && <TodoView todoLists={todoLists} setTodoLists={setTodoLists} todoDeleted={todoDeleted} setTodoDeleted={setTodoDeleted} dark={dark}/>}
            {view==="memo"    && <PromemoriaMemoView promemoria={promemoria} setPromemoria={setPromemoria} dark={dark}/>}
          </div>
        )}
        {view==="bazi"         && <BaziView dark={dark} baziPersonal={baziPersonal} setBaziPersonal={setBaziPersonal}/>}
        {view==="impostazioni" && <ImpostazioniView cfg={cfg} setCfg={setCfg} routineCfg={routineCfg} setRoutineCfg={setRoutineCfg} routineDeleted={routineDeleted} setRoutineDeleted={setRoutineDeleted} habitCfg={habitCfg} setHabitCfg={setHabitCfg} habitDeleted={habitDeleted} setHabitDeleted={setHabitDeleted} todoDeleted={todoDeleted} setTodoDeleted={setTodoDeleted} defaultSection={impTab} authUser={authUser} syncStatus={syncStatus} syncMsg={syncMsg} signInEmail={signInEmail} createAccount={createAccount} signOutUser={signOutUser} signInAnon={signInAnon} signInWithGoogle={signInWithGoogle} sendPasswordReset={sendPasswordReset} updateUserEmail={updateUserEmail} events={events} promemoria={promemoria} onOpenTour={()=>{setOnboardingOpen(true);}}/>}
      </div>

      {/* Conflict resolution modal */}
      {conflictData && (
        <ModalBox onClose={null} dark={dark} zIndex={500}>
          <div style={{padding:"4px 0 12px"}}>
            <div style={{textAlign:"center",marginBottom:12}}>
              <div style={{fontSize:22,marginBottom:6}}>{conflictData.offline?"📵":"⚡"}</div>
              <div style={{fontSize:15,fontWeight:700,color:"var(--text)",marginBottom:4}}>
                {conflictData.offline?"Sincronizzazione offline":"Dati locali trovati"}
              </div>
              <div style={{fontSize:12,color:"var(--text-sec)",lineHeight:1.6}}>
                {conflictData.offline
                  ? "Connessione al cloud non disponibile. Dati locali al sicuro."
                  : `Questo dispositivo ha dati non sincronizzati:${conflictData.localCounts ? ` ${conflictData.localCounts.eventi} eventi · ${conflictData.localCounts.promemoria} promemoria · ${conflictData.localCounts.todo} liste` : ""}. Come vuoi procedere?`}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {!conflictData.offline && conflictData.remote && (
                <>
                  <button onClick={async ()=>{
                    // Merge: combine cloud + local unique items
                    const localData = {bazi_note:note,bazi_events:events,bazi_routine_cfg:routineCfg,bazi_routine_log:routineLog,bazi_routine_del:routineDeleted,bazi_habit_cfg:habitCfg,bazi_habit_log:habitLog,bazi_habit_del:habitDeleted,bazi_todo_lists:todoLists,bazi_todo_del:todoDeleted,bazi_promemoria:promemoria,bazi_personal:baziPersonal,bazi_cfg:cfg};
                    const merged = mergeData(conflictData.remote, localData);
                    SYNC_KEYS.forEach(k=>{ if(merged[k]!==undefined && allSetters.current?.[k]) allSetters.current[k](merged[k]); });
                    setSyncStatus("syncing"); setSyncMsg("Unione dati 0%…");
                    try {
                      for (let i=0; i<SYNC_KEYS.length; i++) {
                        await pushKey(authUser.uid, SYNC_KEYS[i], merged[SYNC_KEYS[i]]);
                        setSyncMsg(`Unione dati ${Math.round((i+1)/SYNC_KEYS.length*100)}%…`);
                      }
                      localStorage.setItem('bazi_last_push',Date.now().toString());
                      const now=new Date(); setSyncStatus("synced"); setSyncMsg(`Sincronizzato alle ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
                    } catch { setSyncStatus("error"); setSyncMsg("Errore"); }
                    setConflictData(null);
                    if(remoteListenerRef.current) remoteListenerRef.current();
                    remoteListenerRef.current=listenUserData(authUser.uid,(k,v)=>{ if(allSetters.current?.[k]) allSetters.current[k](v); });
                  }} style={{padding:"11px",fontSize:13,background:"var(--accent)",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600}}>
                    Unisci — aggiungi locale al cloud
                  </button>
                  <button onClick={()=>{
                    // Use cloud data
                    SYNC_KEYS.forEach(k=>{ if(conflictData.remote[k]!==undefined && allSetters.current?.[k]) allSetters.current[k](conflictData.remote[k]); });
                    localStorage.setItem('bazi_last_push',Date.now().toString());
                    const now=new Date(); setSyncStatus("synced"); setSyncMsg(`Sincronizzato alle ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
                    setConflictData(null);
                    if(remoteListenerRef.current) remoteListenerRef.current();
                    remoteListenerRef.current=listenUserData(authUser.uid,(k,v)=>{ if(allSetters.current?.[k]) allSetters.current[k](v); });
                  }} style={{padding:"11px",fontSize:13,background:"var(--bg-sec)",color:"var(--text)",border:"0.5px solid var(--border-sec)",borderRadius:8,cursor:"pointer"}}>
                    Cancella locale — usa solo cloud
                  </button>
                  <button onClick={async ()=>{
                    // Use local, overwrite cloud
                    if (!authUser) return;
                    setSyncStatus("syncing"); setSyncMsg("Caricamento 0%…");
                    const data = {bazi_cfg:cfg,bazi_note:note,bazi_events:events,bazi_routine_cfg:routineCfg,bazi_routine_log:routineLog,bazi_routine_del:routineDeleted,bazi_habit_cfg:habitCfg,bazi_habit_log:habitLog,bazi_habit_del:habitDeleted,bazi_todo_lists:todoLists,bazi_todo_del:todoDeleted,bazi_promemoria:promemoria,bazi_personal:baziPersonal};
                    try {
                      for (let i=0; i<SYNC_KEYS.length; i++) {
                        await pushKey(authUser.uid, SYNC_KEYS[i], data[SYNC_KEYS[i]]);
                        setSyncMsg(`Caricamento ${Math.round((i+1)/SYNC_KEYS.length*100)}%…`);
                      }
                      localStorage.setItem('bazi_last_push',Date.now().toString());
                      const now=new Date(); setSyncStatus("synced"); setSyncMsg(`Sincronizzato alle ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
                    } catch { setSyncStatus("error"); setSyncMsg("Errore"); }
                    setConflictData(null);
                    if(remoteListenerRef.current) remoteListenerRef.current();
                    remoteListenerRef.current=listenUserData(authUser.uid,(k,v)=>{ if(allSetters.current?.[k]) allSetters.current[k](v); });
                  }} style={{padding:"11px",fontSize:13,background:"var(--bg-card)",color:"var(--text)",border:"0.5px solid var(--border-ter)",borderRadius:8,cursor:"pointer"}}>
                    Sovrascrivi cloud con locale
                  </button>
                </>
              )}
              <button onClick={()=>{ setConflictData(null); setSyncStatus("offline"); setSyncMsg("Offline — scegli in un secondo momento"); }} style={{padding:"10px",fontSize:12,background:"transparent",color:"var(--text-ter)",border:"0.5px solid var(--border-ter)",borderRadius:8,cursor:"pointer"}}>
                Scegli dopo (continua offline)
              </button>
            </div>
          </div>
        </ModalBox>
      )}

      {/* Modals */}
      {meseModal    && <MeseModal mese={mese} idx={meseIdx} byYear={byYear} onClose={()=>setMeseModal(false)} dark={dark}/>}
      {annoModal    && <AnnoModal anno={anno} byYear={byYear} onClose={()=>setAnnoModal(false)} dark={dark}/>}
      {/* ElementoModal rimosso — ora in Ba-Zi → 🗂 Info → 五行 */}
      {ekModal      && <EkadashiModal onClose={()=>setEkModal(false)} dark={dark}/>}
      {moonBodyModal && <MoonBodyModal currentPhase={moonName(moonPhase(oggi))} currentZodiac={lunaZodiac(oggi)} onClose={()=>setMoonBodyModal(false)} dark={dark}/>}
      {agriModal && <AgricolturaModal meseGrego={mese.start.getMonth()} moonPhaseStr={moonName(moonPhase(oggi))} zodiacIdx={lunaZodiac(oggi)} onClose={()=>setAgriModal(false)} dark={dark}/>}

      {/* Onboarding — primo avvio o da impostazioni */}
      {(!cfg.onboardingDone || onboardingOpen) && (
        <OnboardingModal
          cfg={cfg} setCfg={setCfg}
          baziPersonal={baziPersonal} setBaziPersonal={setBaziPersonal}
          onClose={()=>setOnboardingOpen(false)}
          dark={dark}
        />
      )}
    </div>
    </LC.Provider>
  );
}
