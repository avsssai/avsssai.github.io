import { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Group, OrthographicCamera, Shape, Vector3 } from 'three';
import {
  heroPoint,
  stackItems,
  type GeometryKind,
  type SceneLayout,
} from './stack-items';
import type { SceneReport, RecoilChannel } from './StackExperience';
import { PaperSurface } from './PaperSurface';

const extrusion = {
  depth: 0.25,
  bevelEnabled: true,
  bevelSize: 0.08,
  bevelThickness: 0.06,
  bevelSegments: 2,
  steps: 1,
  curveSegments: 8,
};

type Props = {
  layout: SceneLayout;
  active: boolean;
  motion: RecoilChannel;
  onFrame(value: SceneReport): void;
};

function outline(kind: 'tile' | 'star' | 'bolt') {
  const shape = new Shape();
  if (kind === 'tile') {
    shape.moveTo(-0.6, -0.85);
    shape.lineTo(0.6, -0.85);
    shape.quadraticCurveTo(0.85, -0.85, 0.85, -0.6);
    shape.lineTo(0.85, 0.6);
    shape.quadraticCurveTo(0.85, 0.85, 0.6, 0.85);
    shape.lineTo(-0.6, 0.85);
    shape.quadraticCurveTo(-0.85, 0.85, -0.85, 0.6);
    shape.lineTo(-0.85, -0.6);
    shape.quadraticCurveTo(-0.85, -0.85, -0.6, -0.85);
  } else if (kind === 'star') {
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI) / 8;
      const radius = i % 2 ? 0.54 : 1;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (!i) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
  } else {
    shape.moveTo(0.15, 1);
    shape.lineTo(-0.75, -0.1);
    shape.lineTo(-0.06, -0.1);
    shape.lineTo(-0.18, -1);
    shape.lineTo(0.78, 0.24);
    shape.lineTo(0.12, 0.24);
    shape.closePath();
  }
  return shape;
}

function Sculpture({ kind, colour }: { kind: GeometryKind; colour: string }) {
  const shape = useMemo(
    () => outline(kind === 'tile' || kind === 'bolt' ? kind : 'star'),
    [kind],
  );
  const material = (
    <meshStandardMaterial color={colour} roughness={0.85} metalness={0} />
  );
  if (kind === 'atom')
    return (
      <group rotation={[0.16, -0.22, -0.12]}>
        {[0, Math.PI / 3, -Math.PI / 3].map((angle) => (
          <group key={angle} rotation={[0, 0, angle]}>
            <mesh scale={[1, 0.38, 1]}>
              <torusGeometry args={[0.92, 0.065, 8, 56]} />
              {material}
            </mesh>
          </group>
        ))}
        <mesh>
          <sphereGeometry args={[0.17, 16, 12]} />
          {material}
        </mesh>
      </group>
    );
  if (kind === 'cloud')
    return (
      <group>
        {[
          [0, 0.2, 0.57],
          [-0.55, -0.1, 0.44],
          [0.55, -0.08, 0.48],
          [0, -0.25, 0.5],
        ].map(([x, y, radius], i) => (
          <mesh key={i} position={[x, y, 0]} scale={[1, 0.9, 0.55]}>
            <sphereGeometry args={[radius, 20, 16]} />
            {material}
          </mesh>
        ))}
      </group>
    );
  if (kind === 'paired')
    return (
      <group rotation={[0, 0, -0.12]}>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * 0.23, side * 0.35, 0]}
            rotation={[0, 0, (side * Math.PI) / 2]}
          >
            <capsuleGeometry args={[0.34, 0.65, 6, 16]} />
            {material}
          </mesh>
        ))}
      </group>
    );
  if (kind === 'gem')
    return (
      <mesh rotation={[0.2, 0.35, 0.1]}>
        <icosahedronGeometry args={[1, 0]} />
        {material}
      </mesh>
    );
  return (
    <mesh
      rotation={[0.13, -0.18, kind === 'tile' ? -0.12 : 0.12]}
      position={[0, 0, -0.12]}
    >
      <extrudeGeometry args={[shape, extrusion]} />
      {material}
    </mesh>
  );
}

function Contents({ layout, active, motion, onFrame }: Props) {
  const { camera, gl, invalidate } = useThree();
  const groups = useRef(new Map<string, Group>());
  const reactions = useRef(new Map<string, Group>());
  useLayoutEffect(() => {
    motion.invalidate = () => {
      if (active) invalidate();
    };
    return () => {
      motion.invalidate = () => {};
    };
  }, [motion, active, invalidate]);
  useLayoutEffect(() => {
    const orthographic = camera as OrthographicCamera;
    orthographic.left = -layout.width / 2;
    orthographic.right = layout.width / 2;
    orthographic.top = layout.height / 2;
    orthographic.bottom = -layout.height / 2;
    orthographic.updateProjectionMatrix();
    if (active) invalidate();
  }, [layout, active, camera, invalidate]);
  useFrame(({ scene }) => {
    if (!active || document.hidden || gl.getContext().isContextLost()) return;
    for (const [id, group] of reactions.current) {
      const amount = motion.current?.id === id ? motion.current.amount : 0;
      group.position.x = amount * 0.28;
      group.rotation.z = -amount * 0.18;
      const compression = Math.abs(amount);
      group.scale.set(1 - compression * 0.18, 1 + compression * 0.14, 1);
    }
    gl.render(scene, camera);
    if (groups.current.size !== layout.targets.length) return;
    const points = layout.targets.map((target) => {
      const world = groups.current
        .get(target.id)!
        .getWorldPosition(new Vector3())
        .project(camera);
      return heroPoint(
        world,
        { x: 0, y: 0, width: layout.width, height: layout.height },
        { x: 0, y: 0 },
      );
    });
    const value = {
      revision: layout.revision,
      points,
      drawCalls: gl.info.render.calls,
      time: performance.now(),
    };
    queueMicrotask(() => onFrame(value));
  }, 1);
  return (
    <>
      <PaperSurface layout={layout} />
      <ambientLight intensity={1.8} />
      <directionalLight
        position={[-300, 500, 800]}
        intensity={3.2}
        color="#fff9ed"
      />
      {layout.targets.map((target, index) => (
        <group
          key={target.id}
          ref={(group) => {
            if (group) groups.current.set(target.id, group);
            else groups.current.delete(target.id);
          }}
          position={[
            target.centre.x - layout.width / 2,
            layout.height / 2 - target.centre.y,
            0,
          ]}
          scale={target.size * 0.43}
        >
          <group
            ref={(group) => {
              if (group) reactions.current.set(target.id, group);
              else reactions.current.delete(target.id);
            }}
          >
            <group rotation={[0, 0, (-target.tilt * Math.PI) / 180]}>
              <Sculpture
                kind={stackItems[index].geometry}
                colour={stackItems[index].colour}
              />
            </group>
          </group>
          <mesh position={[0.05, -1.03, -0.6]} scale={[0.8, 0.11, 1]}>
            <circleGeometry args={[1, 24]} />
            <meshBasicMaterial
              color="#000000"
              transparent
              opacity={0.055}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

export default function StackScene(props: Props) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 1000], near: 0.1, far: 2000, zoom: 1 }}
      dpr={[1, 1.5]}
      frameloop={props.active ? 'demand' : 'never'}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      style={{ pointerEvents: 'none' }}
    >
      <Contents {...props} />
    </Canvas>
  );
}
