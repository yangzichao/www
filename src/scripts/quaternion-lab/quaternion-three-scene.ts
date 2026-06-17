import {
  AmbientLight,
  ArrowHelper,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Float32BufferAttribute,
  GridHelper,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Quaternion as ThreeQuaternion,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { normalizeAxis } from './quaternion-math';
import type { QuaternionSceneState } from './quaternion-types';

type QuaternionThreeScene = {
  update: (state: QuaternionSceneState) => void;
  render: () => void;
  resize: () => void;
  dispose: () => void;
};

type DisposableObject = Object3D & {
  geometry?: BufferGeometry;
  material?: Material | Material[];
};

const CAMERA_TARGETS = {
  full: {
    position: new Vector3(0, 4.7, 12.8),
    target: new Vector3(0, 0.05, 0),
  },
  body: {
    position: new Vector3(3.8, 2.35, 5.4),
    target: new Vector3(0, 0.05, 0),
  },
  spinor: {
    position: new Vector3(-6.1, 2.8, 6.6),
    target: new Vector3(-1.65, 0.05, 0),
  },
  bloch: {
    position: new Vector3(6.1, 2.8, 6.6),
    target: new Vector3(1.65, 0.05, 0),
  },
};

const IDENTITY_QUATERNION = new ThreeQuaternion();
const FULL_SPINOR_TURN = Math.PI * 4;

export function createQuaternionThreeScene(
  containerElement: HTMLElement,
): QuaternionThreeScene | null {
  if (!isWebGlAvailable()) {
    return null;
  }

  containerElement.querySelector('.quaternion-stage__fallback')?.remove();

  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 0.1, 100);
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  const controls = new OrbitControls(camera, renderer.domElement);

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D quaternion rotation scene');
  renderer.domElement.setAttribute('role', 'img');
  containerElement.appendChild(renderer.domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3.1;
  controls.maxDistance = 12;

  scene.add(new AmbientLight(0xffffff, 1.35));
  const keyLight = new DirectionalLight(0xffffff, 2.1);
  keyLight.position.set(4.2, 6, 3.4);
  scene.add(keyLight);
  const rimLight = new DirectionalLight(0x85f0db, 1.1);
  rimLight.position.set(-5, 3, -4);
  scene.add(rimLight);

  const grid = new GridHelper(9.5, 18, 0x496057, 0x26302b);
  grid.position.y = -1.28;
  scene.add(grid);

  const constellation = createConstellation();
  scene.add(constellation);

  const bodyRig = createBodyRig(1, true);
  scene.add(bodyRig);

  const ghostRigs = [0.25, 0.5, 0.75].map((_, index) => {
    const ghostRig = createBodyRig(0.18 - index * 0.035, false);
    ghostRig.scale.setScalar(1 + index * 0.04);
    scene.add(ghostRig);
    return ghostRig;
  });

  const axisPositiveArrow = new ArrowHelper(
    new Vector3(0, 1, 0),
    new Vector3(0, 0, 0),
    2.72,
    0xf2a71b,
    0.28,
    0.13,
  );
  const axisNegativeArrow = new ArrowHelper(
    new Vector3(0, -1, 0),
    new Vector3(0, 0, 0),
    1.45,
    0xf2a71b,
    0.18,
    0.08,
  );
  scene.add(axisPositiveArrow, axisNegativeArrow);

  const axisLabel = createSpriteLabel('axis u', '#f2a71b');
  scene.add(axisLabel);

  const rotationArc = new Line(
    new BufferGeometry(),
    new LineBasicMaterial({
      color: 0xd946ef,
      transparent: true,
      opacity: 0.9,
    }),
  );
  scene.add(rotationArc);

  const spinorGroup = createSpinorDoubleCover();
  scene.add(spinorGroup.group);

  const blochGroup = createBlochSphere();
  scene.add(blochGroup.group);

  let currentFocus: QuaternionSceneState['focus'] | null = null;

  const applyFocus = (focus: QuaternionSceneState['focus']): void => {
    const nextCameraTarget = CAMERA_TARGETS[focus];
    camera.position.copy(nextCameraTarget.position);
    controls.target.copy(nextCameraTarget.target);
    controls.update();
    currentFocus = focus;
  };

  const resize = (): void => {
    const width = Math.max(containerElement.clientWidth, 1);
    const height = Math.max(containerElement.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  const update = (state: QuaternionSceneState): void => {
    if (state.focus !== currentFocus) {
      applyFocus(state.focus);
    }

    const normalizedAxis = normalizeAxis(state.axis);
    const axisVector = new Vector3(normalizedAxis.x, normalizedAxis.y, normalizedAxis.z).normalize();
    const objectQuaternion = new ThreeQuaternion().setFromAxisAngle(axisVector, state.angleRadians);

    bodyRig.quaternion.copy(objectQuaternion);
    ghostRigs.forEach((ghostRig, index) => {
      ghostRig.visible = state.showGhosts;
      ghostRig.quaternion.slerpQuaternions(
        IDENTITY_QUATERNION,
        objectQuaternion,
        (index + 1) / (ghostRigs.length + 1),
      );
    });

    axisPositiveArrow.setDirection(axisVector);
    axisNegativeArrow.setDirection(axisVector.clone().multiplyScalar(-1));
    axisLabel.position.copy(axisVector.clone().multiplyScalar(3.02));

    updateRotationArc(rotationArc, axisVector, state.angleRadians);
    updateSpinorDoubleCover(spinorGroup, state.angleRadians);
    updateBlochSphere(blochGroup, objectQuaternion);

    constellation.rotation.y = state.angleRadians * 0.075;
    constellation.rotation.x = Math.sin(state.angleRadians * 0.12) * 0.08;
  };

  const render = (): void => {
    controls.update();
    renderer.render(scene, camera);
  };

  const dispose = (): void => {
    resizeObserver.disconnect();
    controls.dispose();
    renderer.dispose();
    scene.traverse((object) => {
      const disposableObject = object as DisposableObject;
      disposableObject.geometry?.dispose();
      if (Array.isArray(disposableObject.material)) {
        disposableObject.material.forEach((material) => material.dispose());
      } else {
        disposableObject.material?.dispose();
      }
    });
    renderer.domElement.remove();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(containerElement);
  applyFocus('full');
  resize();

  return { update, render, resize, dispose };
}

function isWebGlAvailable(): boolean {
  const testCanvas = document.createElement('canvas');
  return Boolean(
    window.WebGLRenderingContext &&
      (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')),
  );
}

function createBodyRig(opacity: number, includeLocalAxes: boolean): Group {
  const group = new Group();
  const boxGeometry = new BoxGeometry(1.72, 1.02, 1.28);
  const bodyMaterial = new MeshStandardMaterial({
    color: new Color(0xf4f7ef),
    metalness: 0.16,
    roughness: 0.42,
    transparent: opacity < 1,
    opacity,
  });
  const bodyMesh = new Mesh(boxGeometry, bodyMaterial);
  group.add(bodyMesh);

  const edgeMaterial = new LineBasicMaterial({
    color: includeLocalAxes ? 0x141612 : 0xe7efe8,
    transparent: true,
    opacity: includeLocalAxes ? 0.75 : Math.min(opacity + 0.08, 0.34),
  });
  const edges = new LineSegments(new EdgesGeometry(boxGeometry), edgeMaterial);
  group.add(edges);

  if (includeLocalAxes) {
    group.add(
      new ArrowHelper(new Vector3(1, 0, 0), new Vector3(0, 0, 0), 1.36, 0xef4444, 0.22, 0.09),
      new ArrowHelper(new Vector3(0, 1, 0), new Vector3(0, 0, 0), 1.22, 0x22c55e, 0.22, 0.09),
      new ArrowHelper(new Vector3(0, 0, 1), new Vector3(0, 0, 0), 1.28, 0x3b82f6, 0.22, 0.09),
    );
  }

  return group;
}

function createConstellation(): Points {
  const positions: number[] = [];
  for (let index = 0; index < 140; index += 1) {
    const radius = 4.2 + ((index * 37) % 90) / 42;
    const theta = index * 2.399963229728653;
    const y = ((index * 19) % 100) / 34 - 1.45;
    positions.push(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

  const material = new PointsMaterial({
    color: 0xa7f3d0,
    size: 0.026,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });

  return new Points(geometry, material);
}

function updateRotationArc(
  arcLine: Line<BufferGeometry, LineBasicMaterial>,
  axisVector: Vector3,
  angleRadians: number,
): void {
  const helperVector = Math.abs(axisVector.y) > 0.88 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  const startVector = new Vector3().crossVectors(axisVector, helperVector).normalize();
  const sweep = Math.max(Math.abs(angleRadians), 0.001);
  const segmentCount = Math.max(18, Math.ceil((sweep / FULL_SPINOR_TURN) * 140));
  const points: Vector3[] = [];

  for (let index = 0; index <= segmentCount; index += 1) {
    const progress = index / segmentCount;
    const localAngle = angleRadians * progress;
    const radius = 1.88 + progress * 0.1;
    points.push(startVector.clone().multiplyScalar(radius).applyAxisAngle(axisVector, localAngle));
  }

  arcLine.geometry.dispose();
  arcLine.geometry = new BufferGeometry().setFromPoints(points);
}

type SpinorDoubleCover = {
  group: Group;
  marker: Mesh<SphereGeometry, MeshStandardMaterial>;
  phaseVector: Line<BufferGeometry, LineBasicMaterial>;
};

function createSpinorDoubleCover(): SpinorDoubleCover {
  const group = new Group();
  group.position.set(-3.24, 0.05, 0);

  const helixPoints: Vector3[] = [];
  for (let index = 0; index <= 220; index += 1) {
    const t = (index / 220) * FULL_SPINOR_TURN;
    helixPoints.push(getDoubleCoverPoint(t));
  }

  const helix = new Line(
    new BufferGeometry().setFromPoints(helixPoints),
    new LineBasicMaterial({
      color: 0xf2a71b,
      transparent: true,
      opacity: 0.72,
    }),
  );
  group.add(helix);

  const phaseVector = new Line(
    new BufferGeometry(),
    new LineBasicMaterial({
      color: 0xf9faf5,
      transparent: true,
      opacity: 0.82,
    }),
  );
  group.add(phaseVector);

  const marker = new Mesh(
    new SphereGeometry(0.105, 24, 16),
    new MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x0f766e,
      emissiveIntensity: 0.8,
      roughness: 0.25,
    }),
  );
  group.add(marker);

  const startLabel = createSpriteLabel('+q', '#a7f3d0');
  startLabel.position.set(0.98, -1.26, 0);
  const middleLabel = createSpriteLabel('-q', '#fbbf24');
  middleLabel.position.set(0.98, 0, 0);
  const endLabel = createSpriteLabel('+q', '#a7f3d0');
  endLabel.position.set(0.98, 1.26, 0);
  group.add(startLabel, middleLabel, endLabel);

  return { group, marker, phaseVector };
}

function updateSpinorDoubleCover(spinorDoubleCover: SpinorDoubleCover, angleRadians: number): void {
  const normalizedAngle = ((angleRadians % FULL_SPINOR_TURN) + FULL_SPINOR_TURN) % FULL_SPINOR_TURN;
  const markerPoint = getDoubleCoverPoint(normalizedAngle);
  const markerMaterial = spinorDoubleCover.marker.material;

  spinorDoubleCover.marker.position.copy(markerPoint);
  if (Math.cos(normalizedAngle / 2) < 0) {
    markerMaterial.color.set(0xf59e0b);
    markerMaterial.emissive.set(0xb45309);
  } else {
    markerMaterial.color.set(0x10b981);
    markerMaterial.emissive.set(0x0f766e);
  }

  spinorDoubleCover.phaseVector.geometry.dispose();
  spinorDoubleCover.phaseVector.geometry = new BufferGeometry().setFromPoints([
    new Vector3(0, markerPoint.y, 0),
    markerPoint,
  ]);
}

function getDoubleCoverPoint(t: number): Vector3 {
  const radius = 0.76;
  const y = (t / FULL_SPINOR_TURN - 0.5) * 2.44;
  return new Vector3(Math.cos(t) * radius, y, Math.sin(t) * radius);
}

type BlochSphere = {
  group: Group;
  vectorArrow: ArrowHelper;
  tip: Mesh<SphereGeometry, MeshStandardMaterial>;
};

function createBlochSphere(): BlochSphere {
  const group = new Group();
  group.position.set(3.22, 0.05, 0);

  const sphere = new Mesh(
    new SphereGeometry(0.96, 40, 20),
    new MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.18,
      wireframe: true,
    }),
  );
  group.add(sphere);

  const equator = createCircleLine(new Vector3(0, 1, 0), 0x60a5fa, 0.54);
  const meridianX = createCircleLine(new Vector3(1, 0, 0), 0xa78bfa, 0.32);
  const meridianZ = createCircleLine(new Vector3(0, 0, 1), 0xf472b6, 0.32);
  group.add(equator, meridianX, meridianZ);

  const vectorArrow = new ArrowHelper(
    new Vector3(0, 0, 1),
    new Vector3(0, 0, 0),
    0.98,
    0xd946ef,
    0.2,
    0.09,
  );
  group.add(vectorArrow);

  const tip = new Mesh(
    new SphereGeometry(0.07, 20, 14),
    new MeshStandardMaterial({
      color: 0xd946ef,
      emissive: 0x831843,
      emissiveIntensity: 0.55,
      roughness: 0.3,
    }),
  );
  group.add(tip);

  const label = createSpriteLabel('Bloch vector', '#f0abfc');
  label.position.set(0, 1.28, 0);
  group.add(label);

  return { group, vectorArrow, tip };
}

function updateBlochSphere(blochSphere: BlochSphere, quaternion: ThreeQuaternion): void {
  const blochVector = new Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
  blochSphere.vectorArrow.setDirection(blochVector);
  blochSphere.tip.position.copy(blochVector.clone().multiplyScalar(0.98));
}

function createCircleLine(axis: Vector3, color: number, opacity: number): Line {
  const points: Vector3[] = [];
  for (let index = 0; index <= 96; index += 1) {
    const angle = (index / 96) * Math.PI * 2;
    points.push(new Vector3(Math.cos(angle) * 0.96, 0, Math.sin(angle) * 0.96));
  }

  const line = new Line(
    new BufferGeometry().setFromPoints(points),
    new LineBasicMaterial({
      color,
      transparent: true,
      opacity,
    }),
  );

  if (axis.x === 1) {
    line.rotation.z = Math.PI / 2;
  } else if (axis.z === 1) {
    line.rotation.x = Math.PI / 2;
  }

  return line;
}

function createSpriteLabel(text: string, color: string): Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = 'rgba(17, 20, 15, 0.72)';
    context.roundRect(8, 18, 240, 60, 12);
    context.fill();
    context.fillStyle = color;
    context.font = '700 30px Inter, system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 128, 48);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new Sprite(material);
  sprite.scale.set(0.78, 0.3, 1);
  return sprite;
}
