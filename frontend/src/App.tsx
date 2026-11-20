import {useEffect,useMemo,useState} from 'react';
import {AnimatePresence,motion} from 'framer-motion';
import {ComposableMap,Geographies,Geography,ZoomableGroup} from 'react-simple-maps';
import {Activity,ArrowDownRight,ArrowUpRight,ChevronDown,Command,Database,Download,Info,MapPin,Moon,Search,Shield,Sun} from 'lucide-react';
import {Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip as ChartTooltip,XAxis,YAxis} from 'recharts';

type StateRow={state_ut:string;category:string;cases:number};
type Overview={year:number;state_cases:number;ut_cases:number;total_cases:number;jurisdictions:number};
const GEO_URL='https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson';
const aliases:Record<string,string>={'Andaman and Nicobar':'Andaman and Nicobar Islands','Andaman & Nicobar Islands':'Andaman and Nicobar Islands','Dadra and Nagar Haveli':'Dadra and Nagar Haveli and Daman and Diu','Daman and Diu':'Dadra and Nagar Haveli and Daman and Diu','NCT of Delhi':'Delhi','Jammu & Kashmir':'Jammu and Kashmir','Orissa':'Odisha','Uttaranchal':'Uttarakhand'};
const fmt=(n:number)=>new Intl.NumberFormat('en-IN').format(n||0);
const norm=(s:string)=>aliases[s]||s;
const api=async<T,>(path:string):Promise<T>=>{const r=await fetch(`http://localhost:8000${path}`);if(!r.ok)throw new Error(`API error ${r.status}`);return r.json();};
export default function App(){
 const [year,setYear]=useState(2024),[rows,setRows]=useState<StateRow[]>([]),[overview,setOverview]=useState<Overview|null>(null),[selected,setSelected]=useState('Telangana'),[dark,setDark]=useState(true),[query,setQuery]=useState(''),[mapError,setMapError]=useState(false),[loading,setLoading]=useState(true);
 useEffect(()=>{setLoading(true);Promise.all([api<{states:StateRow[]}>(`/api/states?year=${year}`),api<Overview>(`/api/overview?year=${year}`)]).then(([a,b])=>{setRows(a.states);setOverview(b);}).catch(()=>setRows([])).finally(()=>setLoading(false));},[year]);
 const chosen=rows.find(x=>x.state_ut===selected);
 const sorted=useMemo(()=>rows.filter(x=>x.state_ut.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>b.cases-a.cases),[rows,query]);
 const trend=useMemo(()=>[2020,2021,2022,2023,2024].map(y=>({year:String(y),cases:rows.reduce((sum,r)=>sum+r.cases,0)})),[rows]);
 const max=Math.max(...rows.map(x=>x.cases),1);
 const selectByGeo=(geo:any)=>{const n=geo.properties?.ST_NM||geo.properties?.st_nm||geo.properties?.NAME_1||geo.properties?.name; if(n){const match=rows.find(r=>r.state_ut===norm(n));if(match)setSelected(match.state_ut);}};
 const download=()=>{const csv=['state_ut,category,year,cases',...rows.map(r=>`${r.state_ut},${r.category},${year},${r.cases}`)].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`india-cyber-crimes-${year}.csv`;a.click();URL.revokeObjectURL(a.href);};
 return <div className={dark?'app dark':'app light'}>
  <header className="topbar"><div className="brand"><div className="brand-mark"><Shield size={20}/></div><div><strong>INDIA / CYBER INTELLIGENCE</strong><small>PUBLIC DATA OBSERVATORY</small></div></div><div className="top-right"><span className="source-dot"/> NCRB DATASET <span className="top-divider"/><button className="icon-btn" onClick={()=>setDark(!dark)} title="Toggle theme">{dark?<Sun size={17}/>:<Moon size={17}/>}</button></div></header>
  <div className="flag-line"><i/><i/><i/></div>
  <main className="main">
   <section className="intro"><div><div className="eyebrow"><span/> NATIONAL OVERVIEW <span className="eyebrow-line"/></div><h1>Cybercrime across<br/><em>India, mapped.</em></h1><p>Explore registered cybercrime cases across every state and Union Territory. Compare five years of official NCRB data.</p></div><div className="year-picker"><label>REPORTING YEAR</label><div className="year-options">{[2020,2021,2022,2023,2024].map(y=><button key={y} className={year===y?'active':''} onClick={()=>setYear(y)}>{y}</button>)}</div></div></section>
   <section className="metrics">
    <div className="metric primary"><span className="metric-label">TOTAL REGISTERED CASES <Info size={13}/></span><strong>{loading?'—':fmt(overview?.total_cases||0)}</strong><small>Across 28 states + 8 UTs · {year}</small></div>
    <div className="metric"><span className="metric-label">STATES</span><strong>{fmt(overview?.state_cases||0)}</strong><small>28 state jurisdictions</small></div>
    <div className="metric"><span className="metric-label">UNION TERRITORIES</span><strong>{fmt(overview?.ut_cases||0)}</strong><small>8 UT jurisdictions</small></div>
    <div className="metric"><span className="metric-label">JURISDICTIONS</span><strong>36</strong><small>Complete national coverage</small></div>
   </section>
   <section className="map-layout">
    <div className="map-panel">
     <div className="panel-head"><div><span className="section-index">01 / GEOGRAPHIC DISTRIBUTION</span><h2>State-wise case intensity</h2></div><div className="map-tools"><span className="live-label"><i/> OFFICIAL RECORDS</span><button className="export-btn" onClick={download}><Download size={14}/> Export</button></div></div>
     <div className="map-stage">
      <div className="map-watermark">INDIA</div>
      <div className="map-flag-watermark"><span/><span/><span/></div>
      <div className="map-wrap">
       <ComposableMap projection="geoMercator" projectionConfig={{scale:1050,center:[82.8,23.5]}} width={800} height={650} style={{width:'100%',height:'100%'}}>
        <ZoomableGroup center={[82.8,23.5]} zoom={1}>
         <Geographies geography={GEO_URL}>
          {({geographies})=>geographies.map((geo:any)=>{
           const raw=geo.properties?.ST_NM||geo.properties?.st_nm||geo.properties?.NAME_1||geo.properties?.name||'';
           const match=rows.find(r=>r.state_ut===norm(raw));
           const intensity=match?match.cases/max:0;
           const active=match?.state_ut===selected;
           return <Geography key={geo.rsmKey} geography={geo} onClick={()=>selectByGeo(geo)}
            style={{default:{fill:active?'#f0a34a':intensity>.65?'#b95f48':intensity>.3?'#d58a58':intensity>.08?'#e5b77f':'#d9d5ca',stroke:dark?'#18232b':'#fffaf2',strokeWidth:1.1,outline:'none',filter:active?'drop-shadow(0 0 7px rgba(240,163,74,.65))':'none'},hover:{fill:'#f2bd78',stroke:'#fff',strokeWidth:1.5,outline:'none',cursor:'pointer'},pressed:{fill:'#efaa57',outline:'none'}}}
            onMouseEnter={()=>match&&setSelected(match.state_ut)}/>;
          })}
         </Geographies>
        </ZoomableGroup>
       </ComposableMap>
      </div>
      {mapError&&<div className="map-warning">Map boundaries could not load. Check your internet connection. State figures remain available in the list.</div>}
      <div className="map-caption">SELECT A STATE OR UT TO INSPECT ITS RECORDS <span>•</span> {year}</div>
      <div className="legend"><small>LOWER</small><i className="l1"/><i className="l2"/><i className="l3"/><i className="l4"/><small>HIGHER CASE COUNT</small></div>
     </div>
     <div className="map-foot"><span><b>DATA NOTE</b> Colour scale is relative to the highest reported jurisdiction in the selected year.</span><span>Not a measure of population-adjusted risk.</span></div>
    </div>
    <aside className="detail-panel">
     <div className="detail-top"><span className="section-index">02 / JURISDICTION PROFILE</span><MapPin size={16}/></div>
     <AnimatePresence mode="wait"><motion.div key={selected+year} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.22}}>
      <div className="detail-type">{chosen?.category==='Union Territory'?'UNION TERRITORY':'STATE'} · {year}</div><h2>{selected||'Select a state'}</h2><div className="detail-count">{fmt(chosen?.cases||0)}</div><div className="detail-sub">REGISTERED CYBERCRIME CASES</div>
      <div className="detail-bar"><motion.div initial={{width:0}} animate={{width:`${(chosen?.cases||0)/max*100}%`}} transition={{duration:.65,ease:'easeOut'}}/></div>
      <div className="detail-comparison"><span>Relative to highest</span><b>{chosen?((chosen.cases/max)*100).toFixed(1):'0.0'}%</b></div>
     </motion.div></AnimatePresence>
     <div className="detail-note"><Info size={15}/><span>These are registered cases, not complaint counts, convictions, or a direct measure of actual prevalence.</span></div>
     <div className="mini-chart-head"><span>JURISDICTION RANK</span><b>#{sorted.findIndex(x=>x.state_ut===selected)+1} / 36</b></div>
     <div className="rank-list">{sorted.slice(0,5).map((r,i)=><button key={r.state_ut} className={r.state_ut===selected?'rank active':'rank'} onClick={()=>setSelected(r.state_ut)}><span className="rank-num">0{i+1}</span><span className="rank-name">{r.state_ut}</span><b>{fmt(r.cases)}</b></button>)}</div>
    </aside>
   </section>
   <section className="lower-grid">
    <div className="list-panel"><div className="panel-head"><div><span className="section-index">03 / ALL JURISDICTIONS</span><h2>Explore state records</h2></div><div className="search-box"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a state or UT"/></div></div><div className="state-table"><div className="table-head"><span>JURISDICTION</span><span>TYPE</span><span>REGISTERED CASES</span></div>{sorted.map((r,i)=><button key={r.state_ut} className={r.state_ut===selected?'table-row selected':'table-row'} onClick={()=>setSelected(r.state_ut)}><span><i className="table-rank">{String(i+1).padStart(2,'0')}</i>{r.state_ut}</span><span>{r.category==='State'?'State':'UT'}</span><b>{fmt(r.cases)}</b></button>)}</div></div>
    <div className="trend-panel"><div className="panel-head"><div><span className="section-index">04 / NATIONAL TREND</span><h2>Five-year context</h2></div></div><div className="trend-big">{fmt(overview?.total_cases||0)}<small> cases in {year}</small></div><div className="trend-chart"><ResponsiveContainer width="100%" height={210}><AreaChart data={[{year:'2020',cases:50035},{year:'2021',cases:52974},{year:'2022',cases:65893},{year:'2023',cases:86420},{year:'2024',cases:101928}]}><defs><linearGradient id="fillCases" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d58a58" stopOpacity={.35}/><stop offset="100%" stopColor="#d58a58" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--grid)"/><XAxis dataKey="year" tickLine={false} axisLine={false} tick={{fill:'var(--muted)',fontSize:11}}/><YAxis hide/><ChartTooltip contentStyle={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)'}} formatter={(v:any)=>[fmt(Number(v)),'Cases']}/><Area type="monotone" dataKey="cases" stroke="#d58a58" strokeWidth={2.5} fill="url(#fillCases)" animationDuration={800}/></AreaChart></ResponsiveContainer></div><p className="trend-foot">National totals: 50,035 (2020) · 101,928 (2024). Changes in registered cases do not alone establish changes in underlying crime prevalence.</p></div>
   </section>
   <footer><div className="footer-brand"><Shield size={15}/> INDIA CYBER INTELLIGENCE</div><span>Source: NCRB, Crime in India · Ministry of Home Affairs / Press Information Bureau · 21 July 2026</span><a href="https://www.pib.gov.in/PressReleasePage.aspx?PRID=2287039&lang=1&reg=3" target="_blank" rel="noreferrer">View source ↗</a></footer>
  </main>
 </div>
}