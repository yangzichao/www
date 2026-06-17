export function getRequiredElement<T extends Element>(
  rootElement: ParentNode,
  selector: string,
): T | null {
  return rootElement.querySelector<T>(selector);
}

export function setText(
  rootElement: ParentNode,
  selector: string,
  nextText: string | number,
): void {
  const targetElement = rootElement.querySelector<HTMLElement>(selector);
  if (!targetElement) {
    return;
  }

  targetElement.textContent = String(nextText);
}

export function setRangeValue(
  rootElement: ParentNode,
  selector: string,
  nextValue: number,
): void {
  const inputElement = rootElement.querySelector<HTMLInputElement>(selector);
  if (!inputElement) {
    return;
  }

  inputElement.value = String(nextValue);
}

export function updateToggleButton(
  buttonElement: HTMLButtonElement | null,
  running: boolean,
): void {
  if (!buttonElement) {
    return;
  }

  const iconElement = buttonElement.querySelector<HTMLElement>('i');
  const labelElement = buttonElement.querySelector<HTMLElement>('span');

  buttonElement.classList.toggle('is-primary', running);
  if (iconElement) {
    iconElement.className = running ? 'ph ph-pause' : 'ph ph-play';
  }
  if (labelElement) {
    labelElement.textContent = running ? 'Pause' : 'Play';
  }
}
