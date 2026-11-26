const API="https://api.coingecko.com/api/v3";
const MARKET_LIMIT=250;
// For production, replace this with your own Solana RPC/indexer URL.
// Never put a private key or seed phrase in this file.
const SOLANA_RPC="https://api.mainnet-beta.solana.com";
let coins=[],priceChart=null,chartPrices=[],watchlist=[],trackedWallets=[],activeWallet=null,busy=false;
const $=id=>document.getElementById(id);
const safe=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=(v,d=2)=>v==null||!Number.isFinite(Number(v))?"—":Number(v).toLocaleString("en-US",{maximumFractionDigits:d});
const money=v=>v==null||!Number.isFinite(Number(v))?"—":"$"+Number(v).toLocaleString("en-US",{notation:"compact",maximumFractionDigits:2});
const price=v=>v==null||!Number.isFinite(Number(v))?"—":"$"+Number(v).toLocaleString("en-US",{minimumFractionDigits:Number(v)<1?4:2,maximumFractionDigits:Number(v)<1?8:2});
const pct=v=>v==null||!Number.isFinite(Number(v))?"—":`${Number(v)>=0?"+":""}${Number(v).toFixed(2)}%`;
const supply=v=>v==null||!Number.isFinite(Number(v))?"—":Number(v).toLocaleString("en-US",{notation:"compact",maximumFractionDigits:3});
const toast=msg=>{const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),2600)};
async function getJSON(url){const r=await fetch(url);if(!r.ok)throw Error(r.status===429?"CoinGecko rate limit. Wait a moment and retry.":`Request failed (${r.status})`);return r.json()}
async function rpc(method,params){const r=await fetch(SOLANA_RPC,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});if(!r.ok)throw Error(`Solana RPC error (${r.status})`);const j=await r.json();if(j.error)throw Error(j.error.message||"Solana RPC error");return j.result}
function setConnection(s){$("connection").textContent=s;$("connectionDot").className=s==="Connected"?"ok":s==="Connection issue"?"bad":""}
function loadLocal(){try{watchlist=JSON.parse(localStorage.getItem("cr_watch")||"[]");trackedWallets=JSON.parse(localStorage.getItem("cr_wallets")||"[]");if(!Array.isArray(watchlist))watchlist=[];if(!Array.isArray(trackedWallets))trackedWallets=[]}catch{watchlist=[];trackedWallets=[]}}
function saveLocal(){localStorage.setItem("cr_watch",JSON.stringify(watchlist));localStorage.setItem("cr_wallets",JSON.stringify(trackedWallets))}
function updateGlobal(data){$("marketCap").textContent=money(data.total_market_cap?.usd);$("volume").textContent=money(data.total_volume?.usd);$("btcDominance").textContent=num(data.market_cap_percentage?.btc,1)+"%";const c=data.market_cap_change_percentage_24h_usd;$("marketCapChange").textContent=pct(c)+" over 24h";$("marketCapChange").className=Number(c)>=0?"positive":"negative"}
function coinRow(c,watch=false){const ch=Number(c.price_change_percentage_24h||0);return `<tr><td>${c.market_cap_rank??"—"}</td><td><div class="coin-info"><img src="${safe(c.image)}" alt="" loading="lazy"><div><strong>${safe(c.name)}</strong><small>${safe(c.symbol).toUpperCase()}</small></div></div></td><td>${price(c.current_price)}</td><td class="${ch>=0?"positive":"negative"}">${pct(ch)}</td><td>${money(c.market_cap)}</td><td>${money(c.total_volume)}</td><td><button class="watch-button" data-watch="${safe(c.id)}" title="Toggle watchlist">${watchlist.includes(c.id)?"★":"☆"}</button></td></tr>`}
function renderMarkets(){let list=[...coins],q=$("searchInput").value.trim().toLowerCase(),cat=$("categoryFilter").value,sort=$("sortBy").value;list=list.filter(c=>c.name.toLowerCase().includes(q)||c.symbol.toLowerCase().includes(q));if(cat==="large")list=list.filter(c=>c.market_cap_rank<=20);if(cat==="mid")list=list.filter(c=>c.market_cap_rank>20&&c.market_cap_rank<=100);if(cat==="small")list=list.filter(c=>c.market_cap_rank>100);if(cat==="gainers")list.sort((a,b)=>(b.price_change_percentage_24h||0)-(a.price_change_percentage_24h||0));if(cat==="losers")list.sort((a,b)=>(a.price_change_percentage_24h||0)-(b.price_change_percentage_24h||0));if(sort==="market_cap_desc")list.sort((a,b)=>(b.market_cap||0)-(a.market_cap||0));if(sort==="market_cap_asc")list.sort((a,b)=>(a.market_cap||0)-(b.market_cap||0));if(sort==="volume_desc")list.sort((a,b)=>(b.total_volume||0)-(a.total_volume||0));if(sort==="change_desc")list.sort((a,b)=>(b.price_change_percentage_24h||0)-(a.price_change_percentage_24h||0));if(sort==="change_asc")list.sort((a,b)=>(a.price_change_percentage_24h||0)-(b.price_change_percentage_24h||0));$("coinTable").innerHTML=list.length?list.map(c=>coinRow(c)).join(""):`<tr><td colspan="7" class="empty">No matching assets.</td></tr>`;$("marketCount").textContent=`${list.length} assets`;$("coinCount").textContent=coins.length}
function renderWatch(){const list=watchlist.map(id=>coins.find(c=>c.id===id)).filter(Boolean);$("watchlistTable").innerHTML=list.length?list.map(c=>`<tr><td><div class="coin-info"><img src="${safe(c.image)}" alt=""><div><strong>${safe(c.name)}</strong><small>${safe(c.symbol).toUpperCase()}</small></div></div></td><td>${price(c.current_price)}</td><td class="${Number(c.price_change_percentage_24h)>=0?"positive":"negative"}">${pct(c.price_change_percentage_24h)}</td><td>${money(c.market_cap)}</td><td><button class="remove-button" data-remove="${safe(c.id)}">Remove</button></td></tr>`).join(""):`<tr><td colspan="5" class="empty">Your watchlist is empty.</td></tr>`}
function toggleWatch(id){watchlist=watchlist.includes(id)?watchlist.filter(x=>x!==id):[...watchlist,id];saveLocal();renderMarkets();renderWatch();toast(watchlist.includes(id)?"Added to watchlist":"Removed from watchlist")}
function fillSelectors(){const opts=coins.map(c=>`<option value="${safe(c.id)}">${safe(c.name)} (${safe(c.symbol.toUpperCase())})</option>`).join("");const old=$("chartCoin").value||"bitcoin",oldR=$("researchCoin").value;$("chartCoin").innerHTML=opts;$("researchCoin").innerHTML='<option value="">Choose an asset…</option>'+opts;$("chartCoin").value=coins.some(c=>c.id===old)?old:"bitcoin";if(oldR&&coins.some(c=>c.id===oldR))$("researchCoin").value=oldR}
function ema(values,period){let out=Array(values.length).fill(null),k=2/(period+1),seed=values.slice(0,period);if(seed.length<period)return out;let prev=seed.reduce((a,b)=>a+b,0)/period;out[period-1]=prev;for(let i=period;i<values.length;i++){prev=values[i]*k+prev*(1-k);out[i]=prev}return out}
function rsi(values,p=14){let out=Array(values.length).fill(null);if(values.length<=p)return out;let gains=0,loss=0;for(let i=1;i<=p;i++){let d=values[i]-values[i-1];gains+=Math.max(d,0);loss+=Math.max(-d,0)}let ag=gains/p,al=loss/p;out[p]=al===0?100:100-100/(1+ag/al);for(let i=p+1;i<values.length;i++){let d=values[i]-values[i-1];ag=(ag*(p-1)+Math.max(d,0))/p;al=(al*(p-1)+Math.max(-d,0))/p;out[i]=al===0?100:100-100/(1+ag/al)}return out}
function bollinger(values,p=20){let mid=Array(values.length).fill(null),up=[...mid],lo=[...mid];for(let i=p-1;i<values.length;i++){let a=values.slice(i-p+1,i+1),m=a.reduce((x,y)=>x+y,0)/p,sd=Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/p);mid[i]=m;up[i]=m+2*sd;lo[i]=m-2*sd}return{mid,up,lo}}
function drawChart(){const values=chartPrices.map(p=>p.y),labels=chartPrices.map(p=>new Date(p.x).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit"}));const e=ema(values,20),b=bollinger(values),last=values.at(-1),rv=rsi(values).filter(v=>v!==null).at(-1),macdLine=ema(values,12).map((v,i)=>v==null||ema(values,26)[i]==null?null:v-ema(values,26)[i]),signal=ema(macdLine.map(v=>v??0),9),mv=macdLine.at(-1),sv=signal.at(-1);$("rsiValue").textContent=rv==null?"—":num(rv,1);$("rsiLabel").textContent=rv==null?"Not enough history":rv>=70?"Overbought zone":rv<=30?"Oversold zone":"Neutral momentum";$("macdValue").textContent=mv==null?"—":num(mv,4);$("macdLabel").textContent=mv==null?"Not enough history":mv>=sv?"MACD above signal":"MACD below signal";$("emaValue").textContent=e.at(-1)==null?"—":price(e.at(-1));const recent=values.slice(-20),mean=recent.reduce((a,b)=>a+b,0)/recent.length,sd=Math.sqrt(recent.reduce((a,b)=>a+(b-mean)**2,0)/recent.length);$("volValue").textContent=mean?num(sd/mean*100,2)+"%":"—";
const sets=[{label:"Price",data:values,borderColor:"#72aaff",borderWidth:2,pointRadius:0,tension:.25}];if($("showEma").checked)sets.push({label:"EMA 20",data:e,borderColor:"#e8b66c",borderWidth:1.5,pointRadius:0,borderDash:[5,4],spanGaps:true});if($("showBands").checked){sets.push({label:"Upper band",data:b.up,borderColor:"#9a8cff",borderWidth:1,pointRadius:0,spanGaps:true});sets.push({label:"Lower band",data:b.lo,borderColor:"#9a8cff",borderWidth:1,pointRadius:0,spanGaps:true})}
if(priceChart){priceChart.data.labels=labels;priceChart.data.datasets=sets;priceChart.update()}else priceChart=new Chart($("priceChart"),{type:"line",data:{labels,datasets:sets},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{labels:{color:"#a8b7ca",boxWidth:18,font:{size:10}}},tooltip:{backgroundColor:"#101a29",borderColor:"#385578",borderWidth:1,callbacks:{label:c=>`${c.dataset.label}: ${price(c.raw)}`}}},scales:{x:{ticks:{color:"#8091aa",maxTicksLimit:8,maxRotation:0},grid:{display:false}},y:{position:"right",ticks:{color:"#8091aa",callback:v=>"$"+Number(v).toLocaleString("en-US",{notation:"compact"})},grid:{color:"#ffffff10"}}}}});}
async function loadChart(){const id=$("chartCoin").value||"bitcoin",days=$("chartDays").value;const coin=coins.find(c=>c.id===id);$("chartTitle").textContent=`${coin?.symbol.toUpperCase()||id} / USD`;$("chartSubtitle").textContent=`${days==="1"?"24-hour":days+"-day"} price history · EMA, RSI, MACD and Bollinger calculations`;const result=await getJSON(`${API}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`);chartPrices=(result.prices||[]).map(([x,y])=>({x:Number(x),y:Number(y)}));if(chartPrices.length<30)throw Error("Not enough historical points for all indicators");drawChart()}
function research(id){const c=coins.find(x=>x.id===id);$("researchEmpty").hidden=!!c;$("researchContent").hidden=!c;if(!c)return;const cap=Number(c.market_cap),fdv=Number(c.fully_diluted_valuation),vol=Number(c.total_volume),cir=Number(c.circulating_supply),total=Number(c.total_supply),max=Number(c.max_supply),fdvRatio=cap>0&&fdv>0?fdv/cap:null,share=cir>0?(max>0?cir/max:total>0?cir/total:null):null,turn=cap>0?vol/cap:null;
$("researchImage").src=c.image;$("researchName").textContent=c.name;$("researchSymbol").textContent=c.symbol.toUpperCase();$("rCap").textContent=money(cap);$("rFdv").textContent=money(fdv);$("rFdvRatio").textContent=fdvRatio?num(fdvRatio,2)+"x":"—";$("rTurnover").textContent=turn==null?"—":num(turn*100,2)+"%";$("rCirculating").textContent=supply(c.circulating_supply);$("rSupplyShare").textContent=share==null?"—":num(share*100,1)+"%";
$("rRevenue").textContent="Not linked";$("rRevenueNote").textContent="Choose a protocol below to compare reported revenue";$("rMultiple").textContent="—";setRevenueResearchDefaults("Not linked");
populateResearchProtocolOptions(c);
const notes=[];if(fdvRatio!=null){if(fdvRatio>3)notes.push("Fully diluted valuation is more than three times current market cap. Check vesting, unlocks and future emissions.");else if(fdvRatio>1.5)notes.push("FDV is notably above market cap. Future supply growth could create selling pressure.");else notes.push("FDV is relatively close to current market cap, based on the reported supply fields.")}else notes.push("FDV data is missing or incomplete, so dilution cannot be assessed.");
if(share!=null)notes.push(`${num(share*100,1)}% of the reported maximum or total supply is circulating. Confirm the token's unlock schedule independently.`);else notes.push("A circulating-supply percentage cannot be calculated from the available fields.");
if(turn!=null)notes.push(`24-hour turnover is ${num(turn*100,2)}% of market cap. Trading volume is not the same as real liquidity.`);if(Math.abs(Number(c.price_change_percentage_24h||0))>15)notes.push("The 24-hour price move is unusually large; short-term volatility is elevated.");
notes.push("Market capitalization is not intrinsic value. To judge whether a token is expensive, compare its valuation with real usage, fees, revenue, token-holder value capture, competitors and growth.");$("researchNotes").innerHTML=notes.map(n=>`<li>${safe(n)}</li>`).join("");$("valuationTag").textContent=fdvRatio==null?"Incomplete data":fdvRatio>3?"High dilution ratio":fdvRatio>1.5?"Elevated FDV":"FDV closer to market cap"}
async function loadMarket(){const [market,global]=await Promise.all([getJSON(`${API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${MARKET_LIMIT}&page=1&sparkline=false&price_change_percentage=24h`),getJSON(`${API}/global`)]);coins=market;updateGlobal(global.data);fillSelectors();renderMarkets();renderWatch();if($("researchCoin").value)research($("researchCoin").value)}
async function refresh(show=false){if(busy)return;busy=true;$("status").textContent="Refreshing market data…";setConnection("Connecting…");try{await loadMarket();setConnection("Connected");$("status").textContent="Last updated: "+new Date().toLocaleTimeString();if(show)toast("Market data updated")}catch(e){console.error(e);setConnection("Connection issue");$("status").textContent=e.message;if(show)toast(e.message)}finally{busy=false}}
function renderWallets(){const body=$("walletTable");body.innerHTML=trackedWallets.length?trackedWallets.map((w,i)=>`<tr><td><button class="wallet-address" data-wallet="${i}">${safe(w.address.slice(0,5)+"…"+w.address.slice(-5))}</button></td><td>${safe(w.label||"Unlabelled")}</td><td>${w.lastActivity?safe(new Date(w.lastActivity).toLocaleString()):"Not checked"}</td><td>${w.txCount??"—"}</td><td><button class="remove-button" data-wallet-remove="${i}">Remove</button></td></tr>`).join(""):`<tr><td colspan="5" class="empty">No wallets tracked yet.</td></tr>`}
function validSolanaAddress(s){return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)}
async function refreshWallet(index){const w=trackedWallets[index];if(!w)return;const activity=$("walletActivity");activity.innerHTML='<span class="muted">Checking recent wallet activity…</span>';try{const sigs=await rpc("getSignaturesForAddress",[w.address,{limit:10}]);w.txCount=sigs.length;w.lastActivity=sigs[0]?.blockTime?new Date(sigs[0].blockTime*1000).toISOString():null;saveLocal();renderWallets();activeWallet=index;if(!sigs.length){activity.innerHTML='<span class="muted">No recent transactions returned by the RPC endpoint.</span>';return}activity.innerHTML=sigs.map(s=>`<div class="activity-item"><span>${s.blockTime?new Date(s.blockTime*1000).toLocaleString():"Time unavailable"} · ${s.err?"Failed":"Confirmed"}</span><span><a href="https://solscan.io/tx/${encodeURIComponent(s.signature)}" target="_blank" rel="noopener">View transaction ↗</a> · <span class="${s.err?"negative":"positive"}">${safe(s.signature.slice(0,10))}…</span></span></div>`).join("")}catch(e){activity.innerHTML=`<span class="muted">${safe(e.message)}. Try again later or configure a dedicated RPC endpoint.</span>`}}


function populateResearchProtocolOptions(coin) {
  const select=$("researchProtocolMatch");
  if(!select)return;
  const old=select.value;
  const matches=protocolRows.filter(p=>{
    const direct=p.gecko_id===coin.id;
    const sameSymbol=String(p.symbol||"").toLowerCase()===String(coin.symbol||"").toLowerCase();
    const nameMatch=String(p.name||"").toLowerCase()===String(coin.name||"").toLowerCase();
    return direct||sameSymbol||nameMatch;
  }).sort((a,b)=>{
    const ad=a.gecko_id===coin.id?1:0,bd=b.gecko_id===coin.id?1:0;
    return bd-ad||String(a.name).localeCompare(String(b.name));
  });
  select.innerHTML='<option value="">Choose a matching protocol (optional)…</option>'+
    matches.map(p=>`<option value="${safe(p.slug||p.module||p.name)}">${safe(p.name)} · ${safe(p.category||"Protocol")} · ${(p.chains||[]).length} networks</option>`).join("");
  if(!matches.length)select.innerHTML+='<option value="" disabled>No obvious match found — use Protocol Research below</option>';
  if(old&&matches.some(p=>(p.slug||p.module||p.name)===old))select.value=old;
}
function setRevenueResearchDefaults(status="Not linked") {
  ["r30dAvg","rAnnualized","rTrend","rHolderRevenue"].forEach(id=>$(id).textContent="—");
  $("rDataQuality").textContent=status;
  $("rValuationSignal").textContent="Link a protocol to review revenue history. No fair-value estimate is made when token value capture cannot be verified.";
}
function summarizeRevenueHistory(rows) {
  const clean=(rows||[]).map(row=>({time:Number(row[0]),value:Number(row[1])})).filter(x=>Number.isFinite(x.time)&&Number.isFinite(x.value)&&x.value>=0).sort((a,b)=>a.time-b.time);
  if(clean.length<30)return {clean,avg30:null,previous30:null,growth:null};
  const recent=clean.slice(-30),previous=clean.slice(-60,-30);
  const average=a=>a.length?a.reduce((sum,x)=>sum+x.value,0)/a.length:null;
  const avg30=average(recent),previous30=average(previous);
  const growth=previous30>0&&avg30!=null?(avg30/previous30-1)*100:null;
  return {clean,avg30,previous30,growth};
}
async function loadAssetRevenueComparison(slug) {
  const coin=coins.find(c=>c.id===$("researchCoin").value);
  const protocol=protocolRows.find(p=>protocolKey(p.slug||p.module||p.name)===protocolKey(slug));
  if(!coin||!protocol)return;
  $("rRevenue").textContent="Loading…";
  $("rRevenueNote").textContent=`Checking ${protocol.name} revenue data`;
  $("rMultiple").textContent="—";
  setRevenueResearchDefaults("Loading data");
  try {
    const endpoint=`${LLAMA_API}/summary/fees/${encodeURIComponent(protocol.slug||protocol.module)}`;
    const [result,holderResult]=await Promise.all([
      getJSON(`${endpoint}?dataType=dailyRevenue`),
      getJSON(`${endpoint}?dataType=dailyHoldersRevenue`).catch(()=>null)
    ]);
    if($("researchCoin").value!==coin.id||$("researchProtocolMatch").value!==slug)return;
    const daily=Number(result.total24h);
    const history=summarizeRevenueHistory(result.totalDataChart||result.totalDataChartBreakdown||[]);
    const hasDaily=Number.isFinite(daily)&&daily>=0;
    $("rRevenue").textContent=hasDaily?money(daily):"Not reported";
    $("rRevenueNote").textContent=`${protocol.name} · reported 24h protocol revenue`;
    $("rMultiple").textContent=hasDaily&&daily>0&&coin.market_cap>0?num(coin.market_cap/(daily*365),2)+"x":"—";
    if(history.avg30!=null){
      $("r30dAvg").textContent=money(history.avg30);
      $("rAnnualized").textContent=money(history.avg30*365);
      if(history.growth==null){$("rTrend").textContent="Baseline unavailable";}
      else {$("rTrend").textContent=pct(history.growth);$("rTrend").className=history.growth>=0?"positive":"negative";}
    } else {
      $("r30dAvg").textContent="Insufficient history";
      $("rAnnualized").textContent="—";
      $("rTrend").textContent="—";
    }
    const holder=Number(holderResult?.total24h);
    $("rHolderRevenue").textContent=Number.isFinite(holder)&&holder>=0?money(holder):"Not reported";
    const hasHistory=history.clean.length>=30;
    $("rDataQuality").textContent=hasDaily&&hasHistory?"Revenue data available":hasDaily?"Limited history":"Partial data";
    const multiple=history.avg30>0&&coin.market_cap>0?coin.market_cap/(history.avg30*365):null;
    $("rValuationSignal").textContent=multiple==null
      ? "Revenue history or market-cap inputs are incomplete. A reliable revenue multiple cannot be calculated."
      : `Context only: ${num(multiple,2)}x market cap / annualized 30-day protocol revenue. This is not a fair-value estimate; it assumes no token-holder entitlement and should be compared with similar protocols.`;
    const notes=[];
    notes.push(`${protocol.name} is manually linked to ${coin.name}. Verify the relationship between the protocol and token independently.`);
    if(history.growth!=null)notes.push(`Average daily protocol revenue changed ${pct(history.growth)} versus the preceding 30-day period. This describes protocol revenue, not token price performance.`);
    else notes.push("The source did not provide enough daily observations to calculate a 30-day revenue trend.");
    if(!Number.isFinite(holder)||holder<0)notes.push("Holder revenue was not reported. Protocol revenue must not be treated as income received by token holders.");
    notes.push("The annualized run-rate extrapolates recent revenue and is not a forecast. A one-day or 30-day revenue multiple is not a standalone buy/sell signal.");
    $("researchNotes").innerHTML=notes.map(n=>`<li>${safe(n)}</li>`).join("");
  } catch(error) {
    $("rRevenue").textContent="Unavailable";
    $("rRevenueNote").textContent="The protocol revenue endpoint could not be reached";
    $("rMultiple").textContent="—";
    setRevenueResearchDefaults("Data unavailable");
  }
}

/* MULTI-CHAIN PROTOCOL RESEARCH */
const LLAMA_API = "https://api.llama.fi";
let protocolRows = [], feeRows = [], activeProtocol = null;

const protocolKey = value => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
const protocolRevenue = p => {
  const v = Number(p?.total24h ?? p?.total24hRevenue ?? p?.revenue24h);
  return Number.isFinite(v) && v >= 0 ? v : null;
};
const protocolTVL = p => {
  const v = Number(p?.tvl);
  return Number.isFinite(v) && v >= 0 ? v : null;
};
function mergeProtocolData(protocols, revenues) {
  const revenueMap = new Map();
  (revenues || []).forEach(item => {
    [item.slug, item.name, item.module, item.id].filter(Boolean).forEach(k => revenueMap.set(protocolKey(k), item));
  });
  return (protocols || []).map(p => {
    const candidates = [p.slug, p.name, p.module, p.id].filter(Boolean);
    let revenue = null;
    for (const candidate of candidates) {
      revenue = revenueMap.get(protocolKey(candidate));
      if (revenue) break;
    }
    return {...p, revenue24h: protocolRevenue(revenue), revenueSource: revenue || null};
  });
}
function populateProtocolFilters() {
  const chains = [...new Set(protocolRows.flatMap(p => p.chains || []))].sort((a,b)=>a.localeCompare(b));
  const categories = [...new Set(protocolRows.map(p=>p.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const chainSelect = $("protocolChain"), categorySelect = $("protocolCategory");
  const oldChain = chainSelect.value, oldCategory = categorySelect.value;
  chainSelect.innerHTML = '<option value="all">All networks</option>' + chains.map(c=>`<option value="${safe(c)}">${safe(c)}</option>`).join("");
  categorySelect.innerHTML = '<option value="all">All categories</option>' + categories.map(c=>`<option value="${safe(c)}">${safe(c)}</option>`).join("");
  if (chains.includes(oldChain)) chainSelect.value = oldChain;
  if (categories.includes(oldCategory)) categorySelect.value = oldCategory;
  $("protocolCount").textContent = protocolRows.length.toLocaleString("en-US");
  $("chainCount").textContent = chains.length.toLocaleString("en-US");
  const revTotal = feeRows.reduce((sum,p)=>sum+(protocolRevenue(p)||0),0);
  $("protocolRevenueTotal").textContent = money(revTotal);
}
function renderProtocolTable() {
  const q = $("protocolSearch").value.trim().toLowerCase();
  const chain = $("protocolChain").value, category = $("protocolCategory").value, sort = $("protocolSort").value;
  let list = protocolRows.filter(p => {
    const matchesText = !q || [p.name,p.symbol,p.category].some(v=>String(v||"").toLowerCase().includes(q));
    const matchesChain = chain === "all" || (p.chains||[]).includes(chain);
    const matchesCategory = category === "all" || p.category === category;
    return matchesText && matchesChain && matchesCategory;
  });
  if(sort==="revenue") list.sort((a,b)=>(b.revenue24h??-1)-(a.revenue24h??-1));
  else if(sort==="name") list.sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  else list.sort((a,b)=>(protocolTVL(b)??-1)-(protocolTVL(a)??-1));
  const body=$("protocolTable");
  body.innerHTML=list.length?list.slice(0,250).map(p=>{
    const key=safe(p.slug||p.module||p.name);
    const selected=activeProtocol && protocolKey(activeProtocol.slug||activeProtocol.module||activeProtocol.name)===protocolKey(key);
    const ch=Number(p.change_1d);
    return `<tr data-protocol="${key}" class="${selected?"selected":""}">
      <td><div class="protocol-name-cell"><strong>${safe(p.name)}</strong><small>${safe(p.symbol||p.category||"Protocol")}</small></div></td>
      <td>${safe(p.category||"—")}</td>
      <td><span class="chain-count">${(p.chains||[]).length} networks</span></td>
      <td>${money(p.tvl)}</td>
      <td>${p.revenue24h==null?"—":money(p.revenue24h)}</td>
      <td class="${Number.isFinite(ch)?(ch>=0?"positive":"negative"):""}">${Number.isFinite(ch)?pct(ch):"—"}</td>
    </tr>`;
  }).join(""):`<tr><td colspan="6" class="protocol-row-empty">No protocols match these filters.</td></tr>`;
  $("protocolStatus").textContent=`Showing ${Math.min(list.length,250).toLocaleString("en-US")} of ${list.length.toLocaleString("en-US")} matching protocols`;
}
async function loadProtocolDirectory(showToast=false) {
  $("protocolStatus").textContent="Loading TVL and revenue data…";
  try {
    const [protocolResult,revenueResult] = await Promise.all([
      getJSON(`${LLAMA_API}/protocols`),
      getJSON(`${LLAMA_API}/overview/fees?dataType=dailyRevenue&excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`)
    ]);
    protocolRows=mergeProtocolData(protocolResult,revenueResult.protocols||[]);
    feeRows=revenueResult.protocols||[];
    populateProtocolFilters();
    renderProtocolTable();
    const selectedAsset=coins.find(c=>c.id===$("researchCoin").value);
    if(selectedAsset)populateResearchProtocolOptions(selectedAsset);
    $("protocolStatus").textContent=`Updated ${new Date().toLocaleTimeString("en-US")} · ${protocolRows.length.toLocaleString("en-US")} protocols`;
    if(showToast)toast("Protocol research updated");
  } catch(error) {
    console.error("Protocol research error:",error);
    $("protocolStatus").textContent=`Protocol data unavailable: ${error.message}`;
    $("protocolTable").innerHTML='<tr><td colspan="6" class="protocol-row-empty">Protocol data could not be loaded. Check the connection or try again later.</td></tr>';
    if(showToast)toast("Protocol data could not be refreshed");
  }
}
async function selectProtocol(key) {
  const p=protocolRows.find(x=>protocolKey(x.slug||x.module||x.name)===protocolKey(key));
  if(!p)return;
  activeProtocol=p;
  renderProtocolTable();
  $("protocolDetailName").textContent=p.name||"Protocol";
  $("protocolDetailDescription").textContent=p.description||"Review reported TVL and financial activity. Project-to-token links should be verified before drawing valuation conclusions.";
  $("protocolDetailCategory").textContent=p.category||"Protocol";
  $("pdTvl").textContent=money(p.tvl);
  $("pdFees").textContent="Loading…";
  $("pdRevenue").textContent=p.revenue24h==null?"Not reported":money(p.revenue24h);
  $("pdHolderRevenue").textContent="Loading…";
  $("pdAnnualRevenue").textContent=p.revenue24h==null?"—":money(p.revenue24h*365);
  $("protocolChains").innerHTML=(p.chains||[]).length?p.chains.map(c=>`<span class="chain-pill">${safe(c)}</span>`).join(""):'<span class="muted">No network data reported.</span>';
  const notes=[];
  if(p.revenue24h==null)notes.push("No 24-hour protocol revenue figure was returned for this entry. Missing data is not zero revenue.");
  else notes.push("Reported revenue is a protocol-level metric. It does not prove that the associated token captures that value.");
  notes.push("Fees are amounts paid by users; protocol revenue is the portion retained by the protocol; holder revenue is value distributed to token holders.");
  notes.push("TVL measures assets deposited in the protocol. It is not company revenue, token market capitalization or proof of solvency.");
  $("protocolNotes").innerHTML=notes.map(n=>`<li>${safe(n)}</li>`).join("");
  $("pdMultiple").textContent="Not mapped";
  try {
    const slug=p.slug||p.module;
    if(!slug)throw Error("Protocol slug unavailable");
    const [fees,revenue,holderRevenue]=await Promise.all([
      getJSON(`${LLAMA_API}/summary/fees/${encodeURIComponent(slug)}?dataType=dailyFees`),
      getJSON(`${LLAMA_API}/summary/fees/${encodeURIComponent(slug)}?dataType=dailyRevenue`),
      getJSON(`${LLAMA_API}/summary/fees/${encodeURIComponent(slug)}?dataType=dailyHoldersRevenue`)
    ]);
    if(activeProtocol!==p)return;
    $("pdFees").textContent=fees.total24h==null?"Not reported":money(fees.total24h);
    $("pdRevenue").textContent=revenue.total24h==null?"Not reported":money(revenue.total24h);
    $("pdHolderRevenue").textContent=holderRevenue.total24h==null?"Not reported":money(holderRevenue.total24h);
    const daily=Number(revenue.total24h);
    $("pdAnnualRevenue").textContent=Number.isFinite(daily)&&daily>0?money(daily*365):"—";
    const geckoId=p.gecko_id||revenue.gecko_id||fees.gecko_id;
    const token=geckoId?coins.find(c=>c.id===geckoId):null;
    if(token&&daily>0&&token.market_cap>0){
      $("pdMultiple").textContent=num(token.market_cap/(daily*365),2)+"x";
      $("protocolNotes").innerHTML+=`<li>CoinGecko maps this protocol to ${safe(token.name)} (${safe(token.symbol.toUpperCase())}). The market-cap / annualized-revenue ratio is contextual only, not a token cash-flow valuation.</li>`;
    } else {
      $("pdMultiple").textContent="Not mapped";
      $("protocolNotes").innerHTML+='<li>No direct CoinGecko asset mapping was available for a market-cap comparison.</li>';
    }
    if(revenue.methodology) $("protocolNotes").innerHTML+=`<li>Methodology: ${safe(revenue.methodology)}</li>`;
  } catch(error) {
    console.warn("Protocol detail metrics unavailable:",error);
    $("pdFees").textContent="Not reported";
    $("pdHolderRevenue").textContent="Not reported";
    $("protocolNotes").innerHTML+=`<li>Detailed revenue metrics could not be loaded: ${safe(error.message)}.</li>`;
  }
}
$("protocolTable").addEventListener("click",e=>{const row=e.target.closest("[data-protocol]");if(row)selectProtocol(row.dataset.protocol)});
["protocolSearch","protocolChain","protocolCategory","protocolSort"].forEach(id=>$ (id).addEventListener(id==="protocolSearch"?"input":"change",renderProtocolTable));
$("protocolRefresh").addEventListener("click",()=>loadProtocolDirectory(true));

$("walletForm").addEventListener("submit",e=>{e.preventDefault();const address=$("walletAddress").value.trim(),label=$("walletLabel").value.trim();if(!validSolanaAddress(address)){toast("Enter a valid Solana public address");return}if(trackedWallets.some(w=>w.address===address)){toast("This wallet is already tracked");return}trackedWallets.push({address,label,txCount:null,lastActivity:null});saveLocal();renderWallets();$("walletAddress").value="";$("walletLabel").value="";toast("Wallet added");refreshWallet(trackedWallets.length-1)});
$("walletTable").addEventListener("click",e=>{const b=e.target.closest("[data-wallet]"),r=e.target.closest("[data-wallet-remove]");if(b)refreshWallet(Number(b.dataset.wallet));if(r){trackedWallets.splice(Number(r.dataset.walletRemove),1);saveLocal();renderWallets();$("walletActivity").innerHTML='<span class="muted">Select a tracked wallet to view recent transactions.</span>'}});
$("coinTable").addEventListener("click",e=>{const b=e.target.closest("[data-watch]");if(b)toggleWatch(b.dataset.watch)});$("watchlistTable").addEventListener("click",e=>{const b=e.target.closest("[data-remove]");if(b)toggleWatch(b.dataset.remove)});
["searchInput","categoryFilter","sortBy"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",renderMarkets));
$("researchCoin").addEventListener("change",e=>research(e.target.value));
$("researchProtocolMatch").addEventListener("change",e=>{if(e.target.value)loadAssetRevenueComparison(e.target.value)});$("chartCoin").addEventListener("change",()=>loadChart().catch(e=>toast(e.message)));$("chartDays").addEventListener("change",()=>loadChart().catch(e=>toast(e.message)));["showEma","showBands"].forEach(id=>$(id).addEventListener("change",()=>chartPrices.length&&drawChart()));
$("refreshBtn").addEventListener("click",()=>refresh(true));$("marketRefresh").addEventListener("click",()=>refresh(true));$("menuBtn").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
const workspaceTabs=[...document.querySelectorAll(".nav-item")];
const mobileTabs=[...document.querySelectorAll(".mobile-tab")];
const workspaceSections=workspaceTabs.map(a=>document.querySelector(a.getAttribute("href"))).filter(Boolean);
function activateWorkspaceTab(hash, updateHistory=false){
  const target=workspaceTabs.find(a=>a.getAttribute("href")===(hash||"#overview"))||workspaceTabs[0];
  const sectionId=target.getAttribute("href").slice(1);
  workspaceSections.forEach(section=>{
    const active=section.id===sectionId;
    section.hidden=!active;
    section.classList.toggle("active-view",active);
  });
  workspaceTabs.forEach(a=>{
    const active=a===target;
    a.classList.toggle("active",active);
    if(active)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
  });
  mobileTabs.forEach(a=>{
    const active=a.getAttribute("href")===`#${sectionId}`;
    a.classList.toggle("active",active);
    if(active)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
  });
  $("pageTitle").textContent=target.textContent.trim();
  $("sidebar").classList.remove("open");
  if(updateHistory&&location.hash!==target.getAttribute("href")) history.pushState(null,"",target.getAttribute("href"));
  window.scrollTo({top:0,behavior:"smooth"});
}
workspaceTabs.forEach(a=>a.addEventListener("click",e=>{e.preventDefault();activateWorkspaceTab(a.getAttribute("href"),true)}));
mobileTabs.forEach(a=>a.addEventListener("click",e=>{e.preventDefault();activateWorkspaceTab(a.getAttribute("href"),true)}));
window.addEventListener("hashchange",()=>activateWorkspaceTab(location.hash));
activateWorkspaceTab(location.hash||"#overview");
$("currentDate").textContent=new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"short",day:"numeric"});
loadLocal();renderWallets();refresh().then(()=>{loadChart().catch(e=>{console.error(e);toast("Chart data could not be loaded")});loadProtocolDirectory(false)});setInterval(()=>refresh(false),120000);
