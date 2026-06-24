import * as THREE from 'three';

export class Controller {
  constructor() {
    // Steering setting: 'buttons' or 'wheel'
    this.steeringStyle = 'buttons'; 

    // Current input states
    this.steerAmount = 0.0; // Continuous value between -1.0 (left) and 1.0 (right)
    this.accelerate = false; // Manual acceleration! Starts false
    this.brake = false;
    this.boost = false;

    // Keyboard trackers
    this.keyLeftPressed = false;
    this.keyRightPressed = false;

    // Steering wheel dragging state
    this.wheelEl = null;
    this.isDraggingWheel = false;
    this.wheelCenter = { x: 0, y: 0 };
    this.maxSteerRad = 2.6; // Maximum turn angle (~150 degrees)

    this.initKeyboardListeners();
    this.initMobileControls();
  }

  initKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      this.handleKeyDown(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.handleKeyUp(e.code);
    });
  }

  handleKeyDown(code) {
    switch (code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.keyLeftPressed = true;
        this.steerAmount = -1.0;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keyRightPressed = true;
        this.steerAmount = 1.0;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.accelerate = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.brake = true;
        break;
      case 'Space':
        this.boost = true;
        break;
    }
  }

  handleKeyUp(code) {
    switch (code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.keyLeftPressed = false;
        this.steerAmount = this.keyRightPressed ? 1.0 : 0.0;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keyRightPressed = false;
        this.steerAmount = this.keyLeftPressed ? -1.0 : 0.0;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.accelerate = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.brake = false;
        break;
      case 'Space':
        this.boost = false;
        break;
    }
  }

  initMobileControls() {
    // 1. Bind Gas, Brake, and Boost Pedals
    this.bindTouchElement('btn-gas', 'gas');
    this.bindTouchElement('btn-brake', 'brake');
    this.bindTouchElement('btn-boost', 'boost');

    // 2. Bind Steering Buttons
    this.bindTouchElement('btn-left', 'left_button');
    this.bindTouchElement('btn-right', 'right_button');

    // 3. Bind Steering Wheels (Gameplay & Settings Preview)
    this.wheelEl = document.getElementById('steering-wheel');
    this.bindWheelElement('steering-wheel', true);
    this.bindWheelElement('settings-steering-wheel', false);
  }

  bindTouchElement(elementId, action) {
    const btn = document.getElementById(elementId);
    if (!btn) return;

    const startAction = (e) => {
      e.preventDefault();
      this.setActionState(action, true);
    };

    const endAction = (e) => {
      e.preventDefault();
      this.setActionState(action, false);
    };

    btn.addEventListener('touchstart', startAction, { passive: false });
    btn.addEventListener('touchend', endAction, { passive: false });
    btn.addEventListener('touchcancel', endAction, { passive: false });

    // Fallback mouse clicks for desktop simulation
    btn.addEventListener('mousedown', (e) => {
      this.setActionState(action, true);
    });
    
    const mouseRelease = () => {
      this.setActionState(action, false);
    };
    btn.addEventListener('mouseup', mouseRelease);
    btn.addEventListener('mouseleave', mouseRelease);
  }

  setActionState(action, value) {
    switch (action) {
      case 'gas':
        this.accelerate = value;
        break;
      case 'brake':
        this.brake = value;
        break;
      case 'boost':
        this.boost = value;
        break;
      case 'left_button':
        if (this.steeringStyle === 'buttons') {
          this.steerAmount = value ? -1.0 : (this.steerAmount === -1.0 ? 0.0 : this.steerAmount);
        }
        break;
      case 'right_button':
        if (this.steeringStyle === 'buttons') {
          this.steerAmount = value ? 1.0 : (this.steerAmount === 1.0 ? 0.0 : this.steerAmount);
        }
        break;
    }
  }

  bindWheelElement(elementId, isGameplayWheel) {
    const wheelEl = document.getElementById(elementId);
    if (!wheelEl) return;

    let isDragging = false;
    let center = { x: 0, y: 0 };
    let activeTouchId = null;

    const handleStart = (e) => {
      if (isGameplayWheel && this.steeringStyle !== 'wheel') return;

      const touch = e.changedTouches ? e.changedTouches[0] : e;
      if (e.changedTouches) {
        activeTouchId = touch.identifier;
      }

      const rect = wheelEl.getBoundingClientRect();
      center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      isDragging = true;
      if (isGameplayWheel) {
        this.isDraggingWheel = true;
      }
      e.preventDefault();
    };

    const handleMove = (e) => {
      if (!isDragging) return;
      if (isGameplayWheel && this.steeringStyle !== 'wheel') return;

      let touch = null;
      if (e.touches && activeTouchId !== null) {
        // Find the specific touch matching our active identifier
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === activeTouchId) {
            touch = e.touches[i];
            break;
          }
        }
      } else {
        touch = e;
      }

      // If the tracked touch is no longer active, skip
      if (!touch) return;

      const dx = touch.clientX - center.x;
      const dy = touch.clientY - center.y;
      const angleRad = Math.atan2(dy, dx);

      // Baseline pointing UP is -Math.PI / 2. Offset it:
      let relativeAngle = angleRad + Math.PI / 2;

      // Wrap angle to range [-Math.PI, Math.PI]
      if (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
      if (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;

      // Clamp maximum rotation
      relativeAngle = Math.max(-this.maxSteerRad, Math.min(this.maxSteerRad, relativeAngle));

      // Rotate SVG/CSS wheel
      const angleDeg = relativeAngle * (180 / Math.PI);
      wheelEl.style.transform = `rotate(${angleDeg}deg)`;

      // Map to steering value if gameplay wheel
      if (isGameplayWheel) {
        this.steerAmount = relativeAngle / this.maxSteerRad;
      }

      if (e.cancelable) e.preventDefault();
    };

    const handleEnd = (e) => {
      if (e.changedTouches && activeTouchId !== null) {
        // Only release if the touch that ended was the one tracking the wheel
        let releasedTrackedTouch = false;
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === activeTouchId) {
            releasedTrackedTouch = true;
            break;
          }
        }
        if (!releasedTrackedTouch) return;
      }

      isDragging = false;
      activeTouchId = null;
      if (isGameplayWheel) {
        this.isDraggingWheel = false;
      } else {
        // Snap settings wheel back to zero visually
        wheelEl.style.transform = 'rotate(0deg)';
      }
    };

    wheelEl.addEventListener('touchstart', handleStart, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd, { passive: false });
    window.addEventListener('touchcancel', handleEnd, { passive: false });

    // Fallback mouse dragging for desktop simulation
    wheelEl.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
  }

  setSteeringStyle(style) {
    this.steeringStyle = style;
    this.reset();
    
    // Toggle DOM elements visibility
    const buttonsContainer = document.getElementById('mobile-steering-buttons');
    const wheelContainer = document.getElementById('mobile-steering-wheel-container');

    if (style === 'wheel') {
      buttonsContainer?.classList.add('hidden');
      wheelContainer?.classList.remove('hidden');
    } else {
      buttonsContainer?.classList.remove('hidden');
      wheelContainer?.classList.add('hidden');
    }
  }

  update(delta) {
    // Snap back the steering wheel smoothly if not dragging
    if (this.steeringStyle === 'wheel' && !this.isDraggingWheel && this.steerAmount !== 0) {
      this.steerAmount = THREE.MathUtils.lerp(this.steerAmount, 0.0, 12 * delta);
      
      // Visual snap back
      if (Math.abs(this.steerAmount) < 0.01) {
        this.steerAmount = 0;
        if (this.wheelEl) this.wheelEl.style.transform = 'rotate(0deg)';
      } else if (this.wheelEl) {
        const angleDeg = this.steerAmount * this.maxSteerRad * (180 / Math.PI);
        this.wheelEl.style.transform = `rotate(${angleDeg}deg)`;
      }
    }
  }

  reset() {
    this.steerAmount = 0.0;
    this.accelerate = false;
    this.brake = false;
    this.boost = false;
    this.keyLeftPressed = false;
    this.keyRightPressed = false;
    this.isDraggingWheel = false;
    if (this.wheelEl) this.wheelEl.style.transform = 'rotate(0deg)';
  }
}
