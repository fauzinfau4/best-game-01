// Lantern Keeper — keyboard and mouse input, kept in one place. The game
// reads this each frame: which movement keys are held, where the pointer
// is, whether the player just pressed an action key or clicked. The
// canvas position is translated to arena coordinates by the caller.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    // Currently held movement keys, by code ('KeyW', 'ArrowLeft', ...).
    this.held = new Set();
    // Keys pressed since the last frame was consumed.
    this.pressed = new Set();
    // Pointer in canvas CSS pixels, and whether the button is held.
    this.pointerX = 0;
    this.pointerY = 0;
    this.pointerDown = false;
    this.clicked = false;
    this.clickedX = 0;
    this.clickedY = 0;
    // True while the pointer is over the canvas.
    this.pointerInside = false;
    this._attach();
  }

  _attach() {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.held.add(event.code);
      this.pressed.add(event.code);
      // Keep arrows and space from scrolling the page.
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => {
      this.held.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.held.clear();
      this.pointerDown = false;
    });
    this.canvas.addEventListener('pointermove', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointerX = event.clientX - rect.left;
      this.pointerY = event.clientY - rect.top;
      this.pointerInside = true;
    });
    this.canvas.addEventListener('pointerdown', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointerX = event.clientX - rect.left;
      this.pointerY = event.clientY - rect.top;
      this.pointerDown = true;
      this.clicked = true;
      this.clickedX = this.pointerX;
      this.clickedY = this.pointerY;
      event.preventDefault();
    });
    window.addEventListener('pointerup', () => {
      this.pointerDown = false;
    });
    this.canvas.addEventListener('pointerleave', () => {
      this.pointerInside = false;
    });
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  // Movement vector from WASD or arrow keys, normalized.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.held.has('KeyA') || this.held.has('ArrowLeft')) x -= 1;
    if (this.held.has('KeyD') || this.held.has('ArrowRight')) x += 1;
    if (this.held.has('KeyW') || this.held.has('ArrowUp')) y -= 1;
    if (this.held.has('KeyS') || this.held.has('ArrowDown')) y += 1;
    if (x === 0 && y === 0) return { x: 0, y: 0 };
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }

  // True if any movement key is held right now.
  hasKeyboardMove() {
    return this.moveVector().x !== 0 || this.moveVector().y !== 0;
  }

  // True if the key was pressed since the last consume.
  wasPressed(...codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  // Dash: Space, Shift, or a mouse click.
  dashRequested() {
    return this.wasPressed('Space', 'ShiftLeft', 'ShiftRight') || this.clicked;
  }

  // Clear one-frame events; call at the end of each update.
  consume() {
    this.pressed.clear();
    this.clicked = false;
  }
}
