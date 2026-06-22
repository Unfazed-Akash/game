import * as THREE from 'three';

export class Engine {
  constructor(canvasContainerId) {
    this.container = document.getElementById(canvasContainerId);
    if (!this.container) {
      throw new Error(`Canvas container #${canvasContainerId} not found.`);
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    
    this.updatables = [];
    this.isPaused = false;

    this.init();
  }

  init() {
    // 1. Scene
    this.scene = new THREE.Scene();
    
    // Softer synthwave dark grey-violet background and fog
    this.scene.background = new THREE.Color(0x100b1a);
    this.scene.fog = new THREE.FogExp2(0x100b1a, 0.007);

    // 2. Camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    // Initial camera position (will be adjusted dynamically in onWindowResize)
    this.camera.position.set(0, 4.5, 8.5);
    // Look ahead down the track
    this.camera.lookAt(new THREE.Vector3(0, 1.5, -30));

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2 for mobile performance
    this.renderer.shadowMap.enabled = false;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    // Soft ambient light
    const ambientLight = new THREE.AmbientLight(0x201736, 1.0);
    this.scene.add(ambientLight);

    // Softer Cyan key light
    const cyanLight = new THREE.DirectionalLight(0x3fc7d3, 1.1);
    cyanLight.position.set(-10, 20, -10);
    this.scene.add(cyanLight);

    // Softer Magenta back light
    const magentaLight = new THREE.DirectionalLight(0xda4c8c, 1.2);
    magentaLight.position.set(10, 5, 20);
    this.scene.add(magentaLight);

    // 5. Window Resize Event Listener
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Call resize immediately to ensure mobile cameras scale correctly on startup
    this.onWindowResize();
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const aspect = width / height;
    
    this.camera.aspect = aspect;
    
    // Dynamic FOV and position adjustment for mobile/portrait screen ratios
    let targetFov = 60;
    if (aspect < 1.0) {
      // Move camera higher and further back to comfortably display the 14-unit road width + car bounds
      targetFov = 75;
      this.camera.position.set(0, 9.5, 22.0);
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(new THREE.Vector3(0, 1.0, -30));
    } else {
      // Landscape or Desktop
      targetFov = 60;
      this.camera.position.set(0, 4.5, 8.5);
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(new THREE.Vector3(0, 1.5, -30));
    }
    
    this.renderer.setSize(width, height);
  }

  start() {
    this.clock.getDelta(); // Reset clock delta
    this.animate();
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    if (this.isPaused) return;

    const delta = Math.min(this.clock.getDelta(), 0.1); // Cap delta to avoid physics jumps when tab is inactive

    // Update all elements registered in the update loop
    for (const item of this.updatables) {
      item.update(delta);
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);
  }

  addUpdatable(item) {
    this.updatables.push(item);
  }

  removeUpdatable(item) {
    this.updatables = this.updatables.filter(u => u !== item);
  }

  clear() {
    this.updatables = [];
  }
}
