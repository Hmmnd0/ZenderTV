export function buildToml(cfg) {
  const c   = cfg.channel   ?? {};
  const s   = cfg.stream    ?? {};
  const sc  = cfg.scheduler ?? {};
  const d   = cfg.directory ?? {};
  const srv = cfg.server    ?? {};

  const lines = [
    '[channel]',
    `name        = ${JSON.stringify(c.name ?? '')}`,
    `description = ${JSON.stringify(c.description ?? '')}`,
    `genre       = ${JSON.stringify(c.genre ?? 'general')}`,
    `type        = ${JSON.stringify(c.type ?? 'tv')}`,
    '',
    '[stream]',
    `resolution      = ${JSON.stringify(s.resolution ?? '1280x720')}`,
    `video_bitrate   = ${JSON.stringify(s.videoBitrate ?? '2500k')}`,
    `audio_bitrate   = ${JSON.stringify(s.audioBitrate ?? '128k')}`,
    `fps             = ${s.fps ?? 30}`,
    `segment_seconds = ${s.segmentSeconds ?? 6}`,
    '',
    '[scheduler]',
    `mode = ${JSON.stringify(sc.mode ?? 'shuffle')}`,
    '',
  ];

  for (const blk of (sc.blocks ?? [])) {
    lines.push('[[scheduler.blocks]]');
    lines.push(`days   = [${blk.days.map(d => JSON.stringify(d)).join(',')}]`);
    lines.push(`start  = ${JSON.stringify(blk.start)}`);
    lines.push(`folder = ${JSON.stringify(blk.folder)}`);
    lines.push(`order  = ${JSON.stringify(blk.order ?? 'shuffle')}`);
    lines.push('');
  }

  for (const rule of (sc.rules ?? [])) {
    lines.push('[[scheduler.rules]]');
    lines.push(`every_minutes = ${rule.every_minutes}`);
    lines.push(`folder        = ${JSON.stringify(rule.folder)}`);
    lines.push('');
  }

  lines.push('[directory]');
  lines.push(`url    = ${JSON.stringify(d.url ?? 'https://zender-directory.fly.dev')}`);
  lines.push(`public = ${d.public !== false}`);
  lines.push('');
  lines.push('[server]');
  lines.push(`port       = ${srv.port ?? 8047}`);
  lines.push(`mode       = ${JSON.stringify(srv.mode ?? 'relay')}`);
  lines.push(`relay_url  = ${JSON.stringify(srv.relayBaseUrl ?? '')}`);
  lines.push(`public_url = ${JSON.stringify(srv.publicUrl ?? '')}`);

  return lines.join('\n') + '\n';
}
