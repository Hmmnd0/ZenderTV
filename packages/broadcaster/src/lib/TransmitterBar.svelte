<script>
  let { state, onToggleOnAir, onStopServer, onEditInfo, channelName, connected = false, startupPhase = null, playNowEncoding = null } = $props();
  import { formatUptime } from './channel-server.js';

  const isStartingUp = $derived(!!startupPhase && !state.onAir);

  const phaseLabel = $derived.by(() => {
    if (!startupPhase) return '';
    const p = startupPhase.phase;
    if (p === 'normalizing') return `Encoding ${startupPhase.file ?? 'video'}…`;
    if (p === 'starting_stream') return 'Starting stream…';
    if (p === 'waiting_stream') return 'Waiting for first segment…';
    if (p === 'registering') return 'Going live…';
    return 'Initializing…';
  });
</script>

<div class="transmitter" class:on-air={state.onAir} class:starting-up={isStartingUp}>
  <button
    class="on-air-btn"
    class:active={state.onAir}
    class:preparing={isStartingUp}
    onclick={onToggleOnAir}
    disabled={(!connected && !state.onAir) || isStartingUp}
    title={
      isStartingUp ? 'Starting up…' :
      !connected && !state.onAir ? 'Create a channel first' :
      state.onAir ? 'Click to go OFF AIR' : 'Click to go ON AIR'
    }
  >
    <span class="led" class:lit={state.onAir} class:spin={isStartingUp}></span>
    {#if isStartingUp}
      ⟳ PREPARING
    {:else}
      {state.onAir ? '⦿ ON AIR' : '○ OFF AIR'}
    {/if}
  </button>

  <div class="center">
    <span class="channel-name">{channelName ?? 'Unnamed Channel'}</span>
    {#if isStartingUp && phaseLabel}
      <span class="phase-label">{phaseLabel}</span>
    {:else if playNowEncoding}
      <span class="phase-label encoding">⟳ Encoding {playNowEncoding.split('/').pop()?.replace(/\.\w{2,4}$/, '') ?? ''}…</span>
    {/if}
  </div>

  {#if state.onAir}
    <span class="viewers">👁 {state.viewers ?? 0}</span>
    <span class="uptime">⏱ {formatUptime(state.uptime ?? 0)}</span>
    <span class="mode-badge mode-{state.mode ?? 'direct'}">
      {state.mode === 'relay' ? '🔒 RELAY' : state.mode === 'tunnel' ? '🌐 TUNNEL' : '⚡ DIRECT'}
    </span>
  {/if}

  {#if connected}
    <button class="info-btn" onclick={onEditInfo} title="Edit channel info">✎ INFO</button>
    <button class="stop-btn" onclick={onStopServer} title="Stop channel server">■ STOP</button>
  {/if}

  {#if isStartingUp}
    <div class="progress-track">
      <div class="progress-bar"></div>
    </div>
  {/if}
</div>

<style>
  .transmitter {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0.75rem;
    background: #111;
    border-bottom: 2px solid #222;
    font-family: monospace;
    font-size: 0.85rem;
    color: #aaa;
    position: relative;
  }

  .transmitter.on-air {
    border-bottom-color: #c00;
    background: #150000;
  }

  .transmitter.starting-up {
    border-bottom-color: #660;
    background: #111500;
  }

  .center {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .on-air-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: #1a1a1a;
    border: 1px solid #333;
    color: #aaa;
    padding: 0.3rem 0.75rem;
    cursor: pointer;
    font-family: monospace;
    font-size: 0.85rem;
    font-weight: bold;
    letter-spacing: 0.05em;
    flex-shrink: 0;
  }

  .on-air-btn.active {
    border-color: #c00;
    color: #f44;
  }

  .on-air-btn.preparing {
    border-color: #880;
    color: #cc4;
    cursor: not-allowed;
  }

  .on-air-btn:disabled { opacity: 0.6; }

  .led {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #333;
    flex-shrink: 0;
  }

  .led.lit {
    background: #f00;
    box-shadow: 0 0 6px #f00;
    animation: pulse 2s infinite;
  }

  .led.spin {
    background: #aa0;
    box-shadow: 0 0 6px #aa0;
    animation: blink 0.8s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.2; }
  }

  .channel-name { font-weight: bold; color: #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .phase-label {
    font-size: 0.72rem;
    color: #887733;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 260px;
  }

  .phase-label.encoding { color: #4a8; }

  .viewers, .uptime { color: #777; }

  .mode-badge {
    font-size: 0.75rem;
    padding: 0.1rem 0.4rem;
    border: 1px solid #333;
  }
  .mode-relay { color: #4af; border-color: #4af4; }
  .mode-direct { color: #fa4; border-color: #fa44; }
  .mode-tunnel { color: #4f4; border-color: #4f44; }

  .info-btn {
    margin-left: auto;
    background: none;
    border: 1px solid #2a2a2a;
    color: #666;
    padding: 0.2rem 0.6rem;
    cursor: pointer;
    font-family: monospace;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    transition: border-color 0.15s, color 0.15s;
  }
  .info-btn:hover { border-color: #555; color: #aaa; }

  .stop-btn {
    margin-left: 0;
    background: none;
    border: 1px solid #4a2222;
    color: #844;
    padding: 0.2rem 0.6rem;
    cursor: pointer;
    font-family: monospace;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    transition: border-color 0.15s, color 0.15s;
  }
  .stop-btn:hover { border-color: #c00; color: #f44; }

  /* Indeterminate progress bar — sits flush at the bottom of the bar */
  .progress-track {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: #1a1a00;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    width: 40%;
    background: linear-gradient(90deg, transparent, #aa8800, #ffdd00, #aa8800, transparent);
    animation: sweep 1.6s ease-in-out infinite;
  }

  @keyframes sweep {
    0%   { transform: translateX(-150%); }
    100% { transform: translateX(350%); }
  }
</style>
