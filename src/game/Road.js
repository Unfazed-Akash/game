import * as THREE from 'three';

export class Road {
  constructor(scene) {
    this.scene = scene;
    
    // Road specifications
    this.width = 14;      // Total road width
    this.segmentLength = 100;
    this.numSegments = 3;
    this.roadSegments = [];
    
    // Side buildings and scenery
    this.buildings = [];
    this.numBuildings = 16;
    this.buildingLeftX = -25;
    this.buildingRightX = 25;
    
    // Floor grid
    this.leftGrid = null;
    this.rightGrid = null;
    this.gridLength = 300;

    // Track total distance scrolled
    this.totalScrolled = 0;

    this.init();
  }

  init() {
    // 1. Create road segments
    for (let i = 0; i < this.numSegments; i++) {
      const segment = this.createRoadSegment();
      // Position segments one after the other starting ahead
      // Z = 0, Z = -100, Z = -200
      segment.position.z = -i * this.segmentLength;
      this.scene.add(segment);
      this.roadSegments.push(segment);
    }

    // 2. Create side scenery (skyscrapers)
    this.createScenery();

    // 3. Create scrolling landscape grids
    this.createLandscapeGrids();

    // 4. Create Retro Synthwave Sun in the distance
    this.createSynthwaveSun();
  }

  createRoadSegment() {
    const group = new THREE.Group();

    // The dark asphalt
    const roadGeo = new THREE.PlaneGeometry(this.width, this.segmentLength);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x08060f,
      roughness: 0.85,
      metalness: 0.1
    });
    const asphalt = new THREE.Mesh(roadGeo, roadMat);
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.y = 0;
    // Align plane center relative to group
    asphalt.position.z = -this.segmentLength / 2;
    group.add(asphalt);

    // Neon side barriers (left and right) - Softened Calm Colors
    const barrierWidth = 0.3;
    const barrierHeight = 0.4;
    const barrierGeo = new THREE.BoxGeometry(barrierWidth, barrierHeight, this.segmentLength);
    
    const leftBarrierMat = new THREE.MeshBasicMaterial({ color: 0x4a6b82 }); // Muted Steel Blue
    const rightBarrierMat = new THREE.MeshBasicMaterial({ color: 0x5b8c8f }); // Soft Slate Teal
    
    const leftBarrier = new THREE.Mesh(barrierGeo, leftBarrierMat);
    leftBarrier.position.set(-this.width / 2, barrierHeight / 2, -this.segmentLength / 2);
    group.add(leftBarrier);

    const rightBarrier = new THREE.Mesh(barrierGeo, rightBarrierMat);
    rightBarrier.position.set(this.width / 2, barrierHeight / 2, -this.segmentLength / 2);
    group.add(rightBarrier);

    // Lane dividers - Calm slate off-white, lowered opacity
    const numDashes = 10;
    const dashLength = 4;
    const dashGap = 6;
    const dividerGeo = new THREE.PlaneGeometry(0.12, dashLength);
    const dividerMat = new THREE.MeshBasicMaterial({
      color: 0x9aa5b0, // Calm Slate Grey
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });

    const dividerXs = [-3.5, 0, 3.5];

    for (let dash = 0; dash < numDashes; dash++) {
      const zOffset = -dash * (dashLength + dashGap) - (dashLength / 2);
      
      dividerXs.forEach(xVal => {
        const dividerDash = new THREE.Mesh(dividerGeo, dividerMat);
        dividerDash.rotation.x = -Math.PI / 2;
        dividerDash.position.set(xVal, 0.01, zOffset); // Slightly above asphalt to avoid z-fighting
        group.add(dividerDash);
      });
    }

    return group;
  }

  createLandscapeGrids() {
    // Left Grid - Deep charcoal slate lines
    const gridHelperLeft = new THREE.GridHelper(300, 30, 0x405260, 0x121a22);
    gridHelperLeft.position.set(-45, -0.1, -100);
    this.scene.add(gridHelperLeft);
    this.leftGrid = gridHelperLeft;

    // Right Grid - Deep charcoal slate lines
    const gridHelperRight = new THREE.GridHelper(300, 30, 0x405260, 0x121a22);
    gridHelperRight.position.set(45, -0.1, -100);
    this.scene.add(gridHelperRight);
    this.rightGrid = gridHelperRight;
  }

  createScenery() {
    // Generate side buildings that will scroll past - Low opacity calm steel
    const buildingMatLeft = new THREE.MeshBasicMaterial({
      color: 0x1c2733,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });

    const buildingMatRight = new THREE.MeshBasicMaterial({
      color: 0x1c2733,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });

    for (let i = 0; i < this.numBuildings; i++) {
      // Alternate left and right
      const isLeft = i % 2 === 0;
      
      // Random building sizing
      const w = 5 + Math.random() * 8;
      const h = 20 + Math.random() * 35;
      const d = 5 + Math.random() * 8;

      const buildingGeo = new THREE.BoxGeometry(w, h, d);
      const building = new THREE.Mesh(buildingGeo, isLeft ? buildingMatLeft : buildingMatRight);

      // Position
      const x = isLeft ? this.buildingLeftX - Math.random() * 15 : this.buildingRightX + Math.random() * 15;
      const y = h / 2 - 0.5;
      const z = -(i * (300 / this.numBuildings)) - Math.random() * 10;

      building.position.set(x, y, z);
      this.scene.add(building);
      this.buildings.push(building);
    }
  }

  createSynthwaveSun() {
    // Generate retro moon texture using HTML Canvas
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Create soft pale-gold to slate-blue gradient (for a calm moon look)
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#eae0c8');   // Soft Pale White-Gold
    grad.addColorStop(0.5, '#7d91a8'); // Muted Blue-Grey
    grad.addColorStop(1, '#131b26');   // Deep Slate Blue

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw horizontal black grid slices (bottom half) to simulate standard sun
    ctx.fillStyle = '#100b1a'; // Matches scene background color
    const startY = size / 2 + 10;
    const sliceHeight = 8;
    for (let y = startY; y < size; y += 22) {
      // Progressively wider gaps
      const thickness = sliceHeight + (y - startY) * 0.15;
      ctx.fillRect(0, y, size, thickness);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const sunGeo = new THREE.PlaneGeometry(80, 80);
    const sunMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });

    const sun = new THREE.Mesh(sunGeo, sunMat);
    // Place far ahead, slightly elevated
    sun.position.set(0, 15, -290);
    this.scene.add(sun);
  }

  update(delta, speed) {
    const scrollDistance = speed * delta;
    this.totalScrolled += scrollDistance;

    // 1. Scroll road segments
    for (let segment of this.roadSegments) {
      segment.position.z += scrollDistance;

      // If segment goes behind the camera (e.g. Z > 100), shift it back to the front
      if (segment.position.z > 100) {
        segment.position.z -= this.numSegments * this.segmentLength;
      }
    }

    // 2. Scroll grids
    if (this.leftGrid && this.rightGrid) {
      this.leftGrid.position.z += scrollDistance;
      this.rightGrid.position.z += scrollDistance;

      if (this.leftGrid.position.z > 50) this.leftGrid.position.z -= 100;
      if (this.rightGrid.position.z > 50) this.rightGrid.position.z -= 100;
    }

    // 3. Scroll side buildings
    for (let building of this.buildings) {
      building.position.z += scrollDistance;

      // If building passes behind camera, move it far ahead
      if (building.position.z > 20) {
        building.position.z -= 300;
        // Randomize height and width slightly when recycling to keep scenery dynamic
        const isLeft = building.position.x < 0;
        building.position.x = isLeft ? this.buildingLeftX - Math.random() * 15 : this.buildingRightX + Math.random() * 15;
      }
    }
  }

  // Helper to convert normalized lane index (0 to 3) to road X coordinate
  static getLaneX(laneIndex) {
    // 4 lanes: X = -5.25 (Lane 0), -1.75 (Lane 1), 1.75 (Lane 2), 5.25 (Lane 3)
    // Lane width is 3.5. Center of each lane:
    // index 0: -3.5 - 1.75 = -5.25
    // index 1: -1.75
    // index 2: 1.75
    // index 3: 5.25
    return -5.25 + laneIndex * 3.5;
  }
}
