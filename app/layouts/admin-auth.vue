<template>
  <main class="auth-shell">
    <div class="auth-theme"><ColorModeSwitcher /></div>
    <slot />
  </main>
</template>

<style scoped>
.auth-shell { display: grid; min-height: 100vh; place-items: center; padding: 24px; background: var(--color-background-secondary); }
.auth-theme { position: fixed; top: 22px; right: 22px; }
</style>
