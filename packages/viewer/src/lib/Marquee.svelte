<script>
  let { text = '', speed = 50 } = $props();

  let wrap = $state(null);
  let track = $state(null);
  let active = $state(false);
  let dur = $state('20s');

  $effect(() => {
    if (!wrap || !track) return;
    let raf;
    const measure = () => {
      const wrapW = wrap.clientWidth;
      const oneW = track.scrollWidth / 2; // track always contains text twice
      const needs = oneW > wrapW;
      active = needs;
      if (needs) dur = `${(oneW / speed).toFixed(1)}s`;
    };
    const ro = new ResizeObserver(() => { raf = requestAnimationFrame(measure); });
    ro.observe(wrap);
    measure();
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  });
</script>

<div class="mq" bind:this={wrap}>
  <div class="mq-track" class:active bind:this={track} style:--dur={dur}>
    <span>{text}&ensp;•&ensp;</span><span aria-hidden="true">{text}&ensp;•&ensp;</span>
  </div>
</div>

<style>
  .mq { overflow: hidden; white-space: nowrap; min-width: 0; }
  .mq-track { display: inline-flex; white-space: nowrap; }
  .mq-track.active { animation: mq-scroll var(--dur, 20s) linear infinite; }
  .mq-track.active:hover { animation-play-state: paused; }
  @keyframes mq-scroll {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
</style>
