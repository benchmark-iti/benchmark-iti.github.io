let ws = null
let goTime = null
let gameState = 'lobby' // lobby | waiting_room | in_queue | match_start | round_ready | round_active | round_result | match_end
let hasClicked = false

// ---- DOM refs ----

const lobbySection  = document.getElementById('lobbySection')
const gameSection   = document.getElementById('gameSection')
const gameArea      = document.getElementById('gameArea')
const gameMsg       = document.getElementById('gameMsg')
const gameNote      = document.getElementById('gameNote')
const gameActions   = document.getElementById('gameActions')
const scoreYou      = document.getElementById('scoreYou')
const scoreOpp      = document.getElementById('scoreOpp')
const scoreLabelYou = document.getElementById('scoreLabelYou')
const scoreLabelOpp = document.getElementById('scoreLabelOpp')
const lobbyError    = document.getElementById('lobbyError')
const roomCreated   = document.getElementById('roomCreated')
const roomCodeEl    = document.getElementById('roomCode')
const inQueueEl     = document.getElementById('inQueue')
const lobbyBtns     = document.getElementById('lobbyBtns')
const joinPanel     = document.getElementById('joinPanel')

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
        case 'room_created':      onRoomCreated(msg); break
        case 'opponent_joined':   onOpponentJoined(); break
        case 'room_joined':       onRoomJoined(); break
        case 'in_queue':          onInQueue(); break
        case 'matched':           onMatched(); break
        case 'match_start':       onMatchStart(msg); break
        case 'round_start':       onRoundStart(msg); break
        case 'go':                onGo(); break
        case 'both_early':        onBothEarly(); break
        case 'round_result':      onRoundResult(msg); break
        case 'match_end':         onMatchEnd(msg); break
        case 'opponent_disconnected': onOpponentDisconnected(msg); break
        case 'error':             setLobbyError(msg.message); break
    }
}

// ---- Message handlers ----

function onRoomCreated(msg) {
    gameState = 'waiting_room'
    lobbyBtns.style.display = 'none'
    joinPanel.style.display = 'none'
    roomCodeEl.textContent = msg.code
    roomCreated.style.display = ''
    inQueueEl.style.display = 'none'
}

function onOpponentJoined() {
    // Creator is notified that someone joined; match_start is coming
    roomCreated.querySelector('p').textContent = '¡Oponente encontrado!'
}

function onRoomJoined() {
    // Joiner: match_start is coming immediately
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
    // Matchmaking found an opponent; match_start is coming
    gameState = 'pre_match'
}

function onMatchStart(msg) {
    gameState = 'match_start'
    showGameSection()

    const user = AUTH.getUser()
    scoreLabelYou.textContent = user ? user.username : 'Tú'
    scoreLabelOpp.textContent = msg.opponent
    updateScore(0, 0)

    setColor(null)
    setMsg(`vs ${msg.opponent}`, `Tu ELO: ${msg.yourElo} — Oponente: ${msg.opponentElo}`)
    gameActions.style.display = 'none'
}

function onRoundStart(msg) {
    gameState = 'round_ready'
    hasClicked = false
    setColor('red')
    setMsg(`Ronda ${msg.round}`, 'Espera al verde...')
    updateScore(msg.score.you, msg.score.opponent)
}

function onGo() {
    goTime = performance.now()
    hasClicked = false
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

    const sign = msg.eloChange >= 0 ? '+' : ''
    const wonText = msg.won ? '¡Ganaste la partida!' : 'Perdiste la partida'
    setMsg(wonText, `ELO: ${sign}${msg.eloChange} → ${msg.newElo}  |  ${msg.score.you}–${msg.score.opponent}`)
    gameActions.style.display = ''
}

function onOpponentDisconnected(msg) {
    gameState = 'match_end'
    setColor(null)

    const sign = msg.eloChange >= 0 ? '+' : ''
    setMsg('Oponente desconectado', `Ganaste por abandono | ELO: ${sign}${msg.eloChange} → ${msg.newElo}`)
    gameActions.style.display = ''
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

// ---- Click handler ----

function handleAreaClick(e) {
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
    // Reset lobby to initial state
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
