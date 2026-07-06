import { YtKnob } from './knob.js';
import { YtFader } from './fader.js';
import { YtCrossfader } from './crossfader.js';
import { YtButton } from './button.js';
import { YtVumeter } from './vumeter.js';

export { YtKnob, YtFader, YtCrossfader, YtButton, YtVumeter };
export { ContinuousControl } from './base-control.js';
export { crossfadeGains, type CrossfadeCurve } from './crossfade.js';

const REGISTRY: Array<[string, CustomElementConstructor]> = [
  ['yt-knob', YtKnob],
  ['yt-fader', YtFader],
  ['yt-crossfader', YtCrossfader],
  ['yt-button', YtButton],
  ['yt-vumeter', YtVumeter],
];

/** Enregistre tous les contrôles (idempotent). */
export function defineControls(): void {
  for (const [tag, ctor] of REGISTRY) {
    if (!customElements.get(tag)) customElements.define(tag, ctor);
  }
}
