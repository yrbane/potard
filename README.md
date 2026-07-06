# 🎛️ potard

> **Contrôles audio style Ableton/Traktor en Web Components.**
> Knobs, faders, crossfader, VU-mètres — rendu Canvas, zéro dépendance, accessibles au clavier.

*« Potard » : c'est comme ça que les sondiers et les DJs appellent un potentiomètre.* 🇫🇷

`potard` est né du projet [Youtubator](https://github.com/yrbane/youtubator) (table de mixage DJ pour players YouTube), mais fonctionne dans n'importe quelle page ou framework : ce sont des Custom Elements natifs.

## Installation

```bash
npm install potard          # (bientôt sur npm)
# ou en dépendance git :
npm install github:yrbane/potard
```

```ts
import { defineControls } from 'potard';
defineControls(); // enregistre tous les éléments (idempotent)
```

```html
<yt-knob min="-12" max="12" value="0" default="0" aria-label="EQ HI"></yt-knob>
<yt-fader min="0" max="1" value="0.8" default="0.8"></yt-fader>
<yt-crossfader></yt-crossfader>
<yt-vumeter></yt-vumeter>
<yt-button toggle>SYNC</yt-button>
```

## Composants

| Élément | Rôle | Attributs |
|---|---|---|
| `<yt-knob>` | Potentiomètre rotatif (anneau de valeur, bipolaire si `min < 0 < max`) | `min max value default label` |
| `<yt-fader>` | Fader vertical | `min max value default` |
| `<yt-crossfader>` | Crossfader horizontal, centré par défaut (−1 … 1) | `min max value default` |
| `<yt-vumeter>` | VU-mètre à segments avec mémoire de pic | propriétés `level` (0…1), `peak`, `resetPeak()` |
| `<yt-button>` | Bouton momentané (`press`) ou verrouillé (`toggle` → `change`) | `toggle` ; propriété `active` |

## Interactions (héritées d'Ableton/Traktor)

- **Drag vertical** (horizontal pour le crossfader) : 200 px = pleine course.
- **Shift** pendant le drag : précision ×10.
- **Double-clic** : retour à la valeur `default`.
- **Molette** : incréments de 1 % de la course.
- **Clavier** : flèches (±1 %), `Home`/`End` (min/max) — `role="slider"`, `aria-valuenow` synchronisés.

## Événements

Tous les contrôles continus émettent des `CustomEvent<number>` (la valeur dans `detail`) :

- `input` — en continu pendant le geste ;
- `change` — au relâchement (et après double-clic, molette, clavier).

```ts
knob.addEventListener('input', (e) => console.log((e as CustomEvent<number>).detail));
```

## Theming

Via CSS custom properties héritées — dimensionnez l'hôte comme n'importe quel élément :

```css
yt-knob   { width: 48px; height: 48px; --ctl-accent: #19c2ff; --ctl-track: #3a4048; }
yt-fader  { width: 36px; height: 160px; --ctl-accent: #ff8a1e; }
yt-button.active { background: var(--ctl-accent); }
```

## Utilitaire : courbes de crossfade

```ts
import { crossfadeGains } from 'potard';
crossfadeGains(0, 'constant-power');  // { a: 0.707, b: 0.707 } — équi-puissance
crossfadeGains(0, 'sharp');           // { a: 1, b: 1 }        — cut DJ
```

## Performance

Rendu **Canvas 2D dans le shadow DOM** : aucun layout/reflow pendant le drag, redraw uniquement sur changement via `requestAnimationFrame`, `devicePixelRatio` géré.

## Développement

```bash
pnpm install
pnpm test        # Vitest + happy-dom (TDD)
pnpm build       # tsc → dist/ (ESM + déclarations)
pnpm demo        # démo interactive (Vite)
```

## Licence

MIT
