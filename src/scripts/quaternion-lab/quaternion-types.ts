export type AxisComponents = {
  x: number;
  y: number;
  z: number;
};

export type QuaternionComponents = {
  w: number;
  x: number;
  y: number;
  z: number;
};

export type ComplexNumber = {
  real: number;
  imaginary: number;
};

export type PauliMatrixEntries = {
  m00: ComplexNumber;
  m01: ComplexNumber;
  m10: ComplexNumber;
  m11: ComplexNumber;
};

export type QuaternionFocus = 'full' | 'body' | 'spinor' | 'bloch';

export type QuaternionSceneState = {
  axis: AxisComponents;
  angleRadians: number;
  focus: QuaternionFocus;
  showGhosts: boolean;
};
