(() => {
    'use strict';

    const CONFIG = {
        image: document.getElementById('pizza').getAttribute('src'),
        colors: { paper: '#f4ebd6', ink: '#b7261c', box: '#c92d21' },
        font: 'Fraunces',
        framing: { width: 0.72, height: 0.7, max: 690 },
        lidAngle: 108,
        tilt: 19,
        openTilt: 12,
        closedTurn: -9,
        openTurn: -4,
        openScale: 0.89,
        openShift: 0.12,
        dragDistance: 230,
        timing: { hold: 700, open: 1600, settle: 700, finalHold: 2000 }
    };

    const $ = id => document.getElementById(id),
        hero = $('hero'),
        stage = $('stage'),
        box = $('box'),
        lid = $('lid'),
        position = $('position'),
        pizza = $('pizza'),
        toggle = $('toggle'),
        motion = matchMedia('(prefers-reduced-motion: reduce)');

    let progress = 0,
        size = 440,
        frame = 0,
        timer = 0,
        deadline = 0,
        generation = 0,
        settlePromise = null,
        drag = null,
        isReady = false;

    const faceFront = document.querySelector('.lid-front'),
        faceBack = document.querySelector('.lid-back');

    const probes = [
        [0, 0],
        [100, 0],
        [0, 100]
    ].map(([x, y]) => {
        const el = document.createElement('i');
        el.className = 'face-probe';
        el.style.left = x + '%';
        el.style.top = y + '%';
        el.setAttribute('aria-hidden', 'true');
        lid.append(el);
        return el;
    });
    window.boxErrors = [];
    addEventListener('error', e => window.boxErrors.push(e.message));

    const clamp = v => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(1, Number(v))) : 0);

    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    function paint(v) {
        progress = clamp(v);
        const p = progress,
            relax = Math.max(0, (p - 0.3) / 0.7);
        lid.style.transform = `translateZ(27px) rotateX(${CONFIG.lidAngle * p}deg)`;
        box.style.transform = `rotateX(${CONFIG.tilt + (CONFIG.openTilt - CONFIG.tilt) * p}deg) rotateZ(${CONFIG.closedTurn + (CONFIG.openTurn - CONFIG.closedTurn) * p}deg) scale(${1 - (1 - CONFIG.openScale) * p})`;
        position.style.top = `calc(52% + ${size * CONFIG.openShift * p}px)`;
        const [a, b, c] = probes.map(el => el.getBoundingClientRect());
        const front = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) >= 0;
        faceFront.style.visibility = front ? 'visible' : 'hidden';
        faceBack.style.visibility = front ? 'hidden' : 'visible';
        $('leftFlap').style.transform = `rotateY(${-90 - 78 * relax}deg)`;
        $('rightFlap').style.transform = `rotateY(${90 + 78 * relax}deg)`;
        $('shadow').style.opacity = String(Math.sin(Math.PI * p) * 0.65);
        $('shadow').style.transform = `translateZ(8px) scaleY(${1 - p * 0.8})`;
        $('ground').style.opacity = String(0.22 - p * 0.04);
        toggle.innerHTML =
            p > 0.5 ? 'Close the box <span>↙</span>' : 'Open the box <span>↗</span>';
        toggle.setAttribute('aria-pressed', String(p > 0.5));
        $('hint').textContent =
            p > 0.5 ? 'Good things are better shared' : 'Or drag the lid upward';
        $('scrub').value = String(p);
    }

    function resize() {
        size = Math.max(
            180,
            Math.min(
                hero.clientWidth * (hero.clientWidth < 600 ? 0.83 : CONFIG.framing.width),
                hero.clientHeight * CONFIG.framing.height,
                CONFIG.framing.max
            )
        );
        document.documentElement.style.setProperty('--size', size + 'px');
        paint(progress);
    }

    function stop() {
        if (drag) {
            const id = drag.id;
            drag = null;
            stage.classList.remove('dragging');
            if (stage.hasPointerCapture(id)) stage.releasePointerCapture(id);
        }
        generation++;
        cancelAnimationFrame(frame);
        clearTimeout(timer);
        clearTimeout(deadline);
        if (settlePromise) {
            settlePromise({ cancelled: true });
            settlePromise = null;
        }
        return generation;
    }

    function schedule(fn) {
        if (document.hidden) timer = setTimeout(() => fn(performance.now()), 16);
        else frame = requestAnimationFrame(fn);
    }

    function tween(target, duration = 1000) {
        stop();
        if (motion.matches) {
            paint(target);
            return;
        }
        const from = progress,
            start = performance.now(),
            token = generation;
        function tick(now) {
            if (token !== generation) return;
            const t = Math.min(1, (now - start) / duration);
            paint(from + (target - from) * ease(t));
            if (t < 1) schedule(tick);
        }
        schedule(tick);
    }

    function reset() {
        stop();
        drag = null;
        stage.classList.remove('dragging');
        paint(0);
    }

    const imageReady = new Promise((resolve, reject) => {
        const loaded = () =>
            pizza.naturalWidth ? resolve() : reject(new Error('Pizza image unavailable'));
        if (pizza.complete) loaded();
        else {
            pizza.addEventListener('load', loaded, { once: true });
            pizza.addEventListener('error', () => reject(new Error('Pizza image unavailable')), {
                once: true
            });
        }
    });

    const ready = Promise.all([
        imageReady,
        document.fonts.load('800 24px Fraunces'),
        document.fonts.ready
    ])
        .then(() => {
            isReady = true;
            resize();
            return new Promise(resolve => {
                if (document.hidden) resolve({ ready: true });
                else requestAnimationFrame(() => resolve({ ready: true }));
            });
        })
        .catch(error => {
            $('diagnostic').hidden = false;
            $('diagnostic').textContent =
                'The artwork could not load. Please reload to open the box.';
            toggle.disabled = true;
            throw error;
        });
    ready.catch(() => {});

    async function play() {
        const token = stop();
        await ready;
        if (token !== generation) return { cancelled: true };
        paint(0);
        if (motion.matches) {
            paint(1);
            return { reducedMotion: true };
        }
        return new Promise(resolve => {
            settlePromise = resolve;
            const start = performance.now(),
                t = CONFIG.timing,
                total = t.hold + t.open + t.settle + t.finalHold;
            function done() {
                if (token !== generation) return;
                cancelAnimationFrame(frame);
                clearTimeout(timer);
                clearTimeout(deadline);
                paint(1);
                settlePromise = null;
                resolve({ complete: true });
            }
            function tick(now) {
                if (token !== generation) return;
                const elapsed = now - start;
                paint(elapsed < t.hold ? 0 : ease(Math.min(1, (elapsed - t.hold) / t.open)));
                if (elapsed >= total) done();
                else schedule(tick);
            }
            deadline = setTimeout(done, total);
            schedule(tick);
        });
    }

    stage.addEventListener('pointerdown', e => {
        if (!isReady || e.button !== 0) return;
        stop();
        drag = { id: e.pointerId, y: e.clientY, x: e.clientX, p: progress };
        stage.setPointerCapture(e.pointerId);
        stage.classList.add('dragging');
    });

    stage.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        const next = clamp(
            drag.p + (drag.y - e.clientY) / Math.min(CONFIG.dragDistance, size * 0.55)
        );
        paint(motion.matches ? (next > 0.5 ? 1 : 0) : next);
    });

    function end(e, cancelled) {
        if (!drag || e.pointerId !== drag.id) return;
        const moved = Math.hypot(e.clientY - drag.y, e.clientX - drag.x);
        drag = null;
        stage.classList.remove('dragging');
        if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
        tween(cancelled ? 0 : moved < 5 ? (progress > 0.5 ? 0 : 1) : progress > 0.32 ? 1 : 0, 750);
    }

    stage.addEventListener('pointerup', e => end(e, false));

    stage.addEventListener('pointercancel', e => end(e, true));

    stage.addEventListener('lostpointercapture', () => {
        if (drag) {
            drag = null;
            stage.classList.remove('dragging');
            tween(0, 500);
        }
    });

    toggle.addEventListener('click', () => {
        if (isReady) tween(progress > 0.5 ? 0 : 1, 1300);
    });
    addEventListener('resize', resize);

    motion.addEventListener('change', () => {
        stop();
        paint(progress > 0.5 ? 1 : 0);
    });
    $('position').style.touchAction = 'none';

    if (new URLSearchParams(location.search).has('debug')) $('debug').hidden = false;
    $('play').onclick = play;
    $('reset').onclick = reset;
    $('scrub').oninput = e => {
        stop();
        paint(e.target.value);
    };
    window.boxDemo = {
        ready,
        reset,
        play,
        setProgress(v) {
            stop();
            paint(v);
        },
        get progress() {
            return progress;
        },
        config: CONFIG
    };
    window.pizzaDemo = window.boxDemo;
    $('back').addEventListener('click', reset);
    resize();
})();
