<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <main class="admin auth-shell">
    <section class="auth-visual">
      <NuxtLink to="/" class="visual-brand">
        <span class="brand-mark">CB</span>
        <span class="brand-name">Carreyda Blog</span>
      </NuxtLink>

      <div class="visual-stage" aria-hidden="true">
        <div class="stage-ring" />
        <div class="art-window">
          <div class="art-bar">
            <span class="dot dot--close" />
            <span class="dot dot--min" />
            <span class="dot dot--max" />
            <em>untitled.md</em>
          </div>
          <div class="art-body">
            <span class="line line--1" />
            <span class="line line--2" />
            <span class="line line--3" />
            <span class="caret" />
          </div>
          <div class="art-foot">
            <span>Markdown · Vditor</span>
            <span>已自动保存</span>
          </div>
        </div>
        <span class="chip chip--posts">42 篇文章</span>
        <span class="chip chip--session">会话 7 天</span>
      </div>

      <div class="visual-copy">
        <span class="visual-kicker">CONTENT STUDIO</span>
        <h1>让每一次创作，<br>都保持专注。</h1>
        <p>一个为写作、发布和内容管理而设计的轻量工作台。</p>
      </div>
    </section>

    <section class="auth-panel">
      <div class="panel-theme"><ColorModeSwitcher /></div>
      <div class="panel-body">
        <slot />
      </div>
      <p class="panel-foot">© {{ year }} Carreyda Blog · Content Studio</p>
    </section>
  </main>
</template>

<style scoped>
.auth-shell {
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(0, 56%) minmax(420px, 44%);
  background: var(--admin-bg);
  font-family: var(--admin-font);
  -webkit-font-smoothing: antialiased;
}

/* ------------------------------------------------------------ left panel */

.auth-visual {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 32px;
  padding: clamp(28px, 3.2vw, 52px);
  background:
    radial-gradient(120% 80% at 12% 0%, var(--admin-accent-soft), transparent 62%),
    linear-gradient(180deg, var(--admin-surface) 0%, var(--admin-surface-2) 100%);
  overflow: hidden;
}

.auth-visual::after {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--admin-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--admin-border) 1px, transparent 1px);
  background-size: 44px 44px;
  content: '';
  opacity: .5;
  mask-image: radial-gradient(72% 60% at 50% 42%, #000 0%, transparent 100%);
  pointer-events: none;
}

.visual-brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--admin-text);
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 10px;
  background: var(--admin-accent);
  color: var(--admin-accent-contrast);
  font-size: 11.5px;
  font-weight: 700;
}

.brand-name {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -.01em;
}

.visual-stage {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  padding: 8px 0;
}

.stage-ring {
  position: absolute;
  width: min(78%, 420px);
  aspect-ratio: 1;
  border: 1px dashed var(--admin-border-strong);
  border-radius: 50%;
  opacity: .8;
}

.art-window {
  position: relative;
  width: min(100%, 380px);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-lg);
  background: var(--admin-surface);
  box-shadow: var(--admin-shadow-lg);
  overflow: hidden;
}

.art-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--admin-border);
  background: var(--admin-surface-2);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--admin-border-strong);
}

.dot--close { background: #ef9a94; }
.dot--min { background: #efc98f; }
.dot--max { background: #a9d3a2; }

.art-bar em {
  margin-left: 6px;
  padding: 1px 8px;
  border: 1px solid var(--admin-border);
  border-radius: 6px;
  background: var(--admin-surface);
  color: var(--admin-muted);
  font-size: 10.5px;
  font-style: normal;
  letter-spacing: .01em;
}

.art-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px 20px 26px;
}

.line {
  height: 8px;
  border-radius: 4px;
  background: var(--admin-hover);
}

.line--1 { width: 54%; background: var(--admin-accent-soft-hover); }
.line--2 { width: 82%; }
.line--3 { width: 66%; }

.caret {
  width: 2px;
  height: 14px;
  margin-top: 2px;
  background: var(--admin-accent);
  animation: caret-blink 1.2s steps(1) infinite;
}

.art-foot {
  display: flex;
  justify-content: space-between;
  padding: 10px 14px;
  border-top: 1px solid var(--admin-border);
  background: var(--admin-surface-2);
  color: var(--admin-faint);
  font-size: 10.5px;
}

.chip {
  position: absolute;
  padding: 6px 12px;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-pill);
  background: var(--admin-surface);
  box-shadow: var(--admin-shadow-sm);
  color: var(--admin-muted);
  font-size: 11px;
  white-space: nowrap;
}

.chip--posts {
  top: 6%;
  left: 2%;
}

.chip--session {
  bottom: 4%;
  left: 6%;
}

.visual-copy {
  position: relative;
  z-index: 1;
}

.visual-kicker {
  display: block;
  margin-bottom: 12px;
  color: var(--admin-accent-text);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .18em;
}

.visual-copy h1 {
  margin: 0;
  color: var(--admin-text);
  font-size: clamp(26px, 2.6vw, 34px);
  font-weight: 680;
  letter-spacing: -.035em;
  line-height: 1.24;
}

.visual-copy p {
  max-width: 34em;
  margin: 12px 0 0;
  color: var(--admin-muted);
  font-size: 13px;
  line-height: 1.7;
}

@keyframes caret-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

/* ----------------------------------------------------------- right panel */

.auth-panel {
  position: relative;
  display: grid;
  place-items: center;
  padding: 72px 48px;
  background: var(--admin-bg);
}

.panel-theme {
  position: absolute;
  top: 26px;
  right: 28px;
}

.panel-body {
  width: min(100%, 396px);
}

.panel-foot {
  position: absolute;
  bottom: 24px;
  margin: 0;
  color: var(--admin-faint);
  font-size: 11px;
  letter-spacing: .01em;
}

@media (max-width: 1100px) {
  .auth-shell {
    grid-template-columns: minmax(0, 1fr) minmax(380px, 46%);
  }

  .chip {
    display: none;
  }
}

@media (max-width: 880px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }

  .auth-visual {
    display: none;
  }

  .auth-panel {
    padding: 84px 24px 64px;
  }
}
</style>
