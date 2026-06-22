import * as THREE from 'three';

export class Car {
  constructor(scene, type = 'spectre') {
    this.scene = scene;
    this.type = type;
    
    // 3D Visual Group
    this.mesh = new THREE.Group();
    
    // Physics and State
    this.x = 0;
    this.y = 0;
    this.z = 0;
    
    this.speed = 0;
    this.normalMaxSpeed = 75; // MPH equivalent scroll units
    this.boostMaxSpeed = 135;
    this.maxSpeed = this.normalMaxSpeed;
    
    this.acceleration = 30; // units/s^2
    this.braking = 70;      // units/s^2
    this.drag = 10;         // natural coasting deceleration
    this.steerSpeed = 14;   // units/s
    
    // Gameplay stats
    this.health = 100;
    this.boostCharge = 100;
    this.isBoosting = false;
    this.isDead = false;
    
    // Dimensions for collision checks
    this.width = 1.6;
    this.height = 0.9;
    this.length = 3.4;

    this.bodyGroup = null;
    this.frontLeftWheel = null;
    this.frontRightWheel = null;
    this.thrusterFlame = null;
    this.thrusterFlameLeft = null;
    this.thrusterFlameRight = null;

    // Apply specific stats and mesh on init
    this.changeType(type);
  }

  changeType(type) {
    this.type = type;
    
    // Remove old mesh from scene
    this.scene.remove(this.mesh);
    
    // Clean up old geometries and materials to avoid memory leaks
    this.mesh.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    this.mesh = new THREE.Group();

    // Set stats and dimensions based on vehicle type
    if (this.type === 'spectre') {
      this.normalMaxSpeed = 75;
      this.acceleration = 28;
      this.steerSpeed = 13.5;
      this.width = 1.6;
      this.height = 0.85;
      this.length = 3.4;
    } else if (this.type === 'vortex') {
      this.normalMaxSpeed = 65;
      this.acceleration = 42;
      this.steerSpeed = 12.0;
      this.width = 1.65;
      this.height = 0.95;
      this.length = 3.5;
    } else if (this.type === 'apex') {
      this.normalMaxSpeed = 70;
      this.acceleration = 30;
      this.steerSpeed = 17.5;
      this.width = 1.78;
      this.height = 0.8;
      this.length = 3.3;
    }

    this.maxSpeed = this.normalMaxSpeed;
    this.createCarMesh();
    
    // Position mesh
    this.mesh.position.set(this.x, this.y, this.z);
    this.scene.add(this.mesh);
  }

  createCarMesh() {
    this.bodyGroup = new THREE.Group();

    if (this.type === 'spectre') {
      // SPECTRE: Sleek sports car (Pink body, Cyan accents)
      const bodyColor = 0xda4c8c;
      const trimColor = 0x3fc7d3;

      // Bottom chassis
      const chassisGeo = new THREE.BoxGeometry(this.width, 0.38, this.length);
      const chassisMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.2, metalness: 0.7 });
      const chassis = new THREE.Mesh(chassisGeo, chassisMat);
      chassis.position.y = 0.22;
      this.bodyGroup.add(chassis);

      // Cabin
      const cabinGeo = new THREE.BoxGeometry(this.width * 0.85, 0.38, this.length * 0.45);
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x140e21, roughness: 0.1, metalness: 0.8 });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(0, 0.5, -0.15);
      this.bodyGroup.add(cabin);

      // Windshield
      const glassGeo = new THREE.BoxGeometry(this.width * 0.84, 0.32, 0.08);
      const glassMat = new THREE.MeshBasicMaterial({ color: trimColor, transparent: true, opacity: 0.5 });
      const windshield = new THREE.Mesh(glassGeo, glassMat);
      windshield.position.set(0, 0.5, -0.9);
      windshield.rotation.x = -Math.PI / 6;
      this.bodyGroup.add(windshield);

      // Spoiler posts and wing
      const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), new THREE.MeshStandardMaterial({ color: bodyColor }));
      leftPost.position.set(-this.width / 2.6, 0.42, 1.35);
      this.bodyGroup.add(leftPost);

      const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), new THREE.MeshStandardMaterial({ color: bodyColor }));
      rightPost.position.set(this.width / 2.6, 0.42, 1.35);
      this.bodyGroup.add(rightPost);

      const wing = new THREE.Mesh(new THREE.BoxGeometry(this.width * 1.1, 0.04, 0.45), new THREE.MeshBasicMaterial({ color: trimColor }));
      wing.position.set(0, 0.54, 1.35);
      this.bodyGroup.add(wing);

      // Taillights
      const tailMat = new THREE.MeshBasicMaterial({ color: 0xc8455b });
      const tailGeo = new THREE.BoxGeometry(0.3, 0.06, 0.04);
      const leftTail = new THREE.Mesh(tailGeo, tailMat);
      leftTail.position.set(-this.width / 3.2, 0.25, this.length / 2 + 0.01);
      this.bodyGroup.add(leftTail);

      const rightTail = new THREE.Mesh(tailGeo, tailMat);
      rightTail.position.set(this.width / 3.2, 0.25, this.length / 2 + 0.01);
      this.bodyGroup.add(rightTail);

      // Single centered exhaust
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x333333 }));
      exhaust.position.set(0, 0.18, this.length / 2);
      this.bodyGroup.add(exhaust);

      // Flame
      const flameGeo = new THREE.ConeGeometry(0.15, 0.7, 8).rotateX(-Math.PI / 2).translate(0, 0, 0.35);
      this.thrusterFlame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: 0xd65b8c, transparent: true, opacity: 0.8 }));
      this.thrusterFlame.position.set(0, 0.18, this.length / 2);
      this.thrusterFlame.visible = false;
      this.bodyGroup.add(this.thrusterFlame);

    } else if (this.type === 'vortex') {
      // VORTEX: Muscle car (Purple body, Gold accents, Dual exhaust vents)
      const bodyColor = 0x8655cc;
      const trimColor = 0xe4c360;

      // Boxier chassis
      const chassisGeo = new THREE.BoxGeometry(this.width, 0.44, this.length);
      const chassisMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.3, metalness: 0.6 });
      const chassis = new THREE.Mesh(chassisGeo, chassisMat);
      chassis.position.y = 0.25;
      this.bodyGroup.add(chassis);

      // Boxier cabin
      const cabinGeo = new THREE.BoxGeometry(this.width * 0.88, 0.4, this.length * 0.48);
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x140e21, roughness: 0.2, metalness: 0.7 });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(0, 0.55, 0.05); // Cabin shifted back slightly
      this.bodyGroup.add(cabin);

      // Windshield (less angled)
      const glassGeo = new THREE.BoxGeometry(this.width * 0.87, 0.35, 0.08);
      const glassMat = new THREE.MeshBasicMaterial({ color: trimColor, transparent: true, opacity: 0.5 });
      const windshield = new THREE.Mesh(glassGeo, glassMat);
      windshield.position.set(0, 0.55, -0.85);
      windshield.rotation.x = -Math.PI / 8;
      this.bodyGroup.add(windshield);

      // Dual Air Scoop Intakes on Hood
      const scoopGeo = new THREE.BoxGeometry(0.28, 0.08, 0.45);
      const scoopMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
      
      const leftScoop = new THREE.Mesh(scoopGeo, scoopMat);
      leftScoop.position.set(-0.3, 0.48, -0.9);
      this.bodyGroup.add(leftScoop);

      const rightScoop = new THREE.Mesh(scoopGeo, scoopMat);
      rightScoop.position.set(0.3, 0.48, -0.9);
      this.bodyGroup.add(rightScoop);

      // Rear Spoiler Lip (not raised wing)
      const spoilerLip = new THREE.Mesh(new THREE.BoxGeometry(this.width * 0.98, 0.1, 0.15), new THREE.MeshStandardMaterial({ color: trimColor }));
      spoilerLip.position.set(0, 0.45, this.length / 2 - 0.08);
      this.bodyGroup.add(spoilerLip);

      // Dual exhausts
      const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.9 });
      const exL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15, 6).rotateX(Math.PI / 2), exhaustMat);
      exL.position.set(-0.4, 0.18, this.length / 2);
      this.bodyGroup.add(exL);

      const exR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15, 6).rotateX(Math.PI / 2), exhaustMat);
      exR.position.set(0.4, 0.18, this.length / 2);
      this.bodyGroup.add(exR);

      // Dual Flames
      const flameL = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.5, 6).rotateX(-Math.PI / 2).translate(0, 0, 0.25),
        new THREE.MeshBasicMaterial({ color: trimColor, transparent: true, opacity: 0.85 })
      );
      flameL.position.set(-0.4, 0.18, this.length / 2);
      flameL.visible = false;
      this.bodyGroup.add(flameL);
      this.thrusterFlameLeft = flameL;

      const flameR = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.5, 6).rotateX(-Math.PI / 2).translate(0, 0, 0.25),
        new THREE.MeshBasicMaterial({ color: trimColor, transparent: true, opacity: 0.85 })
      );
      flameR.position.set(0.4, 0.18, this.length / 2);
      flameR.visible = false;
      this.bodyGroup.add(flameR);
      this.thrusterFlameRight = flameR;

    } else if (this.type === 'apex') {
      // APEX: Low-slung Hypercar (Wide Charcoal body, Lime Green trim, Low wing)
      const bodyColor = 0x3d3a47;
      const trimColor = 0x76cc55;

      // Ultra-wide chassis
      const chassisGeo = new THREE.BoxGeometry(this.width, 0.32, this.length);
      const chassisMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.15, metalness: 0.85 });
      const chassis = new THREE.Mesh(chassisGeo, chassisMat);
      chassis.position.y = 0.18;
      this.bodyGroup.add(chassis);

      // Low flat cabin
      const cabinGeo = new THREE.BoxGeometry(this.width * 0.78, 0.32, this.length * 0.4);
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x140e21, roughness: 0.0, metalness: 0.95 });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(0, 0.44, -0.2);
      this.bodyGroup.add(cabin);

      // Windshield (extreme angle)
      const glassGeo = new THREE.BoxGeometry(this.width * 0.76, 0.28, 0.08);
      const glassMat = new THREE.MeshBasicMaterial({ color: trimColor, transparent: true, opacity: 0.4 });
      const windshield = new THREE.Mesh(glassGeo, glassMat);
      windshield.position.set(0, 0.44, -0.92);
      windshield.rotation.x = -Math.PI / 4;
      this.bodyGroup.add(windshield);

      // Large side fins (Aerodynamics trim)
      const finMat = new THREE.MeshBasicMaterial({ color: trimColor });
      const leftFin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.8), finMat);
      leftFin.position.set(-this.width / 2 + 0.02, 0.25, 0.2);
      this.bodyGroup.add(leftFin);

      const rightFin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.8), finMat);
      rightFin.position.set(this.width / 2 - 0.02, 0.25, 0.2);
      this.bodyGroup.add(rightFin);

      // Low wide rear wing
      const wingMat = new THREE.MeshBasicMaterial({ color: trimColor });
      const rearWing = new THREE.Mesh(new THREE.BoxGeometry(this.width * 1.15, 0.03, 0.4), wingMat);
      rearWing.position.set(0, 0.4, 1.4);
      this.bodyGroup.add(rearWing);

      // Headlight bars (low slats)
      const headLGeo = new THREE.BoxGeometry(0.4, 0.05, 0.05);
      const headLMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const headL1 = new THREE.Mesh(headLGeo, headLMat);
      headL1.position.set(-this.width / 3.4, 0.18, -this.length / 2 - 0.01);
      this.bodyGroup.add(headL1);

      const headL2 = new THREE.Mesh(headLGeo, headLMat);
      headL2.position.set(this.width / 3.4, 0.18, -this.length / 2 - 0.01);
      this.bodyGroup.add(headL2);

      // Tail center exhaust
      const exhaust = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.15), new THREE.MeshStandardMaterial({ color: 0x111111 }));
      exhaust.position.set(0, 0.16, this.length / 2);
      this.bodyGroup.add(exhaust);

      // Wide Flame
      const flameGeo = new THREE.ConeGeometry(0.2, 0.6, 4).rotateX(-Math.PI / 2).translate(0, 0, 0.3);
      this.thrusterFlame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: 0x76cc55, transparent: true, opacity: 0.8 }));
      this.thrusterFlame.position.set(0, 0.16, this.length / 2);
      this.thrusterFlame.visible = false;
      this.bodyGroup.add(this.thrusterFlame);
    }

    // Common glowing headlights and taillights
    // Headlights
    const lightGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8).rotateX(Math.PI / 2);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfffcd3 }); // Soft warm white headlights
    const leftHeadlight = new THREE.Mesh(lightGeo, lightMat);
    leftHeadlight.position.set(-this.width / 3.2, 0.25, -this.length / 2 - 0.01);
    this.bodyGroup.add(leftHeadlight);

    const rightHeadlight = new THREE.Mesh(lightGeo, lightMat);
    rightHeadlight.position.set(this.width / 3.2, 0.25, -this.length / 2 - 0.01);
    this.bodyGroup.add(rightHeadlight);

    this.mesh.add(this.bodyGroup);

    // Wheels (4 cylinders)
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12).rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.7, metalness: 0.4 });

    const fLWheelGroup = new THREE.Group();
    const wheelFL = new THREE.Mesh(wheelGeo, wheelMat);
    fLWheelGroup.position.set(-this.width / 2 - 0.08, 0.35, -this.length / 3);
    fLWheelGroup.add(wheelFL);
    this.mesh.add(fLWheelGroup);
    this.frontLeftWheel = fLWheelGroup;

    const fRWheelGroup = new THREE.Group();
    const wheelFR = new THREE.Mesh(wheelGeo, wheelMat);
    fRWheelGroup.position.set(this.width / 2 + 0.08, 0.35, -this.length / 3);
    fRWheelGroup.add(wheelFR);
    this.mesh.add(fRWheelGroup);
    this.frontRightWheel = fRWheelGroup;

    const wheelBL = new THREE.Mesh(wheelGeo, wheelMat);
    wheelBL.position.set(-this.width / 2 - 0.08, 0.35, this.length / 3);
    this.mesh.add(wheelBL);

    const wheelBR = new THREE.Mesh(wheelGeo, wheelMat);
    wheelBR.position.set(this.width / 2 + 0.08, 0.35, this.length / 3);
    this.mesh.add(wheelBR);
  }

  update(delta, controller) {
    if (this.isDead) return;

    // 1. Process Speed (Manual Acceleration / Deceleration)
    if (controller.boost && this.boostCharge > 0 && this.speed > 5) {
      this.isBoosting = true;
      this.maxSpeed = this.boostMaxSpeed;
      this.speed += this.acceleration * 2 * delta; // Accelerate faster during boost
      this.boostCharge = Math.max(0, this.boostCharge - 30 * delta); // Consume boost
      
      // Animate thruster flame
      if (this.thrusterFlame) {
        this.thrusterFlame.visible = true;
        this.thrusterFlame.scale.set(
          1 + Math.sin(Date.now() * 0.05) * 0.1,
          1 + Math.sin(Date.now() * 0.05) * 0.1,
          1.5 + Math.random() * 0.5
        );
      }
      if (this.thrusterFlameLeft && this.thrusterFlameRight) {
        this.thrusterFlameLeft.visible = true;
        this.thrusterFlameRight.visible = true;
        this.thrusterFlameLeft.scale.set(1, 1, 1.2 + Math.random() * 0.4);
        this.thrusterFlameRight.scale.set(1, 1, 1.2 + Math.random() * 0.4);
      }
    } else {
      this.isBoosting = false;
      this.maxSpeed = this.normalMaxSpeed;
      if (this.thrusterFlame) this.thrusterFlame.visible = false;
      if (this.thrusterFlameLeft) this.thrusterFlameLeft.visible = false;
      if (this.thrusterFlameRight) this.thrusterFlameRight.visible = false;

      // Charge boost slowly when not using it
      if (this.boostCharge < 100) {
        this.boostCharge = Math.min(100, this.boostCharge + 5 * delta);
      }

      // Manual acceleration
      if (controller.accelerate) {
        this.speed += this.acceleration * delta;
      } else if (controller.brake) {
        this.speed -= this.braking * delta;
      } else {
        // Coasting drag
        this.speed -= this.drag * delta;
      }
    }

    // Clamp speed limits
    this.speed = Math.max(0, Math.min(this.maxSpeed, this.speed));

    // 2. Process Steering (Continuous horizontal movement using steerAmount [-1, 1])
    const steerVal = controller.steerAmount; // Continuous value

    // Scale steering speed by current car velocity to prevent spinning when standing still
    const velocityScale = Math.min(this.speed / 15, 1.0);
    this.x += steerVal * this.steerSpeed * velocityScale * delta;

    // Clamp inside highway dividers (road is 14 wide, bounds approx -6.0 to 6.0)
    const edgeLimit = 6.0;
    if (this.x < -edgeLimit) {
      this.x = -edgeLimit;
      this.speed *= 0.95; // Drag against barrier
    }
    if (this.x > edgeLimit) {
      this.x = edgeLimit;
      this.speed *= 0.95; // Drag against barrier
    }

    // 3. Update Visual Mesh Positions
    this.mesh.position.x = this.x;

    // 4. Smooth visual body roll & wheel steering angles proportional to steerVal
    if (steerVal !== 0) {
      // Tilt body
      this.bodyGroup.rotation.z = THREE.MathUtils.lerp(this.bodyGroup.rotation.z, -steerVal * 0.09, 10 * delta);
      // Turn front wheels
      this.frontLeftWheel.rotation.y = THREE.MathUtils.lerp(this.frontLeftWheel.rotation.y, steerVal * 0.35, 10 * delta);
      this.frontRightWheel.rotation.y = THREE.MathUtils.lerp(this.frontRightWheel.rotation.y, steerVal * 0.35, 10 * delta);
    } else {
      // Re-align body and wheels
      this.bodyGroup.rotation.z = THREE.MathUtils.lerp(this.bodyGroup.rotation.z, 0, 10 * delta);
      this.frontLeftWheel.rotation.y = THREE.MathUtils.lerp(this.frontLeftWheel.rotation.y, 0, 10 * delta);
      this.frontRightWheel.rotation.y = THREE.MathUtils.lerp(this.frontRightWheel.rotation.y, 0, 10 * delta);
    }

    // 5. Fuel / Battery drain over time proportional to speed
    const baseDrain = 1.2;
    const speedDrain = (this.speed / this.normalMaxSpeed) * 3.0;
    const boostDrain = this.isBoosting ? 5.0 : 0;
    this.health = Math.max(0, this.health - (baseDrain + speedDrain + boostDrain) * delta);
    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  damage(amount) {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  heal(amount) {
    this.health = Math.min(100, this.health + amount);
  }

  addBoost(amount) {
    this.boostCharge = Math.min(100, this.boostCharge + amount);
  }

  reset() {
    this.x = 0;
    this.speed = 0;
    this.health = 100;
    this.boostCharge = 100;
    this.isDead = false;
    this.isBoosting = false;
    this.mesh.position.set(0, 0, 0);
    this.bodyGroup.rotation.set(0, 0, 0);
    this.frontLeftWheel.rotation.set(0, 0, 0);
    this.frontRightWheel.rotation.set(0, 0, 0);
    if (this.thrusterFlame) this.thrusterFlame.visible = false;
    if (this.thrusterFlameLeft) this.thrusterFlameLeft.visible = false;
    if (this.thrusterFlameRight) this.thrusterFlameRight.visible = false;
  }
}
