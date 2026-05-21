<script setup>
import { ref, computed, onMounted } from 'vue'
import Modal from '@/components/comunes/Modal.vue'
import { mostrarNotificacion } from '@/stores/appStore'
import { admin as adminSvc } from '@/servicios/admin'

// ── Pestañas ──────────────────────────────────────────────────────────────────
const pestanaActiva = ref('resumen')
const pestanas = [
    { id: 'resumen',   nombre: 'Resumen',   icono: 'fa-chart-bar'   },
    { id: 'usuarios',  nombre: 'Usuarios',  icono: 'fa-users'       },
    { id: 'canciones', nombre: 'Canciones', icono: 'fa-music'       },
    { id: 'albumes',   nombre: 'Álbumes',   icono: 'fa-compact-disc'},
    { id: 'eventos',   nombre: 'Eventos',   icono: 'fa-calendar'    },
]

// ── Búsqueda global dentro del panel ─────────────────────────────────────────
const busqueda = ref('')

// ── Resumen ───────────────────────────────────────────────────────────────────
const stats = ref(null)

async function cargarStats() {
    try { stats.value = await adminSvc.estadisticas() } catch (_) {}
}

// ── Usuarios ──────────────────────────────────────────────────────────────────
const usuarios         = ref([])
const filtroTipo       = ref('')
const editandoUsuario  = ref(null)
const formUsuario      = ref({ nombre: '', email: '', nombre_usuario: '', tipo: '' })
const guardandoUsuario = ref(false)

async function cargarUsuarios() {
    try {
        const r = await adminSvc.usuarios()
        usuarios.value = r.usuarios || []
    } catch (_) {}
}

const usuariosFiltrados = computed(() => {
    let lista = usuarios.value
    if (filtroTipo.value) lista = lista.filter(u => u.tipo === filtroTipo.value)
    if (busqueda.value.trim()) {
        const q = busqueda.value.toLowerCase()
        lista = lista.filter(u =>
            u.nombre?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.nombre_usuario?.toLowerCase().includes(q)
        )
    }
    return lista
})

function abrirEditarUsuario(u) {
    editandoUsuario.value = u
    formUsuario.value = { nombre: u.nombre, email: u.email, nombre_usuario: u.nombre_usuario, tipo: u.tipo }
}

async function guardarUsuario() {
    if (!editandoUsuario.value || guardandoUsuario.value) return
    guardandoUsuario.value = true
    try {
        await adminSvc.actualizarUsuario(editandoUsuario.value.id, formUsuario.value)
        const idx = usuarios.value.findIndex(u => u.id === editandoUsuario.value.id)
        if (idx !== -1) Object.assign(usuarios.value[idx], formUsuario.value)
        editandoUsuario.value = null
        mostrarNotificacion('Usuario actualizado')
    } catch (_) { mostrarNotificacion('Error al actualizar') }
    finally { guardandoUsuario.value = false }
}

async function eliminarUsuario(u) {
    if (!confirm(`¿Eliminar al usuario "${u.nombre}"? Esta acción es irreversible.`)) return
    try {
        await adminSvc.eliminarUsuario(u.id)
        usuarios.value = usuarios.value.filter(x => x.id !== u.id)
        mostrarNotificacion('Usuario eliminado')
    } catch (_) { mostrarNotificacion('Error al eliminar') }
}

// ── Canciones ─────────────────────────────────────────────────────────────────
const canciones         = ref([])
const cargandoCanciones = ref(false)

async function cargarCanciones() {
    cargandoCanciones.value = true
    try {
        const r = await adminSvc.canciones()
        canciones.value = r.canciones || []
    } catch (_) {}
    finally { cargandoCanciones.value = false }
}

const cancionesFiltradas = computed(() => {
    if (!busqueda.value.trim()) return canciones.value
    const q = busqueda.value.toLowerCase()
    return canciones.value.filter(c =>
        c.titulo?.toLowerCase().includes(q) ||
        c.artista?.toLowerCase().includes(q)
    )
})

async function toggleActivaCancion(c) {
    try {
        await adminSvc.actualizarCancion(c.id, { activa: !c.activa })
        c.activa = !c.activa
        mostrarNotificacion(c.activa ? 'Canción activada' : 'Canción desactivada')
    } catch (_) { mostrarNotificacion('Error al actualizar') }
}

async function eliminarCancion(c) {
    if (!confirm(`¿Eliminar la canción "${c.titulo}"?`)) return
    try {
        await adminSvc.eliminarCancion(c.id)
        canciones.value = canciones.value.filter(x => x.id !== c.id)
        mostrarNotificacion('Canción eliminada')
    } catch (_) { mostrarNotificacion('Error al eliminar') }
}

// ── Álbumes ───────────────────────────────────────────────────────────────────
const albumes         = ref([])
const cargandoAlbumes = ref(false)

async function cargarAlbumes() {
    cargandoAlbumes.value = true
    try {
        const r = await adminSvc.albumes()
        albumes.value = r.albumes || []
    } catch (_) {}
    finally { cargandoAlbumes.value = false }
}

const albumesFiltrados = computed(() => {
    if (!busqueda.value.trim()) return albumes.value
    const q = busqueda.value.toLowerCase()
    return albumes.value.filter(a =>
        a.titulo?.toLowerCase().includes(q) ||
        a.artista?.toLowerCase().includes(q)
    )
})

async function eliminarAlbum(a) {
    if (!confirm(`¿Eliminar el álbum "${a.titulo}"? Las canciones quedarán sueltas.`)) return
    try {
        await adminSvc.eliminarAlbum(a.id)
        albumes.value = albumes.value.filter(x => x.id !== a.id)
        mostrarNotificacion('Álbum eliminado')
    } catch (_) { mostrarNotificacion('Error al eliminar') }
}

// ── Eventos ───────────────────────────────────────────────────────────────────
const eventos         = ref([])
const cargandoEventos = ref(false)
const modalEvento     = ref(false)
const editandoEvento  = ref(null)
const guardandoEvento = ref(false)
const formEvento      = ref({
    nombre: '', artista: '', descripcion: '', fecha: '',
    lugar: '', ciudad: '', precio: 0, aforo: 100, imagen: '', nuevo_talento: false,
})

async function cargarEventos() {
    cargandoEventos.value = true
    try {
        const r = await adminSvc.eventos()
        eventos.value = r.eventos || []
    } catch (_) {}
    finally { cargandoEventos.value = false }
}

const eventosFiltrados = computed(() => {
    if (!busqueda.value.trim()) return eventos.value
    const q = busqueda.value.toLowerCase()
    return eventos.value.filter(e =>
        e.nombre?.toLowerCase().includes(q) ||
        e.artista?.toLowerCase().includes(q) ||
        e.ciudad?.toLowerCase().includes(q)
    )
})

function abrirModalEvento(evento = null) {
    editandoEvento.value = evento
    if (evento) {
        const f = evento.fecha ? evento.fecha.slice(0, 16) : ''
        formEvento.value = {
            nombre:        evento.nombre || '',
            artista:       evento.artista || '',
            descripcion:   evento.descripcion || '',
            fecha:         f,
            lugar:         evento.lugar || '',
            ciudad:        evento.ciudad || '',
            precio:        evento.precio ?? 0,
            aforo:         evento.aforo ?? 100,
            imagen:        evento.imagen || '',
            nuevo_talento: !!evento.nuevo_talento,
        }
    } else {
        formEvento.value = { nombre: '', artista: '', descripcion: '', fecha: '', lugar: '', ciudad: '', precio: 0, aforo: 100, imagen: '', nuevo_talento: false }
    }
    modalEvento.value = true
}

async function guardarEvento() {
    if (guardandoEvento.value) return
    guardandoEvento.value = true
    try {
        if (editandoEvento.value) {
            const r = await adminSvc.actualizarEvento(editandoEvento.value.id, formEvento.value)
            const idx = eventos.value.findIndex(e => e.id === editandoEvento.value.id)
            if (idx !== -1) eventos.value[idx] = r.evento
            mostrarNotificacion('Evento actualizado')
        } else {
            const r = await adminSvc.crearEvento(formEvento.value)
            eventos.value.unshift(r.evento)
            mostrarNotificacion('Evento creado')
        }
        modalEvento.value = false
    } catch (_) { mostrarNotificacion('Error al guardar el evento') }
    finally { guardandoEvento.value = false }
}

async function eliminarEvento(e) {
    if (!confirm(`¿Eliminar el evento "${e.nombre}"?`)) return
    try {
        await adminSvc.eliminarEvento(e.id)
        eventos.value = eventos.value.filter(x => x.id !== e.id)
        mostrarNotificacion('Evento eliminado')
    } catch (_) { mostrarNotificacion('Error al eliminar') }
}

function formatearFecha(fecha) {
    if (!fecha) return '—'
    return new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ETIQUETA_TIPO = { oyente: 'Oyente', artista: 'Artista', admin: 'Admin' }

// ── Crear usuario ─────────────────────────────────────────────────────────────
const modalCrearUsuario = ref(false)
const creandoUsuario    = ref(false)
const formNuevoUsuario  = ref({ nombre: '', email: '', nombre_usuario: '', password: '', tipo: 'oyente', nombre_artista: '' })

async function crearUsuario() {
    if (creandoUsuario.value) return
    creandoUsuario.value = true
    try {
        const r = await adminSvc.crearUsuario(formNuevoUsuario.value)
        usuarios.value.unshift(r.usuario)
        modalCrearUsuario.value = false
        formNuevoUsuario.value = { nombre: '', email: '', nombre_usuario: '', password: '', tipo: 'oyente', nombre_artista: '' }
        mostrarNotificacion('Usuario creado')
    } catch (_) { mostrarNotificacion('Error al crear el usuario') }
    finally { creandoUsuario.value = false }
}

// ── Crear canción ─────────────────────────────────────────────────────────────
const modalCrearCancion = ref(false)
const creandoCancion    = ref(false)
const formNuevaCancion  = ref({ titulo: '', artista_id: '', album_id: '', genero: '', duracion: '', imagen: '', audio_url: '', activa: true })

const artistasPlataforma = computed(() => usuarios.value.filter(u => u.tipo === 'artista'))
const albumesDelArtistaSel = computed(() => {
    if (!formNuevaCancion.value.artista_id) return []
    return albumes.value.filter(a => a.artista_id === Number(formNuevaCancion.value.artista_id))
})

async function crearCancion() {
    if (creandoCancion.value) return
    creandoCancion.value = true
    try {
        const payload = { ...formNuevaCancion.value, album_id: formNuevaCancion.value.album_id || null }
        const r = await adminSvc.crearCancion(payload)
        const c = r.cancion
        canciones.value.unshift({
            id:             c.id,
            titulo:         c.titulo,
            artista:        c.artista?.nombre_artista ?? c.artista?.nombre ?? '—',
            artista_id:     c.artista_id,
            album:          c.album?.titulo ?? null,
            duracion:       c.duracion,
            genero:         c.genero,
            reproducciones: c.reproducciones ?? 0,
            activa:         c.activa,
            imagen:         c.imagen,
            audio_url:      c.audio_url,
            created_at:     c.created_at?.slice(0, 10) ?? '',
        })
        modalCrearCancion.value = false
        formNuevaCancion.value = { titulo: '', artista_id: '', album_id: '', genero: '', duracion: '', imagen: '', audio_url: '', activa: true }
        mostrarNotificacion('Canción creada')
    } catch (_) { mostrarNotificacion('Error al crear la canción') }
    finally { creandoCancion.value = false }
}

// ── Crear álbum ────────────────────────────────────────────────────────────────
const modalCrearAlbum = ref(false)
const creandoAlbum    = ref(false)
const formNuevoAlbum  = ref({ titulo: '', artista_id: '', genero: '', imagen: '', publicado_at: '' })

async function crearAlbum() {
    if (creandoAlbum.value) return
    creandoAlbum.value = true
    try {
        const r = await adminSvc.crearAlbum(formNuevoAlbum.value)
        const a = r.album
        albumes.value.unshift({
            id:              a.id,
            titulo:          a.titulo,
            artista:         a.artista?.nombre_artista ?? a.artista?.nombre ?? '—',
            artista_id:      a.artista_id,
            genero:          a.genero,
            canciones_count: 0,
            publicado_at:    a.publicado_at,
            imagen:          a.imagen,
            created_at:      a.created_at?.slice(0, 10) ?? '',
        })
        modalCrearAlbum.value = false
        formNuevoAlbum.value = { titulo: '', artista_id: '', genero: '', imagen: '', publicado_at: '' }
        mostrarNotificacion('Álbum creado')
    } catch (_) { mostrarNotificacion('Error al crear el álbum') }
    finally { creandoAlbum.value = false }
}

// ── Carga inicial ─────────────────────────────────────────────────────────────
onMounted(async () => {
    await cargarStats()
    cargarUsuarios()
    cargarCanciones()
    cargarAlbumes()
    cargarEventos()
})
</script>

<template>
<div class="admin-panel">

    <!-- Cabecera del panel -->
    <div class="admin-header">
        <div class="admin-header-izq">
            <i class="fas fa-shield-alt admin-icono-header"></i>
            <div>
                <h1 class="admin-titulo">Panel de Administración</h1>
                <p class="admin-subtitulo">Gestión completa de la plataforma Sonalya</p>
            </div>
        </div>
        <!-- Buscador global -->
        <div class="admin-buscador">
            <i class="fas fa-search"></i>
            <input v-model="busqueda" type="text" placeholder="Buscar en la sección activa...">
        </div>
    </div>

    <!-- Tabs -->
    <div class="admin-tabs">
        <button
            v-for="p in pestanas" :key="p.id"
            class="admin-tab"
            :class="{ activo: pestanaActiva === p.id }"
            @click="pestanaActiva = p.id"
        >
            <i :class="['fas', p.icono]"></i>
            {{ p.nombre }}
        </button>
    </div>

    <!-- ══════════════════════════════════════════════════════════════
         RESUMEN
    ══════════════════════════════════════════════════════════════ -->
    <div v-show="pestanaActiva === 'resumen'" class="admin-contenido">
        <div v-if="!stats" class="admin-cargando"><i class="fas fa-spinner fa-spin"></i> Cargando estadísticas...</div>
        <template v-else>

            <!-- Héroe: 3 métricas principales -->
            <div class="resumen-hero">
                <div class="hero-card hero-azul">
                    <div class="hero-card-izq">
                        <span class="hero-label">Comunidad</span>
                        <span class="hero-valor">{{ stats.total_usuarios.toLocaleString() }}</span>
                        <span class="hero-sub">usuarios registrados</span>
                    </div>
                    <div class="hero-card-der">
                        <i class="fas fa-users hero-icono"></i>
                        <div class="hero-desglose">
                            <span><i class="fas fa-microphone"></i> {{ stats.total_artistas }} artistas</span>
                            <span><i class="fas fa-headphones"></i> {{ stats.total_oyentes }} oyentes</span>
                        </div>
                    </div>
                </div>

                <div class="hero-card hero-cyan">
                    <div class="hero-card-izq">
                        <span class="hero-label">Reproducciones</span>
                        <span class="hero-valor">{{ Number(stats.total_reproducciones).toLocaleString() }}</span>
                        <span class="hero-sub">plays en la plataforma</span>
                    </div>
                    <div class="hero-card-der">
                        <i class="fas fa-play-circle hero-icono"></i>
                        <div class="hero-desglose">
                            <span><i class="fas fa-music"></i> {{ stats.total_canciones }} canciones</span>
                            <span><i class="fas fa-compact-disc"></i> {{ stats.total_albumes }} álbumes</span>
                        </div>
                    </div>
                </div>

                <div class="hero-card hero-morado">
                    <div class="hero-card-izq">
                        <span class="hero-label">Eventos</span>
                        <span class="hero-valor">{{ stats.total_eventos }}</span>
                        <span class="hero-sub">eventos en cartelera</span>
                    </div>
                    <div class="hero-card-der">
                        <i class="fas fa-calendar-alt hero-icono"></i>
                        <div class="hero-desglose">
                            <span><i class="fas fa-ticket-alt"></i> {{ stats.total_entradas }} entradas</span>
                            <span><i class="fas fa-user-friends"></i> {{ stats.total_seguidores }} seguimientos</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Métricas secundarias -->
            <div class="resumen-secundario">
                <div class="mini-stat morado">
                    <i class="fas fa-microphone"></i>
                    <div>
                        <span class="mini-valor">{{ stats.total_artistas }}</span>
                        <span class="mini-label">Artistas</span>
                    </div>
                </div>
                <div class="mini-stat verde">
                    <i class="fas fa-headphones"></i>
                    <div>
                        <span class="mini-valor">{{ stats.total_oyentes }}</span>
                        <span class="mini-label">Oyentes</span>
                    </div>
                </div>
                <div class="mini-stat naranja">
                    <i class="fas fa-music"></i>
                    <div>
                        <span class="mini-valor">{{ stats.total_canciones }}</span>
                        <span class="mini-label">Canciones</span>
                    </div>
                </div>
                <div class="mini-stat rosa">
                    <i class="fas fa-compact-disc"></i>
                    <div>
                        <span class="mini-valor">{{ stats.total_albumes }}</span>
                        <span class="mini-label">Álbumes</span>
                    </div>
                </div>
                <div class="mini-stat amarillo">
                    <i class="fas fa-user-friends"></i>
                    <div>
                        <span class="mini-valor">{{ stats.total_seguidores }}</span>
                        <span class="mini-label">Seguimientos</span>
                    </div>
                </div>
                <div class="mini-stat rojo">
                    <i class="fas fa-ticket-alt"></i>
                    <div>
                        <span class="mini-valor">{{ stats.total_entradas }}</span>
                        <span class="mini-label">Entradas</span>
                    </div>
                </div>
            </div>

            <!-- Insights -->
            <div class="resumen-insights">
                <!-- Distribución de usuarios -->
                <div class="insight-card">
                    <div class="insight-titulo">
                        <i class="fas fa-chart-pie"></i>
                        Distribución de usuarios
                    </div>
                    <div class="insight-fila" v-if="stats.total_usuarios > 0">
                        <div class="insight-dist-item">
                            <div class="insight-dist-cabecera">
                                <span class="insight-dist-label"><i class="fas fa-headphones" style="color:#34d399"></i> Oyentes</span>
                                <span class="insight-dist-pct">{{ Math.round(stats.total_oyentes / stats.total_usuarios * 100) }}%</span>
                            </div>
                            <div class="insight-barra-fondo">
                                <div class="insight-barra verde" :style="{ width: Math.round(stats.total_oyentes / stats.total_usuarios * 100) + '%' }"></div>
                            </div>
                        </div>
                        <div class="insight-dist-item">
                            <div class="insight-dist-cabecera">
                                <span class="insight-dist-label"><i class="fas fa-microphone" style="color:#a78bfa"></i> Artistas</span>
                                <span class="insight-dist-pct">{{ Math.round(stats.total_artistas / stats.total_usuarios * 100) }}%</span>
                            </div>
                            <div class="insight-barra-fondo">
                                <div class="insight-barra morado" :style="{ width: Math.round(stats.total_artistas / stats.total_usuarios * 100) + '%' }"></div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="insight-vacio">Sin usuarios aún</div>
                </div>

                <!-- Ratios de contenido -->
                <div class="insight-card">
                    <div class="insight-titulo">
                        <i class="fas fa-chart-bar"></i>
                        Ratios de contenido
                    </div>
                    <div class="insight-ratios">
                        <div class="ratio-item">
                            <span class="ratio-valor naranja-txt">
                                {{ stats.total_artistas > 0 ? (stats.total_canciones / stats.total_artistas).toFixed(1) : '—' }}
                            </span>
                            <span class="ratio-label">canciones por artista</span>
                        </div>
                        <div class="ratio-sep"></div>
                        <div class="ratio-item">
                            <span class="ratio-valor rosa-txt">
                                {{ stats.total_artistas > 0 ? (stats.total_albumes / stats.total_artistas).toFixed(1) : '—' }}
                            </span>
                            <span class="ratio-label">álbumes por artista</span>
                        </div>
                        <div class="ratio-sep"></div>
                        <div class="ratio-item">
                            <span class="ratio-valor cyan-txt">
                                {{ stats.total_canciones > 0 ? Math.round(stats.total_reproducciones / stats.total_canciones).toLocaleString() : '—' }}
                            </span>
                            <span class="ratio-label">reproducciones por canción</span>
                        </div>
                    </div>
                </div>
            </div>

        </template>
    </div>

    <!-- ══════════════════════════════════════════════════════════════
         USUARIOS
    ══════════════════════════════════════════════════════════════ -->
    <div v-show="pestanaActiva === 'usuarios'" class="admin-contenido">
        <div class="admin-toolbar">
            <div class="admin-filtros">
                <button class="filtro-btn" :class="{ activo: filtroTipo === '' }"       @click="filtroTipo = ''">Todos</button>
                <button class="filtro-btn" :class="{ activo: filtroTipo === 'oyente' }" @click="filtroTipo = 'oyente'">Oyentes</button>
                <button class="filtro-btn" :class="{ activo: filtroTipo === 'artista'}" @click="filtroTipo = 'artista'">Artistas</button>
                <button class="filtro-btn" :class="{ activo: filtroTipo === 'admin' }"  @click="filtroTipo = 'admin'">Admins</button>
            </div>
            <div class="admin-toolbar-der">
                <span class="admin-contador">{{ usuariosFiltrados.length }} usuarios</span>
                <button class="btn-admin-nuevo" @click="modalCrearUsuario = true">
                    <i class="fas fa-plus"></i> Nuevo usuario
                </button>
            </div>
        </div>

        <div class="admin-tabla-wrapper">
            <table class="admin-tabla">
                <thead>
                    <tr>
                        <th>ID</th><th>Usuario</th><th>Email</th><th>Tipo</th><th>Registro</th><th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="u in usuariosFiltrados" :key="u.id">
                        <td class="td-id">{{ u.id }}</td>
                        <td>
                            <div class="td-usuario">
                                <img
                                    :src="u.url_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nombre)}&background=6d28d9&color=fff&size=36`"
                                    class="td-avatar"
                                >
                                <div>
                                    <span class="td-nombre">{{ u.nombre }}</span>
                                    <span class="td-sub">{{ u.nombre_usuario }}</span>
                                </div>
                            </div>
                        </td>
                        <td class="td-email">{{ u.email }}</td>
                        <td>
                            <span class="badge-tipo" :class="'badge-' + u.tipo">{{ ETIQUETA_TIPO[u.tipo] }}</span>
                        </td>
                        <td class="td-fecha">{{ formatearFecha(u.created_at) }}</td>
                        <td>
                            <div class="td-acciones">
                                <button class="btn-admin-icono" title="Editar" @click="abrirEditarUsuario(u)">
                                    <i class="fas fa-pen"></i>
                                </button>
                                <button class="btn-admin-icono btn-peligro" title="Eliminar" @click="eliminarUsuario(u)">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="usuariosFiltrados.length === 0">
                        <td colspan="6" class="td-vacio">No hay usuarios con ese criterio</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════
         CANCIONES
    ══════════════════════════════════════════════════════════════ -->
    <div v-show="pestanaActiva === 'canciones'" class="admin-contenido">
        <div class="admin-toolbar">
            <span class="admin-contador">{{ cancionesFiltradas.length }} canciones</span>
            <button class="btn-admin-nuevo" @click="modalCrearCancion = true">
                <i class="fas fa-plus"></i> Nueva canción
            </button>
        </div>
        <div v-if="cargandoCanciones" class="admin-cargando"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
        <div v-else class="admin-tabla-wrapper">
            <table class="admin-tabla">
                <thead>
                    <tr>
                        <th>ID</th><th>Título</th><th>Artista</th><th>Álbum</th><th>Género</th><th>Duración</th><th>Reproduc.</th><th>Activa</th><th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="c in cancionesFiltradas" :key="c.id">
                        <td class="td-id">{{ c.id }}</td>
                        <td>
                            <div class="td-cancion">
                                <img v-if="c.imagen" :src="c.imagen" class="td-thumb">
                                <div v-else class="td-thumb-placeholder"><i class="fas fa-music"></i></div>
                                <span class="td-nombre">{{ c.titulo }}</span>
                            </div>
                        </td>
                        <td class="td-sub">{{ c.artista }}</td>
                        <td class="td-sub">{{ c.album || '—' }}</td>
                        <td class="td-sub">{{ c.genero || '—' }}</td>
                        <td class="td-sub">{{ c.duracion }}</td>
                        <td class="td-num">{{ c.reproducciones.toLocaleString() }}</td>
                        <td>
                            <button
                                class="badge-activa"
                                :class="c.activa ? 'badge-on' : 'badge-off'"
                                @click="toggleActivaCancion(c)"
                                title="Toggle activa"
                            >{{ c.activa ? 'Activa' : 'Inactiva' }}</button>
                        </td>
                        <td>
                            <div class="td-acciones">
                                <a v-if="c.audio_url" :href="c.audio_url" target="_blank" class="btn-admin-icono" title="Escuchar">
                                    <i class="fas fa-headphones"></i>
                                </a>
                                <button class="btn-admin-icono btn-peligro" title="Eliminar" @click="eliminarCancion(c)">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="cancionesFiltradas.length === 0 && !cargandoCanciones">
                        <td colspan="9" class="td-vacio">No hay canciones</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════
         ÁLBUMES
    ══════════════════════════════════════════════════════════════ -->
    <div v-show="pestanaActiva === 'albumes'" class="admin-contenido">
        <div class="admin-toolbar">
            <span class="admin-contador">{{ albumesFiltrados.length }} álbumes</span>
            <button class="btn-admin-nuevo" @click="modalCrearAlbum = true">
                <i class="fas fa-plus"></i> Nuevo álbum
            </button>
        </div>
        <div v-if="cargandoAlbumes" class="admin-cargando"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
        <div v-else class="admin-tabla-wrapper">
            <table class="admin-tabla">
                <thead>
                    <tr>
                        <th>ID</th><th>Álbum</th><th>Artista</th><th>Género</th><th>Canciones</th><th>Publicado</th><th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="a in albumesFiltrados" :key="a.id">
                        <td class="td-id">{{ a.id }}</td>
                        <td>
                            <div class="td-cancion">
                                <img v-if="a.imagen" :src="a.imagen" class="td-thumb">
                                <div v-else class="td-thumb-placeholder"><i class="fas fa-compact-disc"></i></div>
                                <span class="td-nombre">{{ a.titulo }}</span>
                            </div>
                        </td>
                        <td class="td-sub">{{ a.artista }}</td>
                        <td class="td-sub">{{ a.genero || '—' }}</td>
                        <td class="td-num">{{ a.canciones_count }}</td>
                        <td class="td-fecha">{{ a.publicado_at ? formatearFecha(a.publicado_at) : '—' }}</td>
                        <td>
                            <div class="td-acciones">
                                <button class="btn-admin-icono btn-peligro" title="Eliminar" @click="eliminarAlbum(a)">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="albumesFiltrados.length === 0 && !cargandoAlbumes">
                        <td colspan="7" class="td-vacio">No hay álbumes</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════
         EVENTOS
    ══════════════════════════════════════════════════════════════ -->
    <div v-show="pestanaActiva === 'eventos'" class="admin-contenido">
        <div class="admin-toolbar">
            <span class="admin-contador">{{ eventosFiltrados.length }} eventos</span>
            <button class="btn-admin-nuevo" @click="abrirModalEvento()">
                <i class="fas fa-plus"></i> Nuevo evento
            </button>
        </div>
        <div v-if="cargandoEventos" class="admin-cargando"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
        <div v-else class="admin-tabla-wrapper">
            <table class="admin-tabla">
                <thead>
                    <tr>
                        <th>ID</th><th>Evento</th><th>Artista</th><th>Fecha</th><th>Ciudad</th><th>Precio</th><th>Entradas</th><th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="e in eventosFiltrados" :key="e.id">
                        <td class="td-id">{{ e.id }}</td>
                        <td class="td-nombre">{{ e.nombre }}</td>
                        <td class="td-sub">{{ e.artista }}</td>
                        <td class="td-fecha">{{ formatearFecha(e.fecha) }}</td>
                        <td class="td-sub">{{ e.ciudad }}</td>
                        <td class="td-num">{{ Number(e.precio).toFixed(2) }} €</td>
                        <td class="td-num">{{ e.entradas_vendidas }} / {{ e.aforo }}</td>
                        <td>
                            <div class="td-acciones">
                                <button class="btn-admin-icono" title="Editar" @click="abrirModalEvento(e)">
                                    <i class="fas fa-pen"></i>
                                </button>
                                <button class="btn-admin-icono btn-peligro" title="Eliminar" @click="eliminarEvento(e)">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="eventosFiltrados.length === 0 && !cargandoEventos">
                        <td colspan="8" class="td-vacio">No hay eventos</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

</div>

<!-- ── Modal crear usuario ──────────────────────────────────────────────────── -->
<Modal :visible="modalCrearUsuario" titulo="Nuevo usuario" @cerrar="modalCrearUsuario = false">
    <div class="grupo-form-fila">
        <div class="grupo-form">
            <label>Nombre *</label>
            <input type="text" v-model="formNuevoUsuario.nombre" placeholder="Nombre completo">
        </div>
        <div class="grupo-form">
            <label>@Usuario *</label>
            <input type="text" v-model="formNuevoUsuario.nombre_usuario" placeholder="@usuario">
        </div>
    </div>
    <div class="grupo-form">
        <label>Email *</label>
        <input type="email" v-model="formNuevoUsuario.email" placeholder="correo@ejemplo.com">
    </div>
    <div class="grupo-form">
        <label>Contraseña *</label>
        <input type="password" v-model="formNuevoUsuario.password" placeholder="Mínimo 8 caracteres">
    </div>
    <div class="grupo-form">
        <label>Rol *</label>
        <select v-model="formNuevoUsuario.tipo">
            <option value="oyente">Oyente</option>
            <option value="artista">Artista</option>
            <option value="admin">Admin</option>
        </select>
    </div>
    <div v-if="formNuevoUsuario.tipo === 'artista'" class="grupo-form">
        <label>Nombre artístico</label>
        <input type="text" v-model="formNuevoUsuario.nombre_artista" placeholder="Nombre artístico">
    </div>
    <template #acciones>
        <button class="boton-cancelar" @click="modalCrearUsuario = false" :disabled="creandoUsuario">Cancelar</button>
        <button class="boton-guardar" @click="crearUsuario" :disabled="creandoUsuario">
            <i v-if="creandoUsuario" class="fas fa-spinner fa-spin"></i>
            <span v-else>Crear usuario</span>
        </button>
    </template>
</Modal>

<!-- ── Modal crear canción ───────────────────────────────────────────────────── -->
<Modal :visible="modalCrearCancion" titulo="Nueva canción" @cerrar="modalCrearCancion = false">
    <div class="grupo-form">
        <label>Título *</label>
        <input type="text" v-model="formNuevaCancion.titulo" placeholder="Título de la canción">
    </div>
    <div class="grupo-form-fila">
        <div class="grupo-form">
            <label>Artista *</label>
            <select v-model="formNuevaCancion.artista_id" @change="formNuevaCancion.album_id = ''">
                <option value="">— Selecciona artista —</option>
                <option v-for="a in artistasPlataforma" :key="a.id" :value="a.id">
                    {{ a.nombre_artista || a.nombre }}
                </option>
            </select>
        </div>
        <div class="grupo-form">
            <label>Álbum (opcional)</label>
            <select v-model="formNuevaCancion.album_id" :disabled="!formNuevaCancion.artista_id">
                <option value="">— Sin álbum —</option>
                <option v-for="al in albumesDelArtistaSel" :key="al.id" :value="al.id">
                    {{ al.titulo }}
                </option>
            </select>
        </div>
    </div>
    <div class="grupo-form-fila">
        <div class="grupo-form">
            <label>Género</label>
            <input type="text" v-model="formNuevaCancion.genero" placeholder="Pop, Rock...">
        </div>
        <div class="grupo-form">
            <label>Duración</label>
            <input type="text" v-model="formNuevaCancion.duracion" placeholder="3:45">
        </div>
    </div>
    <div class="grupo-form">
        <label>URL de audio *</label>
        <input type="text" v-model="formNuevaCancion.audio_url" placeholder="https://...">
    </div>
    <div class="grupo-form">
        <label>URL de imagen</label>
        <input type="text" v-model="formNuevaCancion.imagen" placeholder="https://...">
    </div>
    <div class="grupo-form grupo-checkbox">
        <input type="checkbox" id="activa-nueva" v-model="formNuevaCancion.activa">
        <label for="activa-nueva">Canción activa (visible en la plataforma)</label>
    </div>
    <template #acciones>
        <button class="boton-cancelar" @click="modalCrearCancion = false" :disabled="creandoCancion">Cancelar</button>
        <button class="boton-guardar" @click="crearCancion" :disabled="creandoCancion">
            <i v-if="creandoCancion" class="fas fa-spinner fa-spin"></i>
            <span v-else>Crear canción</span>
        </button>
    </template>
</Modal>

<!-- ── Modal crear álbum ─────────────────────────────────────────────────────── -->
<Modal :visible="modalCrearAlbum" titulo="Nuevo álbum" @cerrar="modalCrearAlbum = false">
    <div class="grupo-form">
        <label>Título *</label>
        <input type="text" v-model="formNuevoAlbum.titulo" placeholder="Título del álbum">
    </div>
    <div class="grupo-form">
        <label>Artista *</label>
        <select v-model="formNuevoAlbum.artista_id">
            <option value="">— Selecciona artista —</option>
            <option v-for="a in artistasPlataforma" :key="a.id" :value="a.id">
                {{ a.nombre_artista || a.nombre }}
            </option>
        </select>
    </div>
    <div class="grupo-form-fila">
        <div class="grupo-form">
            <label>Género</label>
            <input type="text" v-model="formNuevoAlbum.genero" placeholder="Pop, Rock...">
        </div>
        <div class="grupo-form">
            <label>Fecha de publicación</label>
            <input type="date" v-model="formNuevoAlbum.publicado_at">
        </div>
    </div>
    <div class="grupo-form">
        <label>URL de imagen</label>
        <input type="text" v-model="formNuevoAlbum.imagen" placeholder="https://...">
    </div>
    <template #acciones>
        <button class="boton-cancelar" @click="modalCrearAlbum = false" :disabled="creandoAlbum">Cancelar</button>
        <button class="boton-guardar" @click="crearAlbum" :disabled="creandoAlbum">
            <i v-if="creandoAlbum" class="fas fa-spinner fa-spin"></i>
            <span v-else>Crear álbum</span>
        </button>
    </template>
</Modal>

<!-- ── Modal editar usuario ─────────────────────────────────────────────────── -->
<Modal :visible="!!editandoUsuario" titulo="Editar usuario" @cerrar="editandoUsuario = null">
    <div class="grupo-form">
        <label>Nombre</label>
        <input type="text" v-model="formUsuario.nombre">
    </div>
    <div class="grupo-form">
        <label>Email</label>
        <input type="email" v-model="formUsuario.email">
    </div>
    <div class="grupo-form">
        <label>@Usuario</label>
        <input type="text" v-model="formUsuario.nombre_usuario">
    </div>
    <div class="grupo-form">
        <label>Rol</label>
        <select v-model="formUsuario.tipo">
            <option value="oyente">Oyente</option>
            <option value="artista">Artista</option>
            <option value="admin">Admin</option>
        </select>
    </div>
    <template #acciones>
        <button class="boton-cancelar" @click="editandoUsuario = null" :disabled="guardandoUsuario">Cancelar</button>
        <button class="boton-guardar" @click="guardarUsuario" :disabled="guardandoUsuario">
            <i v-if="guardandoUsuario" class="fas fa-spinner fa-spin"></i>
            <span v-else>Guardar</span>
        </button>
    </template>
</Modal>

<!-- ── Modal evento ──────────────────────────────────────────────────────────── -->
<Modal :visible="modalEvento" :titulo="editandoEvento ? 'Editar evento' : 'Nuevo evento'" @cerrar="modalEvento = false">
    <div class="grupo-form-fila">
        <div class="grupo-form">
            <label>Nombre del evento *</label>
            <input type="text" v-model="formEvento.nombre" placeholder="Nombre del evento">
        </div>
        <div class="grupo-form">
            <label>Artista *</label>
            <input type="text" v-model="formEvento.artista" placeholder="Nombre del artista">
        </div>
    </div>
    <div class="grupo-form-fila">
        <div class="grupo-form">
            <label>Fecha y hora *</label>
            <input type="datetime-local" v-model="formEvento.fecha">
        </div>
        <div class="grupo-form">
            <label>Ciudad *</label>
            <input type="text" v-model="formEvento.ciudad" placeholder="Madrid, Barcelona...">
        </div>
    </div>
    <div class="grupo-form">
        <label>Lugar *</label>
        <input type="text" v-model="formEvento.lugar" placeholder="Nombre del recinto">
    </div>
    <div class="grupo-form-fila">
        <div class="grupo-form">
            <label>Precio (€) *</label>
            <input type="number" v-model="formEvento.precio" min="0" step="0.01">
        </div>
        <div class="grupo-form">
            <label>Aforo *</label>
            <input type="number" v-model="formEvento.aforo" min="1">
        </div>
    </div>
    <div class="grupo-form">
        <label>Imagen (URL)</label>
        <input type="text" v-model="formEvento.imagen" placeholder="https://...">
    </div>
    <div class="grupo-form">
        <label>Descripción</label>
        <textarea v-model="formEvento.descripcion" rows="3" placeholder="Descripción del evento..."></textarea>
    </div>
    <div class="grupo-form grupo-checkbox">
        <input type="checkbox" id="nuevo-talento" v-model="formEvento.nuevo_talento">
        <label for="nuevo-talento">Marcar como "Nuevo Talento"</label>
    </div>
    <template #acciones>
        <button class="boton-cancelar" @click="modalEvento = false" :disabled="guardandoEvento">Cancelar</button>
        <button class="boton-guardar" @click="guardarEvento" :disabled="guardandoEvento">
            <i v-if="guardandoEvento" class="fas fa-spinner fa-spin"></i>
            <span v-else>{{ editandoEvento ? 'Guardar cambios' : 'Crear evento' }}</span>
        </button>
    </template>
</Modal>
</template>

<style scoped>
.admin-panel {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 100%;
    padding: 32px;
}

/* ── Cabecera ──────────────────────────────────────────────────────── */
.admin-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 28px;
    flex-wrap: wrap;
}
.admin-header-izq { display: flex; align-items: center; gap: 16px; }
.admin-icono-header { font-size: 36px; color: var(--morado); }
.admin-titulo { font-size: 26px; font-weight: 900; color: var(--texto-blanco); margin: 0; }
.admin-subtitulo { font-size: 13px; color: var(--texto-gris); margin: 0; }

.admin-buscador {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--fondo-tarjeta);
    border: 1px solid var(--borde);
    border-radius: 10px;
    padding: 9px 16px;
    min-width: 280px;
    color: var(--texto-gris);
}
.admin-buscador input {
    background: none;
    border: none;
    outline: none;
    color: var(--texto-blanco);
    font-size: 14px;
    flex: 1;
}

/* ── Tabs ──────────────────────────────────────────────────────────── */
.admin-tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--borde);
    margin-bottom: 28px;
    flex-wrap: wrap;
}
.admin-tab {
    background: none;
    border: none;
    color: var(--texto-gris);
    font-size: 14px;
    font-weight: 600;
    padding: 12px 20px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    white-space: nowrap;
}
.admin-tab:hover { color: var(--texto-blanco); }
.admin-tab.activo { color: var(--texto-blanco); border-bottom-color: var(--morado); }
.admin-tab i { font-size: 13px; }

/* ── Contenido ─────────────────────────────────────────────────────── */
.admin-contenido { flex: 1; }
.admin-cargando { color: var(--texto-gris); display: flex; align-items: center; gap: 12px; padding: 40px 0; }


/* ── Toolbar ───────────────────────────────────────────────────────── */
.admin-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}
.admin-filtros { display: flex; gap: 6px; flex-wrap: wrap; }
.filtro-btn {
    background: var(--fondo-tarjeta);
    border: 1px solid var(--borde);
    color: var(--texto-gris);
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
}
.filtro-btn:hover { border-color: var(--morado); color: var(--texto-blanco); }
.filtro-btn.activo { background: var(--morado); border-color: var(--morado); color: white; }
.admin-contador { font-size: 13px; color: var(--texto-gris); white-space: nowrap; }
.admin-toolbar-der { display: flex; align-items: center; gap: 12px; }

.btn-admin-nuevo {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--morado);
    color: white;
    border: none;
    border-radius: 10px;
    padding: 9px 18px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
}
.btn-admin-nuevo:hover { background: var(--morado-claro); }

/* ── Tabla ─────────────────────────────────────────────────────────── */
.admin-tabla-wrapper {
    overflow-x: auto;
    border-radius: 12px;
    border: 1px solid var(--borde);
}
.admin-tabla {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}
.admin-tabla thead tr {
    background: var(--fondo-secundario);
}
.admin-tabla th {
    padding: 12px 14px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--texto-gris);
    white-space: nowrap;
    border-bottom: 1px solid var(--borde);
}
.admin-tabla td {
    padding: 11px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    vertical-align: middle;
}
.admin-tabla tbody tr:last-child td { border-bottom: none; }
.admin-tabla tbody tr:hover { background: rgba(255,255,255,0.03); }

.td-id { color: var(--texto-gris); font-size: 12px; width: 40px; }
.td-nombre { font-weight: 600; color: var(--texto-blanco); }
.td-sub { color: var(--texto-gris); font-size: 12px; }
.td-email { font-size: 12px; color: var(--texto-gris); }
.td-fecha { font-size: 12px; color: var(--texto-gris); white-space: nowrap; }
.td-num { text-align: right; font-variant-numeric: tabular-nums; color: var(--texto-blanco); }
.td-vacio { text-align: center; color: var(--texto-gris); padding: 40px; }

.td-usuario { display: flex; align-items: center; gap: 10px; }
.td-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.td-usuario .td-nombre { display: block; }
.td-usuario .td-sub { display: block; }

.td-cancion { display: flex; align-items: center; gap: 10px; }
.td-thumb { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
.td-thumb-placeholder {
    width: 36px; height: 36px; border-radius: 6px;
    background: var(--fondo-tarjeta);
    display: flex; align-items: center; justify-content: center;
    color: var(--texto-gris); font-size: 13px; flex-shrink: 0;
}

.td-acciones { display: flex; gap: 6px; align-items: center; }
.btn-admin-icono {
    width: 32px; height: 32px;
    border-radius: 8px;
    border: 1px solid var(--borde);
    background: var(--fondo-tarjeta);
    color: var(--texto-gris);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px;
    text-decoration: none;
    transition: all 0.15s;
}
.btn-admin-icono:hover { color: var(--texto-blanco); border-color: var(--texto-gris); }
.btn-peligro:hover { color: #f87171; border-color: rgba(248,113,113,0.4); background: rgba(248,113,113,0.08); }

/* ── Badges ────────────────────────────────────────────────────────── */
.badge-tipo {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.badge-oyente  { background: rgba(59,130,246,0.15);  color: #60a5fa; }
.badge-artista { background: rgba(139,92,246,0.15);  color: #a78bfa; }
.badge-admin   { background: rgba(239,68,68,0.15);   color: #f87171; }

.badge-activa {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s;
}
.badge-activa:hover { opacity: 0.8; }
.badge-on  { background: rgba(16,185,129,0.15); color: #34d399; }
.badge-off { background: rgba(239,68,68,0.15);  color: #f87171; }

/* ── Formularios (modales) ─────────────────────────────────────────── */
.grupo-form { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.grupo-form label { font-size: 13px; font-weight: 600; color: var(--texto-gris); }
.grupo-form input, .grupo-form select, .grupo-form textarea {
    background: var(--fondo-tarjeta);
    border: 1px solid var(--borde);
    border-radius: 8px;
    padding: 10px 14px;
    color: var(--texto-blanco);
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
    font-family: inherit;
}
.grupo-form input:focus, .grupo-form select:focus, .grupo-form textarea:focus { border-color: var(--morado); }
.grupo-form textarea { resize: vertical; min-height: 80px; }
.grupo-form select option { background: var(--fondo-secundario); }
.grupo-form-fila { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.grupo-checkbox { flex-direction: row; align-items: center; gap: 10px; }
.grupo-checkbox input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }
.grupo-checkbox label { cursor: pointer; color: var(--texto-blanco); }

.boton-cancelar {
    background: transparent; border: 1px solid var(--borde); color: var(--texto-gris);
    border-radius: 8px; padding: 9px 18px; cursor: pointer; font-size: 13px; font-weight: 600;
}
.boton-cancelar:hover:not(:disabled) { border-color: var(--texto-gris); color: var(--texto-blanco); }
.boton-guardar {
    background: var(--morado); color: white; border: none;
    border-radius: 8px; padding: 9px 20px; cursor: pointer;
    font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px;
}
.boton-guardar:hover:not(:disabled) { background: var(--morado-claro); }
.boton-guardar:disabled, .boton-cancelar:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Resumen: Hero ─────────────────────────────────────────────────── */
.resumen-hero {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 16px;
}
.hero-card {
    border-radius: 18px;
    padding: 28px 26px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    border: 1px solid transparent;
    position: relative;
    overflow: hidden;
}
.hero-card::before {
    content: '';
    position: absolute;
    inset: 0;
    opacity: 0.06;
    background: radial-gradient(circle at 80% 20%, white, transparent 60%);
}
.hero-azul   { background: rgba(59,130,246,0.14);  border-color: rgba(59,130,246,0.28);  }
.hero-cyan   { background: rgba(6,182,212,0.14);   border-color: rgba(6,182,212,0.28);   }
.hero-morado { background: rgba(139,92,246,0.14);  border-color: rgba(139,92,246,0.28);  }

.hero-card-izq { display: flex; flex-direction: column; gap: 4px; }
.hero-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: rgba(255,255,255,0.5);
}
.hero-valor {
    font-size: 40px;
    font-weight: 900;
    color: var(--texto-blanco);
    line-height: 1;
    font-variant-numeric: tabular-nums;
}
.hero-sub {
    font-size: 12px;
    color: rgba(255,255,255,0.45);
    margin-top: 2px;
}

.hero-card-der {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
    flex-shrink: 0;
}
.hero-icono {
    font-size: 42px;
    opacity: 0.2;
}
.hero-azul   .hero-icono { color: #60a5fa; }
.hero-cyan   .hero-icono { color: #22d3ee; }
.hero-morado .hero-icono { color: #a78bfa; }

.hero-desglose {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
}
.hero-desglose span {
    font-size: 12px;
    color: rgba(255,255,255,0.6);
    display: flex;
    align-items: center;
    gap: 5px;
}
.hero-desglose i { font-size: 10px; }

/* ── Resumen: Mini stats ───────────────────────────────────────────── */
.resumen-secundario {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
    margin-bottom: 16px;
}
.mini-stat {
    border-radius: 14px;
    padding: 18px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid transparent;
}
.mini-stat i { font-size: 20px; flex-shrink: 0; }
.mini-stat > div { display: flex; flex-direction: column; gap: 2px; }
.mini-valor { font-size: 20px; font-weight: 800; color: var(--texto-blanco); line-height: 1; }
.mini-label { font-size: 11px; color: rgba(255,255,255,0.45); font-weight: 500; }

.mini-stat.morado  { background: rgba(139,92,246,0.12);  border-color: rgba(139,92,246,0.25);  }
.mini-stat.morado  i { color: #a78bfa; }
.mini-stat.verde   { background: rgba(16,185,129,0.12);  border-color: rgba(16,185,129,0.25);  }
.mini-stat.verde   i { color: #34d399; }
.mini-stat.naranja { background: rgba(245,158,11,0.12);  border-color: rgba(245,158,11,0.25);  }
.mini-stat.naranja i { color: #fbbf24; }
.mini-stat.rosa    { background: rgba(236,72,153,0.12);  border-color: rgba(236,72,153,0.25);  }
.mini-stat.rosa    i { color: #f472b6; }
.mini-stat.amarillo{ background: rgba(234,179,8,0.12);   border-color: rgba(234,179,8,0.25);   }
.mini-stat.amarillo i { color: #facc15; }
.mini-stat.rojo    { background: rgba(239,68,68,0.12);   border-color: rgba(239,68,68,0.25);   }
.mini-stat.rojo    i { color: #f87171; }

/* ── Resumen: Insights ─────────────────────────────────────────────── */
.resumen-insights {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}
.insight-card {
    background: var(--fondo-tarjeta);
    border: 1px solid var(--borde);
    border-radius: 16px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}
.insight-titulo {
    font-size: 13px;
    font-weight: 700;
    color: var(--texto-gris);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    display: flex;
    align-items: center;
    gap: 8px;
}
.insight-titulo i { color: var(--morado); }

.insight-fila { display: flex; flex-direction: column; gap: 16px; }
.insight-dist-item { display: flex; flex-direction: column; gap: 6px; }
.insight-dist-cabecera { display: flex; justify-content: space-between; align-items: center; }
.insight-dist-label { font-size: 13px; color: var(--texto-blanco); display: flex; align-items: center; gap: 6px; }
.insight-dist-pct { font-size: 13px; font-weight: 700; color: var(--texto-blanco); }
.insight-barra-fondo {
    height: 8px;
    background: rgba(255,255,255,0.06);
    border-radius: 99px;
    overflow: hidden;
}
.insight-barra {
    height: 100%;
    border-radius: 99px;
    transition: width 0.6s ease;
}
.insight-barra.verde  { background: linear-gradient(90deg, #10b981, #34d399); }
.insight-barra.morado { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
.insight-vacio { color: var(--texto-gris); font-size: 13px; }

.insight-ratios {
    display: flex;
    flex-direction: column;
    gap: 0;
}
.ratio-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}
.ratio-item:last-child { border-bottom: none; }
.ratio-valor {
    font-size: 28px;
    font-weight: 900;
    line-height: 1;
    min-width: 70px;
    font-variant-numeric: tabular-nums;
}
.ratio-label { font-size: 13px; color: var(--texto-gris); }
.naranja-txt { color: #fbbf24; }
.rosa-txt    { color: #f472b6; }
.cyan-txt    { color: #22d3ee; }
.ratio-sep { display: none; }

@media (max-width: 1100px) {
    .resumen-hero { grid-template-columns: 1fr 1fr; }
    .resumen-secundario { grid-template-columns: repeat(3, 1fr); }
    .resumen-insights { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
    .resumen-hero { grid-template-columns: 1fr; }
    .resumen-secundario { grid-template-columns: repeat(2, 1fr); }
}
</style>
