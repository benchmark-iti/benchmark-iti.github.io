// AUTH es el módulo de autenticación del cliente. Persiste el token JWT
// y los datos del usuario en localStorage (no en cookies — el backend no
// usa cookies, solo Bearer tokens y query param para WS).
//
// El token sobrevive entre pestañas y reloads, pero se borra si el usuario
// hace logout o si el navegador limpia el localStorage. No hay renovación
// automática: cuando el JWT expira (30 días), el usuario tiene que volver
// a hacer login.
const AUTH = {
    getToken() {
        return localStorage.getItem('rankedms_token')
    },

    getUser() {
        try {
            return JSON.parse(localStorage.getItem('rankedms_user') || 'null')
        } catch {
            return null
        }
    },

    save(token, username) {
        localStorage.setItem('rankedms_token', token)
        localStorage.setItem('rankedms_user', JSON.stringify({ username }))
    },

    clear() {
        localStorage.removeItem('rankedms_token')
        localStorage.removeItem('rankedms_user')
    },

    isLoggedIn() {
        return !!this.getToken()
    },

    // requireLogin redirige a /login/ si el usuario no está autenticado.
    // Devuelve false en ese caso para que el caller pueda abortar (ej.
    // online.js lo usa antes de intentar conectar al WS).
    requireLogin() {
        if (!this.isLoggedIn()) {
            window.location.href = '/login/'
            return false
        }
        return true
    },

    // fetchMe obtiene los datos actualizados del usuario (ELO, wins, losses,
    // mejor tiempo) desde /api/me. El JWT solo trae username + UserID, así
    // que para mostrar el ELO actual hay que pegarle a la API.
    async fetchMe() {
        const token = this.getToken()
        if (!token) return null
        try {
            const r = await fetch(`${CONFIG.backendUrl}/api/me`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!r.ok) return null
            return r.json()
        } catch {
            return null
        }
    },

    logout() {
        this.clear()
        window.location.href = '/'
    },
}
