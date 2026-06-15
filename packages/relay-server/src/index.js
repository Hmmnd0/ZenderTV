import express from 'express';

const PORT = process.env.PORT || 3002;
const app = express();

// channelId -> { secret, files: Map<filename, {data, contentType}>, lastSeen }
const channels = new Map();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function requireBearer(req, res) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'Missing bearer token' }); return null; }
  return auth.slice(7);
}

const CONTENT_TYPES = {
  'm3u8': 'application/vnd.apple.mpegurl',
  'ts':   'video/MP2T',
  'jpg':  'image/jpeg',
};

// Broadcaster pushes segments, playlist, and thumb here
app.put('/ingest/:channelId/:filename', express.raw({ type: '*/*', limit: '20mb' }), (req, res) => {
  const { channelId, filename } = req.params;
  const token = requireBearer(req, res);
  if (!token) return;

  let ch = channels.get(channelId);
  if (!ch) {
    ch = { secret: token, files: new Map(), lastSeen: Date.now() };
    channels.set(channelId, ch);
    console.log(`[relay] channel online: ${channelId}`);
  } else if (ch.secret !== token) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  ch.lastSeen = Date.now();
  const ext = filename.split('.').pop();
  ch.files.set(filename, { data: req.body, contentType: CONTENT_TYPES[ext] ?? 'application/octet-stream' });

  // Prune segments no longer in the playlist window
  if (filename === 'live.m3u8') {
    const playlist = req.body.toString('utf8');
    const keep = new Set(['live.m3u8', 'thumb.jpg', ...(playlist.match(/\S+\.ts/g) ?? [])]);
    for (const key of ch.files.keys()) {
      if (!keep.has(key)) ch.files.delete(key);
    }
  }

  res.json({ ok: true });
});

// Viewers pull segments, playlist, and thumb here
app.get('/ch/:channelId/:filename', (req, res) => {
  const ch = channels.get(req.params.channelId);
  if (!ch) return res.status(404).send('Channel not found');

  const file = ch.files.get(req.params.filename);
  if (!file) return res.status(404).send('Not found');

  res.setHeader('Content-Type', file.contentType);
  // Playlist must not be cached; segments are immutable once written
  const noCache = req.params.filename === 'live.m3u8' || req.params.filename === 'thumb.jpg';
  res.setHeader('Cache-Control', noCache ? 'no-cache' : 'max-age=3600');
  res.send(file.data);
});

// Broadcaster signals it's going offline
app.delete('/ingest/:channelId', (req, res) => {
  const ch = channels.get(req.params.channelId);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  const token = requireBearer(req, res);
  if (!token) return;
  if (ch.secret !== token) return res.status(403).json({ error: 'Forbidden' });
  channels.delete(req.params.channelId);
  console.log(`[relay] channel offline: ${req.params.channelId}`);
  res.json({ ok: true });
});

app.get('/api/status', (req, res) => {
  res.json({ channels: channels.size, uptime: Math.floor(process.uptime()) });
});

// Prune channels that haven't pushed in 2 minutes
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [id, ch] of channels) {
    if (ch.lastSeen < cutoff) {
      console.log(`[relay] pruning stale channel: ${id}`);
      channels.delete(id);
    }
  }
}, 60_000);

app.listen(PORT, () => console.log(`[relay] listening on :${PORT}`));
