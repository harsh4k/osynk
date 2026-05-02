/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { createNoise3D } from 'simplex-noise';
import * as THREE from 'three';

const noise3D = createNoise3D();

function computeCurl(x: number, y: number, z: number): THREE.Vector3 {
  const eps = 0.0001;
  const curl = new THREE.Vector3();

  // Find rate of change in YZ plane
  let n1 = noise3D(x, y + eps, z);
  let n2 = noise3D(x, y - eps, z);
  const a = (n1 - n2) / (2 * eps);

  n1 = noise3D(x, y, z + eps);
  n2 = noise3D(x, y, z - eps);
  const b = (n1 - n2) / (2 * eps);

  curl.x = a - b;

  // Find rate of change in XZ plane
  n1 = noise3D(x, y, z + eps);
  n2 = noise3D(x, y, z - eps);
  const c = (n1 - n2) / (2 * eps);

  n1 = noise3D(x + eps, y, z);
  n2 = noise3D(x - eps, y, z);
  const d = (n1 - n2) / (2 * eps);

  curl.y = c - d;

  // Find rate of change in XY plane
  n1 = noise3D(x + eps, y, z);
  n2 = noise3D(x - eps, y, z);
  const e = (n1 - n2) / (2 * eps);

  n1 = noise3D(x, y + eps, z);
  n2 = noise3D(x, y - eps, z);
  const f = (n1 - n2) / (2 * eps);

  curl.z = e - f;

  return curl.normalize();
}

export { computeCurl };
