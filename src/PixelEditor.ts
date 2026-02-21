const PALETTE_COLORS = [
  '#FF2222', // red
  '#FF8800', // orange
  '#FFEE00', // yellow
  '#22CC44', // green
  '#00CCFF', // cyan
  '#2244FF', // blue
  '#8800FF', // purple
  '#FF44BB', // pink
  '#FFFFFF', // white
  '#111111', // black
];

const DEFAULT_COLS = 20;
const DEFAULT_ROWS = 50;
const CELL_SIZE = 16;

export class PixelEditor {
  private grid: string[][] = [];
  private cols: number = DEFAULT_COLS;
  private rows: number = DEFAULT_ROWS;
  private readonly cellSize: number = CELL_SIZE;
  private currentColor: string = PALETTE_COLORS[9];
  private container!: HTMLElement;

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private canvasContainer!: HTMLDivElement;
  private paletteEl!: HTMLDivElement;

  private isPainting = false;
  private panStartX = 0;
  private panStartY = 0;
  private scrollStartX = 0;
  private scrollStartY = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.initGrid(DEFAULT_COLS, DEFAULT_ROWS);
    this.buildUI();
  }

  private initGrid(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => '#FFFFFF')
    );
  }

  private buildUI() {
    this.container.innerHTML = '';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';

    const title = document.createElement('h1');
    title.textContent = '🎨 Pixmix';
    toolbar.appendChild(title);

    const newBtn = document.createElement('button');
    newBtn.textContent = '✦ New';
    newBtn.title = 'Create a new image';
    newBtn.addEventListener('click', () => this.showNewImageDialog());
    toolbar.appendChild(newBtn);

    const uploadBtn = document.createElement('button');
    uploadBtn.textContent = '⬆ Upload';
    uploadBtn.title = 'Upload an image';
    uploadBtn.addEventListener('click', () => this.uploadImage());
    toolbar.appendChild(uploadBtn);

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇ Save';
    downloadBtn.title = 'Download the image';
    downloadBtn.addEventListener('click', () => this.downloadImage());
    toolbar.appendChild(downloadBtn);

    this.container.appendChild(toolbar);

    // Canvas container (scrollable for large grids)
    this.canvasContainer = document.createElement('div');
    this.canvasContainer.className = 'canvas-container';

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.cols * this.cellSize;
    this.canvas.height = this.rows * this.cellSize;
    this.ctx = this.canvas.getContext('2d')!;
    this.drawGrid();
    this.attachEvents();

    this.canvasContainer.appendChild(this.canvas);
    this.container.appendChild(this.canvasContainer);

    // Colour palette
    this.paletteEl = document.createElement('div');
    this.paletteEl.className = 'palette';
    this.buildPalette();
    this.container.appendChild(this.paletteEl);
  }

  private buildPalette() {
    this.paletteEl.innerHTML = '';
    PALETTE_COLORS.forEach((color) => {
      const swatch = document.createElement('div');
      swatch.className = 'palette-color' + (color === this.currentColor ? ' selected' : '');
      swatch.style.backgroundColor = color;
      swatch.setAttribute('aria-label', color);
      swatch.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.selectColor(color);
      });
      this.paletteEl.appendChild(swatch);
    });
  }

  private selectColor(color: string) {
    this.currentColor = color;
    this.buildPalette();
  }

  private drawGrid() {
    const { ctx, cols, rows, cellSize, grid } = this;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        ctx.fillStyle = grid[row][col];
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
    this.drawGridLines();
  }

  private drawGridLines() {
    const { ctx, cols, rows, cellSize } = this;
    ctx.strokeStyle = 'rgba(180,180,180,0.25)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let col = 0; col <= cols; col++) {
      ctx.moveTo(col * cellSize, 0);
      ctx.lineTo(col * cellSize, rows * cellSize);
    }
    for (let row = 0; row <= rows; row++) {
      ctx.moveTo(0, row * cellSize);
      ctx.lineTo(cols * cellSize, row * cellSize);
    }
    ctx.stroke();
  }

  private drawCell(col: number, row: number) {
    const { ctx, cellSize, grid } = this;
    ctx.fillStyle = grid[row][col];
    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
    // Redraw grid lines over the cell
    ctx.strokeStyle = 'rgba(180,180,180,0.25)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(col * cellSize + 0.25, row * cellSize + 0.25, cellSize - 0.5, cellSize - 0.5);
  }

  private getGridPos(clientX: number, clientY: number): { col: number; row: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      return { col, row };
    }
    return null;
  }

  private paintAt(clientX: number, clientY: number) {
    const pos = this.getGridPos(clientX, clientY);
    if (!pos) return;
    if (this.grid[pos.row][pos.col] === this.currentColor) return;
    this.grid[pos.row][pos.col] = this.currentColor;
    this.drawCell(pos.col, pos.row);
  }

  private attachEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => {
      this.isPainting = true;
      this.paintAt(e.clientX, e.clientY);
    });
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isPainting) this.paintAt(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', () => {
      this.isPainting = false;
    });

    // Touch events — single touch paints, two-finger pans
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        this.isPainting = true;
        this.paintAt(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length >= 2) {
        this.isPainting = false;
        this.panStartX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        this.panStartY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        this.scrollStartX = this.canvasContainer.scrollLeft;
        this.scrollStartY = this.canvasContainer.scrollTop;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && this.isPainting) {
        this.paintAt(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length >= 2) {
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        this.canvasContainer.scrollLeft = this.scrollStartX - (midX - this.panStartX);
        this.canvasContainer.scrollTop = this.scrollStartY - (midY - this.panStartY);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        this.isPainting = false;
      }
    }, { passive: false });
  }

  private downloadImage() {
    // Export at 1 pixel per grid cell (no grid lines)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.cols;
    tempCanvas.height = this.rows;
    const tempCtx = tempCanvas.getContext('2d')!;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        tempCtx.fillStyle = this.grid[row][col];
        tempCtx.fillRect(col, row, 1, 1);
      }
    }
    const link = document.createElement('a');
    link.download = 'pixmix.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }

  private uploadImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCtx.drawImage(img, 0, 0);
          const imageData = tempCtx.getImageData(0, 0, img.width, img.height);

          this.initGrid(img.width, img.height);
          for (let row = 0; row < img.height; row++) {
            for (let col = 0; col < img.width; col++) {
              const idx = (row * img.width + col) * 4;
              const r = imageData.data[idx];
              const g = imageData.data[idx + 1];
              const b = imageData.data[idx + 2];
              const a = imageData.data[idx + 3];
              this.grid[row][col] = a === 0 ? '#FFFFFF' : `rgb(${r},${g},${b})`;
            }
          }

          this.canvas.width = this.cols * this.cellSize;
          this.canvas.height = this.rows * this.cellSize;
          this.drawGrid();
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
    input.click();
  }

  private showNewImageDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const h2 = document.createElement('h2');
    h2.textContent = 'New Image';
    modal.appendChild(h2);

    const colLabel = document.createElement('label');
    colLabel.textContent = 'Width (columns):';
    colLabel.setAttribute('for', 'new-cols');
    modal.appendChild(colLabel);

    const colInput = document.createElement('input');
    colInput.type = 'number';
    colInput.id = 'new-cols';
    colInput.min = '1';
    colInput.max = '500';
    colInput.value = String(this.cols);
    modal.appendChild(colInput);

    const rowLabel = document.createElement('label');
    rowLabel.textContent = 'Height (rows):';
    rowLabel.setAttribute('for', 'new-rows');
    modal.appendChild(rowLabel);

    const rowInput = document.createElement('input');
    rowInput.type = 'number';
    rowInput.id = 'new-rows';
    rowInput.min = '1';
    rowInput.max = '500';
    rowInput.value = String(this.rows);
    modal.appendChild(rowInput);

    const buttons = document.createElement('div');
    buttons.className = 'modal-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => overlay.remove());
    buttons.appendChild(cancelBtn);

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'primary';
    confirmBtn.textContent = 'Create';
    confirmBtn.addEventListener('click', () => {
      const cols = Math.max(1, Math.min(500, parseInt(colInput.value) || DEFAULT_COLS));
      const rows = Math.max(1, Math.min(500, parseInt(rowInput.value) || DEFAULT_ROWS));
      this.initGrid(cols, rows);
      this.canvas.width = cols * this.cellSize;
      this.canvas.height = rows * this.cellSize;
      this.drawGrid();
      overlay.remove();
    });
    buttons.appendChild(confirmBtn);

    modal.appendChild(buttons);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    colInput.focus();
  }
}
