import { spawn } from 'child_process';
import { writeFileSync, appendFileSync, mkdirSync, existsSync, readFileSync, watch } from 'fs';
import { join } from 'path';

export class Broadcaster {
  constructor(workDir, cfg, onSegment, onError, onLog) {
    this.workDir = workDir;
    this.cfg = cfg;
    this.onSegment = onSegment;
    this.onError = onError;
    this.onLog = onLog;
    this.playlistTxt = join(workDir, 'playlist.txt');
    this.publicDir = join(workDir, 'public');
    this.ffmpeg = null;
    this.watcher = null;
    this.uptime = 0;
    this._uptimeInterval = null;
    this._restartCount = 0;
    mkdirSync(this.publicDir, { recursive: true });
  }

  start(firstFile) {
    if (this.ffmpeg) return;
    writeFileSync(this.playlistTxt, `file '${firstFile}'\n`);
    this._launchFfmpeg();
    this._uptimeInterval = setInterval(() => { this.uptime++; }, 1000);
    this._watchSegments();
  }

  enqueue(normPath) {
    appendFileSync(this.playlistTxt, `file '${normPath}'\n`);
  }

  _launchFfmpeg() {
    const { segmentSeconds } = this.cfg.stream;
    const m3u8 = join(this.publicDir, 'live.m3u8');
    const segPattern = join(this.publicDir, 'seg_%05d.ts');

    const args = [
      '-re', '-f', 'concat', '-safe', '0', '-i', this.playlistTxt,
      '-c', 'copy',
      '-f', 'hls',
      '-hls_time', String(segmentSeconds),
      '-hls_list_size', '10',
      '-hls_flags', 'delete_segments+append_list+omit_endlist',
      '-hls_segment_filename', segPattern,
      m3u8,
    ];

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    this.ffmpeg = proc;
    this._restartCount++;

    let stderrBuf = '';
    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();
      const lines = stderrBuf.split('\n');
      stderrBuf = lines.pop();
      for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        const isError = /error|invalid|fail|corrupt|abort/i.test(t) && !/^ffmpeg version/i.test(t);
        const isWarn  = /warning|discontinuity|mismatch|non monotonous/i.test(t);
        if (isError || isWarn) {
          const level = isError ? 'error' : 'warn';
          console.error(`[ffmpeg][${level}] ${t}`);
          this.onLog?.({ level, line: t });
        }
      }
    });

    proc.on('exit', (code, signal) => {
      // If a newer process is already running, this exit is from a killed-and-replaced
      // process — ignore it entirely so we don't wipe the current reference or trigger
      // a spurious auto-restart.
      if (this.ffmpeg !== proc) return;
      this.ffmpeg = null;
      const msg = signal ? `killed by ${signal}` : `exit code ${code}`;
      console.log(`[ffmpeg] process ended (${msg}), restarts so far: ${this._restartCount}`);
      this.onLog?.({ level: 'info', line: `ffmpeg ended — ${msg}` });
      this.onError?.(new Error(`ffmpeg exited: ${msg}`));
    });
  }

  // Kill current ffmpeg without triggering onError. Caller must call restartFrom().
  skip() {
    if (!this.ffmpeg) return;
    const proc = this.ffmpeg;
    this.ffmpeg = null; // clear before kill so the exit handler sees mismatch and no-ops
    proc.kill('SIGTERM');
  }

  restartFrom(normPath) {
    writeFileSync(this.playlistTxt, `file '${normPath}'\n`);
    this._launchFfmpeg();
  }

  stop() {
    clearInterval(this._uptimeInterval);
    this.watcher?.close();
    if (this.ffmpeg) {
      const proc = this.ffmpeg;
      this.ffmpeg = null; // clear before kill so exit handler no-ops
      proc.kill('SIGTERM');
    }
    this.uptime = 0;
  }

  _watchSegments() {
    let lastSeen = null;
    this.watcher = watch(this.publicDir, (event, filename) => {
      if (event === 'rename' && filename?.endsWith('.ts') && filename !== lastSeen) {
        const fullPath = join(this.publicDir, filename);
        if (existsSync(fullPath)) {
          lastSeen = filename;
          this.onSegment?.(fullPath);
        }
      }
    });
  }

}
