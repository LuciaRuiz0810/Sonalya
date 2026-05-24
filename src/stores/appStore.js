/**
 * =============================================================================
 * ALMACÉN GLOBAL DE LA APLICACIÓN (App Store)
 * =============================================================================
 *
 * Este archivo contiene el estado global reactivo de toda la aplicación Sonalya.
 * Utiliza el sistema de reactividad de Vue 3 para mantener sincronizados todos
 * los componentes que dependen de estos datos.
 *
 * Secciones del estado:
 * - Tema: Controla el modo claro/oscuro de la interfaz
 * - Reproductor: Estado actual del reproductor de música
 * - Usuario: Información del usuario autenticado
 * - Notificación: Sistema de notificaciones toast
 *
 * @author Lucia Ruiz Salvador
 * @version 1.0.0
 */

import { reactive } from 'vue'
import { usuario as usuarioSvc } from '@/servicios/usuario'

// =============================================================================
// ESTADO GLOBAL REACTIVO
// =============================================================================

/**
 * Estado global de la aplicación
 * Todos los componentes pueden acceder y reaccionar a cambios en este objeto
 */
export const almacenApp = reactive({

    // -------------------------------------------------------------------------
    // CONFIGURACIÓN DEL TEMA
    // -------------------------------------------------------------------------

    /**
     * Tema actual de la interfaz ('oscuro' o 'claro')
     * Se persiste en localStorage para mantener la preferencia del usuario
     */
    tema: localStorage.getItem('tema') || 'oscuro',

    // -------------------------------------------------------------------------
    // ESTADO DEL REPRODUCTOR DE MÚSICA
    // -------------------------------------------------------------------------

    /**
     * Objeto con toda la información del reproductor de música
     * Incluye la canción actual, estado de reproducción, volumen, etc.
     */
    reproductor: {
        titulo:       '',
        artista:      '',
        imagen:       '',
        previewUrl:   null,
        deezerId:     null,
        artistaId:    null,
        tipo:         'cancion',
        reproduciendo: false,
        progreso:     0,
        volumen:      70,
        duracion:     '0:00',
        tiempoActual: '0:00',
        esFavorito:   false,
    },

    // -------------------------------------------------------------------------
    // NAVEGACIÓN (sin Vue Router)
    // -------------------------------------------------------------------------

    /**
     * Página actualmente visible en la aplicación
     * Valores posibles: 'inicio', 'buscar', 'perfil', 'eventos'
     */
    paginaActual: 'inicio',

    // -------------------------------------------------------------------------
    // AUTENTICACIÓN
    // -------------------------------------------------------------------------

    autenticado: !!localStorage.getItem('token_auth'),
    token: localStorage.getItem('token_auth') || null,

    // -------------------------------------------------------------------------
    // FAVORITOS GLOBALES (Set de deezer_ids como strings)
    // -------------------------------------------------------------------------

    idsFavCanciones: new Set(),
    favsCancionesCargados: false,

    // -------------------------------------------------------------------------
    // PLAYLISTS DEL USUARIO (para dropdown "Añadir a playlist")
    // -------------------------------------------------------------------------

    misPlaylists: [],
    playlistsCargadas: false,

    // -------------------------------------------------------------------------
    // COLA DE REPRODUCCIÓN
    // -------------------------------------------------------------------------

    cola: [],
    indiceActual: -1,
    mostrarCola: false,
    aleatorio: false,
    colaOriginal: [],
    colaOrigen: { tipo: null, id: null },

    // -------------------------------------------------------------------------
    // INFORMACIÓN DEL USUARIO
    // -------------------------------------------------------------------------

    usuario: JSON.parse(localStorage.getItem('usuario_datos') || 'null') || {
        id: null,
        nombre: '',
        nombreUsuario: '',
        correo: '',
        avatar: null,
        cantidadPlaylists: 0,
        cantidadCanciones: 0,
        cantidadArtistas: 0,
    },

    // -------------------------------------------------------------------------
    // MODAL DE AUTENTICACIÓN
    // -------------------------------------------------------------------------

    modalAuth: {
        visible: false,
        pestana: 'login',
    },

    // -------------------------------------------------------------------------
    // CACHÉ DE PÁGINAS (evita recargar datos al volver a una página)
    // -------------------------------------------------------------------------

    paginaCache: {},

    // -------------------------------------------------------------------------
    // SISTEMA DE NOTIFICACIONES
    // -------------------------------------------------------------------------

    /**
     * Estado del sistema de notificaciones toast
     * Las notificaciones aparecen brevemente y desaparecen automáticamente
     */
    notificacion: {
        /** Controla la visibilidad de la notificación */
        visible: false,

        /** Texto del mensaje a mostrar */
        mensaje: ''
    }
})

// Exportar también con el nombre anterior para compatibilidad
export const appStore = almacenApp

// =============================================================================
// FUNCIONES DE AUTENTICACIÓN
// =============================================================================

export function sincronizarUsuario(usuarioApi) {
    almacenApp.usuario = {
        id:                usuarioApi.id,
        nombre:            usuarioApi.nombre,
        nombreArtista:     usuarioApi.nombre_artista || null,
        nombreUsuario:     usuarioApi.nombre_usuario,
        correo:            usuarioApi.email,
        tipo:              usuarioApi.tipo || 'oyente',
        avatar:            usuarioApi.url_avatar || null,
        biografia:         usuarioApi.biografia || '',
        cantidadPlaylists: almacenApp.usuario?.cantidadPlaylists || 0,
        cantidadCanciones: almacenApp.usuario?.cantidadCanciones || 0,
        cantidadArtistas:  almacenApp.usuario?.cantidadArtistas  || 0,
    }
    localStorage.setItem('usuario_datos', JSON.stringify(almacenApp.usuario))
}

export function iniciarSesion(usuarioApi, token) {
    almacenApp.autenticado = true
    almacenApp.token = token
    localStorage.setItem('token_auth', token)
    sincronizarUsuario(usuarioApi)
}

export function cerrarSesion() {
    almacenApp.autenticado = false
    almacenApp.token = null
    almacenApp.usuario = { id: null, nombre: '', nombreUsuario: '', correo: '', avatar: null, cantidadPlaylists: 0, cantidadCanciones: 0, cantidadArtistas: 0 }
    localStorage.removeItem('token_auth')
    localStorage.removeItem('usuario_datos')
    almacenApp.idsFavCanciones.clear()
    almacenApp.favsCancionesCargados = false
    almacenApp.misPlaylists = []
    almacenApp.playlistsCargadas = false
    // Limpiar TODA la caché: artista_*, album_*, eventos_lista, etc. contienen
    // datos por usuario (siguiendo, guardado, tiene_entrada) y deben borrarse
    cacheLimpiar()
    cerrarReproductor()
}

export function abrirModalAuth(pestana = 'login') {
    almacenApp.modalAuth.pestana = pestana
    almacenApp.modalAuth.visible = true
}

export function cerrarModalAuth() {
    almacenApp.modalAuth.visible = false
}

// =============================================================================
// FUNCIONES PARA GESTIÓN DEL TEMA
// =============================================================================

/**
 * Alterna entre el tema oscuro y claro
 * Actualiza el localStorage y las clases CSS del body
 *
 * @example
 * // En un componente Vue:
 * import { alternarTema } from '@/stores/appStore'
 * alternarTema() // Cambia de oscuro a claro o viceversa
 */
export function alternarTema() {
    // Cambiar el valor del tema al opuesto
    almacenApp.tema = almacenApp.tema === 'oscuro' ? 'claro' : 'oscuro'

    // Guardar la preferencia en localStorage para persistencia
    localStorage.setItem('tema', almacenApp.tema)

    // Aplicar o remover la clase CSS correspondiente al body
    if (almacenApp.tema === 'claro') {
        document.body.classList.add('light-mode')
    } else {
        document.body.classList.remove('light-mode')
    }
}

// Exportar también con nombre anterior para compatibilidad
export const toggleTema = alternarTema

/**
 * Inicializa el tema al cargar la aplicación
 * Lee la preferencia guardada en localStorage y aplica las clases CSS
 * Debe llamarse en el hook onMounted del componente raíz
 *
 * @example
 * onMounted(() => {
 *     inicializarTema()
 * })
 */
export function inicializarTema() {
    // Si el tema guardado es claro, aplicar la clase correspondiente
    if (almacenApp.tema === 'claro') {
        document.body.classList.add('light-mode')
    }
}

// =============================================================================
// FUNCIONES PARA GESTIÓN DEL REPRODUCTOR
// =============================================================================

/**
 * Actualiza la información de la canción actual en el reproductor
 * También guarda los datos en localStorage para persistir entre sesiones
 *
 * @param {string} titulo - Título de la canción
 * @param {string} artista - Nombre del artista
 * @param {string} [imagen] - URL de la imagen de portada (opcional)
 *
 * @example
 * actualizarReproductor('Bohemian Rhapsody', 'Queen', 'https://...')
 */
export function actualizarReproductor(titulo, artista, imagen, previewUrl = null, deezerId = null, tipo = 'cancion', artistaId = null, duracion = null) {
    almacenApp.reproductor.titulo       = titulo
    almacenApp.reproductor.artista      = artista
    almacenApp.reproductor.previewUrl   = previewUrl || null
    almacenApp.reproductor.deezerId     = deezerId
    almacenApp.reproductor.artistaId    = artistaId
    almacenApp.reproductor.tipo         = tipo
    almacenApp.reproductor.progreso     = 0
    almacenApp.reproductor.tiempoActual = '0:00'
    almacenApp.reproductor.duracion     = duracion || '0:00'
    // Si el Set de favoritos ya está cargado, aplicar el estado de inmediato
    almacenApp.reproductor.esFavorito = (almacenApp.favsCancionesCargados && deezerId)
        ? almacenApp.idsFavCanciones.has(String(deezerId))
        : false

    if (imagen) almacenApp.reproductor.imagen = imagen

    if (almacenApp.autenticado && deezerId) {
        usuarioSvc.registrarHistorial({
            deezer_id: String(deezerId),
            tipo,
            titulo,
            artista,
            imagen:  imagen || '',
            preview: previewUrl || '',
        }).catch(() => {})
        // Invalidar caché de historial y populares para que se actualicen
        delete almacenApp.paginaCache['historial']
        delete almacenApp.paginaCache['inicio_populares']

        // Solo hacer la llamada async si el Set aún no se ha cargado
        if (!almacenApp.favsCancionesCargados) {
            usuarioSvc.estadoFavorito('cancion', deezerId)
                .then(r => { almacenApp.reproductor.esFavorito = r.esFavorito })
                .catch(() => {})
        }
    }

}

/**
 * Alterna el estado de reproducción (play/pause)
 * Cambia entre reproduciendo y pausado
 *
 * @example
 * alternarReproduccion() // Si estaba pausado, reproduce. Si reproducía, pausa.
 */
export function alternarReproduccion() {
    almacenApp.reproductor.reproduciendo = !almacenApp.reproductor.reproduciendo
}

// Exportar también con nombre anterior para compatibilidad
export const toggleReproduccion = alternarReproduccion

/**
 * Alterna el estado de favorito de la canción actual.
 * Si el usuario está autenticado, sincroniza con el backend.
 */
export async function alternarFavorito() {
    const rep = almacenApp.reproductor
    if (!rep.deezerId) return

    if (!almacenApp.autenticado) {
        mostrarNotificacion('Inicia sesión para guardar favoritos')
        return
    }

    // Usar el Set como fuente de verdad si está cargado
    const estadoActual = (almacenApp.favsCancionesCargados && rep.deezerId)
        ? almacenApp.idsFavCanciones.has(String(rep.deezerId))
        : rep.esFavorito
    const nuevoEstado = !estadoActual
    rep.esFavorito = nuevoEstado

    try {
        if (nuevoEstado) {
            await usuarioSvc.agregarCancionFav({
                deezer_id: String(rep.deezerId),
                titulo:    rep.titulo,
                artista:   rep.artista,
                imagen:    rep.imagen || '',
                duracion:  rep.duracion || '',
                preview:   rep.previewUrl || '',
            })
            almacenApp.idsFavCanciones.add(String(rep.deezerId))
            mostrarNotificacion(`"${rep.titulo}" añadida a favoritos`)
        } else {
            await usuarioSvc.quitarCancionFav(rep.deezerId)
            almacenApp.idsFavCanciones.delete(String(rep.deezerId))
            mostrarNotificacion(`"${rep.titulo}" eliminada de favoritos`)
        }
    } catch (_) {
        rep.esFavorito = !nuevoEstado
        mostrarNotificacion('No se pudo actualizar favoritos')
    }
}

// Exportar también con nombre anterior para compatibilidad
export const toggleFavorito = alternarFavorito

/**
 * Cambia el progreso de reproducción de la canción
 * Se usa cuando el usuario hace clic en la barra de progreso
 *
 * @param {number} porcentaje - Valor entre 0 y 100
 *
 * @example
 * cambiarProgreso(50) // Ir a la mitad de la canción
 */
export function cambiarProgreso(porcentaje) {
    // Asegurar que el valor está en el rango válido
    almacenApp.reproductor.progreso = Math.max(0, Math.min(100, porcentaje))
}

/**
 * Cambia el nivel de volumen del reproductor
 * Se usa cuando el usuario ajusta el control de volumen
 *
 * @param {number} porcentaje - Valor entre 0 (silencio) y 100 (máximo)
 *
 * @example
 * cambiarVolumen(75) // Volumen al 75%
 */
export function cambiarVolumen(porcentaje) {
    // Asegurar que el valor está en el rango válido
    almacenApp.reproductor.volumen = Math.max(0, Math.min(100, porcentaje))
}

// =============================================================================
// FUNCIONES PARA NAVEGACIÓN
// =============================================================================

/**
 * Cambia la página actual de la aplicación
 * Actualiza el estado de navegación sin usar Vue Router
 *
 * @param {string} pagina - Identificador de la página ('inicio', 'buscar', 'perfil', 'eventos')
 *
 * @example
 * cambiarPagina('perfil') // Navegar a la página de perfil
 */
export function cambiarPagina(pagina) {
    almacenApp.paginaActual = pagina
}

// =============================================================================
// FUNCIONES PARA NOTIFICACIONES
// =============================================================================

/**
 * Muestra una notificación toast temporal
 * La notificación aparece y desaparece automáticamente después de 3 segundos
 *
 * @param {string} mensaje - Texto a mostrar en la notificación
 *
 * @example
 * mostrarNotificacion('Canción añadida a favoritos')
 */
export function mostrarNotificacion(mensaje) {
    // Establecer el mensaje y hacerla visible
    almacenApp.notificacion.mensaje = mensaje
    almacenApp.notificacion.visible = true

    // Ocultar automáticamente después de 3 segundos
    setTimeout(() => {
        almacenApp.notificacion.visible = false
    }, 3000)
}

// =============================================================================
// FUNCIONES PARA GESTIÓN DEL USUARIO
// =============================================================================

/**
 * Actualiza los datos del perfil del usuario
 * Fusiona los nuevos datos con los existentes y muestra una notificación
 *
 * @param {Object} datos - Objeto con los campos a actualizar
 * @param {string} [datos.nombre] - Nuevo nombre del usuario
 * @param {string} [datos.correo] - Nuevo correo electrónico
 * @param {string} [datos.nombreUsuario] - Nuevo nombre de usuario
 *
 * @example
 * actualizarUsuario({ nombre: 'Juan López', correo: 'juan@email.com' })
 */
export function actualizarUsuario(datos) {
    // Fusionar los nuevos datos con los existentes
    Object.assign(almacenApp.usuario, datos)

    // Notificar al usuario del cambio exitoso
    mostrarNotificacion('Perfil actualizado correctamente')
}

// =============================================================================
// CARGA INICIAL DE FAVORITOS
// =============================================================================

// =============================================================================
// FUNCIONES DE COLA DE REPRODUCCIÓN
// =============================================================================

function _cancionParaCola(c) {
    return {
        id:        c.id || c.deezer_id || null,
        titulo:    c.titulo || c.nombre || '',
        artista:   c.artista,
        imagen:    c.imagen  || null,
        preview:   c.preview || null,
        artista_id: c.artista_id || null,
        duracion:  c.duracion  || null,
    }
}

// Reproduce una sola canción sin importar si tiene preview o no.
// Úsalo para clicks individuales desde TarjetaCancion.
export function reproducirCancion(cancion) {
    const c = _cancionParaCola(cancion)
    almacenApp.aleatorio = false
    almacenApp.colaOrigen = { tipo: 'cancion', id: c.id }
    if (c.preview) {
        almacenApp.cola = [c]
        almacenApp.colaOriginal = [c]
        almacenApp.indiceActual = 0
    } else {
        almacenApp.cola = []
        almacenApp.colaOriginal = []
        almacenApp.indiceActual = -1
    }
    actualizarReproductor(c.titulo, c.artista, c.imagen, c.preview, c.id, 'cancion', c.artista_id, c.duracion)
}

// Reproduce una lista completa (álbum / playlist). Filtra las que no tienen preview.
// aleatorio: si true, mezcla la cola antes de empezar
// tipo/id: identifica el origen para detectar "mismo álbum ya reproduciendo"
export function reproducirCola(canciones, inicio = 0, aleatorio = false, tipo = null, id = null) {
    const conPreview = canciones.filter(c => c.preview).map(_cancionParaCola)
    if (!conPreview.length) {
        mostrarNotificacion('Ninguna canción tiene preview disponible')
        return
    }
    almacenApp.colaOriginal = conPreview
    almacenApp.colaOrigen = { tipo, id }
    almacenApp.aleatorio = aleatorio

    const ordenado = aleatorio
        ? [...conPreview].sort(() => Math.random() - 0.5)
        : conPreview
    almacenApp.cola = ordenado
    almacenApp.indiceActual = aleatorio ? 0 : Math.min(inicio, ordenado.length - 1)
    const c = almacenApp.cola[almacenApp.indiceActual]
    actualizarReproductor(c.titulo, c.artista, c.imagen, c.preview, c.id, 'cancion', c.artista_id, c.duracion)
}

// Activa o desactiva el modo aleatorio sobre la cola actual.
export function alternarAleatorio() {
    if (!almacenApp.cola.length) return
    if (almacenApp.aleatorio) {
        // Volver al orden original
        const actual = almacenApp.cola[almacenApp.indiceActual]
        almacenApp.cola = [...almacenApp.colaOriginal]
        const nuevo = almacenApp.cola.findIndex(c => c.id === actual?.id)
        almacenApp.indiceActual = nuevo >= 0 ? nuevo : 0
        almacenApp.aleatorio = false
    } else {
        // Mezclar: la canción actual va primero, el resto se baraja
        almacenApp.colaOriginal = [...almacenApp.cola]
        const actual = almacenApp.cola[almacenApp.indiceActual]
        const restantes = almacenApp.cola.filter((_, i) => i !== almacenApp.indiceActual)
        restantes.sort(() => Math.random() - 0.5)
        almacenApp.cola = [actual, ...restantes]
        almacenApp.indiceActual = 0
        almacenApp.aleatorio = true
    }
}

export function agregarACola(cancion) {
    if (!cancion.preview) {
        mostrarNotificacion('Esta canción no tiene preview disponible')
        return
    }
    almacenApp.cola.push(_cancionParaCola(cancion))
    mostrarNotificacion(`"${cancion.titulo}" añadida a la cola`)
}

export function siguienteEnCola() {
    const sig = almacenApp.indiceActual + 1
    if (almacenApp.cola.length > 0 && sig < almacenApp.cola.length) {
        almacenApp.indiceActual = sig
        const c = almacenApp.cola[sig]
        actualizarReproductor(c.titulo, c.artista, c.imagen, c.preview, c.id, 'cancion', c.artista_id, c.duracion)
    } else {
        cerrarReproductor()
    }
}

export function anteriorEnCola() {
    const ant = almacenApp.indiceActual - 1
    if (ant >= 0) {
        almacenApp.indiceActual = ant
        const c = almacenApp.cola[ant]
        actualizarReproductor(c.titulo, c.artista, c.imagen, c.preview, c.id, 'cancion', c.artista_id, c.duracion)
    }
}

export function irACola(indice) {
    if (indice < 0 || indice >= almacenApp.cola.length) return
    almacenApp.indiceActual = indice
    const c = almacenApp.cola[indice]
    actualizarReproductor(c.titulo, c.artista, c.imagen, c.preview, c.id, 'cancion', c.artista_id, c.duracion)
}

export function quitarDeCola(indice) {
    if (indice < 0 || indice >= almacenApp.cola.length) return
    const eraActual = (indice === almacenApp.indiceActual)
    almacenApp.cola.splice(indice, 1)

    if (almacenApp.cola.length === 0) {
        cerrarReproductor()
        return
    }
    if (indice < almacenApp.indiceActual) {
        almacenApp.indiceActual--
    } else if (eraActual) {
        if (almacenApp.indiceActual >= almacenApp.cola.length) {
            almacenApp.indiceActual = almacenApp.cola.length - 1
        }
        const c = almacenApp.cola[almacenApp.indiceActual]
        actualizarReproductor(c.titulo, c.artista, c.imagen, c.preview, c.id, 'cancion', c.artista_id, c.duracion)
    }
}

export function cerrarReproductor() {
    almacenApp.cola = []
    almacenApp.indiceActual = -1
    almacenApp.mostrarCola = false
    almacenApp.aleatorio = false
    almacenApp.colaOriginal = []
    almacenApp.colaOrigen = { tipo: null, id: null }
    almacenApp.reproductor.titulo      = ''
    almacenApp.reproductor.artista     = ''
    almacenApp.reproductor.previewUrl  = null
    almacenApp.reproductor.reproduciendo = false
    almacenApp.reproductor.progreso    = 0
    almacenApp.reproductor.tiempoActual = '0:00'
    almacenApp.reproductor.duracion    = '0:00'
}

// =============================================================================
// CACHÉ DE PÁGINAS
// =============================================================================

export function cacheGuardar(clave, datos, ttlMs = 900_000) {
    almacenApp.paginaCache[clave] = { datos, expira: Date.now() + ttlMs }
}

export function cacheObtener(clave) {
    const entrada = almacenApp.paginaCache[clave]
    if (!entrada || Date.now() > entrada.expira) return null
    return entrada.datos
}

export function cacheLimpiar(claves = null) {
    if (claves === null) {
        almacenApp.paginaCache = {}
    } else {
        claves.forEach(c => delete almacenApp.paginaCache[c])
    }
}

export async function cargarMisPlaylists() {
    if (!almacenApp.autenticado) return
    almacenApp.playlistsCargadas = false
    try {
        const resp = await usuarioSvc.playlists()
        almacenApp.misPlaylists = resp.playlists || []
    } catch (_) {} finally {
        almacenApp.playlistsCargadas = true
    }
}

export async function cargarFavsCanciones() {
    if (!almacenApp.autenticado) return
    try {
        const resp = await usuarioSvc.cancionesFav()
        almacenApp.idsFavCanciones.clear()
        ;(resp.canciones || []).forEach(c => almacenApp.idsFavCanciones.add(String(c.deezer_id)))
        almacenApp.favsCancionesCargados = true
    } catch (_) {}
}
