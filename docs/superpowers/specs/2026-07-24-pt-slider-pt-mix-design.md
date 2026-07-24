# Spec — `pt-slider` et `pt-mix` (sliders liés à somme constante)

Date : 2026-07-24 · Statut : validé en brainstorming · Version cible : 0.3.0 (minor)

## Objectif

Deux nouveaux composants pour la librairie potard :

1. **`<pt-slider>`** — un slider autonome au rendu distinctif : curseur en petite
   flèche, portion parcourue allumée.
2. **`<pt-mix>`** — un groupe de sliders liés qui répartissent une valeur totale
   constante (budget en €, points de compétence, 100 % à distribuer…).

## 1. `<pt-slider>` — contrôle continu autonome

### Rendu

- Piste fine ; la portion **parcourue est allumée** : remplissage lumineux dans la
  couleur d'accent (thémable), léger glow façon LED.
- Le curseur est une **petite flèche** (triangle) pointant vers la piste.
- `orientation="h|v"` — **horizontal par défaut** (flèche au-dessus de la piste,
  remplissage de gauche à droite). En vertical : flèche sur le côté, remplissage
  de bas en haut.
- **Bipolaire** si `min < 0 < max` : le remplissage part du zéro (comme `pt-knob`).

### Attributs

Tous les attributs communs des contrôles continus (hérités de `base-control.ts`) :
`min`, `max`, `value`, `default`, `step`, `label`, `unit`, `disabled`,
`sensitivity`, `curve` — plus `orientation` et `color` (teinte du remplissage et
de la flèche, sinon couleur d'accent du thème).

### Interactions et accessibilité

Identiques aux autres contrôles continus : drag (selon l'orientation), molette,
flèches clavier, double-clic → `default`. `role="slider"`,
`aria-valuemin/max/now`, `aria-valuetext` avec `unit`. Événements `input`
(continu) et `change` (relâchement).

## 2. `<pt-mix>` — groupe à somme constante

### API HTML

```html
<pt-mix total="10" unit="€" mode="prop" step="0.01">
  <pt-mix-track label="Courses" description="Alimentation" value="4" color="#3ddc84"></pt-mix-track>
  <pt-mix-track label="Loisirs" value="3" color="#ffb400" locked></pt-mix-track>
  <pt-mix-track label="Épargne" value="3"></pt-mix-track>
</pt-mix>
```

### Attributs de `<pt-mix>`

| Attribut | Rôle | Défaut |
|---|---|---|
| `total` | Somme constante à répartir | `100` |
| `unit` | Unité affichée par piste et en `aria-valuetext` | — |
| `mode` | Stratégie de compensation : `prop`, `equal`, `cascade` | `prop` |
| `step` | Granularité ; **continu si absent** | — |
| `orientation` | `h` : sliders horizontaux empilés · `v` : colonnes verticales | `h` |
| `label` | Libellé du groupe | — |
| `disabled` | Désactive tout le groupe | — |

### Attributs de `<pt-mix-track>` (par piste)

| Attribut | Rôle |
|---|---|
| `label` | Nom de la piste (affiché + `aria-label`) |
| `description` | Sous-libellé / tooltip |
| `value` | Valeur initiale (avant normalisation) |
| `color` | Teinte du remplissage allumé et de la flèche de cette piste |
| `locked` | Piste verrouillée : valeur intouchable, exclue de la compensation |

Chaque `pt-mix-track` expose une propriété `value` en lecture/écriture et
`locked` reflété (cadenas cliquable dans l'UI, bouton `aria-pressed`).

### Comportement

- **Normalisation à l'init** : si les `value` initiales ne totalisent pas
  `total`, elles sont remises à l'échelle proportionnellement ; les pistes sans
  `value` se partagent également le restant. Jamais d'état invalide.
- **Compensation** : quand une piste bouge, les pistes **libres** (non `locked`)
  absorbent la différence selon `mode` :
  - `prop` : au prorata de leur valeur actuelle (une piste à 0 reste à 0) ;
  - `equal` : différence répartie également entre les pistes libres ;
  - `cascade` : on puise dans la piste suivante, puis la suivante quand elle est
    épuisée.
- Si toutes les autres pistes sont verrouillées (ou saturées), la piste
  manipulée est bloquée.
- **Somme exacte avec `step`** : toutes les valeurs sont arrondies au step ; le
  reste d'arrondi est absorbé par la dernière piste libre, garantissant
  `Σ values === total` exactement.
- **Double-clic** sur une piste : répartition égale du disponible (total moins
  les pistes verrouillées) entre les pistes libres.
- Interactions héritées par piste : drag, molette, flèches clavier.

### Rendu

Pistes rendues avec des `pt-slider` horizontaux **empilés** : label (+
description en dessous, plus discret) à gauche, slider au centre, valeur + unité
à droite, cadenas au bout. `orientation="v"` bascule en colonnes côte à côte.

### Événements

`input` (continu) et `change` (au relâchement) émis sur `<pt-mix>` avec
`detail: { values: number[], labels: string[], index: number }` (`index` =
piste manipulée).

## Architecture

- **`src/distribute.ts`** — module **pur, sans DOM** : normalisation,
  compensation `prop`/`equal`/`cascade`, verrouillage, arrondi au step avec
  somme exacte. Toute la logique métier vit ici, testée unitairement.
- **`src/slider.ts`** — `<pt-slider>`, étend la base des contrôles continus
  (`base-control.ts`), n'apporte que le rendu flèche + piste allumée et
  l'orientation.
- **`src/mix.ts`** — `<pt-mix>` + `<pt-mix-track>` : orchestration DOM,
  slot/observation des tracks, délégation du calcul à `distribute.ts`,
  émission des événements.
- Enregistrement dans `src/index.ts` (`defineControls`).

## Tests (TDD)

- **`distribute.test.ts`** : chaque mode ; pistes verrouillées ; step + somme
  exacte ; cas dégénérés (1 piste, tout verrouillé, total 0, valeurs initiales
  toutes nulles) ; normalisation à l'init.
- **`slider.test.ts`** : attributs communs, orientation, bipolaire, événements,
  a11y (happy-dom, comme l'existant).
- **`mix.test.ts`** : synchro attributs ↔ propriétés, événements et `detail`,
  cadenas, normalisation, désactivation groupe.

## Livraison

- Bump **minor** 0.2.0 → **0.3.0**, entrée CHANGELOG, README (tableaux
  Composants + Attributs), démo GitHub Pages : exemples budget 10 €, skills RPG
  (step=1), dons 100 %.
- Mise à jour des vitrines publiques (profil GitHub + yrbane.github.io) avec
  captures fraîches.

## Hors périmètre (YAGNI)

- Ajout/suppression dynamique de pistes par l'UI (possible via DOM, pas de
  bouton « + »).
- Répartition pondérée par des poids distincts des valeurs.
- Animation de transition entre répartitions.
