# ZenderTV — Production Checklist

## Broadcaster UI/UX
- [x] File actions are discovery-invisible (hover-only, new users won't find them)
- [x] Daypart folder icon not clickable on existing blocks
- [x] No live thumbnail preview of what's on air
- [x] No queue reordering (drag to change order)
- [x] Standby state is easy to forget (no persistent visual warning)

## Viewer UI/UX
- [x] Scrolling marquee for channel name, description, now-playing in player
- [x] `now_playing` shows raw filename in guide cards (inconsistent with player display)
- [x] RELAY tag is jargon — viewers don't know what it means, remove it
- [x] Radio channels show a black video rectangle — needs audio-only UI

## Security & Reliability
- [x] Control API auth (per-session token on all /control/* endpoints)
- [x] Relay auth verified against directory on every new ingest connection
- [x] Re-register protection (name squatting fix)
- [x] Stale channel pruning (24h automatic cleanup)
- [ ] Channel server crash recovery UX in broadcaster

## Distribution
- [ ] App icons (both apps use default Tauri placeholder)
- [ ] GitHub Actions CI — cross-platform builds (macOS arm64 + x64, Windows, Linux)
- [ ] Sidecar built for all target triples in CI pipeline
- [ ] macOS notarization + Windows code signing
- [ ] Auto-updater (Tauri updater plugin)

## Nice to have
- [ ] "Watch your channel" button in broadcaster (opens viewer to your channel)
- [ ] Share link for a specific channel
- [ ] About / version screen
