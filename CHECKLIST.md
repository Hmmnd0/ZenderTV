# ZenderTV — Production Checklist

## Broadcaster UI/UX
- [ ] File actions are discovery-invisible (hover-only, new users won't find them)
- [ ] No progress / time remaining for currently playing item
- [ ] No live thumbnail preview of what's on air
- [ ] No queue reordering (drag to change order)
- [ ] Standby state is easy to forget (no persistent visual warning)

## Viewer UI/UX
- [ ] `now_playing` shows raw filename in guide cards (inconsistent with player display)
- [ ] Brief "No channels" flash while guide is loading (needs loading state)
- [ ] RELAY tag is jargon — viewers don't know what it means, remove it
- [ ] Radio channels show a black video rectangle — needs audio-only UI
- [ ] No loading indicator on channel cards while thumbnail fetches

## Distribution
- [ ] GitHub Actions CI — cross-platform builds (macOS arm64 + x64, Windows, Linux)
- [ ] Sidecar built for all target triples in CI pipeline
- [ ] macOS notarization + Windows code signing
- [ ] Auto-updater (Tauri updater plugin)
- [ ] Channel server crash recovery UX in broadcaster
