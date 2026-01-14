import { Raycaster, Vector2, Vector3, type Camera, type Intersection, type Object3D } from 'three';

import type { Point2D, Vec3 } from '@/shared/types';

export type PointerEventLike = MouseEvent | TouchEvent;

export type UvCoord = { u: number; v: number };

export type PixelCoord = { x: number; y: number };

export type SampleMode = 'nearest' | 'bilinear';

export function getClientPointFromPointerEvent(e: PointerEventLike): Point2D | null {
  if (typeof TouchEvent !== 'undefined' && e instanceof TouchEvent) {
    const t = e.touches[0] ?? e.changedTouches[0];
    if (!t) return null;
    return { x: t.clientX, y: t.clientY };
  }

  if (e instanceof MouseEvent) {
    return { x: e.clientX, y: e.clientY };
  }

  return null;
}

export function clientPointToElementPoint(client: Point2D, element: HTMLElement): Point2D {
  const rect = element.getBoundingClientRect();
  return { x: client.x - rect.left, y: client.y - rect.top };
}

export function elementPointToClientPoint(point: Point2D, element: HTMLElement): Point2D {
  const rect = element.getBoundingClientRect();
  return { x: point.x + rect.left, y: point.y + rect.top };
}

export function clientPointToNdc(client: Point2D, element: HTMLElement): Vector2 {
  const rect = element.getBoundingClientRect();
  const x = ((client.x - rect.left) / rect.width) * 2 - 1;
  const y = -(((client.y - rect.top) / rect.height) * 2 - 1);
  return new Vector2(x, y);
}

export function elementPointToNdc(point: Point2D, element: HTMLElement): Vector2 {
  const rect = element.getBoundingClientRect();
  const x = rect.width > 0 ? (point.x / rect.width) * 2 - 1 : 0;
  const y = rect.height > 0 ? -((point.y / rect.height) * 2 - 1) : 0;
  return new Vector2(x, y);
}

export function elementPointToCanvasPoint(point: Point2D, canvas: HTMLCanvasElement): Point2D {
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
  const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
  return { x: point.x * scaleX, y: point.y * scaleY };
}

export function canvasPointToElementPoint(point: Point2D, canvas: HTMLCanvasElement): Point2D {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width > 0 ? rect.width / canvas.width : 1;
  const scaleY = canvas.height > 0 ? rect.height / canvas.height : 1;
  return { x: point.x * scaleX, y: point.y * scaleY };
}

export function elementPointToUv(point: Point2D, element: HTMLElement): UvCoord {
  const rect = element.getBoundingClientRect();
  const u = rect.width > 0 ? point.x / rect.width : 0;
  const v = rect.height > 0 ? point.y / rect.height : 0;
  return { u, v };
}

export function uvToElementPoint(uv: UvCoord, element: HTMLElement): Point2D {
  const rect = element.getBoundingClientRect();
  return { x: uv.u * rect.width, y: uv.v * rect.height };
}

export function screenUvToThreeUv(uv: UvCoord): UvCoord {
  return { u: uv.u, v: 1 - uv.v };
}

export function threeUvToScreenUv(uv: UvCoord): UvCoord {
  return { u: uv.u, v: 1 - uv.v };
}

export function uvToPlaneLocal(uv: UvCoord, planeWidth: number, planeHeight: number): Vec3 {
  return {
    x: (uv.u - 0.5) * planeWidth,
    y: (0.5 - uv.v) * planeHeight,
    z: 0
  };
}

export function planeLocalToUv(local: { x: number; y: number }, planeWidth: number, planeHeight: number): UvCoord {
  return {
    u: local.x / planeWidth + 0.5,
    v: 0.5 - local.y / planeHeight
  };
}

export function planeLocalToWorld(local: Vec3, planeObject: Object3D): Vec3 {
  const v = new Vector3(local.x, local.y, local.z);
  planeObject.localToWorld(v);
  return { x: v.x, y: v.y, z: v.z };
}

export function worldToPlaneLocal(world: Vec3, planeObject: Object3D): Vec3 {
  const v = new Vector3(world.x, world.y, world.z);
  planeObject.worldToLocal(v);
  return { x: v.x, y: v.y, z: v.z };
}

export function uvToWorldOnPlane(params: {
  uv: UvCoord;
  planeWidth: number;
  planeHeight: number;
  planeObject: Object3D;
}): Vec3 {
  const local = uvToPlaneLocal(params.uv, params.planeWidth, params.planeHeight);
  return planeLocalToWorld(local, params.planeObject);
}

export function worldToUvOnPlane(params: {
  world: Vec3;
  planeWidth: number;
  planeHeight: number;
  planeObject: Object3D;
}): UvCoord {
  const local = worldToPlaneLocal(params.world, params.planeObject);
  return planeLocalToUv({ x: local.x, y: local.y }, params.planeWidth, params.planeHeight);
}

export function depth01ToDisplacement(depth01: number, displacementScale: number, displacementBias: number): number {
  return depth01 * displacementScale + displacementBias;
}

export function uvAndDepthToWorldPointOnPlane(params: {
  uv: UvCoord;
  depth01: number;
  planeWidth: number;
  planeHeight: number;
  planeObject: Object3D;
  displacementScale: number;
  displacementBias: number;
}): Vec3 {
  const local = uvToPlaneLocal(params.uv, params.planeWidth, params.planeHeight);
  const disp = depth01ToDisplacement(params.depth01, params.displacementScale, params.displacementBias);
  const localPoint = new Vector3(local.x, local.y, local.z + disp);
  params.planeObject.localToWorld(localPoint);
  return { x: localPoint.x, y: localPoint.y, z: localPoint.z };
}

export function raycastFromClientPoint(params: {
  client: Point2D;
  element: HTMLElement;
  camera: Camera;
  objects: Object3D | Object3D[];
  recursive?: boolean;
}): Array<Intersection<Object3D>> {
  const { client, element, camera, objects, recursive = true } = params;

  const ndc = clientPointToNdc(client, element);
  const raycaster = new Raycaster();
  raycaster.setFromCamera(ndc, camera);

  const list = Array.isArray(objects) ? objects : [objects];
  return raycaster.intersectObjects(list, recursive);
}

export function pickFirstIntersectionFromElementPoint(params: {
  point: Point2D;
  element: HTMLElement;
  camera: Camera;
  objects: Object3D | Object3D[];
  recursive?: boolean;
}): {
  object: Object3D;
  distance: number;
  worldPoint: Vec3;
  threeUv: UvCoord | null;
  screenUv: UvCoord | null;
} | null {
  const hits = raycastFromElementPoint(params);
  const first = hits[0];
  if (!first) return null;

  const p = first.point;
  const worldPoint: Vec3 = { x: p.x, y: p.y, z: p.z };
  const threeUv = first.uv ? ({ u: first.uv.x, v: first.uv.y } satisfies UvCoord) : null;
  const screenUv = threeUv ? threeUvToScreenUv(threeUv) : null;

  return {
    object: first.object,
    distance: first.distance,
    worldPoint,
    threeUv,
    screenUv
  };
}

export function raycastFromElementPoint(params: {
  point: Point2D;
  element: HTMLElement;
  camera: Camera;
  objects: Object3D | Object3D[];
  recursive?: boolean;
}): Array<Intersection<Object3D>> {
  const { point, element, camera, objects, recursive = true } = params;

  const ndc = elementPointToNdc(point, element);
  const raycaster = new Raycaster();
  raycaster.setFromCamera(ndc, camera);

  const list = Array.isArray(objects) ? objects : [objects];
  return raycaster.intersectObjects(list, recursive);
}

export function raycastFromPointerEvent(params: {
  event: PointerEventLike;
  element: HTMLElement;
  camera: Camera;
  objects: Object3D | Object3D[];
  recursive?: boolean;
}): Array<Intersection<Object3D>> {
  const client = getClientPointFromPointerEvent(params.event);
  if (!client) return [];
  return raycastFromClientPoint({
    client,
    element: params.element,
    camera: params.camera,
    objects: params.objects,
    recursive: params.recursive
  });
}

export function uvToPixel(uv: UvCoord, width: number, height: number): PixelCoord {
  const x = uv.u * (width - 1);
  const y = uv.v * (height - 1);
  return { x, y };
}

export function pixelToUv(pixel: PixelCoord, width: number, height: number): UvCoord {
  const u = width > 1 ? pixel.x / (width - 1) : 0;
  const v = height > 1 ? pixel.y / (height - 1) : 0;
  return { u, v };
}

export function flipUv(uv: UvCoord, options?: { flipX?: boolean; flipY?: boolean }): UvCoord {
  const flipX = options?.flipX ?? false;
  const flipY = options?.flipY ?? false;
  return {
    u: flipX ? 1 - uv.u : uv.u,
    v: flipY ? 1 - uv.v : uv.v
  };
}

export function mediaPixelToScreenUv(params: {
  pixel: PixelCoord;
  mediaWidth: number;
  mediaHeight: number;
  flipX?: boolean;
  flipY?: boolean;
}): UvCoord {
  const uv = pixelToUv(params.pixel, params.mediaWidth, params.mediaHeight);
  return clampUv(flipUv(uv, { flipX: params.flipX, flipY: params.flipY }));
}

export function screenUvToMediaPixel(params: {
  uv: UvCoord;
  mediaWidth: number;
  mediaHeight: number;
  flipX?: boolean;
  flipY?: boolean;
}): PixelCoord {
  const uv = flipUv(clampUv(params.uv), { flipX: params.flipX, flipY: params.flipY });
  return uvToPixel(uv, params.mediaWidth, params.mediaHeight);
}

export async function loadImageDataFromUrl(url: string): Promise<ImageData> {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width = 0;
  canvas.height = 0;
  return imageData;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function clampUv(uv: UvCoord): UvCoord {
  return { u: clamp01(uv.u), v: clamp01(uv.v) };
}

export function sampleImageDataGray01(params: {
  image: ImageData;
  uv: UvCoord;
  mode?: SampleMode;
}): number {
  const { image, mode = 'bilinear' } = params;
  const uv = clampUv(params.uv);
  const { width, height, data } = image;

  if (width <= 0 || height <= 0) return 0;

  const fx = uv.u * (width - 1);
  const fy = uv.v * (height - 1);

  const readGray01 = (x: number, y: number): number => {
    const ix = Math.max(0, Math.min(width - 1, x));
    const iy = Math.max(0, Math.min(height - 1, y));
    const idx = (iy * width + ix) * 4;
    const r = data[idx] ?? 0;
    return r / 255;
  };

  if (mode === 'nearest') {
    return readGray01(Math.round(fx), Math.round(fy));
  }

  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const tx = fx - x0;
  const ty = fy - y0;

  const v00 = readGray01(x0, y0);
  const v10 = readGray01(x1, y0);
  const v01 = readGray01(x0, y1);
  const v11 = readGray01(x1, y1);

  const vx0 = v00 + (v10 - v00) * tx;
  const vx1 = v01 + (v11 - v01) * tx;
  return vx0 + (vx1 - vx0) * ty;
}

export function mapMediaPixelToDisplacedWorldPoint(params: {
  pixel: PixelCoord;
  mediaWidth: number;
  mediaHeight: number;
  depthImage: ImageData;
  planeWidth: number;
  planeHeight: number;
  planeObject: Object3D;
  displacementScale: number;
  displacementBias: number;
  flipX?: boolean;
  flipY?: boolean;
  sampleMode?: SampleMode;
}): {
  uv: UvCoord;
  depth01: number;
  world: Vec3;
} {
  const uv = mediaPixelToScreenUv({
    pixel: params.pixel,
    mediaWidth: params.mediaWidth,
    mediaHeight: params.mediaHeight,
    flipX: params.flipX,
    flipY: params.flipY
  });

  const depth01 = sampleImageDataGray01({ image: params.depthImage, uv, mode: params.sampleMode });
  const world = uvAndDepthToWorldPointOnPlane({
    uv,
    depth01,
    planeWidth: params.planeWidth,
    planeHeight: params.planeHeight,
    planeObject: params.planeObject,
    displacementScale: params.displacementScale,
    displacementBias: params.displacementBias
  });

  return { uv, depth01, world };
}
