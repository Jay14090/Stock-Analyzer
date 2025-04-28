document.addEventListener('DOMContentLoaded', async () => {
    chrome.storage.local.get('selectedStock', async (result) => {
      const symbol = result.selectedStock;
      if (!symbol) {
        document.getElementById('stock-info').innerText = "No stock selected.";
        return;
      }
  
      const apiKey = 'YOUR_ALPHA_VANTAGE_API_KEY'; // Replace with your key
      const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;
  
      try {
        const response = await fetch(url);
        const data = await response.json();
  
        if (data.Note || !data.Name) {
          document.getElementById('stock-info').innerText = "API limit reached or invalid symbol.";
          return;
        }
  
        // Example: Calculate a basic score
        let score = 50;
        if (data.PERatio && parseFloat(data.PERatio) < 20) score += 20;
        if (data.MarketCapitalization && parseInt(data.MarketCapitalization) > 1e10) score += 20;
        score = Math.min(score, 100);
  
        document.getElementById('stock-info').innerHTML = `
          <h2>${data.Name} (${data.Symbol})</h2>
          <p>Price: Not available in overview endpoint</p>
          <p>PE Ratio: ${data.PERatio || 'N/A'}</p>
          <p>Market Cap: ${data.MarketCapitalization || 'N/A'}</p>
          <p>Sector: ${data.Sector || 'N/A'}</p>
        `;
        document.getElementById('score').innerHTML = `<div class="score">Overall Score: ${score}/100</div>`;
      } catch (e) {
        document.getElementById('stock-info').innerText = "Error fetching data.";
      }
    });
  });
  