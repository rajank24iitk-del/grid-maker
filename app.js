/**
 * Mandala Grid Generator — v4
 * Fixed instant updates, MM scale accuracy, and manual control logic.
 */

(function () {
    'use strict';

    function init() {
        const canvas = document.getElementById('mandalaCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const inputs = {
            diameter: document.getElementById('diameter'),
            radialLines: document.getElementById('radialLines'),
            circularGrids: document.getElementById('circularGrids'),
            firstRingDist: document.getElementById('firstRingDist'),
            ringSpacing: document.getElementById('ringSpacing'),
            autoSpacing: document.getElementById('autoSpacing'),
            lineThickness: document.getElementById('lineThickness'),
            lineColor: document.getElementById('lineColor'),
            bgColor: document.getElementById('bgColor'),
            exportDpi: document.getElementById('exportDpi'),
            showCenter: document.getElementById('showCenter'),
            showOuterRing: document.getElementById('showOuterRing'),
            showNumbers: document.getElementById('showNumbers'),
            numberSize: document.getElementById('numberSize'),
            showMmScale: document.getElementById('showMmScale'),
        };

        const canvasContainer = document.getElementById('canvasLayers');
        const layersList = document.getElementById('layersList');
        const btnAddLayer = document.getElementById('btnAddLayer');

        const paintInputs = {
            brushSize: document.getElementById('brushSize'),
            brushSizeVal: document.getElementById('brushSizeVal'),
            paintColor: document.getElementById('paintColor'),
            symmetryCount: document.getElementById('symmetryCount'),
            mirrorGrid: document.getElementById('mirrorGrid'),
            paletteContainer: document.getElementById('paletteContainer'),
            btnClearPaint: document.getElementById('btnClearPaint')
        };

        const btnExportJpeg = document.getElementById('btnExportJpeg');
        const btnExportPng = document.getElementById('btnExportPng');
        const btnReset = document.getElementById('btnReset');
        const infoExportSize = document.getElementById('infoExportSize');
        const infoRingCount = document.getElementById('infoRingCount');
        const toast = document.getElementById('toast');

        const insertRingMM = document.getElementById('insertRingMM');
        const btnInsertRingMM = document.getElementById('btnInsertRingMM');
        const insertedRingsList = document.getElementById('insertedRingsList');

        const insertRadialAfter = document.getElementById('insertRadialAfter');
        const insertRadialFromRing = document.getElementById('insertRadialFromRing');
        const btnInsertRadial = document.getElementById('btnInsertRadial');
        const btnInsertBetweenAll = document.getElementById('btnInsertBetweenAll');
        const insertedRadialsList = document.getElementById('insertedRadialsList');

        // Draw Mode Elements
        const drawModeOverlay = document.getElementById('drawModeOverlay');
        const btnEnterDrawMode = document.getElementById('btnEnterDrawMode');
        const btnExitDrawMode = document.getElementById('btnExitDrawMode');
        const drawCanvasContainer = document.getElementById('drawCanvasContainer');
        const normalCanvasContainer = document.getElementById('scrollWrapper');
        const colorDot = document.getElementById('colorDot');
        const colorPickerFlyout = document.getElementById('colorPickerFlyout');
        const drawWithHand = document.getElementById('drawWithHand');
        const btnUndoDraw = document.getElementById('btnUndoDraw');
        const btnRedoDraw = document.getElementById('btnRedoDraw');
        const btnCanvasDraw = document.getElementById('btnCanvasDraw');
        const drawBrushSize = document.getElementById('drawBrushSize');
        const drawBrushSizeVal = document.getElementById('drawBrushSizeVal');
        const shadeLightness = document.getElementById('shadeLightness');
        const shadeSaturation = document.getElementById('shadeSaturation');
        const paletteFlyoutGrid = document.getElementById('paletteFlyoutGrid');
        const btnQuickEraser = document.getElementById('btnQuickEraser');

        let state = {
            baseRings: [],
            baseRadials: [],
            extraRings: [],
            extraRadials: [],
            allRings: [],
            allRadials: [],
            isDrawing: false,
            lastX: 0,
            lastY: 0,
            layers: [],
            activeLayerIdx: 0,
            undoStack: [],
            redoStack: [],
            maxStack: 20,
            // Zoom/Pan State
            zoom: 1,
            panX: 0,
            panY: 0,
            lastTouchDist: 0,
            lastTouchX: 0,
            lastTouchY: 0,
            // Grid Visibility
            gridVisible: true,
            activeColor: '#7c5cfc',
            lastBaseColor: '#7c5cfc',
            isEraser: false
        };





        const DEFAULTS = {
            diameter: 200, radialLines: 12, circularGrids: 6,
            firstRingDist: 15, ringSpacing: 15, autoSpacing: false,
            lineThickness: 1, lineColor: '#000000', bgColor: '#ffffff', exportDpi: 300,
            showCenter: true, showOuterRing: true, showNumbers: true, numberSize: 3,
            showMmScale: true
        };

        const ZOOM_SCALE = 4; // 4x oversampling for crisp zooming on high-res displays

        function mmToPixels(mm, dpi) { return (mm / 25.4) * dpi; }

        function showToast(message, type = 'success') {
            const msg = toast.querySelector('.toast-msg');
            if (msg) msg.textContent = message;
            toast.className = `toast show ${type}`;
            clearTimeout(toast.timeout);
            toast.timeout = setTimeout(() => toast.classList.remove('show'), 3000);
        }

        function generateGrid() {
            const diameter = parseFloat(inputs.diameter.value) || DEFAULTS.diameter;
            const count = parseInt(inputs.circularGrids.value) || DEFAULTS.circularGrids;
            const first = parseFloat(inputs.firstRingDist.value) || DEFAULTS.firstRingDist;
            const auto = inputs.autoSpacing.checked;
            const radius = diameter / 2;

            let spacing = parseFloat(inputs.ringSpacing.value) || DEFAULTS.ringSpacing;
            if (auto && count > 1) {
                spacing = (radius - first) / (count - 1);
                inputs.ringSpacing.value = spacing.toFixed(2);
                inputs.ringSpacing.disabled = true;
            } else {
                inputs.ringSpacing.disabled = false;
            }

            state.baseRings = [];
            for (let i = 0; i < count; i++) {
                const r = first + i * spacing;
                if (r > radius + 0.1) break;
                state.baseRings.push({ radiusMM: r, isBase: true });
            }

            const radCount = parseInt(inputs.radialLines.value) || DEFAULTS.radialLines;
            state.baseRadials = [];
            for (let i = 0; i < radCount; i++) {
                state.baseRadials.push({ angleDeg: (360 * i) / radCount, startRingIdx: -1, isBase: true });
            }

            updateAll();
        }

        function updateAll() {
            const radius = (parseFloat(inputs.diameter.value) || 200) / 2;

            // Sync Rings
            let rings = [...state.baseRings, ...state.extraRings].filter(r => r.radiusMM <= radius + 0.1);
            rings.sort((a, b) => a.radiusMM - b.radiusMM);
            rings.forEach((r, i) => r.id = i + 1);
            state.allRings = rings;

            // Sync Radials
            let rads = [...state.baseRadials, ...state.extraRadials];
            rads.sort((a, b) => a.angleDeg - b.angleDeg);
            rads.forEach((r, i) => r.id = i + 1);
            state.allRadials = rads;

            draw();
            updateControls();
        }

        function draw() {
            const d = parseFloat(inputs.diameter.value) || 200;
            const numSz = parseFloat(inputs.numberSize.value) || 3;
            const dpiCap = 96;
            const radius = d / 2;

            const paddingMM = Math.max(15, numSz * 5);
            const totalMM = d + (paddingMM * 2);
            // Ensure totalPx is a consistent integer to avoid sub-pixel misalignment
            const totalPx = Math.round(mmToPixels(totalMM, dpiCap));

            canvas.width = canvas.height = totalPx * ZOOM_SCALE;
            canvas.style.width = '100%';
            canvas.style.height = '100%';

            ctx.scale(ZOOM_SCALE, ZOOM_SCALE);

            // Use the actual canvas width for center to match painting logic
            const cx = totalPx / 2, cy = totalPx / 2;

            const layersListEl = document.querySelector('.canvas-layers');
            if (layersListEl) layersListEl.style.backgroundColor = inputs.bgColor.value;

            ctx.fillStyle = inputs.bgColor.value;
            ctx.fillRect(0, 0, totalPx, totalPx);

            if (!state.gridVisible) {
                infoRingCount.textContent = `Grid Hidden`;
                return;
            }

            const weight = parseFloat(inputs.lineThickness.value) || 1;

            ctx.lineWidth = Math.max(0.5, weight);
            ctx.lineCap = 'round';
            ctx.strokeStyle = inputs.lineColor.value;

            if (inputs.showOuterRing.checked) {
                ctx.beginPath(); ctx.arc(cx, cy, mmToPixels(radius, dpiCap), 0, Math.PI * 2); ctx.stroke();
            }

            state.allRings.forEach(r => {
                ctx.beginPath(); ctx.arc(cx, cy, mmToPixels(r.radiusMM, dpiCap), 0, Math.PI * 2); ctx.stroke();
            });

            state.allRadials.forEach(r => {
                const ang = r.angleDeg * Math.PI / 180;
                let startR = 0;
                if (r.startRingIdx >= 0 && r.startRingIdx < state.allRings.length) {
                    startR = mmToPixels(state.allRings[r.startRingIdx].radiusMM, dpiCap);
                }
                const endR = mmToPixels(radius, dpiCap);
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(ang) * startR, cy + Math.sin(ang) * startR);
                ctx.lineTo(cx + Math.cos(ang) * endR, cy + Math.sin(ang) * endR);
                ctx.stroke();
            });

            if (inputs.showCenter.checked) {
                ctx.fillStyle = inputs.lineColor.value;
                ctx.beginPath(); ctx.arc(cx, cy, mmToPixels(1, dpiCap), 0, Math.PI * 2); ctx.fill();
            }

            if (inputs.showNumbers.checked && state.allRings.length && state.allRadials.length) {
                const fSize = mmToPixels(numSz, dpiCap);
                ctx.font = `bold ${fSize}px Inter, sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

                const angleOffset = state.allRadials[0].angleDeg * Math.PI / 180;
                state.allRings.forEach(r => {
                    const rPx = mmToPixels(r.radiusMM, dpiCap);
                    const drawAng = angleOffset;
                    const lx = cx + Math.cos(drawAng) * rPx + Math.cos(drawAng + Math.PI / 2) * fSize * 0.9;
                    const ly = cy + Math.sin(drawAng) * rPx + Math.sin(drawAng + Math.PI / 2) * fSize * 0.9;
                    ctx.fillStyle = inputs.bgColor.value;
                    ctx.fillRect(lx - fSize / 2, ly - fSize / 2, fSize, fSize);
                    ctx.fillStyle = inputs.lineColor.value;
                    ctx.fillText(r.id, lx, ly);
                });

                const labelRPx = mmToPixels(radius, dpiCap) + fSize * 1.5;
                state.allRadials.forEach(r => {
                    const ang = r.angleDeg * Math.PI / 180;
                    ctx.fillStyle = inputs.lineColor.value;
                    ctx.fillText(r.id, cx + Math.cos(ang) * labelRPx, cy + Math.sin(ang) * labelRPx);
                });
            }

            if (inputs.showMmScale.checked && state.allRadials.length) {
                const ang = (state.allRadials[0].angleDeg + 180) % 360 * Math.PI / 180;
                const perp = ang + Math.PI / 2;
                ctx.strokeStyle = inputs.lineColor.value;
                ctx.fillStyle = inputs.lineColor.value;
                ctx.font = `${mmToPixels(numSz * 0.6, dpiCap)}px Inter, sans-serif`;
                for (let i = 0; i <= radius; i++) {
                    const pxOffset = mmToPixels(i, dpiCap);
                    const len = (i % 10 === 0) ? 6 : (i % 5 === 0 ? 4 : 2);
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(ang) * pxOffset, cy + Math.sin(ang) * pxOffset);
                    ctx.lineTo(cx + Math.cos(ang) * pxOffset + Math.cos(perp) * len, cy + Math.sin(ang) * pxOffset + Math.sin(perp) * len);
                    ctx.stroke();
                    if (i % 10 === 0 && i > 0) ctx.fillText(i, cx + Math.cos(ang) * pxOffset + Math.cos(perp) * 12, cy + Math.sin(ang) * pxOffset + Math.sin(perp) * 12);
                }
            }

            infoRingCount.textContent = `${state.allRings.length} rings, ${state.allRadials.length} radials`;
            const exDpi = parseInt(inputs.exportDpi.value);
            const exSize = Math.ceil(mmToPixels(totalMM, exDpi));
            infoExportSize.textContent = `${exSize} × ${exSize} px`;
        }

        function updateControls() {
            insertRadialAfter.innerHTML = '';
            state.allRadials.forEach(r => {
                const o = document.createElement('option'); o.value = r.id;
                o.textContent = `After ${r.id} (${r.angleDeg.toFixed(1)}°)`;
                insertRadialAfter.appendChild(o);
            });
            insertRadialFromRing.innerHTML = '<option value="-1">From Center</option>';
            state.allRings.forEach(r => {
                const o = document.createElement('option'); o.value = r.id - 1;
                o.textContent = `Ring ${r.id} (${r.radiusMM.toFixed(1)}mm)`;
                insertRadialFromRing.appendChild(o);
            });

            insertedRingsList.innerHTML = state.extraRings.length ? '' : '<div class="empty-msg">No added rings</div>';
            state.extraRings.forEach((r, i) => {
                const d = document.createElement('div'); d.className = 'inserted-item';
                d.innerHTML = `<span>Radius: ${r.radiusMM}mm</span> <button onclick="window._del('ring', ${i})">✕</button>`;
                insertedRingsList.appendChild(d);
            });
            insertedRadialsList.innerHTML = state.extraRadials.length ? '' : '<div class="empty-msg">No added radials</div>';
            state.extraRadials.forEach((r, i) => {
                const d = document.createElement('div'); d.className = 'inserted-item';
                d.innerHTML = `<span>Angle: ${r.angleDeg.toFixed(1)}°</span> <button onclick="window._del('rad', ${i})">✕</button>`;
                insertedRadialsList.appendChild(d);
            });
        }

        window._del = (type, i) => {
            if (type === 'ring') state.extraRings.splice(i, 1);
            else state.extraRadials.splice(i, 1);
            updateAll();
        };

        btnInsertRingMM.onclick = () => {
            const val = parseFloat(insertRingMM.value);
            if (val > 0 && val <= (inputs.diameter.value / 2)) {
                state.extraRings.push({ radiusMM: val, isBase: false });
                updateAll(); showToast(`Ring at ${val}mm added`);
            }
        };

        btnInsertBetweenAll.onclick = () => {
            const start = parseInt(insertRadialFromRing.value);
            const base = [...state.allRadials];
            base.forEach((r, i) => {
                const nxt = (i + 1 < base.length) ? base[i + 1].angleDeg : base[0].angleDeg + 360;
                let ang = (r.angleDeg + nxt) / 2; if (ang >= 360) ang -= 360;
                state.extraRadials.push({ angleDeg: ang, startRingIdx: start, isBase: false });
            });
            updateAll();
        };

        btnInsertRadial.onclick = () => {
            const afterId = parseInt(insertRadialAfter.value);
            const idx = state.allRadials.findIndex(r => r.id === afterId);
            if (idx < 0) return;
            const cur = state.allRadials[idx].angleDeg;
            const nxt = (idx + 1 < state.allRadials.length) ? state.allRadials[idx + 1].angleDeg : state.allRadials[0].angleDeg + 360;
            let ang = (cur + nxt) / 2; if (ang >= 360) ang -= 360;
            state.extraRadials.push({ angleDeg: ang, startRingIdx: parseInt(insertRadialFromRing.value), isBase: false });
            updateAll();
        };

        // Layer Management
        function addLayer(name = `Layer ${state.layers.length + 1}`, dataUrl = null) {
            const canvas = document.createElement('canvas');
            const d = parseFloat(inputs.diameter.value) || 200;
            const numSz = parseFloat(inputs.numberSize.value) || 3;
            const totalMM = d + (Math.max(15, numSz * 5) * 2);
            // Integer dimensions are critical for matching drawing centers
            const px = Math.round(mmToPixels(totalMM, 96));

            canvas.width = canvas.height = px * ZOOM_SCALE;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.zIndex = state.layers.length + 2;
            canvas.style.pointerEvents = 'none'; // Only the active layer handles events? No, we'll use a controller.
            canvas.style.touchAction = 'none';

            canvasContainer.appendChild(canvas);

            const layer = {
                id: Date.now() + Math.random(),
                name: name,
                canvas: canvas,
                ctx: canvas.getContext('2d'),
                visible: true
            };

            if (dataUrl) {
                const img = new Image();
                img.onload = () => layer.ctx.drawImage(img, 0, 0);
                img.src = dataUrl;
            }

            state.layers.push(layer);
            setActiveLayer(state.layers.length - 1);
            updateLayersUI();
        }

        function setActiveLayer(idx) {
            state.activeLayerIdx = idx;
            updateLayersUI();
        }

        function updateLayersUI() {
            layersList.innerHTML = '';

            // Add Base Grid Toggle
            const gridItem = document.createElement('div');
            gridItem.className = 'layer-item grid-layer';
            gridItem.innerHTML = `
                <span class="layer-visibility" onclick="event.stopPropagation(); window._toggleGridVis()">
                    ${state.gridVisible ? '👁' : '◌'}
                </span>
                <span class="layer-name">Base Grid</span>
            `;
            gridItem.onclick = () => { /* No-op, just visual */ };
            layersList.appendChild(gridItem);

            [...state.layers].reverse().forEach((layer, revIdx) => {
                const idx = state.layers.length - 1 - revIdx;

                const item = document.createElement('div');
                item.className = `layer-item ${idx === state.activeLayerIdx ? 'active' : ''}`;

                item.innerHTML = `
                    <span class="layer-visibility" onclick="event.stopPropagation(); window._toggleVis(${idx})">
                        ${layer.visible ? '👁' : '◌'}
                    </span>
                    <span class="layer-name">${layer.name}</span>
                    <div class="layer-actions">
                        <button class="layer-btn" onclick="event.stopPropagation(); window._delLayer(${idx})">✕</button>
                    </div>
                `;

                item.onclick = () => setActiveLayer(idx);
                layersList.appendChild(item);
            });
        }

        window._toggleVis = (idx) => {
            state.layers[idx].visible = !state.layers[idx].visible;
            state.layers[idx].canvas.style.display = state.layers[idx].visible ? 'block' : 'none';
            updateLayersUI();
        };

        window._toggleGridVis = () => {
            state.gridVisible = !state.gridVisible;
            draw();
            updateLayersUI();
        };


        window._delLayer = (idx) => {
            if (state.layers.length <= 1) return showToast('Cannot delete the last layer', 'error');
            if (confirm(`Delete ${state.layers[idx].name}?`)) {
                canvasContainer.removeChild(state.layers[idx].canvas);
                state.layers.splice(idx, 1);
                state.activeLayerIdx = Math.max(0, state.activeLayerIdx - 1);
                saveState();
                setActiveLayer(state.activeLayerIdx);
            }
        };

        btnAddLayer.onclick = () => {
            addLayer();
            saveState();
        };

        // Undo/Redo System
        function saveState() {
            // Snapshot all layers
            const snapshot = state.layers.map(l => ({
                name: l.name,
                data: l.canvas.toDataURL(),
                visible: l.visible
            }));

            state.undoStack.push(JSON.stringify(snapshot));
            if (state.undoStack.length > state.maxStack) state.undoStack.shift();
            state.redoStack = []; // Clear redo on new action
        }

        function undo() {
            if (state.undoStack.length <= 1) return showToast('Nothing to undo', 'error');
            state.redoStack.push(state.undoStack.pop());
            restoreFromSnapshot(state.undoStack[state.undoStack.length - 1]);
        }

        function redo() {
            if (state.redoStack.length === 0) return showToast('Nothing to redo', 'error');
            const data = state.redoStack.pop();
            state.undoStack.push(data);
            restoreFromSnapshot(data);
        }

        function restoreFromSnapshot(json) {
            const snapshot = JSON.parse(json);

            // Clean up existing canvases
            state.layers.forEach(l => canvasContainer.removeChild(l.canvas));
            state.layers = [];

            snapshot.forEach((s, i) => {
                addLayer(s.name, s.data);
                state.layers[i].visible = s.visible;
                state.layers[i].canvas.style.display = s.visible ? 'block' : 'none';
            });

            updateLayersUI();
        }

        // Gesture & Keyboard Controls
        let lastTouchTime = 0;
        window.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) { // Two finger tap
                const now = Date.now();
                if (now - lastTouchTime < 300) { undo(); e.preventDefault(); }
                lastTouchTime = now;
            } else if (e.touches.length === 3) { // Three finger tap
                redo(); e.preventDefault();
            }
        }, { passive: false });

        window.addEventListener('keydown', (e) => {
            const ctrl = e.ctrlKey || e.metaKey;
            if (ctrl && e.key.toLowerCase() === 'u') { // Ctrl+U Undo
                e.preventDefault(); undo();
            } else if (ctrl && e.key.toLowerCase() === 'r') { // Ctrl+R Redo
                e.preventDefault(); redo();
            } else if (ctrl && e.key.toLowerCase() === 'z') { // Support standard Ctrl+Z
                e.preventDefault(); undo();
            } else if (ctrl && e.key.toLowerCase() === 'y') { // Support standard Ctrl+Y
                e.preventDefault(); redo();
            }
        });

        // Painting Logic
        function getCoords(e) {
            // Use canvasContainer (the transformed element) for the reference rect.
            // With transform-origin:0 0, translate(panX,panY) scale(zoom):
            //   rect.left = naturalLeft + panX
            //   rect.width = canvasPixelWidth * zoom
            // So: canvasX = (clientX - rect.left) / zoom = (clientX - rect.left) * (canvasW / rect.width)
            const rect = canvasContainer.getBoundingClientRect();
            const gridCanvas = document.getElementById('mandalaCanvas');
            const canvasW = gridCanvas.width;
            const canvasH = gridCanvas.height;

            const scaleX = canvasW / rect.width;
            const scaleY = canvasH / rect.height;

            let clientX, clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            return [
                (clientX - rect.left) * scaleX,
                (clientY - rect.top) * scaleY
            ];
        }

        function startPaint(e) {
            // Only allow drawing when Draw Mode (fullscreen overlay) is active.
            // This prevents accidental finger drawing on the main settings screen.
            if (!drawModeOverlay.classList.contains('active')) {
                return;
            }

            // Prevent drawing if more than one touch (pinch/zoom)
            // But ALLOW the touch event to propagate so the browser can handle the pinch
            if (e.touches && e.touches.length > 1) {
                state.isDrawing = false;
                return;
            }

            // Hand Drawing Mode Check — by default, finger touches do NOT draw.
            // Only allow finger drawing when the user has explicitly enabled Hand Drawing.
            if (!drawWithHand.checked && e.pointerType === 'touch') {
                return;
            }

            // Apple Pencil Hover / Accidental Touch Check
            // We only want to start drawing if a button is pressed (or tip touches for pencil)
            if (e.pointerType === 'pen' || e.pointerType === 'mouse' || e.pointerType === 'touch') {
                if (e.buttons !== 1 && e.pressure === 0) return;
            }

            state.isDrawing = true;
            [state.lastX, state.lastY] = getCoords(e);
        }

        function paint(e) {
            if (!state.isDrawing) return;

            // Critical: If second touch starts, stop drawing immediately to allow pinch
            if (e.touches && e.touches.length > 1) {
                stopPaint();
                return;
            }

            // Pressure/Button check to avoid hover drawing
            if (e.buttons !== 1 && e.pressure === 0) {
                stopPaint();
                return;
            }

            const [x, y] = getCoords(e);
            const activeLayer = state.layers[state.activeLayerIdx];
            if (!activeLayer || !activeLayer.visible) return;

            const pCtx = activeLayer.ctx;
            const canvas = activeLayer.canvas;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const sym = parseInt(paintInputs.symmetryCount.value) || 1;

            pCtx.lineWidth = paintInputs.brushSize.value * ZOOM_SCALE;
            pCtx.lineCap = 'round';
            pCtx.lineJoin = 'round';

            if (state.isEraser) {
                pCtx.globalCompositeOperation = 'destination-out';
                pCtx.strokeStyle = 'rgba(0,0,0,1)';
            } else {
                pCtx.globalCompositeOperation = 'source-over';
                pCtx.strokeStyle = state.activeColor;
            }

            const sym = parseInt(paintInputs.symmetryCount.value) || 12;
            const isMirror = paintInputs.mirrorGrid && paintInputs.mirrorGrid.checked;
            const mirror = !state.isEraser && isMirror;
            const steps = state.isEraser ? 1 : (mirror ? sym / 2 : sym);
            const angleStep = state.isEraser ? 0 : (mirror ? (4 * Math.PI) / sym : (2 * Math.PI) / sym);

            for (let i = 0; i < steps; i++) {
                pCtx.save();
                pCtx.translate(cx, cy);
                pCtx.rotate(i * angleStep);
                pCtx.translate(-cx, -cy);
                pCtx.beginPath();
                pCtx.moveTo(state.lastX, state.lastY);
                pCtx.lineTo(x, y);
                pCtx.stroke();
                pCtx.restore();

                if (mirror) {
                    pCtx.save();
                    pCtx.translate(cx, cy);
                    pCtx.rotate(i * angleStep);
                    pCtx.scale(1, -1);
                    pCtx.translate(-cx, -cy);
                    pCtx.beginPath();
                    pCtx.moveTo(state.lastX, state.lastY);
                    pCtx.lineTo(x, y);
                    pCtx.stroke();
                    pCtx.restore();
                }
            }

            [state.lastX, state.lastY] = [x, y];
        }

        function stopPaint() {
            if (state.isDrawing) saveState();
            state.isDrawing = false;
        }

        // Update the Resize logic for multi-layers
        function resizePaintLayers(totalPx) {
            const targetPx = Math.round(totalPx);
            const targetInternalPx = targetPx * ZOOM_SCALE;
            state.layers.forEach(l => {
                const temp = document.createElement('canvas');
                temp.width = l.canvas.width; temp.height = l.canvas.height;
                temp.getContext('2d').drawImage(l.canvas, 0, 0);

                const oldW = l.canvas.width; const oldH = l.canvas.height;
                l.canvas.width = l.canvas.height = targetInternalPx;
                l.canvas.style.width = '100%';
                l.canvas.style.height = '100%';
                // Center the image using integer math to match rotation centers
                l.ctx.drawImage(temp, Math.round((targetInternalPx - oldW) / 2), Math.round((targetInternalPx - oldH) / 2));
            });
        }

        // Palette Initialization
        const palettes = [
            ['#7c5cfc', '#9478ff', '#00d4aa', '#ff4d6a', '#ffb347', '#ffffff'],
            ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#000000'],
            ['#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25', '#4b3d3d'],
            ['#ff99c8', '#fcf6bd', '#d0f4de', '#a9def9', '#e4c1f9', '#ffffff']
        ];

        function initPalette() {
            paintInputs.paletteContainer.innerHTML = '';
            paletteFlyoutGrid.innerHTML = '';

            palettes.flat().forEach(color => {
                const createColorEl = (isFlyout) => {
                    const el = document.createElement('div');
                    el.className = 'palette-color';
                    el.style.backgroundColor = color;
                    el.onclick = () => {
                        const finalColor = isFlyout ? applyShades(color) : color;
                        if (isFlyout) state.lastBaseColor = color;
                        updateAppColor(finalColor);
                        if (isFlyout) {
                            colorPickerFlyout.classList.remove('active');
                        }

                    };

                    return el;
                };

                paintInputs.paletteContainer.appendChild(createColorEl(false));
                paletteFlyoutGrid.appendChild(createColorEl(true));
            });
        }

        function updateAppColor(color) {
            state.activeColor = color;
            // Update hex input if possible, otherwise it stays at last valid hex
            if (color.startsWith('#')) {
                paintInputs.paintColor.value = color;
            }
            colorDot.style.backgroundColor = color;
            document.querySelectorAll('.palette-color').forEach(c => {
                if (c.style.backgroundColor === color) c.classList.add('active');
                else c.classList.remove('active');
            });
        }


        function applyShades(baseColor) {
            // Convert hex to HSL, apply sliders, convert back
            const l = shadeLightness.value;
            const s = shadeSaturation.value;
            return `hsl(${getHue(baseColor)}, ${s}%, ${l}%)`;
        }

        function getHue(hex) {
            let r = parseInt(hex.slice(1, 3), 16) / 255;
            let g = parseInt(hex.slice(3, 5), 16) / 255;
            let b = parseInt(hex.slice(5, 7), 16) / 255;
            let max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h;
            if (max === min) h = 0;
            else if (max === r) h = (g - b) / (max - min) + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / (max - min) + 2;
            else h = (r - g) / (max - min) + 4;
            return Math.round(h * 60);
        }

        initPalette();

        // Event Listeners for Painting (Delegate to container)
        canvasContainer.addEventListener('pointerdown', startPaint);
        window.addEventListener('pointermove', (e) => {
            paint(e);
            const eraserCursor = document.getElementById('eraserCursor');
            if (state.isEraser && eraserCursor && drawModeOverlay.classList.contains('active')) {
                eraserCursor.style.display = 'block';
                const size = paintInputs.brushSize.value * state.zoom;
                eraserCursor.style.width = size + 'px';
                eraserCursor.style.height = size + 'px';
                eraserCursor.style.left = e.clientX + 'px';
                eraserCursor.style.top = e.clientY + 'px';
            } else if (eraserCursor) {
                eraserCursor.style.display = 'none';
            }
        });
        window.addEventListener('pointerup', stopPaint);

        paintInputs.brushSize.oninput = () => {
            paintInputs.brushSizeVal.textContent = `${paintInputs.brushSize.value}px`;
        };

        paintInputs.btnClearPaint.onclick = () => {
            if (confirm('Clear active layer?')) {
                state.layers[state.activeLayerIdx].ctx.clearRect(0, 0, state.layers[0].canvas.width, state.layers[0].canvas.height);
                saveState();
            }
        };

        inputs.radialLines.addEventListener('input', () => {
            let val = parseInt(inputs.radialLines.value) || 12;
            if (paintInputs.mirrorGrid && paintInputs.mirrorGrid.checked && val % 2 !== 0) {
                val += 1;
                inputs.radialLines.value = val;
            }
            paintInputs.symmetryCount.value = inputs.radialLines.value;
        });

        if (paintInputs.mirrorGrid) {
            paintInputs.mirrorGrid.addEventListener('change', () => {
                if (paintInputs.mirrorGrid.checked) {
                    let sym = parseInt(paintInputs.symmetryCount.value) || 12;
                    if (sym % 2 !== 0) {
                        sym += 1;
                        paintInputs.symmetryCount.value = sym;
                        inputs.radialLines.value = sym;
                        generateGrid();
                    }
                }
            });
        }

        paintInputs.symmetryCount.addEventListener('input', () => {
            let val = parseInt(paintInputs.symmetryCount.value) || 12;
            if (paintInputs.mirrorGrid && paintInputs.mirrorGrid.checked && val % 2 !== 0) {
                val += 1;
                paintInputs.symmetryCount.value = val;
            }
        });

        // Original logic below updated for multi-layer
        [inputs.diameter, inputs.radialLines, inputs.circularGrids, inputs.firstRingDist, inputs.ringSpacing, inputs.autoSpacing]
            .forEach(el => el.addEventListener('input', generateGrid));

        [inputs.lineThickness, inputs.numberSize, inputs.lineColor, inputs.bgColor, inputs.showCenter, inputs.showOuterRing, inputs.showNumbers, inputs.showMmScale, inputs.exportDpi]
            .forEach(el => el.addEventListener('input', draw));

        // Draw Mode Logic
        const enterDraw = () => {
            drawModeOverlay.classList.add('active');
            drawCanvasContainer.appendChild(canvasContainer);
            colorDot.style.backgroundColor = paintInputs.paintColor.value;
        };

        btnEnterDrawMode.onclick = enterDraw;
        btnCanvasDraw.onclick = enterDraw;

        btnExitDrawMode.onclick = () => {
            drawModeOverlay.classList.remove('active');
            normalCanvasContainer.appendChild(canvasContainer);
        };

        colorDot.onclick = (e) => {
            e.stopPropagation();
            colorPickerFlyout.classList.toggle('active');
        };

        window.addEventListener('click', () => {
            colorPickerFlyout.classList.remove('active');
        });

        btnUndoDraw.onclick = undo;
        btnRedoDraw.onclick = redo;

        drawBrushSize.oninput = () => {
            paintInputs.brushSize.value = drawBrushSize.value;
            drawBrushSizeVal.textContent = `${drawBrushSize.value}px`;
            paintInputs.brushSizeVal.textContent = `${drawBrushSize.value}px`;
        };

        const btnBrushDec = document.getElementById('btnBrushDec');
        const btnBrushInc = document.getElementById('btnBrushInc');
        if (btnBrushDec && btnBrushInc) {
            btnBrushDec.onclick = () => {
                drawBrushSize.value = Math.max(parseInt(drawBrushSize.min) || 1, parseInt(drawBrushSize.value) - 1);
                drawBrushSize.oninput();
            };
            btnBrushInc.onclick = () => {
                drawBrushSize.value = Math.min(parseInt(drawBrushSize.max) || 50, parseInt(drawBrushSize.value) + 1);
                drawBrushSize.oninput();
            };
        }

        paintInputs.brushSize.addEventListener('input', () => {
            drawBrushSize.value = paintInputs.brushSize.value;
            drawBrushSizeVal.textContent = `${paintInputs.brushSize.value}px`;
        });

        paintInputs.paintColor.oninput = () => {
            state.activeColor = paintInputs.paintColor.value;
            colorDot.style.backgroundColor = state.activeColor;
        };

        if (btnQuickEraser) {
            btnQuickEraser.onclick = () => {
                state.isEraser = !state.isEraser;
                if (state.isEraser) {
                    btnQuickEraser.classList.add('active-eraser');
                } else {
                    btnQuickEraser.classList.remove('active-eraser');
                }
                const eraserCursor = document.getElementById('eraserCursor');
                if (eraserCursor && !state.isEraser) {
                    eraserCursor.style.display = 'none';
                }
            };
        }

        shadeLightness.oninput = shadeSaturation.oninput = () => {
            if (state.lastBaseColor) {
                updateAppColor(applyShades(state.lastBaseColor));
            }
        };

        // --- Zoom & Pan Logic (Hardware Accelerated) ---

        let transformRAF = null;
        function requestUpdateTransform() {
            if (!transformRAF) {
                transformRAF = requestAnimationFrame(() => {
                    canvasContainer.style.transformOrigin = '0 0';
                    canvasContainer.style.transform = `translate3d(${state.panX}px, ${state.panY}px, 0) scale3d(${state.zoom}, ${state.zoom}, 1)`;
                    transformRAF = null;
                });
            }
        }

        function resetTransform() {
            state.zoom = 1;
            state.panX = 0;
            state.panY = 0;
            state.layoutLeft = undefined;
            state.layoutTop = undefined;
            requestUpdateTransform();
        }

        canvasContainer.addEventListener('touchstart', (e) => {
            // Only care about this in Draw Mode (overlay active)
            if (!drawModeOverlay.classList.contains('active')) return;

            if (e.touches.length === 2) {
                // Pinch start
                state.isDrawing = false; // Stop any drawing
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                state.lastTouchDist = Math.sqrt(dx * dx + dy * dy);
                state.lastTouchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                state.lastTouchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

                // Cache the true layout position to prevent layout thrashing
                const rect = canvasContainer.getBoundingClientRect();
                state.layoutLeft = rect.left - state.panX;
                state.layoutTop = rect.top - state.panY;
            } else if (e.touches.length === 1) {
                // Single finger pans the canvas when Hand Drawing is OFF (default)
                if (!drawWithHand.checked && e.touches[0].touchType !== 'stylus') {
                    state.isDrawing = false;
                    state.lastTouchX = e.touches[0].clientX;
                    state.lastTouchY = e.touches[0].clientY;
                }
            }
        }, { passive: false });

        canvasContainer.addEventListener('touchmove', (e) => {
            if (!drawModeOverlay.classList.contains('active')) return;

            if (e.touches.length === 2) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

                const zoomFactor = dist / state.lastTouchDist;
                const newZoom = Math.min(Math.max(0.5, state.zoom * zoomFactor), 8);

                // Compute rect mathematically without reading DOM (no thrashing)
                if (state.layoutLeft === undefined) {
                    const rect = canvasContainer.getBoundingClientRect();
                    state.layoutLeft = rect.left - state.panX;
                    state.layoutTop = rect.top - state.panY;
                }
                const rectLeft = state.layoutLeft + state.panX;
                const rectTop = state.layoutTop + state.panY;

                const scaleFactor = newZoom / state.zoom;
                state.panX += (midX - rectLeft) * (1 - scaleFactor);
                state.panY += (midY - rectTop) * (1 - scaleFactor);

                // Also pan by finger midpoint movement
                state.panX += (midX - state.lastTouchX);
                state.panY += (midY - state.lastTouchY);

                state.zoom = newZoom;
                state.lastTouchDist = dist;
                state.lastTouchX = midX;
                state.lastTouchY = midY;
                
                requestUpdateTransform();
            } else if (e.touches.length === 1 && !drawWithHand.checked && e.touches[0].touchType !== 'stylus') {
                // Pan with one finger in Pencil Only mode
                e.preventDefault();
                state.panX += (e.touches[0].clientX - state.lastTouchX);
                state.panY += (e.touches[0].clientY - state.lastTouchY);
                state.lastTouchX = e.touches[0].clientX;
                state.lastTouchY = e.touches[0].clientY;
                
                requestUpdateTransform();
            }
        }, { passive: false });

        btnExitDrawMode.addEventListener('click', resetTransform);

        btnReset.onclick = () => {
            state.extraRings = []; state.extraRadials = [];
            state.layers.forEach(l => l.ctx.clearRect(0, 0, l.canvas.width, l.canvas.height));
            saveState();
            generateGrid();
        };

        btnExportJpeg.onclick = () => exportImg('jpeg');
        btnExportPng.onclick = () => exportImg('png');

        function exportImg(fmt) {
            const pDpi = parseInt(inputs.exportDpi.value);
            const d = parseFloat(inputs.diameter.value);
            const padMM = Math.max(15, parseFloat(inputs.numberSize.value) * 5);
            const totalMM = d + (padMM * 2);
            const px = mmToPixels(totalMM, pDpi);

            const off = document.createElement('canvas'); off.width = off.height = px;
            const oCtx = off.getContext('2d');
            const cx = px / 2, cy = px / 2;

            oCtx.fillStyle = inputs.bgColor.value; oCtx.fillRect(0, 0, px, px);

            const weight = parseFloat(inputs.lineThickness.value) * (pDpi / 96);
            oCtx.lineWidth = weight; oCtx.strokeStyle = inputs.lineColor.value; oCtx.lineCap = 'round';
            const rPx = mmToPixels(d / 2, pDpi);

            if (inputs.showOuterRing.checked) {
                oCtx.beginPath(); oCtx.arc(cx, cy, Math.round(rPx), 0, Math.PI * 2); oCtx.stroke();
            }
            state.allRings.forEach(r => {
                oCtx.beginPath(); oCtx.arc(cx, cy, Math.round(mmToPixels(r.radiusMM, pDpi)), 0, Math.PI * 2); oCtx.stroke();
            });
            state.allRadials.forEach(r => {
                const ang = r.angleDeg * Math.PI / 180;
                let sRPx = 0; if (r.startRingIdx >= 0) sRPx = Math.round(mmToPixels(state.allRings[r.startRingIdx].radiusMM, pDpi));
                oCtx.beginPath(); oCtx.moveTo(cx + Math.cos(ang) * sRPx, cy + Math.sin(ang) * sRPx);
                oCtx.lineTo(cx + Math.cos(ang) * Math.round(rPx), cy + Math.sin(ang) * Math.round(rPx)); oCtx.stroke();
            });

            if (inputs.showNumbers.checked) {
                const f = Math.round(mmToPixels(parseFloat(inputs.numberSize.value), pDpi));
                oCtx.font = `bold ${f}px Inter, sans-serif`; oCtx.textAlign = 'center'; oCtx.textBaseline = 'middle';
                const startAng = state.allRadials[0].angleDeg * Math.PI / 180;
                state.allRings.forEach(r => {
                    const lRPx = Math.round(mmToPixels(r.radiusMM, pDpi));
                    const lx = cx + Math.cos(startAng) * lRPx + Math.cos(startAng + Math.PI / 2) * f * 0.9;
                    const ly = cy + Math.sin(startAng) * lRPx + Math.sin(startAng + Math.PI / 2) * f * 0.9;
                    oCtx.fillStyle = inputs.bgColor.value; oCtx.fillRect(lx - f / 2, ly - f / 2, f, f);
                    oCtx.fillStyle = inputs.lineColor.value; oCtx.fillText(r.id, lx, ly);
                });
                const outerL = Math.round(rPx) + f * 1.5;
                state.allRadials.forEach(r => {
                    const a = r.angleDeg * Math.PI / 180;
                    oCtx.fillStyle = inputs.lineColor.value; oCtx.fillText(r.id, cx + Math.cos(a) * outerL, cy + Math.sin(a) * outerL);
                });
            }

            // Draw all visible layers
            state.layers.forEach(l => {
                if (l.visible) oCtx.drawImage(l.canvas, 0, 0, l.canvas.width, l.canvas.height, 0, 0, px, px);
            });

            off.toBlob(blob => {
                const u = URL.createObjectURL(blob);
                const l = document.createElement('a'); l.href = u; l.download = `mandala_${d}mm.${fmt}`; l.click();
            }, fmt === 'jpeg' ? 'image/jpeg' : 'image/png');
        }

        const btnSaveDesign = document.getElementById('btnSaveDesign');
        const designGallery = document.getElementById('designGallery');

        function saveDesign() {
            const timestamp = new Date().toLocaleString();
            const combined = document.createElement('canvas');
            combined.width = canvas.width; combined.height = canvas.height;
            const cCtx = combined.getContext('2d');
            cCtx.drawImage(canvas, 0, 0);
            state.layers.forEach(l => { if (l.visible) cCtx.drawImage(l.canvas, 0, 0); });

            const thumb = document.createElement('canvas');
            thumb.width = thumb.height = 150;
            thumb.getContext('2d').drawImage(combined, 0, 0, combined.width, combined.height, 0, 0, 150, 150);

            const design = {
                id: Date.now(),
                name: `Design ${timestamp}`,
                thumbnail: thumb.toDataURL('image/webp', 0.5),
                layers: state.layers.map(l => ({ name: l.name, data: l.canvas.toDataURL(), visible: l.visible })),
                params: {
                    diameter: inputs.diameter.value, radialLines: inputs.radialLines.value,
                    circularGrids: inputs.circularGrids.value, firstRingDist: inputs.firstRingDist.value,
                    ringSpacing: inputs.ringSpacing.value, autoSpacing: inputs.autoSpacing.checked,
                    lineThickness: inputs.lineThickness.value, lineColor: inputs.lineColor.value,
                    bgColor: inputs.bgColor.value, exportDpi: inputs.exportDpi.value,
                    showCenter: inputs.showCenter.checked, showOuterRing: inputs.showOuterRing.checked,
                    showNumbers: inputs.showNumbers.checked, numberSize: inputs.numberSize.value,
                    showMmScale: inputs.showMmScale.checked, symmetryCount: paintInputs.symmetryCount.value,
                    brushSize: paintInputs.brushSize.value, paintColor: paintInputs.paintColor.value,
                    mirrorGrid: paintInputs.mirrorGrid ? paintInputs.mirrorGrid.checked : false
                },
                extraRings: JSON.parse(JSON.stringify(state.extraRings)),
                extraRadials: JSON.parse(JSON.stringify(state.extraRadials))
            };

            const saved = JSON.parse(localStorage.getItem('mandalaDesigns') || '[]');
            saved.unshift(design);
            localStorage.setItem('mandalaDesigns', JSON.stringify(saved.slice(0, 20)));
            loadDesigns(); showToast('Design saved locally!');
        }

        function loadDesigns() {
            const saved = JSON.parse(localStorage.getItem('mandalaDesigns') || '[]');
            designGallery.innerHTML = saved.length ? '' : '<p class="empty-msg">No saved designs</p>';
            saved.forEach((design, index) => {
                const card = document.createElement('div');
                card.className = 'design-card';
                card.innerHTML = `
                    <img src="${design.thumbnail}" alt="thumb">
                    <div class="design-name">${design.name}</div>
                    <button class="btn-delete" onclick="event.stopPropagation(); deleteDesign(${index})">✕</button>
                `;
                card.onclick = () => restoreDesign(design);
                designGallery.appendChild(card);
            });
        }

        window.deleteDesign = (index) => {
            const saved = JSON.parse(localStorage.getItem('mandalaDesigns') || '[]');
            saved.splice(index, 1);
            localStorage.setItem('mandalaDesigns', JSON.stringify(saved));
            loadDesigns(); showToast('Design deleted', 'error');
        };

        function restoreDesign(design) {
            Object.keys(design.params).forEach(key => {
                if (inputs[key]) inputs[key][inputs[key].type === 'checkbox' ? 'checked' : 'value'] = design.params[key];
                if (paintInputs[key]) paintInputs[key][paintInputs[key].type === 'checkbox' ? 'checked' : 'value'] = design.params[key];
            });

            if (paintInputs.brushSizeVal) paintInputs.brushSizeVal.textContent = `${paintInputs.brushSize.value}px`;
            state.extraRings = JSON.parse(JSON.stringify(design.extraRings));
            state.extraRadials = JSON.parse(JSON.stringify(design.extraRadials));

            generateGrid();

            state.layers.forEach(l => canvasContainer.removeChild(l.canvas));
            state.layers = [];
            design.layers.forEach((l, i) => {
                addLayer(l.name, l.data);
                state.layers[i].visible = l.visible;
                state.layers[i].canvas.style.display = l.visible ? 'block' : 'none';
            });
            saveState();
            showToast('Design restored!');
        }

        btnSaveDesign.onclick = saveDesign;
        const btnExportSTL = document.getElementById('btnExportSTL');

        function exportSTL() {
            const dMM = parseFloat(inputs.diameter.value) || 200;
            const padMM = Math.max(15, parseFloat(inputs.numberSize.value) * 5);
            const totalMM = dMM + (padMM * 2);
            
            // 1. Create a heightmap by flattening all visible layers
            const size = 256; // Managing resolution for speed and file size
            const hCanvas = document.createElement('canvas');
            hCanvas.width = hCanvas.height = size;
            const hCtx = hCanvas.getContext('2d');
            hCtx.fillStyle = 'black';
            hCtx.fillRect(0, 0, size, size);

            state.layers.forEach(l => {
                if(l.visible) hCtx.drawImage(l.canvas, 0, 0, l.canvas.width, l.canvas.height, 0, 0, size, size);
            });

            // Optional: apply a slight blur to create the "smooth taper"
            hCtx.filter = 'blur(1px)';
            hCtx.drawImage(hCanvas, 0, 0);

            const imgData = hCtx.getImageData(0, 0, size, size).data;
            const heights = new Float32Array(size * size);
            for (let i = 0; i < imgData.length; i += 4) {
                // Use alpha or intensity as height
                heights[i / 4] = (imgData[i + 3] / 255.0) * 0.8; // 0.8mm max height
            }

            // 2. Generate STL (Binary)
            const triangles = (size - 1) * (size - 1) * 2;
            const bufferSize = 84 + (triangles * 50);
            const buffer = new ArrayBuffer(bufferSize);
            const view = new DataView(buffer);
            let pos = 80; // Skip header

            view.setUint32(pos, triangles, true); pos += 4;

            const mmPerPixel = totalMM / size;
            const halfSize = totalMM / 2;

            function writeTri(p1, p2, p3) {
                // Normal (calculated as 0 for simplicity, slicers handle it)
                view.setFloat32(pos, 0, true); pos += 4;
                view.setFloat32(pos, 0, true); pos += 4;
                view.setFloat32(pos, 0, true); pos += 4;

                [p1, p2, p3].forEach(p => {
                    view.setFloat32(pos, p[0], true); pos += 4; // X
                    view.setFloat32(pos, p[1], true); pos += 4; // Y
                    view.setFloat32(pos, p[2], true); pos += 4; // Z
                });
                view.setUint16(pos, 0, true); pos += 2; // Attribute byte count
            }

            for (let y = 0; y < size - 1; y++) {
                for (let x = 0; x < size - 1; x++) {
                    const i = y * size + x;
                    const nextX = i + 1;
                    const nextY = (y + 1) * size + x;
                    const nextXY = (y + 1) * size + (x + 1);

                    const xmm = x * mmPerPixel - halfSize;
                    const ymm = y * mmPerPixel - halfSize;
                    const nxmm = (x + 1) * mmPerPixel - halfSize;
                    const nymm = (y + 1) * mmPerPixel - halfSize;

                    // Triangle 1
                    writeTri(
                        [xmm, ymm, heights[i]],
                        [nxmm, ymm, heights[nextX]],
                        [xmm, nymm, heights[nextY]]
                    );
                    // Triangle 2
                    writeTri(
                        [nxmm, ymm, heights[nextX]],
                        [nxmm, nymm, heights[nextXY]],
                        [xmm, nymm, heights[nextY]]
                    );
                }
            }

            const blob = new Blob([buffer], { type: 'application/sla' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `mandala_design_${Date.now()}.stl`;
            link.click();
            showToast('STL Generated (0.8mm height)!');
        }

        if (btnExportSTL) btnExportSTL.onclick = exportSTL;

        loadDesigns();


        // Initial setup
        addLayer('Base Paint');
        saveState();
        generateGrid();

        // Override draw to handle multi-layer resizing
        const originalDraw = draw;
        draw = function () {
            const d = parseFloat(inputs.diameter.value) || 200;
            const numSz = parseFloat(inputs.numberSize.value) || 3;
            const totalPx = Math.round(mmToPixels(d + (Math.max(15, numSz * 5) * 2), 96));
            const targetInternalPx = totalPx * ZOOM_SCALE;

            if (state.layers.length > 0 && state.layers[0].canvas.width !== targetInternalPx) {
                resizePaintLayers(totalPx);
                canvasContainer.style.width = totalPx + 'px';
                canvasContainer.style.height = 'auto';
                canvasContainer.style.aspectRatio = '1 / 1';
            }
            originalDraw();
            // Sync container display size to grid size
            canvasContainer.style.width = totalPx + 'px';
            canvasContainer.style.height = 'auto';
            canvasContainer.style.aspectRatio = '1 / 1';
        };
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
