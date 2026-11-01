import {
  BufferGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from 'three';

/** One pixel-aligned grid, rendered only on creation, resize and theme changes. */
export function createGridRenderer(host: HTMLElement, onFailure: () => void) {
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  const scene = new Scene();
  const camera = new OrthographicCamera(
    0,
    innerWidth,
    0,
    innerHeight,
    0.1,
    100,
  );
  camera.position.z = 10;
  const material = new LineBasicMaterial({
    color: '#dce2e9',
    transparent: true,
    opacity: 0.65,
  });
  let geometry = new BufferGeometry();
  const lines = new LineSegments(geometry, material);
  scene.add(lines);
  renderer.setClearColor('#ffffff', 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);
  let disposed = false,
    renders = 0;
  const lost = (event: Event) => {
    event.preventDefault();
    onFailure();
  };
  renderer.domElement.addEventListener('webglcontextlost', lost);
  const resize = () => {
    if (disposed) return;
    const width = innerWidth,
      height = innerHeight,
      vertices: number[] = [];
    for (let x = 0; x <= width; x += 40) vertices.push(x, 0, 0, x, height, 0);
    for (let y = 0; y <= height; y += 40) vertices.push(0, y, 0, width, y, 0);
    geometry.dispose();
    geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    lines.geometry = geometry;
    camera.right = width;
    camera.bottom = height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height);
    render();
  };
  const render = () => {
    if (disposed) return;
    material.color.set(
      getComputedStyle(document.body).getPropertyValue('--grid-line').trim() ||
        '#dce2e9',
    );
    renderer.render(scene, camera);
    host.dataset.gridRenders = String(++renders);
  };
  const themeObserver = new MutationObserver(render);
  try {
    resize();
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  } catch (error) {
    themeObserver.disconnect();
    renderer.domElement.removeEventListener('webglcontextlost', lost);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    throw error;
  }
  return {
    resize,
    dispose() {
      if (disposed) return;
      disposed = true;
      themeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
