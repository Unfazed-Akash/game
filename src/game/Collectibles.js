import * as THREE from 'three';
import { Road } from './Road.js';

export class Collectibles {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.maxItems = 5;
    this.spawnTimer = 0;
    this.spawnInterval = 1.3; // seconds (spawn slightly more frequently for variety)

    this.pickupRadius = 1.5;
  }

  update(delta, playerSpeed, playerX, magnetActive) {
    this.spawnTimer += delta;

    // Spawn items
    if (this.items.length < this.maxItems && this.spawnTimer > this.spawnInterval) {
      this.spawnItem();
      this.spawnTimer = 0;
    }

    // Update items (rotation & scrolling / magnet attraction)
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];

      // 1. Magnet Attraction: Pull coins towards player if magnet is active
      const isCoin = item.type === 'coin_gold' || item.type === 'coin_cyan';
      if (magnetActive && isCoin) {
        // Player is at X = playerX, Y = 0, Z = 0
        const dx = playerX - item.mesh.position.x;
        const dz = 0 - item.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 40) {
          // Pull coin towards player at a rapid speed
          const pullVelocity = 35; // units/s
          item.mesh.position.x += (dx / dist) * pullVelocity * delta;
          
          // Combine normal highway scroll with the magnetic pull
          const pullZ = (dz / dist) * pullVelocity;
          // Z scroll is: speed + pull component
          item.mesh.position.z += (playerSpeed + pullZ) * delta;
        } else {
          // Standard scroll outside magnet range
          item.mesh.position.z += playerSpeed * delta;
        }
      } else {
        // Standard highway scroll
        item.mesh.position.z += playerSpeed * delta;
      }

      // 2. Animate: spin coins/batteries/magnets
      if (item.type === 'coin_gold' || item.type === 'coin_cyan') {
        item.mesh.rotation.y += 3.5 * delta;
      } else if (item.type === 'battery') {
        item.mesh.rotation.y += 2.0 * delta;
        item.mesh.position.y = 0.5 + Math.sin(Date.now() * 0.005) * 0.08;
      } else if (item.type === 'magnet') {
        item.mesh.rotation.y += 2.5 * delta;
        // Hover bobbing
        item.mesh.position.y = 0.55 + Math.sin(Date.now() * 0.006) * 0.1;
      } else if (item.type === 'turbo') {
        const scaleVal = 1.0 + Math.sin(Date.now() * 0.01) * 0.08;
        item.mesh.scale.set(scaleVal, 1.0, scaleVal);
      }

      // Recycle if off screen behind camera (Z > 20)
      if (item.mesh.position.z > 20) {
        this.removeItem(item, i);
      }
    }
  }

  spawnItem() {
    const laneIndex = Math.floor(Math.random() * 4);
    const laneX = Road.getLaneX(laneIndex);
    const spawnZ = -160 - Math.random() * 60;

    // Avoid spawning on top of other items
    for (let item of this.items) {
      if (Math.abs(item.mesh.position.x - laneX) < 1.0 && Math.abs(item.mesh.position.z - spawnZ) < 12) {
        return;
      }
    }

    // Determine type: Gold Coin (60%), Cyan Super Coin (20%), Battery (12%), Magnet (8%)
    const roll = Math.random();
    let type = 'coin_gold';
    if (roll > 0.92) {
      type = 'magnet';
    } else if (roll > 0.80) {
      type = 'battery';
    } else if (roll > 0.60) {
      type = 'coin_cyan';
    }

    const group = new THREE.Group();

    if (type === 'coin_gold') {
      // Spinning Gold Coin (Soft yellow)
      const coinGeo = new THREE.TorusGeometry(0.35, 0.08, 8, 16);
      const coinMat = new THREE.MeshBasicMaterial({ color: 0xe4c360 });
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.position.y = 0.5;
      group.add(coin);
    } else if (type === 'coin_cyan') {
      // Spinning Super Coin (Soft Cyan, larger, double ring)
      const outerRingGeo = new THREE.TorusGeometry(0.42, 0.07, 8, 16);
      const innerRingGeo = new THREE.TorusGeometry(0.22, 0.04, 8, 16);
      const coinMat = new THREE.MeshBasicMaterial({ color: 0x3fc7d3 });
      
      const outer = new THREE.Mesh(outerRingGeo, coinMat);
      const inner = new THREE.Mesh(innerRingGeo, coinMat);
      outer.position.y = 0.5;
      inner.position.y = 0.5;
      
      group.add(outer);
      group.add(inner);
    } else if (type === 'battery') {
      // Softer Cyan Battery Cell
      const capGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.75, 8);
      const capMat = new THREE.MeshStandardMaterial({ color: 0x221d2c, metalness: 0.7 });
      const batteryBody = new THREE.Mesh(capGeo, capMat);
      batteryBody.position.y = 0.5;
      group.add(batteryBody);

      // Glowing center ring
      const ringGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 8);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x3fc7d3 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.5;
      group.add(ring);

      // Plus sign on top
      const plusBar1Geo = new THREE.BoxGeometry(0.05, 0.22, 0.05);
      const plusBar2Geo = new THREE.BoxGeometry(0.22, 0.05, 0.05);
      const plusMat = new THREE.MeshBasicMaterial({ color: 0x3fc7d3 });
      
      const p1 = new THREE.Mesh(plusBar1Geo, plusMat);
      const p2 = new THREE.Mesh(plusBar2Geo, plusMat);
      p1.position.y = 0.95;
      p2.position.y = 0.95;
      
      group.add(p1);
      group.add(p2);
    } else if (type === 'magnet') {
      // 3D U-Shaped Magnet (Steel-blue body, amber tips)
      const magnetGroup = new THREE.Group();

      // Base bar
      const baseGeo = new THREE.BoxGeometry(0.5, 0.16, 0.16);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x4f5d75, metalness: 0.5 }); // Slate steel blue
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.4;
      magnetGroup.add(base);

      // Two side prongs
      const prongGeo = new THREE.BoxGeometry(0.16, 0.35, 0.16);
      const leftProng = new THREE.Mesh(prongGeo, baseMat);
      leftProng.position.set(-0.17, 0.58, 0);
      magnetGroup.add(leftProng);

      const rightProng = new THREE.Mesh(prongGeo, baseMat);
      rightProng.position.set(0.17, 0.58, 0);
      magnetGroup.add(rightProng);

      // Amber magnetic tips
      const tipGeo = new THREE.BoxGeometry(0.16, 0.08, 0.16);
      const tipMat = new THREE.MeshBasicMaterial({ color: 0xee6c4d }); // Soft amber
      
      const leftTip = new THREE.Mesh(tipGeo, tipMat);
      leftTip.position.set(-0.17, 0.76, 0);
      magnetGroup.add(leftTip);

      const rightTip = new THREE.Mesh(tipGeo, tipMat);
      rightTip.position.set(0.17, 0.76, 0);
      magnetGroup.add(rightTip);

      // Tilt magnet slightly for cooler look
      magnetGroup.rotation.x = 0.3;
      group.add(magnetGroup);
    }

    group.position.set(laneX, 0, spawnZ);
    this.scene.add(group);

    this.items.push({
      mesh: group,
      type: type,
      lane: laneIndex
    });
  }

  removeItem(item, index) {
    this.scene.remove(item.mesh);
    item.mesh.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.items.splice(index, 1);
  }

  checkPickup(player) {
    const px = player.x;
    const pz = player.z;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const ix = item.mesh.position.x;
      const iz = item.mesh.position.z;

      const dx = px - ix;
      const dz = pz - iz;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < this.pickupRadius) {
        const type = item.type;
        this.removeItem(item, i);
        return type;
      }
    }
    return null;
  }

  clear() {
    for (let i = this.items.length - 1; i >= 0; i--) {
      this.removeItem(this.items[i], i);
    }
    this.items = [];
    this.spawnTimer = 0;
  }
}
