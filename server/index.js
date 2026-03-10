const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

const BASE = 'https://api.opendota.com/api';

async function opendota(endpoint) {
  const res = await fetch(`${BASE}${endpoint}`);
  if (!res.ok) throw new Error(`OpenDota error: ${res.status}`);
  return res.json();
}

app.get('/api/player/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [profile, wl] = await Promise.all([
      opendota(`/players/${id}`),
      opendota(`/players/${id}/wl`)
    ]);
    res.json({ profile, wl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/player/:id/recent', async (req, res) => {
  try {
    const data = await opendota(`/players/${req.params.id}/recentMatches`);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/player/:id/matches', async (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const data = await opendota(`/players/${req.params.id}/matches?limit=${limit}`);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/heroes', async (req, res) => {
  try {
    const data = await opendota('/heroes');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server běží na portu ${PORT}`);
});
