import {
  DAILY_GEODUCK_LIMIT,
  STARTING_ENERGY,
  createInitialGameState,
  getOpenHoleCount,
  getSelectedTarget,
  getTargetProgressPercent,
  getTideHeightFeet,
  getTideLabel,
  toolConfigs,
} from './game-data';
import { applySelectedTool, resetSelectionAfterResize, selectTarget, selectTool } from './game-engine';
import { createBeachRenderer } from './renderer';
import type { GameOutcome, GameState, ToolKind } from './types';

type GameDom = {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  applyButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  tideValue: HTMLElement;
  tideStatus: HTMLElement;
  energyValue: HTMLElement;
  energyBar: HTMLElement;
  scoreValue: HTMLElement;
  holesValue: HTMLElement;
  limitValue: HTMLElement;
  selectedTitle: HTMLElement;
  selectedClue: HTMLElement;
  selectedDepth: HTMLElement;
  selectedProgress: HTMLElement;
  outcome: HTMLElement;
  logList: HTMLElement;
  toolButtons: HTMLButtonElement[];
};

export function initGeoduckDigGame(): void {
  const root = document.querySelector<HTMLElement>('[data-geoduck-game]');
  if (!root) {
    return;
  }

  const dom = collectDom(root);
  let state = createInitialGameState();
  const renderer = createBeachRenderer(dom.canvas);

  dom.toolButtons.forEach((button) => {
    const tool = button.dataset.tool;
    if (!isToolKind(tool)) {
      return;
    }

    button.addEventListener('click', () => {
      selectTool(state, tool);
      render();
    });
  });

  dom.applyButton.addEventListener('click', () => {
    applySelectedTool(state);
    render();
  });

  dom.resetButton.addEventListener('click', () => {
    state = createInitialGameState();
    render();
  });

  dom.canvas.addEventListener('click', (event) => {
    const target = renderer.getTargetAtPoint(state, event.clientX, event.clientY);
    if (!target) {
      return;
    }

    selectTarget(state, target.id);
    render();
  });

  const resizeObserver = new ResizeObserver(() => {
    renderer.resize();
    resetSelectionAfterResize(state);
    render();
  });
  resizeObserver.observe(dom.canvas);

  render();

  function render(): void {
    renderer.render(state);
    renderDom(dom, state);
  }
}

function collectDom(root: HTMLElement): GameDom {
  return {
    root,
    canvas: getElement(root, '[data-beach-canvas]', HTMLCanvasElement),
    applyButton: getElement(root, '[data-apply-tool]', HTMLButtonElement),
    resetButton: getElement(root, '[data-reset-game]', HTMLButtonElement),
    tideValue: getElement(root, '[data-tide-value]', HTMLElement),
    tideStatus: getElement(root, '[data-tide-status]', HTMLElement),
    energyValue: getElement(root, '[data-energy-value]', HTMLElement),
    energyBar: getElement(root, '[data-energy-bar]', HTMLElement),
    scoreValue: getElement(root, '[data-score-value]', HTMLElement),
    holesValue: getElement(root, '[data-holes-value]', HTMLElement),
    limitValue: getElement(root, '[data-limit-value]', HTMLElement),
    selectedTitle: getElement(root, '[data-selected-title]', HTMLElement),
    selectedClue: getElement(root, '[data-selected-clue]', HTMLElement),
    selectedDepth: getElement(root, '[data-selected-depth]', HTMLElement),
    selectedProgress: getElement(root, '[data-selected-progress]', HTMLElement),
    outcome: getElement(root, '[data-outcome]', HTMLElement),
    logList: getElement(root, '[data-log-list]', HTMLElement),
    toolButtons: Array.from(root.querySelectorAll<HTMLButtonElement>('[data-tool]')),
  };
}

function renderDom(dom: GameDom, state: GameState): void {
  const selectedTarget = getSelectedTarget(state);
  const tideHeightFeet = getTideHeightFeet(state.elapsedMinutes);
  const energyPercent = Math.max(0, Math.min(100, Math.round((state.energy / STARTING_ENERGY) * 100)));

  dom.root.dataset.outcome = state.gameOutcome;
  dom.tideValue.textContent = getTideLabel(state.elapsedMinutes);
  dom.tideStatus.textContent = tideHeightFeet <= -2 ? 'diggable' : 'flooding';
  dom.energyValue.textContent = `${Math.max(0, state.energy)}`;
  dom.energyBar.style.width = `${energyPercent}%`;
  dom.scoreValue.textContent = `${state.score}`;
  dom.holesValue.textContent = `${getOpenHoleCount(state)}`;
  dom.limitValue.textContent = `${state.harvestedGeoducks}/${DAILY_GEODUCK_LIMIT}`;

  if (selectedTarget) {
    dom.selectedTitle.textContent = selectedTarget.probed ? getResolvedName(selectedTarget.kind) : 'Selected show';
    dom.selectedClue.textContent = selectedTarget.probed
      ? selectedTarget.probeClue
      : selectedTarget.visibleClue;
    dom.selectedDepth.textContent =
      selectedTarget.dugDepthFeet > 0
        ? `${selectedTarget.dugDepthFeet.toFixed(1)} ft dug`
        : 'Surface read only';
    dom.selectedProgress.style.width = `${getTargetProgressPercent(selectedTarget)}%`;
  } else {
    dom.selectedTitle.textContent = 'No show selected';
    dom.selectedClue.textContent = 'Click a dimple, keyhole, or siphon mark on the beach.';
    dom.selectedDepth.textContent = '0.0 ft dug';
    dom.selectedProgress.style.width = '0%';
  }

  dom.applyButton.disabled = state.gameOutcome !== 'playing';
  dom.applyButton.textContent =
    state.gameOutcome === 'playing' ? `Use ${toolConfigs[state.selectedTool].label}` : 'Dig Closed';
  dom.outcome.textContent = getOutcomeText(state.gameOutcome);
  dom.outcome.dataset.tone = getOutcomeTone(state.gameOutcome);

  dom.toolButtons.forEach((button) => {
    const tool = button.dataset.tool;
    const active = tool === state.selectedTool;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', `${active}`);
  });

  dom.logList.replaceChildren(
    ...state.messages.map((message) => {
      const item = document.createElement('li');
      item.textContent = message.text;
      item.dataset.tone = message.tone;
      return item;
    }),
  );
}

function getElement<T extends Element>(
  root: ParentNode,
  selector: string,
  elementClass: { new (): T },
): T {
  const element = root.querySelector(selector);
  if (!(element instanceof elementClass)) {
    throw new Error(`Missing element: ${selector}`);
  }

  return element;
}

function isToolKind(tool: string | undefined): tool is ToolKind {
  return tool === 'probe' || tool === 'tube' || tool === 'shovel' || tool === 'hand' || tool === 'refill';
}

function getResolvedName(kind: string): string {
  if (kind === 'geoduck') {
    return 'Geoduck candidate';
  }

  if (kind === 'horseClam') {
    return 'Horse clam';
  }

  if (kind === 'butterClam') {
    return 'Shallow clam';
  }

  if (kind === 'rock') {
    return 'Rock shelf';
  }

  return 'Empty show';
}

function getOutcomeText(outcome: GameOutcome): string {
  if (outcome === 'success') {
    return 'Clean harvest';
  }

  if (outcome === 'tideOut') {
    return 'Tide closed';
  }

  if (outcome === 'exhausted') {
    return 'Spent';
  }

  return 'Low tide active';
}

function getOutcomeTone(outcome: GameOutcome): string {
  if (outcome === 'success') {
    return 'good';
  }

  if (outcome === 'playing') {
    return 'normal';
  }

  return 'bad';
}
