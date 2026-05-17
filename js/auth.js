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

    requireLogin() {
        if (!this.isLoggedIn()) {
            window.location.href = '/login/'
            return false
        }
        return true
    },

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
