const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors()); // Allow all origins for development

app.get('/quote', async (req, res) => {
  const symbol = req.query.symbol;
  if (!symbol) {
    return res.status(400).json({ error: 'Missing symbol parameter' });
  }
  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
    const yahooRes = await fetch(yahooUrl);
    const data = await yahooRes.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from Yahoo' });
  }
});

app.listen(PORT, () => console.log(`Proxy server running on http://localhost:${PORT}`));
