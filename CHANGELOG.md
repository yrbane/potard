# Changelog

## 0.3.0 — 2026-07-24 · « Sliders liés »

- Nouveau contrôle `<pt-slider>` : curseur en flèche, portion parcourue allumée (glow),
  bipolaire depuis zéro si `min < 0 < max`, `orientation="h|v"` (horizontal par défaut),
  couleur par instance via `color`, tous les attributs communs hérités.
- Nouveau contrôle `<pt-mix>` + `<pt-mix-track>` : groupe de sliders liés à somme
  constante (répartir un budget, des points de compétence, un pourcentage…).
  - Modes de compensation `prop` (prorata), `equal` (parts égales), `cascade`.
  - Verrouillage par piste (`locked` + cadenas cliquable, `aria-pressed`).
  - `step` avec somme exacte garantie (le reste d'arrondi est absorbé).
  - Normalisation des valeurs initiales vers `total` ; double-clic = répartition égale.
  - Par piste : `label`, `description`, `value`, `color`.
  - Événements `input`/`change` avec `detail: { values, labels, index }`.
- Logique de répartition pure exportée : `normalize`, `adjust`, `equalize`
  (types `MixMode`, `MixConstraints`), testée en isolation.
- Démo GitHub Pages : cartes `<pt-slider>` et `<pt-mix>` (budget 10 €, points de
  compétence), version affichée dans l'en-tête.

## 0.2.0 — 2026-07-06 · « Préfixe pt- et nouveaux contrôles »

- Rupture : tous les éléments passent sous le préfixe `pt-`.
- Nouveaux contrôles : `<pt-switch>`, `<pt-xy>`, `<pt-stepper>`, `<pt-led>`.
- Attributs communs des contrôles continus (`default`, `step`, `unit`, `sensitivity`, `curve`…).
- Page de documentation interactive déployée sur GitHub Pages.

## 0.1.0 — 2026-07-06 · « Première version »

- Contrôles audio Ableton/Traktor en Web Components : knob, fader, crossfader,
  VU-mètre, bouton. Rendu Canvas, zéro dépendance, clavier + ARIA.
- Utilitaire `crossfadeGains()` (courbes équi-puissance et sharp).
