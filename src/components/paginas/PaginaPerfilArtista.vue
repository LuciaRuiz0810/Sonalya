<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Modal           from '@/components/comunes/Modal.vue'
import TarjetaCancion  from '@/components/comunes/TarjetaCancion.vue'
import TarjetaPlaylist from '@/components/comunes/TarjetaPlaylist.vue'
import { almacenApp, mostrarNotificacion, sincronizarUsuario, reproducirCola, reproducirCancion } from '@/stores/appStore'
import { usuario as usuarioSvc } from '@/servicios/usuario'
import { musica } from '@/servicios/musica'
import { api } from '@/servicios/api'

const emitir = defineEmits(['abrirPlaylist'])

const pestanaActiva = ref('musica')
const pestanas = [
    { id: 'musica',        nombre: 'Mi Música'    },
    { id: 'albumes',       nombre: 'Álbumes'       },
    { id: 'eventos',       nombre: 'Eventos'       },
    { id: 'favoritos',     nombre: 'Favoritos'     },
    { id: 'estadisticas',  nombre: 'Estadísticas'  },
    { id: 'configuracion', nombre: 'Mi Perfil'     },
]

// ── Géneros ───────────────────────────────────────────────────────────────────
const generos = ref([])
async function cargarGeneros() {
    try {
        const r = await musica.obtenerGeneros()
        generos.value = r.generos || []
    } catch (_) {}
}

// ── Perfil ────────────────────────────────────────────────────────────────────
const perfilArtista = ref(null)
const estadisticas  = ref(null)

async function cargarPerfil() {
    try {
        const r = await usuarioSvc.miPerfilArtista()
        perfilArtista.value = r.artista
    } catch (_) {}
}

async function cargarEstadisticas() {
    try {
        const r = await usuarioSvc.estadisticasArtista()
        estadisticas.value = r
    } catch (_) {}
}

// ── Helpers archivos ──────────────────────────────────────────────────────────
function detectarDuracion(archivo) {
    return new Promise((resolve) => {
        const audio = new Audio()
        const url   = URL.createObjectURL(archivo)
        audio.onloadedmetadata = () => {
            const secs = Math.round(audio.duration)
            const m = Math.floor(secs / 60)
            const s = String(secs % 60).padStart(2, '0')
            resolve(`${m}:${s}`)
            URL.revokeObjectURL(url)
        }
        audio.onerror = () => { resolve('0:00'); URL.revokeObjectURL(url) }
        audio.src = url
    })
}

function crearPreviewImagen(archivo) {
    return archivo ? URL.createObjectURL(archivo) : null
}

// ── Reproducción del propio material ─────────────────────────────────────────
function cancionAFormato(c) {
    return {
        id:         `plataforma_${c.id}`,
        titulo:     c.titulo,
        artista:    perfilArtista.value?.nombre_artista || almacenApp.usuario.nombreArtista || almacenApp.usuario.nombre,
        artista_id: `plataforma_${perfilArtista.value?.id || ''}`,
        imagen:     c.imagen || null,
        preview:    c.audio_url,
        duracion:   c.duracion,
    }
}

function reproducirDesde(indice) {
    const lista = canciones.value.map(cancionAFormato)
    reproducirCola(lista, indice, false, 'artista_propio', perfilArtista.value?.id)
    if (canciones.value[indice]?.audio_url) {
        canciones.value[indice].reproducciones = (canciones.value[indice].reproducciones || 0) + 1
        if (estadisticas.value) {
            estadisticas.value.total_reproducciones = (estadisticas.value.total_reproducciones || 0) + 1
        }
    }
}

// ── Canciones ─────────────────────────────────────────────────────────────────
const canciones            = ref([])
const cargandoCanciones    = ref(false)
const mostrarModalCancion  = ref(false)
const cancionEdicion       = ref(null)
const guardandoCancion     = ref(false)
const erroresCancion       = ref({ titulo: '', audio: '' })

const formCancion = ref({ titulo: '', genero: '', album_id: '' })
const archivoImagenCancion  = ref(null)
const archivoAudioCancion   = ref(null)
const previewImagenCancion  = ref(null)
const duracionDetectada     = ref('')
const nombreAudio           = ref('')
const inputImagenCancionRef = ref(null)
const inputAudioRef         = ref(null)

async function cargarCanciones() {
    cargandoCanciones.value = true
    try {
        const r = await usuarioSvc.misCancionesArtista()
        canciones.value = r.canciones || []
    } catch (_) { canciones.value = [] }
    finally { cargandoCanciones.value = false }
}

function abrirModalCancion(cancion = null, albumId = null) {
    cancionEdicion.value       = cancion
    archivoImagenCancion.value = null
    archivoAudioCancion.value  = null
    duracionDetectada.value    = ''
    nombreAudio.value          = ''
    previewImagenCancion.value = cancion?.imagen || null
    erroresCancion.value       = { titulo: '', audio: '' }
    formCancion.value = cancion
        ? { titulo: cancion.titulo, genero: cancion.genero || '', album_id: cancion.album_id || '' }
        : { titulo: '', genero: '', album_id: albumId ?? '' }
    mostrarModalCancion.value = true
}

function validarCancion() {
    erroresCancion.value = { titulo: '', audio: '' }
    let ok = true
    if (!formCancion.value.titulo.trim()) {
        erroresCancion.value.titulo = 'El título es obligatorio'
        ok = false
    }
    if (!cancionEdicion.value && !archivoAudioCancion.value) {
        erroresCancion.value.audio = 'El archivo de audio es obligatorio para nuevas canciones'
        ok = false
    }
    return ok
}

async function alSeleccionarImagenCancion(e) {
    const archivo = e.target.files[0]
    if (!archivo) return
    archivoImagenCancion.value = archivo
    previewImagenCancion.value = crearPreviewImagen(archivo)
}

async function alSeleccionarAudio(e) {
    const archivo = e.target.files[0]
    if (!archivo) return
    archivoAudioCancion.value = archivo
    nombreAudio.value         = archivo.name
    duracionDetectada.value   = 'Detectando...'
    erroresCancion.value.audio = ''
    duracionDetectada.value   = await detectarDuracion(archivo)
}

async function guardarCancion() {
    if (!validarCancion()) return
    guardandoCancion.value = true
    try {
        const fd = new FormData()
        fd.append('titulo',   formCancion.value.titulo.trim())
        fd.append('duracion', duracionDetectada.value || cancionEdicion.value?.duracion || '0:00')
        if (formCancion.value.genero)   fd.append('genero',   formCancion.value.genero)
        if (formCancion.value.album_id) fd.append('album_id', formCancion.value.album_id)
        if (archivoImagenCancion.value) fd.append('imagen',   archivoImagenCancion.value)
        if (archivoAudioCancion.value)  fd.append('audio',    archivoAudioCancion.value)

        if (cancionEdicion.value) {
            const r = await api.upload(`/artista-cuenta/canciones/${cancionEdicion.value.id}`, fd)
            const idx = canciones.value.findIndex(c => c.id === cancionEdicion.value.id)
            if (idx !== -1) canciones.value[idx] = r.cancion
            mostrarNotificacion('Canción actualizada')
        } else {
            const r = await api.upload('/artista-cuenta/canciones', fd)
            canciones.value.unshift(r.cancion)
            mostrarNotificacion('Canción subida')
        }
        mostrarModalCancion.value = false
    } catch (_) {
        mostrarNotificacion('Error al guardar la canción')
    } finally {
        guardandoCancion.value = false
    }
}

async function eliminarCancion(cancion) {
    if (!confirm(`¿Eliminar "${cancion.titulo}"?`)) return
    try {
        await usuarioSvc.eliminarCancionArtista(cancion.id)
        canciones.value = canciones.value.filter(c => c.id !== cancion.id)
        mostrarNotificacion('Canción eliminada')
    } catch (_) { mostrarNotificacion('Error al eliminar') }
}

// ── Álbumes ───────────────────────────────────────────────────────────────────
const albumes             = ref([])
const cargandoAlbumes     = ref(false)
const mostrarModalAlbum   = ref(false)
const albumEdicion        = ref(null)
const guardandoAlbum      = ref(false)
const erroresAlbum        = ref({ titulo: '' })
const albumExpandidoId    = ref(null)

function toggleAlbum(id) {
    albumExpandidoId.value = albumExpandidoId.value === id ? null : id
}

function cancionesDeAlbum(albumId) {
    return canciones.value.filter(c => c.album_id === albumId)
}

const formAlbum = ref({ titulo: '', genero: '', descripcion: '', publicado_at: '' })
const archivoImagenAlbum  = ref(null)
const previewImagenAlbum  = ref(null)
const inputImagenAlbumRef = ref(null)

async function cargarAlbumes() {
    cargandoAlbumes.value = true
    try {
        const r = await usuarioSvc.misAlbumesArtista()
        albumes.value = r.albumes || []
    } catch (_) { albumes.value = [] }
    finally { cargandoAlbumes.value = false }
}

function abrirModalAlbum(album = null) {
    albumEdicion.value       = album
    archivoImagenAlbum.value = null
    previewImagenAlbum.value = album?.imagen || null
    erroresAlbum.value       = { titulo: '' }
    formAlbum.value = album
        ? { titulo: album.titulo, genero: album.genero || '', descripcion: album.descripcion || '', publicado_at: album.publicado_at || '' }
        : { titulo: '', genero: '', descripcion: '', publicado_at: '' }
    mostrarModalAlbum.value = true
}

function validarAlbum() {
    erroresAlbum.value = { titulo: '' }
    if (!formAlbum.value.titulo.trim()) {
        erroresAlbum.value.titulo = 'El título es obligatorio'
        return false
    }
    return true
}

function alSeleccionarImagenAlbum(e) {
    const archivo = e.target.files[0]
    if (!archivo) return
    archivoImagenAlbum.value = archivo
    previewImagenAlbum.value = crearPreviewImagen(archivo)
}

async function guardarAlbum() {
    if (!validarAlbum()) return
    guardandoAlbum.value = true
    try {
        const fd = new FormData()
        fd.append('titulo', formAlbum.value.titulo.trim())
        if (formAlbum.value.genero)       fd.append('genero',       formAlbum.value.genero)
        if (formAlbum.value.descripcion)  fd.append('descripcion',  formAlbum.value.descripcion)
        if (formAlbum.value.publicado_at) fd.append('publicado_at', formAlbum.value.publicado_at)
        if (archivoImagenAlbum.value)     fd.append('imagen',       archivoImagenAlbum.value)

        if (albumEdicion.value) {
            const r = await api.upload(`/artista-cuenta/albumes/${albumEdicion.value.id}`, fd)
            const idx = albumes.value.findIndex(a => a.id === albumEdicion.value.id)
            if (idx !== -1) albumes.value[idx] = r.album
            mostrarNotificacion('Álbum actualizado')
        } else {
            const r = await api.upload('/artista-cuenta/albumes', fd)
            albumes.value.unshift(r.album)
            mostrarNotificacion('Álbum creado')
            albumExpandidoId.value = r.album.id
        }
        mostrarModalAlbum.value = false
    } catch (_) {
        mostrarNotificacion('Error al guardar el álbum')
    } finally {
        guardandoAlbum.value = false
    }
}

async function eliminarAlbum(album) {
    if (!confirm(`¿Eliminar el álbum "${album.titulo}"? Las canciones quedarán sueltas.`)) return
    try {
        await usuarioSvc.eliminarAlbumArtista(album.id)
        albumes.value = albumes.value.filter(a => a.id !== album.id)
        mostrarNotificacion('Álbum eliminado')
    } catch (_) { mostrarNotificacion('Error al eliminar') }
}

// ── Configuración del perfil ──────────────────────────────────────────────────
const formPerfil      = ref({ nombre_artista: '', bio: '', genero: '', ciudad: '', sitio_web: '', imagen_portada: '' })
const guardandoPerfil = ref(false)

function iniciarFormPerfil() {
    const p = perfilArtista.value
    if (!p) return
    formPerfil.value = {
        nombre_artista: p.nombre_artista || '',
        bio:            p.bio            || '',
        genero:         p.genero         || '',
        ciudad:         p.ciudad         || '',
        sitio_web:      p.sitio_web      || '',
        imagen_portada: p.imagen_portada || '',
    }
}

async function guardarPerfil() {
    guardandoPerfil.value = true
    try {
        const r = await usuarioSvc.actualizarPerfilArtista(formPerfil.value)
        perfilArtista.value = r.artista
        const userData = await api.get('/usuario/perfil')
        sincronizarUsuario(userData.data)
        mostrarNotificacion('Perfil actualizado')
    } catch (_) {
        mostrarNotificacion('Error al actualizar el perfil')
    } finally {
        guardandoPerfil.value = false
    }
}

const albumesOpciones = computed(() => albumes.value.map(a => ({ id: a.id, titulo: a.titulo })))

// ── Avatar ────────────────────────────────────────────────────────────────────
const archivoAvatar  = ref(null)
const previewAvatar  = ref(null)
const subiendoAvatar = ref(false)
const inputAvatarRef = ref(null)

function alSeleccionarAvatar(e) {
    const archivo = e.target.files[0]
    if (!archivo) return
    archivoAvatar.value = archivo
    previewAvatar.value = URL.createObjectURL(archivo)
}

async function subirAvatar() {
    if (!archivoAvatar.value || subiendoAvatar.value) return
    subiendoAvatar.value = true
    try {
        const fd = new FormData()
        fd.append('avatar', archivoAvatar.value)
        const r = await api.upload('/usuario/perfil', fd)
        sincronizarUsuario(r.data)
        archivoAvatar.value = null
        previewAvatar.value = null
        mostrarNotificacion('Foto de perfil actualizada')
    } catch (_) {
        mostrarNotificacion('Error al subir la foto')
    } finally {
        subiendoAvatar.value = false
    }
}

// ── Cambiar contraseña ────────────────────────────────────────────────────────
const mostrarModalPassword    = ref(false)
const guardandoPassword       = ref(false)
const erroresPassword         = ref({})
const errorGeneralPassword    = ref('')
const formularioPassword      = ref({ password_actual: '', password: '', password_confirmation: '' })

async function cambiarPassword() {
    guardandoPassword.value    = true
    erroresPassword.value      = {}
    errorGeneralPassword.value = ''
    try {
        const resp = await usuarioSvc.cambiarPassword({
            password_actual:       formularioPassword.value.password_actual,
            password:              formularioPassword.value.password,
            password_confirmation: formularioPassword.value.password_confirmation,
        })
        if (resp.data?.token) {
            almacenApp.token = resp.data.token
            localStorage.setItem('token_auth', resp.data.token)
        }
        mostrarModalPassword.value = false
        formularioPassword.value   = { password_actual: '', password: '', password_confirmation: '' }
        mostrarNotificacion('Contraseña cambiada correctamente.')
    } catch (error) {
        erroresPassword.value      = error.errors || {}
        errorGeneralPassword.value = error.message || 'Error al cambiar la contraseña.'
    } finally {
        guardandoPassword.value = false
    }
}

// ── Eventos ───────────────────────────────────────────────────────────────────
const eventos            = ref([])
const cargandoEventos    = ref(false)
const mostrarModalEvento = ref(false)
const eventoEdicion      = ref(null)
const guardandoEvento    = ref(false)
const erroresEvento      = ref({})

const formEvento = ref({
    nombre: '', descripcion: '', fecha: '', lugar: '', ciudad: '',
    precio_pista: '', aforo_pista: '',
    precio_tribuna: '', aforo_tribuna: '',
    precio_vip: '', aforo_vip: '',
})
const archivoImagenEvento  = ref(null)
const previewImagenEvento  = ref(null)

function calcularFechaMinima() {
    const hoy = new Date()
    const diaSemana = hoy.getDay()
    const diasDesdeElLunes = diaSemana === 0 ? 6 : diaSemana - 1
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - diasDesdeElLunes)
    const pad = n => String(n).padStart(2, '0')
    return `${lunes.getFullYear()}-${pad(lunes.getMonth() + 1)}-${pad(lunes.getDate())}T00:00`
}

function calcularFechaMaxima() {
    const max = new Date()
    max.setFullYear(max.getFullYear() + 5)
    const pad = n => String(n).padStart(2, '0')
    return `${max.getFullYear()}-${pad(max.getMonth() + 1)}-${pad(max.getDate())}T23:59`
}

const fechaMinEvento = calcularFechaMinima()
const fechaMaxEvento = calcularFechaMaxima()

async function cargarEventos() {
    cargandoEventos.value = true
    try {
        const r = await usuarioSvc.misEventosArtista()
        eventos.value = r.eventos || []
    } catch (_) { eventos.value = [] }
    finally { cargandoEventos.value = false }
}

function abrirModalEvento(evento = null) {
    eventoEdicion.value       = evento
    archivoImagenEvento.value = null
    previewImagenEvento.value = evento?.imagen || null
    erroresEvento.value       = {}
    if (evento) {
        const fechaLocal = evento.fecha ? evento.fecha.substring(0, 16) : ''
        const tipos     = evento.tipos_entrada || []
        const pista     = tipos.find(t => t.tipo === 'Pista')   || {}
        const tribuna   = tipos.find(t => t.tipo === 'Tribuna') || {}
        const vip       = tipos.find(t => t.tipo === 'VIP')     || {}
        formEvento.value = {
            nombre:         evento.nombre      || '',
            descripcion:    evento.descripcion || '',
            fecha:          fechaLocal,
            lugar:          evento.lugar       || '',
            ciudad:         evento.ciudad      || '',
            precio_pista:   pista.precio   ?? '',
            aforo_pista:    pista.aforo    ?? '',
            precio_tribuna: tribuna.precio ?? '',
            aforo_tribuna:  tribuna.aforo  ?? '',
            precio_vip:     vip.precio     ?? '',
            aforo_vip:      vip.aforo      ?? '',
        }
    } else {
        formEvento.value = {
            nombre: '', descripcion: '', fecha: '', lugar: '', ciudad: '',
            precio_pista: '', aforo_pista: '',
            precio_tribuna: '', aforo_tribuna: '',
            precio_vip: '', aforo_vip: '',
        }
    }
    mostrarModalEvento.value = true
}

function validarEvento() {
    const err = {}
    if (!formEvento.value.nombre.trim()) err.nombre = 'El nombre es obligatorio'
    if (!formEvento.value.fecha)         err.fecha  = 'La fecha es obligatoria'
    if (!formEvento.value.lugar.trim())  err.lugar  = 'El lugar es obligatorio'
    if (!formEvento.value.ciudad.trim()) err.ciudad = 'La ciudad es obligatoria'
    const tipos = [
        { precio: 'precio_pista',   aforo: 'aforo_pista',   label: 'Pista'   },
        { precio: 'precio_tribuna', aforo: 'aforo_tribuna', label: 'Tribuna' },
        { precio: 'precio_vip',     aforo: 'aforo_vip',     label: 'VIP'     },
    ]
    for (const t of tipos) {
        const p = formEvento.value[t.precio]
        const a = formEvento.value[t.aforo]
        if (p === '' || p === null || p === undefined) err[t.precio] = 'Obligatorio'
        if (!a) err[t.aforo] = 'Obligatorio'
    }
    erroresEvento.value = err
    return Object.keys(err).length === 0
}

function alSeleccionarImagenEvento(e) {
    const archivo = e.target.files[0]
    if (!archivo) return
    archivoImagenEvento.value = archivo
    previewImagenEvento.value = URL.createObjectURL(archivo)
}

async function guardarEvento() {
    if (!validarEvento()) return
    guardandoEvento.value = true
    try {
        const fd = new FormData()
        fd.append('nombre',         formEvento.value.nombre.trim())
        fd.append('descripcion',    formEvento.value.descripcion)
        fd.append('fecha',          formEvento.value.fecha)
        fd.append('lugar',          formEvento.value.lugar.trim())
        fd.append('ciudad',         formEvento.value.ciudad.trim())
        fd.append('precio_pista',   formEvento.value.precio_pista)
        fd.append('aforo_pista',    formEvento.value.aforo_pista)
        fd.append('precio_tribuna', formEvento.value.precio_tribuna)
        fd.append('aforo_tribuna',  formEvento.value.aforo_tribuna)
        fd.append('precio_vip',     formEvento.value.precio_vip)
        fd.append('aforo_vip',      formEvento.value.aforo_vip)
        if (archivoImagenEvento.value) fd.append('imagen', archivoImagenEvento.value)

        if (eventoEdicion.value) {
            const r = await usuarioSvc.actualizarEventoArtista(eventoEdicion.value.id, fd)
            const idx = eventos.value.findIndex(e => e.id === eventoEdicion.value.id)
            if (idx !== -1) eventos.value[idx] = r.evento
            mostrarNotificacion('Evento actualizado')
        } else {
            const r = await usuarioSvc.crearEventoArtista(fd)
            eventos.value.unshift(r.evento)
            mostrarNotificacion('Evento publicado')
        }
        mostrarModalEvento.value = false
    } catch (err) {
        if (err?.errors) {
            const mapa = {}
            for (const [campo, msgs] of Object.entries(err.errors)) {
                mapa[campo] = Array.isArray(msgs) ? msgs[0] : msgs
            }
            erroresEvento.value = mapa
        } else {
            mostrarNotificacion(err?.message || 'Error al guardar el evento')
        }
    } finally {
        guardandoEvento.value = false
    }
}

async function eliminarEvento(evento) {
    if (!confirm(`¿Eliminar el evento "${evento.nombre}"?`)) return
    try {
        await usuarioSvc.eliminarEventoArtista(evento.id)
        eventos.value = eventos.value.filter(e => e.id !== evento.id)
        mostrarNotificacion('Evento eliminado')
    } catch (_) { mostrarNotificacion('Error al eliminar') }
}

function formatearFechaEvento(fechaStr) {
    if (!fechaStr) return '—'
    const [datePart = '', timePart = '00:00'] = fechaStr.split('T')
    const [y, m, d] = datePart.split('-').map(Number)
    const [h, min]  = timePart.replace('Z', '').split(':').map(Number)
    const f = new Date(y, m - 1, d, h || 0, min || 0)
    return f.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' · ' + f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

// ── Favoritos ─────────────────────────────────────────────────────────────────
const subtabFav              = ref('canciones')
const cancionesFav           = ref([])
const cargandoFavCanciones   = ref(false)
const albumesFav             = ref([])
const cargandoFavAlbumes     = ref(false)
const artistasSeguidos       = ref([])
const cargandoArtistas       = ref(false)

async function cargarCancionesFav() {
    try {
        cargandoFavCanciones.value = true
        const r = await usuarioSvc.cancionesFav()
        cancionesFav.value = r.canciones || []
    } catch (_) { cancionesFav.value = [] }
    finally { cargandoFavCanciones.value = false }
}

async function cargarAlbumesFav() {
    try {
        cargandoFavAlbumes.value = true
        const r = await usuarioSvc.albumesFav()
        albumesFav.value = (r.albumes || []).map(a => ({
            ...a,
            id:          a.deezer_id,
            nombre:      a.nombre,
            descripcion: a.artista,
            tipo:        'album',
        }))
    } catch (_) { albumesFav.value = [] }
    finally { cargandoFavAlbumes.value = false }
}

async function cargarArtistasSeguidos() {
    try {
        cargandoArtistas.value = true
        const r = await usuarioSvc.artistasSeguidos()
        artistasSeguidos.value = r.artistas || []
    } catch (_) { artistasSeguidos.value = [] }
    finally { cargandoArtistas.value = false }
}

async function dejarDeSeguir(artista) {
    try {
        await usuarioSvc.dejarSeguirArtista(artista.deezer_id)
        artistasSeguidos.value = artistasSeguidos.value.filter(a => a.id !== artista.id)
        mostrarNotificacion(`Dejaste de seguir a ${artista.nombre}`)
    } catch (_) { mostrarNotificacion('Error al dejar de seguir') }
}

function alToggleFavCancion(cancion, estado) {
    if (!estado) {
        cancionesFav.value = cancionesFav.value.filter(c => String(c.deezer_id) !== String(cancion.id))
    }
}

function verArtistaFav(artista) {
    emitir('abrirPlaylist', { tipo: 'artista', id: Number(artista.deezer_id), nombre: artista.nombre })
}

function alCambiarSubtabFav(tab) {
    subtabFav.value = tab
    if (tab === 'canciones' && cancionesFav.value.length === 0) cargarCancionesFav()
    if (tab === 'albumes'   && albumesFav.value.length   === 0) cargarAlbumesFav()
    if (tab === 'artistas'  && artistasSeguidos.value.length === 0) cargarArtistasSeguidos()
}

watch(pestanaActiva, (tab) => {
    if (tab === 'estadisticas') cargarEstadisticas()
    if (tab === 'eventos'   && eventos.value.length === 0)         cargarEventos()
    if (tab === 'favoritos' && cancionesFav.value.length === 0)    cargarCancionesFav()
})

onMounted(async () => {
    await Promise.all([cargarPerfil(), cargarGeneros()])
    iniciarFormPerfil()
    cargarCanciones()
    cargarAlbumes()
    cargarEstadisticas()
})
</script>

<template>
    <div class="contenedor-contenido">

        <!-- Hero del artista -->
        <section class="artista-hero" :style="perfilArtista?.imagen_portada ? `background-image:url('${perfilArtista.imagen_portada}')` : ''">
            <div class="artista-hero-overlay"></div>
            <div class="artista-hero-contenido">
                <img
                    :src="almacenApp.usuario.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(almacenApp.usuario.nombre)}&background=8b5cf6&color=fff&size=140`"
                    alt="Avatar"
                    class="artista-avatar"
                >
                <div class="artista-hero-info">
                    <span class="artista-etiqueta"><i class="fas fa-check-circle"></i> Artista verificado</span>
                    <h1 class="artista-nombre">{{ almacenApp.usuario.nombreArtista || almacenApp.usuario.nombre }}</h1>
                    <div class="artista-stats-hero">
                        <span><i class="fas fa-music"></i> {{ estadisticas?.total_canciones ?? 0 }} canciones</span>
                        <span><i class="fas fa-compact-disc"></i> {{ estadisticas?.total_albumes ?? 0 }} álbumes</span>
                        <span><i class="fas fa-users"></i> {{ estadisticas?.total_seguidores ?? 0 }} seguidores</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- Pestañas -->
        <div class="pestanas-perfil">
            <button v-for="p in pestanas" :key="p.id" class="boton-pestana" :class="{ activo: pestanaActiva === p.id }" @click="pestanaActiva = p.id">
                {{ p.nombre }}
            </button>
        </div>

        <!-- ── MI MÚSICA ── -->
        <div v-show="pestanaActiva === 'musica'" class="contenido-pestana">
            <div class="barra-accion">
                <h2 class="subtitulo-seccion">Mis canciones</h2>
                <button class="boton-accion-nueva" @click="abrirModalCancion()">
                    <i class="fas fa-cloud-upload-alt"></i> Subir canción
                </button>
            </div>
            <div v-if="cargandoCanciones" class="estado-info"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
            <div v-else-if="canciones.length === 0" class="estado-vacio">
                <i class="fas fa-music"></i>
                <p>Aún no has subido canciones</p>
                <p class="sub">Sube tu primera canción y empieza a llegar a tus fans</p>
                <button class="boton-accion-nueva" @click="abrirModalCancion()">
                    <i class="fas fa-cloud-upload-alt"></i> Subir primera canción
                </button>
            </div>
            <div v-else class="tabla-canciones">
                <div v-for="(cancion, i) in canciones" :key="cancion.id" class="fila-cancion">
                    <button
                        class="fila-num fila-num-btn"
                        @click="reproducirDesde(i)"
                        :disabled="!cancion.audio_url"
                        :title="cancion.audio_url ? 'Reproducir' : 'Sin audio'"
                    >
                        <span class="fila-numero-txt">{{ i + 1 }}</span>
                        <i class="fas fa-play fila-icono-play"></i>
                    </button>
                    <img :src="cancion.imagen || `https://ui-avatars.com/api/?name=${encodeURIComponent(cancion.titulo)}&background=6d28d9&color=fff&size=48`" class="fila-imagen">
                    <div class="fila-info">
                        <span class="fila-titulo">{{ cancion.titulo }}</span>
                        <span class="fila-meta">{{ cancion.genero || 'Sin género' }} · {{ cancion.duracion || '—' }}</span>
                    </div>
                    <span class="fila-album">{{ cancion.album?.titulo || 'Suelto' }}</span>
                    <div class="fila-acciones">
                        <button class="btn-icono" @click="abrirModalCancion(cancion)" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="btn-icono btn-peligro" @click="eliminarCancion(cancion)" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── ÁLBUMES ── -->
        <div v-show="pestanaActiva === 'albumes'" class="contenido-pestana">
            <div class="barra-accion">
                <h2 class="subtitulo-seccion">Mis álbumes</h2>
                <button class="boton-accion-nueva boton-accion-album" @click="abrirModalAlbum()">
                    <i class="fas fa-compact-disc"></i> Crear álbum
                </button>
            </div>
            <div v-if="cargandoAlbumes" class="estado-info"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
            <div v-else-if="albumes.length === 0" class="estado-vacio">
                <i class="fas fa-compact-disc"></i>
                <p>Aún no has creado álbumes</p>
                <p class="sub">Agrupa tus canciones en álbumes o EPs</p>
                <button class="boton-accion-nueva boton-accion-album" @click="abrirModalAlbum()">
                    <i class="fas fa-compact-disc"></i> Crear primer álbum
                </button>
            </div>
            <div v-else class="lista-albumes">
                <div v-for="album in albumes" :key="album.id" class="tarjeta-album" :class="{ expandido: albumExpandidoId === album.id }">
                    <div class="album-cabecera" @click="toggleAlbum(album.id)">
                        <div class="album-portada" :style="album.imagen ? `background-image:url('${album.imagen}')` : ''">
                            <div v-if="!album.imagen" class="album-portada-placeholder"><i class="fas fa-compact-disc"></i></div>
                        </div>
                        <div class="album-datos">
                            <span class="album-titulo">{{ album.titulo }}</span>
                            <span class="album-meta">{{ cancionesDeAlbum(album.id).length }} canciones · {{ album.genero || 'Sin género' }}</span>
                            <span v-if="album.publicado_at" class="album-fecha">{{ album.publicado_at }}</span>
                        </div>
                        <div class="album-acciones" @click.stop>
                            <button class="btn-icono" @click="abrirModalCancion(null, album.id)" title="Añadir canción"><i class="fas fa-plus"></i></button>
                            <button class="btn-icono" @click="abrirModalAlbum(album)" title="Editar álbum"><i class="fas fa-pen"></i></button>
                            <button class="btn-icono btn-peligro" @click="eliminarAlbum(album)" title="Eliminar álbum"><i class="fas fa-trash"></i></button>
                            <button class="btn-icono btn-expandir" :class="{ rotado: albumExpandidoId === album.id }" title="Ver canciones">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Canciones del álbum -->
                    <div v-if="albumExpandidoId === album.id" class="album-canciones">
                        <div v-if="cancionesDeAlbum(album.id).length === 0" class="album-canciones-vacio">
                            <i class="fas fa-music"></i>
                            <span>No hay canciones en este álbum. Añade la primera.</span>
                        </div>
                        <div v-else class="album-canciones-lista">
                            <div v-for="(c, i) in cancionesDeAlbum(album.id)" :key="c.id" class="album-cancion-fila">
                                <button class="fila-num-btn" @click="reproducirDesde(canciones.indexOf(c))" :disabled="!c.audio_url" title="Reproducir">
                                    <span class="fila-numero-txt">{{ i + 1 }}</span>
                                    <i class="fas fa-play fila-icono-play"></i>
                                </button>
                                <img :src="c.imagen || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.titulo)}&background=6d28d9&color=fff&size=40`" class="album-cancion-img">
                                <div class="fila-info">
                                    <span class="fila-titulo">{{ c.titulo }}</span>
                                    <span class="fila-meta">{{ c.genero || 'Sin género' }} · {{ c.duracion || '—' }}</span>
                                </div>
                                <div class="fila-acciones">
                                    <button class="btn-icono" @click="abrirModalCancion(c)" title="Editar"><i class="fas fa-pen"></i></button>
                                    <button class="btn-icono btn-peligro" @click="eliminarCancion(c)" title="Eliminar"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        </div>
                        <button class="boton-anadir-cancion-album" @click="abrirModalCancion(null, album.id)">
                            <i class="fas fa-plus"></i> Añadir canción al álbum
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── EVENTOS ── -->
        <div v-show="pestanaActiva === 'eventos'" class="contenido-pestana">
            <div class="barra-accion">
                <h2 class="subtitulo-seccion">Mis eventos</h2>
                <button class="boton-accion-nueva" @click="abrirModalEvento()">
                    <i class="fas fa-calendar-plus"></i> Crear evento
                </button>
            </div>

            <div v-if="cargandoEventos" class="estado-info"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>

            <div v-else-if="eventos.length === 0" class="estado-vacio">
                <i class="fas fa-calendar-times"></i>
                <p>Aún no has publicado eventos</p>
                <p class="sub">Crea tu primer evento para que tus fans puedan comprar entradas</p>
                <button class="boton-accion-nueva" @click="abrirModalEvento()">
                    <i class="fas fa-calendar-plus"></i> Crear primer evento
                </button>
            </div>

            <div v-else class="tabla-eventos">
                <div v-for="ev in eventos" :key="ev.id" class="fila-evento">
                    <img
                        :src="ev.imagen || `https://ui-avatars.com/api/?name=${encodeURIComponent(ev.nombre)}&background=6d28d9&color=fff&size=48`"
                        class="fila-imagen"
                        :alt="ev.nombre"
                    >
                    <div class="fila-info">
                        <span class="fila-titulo">{{ ev.nombre }}</span>
                        <span class="fila-meta">{{ formatearFechaEvento(ev.fecha) }}</span>
                    </div>
                    <span class="fila-album">{{ ev.ciudad }} · {{ ev.lugar }}</span>
                    <span class="fila-repros">{{ ev.entradas_vendidas }}/{{ ev.aforo }} entradas</span>
                    <span class="fila-repros precio-evento">
                        <template v-if="ev.tipos_entrada && ev.tipos_entrada.length">
                            {{ Math.min(...ev.tipos_entrada.map(t => t.precio)).toFixed(2) }} – {{ Math.max(...ev.tipos_entrada.map(t => t.precio)).toFixed(2) }} €
                        </template>
                        <template v-else>{{ Number(ev.precio).toFixed(2) }} €</template>
                    </span>
                    <div class="fila-acciones">
                        <button class="btn-icono" @click="abrirModalEvento(ev)" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="btn-icono btn-peligro" @click="eliminarEvento(ev)" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>

            <!-- Modal crear/editar evento -->
            <Modal :visible="mostrarModalEvento" :titulo="eventoEdicion ? 'Editar evento' : 'Nuevo evento'" @cerrar="mostrarModalEvento = false">
                <div class="grupo-form">
                    <label>Nombre del evento *</label>
                    <input v-model="formEvento.nombre" type="text" placeholder="Nombre" :class="{ 'input-error': erroresEvento.nombre }">
                    <span v-if="erroresEvento.nombre" class="campo-error"><i class="fas fa-exclamation-circle"></i> {{ erroresEvento.nombre }}</span>
                </div>
                <div class="grupo-form">
                    <label>Descripción</label>
                    <textarea v-model="formEvento.descripcion" placeholder="Descripción del evento" rows="3"></textarea>
                </div>
                <div class="grupo-form">
                    <label>Fecha y hora *</label>
                    <input v-model="formEvento.fecha" type="datetime-local" :min="fechaMinEvento" :max="fechaMaxEvento" :class="{ 'input-error': erroresEvento.fecha }">
                    <span v-if="erroresEvento.fecha" class="campo-error"><i class="fas fa-exclamation-circle"></i> {{ erroresEvento.fecha }}</span>
                </div>
                <div class="grupo-form-fila">
                    <div class="grupo-form">
                        <label>Lugar *</label>
                        <input v-model="formEvento.lugar" type="text" placeholder="Nombre del recinto" :class="{ 'input-error': erroresEvento.lugar }">
                        <span v-if="erroresEvento.lugar" class="campo-error"><i class="fas fa-exclamation-circle"></i> {{ erroresEvento.lugar }}</span>
                    </div>
                    <div class="grupo-form">
                        <label>Ciudad *</label>
                        <input v-model="formEvento.ciudad" type="text" placeholder="Ciudad" :class="{ 'input-error': erroresEvento.ciudad }">
                        <span v-if="erroresEvento.ciudad" class="campo-error"><i class="fas fa-exclamation-circle"></i> {{ erroresEvento.ciudad }}</span>
                    </div>
                </div>
                <div class="grupo-form">
                    <label>Tipos de entrada *</label>
                    <div class="tipos-entrada-grid">
                        <div class="tipos-entrada-cabecera">
                            <span></span>
                            <span>Precio (€)</span>
                            <span>Entradas disponibles</span>
                        </div>
                        <div class="tipo-entrada-fila">
                            <span class="tipo-nombre">🎵 Pista</span>
                            <div>
                                <input v-model="formEvento.precio_pista" type="number" min="0" step="0.01" placeholder="0.00" :class="{ 'input-error': erroresEvento.precio_pista }">
                                <span v-if="erroresEvento.precio_pista" class="campo-error"><i class="fas fa-exclamation-circle"></i> {{ erroresEvento.precio_pista }}</span>
                            </div>
                            <div>
                                <input v-model="formEvento.aforo_pista" type="number" min="1" placeholder="100" :class="{ 'input-error': erroresEvento.aforo_pista }">
                                <span v-if="erroresEvento.aforo_pista" class="campo-error"><i class="fas fa-exclamation-circle"></i> {{ erroresEvento.aforo_pista }}</span>
                            </div>
                        </div>
                        <div class="tipo-entrada-fila">
                            <span class="tipo-nombre">⭐ Tribuna</span>
                            <div>
                                <input v-model="formEvento.precio_tribuna" type="number" min="0" step="0.01" placeholder="0.00" :class="{ 'input-error': erroresEvento.precio_tribuna }">
                                <span v-if="erroresEvento.precio_tribuna" class="campo-error"><i class="fas fa-exclamation-circle"></i> {{ erroresEvento.precio_tribuna }}</span>
                            </div>
                            <div>
                                <input v-model="formEvento.aforo_tribuna" type="number" min="1" placeholder="50" :class="{ 'input-error': erroresEvento.aforo_tribuna }">
                                <span v-if="erroresEvento.aforo_tribuna" class="campo-error"><i class="fas fa-exclamation-circle"></i> {{ erroresEvento.aforo_tribuna }}</span>
                            </div>
                        </div>
                        <div class="tipo-entrada-fila">
                            <span class="tipo-nombre tipo-vip">👑 VIP</span>
                            <div>
                                <input v-model="formEvento.precio_vip" type="number" min="0" step="0.01" placeholder="0.00" :class="{ 'input-error': erroresEvento.precio_vip }">
                                <span v-if="erroresEvento.precio_vip" class="campo-error"><i class="fas fa-exclamation-circle"></i> {{ erroresEvento.precio_vip }}</span>
                            </div>
                            <div>
                                <input v-model="formEvento.aforo_vip" type="number" min="1" placeholder="20" :class="{ 'input-error': erroresEvento.aforo_vip }">
                                <span v-if="erroresEvento.aforo_vip" class="campo-error"><i class="fas fa-exclamation-circle"></i> {{ erroresEvento.aforo_vip }}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="grupo-form">
                    <label>Imagen del evento</label>
                    <div v-if="previewImagenEvento" class="preview-imagen-pequena">
                        <img :src="previewImagenEvento" alt="Preview">
                    </div>
                    <input type="file" accept="image/*" @change="alSeleccionarImagenEvento">
                    <span class="zona-hint" style="margin-top:4px;display:block">Si no subes imagen se usará tu foto de perfil de artista</span>
                </div>
                <template #acciones>
                    <button class="boton-cancelar" @click="mostrarModalEvento = false" :disabled="guardandoEvento">Cancelar</button>
                    <button class="boton-guardar" :disabled="guardandoEvento" @click="guardarEvento">
                        <i v-if="guardandoEvento" class="fas fa-spinner fa-spin"></i>
                        <span v-else>{{ eventoEdicion ? 'Guardar cambios' : 'Publicar evento' }}</span>
                    </button>
                </template>
            </Modal>
        </div>

        <!-- ── FAVORITOS ── -->
        <div v-show="pestanaActiva === 'favoritos'" class="contenido-pestana">

            <!-- Sub-tabs -->
            <div class="subtabs-favoritos">
                <button :class="['subtab', { activo: subtabFav === 'canciones' }]" @click="alCambiarSubtabFav('canciones')">
                    <i class="fas fa-music"></i> Canciones
                </button>
                <button :class="['subtab', { activo: subtabFav === 'albumes' }]" @click="alCambiarSubtabFav('albumes')">
                    <i class="fas fa-compact-disc"></i> Álbumes
                </button>
                <button :class="['subtab', { activo: subtabFav === 'artistas' }]" @click="alCambiarSubtabFav('artistas')">
                    <i class="fas fa-user"></i> Artistas
                </button>
            </div>

            <!-- Canciones favoritas -->
            <div v-if="subtabFav === 'canciones'">
                <div v-if="cargandoFavCanciones" class="estado-info"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
                <div v-else-if="cancionesFav.length === 0" class="estado-vacio">
                    <i class="far fa-heart"></i>
                    <p>No tienes canciones favoritas</p>
                    <p class="sub">Marca canciones como favoritas mientras las escuchas</p>
                </div>
                <div v-else class="tabla-canciones">
                    <TarjetaCancion
                        v-for="(c, i) in cancionesFav"
                        :key="c.id"
                        :cancion="{ id: c.deezer_id, titulo: c.titulo, artista: c.artista, imagen: c.imagen, duracion: c.duracion, preview: c.preview }"
                        :numero="i + 1"
                        :mostrar-album="false"
                        :es-favorito="true"
                        @favorito="alToggleFavCancion"
                    />
                </div>
            </div>

            <!-- Álbumes favoritos -->
            <div v-if="subtabFav === 'albumes'">
                <div v-if="cargandoFavAlbumes" class="estado-info"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
                <div v-else-if="albumesFav.length === 0" class="estado-vacio">
                    <i class="fas fa-compact-disc"></i>
                    <p>No tienes álbumes favoritos</p>
                    <p class="sub">Guarda álbumes para encontrarlos fácilmente</p>
                </div>
                <div v-else class="cuadricula-tarjetas">
                    <TarjetaPlaylist
                        v-for="album in albumesFav"
                        :key="album.deezer_id"
                        :playlist="album"
                        @click="emitir('abrirPlaylist', album)"
                    />
                </div>
            </div>

            <!-- Artistas seguidos -->
            <div v-if="subtabFav === 'artistas'">
                <div v-if="cargandoArtistas" class="estado-info"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
                <div v-else-if="artistasSeguidos.length === 0" class="estado-vacio">
                    <i class="fas fa-user-music"></i>
                    <p>No sigues a ningún artista</p>
                    <p class="sub">Entra en el perfil de un artista y dale a "Seguir"</p>
                </div>
                <div v-else class="cuadricula-artistas-fav">
                    <div
                        v-for="artista in artistasSeguidos"
                        :key="artista.id"
                        class="tarjeta-artista-fav"
                        @click="verArtistaFav(artista)"
                    >
                        <img
                            :src="artista.imagen || `https://ui-avatars.com/api/?name=${encodeURIComponent(artista.nombre)}&background=8b5cf6&color=fff&size=140`"
                            :alt="artista.nombre"
                            class="fav-artista-img"
                        >
                        <h3>{{ artista.nombre }}</h3>
                        <p>{{ artista.descripcion || 'Artista' }}</p>
                        <button class="boton-siguiendo" @click.stop="dejarDeSeguir(artista)">
                            <i class="fas fa-check"></i> Siguiendo
                        </button>
                    </div>
                </div>
            </div>

        </div>

        <!-- ── ESTADÍSTICAS ── -->
        <div v-show="pestanaActiva === 'estadisticas'" class="contenido-pestana">
            <h2 class="subtitulo-seccion">Resumen</h2>
            <div v-if="!estadisticas" class="estado-info"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
            <template v-else>
                <div class="grid-stats">
                    <div class="stat-card"><i class="fas fa-play stat-icono"></i><span class="stat-valor">{{ estadisticas.total_reproducciones.toLocaleString() }}</span><span class="stat-label">Reproducciones totales</span></div>
                    <div class="stat-card"><i class="fas fa-users stat-icono"></i><span class="stat-valor">{{ estadisticas.total_seguidores }}</span><span class="stat-label">Seguidores</span></div>
                    <div class="stat-card"><i class="fas fa-music stat-icono"></i><span class="stat-valor">{{ estadisticas.total_canciones }}</span><span class="stat-label">Canciones activas</span></div>
                    <div class="stat-card"><i class="fas fa-compact-disc stat-icono"></i><span class="stat-valor">{{ estadisticas.total_albumes }}</span><span class="stat-label">Álbumes</span></div>
                </div>
                <h2 class="subtitulo-seccion" style="margin-top:32px">Top canciones</h2>
                <div v-if="estadisticas.top_canciones.length === 0" class="estado-vacio">
                    <i class="fas fa-chart-bar"></i><p>Aún no hay datos de reproducciones</p>
                </div>
                <div v-else class="tabla-canciones">
                    <div v-for="(c, i) in estadisticas.top_canciones" :key="c.id" class="fila-cancion">
                        <span class="fila-num">{{ i + 1 }}</span>
                        <img :src="c.imagen || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.titulo)}&background=6d28d9&color=fff&size=48`" class="fila-imagen">
                        <div class="fila-info">
                            <span class="fila-titulo">{{ c.titulo }}</span>
                            <span class="fila-meta">{{ c.genero || 'Sin género' }}</span>
                        </div>
                        <span class="fila-repros top"><i class="fas fa-play"></i> {{ c.reproducciones.toLocaleString() }}</span>
                    </div>
                </div>
            </template>
        </div>

        <!-- ── CONFIGURACIÓN ── -->
        <div v-show="pestanaActiva === 'configuracion'" class="contenido-pestana">

            <h2 class="subtitulo-seccion">Foto de perfil</h2>
            <div class="avatar-upload-seccion">
                <div class="avatar-upload-preview" @click="inputAvatarRef?.click()">
                    <img
                        :src="previewAvatar || almacenApp.usuario.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(almacenApp.usuario.nombre)}&background=8b5cf6&color=fff&size=140`"
                        alt="Avatar"
                        class="avatar-upload-img"
                    >
                    <div class="avatar-upload-overlay">
                        <i class="fas fa-camera"></i>
                        <span>Cambiar</span>
                    </div>
                </div>
                <div class="avatar-upload-info">
                    <p>Haz clic en la foto para seleccionar una nueva imagen.</p>
                    <p class="avatar-hint">JPG, PNG o WEBP · máx 2 MB</p>
                    <button
                        v-if="archivoAvatar"
                        class="boton-primario"
                        :disabled="subiendoAvatar"
                        @click="subirAvatar"
                    >
                        <i v-if="subiendoAvatar" class="fas fa-spinner fa-spin"></i>
                        <span v-else><i class="fas fa-upload"></i> Guardar foto</span>
                    </button>
                </div>
                <input ref="inputAvatarRef" type="file" accept="image/jpg,image/jpeg,image/png,image/webp" style="display:none" @change="alSeleccionarAvatar">
            </div>

            <hr class="separador-seccion">

            <h2 class="subtitulo-seccion">Información del artista</h2>
            <div class="form-perfil">
                <div class="grupo-form"><label>Nombre artístico</label><input type="text" v-model="formPerfil.nombre_artista" placeholder="Nombre con el que te conocen"></div>
                <div class="grupo-form"><label>Biografía</label><textarea v-model="formPerfil.bio" rows="4" placeholder="Cuéntanos sobre ti y tu música..."></textarea></div>
                <div class="grupo-form-fila">
                    <div class="grupo-form">
                        <label>Género musical</label>
                        <select v-model="formPerfil.genero">
                            <option value="">Sin especificar</option>
                            <option v-for="g in generos" :key="g.id" :value="g.nombre">{{ g.nombre }}</option>
                        </select>
                    </div>
                    <div class="grupo-form"><label>Ciudad</label><input type="text" v-model="formPerfil.ciudad" placeholder="Madrid, Ciudad de México..."></div>
                </div>
                <div class="grupo-form"><label>Sitio web</label><input type="url" v-model="formPerfil.sitio_web" placeholder="https://tuwebsite.com"></div>
                <div class="grupo-form">
                    <label>Imagen de portada (URL)</label>
                    <input type="text" v-model="formPerfil.imagen_portada" placeholder="https://... (imagen de fondo del hero)">
                    <img v-if="formPerfil.imagen_portada" :src="formPerfil.imagen_portada" class="preview-portada" alt="Preview portada">
                </div>
                <button class="boton-primario" :disabled="guardandoPerfil" @click="guardarPerfil">
                    <i v-if="guardandoPerfil" class="fas fa-spinner fa-spin"></i>
                    <span v-else><i class="fas fa-save"></i> Guardar cambios</span>
                </button>
            </div>

            <hr class="separador-seccion">

            <h2 class="subtitulo-seccion">Seguridad</h2>
            <div class="form-perfil">
                <p class="texto-descripcion-seccion">Cambia tu contraseña de acceso a Sonalya.</p>
                <button class="boton-primario boton-seguridad" @click="mostrarModalPassword = true">
                    <i class="fas fa-lock"></i> Cambiar contraseña
                </button>
            </div>
        </div>

    </div>

    <!-- ── Modal cambiar contraseña ── -->
    <Modal :visible="mostrarModalPassword" titulo="Cambiar Contraseña" @cerrar="mostrarModalPassword = false">
        <div v-if="errorGeneralPassword" class="error-modal-artista"><i class="fas fa-exclamation-circle"></i> {{ errorGeneralPassword }}</div>
        <div class="grupo-form">
            <label>Contraseña actual</label>
            <input type="password" v-model="formularioPassword.password_actual" :class="{ 'input-error': erroresPassword.password_actual }" placeholder="Tu contraseña actual">
            <span v-if="erroresPassword.password_actual" class="campo-error"><i class="fas fa-exclamation-circle"></i> {{ erroresPassword.password_actual[0] }}</span>
        </div>
        <div class="grupo-form">
            <label>Nueva contraseña</label>
            <input type="password" v-model="formularioPassword.password" :class="{ 'input-error': erroresPassword.password }" placeholder="Mín. 8 caracteres, mayúsculas y números">
            <span v-if="erroresPassword.password" class="campo-error"><i class="fas fa-exclamation-circle"></i> {{ erroresPassword.password[0] }}</span>
        </div>
        <div class="grupo-form">
            <label>Confirmar nueva contraseña</label>
            <input type="password" v-model="formularioPassword.password_confirmation" placeholder="Repite la nueva contraseña">
        </div>
        <template #acciones>
            <button class="boton-cancelar" @click="mostrarModalPassword = false" :disabled="guardandoPassword">Cancelar</button>
            <button class="boton-guardar" @click="cambiarPassword" :disabled="guardandoPassword">
                <i v-if="guardandoPassword" class="fas fa-spinner fa-spin"></i>
                <span v-else>Cambiar contraseña</span>
            </button>
        </template>
    </Modal>

    <!-- ── Modal canción ── -->
    <Modal :visible="mostrarModalCancion" :titulo="cancionEdicion ? 'Editar canción' : 'Subir canción'" @cerrar="mostrarModalCancion = false">

        <div class="grupo-form">
            <label>Título *</label>
            <input
                type="text"
                v-model="formCancion.titulo"
                placeholder="Nombre de la canción"
                :class="{ 'input-error': erroresCancion.titulo }"
                @input="erroresCancion.titulo = ''"
            >
            <span v-if="erroresCancion.titulo" class="campo-error"><i class="fas fa-exclamation-circle"></i> {{ erroresCancion.titulo }}</span>
        </div>

        <div class="grupo-form-fila">
            <div class="grupo-form">
                <label>Género</label>
                <select v-model="formCancion.genero">
                    <option value="">Sin especificar</option>
                    <option v-for="g in generos" :key="g.id" :value="g.nombre">{{ g.nombre }}</option>
                </select>
            </div>
            <div class="grupo-form">
                <label>Álbum (opcional)</label>
                <select v-model="formCancion.album_id">
                    <option value="">Sin álbum (suelto)</option>
                    <option v-for="a in albumesOpciones" :key="a.id" :value="a.id">{{ a.titulo }}</option>
                </select>
            </div>
        </div>

        <!-- Portada -->
        <div class="grupo-form">
            <label>Portada de la canción</label>
            <div class="zona-archivo" @click="inputImagenCancionRef?.click()">
                <img v-if="previewImagenCancion" :src="previewImagenCancion" class="preview-cuadrado" alt="Portada">
                <div v-else class="zona-archivo-placeholder">
                    <i class="fas fa-image"></i>
                    <span>Haz clic para subir imagen</span>
                    <span class="zona-hint">JPG, PNG, WEBP · máx 5 MB</span>
                </div>
            </div>
            <input ref="inputImagenCancionRef" type="file" accept="image/jpg,image/jpeg,image/png,image/webp" style="display:none" @change="alSeleccionarImagenCancion">
        </div>

        <!-- Audio -->
        <div class="grupo-form">
            <label>Archivo de audio <span v-if="!cancionEdicion" class="label-requerido">*</span></label>
            <div
                class="zona-archivo zona-audio"
                :class="{ 'zona-archivo-error': erroresCancion.audio }"
                @click="inputAudioRef?.click()"
            >
                <template v-if="archivoAudioCancion">
                    <i class="fas fa-file-audio zona-audio-icono"></i>
                    <div class="zona-audio-info">
                        <span class="zona-audio-nombre">{{ nombreAudio }}</span>
                        <span class="zona-audio-dur"><i class="fas fa-clock"></i> {{ duracionDetectada }}</span>
                    </div>
                </template>
                <div v-else class="zona-archivo-placeholder">
                    <i class="fas fa-music"></i>
                    <span>Haz clic para subir audio</span>
                    <span class="zona-hint">MP3, OGG, WAV, M4A, AAC · máx 100 MB</span>
                </div>
            </div>
            <input ref="inputAudioRef" type="file" accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/m4a,audio/aac,audio/flac" style="display:none" @change="alSeleccionarAudio">
            <span v-if="erroresCancion.audio" class="campo-error"><i class="fas fa-exclamation-circle"></i> {{ erroresCancion.audio }}</span>
        </div>

        <!-- Duración detectada -->
        <div v-if="duracionDetectada && duracionDetectada !== 'Detectando...'" class="info-duracion">
            <i class="fas fa-check-circle"></i> Duración detectada: <strong>{{ duracionDetectada }}</strong>
        </div>
        <div v-else-if="duracionDetectada === 'Detectando...'" class="info-duracion cargando">
            <i class="fas fa-spinner fa-spin"></i> Detectando duración...
        </div>

        <template #acciones>
            <button class="boton-cancelar" @click="mostrarModalCancion = false" :disabled="guardandoCancion">Cancelar</button>
            <button class="boton-guardar" @click="guardarCancion" :disabled="guardandoCancion">
                <i v-if="guardandoCancion" class="fas fa-spinner fa-spin"></i>
                <span v-else>{{ cancionEdicion ? 'Guardar' : 'Subir' }}</span>
            </button>
        </template>
    </Modal>

    <!-- ── Modal álbum ── -->
    <Modal :visible="mostrarModalAlbum" :titulo="albumEdicion ? 'Editar álbum' : 'Nuevo álbum'" @cerrar="mostrarModalAlbum = false">

        <div class="grupo-form">
            <label>Título *</label>
            <input
                type="text"
                v-model="formAlbum.titulo"
                placeholder="Nombre del álbum"
                :class="{ 'input-error': erroresAlbum.titulo }"
                @input="erroresAlbum.titulo = ''"
            >
            <span v-if="erroresAlbum.titulo" class="campo-error"><i class="fas fa-exclamation-circle"></i> {{ erroresAlbum.titulo }}</span>
        </div>

        <div class="grupo-form-fila">
            <div class="grupo-form">
                <label>Género</label>
                <select v-model="formAlbum.genero">
                    <option value="">Sin especificar</option>
                    <option v-for="g in generos" :key="g.id" :value="g.nombre">{{ g.nombre }}</option>
                </select>
            </div>
            <div class="grupo-form">
                <label>Fecha de lanzamiento</label>
                <input type="date" v-model="formAlbum.publicado_at">
            </div>
        </div>

        <!-- Portada -->
        <div class="grupo-form">
            <label>Portada del álbum</label>
            <div class="zona-archivo" @click="inputImagenAlbumRef?.click()">
                <img v-if="previewImagenAlbum" :src="previewImagenAlbum" class="preview-cuadrado" alt="Portada">
                <div v-else class="zona-archivo-placeholder">
                    <i class="fas fa-image"></i>
                    <span>Haz clic para subir imagen</span>
                    <span class="zona-hint">JPG, PNG, WEBP · máx 5 MB</span>
                </div>
            </div>
            <input ref="inputImagenAlbumRef" type="file" accept="image/jpg,image/jpeg,image/png,image/webp" style="display:none" @change="alSeleccionarImagenAlbum">
        </div>

        <div class="grupo-form">
            <label>Descripción</label>
            <textarea v-model="formAlbum.descripcion" rows="3" placeholder="Describe este álbum..."></textarea>
        </div>

        <template #acciones>
            <button class="boton-cancelar" @click="mostrarModalAlbum = false" :disabled="guardandoAlbum">Cancelar</button>
            <button class="boton-guardar" @click="guardarAlbum" :disabled="guardandoAlbum">
                <i v-if="guardandoAlbum" class="fas fa-spinner fa-spin"></i>
                <span v-else>{{ albumEdicion ? 'Guardar' : 'Crear' }}</span>
            </button>
        </template>
    </Modal>
</template>

<style scoped>
/* Hero */
.artista-hero {
    position: relative;
    min-height: 280px;
    border-radius: 20px;
    overflow: hidden;
    margin-bottom: 32px;
    background: linear-gradient(135deg, #2d0a5c 0%, #5b21b6 100%);
    background-size: cover;
    background-position: center;
}
.artista-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 100%); }
.artista-hero-contenido { position: relative; z-index: 1; display: flex; align-items: flex-end; gap: 28px; padding: 32px; min-height: 280px; }
.artista-avatar { width: 120px; height: 120px; border-radius: 50%; border: 4px solid white; object-fit: cover; flex-shrink: 0; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
.artista-hero-info { flex: 1; }
.artista-etiqueta { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #a78bfa; display: flex; align-items: center; gap: 5px; margin-bottom: 6px; }
.artista-nombre { font-size: 40px; font-weight: 900; color: white; letter-spacing: -1px; line-height: 1; margin: 0 0 12px; }
.artista-stats-hero { display: flex; gap: 20px; flex-wrap: wrap; color: rgba(255,255,255,0.8); font-size: 13px; }
.artista-stats-hero span { display: flex; align-items: center; gap: 5px; }

/* Pestañas */
.pestanas-perfil { display: flex; gap: 24px; border-bottom: 1px solid var(--borde); margin-bottom: 32px; }
.boton-pestana { background: none; border: none; color: var(--texto-gris); font-size: 15px; font-weight: 600; padding: 14px 0; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
.boton-pestana:hover { color: var(--texto-blanco); }
.boton-pestana.activo { color: var(--texto-blanco); border-bottom-color: var(--morado); }

/* Acciones y layout */
.barra-accion { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.subtitulo-seccion { font-size: 20px; font-weight: 700; color: var(--texto-blanco); margin: 0 0 20px; }

/* ── Botón acción nueva (Subir canción / Crear álbum) ── */
.boton-accion-nueva {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 12px 22px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.22s;
    box-shadow: 0 4px 18px rgba(139, 92, 246, 0.35);
    letter-spacing: 0.2px;
}
.boton-accion-nueva:hover {
    background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(139, 92, 246, 0.5);
}
.boton-accion-nueva:active { transform: translateY(0); }
.boton-accion-nueva i { font-size: 16px; }

.boton-accion-album {
    background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
    box-shadow: 0 4px 18px rgba(37, 99, 235, 0.3);
}
.boton-accion-album:hover {
    background: linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%);
    box-shadow: 0 8px 28px rgba(37, 99, 235, 0.45);
}

/* Botón primario (perfil) */
.boton-primario { display: inline-flex; align-items: center; gap: 8px; background: var(--morado); color: white; border: none; border-radius: 50px; padding: 10px 22px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s, transform 0.1s; }
.boton-primario:hover:not(:disabled) { background: var(--morado-claro); transform: translateY(-1px); }
.boton-primario:disabled { opacity: 0.6; cursor: not-allowed; }

/* Estados */
.estado-info { display: flex; align-items: center; gap: 12px; color: var(--texto-gris); padding: 40px 0; }
.estado-vacio { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 20px; color: var(--texto-gris); text-align: center; }
.estado-vacio i { font-size: 48px; color: var(--morado); opacity: 0.4; }
.estado-vacio p { font-size: 16px; font-weight: 600; color: var(--texto-blanco); margin: 0; }
.estado-vacio .sub { font-size: 13px; font-weight: 400; color: var(--texto-gris); }

/* Tabla canciones */
.tabla-canciones { display: flex; flex-direction: column; gap: 4px; }
.fila-cancion { display: grid; grid-template-columns: 36px 48px 1fr 120px 72px; gap: 12px; align-items: center; padding: 8px 12px; border-radius: 8px; transition: background 0.15s; }
.fila-cancion:hover { background: var(--fondo-hover); }

/* Número / play toggle */
.fila-num { font-size: 13px; color: var(--texto-gris); text-align: center; display: flex; align-items: center; justify-content: center; }
.fila-num-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--texto-gris);
    font-size: 13px;
    transition: color 0.15s;
}
.fila-num-btn:not(:disabled):hover { color: var(--texto-blanco); }
.fila-num-btn:disabled { cursor: default; opacity: 0.4; }
.fila-icono-play { display: none; font-size: 11px; }
.fila-cancion:hover .fila-num-btn:not(:disabled) .fila-numero-txt { display: none; }
.fila-cancion:hover .fila-num-btn:not(:disabled) .fila-icono-play { display: block; }

.fila-imagen { width: 44px; height: 44px; border-radius: 6px; object-fit: cover; }
.fila-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fila-titulo { font-size: 14px; font-weight: 600; color: var(--texto-blanco); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fila-meta { font-size: 12px; color: var(--texto-gris); }
.fila-album { font-size: 12px; color: var(--texto-gris); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fila-repros { font-size: 12px; color: var(--texto-gris); display: flex; align-items: center; gap: 4px; }
.fila-repros.top { color: var(--morado); font-weight: 600; }
.fila-acciones { display: flex; gap: 6px; }

/* Álbumes */
.lista-albumes { display: flex; flex-direction: column; gap: 8px; }
.tarjeta-album { background: var(--fondo-tarjeta); border-radius: 12px; border: 1px solid transparent; transition: border-color 0.2s; }
.tarjeta-album.expandido { border-color: rgba(139,92,246,0.35); }
.album-cabecera { display: flex; align-items: center; gap: 16px; padding: 12px 16px; cursor: pointer; border-radius: 12px; transition: background 0.15s; }
.album-cabecera:hover { background: var(--fondo-hover); }
.album-portada { width: 64px; height: 64px; flex-shrink: 0; border-radius: 8px; background: linear-gradient(135deg, #4c1d95, #6d28d9); background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; }
.album-portada-placeholder { font-size: 24px; color: rgba(255,255,255,0.3); }
.album-datos { flex: 1; min-width: 0; }
.album-titulo { display: block; font-size: 15px; font-weight: 700; color: var(--texto-blanco); margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.album-meta, .album-fecha { display: block; font-size: 12px; color: var(--texto-gris); }
.album-acciones { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
.btn-expandir { transition: transform 0.25s ease; }
.btn-expandir.rotado { transform: rotate(180deg); }

/* Canciones del álbum (expandido) */
.album-canciones { border-top: 1px solid var(--borde); padding: 12px 16px 16px; }
.album-canciones-vacio { display: flex; align-items: center; gap: 10px; color: var(--texto-gris); font-size: 13px; padding: 16px 0; }
.album-canciones-vacio i { color: var(--morado); opacity: 0.5; }
.album-canciones-lista { display: flex; flex-direction: column; gap: 2px; margin-bottom: 12px; }
.album-cancion-fila { display: grid; grid-template-columns: 28px 40px 1fr 64px; gap: 10px; align-items: center; padding: 6px 8px; border-radius: 6px; transition: background 0.15s; }
.album-cancion-fila:hover { background: var(--fondo-hover); }
.album-cancion-fila:hover .fila-num-btn:not(:disabled) .fila-numero-txt { display: none; }
.album-cancion-fila:hover .fila-num-btn:not(:disabled) .fila-icono-play { display: block; }
.album-cancion-img { width: 40px; height: 40px; border-radius: 5px; object-fit: cover; }
.boton-anadir-cancion-album { display: inline-flex; align-items: center; gap: 8px; background: rgba(139,92,246,0.12); border: 1.5px dashed rgba(139,92,246,0.4); color: var(--morado); border-radius: 8px; padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; width: 100%; justify-content: center; }
.boton-anadir-cancion-album:hover { background: rgba(139,92,246,0.2); border-color: var(--morado); }

/* Botones icono */
.btn-icono { width: 30px; height: 30px; border-radius: 6px; border: none; background: var(--fondo-hover); color: var(--texto-gris); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; transition: all 0.15s; }
.btn-icono:hover { color: var(--texto-blanco); background: var(--borde); }
.btn-peligro:hover { color: #ff6b6b; background: rgba(255,107,107,0.12); }

/* Estadísticas */
.grid-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
.stat-card { background: var(--fondo-tarjeta); border-radius: 14px; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; border: 1px solid var(--borde); transition: border-color 0.2s; }
.stat-card:hover { border-color: var(--morado); }
.stat-icono { font-size: 28px; color: var(--morado); }
.stat-valor { font-size: 28px; font-weight: 800; color: var(--texto-blanco); line-height: 1; }
.stat-label { font-size: 12px; color: var(--texto-gris); font-weight: 500; }

/* Formulario configuración */
.form-perfil { max-width: 560px; display: flex; flex-direction: column; gap: 20px; }

/* Formulario general (modal + configuracion) */
.grupo-form { display: flex; flex-direction: column; gap: 6px; }
.grupo-form label { font-size: 13px; font-weight: 600; color: var(--texto-gris); display: flex; align-items: center; gap: 4px; }
.label-requerido { color: #f87171; font-size: 12px; }
.grupo-form input, .grupo-form textarea, .grupo-form select {
    background: var(--fondo-tarjeta); border: 1px solid var(--borde);
    border-radius: 8px; padding: 10px 14px; color: var(--texto-blanco);
    font-size: 14px; outline: none; transition: border-color 0.2s; font-family: inherit;
}
.grupo-form input:focus, .grupo-form textarea:focus, .grupo-form select:focus { border-color: var(--morado); }
.grupo-form input.input-error, .grupo-form textarea.input-error { border-color: #f87171; }
.grupo-form textarea { resize: vertical; min-height: 80px; }
.grupo-form select option { background: var(--fondo-secundario); }
.grupo-form-fila { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.preview-portada { margin-top: 8px; width: 100%; max-height: 120px; object-fit: cover; border-radius: 8px; }

/* Errores de campo */
.campo-error {
    font-size: 12px;
    color: #f87171;
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 2px;
}

/* Zona de subida de archivos */
.zona-archivo {
    border: 2px dashed var(--borde);
    border-radius: 10px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    overflow: hidden;
    min-height: 110px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.zona-archivo:hover { border-color: var(--morado); background: rgba(139,92,246,0.05); }
.zona-archivo-error { border-color: #f87171 !important; }
.zona-archivo-placeholder {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    color: var(--texto-gris); padding: 20px; text-align: center;
}
.zona-archivo-placeholder i { font-size: 28px; color: var(--morado); opacity: 0.6; }
.zona-archivo-placeholder span { font-size: 13px; font-weight: 500; }
.zona-hint { font-size: 11px; color: var(--texto-gris); opacity: 0.7; }

/* Imagen preview cuadrada */
.preview-cuadrado { width: 100%; max-height: 200px; object-fit: cover; display: block; }

/* Zona audio con archivo seleccionado */
.zona-audio { padding: 16px; }
.zona-audio-icono { font-size: 32px; color: var(--morado); flex-shrink: 0; }
.zona-audio-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; margin-left: 14px; }
.zona-audio-nombre { font-size: 13px; font-weight: 600; color: var(--texto-blanco); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
.zona-audio-dur { font-size: 12px; color: var(--morado); display: flex; align-items: center; gap: 5px; }

/* Info duración detectada */
.info-duracion { font-size: 12px; color: #34d399; display: flex; align-items: center; gap: 6px; margin-top: -4px; }
.info-duracion.cargando { color: var(--texto-gris); }

/* Modal botones */
.boton-cancelar { background: transparent; border: 1px solid var(--borde); color: var(--texto-gris); border-radius: 8px; padding: 9px 18px; cursor: pointer; font-size: 13px; font-weight: 600; }
.boton-cancelar:hover:not(:disabled) { border-color: var(--texto-gris); color: var(--texto-blanco); }
.boton-guardar { background: var(--morado); color: white; border: none; border-radius: 8px; padding: 9px 20px; cursor: pointer; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
.boton-guardar:hover:not(:disabled) { background: var(--morado-claro); }
.boton-guardar:disabled, .boton-cancelar:disabled { opacity: 0.5; cursor: not-allowed; }

/* Avatar upload */
.avatar-upload-seccion {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 8px;
}
.avatar-upload-preview {
    position: relative;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    cursor: pointer;
    overflow: hidden;
    flex-shrink: 0;
}
.avatar-upload-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    border: 3px solid var(--borde);
    display: block;
}
.avatar-upload-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
    color: white;
    font-size: 11px;
    font-weight: 600;
}
.avatar-upload-overlay i { font-size: 22px; }
.avatar-upload-preview:hover .avatar-upload-overlay { opacity: 1; }
.avatar-upload-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    color: var(--texto-gris);
}
.avatar-hint { font-size: 11px; opacity: 0.7; margin: 0; }
.avatar-upload-info p { margin: 0; }

/* Sección seguridad */
.separador-seccion { border: none; border-top: 1px solid var(--borde); margin: 32px 0; }
.texto-descripcion-seccion { font-size: 13px; color: var(--texto-gris); margin: 0 0 16px; }
.boton-seguridad { background: rgba(139,92,246,0.15); color: var(--morado); border: 1.5px solid var(--morado); }
.boton-seguridad:hover:not(:disabled) { background: var(--morado); color: white; }

/* Error modal artista */
.error-modal-artista {
    background: rgba(220,50,50,0.12); color: #f87171;
    border: 1px solid rgba(220,50,50,0.3);
    border-radius: 8px; padding: 10px 14px;
    font-size: 13px; margin-bottom: 12px;
    display: flex; align-items: center; gap: 8px;
}

/* Tabla eventos */
.tabla-eventos { display: flex; flex-direction: column; gap: 4px; }
.fila-evento {
    display: grid;
    grid-template-columns: 48px 1fr 200px 130px 90px 72px;
    gap: 12px;
    align-items: center;
    padding: 8px 12px;
    border-radius: 8px;
    transition: background 0.15s;
}
.fila-evento:hover { background: var(--fondo-hover); }
.precio-evento { font-weight: 600; color: var(--morado-claro); }

/* Preview imagen pequeña (modal evento) */
.preview-imagen-pequena {
    margin-bottom: 8px;
}
.preview-imagen-pequena img {
    width: 100%;
    max-height: 160px;
    object-fit: cover;
    border-radius: 8px;
}

/* Campos dobles en formulario */
.campo-form-fila {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

/* Grid de tipos de entrada */
.tipos-entrada-grid {
    border: 1px solid var(--borde);
    border-radius: 10px;
    overflow: hidden;
}
.tipos-entrada-cabecera {
    display: grid;
    grid-template-columns: 110px 1fr 1fr;
    gap: 12px;
    padding: 8px 14px;
    background: rgba(139,92,246,0.08);
    font-size: 11px;
    font-weight: 700;
    color: var(--texto-gris);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
.tipo-entrada-fila {
    display: grid;
    grid-template-columns: 110px 1fr 1fr;
    gap: 12px;
    align-items: start;
    padding: 10px 14px;
    border-top: 1px solid var(--borde);
}
.tipo-entrada-fila input {
    width: 100%;
    box-sizing: border-box;
    background: var(--fondo-tarjeta);
    border: 1px solid var(--borde);
    border-radius: 8px;
    padding: 8px 10px;
    color: var(--texto-blanco);
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
    font-family: inherit;
}
.tipo-entrada-fila input:focus { border-color: var(--morado); }
.tipo-entrada-fila input.input-error { border-color: #f87171; }
.tipo-nombre {
    font-size: 13px;
    font-weight: 700;
    color: var(--texto-blanco);
    display: flex;
    align-items: center;
    gap: 6px;
    padding-top: 8px;
}
.tipo-vip { color: #fbbf24; }

/* ── Favoritos ── */
.subtabs-favoritos {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
}

.subtab {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--fondo-tarjeta);
    color: var(--texto-gris);
    border: 1px solid transparent;
    border-radius: 50px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}
.subtab:hover  { color: var(--texto-blanco); background: var(--fondo-hover); }
.subtab.activo { background: var(--morado); color: white; border-color: var(--morado); }

.cuadricula-artistas-fav {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 24px;
}

.tarjeta-artista-fav {
    background: var(--fondo-tarjeta);
    padding: 24px;
    border-radius: 12px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
}
.tarjeta-artista-fav:hover { background: var(--fondo-hover); transform: translateY(-6px); }
.tarjeta-artista-fav h3 { font-size: 17px; font-weight: 600; margin: 0 0 8px; color: var(--texto-blanco); }
.tarjeta-artista-fav p  { font-size: 13px; color: var(--texto-gris); margin: 0 0 16px; }

.fav-artista-img {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    margin-bottom: 16px;
    object-fit: cover;
}

.boton-siguiendo {
    background: transparent;
    border: 1.5px solid var(--morado);
    color: var(--morado);
    border-radius: 50px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.boton-siguiendo:hover { background: rgba(139,92,246,0.1); color: #ff6b6b; border-color: #ff6b6b; }
</style>
