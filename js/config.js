// CONFIG centraliza las URLs del backend para que el resto del frontend
// no las repita. En desarrollo se sobreescribe a localhost (ver
// gen-config.sh en el backend, que genera este archivo desde variables
// de entorno). En producción apunta al deploy de Railway.
const CONFIG = {
    backendUrl: 'https://rankedms-backend-production.up.railway.app',
    backendWs:  'wss://rankedms-backend-production.up.railway.app',
}
