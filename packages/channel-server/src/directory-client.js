export class DirectoryClient {
  constructor(directoryUrl, channelCfg) {
    this.url = directoryUrl.replace(/\/$/, '');
    this.channelCfg = channelCfg;
    this.id = null;
    this.secret = null;
    this._heartbeatTimer = null;
  }

  async register(streamUrl, thumbUrl, masked = true) {
    const { name, description, genre, type } = this.channelCfg;
    const headers = { 'Content-Type': 'application/json' };
    if (this.secret) headers['Authorization'] = `Bearer ${this.secret}`;
    const res = await fetch(`${this.url}/api/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, description, genre, type, stream_url: streamUrl, thumb_url: thumbUrl, masked }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Directory registration failed: ${body.error ?? res.status}`);
    }
    const { id, secret } = await res.json();
    this.id = id;
    this.secret = secret;
    return { id, secret };
  }

  startHeartbeat(getNowPlaying, getViewers, getEpg) {
    if (this._heartbeatTimer) return;
    this._send = async () => {
      if (!this.id) return;
      try {
        await fetch(`${this.url}/api/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.secret}`,
          },
          body: JSON.stringify({
            id: this.id,
            now_playing: getNowPlaying(),
            viewers: getViewers(),
            epg: getEpg?.() ?? null,
          }),
        });
      } catch (e) {
        console.error(`[directory] heartbeat failed: ${e.message}`);
      }
    };
    this._send();
    this._heartbeatTimer = setInterval(this._send, 30_000);
  }

  stopHeartbeat() {
    clearInterval(this._heartbeatTimer);
    this._heartbeatTimer = null;
  }

  flushHeartbeat() {
    if (this._send) this._send();
  }

  async updateUrls({ streamUrl, thumbUrl } = {}) {
    if (!this.id) return;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(`${this.url}/api/channels/${this.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.secret}` },
          body: JSON.stringify({ stream_url: streamUrl, thumb_url: thumbUrl }),
        });
        if (res.ok) return;
        console.error(`[directory] url update failed (${res.status}), attempt ${attempt}/3`);
      } catch (e) {
        console.error(`[directory] url update error: ${e.message}, attempt ${attempt}/3`);
      }
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }

  async deregister() {
    this.stopHeartbeat();
    if (!this.id) return;
    try {
      await fetch(`${this.url}/api/channels/${this.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.secret}` },
      });
    } catch { /* best-effort */ }
    this.id = null;
    this.secret = null;
  }
}
