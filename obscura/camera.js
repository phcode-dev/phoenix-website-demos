import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MODEL_URI = 'models/camera.gltf';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sticky = document.getElementById('stageSticky'),
    section = document.getElementById('stage'),
    canvas = document.getElementById('gl');
const loaderBar = document.querySelector('#loader i');

let renderer;
try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
    sticky.classList.add('no-gl');
}

const toCanvas = img => {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    return c;
};
const swapMap = (mat, slot, draw, srgb) => {
    const tex = mat[slot];
    if (!tex || !tex.image) return;
    const c = toCanvas(tex.image);
    draw(c.getContext('2d'), c.width / 2048);
    const t = new THREE.CanvasTexture(c);
    t.flipY = tex.flipY;
    t.wrapS = tex.wrapS;
    t.wrapT = tex.wrapT;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    mat[slot] = t;
    mat.needsUpdate = true;
};
const engrave = (g, s, lines, cx, cy, size, gap, rot) => {
    g.save();
    g.translate(cx * s, cy * s);
    g.rotate(rot);
    g.fillStyle = '#e4e4e2';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    lines.forEach(([txt, sz, track], i) => {
        g.font = `600 ${sz * s}px "Helvetica Neue",Helvetica,Arial,sans-serif`;
        g.letterSpacing = `${track * s}px`;
        g.fillText(txt, 0, (i - (lines.length - 1) / 2) * gap * s);
    });
    g.restore();
};
const patchARM = (mat, rect) => {
    const tex = mat.roughnessMap || mat.metalnessMap || mat.aoMap;
    if (!tex || !tex.image) return;
    const c = toCanvas(tex.image),
        g = c.getContext('2d'),
        s = c.width / 2048,
        [x, y, w, h] = rect.map(v => v * s);
    const band = g.getImageData(x, Math.max(0, y - 8 * s), w, 6 * s).data;
    let r = 0,
        gg = 0,
        b = 0,
        n = band.length / 4;
    for (let i = 0; i < band.length; i += 4) {
        r += band[i];
        gg += band[i + 1];
        b += band[i + 2];
    }
    g.fillStyle = `rgb(${(r / n) | 0},${(gg / n) | 0},${(b / n) | 0})`;
    g.fillRect(x, y, w, h);
    const t = new THREE.CanvasTexture(c);
    t.flipY = tex.flipY;
    t.wrapS = tex.wrapS;
    t.wrapT = tex.wrapT;
    t.anisotropy = 8;
    ['aoMap', 'roughnessMap', 'metalnessMap'].forEach(k => {
        if (mat[k] === tex) mat[k] = t;
    });
    mat.needsUpdate = true;
};
function rebrand(mat) {
    if (mat.name === 'Camera_01_body') patchARM(mat, [1252, 1146, 520, 230]);
    if (mat.name === 'Camera_01_lens_body') patchARM(mat, [28, 424, 1160, 40]);
    if (mat.name === 'Camera_01_body') {
        swapMap(
            mat,
            'map',
            (g, s) => {
                g.fillStyle = '#0b0b0b';
                g.fillRect(1252 * s, 1146 * s, 520 * s, 230 * s);
                engrave(
                    g,
                    s,
                    [
                        ['OBSCURA OPTICAL', 21, 3],
                        ['NIGHT CAMERA', 13, 3],
                        ['M1 — 000001', 19, 3]
                    ],
                    1480,
                    1262,
                    0,
                    34,
                    Math.PI
                );
            },
            true
        );
        swapMap(
            mat,
            'normalMap',
            (g, s) => {
                g.fillStyle = 'rgb(128,128,255)';
                g.fillRect(1252 * s, 1146 * s, 520 * s, 230 * s);
            },
            false
        );
    }
    if (mat.name === 'Camera_01_lens_body') {
        swapMap(
            mat,
            'map',
            (g, s) => {
                g.fillStyle = '#0c0c0c';
                g.fillRect(28 * s, 424 * s, 1160 * s, 40 * s);
                g.fillStyle = '#ececec';
                g.font = `600 ${27 * s}px "Helvetica Neue",Helvetica,Arial,sans-serif`;
                g.letterSpacing = `${3 * s}px`;
                g.textBaseline = 'middle';
                g.fillText('OBSCURA', 48 * s, 445 * s);
                g.fillText('NOCT 1:1.2/50 ASPH.', 258 * s, 445 * s);
                g.fillText('E 46', 840 * s, 445 * s);
                g.fillText('0000001', 1036 * s, 445 * s);
                const x = 1650 * s,
                    y = 190 * s,
                    w = 2048 * s - x,
                    h = 760 * s,
                    d = g.getImageData(x, y, w, h),
                    p = d.data;
                for (let i = 0; i < p.length; i += 4)
                    if (p[i] > 120 && p[i + 1] < 90 && p[i + 2] < 90) {
                        const k = p[i] / 255;
                        p[i] = 255 * k;
                        p[i + 1] = 150 * k;
                        p[i + 2] = 40 * k;
                    }
                g.putImageData(d, x, y);
            },
            true
        );
        swapMap(
            mat,
            'normalMap',
            (g, s) => {
                g.fillStyle = 'rgb(128,128,255)';
                g.fillRect(28 * s, 424 * s, 1160 * s, 40 * s);
            },
            false
        );
    }
}

if (renderer) {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.005, 10);

    const key = new THREE.SpotLight(0xfff1e0, 9, 2, 0.55, 0.6, 1.2);
    key.position.set(0.35, 0.55, 0.45);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0002;
    key.shadow.radius = 6;
    const keyTarget = new THREE.Object3D();
    keyTarget.position.set(0, 0.04, 0);
    scene.add(keyTarget);
    key.target = keyTarget;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9db8ff, 2.2);
    rim.position.set(-0.5, 0.3, -0.6);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffb070, 0.6);
    fill.position.set(-0.6, 0.1, 0.4);
    scene.add(fill);
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 4),
        new THREE.ShadowMaterial({ opacity: 0.55 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const rig = new THREE.Group();
    scene.add(rig);
    let model = null;

    const KEYS = [
        [
            [0.2, 0.1, 0.34],
            [0, 0.05, 0.012]
        ],
        [
            [0.035, 0.05, 0.17],
            [0.008, 0.036, 0.06]
        ],
        [
            [-0.02, 0.27, -0.12],
            [0.01, 0.07, 0.0]
        ],
        [
            [-0.06, 0.12, 0.15],
            [0.004, 0.05, 0.045]
        ],
        [
            [-0.22, 0.11, -0.27],
            [0, 0.036, 0]
        ],
        [
            [0.0, 0.085, 0.4],
            [0, 0.036, 0.01]
        ]
    ];
    const V = a => new THREE.Vector3(...a);
    const keys = KEYS.map(([p, l]) => [V(p), V(l)]);
    const camPos = new THREE.Vector3(),
        camLook = new THREE.Vector3();

    const resize = () => {
        const w = sticky.clientWidth,
            h = sticky.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };
    addEventListener('resize', resize);
    resize();

    let target = 0,
        prog = 0,
        chap = -1,
        dragYaw = 0,
        dragV = 0,
        dragging = false,
        lastX = 0;
    const chaps = [...sticky.querySelectorAll('.chap')],
        dots = [...sticky.querySelectorAll('.dots i')];
    const read = () => {
        const r = section.getBoundingClientRect();
        target = clamp(-r.top / (r.height - innerHeight));
    };
    addEventListener('scroll', read, { passive: true });
    read();
    prog = target;
    canvas.addEventListener('pointerdown', e => {
        dragging = true;
        lastX = e.clientX;
        canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        dragV = dx * 0.008;
        dragYaw += dragV;
    });
    canvas.addEventListener('pointerup', () => {
        dragging = false;
    });

    const N = keys.length - 1;
    const keepCanvas = () => {
        const cur = document.getElementById('gl');
        if (cur && cur !== canvas) cur.replaceWith(canvas);
        if (canvas.parentElement !== sticky) {
            sticky.prepend(canvas);
            resize();
        }
    };
    const frame = now => {
        requestAnimationFrame(frame);
        keepCanvas();
        prog += (target - prog) * 0.09;
        const f = prog * N,
            i = Math.min(N - 1, Math.floor(f)),
            t = smooth(clamp((f - i - 0.2) / 0.6));
        camPos.lerpVectors(keys[i][0], keys[i + 1][0], t);
        camLook.lerpVectors(keys[i][1], keys[i + 1][1], t);
        const aspectFix = clamp(1.25 / camera.aspect, 1, 2.1);
        camPos.sub(camLook).multiplyScalar(aspectFix).add(camLook);
        camera.position.copy(camPos);
        camera.lookAt(camLook);
        const heroAmt =
            Math.max(1 - f * 2, f - (N - 0.5)) > 0
                ? clamp(Math.max(1 - f * 2, (f - (N - 0.6)) * 2))
                : 0;
        if (!dragging) {
            dragV *= 0.94;
            dragYaw += dragV;
            dragYaw *= 0.985;
        }
        rig.rotation.y = (reduce ? 0 : Math.sin(now / 2600) * 0.35 * heroAmt) + dragYaw;
        const c = Math.round(f);
        if (c !== chap) {
            chap = c;
            chaps.forEach(el => el.classList.toggle('on', +el.dataset.c === c));
            dots.forEach((d, k) => d.classList.toggle('on', k === c));
        }
        renderer.render(scene, camera);
    };

    const manager = new THREE.LoadingManager();
    manager.onProgress = (u, l, tot) => {
        loaderBar.style.width = (l / tot) * 100 + '%';
    };
    new GLTFLoader(manager).load(
        MODEL_URI,
        gltf => {
            model = gltf.scene;
            model.traverse(o => {
                if (!o.isMesh) return;
                if (
                    o.name.toLowerCase().includes('strap') ||
                    (o.material && o.material.name === 'Camera_01_strap')
                ) {
                    o.visible = false;
                    return;
                }
                o.castShadow = o.receiveShadow = true;
                rebrand(o.material);
            });
            rig.add(model);
            document.getElementById('loader').classList.add('done');
            startViewer(model);
            requestAnimationFrame(frame);
        },
        undefined,
        err => {
            console.error(err);
            sticky.classList.add('no-gl');
        }
    );

    window.obscura = Object.assign(window.obscura || {}, {
        chapter: c => {
            const y = section.offsetTop + (section.offsetHeight - innerHeight) * (c / N);
            document.documentElement.style.scrollBehavior = 'auto';
            scrollTo(0, y);
            target = prog = c / N;
        },
        progress: () => prog
    });

    function startViewer(src) {
        const c2 = document.getElementById('gl2'),
            box = document.getElementById('viewer');
        const r2 = new THREE.WebGLRenderer({ canvas: c2, antialias: true, alpha: true });
        r2.setPixelRatio(Math.min(devicePixelRatio, 2));
        r2.outputColorSpace = THREE.SRGBColorSpace;
        r2.toneMapping = THREE.ACESFilmicToneMapping;
        r2.toneMappingExposure = 1.15;
        const s2 = new THREE.Scene();
        s2.environment = new THREE.PMREMGenerator(r2).fromScene(
            new RoomEnvironment(),
            0.04
        ).texture;
        const k2 = new THREE.DirectionalLight(0xffffff, 2);
        k2.position.set(0.3, 0.5, 0.4);
        s2.add(k2);
        s2.add(src.clone());
        const cam2 = new THREE.PerspectiveCamera(28, 1, 0.005, 10);
        cam2.position.set(0.22, 0.12, 0.3);
        const ctl = new OrbitControls(cam2, c2);
        ctl.target.set(0, 0.036, 0.012);
        ctl.enableZoom = false;
        ctl.enablePan = false;
        ctl.autoRotate = !reduce;
        ctl.autoRotateSpeed = 1.2;
        ctl.enableDamping = true;
        ctl.minPolarAngle = 0.35;
        ctl.maxPolarAngle = 1.55;
        const fit = () => {
            const w = box.clientWidth,
                h = box.clientHeight;
            r2.setSize(w, h, false);
            cam2.aspect = w / h;
            cam2.updateProjectionMatrix();
        };
        addEventListener('resize', fit);
        fit();
        let on = false;
        new IntersectionObserver(([e]) => {
            on = e.isIntersecting;
        }).observe(box);
        const loop = () => {
            requestAnimationFrame(loop);
            if (!on) return;
            ctl.update();
            r2.render(s2, cam2);
        };
        loop();
    }
}
