// script.js es el modo offline (sin servidor, sin ELO).
//
// Máquina de estados muy simple:
//   - !testStarted: esperando primer click → al hacer click se pone rojo
//     y se programa el verde a un tiempo aleatorio.
//   - testStarted + antes de finishTime: si hace click es "early" → mensaje
//     de error, reset.
//   - testStarted + después de finishTime: el verde ya apareció → se muestra
//     el tiempo de reacción (now - finishTime).
let testStarted = false
let startTime = null
let finishTime = null
let timer = null

const clickarea = document.querySelector('.clickarea')
const message = document.querySelector('.message')
const note = document.querySelector('.note')

const randomNumber = (min, max, int = false) => {
   return (int)
      ? Math.floor(Math.random() * (max - min + 1)) + min
      : Math.random() * (max - min) + min
}

const updateText = (messageText, noteText) => {
   message.textContent = messageText
   note.textContent = noteText
}

// MIN_REACTION_MS es el tiempo de reacción mínimo creíble para un humano.
// Estudios sitúan el mínimo de reacción visual + clic del ratón alrededor
// de los 100ms — cualquier valor por debajo es prácticamente imposible y se
// considera "anticipación" (early click).
const MIN_REACTION_MS = 100

// handleClick maneja AMBOS clicks: el de inicio (pone rojo + programa verde)
// y el de reacción (mide tiempo o detecta early). preventDefault y
// stopPropagation se llaman porque mousedown + touchstart pueden dispararse
// juntos en móviles, generando doble click.
const handleClick = event => {
   event.preventDefault()
   event.stopPropagation()

   if (!testStarted) {
      const msUntilGreen = randomNumber(2, 5)
      startTime = new Date()
      finishTime = new Date(startTime.getTime() + (msUntilGreen * 1000))

      clickarea.classList.add('red')
      updateText(I18N.t('offline.wait'), '')
      testStarted = true

      timer = setTimeout(() => {
         clickarea.classList.remove('red')
         clickarea.classList.add('green')
         message.textContent = I18N.t('offline.click')
      }, msUntilGreen * 1000)
   } else {
      testStarted = false

      const elapsed = new Date() - finishTime

      if (elapsed < 0) {
         // Clickeó antes del verde — anticipación clara.
         clearTimeout(timer)
         clickarea.classList.remove('red')
         updateText(I18N.t('offline.tooSoon'), I18N.t('offline.retry'))
      } else if (elapsed < MIN_REACTION_MS) {
         // Clickeó después del verde pero en menos de 100ms — humanamente
         // imposible, así que también cuenta como anticipación.
         clickarea.classList.remove('green')
         updateText(I18N.t('offline.tooSoon'), I18N.t('offline.impossible'))
      } else {
         clickarea.classList.remove('green')
         updateText(`${elapsed}ms`, I18N.t('offline.continue'))
      }
   }
}

clickarea.addEventListener('mousedown', handleClick)
clickarea.addEventListener('touchstart', handleClick)
