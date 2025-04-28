chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analyzeStock") {
    showStockPopup(message.stock);
  }
});

async function resolveTickerWithOpenRouter(selectedText) {
  const apiKey = window.STOCK_ANALYZER_CONFIG.OPENROUTER_API_KEY;
  const prompt = `Given the following text, return only the most likely stock ticker symbol (with exchange suffix if relevant, e.g., .US for Nasdaq/NYSE, .NS for NSE, .L for LSE, etc.) for the company or stock mentioned. If you cannot determine, reply "UNKNOWN". Text: "${selectedText}"`;
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "openai/gpt-3.5-turbo",
      messages: [
        {role: "user", content: prompt}
      ]
    })
  });
  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply || reply.toUpperCase() === "UNKNOWN") return null;
  return reply.split(/[\s,\.]/)[0].toUpperCase();
}

async function showStockPopup(selectedText) {
  showPopupHtml(`<div class="popup-card"><div class="company-name">Identifying ticker...</div></div>`);
  const ticker = await resolveTickerWithOpenRouter(selectedText);
  if (!ticker) {
    showPopupHtml(`<div class="popup-card"><div>Could not identify a valid ticker for "${selectedText}".</div></div>`);
    return;
  }
  fetchAndShowStockData(ticker);
}

async function fetchAndShowStockData(ticker) {
  const finnhubKey = window.STOCK_ANALYZER_CONFIG.FINNHUB_API_KEY;
  const eodhdKey = window.STOCK_ANALYZER_CONFIG.EODHD_API_KEY;
  const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${finnhubKey}`;
  const profileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${finnhubKey}`;
  const newsUrl = `https://eodhd.com/api/news?s=${ticker}&api_token=${eodhdKey}`;
  let html = '';
  try {
    const [quoteRes, profileRes, newsRes] = await Promise.all([
      fetch(quoteUrl),
      fetch(profileUrl),
      fetch(newsUrl)
    ]);
    const quote = await quoteRes.json();
    const profile = await profileRes.json();
    const news = await newsRes.json();
    if (!quote.c || quote.c === 0) throw new Error('No data found');
    const companyName = profile.name || ticker;
    const exchange = profile.exchange || '';
    let score = 50;
    if (quote.c && quote.o && quote.c > quote.o) score += 20;
    if (quote.h && quote.l && (quote.h - quote.l) > 0.05 * quote.o) score += 20;
    score = Math.min(score, 100);
    let newsHtml = '';
    if (Array.isArray(news) && news.length > 0) {
      newsHtml = `<div class="news-header">Latest News</div>`;
      news.slice(0, 5).forEach(item => {
        let sentimentLabel = "Neutral";
        let color = "#2196f3";
        if (item.sentiment && typeof item.sentiment.polarity === "number") {
          if (item.sentiment.polarity > 0.1) {
            sentimentLabel = "Positive";
            color = "#43e97b";
          } else if (item.sentiment.polarity < -0.1) {
            sentimentLabel = "Negative";
            color = "#e53935";
          }
        }
        newsHtml += `
          <div class="news-item" style="border-left: 5px solid ${color};">
            <a href="${item.link}" target="_blank" style="color:inherit;text-decoration:none;">
              <div class="news-title">${item.title}</div>
              <div class="news-sentiment" style="color:${color};font-weight:600;">${sentimentLabel}</div>
              <div class="news-date">${item.date ? new Date(item.date).toLocaleString() : ''}</div>
            </a>
          </div>
        `;
      });
    }
    html = `
      <div class="popup-card">
        <span class="close-btn" title="Close">&times;</span>
        <div class="company-name">${companyName}</div>
        <div class="ticker-exchange">
          <span class="ticker">${ticker}</span>
          ${exchange ? `<span class="exchange">(${exchange})</span>` : ''}
        </div>
        <div class="stock-details">
          <div><strong>Current Price:</strong> ${quote.c ?? 'N/A'}</div>
          <div><strong>Open:</strong> ${quote.o ?? 'N/A'}</div>
          <div><strong>High:</strong> ${quote.h ?? 'N/A'}</div>
          <div><strong>Low:</strong> ${quote.l ?? 'N/A'}</div>
          <div><strong>Previous Close:</strong> ${quote.pc ?? 'N/A'}</div>
        </div>
        <button class="score-btn">Score: ${score}/100</button>
        <div class="news-section">${newsHtml}</div>
      </div>
    `;
  } catch (e) {
    html = `<div class="popup-card"><div>Error fetching data for "<b>${ticker}</b>": ${e.message}</div></div>`;
  }
  showPopupHtml(html);
}

function showPopupHtml(html) {
  const oldPopup = document.getElementById('stock-analyzer-popup');
  if (oldPopup) oldPopup.remove();

  const popup = document.createElement('div');
  popup.id = 'stock-analyzer-popup';
  popup.innerHTML = `
    <span class="close-btn" title="Close">&times;</span>
    ${html}
  `;
  popup.style.cssText = `
    position: fixed;
    top: 30px;
    right: 30px;
    z-index: 9999;
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 4px 24px rgba(44, 62, 80, 0.16);
    padding: 24px 28px 20px 28px;
    min-width: 270px;
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #222;
    border: 1.5px solid #2196f3;
  `;

  const style = document.createElement('style');
  style.textContent = `
    #stock-analyzer-popup .close-btn {
      position: absolute;
      top: 10px;
      right: 16px;
      font-size: 1.6em;
      color: #888;
      cursor: pointer;
      font-weight: bold;
      z-index: 10001;
      transition: color 0.2s;
      user-select: none;
    }
    #stock-analyzer-popup .close-btn:hover {
      color: #e53935;
    }
    #stock-analyzer-popup .company-name {
      font-size: 1.35em;
      font-weight: 700;
      margin-bottom: 12px;
      letter-spacing: 1px;
      text-align: center;
    }
    #stock-analyzer-popup .stock-details {
      margin-bottom: 18px;
      font-size: 1.08em;
      text-align: left;
      width: 100%;
    }
    #stock-analyzer-popup .stock-details div {
      margin-bottom: 4px;
    }
    #stock-analyzer-popup .score-btn {
      display: block;
      width: 100%;
      background: linear-gradient(90deg, #43e97b 0%, #38f9d7 100%);
      color: #fff;
      font-size: 1.15em;
      font-weight: bold;
      border: none;
      border-radius: 8px;
      padding: 12px 0;
      margin-top: 10px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(67, 233, 123, 0.15);
      transition: background 0.2s;
    }
    #stock-analyzer-popup .score-btn:hover {
      background: linear-gradient(90deg, #38f9d7 0%, #43e97b 100%);
    }
  `;
  popup.appendChild(style);

  popup.style.position = 'fixed';
  popup.style.top = '30px';
  popup.style.right = '30px';

  document.body.appendChild(popup);

  // Attach the event listener after popup is in the DOM
  popup.querySelector('.close-btn').onclick = () => popup.remove();

  setTimeout(() => {
    if (popup.parentNode) popup.remove();
  }, 15000);
}
