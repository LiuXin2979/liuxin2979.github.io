// Adapted from AstroPaper's theme switch and Astro navigation hooks.
const key = "controls-theme";
const preference = matchMedia("(prefers-color-scheme: dark)");
let explicitTheme = readTheme();

function readTheme() {
  try {
    const saved = localStorage.getItem(key);
    if (saved === "dark" || saved === "light") return saved;
  } catch {}
}

function reflectTheme() {
  const theme = explicitTheme ?? (preference.matches ? "dark" : "light");
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = theme;
  const toggle = document.querySelector(".theme-toggle");
  toggle?.setAttribute("aria-pressed", String(isDark));
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark ? "#10141d" : "#ffffff");
}

document.addEventListener("click", event => {
  if (!(event.target instanceof Element) || !event.target.closest(".theme-toggle")) return;
  explicitTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem(key, explicitTheme); } catch {}
  reflectTheme();
});

document.addEventListener("astro:after-swap", reflectTheme);
preference.addEventListener("change", reflectTheme);
window.addEventListener("storage", event => {
  if (event.key !== key && event.key !== null) return;
  explicitTheme = readTheme();
  reflectTheme();
});
reflectTheme();
