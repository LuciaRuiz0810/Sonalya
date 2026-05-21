<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import TarjetaCancion from '@/components/comunes/TarjetaCancion.vue'
import TarjetaPlaylist from '@/components/comunes/TarjetaPlaylist.vue'
import { musica } from '@/servicios/musica'
import { usuario as usuarioSvc } from '@/servicios/usuario'
import { cacheGuardar, cacheObtener, almacenApp } from '@/stores/appStore'

const emitir = defineEmits(['abrirPlaylist', 'buscar'])

const propiedades = defineProps({
    textoBusqueda: {
        type: String,
        default: ''
    },
    generoInicial: {
        type: Object,
        default: null
    }
})

// ── Estado ─────────────────────────────────────────────────────────────────────
const cargandoGeneros        = ref(true)
const cargandoResultados     = ref(false)
const cargandoPopulares      = ref(true)
const cargandoGenero         = ref(false)
const cargandoPlataforma     = ref(true)
const generos                = ref([])
const resultados             = ref([])
const resultadosArtistas     = ref([])
const resultadosPlataformaCanciones = ref([])
const resultadosPlataformaAlbumes   = ref([])
const resultadosPlataformaArtistas  = ref([])
const artistasPopulares      = ref([])
const albumesPopulares       = ref([])
const artistasPlataforma     = ref([])
const filtroActivo       = ref('todo')
const generoSeleccionado = ref(null)
const contenidoGenero    = ref({ populares: [], emergentes: [], canciones: [], albumes: [] })

const busquedasRecientes = ref([])

function claveUsuario() {
    const id = almacenApp.usuario?.id
    return id != null ? `sonalya_busquedas_${id}` : null
}

function cargarBusquedasRecientes() {
    const clave = claveUsuario()
    if (!clave) { busquedasRecientes.value = []; return }
    try {
        busquedasRecientes.value = JSON.parse(localStorage.getItem(clave) || '[]')
    } catch (_) {
        busquedasRecientes.value = []
    }
}

function guardarBusqueda(texto) {
    const clave = claveUsuario()
    if (!clave) return
    const lista = [texto, ...busquedasRecientes.value.filter(b => b !== texto)].slice(0, 3)
    busquedasRecientes.value = lista
    localStorage.setItem(clave, JSON.stringify(lista))
}

function alHacerClicReciente(texto) {
    emitir('buscar', texto)
}

const filtros = [
    { id: 'todo',      label: 'Todo',      icono: 'fa-th-large' },
    { id: 'canciones', label: 'Canciones', icono: 'fa-music' },
    { id: 'artistas',  label: 'Artistas',  icono: 'fa-user' },
    { id: 'albumes',   label: 'Álbumes',   icono: 'fa-compact-disc' },
]

let timerBusqueda = null

// ── Computed ───────────────────────────────────────────────────────────────────
const hayBusqueda = computed(() => propiedades.textoBusqueda.trim().length >= 2)

const cancionesVisibles = computed(() =>
    filtroActivo.value === 'artistas' || filtroActivo.value === 'albumes' ? [] : resultados.value
)

const artistasVisibles = computed(() => {
    if (filtroActivo.value === 'canciones' || filtroActivo.value === 'albumes') return []
    return resultadosArtistas.value
})

const plataformaCancionesVisibles = computed(() =>
    filtroActivo.value === 'artistas' || filtroActivo.value === 'albumes' ? [] : resultadosPlataformaCanciones.value
)

const plataformaArtistasVisibles = computed(() => {
    if (filtroActivo.value === 'canciones' || filtroActivo.value === 'albumes') return []
    return resultadosPlataformaArtistas.value
})

const plataformaAlbumesVisibles = computed(() => {
    if (filtroActivo.value === 'canciones' || filtroActivo.value === 'artistas') return []
    return resultadosPlataformaAlbumes.value
})

const hayResultados = computed(() =>
    cancionesVisibles.value.length > 0 ||
    artistasVisibles.value.length > 0 ||
    plataformaCancionesVisibles.value.length > 0 ||
    plataformaArtistasVisibles.value.length > 0 ||
    plataformaAlbumesVisibles.value.length > 0
)

const TTL_BUSCAR = 15 * 60_000  // 15 min
const TTL_GENERO = 60 * 60_000  // 1 hora

// ── Géneros ───────────────────────────────────────────────────────────────────
async function cargarGeneros() {
    const cached = cacheObtener('buscar_generos')
    if (cached) { generos.value = cached; cargandoGeneros.value = false; return }
    try {
        cargandoGeneros.value = true
        const resp = await musica.obtenerGeneros()
        generos.value = resp.generos
        cacheGuardar('buscar_generos', generos.value, TTL_GENERO)
    } catch (_) {
        generos.value = []
    } finally {
        cargandoGeneros.value = false
    }
}

// ── Artistas populares (desde charts) ────────────────────────────────────────
async function cargarArtistasPopulares() {
    const cached = cacheObtener('buscar_artistas_populares')
    if (cached) {
        artistasPopulares.value = cached.artistas || []
        albumesPopulares.value  = cached.albumes  || []
        cargandoPopulares.value = false
        return
    }
    try {
        cargandoPopulares.value = true
        const resp = await musica.obtenerCharts()
        artistasPopulares.value = resp.artistas || []
        albumesPopulares.value  = resp.albumes  || []
        cacheGuardar('buscar_artistas_populares', { artistas: artistasPopulares.value, albumes: albumesPopulares.value }, TTL_BUSCAR)
    } catch (_) {
        artistasPopulares.value = []
        albumesPopulares.value  = []
    } finally {
        cargandoPopulares.value = false
    }
}

// ── Artistas de la plataforma (para vista por defecto) ────────────────────────
async function cargarArtistasPlataforma() {
    const cached = cacheObtener('buscar_artistas_plataforma')
    if (cached) { artistasPlataforma.value = cached; cargandoPlataforma.value = false; return }
    try {
        cargandoPlataforma.value = true
        const resp = await usuarioSvc.artistas()
        artistasPlataforma.value = resp.artistas || []
        cacheGuardar('buscar_artistas_plataforma', artistasPlataforma.value, TTL_BUSCAR)
    } catch (_) {
        artistasPlataforma.value = []
    } finally {
        cargandoPlataforma.value = false
    }
}

// ── Búsqueda ──────────────────────────────────────────────────────────────────
async function realizarBusqueda(texto) {
    if (!texto || texto.trim().length < 2) {
        resultados.value                    = []
        resultadosArtistas.value            = []
        resultadosPlataformaCanciones.value = []
        resultadosPlataformaAlbumes.value   = []
        resultadosPlataformaArtistas.value  = []
        return
    }
    try {
        cargandoResultados.value = true
        const [respDeezer, respPlataforma] = await Promise.all([
            musica.buscar(texto.trim()),
            musica.buscarPlataforma(texto.trim()),
        ])
        resultados.value                    = respDeezer.canciones       || []
        resultadosArtistas.value            = respDeezer.artistas        || []
        resultadosPlataformaCanciones.value = respPlataforma.canciones   || []
        resultadosPlataformaAlbumes.value   = respPlataforma.albumes     || []
        resultadosPlataformaArtistas.value  = respPlataforma.artistas    || []
        guardarBusqueda(texto.trim())
    } catch (_) {
        resultados.value                    = []
        resultadosArtistas.value            = []
        resultadosPlataformaCanciones.value = []
        resultadosPlataformaAlbumes.value   = []
        resultadosPlataformaArtistas.value  = []
    } finally {
        cargandoResultados.value = false
    }
}

watch(() => propiedades.textoBusqueda, (nuevo) => {
    if (nuevo.trim().length >= 2) generoSeleccionado.value = null
    clearTimeout(timerBusqueda)
    timerBusqueda = setTimeout(() => realizarBusqueda(nuevo), 400)
}, { immediate: true })

watch(() => propiedades.generoInicial, (genero) => {
    if (genero) seleccionarCategoria(genero)
}, { immediate: true })

// ── Vista de género ───────────────────────────────────────────────────────────
async function seleccionarCategoria(categoria) {
    generoSeleccionado.value = categoria
    const cacheKey = `buscar_genero_v3_${categoria.id}`
    const cached = cacheObtener(cacheKey)
    if (cached) { contenidoGenero.value = cached; return }
    contenidoGenero.value = { populares: [], emergentes: [], canciones: [], albumes: [] }
    try {
        cargandoGenero.value = true
        const resp = await musica.obtenerGenero(categoria.id, categoria.nombre)
        contenidoGenero.value = {
            populares:  resp.populares  || [],
            emergentes: resp.emergentes || [],
            canciones:  resp.canciones  || [],
            albumes:    resp.albumes    || [],
        }
        cacheGuardar(cacheKey, contenidoGenero.value, TTL_GENERO)
    } catch (_) {
        contenidoGenero.value = { populares: [], emergentes: [], canciones: [], albumes: [] }
    } finally {
        cargandoGenero.value = false
    }
}

function volverAGeneros() {
    generoSeleccionado.value = null
}

function formatearOyentes(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K'
    return String(n)
}

function alHacerClicArtista(artista) {
    emitir('abrirPlaylist', artista)
}

onMounted(() => {
    cargarBusquedasRecientes()
    cargarGeneros()
    cargarArtistasPopulares()
    cargarArtistasPlataforma()
})
</script>

<template>
    <div class="contenedor-contenido">

        <!-- ============================================================
             Filtros (solo visibles cuando hay búsqueda activa)
        ============================================================ -->
        <div v-if="hayBusqueda" class="filtros-busqueda">
            <button
                v-for="filtro in filtros"
                :key="filtro.id"
                class="chip-filtro"
                :class="{ activo: filtroActivo === filtro.id }"
                @click="filtroActivo = filtro.id"
            >
                <i :class="['fas', filtro.icono]"></i>
                {{ filtro.label }}
            </button>
        </div>

        <!-- ============================================================
             Resultados de búsqueda
        ============================================================ -->
        <template v-if="hayBusqueda">

            <div v-if="cargandoResultados" class="estado-info">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Buscando...</span>
            </div>

            <template v-else>

                <div v-if="!hayResultados" class="estado-info">
                    <i class="fas fa-search"></i>
                    <span>No se encontraron resultados para "{{ propiedades.textoBusqueda }}".</span>
                </div>

                <!-- Artistas en Sonalya -->
                <section v-if="plataformaArtistasVisibles.length > 0" class="seccion">
                    <div class="titulo-seccion-con-badge">
                        <h2 class="titulo-seccion">Artistas en Sonalya</h2>
                        <span class="badge-seccion-sonalya"><i class="fas fa-star"></i> Plataforma</span>
                    </div>
                    <div class="cuadricula-tarjetas">
                        <TarjetaPlaylist
                            v-for="artista in plataformaArtistasVisibles"
                            :key="`plat-artista-${artista.id}`"
                            :playlist="artista"
                            :mostrar-badge="false"
                            @click="alHacerClicArtista(artista)"
                        />
                    </div>
                </section>

                <!-- Artistas de Deezer -->
                <section v-if="artistasVisibles.length > 0" class="seccion">
                    <h2 class="titulo-seccion">Artistas</h2>
                    <div class="cuadricula-tarjetas">
                        <TarjetaPlaylist
                            v-for="artista in artistasVisibles"
                            :key="`${artista.tipo || 'artista'}-${artista.id}`"
                            :playlist="artista"
                            :mostrar-badge="false"
                            @click="alHacerClicArtista(artista)"
                        />
                    </div>
                </section>

                <!-- Canciones en Sonalya -->
                <section v-if="plataformaCancionesVisibles.length > 0" class="seccion">
                    <div class="titulo-seccion-con-badge">
                        <h2 class="titulo-seccion">Canciones en Sonalya</h2>
                        <span class="badge-seccion-sonalya"><i class="fas fa-star"></i> Plataforma</span>
                    </div>
                    <div class="lista-resultados">
                        <TarjetaCancion
                            v-for="(cancion, indice) in plataformaCancionesVisibles"
                            :key="cancion.id"
                            :cancion="cancion"
                            :numero="indice + 1"
                            :mostrar-album="true"
                        />
                    </div>
                </section>

                <!-- Canciones de Deezer -->
                <section v-if="cancionesVisibles.length > 0" class="seccion">
                    <h2 class="titulo-seccion">Canciones</h2>
                    <div class="lista-resultados">
                        <TarjetaCancion
                            v-for="(cancion, indice) in cancionesVisibles"
                            :key="cancion.id"
                            :cancion="cancion"
                            :numero="indice + 1"
                            :mostrar-album="true"
                        />
                    </div>
                </section>

                <!-- Álbumes en Sonalya -->
                <section v-if="plataformaAlbumesVisibles.length > 0" class="seccion">
                    <div class="titulo-seccion-con-badge">
                        <h2 class="titulo-seccion">Álbumes en Sonalya</h2>
                        <span class="badge-seccion-sonalya"><i class="fas fa-star"></i> Plataforma</span>
                    </div>
                    <div class="cuadricula-tarjetas">
                        <TarjetaPlaylist
                            v-for="album in plataformaAlbumesVisibles"
                            :key="album.id"
                            :playlist="album"
                            :mostrar-badge="false"
                            @click="emitir('abrirPlaylist', album)"
                        />
                    </div>
                </section>

            </template>
        </template>

        <!-- ============================================================
             Vista de género seleccionado
        ============================================================ -->
        <template v-else-if="generoSeleccionado">

            <div class="genero-header" :style="{ background: generoSeleccionado.color }">
                <button class="boton-volver-genero" @click="volverAGeneros">
                    <i class="fas fa-arrow-left"></i>
                    Géneros
                </button>
                <div class="genero-header-info">
                    <i :class="['fas', generoSeleccionado.icono]" class="genero-icono-grande"></i>
                    <h1 class="genero-titulo">{{ generoSeleccionado.nombre }}</h1>
                </div>
            </div>

            <div v-if="cargandoGenero" class="estado-info">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Cargando contenido...</span>
            </div>

            <template v-else>

                <!-- Sin contenido -->
                <div
                    v-if="!contenidoGenero.populares.length && !contenidoGenero.canciones.length && !contenidoGenero.albumes.length"
                    class="estado-vacio-genero"
                >
                    <i class="fas fa-satellite-dish"></i>
                    <p>No se encontró contenido para este género.</p>
                    <button class="boton-reintentar-genero" @click="seleccionarCategoria(generoSeleccionado)">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                </div>

                <!-- Artistas más populares -->
                <section v-if="contenidoGenero.populares.length > 0" class="seccion">
                    <div class="titulo-seccion-con-badge">
                        <h2 class="titulo-seccion">Artistas más populares</h2>
                        <span class="badge-populares-genero"><i class="fas fa-fire"></i> Top {{ generoSeleccionado.nombre }}</span>
                    </div>
                    <div class="cuadricula-tarjetas">
                        <TarjetaPlaylist
                            v-for="artista in contenidoGenero.populares"
                            :key="`pop-${artista.tipo || 'artista'}-${artista.id}`"
                            :playlist="artista"
                            :mostrar-badge="false"
                            @click="alHacerClicArtista(artista)"
                        />
                    </div>
                </section>

                <!-- Nuevos talentos del género -->
                <section v-if="contenidoGenero.emergentes.length > 0" class="seccion">
                    <div class="titulo-seccion-con-badge">
                        <h2 class="titulo-seccion">Nuevos talentos</h2>
                        <span class="badge-emergente-genero"><i class="fas fa-seedling"></i> Menos oyentes</span>
                    </div>
                    <p class="descripcion-seccion">Artistas de {{ generoSeleccionado.nombre }} con una audiencia más pequeña pero en crecimiento</p>
                    <div class="cuadricula-tarjetas">
                        <TarjetaPlaylist
                            v-for="artista in contenidoGenero.emergentes"
                            :key="`em-${artista.tipo || 'artista'}-${artista.id}`"
                            :playlist="artista"
                            :mostrar-badge="artista.tipo === 'artista_plataforma'"
                            @click="alHacerClicArtista(artista)"
                        />
                    </div>
                </section>

                <!-- Canciones más escuchadas -->
                <section v-if="contenidoGenero.canciones.length > 0" class="seccion">
                    <h2 class="titulo-seccion">Canciones más escuchadas</h2>
                    <div class="lista-resultados">
                        <TarjetaCancion
                            v-for="(cancion, indice) in contenidoGenero.canciones"
                            :key="cancion.id"
                            :cancion="cancion"
                            :numero="indice + 1"
                            :mostrar-album="true"
                        />
                    </div>
                </section>

                <!-- Álbumes más populares -->
                <section v-if="contenidoGenero.albumes.length > 0" class="seccion">
                    <h2 class="titulo-seccion">Álbumes destacados</h2>
                    <div class="cuadricula-tarjetas">
                        <TarjetaPlaylist
                            v-for="album in contenidoGenero.albumes"
                            :key="`album-${album.id}`"
                            :playlist="album"
                            :mostrar-badge="false"
                            @click="alHacerClicArtista(album)"
                        />
                    </div>
                </section>

            </template>
        </template>

        <!-- ============================================================
             Vista por defecto: Artistas populares + géneros
        ============================================================ -->
        <template v-else>

            <!-- Búsquedas recientes -->
            <section v-if="busquedasRecientes.length > 0" class="seccion">
                <h2 class="titulo-seccion">Búsquedas recientes</h2>
                <div class="busquedas-recientes">
                    <button
                        v-for="texto in busquedasRecientes"
                        :key="texto"
                        class="chip-busqueda-reciente"
                        @click="alHacerClicReciente(texto)"
                    >
                        <i class="fas fa-history"></i>
                        {{ texto }}
                    </button>
                </div>
            </section>

            <!-- Artistas de la plataforma Sonalya -->
            <section v-if="cargandoPlataforma || artistasPlataforma.length > 0" class="seccion">
                <div class="titulo-seccion-con-badge">
                    <h2 class="titulo-seccion">Artistas en Sonalya</h2>
                    <span class="badge-seccion-sonalya"><i class="fas fa-star"></i> Plataforma</span>
                </div>
                <div v-if="cargandoPlataforma" class="estado-info">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Cargando...</span>
                </div>
                <div v-else-if="artistasPlataforma.length === 0" class="estado-info">
                    <i class="fas fa-microphone-alt"></i>
                    <span>Aún no hay artistas registrados en la plataforma.</span>
                </div>
                <div v-else class="cuadricula-tarjetas">
                    <TarjetaPlaylist
                        v-for="artista in artistasPlataforma"
                        :key="'plataforma-' + artista.id"
                        :playlist="artista"
                        @click="alHacerClicArtista(artista)"
                    />
                </div>
            </section>

            <section class="seccion">
                <h2 class="titulo-seccion">Artistas populares</h2>
                <div v-if="cargandoPopulares" class="estado-info">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Cargando...</span>
                </div>
                <div v-else class="cuadricula-tarjetas">
                    <TarjetaPlaylist
                        v-for="artista in artistasPopulares"
                        :key="`${artista.tipo || 'artista'}-${artista.id}`"
                        :playlist="artista"
                        @click="alHacerClicArtista(artista)"
                    />
                </div>
            </section>

            <section v-if="cargandoPopulares || albumesPopulares.length > 0" class="seccion">
                <h2 class="titulo-seccion">Álbumes populares</h2>
                <div v-if="cargandoPopulares" class="estado-info">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Cargando...</span>
                </div>
                <div v-else class="cuadricula-tarjetas">
                    <TarjetaPlaylist
                        v-for="album in albumesPopulares"
                        :key="`album-${album.id}`"
                        :playlist="album"
                        :mostrar-badge="false"
                        @click="emitir('abrirPlaylist', album)"
                    />
                </div>
            </section>

            <section class="seccion">
                <h2 class="titulo-seccion">Explorar por categoría</h2>
                <div v-if="cargandoGeneros" class="estado-info">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Cargando géneros...</span>
                </div>
                <div v-else class="cuadricula-categorias">
                    <div
                        v-for="categoria in generos"
                        :key="categoria.id"
                        class="tarjeta-categoria"
                        :style="{ background: categoria.color }"
                        @click="seleccionarCategoria(categoria)"
                    >
                        <h3>{{ categoria.nombre }}</h3>
                        <i :class="['fas', categoria.icono]"></i>
                    </div>
                </div>
            </section>

        </template>

    </div>
</template>

<style scoped>
/* Filtros de búsqueda */
.filtros-busqueda {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 24px;
}

.chip-filtro {
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
    transition: all 0.2s ease;
}

.chip-filtro:hover {
    background: var(--fondo-hover);
    color: var(--texto-blanco);
}

.chip-filtro.activo {
    background: var(--morado);
    color: white;
    border-color: var(--morado);
}

.chip-filtro i {
    font-size: 12px;
}

/* Encabezado de sección con badge */
.titulo-seccion-con-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
}
.titulo-seccion-con-badge .titulo-seccion {
    margin-bottom: 0;
}
.badge-seccion-sonalya {
    background: linear-gradient(135deg, #7c3aed, #a78bfa);
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 20px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    box-shadow: 0 2px 8px rgba(139,92,246,0.4);
}

/* Resultados de búsqueda */
.lista-resultados {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

/* Estado informativo (loading / vacío) */
.estado-info {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 40px 20px;
    color: var(--texto-gris);
    font-size: 15px;
}

.estado-info i {
    font-size: 24px;
}

/* Cuadrícula de categorías */
.cuadricula-categorias {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 20px;
}

.tarjeta-categoria {
    position: relative;
    padding: 20px;
    border-radius: 12px;
    height: 120px;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.3s ease;
}

.tarjeta-categoria:hover {
    transform: scale(1.03);
    box-shadow: 0 8px 25px var(--sombra);
}

.tarjeta-categoria h3 {
    font-size: 20px;
    font-weight: 700;
    color: white;
    z-index: 2;
    position: relative;
}

.tarjeta-categoria i {
    position: absolute;
    bottom: -10px;
    right: -10px;
    font-size: 80px;
    opacity: 0.25;
    transform: rotate(-20deg);
    color: white;
}

/* Header de género seleccionado */
.genero-header {
    position: relative;
    border-radius: 16px;
    padding: 32px 28px 28px;
    margin-bottom: 32px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 160px;
    justify-content: flex-end;
}

.boton-volver-genero {
    position: absolute;
    top: 20px;
    left: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.35);
    color: white;
    border: none;
    border-radius: 50px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    backdrop-filter: blur(4px);
    transition: background 0.2s ease;
}

.boton-volver-genero:hover {
    background: rgba(0, 0, 0, 0.55);
}

.genero-header-info {
    display: flex;
    align-items: center;
    gap: 20px;
}

.genero-icono-grande {
    font-size: 56px;
    color: rgba(255, 255, 255, 0.9);
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4));
}

.genero-titulo {
    font-size: 48px;
    font-weight: 900;
    color: white;
    text-shadow: 0 2px 12px rgba(0,0,0,0.4);
    letter-spacing: -1px;
    line-height: 1;
}

/* Estado vacío del género */
.estado-vacio-genero {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 60px 20px;
    color: var(--texto-gris);
    text-align: center;
}
.estado-vacio-genero i { font-size: 48px; opacity: 0.5; }
.estado-vacio-genero p { font-size: 16px; }

.boton-reintentar-genero {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--morado);
    color: white;
    border: none;
    border-radius: 50px;
    padding: 10px 24px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}
.boton-reintentar-genero:hover { background: var(--morado-claro); transform: scale(1.03); }

/* Badge populares del género */
.badge-populares-genero {
    background: linear-gradient(135deg, #f59e0b, #ef4444);
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 20px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    box-shadow: 0 2px 8px rgba(239,68,68,0.3);
}

/* Badge nuevos talentos del género */
.badge-emergente-genero {
    background: linear-gradient(135deg, #34d399, #059669);
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 20px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    box-shadow: 0 2px 8px rgba(52,211,153,0.3);
}

/* Descripción de sección */
.descripcion-seccion {
    font-size: 13px;
    color: var(--texto-gris);
    margin: -12px 0 16px;
}


/* Badge emergente (legacy, para retrocompatibilidad) */
.badge-emergente {
    background: linear-gradient(135deg, #f59e0b, #f97316);
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 20px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    box-shadow: 0 2px 8px rgba(249,115,22,0.35);
}

@media (max-width: 768px) {
    .cuadricula-categorias { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
    .tarjeta-categoria { height: 80px; padding: 14px; border-radius: 10px; }
    .tarjeta-categoria h3 { font-size: 15px; }
    .tarjeta-categoria i { font-size: 60px; }

    .genero-header { padding: 20px 16px 20px; min-height: 110px; gap: 10px; border-radius: 12px; margin-bottom: 20px; }
    .genero-titulo { font-size: 28px; letter-spacing: -0.5px; }
    .genero-icono-grande { font-size: 34px; }
    .genero-header-info { gap: 12px; }
}

/* Búsquedas recientes */
.busquedas-recientes {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.chip-busqueda-reciente {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--fondo-tarjeta);
    color: var(--texto-blanco);
    border: 1px solid var(--borde);
    border-radius: 50px;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.chip-busqueda-reciente:hover {
    background: var(--fondo-hover);
    border-color: var(--morado);
    color: var(--texto-blanco);
}

.chip-busqueda-reciente i {
    color: var(--texto-gris);
    font-size: 13px;
}
</style>
