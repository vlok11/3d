import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo, memo } from 'react';
import { type Group, MathUtils, type Points, type PointsMaterial, Color } from 'three';

export type ParticleType = 'dust' | 'snow' | 'stars' | 'firefly';

interface ParticleConfig {
  color: string;
  size: number;
  count: number;
  speed: number;
  opacity: number;
  spread: number;
  direction: 'random' | 'down' | 'up' | 'static';
}

const PARTICLE_COUNT = 300;
const PARTICLE_SPREAD = 40;

const PARTICLE_CONFIGS: Record<ParticleType, ParticleConfig> = {
  dust: {
    color: '#aaccff',
    size: 0.15,
    count: PARTICLE_COUNT,
    speed: 0.01,
    opacity: 0.4,
    spread: PARTICLE_SPREAD,
    direction: 'random'
  },
  snow: {
    color: '#ffffff',
    size: 0.25,
    count: PARTICLE_COUNT,
    speed: 0.02,
    opacity: 0.6,
    spread: PARTICLE_SPREAD,
    direction: 'down'
  },
  stars: {
    color: '#ffffff',
    size: 0.08,
    count: PARTICLE_COUNT,
    speed: 0.5,
    opacity: 0.9,
    spread: PARTICLE_SPREAD * 3,
    direction: 'static'
  },
  firefly: {
    color: '#ffff00',
    size: 0.2,
    count: PARTICLE_COUNT,
    speed: 0.006,
    opacity: 0.7,
    spread: PARTICLE_SPREAD,
    direction: 'up'
  }
};

interface AtmosphereParticlesProps {
  enabled: boolean;
  particleType?: ParticleType;
}

export const AtmosphereParticles = memo<AtmosphereParticlesProps>(({ 
  enabled, 
  particleType = 'dust' 
}) => {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<PointsMaterial>(null);
  
  const config = PARTICLE_CONFIGS[particleType] || PARTICLE_CONFIGS.dust;
  
  const starData = useMemo(() => {
    if (particleType !== 'stars') {return null;}
    
    return {
      sizes: Array.from({ length: PARTICLE_COUNT }, () => 0.5 + Math.random() * 1.5),
      phases: Array.from({ length: PARTICLE_COUNT }, () => Math.random() * Math.PI * 2),
      speeds: Array.from({ length: PARTICLE_COUNT }, () => 0.3 + Math.random() * 0.7),
      colors: Array.from({ length: PARTICLE_COUNT }, () => {
        const r = Math.random();
        if (r < 0.6) {return new Color('#ffffff');}
        if (r < 0.8) {return new Color('#aaccff');}
        return new Color('#ffffaa');
      })
    };
  }, [particleType]);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const spread = config.spread;
    
    if (particleType === 'stars') {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.4;
        const r = spread * 0.5 + Math.random() * spread * 0.5;
        
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.cos(phi) + 10;
        pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      }
    } else {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pos[i * 3] = (Math.random() - 0.5) * spread;     
        pos[i * 3 + 1] = (Math.random() - 0.5) * spread; 
        pos[i * 3 + 2] = (Math.random() - 0.5) * spread; 
      }
    }
    return pos;
  }, [config.spread, particleType]);

  const sizes = useMemo(() => {
    if (particleType !== 'stars' || !starData) {return null;}
    
    const sizeArray = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      sizeArray[i] = config.size * (starData.sizes[i] ?? 1);
    }
    return sizeArray;
  }, [particleType, config.size, starData]);

  const velocities = useMemo(() => {
    const vel = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      vel[i * 3] = (Math.random() - 0.5) * config.speed;     
      vel[i * 3 + 1] = (Math.random() - 0.5) * config.speed;
      vel[i * 3 + 2] = (Math.random() - 0.5) * config.speed;
    }
    return vel;
  }, [config.speed]);

  useFrame((state, delta) => {
    if (!pointsRef.current) {return;}
    
    const time = state.clock.elapsedTime;
    
    if (particleType === 'stars' && starData && sizes && materialRef.current) {
      const sizeAttr = pointsRef.current.geometry.attributes.size;
      if (sizeAttr) {
        const sizeArray = sizeAttr.array as Float32Array;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const speed = starData.speeds[i] ?? 0.5;
          const phase = starData.phases[i] ?? 0;
          const baseSize = starData.sizes[i] ?? 1;
          const twinkle = 0.5 + 0.5 * Math.sin(time * speed * config.speed + phase);
          sizeArray[i] = config.size * baseSize * (0.3 + twinkle * 0.7);
        }
        sizeAttr.needsUpdate = true;
      }
      return;
    }
    
    if (config.direction === 'static') {return;}
    
    const positionAttr = pointsRef.current.geometry.attributes.position;
    if (!positionAttr) {return;}
    
    const posArray = positionAttr.array as Float32Array;
    const halfSpread = config.spread / 2;
    const speedFactor = config.speed * 60 * delta;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const posX = i3;
      const posY = i3 + 1;
      const posZ = i3 + 2;
      
      switch (config.direction) {
        case 'down':
          posArray[posY] = (posArray[posY] ?? 0) - speedFactor;
          posArray[posX] = (posArray[posX] ?? 0) + Math.sin(time + i) * 0.005;
          if ((posArray[posY] ?? 0) < -halfSpread) {
            posArray[posY] = halfSpread;
            posArray[posX] = (Math.random() - 0.5) * config.spread;
          }
          break;
          
        case 'up':
          posArray[posY] = (posArray[posY] ?? 0) + speedFactor;
          posArray[posX] = (posArray[posX] ?? 0) + Math.sin(time * 2 + i) * 0.01;
          posArray[posZ] = (posArray[posZ] ?? 0) + Math.cos(time * 2 + i) * 0.01;
          if ((posArray[posY] ?? 0) > halfSpread) {
            posArray[posY] = -halfSpread;
            posArray[posX] = (Math.random() - 0.5) * config.spread;
          }
          break;
          
        case 'random':
        default: {
          const velX = velocities[i3] ?? 0;
          const velY = velocities[i3 + 1] ?? 0;
          const velZ = velocities[i3 + 2] ?? 0;
          posArray[posX] = (posArray[posX] ?? 0) + velX;
          posArray[posY] = (posArray[posY] ?? 0) + velY;
          posArray[posZ] = (posArray[posZ] ?? 0) + velZ;
          
          for (let j = 0; j < 3; j++) {
            const idx = i3 + j;
            const val = posArray[idx] ?? 0;
            if (val > halfSpread) {posArray[idx] = -halfSpread;}
            if (val < -halfSpread) {posArray[idx] = halfSpread;}
          }
          break;
        }
      }
    }
    
    positionAttr.needsUpdate = true;
  });

  if (!enabled) {return null;}

  if (particleType === 'stars' && sizes) {
    return (
      <points ref={pointsRef} key={particleType}>
        <bufferGeometry>
          <bufferAttribute 
            attach="attributes-position" 
            count={PARTICLE_COUNT} 
            array={positions} 
            itemSize={3} 
          />
          <bufferAttribute 
            attach="attributes-size" 
            count={PARTICLE_COUNT} 
            array={sizes} 
            itemSize={1} 
          />
        </bufferGeometry>
        <pointsMaterial 
          ref={materialRef}
          size={config.size} 
          color={config.color} 
          transparent 
          opacity={config.opacity} 
          sizeAttenuation 
          depthWrite={false}
          vertexColors={false}
        />
      </points>
    );
  }

  return (
    <points ref={pointsRef} key={particleType}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={PARTICLE_COUNT} 
          array={positions} 
          itemSize={3} 
        />
      </bufferGeometry>
      <pointsMaterial 
        size={config.size} 
        color={config.color} 
        transparent 
        opacity={config.opacity} 
        sizeAttenuation 
        depthWrite={false} 
      />
    </points>
  );
});
AtmosphereParticles.displayName = 'AtmosphereParticles';

interface ParallaxRigProps {
  enabled: boolean;
  children: React.ReactNode;
}

export const ParallaxRig = memo<ParallaxRigProps>(({ enabled, children }) => {
  const groupRef = useRef<Group>(null);
  const { pointer } = useThree();
  
  useFrame(() => {
    if (!groupRef.current) {return;}
    
    if (!enabled) {
      groupRef.current.rotation.x = MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1);
      groupRef.current.rotation.y = MathUtils.lerp(groupRef.current.rotation.y, 0, 0.1);
      return;
    }
    
    const targetX = (pointer.y * Math.PI) / 60; 
    const targetY = -(pointer.x * Math.PI) / 60; 
    
    groupRef.current.rotation.x = MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.05);
    groupRef.current.rotation.y = MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.05);
  });
  
  return <group ref={groupRef}>{children}</group>;
});
ParallaxRig.displayName = 'ParallaxRig';
