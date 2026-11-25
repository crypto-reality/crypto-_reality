

const API = "https://api.coingecko.com/api/v3";

const REFRESH_INTERVAL = 60000;
const CHART_REFRESH_INTERVAL = 300000;

let coins = [];
let btcChart = null;
let isLoading = false;
let lastChartUpdate = 0;
let watchlist = [];

const $ = id => document.getElementById(id);

// WATCHLIST STORAGE

try {
  watchlist = JSON.parse(
    localStorage.getItem("cryptoRealityWatchlist") || "[]"
  );

  if (!Array.isArray(watchlist)) watchlist = [];
} catch {
  watchlist = [];
}

// FORMATTING

const money = value => {
  if (value == null || !Number.isFinite(Number(value))) return "--";

  return "$" + Number(value).toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 2
  });
};

const price = value => {
  if (value == null || !Number.isFinite(Number(value))) return "--";

  return "$" + Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: Number(value) < 1 ? 8 : 2
  });
};

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);

// NOTIFICATIONS

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// DATE

if ($("currentDate")) {
  $("currentDate").textContent =
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric"
    });
}

// CONNECTION STATUS

function setConnection(status) {
  if ($("connection")) {
    $("connection").textContent = status;
  }

  const dot = $("connectionDot");
  if (!dot) return;

  dot.classList.remove("connected", "disconnected");

  if (status === "Connected") {
    dot.classList.add("connected");
  } else if (status === "Connection issue") {
    dot.classList.add("disconnected");
  }
}

// GLOBAL MARKET DATA

async function loadGlobalData() {
  const response = await fetch(`${API}/global`);

  if (!response.ok) {
    throw new Error("Global market data unavailable");
  }

  const result = await response.json();
  const data = result.data;

  if (!data) {
    throw new Error("Invalid global market data");
  }

  if ($("marketCap")) {
    $("marketCap").textContent =
      money(data.total_market_cap?.usd);
  }

  if ($("volume")) {
    $("volume").textContent =
      money(data.total_volume?.usd);
  }

  if ($("btcDominance")) {
    $("btcDominance").textContent =
      Number(data.market_cap_percentage?.btc || 0).toFixed(1) + "%";
  }

  const change = Number(
    data.market_cap_change_percentage_24h_usd || 0
  );

  if ($("marketCapChange")) {
    $("marketCapChange").textContent =
      `${change >= 0 ? "+" : ""}${change.toFixed(2)}% (24h)`;

    $("marketCapChange").className =
      change >= 0 ? "positive" : "negative";
  }
}

// MARKET TABLE

function renderCoins(list) {
  const table = $("coinTable");
  if (!table) return;

  if (!list.length) {
    table.innerHTML = `
      <tr>
        <td colspan="7" class="table-message">
          No assets found.
        </td>
      </tr>
    `;

    if ($("marketCount")) {
      $("marketCount").textContent = "0 assets";
    }

    return;
  }

  table.innerHTML = list.map(coin => {
    const change = Number(
      coin.price_change_percentage_24h || 0
    );

    const saved = watchlist.includes(coin.id);

    return `
      <tr>
        <td>${coin.market_cap_rank ?? "--"}</td>

        <td>
          <div class="coin-info">
            <img
              src="${escapeHTML(coin.image)}"
              alt=""
              loading="lazy"
              onerror="this.style.display='none'"
            >

            <div class="coin-info-text">
              <strong>${escapeHTML(coin.name)}</strong>
              <small>${escapeHTML(coin.symbol).toUpperCase()}</small>
            </div>
          </div>
        </td>

        <td class="price-cell">
          ${price(coin.current_price)}
        </td>

        <td class="${change >= 0 ? "positive" : "negative"}">
          ${change >= 0 ? "+" : ""}${change.toFixed(2)}%
        </td>

        <td class="price-cell">
          ${money(coin.market_cap)}
        </td>

        <td class="price-cell">
          ${money(coin.total_volume)}
        </td>

        <td>
          <button
            class="watch-button ${saved ? "saved" : ""}"
            data-watch="${escapeHTML(coin.id)}"
            aria-label="${saved ? "Remove from" : "Add to"} watchlist"
            title="${saved ? "Remove from watchlist" : "Add to watchlist"}"
          >${saved ? "★" : "☆"}</button>
        </td>
      </tr>
    `;
  }).join("");

  if ($("marketCount")) {
    $("marketCount").textContent = `${list.length} assets`;
  }
}

// SEARCH

function updateMarketDisplay() {
  const search = $("searchInput");

  const query = search
    ? search.value.trim().toLowerCase()
    : "";

  const filtered = coins.filter(coin =>
    String(coin.name || "").toLowerCase().includes(query) ||
    String(coin.symbol || "").toLowerCase().includes(query)
  );

  renderCoins(filtered);
}

if ($("searchInput")) {
  $("searchInput").addEventListener(
    "input",
    updateMarketDisplay
  );
}

// WATCHLIST

function saveWatchlist() {
  try {
    localStorage.setItem(
      "cryptoRealityWatchlist",
      JSON.stringify(watchlist)
    );
  } catch (error) {
    console.error("Watchlist storage error:", error);
  }
}

function renderWatchlist() {
  const table = $("watchlistTable");
  if (!table) return;

  const savedCoins = watchlist
    .map(id => coins.find(coin => coin.id === id))
    .filter(Boolean);

  if (!savedCoins.length) {
    table.innerHTML = `
      <tr>
        <td colspan="5" class="table-message">
          Your watchlist is empty. Add assets from the Markets table.
        </td>
      </tr>
    `;
    return;
  }

  table.innerHTML = savedCoins.map(coin => {
    const change = Number(
      coin.price_change_percentage_24h || 0
    );

    return `
      <tr>
        <td>
          <div class="coin-info">
            <img
              src="${escapeHTML(coin.image)}"
              alt=""
              loading="lazy"
              onerror="this.style.display='none'"
            >

            <div class="coin-info-text">
              <strong>${escapeHTML(coin.name)}</strong>
              <small>${escapeHTML(coin.symbol).toUpperCase()}</small>
            </div>
          </div>
        </td>

        <td class="price-cell">
          ${price(coin.current_price)}
        </td>

        <td class="${change >= 0 ? "positive" : "negative"}">
          ${change >= 0 ? "+" : ""}${change.toFixed(2)}%
        </td>

        <td class="price-cell">
          ${money(coin.market_cap)}
        </td>

        <td>
          <button
            class="remove-button"
            data-remove="${escapeHTML(coin.id)}"
          >Remove</button>
        </td>
      </tr>
    `;
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

if ($("coinTable")) {
  $("coinTable").addEventListener("click", event => {
    const button = event.target.closest("[data-watch]");
    if (!button) return;

    toggleWatchlist(button.dataset.watch);
  });
}

if ($("watchlistTable")) {
  $("watchlistTable").addEventListener("click", event => {
    const button = event.target.closest("[data-remove]");
    if (!button) return;

    toggleWatchlist(button.dataset.remove);
  });
}

// BITCOIN CHART

async function loadBitcoinChart() {
  const response = await fetch(
    `${API}/coins/bitcoin/market_chart?vs_currency=usd&days=7`
  );

  if (!response.ok) {
    throw new Error("Bitcoin chart unavailable");
  }

  const result = await response.json();
  const points = result.prices || [];

  if (!points.length) {
    throw new Error("No Bitcoin chart data");
  }

  // Use timestamp/value objects for a proper time axis.
  const chartData = points.map(item => ({
    x: Number(item[0]),
    y: Number(item[1])
  }));

  const canvas = $("btcChart");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, 320);

  gradient.addColorStop(0, "rgba(84, 134, 200, 0.22)");
  gradient.addColorStop(0.7, "rgba(84, 134, 200, 0.04)");
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
          label: "BTC / USD",
          data: chartData,

          parsing: false,
          borderColor: "#5486c8",
          backgroundColor: gradient,

          borderWidth: 2.5,
          fill: true,
          tension: 0.35,

          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "#ffffff",
          pointHoverBorderColor: "#5486c8",
          pointHoverBorderWidth: 2,

          borderJoinStyle: "round",
          borderCapStyle: "round"
        }]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,
        normalized: true,

        animation: {
          duration: 500,
          easing: "easeOutQuart"
        },

        interaction: {
          intersect: false,
          mode: "nearest",
          axis: "x"
        },

        plugins: {
          legend: {
            display: false
          },

          tooltip: {
            enabled: true,
            backgroundColor: "#101827",
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            borderColor: "#5486c8",
            borderWidth: 1,
            padding: 12,
            displayColors: false,

            callbacks: {
              title: items => {
                const timestamp = items[0].parsed.x;

                return new Date(timestamp).toLocaleString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  }
                );
              },

              label: context =>
                "$" + Number(context.parsed.y).toLocaleString(
                  "en-US",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }
                )
            }
          }
        },

        scales: {
          x: {
            type: "linear",

            grid: {
              display: false
            },

            border: {
              display: false
            },

            ticks: {
              color: "#8792a3",
              maxTicksLimit: 7,
              maxRotation: 0,

              callback: value =>
                new Date(Number(value)).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric"
                  }
                ),

              font: {
                size: 10
              }
            }
          },

          y: {
            position: "right",

            border: {
              display: false
            },

            grid: {
              color: "rgba(135, 146, 163, 0.12)",
              drawTicks: false
            },

            ticks: {
              color: "#8792a3",
              padding: 12,
              maxTicksLimit: 6,

              callback: value =>
                "$" + Number(value).toLocaleString(
                  "en-US",
                  {
                    notation: "compact",
                    maximumFractionDigits: 2
                  }
                ),

              font: {
                size: 10
              }
            }
          }
        }
      }
    });
  }

  lastChartUpdate = Date.now();
}

// BITCOIN PRICE

function updateBitcoinPrice() {
  const bitcoin = coins.find(
    coin => coin.id === "bitcoin"
  );

  if (!bitcoin) return;

  if ($("btcPrice")) {
    $("btcPrice").textContent =
      price(bitcoin.current_price);
  }

  const change = Number(
    bitcoin.price_change_percentage_24h || 0
  );

  if ($("btcChange")) {
    $("btcChange").textContent =
      `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;

    $("btcChange").className =
      change >= 0 ? "positive" : "negative";
  }
}

// LOAD COINS

async function loadCoins() {
  const response = await fetch(
    `${API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`
  );

  if (!response.ok) {
    throw new Error("Coin market data unavailable");
  }

  const data = await response.json();

  if (!Array.isArray(data) || !data.length) {
    throw new Error("Invalid coin data");
  }

  coins = data;

  if ($("coinCount")) {
    $("coinCount").textContent = coins.length;
  }

  updateMarketDisplay();
  renderWatchlist();
  updateBitcoinPrice();
}

// DASHBOARD REFRESH

async function loadDashboard(showMessage = false) {
  if (isLoading) return;

  isLoading = true;

  if ($("status")) {
    $("status").textContent = "Updating market data...";
  }

  setConnection("Connecting...");

  const tasks = [
    loadCoins(),
    loadGlobalData()
  ];

  const chartIsDue =
    !lastChartUpdate ||
    Date.now() - lastChartUpdate >= CHART_REFRESH_INTERVAL;

  if (chartIsDue) {
    tasks.push(loadBitcoinChart());
  }

  const results = await Promise.allSettled(tasks);

  const coinsLoaded = results[0].status === "fulfilled";
  const globalLoaded = results[1].status === "fulfilled";

  const chartLoaded = chartIsDue
    ? results[2].status === "fulfilled"
    : true;

  results.forEach(result => {
    if (result.status === "rejected") {
      console.error("Dashboard update error:", result.reason);
    }
  });

  if (coinsLoaded || globalLoaded) {
    setConnection("Connected");

    if ($("status")) {
      $("status").textContent =
        "Last updated: " +
        new Date().toLocaleTimeString("en-US");
    }
  } else {
    setConnection("Connection issue");

    if ($("status")) {
      $("status").textContent =
        "Update failed. Check your connection.";
    }
  }

  if (!chartLoaded) {
    console.warn("Bitcoin chart update failed.");
  }

  if (showMessage) {
    if (coinsLoaded && globalLoaded) {
      showToast("Market data updated");
    } else {
      showToast("Some market data could not be updated");
    }
  }

  isLoading = false;
}

// REFRESH BUTTONS

if ($("refreshBtn")) {
  $("refreshBtn").addEventListener("click", () => {
    loadDashboard(true);
  });
}

if ($("refreshMarket")) {
  $("refreshMarket").addEventListener("click", () => {
    loadDashboard(true);
  });
}

// MOBILE MENU

if ($("menuBtn")) {
  $("menuBtn").addEventListener("click", () => {
    if ($("sidebar")) {
      $("sidebar").classList.toggle("open");
    }
  });
}

// NAVIGATION

document.querySelectorAll(".nav-item").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
    });

    if (link.hash) {
      document.querySelectorAll(
        `.nav-item[href="${link.hash}"]`
      ).forEach(item => item.classList.add("active"));
    }

    if ($("sidebar")) {
      $("sidebar").classList.remove("open");
    }
  });
});

// INITIAL LOAD

loadDashboard();

// AUTO REFRESH EVERY 60 SECONDS

setInterval(() => {
  loadDashboard();
}, REFRESH_INTERVAL);
