(() => {
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fmt = n => n.toLocaleString('en-US');

    const st = document.getElementById('statement');
    st.innerHTML = st.textContent
        .split(' ')
        .map(w => `<span class="w${/after\.?$/.test(w) ? ' hot' : ''}">${w}</span>`)
        .join(' ');
    const words = [...st.querySelectorAll('.w')];
    const lights = [...document.querySelectorAll('.light')];
    const onScroll = () => {
        const r = st.getBoundingClientRect(),
            p = clamp((innerHeight * 0.8 - r.top) / (r.height + innerHeight * 0.25)),
            n = Math.round(p * words.length);
        words.forEach((w, i) => w.classList.toggle('lit', i < n));
        document.body.classList.toggle(
            'light-nav',
            lights.some(s => {
                const b = s.getBoundingClientRect();
                return b.top <= 60 && b.bottom > 60;
            })
        );
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const cio = new IntersectionObserver(
        es =>
            es.forEach(e => {
                if (!e.isIntersecting) return;
                cio.unobserve(e.target);
                const el = e.target,
                    to = +el.dataset.count,
                    unit = el.querySelector('small')?.outerHTML || '',
                    t0 = performance.now(),
                    d = reduce ? 1 : 1400;
                const step = now => {
                    const t = clamp((now - t0) / d);
                    el.innerHTML = fmt(Math.round(to * (1 - Math.pow(1 - t, 4)))) + unit;
                    if (t < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            }),
        { threshold: 0.5 }
    );
    document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));

    const cmp = document.getElementById('compare');
    const setX = x => {
        x = clamp(x, 0.02, 0.98);
        cmp.style.setProperty('--x', (x * 100).toFixed(2) + '%');
        cmp.setAttribute('aria-valuenow', Math.round(x * 100));
    };
    const fromEvent = e => {
        const r = cmp.getBoundingClientRect();
        setX((e.clientX - r.left) / r.width);
    };
    cmp.addEventListener('pointerdown', e => {
        cmp.setPointerCapture(e.pointerId);
        fromEvent(e);
        cmp.onpointermove = fromEvent;
    });
    cmp.addEventListener('pointerup', () => {
        cmp.onpointermove = null;
    });
    cmp.addEventListener('keydown', e => {
        const cur = parseFloat(getComputedStyle(cmp).getPropertyValue('--x')) / 100;
        if (e.key === 'ArrowLeft') setX(cur - 0.05);
        if (e.key === 'ArrowRight') setX(cur + 0.05);
    });
    const sio = new IntersectionObserver(
        ([e]) => {
            if (!e.isIntersecting || reduce) return;
            sio.disconnect();
            const t0 = performance.now();
            const sweep = now => {
                const t = clamp((now - t0) / 1800);
                setX(0.5 + Math.sin(t * Math.PI * 2) * 0.3 * (1 - t));
                if (t < 1) requestAnimationFrame(sweep);
            };
            requestAnimationFrame(sweep);
        },
        { threshold: 0.6 }
    );
    sio.observe(cmp);

    const strip = document.getElementById('strip');
    document.getElementById('prev').onclick = () =>
        strip.scrollBy({ left: -420, behavior: 'smooth' });
    document.getElementById('next').onclick = () =>
        strip.scrollBy({ left: 420, behavior: 'smooth' });

    const opts = [...document.querySelectorAll('.opt')];
    opts.forEach(
        o =>
            (o.onclick = () => {
                opts.forEach(x => x.setAttribute('aria-pressed', x === o));
                const p = +o.dataset.price;
                document.getElementById('total').textContent = '$' + fmt(p);
                document.getElementById('monthly').textContent = `or $${(p / 12).toFixed(2)}/mo.`;
            })
    );
    let count = 0;
    const badge = document.getElementById('bagCount'),
        added = document.getElementById('added');
    document.getElementById('add').onclick = e => {
        const from = e.currentTarget.getBoundingClientRect(),
            to = document.querySelector('.bag').getBoundingClientRect();
        const dot = document.createElement('span');
        dot.className = 'fly';
        dot.style.left = from.left + from.width / 2 - 8 + 'px';
        dot.style.top = from.top + from.height / 2 - 8 + 'px';
        document.body.appendChild(dot);
        requestAnimationFrame(() => {
            dot.style.transform = `translate(${to.left + 2 - from.left - from.width / 2}px,${to.top + 2 - from.top - from.height / 2}px) scale(.5)`;
            dot.style.opacity = '.4';
        });
        setTimeout(
            () => {
                dot.remove();
                count++;
                badge.textContent = count;
                badge.classList.add('on');
            },
            reduce ? 0 : 800
        );
        added.classList.add('on');
    };
    window.obscura = Object.assign(window.obscura || {}, {
        addToBag: () => document.getElementById('add').click(),
        setCompare: setX
    });
})();
