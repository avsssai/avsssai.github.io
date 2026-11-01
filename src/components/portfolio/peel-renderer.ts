import {
  ACESFilmicToneMapping,
  AmbientLight,
  BackSide,
  CanvasTexture,
  DirectionalLight,
  FrontSide,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PCFShadowMap,
  PlaneGeometry,
  Raycaster,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
} from 'three';
import { bendSheetPoint, peelFold, type PeelPoint } from './peel-math';
import { createPaperCanvases } from './peel-paper';

export function createPeelRenderer(
  host: HTMLElement,
  onFailure: () => void,
  character: HTMLImageElement,
) {
  const width = host.clientWidth;
  const height = host.clientHeight;
  const renderer = new WebGLRenderer({ alpha: true, antialias: true });
  let disposed = false;
  let themeObserver: MutationObserver | undefined;
  const geometries: PlaneGeometry[] = [];
  const materials: (MeshStandardMaterial | ShadowMaterial)[] = [];
  const textures: CanvasTexture[] = [];
  const onLost = (event: Event) => {
    event.preventDefault();
    if (!disposed) onFailure();
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    themeObserver?.disconnect();
    renderer.domElement.removeEventListener('webglcontextlost', onLost);
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
  try {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    renderer.setClearColor(0, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.addEventListener('webglcontextlost', onLost);
    const scene = new Scene();
    const camera = new OrthographicCamera(0, width, height, 0, 1, 4000);
    camera.position.z = 2000;
    const geometry = new PlaneGeometry(
      width,
      height,
      Math.min(100, Math.max(32, Math.ceil(width / 14))),
      Math.min(80, Math.max(40, Math.ceil(height / 14))),
    );
    geometries.push(geometry);
    const source = Float32Array.from(geometry.attributes.position.array);
    const isDark = () => document.documentElement.dataset.theme === 'dark';
    const paper = createPaperCanvases(width, height, isDark(), character);
    const print = new CanvasTexture(paper.colour);
    textures.push(print);
    print.colorSpace = SRGBColorSpace;
    print.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const relief = new CanvasTexture(paper.relief);
    textures.push(relief);
    const front = new MeshStandardMaterial({
      color: isDark() ? '#ffffff' : '#fff0cc',
      map: print,
      bumpMap: relief,
      bumpScale: 1.4,
      side: FrontSide,
      roughness: 0.9,
    });
    const back = new MeshStandardMaterial({
      color: isDark() ? '#34332f' : '#f1dbad',
      side: BackSide,
      roughness: 0.72,
    });
    materials.push(front, back);
    const film = new Mesh(geometry, front);
    const underside = new Mesh(geometry, back);
    film.castShadow = true;
    underside.castShadow = true;
    // Deformation can move the mesh well beyond its original bounding sphere.
    film.frustumCulled = underside.frustumCulled = false;
    scene.add(film, underside);
    const groundGeometry = new PlaneGeometry(width * 4, height * 4);
    const groundMaterial = new ShadowMaterial({ opacity: 0.2 });
    geometries.push(groundGeometry);
    materials.push(groundMaterial);
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.position.set(width / 2, height / 2, -2);
    ground.receiveShadow = true;
    scene.add(ground);
    scene.add(new AmbientLight('#ffffff', 2.2));
    const light = new DirectionalLight('#fff9ee', 2.3);
    light.position.set(width * 0.2, height + 450, 1100);
    light.target.position.set(width / 2, height / 2, 0);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -width;
    light.shadow.camera.right = width;
    light.shadow.camera.top = height;
    light.shadow.camera.bottom = -height;
    light.shadow.camera.far = 4000;
    light.shadow.normalBias = 1;
    light.shadow.bias = -0.0002;
    light.shadow.radius = 4;
    scene.add(light, light.target);
    host.append(renderer.domElement);
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    let lastTip: PeelPoint | undefined;
    const draw = (tip: PeelPoint) => {
      if (disposed) return;
      lastTip = { ...tip };
      const fold = peelFold(width, height, tip);
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const p = bendSheetPoint(
          source[i * 3] + width / 2,
          height / 2 - source[i * 3 + 1],
          width,
          fold,
        );
        positions.setXYZ(i, p.x, height - p.y, p.z);
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      renderer.render(scene, camera);
    };
    themeObserver = new MutationObserver(() => {
      if (disposed) return;
      const dark = isDark();
      const next = createPaperCanvases(width, height, dark, character);
      print.image = next.colour;
      print.needsUpdate = true;
      front.color.set(dark ? '#ffffff' : '#fff0cc');
      back.color.set(dark ? '#34332f' : '#f1dbad');
      if (lastTip) draw(lastTip);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return {
      draw,
      hits(x: number, y: number) {
        pointer.set((x / width) * 2 - 1, 1 - (y / height) * 2);
        raycaster.setFromCamera(pointer, camera);
        return raycaster.intersectObjects([film, underside], false).length > 0;
      },
      dispose() {
        light.shadow.map?.dispose();
        dispose();
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
