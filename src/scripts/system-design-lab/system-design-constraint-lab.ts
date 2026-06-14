import { formatControlValue, clamp } from './lab-formatters';
import { systemDesignLabDefinitionsById } from './lab-definitions';
import type {
  DecisionState,
  FlowState,
  LabAnalysis,
  NodeState,
  SystemDesignLabDefinition,
  WorkloadControlDefinition,
  WorkloadValues,
} from './lab-types';

export function initSystemDesignConstraintLabs(): void {
  document
    .querySelectorAll<HTMLElement>('[data-system-design-constraint-lab]')
    .forEach((labElement) => {
      if (labElement.dataset.initialized === 'true') {
        return;
      }

      const labId = labElement.dataset.labId;
      if (!labId) {
        return;
      }

      const definition = systemDesignLabDefinitionsById[labId];
      if (!definition) {
        return;
      }

      labElement.dataset.initialized = 'true';
      initLab(definition, labElement);
    });
}

function initLab(definition: SystemDesignLabDefinition, labElement: HTMLElement): void {
  const rangeControls = Array.from(
    labElement.querySelectorAll<HTMLInputElement>('input[type="range"][data-control]'),
  );
  const toggleControls = Array.from(
    labElement.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-toggle-control]'),
  );
  const scenarioButtons = Array.from(
    labElement.querySelectorAll<HTMLButtonElement>('[data-scenario-button]'),
  );

  if (rangeControls.length === 0) {
    return;
  }

  let activeScenarioId: string | null = definition.scenarios[0]?.id ?? null;

  const render = (): void => {
    const workload = readWorkloadValues(definition, rangeControls, toggleControls, labElement);
    const analysis = definition.analyze(workload);

    setText(labElement, '[data-architecture-title]', analysis.architectureTitle);
    setText(labElement, '[data-architecture-summary]', analysis.architectureSummary);
    setText(labElement, '[data-architecture-path]', analysis.architecturePath);

    updateNodes(labElement, analysis);
    updateFlows(labElement, analysis);
    updateMeters(definition, labElement, analysis);
    updateReasons(labElement, analysis.reasons);
    updateDecisionCards(definition, labElement, analysis);
    updateScenarioButtons(scenarioButtons, activeScenarioId);
  };

  const applyScenario = (scenarioId: string): void => {
    const scenario = definition.scenarios.find((preset) => preset.id === scenarioId);
    if (!scenario) {
      return;
    }

    rangeControls.forEach((inputElement) => {
      const control = findControlDefinition(definition, inputElement.dataset.control);
      if (!control) {
        return;
      }

      const value = scenario.values[control.id];
      if (typeof value === 'number') {
        inputElement.value = String(valueToSliderPosition(control, value));
      }
    });

    toggleControls.forEach((inputElement) => {
      const toggleDefinition = definition.toggles.find(
        (toggle) => toggle.id === inputElement.dataset.toggleControl,
      );
      if (!toggleDefinition) {
        return;
      }

      const value = scenario.values[toggleDefinition.id];
      inputElement.checked =
        typeof value === 'boolean' ? value : toggleDefinition.defaultValue;
    });

    activeScenarioId = scenarioId;
    render();
  };

  scenarioButtons.forEach((buttonElement) => {
    buttonElement.addEventListener('click', () => {
      applyScenario(buttonElement.dataset.scenarioId ?? definition.scenarios[0]?.id ?? '');
    });
  });

  rangeControls.forEach((inputElement) => {
    inputElement.addEventListener('input', () => {
      activeScenarioId = null;
      render();
    });
  });

  toggleControls.forEach((inputElement) => {
    inputElement.addEventListener('change', () => {
      activeScenarioId = null;
      render();
    });
  });

  if (activeScenarioId) {
    applyScenario(activeScenarioId);
  } else {
    render();
  }
}

function readWorkloadValues(
  definition: SystemDesignLabDefinition,
  rangeControls: HTMLInputElement[],
  toggleControls: HTMLInputElement[],
  labElement: HTMLElement,
): WorkloadValues {
  const values: WorkloadValues = {};

  rangeControls.forEach((inputElement) => {
    const control = findControlDefinition(definition, inputElement.dataset.control);
    if (!control) {
      return;
    }

    const value = sliderPositionToValue(control, inputElement);
    values[control.id] = value;

    const outputElement = labElement.querySelector<HTMLOutputElement>(
      `[data-control-output="${control.id}"]`,
    );
    if (outputElement) {
      outputElement.value = formatControlValue(control, value);
    }
  });

  toggleControls.forEach((inputElement) => {
    const toggleId = inputElement.dataset.toggleControl;
    if (toggleId) {
      values[toggleId] = inputElement.checked;
    }
  });

  return values;
}

function updateNodes(labElement: HTMLElement, analysis: LabAnalysis): void {
  Object.entries(analysis.nodeStates).forEach(([nodeId, state]) => {
    setNodeState(labElement, nodeId, state);
  });

  Object.entries(analysis.nodeTitles ?? {}).forEach(([nodeId, title]) => {
    setText(labElement, `[data-node-title="${nodeId}"]`, title);
  });

  Object.entries(analysis.nodeCopies ?? {}).forEach(([nodeId, copy]) => {
    setText(labElement, `[data-node-copy="${nodeId}"]`, copy);
  });
}

function updateFlows(labElement: HTMLElement, analysis: LabAnalysis): void {
  Object.entries(analysis.flowStates).forEach(([flowId, state]) => {
    setFlowState(labElement, flowId, state);
  });
}

function updateMeters(
  definition: SystemDesignLabDefinition,
  labElement: HTMLElement,
  analysis: LabAnalysis,
): void {
  definition.meters.forEach((meter) => {
    const meterAnalysis = analysis.meters[meter.id];
    updateMeter(
      labElement,
      meter.id,
      meterAnalysis?.ratio ?? 0,
      meterAnalysis?.valueText ?? '',
      meterAnalysis?.copy ?? '',
    );
  });
}

function updateDecisionCards(
  definition: SystemDesignLabDefinition,
  labElement: HTMLElement,
  analysis: LabAnalysis,
): void {
  definition.decisions.forEach((decision) => {
    const decisionAnalysis = analysis.decisions[decision.id];
    setDecision(
      labElement,
      decision.id,
      decisionAnalysis?.state ?? 'not-yet',
      decisionAnalysis?.copy ?? '',
    );
  });
}

function updateReasons(
  labElement: HTMLElement,
  reasons: Array<{ text: string; severity: string }>,
): void {
  const reasonsElement = labElement.querySelector<HTMLUListElement>('[data-reasons]');
  if (!reasonsElement) {
    return;
  }

  reasonsElement.replaceChildren(
    ...reasons.map((reason) => {
      const itemElement = document.createElement('li');
      itemElement.textContent = reason.text;
      itemElement.dataset.severity = reason.severity;
      return itemElement;
    }),
  );
}

function updateScenarioButtons(
  scenarioButtons: HTMLButtonElement[],
  activeScenarioId: string | null,
): void {
  scenarioButtons.forEach((buttonElement) => {
    buttonElement.setAttribute(
      'aria-pressed',
      String(buttonElement.dataset.scenarioId === activeScenarioId),
    );
  });
}

function updateMeter(
  labElement: HTMLElement,
  meterId: string,
  ratio: number,
  valueText: string,
  copy: string,
): void {
  const fillElement = labElement.querySelector<HTMLElement>(`[data-meter="${meterId}"]`);
  const valueElement = labElement.querySelector<HTMLElement>(`[data-meter-value="${meterId}"]`);
  const copyElement = labElement.querySelector<HTMLElement>(`[data-meter-copy="${meterId}"]`);
  const severity = ratio > 1 ? 'danger' : ratio > 0.7 ? 'warning' : 'ok';

  fillElement?.style.setProperty('--meter-level', `${Math.min(ratio * 100, 100)}%`);
  if (fillElement) {
    fillElement.dataset.severity = severity;
  }
  if (valueElement) {
    valueElement.textContent = valueText;
  }
  if (copyElement) {
    copyElement.textContent = copy;
  }
}

function setNodeState(labElement: HTMLElement, nodeId: string, state: NodeState): void {
  const nodeElements = labElement.querySelectorAll<HTMLElement>(
    `[data-node="${nodeId}"], [data-mobile-node="${nodeId}"]`,
  );
  nodeElements.forEach((nodeElement) => {
    nodeElement.dataset.state = state;
  });
}

function setFlowState(labElement: HTMLElement, flowId: string, state: FlowState): void {
  const flowElement = labElement.querySelector<HTMLElement>(`[data-flow="${flowId}"]`);
  if (flowElement) {
    flowElement.dataset.state = state;
  }
}

function setDecision(
  labElement: HTMLElement,
  decisionId: string,
  state: DecisionState,
  copy: string,
): void {
  const decisionElement = labElement.querySelector<HTMLElement>(`[data-decision="${decisionId}"]`);
  const copyElement = labElement.querySelector<HTMLElement>(`[data-decision-copy="${decisionId}"]`);
  if (decisionElement) {
    decisionElement.dataset.state = state;
  }
  if (copyElement) {
    copyElement.textContent = copy;
  }
}

function setText(labElement: HTMLElement, selector: string, text: string): void {
  const element = labElement.querySelector<HTMLElement>(selector);
  if (element) {
    element.textContent = text;
  }
}

function sliderPositionToValue(
  control: WorkloadControlDefinition,
  inputElement: HTMLInputElement,
): number {
  const sliderPosition = Number(inputElement.value);

  if (control.scale === 'log' && control.min > 0) {
    return control.min * Math.pow(control.max / control.min, sliderPosition / 100);
  }

  return control.min + (control.max - control.min) * (sliderPosition / 100);
}

function valueToSliderPosition(control: WorkloadControlDefinition, value: number): number {
  if (control.scale === 'log' && control.min > 0) {
    return clamp((Math.log(value / control.min) / Math.log(control.max / control.min)) * 100, 0, 100);
  }

  return clamp(((value - control.min) / (control.max - control.min)) * 100, 0, 100);
}

function findControlDefinition(
  definition: SystemDesignLabDefinition,
  controlId: string | undefined,
): WorkloadControlDefinition | undefined {
  return definition.controls.find((control) => control.id === controlId);
}
