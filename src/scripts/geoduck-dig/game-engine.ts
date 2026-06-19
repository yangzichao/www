import {
  DAILY_GEODUCK_LIMIT,
  LOW_TIDE_LIMIT_FEET,
  TIDE_END_FEET,
  getOpenHoleCount,
  getSelectedTarget,
  getTideHeightFeet,
  toolConfigs,
} from './game-data';
import type { BeachTarget, GameMessageTone, GameState, ToolKind } from './types';

export function selectTarget(state: GameState, targetId: string): void {
  state.selectedTargetId = targetId;
  const target = getSelectedTarget(state);
  if (!target) {
    return;
  }

  pushMessage(state, target.visibleClue, 'normal');
}

export function selectTool(state: GameState, tool: ToolKind): void {
  state.selectedTool = tool;
}

export function applySelectedTool(state: GameState): void {
  if (state.gameOutcome !== 'playing') {
    return;
  }

  const tool = state.selectedTool;
  const target = getSelectedTarget(state);
  if (!target) {
    pushMessage(state, 'Select a siphon show on the beach first.', 'warn');
    return;
  }

  if (tool !== 'refill' && target.harvested) {
    pushMessage(state, 'That hole is already resolved. Refill it before leaving.', 'warn');
    return;
  }

  if (tool === 'refill') {
    refillHole(state, target);
    return;
  }

  spendActionCost(state, tool);
  if (state.energy <= 0) {
    state.energy = 0;
    state.gameOutcome = 'exhausted';
    pushMessage(state, 'You ran out of energy before safely finishing the dig.', 'bad');
    return;
  }

  if (tool === 'probe') {
    probeTarget(state, target);
  }

  if (tool === 'tube') {
    stabilizeHole(state, target);
  }

  if (tool === 'shovel') {
    digTarget(state, target, 0.42, 0.2);
  }

  if (tool === 'hand') {
    digTarget(state, target, 0.24, 0.08);
  }

  updateOutcome(state);
}

export function resetSelectionAfterResize(state: GameState): void {
  if (state.selectedTargetId && !getSelectedTarget(state)) {
    state.selectedTargetId = null;
  }
}

function probeTarget(state: GameState, target: BeachTarget): void {
  target.probed = true;
  state.score += target.kind === 'geoduck' ? 4 : 2;
  pushMessage(state, target.probeClue, target.kind === 'geoduck' ? 'good' : 'warn');
}

function stabilizeHole(state: GameState, target: BeachTarget): void {
  if (target.kind === 'rock' || target.kind === 'empty') {
    pushMessage(state, 'The tube has nothing useful to brace here.', 'warn');
    state.score -= 3;
    return;
  }

  target.stabilized = true;
  target.filled = false;
  state.score += 5;
  pushMessage(state, 'Tube set. The wall is less likely to cave while you dig.', 'good');
}

function digTarget(
  state: GameState,
  target: BeachTarget,
  baseDepthFeet: number,
  baseCollapseRisk: number,
): void {
  if (target.kind === 'rock') {
    state.score -= 8;
    pushMessage(state, 'The tool hits rock and wastes precious low tide.', 'bad');
    return;
  }

  target.filled = false;
  target.collapsed = false;
  const tidePenalty = Math.max(0, getTideHeightFeet(state.elapsedMinutes) - LOW_TIDE_LIMIT_FEET);
  const depthMultiplier = target.stabilized ? 1.08 : 0.86;
  const carefulBonus = state.selectedTool === 'hand' && target.probed ? 1.18 : 1;
  target.dugDepthFeet += baseDepthFeet * depthMultiplier * carefulBonus;

  const collapseRisk =
    baseCollapseRisk +
    (target.stabilized ? -0.13 : 0.12) +
    tidePenalty * 0.18 +
    Math.max(0, target.dugDepthFeet - 1.5) * 0.04;

  if (state.random() < collapseRisk) {
    target.collapsed = true;
    target.dugDepthFeet = Math.max(0.12, target.dugDepthFeet - (target.stabilized ? 0.24 : 0.55));
    state.score -= target.stabilized ? 5 : 12;
    pushMessage(state, 'The wet sand slumps into the hole. Stabilize or slow down.', 'bad');
    return;
  }

  if (target.dugDepthFeet >= target.depthFeet) {
    resolveDugTarget(state, target);
    return;
  }

  const remainingFeet = Math.max(0, target.depthFeet - target.dugDepthFeet);
  pushMessage(state, `${remainingFeet.toFixed(1)} ft to shell level. Keep the wall open.`, 'normal');
}

function resolveDugTarget(state: GameState, target: BeachTarget): void {
  target.dugDepthFeet = target.depthFeet;
  target.harvested = true;

  if (target.kind === 'geoduck') {
    if (state.harvestedGeoducks >= DAILY_GEODUCK_LIMIT) {
      state.score -= 20;
      pushMessage(state, 'Daily geoduck limit is already met. You back out and refill.', 'bad');
      return;
    }

    state.harvestedGeoducks += 1;
    state.score += target.probed ? 120 : 95;
    pushMessage(state, 'Geoduck landed. Now refill the hole before the tide catches you.', 'good');
    return;
  }

  if (target.kind === 'horseClam') {
    state.score -= target.probed ? 8 : 24;
    pushMessage(state, 'Horse clam. The plated siphon was the tell. Refill and move.', 'bad');
    return;
  }

  if (target.kind === 'butterClam') {
    state.score -= 10;
    pushMessage(state, 'Too shallow for geoduck. You found a small clam bed distraction.', 'warn');
    return;
  }

  state.score -= 6;
  pushMessage(state, 'Nothing harvestable under that show.', 'warn');
}

function refillHole(state: GameState, target: BeachTarget): void {
  if (target.dugDepthFeet <= 0 || target.filled) {
    pushMessage(state, 'No open hole here.', 'warn');
    return;
  }

  spendActionCost(state, 'refill');
  target.dugDepthFeet = 0;
  target.stabilized = false;
  target.filled = true;
  target.collapsed = false;
  state.score += 8;
  pushMessage(state, 'Hole refilled and beach surface restored.', 'good');
  updateOutcome(state);
}

function spendActionCost(state: GameState, tool: ToolKind): void {
  const config = toolConfigs[tool];
  const floodingPenalty = getTideHeightFeet(state.elapsedMinutes) > LOW_TIDE_LIMIT_FEET ? 1.3 : 1;
  state.elapsedMinutes += config.timeCostMinutes;
  state.energy -= Math.round(config.energyCost * floodingPenalty);
}

function updateOutcome(state: GameState): void {
  if (state.harvestedGeoducks >= DAILY_GEODUCK_LIMIT && getOpenHoleCount(state) === 0) {
    state.gameOutcome = 'success';
    state.score += Math.max(0, Math.round(state.energy * 0.4));
    pushMessage(state, 'Clean harvest: one geoduck, no open holes.', 'good');
    return;
  }

  if (getTideHeightFeet(state.elapsedMinutes) >= TIDE_END_FEET) {
    state.gameOutcome = 'tideOut';
    state.score -= getOpenHoleCount(state) * 30;
    pushMessage(state, 'The tide has pushed back over the flat. The dig is over.', 'bad');
    return;
  }

  if (state.energy <= 0) {
    state.energy = 0;
    state.gameOutcome = 'exhausted';
    pushMessage(state, 'You are too spent to keep digging safely.', 'bad');
  }
}

function pushMessage(state: GameState, text: string, tone: GameMessageTone): void {
  state.messageSequence += 1;
  state.messages = [{ id: state.messageSequence, text, tone }, ...state.messages].slice(0, 7);
}
