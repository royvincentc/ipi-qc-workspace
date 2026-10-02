(() => {
  let theme = 'light';
  try {
    const saved = window.localStorage.getItem('ipi.theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch {
    // The light theme remains the default when browser storage is unavailable.
  }
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#081117' : '#f4f7f8');
})();
