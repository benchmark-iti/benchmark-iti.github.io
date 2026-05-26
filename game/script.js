// script.js es el modo offline (sin servidor, sin ELO).
//
// Máquina de estados explícita (3 estados):
//   - 'idle'    → esperando el primer click. Al hacer click se pone rojo y
//                 se programa el verde a un tiempo aleatorio.
//   - 'waiting' → rojo en pantalla, verde programado (timer pendiente). Si
//                 hace click ahora es "early" → mensaje de error, vuelve a idle.
//   - 'ready'   → el verde YA apareció. El próximo click mide la reacción.
//
// Importante: el estado NO se infiere del reloj. El verde solo "cuenta" cuando
// el timer realmente dispara y pasa a 'ready'; y el tiempo de reacción se mide
// desde el instante REAL en que apareció el verde (greenAt), no desde el
// momento programado. Esto evita el desfase entre setTimeout (que siempre
// dispara un poco tarde) y la pantalla, que antes dejaba el juego atascado en
// verde si clicabas justo en esa ventana.
let state = 'idle'
let greenAt = 0 // performance.now() del instante en que apareció el verde
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

// handleClick maneja los tres clicks posibles según el estado. preventDefault
// y stopPropagation se llaman porque mousedown + touchstart pueden dispararse
// juntos en móviles, generando doble click.
const handleClick = event => {
   event.preventDefault()
   event.stopPropagation()

   switch (state) {
      case 'idle': {
         const msUntilGreen = randomNumber(2, 5) * 1000
         clickarea.classList.remove('green')
         clickarea.classList.add('red')
         updateText(I18N.t('offline.wait'), '')
         state = 'waiting'

         timer = setTimeout(() => {
            clickarea.classList.remove('red')
            clickarea.classList.add('green')
            message.textContent = I18N.t('offline.click')
            greenAt = performance.now()
            state = 'ready'
         }, msUntilGreen)
         break
      }

      case 'waiting': {
         // Clickeó antes de que apareciera el verde — anticipación clara.
         clearTimeout(timer)
         clickarea.classList.remove('red')
         updateText(I18N.t('offline.tooSoon'), I18N.t('offline.retry'))
         state = 'idle'
         break
      }

      case 'ready': {
         // Verde ya visible: medimos desde el instante REAL en que apareció.
         const elapsed = Math.round(performance.now() - greenAt)
         clickarea.classList.remove('green')
         if (elapsed < MIN_REACTION_MS) {
            // Menos de 100ms tras el verde — humanamente imposible.
            updateText(I18N.t('offline.tooSoon'), I18N.t('offline.impossible'))
         } else {
            updateText(`${elapsed}ms`, I18N.t('offline.continue'))
         }
         state = 'idle'
         break
      }
   }
}

clickarea.addEventListener('mousedown', handleClick)
clickarea.addEventListener('touchstart', handleClick)
