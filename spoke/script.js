const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
};
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const C1 = css('--series-1'),
    C2 = css('--series-2');
const fmtK = n => (n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 0 : 0) + 'K' : String(Math.round(n)));
const fmt = n => Math.round(n).toLocaleString('en-US');
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RIDES = [210, 228, 305, 362, 431, 478, 512, 497, 455, 388, 196, 166].map(k => k * 1000);
const EBIKE = [0.31, 0.33, 0.36, 0.38, 0.41, 0.44, 0.47, 0.49, 0.52, 0.54, 0.56, 0.58];
const TOTAL = RIDES.reduce((a, b) => a + b, 0) + 140;
const g = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s));
const K = 0.73;
const weekday = h =>
    K *
    (22 +
        610 * g(h, 8.25, 0.85) +
        480 * g(h, 17.6, 1.25) +
        170 * g(h, 12.6, 1.4) +
        60 * g(h, 21, 2));
const weekend = h => K * (14 + 330 * g(h, 14, 3.1) + 70 * g(h, 21.5, 1.4) + 40 * g(h, 10.5, 1.2));
const QUARTERS = Array.from({ length: 96 }, (_, i) => i / 4);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYF = [0.96, 1, 1.03, 1.0, 0.91, 1.0, 0.86];
const hourly = (d, h) => 4 * (d < 5 ? weekday(h + 0.5) : weekend(h + 0.5)) * DAYF[d];

const tip = document.getElementById('tip');
function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
    tip.style.opacity = 1;
}
function hideTip() {
    tip.style.opacity = 0;
}

(() => {
    const cv = document.getElementById('streaks'),
        ctx = cv.getContext('2d');
    let W,
        H,
        dpr,
        parts = [];
    function size() {
        dpr = Math.min(devicePixelRatio || 1, 2);
        W = cv.clientWidth;
        H = cv.clientHeight;
        cv.width = W * dpr;
        cv.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        parts = Array.from({ length: Math.round((W * H) / 4200) }, spawn);
    }
    function spawn() {
        const x = Math.random() * W,
            y = Math.random() * H;
        return {
            x,
            y,
            trail: [x, y],
            age: 0,
            life: 120 + Math.random() * 260,
            c: Math.random() < 0.55 ? C1 : C2,
            w: Math.random() < 0.12 ? 2 : 1.1
        };
    }
    let t = 0;
    function frame() {
        t += 0.0016;
        ctx.clearRect(0, 0, W, H);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const p of parts) {
            const a =
                Math.sin(p.x * 0.0042 + t * 2) * 1.6 +
                Math.cos(p.y * 0.0051 - t) * 1.4 +
                Math.sin((p.x + p.y) * 0.0017);
            p.x += Math.cos(a) * 1.7;
            p.y += Math.sin(a) * 1.7;
            p.trail.push(p.x, p.y);
            if (p.trail.length > 60) p.trail.splice(0, 2);
            const fade = Math.min(1, p.age++ / 30, p.life / 30);
            ctx.strokeStyle = p.c;
            ctx.globalAlpha = 0.6 * fade;
            ctx.lineWidth = p.w;
            ctx.beginPath();
            ctx.moveTo(p.trail[0], p.trail[1]);
            for (let i = 2; i < p.trail.length; i += 2) ctx.lineTo(p.trail[i], p.trail[i + 1]);
            ctx.stroke();
            if (--p.life < 0 || p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40)
                Object.assign(p, spawn());
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(frame);
    }
    size();
    addEventListener('resize', size);
    if (reduced) {
        for (let i = 0; i < 240; i++) frame();
    } else frame();

    const num = document.getElementById('heroCount'),
        t0 = performance.now(),
        dur = reduced ? 1 : 2600;
    (function count(now) {
        const k = Math.min(1, (now - t0) / dur);
        num.textContent = fmt(TOTAL * ease(k));
        if (k < 1) requestAnimationFrame(count);
    })(t0);
})();

const month = (() => {
    const svg = document.getElementById('monthChart');
    const M = { l: 48, r: 12, t: 30, b: 30 },
        W = 640,
        H = 400,
        iw = W - M.l - M.r,
        ih = H - M.t - M.b;
    const max = 600000,
        y = v => M.t + ih - (v / max) * ih,
        band = iw / 12,
        bw = 24;
    const ax = el('g', { class: 'axis' }, svg);
    for (const v of [0, 200000, 400000, 600000]) {
        el('line', { x1: M.l, x2: W - M.r, y1: y(v), y2: y(v) }, ax);
        el('text', { x: M.l - 10, y: y(v) + 4, 'text-anchor': 'end' }, ax).textContent = v
            ? fmtK(v)
            : '0';
    }
    MONTHS.forEach(
        (m, i) =>
            (el(
                'text',
                { x: M.l + band * i + band / 2, y: H - 8, 'text-anchor': 'middle' },
                ax
            ).textContent = m)
    );

    const top = (x, y0, y1, w, r) => {
        const h = y0 - y1;
        r = Math.max(0, Math.min(r, h, w / 2));
        return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`;
    };
    const bars = RIDES.map((v, i) => {
        const gEl = el('g', {}, svg),
            x = M.l + band * i + (band - bw) / 2;
        const c = el('path', { fill: C1 }, gEl),
            e = el('path', { fill: C2 }, gEl);
        const hit = el(
            'rect',
            { x: M.l + band * i, y: M.t, width: band, height: ih, fill: 'transparent' },
            gEl
        );
        hit.addEventListener('pointermove', ev => {
            const split = cur.split > 0.5;
            showTip(
                `<b>${MONTHS[i]} 2026</b><br>${fmt(v)} rides` +
                    (split
                        ? `<br><span class="k" style="background:${C1}"></span>Classic ${fmt(v * (1 - EBIKE[i]))}<br><span class="k" style="background:${C2}"></span>E-bike ${fmt(v * EBIKE[i])} (${Math.round(EBIKE[i] * 100)}%)`
                        : ''),
                ev.clientX,
                ev.clientY
            );
        });
        hit.addEventListener('pointerleave', hideTip);
        return { gEl, c, e, x, v };
    });
    const note = el('g', { opacity: 0 }, svg),
        noteLine = el('line', { stroke: '#121212', 'stroke-width': 1 }, note);
    const noteT1 = el('text', { class: 'lbl', 'text-anchor': 'middle' }, note),
        noteT2 = el('text', { class: 'lbl-2', 'text-anchor': 'middle' }, note);
    const peak = el('text', { class: 'lbl', 'text-anchor': 'middle' }, svg);

    const STATES = [
        { grow: 1, split: 0, focus: -1, note: null },
        { grow: 1, split: 0, focus: 10, note: ['Storm Ilse', '11 days of closures'] },
        { grow: 1, split: 1, focus: -1, note: null },
        { grow: 1, split: 1, focus: 8, note: ['52% e-bike', 'first majority month'] }
    ];
    let cur = { grow: 0, split: 0, focus: -1 },
        from = { ...cur },
        target = STATES[0],
        t0 = 0,
        anim = 0,
        step = -1;
    function render(s) {
        bars.forEach((b, i) => {
            const v = b.v * s.grow,
                eShare = EBIKE[i] * s.split,
                cv = v * (1 - eShare),
                y0 = y(0),
                yc = y(cv);
            const eH = y(cv) - y(v),
                gap = Math.min(2, eH);
            b.c.setAttribute('d', top(b.x, y0, yc, bw, Math.max(0, 4 - eH * 2)));
            b.e.setAttribute('d', eH > 0.5 ? top(b.x, yc - gap, y(v), bw, 4) : '');
            const dim = s.focusMix * (i === s.focusIdx ? 0 : 0.72);
            b.gEl.setAttribute('opacity', 1 - dim);
        });
        const j = RIDES.indexOf(Math.max(...RIDES));
        peak.setAttribute('x', bars[j].x + bw / 2);
        peak.setAttribute('y', y(RIDES[j] * s.grow) - 8);
        peak.textContent = '512K';
        peak.setAttribute('opacity', s.grow * (1 - s.focusMix));
    }
    function frameState(now) {
        const k = reduced ? 1 : ease(Math.min(1, (now - t0) / 900));
        const s = {
            grow: from.grow + (target.grow - from.grow) * k,
            split: from.split + (target.split - from.split) * k
        };
        const fIn = target.focus >= 0 ? k : 0,
            fOut = from.focus >= 0 && from.focus !== target.focus ? 1 - k : 0;
        s.focusMix = Math.max(fIn, fOut);
        s.focusIdx = fIn >= fOut ? target.focus : from.focus;
        render(s);
        cur = { grow: s.grow, split: s.split, focus: k === 1 ? target.focus : cur.focus };
        if (k < 1) anim = requestAnimationFrame(frameState);
        else {
            cur.focus = target.focus;
            placeNote();
        }
    }
    function placeNote() {
        if (!target.note) {
            note.setAttribute('opacity', 0);
            return;
        }
        const b = bars[target.focus],
            x = b.x + bw / 2,
            yt = y(b.v) - 16;
        const ny = Math.max(M.t + 10, yt - 54);
        noteLine.setAttribute('x1', x);
        noteLine.setAttribute('x2', x);
        noteLine.setAttribute('y1', ny + 26);
        noteLine.setAttribute('y2', yt);
        noteT1.setAttribute('x', x);
        noteT1.setAttribute('y', ny);
        noteT1.textContent = target.note[0];
        noteT2.setAttribute('x', x);
        noteT2.setAttribute('y', ny + 16);
        noteT2.textContent = target.note[1];
        note.style.transition = 'opacity .4s';
        note.setAttribute('opacity', 1);
    }
    function go(i) {
        if (i === step) return;
        step = i;
        target = STATES[i];
        from = { ...cur };
        t0 = performance.now();
        note.setAttribute('opacity', 0);
        cancelAnimationFrame(anim);
        anim = requestAnimationFrame(frameState);
        document.getElementById('monthLegend').style.opacity = target.split ? 1 : 0;
        document.getElementById('monthSub').textContent = target.split
            ? 'Classic vs e-bike'
            : 'All bike types';
    }
    render({ grow: 0, split: 0, focusMix: 0, focusIdx: -1 });
    document.getElementById('monthTable').innerHTML =
        '<tr><th>Month</th><th>Rides</th><th>E-bike share</th></tr>' +
        RIDES.map(
            (v, i) =>
                `<tr><td>${MONTHS[i]}</td><td>${fmt(v)}</td><td>${Math.round(EBIKE[i] * 100)}%</td></tr>`
        ).join('');
    return { go };
})();
const stepEls = [...document.querySelectorAll('.step')];
let chartSeen = false;
function syncStep() {
    if (!chartSeen) return;
    let k = 0;
    stepEls.forEach((s, i) => {
        if (s.getBoundingClientRect().top < innerHeight * 0.55) k = i;
    });
    stepEls.forEach((s, i) => s.classList.toggle('on', i === k));
    month.go(k);
}
addEventListener('scroll', syncStep, { passive: true });
addEventListener('resize', syncStep);
new IntersectionObserver(
    (es, o) => {
        if (es[0].isIntersecting) {
            o.disconnect();
            chartSeen = true;
            syncStep();
        }
    },
    { threshold: 0.3 }
).observe(document.getElementById('monthFig'));

(() => {
    const svg = document.getElementById('hourChart');
    const M = { l: 48, r: 90, t: 20, b: 32 },
        W = 1080,
        H = 380,
        iw = W - M.l - M.r,
        ih = H - M.t - M.b;
    const wd = QUARTERS.map(weekday),
        we = QUARTERS.map(weekend),
        max = 600;
    const x = h => M.l + (h / 24) * iw,
        y = v => M.t + ih - (v / max) * ih;
    const ax = el('g', { class: 'axis' }, svg);
    for (const v of [0, 150, 300, 450, 600]) {
        el('line', { x1: M.l, x2: M.l + iw, y1: y(v), y2: y(v) }, ax);
        el('text', { x: M.l - 10, y: y(v) + 4, 'text-anchor': 'end' }, ax).textContent = v;
    }
    for (let h = 0; h <= 24; h += 3)
        el('text', { x: x(h), y: H - 8, 'text-anchor': 'middle' }, ax).textContent =
            h === 24 ? '' : (h % 12 || 12) + (h < 12 ? ' am' : ' pm');
    const path = d =>
        d
            .map((v, i) => (i ? 'L' : 'M') + x(QUARTERS[i]).toFixed(1) + ',' + y(v).toFixed(1))
            .join('');
    const area = el(
        'path',
        {
            d: path(wd) + `L${x(QUARTERS.at(-1))},${y(0)}L${x(0)},${y(0)}Z`,
            fill: C1,
            'fill-opacity': 0.1
        },
        svg
    );
    const lines = [
        [wd, C1, 'Weekday'],
        [we, C2, 'Weekend']
    ].map(([d, c, name]) => {
        const p = el(
            'path',
            {
                d: path(d),
                fill: 'none',
                stroke: c,
                'stroke-width': 2,
                'stroke-linejoin': 'round',
                'stroke-linecap': 'round'
            },
            svg
        );
        const end = el(
            'circle',
            {
                cx: x(QUARTERS.at(-1)),
                cy: y(d.at(-1)),
                r: 4,
                fill: c,
                stroke: '#fbfaf7',
                'stroke-width': 2
            },
            svg
        );
        return { p, end, d, c, name };
    });
    el(
        'text',
        { x: x(QUARTERS.at(-1)) + 10, y: y(wd.at(-1)) - 4, class: 'lbl-2' },
        svg
    ).textContent = 'Weekday';
    el(
        'text',
        { x: x(QUARTERS.at(-1)) + 10, y: y(we.at(-1)) + 14, class: 'lbl-2' },
        svg
    ).textContent = 'Weekend';
    const pk = wd.indexOf(Math.max(...wd)),
        pkT = QUARTERS[pk],
        hh = Math.floor(pkT),
        mm = Math.round((pkT - hh) * 60);
    const pkLabel = `${hh}:${String(mm).padStart(2, '0')}`;
    document.getElementById('rhythmHead').textContent = `The city breathes in at ${pkLabel}.`;
    el(
        'circle',
        { cx: x(pkT), cy: y(wd[pk]), r: 4, fill: C1, stroke: '#fbfaf7', 'stroke-width': 2 },
        svg
    );
    el('text', { x: x(pkT) + 10, y: y(wd[pk]) + 4, class: 'lbl' }, svg).textContent =
        `${pkLabel} am · ${Math.round(wd[pk])} rides`;
    const wk = we.indexOf(Math.max(...we));
    el(
        'text',
        { x: x(QUARTERS[wk]), y: y(we[wk]) - 12, class: 'lbl-2', 'text-anchor': 'middle' },
        svg
    ).textContent = 'Weekend peak, 2 pm';

    lines.forEach(l => {
        const L = l.p.getTotalLength();
        l.p.style.strokeDasharray = L;
        l.p.style.strokeDashoffset = reduced ? 0 : L;
    });
    area.style.opacity = 0;
    new IntersectionObserver(
        (es, io) =>
            es.forEach(e => {
                if (!e.isIntersecting) return;
                io.disconnect();
                lines.forEach((l, i) => {
                    l.p.style.transition = `stroke-dashoffset 2.2s cubic-bezier(.4,0,.2,1) ${i * 0.25}s`;
                    l.p.style.strokeDashoffset = 0;
                });
                area.style.transition = 'opacity 1.2s 1.2s';
                area.style.opacity = 1;
            }),
        { threshold: 0.4 }
    ).observe(svg);

    const cross = el(
        'line',
        { y1: M.t, y2: M.t + ih, stroke: '#121212', 'stroke-width': 1, opacity: 0 },
        svg
    );
    const dots = lines.map(l =>
        el('circle', { r: 5, fill: l.c, stroke: '#fbfaf7', 'stroke-width': 2, opacity: 0 }, svg)
    );
    const hit = el('rect', { x: M.l, y: M.t, width: iw, height: ih, fill: 'transparent' }, svg);
    hit.addEventListener('pointermove', ev => {
        const pt = svg.createSVGPoint();
        pt.x = ev.clientX;
        pt.y = ev.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        const i = Math.max(0, Math.min(95, Math.round(((p.x - M.l) / iw) * 96))),
            h = QUARTERS[i];
        cross.setAttribute('x1', x(h));
        cross.setAttribute('x2', x(h));
        cross.setAttribute('opacity', 0.35);
        lines.forEach((l, k) => {
            dots[k].setAttribute('cx', x(h));
            dots[k].setAttribute('cy', y(l.d[i]));
            dots[k].setAttribute('opacity', 1);
        });
        const hh = Math.floor(h),
            mm = (h - hh) * 60,
            lab = `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`;
        showTip(
            `<b>${lab}</b><br>` +
                lines
                    .map(
                        l =>
                            `<span class="k" style="background:${l.c}"></span>${l.name} ${Math.round(l.d[i])}`
                    )
                    .join('<br>'),
            ev.clientX,
            ev.clientY
        );
    });
    hit.addEventListener('pointerleave', () => {
        hideTip();
        cross.setAttribute('opacity', 0);
        dots.forEach(d => d.setAttribute('opacity', 0));
    });

    document.getElementById('hourTable').innerHTML =
        '<tr><th>Time</th><th>Weekday</th><th>Weekend</th></tr>' +
        QUARTERS.filter((_, i) => i % 4 === 0)
            .map(
                h =>
                    `<tr><td>${String(h).padStart(2, '0')}:00</td><td>${Math.round(weekday(h))}</td><td>${Math.round(weekend(h))}</td></tr>`
            )
            .join('');
    const dayWd = wd.reduce((a, b) => a + b, 0),
        dayWe = we.reduce((a, b) => a + b, 0);
    document.getElementById('rhythmNote').innerHTML =
        `<div><b>${pkLabel} am</b>busiest 15 minutes of a weekday</div><div><b>${fmt(dayWd)}</b>rides on an average weekday</div><div><b>${fmt(dayWe)}</b>on an average weekend day, spread over the afternoon</div>`;
})();

(() => {
    const svg = document.getElementById('heat');
    const M = { l: 44, r: 6, t: 8, b: 26 },
        W = 760,
        H = 300,
        cw = (W - M.l - M.r) / 24,
        ch = (H - M.t - M.b) / 7;
    const ramp = [
        '#cde2fb',
        '#b7d3f6',
        '#9ec5f4',
        '#86b6ef',
        '#6da7ec',
        '#5598e7',
        '#3987e5',
        '#2a78d6',
        '#256abf',
        '#1c5cab',
        '#184f95',
        '#104281',
        '#0d366b'
    ];
    let max = 0;
    for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) max = Math.max(max, hourly(d, h));
    const ax = el('g', { class: 'axis' }, svg);
    DAYS.forEach(
        (d, i) =>
            (el(
                'text',
                { x: M.l - 10, y: M.t + ch * i + ch / 2 + 4, 'text-anchor': 'end' },
                ax
            ).textContent = d)
    );
    for (let h = 0; h < 24; h += 3)
        el(
            'text',
            { x: M.l + cw * h + cw / 2, y: H - 6, 'text-anchor': 'middle' },
            ax
        ).textContent = (h % 12 || 12) + (h < 12 ? 'a' : 'p');
    const cells = [];
    for (let d = 0; d < 7; d++)
        for (let h = 0; h < 24; h++) {
            const v = hourly(d, h),
                c = ramp[Math.min(ramp.length - 1, Math.floor(Math.sqrt(v / max) * ramp.length))];
            const r = el(
                'rect',
                {
                    x: M.l + cw * h + 1,
                    y: M.t + ch * d + 1,
                    width: cw - 2,
                    height: ch - 2,
                    rx: 3,
                    fill: c
                },
                svg
            );
            r.style.cursor = 'pointer';
            r.addEventListener('pointermove', ev =>
                showTip(
                    `<b>${DAYS[d]} · ${h % 12 || 12}${h < 12 ? ' am' : ' pm'}</b><br>${fmt(v)} rides / hour`,
                    ev.clientX,
                    ev.clientY
                )
            );
            r.addEventListener('pointerleave', hideTip);
            r.addEventListener('click', () => set(d, h));
            cells.push(r);
        }
    const ring = el(
        'rect',
        {
            width: cw + 4,
            height: ch + 4,
            rx: 5,
            fill: 'none',
            stroke: '#121212',
            'stroke-width': 2
        },
        svg
    );
    ring.style.transition = 'x .35s cubic-bezier(.2,.7,.2,1), y .35s cubic-bezier(.2,.7,.2,1)';

    const daysEl = document.getElementById('days'),
        hourIn = document.getElementById('hour');
    const btns = DAYS.map((d, i) => {
        const b = document.createElement('button');
        b.textContent = d;
        b.setAttribute('aria-pressed', 'false');
        b.onclick = () => set(i, +hourIn.value);
        daysEl.appendChild(b);
        return b;
    });
    const riders = document.getElementById('riders'),
        dots = Array.from({ length: 60 }, () => riders.appendChild(document.createElement('i')));
    let day = 1,
        shown = 0;
    function set(d, h) {
        day = d;
        hourIn.value = h;
        btns.forEach((b, i) => b.setAttribute('aria-pressed', i === d));
        ring.setAttribute('x', M.l + cw * h - 1);
        ring.setAttribute('y', M.t + ch * d - 1);
        const label = `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`,
            n = Math.round(hourly(d, h) / 10) * 10;
        document.getElementById('hourLbl').textContent = label;
        const onRoad = Math.max(10, Math.round((n * 14) / 60 / 10) * 10);
        const from = shown,
            t0 = performance.now(),
            sent = document.getElementById('youSentence');
        (function tick(now) {
            const k = reduced ? 1 : Math.min(1, (now - t0) / 500);
            const v = from + (onRoad - from) * ease(k);
            shown = v;
            sent.innerHTML = `On a ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][d]} at ${label}, about <b>${fmt(v)}</b> people are riding with you.`;
            if (k < 1) requestAnimationFrame(tick);
        })(t0);
        const lit = Math.min(60, Math.round(onRoad / 10));
        dots.forEach((e, i) => e.classList.toggle('on', i < lit));
    }
    hourIn.addEventListener('input', () => set(day, +hourIn.value));
    set(1, 8);
})();

const io = new IntersectionObserver(
    es =>
        es.forEach(e => {
            if (!e.isIntersecting) return;
            e.target.classList.add('in');
            io.unobserve(e.target);
            e.target.querySelectorAll('[data-count]').forEach(n => {
                const to = +n.dataset.count,
                    t0 = performance.now();
                (function f(now) {
                    const k = reduced ? 1 : Math.min(1, (now - t0) / 1400);
                    n.textContent = fmt(to * ease(k)) + n.dataset.suffix;
                    if (k < 1) requestAnimationFrame(f);
                })(t0);
            });
        }),
    { threshold: 0.2 }
);
document.querySelectorAll('.reveal').forEach(e => io.observe(e));
const bar = document.getElementById('progress');
addEventListener(
    'scroll',
    () => {
        const k = scrollY / (document.documentElement.scrollHeight - innerHeight);
        bar.style.transform = `scaleX(${k})`;
    },
    { passive: true }
);

window.story = { month };
