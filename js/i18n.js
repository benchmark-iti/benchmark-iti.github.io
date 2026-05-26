// i18n.js — Internacionalización del cliente (inglés por defecto, español opcional).
//
// Cómo funciona:
//   - STRINGS contiene el diccionario completo: { en: {...}, es: {...} }.
//     El idioma por defecto es 'en'. Las claves son planas con notación de
//     puntos (ej. 'nav.home').
//   - El idioma elegido se guarda en localStorage ('rankedms_lang') para que
//     persista entre páginas y recargas.
//   - I18N.t(clave, params) devuelve el string traducido. Soporta
//     interpolación con {nombre} (ej. t('online.round', {n: 3})).
//   - I18N.apply() recorre el DOM y traduce los elementos marcados con
//     data-i18n / data-i18n-html / data-i18n-placeholder. Se ejecuta solo
//     en DOMContentLoaded.
//   - I18N.mountSwitch() inyecta el toggle EN/ES en el navbar.
//
// Para el texto generado dinámicamente por JS (online.js, script.js y los
// scripts inline de cada página) se llama I18N.t() directamente. Por eso
// este archivo debe cargarse ANTES que esos scripts.
//
// Al cambiar de idioma se recarga la página: es la forma más simple y
// confiable de re-traducir tanto el HTML estático como el contenido dinámico.

const I18N = (() => {
    const STORAGE_KEY = 'rankedms_lang'
    const DEFAULT_LANG = 'en'
    const SUPPORTED = ['en', 'es']

    const STRINGS = {
        en: {
            // Navbar
            'nav.home':     'Home',
            'nav.ranking':  'Ranking',
            'nav.howto':    'How to play',
            'nav.login':    'Log in',
            'nav.register': 'Sign up',
            'nav.logout':   'Log out',

            // Page titles
            'title.home':    'ranked.ms',
            'title.online':  'Online | ranked.ms',
            'title.offline': 'Offline | ranked.ms',
            'title.login':   'Log in | ranked.ms',
            'title.register':'Sign up | ranked.ms',
            'title.ranking': 'Ranking | ranked.ms',
            'title.howto':   'How to play | ranked.ms',

            // Index / hero
            'index.eyebrow':    'Reaction time · 1 vs 1',
            'index.playOnline': 'Play Online',
            'index.practice':   'Practice',
            'stat.topElo':      'Top ELO',
            'stat.wins':        'Wins',
            'stat.record':      'Record',
            'stat.loading':     'loading',

            // Leaderboard (sidebar + ranking page)
            'lb.elo':         'ELO',
            'lb.wins':        'Wins',
            'lb.time':        'Time',
            'lb.loading':     'Loading...',
            'lb.empty':       'No data yet',
            'lb.error':       'Failed to load',
            'lb.suffix.elo':  'ELO',
            'lb.suffix.wins': 'wins',
            'lb.suffix.times':'ms',
            'ranking.title':  'Ranking',

            // Auth forms
            'form.username':       'Username',
            'form.password':       'Password',
            'error.connection':    'Connection error',
            'login.title':         'Log in',
            'login.submit':        'Log in',
            'login.noAccount':     "Don't have an account?",
            'login.registerLink':  'Sign up',
            'register.title':      'Create account',
            'register.usernameHint':'(3–32 characters)',
            'register.passwordHint':'(min. 6 characters)',
            'register.submit':     'Sign up',
            'register.haveAccount':'Already have an account?',
            'register.loginLink':  'Log in',

            // Offline mode
            'offline.title':      'Offline mode',
            'offline.intro':      'When the red box turns green, click as fast as you can.<br/>Click anywhere to start.',
            'offline.wait':       'Wait for green...',
            'offline.click':      'Click!',
            'offline.tooSoon':    'Too soon!',
            'offline.retry':      'Click to try again',
            'offline.impossible': 'Impossible reaction (<100ms). Click to retry',
            'offline.continue':   'Click to continue',

            // Online lobby (static)
            'online.lobbyTitle':   'Online 1v1',
            'online.findMatch':    'Find random match',
            'online.or':           'or',
            'online.createRoom':   'Create private room',
            'online.joinCode':     'Join with code',
            'online.shareCode':    'Room created — share the code:',
            'online.waitingJoin':  'Waiting for someone to join...',
            'online.cancel':       'Cancel',
            'online.join':         'Join',
            'online.searching':    'Looking for opponent...',
            'online.connecting':   'Connecting...',
            'online.rematch':      'Rematch',
            'online.backToLobby':  'Back to lobby',
            'chat.header':         'Chat',
            'chat.placeholder':    'Message...',
            'score.you':           'You',
            'score.opponent':      'Opponent',

            // Online (dynamic, online.js)
            'online.opponentFound':  'Opponent found!',
            'online.connLost':       'Connection lost. Reconnecting...',
            'online.connFail':       "Couldn't connect to the server.",
            'online.vs':             'vs {opp}',
            'online.eloLine':        'Your ELO: {you} — Opponent: {opp}',
            'online.matchStarted':   'Match started vs {opp}',
            'online.round':          'Round {n}',
            'online.roundLabel':     'ROUND {n}',
            'online.bothEarly':      'Both too soon!',
            'online.repeating':      'Repeating round...',
            'online.wonRound':       'You won this round!',
            'online.lostRound':      'You lost this round',
            'online.youOppMs':       'You: {you} — Opponent: {opp}',
            'online.end':            'END',
            'online.wonMatch':       'You won the match!',
            'online.lostMatch':      'You lost the match',
            'online.matchEloLine':   'ELO: {elo}  ·  {a}–{b}',
            'online.oppDisc':        'Opponent disconnected',
            'online.wonByAbandon':   'Won by abandonment · ELO: {elo}',
            'online.oppDiscChat':    'The opponent disconnected.',
            'online.wantsRematch':   '{name} wants a rematch.',
            'online.rematchStarting':'Rematch starting!',
            'online.rematchTitle':   'Rematch!',
            'online.getReady':       'Get ready...',
            'online.rematchDeclined':'Rematch declined.',
            'online.rematchTimeout': 'Rematch time expired.',
            'online.codeLen':        'Code must be 6 characters',
            'online.waiting':        'Waiting...',
            'online.starting':       'Starting!',
            'online.acceptRematch':  'Accept rematch',
            'online.decline':        'Decline',
            'fmt.tooSoon':           'too soon',
            'fmt.timeout':           'timeout',

            // How to play (gameplay)
            'howto.title':        'How to play',
            'howto.what.h':       'What is ranked.ms?',
            'howto.what.p1':      'ranked.ms is a <strong>reaction time</strong> game in a 1-versus-1 format. The goal is simple: when the screen turns green, click as fast as you can. Whoever reacts first wins the round.',
            'howto.what.p2':      'Compete in ranked matches, climb your ELO, and show up on the global ranking.',
            'howto.round.h':      'A round, step by step',
            'howto.round.s1':     'The screen turns <strong>red</strong>. Put your finger or cursor on it and wait. It is not time yet.',
            'howto.round.s2':     'After a <strong>random</strong> time (between 2 and 5 seconds), the screen turns <strong>green</strong>. That is your moment: click!',
            'howto.round.s3':     'The server measures both reaction times. <strong>Whoever clicks first wins the round</strong> and sees their time in milliseconds.',
            'howto.color.red':    'Red — wait, do not click',
            'howto.color.green':  'Green — click now!',
            'howto.color.gray':   'Gray — between rounds, wait',
            'howto.early.h':      'The early click',
            'howto.early.p1':     'If you click <strong>before the screen turns green</strong> (while it is still red or gray), you lose that round automatically. It does not matter how fast your rival is: whoever jumps the gun loses.',
            'howto.early.p2':     'The random delay exists precisely for this — memorizing the rhythm is useless.',
            'howto.match.h':      'How do you win the match?',
            'howto.match.p1':     'A match is <strong>best of 5 rounds</strong>. The first to win <strong>3 rounds</strong> wins the match and takes the ELO points.',
            'howto.match.c1.l':   'Rounds per match',
            'howto.match.c1.d':   'Best of 5',
            'howto.match.c2.l':   'To win',
            'howto.match.c2.v':   '3 rounds',
            'howto.match.c2.d':   'First to reach it',
            'howto.match.c3.l':   'Time limit / round',
            'howto.match.c3.v':   '10 s',
            'howto.match.c3.d':   'No click = timeout',
            'howto.match.p2':     'If a player disconnects during the match, the other wins automatically and the ELO changes as if it had ended right then.',
            'howto.modes.h':      'Game modes',
            'howto.modes.random': '<strong>Find random match</strong><br>Enter the matchmaking queue and the system will connect you with the first available player from a different account. It is the fastest way to play.',
            'howto.modes.private':'<strong>Private room</strong><br>Create a room and share the 6-letter code with whoever you want. The room waits until someone joins with that code and the match starts on its own.',
            'howto.modes.offline':'<strong>Offline mode</strong><br>Practice without an account or rival. Measure your reaction time solo, with no pressure and without affecting your ELO.',
            'howto.elo.h':        'ELO system',
            'howto.elo.p1':       'ELO is your <strong>skill score</strong>. Everyone starts with <strong>1000 points</strong>. You gain ELO by beating rivals and lose it by losing against them.',
            'howto.elo.p2':       'How many points you gain or lose depends on the ELO difference: if you beat someone much better than you, you gain more. If you lose to someone much weaker, you lose more. The ELO minimum is always 0.',
            'howto.elo.c1.l':     'Starting ELO',
            'howto.elo.c1.d':     'For everyone',
            'howto.elo.c2.l':     'K factor',
            'howto.elo.c2.d':     'Max change per match',
            'howto.elo.c3.l':     'Minimum ELO',
            'howto.elo.c3.d':     'Never below zero',
            'howto.rematch.h':    'Rematch',
            'howto.rematch.p1':   'When a match ends, both players have <strong>30 seconds</strong> to request a rematch. If both accept, the match restarts immediately in the same room, with the chat open. If either declines or time runs out, the room closes.',
            'howto.rankings.h':   'Rankings',
            'howto.rankings.p1':  'On the home page there are three leaderboards:',
            'howto.rankings.elo': '<strong>ELO</strong> — the players with the most accumulated skill points.',
            'howto.rankings.wins':'<strong>Wins</strong> — the players with the most matches won in total.',
            'howto.rankings.time':'<strong>Time</strong> — the fastest reactions recorded in online matches (offline mode does not count).',
            'howto.tips.h':       'Tips to improve',
            'howto.tips.t1':      'Keep your cursor or finger over the screen from the moment the countdown starts — moving it takes extra milliseconds.',
            'howto.tips.t2':      'Do not try to anticipate: the time is random between 2 and 5 seconds. If you click early, you lose the round.',
            'howto.tips.t3':      'An average human reaction time is around <strong>200–250 ms</strong>. Below 180 ms you are already above average.',
            'howto.tips.t4':      'Fatigue and high-refresh-rate screens affect your time. A 144 Hz monitor shows the green sooner than a 60 Hz one.',
            'howto.tips.t5':      'Offline mode is free for practicing without risking ELO.',
        },

        es: {
            // Navbar
            'nav.home':     'Inicio',
            'nav.ranking':  'Ranking',
            'nav.howto':    'Cómo jugar',
            'nav.login':    'Entrar',
            'nav.register': 'Registrarse',
            'nav.logout':   'Salir',

            // Page titles
            'title.home':    'ranked.ms',
            'title.online':  'Online | ranked.ms',
            'title.offline': 'Offline | ranked.ms',
            'title.login':   'Iniciar sesión | ranked.ms',
            'title.register':'Registrarse | ranked.ms',
            'title.ranking': 'Ranking | ranked.ms',
            'title.howto':   'Cómo jugar | ranked.ms',

            // Index / hero
            'index.eyebrow':    'Tiempo de reacción · 1 vs 1',
            'index.playOnline': 'Jugar Online',
            'index.practice':   'Práctica',
            'stat.topElo':      'Top ELO',
            'stat.wins':        'Victorias',
            'stat.record':      'Récord',
            'stat.loading':     'cargando',

            // Leaderboard
            'lb.elo':         'ELO',
            'lb.wins':        'Victorias',
            'lb.time':        'Tiempo',
            'lb.loading':     'Cargando...',
            'lb.empty':       'Sin datos aún',
            'lb.error':       'Error al cargar',
            'lb.suffix.elo':  'ELO',
            'lb.suffix.wins': 'vic.',
            'lb.suffix.times':'ms',
            'ranking.title':  'Ranking',

            // Auth forms
            'form.username':       'Usuario',
            'form.password':       'Contraseña',
            'error.connection':    'Error de conexión',
            'login.title':         'Iniciar sesión',
            'login.submit':        'Entrar',
            'login.noAccount':     '¿No tienes cuenta?',
            'login.registerLink':  'Regístrate',
            'register.title':      'Crear cuenta',
            'register.usernameHint':'(3–32 caracteres)',
            'register.passwordHint':'(mín. 6 caracteres)',
            'register.submit':     'Registrarse',
            'register.haveAccount':'¿Ya tienes cuenta?',
            'register.loginLink':  'Inicia sesión',

            // Offline mode
            'offline.title':      'Modo offline',
            'offline.intro':      'Cuando el recuadro rojo se vuelva verde, haz clic lo más rápido que puedas.<br/>Haz click donde sea para empezar.',
            'offline.wait':       'Espera al verde...',
            'offline.click':      'Click!',
            'offline.tooSoon':    '¡Demasiado pronto!',
            'offline.retry':      'Click para intentar de nuevo',
            'offline.impossible': 'Reacción imposible (<100ms). Click para reintentar',
            'offline.continue':   'Click para seguir',

            // Online lobby (static)
            'online.lobbyTitle':   'Online 1v1',
            'online.findMatch':    'Buscar partida aleatoria',
            'online.or':           'o',
            'online.createRoom':   'Crear sala privada',
            'online.joinCode':     'Unirse con código',
            'online.shareCode':    'Sala creada — comparte el código:',
            'online.waitingJoin':  'Esperando a que alguien se una...',
            'online.cancel':       'Cancelar',
            'online.join':         'Unirse',
            'online.searching':    'Buscando oponente...',
            'online.connecting':   'Conectando...',
            'online.rematch':      'Revancha',
            'online.backToLobby':  'Volver al lobby',
            'chat.header':         'Chat',
            'chat.placeholder':    'Mensaje...',
            'score.you':           'Tú',
            'score.opponent':      'Oponente',

            // Online (dynamic)
            'online.opponentFound':  '¡Oponente encontrado!',
            'online.connLost':       'Conexión perdida. Reconectando...',
            'online.connFail':       'No se pudo conectar al servidor.',
            'online.vs':             'vs {opp}',
            'online.eloLine':        'Tu ELO: {you} — Oponente: {opp}',
            'online.matchStarted':   'Partida iniciada vs {opp}',
            'online.round':          'Ronda {n}',
            'online.roundLabel':     'RONDA {n}',
            'online.bothEarly':      '¡Ambos muy pronto!',
            'online.repeating':      'Repitiendo ronda...',
            'online.wonRound':       '¡Ganaste esta ronda!',
            'online.lostRound':      'Perdiste esta ronda',
            'online.youOppMs':       'Tú: {you} — Oponente: {opp}',
            'online.end':            'FIN',
            'online.wonMatch':       '¡Ganaste la partida!',
            'online.lostMatch':      'Perdiste la partida',
            'online.matchEloLine':   'ELO: {elo}  ·  {a}–{b}',
            'online.oppDisc':        'Oponente desconectado',
            'online.wonByAbandon':   'Ganaste por abandono · ELO: {elo}',
            'online.oppDiscChat':    'El oponente se desconectó.',
            'online.wantsRematch':   '{name} quiere la revancha.',
            'online.rematchStarting':'¡Revancha iniciando!',
            'online.rematchTitle':   '¡Revancha!',
            'online.getReady':       'Preparate...',
            'online.rematchDeclined':'Revancha rechazada.',
            'online.rematchTimeout': 'Tiempo de revancha agotado.',
            'online.codeLen':        'El código debe tener 6 caracteres',
            'online.waiting':        'Esperando...',
            'online.starting':       '¡Comenzando!',
            'online.acceptRematch':  'Aceptar revancha',
            'online.decline':        'Rechazar',
            'fmt.tooSoon':           'muy pronto',
            'fmt.timeout':           'timeout',

            // Cómo jugar
            'howto.title':        'Cómo jugar',
            'howto.what.h':       '¿Qué es ranked.ms?',
            'howto.what.p1':      'ranked.ms es un juego de <strong>tiempo de reacción</strong> en formato 1 contra 1. El objetivo es simple: cuando la pantalla se ponga verde, haz clic lo más rápido posible. El que reaccione antes gana la ronda.',
            'howto.what.p2':      'Compite en partidas clasificatorias, sube tu ELO, y aparece en el ranking global.',
            'howto.round.h':      'Una ronda, paso a paso',
            'howto.round.s1':     'La pantalla se pone <strong>roja</strong>. Pon el dedo o el cursor encima y espera. Todavía no es momento.',
            'howto.round.s2':     'Después de un tiempo <strong>aleatorio</strong> (entre 2 y 5 segundos), la pantalla se vuelve <strong>verde</strong>. Ese es tu momento: ¡haz clic!',
            'howto.round.s3':     'El servidor mide ambos tiempos de reacción. <strong>El que haga clic primero gana la ronda</strong> y ve su tiempo en milisegundos.',
            'howto.color.red':    'Rojo — espera, no hagas clic',
            'howto.color.green':  'Verde — ¡haz clic ahora!',
            'howto.color.gray':   'Gris — entre rondas, espera',
            'howto.early.h':      'El clic anticipado',
            'howto.early.p1':     'Si haces clic <strong>antes de que la pantalla se ponga verde</strong> (mientras aún está roja o gris), pierdes esa ronda automáticamente. No importa lo rápido que sea tu rival: el que hace trampa pierde.',
            'howto.early.p2':     'El tiempo aleatorio existe precisamente para esto — memorizar el ritmo no sirve de nada.',
            'howto.match.h':      '¿Cómo se gana la partida?',
            'howto.match.p1':     'Una partida es al <strong>mejor de 5 rondas</strong>. El primero en ganar <strong>3 rondas</strong> gana la partida y se lleva los puntos ELO.',
            'howto.match.c1.l':   'Rondas por partida',
            'howto.match.c1.d':   'Mejor de 5',
            'howto.match.c2.l':   'Para ganar',
            'howto.match.c2.v':   '3 rondas',
            'howto.match.c2.d':   'Primero en llegar',
            'howto.match.c3.l':   'Tiempo límite / ronda',
            'howto.match.c3.v':   '10 s',
            'howto.match.c3.d':   'Sin clic = timeout',
            'howto.match.p2':     'Si un jugador se desconecta durante la partida, el otro gana automáticamente y el ELO cambia como si hubiera terminado en ese momento.',
            'howto.modes.h':      'Modos de juego',
            'howto.modes.random': '<strong>Buscar partida aleatoria</strong><br>Entra a la cola de emparejamiento y el sistema te conectará con el primer jugador disponible de diferente cuenta. Es la forma más rápida de jugar.',
            'howto.modes.private':'<strong>Sala privada</strong><br>Crea una sala y comparte el código de 6 letras con quien quieras. La sala espera hasta que alguien se una con ese código y la partida arranca sola.',
            'howto.modes.offline':'<strong>Modo offline</strong><br>Practica sin cuenta ni rival. Mide tu tiempo de reacción en solitario, sin presión y sin que afecte a tu ELO.',
            'howto.elo.h':        'Sistema ELO',
            'howto.elo.p1':       'El ELO es tu <strong>puntuación de habilidad</strong>. Todos empiezan con <strong>1000 puntos</strong>. Ganas ELO al vencer rivales y pierdes al perder contra ellos.',
            'howto.elo.p2':       'La cantidad de puntos que ganas o pierdes depende de la diferencia de ELO: si vences a alguien mucho mejor que tú, ganarás más. Si pierdes contra alguien muy inferior, perderás más. El mínimo de ELO es siempre 0.',
            'howto.elo.c1.l':     'ELO inicial',
            'howto.elo.c1.d':     'Para todos',
            'howto.elo.c2.l':     'Factor K',
            'howto.elo.c2.d':     'Cambio máximo por partida',
            'howto.elo.c3.l':     'ELO mínimo',
            'howto.elo.c3.d':     'No baja de cero',
            'howto.rematch.h':    'Revancha',
            'howto.rematch.p1':   'Al terminar una partida, ambos jugadores tienen <strong>30 segundos</strong> para pedir la revancha. Si los dos aceptan, la partida vuelve a empezar inmediatamente en la misma sala, con el chat abierto. Si alguno rechaza o el tiempo se agota, la sala se cierra.',
            'howto.rankings.h':   'Rankings',
            'howto.rankings.p1':  'En la página principal hay tres tablas de clasificación:',
            'howto.rankings.elo': '<strong>ELO</strong> — los jugadores con más puntos de habilidad acumulados.',
            'howto.rankings.wins':'<strong>Victorias</strong> — los jugadores con más partidas ganadas en total.',
            'howto.rankings.time':'<strong>Tiempo</strong> — las reacciones más rápidas registradas en partidas online (el modo offline no cuenta).',
            'howto.tips.h':       'Consejos para mejorar',
            'howto.tips.t1':      'Mantén el cursor o el dedo sobre la pantalla desde que empieza la cuenta atrás — moverlo tarda milisegundos extra.',
            'howto.tips.t2':      'No intentes anticiparte: el tiempo es aleatorio entre 2 y 5 segundos. Si haces clic antes, pierdes la ronda.',
            'howto.tips.t3':      'Un tiempo de reacción humano promedio es de unos <strong>200–250 ms</strong>. Por debajo de 180 ms ya estás por encima de la media.',
            'howto.tips.t4':      'La fatiga y las pantallas de alta frecuencia de actualización afectan tu tiempo. Un monitor de 144 Hz muestra el verde antes que uno de 60 Hz.',
            'howto.tips.t5':      'El modo offline es gratis para practicar sin arriesgar ELO.',
        },
    }

    // getLang lee el idioma guardado; si no hay uno válido, devuelve el default.
    function getLang() {
        const saved = localStorage.getItem(STORAGE_KEY)
        return SUPPORTED.includes(saved) ? saved : DEFAULT_LANG
    }

    // setLang guarda el idioma y recarga la página para re-traducir todo.
    function setLang(lang) {
        if (!SUPPORTED.includes(lang)) return
        localStorage.setItem(STORAGE_KEY, lang)
        location.reload()
    }

    // t traduce una clave al idioma actual. params (opcional) reemplaza los
    // placeholders {nombre} dentro del string. Si la clave no existe, devuelve
    // la propia clave (útil para detectar traducciones faltantes).
    function t(key, params) {
        const lang = getLang()
        let str = (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS[DEFAULT_LANG][key] ?? key
        if (params) {
            for (const k in params) {
                str = str.replaceAll('{' + k + '}', params[k])
            }
        }
        return str
    }

    // apply recorre el documento y traduce los elementos marcados:
    //   data-i18n              → textContent
    //   data-i18n-html         → innerHTML (para strings con <strong>, <br>, etc.)
    //   data-i18n-placeholder  → atributo placeholder
    // También fija el atributo lang del <html>.
    function apply(root) {
        const scope = root || document
        document.documentElement.lang = getLang()

        scope.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.getAttribute('data-i18n'))
        })
        scope.querySelectorAll('[data-i18n-html]').forEach(el => {
            el.innerHTML = t(el.getAttribute('data-i18n-html'))
        })
        scope.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = t(el.getAttribute('data-i18n-placeholder'))
        })
    }

    // mountSwitch inyecta el toggle EN/ES en el navbar. Se inserta antes de
    // .navbar-user si existe (páginas con cuenta) o se añade al final (login/
    // register). El botón activo se resalta con el color de acento.
    function mountSwitch() {
        const nav = document.querySelector('.navbar')
        if (!nav || nav.querySelector('.lang-switch')) return

        const lang = getLang()
        const sw = document.createElement('div')
        sw.className = 'lang-switch'
        sw.innerHTML = SUPPORTED.map(l =>
            `<button class="lang-opt${l === lang ? ' active' : ''}" data-lang="${l}">${l.toUpperCase()}</button>`
        ).join('')
        sw.querySelectorAll('.lang-opt').forEach(btn => {
            btn.addEventListener('click', () => setLang(btn.getAttribute('data-lang')))
        })

        const user = nav.querySelector('.navbar-user')
        if (user) nav.insertBefore(sw, user)
        else nav.appendChild(sw)
    }

    // Estilos del switch inyectados desde JS para mantener el módulo autónomo.
    function injectStyles() {
        if (document.getElementById('i18n-style')) return
        const css = `
        .lang-switch {
            display: inline-flex;
            flex-shrink: 0;
            margin-left: auto;
            margin-right: 14px;
            border: 1px solid var(--border, #1e1e2a);
            border-radius: 999px;
            overflow: hidden;
            background: var(--surface, #111118);
        }
        .lang-opt {
            font: 700 11px/1 var(--font-cond, sans-serif), sans-serif;
            letter-spacing: 0.06em;
            padding: 6px 10px;
            background: none;
            border: none;
            color: var(--text-3, #475569);
            cursor: pointer;
            transition: color .12s, background .12s;
        }
        .lang-opt:hover { color: var(--text-2, #94a3b8); }
        .lang-opt.active {
            background: var(--accent, #f97316);
            color: #fff;
        }
        /* Si hay navbar-user, este ya empuja a la derecha; quitamos el auto del switch */
        .navbar-user ~ .lang-switch, .lang-switch:has(~ .navbar-user) { margin-left: 0; }

        /* Móvil: el navbar va apretado, así que el switch se hace compacto. */
        @media (max-width: 768px) {
            .lang-switch { margin-right: 8px; }
            .lang-opt { padding: 5px 7px; font-size: 10px; letter-spacing: 0.04em; }
        }
        @media (max-width: 480px) {
            /* En pantallas muy chicas apretamos gaps y links para que el
               navbar (logo + links + switch + usuario) entre en una sola
               fila sin desbordar. */
            .navbar { gap: 8px; }
            .navbar-links { gap: 0; margin-left: 6px; }
            .navbar-link { padding: 5px 6px; font-size: 12px; }
            .lang-switch { margin-right: 6px; }
            .lang-opt { padding: 4px 6px; }
        }
        `
        const style = document.createElement('style')
        style.id = 'i18n-style'
        style.textContent = css
        document.head.appendChild(style)
    }

    document.addEventListener('DOMContentLoaded', () => {
        injectStyles()
        apply()
        mountSwitch()
    })

    return { getLang, setLang, t, apply, mountSwitch }
})()
