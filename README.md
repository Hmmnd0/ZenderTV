# Zender

Self-hosted internet TV and radio broadcasting. Point it at a folder of videos or music, hit **ON AIR**, and your channel appears in a public guide where anyone can tune in — from a browser or a desktop app.

Inspired by SHOUTcast and Winamp TV. No accounts, no platform, no algorithm.

---

## How it works

```
 YOUR MACHINE                        YOUR SERVER               AUDIENCE
┌───────────────────────┐       ┌──────────────────┐     ┌──────────────────┐
│  Broadcaster App      │       │ Directory Server  │     │ Viewer App       │
│  (playlist, scheduler,│─reg──▶│ (channel guide,  │◀────│ (guide + player) │
│   ON AIR button)      │       │  heartbeats)      │     └──────────────────┘
│          │            │       └──────────────────┘              │
│          ▼            │                                         │
│  Channel Server       │◀────────── HLS stream (.m3u8) ─────────┘
│  (ffmpeg + HTTP)      │
└───────────────────────┘
```

Five components:

| Component | What it does |
|---|---|
| **Broadcaster** | Tauri desktop app — media library, queue, scheduler, ON AIR toggle |
| **Channel Server** | Node + ffmpeg pipeline, serves HLS segments over HTTP |
| **Directory Server** | Central channel guide API — channels register and heartbeat here |
| **Viewer** | Web app + Tauri desktop — guide grid and player |
| **Relay** *(optional)* | Static file server for broadcasters who can't port-forward |

The broadcaster and channel server ship together in one installer. The directory server is the only component you need to host separately.

---

## Prerequisites

| Tool | Required for |
|---|---|
| **Node.js 20+** | Channel server, directory server, dev tooling |
| **ffmpeg** | All media work — normalize, concat, segment, thumbnail |
| **Rust + Cargo** | Building the Tauri desktop apps (broadcaster, viewer) |
| **npm** | Package management |

Install ffmpeg via your package manager (`brew install ffmpeg`, `apt install ffmpeg`, etc.). Rust via [rustup](https://rustup.rs).

---

## Directory Server

The directory is what turns scattered channels into a network. Everyone points their `channel.toml` at the same directory URL, and the guide updates in real time.

### Run with Docker

```bash
docker build -t zender-directory ./packages/directory-server

docker run -d \
  --name zender-directory \
  -p 3001:3001 \
  -v zender-data:/app/data \
  zender-directory
```

The SQLite database is stored in `/app/data` — mount a volume there so it survives container restarts.

### Run without Docker

```bash
cd packages/directory-server
npm install
node src/index.js
```

Listens on port `3001` by default. Set `PORT` env var to change it.

### Deploy to Fly.io

A `fly.toml` is included in `packages/directory-server`. It provisions a shared CPU instance with a persistent volume for SQLite.

```bash
cd packages/directory-server

# One-time setup
fly launch --no-deploy
fly vol create zender_data -s 1 -r ord   # change region as needed

# Deploy
fly deploy
```

Change `primary_region` in `fly.toml` to the region closest to your audience (`lhr` for London, `fra` for Frankfurt, `ewr` for New York, etc.).

### Directory API

```
POST /api/register          Register a channel, get back { id, secret }
POST /api/heartbeat         Keep-alive every 30s while on air
GET  /api/channels          Fetch the live channel list (filters: type, genre, sort)
DELETE /api/channels/:id    Deregister on going off air
```

Channels that miss a heartbeat for 90 seconds drop off the guide automatically — same mechanic as the original SHOUTcast directory.

---

## Channel Server (standalone / headless)

The channel server is normally launched automatically by the Broadcaster app, but you can run it headless on a VPS for 24/7 channels.

```bash
cd packages/channel-server
npm install
node src/index.js /path/to/channel.toml
```

Point it at a `channel.toml` (see configuration below). The server normalizes media files into a per-channel cache, segments the output into HLS, and registers itself with the directory when you go on air.

Working files (HLS segments, cache, playlist) are written to `~/Movies/Zender/<channel-name>/` on macOS and `~/Videos/Zender/<channel-name>/` on Windows/Linux. Cache is cleared on shutdown.

**Headless on a VPS with systemd:**

```ini
# /etc/systemd/system/zender-channel.service
[Unit]
Description=Zender Channel Server
After=network.target

[Service]
ExecStart=/usr/bin/node /opt/zender/packages/channel-server/src/index.js /opt/zender/channel.toml
WorkingDirectory=/opt/zender
Restart=on-failure
User=zender
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now zender-channel
```

---

## channel.toml Reference

Every channel is configured with a single TOML file. See `channel.example.toml` for a full example.

```toml
[channel]
name        = "Channel 47: Saturday Cartoons"
description = "80s cartoons, all day, forever."
genre       = "animation"
type        = "tv"       # "tv" or "radio"

[stream]
resolution      = "1280x720"
video_bitrate   = "2500k"
audio_bitrate   = "128k"
fps             = 30
segment_seconds = 6

[scheduler]
mode = "shuffle"         # "sequential" | "shuffle" | "schedule"

# Optional: time-based schedule blocks
[[scheduler.blocks]]
days   = ["mon","tue","wed","thu","fri"]
start  = "06:00"
folder = "/path/to/cartoons"
order  = "shuffle"

# Optional: insert a clip from a folder on a repeating interval
[[scheduler.rules]]
every_minutes = 60
folder        = "/path/to/station-ids"

[directory]
url    = "http://localhost:3001"   # URL of your directory server
public = true                      # false = off the guide (unlisted stream)

[server]
port       = 8047
mode       = "relay"               # "relay" (IP private) or "direct" (lower latency)
relay_url  = ""                    # relay ingest URL if using relay mode
public_url = ""                    # leave blank for auto-detect
```

**Scheduler modes:**
- `sequential` — plays files in folder order, loops
- `shuffle` — Winamp-style bag shuffle (never repeats until the whole folder is exhausted)
- `schedule` — uses `[[scheduler.blocks]]` for daypart-based programming

---

## Broadcaster App (Desktop)

The Broadcaster is a Tauri desktop app that bundles a UI (Svelte) and the channel server. It handles everything: creating a channel, adding media, scheduling, and going on air.

### Development

```bash
npm install
cd packages/broadcaster
npm install
npm run tauri dev
```

### Build

```bash
cd packages/broadcaster
npm run tauri build
```

Produces a signed installer in `src-tauri/target/release/bundle/`.

---

## Viewer App (Web + Desktop)

The Viewer is both a web app and a Tauri desktop app from the same codebase.

### Web (development)

```bash
# Start the directory server first, then:
cd packages/viewer
npm install
npm run dev
```

Open `http://localhost:5173`. The viewer fetches the channel list from the directory and lets you tune in.

### Desktop build

```bash
cd packages/viewer
npm run tauri build
```

Desktop-only features: mini-player (always-on-top), system tray with now-playing, favorites notifications, media key support.

---

## Development (all together)

From the repo root:

```bash
npm install          # installs root + all workspaces

# Terminal 1 — directory server
npm run directory

# Terminal 2 — viewer dev server
npm run viewer

# Terminal 3 — broadcaster app
cd packages/broadcaster && npm run tauri dev
```

Or run directory + viewer together:

```bash
npm run dev
```

---

## Stream pipeline

Two-stage architecture that keeps broadcast-time CPU near zero:

**Stage 1 — normalize on ingest** (happens once per file, cached):
```bash
ffmpeg -i input.avi \
  -c:v libx264 -preset veryfast -b:v 2500k \
  -vf "scale=1280:720,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30" \
  -c:a aac -b:a 128k -ar 44100 -ac 2 \
  -x264opts keyint=180:min-keyint=180:no-scenecut \
  cache/input.norm.ts
```

**Stage 2 — concat + segment at broadcast time** (`-c copy`, no re-encoding):
```bash
ffmpeg -re -f concat -safe 0 -i playlist.txt \
  -c copy \
  -f hls -hls_time 6 -hls_list_size 10 \
  -hls_flags delete_segments+append_list+omit_endlist \
  -hls_segment_filename 'public/seg_%05d.ts' \
  public/live.m3u8
```

A Raspberry Pi can run a channel. Normalization is the expensive step; it happens in the background before files ever reach the queue.

---

## Relay mode

For broadcasters who can't port-forward or want to keep their home IP private: the channel server pushes HLS segments to a relay server, which serves them to viewers.

Set in `channel.toml`:
```toml
[server]
mode      = "relay"
relay_url = "https://your-relay.example.com/ingest/<channel-id>/"
```

The relay just needs to be an HTTP server that accepts PUT requests and serves files statically — nginx or Caddy with a few lines of config.

---

## Bandwidth

Every viewer streams directly from the channel server (or relay). At the default 2.5 Mbps video profile:

| Upload | Comfortable viewers |
|---|---|
| 10 Mbps typical home | ~3 |
| 35 Mbps | ~12 |
| 1 Gbps VPS | 300+ |

Radio at 128 kbps handles ~70 listeners on a modest home connection. Run the channel server on a VPS for serious viewer counts.

---

## Legal

Zender is content-neutral software. If you run a public directory server, you need a DMCA takedown policy, a contact address, and the moderation tooling (ban/report endpoints in the directory) in place before you open it to the public. The directory server code includes report and ban stubs — wire them up.

---

See `ZENDER.md` for the full architecture deep-dive, design decisions, and roadmap.
