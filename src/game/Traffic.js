import * as THREE from 'three';
import { Road } from './Road.js';

export class Traffic {
  constructor(scene) {
    this.scene = scene;
    this.cars = [];
    this.maxCars = 5;
    this.spawnTimer = 0;
    this.spawnInterval = 2.2; // seconds
    
    // NPC Vehicle specs
    this.width = 1.6;
    this.height = 0.9;
    this.length = 3.4;

    // Harmonious retro-wave color palette for NPC cars - Softened and desaturated
    this.colors = [
      0x5caea4, // Soft Emerald/Teal
      0xd5b06a, // Soft Gold/Ochre
      0xce7965, // Soft Terracotta
      0x6c5b9b, // Soft Slate Purple
      0xbf5b8b  // Soft Muted Rose
    ];
  }

  update(delta, playerSpeed, playerX) {
    this.spawnTimer += delta;

    // Spawn new cars when needed
    if (this.cars.length < this.maxCars && this.spawnTimer > this.spawnInterval) {
      this.spawnCar();
      this.spawnTimer = 0;
    }

    // Update existing cars
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];

      // Relative motion: road is moving towards player at playerSpeed, NPC is driving forward at car.npcSpeed
      const relativeVelocity = playerSpeed - car.npcSpeed;
      car.mesh.position.z += relativeVelocity * delta;

      // Wrap-around / recycle checks
      const isTooFarBehind = car.mesh.position.z > 20;
      const isTooFarAhead = car.mesh.position.z < -250;

      if (isTooFarBehind || isTooFarAhead) {
        this.removeCar(car, i);
      }
    }
  }

  spawnCar() {
    // 1. Choose a random lane (0 to 3)
    const laneIndex = Math.floor(Math.random() * 4);
    const laneX = Road.getLaneX(laneIndex);

    // Ensure we don't spawn directly on top of another car in the same lane
    const minSpawnZ = -180;
    let spawnZ = -150 - Math.random() * 50;

    for (let car of this.cars) {
      if (Math.abs(car.mesh.position.x - laneX) < 1.0 && Math.abs(car.mesh.position.z - spawnZ) < 25) {
        // Adjust spawn back to avoid overlapping
        spawnZ -= 25;
      }
    }

    // 2. Determine type (sedan vs boxy SUV)
    const isSUV = Math.random() > 0.6;
    
    // Choose color
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];
    
    const group = new THREE.Group();

    // Visual dimensions
    const cWidth = this.width;
    const cHeight = isSUV ? 1.2 : 0.8;
    const cLength = isSUV ? 3.8 : 3.3;

    // Body
    const bodyGeo = new THREE.BoxGeometry(cWidth, cHeight * 0.5, cLength);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.45,
      metalness: 0.3
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = cHeight * 0.25;
    group.add(body);

    // Cabin
    const cabHeight = cHeight * 0.5;
    const cabGeo = new THREE.BoxGeometry(cWidth * 0.8, cabHeight, isSUV ? cLength * 0.7 : cLength * 0.45);
    const cabMat = new THREE.MeshStandardMaterial({
      color: 0x140e21,
      roughness: 0.2,
      metalness: 0.6
    });
    const cabin = new THREE.Mesh(cabGeo, cabMat);
    cabin.position.set(0, cHeight * 0.5 + cabHeight * 0.5, isSUV ? 0.2 : -0.2);
    group.add(cabin);

    // Glowing head/taillights
    const lightGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8);
    lightGeo.rotateX(Math.PI / 2);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfffcd3 }); // Soft warm white headlights
    
    const leftLight = new THREE.Mesh(lightGeo, lightMat);
    leftLight.position.set(-cWidth / 3.2, cHeight * 0.3, -cLength / 2 - 0.01);
    group.add(leftLight);

    const rightLight = new THREE.Mesh(lightGeo, lightMat);
    rightLight.position.set(cWidth / 3.2, cHeight * 0.3, -cLength / 2 - 0.01);
    group.add(rightLight);

    // Red taillights (softer crimson)
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xbf3f54 });
    const tailGeo = new THREE.BoxGeometry(0.25, 0.06, 0.04);
    
    const leftTail = new THREE.Mesh(tailGeo, tailMat);
    leftTail.position.set(-cWidth / 3.2, cHeight * 0.35, cLength / 2 + 0.01);
    group.add(leftTail);

    const rightTail = new THREE.Mesh(tailGeo, tailMat);
    rightTail.position.set(cWidth / 3.2, cHeight * 0.35, cLength / 2 + 0.01);
    group.add(rightTail);

    // Wheels (4 cylinders)
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 8);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.8 });
    
    const wheels = [
      [-cWidth / 2 - 0.05, 0.32, -cLength / 3],
      [cWidth / 2 + 0.05, 0.32, -cLength / 3],
      [-cWidth / 2 - 0.05, 0.32, cLength / 3],
      [cWidth / 2 + 0.05, 0.32, cLength / 3]
    ];

    wheels.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(pos[0], pos[1], pos[2]);
      group.add(wheel);
    });

    group.position.set(laneX, 0, spawnZ);
    this.scene.add(group);

    // Determine NPC speed (slower than player maxSpeed)
    // Traffic drives between 25 and 45 units/s
    const npcSpeed = 25 + Math.random() * 20;

    this.cars.push({
      mesh: group,
      npcSpeed: npcSpeed,
      width: cWidth,
      height: cHeight,
      length: cLength
    });
  }

  removeCar(car, index) {
    this.scene.remove(car.mesh);
    // Recursively dispose geometry and materials to prevent memory leaks on mobile
    car.mesh.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.cars.splice(index, 1);
  }

  checkCollision(player) {
    const pMinX = player.x - player.width / 2;
    const pMaxX = player.x + player.width / 2;
    const pMinZ = player.z - player.length / 2;
    const pMaxZ = player.z + player.length / 2;

    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i];
      
      const npcMinX = car.mesh.position.x - car.width / 2;
      const npcMaxX = car.mesh.position.x + car.width / 2;
      const npcMinZ = car.mesh.position.z - car.length / 2;
      const npcMaxZ = car.mesh.position.z + car.length / 2;

      // Check overlap in X and Z axes (assuming Y height aligns)
      const collidesX = pMinX < npcMaxX && pMaxX > npcMinX;
      const collidesZ = pMinZ < npcMaxZ && pMaxZ > npcMinZ;

      if (collidesX && collidesZ) {
        // Return collision info
        const hitCar = this.cars[i];
        this.removeCar(hitCar, i);
        return {
          collided: true,
          damage: 30 + Math.floor(Math.random() * 15) // Random damage value
        };
      }
    }

    return { collided: false };
  }

  clear() {
    for (let i = this.cars.length - 1; i >= 0; i--) {
      this.removeCar(this.cars[i], i);
    }
    this.cars = [];
    this.spawnTimer = 0;
  }
}
