<!--
  =============================================================================
  COMPONENTE RAÍZ DE LA APLICACIÓN (App.vue)
  =============================================================================

  Este es el componente principal que estructura toda la aplicación Sonalya.
  Actúa como contenedor de todos los demás componentes y gestiona:

  - La navegación entre páginas (sin Vue Router)
  - El layout principal con sidebar, header, contenido y player
  - La configuración dinámica del header según la página activa
  - Los eventos globales de la aplicación

  Estructura del layout:
  ┌─────────────────────────────────────────────────────────────┐
  │ Sidebar │           Contenido Principal                     │
  │         │  ┌─────────────────────────────────────────────┐  │
  │         │  │              Header                          │  │
  │         │  ├─────────────────────────────────────────────┤  │
  │         │  │                                             │  │
  │         │  │         Página Actual (dinámico)            │  │
  │         │  │                                             │  │
  │         │  └─────────────────────────────────────────────┘  │
  ├─────────┴─────────────────────────────────────────────────┤
  │                       Player                              │
  └─────────────────────────────────────────────────────────────┘

  @author Lucia Ruiz Salvador
  @version 1.0.0
-->

<script setup>
// =============================================================================
// IMPORTACIONES
// =============================================================================

// Funciones de Vue para reactividad y ciclo de vida
import { ref, onMounted, computed, watch, nextTick } from 'vue'

// Componentes de layout (estructura principal)
import BarraLateral from '@/components/plantilla/Sidebar.vue'
import Cabecera from '@/components/plantilla/Header.vue'
import ReproductorMusica from '@/components/plantilla/Player.vue'
import Notificacion from '@/components/comunes/Notificacion.vue'
import ModalAuth from '@/components/comunes/ModalAuth.vue'

// Componentes de páginas
import PaginaInicio   from '@/components/paginas/PaginaInicio.vue'
import PaginaBuscar   from '@/components/paginas/PaginaBuscar.vue'
import PaginaPerfil   from '@/components/paginas/PaginaPerfil.vue'
import PaginaEventos  from '@/components/paginas/PaginaEventos.vue'
import PaginaArtista  from '@/components/paginas/PaginaArtista.vue'
import PaginaAlbum      from '@/components/paginas/PaginaAlbum.vue'
import PaginaHistorial          from '@/components/paginas/PaginaHistorial.vue'
import PaginaPlaylist           from '@/components/paginas/PaginaPlaylist.vue'
import PaginaArtistaPlataforma  from '@/components/paginas/PaginaArtistaPlataforma.vue'
import PaginaAlbumPlataforma    from '@/components/paginas/PaginaAlbumPlataforma.vue'
import PaginaAdmin              from '@/components/paginas/PaginaAdmin.vue'
import FooterApp                from '@/components/plantilla/Footer.vue'

// Funciones del almacén global
import { almacenApp, inicializarTema, mostrarNotificacion, sincronizarUsuario, cerrarSesion, cargarFavsCanciones, cargarMisPlaylists, cacheLimpiar } from '@/stores/appStore'
import { api } from '@/servicios/api'

// =============================================================================
// ESTADO DE NAVEGACIÓN
// =============================================================================

/**
 * Página actualmente visible en la aplicación
 * Valores posibles: 'inicio', 'buscar', 'perfil', 'eventos'
 */
const paginaActual      = ref('inicio')
const paginaAnterior    = ref('inicio')
const menuMovilAbierto  = ref(false)
const artistaActual   = ref(null)
const albumActual     = ref(null)      // { id } para álbumes | null
const cancionActual   = ref(null)      // objeto canción suelta | null
const playlistActual  = ref(null)      // playlist de usuario | null
const artistaPlataformaActual = ref(null)  // artista de la plataforma | null
const albumPlataformaActual   = ref(null)  // { id, artistaId, nombre } | null
const textoBusqueda         = ref('')
const generoActual          = ref(null)      // género preseleccionado para PaginaBuscar
const resetearBusquedaContador = ref(0)


// =============================================================================
// CONFIGURACIÓN DINÁMICA DEL HEADER
// =============================================================================

/**
 * Configuración del header que cambia según la página activa
 * Cada página puede tener diferentes opciones de búsqueda y navegación
 *
 * @returns {Object} Configuración del header para la página actual
 */
const configuracionCabecera = computed(() => {
    // Definir configuraciones específicas para cada página
    const configuraciones = {
        // Página de inicio: búsqueda estándar
        inicio: {
            placeholder: 'Buscar canciones, artistas, álbumes...',
            grande: false,
            mostrarBusqueda: true,
            mostrarVolver: false
        },
        // Página de búsqueda: barra de búsqueda destacada
        buscar: {
            placeholder: '¿Qué quieres escuchar?',
            grande: true,           // Barra de búsqueda más grande
            mostrarBusqueda: true,
            mostrarVolver: false
        },
        // Página de perfil: búsqueda estándar
        perfil: {
            placeholder: 'Buscar canciones, artistas, álbumes...',
            grande: false,
            mostrarBusqueda: true,
            mostrarVolver: false
        },
        // Página de eventos: búsqueda específica de eventos
        eventos: {
            placeholder: 'Buscar eventos...',
            grande: false,
            mostrarBusqueda: true,
            mostrarVolver: false
        },
        // Página de artista: con botón de volver
        artista: {
            placeholder: 'Buscar canciones, artistas, álbumes...',
            grande: false,
            mostrarBusqueda: true,
            mostrarVolver: true,
            textoVolver: artistaActual.value ? `← ${artistaActual.value.nombre}` : 'Volver'
        },
        // Artista de la plataforma
        artista_plataforma: {
            placeholder: 'Buscar canciones, artistas, álbumes...',
            grande: false,
            mostrarBusqueda: true,
            mostrarVolver: true,
            textoVolver: artistaPlataformaActual.value ? `← ${artistaPlataformaActual.value.nombre}` : 'Volver'
        },
        // Álbum de la plataforma
        album_plataforma: {
            placeholder: 'Buscar canciones, artistas, álbumes...',
            grande: false,
            mostrarBusqueda: true,
            mostrarVolver: true,
            textoVolver: albumPlataformaActual.value ? `← ${albumPlataformaActual.value.nombre}` : 'Volver'
        },
        // Historial de reproducción
        historial: {
            placeholder: 'Buscar canciones, artistas, álbumes...',
            grande: false,
            mostrarBusqueda: true,
            mostrarVolver: false
        },
        // Detalle de playlist de usuario
        playlist: {
            placeholder: 'Buscar canciones, artistas, álbumes...',
            grande: false,
            mostrarBusqueda: true,
            mostrarVolver: true,
            textoVolver: playlistActual.value ? `← ${playlistActual.value.nombre}` : 'Volver'
        },
        // Página de álbum/canción: con botón de volver
        album: {
            placeholder: 'Buscar canciones, artistas, álbumes...',
            grande: false,
            mostrarBusqueda: true,
            mostrarVolver: true,
            textoVolver: albumActual.value
                ? `← ${albumActual.value.nombre}`
                : cancionActual.value
                    ? `← ${cancionActual.value.nombre}`
                    : 'Volver'
        },
        // Panel de administración
        admin: {
            placeholder: '',
            grande: false,
            mostrarBusqueda: false,
            mostrarVolver: false
        }
    }

    // Devolver la configuración de la página actual o la de inicio por defecto
    return configuraciones[paginaActual.value] || configuraciones.inicio
})

// =============================================================================
// FUNCIONES DE NAVEGACIÓN
// =============================================================================

// =============================================================================
// PERSISTENCIA DE NAVEGACIÓN
// =============================================================================

function guardarEstadoNav() {
    localStorage.setItem('nav_pagina',             paginaActual.value)
    localStorage.setItem('nav_artista',            JSON.stringify(artistaActual.value))
    localStorage.setItem('nav_album',              JSON.stringify(albumActual.value))
    localStorage.setItem('nav_cancion',            JSON.stringify(cancionActual.value))
    localStorage.setItem('nav_playlist',           JSON.stringify(playlistActual.value))
    localStorage.setItem('nav_artista_plataforma', JSON.stringify(artistaPlataformaActual.value))
}

/**
 * Cambia la página actual de la aplicación
 * También hace scroll al inicio del contenido
 *
 * @param {string} pagina - Identificador de la página destino
 */
function irAlTop() {
    const el = document.querySelector('.contenido-principal')
    if (el) el.scrollTop = 0
}

function navegarAPagina(pagina) {
    irAlTop()                                    // antes de que Vue renderice
    paginaAnterior.value = paginaActual.value
    paginaActual.value = pagina
    menuMovilAbierto.value = false
    guardarEstadoNav()
    nextTick(irAlTop)                            // después del render de Vue
}

watch(paginaActual, irAlTop, { flush: 'post' }) // por si cambia paginaActual sin pasar por navegarAPagina

function alVolver() {
    navegarAPagina(paginaAnterior.value || 'inicio')
}

/**
 * Maneja el texto escrito en la barra de búsqueda del Header.
 * Si hay texto y el usuario no está en la página de búsqueda, navega a ella.
 */
function alBuscar(texto) {
    textoBusqueda.value = texto
    if (texto.trim().length >= 2 && paginaActual.value !== 'buscar') {
        navegarAPagina('buscar')
    }
}

// =============================================================================
// MANEJADORES DE EVENTOS DE PÁGINAS
// =============================================================================

/**
 * Maneja el evento de abrir una playlist
 * Se emite desde PaginaInicio y PaginaPerfil
 *
 * @param {Object} playlist - Objeto con los datos de la playlist
 */
function alAbrirPlaylist(item) {
    if (item.tipo === 'artista') {
        artistaActual.value = item
        navegarAPagina('artista')
    } else if (item.tipo === 'album') {
        albumActual.value   = item
        cancionActual.value = null
        navegarAPagina('album')
    } else if (item.tipo === 'cancion') {
        cancionActual.value = item
        albumActual.value   = null
        navegarAPagina('album')
    } else if (item.tipo === 'playlist') {
        playlistActual.value = item
        navegarAPagina('playlist')
    } else if (item.tipo === 'artista_plataforma') {
        artistaPlataformaActual.value = item
        navegarAPagina('artista_plataforma')
    } else if (item.tipo === 'album_plataforma') {
        const albumId = item.album_id ?? (typeof item.id === 'number' ? item.id : null)
        albumPlataformaActual.value = { id: albumId, artistaId: item.artista_id, nombre: item.nombre }
        navegarAPagina('album_plataforma')
    } else if (item.tipo === 'genero') {
        textoBusqueda.value = ''
        generoActual.value = item
        navegarAPagina('buscar')
        nextTick(() => { generoActual.value = null })
    } else {
        mostrarNotificacion(`Abriendo: ${item.nombre}`)
    }
}

function alIrAlArtistaDesdeReproductor(artistaId) {
    if (!artistaId) return
    const idStr = String(artistaId)
    if (idStr.startsWith('plataforma_')) {
        const id = parseInt(idStr.replace('plataforma_', ''), 10)
        if (id) {
            artistaPlataformaActual.value = { id, nombre: almacenApp.reproductor.artista }
            navegarAPagina('artista_plataforma')
        }
    } else {
        artistaActual.value = { id: Number(artistaId), nombre: almacenApp.reproductor.artista }
        navegarAPagina('artista')
    }
}

/**
 * Maneja el evento de ir a la página de pago de un evento
 * Se emite desde PaginaEventos
 *
 * @param {Object} evento - Objeto con los datos del evento
 */
function alIrAPago(evento) {
    mostrarNotificacion(`Comprando entrada para: ${evento.nombre}`)
    // TODO: Navegar a la página de pago cuando se integre con Laravel
}

/**
 * Maneja el evento de ver una entrada comprada
 * Se emite desde PaginaEventos para eventos guardados
 *
 * @param {Object} evento - Objeto con los datos del evento
 */
function alVerEntrada(evento) {
    mostrarNotificacion(`Viendo entrada de: ${evento.nombre}`)
    // TODO: Mostrar modal o página con el código QR de la entrada
}

// =============================================================================
// CICLO DE VIDA DEL COMPONENTE
// =============================================================================

/**
 * Hook que se ejecuta cuando el componente se monta en el DOM
 * Inicializa configuraciones que requieren acceso al DOM
 */
onMounted(async () => {
    inicializarTema()

    // Restaurar navegación guardada al recargar
    try {
        const navPagina            = localStorage.getItem('nav_pagina')
        const navArtista           = JSON.parse(localStorage.getItem('nav_artista')            || 'null')
        const navAlbum             = JSON.parse(localStorage.getItem('nav_album')              || 'null')
        const navCancion           = JSON.parse(localStorage.getItem('nav_cancion')            || 'null')
        const navPlaylist          = JSON.parse(localStorage.getItem('nav_playlist')           || 'null')
        const navArtistaPlataforma = JSON.parse(localStorage.getItem('nav_artista_plataforma') || 'null')

        if (navPagina && navPagina !== 'inicio') {
            artistaActual.value          = navArtista
            albumActual.value            = navAlbum
            cancionActual.value          = navCancion
            playlistActual.value         = navPlaylist
            artistaPlataformaActual.value = navArtistaPlataforma

            if (navPagina === 'artista' && navArtista?.id) {
                paginaActual.value = 'artista'
            } else if (navPagina === 'album' && (navAlbum?.id || navCancion)) {
                paginaActual.value = 'album'
            } else if (navPagina === 'playlist' && navPlaylist?.id) {
                paginaActual.value = 'playlist'
            } else if (navPagina === 'artista_plataforma' && navArtistaPlataforma?.id) {
                paginaActual.value = 'artista_plataforma'
            } else if (!['artista', 'album', 'playlist', 'artista_plataforma'].includes(navPagina)) {
                paginaActual.value = navPagina
            }
        }
    } catch (_) {
        // Si falla la restauración, quedarse en 'inicio'
    }

    // Si hay sesión activa, sincronizar el perfil con la base de datos
    if (almacenApp.autenticado) {
        try {
            const respuesta = await api.get('/usuario/perfil')
            sincronizarUsuario(respuesta.data)
            cargarFavsCanciones()
            cargarMisPlaylists()
        } catch (_) {
            // Token expirado o inválido: cerrar sesión
            cerrarSesion()
        }
    }
})

// Al iniciar/cerrar sesión: navegar al inicio y limpiar todo el estado de navegación
watch(() => almacenApp.autenticado, async (loggedIn) => {
    if (loggedIn) {
        // Limpiar caché del usuario anterior antes de cargar datos del nuevo
        cacheLimpiar()
        // Re-sync tipo desde la BD para asegurar coherencia (el login response podría
        // tener datos obsoletos si la BD cambió desde la última sesión).
        try {
            const respuesta = await api.get('/usuario/perfil')
            sincronizarUsuario(respuesta.data)
        } catch (_) {}
        cargarFavsCanciones()
        cargarMisPlaylists()
    }
    textoBusqueda.value = ''
    resetearBusquedaContador.value++
    artistaActual.value = null
    albumActual.value = null
    cancionActual.value = null
    playlistActual.value = null
    artistaPlataformaActual.value = null
    paginaAnterior.value = 'inicio'
    paginaActual.value = 'inicio'
    guardarEstadoNav()
})
</script>

<template>
    <!--
      Contenedor principal de la aplicación
      Usa CSS Grid para el layout de la página
    -->
    <div class="app">

        <!-- =================================================================
             BARRA LATERAL (Sidebar)
             Navegación principal de la aplicación
        ================================================================= -->
        <BarraLateral
            :pagina-actual="paginaActual"
            :abierto="menuMovilAbierto"
            @cambiar-pagina="navegarAPagina"
            @cerrar-menu="menuMovilAbierto = false"
        />

        <!-- =================================================================
             CONTENIDO PRINCIPAL
             Área donde se muestran las páginas dinámicamente
        ================================================================= -->
        <main class="contenido-principal" :class="{ 'con-reproductor': !!almacenApp.reproductor.titulo }">

            <!-- Cabecera con barra de búsqueda y acciones de usuario -->
            <Cabecera
                v-bind="configuracionCabecera"
                :resetear-contador="resetearBusquedaContador"
                :valor-busqueda="textoBusqueda"
                @cambiar-pagina="navegarAPagina"
                @buscar="alBuscar"
                @volver="alVolver"
                @toggle-menu="menuMovilAbierto = !menuMovilAbierto"
            />

            <!-- Páginas: v-if/v-else-if explícito para navegación fiable -->
            <PaginaInicio
                v-if="paginaActual === 'inicio'"
                @abrir-playlist="alAbrirPlaylist"
            />
            <PaginaBuscar
                v-else-if="paginaActual === 'buscar'"
                :texto-busqueda="textoBusqueda"
                :genero-inicial="generoActual"
                @abrir-playlist="alAbrirPlaylist"
                @buscar="alBuscar"
            />
            <PaginaPerfil
                v-else-if="paginaActual === 'perfil'"
                @abrir-playlist="alAbrirPlaylist"
            />
            <PaginaEventos
                v-else-if="paginaActual === 'eventos'"
                @ir-a-pago="alIrAPago"
                @ver-entrada="alVerEntrada"
                @cambiar-pagina="navegarAPagina"
            />
            <PaginaArtista
                v-else-if="paginaActual === 'artista' && artistaActual"
                :artista-id="artistaActual.id"
                @abrir-playlist="alAbrirPlaylist"
            />
            <PaginaAlbum
                v-else-if="paginaActual === 'album'"
                :album-id="albumActual ? albumActual.id : null"
                :cancion-directa="cancionActual"
            />
            <PaginaArtistaPlataforma
                v-else-if="paginaActual === 'artista_plataforma' && artistaPlataformaActual"
                :artista-id="artistaPlataformaActual.id"
                @abrir-playlist="alAbrirPlaylist"
            />
            <PaginaAlbumPlataforma
                v-else-if="paginaActual === 'album_plataforma' && albumPlataformaActual"
                :album-id="albumPlataformaActual.id"
                :artista-id="albumPlataformaActual.artistaId"
                @abrir-playlist="alAbrirPlaylist"
            />
            <PaginaHistorial
                v-else-if="paginaActual === 'historial'"
            />
            <PaginaPlaylist
                v-else-if="paginaActual === 'playlist' && playlistActual"
                :playlist-id="playlistActual.id"
                :playlist-nombre="playlistActual.nombre"
                :playlist-imagen="playlistActual.imagen || null"
            />
            <PaginaAdmin
                v-else-if="paginaActual === 'admin'"
            />

            <FooterApp @cambiar-pagina="navegarAPagina" />
        </main>

        <!-- =================================================================
             REPRODUCTOR DE MÚSICA
             Barra inferior fija con controles de reproducción
        ================================================================= -->
        <ReproductorMusica @navegar-artista="alIrAlArtistaDesdeReproductor" />

        <!-- =================================================================
             SISTEMA DE NOTIFICACIONES
             Muestra mensajes toast temporales
        ================================================================= -->
        <Notificacion />

        <!-- Modal de autenticación (login / registro) -->
        <ModalAuth />
    </div>
</template>

<style>
/**
 * Importar estilos CSS globales
 * Incluye variables, reset, tipografía y estilos de componentes
 */
@import '@/assets/css/main.css';
</style>
