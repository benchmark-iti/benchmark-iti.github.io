let ws = null
let goTime = null
let gameState = 'lobby' // lobby | waiting_room | in_queue | pre_match | match_start | round_ready | round_active | round_result | match_end | rematch_pending
let hasClicked = false
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

function onGo() {
    if (hasClicked) return  // already sent early_click this round
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

    const wonText = msg.won ? '¡Ganaste esta ronda!' : 'Perdiste esta ronda'
    setMsg(wonText, `Tú: ${fmtMs(msg.yourMs)} — Oponente: ${fmtMs(msg.opponentMs)}`)
}

function onMatchEnd(msg) {
    gameState = 'match_end'
    setColor(null)
    scoreRound.textContent = 'FIN'

    const sign = msg.eloChange >= 0 ? '+' : ''
    const wonText = msg.won ? '¡Ganaste la partida!' : 'Perdiste la partida'
    setMsg(wonText, `ELO: ${sign}${msg.eloChange} → ${msg.newElo}  ·  ${msg.score.you}–${msg.score.opponent}`)

    // Show rematch/lobby buttons (rematch_available follows immediately from server)
    showRematchUI('available')
}

function onOpponentDisconnected(msg) {
    gameState = 'match_end'
    setColor(null)
    scoreRound.textContent = 'FIN'

    const sign = msg.eloChange >= 0 ? '+' : ''
    setMsg('Oponente desconectado', `Ganaste por abandono · ELO: ${sign}${msg.eloChange} → ${msg.newElo}`)
    addChatSystem('El oponente se desconectó.')
    showRematchUI('gone') // no rematch when opponent disconnected
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

function sendChat() {
    const text = chatInput.value.trim()
    if (!text || !wsReady()) return
    ws.send(JSON.stringify({ type: 'chat', text }))
    chatInput.value = ''
    onChat({ from: myUsername, text })  // show immediately; server only relays to opponent
}

function requestRematch() {
    if (!wsReady()) return
    gameState = 'rematch_pending'
    ws.send(JSON.stringify({ type: 'rematch_request' }))
    showRematchUI('pending')
    addChatSystem('Pediste la revancha...')
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

function handleAreaClick(e) {
    // Let buttons, links, and inputs inside the area handle their own events
    if (e.target.closest('button, a, input')) return

    e.preventDefault()
    e.stopPropagation()
    if (!wsReady() || hasClicked) return

    if (gameState === 'round_active') {
        hasClicked = true
        const ms = Math.round(performance.now() - goTime)
        ws.send(JSON.stringify({ type: 'reaction', ms }))
        setMsg('...', '')
    } else if (gameState === 'round_ready') {
        hasClicked = true
        ws.send(JSON.stringify({ type: 'early_click' }))
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
