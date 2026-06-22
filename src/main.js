import './style.css';
import { Engine } from './game/Engine.js';
import { Road } from './game/Road.js';
import { Car } from './game/Car.js';
import { Traffic } from './game/Traffic.js';
import { Collectibles } from './game/Collectibles.js';
import { Controller } from './game/Controller.js';
import { audio } from './game/Audio.js';
import * as THREE from 'three';

class GameManager {
  constructor() {
    this.state = 'MENU'; // MENU, PLAYING, GAMEOVER, SETTINGS
    
    // Core game components
    this.engine = null;
    this.road = null;
    this.player = null;
    this.traffic = null;
    this.collectibles = null;
    this.controller = null;

    // Game configurations
    this.selectedCarType = 'spectre'; // Default car selection
    this.steeringStyleSetting = localStorage.getItem('neon_steering_style') || 'buttons';

    // Game stats
    this.score = 0;
    this.distanceTraveled = 0; 
    this.multiplier = 1.0;
    this.highScore = 0;

    // Power-up States (Magnet)
    this.magnetActive = false;
    this.magnetTimer = 0.0; // Seconds remaining

    // Camerashake state
    this.camShakeIntensity = 0.0;

    this.init();
  }

  init() {
    // 1. Initialize engine
    this.engine = new Engine('game-container');

    // 2. Instantiate game entities (pass default selected car type)
    this.road = new Road(this.engine.scene);
    this.player = new Car(this.engine.scene, this.selectedCarType);
    this.traffic = new Traffic(this.engine.scene);
    this.collectibles = new Collectibles(this.engine.scene);
    this.controller = new Controller();
    this.controller.setSteeringStyle(this.steeringStyleSetting);

    // 3. Load High Score
    const savedHighScore = localStorage.getItem('neon_high_score');
    if (savedHighScore) {
      this.highScore = parseInt(savedHighScore, 10);
      document.getElementById('best-score').textContent = this.formatScore(this.highScore);
    }

    // 4. Bind UI Event Listeners
    this.bindUIEvents();

    // 5. Register in engine updatable loop
    this.engine.addUpdatable(this);

    // 6. Start the rendering loop
    this.engine.start();
  }

  bindUIEvents() {
    // Start Menu Car Selector
    const carCards = document.querySelectorAll('.car-card');
    carCards.forEach(card => {
      card.addEventListener('click', () => {
        audio.playClick();
        
        // Remove active class from all, add to this clicked one
        carCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        this.selectedCarType = card.getAttribute('data-car');
        
        // Dynamically update player's 3D mesh model preview on the starting scene
        this.player.changeType(this.selectedCarType);
      });
    });

    // Start Menu Actions
    document.getElementById('start-btn').addEventListener('click', () => {
      audio.playClick();
      this.startGame();
    });

    document.getElementById('settings-btn').addEventListener('click', () => {
      audio.playClick();
      this.showSettings();
    });

    // Settings Modal Actions
    document.getElementById('mute-toggle').addEventListener('click', () => {
      const isMuted = audio.toggleMute();
      document.getElementById('mute-toggle').textContent = isMuted ? 'SOUND: OFF' : 'SOUND: ON';
      document.getElementById('mute-toggle').classList.toggle('btn-secondary', isMuted);
      audio.playClick();
    });

    // Steering Options Toggle
    const steeringToggleBtn = document.getElementById('steering-toggle');
    steeringToggleBtn.addEventListener('click', () => {
      audio.playClick();
      if (this.steeringStyleSetting === 'buttons') {
        this.steeringStyleSetting = 'wheel';
        steeringToggleBtn.textContent = 'STYLE: WHEEL';
      } else {
        this.steeringStyleSetting = 'buttons';
        steeringToggleBtn.textContent = 'STYLE: BUTTONS';
      }
      localStorage.setItem('neon_steering_style', this.steeringStyleSetting);
      
      // Update in controller right away
      this.controller.setSteeringStyle(this.steeringStyleSetting);
      this.updateSettingsPreviews();
    });

    document.getElementById('settings-back-btn').addEventListener('click', () => {
      audio.playClick();
      this.showMenu();
    });

    document.getElementById('hud-pause-btn').addEventListener('click', () => {
      audio.playClick();
      this.pauseGame();
    });

    document.getElementById('settings-resume-btn').addEventListener('click', () => {
      audio.playClick();
      this.resumeGame();
    });

    // Game Over Actions
    document.getElementById('restart-btn').addEventListener('click', () => {
      audio.playClick();
      this.startGame();
    });

    document.getElementById('game-over-menu-btn').addEventListener('click', () => {
      audio.playClick();
      this.showMenu();
    });
  }

  startGame() {
    audio.resume();

    // Re-verify and apply correct type on engine start
    this.player.changeType(this.selectedCarType);
    this.player.reset();
    
    // Clear and reset AI states
    this.traffic.clear();
    this.collectibles.clear();
    
    // Set controller steering style
    this.controller.setSteeringStyle(this.steeringStyleSetting);
    this.controller.reset();

    // Reset stats
    this.score = 0;
    this.distanceTraveled = 0;
    this.multiplier = 1.0;
    this.camShakeIntensity = 0;

    // Reset Magnet
    this.magnetActive = false;
    this.magnetTimer = 0;
    document.getElementById('magnet-badge').classList.add('hidden');

    // UI Updates
    document.getElementById('hud-score').textContent = this.formatScore(0);
    document.getElementById('hud-multiplier').textContent = 'x1.0';
    document.getElementById('fuel-fill').style.width = '100%';
    document.getElementById('boost-fill').style.width = '100%';
    document.getElementById('fuel-fill').classList.remove('fuel-critical');

    // Transitions
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('game-over-overlay').classList.add('hidden');
    document.getElementById('settings-overlay').classList.add('hidden');
    document.getElementById('hud-overlay').classList.remove('hidden');

    this.state = 'PLAYING';
    audio.startMusic();
  }

  showSettings() {
    audio.resume();
    
    // Synchronize settings controls with current states
    const isMuted = audio.isMuted;
    const muteBtn = document.getElementById('mute-toggle');
    if (muteBtn) {
      muteBtn.textContent = isMuted ? 'SOUND: OFF' : 'SOUND: ON';
      muteBtn.classList.toggle('btn-secondary', isMuted);
    }

    const steeringBtn = document.getElementById('steering-toggle');
    if (steeringBtn) {
      steeringBtn.textContent = this.steeringStyleSetting === 'wheel' ? 'STYLE: WHEEL' : 'STYLE: BUTTONS';
    }

    this.updateSettingsPreviews();

    // Toggle Resume button visibility and update Back button text depending on pause state
    const resumeBtn = document.getElementById('settings-resume-btn');
    const backBtn = document.getElementById('settings-back-btn');
    if (this.state === 'PAUSED') {
      resumeBtn?.classList.remove('hidden');
      if (backBtn) backBtn.textContent = 'QUIT TO MENU';
    } else {
      resumeBtn?.classList.add('hidden');
      if (backBtn) backBtn.textContent = 'BACK TO MENU';
    }

    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('settings-overlay').classList.remove('hidden');
    
    if (this.state !== 'PAUSED') {
      this.state = 'SETTINGS';
    }
  }

  updateSettingsPreviews() {
    const wheelPreview = document.getElementById('settings-wheel-preview');
    const buttonsPreview = document.getElementById('settings-buttons-preview');
    if (this.steeringStyleSetting === 'wheel') {
      wheelPreview?.classList.remove('hidden');
      buttonsPreview?.classList.add('hidden');
    } else {
      wheelPreview?.classList.add('hidden');
      buttonsPreview?.classList.remove('hidden');
    }
  }

  showMenu() {
    // Unpause in case we were paused
    this.engine.isPaused = false;
    audio.stopMusic();

    document.getElementById('settings-overlay').classList.add('hidden');
    document.getElementById('game-over-overlay').classList.add('hidden');
    document.getElementById('hud-overlay').classList.add('hidden');
    document.getElementById('menu-overlay').classList.remove('hidden');
    
    // Reset preview player type
    this.player.changeType(this.selectedCarType);
    this.player.reset();
    
    this.state = 'MENU';
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.engine.isPaused = true;
    audio.stopMusic();
    this.showSettings();
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.engine.isPaused = false;
    audio.startMusic();
    
    document.getElementById('settings-overlay').classList.add('hidden');
    document.getElementById('hud-overlay').classList.remove('hidden');
  }

  endGame(reason) {
    this.state = 'GAMEOVER';
    audio.stopMusic();
    audio.playCrash();

    // Save and check high score
    let isNewHigh = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('neon_high_score', this.highScore);
      document.getElementById('best-score').textContent = this.formatScore(this.highScore);
      isNewHigh = true;
    }

    // Set UI values
    document.getElementById('death-reason').textContent = reason === 'fuel' ? 'BATTERY DEPLEATED!' : 'CRASHED!';
    if (isNewHigh) {
      document.getElementById('death-reason').innerHTML += `<br><span class="glow-yellow-text" style="font-size:1.1rem; letter-spacing:1px;">★ GRID CHAMPION RECORD ★</span>`;
    }
    document.getElementById('final-score').textContent = this.formatScore(this.score);
    document.getElementById('final-distance').textContent = `${this.distanceTraveled.toFixed(2)} KM`;

    // Swap overlays
    document.getElementById('hud-overlay').classList.add('hidden');
    document.getElementById('game-over-overlay').classList.remove('hidden');
  }

  update(delta) {
    if (this.state !== 'PLAYING') {
      // Slow grid scroll in background for menu ambient depth
      this.road.update(delta, 8);
      return;
    }

    // 1. Update controller (smooth steering wheel snaps)
    this.controller.update(delta);

    // 2. Update Player Car physics
    this.player.update(delta, this.controller);

    if (this.player.isDead) {
      const reason = this.player.health <= 0 ? 'fuel' : 'crash';
      this.endGame(reason);
      return;
    }

    const currentSpeed = this.player.speed;
    const speedRatio = currentSpeed / this.player.boostMaxSpeed;
    audio.updateEnginePitch(speedRatio);

    // 3. Update Environment scrolling
    this.road.update(delta, currentSpeed);

    // 4. Update AI Traffic
    this.traffic.update(delta, currentSpeed, this.player.x);

    // 5. Update Magnet Timers
    if (this.magnetActive) {
      this.magnetTimer -= delta;
      if (this.magnetTimer <= 0) {
        this.magnetActive = false;
        document.getElementById('magnet-badge').classList.add('hidden');
      }
    }

    // 6. Update Collectibles (passes MagnetActive status)
    this.collectibles.update(delta, currentSpeed, this.player.x, this.magnetActive);

    // 7. Check Collisions
    const crashInfo = this.traffic.checkCollision(this.player);
    if (crashInfo.collided) {
      this.player.damage(crashInfo.damage);
      this.camShakeIntensity = 0.55; 
      audio.playCrash();
    }

    // 8. Check Item Pickups
    const pickupType = this.collectibles.checkPickup(this.player);
    if (pickupType) {
      if (pickupType === 'coin_gold') {
        audio.playCoin();
        this.score += 100 * this.multiplier;
      } else if (pickupType === 'coin_cyan') {
        audio.playCoin();
        this.score += 300 * this.multiplier;
      } else if (pickupType === 'battery') {
        audio.playCoin();
        this.player.heal(25);
      } else if (pickupType === 'magnet') {
        audio.playBoost(); // Whoosh sounds for pickups
        this.magnetActive = true;
        this.magnetTimer = 10.0; // 10 seconds of coin pulling
        document.getElementById('magnet-badge').classList.remove('hidden');
      }
    }

    // 9. Update Distance & Continuous Score
    if (currentSpeed > 0) {
      const distanceDelta = (currentSpeed * delta) * 0.0005;
      this.distanceTraveled += distanceDelta;
      this.score += Math.floor(currentSpeed * delta * 4 * this.multiplier);
    }

    // 10. Multiplier Scaling based on speed
    if (this.player.isBoosting) {
      this.multiplier = 2.5;
    } else if (currentSpeed > 55) {
      this.multiplier = 1.5;
    } else {
      this.multiplier = 1.0;
    }

    // 11. Render UI updates
    this.updateHUD();

    // 12. Cameras Shakes on hits
    this.applyCameraShake(delta);
  }

  updateHUD() {
    document.getElementById('hud-score').textContent = this.formatScore(this.score);
    document.getElementById('hud-multiplier').textContent = `x${this.multiplier.toFixed(1)}`;
    
    // Speedometer display (MPH = Speed * 2)
    const mph = Math.floor(this.player.speed * 2.0);
    document.getElementById('hud-speed').textContent = mph;

    // Fuel indicator
    const fuelFill = document.getElementById('fuel-fill');
    fuelFill.style.width = `${this.player.health}%`;
    if (this.player.health < 30) {
      fuelFill.classList.add('fuel-critical');
    } else {
      fuelFill.classList.remove('fuel-critical');
    }

    // Boost indicator
    document.getElementById('boost-fill').style.width = `${this.player.boostCharge}%`;
  }

  getOriginalCamPos() {
    const aspect = this.engine.container.clientWidth / this.engine.container.clientHeight;
    if (aspect < 1.0) {
      return new THREE.Vector3(0, 9.5, 22.0);
    } else {
      return new THREE.Vector3(0, 4.5, 8.5);
    }
  }

  applyCameraShake(delta) {
    const originalPos = this.getOriginalCamPos();
    if (this.camShakeIntensity > 0.01) {
      const rx = (Math.random() - 0.5) * this.camShakeIntensity;
      const ry = (Math.random() - 0.5) * this.camShakeIntensity;
      
      this.engine.camera.position.x = originalPos.x + rx;
      this.engine.camera.position.y = originalPos.y + ry;
      this.engine.camera.position.z = originalPos.z;

      this.camShakeIntensity = THREE.MathUtils.lerp(this.camShakeIntensity, 0, 7 * delta);
    } else {
      this.engine.camera.position.x = originalPos.x;
      this.engine.camera.position.y = originalPos.y;
      this.engine.camera.position.z = originalPos.z;
    }
  }

  formatScore(val) {
    return String(Math.floor(val)).padStart(6, '0');
  }
}

// Start Game Manager
window.addEventListener('DOMContentLoaded', () => {
  new GameManager();
});
