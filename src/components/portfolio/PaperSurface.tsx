import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import {
  BufferGeometry,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Shape,
} from 'three';
import { paperOutline, paperStage } from './paper-stage';
import type { SceneLayout } from './stack-items';

const palette = {
  main: ['#fff4dc', '#393443'],
  edge: ['#dbc7a4', '#65566c'],
  blue: ['#bddbe1', '#35535d'],
  peach: ['#f0c4b4', '#76534e'],
  lilac: ['#d9cce9', '#514560'],
  butter: ['#f5e2a5', '#746746'],
  fold: ['#edd5ab', '#79657e'],
} as const;
type PaperColour = keyof typeof palette;

function outline(width: number, height: number, fold: number) {
  const shape = new Shape();
  for (const command of paperOutline(width, height, fold)) {
    switch (command[0]) {
      case 'M':
        shape.moveTo(command[1], -command[2]);
        break;
      case 'L':
        shape.lineTo(command[1], -command[2]);
        break;
      case 'Q':
        shape.quadraticCurveTo(
          command[1],
          -command[2],
          command[3],
          -command[4],
        );
        break;
      case 'Z':
        shape.closePath();
        break;
    }
  }
  return shape;
}

/** Paper-cut diorama in the existing demand-rendered scene. All decorative;
 * no new canvas, camera motion, time uniform or continuous animation loop. */
export function PaperSurface({ layout }: { layout: SceneLayout }) {
  const { invalidate } = useThree();
  const stage = useMemo(() => {
    const group = new Group();
    const geometries: BufferGeometry[] = [];
    const materials: (MeshBasicMaterial | MeshStandardMaterial)[] = [];
    const tinted = new Map<PaperColour, MeshBasicMaterial>();
    const material = (key: PaperColour) => {
      let mat = tinted.get(key);
      if (!mat) {
        mat = new MeshBasicMaterial({
          color: palette[key][0],
          side: DoubleSide,
          toneMapped: false,
        });
        mat.userData.paperColour = key;
        tinted.set(key, mat);
        materials.push(mat);
      }
      return mat;
    };
    const edge = material('edge');
    const shadow = new MeshBasicMaterial({
      color: '#221725',
      transparent: true,
      opacity: 0.055,
      depthWrite: false,
    });
    const contactShadow = shadow.clone();
    contactShadow.opacity = 0.11;
    materials.push(shadow, contactShadow);
    const sheet = (
      width: number,
      height: number,
      fold: number,
      key: PaperColour,
    ) => {
      const geometry = new ExtrudeGeometry(outline(width, height, fold), {
        depth: 2.4,
        bevelEnabled: false,
        curveSegments: 16,
      });
      geometries.push(geometry);
      const mesh = new Mesh(geometry, [material(key), edge]);
      return mesh;
    };
    const withShadow = (
      mesh: Mesh,
      x: number,
      y: number,
      z: number,
      rotation: number,
      spread: number,
      steps = 3,
    ) => {
      // Stationary layered contact shadows: bounded geometry, no full-screen
      // blur, postprocessing or real-time shadow-map pass.
      for (let i = steps; i >= 1; i--) {
        const cast = new Mesh(
          mesh.geometry,
          steps === 1 ? contactShadow : shadow,
        );
        cast.position.set(x + spread * 0.45, y - spread - i, z - 5 - i * 0.1);
        cast.scale.set(1 + i * 0.008, 1 + i * 0.008, 1);
        cast.rotation.z = rotation;
        group.add(cast);
      }
      mesh.position.set(x, y, z);
      mesh.rotation.z = rotation;
      group.add(mesh);
    };
    const main = paperStage(layout.width, layout.height);
    const phone = layout.width <= 700;
    const x = main.x - layout.width / 2,
      y = layout.height / 2 - main.y;
    const offset = phone ? 9 : 22;
    withShadow(
      sheet(main.width + 8, main.height + 5, main.fold, 'blue'),
      x - offset,
      y - 8,
      -150,
      0.035,
      8,
    );
    withShadow(
      sheet(main.width + 6, main.height + 2, main.fold, 'peach'),
      x + offset,
      y - 9,
      -130,
      -0.035,
      7,
    );
    const face = sheet(main.width, main.height, main.fold, 'main');
    withShadow(face, x, y, -100, 0.006, 9);

    // Lifted triangular dog-ear: a genuinely non-planar mesh above the cut edge.
    const cut = main.fold,
      w = main.width / 2,
      h = main.height / 2;
    const foldGeometry = new BufferGeometry();
    foldGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(
        [
          w - 3,
          -h + cut,
          2.6,
          w - cut,
          -h + 1,
          2.6,
          w - cut * 0.86,
          -h + cut * 0.91,
          Math.min(22, cut * 0.55),
        ],
        3,
      ),
    );
    foldGeometry.computeVertexNormals();
    geometries.push(foldGeometry);
    const foldMat = new MeshStandardMaterial({
      color: palette.fold[0],
      roughness: 1,
      side: DoubleSide,
    });
    foldMat.userData.paperColour = 'fold';
    materials.push(foldMat);
    const foldMesh = new Mesh(foldGeometry, foldMat);
    foldMesh.position.copy(face.position);
    foldMesh.rotation.copy(face.rotation);
    group.add(foldMesh);

    const colours: PaperColour[] = [
      'lilac',
      'butter',
      'peach',
      'blue',
      'lilac',
      'blue',
      'peach',
    ];
    for (const [index, target] of layout.targets.entries()) {
      const width = target.size * 1.45,
        height = target.size * 1.3;
      const island = sheet(
        width,
        height,
        Math.min(16, target.size * 0.2),
        colours[index],
      );
      withShadow(
        island,
        target.centre.x - layout.width / 2,
        layout.height / 2 - target.centre.y - target.size * 0.22,
        -62,
        (-(target.tilt + 3) * Math.PI) / 180,
        4,
        1,
      );
      // A thin second piece peeking out makes these platforms paper, not cards.
      const backing = sheet(width * 0.98, height * 0.96, 0, 'main');
      withShadow(
        backing,
        island.position.x - 3,
        island.position.y - 4,
        -67,
        island.rotation.z + 0.045,
        2,
        0,
      );
    }
    return { group, materials, geometries };
  }, [layout]);
  useEffect(() => {
    const update = () => {
      const dark = document.documentElement.dataset.theme === 'dark';
      for (const mat of stage.materials) {
        const key = mat.userData.paperColour as PaperColour | undefined;
        if (key) mat.color = new Color(palette[key][dark ? 1 : 0]);
      }
      invalidate();
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, [stage, invalidate]);
  useEffect(
    () => () => {
      stage.geometries.forEach((g) => g.dispose());
      stage.materials.forEach((m) => m.dispose());
    },
    [stage],
  );
  return <primitive object={stage.group} dispose={null} />;
}
