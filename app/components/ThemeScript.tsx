// Runs before hydration to set the correct theme class, preventing flash
export function ThemeScript() {
  const script = `
(function() {
  try {
    var theme = localStorage.getItem('theme') || 'system';
    var root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  } catch(e) {}
})();
`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
