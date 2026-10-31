import * as THREE from 'three';

type Frame = { recoil: number; curl: number | null };

export function createScene(
  host: HTMLElement,
  target: HTMLElement,
  onFailure: () => void,
) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 3000);
  camera.position.z = 1200;
  scene.add(new THREE.AmbientLight(0xffffff, 2.1));
  const key = new THREE.DirectionalLight(0xfff9ed, 3.2);
  key.position.set(-300, 500, 800);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9d8ed6, 1.6);
  rim.position.set(400, -100, 500);
  scene.add(rim);
  const material = new THREE.MeshStandardMaterial({
    color: 0xb5a7e0,
    roughness: 0.42,
    metalness: 0.08,
  });
  const atom = new THREE.Group();
  const ringGeometry = new THREE.TorusGeometry(41, 5.4, 14, 80);
  for (const angle of [0, Math.PI / 3, -Math.PI / 3]) {
    const ring = new THREE.Mesh(ringGeometry, material);
    ring.scale.set(1.55, 0.55, 1);
    const orbit = new THREE.Group();
    orbit.rotation.z = angle;
    orbit.add(ring);
    atom.add(orbit);
  }
  const coreGeometry = new THREE.SphereGeometry(10, 24, 16);
  atom.add(new THREE.Mesh(coreGeometry, material));
  scene.add(atom);
  const sheetGeometry = new THREE.PlaneGeometry(1, 1, 24, 32);
  const sheetMaterial = new THREE.MeshStandardMaterial({
    color: 0xe4d8bd,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const sheet = new THREE.Mesh(sheetGeometry, sheetMaterial);
  sheet.position.z = 650;
  sheet.visible = false;
  scene.add(sheet);
  let lost = false;
  let disposed = false;
  let frames = 0;
  const render = ({ recoil, curl }: Frame) => {
    if (lost || disposed || document.hidden) return;
    const box = host.getBoundingClientRect();
    const anchor = target.getBoundingClientRect();
    if (box.bottom <= 0 || box.top >= innerHeight || !box.width || !box.height)
      return;
    const width = Math.round(box.width);
    const height = Math.round(box.height);
    if (
      renderer.domElement.width !==
        Math.floor(width * renderer.getPixelRatio()) ||
      renderer.domElement.height !==
        Math.floor(height * renderer.getPixelRatio())
    )
      renderer.setSize(width, height, false);
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    const x = anchor.x - box.x + anchor.width / 2;
    const y = anchor.y - box.y + Math.min(80, anchor.width * 0.44);
    atom.position.set(x - width / 2 + recoil * 13, height / 2 - y, 0);
    atom.rotation.set(0.22, -0.25 + recoil * 0.3, -0.15 + recoil * 0.3);
    atom.scale.setScalar(anchor.width / 150);
    sheet.visible = curl !== null;
    if (curl !== null) {
      const positions = sheetGeometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const column = i % 25;
        const row = Math.floor(i / 25);
        const u = column / 24;
        const v = 1 - row / 32;
        const fold = Math.max(0, Math.min(1, (curl * 1.8 - v) / 0.7));
        positions.setXYZ(
          i,
          (u - 0.5) * width + curl * curl * 100,
          (v - 0.5) * height +
            curl * height * 1.4 +
            Math.sin(fold * Math.PI) * 80,
          Math.sin(fold * Math.PI) * 150,
        );
      }
      positions.needsUpdate = true;
      sheetGeometry.computeVertexNormals();
    }
    renderer.render(scene, camera);
    host.dataset.frames = String(++frames);
    host.dataset.projectedX = String(x);
    host.dataset.projectedY = String(y);
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    onFailure();
  };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  return {
    render,
    dispose() {
      disposed = true;
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      ringGeometry.dispose();
      coreGeometry.dispose();
      material.dispose();
      sheetGeometry.dispose();
      sheetMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
