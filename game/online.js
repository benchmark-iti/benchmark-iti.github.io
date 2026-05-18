// online.js — Cliente del modo 1v1 online.
//
// Arquitectura:
//   - Una conexión WebSocket persistente al backend (autenticada por JWT
//     en query param).
//   - El servidor maneja TODA la lógica de juego (timing, score, ELO);
//     el cliente solo refleja el estado actual y reporta clicks.
//   - `gameState` es la máquina de estados del cliente. Determina cómo
//     interpretar los clicks en el gameArea y qué mostrar.
//   - Los mensajes del servidor llegan en handleMessage → onXxx handler.
//
// Estados de gameState:
//   lobby           → menú principal, sin conexión activa al juego
//   waiting_room    → creó sala privada, esperando que alguien entre
//   in_queue        → matchmaking en cola
//   pre_match       → emparejado, esperando match_start
//   match_start     → partida iniciada (transición)
//   round_ready     → pantalla roja, esperando verde
//   round_active    → pantalla verde, click cuenta
//   round_result    → mostrando ganador de la ronda
//   match_end       → mostrando resultado final + opciones de revancha
//   rematch_pending → pidió revancha, esperando al oponente

let ws = null
let goTime = null  // performance.now() del momento en que llegó "go"
let gameState = 'lobby'
let hasClicked = false  // dentro de una ronda, ¿ya envió reaction o early?
let myUsername = (AUTH.getUser() || {}).username || ''

// ---- DOM refs ----

const lobbySection  = document.getElementById('lobbySection')
const gameSection   = document.getElementById('gameSection')
const gameArea      = document.getElementById('gameArea')
const gameMsg       = document.getElementById('gameMsg')
const gameNote      = document.getElementById('gameNote')
const gameActions   = document.getElementById('gameActions')
const btnRematch    = document.getElementById('btnRematch')
const btnDecline    = document.getElementById('btnDecline')
const rematchNote   = document.getElementById('rematchNote')
const scoreYou      = document.getElementById('scoreYou')
const scoreOpp      = document.getElementById('scoreOpp')
const scoreLabelYou = document.getElementById('scoreLabelYou')
const scoreLabelOpp = document.getElementById('scoreLabelOpp')
const scoreRound    = document.getElementById('scoreRound')
const lobbyError    = document.getElementById('lobbyError')
const roomCreated   = document.getElementById('roomCreated')
const roomCodeEl    = document.getElementById('roomCode')
const inQueueEl     = document.getElementById('inQueue')
const lobbyBtns     = document.getElementById('lobbyBtns')
const joinPanel     = document.getElementById('joinPanel')
const chatMessages  = document.getElementById('chatMessages')
const chatInput     = document.getElementById('chatInput')

// ---- Connection ----

// connect abre la conexión WebSocket al backend. El JWT va como query
// param porque la API WebSocket del browser no permite headers custom
// en el handshake. Si la conexión se pierde durante una partida, se
// muestra un mensaje y se reintenta tras 2.5s.
function connect() {
    if (!AUTH.requireLogin()) return

    const url = `${CONFIG.backendWs}/ws?token=${encodeURIComponent(AUTH.getToken())}`
    ws = new WebSocket(url)

    ws.onopen = () => {
        showLobby()
    }

    ws.onmessage = (e) => {
        try { handleMessage(JSON.parse(e.data)) } catch {}
    }

    ws.onclose = () => {
        if (gameState !== 'lobby') {
            showLobby()
            setLobbyError('Conexión perdida. Reconectando...')
            setTimeout(connect, 2500)
        }
    }

    ws.onerror = () => {
        setLobbyError('No se pudo conectar al servidor.')
    }
}

// ---- Message router ----

// handleMessage es el router central de mensajes del servidor.
// Cada mensaje tiene un `type` que determina el handler. Los handlers
// onXxx actualizan gameState, renderean UI y disparan efectos (SFX).
function handleMessage(msg) {
    switch (msg.type) {
        case 'room_created':          onRoomCreated(msg); break
        case 'opponent_joined':       onOpponentJoined(); break
        case 'room_joined':           onRoomJoined(); break
        case 'in_queue':              onInQueue(); break
        case 'matched':               onMatched(); break
        case 'match_start':           onMatchStart(msg); break
        case 'round_start':           onRoundStart(msg); break
        case 'go':                    onGo(); break
        case 'both_early':            onBothEarly(); break
        case 'round_result':          onRoundResult(msg); break
        case 'match_end':             onMatchEnd(msg); break
        case 'opponent_disconnected': onOpponentDisconnected(msg); break
        case 'rematch_available':     onRematchAvailable(); break
        case 'rematch_requested':     onRematchRequested(msg); break
        case 'rematch_starting':      onRematchStarting(); break
        case 'rematch_declined':      onRematchDeclined(); break
        case 'rematch_timeout':       onRematchTimeout(); break
        case 'chat':                  onChat(msg); break
        case 'error':                 setLobbyError(msg.message); break
    }
}

// ---- Game message handlers ----

function onRoomCreated(msg) {
    gameState = 'waiting_room'
    lobbyBtns.style.display = 'none'
    joinPanel.style.display = 'none'
    roomCodeEl.textContent = msg.code
    roomCreated.style.display = ''
    inQueueEl.style.display = 'none'
}

function onOpponentJoined() {
    roomCreated.querySelector('p').textContent = '¡Oponente encontrado!'
}

function onRoomJoined() {
    gameState = 'pre_match'
}

function onInQueue() {
    gameState = 'in_queue'
    lobbyBtns.style.display = 'none'
    joinPanel.style.display = 'none'
    roomCreated.style.display = 'none'
    inQueueEl.style.display = ''
}

function onMatched() {
    gameState = 'pre_match'
}

function onMatchStart(msg) {
    gameState = 'match_start'
    showGameSection()
    clearChat()
    SFX.hideOverlay()

    scoreLabelYou.textContent = myUsername || 'Tú'
    scoreLabelOpp.textContent = msg.opponent
    updateScore(0, 0)
    scoreRound.textContent = ''

    setColor(null)
    setMsg(`vs ${msg.opponent}`, `Tu ELO: ${msg.yourElo} — Oponente: ${msg.opponentElo}`)
    gameActions.style.display = 'none'

    addChatSystem(`Partida iniciada vs ${msg.opponent}`)
}

function onRoundStart(msg) {
    gameState = 'round_ready'
    hasClicked = false
    setColor('red')
    setMsg(`Ronda ${msg.round}`, 'Espera al verde...')
    updateScore(msg.score.you, msg.score.opponent)
    scoreRound.textContent = `RONDA ${msg.round}`
    gameActions.style.display = 'none'
}

// onGo es CRÍTICO: marca el inicio de la ventana de reacción.
// goTime se usa luego en handleAreaClick para calcular el delta.
// performance.now() es preferible a Date.now() porque tiene mejor resolución
// (sub-ms) y no se ve afectado por ajustes del reloj del sistema.
//
// Si el cliente ya hizo early click en esta ronda, ignoramos el go (no se
// pone verde ni se reproduce el sonido) — el servidor ya sabe que esta
// ronda terminó para este jugador.
function onGo() {
    if (hasClicked) return
    SFX.go()
    goTime = performance.now()
    gameState = 'round_active'
    setColor('green')
    setMsg('¡Click!', '')
}

function onBothEarly() {
    hasClicked = false
    setColor(null)
    setMsg('¡Ambos muy pronto!', 'Repitiendo ronda...')
}

function onRoundResult(msg) {
    gameState = 'round_result'
    setColor(null)
    updateScore(msg.score.you, msg.score.opponent)

    if (msg.won) { SFX.roundWin(); SFX.flashWin() }
    else         { SFX.roundLose(); SFX.flashLose() }

    const wonText = msg.won ? '¡Ganaste esta ronda!' : 'Perdiste esta ronda'
    setMsg(wonText, `Tú: ${fmtMs(msg.yourMs)} — Oponente: ${fmtMs(msg.opponentMs)}`)
}

function onMatchEnd(msg) {
    gameState = 'match_end'
    setColor(null)
    scoreRound.textContent = 'FIN'

    const sign = msg.eloChange >= 0 ? '+' : ''
    const eloLine = `${sign}${msg.eloChange} ELO → ${msg.newElo}`
    const wonText = msg.won ? '¡Ganaste la partida!' : 'Perdiste la partida'
    setMsg(wonText, `ELO: ${eloLine}  ·  ${msg.score.you}–${msg.score.opponent}`)

    if (msg.won) { SFX.matchWin(); SFX.startConfetti(); SFX.showOverlay(true,  eloLine) }
    else         { SFX.matchLose();                     SFX.showOverlay(false, eloLine) }

    showRematchUI('available')
}

function onOpponentDisconnected(msg) {
    gameState = 'match_end'
    setColor(null)
    scoreRound.textContent = 'FIN'

    const sign = msg.eloChange >= 0 ? '+' : ''
    const eloLine = `${sign}${msg.eloChange} ELO → ${msg.newElo}`
    setMsg('Oponente desconectado', `Ganaste por abandono · ELO: ${eloLine}`)
    addChatSystem('El oponente se desconectó.')

    SFX.matchWin()
    SFX.startConfetti()
    SFX.showOverlay(true, eloLine)

    showRematchUI('gone')
}

// ---- Rematch handlers ----

function onRematchAvailable() {
    // Already shown in onMatchEnd; just ensure state
    if (gameState === 'match_end') {
        showRematchUI('available')
    }
}

function onRematchRequested(msg) {
    addChatSystem(`${msg.from} quiere la revancha.`)
    showRematchUI('accept')
}

function onRematchStarting() {
    showRematchUI('starting')
    addChatSystem('¡Revancha iniciando!')
    setMsg('¡Revancha!', 'Preparate...')
    // Match will reset; match_start arrives from server
}

function onRematchDeclined() {
    addChatSystem('Revancha rechazada.')
    showLobby()
}

function onRematchTimeout() {
    addChatSystem('Tiempo de revancha agotado.')
    showLobby()
}

// ---- Chat handler ----

function onChat(msg) {
    const isSelf = msg.from === myUsername
    const row = document.createElement('div')
    row.className = 'chat-msg'
    row.innerHTML =
        `<span class="chat-from${isSelf ? ' is-self' : ''}">${escapeHtml(msg.from)}</span>` +
        `<span class="chat-text">${escapeHtml(msg.text)}</span>`
    chatMessages.appendChild(row)
    chatMessages.scrollTop = chatMessages.scrollHeight
}

// ---- User actions ----

function createRoom() {
    if (!wsReady()) return
    setLobbyError('')
    ws.send(JSON.stringify({ type: 'create_room' }))
}

function showJoin() {
    joinPanel.style.display = ''
    document.getElementById('roomCodeInput').focus()
}

function hideJoin() {
    joinPanel.style.display = 'none'
}

function joinRoom() {
    const code = document.getElementById('roomCodeInput').value.trim().toUpperCase()
    if (code.length !== 6) {
        setLobbyError('El código debe tener 6 caracteres')
        return
    }
    if (!wsReady()) return
    setLobbyError('')
    ws.send(JSON.stringify({ type: 'join_room', code }))
}

function findMatch() {
    if (!wsReady()) return
    setLobbyError('')
    ws.send(JSON.stringify({ type: 'find_match' }))
}

function cancelQueue() {
    if (!wsReady()) return
    ws.send(JSON.stringify({ type: 'cancel_find_match' }))
    showLobby()
}

function cancelWait() {
    ws.close()
    showLobby()
    connect()
}

function backToLobby() {
    showLobby()
}

// sendChat manda el mensaje al servidor Y lo muestra localmente. El
// servidor solo lo reenvía al OTRO jugador para evitar duplicados.
// Mostrarlo local hace que el chat se sienta instantáneo aunque la
// conexión tenga latencia.
function sendChat() {
    const text = chatInput.value.trim()
    if (!text || !wsReady()) return
    ws.send(JSON.stringify({ type: 'chat', text }))
    chatInput.value = ''
    onChat({ from: myUsername, text })
}

function requestRematch() {
    if (!wsReady()) return
    gameState = 'rematch_pending'
    ws.send(JSON.stringify({ type: 'rematch_request' }))
    showRematchUI('pending')
}

function acceptRematch() {
    requestRematch()
}

function declineRematch() {
    if (wsReady()) {
        ws.send(JSON.stringify({ type: 'rematch_decline' }))
    }
    showLobby()
}

// ---- Click handler ----

// handleAreaClick es el corazón del input del juego. Es el handler de
// mousedown y touchstart en el gameArea (todo el div grande).
//
// Detalles:
//  - El `closest('button, a, input')` es CRÍTICO: el gameArea contiene
//    los botones de revancha y chat. Sin este check, preventDefault
//    bloquearía los clicks en esos botones (especialmente en móvil donde
//    preventDefault en touchstart suprime el click sintético).
//  - hasClicked previene doble envío en una misma ronda.
//  - Solo round_active y round_ready aceptan click; otros estados lo ignoran.
function handleAreaClick(e) {
    if (e.target.closest('button, a, input')) return

    e.preventDefault()
    e.stopPropagation()
    if (!wsReady() || hasClicked) return

    if (gameState === 'round_active') {
        hasClicked = true
        const ms = Math.round(performance.now() - goTime)
        // Sub-100ms es físicamente imposible para reacción humana. El
        // servidor también lo valida (lo trata como early), pero lo
        // detectamos aquí para dar feedback inmediato sin esperar el
        // round-trip.
        if (ms < 100) {
            ws.send(JSON.stringify({ type: 'early_click' }))
            SFX.early()
            SFX.shakeEarly()
            setColor(null)
            setMsg('¡Demasiado pronto!', 'Perdiste esta ronda')
            return
        }
        ws.send(JSON.stringify({ type: 'reaction', ms }))
        setMsg('...', '')
    } else if (gameState === 'round_ready') {
        hasClicked = true
        ws.send(JSON.stringify({ type: 'early_click' }))
        SFX.early()
        SFX.shakeEarly()
        setColor(null)
        setMsg('¡Demasiado pronto!', 'Perdiste esta ronda')
    }
}

// ---- UI helpers ----

function showLobby() {
    gameState = 'lobby'
    lobbySection.style.display = ''
    gameSection.style.display = 'none'
    lobbyBtns.style.display = ''
    joinPanel.style.display = 'none'
    roomCreated.style.display = 'none'
    inQueueEl.style.display = 'none'
    setLobbyError('')
    document.getElementById('roomCodeInput').value = ''
}

function showGameSection() {
    lobbySection.style.display = 'none'
    gameSection.style.display = ''
}

function setColor(c) {
    gameArea.classList.remove('red', 'green')
    if (c) gameArea.classList.add(c)
}

function setMsg(msg, note) {
    gameMsg.textContent = msg
    gameNote.textContent = note
}

function updateScore(you, opp) {
    scoreYou.textContent = you
    scoreOpp.textContent = opp
}

function setLobbyError(msg) {
    lobbyError.textContent = msg
}

// showRematchUI muestra los botones de fin de partida según el estado:
//   available → "Revancha" + "Volver al lobby"   (estado inicial)
//   pending   → "Esperando..."                    (yo pedí, espero al rival)
//   accept    → "Aceptar revancha" + "Rechazar"   (rival pidió, espero mi decisión)
//   starting  → "¡Comenzando!"                    (ambos aceptaron, pausa antes de empezar)
//   gone      → solo "Volver al lobby"            (rival se desconectó, no hay revancha)
//
// mode: 'available' | 'pending' | 'accept' | 'starting' | 'gone'
function showRematchUI(mode) {
    gameActions.style.display = ''
    rematchNote.textContent = ''

    if (mode === 'available') {
        btnRematch.textContent = 'Revancha'
        btnRematch.className = 'btn btn-outline btn-lg'
        btnRematch.disabled = false
        btnRematch.style.display = ''
        btnRematch.onclick = requestRematch
        btnDecline.textContent = 'Volver al lobby'
        btnDecline.style.display = ''
    } else if (mode === 'pending') {
        btnRematch.textContent = 'Esperando...'
        btnRematch.className = 'btn btn-lg'
        btnRematch.disabled = true
        btnDecline.textContent = 'Cancelar'
        btnDecline.style.display = ''
    } else if (mode === 'accept') {
        btnRematch.textContent = 'Aceptar revancha'
        btnRematch.className = 'btn btn-accent btn-lg'
        btnRematch.disabled = false
        btnRematch.onclick = acceptRematch
        btnDecline.textContent = 'Rechazar'
        btnDecline.style.display = ''
    } else if (mode === 'starting') {
        btnRematch.textContent = '¡Comenzando!'
        btnRematch.className = 'btn btn-lg'
        btnRematch.disabled = true
        btnDecline.style.display = 'none'
    } else if (mode === 'gone') {
        // Opponent disconnected — no rematch
        btnRematch.style.display = 'none'
        btnDecline.textContent = 'Volver al lobby'
        btnDecline.style.display = ''
    }
}

function clearChat() {
    chatMessages.innerHTML = ''
}

function addChatSystem(text) {
    const el = document.createElement('div')
    el.className = 'chat-system'
    el.textContent = text
    chatMessages.appendChild(el)
    chatMessages.scrollTop = chatMessages.scrollHeight
}

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function fmtMs(ms) {
    if (ms === -1) return 'muy pronto'
    if (ms >= 9000) return 'timeout'
    return `${ms}ms`
}

function wsReady() {
    return ws && ws.readyState === WebSocket.OPEN
}

// ---- Init ----

gameArea.addEventListener('mousedown', handleAreaClick)
gameArea.addEventListener('touchstart', handleAreaClick, { passive: false })

connect()
