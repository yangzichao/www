export function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }
  return context;
}

export function getRangeValue(
  rootElement: HTMLElement,
  selector: string,
  fallbackValue: number,
): number {
  const inputElement = rootElement.querySelector<HTMLInputElement>(selector);
  if (!inputElement) {
    return fallbackValue;
  }
  return Number(inputElement.value);
}

export function setRangeValue(rootElement: HTMLElement, selector: string, value: number): void {
  const inputElement = rootElement.querySelector<HTMLInputElement>(selector);
  if (!inputElement) {
    return;
  }
  inputElement.value = String(value);
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
}

export function setText(
  rootElement: HTMLElement,
  selector: string,
  nextText: string | number,
): void {
  const targetElement = rootElement.querySelector<HTMLElement>(selector);
  if (!targetElement) {
    return;
  }
  targetElement.textContent = String(nextText);
}

export function updateButtonState(
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

export function forEachRangeControl(
  rootElement: HTMLElement,
  selector: string,
  callback: (inputElement: HTMLInputElement) => void,
): void {
  rootElement.querySelectorAll<HTMLInputElement>(selector).forEach(callback);
}
