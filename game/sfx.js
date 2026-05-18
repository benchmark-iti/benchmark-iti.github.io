// sfx.js — Efectos de sonido y visuales sintetizados (sin archivos externos).
//
// SFX es un IIFE (función auto-invocada) que devuelve un objeto con la API
// pública. Las variables y funciones internas (ctx, note, sweep, flash, etc.)
// no están expuestas — solo los métodos del objeto retornado.
//
// Decisiones:
//   - Sin archivos: todos los sonidos se generan con Web Audio API
//     (osciladores). Esto evita cargar MP3 y simplifica el deploy.
//   - Confetti: canvas 2D con 160 partículas y physics simple (gravedad).
//   - Overlay de win/lose: div creado dinámicamente (no en el HTML) para
//     que esté disponible en cualquier página sin tener que copiarlo.

const SFX = (() => {
    let _ctx = null

    // ctx lazy-inicializa el AudioContext. Los browsers requieren que se
    // cree en respuesta a una interacción de usuario, y si está suspendido
    // (por autoplay policy) hay que llamar resume() para reactivarlo.
    function ctx() {
        if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
        if (_ctx.state === 'suspended') _ctx.resume()
        return _ctx
    }

    // note toca una sola nota: un oscilador conectado a un nodo de ganancia
    // que decae exponencialmente para evitar el "click" del corte brusco.
    // `t` es un tiempo absoluto del AudioContext (no Date.now()).
    function note(freq, t, dur, type, vol) {
        try {
            const c = ctx()
            const osc = c.createOscillator()
            const g   = c.createGain()
            osc.connect(g); g.connect(c.destination)
            osc.type = type || 'sine'
            osc.frequency.value = freq
            g.gain.setValueAtTime(vol || 0.2, t)
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
            osc.start(t); osc.stop(t + dur + 0.05)
        } catch (_) {}
    }

    // sweep es como note pero con frecuencia variable (de f0 a f1).
    // Se usa para sonidos "energéticos" como el GO (sube) y el lose (baja).
    function sweep(f0, f1, t, dur, type, vol) {
        try {
            const c = ctx()
            const osc = c.createOscillator()
            const g   = c.createGain()
            osc.connect(g); g.connect(c.destination)
            osc.type = type || 'sine'
            osc.frequency.setValueAtTime(f0, t)
            osc.frequency.linearRampToValueAtTime(f1, t + dur)
            g.gain.setValueAtTime(vol || 0.2, t)
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
            osc.start(t); osc.stop(t + dur + 0.05)
        } catch (_) {}
    }

    // ---- Clickarea flash / shake ----

    // flash agrega una clase CSS al gameArea durante `dur` ms y luego la
    // remueve. El truco del `void el.offsetWidth` fuerza un reflow del
    // navegador entre el remove y el add — sin esto, si la misma animación
    // se dispara dos veces seguidas el browser no la reinicia porque ve la
    // clase como "ya presente".
    function flash(cls, dur) {
        const el = document.getElementById('gameArea')
        if (!el) return
        el.classList.remove('flash-win', 'flash-lose', 'ca-shake')
        void el.offsetWidth  // force reflow so animation restarts
        el.classList.add(cls)
        setTimeout(() => el.classList.remove(cls), dur || 420)
    }

    // ---- Confetti ----

    let _canvas = null, _raf = null

    // startConfetti dibuja 160 partículas rotando y cayendo en un canvas
    // a pantalla completa. La física es muy simple: velocidad inicial
    // aleatoria + gravedad creciente (elapsed * 0.00008) para que aceleren.
    // Después de 3s las partículas empiezan a desvanecerse, y a los 7s
    // se detiene la animación. El canvas se reutiliza entre llamadas para
    // no fragmentar memoria.
    function startConfetti() {
        if (!_canvas) {
            _canvas = document.createElement('canvas')
            _canvas.style.cssText =
                'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;'
            document.body.appendChild(_canvas)
        }
        _canvas.width  = window.innerWidth
        _canvas.height = window.innerHeight
        cancelAnimationFrame(_raf)

        const COLORS = [
            '#f97316','#22c55e','#3b82f6','#a855f7',
            '#facc15','#ec4899','#38bdf8','#f43f5e',
        ]
        const ps = Array.from({ length: 160 }, () => ({
            x:    Math.random() * _canvas.width,
            y:    -Math.random() * 30,
            w:    8 + Math.random() * 12,
            h:    5 + Math.random() * 8,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            vx:   (Math.random() - 0.5) * 5,
            vy:   3 + Math.random() * 5,
            rot:  Math.random() * 360,
            vrot: (Math.random() - 0.5) * 14,
            o:    1,
        }))

        const t0 = performance.now()
        const c2 = _canvas.getContext('2d')

        function frame(now) {
            const elapsed = now - t0
            c2.clearRect(0, 0, _canvas.width, _canvas.height)
            let alive = false
            for (const p of ps) {
                p.x += p.vx
                p.y += p.vy + elapsed * 0.00008  // slight gravity increase over time
                p.rot += p.vrot
                if (elapsed > 3000) p.o = Math.max(0, p.o - 0.012)
                if (p.o <= 0 || p.y > _canvas.height + 20) continue
                alive = true
                c2.save()
                c2.globalAlpha = p.o
                c2.translate(p.x, p.y)
                c2.rotate(p.rot * Math.PI / 180)
                c2.fillStyle = p.color
                c2.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
                c2.restore()
            }
            if (alive && elapsed < 7000) _raf = requestAnimationFrame(frame)
            else c2.clearRect(0, 0, _canvas.width, _canvas.height)
        }

        _raf = requestAnimationFrame(frame)
    }

    function stopConfetti() {
        cancelAnimationFrame(_raf)
        if (_canvas) _canvas.getContext('2d').clearRect(0, 0, _canvas.width, _canvas.height)
    }

    // ---- Match result overlay ----

    let _mro = null, _mroTimer = null

    // showOverlay despliega el cartel grande de "¡GANASTE!" o "PERDISTE"
    // sobre el centro de la pantalla, con el cambio de ELO debajo. Crea
    // el div la primera vez y lo reutiliza. Auto-desaparece a los 2.5s
    // con la animación "mro-out" definida en styles.css.
    function showOverlay(win, eloLine) {
        if (!_mro) {
            _mro = document.createElement('div')
            document.body.appendChild(_mro)
        }
        clearTimeout(_mroTimer)
        _mro.className = 'mro ' + (win ? 'mro-win' : 'mro-lose') + ' mro-show'
        _mro.innerHTML =
            `<div class="mro-inner">` +
            `<div class="mro-title">${win ? '¡GANASTE!' : 'PERDISTE'}</div>` +
            `<div class="mro-elo">${eloLine}</div>` +
            `</div>`

        _mroTimer = setTimeout(() => {
            if (_mro) { _mro.classList.remove('mro-show'); _mro.classList.add('mro-out') }
            setTimeout(() => { if (_mro) _mro.className = 'mro' }, 480)
        }, 2500)
    }

    function hideOverlay() {
        clearTimeout(_mroTimer)
        if (_mro) _mro.className = 'mro'
        stopConfetti()
    }

    // ---- Public API ----

    return {
        // Sounds
        go() {
            const c = ctx(), t = c.currentTime
            sweep(420, 860, t, 0.09, 'sine', 0.18)
        },
        roundWin() {
            const c = ctx(), t = c.currentTime
            note(523.25, t,       0.10, 'sine', 0.20)
            note(783.99, t + 0.1, 0.18, 'sine', 0.20)
        },
        roundLose() {
            const c = ctx(), t = c.currentTime
            sweep(290, 130, t, 0.22, 'triangle', 0.14)
        },
        early() {
            const c = ctx(), t = c.currentTime
            note(80, t, 0.17, 'square', 0.22)
        },
        matchWin() {
            const c = ctx(), t = c.currentTime
            // C – E – G – C (major arpeggio, uplifting)
            [[523.25, 0], [659.25, 0.13], [783.99, 0.26], [1046.5, 0.44]].forEach(([f, d]) =>
                note(f, t + d, 0.46, 'sine', 0.22))
        },
        matchLose() {
            const c = ctx(), t = c.currentTime
            // G – F – Eb – C (descending minor phrase)
            [[392, 0], [349.23, 0.18], [293.66, 0.36], [261.63, 0.56]].forEach(([f, d]) =>
                note(f, t + d, 0.42, 'triangle', 0.18))
        },

        // Visuals
        flashWin()   { flash('flash-win',  420) },
        flashLose()  { flash('flash-lose', 420) },
        shakeEarly() { flash('ca-shake',   380) },
        startConfetti,
        stopConfetti,
        showOverlay,
        hideOverlay,
    }
})()
