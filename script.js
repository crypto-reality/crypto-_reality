
const API = "https://api.coingecko.com/api/v3";

const table = document.getElementById("coinTable");
const search = document.getElementById("searchInput");

let coins = [];

const money = (value) => {
  if (value == null) return "--";
  return "$" + Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2
  }).format(value);
};

const price = (value) => {
  if (value == null) return "--";
  return "$" + Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 8
  });
};

async function loadMarket() {
  const status = document.getElementById("status");
  status.textContent = "جاري تحديث بيانات السوق...";

  try {
    const response = await fetch(
      `${API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`
    );

    if (!response.ok) {
      throw new Error("API error: " + response.status);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid market data");
    }

    coins = data;
    renderCoins(coins);

    document.getElementById("coinCount").textContent = data.length;
    
    const totalCap = data.reduce(
      (sum, coin) => sum + (coin.market_cap || 0), 0
    );

    const totalVolume = data.reduce(
      (sum, coin) => sum + (coin.total_volume || 0), 0
    );

    document.getElementById("marketCap").textContent =
      money(totalCap);

    document.getElementById("volume").textContent =
      money(totalVolume);

    status.textContent =
      "آخر تحديث: " + new Date().toLocaleTimeString();

  } catch (error) {
    console.error(error);
    status.textContent =
      "تعذر تحميل البيانات. حاول التحديث لاحقاً.";
    table.innerHTML =
      '<tr><td colspan="7">لا يمكن الاتصال بمصدر البيانات حالياً.</td></tr>';
  }
}

function getRisk(coin) {
  const change = Math.abs(coin.price_change_percentage_24h || 0);
  const volumeRatio = coin.market_cap
    ? coin.total_volume / coin.market_cap
    : 0;

  if (change > 20 || volumeRatio < 0.005) {
    return { label: "تقلب مرتفع", className: "risk" };
  }

  if (change > 10) {
    return { label: "تقلب متوسط", className: "risk" };
  }

  return { label: "تقلب أقل", className: "safe" };
}

function renderCoins(list) {
  if (!list.length) {
    table.innerHTML =
      '<tr><td colspan="7">لا توجد نتائج مطابقة.</td></tr>';
    return;
  }

  table.innerHTML = list.map((coin, index) => {
    const change = coin.price_change_percentage_24h || 0;
    const risk = getRisk(coin);

    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div class="coin-info">
            <img src="${coin.image}" alt=""
              onerror="this.style.display='none'">
            <div>
              <strong>${coin.name}</strong>
              <small>${coin.symbol.toUpperCase()}</small>
            </div>
          </div>
        </td>
        <td>${price(coin.current_price)}</td>
        <td class="${change >= 0 ? 'positive' : 'negative'}">
          ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
        </td>
        <td>${money(coin.market_cap)}</td>
        <td>${money(coin.total_volume)}</td>
        <td class="${risk.className}">${risk.label}</td>
      </tr>
    `;
  }).join("");
}

search.addEventListener("input", () => {
  const term = search.value.trim().toLowerCase();

  const filtered = coins.filter(coin =>
    coin.name.toLowerCase().includes(term) ||
    coin.symbol.toLowerCase().includes(term)
  );

  renderCoins(filtered);
});

document.getElementById("refreshBtn")
  .addEventListener("click", loadMarket);

loadMarket();

// تحديث البيانات كل 60 ثانية
setInterval(loadMarket, 60000);

