Crypto Reality Pro v2.3
A static, browser-based crypto market research dashboard.
Run it
Extract the ZIP.
Open the folder in VS Code.
Run index.html with the Live Server extension, or host the folder on any static web host.
The browser needs internet access for CoinGecko, Chart.js, Google Fonts and Solana RPC.
Included
Separate workspace tabs: each sidebar item opens its own page view instead of stacking all sections vertically. Active tab, URL hash navigation and browser back/forward are supported.
Global market overview and a 250-asset market screener.
Search, market-cap categories, gainers/losers and sorting.
Interactive historical price chart with EMA 20, RSI 14, MACD and Bollinger Bands.
Market valuation research: market cap, FDV, FDV/market-cap, turnover and circulating supply.
Multi-chain protocol explorer with network/category filters, TVL, daily fees, protocol revenue and holder revenue deep dives (DefiLlama).
Local watchlist.
Solana public-wallet tracker showing recent transaction signatures.
Important data limitations
Protocol research uses DefiLlama's public protocol, TVL and fees/revenue endpoints. Coverage and methodology vary by protocol; unavailable metrics are not treated as zero.
Protocol revenue, protocol fees, token-holder revenue and token price are different things. Do not treat them as interchangeable.
The valuation notes are screening observations, not a fair-value model or investment recommendation.
The wallet tracker is a basic Solana beta. It reads public transaction signatures only; it does not identify wallet owners, calculate PnL, decode every swap, or guarantee real-time alerts.
The default public Solana RPC may rate-limit requests. For production use, operate a backend and connect a dedicated RPC/indexer provider. Do not expose private API keys in frontend JavaScript.
CoinGecko public API limits may apply.
Production upgrades recommended
Add a backend API proxy and server-side caching.
Integrate a reliable on-chain indexer for Solana and decode swaps, token balances, cost basis and realized/unrealized PnL.
Integrate a maintained protocol revenue source (for example, a protocol-level fees/revenue dataset) with explicit project-to-token mapping and timestamps.
Add user accounts and server-side watchlists if data must sync across devices.
Add source timestamps, stale-data warnings, request throttling and automated tests.
All interface text is in natural English. No wallet seed phrase or private key is requested or needed.
Research interpretation
Protocol TVL, user fees, protocol revenue and token-holder revenue are separate metrics.
Market cap / annualized protocol revenue is shown only when a direct CoinGecko protocol asset mapping is available. It is contextual, not a token cash-flow valuation.
Annualized revenue is a simple 24-hour run-rate multiplied by 365, not a forecast.
Multi-chain filters show the chains reported for each protocol; they do not imply that every token is deployed on every listed chain.
This remains a browser-only research build. A production service should proxy/cache third-party APIs, monitor rate limits, preserve source timestamps and validate token-to-protocol mappings.
v2.2 — Revenue history & valuation context
The Valuation Research panel now adds:
30-day average daily protocol revenue, based on the provider's returned daily history.
A simple annualized run-rate based on that 30-day average.
Revenue momentum versus the preceding 30-day period when at least 60 observations are available.
Reported 24-hour holder revenue, when the source provides it.
A transparent data-availability label and explanatory context instead of an invented fair-value score.
Important: the revenue multiple is a contextual comparison, not a fair-value estimate or investment signal. A manually linked protocol does not prove that its token captures protocol revenue. Missing data is shown as unavailable rather than treated as zero.
v2.4 visual refresh
Refined dark trading-terminal visual system with clearer contrast, spacing, typography and data cards.
More consistent table, chart, research and protocol panels inspired by modern exchange and on-chain analytics workflows.
Added a compact horizontal quick-navigation row on mobile; it stays synchronized with the main workspace tabs.
Improved focus states, reduced-motion support and responsive layouts.
Existing market, chart, valuation, protocol, wallet and watchlist data logic is retained.
This release is a front-end presentation update. It does not add new data providers, wallet chains or trading execution.
