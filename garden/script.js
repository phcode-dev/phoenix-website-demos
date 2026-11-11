(() => {
    const view = document.getElementById('world'),
        vg = view.getContext('2d');
    const low = document.createElement('canvas'),
        lg = low.getContext('2d');
    let W = 0,
        H = 0,
        S = 5,
        img,
        buf,
        HZ = 0,
        LIFT = 0;
    const C = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
    const hex = h =>
        C(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16));
    const rgbOf = c => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255];
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const mixC = (a, b, k) => {
        const A = rgbOf(a),
            B = rgbOf(b);
        return C(
            Math.round(lerp(A[0], B[0], k)),
            Math.round(lerp(A[1], B[1], k)),
            Math.round(lerp(A[2], B[2], k))
        );
    };
    const TAU = Math.PI * 2;
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
    const bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
    const hash2 = (x, y) => {
        let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const noise = (x, y) => {
        const ix = Math.floor(x),
            iy = Math.floor(y),
            fx = x - ix,
            fy = y - iy,
            u = fx * fx * (3 - 2 * fx),
            v = fy * fy * (3 - 2 * fy);
        const a = hash2(ix, iy),
            b = hash2(ix + 1, iy),
            c = hash2(ix, iy + 1),
            d = hash2(ix + 1, iy + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const P = (x, y, c) => {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || y < 0 || x >= W || y >= H) return;
        buf[y * W + x] = c;
    };
    const blend = (x, y, r, g, b, a) => {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
        const i = y * W + x,
            c = buf[i];
        if (!c) {
            if (a > 0.5) buf[i] = C(r, g, b);
            return;
        }
        const cr = c & 255,
            cg = (c >>> 8) & 255,
            cb = (c >>> 16) & 255;
        buf[i] = C((cr + (r - cr) * a) | 0, (cg + (g - cg) * a) | 0, (cb + (b - cb) * a) | 0);
    };
    const disc = (cx, cy, r, c) => {
        for (let y = Math.floor(cy - r); y <= cy + r; y++)
            for (let x = Math.floor(cx - r); x <= cx + r; x++) {
                const dx = x + 0.5 - cx,
                    dy = y + 0.5 - cy;
                if (dx * dx + dy * dy <= r * r) P(x, y, c);
            }
    };
    const line = (x0, y0, x1, y1, c) => {
        x0 = Math.round(x0);
        y0 = Math.round(y0);
        x1 = Math.round(x1);
        y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0),
            dy = -Math.abs(y1 - y0),
            sx = x0 < x1 ? 1 : -1,
            sy = y0 < y1 ? 1 : -1;
        let e = dx + dy;
        for (let n = 0; n < 300; n++) {
            P(x0, y0, c);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * e;
            if (e2 >= dy) {
                e += dy;
                x0 += sx;
            }
            if (e2 <= dx) {
                e += dx;
                y0 += sy;
            }
        }
    };
    const HEART = ['.x.x.', 'xxxxx', 'xxxxx', '.xxx.', '..x..'];
    const heart = (x, y, c) =>
        HEART.forEach((r, j) =>
            [...r].forEach((ch, i) => {
                if (ch === 'x') P(x - 2 + i, y - 2 + j, c);
            })
        );
    const sprite = (rows, x, y, map, flip = false) =>
        rows.forEach((r, j) => {
            for (let i = 0; i < r.length; i++) {
                const c = map[r[flip ? r.length - 1 - i : i]];
                if (c) P(x + i, y + j, c);
            }
        });

    const THEMES = {
        day: {
            bg: hex('#0f2a57'),
            sky: [
                [0, hex('#0f2a57')],
                [0.3, hex('#1b4f94')],
                [0.55, hex('#47abf4')],
                [0.8, hex('#86cbfa')],
                [1, hex('#cdeafd')]
            ],
            hills: [hex('#dbeaa0'), hex('#f1f2bc')],
            mid: [hex('#226f3d'), hex('#2d874b'), hex('#3c9f57')],
            near: [hex('#185c33'), hex('#226f3d'), hex('#2d874b'), hex('#3c9f57'), hex('#5ab765')]
        },
        dusk: {
            bg: hex('#0d0f22'),
            sky: [
                [0, hex('#0d0f22')],
                [0.28, hex('#1a1d48')],
                [0.5, hex('#3b3576')],
                [0.68, hex('#8a5f9e')],
                [0.84, hex('#e58f8f')],
                [0.94, hex('#ffc59a')],
                [1, hex('#ffe3b8')]
            ],
            hills: [hex('#6a5d93'), hex('#7d6aa0')],
            mid: [hex('#2f5a4e'), hex('#38695a'), hex('#457a63')],
            near: [hex('#173d33'), hex('#1e4b3d'), hex('#285c48'), hex('#337052'), hex('#3d7f5c')]
        }
    };
    const sampleSky = (stops, tt) => {
        for (let i = 1; i < stops.length; i++)
            if (tt <= stops[i][0])
                return mixC(
                    stops[i - 1][1],
                    stops[i][1],
                    (tt - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0])
                );
        return stops[stops.length - 1][1];
    };
    let mix = 0,
        target = 0,
        fadeRate = 1 / 22,
        autoT = 0;
    const CYCLE = 50;
    let M = {};
    const mixPalette = () => {
        const d = THEMES.day,
            n = THEMES.dusk;
        M = {
            bg: mixC(d.bg, n.bg, mix),
            hills: d.hills.map((c, i) => mixC(c, n.hills[i], mix)),
            mid: d.mid.map((c, i) => mixC(c, n.mid[i], mix)),
            near: d.near.map((c, i) => mixC(c, n.near[i], mix)),
            shade: lerp(1, 0.8, mix)
        };
    };
    mixPalette();

    const FLOWER = {
        pink: {
            o: hex('#b8325b'),
            d: hex('#dd5a80'),
            m: hex('#f27b9b'),
            l: hex('#ffc0d0'),
            h: hex('#fff2f6')
        },
        lilac: {
            o: hex('#6a46ad'),
            d: hex('#8e66d0'),
            m: hex('#b392ec'),
            l: hex('#dccaff'),
            h: hex('#f7f1ff')
        }
    };
    const SUNF = { p: hex('#ffc93a'), pd: hex('#e8a312'), c: hex('#6b3d1f'), cl: hex('#8f5a2c') };
    const STEM = hex('#2a6e3a'),
        STEM2 = hex('#3b8a46'),
        LEAF = hex('#48a352');

    const pompom = (cx, cy, r, pal, seed) => {
        for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
            for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
                const dx = x + 0.5 - cx,
                    dy = (y + 0.5 - cy) * 1.12,
                    d = Math.hypot(dx, dy) / r;
                if (d > 1.05) continue;
                const a = Math.atan2(dy, dx),
                    edge = 1 - 0.13 * (0.5 + 0.5 * Math.cos(a * 7 + seed));
                if (d > edge) continue;
                const lit = (-dx * 0.65 - dy * 0.75) / r,
                    ring = (d * 2.3 + 0.35 * Math.sin(a * 5 + seed * 2)) % 1;
                let c = pal.m;
                if (d > edge - 0.16) c = lit > 0.25 ? pal.d : pal.o;
                else if (ring < 0.2) c = lit > 0.1 ? pal.m : pal.d;
                else if (lit > 0.32) c = d < 0.45 ? pal.h : pal.l;
                else if (lit > 0.05) c = pal.l;
                P(x, y, c);
            }
    };
    const sunflower = (cx, cy, r, seed) => {
        for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
            for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
                const dx = x + 0.5 - cx,
                    dy = y + 0.5 - cy,
                    d = Math.hypot(dx, dy) / r;
                if (d > 1) continue;
                if (d < 0.45) {
                    P(x, y, hash2(x, y) < 0.3 || dx + dy < -1 ? SUNF.cl : SUNF.c);
                    continue;
                }
                const a = Math.atan2(dy, dx),
                    petal = Math.cos(a * 12 + seed);
                if (petal < -0.3 && d > 0.7) continue;
                P(x, y, d > 0.88 || petal < 0 ? SUNF.pd : SUNF.p);
            }
    };

    const LAYERS = [
        { par: 0.35, top: 0.68, amp: 3, gap: 9, size: [1.2, 2.0], kinds: 'pppps', empty: 0.45 },
        { par: 0.62, top: 0.76, amp: 4, gap: 14, size: [2.4, 3.6], kinds: 'pppps', empty: 0.4 },
        { par: 1.0, top: 0.86, amp: 5, gap: 22, size: [4.2, 6.8], kinds: 'pppps', empty: 0.35 }
    ];
    const picked = new Map();
    let camX = 0,
        camV = 0,
        camGoal = null,
        walked = 0,
        petals = 0,
        wind = 0;
    const groundY = (L, wx) =>
        Math.round(
            H * (L.top + LIFT) +
                Math.sin(wx * 0.021 + L.par * 9) * L.amp +
                noise(wx * 0.05, L.par * 30) * L.amp
        );
    const flowerAt = (li, k) => {
        const L = LAYERS[li],
            h1 = hash2(k, li * 977 + 13),
            h2 = hash2(k * 3 + 1, li * 131 + 7),
            h3 = hash2(k + 91, li * 59 + 3);
        if (hash2(k * 7 + 5, li * 313 + 17) < L.empty) return null;
        const kind = L.kinds[(h1 * L.kinds.length) | 0],
            r = lerp(L.size[0], L.size[1], h2);
        return {
            wx: k * L.gap + (h2 - 0.5) * L.gap * 0.8,
            kind,
            r: kind === 's' ? r * 1.25 : r,
            pal: h3 < 0.86 ? FLOWER.pink : FLOWER.lilac,
            seed: h1 * 10,
            stem: r * 2.2 + 2 + h3 * 3
        };
    };
    const drawFlower = (f, sx, gy, t, grow, li) => {
        const sway =
            Math.sin(t * 1.3 + f.wx * 0.07 + f.seed) * (0.4 + f.r * 0.14) + wind * f.r * 0.2;
        const g = clamp(grow, 0, 1),
            hx = sx + sway * g,
            hy = gy - f.stem * (0.35 + 0.65 * g);
        line(sx, gy, hx, hy + f.r * 0.6, li === 2 ? STEM : STEM2);
        if (f.r > 3 && g > 0.5) {
            disc(sx - f.r * 0.42, gy - f.stem * 0.32, f.r * 0.3, LEAF);
            disc(sx + f.r * 0.4, gy - f.stem * 0.22, f.r * 0.26, STEM2);
        }
        const r = f.r * (0.3 + 0.7 * g);
        if (g < 0.35) {
            disc(hx, hy, Math.max(1, r * 0.6), LEAF);
            return { hx, hy, r };
        }
        if (f.kind === 's') sunflower(hx, hy, r, f.seed);
        else pompom(hx, hy, r, f.pal, f.seed);
        return { hx, hy, r };
    };

    const STORE = 'endless-garden';
    const saved = (() => {
        try {
            return JSON.parse(localStorage.getItem(STORE)) || {};
        } catch {
            return {};
        }
    })();
    const planted = (saved.planted || []).map(p => ({
        ...p,
        pal: FLOWER[p.palKey] || FLOWER.pink,
        born: -99
    }));
    const found = new Set(saved.found || []);
    petals = saved.petals || 0;
    let saveT = null;
    const save = () => {
        clearTimeout(saveT);
        saveT = setTimeout(() => {
            try {
                localStorage.setItem(
                    STORE,
                    JSON.stringify({
                        planted: planted.map(({ wx, r, palKey, seed, stem, kind }) => ({
                            wx: Math.round(wx),
                            r,
                            palKey,
                            seed,
                            stem,
                            kind
                        })),
                        found: [...found],
                        petals
                    })
                );
            } catch {}
        }, 300);
    };

    const LM_GAP = 520;
    const SPR = {
        bunny: ['.w.w...', '.wpw...', '.www...', '.wwewn.', 'wwwwww.', 'wwwwwww', '.w..w..'],
        scare: [
            '....HHH....',
            '...HHHHH...',
            '.HHHHHHHHH.',
            '....FFF....',
            '....EFE....',
            '....FFF....',
            'YSSSSSSSSSY',
            '...SSSSS...',
            '...SSPSS...',
            '...SSSSS...',
            '....WWW....',
            '.....W.....',
            '.....W.....',
            '.....W.....',
            '.....W.....',
            '.....W.....'
        ],
        mush: [
            '..rrr......',
            '.rwrrr...rr.',
            'rrrrwrr.rwrr',
            'rrrrrrr.rrrr',
            '..sss....ss.',
            '..sss....ss.'
        ],
        well: [
            '..RRRRRRR..',
            '.RRRRRRRRR.',
            'RRRRRRRRRRR',
            '.W.......W.',
            '.W...b...W.',
            '.W...b...W.',
            'GGGGGGGGGGG',
            'GgGGgGGGgGG',
            'GGGGGGgGGGG',
            'GgGGGGGGGgG'
        ]
    };
    const MAP = {
        bunny: { w: hex('#fbfbff'), p: hex('#f7b0c2'), e: hex('#2a2a35'), n: hex('#f08aa6') },
        scare: {
            H: hex('#7a4a26'),
            F: hex('#f0d58a'),
            E: hex('#2a2420'),
            S: hex('#d9534f'),
            P: hex('#4f7fd9'),
            Y: hex('#e8c35a'),
            W: hex('#7a5230')
        },
        mush: { r: hex('#e0473f'), w: hex('#fff4ea'), s: hex('#f3e2c8') },
        well: {
            R: hex('#b5523a'),
            W: hex('#7a5230'),
            b: hex('#6b6b74'),
            G: hex('#9aa0a8'),
            g: hex('#7c828c')
        }
    };
    const NAMES = {
        bunny: 'a bunny',
        scare: 'a scarecrow',
        mush: 'a mushroom ring',
        well: 'an old well',
        sign: 'a signpost'
    };
    const landmarkAt = k => {
        if (k === 0) return null;
        const h = hash2(k, 4242),
            kind =
                Math.abs(k) % 4 === 0
                    ? 'sign'
                    : ['bunny', 'scare', 'mush', 'well', 'bunny'][(h * 5) | 0];
        return { k, kind, wx: k * LM_GAP + (h - 0.5) * 140, ph: h * 10 };
    };
    const FONT = {
        0: ['111', '101', '101', '101', '111'],
        1: ['010', '110', '010', '010', '111'],
        2: ['111', '001', '111', '100', '111'],
        3: ['111', '001', '111', '001', '111'],
        4: ['101', '101', '111', '001', '001'],
        5: ['111', '100', '111', '001', '111'],
        6: ['111', '100', '111', '101', '111'],
        7: ['111', '001', '001', '010', '010'],
        8: ['111', '101', '111', '101', '111'],
        9: ['111', '101', '111', '001', '111'],
        m: ['000', '000', '111', '111', '101'],
        k: ['100', '101', '110', '101', '101'],
        '.': ['000', '000', '000', '000', '010'],
        ' ': ['000', '000', '000', '000', '000']
    };
    const bunnyJump = new Map();
    const drawLandmark = (lm, sx, gy, t) => {
        sx = Math.round(sx);
        if (lm.kind === 'sign') {
            const m = Math.round(Math.abs(lm.wx) / 10),
                txt = m >= 1000 ? (m / 1000).toFixed(1) + ' km' : m + ' m';
            const tw = txt.length * 4 - 1,
                bw = tw + 4,
                bx = sx - (bw >> 1),
                by = gy - 15,
                post = hex('#7a5230'),
                board = hex('#c49360'),
                edge = hex('#8a5a32'),
                ink = hex('#3a2414');
            for (let y = by + 6; y < gy; y++) {
                P(sx - 1, y, post);
                P(sx, y, post);
            }
            for (let y = 0; y < 9; y++)
                for (let x = 0; x < bw; x++)
                    P(bx + x, by + y, y === 0 || y === 8 || x === 0 || x === bw - 1 ? edge : board);
            [...txt].forEach((ch, i) =>
                (FONT[ch] || FONT[' ']).forEach((row, j) =>
                    [...row].forEach((v, c) => {
                        if (v === '1') P(bx + 2 + i * 4 + c, by + 2 + j, ink);
                    })
                )
            );
            return { x: sx, y: by + 4, r: bw / 2 };
        }
        const rows = SPR[lm.kind];
        let lift = 0,
            flip = false;
        if (lm.kind === 'bunny') {
            const ph = (((t * 0.55 + lm.ph) % 1) + 1) % 1;
            lift = ph < 0.14 ? Math.sin((ph / 0.14) * Math.PI) * 3 : 0;
            flip = Math.sin(t * 0.3 + lm.ph) > 0;
            const j = bunnyJump.get(lm.k);
            if (j !== undefined) {
                const u = (t - j) / 0.7;
                if (u < 1) lift = Math.sin(u * Math.PI) * 9;
                else bunnyJump.delete(lm.k);
            }
            for (let i = -3; i <= 3; i++) if (bay(sx + i, gy) < 0.5) P(sx + i, gy, hex('#185c33'));
        }
        const w = Math.max(...rows.map(r => r.length)),
            x0 = sx - (w >> 1),
            y0 = gy - rows.length - Math.round(lift);
        const wob =
            lm.kind === 'scare' ? Math.round(Math.sin(t * 0.9 + lm.ph) * 0.6 + wind * 0.4) : 0;
        sprite(rows, x0 + wob, y0, MAP[lm.kind], flip);
        return { x: sx, y: y0 + rows.length / 2, r: w / 2 + 1 };
    };

    const parts = [];
    const spawn = o => {
        parts.push(Object.assign({ vx: 0, vy: 0, g: 0, life: 1, decay: 0.5, kind: 'px' }, o));
        if (parts.length > 800) parts.shift();
    };
    const WING = { o: hex('#e07a1f'), m: hex('#ffd34d'), l: hex('#fff5c2') },
        BODY = hex('#2f2440');
    const flies = [0, 1].map(i => ({
        wx: i * 60 - 40,
        y: 0,
        vx: 0,
        vy: 0,
        tx: 0,
        ty: 0,
        next: i,
        call: 0
    }));
    const fireflies = Array.from({ length: 28 }, () => ({
        x: Math.random(),
        y: Math.random(),
        ph: Math.random() * TAU,
        sp: 0.6 + Math.random()
    }));
    let stars = [];

    let AC = null;
    const tone = (f, dur = 0.3, type = 'triangle', vol = 0.08, slide = 0, delay = 0) => {
        try {
            AC = AC || new (window.AudioContext || window.webkitAudioContext)();
            if (AC.state === 'suspended') AC.resume();
        } catch {
            return;
        }
        const t0 = AC.currentTime + delay,
            o = AC.createOscillator(),
            g = AC.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f, t0);
        if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t0 + dur * 0.8);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g).connect(AC.destination);
        o.start(t0);
        o.stop(t0 + dur + 0.05);
    };
    const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
    const chime = (base = 2) =>
        [0, 2, 4].forEach((s, i) =>
            tone(PENTA[Math.min(7, base + s)], 0.5, 'sine', 0.06, 0, i * 0.07)
        );

    const toastEl = document.getElementById('toast');
    let toastT = null;
    const toast = msg => {
        toastEl.textContent = msg;
        toastEl.classList.add('on');
        clearTimeout(toastT);
        toastT = setTimeout(() => toastEl.classList.remove('on'), 2600);
    };

    const fit = () => {
        const narrow = innerWidth < 760;
        S = narrow ? 4 : innerWidth < 1400 ? 5 : 6;
        LIFT = narrow ? 0.05 : 0;
        const vh = view.clientHeight || innerHeight;
        W = Math.ceil(innerWidth / S);
        H = Math.ceil(vh / S);
        HZ = Math.round(H * (0.64 + LIFT));
        low.width = W;
        low.height = H;
        img = lg.createImageData(W, H);
        buf = new Uint32Array(img.data.buffer);
        const dpr = Math.min(devicePixelRatio || 1, 2);
        view.width = Math.round(innerWidth * dpr);
        view.height = Math.round(vh * dpr);
        vg.imageSmoothingEnabled = false;
        stars = Array.from({ length: Math.round((W * H) / 260) }, () => ({
            x: Math.random() * W,
            y: Math.random() * H * 0.52,
            ph: Math.random() * TAU,
            sp: 0.8 + Math.random() * 2
        }));
        flies.forEach((f, i) => {
            f.y = HZ - 10 + i * 6;
            f.ty = f.y;
            f.wx = camX + W * (0.45 + i * 0.15);
            f.tx = f.wx;
        });
    };

    const skyDensity = y => clamp((y / H - 0.1) / 0.4, 0, 1);
    let quiet = { l: 0, t: 0, r: 0, b: 0 };
    const readQuiet = () => {
        const r = document.querySelector('.hero').getBoundingClientRect();
        quiet = {
            l: (r.left - 30) / S,
            t: (r.top - 24) / S,
            r: (r.right + 40) / S,
            b: (r.bottom + 20) / S
        };
    };
    const inQuiet = (x, y) => x > quiet.l && x < quiet.r && y > quiet.t && y < quiet.b;
    addEventListener('resize', () => {
        fit();
        readQuiet();
    });
    fit();
    requestAnimationFrame(() => readQuiet());
    document.fonts && document.fonts.ready.then(() => readQuiet());

    let visible = [],
        visibleLm = [];
    const draw = t => {
        buf.fill(0);
        for (let y = 0; y < HZ + 8 && y < H; y++) {
            const tt = y / (HZ + 8),
                sk = mixC(sampleSky(THEMES.day.sky, tt), sampleSky(THEMES.dusk.sky, tt), mix);
            buf.fill(mixC(M.bg, sk, Math.pow(skyDensity(y), 1.4)), y * W, y * W + W);
        }
        const starK = 0.55 + 0.45 * mix;
        for (const s of stars) {
            if (inQuiet(s.x, s.y) || s.y < 64 / S || skyDensity(s.y) > 0.45 + mix * 0.25) continue;
            const k = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
            if (k > 0.4) blend(s.x, s.y, 255, 248, 232, starK);
            if (k > 0.93) {
                for (const [dx, dy] of [
                    [1, 0],
                    [-1, 0],
                    [0, 1],
                    [0, -1]
                ])
                    blend(s.x + dx, s.y + dy, 255, 246, 226, 0.6 * starK);
            }
        }
        if (mix > 0.02) {
            const mx = Math.round(W * 0.84 - camX * 0.02),
                my = Math.round(H * (0.32 - 0.12 * mix)),
                mr = Math.max(4, Math.round(H * 0.045));
            for (let y = my - mr; y <= my + mr; y++)
                for (let x = mx - mr; x <= mx + mr; x++) {
                    const d1 = Math.hypot(x - mx, y - my),
                        d2 = Math.hypot(x - mx - mr * 0.45, y - my + mr * 0.35);
                    if (d1 < mr && d2 > mr * 0.85) blend(x, y, 255, 241, 207, mix);
                }
        }
        const cg = lerp(255, 240, mix),
            cb = lerp(255, 235, mix);
        for (let y = Math.round(H * 0.34); y < HZ - 2; y++)
            for (let x = 0; x < W; x++) {
                const v =
                    noise((x + camX * 0.12) * 0.03 + t * 0.02, y * 0.09) +
                    noise((x + camX * 0.12) * 0.07 - t * 0.015, y * 0.18 + 5) * 0.4 -
                    (1 - (y - H * 0.34) / (HZ - H * 0.34)) * 0.35;
                if (v > 0.98)
                    blend(x, y, 255, cg, cb, v > 1.05 ? 0.95 - mix * 0.3 : 0.55 - mix * 0.2);
            }
        for (let x = 0; x < W; x++) {
            const wx = x + camX * 0.18,
                top = Math.round(
                    HZ - 4 - noise(wx * 0.018, 2) * H * 0.07 - Math.sin(wx * 0.011) * 3
                );
            for (let y = top; y < H; y++)
                buf[y * W + x] = y - top < 2 && bay(x, y) < 0.5 ? M.hills[1] : M.hills[0];
        }
        LAYERS.forEach((L, li) => {
            const cx = camX * L.par,
                pal = li === 2 ? M.near : M.mid;
            for (let x = 0; x < W; x++) {
                const wx = x + cx,
                    top = groundY(L, wx);
                for (let y = top; y < H; y++) {
                    const n = noise(wx * (li === 2 ? 0.09 : 0.07), y * 0.11 + li * 7),
                        depth = (y - top) / (H - top);
                    const v = n - depth * 0.3 + (y === top ? 0.3 : 0);
                    buf[y * W + x] =
                        v > 0.62
                            ? pal[pal.length - 1]
                            : v > 0.48
                              ? pal[Math.min(pal.length - 1, 2)]
                              : v > 0.34
                                ? pal[1]
                                : pal[0];
                }
            }
            const k0 = Math.floor((cx - 12) / L.gap),
                k1 = Math.ceil((cx + W + 12) / L.gap);
            for (let k = k0; k <= k1; k++) {
                const f = flowerAt(li, k);
                if (!f) continue;
                const key = li + ':' + k,
                    hit = drawFlower(
                        f,
                        f.wx - cx,
                        groundY(L, f.wx),
                        t,
                        picked.has(key) ? picked.get(key) : 1,
                        li
                    );
                if (li === 2) {
                    f._hit = hit;
                    f._key = key;
                    visible.push(f);
                }
            }
            if (li === 2) {
                for (const p of planted) {
                    const sx = p.wx - cx;
                    if (sx < -20 || sx > W + 20) continue;
                    drawFlower(p, sx, groundY(L, p.wx), t, clamp((t - p.born) / 1.6, 0, 1), 2);
                }
                const j0 = Math.floor((cx - 40) / LM_GAP),
                    j1 = Math.ceil((cx + W + 40) / LM_GAP);
                for (let k = j0; k <= j1; k++) {
                    const lm = landmarkAt(k);
                    if (!lm) continue;
                    const sx = lm.wx - cx;
                    if (sx < -30 || sx > W + 30) continue;
                    lm._hit = drawLandmark(lm, sx, groundY(L, lm.wx), t);
                    lm._sx = sx;
                    visibleLm.push(lm);
                }
            }
        });
        if (mix > 0.05)
            for (const f of fireflies) {
                const k = Math.pow(Math.max(0, Math.sin(t * f.sp * 2 + f.ph)), 3) * mix;
                if (k < 0.05) continue;
                const x =
                        ((((f.x * W * 1.4 - camX * 0.5) % (W * 1.4)) + W * 1.4) % (W * 1.4)) -
                        W * 0.2,
                    y = H * (0.6 + LIFT + f.y * 0.26) + Math.sin(t * 0.7 + f.ph) * 4;
                blend(x, y, 255, 252, 210, k);
                for (const [dx, dy] of [
                    [1, 0],
                    [-1, 0],
                    [0, 1],
                    [0, -1]
                ])
                    blend(x + dx, y + dy, 240, 230, 120, k * 0.5);
            }
        for (const b of flies) {
            const sx = Math.round(b.wx - camX),
                by = Math.round(b.y + Math.sin(t * 5 + b.wx) * 0.7);
            if (sx < -6 || sx > W + 6) continue;
            const fl = Math.abs(Math.sin(t * 15 + b.next)),
                ww = Math.max(1, Math.round(fl * 4.4));
            for (const s of [-1, 1]) {
                for (let i = 1; i <= ww; i++)
                    for (let j = -4; j <= 0; j++) {
                        const e = (i / (ww + 0.5)) ** 2 + ((j + 1.6) / 2.7) ** 2;
                        if (e > 1) continue;
                        P(
                            sx + s * i,
                            by + j,
                            e > 0.62
                                ? WING.o
                                : i === Math.ceil(ww * 0.55) && j === -2
                                  ? WING.l
                                  : WING.m
                        );
                    }
                const lw = Math.max(1, ww - 1);
                for (let i = 1; i <= lw; i++)
                    for (let j = 1; j <= 3; j++) {
                        const e = (i / (lw + 0.4)) ** 2 + ((j - 0.8) / 2.4) ** 2;
                        if (e > 1) continue;
                        P(sx + s * i, by + j, e > 0.55 ? WING.o : WING.m);
                    }
            }
            for (let j = -2; j <= 2; j++) P(sx, by + j, BODY);
            P(sx - 1, by - 3, BODY);
            P(sx - 2, by - 4, BODY);
            P(sx + 1, by - 3, BODY);
            P(sx + 2, by - 4, BODY);
        }
        for (const p of parts) {
            if (p.life < 0.35 && bay(Math.round(p.x) & 3, Math.round(p.y) & 3) > p.life / 0.35)
                continue;
            if (p.kind === 'heart') heart(p.x, p.y, p.c);
            else P(p.x, p.y, p.c);
        }
        if (M.shade < 0.999) {
            const s = M.shade,
                sb = s + 0.08 * mix;
            for (let i = HZ * W; i < buf.length; i++) {
                const c = buf[i];
                if (!c) continue;
                buf[i] = C(
                    ((c & 255) * s) | 0,
                    (((c >>> 8) & 255) * s) | 0,
                    Math.min(255, ((c >>> 16) & 255) * sb) | 0
                );
            }
        }
    };

    const root = document.documentElement,
        themeBtn = document.getElementById('theme');
    const syncTheme = () => {
        themeBtn.textContent = target ? '☾' : '☼';
        themeBtn.setAttribute('aria-label', target ? 'Switch to day' : 'Switch to dusk');
    };
    let lastBg = 0;
    const step = (dt, t) => {
        wind = Math.sin(t * 0.45) * 0.7 + Math.sin(t * 1.7 + 1) * 0.25;
        autoT += dt;
        if (!reduce && autoT > CYCLE) {
            target = 1 - target;
            autoT = 0;
            fadeRate = 1 / 22;
            syncTheme();
        }
        const m0 = mix;
        mix += clamp(target - mix, -dt * fadeRate, dt * fadeRate);
        if (mix !== m0 || !lastBg) {
            mixPalette();
            if (M.bg !== lastBg) {
                const [r, g, b] = rgbOf(M.bg);
                root.style.setProperty('--bg', `rgb(${r},${g},${b})`);
                lastBg = M.bg;
            }
        }
        if (camGoal !== null) {
            camX = lerp(camX, camGoal, 1 - Math.exp(-dt * 2.4));
            camV = 0;
            if (Math.abs(camX - camGoal) < 0.5) camGoal = null;
        } else if (!dragging) {
            camV *= Math.exp(-dt * 2.2);
            if (Math.abs(camV) < 4 && !reduce) camV = lerp(camV, 4, dt * 0.5);
        }
        camX += camV * dt;
        walked += Math.abs(camV * dt);
        for (const [k, v] of picked) {
            const nv = v + dt * 0.22;
            if (nv >= 1) picked.delete(k);
            else picked.set(k, nv);
        }
        for (const lm of visibleLm)
            if (!found.has(lm.k) && lm._sx > W * 0.15 && lm._sx < W * 0.85) {
                found.add(lm.k);
                toast(`✿ you found ${NAMES[lm.kind]}`);
                chime(3);
                save();
            }
        for (const b of flies) {
            if ((b.next -= dt) < 0 || b.wx - camX < -30 || b.wx - camX > W + 30) {
                b.next = 2.5 + Math.random() * 3;
                if (b.wx - camX < -30 || b.wx - camX > W + 30)
                    b.wx = camX + (camV > 0 ? W + 10 : -10);
                const opts = visible.filter(f => f._hit && !picked.has(f._key));
                if (Math.random() < 0.55 && opts.length) {
                    const f = opts[(Math.random() * opts.length) | 0];
                    b.tx = camX + f._hit.hx;
                    b.ty = f._hit.hy - f._hit.r - 1;
                } else {
                    b.tx = camX + 10 + Math.random() * (W - 20);
                    b.ty = H * (0.5 + LIFT + Math.random() * 0.25);
                }
            }
            const k = b.call > 0 ? 3 : 1.2;
            b.call = Math.max(0, b.call - dt);
            b.vx += ((b.tx - b.wx) * k - b.vx) * Math.min(1, dt * 3);
            b.vy += ((b.ty - b.y) * k - b.vy) * Math.min(1, dt * 3);
            b.wx += b.vx * dt;
            b.y += b.vy * dt;
        }
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            p.vy += p.g * dt;
            if (p.kind === 'petal')
                p.vx += (wind * 10 - p.vx) * dt * 0.6 + Math.sin(p.life * 9 + p.ph) * 5 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt * p.decay;
            if (p.life <= 0 || p.y > H + 4) parts.splice(i, 1);
        }
    };

    let dragging = false,
        down = null,
        lastX = 0,
        lastT = 0,
        tNow = 0;
    const toW = e => {
        const r = view.getBoundingClientRect();
        return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
    };
    view.addEventListener('pointerdown', e => {
        const [x, y] = toW(e);
        down = { x, y, cx: e.clientX, cy: e.clientY, id: e.pointerId };
        lastX = e.clientX;
        lastT = performance.now();
        camV = 0;
        camGoal = null;
    });
    view.addEventListener('pointermove', e => {
        if (!down) return;
        if (
            !dragging &&
            Math.abs(e.clientX - down.cx) > 6 &&
            Math.abs(e.clientX - down.cx) > Math.abs(e.clientY - down.cy)
        ) {
            dragging = true;
            try {
                view.setPointerCapture(down.id);
            } catch {}
            view.classList.add('grabbing');
            document.getElementById('hint').style.opacity = 0;
        }
        if (dragging) {
            const now = performance.now(),
                dx = (e.clientX - lastX) / S;
            camX -= dx;
            camV = lerp(camV, -dx / Math.max(0.008, (now - lastT) / 1000), 0.5);
            lastX = e.clientX;
            lastT = now;
        }
    });
    const up = e => {
        if (!down) return;
        if (!dragging && e.type === 'pointerup') tap(down.x, down.y);
        dragging = false;
        down = null;
        view.classList.remove('grabbing');
        camV = clamp(camV, -260, 260);
    };
    view.addEventListener('pointerup', up);
    view.addEventListener('pointercancel', up);
    const tap = (x, y) => {
        for (const lm of visibleLm) {
            const h = lm._hit;
            if (!h || Math.hypot(x - h.x, y - h.y) > h.r + 2) continue;
            if (lm.kind === 'bunny') {
                bunnyJump.set(lm.k, tNow);
                spawn({
                    x: h.x,
                    y: h.y - 8,
                    vx: 0,
                    vy: -12,
                    decay: 0.6,
                    kind: 'heart',
                    c: hex('#f08aa6')
                });
                tone(523, 0.15, 'square', 0.05, 2);
                tone(784, 0.3, 'sine', 0.06, 1, 0.1);
            } else if (lm.kind === 'well') {
                [0, 0.25, 0.5].forEach((d, i) => tone(392, 0.6, 'sine', 0.07 / (i + 1), 0.98, d));
            } else {
                spawn({
                    x: h.x,
                    y: h.y - 8,
                    vx: 0,
                    vy: -12,
                    decay: 0.6,
                    kind: 'heart',
                    c: hex('#ffd34d')
                });
                chime(1);
            }
            return;
        }
        for (let i = visible.length - 1; i >= 0; i--) {
            const f = visible[i],
                h = f._hit;
            if (!h || picked.has(f._key)) continue;
            if (Math.hypot(x - h.hx, (y - h.hy) * 1.1) <= h.r + 1.5) {
                const cols =
                    f.kind === 's' ? [SUNF.p, SUNF.pd] : [f.pal.m, f.pal.l, f.pal.d, f.pal.h];
                for (let n = 0; n < 14 + h.r * 3; n++) {
                    const a = Math.random() * TAU,
                        s = 8 + Math.random() * 18;
                    spawn({
                        x: h.hx + Math.cos(a) * h.r * 0.5,
                        y: h.hy + Math.sin(a) * h.r * 0.5,
                        vx: Math.cos(a) * s,
                        vy: Math.sin(a) * s - 10,
                        g: 9,
                        decay: 0.3 + Math.random() * 0.2,
                        kind: 'petal',
                        ph: Math.random() * 6,
                        c: cols[(Math.random() * cols.length) | 0]
                    });
                }
                picked.set(f._key, 0.05);
                petals += Math.round(10 + h.r * 2);
                save();
                tone(PENTA[clamp(7 - Math.round(h.r), 0, 7)], 0.35, 'triangle', 0.08);
                return;
            }
        }
        let best = flies[0],
            bd = 1e9;
        for (const b of flies) {
            const d = Math.hypot(b.wx - camX - x, b.y - y);
            if (d < bd) {
                bd = d;
                best = b;
            }
        }
        best.tx = camX + x;
        best.ty = y;
        best.next = 3.5;
        best.call = 1.2;
        spawn({
            x,
            y: y - 2,
            vx: (Math.random() - 0.5) * 6,
            vy: -14,
            decay: 0.55,
            kind: 'heart',
            c: WING.m
        });
        chime(2);
    };

    document.getElementById('seed').onclick = () => {
        const wx = camX + W * (0.35 + Math.random() * 0.5),
            kind = Math.random() < 0.2 ? 's' : 'p',
            r = 5 + Math.random() * 2.5,
            palKey = Math.random() < 0.8 ? 'pink' : 'lilac';
        planted.push({
            wx,
            kind,
            r: kind === 's' ? r * 1.2 : r,
            palKey,
            pal: FLOWER[palKey],
            seed: Math.random() * 10,
            stem: r * 2.2 + 3 + Math.random() * 3,
            born: tNow
        });
        if (planted.length > 60) planted.shift();
        save();
        const gy = groundY(LAYERS[2], wx);
        for (let n = 0; n < 10; n++)
            spawn({
                x: wx - camX + (Math.random() - 0.5) * 4,
                y: gy,
                vx: (Math.random() - 0.5) * 14,
                vy: -12 - Math.random() * 10,
                g: 30,
                decay: 1.2,
                c: hex('#8a5a3a')
            });
        [0, 2, 4, 7].forEach((k, i) => tone(PENTA[k] / 2, 0.3, 'triangle', 0.07, 0, i * 0.09));
        if (planted.length === 1) toast('✿ your first flower · it will be here next time');
    };
    let visitI = 0;
    document.getElementById('cSeedsBtn').onclick = () => {
        if (!planted.length) {
            toast('plant a seed first ✿');
            return;
        }
        const sorted = [...planted].sort((a, b) => a.wx - b.wx),
            p = sorted[visitI++ % sorted.length];
        camGoal = p.wx - W * 0.5;
        tone(PENTA[3], 0.25, 'sine', 0.05);
    };
    themeBtn.onclick = () => {
        target = 1 - target;
        autoT = 0;
        fadeRate = 1 / 2.5;
        syncTheme();
    };
    syncTheme();

    const ICONS = {
        flower: [
            '..p.p...',
            '.ppypp..',
            '..ppp...',
            '...g....',
            '.g.g....',
            '..gg.g..',
            '...gg...',
            '...g....'
        ],
        butterfly: [
            'oo....oo',
            'oyo..oyo',
            'oyykkyyo',
            '.oykkyo.',
            '.oykkyo.',
            'oyykkyyo',
            'oo.kk.oo',
            '........'
        ],
        bee: [
            '..ww.ww.',
            '..wwwww.',
            '.ykykyk.',
            'ykykykyk',
            '.ykykyk.',
            '..k...k.',
            '........',
            '........'
        ],
        type: [
            '.ww.....',
            'w..w....',
            'wwww..ww',
            'w..w.w.w',
            'w..w..ww',
            '........',
            'pppppppp',
            '........'
        ],
        house: [
            '...ww...',
            '..wwww..',
            '.wwwwww.',
            '.wbwwbw.',
            '.wwwwww.',
            '.wbwwbw.',
            '.wwnwww.',
            '.wwnwww.'
        ],
        window: [
            'llllllll',
            'lrlylgll',
            'wwwwwwww',
            'wkkwwwww',
            'wwwwkkkw',
            'wkkkwwww',
            'wwwwwwww',
            '........'
        ],
        seed: [
            '........',
            '...gg...',
            '..g..g..',
            '...gg...',
            '....g...',
            '..nnnn..',
            '.nnnnnn.',
            '..nnnn..'
        ],
        pixel: [
            'pppp....',
            'pppp....',
            'pppp....',
            'pppp....',
            '....bbbb',
            '....bbbb',
            '....bbbb',
            '....bbbb'
        ],
        moon: [
            '...yyy..',
            '..yy....',
            '.yy.....',
            '.yy.....',
            '.yy.....',
            '..yy....',
            '...yyy..',
            '........'
        ],
        scare: [
            '..nnnn..',
            '.nnnnnn.',
            '...yy...',
            'ryrrrryr',
            '..rrrr..',
            '...nn...',
            '...nn...',
            '...nn...'
        ],
        mush: [
            '..rrrr..',
            '.rwrrwr.',
            'rrrrrrrr',
            '...ww...',
            '...ww...',
            '...ww...',
            '........',
            '........'
        ],
        well: [
            '.rrrrrr.',
            'rrrrrrrr',
            '.n....n.',
            '.n.ll.n.',
            'llllllll',
            'lwllwlll',
            'llllllll',
            '........'
        ],
        bunny: [
            '.w.w....',
            '.wpw....',
            '.www....',
            'wwkwp...',
            'wwwwww..',
            'wwwwwww.',
            '.w..w...',
            '........'
        ],
        sign: [
            '........',
            'nnnnnnn.',
            'nwwwwwn.',
            'nwkwkwn.',
            'nnnnnnn.',
            '...n....',
            '...n....',
            '...n....'
        ]
    };
    const IC = {
        p: '#f27b9b',
        y: '#ffd34d',
        g: '#48a352',
        k: '#2f2440',
        w: '#efe9f6',
        o: '#e07a1f',
        b: '#47abf4',
        n: '#8a5a3a',
        l: '#8fa3c7',
        r: '#e0473f'
    };
    document.querySelectorAll('canvas[data-icon]').forEach(c => {
        const g = c.getContext('2d');
        (ICONS[c.dataset.icon] || []).forEach((row, y) =>
            [...row].forEach((ch, x) => {
                if (IC[ch]) {
                    g.fillStyle = IC[ch];
                    g.fillRect(x, y, 1, 1);
                }
            })
        );
    });

    const cP = document.getElementById('cPetals'),
        cS = document.getElementById('cSeeds'),
        cF = document.getElementById('cFound'),
        cW = document.getElementById('cWalk');
    const menu = document.getElementById('menu'),
        menuBtn = document.getElementById('menuBtn'),
        mTime = document.getElementById('mTime');
    const tabs = [...menu.querySelectorAll('[role=tab]')],
        panels = [...menu.querySelectorAll('.panel')];
    let menuOpen = false,
        lastFocus = null;
    const KINDS = ['bunny', 'scare', 'mush', 'well', 'sign'];
    const paintIcon = (c, name) => {
        const g = c.getContext('2d');
        g.clearRect(0, 0, 8, 8);
        (ICONS[name] || []).forEach((row, y) =>
            [...row].forEach((ch, x) => {
                if (IC[ch]) {
                    g.fillStyle = IC[ch];
                    g.fillRect(x, y, 1, 1);
                }
            })
        );
    };
    const renderSheet = () => {
        document.getElementById('sheet').innerHTML = [
            [petals, 'petals scattered'],
            [planted.length, 'flowers planted'],
            [found.size, 'things found'],
            [Math.round(walked / 10) + ' m', 'walked today']
        ]
            .map(([v, l]) => `<div><b>${v}</b>${l}</div>`)
            .join('');
        const got = new Set([...found].map(k => (landmarkAt(k) || {}).kind));
        const dex = document.getElementById('dex');
        dex.innerHTML = '';
        KINDS.forEach(k => {
            const li = document.createElement('li');
            if (got.has(k)) li.className = 'got';
            const c = document.createElement('canvas');
            c.width = c.height = 8;
            paintIcon(c, k);
            li.append(c, got.has(k) ? NAMES[k].replace(/^an? /, '') : '???');
            dex.appendChild(li);
        });
    };
    const showTab = (name, focus) => {
        tabs.forEach(t => {
            const on = t.dataset.tab === name;
            t.setAttribute('aria-selected', on);
            t.tabIndex = on ? 0 : -1;
            if (on) {
                if (focus) t.focus({ preventScroll: true });
                t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
        });
        panels.forEach(p => p.classList.toggle('on', p.dataset.panel === name));
        if (name === 'about') renderSheet();
    };
    const openMenu = (tab = 'work') => {
        if (!menuOpen) lastFocus = document.activeElement;
        menuOpen = true;
        menu.classList.add('open');
        showTab(tab, true);
        [0, 4].forEach((k, i) => tone(PENTA[k], 0.18, 'square', 0.035, 0, i * 0.06));
    };
    const closeMenu = () => {
        if (!menuOpen) return;
        menuOpen = false;
        menu.classList.remove('open');
        tone(PENTA[4], 0.14, 'square', 0.03, 0.5);
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    menuBtn.onclick = () => (menuOpen ? closeMenu() : openMenu());
    document.getElementById('mclose').onclick = closeMenu;
    menu.addEventListener('click', e => {
        if (e.target === menu || e.target.closest('[data-close]')) {
            e.preventDefault();
            closeMenu();
        }
    });
    document.querySelectorAll('[data-open]').forEach(b =>
        b.addEventListener('click', e => {
            e.preventDefault();
            openMenu(b.dataset.open);
        })
    );
    tabs.forEach(t =>
        t.addEventListener('click', () => {
            showTab(t.dataset.tab, true);
            tone(PENTA[2], 0.08, 'square', 0.03);
        })
    );
    addEventListener('keydown', e => {
        if (menuOpen) {
            if (e.key === 'Escape') {
                closeMenu();
                return;
            }
            const i = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true'),
                d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
            if (d) {
                e.preventDefault();
                showTab(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, true);
                tone(PENTA[2], 0.08, 'square', 0.03);
            }
        } else if (
            (e.key === 'm' || e.key === 'M') &&
            !e.metaKey &&
            !e.ctrlKey &&
            !/input|textarea/i.test(e.target.tagName)
        )
            openMenu();
    });

    let last = performance.now();
    const frame = now => {
        requestAnimationFrame(frame);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (Math.floor(tNow) !== Math.floor(tNow + dt)) readQuiet();
        tNow += dt;
        visible = [];
        visibleLm = [];
        draw(tNow);
        step(dt, tNow);
        lg.putImageData(img, 0, 0);
        vg.clearRect(0, 0, view.width, view.height);
        vg.drawImage(
            low,
            0,
            0,
            (W * S * view.width) / innerWidth,
            (H * S * view.height) / (view.clientHeight || innerHeight)
        );
        cP.textContent = petals;
        cS.textContent = planted.length;
        cF.textContent = found.size;
        cW.textContent = Math.round(walked / 10);
        if (menuOpen) {
            const s = Math.floor(tNow);
            mTime.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        }
    };
    requestAnimationFrame(frame);
    window.garden = {
        tap,
        get camX() {
            return camX;
        },
        set camX(v) {
            camX = v;
        },
        get mix() {
            return mix;
        },
        set mix(v) {
            mix = target = v;
            mixPalette();
        },
        plant: () => document.getElementById('seed').click(),
        theme: () => themeBtn.click(),
        walkTo: wx => {
            camGoal = wx - W * 0.5;
        }
    };
})();
