<script>
  import { buildToml } from './toml-builder.js';

  let { config = null, configPath = null, onSave, onClose } = $props();

  const isTauri = '__TAURI_INTERNALS__' in window || '__TAURI__' in window;

  let name        = $state(config?.channel?.name        ?? '');
  let description = $state(config?.channel?.description ?? '');
  let genre       = $state(config?.channel?.genre        ?? 'general');
  let type        = $state(config?.channel?.type         ?? 'tv');
  let saving      = $state(false);

  async function save() {
    saving = true;
    try {
      const updated = {
        ...config,
        channel: { ...config?.channel, name, description, genre, type },
      };
      if (isTauri && configPath) {
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        await writeTextFile(configPath, buildToml(updated));
      }
      onSave?.(updated);
      onClose?.();
    } catch (e) {
      console.error('channel info save failed:', e);
    } finally {
      saving = false;
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') onClose?.();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="backdrop" onclick={onClose} role="presentation">
  <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Channel Info">
    <div class="modal-header">
      <span class="modal-title">CHANNEL INFO</span>
      <button class="close-btn" onclick={onClose}>✕</button>
    </div>

    <div class="fields">
      <div class="field">
        <label for="ci-name">Name</label>
        <input id="ci-name" bind:value={name} placeholder="My Channel" />
      </div>
      <div class="field">
        <label for="ci-desc">Description</label>
        <textarea id="ci-desc" bind:value={description} rows="3" placeholder="About this channel…"></textarea>
      </div>
      <div class="field">
        <label for="ci-genre">Genre</label>
        <input id="ci-genre" bind:value={genre} placeholder="general" />
      </div>
      <div class="field">
        <label for="ci-type">Type</label>
        <select id="ci-type" bind:value={type}>
          <option value="tv">TV</option>
          <option value="radio">Radio</option>
        </select>
      </div>
    </div>

    <div class="modal-footer">
      <span class="hint">Changes take effect on next broadcast start.</span>
      <div class="actions">
        <button class="btn-cancel" onclick={onClose}>Cancel</button>
        <button class="btn-save" onclick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: #141414;
    border: 1px solid #2a2a2a;
    width: 380px;
    max-width: calc(100vw - 2rem);
    font-family: monospace;
    font-size: 0.82rem;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background: #0d0d0d;
    border-bottom: 1px solid #222;
  }

  .modal-title {
    color: #666;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
  }

  .close-btn {
    background: none;
    border: none;
    color: #444;
    cursor: pointer;
    font-size: 0.8rem;
    padding: 0.1rem 0.2rem;
  }
  .close-btn:hover { color: #aaa; }

  .fields {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .field label {
    color: #555;
    font-size: 0.7rem;
    letter-spacing: 0.05em;
  }

  .field input, .field textarea, .field select {
    background: #0d0d0d;
    border: 1px solid #2a2a2a;
    color: #ccc;
    font-family: monospace;
    font-size: 0.82rem;
    padding: 0.3rem 0.4rem;
    width: 100%;
  }

  .field textarea { resize: vertical; }

  .field input:focus, .field textarea:focus, .field select:focus {
    outline: none;
    border-color: #4a9;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-top: 1px solid #1a1a1a;
    background: #0d0d0d;
    gap: 0.5rem;
  }

  .hint {
    color: #333;
    font-size: 0.68rem;
    flex: 1;
  }

  .actions { display: flex; gap: 0.4rem; }

  .btn-cancel {
    background: none;
    border: 1px solid #2a2a2a;
    color: #555;
    padding: 0.25rem 0.6rem;
    cursor: pointer;
    font-family: monospace;
    font-size: 0.78rem;
  }
  .btn-cancel:hover { border-color: #444; color: #aaa; }

  .btn-save {
    background: #1a2a1a;
    border: 1px solid #4a9;
    color: #4f4;
    padding: 0.25rem 0.75rem;
    cursor: pointer;
    font-family: monospace;
    font-size: 0.78rem;
  }
  .btn-save:hover:not(:disabled) { background: #1e341e; }
  .btn-save:disabled { opacity: 0.4; cursor: default; }
</style>
