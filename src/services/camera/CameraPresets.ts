import type { CameraPose, Vec3 } from '@/shared/types';

export type CameraPresetType = 'FRONT' | 'TOP' | 'SIDE' | 'ISO' | 'FOCUS';

export interface PresetConfig {
  id: CameraPresetType;
  name: string;
  pose: Omit<CameraPose, 'fov'>;
}

export const CAMERA_PRESETS: PresetConfig[] = [
  {
    id: 'FRONT',
    name: '正面',
    pose: { position: { x: 0, y: 0, z: 10 }, target: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 } },
  },
  {
    id: 'TOP',
    name: '俯视',
    pose: { position: { x: 0, y: 10, z: 0.01 }, target: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: -1 } },
  },
  {
    id: 'SIDE',
    name: '侧面',
    pose: { position: { x: 10, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 } },
  },
  {
    id: 'ISO',
    name: '等轴',
    pose: { position: { x: 7, y: 7, z: 7 }, target: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 } },
  },
  {
    id: 'FOCUS',
    name: '聚焦',
    pose: { position: { x: 0, y: 0, z: 5 }, target: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 } },
  },
];

export function getPresetById(id: CameraPresetType): PresetConfig | undefined {
  return CAMERA_PRESETS.find((p) => p.id === id);
}

export function getPresetPose(id: CameraPresetType): Omit<CameraPose, 'fov'> | undefined {
  return getPresetById(id)?.pose;
}

export function getDefaultPreset(): PresetConfig {
  return CAMERA_PRESETS[0]!;
}

export function calculateDistance(from: Vec3, to: Vec3): number {
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const dz = from.z - to.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function scaleVec3(v: Vec3, scale: number): Vec3 {
  return { x: v.x * scale, y: v.y * scale, z: v.z * scale };
}

export function getDistanceFromPose(pose: Omit<CameraPose, 'fov'>): number {
  return calculateDistance(pose.position, pose.target);
}

export function calculatePresetPose(
  presetId: CameraPresetType,
  currentDistance?: number
): Omit<CameraPose, 'fov'> {
  const preset = getPresetById(presetId);
  if (!preset) {
    return CAMERA_PRESETS[0]!.pose;
  }

  const basePose = preset.pose;
  
  if (currentDistance !== undefined && currentDistance > 0) {
    const baseDistance = getDistanceFromPose(basePose);
    if (baseDistance > 0) {
      const scale = currentDistance / baseDistance;
      return {
        position: scaleVec3(basePose.position, scale),
        target: basePose.target,
        up: basePose.up,
      };
    }
  }

  return basePose;
}
