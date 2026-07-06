import { PtKnob } from './knob.js';
import { PtFader } from './fader.js';
import { PtCrossfader } from './crossfader.js';
import { PtButton } from './button.js';
import { PtVumeter } from './vumeter.js';
import { PtSwitch } from './switch.js';
import { PtXY } from './xy.js';
import { PtStepper } from './stepper.js';
import { PtLed } from './led.js';

export { PtKnob, PtFader, PtCrossfader, PtButton, PtVumeter, PtSwitch, PtXY, PtStepper, PtLed };
export { ContinuousControl, type ControlCurve } from './base-control.js';
export { crossfadeGains, type CrossfadeCurve } from './crossfade.js';

const REGISTRY: Array<[string, CustomElementConstructor]> = [
  ['pt-knob', PtKnob],
  ['pt-fader', PtFader],
  ['pt-crossfader', PtCrossfader],
  ['pt-button', PtButton],
  ['pt-vumeter', PtVumeter],
  ['pt-switch', PtSwitch],
  ['pt-xy', PtXY],
  ['pt-stepper', PtStepper],
  ['pt-led', PtLed],
];

/** Enregistre tous les contrôles (idempotent). */
export function defineControls(): void {
  for (const [tag, ctor] of REGISTRY) {
    if (!customElements.get(tag)) customElements.define(tag, ctor);
  }
}
