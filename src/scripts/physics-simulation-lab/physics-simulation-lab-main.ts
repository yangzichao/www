import { createDoublePendulum } from './double-pendulum';
import { createOrbitLab } from './orbit-lab';
import { createWaveInterference } from './wave-interference';
import type { SimulationController } from './simulation-types';

const simulationFactories = {
  'double-pendulum': createDoublePendulum,
  'orbit-lab': createOrbitLab,
  'wave-interference': createWaveInterference,
};

export function initPhysicsSimulationLab(): void {
  document.querySelectorAll<HTMLElement>('[data-physics-simulation-lab]').forEach((labElement) => {
    const tabButtons = Array.from(
      labElement.querySelectorAll<HTMLButtonElement>('[data-simulation-tab]'),
    );
    const panels = Array.from(labElement.querySelectorAll<HTMLElement>('[data-simulation-panel]'));
    const controllers = new Map<string, SimulationController>();
    let activeSimulationId = tabButtons[0]?.dataset.simulationTab ?? 'double-pendulum';

    panels.forEach((panelElement) => {
      const simulationId = panelElement.dataset.simulationPanel;
      if (!simulationId || !(simulationId in simulationFactories)) {
        return;
      }

      const controller = simulationFactories[simulationId as keyof typeof simulationFactories](
        panelElement,
      );
      if (controller) {
        controllers.set(simulationId, controller);
      }
    });

    const activateSimulation = (simulationId: string): void => {
      activeSimulationId = simulationId;

      tabButtons.forEach((buttonElement) => {
        const isActive = buttonElement.dataset.simulationTab === simulationId;
        buttonElement.classList.toggle('is-active', isActive);
        buttonElement.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      panels.forEach((panelElement) => {
        panelElement.classList.toggle(
          'is-active',
          panelElement.dataset.simulationPanel === simulationId,
        );
      });

      controllers.forEach((controller, controllerId) => {
        if (controllerId === simulationId) {
          controller.render();
          controller.start();
        } else {
          controller.stop();
        }
      });
    };

    tabButtons.forEach((buttonElement) => {
      buttonElement.addEventListener('click', () => {
        const nextSimulationId = buttonElement.dataset.simulationTab;
        if (!nextSimulationId || nextSimulationId === activeSimulationId) {
          return;
        }
        activateSimulation(nextSimulationId);
      });
    });

    activateSimulation(activeSimulationId);
  });
}
