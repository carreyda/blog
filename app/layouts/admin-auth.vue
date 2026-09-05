<template>
  <main class="auth-shell">
    <section class="auth-brand" aria-label="Blog Content Studio">
      <NuxtLink to="/" class="brand-lockup"><span class="brand-symbol">//</span><strong>Blog</strong></NuxtLink>
      <div class="brand-copy">
        <span class="brand-kicker">CONTENT STUDIO</span>
        <h1>让每一次创作，<br>都保持专注。</h1>
        <p>一个为写作、发布和内容管理而设计的轻量工作台。</p>
      </div>
      <div class="brand-quote"><UIcon name="i-lucide-quote" /><p>Great writing begins with a quiet place to think.</p></div>
      <div class="brand-grid" aria-hidden="true" />
    </section>
    <section class="auth-content">
      <div class="auth-theme"><ColorModeSwitcher /></div>
      <slot />
      <p class="auth-footer">© {{ new Date().getFullYear() }} Blog Content Studio</p>
    </section>
  </main>
</template>

<style scoped>
.auth-shell{display:grid;min-height:100vh;grid-template-columns:minmax(380px,.85fr) minmax(480px,1.15fr);background:var(--color-background)}.auth-brand{position:relative;display:flex;overflow:hidden;min-height:100vh;flex-direction:column;justify-content:space-between;padding:42px;color:#fff;background:#0c111d}.brand-lockup{position:relative;z-index:1;display:flex;align-items:center;gap:8px;color:#fff;text-decoration:none}.brand-symbol{color:#4493f8;font-weight:900;letter-spacing:-.12em}.brand-lockup strong{font-size:15px}.brand-copy{position:relative;z-index:1;max-width:470px}.brand-kicker{display:block;margin-bottom:20px;color:#6ca9f5;font-size:11px;font-weight:700;letter-spacing:.18em}.brand-copy h1{margin:0;font-size:clamp(36px,4vw,58px);line-height:1.13;letter-spacing:-.05em}.brand-copy p{max-width:390px;margin:24px 0 0;color:#9099aa;font-size:14px;line-height:1.8}.brand-quote{position:relative;z-index:1;display:flex;align-items:center;gap:10px;color:#687386;font-size:11px}.brand-quote p{margin:0}.brand-grid{position:absolute;right:-180px;bottom:-250px;width:620px;height:620px;border-radius:50%;background:radial-gradient(circle,rgba(68,147,248,.18),transparent 62%),linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:auto,34px 34px,34px 34px;transform:rotate(-9deg)}.auth-content{position:relative;display:grid;min-height:100vh;place-items:center;padding:48px}.auth-theme{position:absolute;top:24px;right:28px}.auth-footer{position:absolute;bottom:24px;margin:0;color:var(--color-text-secondary);font-size:10px}@media(max-width:860px){.auth-shell{grid-template-columns:1fr}.auth-brand{display:none}.auth-content{padding:72px 24px 60px}}
</style>
