import { updateToggleButton, setRangeValue, setText } from './dom-helpers';
import {
  degreesToRadians,
  formatAxis,
  formatAxisAngleFormula,
  formatComplexNumber,
  formatDegrees,
  formatNumber,
  formatQuaternion,
  formatSpinorPhase,
  pauliMatrixFromQuaternion,
  quaternionFromAxisAngle,
} from './quaternion-math';
import { createQuaternionThreeScene } from './quaternion-three-scene';
import type { AxisComponents, QuaternionFocus } from './quaternion-types';

type QuaternionLabState = {
  angleDegrees: number;
  axis: AxisComponents;
  speedDegreesPerSecond: number;
  playing: boolean;
  focus: QuaternionFocus;
  showGhosts: boolean;
};

const DEFAULT_AXIS: AxisComponents = { x: 0.35, y: 0.72, z: 0.59 };
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const AXIS_PRESETS: Record<string, AxisComponents> = {
  x: { x: 1, y: 0, z: 0 },
  y: { x: 0, y: 1, z: 0 },
  z: { x: 0, y: 0, z: 1 },
  diagonal: DEFAULT_AXIS,
};

const FOCUS_VALUES = new Set<string>(['full', 'body', 'spinor', 'bloch']);

export function initQuaternionLab(): void {
  document.querySelectorAll<HTMLElement>('[data-quaternion-lab]').forEach(initSingleLab);
}

function initSingleLab(labElement: HTMLElement): void {
  const sceneContainer = labElement.querySelector<HTMLElement>('[data-quaternion-scene]');
  if (!sceneContainer) {
    return;
  }

  const threeScene = createQuaternionThreeScene(sceneContainer);
  if (!threeScene) {
    setText(sceneContainer, '.quaternion-stage__fallback', 'WebGL is not available in this browser.');
    return;
  }

  const state: QuaternionLabState = {
    angleDegrees: 72,
    axis: { ...DEFAULT_AXIS },
    speedDegreesPerSecond: 26,
    playing: !window.matchMedia(REDUCED_MOTION_QUERY).matches,
    focus: 'full',
    showGhosts: true,
  };

  bindRangeControls(labElement, state);
  bindActionButtons(labElement, state);
  bindFocusButtons(labElement, state);
  bindAxisPresetButtons(labElement, state);

  let previousTimestamp = performance.now();
  let animationFrame = 0;

  const frame = (timestamp: number): void => {
    const deltaSeconds = Math.min((timestamp - previousTimestamp) / 1000, 0.06);
    previousTimestamp = timestamp;

    if (state.playing && state.speedDegreesPerSecond > 0) {
      state.angleDegrees =
        (state.angleDegrees + state.speedDegreesPerSecond * deltaSeconds + 720) % 720;
      setRangeValue(
        labElement,
        '[data-quaternion-control="angle"]',
        Math.round(state.angleDegrees),
      );
    }

    renderState(labElement, threeScene, state);
    animationFrame = window.requestAnimationFrame(frame);
  };

  window.addEventListener('pagehide', () => {
    window.cancelAnimationFrame(animationFrame);
    threeScene.dispose();
  });

  renderState(labElement, threeScene, state);
  animationFrame = window.requestAnimationFrame(frame);
}

function bindRangeControls(labElement: HTMLElement, state: QuaternionLabState): void {
  labElement
    .querySelectorAll<HTMLInputElement>('[data-quaternion-control]')
    .forEach((inputElement) => {
      inputElement.addEventListener('input', () => {
        const controlName = inputElement.dataset.quaternionControl;
        if (controlName === 'showGhosts') {
          state.showGhosts = inputElement.checked;
          return;
        }

        const nextValue = Number(inputElement.value);
        if (!Number.isFinite(nextValue)) {
          return;
        }

        if (controlName === 'angle') {
          state.angleDegrees = nextValue;
        } else if (controlName === 'axisX') {
          state.axis.x = nextValue;
        } else if (controlName === 'axisY') {
          state.axis.y = nextValue;
        } else if (controlName === 'axisZ') {
          state.axis.z = nextValue;
        } else if (controlName === 'speed') {
          state.speedDegreesPerSecond = nextValue;
        }
      });
    });
}

function bindActionButtons(labElement: HTMLElement, state: QuaternionLabState): void {
  labElement
    .querySelectorAll<HTMLButtonElement>('[data-quaternion-action]')
    .forEach((buttonElement) => {
      buttonElement.addEventListener('click', () => {
        const action = buttonElement.dataset.quaternionAction;
        if (action === 'toggle') {
          state.playing = !state.playing;
          updateToggleButton(buttonElement, state.playing);
        } else if (action === 'reset') {
          state.angleDegrees = 0;
          state.axis = { ...DEFAULT_AXIS };
          setRangeValue(labElement, '[data-quaternion-control="angle"]', state.angleDegrees);
          setAxisRangeValues(labElement, state.axis);
        }
      });
    });

  updateToggleButton(
    labElement.querySelector<HTMLButtonElement>('[data-quaternion-action="toggle"]'),
    state.playing,
  );
}

function bindFocusButtons(labElement: HTMLElement, state: QuaternionLabState): void {
  labElement.querySelectorAll<HTMLButtonElement>('[data-quaternion-focus]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextFocus = button.dataset.quaternionFocus;
      if (!isQuaternionFocus(nextFocus)) {
        return;
      }

      state.focus = nextFocus;
      updateFocusButtonState(labElement, state.focus);
    });
  });

  updateFocusButtonState(labElement, state.focus);
}

function bindAxisPresetButtons(labElement: HTMLElement, state: QuaternionLabState): void {
  labElement
    .querySelectorAll<HTMLButtonElement>('[data-quaternion-axis-preset]')
    .forEach((buttonElement) => {
      buttonElement.addEventListener('click', () => {
        const preset = buttonElement.dataset.quaternionAxisPreset;
        if (!preset || !(preset in AXIS_PRESETS)) {
          return;
        }

        state.axis = { ...AXIS_PRESETS[preset] };
        setAxisRangeValues(labElement, state.axis);
      });
    });
}

function renderState(
  labElement: HTMLElement,
  threeScene: ReturnType<typeof createQuaternionThreeScene>,
  state: QuaternionLabState,
): void {
  if (!threeScene) {
    return;
  }

  const angleRadians = degreesToRadians(state.angleDegrees);
  const quaternion = quaternionFromAxisAngle(state.axis, angleRadians);
  const pauliMatrix = pauliMatrixFromQuaternion(quaternion);

  setText(
    labElement,
    '[data-quaternion-output="angle"]',
    formatDegrees(Math.round(state.angleDegrees), 0),
  );
  setText(labElement, '[data-quaternion-output="axisX"]', formatNumber(state.axis.x, 2));
  setText(labElement, '[data-quaternion-output="axisY"]', formatNumber(state.axis.y, 2));
  setText(labElement, '[data-quaternion-output="axisZ"]', formatNumber(state.axis.z, 2));
  setText(
    labElement,
    '[data-quaternion-output="speed"]',
    `${Math.round(state.speedDegreesPerSecond)} deg/s`,
  );

  setText(labElement, '[data-quaternion-readout="quaternion"]', formatQuaternion(quaternion));
  setText(labElement, '[data-quaternion-readout="axis"]', formatAxis(state.axis));
  setText(
    labElement,
    '[data-quaternion-readout="spinorPhase"]',
    formatSpinorPhase(state.angleDegrees),
  );
  setText(
    labElement,
    '[data-quaternion-readout="axisAngleFormula"]',
    formatAxisAngleFormula(state.axis, state.angleDegrees),
  );
  setText(labElement, '[data-pauli-entry="m00"]', formatComplexNumber(pauliMatrix.m00));
  setText(labElement, '[data-pauli-entry="m01"]', formatComplexNumber(pauliMatrix.m01));
  setText(labElement, '[data-pauli-entry="m10"]', formatComplexNumber(pauliMatrix.m10));
  setText(labElement, '[data-pauli-entry="m11"]', formatComplexNumber(pauliMatrix.m11));

  threeScene.update({
    angleRadians,
    axis: state.axis,
    focus: state.focus,
    showGhosts: state.showGhosts,
  });
  threeScene.render();
}

function setAxisRangeValues(labElement: HTMLElement, axis: AxisComponents): void {
  setRangeValue(labElement, '[data-quaternion-control="axisX"]', axis.x);
  setRangeValue(labElement, '[data-quaternion-control="axisY"]', axis.y);
  setRangeValue(labElement, '[data-quaternion-control="axisZ"]', axis.z);
}

function updateFocusButtonState(labElement: HTMLElement, focus: QuaternionFocus): void {
  labElement.querySelectorAll<HTMLButtonElement>('[data-quaternion-focus]').forEach((button) => {
    const isActive = button.dataset.quaternionFocus === focus;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function isQuaternionFocus(value: string | undefined): value is QuaternionFocus {
  return typeof value === 'string' && FOCUS_VALUES.has(value);
}
