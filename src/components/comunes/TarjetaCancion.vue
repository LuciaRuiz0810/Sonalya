<!--
  =============================================================================
  COMPONENTE TARJETA DE CANCIÓN
  =============================================================================

  Muestra una fila con información de una canción en una lista.
  Se usa en listas de canciones favoritas, resultados de búsqueda, etc.

  Estructura visual:
  [Número] [Imagen] [Título/Artista] [Álbum] [Duración] [Favorito] [Eliminar?]

  Cuando el usuario pasa el ratón por encima, el número se convierte
  en un icono de reproducción.

  Props:
  - cancion: Objeto con los datos de la canción
  - numero: Número de posición en la lista
  - mostrarAlbum: Si se muestra la columna del álbum
  - mostrarEliminar: Si se muestra el botón de eliminar

  Eventos emitidos:
  - click: Cuando se hace clic en la canción (para reproducir)
  - favorito: Cuando se marca/desmarca como favorito
  - eliminar: Cuando se hace clic en el botón de eliminar

  @author Lucia Ruiz Salvador
  @version 1.0.0
-->

<script setup>
// =============================================================================
// IMPORTACIONES
// =============================================================================

import { ref, computed, watch, onUnmounted } from 'vue'
import { reproducirCancion, agregarACola, almacenApp, abrirModalAuth, mostrarNotificacion, cargarMisPlaylists } from '@/stores/appStore'
import { usuario as usuarioSvc } from '@/servicios/usuario'

// =============================================================================
// PROPS
// =============================================================================

const propiedades = defineProps({
    cancion:         { type: Object,  required: true },
    numero:          { type: Number,  required: true },
    mostrarAlbum:    { type: Boolean, default: true  },
    mostrarEliminar: { type: Boolean, default: false },
    esFavorito:      { type: Boolean, default: false },
})

// =============================================================================
// EVENTOS
// =============================================================================

const emitir = defineEmits(['click', 'favorito', 'eliminar'])

// =============================================================================
// ESTADO LOCAL
// =============================================================================

const ratonEncima = ref(false)
const cargandoFav = ref(false)

// ID Deezer normalizado como string (maneja tanto 'id' como 'deezer_id')
const deezerId = computed(() =>
    String(propiedades.cancion.id || propiedades.cancion.deezer_id || '')
)

// Estado inicial: usa el Set global si ya está cargado, si no usa la prop
const localFavorito = ref(
    almacenApp.favsCancionesCargados && deezerId.value
        ? almacenApp.idsFavCanciones.has(deezerId.value)
        : propiedades.esFavorito
)

// Cuando el Set global se carga por primera vez, actualizar el estado
watch(() => almacenApp.favsCancionesCargados, (cargado) => {
    if (cargado && deezerId.value) {
        localFavorito.value = almacenApp.idsFavCanciones.has(deezerId.value)
    }
})

// Si el Set ya está cargado, reaccionar a cambios en él (otro componente toggleó)
watch(() => almacenApp.favsCancionesCargados && almacenApp.idsFavCanciones.has(deezerId.value), (esFav) => {
    if (almacenApp.favsCancionesCargados) localFavorito.value = esFav
})

// Solo usar la prop si el Set global no está cargado
watch(() => propiedades.esFavorito, (val) => {
    if (!almacenApp.favsCancionesCargados) localFavorito.value = val
})

// =============================================================================
// PROPIEDADES COMPUTADAS
// =============================================================================

const iconoFavorito = computed(() =>
    localFavorito.value ? 'fas fa-heart' : 'far fa-heart'
)

// =============================================================================
// MANEJADORES DE EVENTOS
// =============================================================================

function alHacerClic() {
    reproducirCancion(propiedades.cancion)
    emitir('click', propiedades.cancion)
}

function alAgregarACola(evento) {
    evento.stopPropagation()
    agregarACola(propiedades.cancion)
}

async function alMarcarFavorito(evento) {
    evento.stopPropagation()

    if (!almacenApp.autenticado) {
        abrirModalAuth('login')
        mostrarNotificacion('Inicia sesión para guardar favoritos')
        return
    }

    if (cargandoFav.value || !deezerId.value) return

    const nuevoEstado = !localFavorito.value
    localFavorito.value = nuevoEstado
    cargandoFav.value = true

    try {
        if (nuevoEstado) {
            await usuarioSvc.agregarCancionFav({
                deezer_id: deezerId.value,
                titulo:    propiedades.cancion.titulo,
                artista:   propiedades.cancion.artista,
                imagen:    propiedades.cancion.imagen   || '',
                duracion:  propiedades.cancion.duracion || '',
                preview:   propiedades.cancion.preview  || '',
            })
            almacenApp.idsFavCanciones.add(deezerId.value)
            mostrarNotificacion(`"${propiedades.cancion.titulo}" añadida a favoritos`)
        } else {
            await usuarioSvc.quitarCancionFav(deezerId.value)
            almacenApp.idsFavCanciones.delete(deezerId.value)
            mostrarNotificacion(`"${propiedades.cancion.titulo}" eliminada de favoritos`)
        }
        emitir('favorito', propiedades.cancion, nuevoEstado)
    } catch (_) {
        localFavorito.value = !nuevoEstado
        mostrarNotificacion('No se pudo actualizar favoritos')
    } finally {
        cargandoFav.value = false
    }
}

function alEliminar(evento) {
    evento.stopPropagation()
    emitir('eliminar', propiedades.cancion)
}

// =============================================================================
// AÑADIR A PLAYLIST
// =============================================================================

const menuPlaylistAbierto      = ref(false)
const cargandoAgregarPlaylist  = ref(false)
const mostrandoFormCrear       = ref(false)
const nombreNuevaPlaylist      = ref('')
const cargandoCrear            = ref(false)

function cerrarMenuPlaylist() {
    menuPlaylistAbierto.value = false
    mostrandoFormCrear.value = false
    nombreNuevaPlaylist.value = ''
    document.removeEventListener('click', cerrarMenuPlaylist)
}

function alAbrirMenuPlaylist(evento) {
    evento.stopPropagation()

    if (!almacenApp.autenticado) {
        abrirModalAuth('login')
        mostrarNotificacion('Inicia sesión para añadir a playlists')
        return
    }

    menuPlaylistAbierto.value = !menuPlaylistAbierto.value

    if (menuPlaylistAbierto.value) {
        mostrandoFormCrear.value = false
        cargarMisPlaylists()
        setTimeout(() => document.addEventListener('click', cerrarMenuPlaylist), 0)
    } else {
        document.removeEventListener('click', cerrarMenuPlaylist)
    }
}

async function alCrearPlaylist(evento) {
    evento.stopPropagation()
    const nombre = nombreNuevaPlaylist.value.trim()
    if (!nombre || cargandoCrear.value) return

    try {
        cargandoCrear.value = true
        const resp = await usuarioSvc.crearPlaylist({ nombre })
        const playlist = resp.playlist
        almacenApp.misPlaylists.push(playlist)

        await usuarioSvc.agregarCancion(playlist.id, {
            deezer_id: deezerId.value,
            titulo:    propiedades.cancion.titulo,
            artista:   propiedades.cancion.artista,
            imagen:    propiedades.cancion.imagen   || '',
            duracion:  propiedades.cancion.duracion || '',
            preview:   propiedades.cancion.preview  || '',
        })

        mostrarNotificacion(`Playlist "${nombre}" creada y canción añadida`)
        cerrarMenuPlaylist()
    } catch (_) {
        mostrarNotificacion('No se pudo crear la playlist')
    } finally {
        cargandoCrear.value = false
    }
}

async function alAgregarAPlaylist(playlist, evento) {
    evento.stopPropagation()
    if (cargandoAgregarPlaylist.value) return

    try {
        cargandoAgregarPlaylist.value = true
        await usuarioSvc.agregarCancion(playlist.id, {
            deezer_id: deezerId.value,
            titulo:    propiedades.cancion.titulo,
            artista:   propiedades.cancion.artista,
            imagen:    propiedades.cancion.imagen   || '',
            duracion:  propiedades.cancion.duracion || '',
            preview:   propiedades.cancion.preview  || '',
        })
        mostrarNotificacion(`"${propiedades.cancion.titulo}" añadida a "${playlist.nombre}"`)
        cerrarMenuPlaylist()
    } catch (_) {
        mostrarNotificacion('No se pudo añadir la canción')
    } finally {
        cargandoAgregarPlaylist.value = false
    }
}

onUnmounted(() => document.removeEventListener('click', cerrarMenuPlaylist))
</script>

<template>
    <!--
      Fila de la canción
      Detecta hover para cambiar el número por el icono de play
    -->
    <div
        class="elemento-cancion"
        @click="alHacerClic"
        @mouseenter="ratonEncima = true"
        @mouseleave="ratonEncima = false"
    >
        <!-- Número de posición o icono de play -->
        <div class="numero-cancion">
            <i v-if="ratonEncima" class="fas fa-play"></i>
            <span v-else>{{ numero }}</span>
        </div>

        <!-- Imagen de portada (si existe) -->
        <img
            v-if="cancion.imagen"
            :src="cancion.imagen"
            :alt="cancion.titulo"
            class="portada-cancion"
        >

        <!-- Información de la canción (título y artista) -->
        <div class="info-cancion">
            <h4>{{ cancion.titulo }}</h4>
            <p>{{ cancion.artista }}</p>
        </div>

        <!-- Nombre del álbum (opcional) -->
        <div v-if="mostrarAlbum" class="album-cancion">
            {{ cancion.album }}
        </div>

        <!-- Duración de la canción -->
        <div class="duracion-cancion">
            {{ cancion.duracion }}
        </div>

        <!-- Botón de favorito -->
        <button
            class="boton-icono boton-fav"
            :class="{ activo: localFavorito }"
            :disabled="cargandoFav"
            @click="alMarcarFavorito"
        >
            <i v-if="cargandoFav" class="fas fa-spinner fa-spin"></i>
            <i v-else :class="iconoFavorito"></i>
        </button>

        <!-- Botón añadir a playlist -->
        <div class="contenedor-menu-playlist" @click.stop>
            <button
                class="boton-icono boton-playlist"
                :class="{ activo: menuPlaylistAbierto }"
                :disabled="cargandoAgregarPlaylist"
                title="Añadir a playlist"
                @click="alAbrirMenuPlaylist"
            >
                <i v-if="cargandoAgregarPlaylist" class="fas fa-spinner fa-spin"></i>
                <i v-else class="fas fa-list-ul"></i>
            </button>

            <div v-if="menuPlaylistAbierto" class="menu-playlist" @click.stop>
                <div class="menu-playlist-cabecera">Añadir a playlist</div>

                <div v-if="!almacenApp.playlistsCargadas" class="menu-playlist-estado">
                    <i class="fas fa-spinner fa-spin"></i>
                    Cargando...
                </div>

                <template v-else>
                    <!-- Lista de playlists -->
                    <button
                        v-for="pl in almacenApp.misPlaylists"
                        :key="pl.id"
                        class="menu-playlist-item"
                        @click="alAgregarAPlaylist(pl, $event)"
                    >
                        <i class="fas fa-music"></i>
                        <span>{{ pl.nombre }}</span>
                    </button>

                    <!-- Estado vacío + crear -->
                    <div v-if="!almacenApp.misPlaylists.length" class="menu-playlist-estado menu-playlist-estado-vacio">
                        No tienes playlists aún
                    </div>

                    <!-- Formulario crear playlist inline -->
                    <div v-if="mostrandoFormCrear" class="crear-playlist-form" @click.stop>
                        <input
                            v-model="nombreNuevaPlaylist"
                            class="crear-playlist-input"
                            placeholder="Nombre de la playlist..."
                            maxlength="60"
                            @keydown.enter="alCrearPlaylist"
                            @click.stop
                        >
                        <div class="crear-playlist-acciones">
                            <button
                                class="boton-crear-confirm"
                                :disabled="!nombreNuevaPlaylist.trim() || cargandoCrear"
                                @click="alCrearPlaylist"
                            >
                                <i v-if="cargandoCrear" class="fas fa-spinner fa-spin"></i>
                                <span v-else>Crear</span>
                            </button>
                            <button class="boton-crear-cancel" @click.stop="mostrandoFormCrear = false">
                                Cancelar
                            </button>
                        </div>
                    </div>

                    <!-- Botón "Nueva playlist" -->
                    <button
                        v-else
                        class="menu-playlist-item menu-playlist-nueva"
                        @click.stop="mostrandoFormCrear = true"
                    >
                        <i class="fas fa-plus"></i>
                        <span>Nueva playlist</span>
                    </button>
                </template>
            </div>
        </div>

        <!-- Botón añadir a cola (solo visible cuando el reproductor está activo) -->
        <button
            v-if="almacenApp.reproductor.titulo"
            class="boton-icono boton-cola-cancion"
            title="Añadir a la cola"
            @click="alAgregarACola"
        >
            <i class="fas fa-plus"></i>
        </button>

        <!-- Botón de eliminar (opcional) -->
        <button
            v-if="mostrarEliminar"
            class="boton-icono boton-eliminar"
            @click="alEliminar"
        >
            <i class="fas fa-trash"></i>
        </button>
    </div>
</template>

<style scoped>
/* ── Posicionamiento explícito en el grid (evita desplazamiento con v-if) ── */
.numero-cancion           { grid-column: 1; }
.portada-cancion          { grid-column: 2; }
.info-cancion             { grid-column: 3; }
.album-cancion            { grid-column: 4; }
.duracion-cancion         { grid-column: 5; }
.boton-fav                { grid-column: 6; }
.contenedor-menu-playlist { grid-column: 7; }
.boton-cola-cancion       { grid-column: 8; }
.boton-eliminar           { grid-column: 9; }

/* ── Botones hover ─────────────────────────────────────────────────── */
.boton-eliminar:hover { color: #ff4444; }

.boton-playlist,
.boton-cola-cancion {
    opacity: 0;
    transition: opacity 0.15s, color 0.15s;
}

.elemento-cancion:hover .boton-playlist,
.elemento-cancion:hover .boton-cola-cancion,
.boton-playlist.activo {
    opacity: 1;
}

/* ── Dropdown playlist ─────────────────────────────────────────────── */
.contenedor-menu-playlist { position: relative; }

.menu-playlist {
    position: absolute;
    right: 0;
    bottom: calc(100% + 6px);
    background: #1e1e2e;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    min-width: 220px;
    max-width: 280px;
    max-height: 320px;
    overflow-y: auto;
    z-index: 500;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
}

.menu-playlist-cabecera {
    padding: 10px 14px 8px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--texto-gris);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    position: sticky;
    top: 0;
    background: #1e1e2e;
}

.menu-playlist-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 14px;
    cursor: pointer;
    font-size: 14px;
    color: var(--texto-blanco);
    background: none;
    border: none;
    text-align: left;
    transition: background 0.15s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.menu-playlist-item:hover { background: rgba(255, 255, 255, 0.08); }
.menu-playlist-item i { color: var(--morado); font-size: 12px; flex-shrink: 0; }

.menu-playlist-nueva {
    border-top: 1px solid rgba(255,255,255,0.08);
    color: var(--morado) !important;
    font-size: 13px !important;
}
.menu-playlist-nueva i { color: var(--morado) !important; }

.menu-playlist-estado {
    padding: 14px;
    font-size: 13px;
    color: var(--texto-gris);
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}
.menu-playlist-estado-vacio { padding-bottom: 4px; }

/* ── Crear playlist inline ─────────────────────────────────────────── */
.crear-playlist-form {
    padding: 10px 12px 12px;
    border-top: 1px solid rgba(255,255,255,0.08);
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.crear-playlist-input {
    width: 100%;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 7px;
    padding: 8px 10px;
    font-size: 13px;
    color: var(--texto-blanco);
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
}
.crear-playlist-input::placeholder { color: var(--texto-gris); }
.crear-playlist-input:focus { border-color: var(--morado); }

.crear-playlist-acciones {
    display: flex;
    gap: 6px;
}

.boton-crear-confirm {
    flex: 1;
    background: var(--morado);
    color: white;
    border: none;
    border-radius: 7px;
    padding: 7px 0;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
}
.boton-crear-confirm:hover:not(:disabled) { background: var(--morado-claro); }
.boton-crear-confirm:disabled { opacity: 0.5; cursor: default; }

.boton-crear-cancel {
    background: rgba(255,255,255,0.08);
    color: var(--texto-gris);
    border: none;
    border-radius: 7px;
    padding: 7px 12px;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s;
}
.boton-crear-cancel:hover { background: rgba(255,255,255,0.14); }
</style>
