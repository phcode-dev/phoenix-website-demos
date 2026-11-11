(() => {
    document.querySelectorAll('.chips').forEach(g =>
        g.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (b)
                g.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
        })
    );
    const rdate = document.getElementById('rdate');
    rdate.valueAsDate = new Date(Date.now() + 864e5);
    document.getElementById('resv').addEventListener('submit', e => {
        e.preventDefault();
        const f = e.currentTarget,
            pick = g => f.querySelector(`[data-group=${g}] [aria-pressed=true]`).textContent,
            name = document.getElementById('rname').value.trim();
        const d = rdate.valueAsDate
            ? rdate.valueAsDate.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  timeZone: 'UTC'
              })
            : 'soon';
        document.getElementById('done').textContent =
            `${name ? name + ', s' : 'S'}ee you ${d} at ${pick('time')}, party of ${pick('party')}. (Demo: nothing was booked.)`;
        f.classList.add('ok');
    });

    const cv = document.getElementById('pond'),
        out = cv.getContext('2d');
    const mk = () => {
        const c = document.createElement('canvas');
        return [c, c.getContext('2d', { willReadFrequently: true })];
    };
    const [deepC, dctx] = mk(),
        [topC, tctx] = mk(),
        [warmC, wctx] = mk(),
        [padC, pctx] = mk();
    let ctx = tctx;
    const kcEl = document.getElementById('kc'),
        fcEl = document.getElementById('fc');
    const TAU = Math.PI * 2,
        rnd = (a, b) => a + Math.random() * (b - a),
        clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const N = 18;
    let W = 0,
        H = 0,
        dpr = 1,
        CELL = 14,
        cols = 0,
        rows = 0,
        rects = [];
    let koi = [],
        pads = [],
        pellets = [],
        ripples = [],
        wake = [],
        fed = 0,
        time = 0;
    const pointer = { x: -999, y: -999, speed: 0, active: false, lt: 0 };

    const CLS = [
        { rgb: [244, 236, 224], tile: '#e7e3db', ink: '#958e84', g: '白' },
        { rgb: [212, 68, 44], tile: '#f5a48c', ink: '#ad3920', g: '紅' },
        { rgb: [35, 30, 29], tile: '#58514d', ink: '#e9e4dc', g: '墨' },
        { rgb: [230, 164, 58], tile: '#f6cf85', ink: '#9e6716', g: '金' },
        { rgb: [154, 106, 61], tile: '#d8b08a', ink: '#734a24', g: '茶' },
        { rgb: [108, 154, 84], tile: '#b6d49c', ink: '#3c6a2a', g: '葉' },
        { rgb: [239, 178, 192], tile: '#f8c6d1', ink: '#b2526a', g: '花' },
        { rgb: [240, 197, 74], tile: '#f7dc7c', ink: '#957312', g: '芯' }
    ];
    const lut = ids => {
        const L = new Uint8Array(4096);
        for (let i = 0; i < 4096; i++) {
            const r = (i >> 8) * 17,
                g = ((i >> 4) & 15) * 17,
                b = (i & 15) * 17;
            let best = ids[0],
                bd = 1e9;
            for (const j of ids) {
                const c = CLS[j],
                    d = (r - c.rgb[0]) ** 2 * 3 + (g - c.rgb[1]) ** 2 * 4 + (b - c.rgb[2]) ** 2 * 2;
                if (d < bd) {
                    bd = d;
                    best = j;
                }
            }
            L[i] = best;
        }
        return L;
    };
    const KOI_LUT = lut([0, 1, 2, 3, 4]),
        PIED_LUT = lut([0, 1, 2]),
        WARM_LUT = lut([3, 4]),
        PAD_LUT = lut([5, 6, 7]);
    const cls = (L, r, g, b) => CLS[L[((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)]];

    const C = {
        white: '#f4ece0',
        red: '#d4442c',
        black: '#231e1d',
        gold: '#e6a43a',
        bronze: '#9a6a3d'
    };
    const KINDS = ['kohaku', 'ogon', 'tancho', 'sumi', 'kohaku', 'chagoi'];
    function look(kind) {
        const S = [],
            patch = (c, t, r) =>
                S.push({
                    c,
                    t,
                    s: rnd(-0.15, 0.15),
                    r,
                    w: [rnd(0, TAU), rnd(0, TAU), rnd(0.06, 0.12)]
                });
        switch (kind) {
            case 'kohaku':
                patch(C.red, 0.22, 1.05);
                patch(C.red, 0.58, 0.9);
                return { body: C.white, S };
            case 'tancho':
                patch(C.red, 0.07, 0.6);
                return { body: C.white, S };
            case 'ogon':
                return { body: C.gold, S, warm: true };
            case 'sumi':
                patch(C.white, 0.1, 0.55);
                return { body: C.black, S };
            default:
                return { body: C.bronze, S, warm: true };
        }
    }
    function makeKoi(i) {
        const base = clamp(Math.min(W, H) * 0.27, 120, 270),
            deep = i % 3 === 2,
            scale = deep ? rnd(0.55, 0.75) : rnd(0.8, 1),
            L = base * scale,
            lk = look(KINDS[i % KINDS.length]);
        let x,
            y,
            h,
            t = 0;
        do {
            x = rnd(60, W - 60);
            y = rnd(60, H - 60);
            h = rnd(0, TAU);
        } while (
            ++t < 200 &&
            [0, 0.25, 0.5, 0.75, 1].some(f => {
                const px = x - Math.cos(h) * L * f,
                    py = y - Math.sin(h) * L * f;
                return (
                    hitsRect(px, py, 40) ||
                    pads.some(p => Math.hypot(p.x - px, p.y - py) < p.r + L * 0.3) ||
                    koi.some(o => {
                        for (let j = 0; j < N; j += 2)
                            if (
                                Math.hypot(o.nodes[2 * j] - px, o.nodes[2 * j + 1] - py) <
                                (L * 0.16 + o.maxW) * 1.6 + 40
                            )
                                return true;
                        return false;
                    })
                );
            })
        );
        const seg = L / (N - 1),
            nodes = new Float32Array(N * 2);
        for (let j = 0; j < N; j++) {
            nodes[2 * j] = x - Math.cos(h) * seg * j;
            nodes[2 * j + 1] = y - Math.sin(h) * seg * j;
        }
        return {
            deep,
            warm: !!lk.warm,
            color: lk.body,
            spots: lk.S,
            L,
            seg,
            maxW: L * 0.16,
            scale,
            h,
            nodes,
            speed: 30,
            cruise: rnd(24, 38) * (0.75 + scale * 0.35),
            phase: rnd(0, TAU),
            finP: rnd(0, TAU),
            wander: rnd(-1, 1),
            startle: 0,
            fleeX: 0,
            fleeY: 0,
            gulp: 0,
            food: null,
            curious: rnd(0.4, 1),
            wakeT: 0
        };
    }
    function makePads() {
        pads = [];
        const n = W < 720 ? 2 : 3;
        for (let i = 0; i < n; i++) {
            const r = clamp(Math.min(W, H) * rnd(0.05, 0.075), 32, 70);
            let x,
                y,
                t = 0;
            do {
                x = rnd(r + 20, W - r - 20);
                y = rnd(r + 60, H - r - 60);
            } while (
                ++t < 80 &&
                (hitsRect(x, y, r + 30) ||
                    pads.some(p => Math.hypot(p.x - x, p.y - y) < p.r + r + 60))
            );
            pads.push({
                x,
                y,
                r,
                rot: rnd(0, TAU),
                vr: rnd(-0.04, 0.04),
                vx: rnd(-2.5, 2.5),
                vy: rnd(-2, 2),
                notch: rnd(0.4, 0.65),
                flower: i % 2 === 0,
                bob: 0
            });
        }
    }
    const gap = (a, b) => (a.maxW + b.maxW) * 1.3 + CELL * 1.5;
    const hitsRect = (x, y, m) =>
        rects.some(r => x > r.l - m && x < r.r + m && y > r.t - m && y < r.b + m);

    const ripple = (x, y, s) => ripples.push({ x, y, s, born: time });
    function feed(x, y) {
        ripple(x, y, 0.5);
        const n = Math.min(5 + ((Math.random() * 4) | 0), 30 - pellets.length);
        for (let i = 0; i < n; i++) {
            const a = rnd(0, TAU),
                s = rnd(10, 40);
            pellets.push({
                x: x + Math.cos(a) * s * 0.4,
                y: y + Math.sin(a) * s * 0.4,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                born: time,
                land: rnd(0.2, 0.45),
                landed: false
            });
        }
    }
    function eat(k, p) {
        pellets.splice(pellets.indexOf(p), 1);
        k.food = null;
        k.gulp = 1;
        ripple(p.x, p.y, 0.45);
        fcEl.textContent = ++fed;
    }
    function stepKoi(k, dt) {
        const n = k.nodes,
            hx = n[0],
            hy = n[1];
        let sx = Math.cos(k.h),
            sy = Math.sin(k.h),
            target = k.cruise,
            turn = 1.3;
        k.wander = clamp(k.wander + rnd(-1, 1) * dt * 2.2, -1.2, 1.2);
        sx += Math.cos(k.h + k.wander) * 0.7;
        sy += Math.sin(k.h + k.wander) * 0.7;
        const m = k.L * 0.45,
            ax = hx + Math.cos(k.h) * k.L * 0.4,
            ay = hy + Math.sin(k.h) * k.L * 0.4;
        if (ax < m) sx += (m - ax) / 25;
        if (ax > W - m) sx -= (ax - W + m) / 25;
        if (ay < m) sy += (m - ay) / 25;
        if (ay > H - m) sy -= (ay - H + m) / 25;
        for (const r of rects) {
            const nx = clamp(hx, r.l, r.r),
                ny = clamp(hy, r.t, r.b);
            let dx = hx - nx,
                dy = hy - ny,
                d = Math.hypot(dx, dy),
                R = 60 + k.L * 0.55;
            if (d === 0) {
                dx = hx - (r.l + r.r) / 2;
                dy = hy - (r.t + r.b) / 2;
                d = Math.hypot(dx, dy) || 1;
                sx += (dx / d) * 4;
                sy += (dy / d) * 4;
                target = k.cruise * 1.8;
            } else if (d < R) {
                const f = (1 - d / R) * 3;
                sx += (dx / d) * f;
                sy += (dy / d) * f;
            }
        }
        const ax2 = hx + Math.cos(k.h) * k.L * 0.3,
            ay2 = hy + Math.sin(k.h) * k.L * 0.3;
        const avoid = (ox, oy, cl, R) => {
            for (const [px, py, w] of [
                [hx, hy, 1],
                [ax2, ay2, 0.7]
            ]) {
                const dx = px - ox,
                    dy = py - oy,
                    d = Math.hypot(dx, dy);
                if (d < R && d > 0) {
                    const f = (1 - d / R) ** 2 * 6 * w;
                    sx += (dx / d) * f;
                    sy += (dy / d) * f;
                    if (d < cl * 1.4) target = Math.min(target, k.cruise * 0.8);
                }
            }
        };
        for (const o of koi) {
            if (o === k) continue;
            const cl = gap(k, o),
                R = cl + k.L * 0.5;
            for (let j = 0; j < N; j += 2) avoid(o.nodes[2 * j], o.nodes[2 * j + 1], cl, R);
        }
        for (const p of pads) {
            const cl = p.r + k.maxW * 1.3 + CELL;
            avoid(p.x, p.y, cl, cl + k.L * 0.4);
        }
        if (k.food && !pellets.includes(k.food)) k.food = null;
        if (!k.food) {
            let bd = 600 * 600;
            for (const p of pellets) {
                const d = (p.x - hx) ** 2 + (p.y - hy) ** 2;
                if (d < bd) {
                    bd = d;
                    k.food = p;
                }
            }
        }
        if (k.food) {
            const p = k.food,
                dx = p.x - hx,
                dy = p.y - hy,
                d = Math.hypot(dx, dy) || 1;
            sx += (dx / d) * 3.4;
            sy += (dy / d) * 3.4;
            target = k.cruise * (d < 70 ? 1.6 : 2.7);
            turn = 3.2;
            if (p.landed && d < k.maxW + 8) eat(k, p);
        } else if (pointer.active) {
            const dx = hx - pointer.x,
                dy = hy - pointer.y,
                d = Math.hypot(dx, dy) || 1;
            if (pointer.speed > 900 && d < 240 && k.startle <= 0) {
                k.startle = 0.8;
                k.fleeX = dx / d;
                k.fleeY = dy / d;
                ripple(hx, hy, 0.35);
            } else if (pointer.speed < 260 && d < 340 && d > 110) {
                sx -= (dx / d) * k.curious;
                sy -= (dy / d) * k.curious;
                target = k.cruise * 1.25;
            }
        }
        if (k.startle > 0) {
            k.startle -= dt;
            sx += k.fleeX * 5;
            sy += k.fleeY * 5;
            target = k.cruise * 5;
            turn = 5.5;
        }
        let da = Math.atan2(sy, sx) - k.h;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        k.h += clamp(da, -turn * dt, turn * dt);
        k.speed +=
            (target * (reduce ? 0.5 : 1) - k.speed) * Math.min(1, dt * (k.startle > 0 ? 6 : 1.6));
        const e = k.maxW * 1.5;
        n[0] = clamp(hx + Math.cos(k.h) * k.speed * dt, e, W - e);
        n[1] = clamp(hy + Math.sin(k.h) * k.speed * dt, e, H - e);
        const push = (ox, oy, cl) => {
            const dx = n[0] - ox,
                dy = n[1] - oy,
                d = Math.hypot(dx, dy) || 0.01;
            if (d < cl) {
                n[0] = ox + (dx / d) * cl;
                n[1] = oy + (dy / d) * cl;
            }
        };
        for (const o of koi) {
            if (o === k) continue;
            const cl = gap(k, o);
            for (let j = 0; j < N; j++) push(o.nodes[2 * j], o.nodes[2 * j + 1], cl);
        }
        for (const p of pads) push(p.x, p.y, p.r + k.maxW * 1.3 + CELL);
        n[0] = clamp(n[0], e, W - e);
        n[1] = clamp(n[1], e, H - e);
        for (let j = 1; j < N; j++) {
            const px = n[2 * j - 2],
                py = n[2 * j - 1],
                dx = n[2 * j] - px,
                dy = n[2 * j + 1] - py,
                d = Math.hypot(dx, dy) || 1;
            n[2 * j] = px + (dx / d) * k.seg;
            n[2 * j + 1] = py + (dy / d) * k.seg;
        }
        k.phase += dt * (2.2 + k.speed * 0.06);
        k.finP += dt * (1.6 + k.speed * 0.02);
        k.gulp = Math.max(0, k.gulp - dt * 2.5);
        k.wakeT -= dt;
        if (k.wakeT <= 0) {
            k.wakeT = 0.16;
            wake.push({ x: n[2 * (N - 1)], y: n[2 * (N - 1) + 1], born: time, deep: k.deep });
        }
    }
    function step(dt) {
        pointer.speed *= Math.exp(-6 * dt);
        for (const k of koi) stepKoi(k, dt);
        for (const p of pellets) {
            if (!p.landed && time - p.born > p.land) {
                p.landed = true;
                ripple(p.x, p.y, 0.1);
            }
            const f = Math.exp(-(p.landed ? 1.2 : 4) * dt);
            p.vx *= f;
            p.vy *= f;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        }
        pellets = pellets.filter(p => time - p.born < 18);
        ripples = ripples.filter(r => time - r.born < 1.6 + r.s * 2);
        wake = wake.filter(w => time - w.born < 2.4);
        for (const p of pads) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rot += p.vr * dt;
            p.bob = Math.max(0, p.bob - dt * 1.5);
            for (const k of koi)
                for (let j = 0; j < N; j += 3) {
                    const dx = p.x - k.nodes[2 * j],
                        dy = p.y - k.nodes[2 * j + 1],
                        d = Math.hypot(dx, dy) || 1,
                        cl = p.r + k.maxW * 1.3 + CELL;
                    if (d < cl) {
                        p.x += (dx / d) * (cl - d) * Math.min(1, dt * 6);
                        p.y += (dy / d) * (cl - d) * Math.min(1, dt * 6);
                    }
                }
            if (p.x < p.r || p.x > W - p.r) p.vx *= -1;
            if (p.y < p.r + 40 || p.y > H - p.r - 40) p.vy *= -1;
            for (const r of rects)
                if (p.x > r.l - p.r && p.x < r.r + p.r && p.y > r.t - p.r && p.y < r.b + p.r) {
                    const dx = p.x - (r.l + r.r) / 2,
                        dy = p.y - (r.t + r.b) / 2,
                        d = Math.hypot(dx, dy) || 1;
                    p.x += (dx / d) * 40 * dt;
                    p.y += (dy / d) * 40 * dt;
                }
        }
    }

    const D = new Float32Array(N * 2),
        NX = new Float32Array(N),
        NY = new Float32Array(N),
        WD = new Float32Array(N);
    const prof = t => Math.pow(Math.sin(Math.PI * (0.13 + 0.87 * t)), 0.75) * (1 - 0.5 * t);
    function leaf(g, bx, by, ang, len, wid) {
        const tx = bx + Math.cos(ang) * len,
            ty = by + Math.sin(ang) * len,
            px = -Math.sin(ang) * wid,
            py = Math.cos(ang) * wid,
            mx = bx + Math.cos(ang) * len * 0.5,
            my = by + Math.sin(ang) * len * 0.5;
        g.moveTo(bx, by);
        g.quadraticCurveTo(mx + px, my + py, tx, ty);
        g.quadraticCurveTo(mx - px * 0.5, my - py * 0.5, bx, by);
    }
    function geom(k) {
        const n = k.nodes;
        for (let j = 0; j < N; j++) {
            let dx, dy;
            if (j === 0) {
                dx = Math.cos(k.h);
                dy = Math.sin(k.h);
            } else {
                dx = n[2 * j - 2] - n[2 * j];
                dy = n[2 * j - 1] - n[2 * j + 1];
            }
            const d = Math.hypot(dx, dy) || 1;
            NX[j] = -dy / d;
            NY[j] = dx / d;
        }
        const amp = k.maxW * (0.4 + Math.min(1, k.speed / 120) * 0.3);
        for (let j = 0; j < N; j++) {
            const t = j / (N - 1),
                off = Math.sin(k.phase - j * 0.42) * amp * Math.pow(t, 1.3);
            D[2 * j] = n[2 * j] + NX[j] * off;
            D[2 * j + 1] = n[2 * j + 1] + NY[j] * off;
        }
        for (let j = 0; j < N; j++) {
            let dx, dy;
            if (j === 0) {
                dx = D[0] - D[2];
                dy = D[1] - D[3];
            } else {
                dx = D[2 * j - 2] - D[2 * j];
                dy = D[2 * j - 1] - D[2 * j + 1];
            }
            const d = Math.hypot(dx, dy) || 1;
            NX[j] = -dy / d;
            NY[j] = dx / d;
            WD[j] = k.maxW * prof(j / (N - 1)) * (j < 5 ? 1 + k.gulp * 0.14 : 1);
        }
    }
    function bodyPath() {
        const a = Math.atan2(NY[0], NX[0]);
        ctx.beginPath();
        ctx.arc(D[0], D[1], WD[0], a - Math.PI, a, false);
        const P = [];
        for (let j = 1; j < N; j++) P.push(D[2 * j] + NX[j] * WD[j], D[2 * j + 1] + NY[j] * WD[j]);
        for (let j = N - 1; j >= 1; j--)
            P.push(D[2 * j] - NX[j] * WD[j], D[2 * j + 1] - NY[j] * WD[j]);
        const m = P.length / 2;
        for (let i = 0; i < m - 1; i++)
            ctx.quadraticCurveTo(
                P[2 * i],
                P[2 * i + 1],
                (P[2 * i] + P[2 * i + 2]) / 2,
                (P[2 * i + 1] + P[2 * i + 3]) / 2
            );
        ctx.lineTo(P[2 * m - 2], P[2 * m - 1]);
        ctx.closePath();
    }
    function fins(k) {
        const back = j => Math.atan2(D[2 * j + 1] - D[2 * j - 1], D[2 * j] - D[2 * j - 2]);
        const j = 4,
            b = back(j),
            s = 0.95 + 0.25 * Math.sin(k.finP);
        leaf(
            ctx,
            D[2 * j] + NX[j] * WD[j] * 0.5,
            D[2 * j + 1] + NY[j] * WD[j] * 0.5,
            b - s,
            k.maxW * 1.3,
            k.maxW * 0.5
        );
        leaf(
            ctx,
            D[2 * j] - NX[j] * WD[j] * 0.5,
            D[2 * j + 1] - NY[j] * WD[j] * 0.5,
            b + s,
            k.maxW * 1.3,
            k.maxW * 0.5
        );
        const t = N - 3,
            bx = D[2 * t],
            by = D[2 * t + 1],
            tb = back(N - 1) + Math.sin(k.phase - 7) * 0.3,
            L = k.maxW * 1.9;
        leaf(ctx, bx, by, tb - 0.42, L, k.maxW * 0.45);
        leaf(ctx, bx, by, tb + 0.42, L, k.maxW * 0.45);
    }
    function rasterKoi(k) {
        geom(k);
        ctx.fillStyle = k.color;
        ctx.beginPath();
        fins(k);
        ctx.fill();
        bodyPath();
        ctx.fill();
        if (!k.spots.length) return;
        ctx.save();
        bodyPath();
        ctx.clip();
        for (const s of k.spots) {
            const f = s.t * (N - 1),
                j = Math.min(N - 2, f | 0),
                u = f - j;
            const cx = D[2 * j] + (D[2 * j + 2] - D[2 * j]) * u,
                cy = D[2 * j + 1] + (D[2 * j + 3] - D[2 * j + 1]) * u;
            const nx = NX[j] + (NX[j + 1] - NX[j]) * u,
                ny = NY[j] + (NY[j + 1] - NY[j]) * u,
                w = WD[j] + (WD[j + 1] - WD[j]) * u;
            const px = cx + nx * s.s * w,
                py = cy + ny * s.s * w,
                r = s.r * k.maxW,
                fx = ny,
                fy = -nx;
            ctx.fillStyle = s.c;
            ctx.beginPath();
            for (let q = 0; q < 12; q++) {
                const a = (q / 12) * TAU,
                    rr = r * (1 + s.w[2] * Math.sin(a * 2 + s.w[0])),
                    ex = Math.cos(a) * rr * 1.3,
                    ey = Math.sin(a) * rr;
                ctx.lineTo(px + fx * ex + nx * ey, py + fy * ex + ny * ey);
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
    function rasterPad(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const r = p.r * (1 + p.bob * 0.08 * Math.sin(time * 16));
        ctx.fillStyle = '#6c9a54';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, p.notch / 2, TAU - p.notch / 2);
        ctx.closePath();
        ctx.fill();
        if (p.flower) {
            const fr = r * 0.58;
            ctx.translate(-r * 0.15, r * 0.12);
            ctx.rotate(-p.rot * 0.5);
            ctx.fillStyle = '#efb2c0';
            for (let i = 0; i < 7; i++) {
                ctx.save();
                ctx.rotate((i / 7) * TAU);
                ctx.beginPath();
                ctx.ellipse(0, -fr * 0.48, fr * 0.26, fr * 0.48, 0, 0, TAU);
                ctx.fill();
                ctx.restore();
            }
            ctx.fillStyle = '#f0c54a';
            ctx.beginPath();
            ctx.arc(0, 0, fr * 0.2, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
    }

    function glyphAt(x, y, ch, col, a) {
        out.globalAlpha = a;
        out.fillStyle = col;
        out.fillText(ch, x * CELL + CELL / 2, y * CELL + CELL / 2 + 0.5);
    }
    function cells(g, faint, L) {
        const img = g.getImageData(0, 0, cols, rows).data;
        for (let y = 0, i = 0; y < rows; y++)
            for (let x = 0; x < cols; x++, i += 4) {
                const a = img[i + 3];
                if (a < 60) continue;
                const c = cls(L, img[i], img[i + 1], img[i + 2]);
                if (faint) {
                    out.globalAlpha = 0.12;
                    out.fillStyle = c.tile;
                    out.fillRect(x * CELL + 1, y * CELL + 1, CELL - 1, CELL - 1);
                    glyphAt(x, y, c.g, c.ink, 0.28);
                    continue;
                }
                if (a < 140) {
                    glyphAt(x, y, '・', c.ink, 0.35);
                    continue;
                }
                out.globalAlpha = 1;
                out.fillStyle = c.tile;
                out.fillRect(x * CELL + 1, y * CELL + 1, CELL - 1, CELL - 1);
                glyphAt(x, y, c.g, c.ink, 1);
            }
    }
    function draw() {
        for (const g of [dctx, tctx, wctx, pctx]) {
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.clearRect(0, 0, cols, rows);
            g.setTransform(1 / CELL, 0, 0, 1 / CELL, 0, 0);
        }
        ctx = dctx;
        for (const k of koi) if (k.deep) rasterKoi(k);
        ctx = tctx;
        for (const k of koi) if (!k.deep && !k.warm) rasterKoi(k);
        ctx = wctx;
        for (const k of koi) if (!k.deep && k.warm) rasterKoi(k);
        ctx = pctx;
        for (const p of pads) rasterPad(p);
        out.setTransform(dpr, 0, 0, dpr, 0, 0);
        out.clearRect(0, 0, W, H);
        out.font = `${Math.round(CELL * 0.8)}px DotGothic16, monospace`;
        out.textAlign = 'center';
        out.textBaseline = 'middle';
        for (const w of wake) {
            const p = (time - w.born) / 2.4;
            glyphAt(
                (w.x / CELL) | 0,
                (w.y / CELL) | 0,
                p < 0.4 ? '〜' : '・',
                '#8f897f',
                (1 - p) * (w.deep ? 0.22 : 0.4)
            );
        }
        cells(dctx, true, KOI_LUT);
        for (const r of ripples) {
            const age = time - r.born,
                life = 1.6 + r.s * 2,
                p = age / life,
                R = 6 + age * (38 + 70 * r.s),
                n = Math.max(8, Math.ceil((TAU * R) / CELL));
            for (let i = 0; i < n; i++) {
                const a = (i / n) * TAU;
                glyphAt(
                    ((r.x + Math.cos(a) * R) / CELL) | 0,
                    ((r.y + Math.sin(a) * R) / CELL) | 0,
                    p < 0.3 ? '〇' : '・',
                    '#7d9aa0',
                    (1 - p) * (0.3 + 0.5 * r.s)
                );
            }
        }
        cells(wctx, false, WARM_LUT);
        cells(tctx, false, PIED_LUT);
        cells(pctx, false, PAD_LUT);
        for (const p of pellets) {
            const x = (p.x / CELL) | 0,
                y = (p.y / CELL) | 0,
                fall = p.landed ? 0 : 1 - (time - p.born) / p.land;
            out.globalAlpha = 1;
            out.fillStyle = '#f2dcae';
            out.fillRect(x * CELL + 1, y * CELL + 1, CELL - 1, CELL - 1);
            glyphAt(x, y - ((fall * 2) | 0), '米', '#9a6a26', 1);
        }
        out.globalAlpha = 1;
    }

    const PAGES = ['home', 'menu', 'omakase', 'visit'];
    function measure() {
        rects = [...document.querySelectorAll('.chrome [data-avoid], .page.on [data-avoid]')]
            .map(el => el.getBoundingClientRect())
            .filter(r => r.width && r.height)
            .map(r => ({ l: r.left - 16, t: r.top - 16, r: r.right + 16, b: r.bottom + 16 }));
    }
    function go(name, first) {
        if (!PAGES.includes(name)) name = 'home';
        document.body.dataset.page = name;
        document
            .querySelectorAll('.page')
            .forEach(p => p.classList.toggle('on', p.dataset.page === name));
        document.querySelectorAll('.nav a').forEach(a => {
            if (a.getAttribute('href') === '#' + name) a.setAttribute('aria-current', 'page');
            else a.removeAttribute('aria-current');
        });
        document.title =
            name === 'home'
                ? 'Namiya · sushi & izakaya'
                : `${name[0].toUpperCase() + name.slice(1)} · Namiya`;
        if (first) return;
        setTimeout(() => {
            measure();
            for (const k of koi)
                for (const r of rects)
                    if (
                        k.nodes[0] > r.l &&
                        k.nodes[0] < r.r &&
                        k.nodes[1] > r.t &&
                        k.nodes[1] < r.b
                    ) {
                        const dx = k.nodes[0] - (r.l + r.r) / 2,
                            dy = k.nodes[1] - (r.t + r.b) / 2,
                            d = Math.hypot(dx, dy) || 1;
                        k.startle = 0.9;
                        k.fleeX = dx / d;
                        k.fleeY = dy / d;
                        ripple(k.nodes[0], k.nodes[1], 0.4);
                    }
        }, 140);
    }
    addEventListener('hashchange', () => go(location.hash.slice(1)));

    function resize() {
        W = innerWidth;
        H = innerHeight;
        dpr = Math.min(2, devicePixelRatio || 1);
        CELL = W < 720 ? 11 : 14;
        document.documentElement.style.setProperty('--cell', CELL + 'px');
        cv.width = W * dpr;
        cv.height = H * dpr;
        cols = Math.ceil(W / CELL);
        rows = Math.ceil(H / CELL);
        for (const c of [deepC, topC, warmC, padC]) {
            c.width = cols;
            c.height = rows;
        }
        measure();
        makePads();
        koi = [];
        const n = W < 720 ? 4 : 5;
        for (let i = 0; i < n; i++) koi.push(makeKoi(i));
        kcEl.textContent = koi.length;
    }
    const isUI = t => t.closest('a, button, input, label, form, [data-avoid]');
    addEventListener('pointermove', e => {
        const dt = (e.timeStamp - pointer.lt) / 1000;
        if (pointer.active && dt > 0 && dt < 0.2)
            pointer.speed =
                pointer.speed * 0.7 +
                (Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) / dt) * 0.3;
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        pointer.lt = e.timeStamp;
        pointer.active = !isUI(e.target);
    });
    addEventListener('pointerleave', () => {
        pointer.active = false;
    });
    addEventListener('click', e => {
        if (isUI(e.target)) return;
        const x = e.clientX,
            y = e.clientY;
        const hit = koi.find(
            k =>
                !k.deep &&
                [0, 3, 6, 9, 12, 15].some(
                    j => Math.hypot(k.nodes[2 * j] - x, k.nodes[2 * j + 1] - y) < k.maxW * 1.2
                )
        );
        if (hit) {
            hit.startle = 0.7;
            const d = Math.hypot(hit.nodes[0] - x, hit.nodes[1] - y) || 1;
            hit.fleeX = (hit.nodes[0] - x) / d;
            hit.fleeY = (hit.nodes[1] - y) / d;
            ripple(x, y, 0.7);
            return;
        }
        const pad = pads.find(p => Math.hypot(p.x - x, p.y - y) < p.r);
        if (pad) {
            pad.bob = 1;
            pad.vr += rnd(-0.4, 0.4);
            ripple(x, y, 0.25);
            return;
        }
        feed(x, y);
    });
    addEventListener('keydown', e => {
        if (e.key === 'Escape' && document.body.dataset.page !== 'home') location.hash = 'home';
    });
    let rt;
    addEventListener('resize', () => {
        clearTimeout(rt);
        rt = setTimeout(resize, 150);
    });
    document
        .querySelectorAll('.page')
        .forEach(p => p.addEventListener('scroll', measure, { passive: true }));
    setInterval(measure, 500);
    document.fonts && document.fonts.ready.then(measure);

    go(location.hash.slice(1) || 'home', true);
    let last = performance.now();
    function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        time += dt;
        step(dt);
        draw();
        requestAnimationFrame(frame);
    }
    resize();
    requestAnimationFrame(frame);
    window.pond = {
        feed,
        go,
        get koi() {
            return koi;
        },
        get fed() {
            return fed;
        }
    };
})();
