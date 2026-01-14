import React, { useRef, useEffect, useLayoutEffect, memo } from 'react';

import { ProjectionMode } from '@/shared/types';

import type { Mesh, Points, Material, BoxGeometry } from 'three';


interface SceneGeometryProps {
  width: number;
  height: number;
  density: number;
  displacementScale: number;
  material: Material;
  projectionMode: ProjectionMode;
  projectionAngle: number;
}

const SceneGeometryComponent: React.FC<SceneGeometryProps> = ({ 
  width, 
  height, 
  density, 
  displacementScale, 
  material,
  projectionMode,
  projectionAngle
}) => {
  const meshRef = useRef<Mesh | Points>(null);
  
  const caveFrontRef = useRef<Mesh>(null);
  const caveLeftRef = useRef<Mesh>(null);
  const caveRightRef = useRef<Mesh>(null);
  const caveFloorRef = useRef<Mesh>(null);
  const caveCeilingRef = useRef<Mesh>(null);
  const infiniteBoxRef = useRef<Mesh>(null);
  const cubeRef = useRef<Mesh>(null);
  
  useEffect(() => {
    if (meshRef.current?.geometry) {
      const geo = meshRef.current.geometry;
      geo.computeBoundingBox();
      geo.computeBoundingSphere();

      if (geo.boundingBox) {
        geo.boundingBox.expandByScalar(Math.abs(displacementScale) * 2);
      }
      if (geo.boundingSphere) {
        geo.boundingSphere.radius += Math.abs(displacementScale) * 2;
      }
    }
  }, [width, height, density, displacementScale, projectionMode, projectionAngle]);
  
  useLayoutEffect(() => {
    if (projectionMode === ProjectionMode.CORNER) {
      const updateUVs = (mesh: Mesh | null, uMin: number, uMax: number, vMin: number, vMax: number) => {
        if (!mesh?.geometry) {return;}
        const uvAttribute = mesh.geometry.attributes.uv;
        if (!uvAttribute) {return;}
        for (let i = 0; i < uvAttribute.count; i++) {
          const u = uvAttribute.getX(i);
          const v = uvAttribute.getY(i);
          const newU = uMin + u * (uMax - uMin);
          const newV = vMin + v * (vMax - vMin);
          uvAttribute.setXY(i, newU, newV);
        }
        uvAttribute.needsUpdate = true;
      };
      
      updateUVs(caveFrontRef.current, 0.25, 0.75, 0.25, 0.75);
      updateUVs(caveLeftRef.current, 0.0, 0.25, 0.25, 0.75);
      updateUVs(caveRightRef.current, 0.75, 1.0, 0.25, 0.75);
      updateUVs(caveCeilingRef.current, 0.25, 0.75, 0.75, 1.0);
      updateUVs(caveFloorRef.current, 0.25, 0.75, 0.0, 0.25);
    }

    if (projectionMode === ProjectionMode.INFINITE_BOX && infiniteBoxRef.current) {
      const geo = infiniteBoxRef.current.geometry as BoxGeometry;
      const uvAttr = geo.attributes.uv;
      if (!uvAttr) {return;}
      
      const mirrorFaceUVs = (faceIndex: number, mirrorU: boolean, mirrorV: boolean) => {
        const start = faceIndex * 4;
        for (let i = 0; i < 4; i++) {
          const idx = start + i;
          let u = uvAttr.getX(idx);
          let v = uvAttr.getY(idx);
          if (mirrorU) {u = 1.0 - u;}
          if (mirrorV) {v = 1.0 - v;}
          uvAttr.setXY(idx, u, v);
        }
      };
      
      mirrorFaceUVs(0, true, false); 
      mirrorFaceUVs(1, false, false);
      mirrorFaceUVs(2, false, true); 
      mirrorFaceUVs(3, false, false);
      mirrorFaceUVs(4, true, true);
      mirrorFaceUVs(5, false, true);
      uvAttr.needsUpdate = true;
    }
    
    // Cube mode specific setup - currently no additional processing needed
    // if (projectionMode === ProjectionMode.CUBE && cubeRef.current) { }

  }, [projectionMode, width, height, density]);

  const thetaLength = (projectionAngle * Math.PI) / 180;

  if (projectionMode === ProjectionMode.GAUSSIAN_SPLAT) {
    const splatDensity = Math.min(density, 384); 
    return (
      <points ref={meshRef as React.RefObject<Points>} material={material} name="ScenePoints" key="SPLAT">
        <planeGeometry args={[width, height, splatDensity, splatDensity]} />
      </points>
    );
  }

  if (projectionMode === ProjectionMode.SPHERE) {
    const sphereRadius = width * 0.8; 
    return (
      <mesh ref={meshRef as React.RefObject<Mesh>} material={material} scale={[-1, 1, 1]} rotation={[0, -Math.PI / 2, 0]} name="SceneMesh">
        <sphereGeometry args={[sphereRadius, density, density, 0, thetaLength, 0, Math.PI]} />
      </mesh>
    );
  }

  if (projectionMode === ProjectionMode.PANORAMA) {
    const sphereRadius = width * 0.6;
    return (
      <mesh ref={meshRef as React.RefObject<Mesh>} material={material} scale={[-1, 1, 1]} rotation={[0, -Math.PI / 2, 0]} name="SceneMesh">
        <sphereGeometry args={[sphereRadius, density, density]} />
      </mesh>
    );
  }

  if (projectionMode === ProjectionMode.DOME) {
    const sphereRadius = width * 0.8;
    return (
      <mesh ref={meshRef as React.RefObject<Mesh>} material={material} scale={[-1, 1, 1]} rotation={[-Math.PI / 2, 0, 0]} name="SceneMesh">
        <sphereGeometry args={[sphereRadius, density, density, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
      </mesh>
    );
  }

  if (projectionMode === ProjectionMode.CYLINDER) {
    const radius = width / (2 * Math.sin(thetaLength / 2)) * 0.9;
    return (
      <mesh ref={meshRef as React.RefObject<Mesh>} material={material} scale={[-1, 1, 1]} rotation={[0, Math.PI - (thetaLength/2), 0]} name="SceneMesh">
        <cylinderGeometry args={[radius, radius, height, density, density, true, 0, thetaLength]} />
      </mesh>
    );
  }

  if (projectionMode === ProjectionMode.CUBE) {
    const boxSize = Math.max(width, height);
    return (
      <mesh ref={cubeRef} material={material} scale={[-1, 1, 1]} name="SceneMesh">
        <boxGeometry args={[boxSize, boxSize, boxSize, density/2, density/2, density/2]} />
      </mesh>
    );
  }

  if (projectionMode === ProjectionMode.INFINITE_BOX) {
    const boxSize = Math.max(width, height) * 2;
    return (
      <mesh ref={infiniteBoxRef} material={material} scale={[-1, 1, 1]} name="InfiniteBoxMesh">
        <boxGeometry args={[boxSize, boxSize, boxSize, density/4, density/4, density/4]} />
      </mesh>
    );
  }
  
  if (projectionMode === ProjectionMode.CORNER) {
    const roomScale = Math.max(width, height);
    const w = roomScale;
    const h = roomScale;
    const d = roomScale;
    const planeRes = Math.min(density, 128);

    return (
      <group name="CAVE_SYSTEM" position={[0, 0, d * 0.4]}>
        <mesh ref={caveFrontRef} material={material} position={[0, 0, -d/2]}>
          <planeGeometry args={[w, h, planeRes, planeRes]} />
        </mesh>
        <mesh ref={caveLeftRef} material={material} position={[-w/2, 0, 0]} rotation={[0, Math.PI/2, 0]}>
          <planeGeometry args={[d, h, planeRes, planeRes]} />
        </mesh>
        <mesh ref={caveRightRef} material={material} position={[w/2, 0, 0]} rotation={[0, -Math.PI/2, 0]}>
          <planeGeometry args={[d, h, planeRes, planeRes]} />
        </mesh>
        <mesh ref={caveFloorRef} material={material} position={[0, -h/2, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[w, d, planeRes, planeRes]} />
        </mesh>
        <mesh ref={caveCeilingRef} material={material} position={[0, h/2, 0]} rotation={[Math.PI/2, 0, 0]}>
          <planeGeometry args={[w, d, planeRes, planeRes]} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh ref={meshRef as React.RefObject<Mesh>} material={material} frustumCulled key="PLANE" name="SceneMesh">
      <planeGeometry args={[width, height, density, density]} />
    </mesh>
  );
};

const SceneGeometry = memo(SceneGeometryComponent);

SceneGeometry.displayName = 'SceneGeometry';

export default SceneGeometry;
export type { SceneGeometryProps };
