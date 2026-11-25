const API = "https://api.coingecko.com/api/v3";
const REFRESH_INTERVAL = 60000;
const CHART_REFRESH_INTERVAL = 300000;
const MARKET_LIMIT = 100;

let coins = [];
let btcChart = null;
let isLoading = false;
let lastChartUpdate = 0;
let watchlist = [];

const $ = id => document.getElementById(id);

try {
  const stored = JSON.parse(localStorage.getItem("cryptoRealityWatchlist") || "[]");
  watchlist = Array.isArray(stored) ? stored.filter(item => typeof item === "string") : [];
} catch {
  watchlist = [];
}

/* FORMATTING */
const number = (value, digits = 2) => {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) return "--";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
};

const money = value => {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) return "--";
  return "$" + n.toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 2
  });
};

const price = value => {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) return "--";
  return "$" + n.toLocaleString("en-US", {
    minimumFractionDigits: n < 1 ? 4 : 2,
    maximumFractionDigits: n < 1 ? 8 : 2
  });
};

const percent = value => {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) return "--";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};

const supply = value => {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) return "--";
  return n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 3 });
};

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);

/* NOTIFICATIONS */
function showToast(message) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

/* DATE */
if ($("currentDate")) {
  $("currentDate").textContent = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "short", day: "numeric"
  });
}

/* CONNECTION */
function setConnection(status) {
  if ($("connection")) $("connection").textContent = status;
  const dot = $("connectionDot");
  if (!dot) return;
  dot.classList.remove("connected", "disconnected");
  if (status === "Connected") dot.classList.add("connected");
  if (status === "Connection issue") dot.classList.add("disconnected");
}

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit reached. Try again shortly.");
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

/* GLOBAL MARKET */
async function loadGlobalData() {
  const result = await fetchJSON(`${API}/global`);
  const data = result?.data;
  if (!data) throw new Error("Global market data unavailable");

  if ($("marketCap")) $("marketCap").textContent = money(data.total_market_cap?.usd);
  if ($("volume")) $("volume").textContent = money(data.total_volume?.usd);
  if ($("btcDominance")) {
    $("btcDominance").textContent = `${Number(data.market_cap_percentage?.btc || 0).toFixed(1)}%`;
  }

  const change = Number(data.market_cap_change_percentage_24h_usd || 0);
  if ($("marketCapChange")) {
    $("marketCapChange").textContent = `${percent(change)} (24h)`;
    $("marketCapChange").className = change >= 0 ? "positive" : "negative";
  }
}

/* MARKET TABLE */
function renderCoins(list) {
  const table = $("coinTable");
  if (!table) return;

  if (!list.length) {
    table.innerHTML = `<tr><td colspan="7" class="table-message">No assets match your search.</td></tr>`;
    if ($("marketCount")) $("marketCount").textContent = "0 assets";
    return;
  }

  table.innerHTML = list.map(coin => {
    const change = Number(coin.price_change_percentage_24h || 0);
    const saved = watchlist.includes(coin.id);
    return `
      <tr>
        <td>${coin.market_cap_rank ?? "--"}</td>
        <td>
          <div class="coin-info">
            <img src="${escapeHTML(coin.image)}" alt="" loading="lazy" onerror="this.style.display='none'">
            <div class="coin-info-text">
              <strong>${escapeHTML(coin.name)}</strong>
              <small>${escapeHTML(coin.symbol).toUpperCase()}</small>
            </div>
          </div>
        </td>
        <td class="price-cell">${price(coin.current_price)}</td>
        <td class="${change >= 0 ? "positive" : "negative"}">${percent(change)}</td>
        <td class="price-cell">${money(coin.market_cap)}</td>
        <td class="price-cell">${money(coin.total_volume)}</td>
        <td>
          <button class="watch-button ${saved ? "saved" : ""}" data-watch="${escapeHTML(coin.id)}"
            aria-label="${saved ? "Remove from" : "Add to"} watchlist"
            title="${saved ? "Remove from watchlist" : "Add to watchlist"}">${saved ? "鈽�" : "鈽�"}</button>
        </td>
      </tr>`;
  }).join("");

  if ($("marketCount")) $("marketCount").textContent = `${list.length} assets`;
}

function updateMarketDisplay() {
  const query = $("searchInput")?.value.trim().toLowerCase() || "";
  const filtered = coins.filter(coin =>
    String(coin.name || "").toLowerCase().includes(query) ||
    String(coin.symbol || "").toLowerCase().includes(query)
  );
  renderCoins(filtered);
}

$("searchInput")?.addEventListener("input", updateMarketDisplay);

/* WATCHLIST */
function saveWatchlist() {
  try {
    localStorage.setItem("cryptoRealityWatchlist", JSON.stringify(watchlist));
  } catch (error) {
    console.error("Watchlist storage error:", error);
    showToast("Could not save the watchlist on this device");
  }
}

function renderWatchlist() {
  const table = $("watchlistTable");
  if (!table) return;

  const savedCoins = watchlist.map(id => coins.find(coin => coin.id === id)).filter(Boolean);
  if (!savedCoins.length) {
    table.innerHTML = `<tr><td colspan="5" class="table-message">Your watchlist is empty. Add assets from Markets.</td></tr>`;
    return;
  }

  table.innerHTML = savedCoins.map(coin => {
    const change = Number(coin.price_change_percentage_24h || 0);
    return `
      <tr>
        <td><div class="coin-info">
          <img src="${escapeHTML(coin.image)}" alt="" loading="lazy" onerror="this.style.display='none'">
          <div class="coin-info-text"><strong>${escapeHTML(coin.name)}</strong><small>${escapeHTML(coin.symbol).toUpperCase()}</small></div>
        </div></td>
        <td class="price-cell">${price(coin.current_price)}</td>
        <td class="${change >= 0 ? "positive" : "negative"}">${percent(change)}</td>
        <td class="price-cell">${money(coin.market_cap)}</td>
        <td><button class="remove-button" data-remove="${escapeHTML(coin.id)}">Remove</button></td>
      </tr>`;
  }).join("");
}

function toggleWatchlist(id) {
  if (watchlist.includes(id)) {
    watchlist = watchlist.filter(item => item !== id);
    showToast("Removed from watchlist");
  } else {
    watchlist.push(id);
    showToast("Added to watchlist");
  }
  saveWatchlist();
  updateMarketDisplay();
  renderWatchlist();
}

$("coinTable")?.addEventListener("click", event => {
  const button = event.target.closest("[data-watch]");
  if (button) toggleWatchlist(button.dataset.watch);
});

$("watchlistTable")?.addEventListener("click", event => {
  const button = event.target.closest("[data-remove]");
  if (button) toggleWatchlist(button.dataset.remove);
});

/* BITCOIN CHART */
async function loadBitcoinChart() {
  const result = await fetchJSON(`${API}/coins/bitcoin/market_chart?vs_currency=usd&days=7`);
  const points = result.prices || [];
  if (!points.length) throw new Error("No Bitcoin chart data");

  const canvas = $("btcChart");
  if (!canvas) return;

  const chartData = points.map(([timestamp, value]) => ({ x: Number(timestamp), y: Number(value) }));
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, "rgba(84, 134, 200, 0.22)");
  gradient.addColorStop(0.72, "rgba(84, 134, 200, 0.04)");
  gradient.addColorStop(1, "rgba(84, 134, 200, 0)");

  if (btcChart) {
    btcChart.data.datasets[0].data = chartData;
    btcChart.data.datasets[0].backgroundColor = gradient;
    btcChart.update("none");
  } else {
    btcChart = new Chart(ctx, {
      type: "line",
      data: {
        datasets: [{
          label: "BTC / USD", data: chartData, parsing: false,
          borderColor: "#5486c8", backgroundColor: gradient,
          borderWidth: 2.2, fill: true, tension: 0.3,
          pointRadius: 0, pointHoverRadius: 4,
          pointHoverBackgroundColor: "#ffffff",
          pointHoverBorderColor: "#5486c8", pointHoverBorderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, normalized: true,
        animation: { duration: 350 },
        interaction: { intersect: false, mode: "nearest", axis: "x" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#101827", titleColor: "#ffffff", bodyColor: "#ffffff",
            borderColor: "#5486c8", borderWidth: 1, padding: 11, displayColors: false,
            callbacks: {
              title: items => new Date(items[0].parsed.x).toLocaleString("en-US", {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
              }),
              label: context => price(context.parsed.y)
            }
          }
        },
        scales: {
          x: {
            type: "linear", grid: { display: false }, border: { display: false },
            ticks: {
              color: "#8792a3", maxTicksLimit: 7, maxRotation: 0,
              callback: value => new Date(Number(value)).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              font: { size: 10 }
            }
          },
          y: {
            position: "right", border: { display: false },
            grid: { color: "rgba(135,146,163,.12)", drawTicks: false },
            ticks: {
              color: "#8792a3", padding: 10, maxTicksLimit: 6,
              callback: value => "$" + Number(value).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 }),
              font: { size: 10 }
            }
          }
        }
      }
    });
  }
  lastChartUpdate = Date.now();
}

function updateBitcoinPrice() {
  const bitcoin = coins.find(coin => coin.id === "bitcoin");
  if (!bitcoin) return;
  if ($("btcPrice")) $("btcPrice").textContent = price(bitcoin.current_price);
  const change = Number(bitcoin.price_change_percentage_24h || 0);
  if ($("btcChange")) {
    $("btcChange").textContent = percent(change);
    $("btcChange").className = change >= 0 ? "positive" : "negative";
  }
}

/* PROJECT ANALYSIS */
function fillAnalysisSelector() {
  const select = $("analysisSelect");
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">Choose an asset...</option>` +
    coins.map(coin => `<option value="${escapeHTML(coin.id)}">${escapeHTML(coin.name)} (${escapeHTML(coin.symbol.toUpperCase())})</option>`).join("");
  if (coins.some(coin => coin.id === current)) select.value = current;
}

function assessCoin(coin) {
  const cap = Number(coin.market_cap);
  const fdv = Number(coin.fully_diluted_valuation);
  const volume = Number(coin.total_volume);
  const change = Math.abs(Number(coin.price_change_percentage_24h || 0));
  const circulating = Number(coin.circulating_supply);
  const total = Number(coin.total_supply);
  const max = Number(coin.max_supply);

  const hasCap = Number.isFinite(cap) && cap > 0;
  const hasFDV = Number.isFinite(fdv) && fdv > 0 && hasCap;
  const hasVolume = Number.isFinite(volume) && volume >= 0 && hasCap;

  const fdvPremium = hasFDV ? Math.max(0, (fdv / cap - 1) * 100) : null;
  const turnover = hasVolume ? volume / cap * 100 : null;
  const circulatingShare = Number.isFinite(circulating) && circulating > 0
    ? (Number.isFinite(max) && max > 0 ? circulating / max * 100
      : Number.isFinite(total) && total > 0 ? circulating / total * 100 : null)
    : null;

  let score = 50;
  let factors = 0;
  const notes = [];

  if (fdvPremium !== null) {
    factors++;
    if (fdvPremium <= 20) { score += 15; notes.push("The FDV premium is relatively limited compared with the current market cap."); }
    else if (fdvPremium <= 75) { score += 5; notes.push("FDV is moderately above market cap; future token supply may affect valuation."); }
    else if (fdvPremium <= 200) { score -= 10; notes.push("FDV is considerably higher than market cap. Check future unlocks and circulating supply."); }
    else { score -= 20; notes.push("FDV is far above market cap, which points to substantial dilution exposure."); }
  } else {
    notes.push("FDV data is missing, so dilution exposure cannot be assessed.");
  }

  if (turnover !== null) {
    factors++;
    if (turnover >= 5 && turnover <= 100) { score += 10; notes.push("Reported 24h trading volume is meaningful relative to market cap."); }
    else if (turnover > 100) { score -= 5; notes.push("Reported turnover is unusually high. Verify volume quality across exchanges."); }
    else if (turnover < 1) { score -= 10; notes.push("Reported trading volume is low relative to market cap."); }
    else { notes.push("Trading turnover is within a middle range."); }
  } else {
    notes.push("Trading volume data is unavailable.");
  }

  if (circulatingShare !== null) {
    factors++;
    if (circulatingShare >= 70) { score += 10; notes.push("A large share of the stated supply is already circulating."); }
    else if (circulatingShare >= 40) { score += 2; notes.push("A meaningful portion of the stated supply remains outside circulation."); }
    else { score -= 12; notes.push("A relatively small share of the stated supply is circulating; review emissions and unlock schedules."); }
  } else {
    notes.push("Circulating-supply share cannot be calculated from the available supply fields.");
  }

  if (Number.isFinite(change)) {
    factors++;
    if (change > 25) { score -= 8; notes.push("The 24h price move is unusually large and may indicate elevated short-term volatility."); }
    else if (change > 12) { score -= 3; notes.push("The 24h price move is elevated."); }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  let status = "Insufficient Data";
  let statusClass = "unknown";

  if (factors >= 2) {
    if (score >= 70) { status = "Lower Market Risk"; statusClass = "low"; }
    else if (score >= 45) { status = "Moderate Market Risk"; statusClass = "moderate"; }
    else { status = "Higher Market Risk"; statusClass = "high"; }
  }

  if (!hasCap) notes.unshift("Market capitalization is unavailable; this assessment is incomplete.");
  notes.push("This score summarizes selected market-data signals. It is not a fair-value estimate or a measure of team, product or business quality.");

  return { score, status, statusClass, fdvPremium, turnover, circulatingShare, notes, factors };
}

function renderProjectAnalysis(id) {
  const coin = coins.find(item => item.id === id);
  const empty = $("analysisEmpty");
  const content = $("analysisContent");
  if (!coin) {
    if (empty) empty.hidden = false;
    if (content) content.hidden = true;
    return;
  }

  const assessment = assessCoin(coin);
  if (empty) empty.hidden = true;
  if (content) content.hidden = false;

  $("analysisImage").src = coin.image || "";
  $("analysisName").textContent = coin.name;
  $("analysisSymbol").textContent = coin.symbol.toUpperCase();

  const status = $("valuationStatus");
  status.textContent = assessment.status;
  status.className = `risk-status ${assessment.statusClass}`;

  $("projectScore").textContent = `${assessment.score}/100`;
  $("analysisMarketCap").textContent = money(coin.market_cap);
  $("fdvRatio").textContent = assessment.fdvPremium === null ? "--" : `${number(assessment.fdvPremium, 1)}%`;
  $("volumeRatio").textContent = assessment.turnover === null ? "--" : `${number(assessment.turnover, 2)}%`;

  $("circulatingSupply").textContent = supply(coin.circulating_supply);
  $("totalSupply").textContent = supply(coin.total_supply);
  $("maxSupply").textContent = supply(coin.max_supply);
  $("fullyDilutedValue").textContent = money(coin.fully_diluted_valuation);

  const change = Number(coin.price_change_percentage_24h || 0);
  $("analysisChange").textContent = percent(change);
  $("analysisChange").className = change >= 0 ? "positive" : "negative";
  $("analysisVolume").textContent = money(coin.total_volume);
  $("fdvPremium").textContent = assessment.fdvPremium === null ? "--" : `${number(assessment.fdvPremium, 1)}%`;
  $("analysisRank").textContent = coin.market_cap_rank ? `#${coin.market_cap_rank}` : "--";

  $("assessmentList").innerHTML = assessment.notes.map(note => `<li>${escapeHTML(note)}</li>`).join("");
}

$("analysisSelect")?.addEventListener("change", event => renderProjectAnalysis(event.target.value));

/* LOAD MARKET DATA */
async function loadCoins() {
  const data = await fetchJSON(
    `${API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${MARKET_LIMIT}&page=1&sparkline=false&price_change_percentage=24h`
  );
  if (!Array.isArray(data) || !data.length) throw new Error("Coin market data unavailable");

  coins = data;
  if ($("coinCount")) $("coinCount").textContent = coins.length;
  updateMarketDisplay();
  renderWatchlist();

  const selected = $("analysisSelect")?.value || "";
  fillAnalysisSelector();
  if (selected && coins.some(coin => coin.id === selected)) {
    $("analysisSelect").value = selected;
    renderProjectAnalysis(selected);
  } else if (selected) {
    renderProjectAnalysis("");
  }
  updateBitcoinPrice();
}

/* DASHBOARD REFRESH */
async function loadDashboard(showMessage = false) {
  if (isLoading) return;
  isLoading = true;

  if ($("status")) $("status").textContent = "Updating market data...";
  setConnection("Connecting...");

  const tasks = [loadCoins(), loadGlobalData()];
  const chartIsDue = !lastChartUpdate || Date.now() - lastChartUpdate >= CHART_REFRESH_INTERVAL;
  if (chartIsDue) tasks.push(loadBitcoinChart());

  const results = await Promise.allSettled(tasks);
  const coinsLoaded = results[0].status === "fulfilled";
  const globalLoaded = results[1].status === "fulfilled";
  const chartLoaded = chartIsDue ? results[2].status === "fulfilled" : true;

  results.forEach(result => {
    if (result.status === "rejected") console.error("Dashboard update error:", result.reason);
  });

  if (coinsLoaded || globalLoaded) {
    setConnection("Connected");
    if ($("status")) $("status").textContent = `Last updated: ${new Date().toLocaleTimeString("en-US")}`;
  } else {
    setConnection("Connection issue");
    if ($("status")) $("status").textContent = "Update failed. Check your connection and try again.";
  }

  if (!chartLoaded) console.warn("Bitcoin chart update failed.");
  if (showMessage) {
    showToast(coinsLoaded && globalLoaded ? "Market data updated" : "Some market data could not be updated");
  }
  isLoading = false;
}

/* CONTROLS */
$("refreshBtn")?.addEventListener("click", () => loadDashboard(true));
$("refreshMarket")?.addEventListener("click", () => loadDashboard(true));

$("menuBtn")?.addEventListener("click", () => $("sidebar")?.classList.toggle("open"));

document.querySelectorAll(".nav-item").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    if (link.hash) {
      document.querySelectorAll(`.nav-item[href="${link.hash}"]`).forEach(item => item.classList.add("active"));
    }
    $("sidebar")?.classList.remove("open");
  });
});

/* INITIAL LOAD */
loadDashboard();
setInterval(() => loadDashboard(), REFRESH_INTERVAL);
