export const themes = ["corporate", "business"] as const;

export type ThemeName = (typeof themes)[number];

const STORAGE_KEY = "theme";

// Lecture safe : si la valeur est inconnue, on retombe sur le thème par défaut.
export function getStoredTheme(): ThemeName | null {
  const value = localStorage.getItem(STORAGE_KEY);
  if (!value) return null;
  if ((themes as readonly string[]).includes(value)) return value as ThemeName;
  return null;
}

// DaisyUI se base sur l'attribut data-theme sur <html>.
export function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

// Au démarrage : applique le thème persisté, sinon "corporate".
export function initThemeFromStorage() {
  applyTheme(getStoredTheme() ?? "corporate");
}
