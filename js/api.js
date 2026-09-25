const API = {
  baseUrl: 'http://localhost:8080/api/v1',
  _mediaBaseUrl: undefined,
  get mediaBaseUrl() {
    if (this._mediaBaseUrl !== undefined) return this._mediaBaseUrl;
    if (window.location.port && window.location.port !== '8080') {
      this._mediaBaseUrl = window.location.protocol + '//' + window.location.hostname + ':8080';
    } else {
      this._mediaBaseUrl = '';
    }
    return this._mediaBaseUrl;
  },
  set mediaBaseUrl(val) { this._mediaBaseUrl = val; },

  getToken() {
    return localStorage.getItem('authToken');
  },

  tokenExpirado() {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch (_) {
      return true;
    }
  },

  minutosRestantes() {
    const token = this.getToken();
    if (!token) return 0;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Math.floor(((payload.exp * 1000) - Date.now()) / 60000);
    } catch (_) {
      return 0;
    }
  },

  _refrescando: false,
  _refrescoPromise: null,
  _enVuelo: 0,

  async refrescarToken() {
    const refresh = localStorage.getItem('refreshToken');
    if (!refresh) return null;
    if (this._refrescando && this._refrescoPromise) return this._refrescoPromise;

    this._refrescando = true;
    this._refrescoPromise = (async () => {
      try {
        const resp = await fetch(this.baseUrl + '/auth/refresh-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + refresh },
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (!data || !data.accessToken) return null;
        localStorage.setItem('authToken', data.accessToken);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        if (data.usuario) localStorage.setItem('username', data.usuario);
        if (data.nombre) localStorage.setItem('userNombre', data.nombre);
        if (data.rol) localStorage.setItem('userRol', data.rol);
        if (typeof Auth !== 'undefined' && Auth.aplicarSesion) Auth.aplicarSesion(data);
        return data;
      } catch (_) {
        return null;
      } finally {
        this._refrescando = false;
        this._refrescoPromise = null;
      }
    })();
    return this._refrescoPromise;
  },

  cerrarSesion(mensaje) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userNombre');
    localStorage.removeItem('userRol');
    if (typeof Utils !== 'undefined') {
      Utils.showToast(mensaje || 'Sesión expirada. Inicia sesión nuevamente.', 'error', 6000);
    }
    setTimeout(() => {
      if (typeof Auth !== 'undefined' && Auth.checkAuthStatus) {
        Auth.checkAuthStatus();
      }
    }, 500);
  },

  async request(endpoint, options = {}, _reintento = false) {
    if (this.tokenExpirado()) {
      const refrescado = await this.refrescarToken();
      if (!refrescado) {
        this.cerrarSesion('Tu sesión ha expirado. Inicia sesión nuevamente.');
        throw new Error('Sesión expirada');
      }
    }

    const url = this.baseUrl + endpoint;
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    const token = this.getToken();
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }

    this._enVuelo++;
    let response;
    try {
      response = await fetch(url, config);
    } catch (err) {
      this._enVuelo--;
      throw new Error('Error de conexión con el servidor');
    }
    this._enVuelo--;

    if (!response.ok) {
      if (response.status === 401 && !_reintento) {
        const refrescado = await this.refrescarToken();
        if (refrescado) return this.request(endpoint, options, true);
        this.cerrarSesion('Sesión expirada. Inicia sesión nuevamente.');
        throw new Error('Sesión expirada');
      }

      let message = 'Error en la solicitud';
      try {
        const err = await response.json();
        message = err.error || err.message || message;
      } catch (_) {}

      if (response.status === 401) {
        this.cerrarSesion('Sesión expirada. Inicia sesión nuevamente.');
        throw new Error('Sesión expirada');
      }

      if (response.status === 403) {
        throw new Error('No tienes permisos para realizar esta acción');
      }

      throw new Error(message);
    }

    if (response.status === 204) return null;
    return response.json();
  },

  async requestUpload(endpoint, formData) {
    if (this.tokenExpirado()) {
      this.cerrarSesion('Tu sesión ha expirado.');
      throw new Error('Sesión expirada');
    }

    const url = this.baseUrl + endpoint;
    const config = {
      method: 'POST',
      headers: {},
      body: formData,
    };

    const token = this.getToken();
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        let message = 'Error al subir archivo';
        try {
          const err = await response.json();
          message = err.error || message;
        } catch (_) {}

        if (response.status === 401) {
          this.cerrarSesion('Sesión expirada. Inicia sesión nuevamente.');
          throw new Error('Sesión expirada');
        }

        throw new Error(message);
      }
      return response.json();
    } catch (err) {
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint);
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  del(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  },

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  startTokenCheck() {
    setInterval(async () => {
      if (!this.getToken()) return;

      if (this.tokenExpirado()) {
        const refrescado = await this.refrescarToken();
        if (!refrescado) {
          this.cerrarSesion('Tu sesión ha expirado. Inicia sesión nuevamente.');
        }
        return;
      }

      const restantes = this.minutosRestantes();
      const restante = localStorage.getItem('tokenRenovadoEn');
      const hace = restante ? (Date.now() - parseInt(restoante, 10)) : Infinity;
      if (restantes > 30 || hace < 5 * 60 * 1000) return;
      if (this._enVuelo > 0) return;

      const refrescado = await this.refrescarToken();
      if (refrescado && typeof Utils !== 'undefined' && Utils.sincronizarMenu) {
        Utils.sincronizarMenu();
      }
    }, 60000);
  },
};

API.startTokenCheck();
