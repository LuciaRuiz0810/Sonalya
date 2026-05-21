<script setup>
import { ref, computed, onMounted } from 'vue'
import TarjetaPlaylist from '@/components/comunes/TarjetaPlaylist.vue'
import TarjetaCancion from '@/components/comunes/TarjetaCancion.vue'
import { musica } from '@/servicios/musica'
import { usuario as usuarioSvc } from '@/servicios/usuario'
import { almacenApp, actualizarReproductor, mostrarNotificacion, cacheGuardar, cacheObtener } from '@/stores/appStore'

const emitir = defineEmits(['abrirPlaylist'])

const cargando           = ref(true)
const hayError           = ref(false)
const canciones          = ref([])
const artistas           = ref([])
const albumes            = ref([])
const emergentes         = ref([])
const cargandoEmergentes = ref(true)
const generos            = ref([])
const cancionesPop       = ref([])
const cancionesRap       = ref([])
const cancionesLatino    = ref([])

// Recomendaciones y populares (solo para usuarios autenticados)
const recomendaciones       = ref([])
const cargandoRec           = ref(false)
const cancionesPopulares    = ref([])
const totalCancionesDistintas = ref(0)
const cargandoPopulares     = ref(false)

const artistaSemana = ref(null)

const topCanciones = computed(() => canciones.value.slice(0, 5))
const heroBanner   = computed(() => artistaSemana.value || artistas.value.find(a => a.tipo === 'artista') || null)

const TTL_CHARTS = 15 * 60_000   // 15 min
const TTL_EXTRAS = 60 * 60_000   // 1 hora
const TTL_PERSONAL = 2 * 60_000  // 2 min

async function cargarCharts() {
    const cached = cacheObtener('inicio_charts')
    if (cached) {
        canciones.value     = cached.canciones
        artistas.value      = cached.artistas
        albumes.value       = cached.albumes
        artistaSemana.value = cached.artistaSemana || null
        cargando.value = false
        return
    }
    try {
        cargando.value = true
        hayError.value = false
        const respuesta = await musica.obtenerCharts()
        canciones.value     = respuesta.canciones
        artistas.value      = respuesta.artistas
        albumes.value       = respuesta.albumes
        artistaSemana.value = respuesta.artistaSemana || null
        cacheGuardar('inicio_charts', respuesta, TTL_CHARTS)
    } catch (_) {
        hayError.value = true
    } finally {
        cargando.value = false
    }
}

async function cargarEmergentes() {
    const cached = cacheObtener('inicio_emergentes')
    if (cached) { emergentes.value = cached; cargandoEmergentes.value = false; return }
    try {
        cargandoEmergentes.value = true
        const resp = await musica.obtenerEmergentes()
        emergentes.value = resp.artistas || []
        cacheGuardar('inicio_emergentes', emergentes.value, TTL_CHARTS)
    } catch (_) {
        emergentes.value = []
    } finally {
        cargandoEmergentes.value = false
    }
}

async function cargarRecomendaciones() {
    if (!almacenApp.autenticado) return
    const cached = cacheObtener('inicio_recomendaciones')
    if (cached) { recomendaciones.value = cached; return }
    try {
        cargandoRec.value = true
        const resp = await usuarioSvc.recomendaciones()
        recomendaciones.value = resp.recomendaciones || []
        cacheGuardar('inicio_recomendaciones', recomendaciones.value, TTL_PERSONAL)
    } catch (_) {
        recomendaciones.value = []
    } finally {
        cargandoRec.value = false
    }
}

async function cargarPopulares() {
    if (!almacenApp.autenticado) return
    const cached = cacheObtener('inicio_populares')
    if (cached) {
        cancionesPopulares.value      = cached.canciones
        totalCancionesDistintas.value = cached.total_distintas
        return
    }
    try {
        cargandoPopulares.value = true
        const resp = await usuarioSvc.cancionesPopulares()
        cancionesPopulares.value      = resp.canciones || []
        totalCancionesDistintas.value = resp.total_distintas || 0
        cacheGuardar('inicio_populares', { canciones: cancionesPopulares.value, total_distintas: totalCancionesDistintas.value }, TTL_PERSONAL)
    } catch (_) {
        cancionesPopulares.value = []
    } finally {
        cargandoPopulares.value = false
    }
}

async function cargarExtras() {
    const cached = cacheObtener('inicio_extras')
    if (cached) {
        generos.value        = cached.generos
        cancionesPop.value   = cached.pop
        cancionesRap.value   = cached.rap
        cancionesLatino.value = cached.latino
        return
    }
    const [gResp, popResp, rapResp, latinoResp] = await Promise.allSettled([
        musica.obtenerGeneros(),
        musica.obtenerGenero(132, 'Pop'),
        musica.obtenerGenero(116, 'Rap Hip Hop'),
        musica.obtenerGenero(197, 'Latino'),
    ])
    if (gResp.status      === 'fulfilled') generos.value        = gResp.value.generos || []
    if (popResp.status    === 'fulfilled') cancionesPop.value   = (popResp.value.canciones || []).slice(0, 8)
    if (rapResp.status    === 'fulfilled') cancionesRap.value   = (rapResp.value.canciones || []).slice(0, 8)
    if (latinoResp.status === 'fulfilled') cancionesLatino.value = (latinoResp.value.canciones || []).slice(0, 8)
    cacheGuardar('inicio_extras', {
        generos: generos.value,
        pop:     cancionesPop.value,
        rap:     cancionesRap.value,
        latino:  cancionesLatino.value,
    }, TTL_EXTRAS)
}

function alHacerClicEnPlaylist(item) {
    emitir('abrirPlaylist', item)
}

function alAbrirGenero(genero) {
    emitir('abrirPlaylist', { ...genero, tipo: 'genero' })
}

function reproducirCancion(cancion) {
    actualizarReproductor(
        cancion.nombre,
        cancion.artista,
        cancion.imagen,
        cancion.preview || null,
        cancion.id || null,
        'cancion',
        cancion.artista_id || null
    )
    mostrarNotificacion(cancion.preview
        ? `Reproduciendo: ${cancion.nombre}`
        : `${cancion.nombre} — sin preview disponible`
    )
}

const coloresRanking = [
    'linear-gradient(135deg, #FFD700, #FFA500)',
    'linear-gradient(135deg, #C0C0C0, #A0A0A0)',
    'linear-gradient(135deg, #CD7F32, #A05A20)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
]

onMounted(() => {
    cargarCharts()
    cargarEmergentes()
    cargarExtras()
    cargarRecomendaciones()
    cargarPopulares()
})
</script>

<template>
    <div class="contenedor-contenido">

        <div v-if="cargando" class="estado-info">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando música...</p>
        </div>

        <div v-else-if="hayError" class="estado-info estado-error">
            <i class="fas fa-exclamation-circle"></i>
            <p>No se pudo cargar el contenido.</p>
            <button class="boton-reintentar" @click="cargarCharts">Reintentar</button>
        </div>

        <template v-else>

            <!-- ================================================================
                 HERO: Artista #1 de la semana
            ================================================================ -->
            <div v-if="heroBanner" class="hero-artista" @click="alHacerClicEnPlaylist(heroBanner)">
                <img :src="heroBanner.imagen" :alt="heroBanner.nombre" class="hero-imagen-fondo">
                <div class="hero-gradiente"></div>
                <div class="hero-contenido">
                    <span class="hero-etiqueta"><i class="fas fa-crown"></i> #1 Esta semana</span>
                    <h2 class="hero-nombre">{{ heroBanner.nombre }}</h2>
                    <p class="hero-fans">{{ heroBanner.descripcion }}</p>
                    <button class="hero-boton" @click.stop="alHacerClicEnPlaylist(heroBanner)">
                        <i class="fas fa-user"></i> Ver artista
                    </button>
                </div>
            </div>

            <!-- ================================================================
                 RANKING: Top 5 canciones
            ================================================================ -->
            <section class="seccion">
                <div class="titulo-seccion-con-badge">
                    <h2 class="titulo-seccion">Ranking semanal</h2>
                    <span class="badge-live"><i class="fas fa-fire"></i> En directo</span>
                </div>

                <div class="ranking-lista">
                    <div
                        v-for="(cancion, indice) in topCanciones"
                        :key="cancion.id"
                        class="ranking-item"
                        @click="reproducirCancion(cancion)"
                    >
                        <div
                            class="ranking-numero"
                            :style="{ background: coloresRanking[indice] }"
                        >
                            {{ indice + 1 }}
                        </div>
                        <img :src="cancion.imagen" :alt="cancion.nombre" class="ranking-imagen">
                        <div class="ranking-info">
                            <span class="ranking-titulo">{{ cancion.nombre }}</span>
                            <span class="ranking-artista">{{ cancion.artista }}</span>
                        </div>
                        <div class="ranking-acciones">
                            <span class="ranking-duracion">{{ cancion.duracion }}</span>
                            <button class="ranking-play" @click.stop="reproducirCancion(cancion)">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ================================================================
                 RECOMENDACIONES PERSONALIZADAS (solo usuarios autenticados)
            ================================================================ -->
            <section v-if="almacenApp.autenticado && (cargandoRec || recomendaciones.length > 0)" class="seccion">
                <div class="titulo-seccion-con-badge">
                    <h2 class="titulo-seccion">Recomendaciones para ti</h2>
                    <span class="badge-recomendacion"><i class="fas fa-magic"></i> Personalizado</span>
                </div>

                <div v-if="cargandoRec" class="estado-info-inline">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Cargando recomendaciones...</span>
                </div>
                <div v-else class="cuadricula-tarjetas">
                    <TarjetaPlaylist
                        v-for="item in recomendaciones"
                        :key="item.id"
                        :playlist="item"
                        @click="alHacerClicEnPlaylist"
                    />
                </div>
            </section>

            <!-- ================================================================
                 GÉNEROS: cuadrícula de tarjetas de categoría
            ================================================================ -->
            <section v-if="generos.length" class="seccion">
                <div class="titulo-seccion-con-badge">
                    <h2 class="titulo-seccion">Explorar géneros</h2>
                    <span class="badge-explorar"><i class="fas fa-compass"></i> Descubre</span>
                </div>
                <div class="cuadricula-generos">
                    <div
                        v-for="genero in generos"
                        :key="genero.id"
                        class="tarjeta-genero"
                        :style="{ background: genero.color }"
                        @click="alAbrirGenero(genero)"
                    >
                        <span class="tarjeta-genero-nombre">{{ genero.nombre }}</span>
                        <i :class="['fas', genero.icono, 'tarjeta-genero-icono']"></i>
                    </div>
                </div>
            </section>

            <!-- ================================================================
                 LO MEJOR DEL POP
            ================================================================ -->
            <section v-if="cancionesPop.length" class="seccion">
                <div class="titulo-seccion-con-badge">
                    <h2 class="titulo-seccion">Lo mejor del Pop</h2>
                    <span class="badge-genero badge-pop"><i class="fas fa-music"></i> Pop</span>
                </div>
                <div class="lista-genero">
                    <TarjetaCancion
                        v-for="(cancion, i) in cancionesPop"
                        :key="cancion.id"
                        :cancion="cancion"
                        :numero="i + 1"
                        :mostrar-album="true"
                    />
                </div>
            </section>

            <!-- ================================================================
                 ESCENA LATINA
            ================================================================ -->
            <section v-if="cancionesLatino.length" class="seccion">
                <div class="titulo-seccion-con-badge">
                    <h2 class="titulo-seccion">Escena latina</h2>
                    <span class="badge-genero badge-latino"><i class="fas fa-fire"></i> Latino</span>
                </div>
                <div class="lista-genero">
                    <TarjetaCancion
                        v-for="(cancion, i) in cancionesLatino"
                        :key="cancion.id"
                        :cancion="cancion"
                        :numero="i + 1"
                        :mostrar-album="true"
                    />
                </div>
            </section>

            <!-- ================================================================
                 CANCIONES DEL MOMENTO (cuadrícula)
            ================================================================ -->
            <section class="seccion">
                <h2 class="titulo-seccion">Canciones del momento</h2>
                <div class="cuadricula-tarjetas">
                    <TarjetaPlaylist
                        v-for="item in canciones.slice(5)"
                        :key="item.id"
                        :playlist="item"
                        @click="alHacerClicEnPlaylist"
                    />
                </div>
            </section>

            <!-- ================================================================
                 RAP & HIP-HOP
            ================================================================ -->
            <section v-if="cancionesRap.length" class="seccion">
                <div class="titulo-seccion-con-badge">
                    <h2 class="titulo-seccion">Rap & Hip-Hop</h2>
                    <span class="badge-genero badge-rap"><i class="fas fa-microphone-alt"></i> Hip-Hop</span>
                </div>
                <div class="lista-genero">
                    <TarjetaCancion
                        v-for="(cancion, i) in cancionesRap"
                        :key="cancion.id"
                        :cancion="cancion"
                        :numero="i + 1"
                        :mostrar-album="true"
                    />
                </div>
            </section>

            <!-- ================================================================
                 CANCIONES MÁS ESCUCHADAS (solo si el usuario tiene >= 5 distintas)
            ================================================================ -->
            <section v-if="almacenApp.autenticado && totalCancionesDistintas >= 5" class="seccion">
                <div class="titulo-seccion-con-badge">
                    <h2 class="titulo-seccion">Tus canciones más escuchadas</h2>
                    <span class="badge-populares"><i class="fas fa-headphones"></i> Tu historial</span>
                </div>
                <div v-if="cargandoPopulares" class="estado-info-inline">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Cargando...</span>
                </div>
                <div v-else class="ranking-lista">
                    <div
                        v-for="(cancion, i) in cancionesPopulares"
                        :key="cancion.id"
                        class="ranking-item"
                        @click="reproducirCancion(cancion)"
                    >
                        <div class="ranking-numero" :style="{ background: coloresRanking[Math.min(i, 4)] }">
                            {{ i + 1 }}
                        </div>
                        <img :src="cancion.imagen" :alt="cancion.titulo" class="ranking-imagen">
                        <div class="ranking-info">
                            <span class="ranking-titulo">{{ cancion.titulo }}</span>
                            <span class="ranking-artista">{{ cancion.artista }}</span>
                        </div>
                        <div class="ranking-acciones">
                            <span class="ranking-duracion reproducciones-badge">
                                <i class="fas fa-play"></i> {{ cancion.reproducciones }}x
                            </span>
                            <button class="ranking-play" @click.stop="reproducirCancion(cancion)">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ================================================================
                 ARTISTAS más escuchados
            ================================================================ -->
            <section class="seccion">
                <h2 class="titulo-seccion">Artistas más escuchados</h2>
                <div class="cuadricula-tarjetas">
                    <TarjetaPlaylist
                        v-for="item in artistas"
                        :key="item.id"
                        :playlist="item"
                        @click="alHacerClicEnPlaylist"
                    />
                </div>
            </section>

            <!-- ================================================================
                 ARTISTAS EMERGENTES
            ================================================================ -->
            <section class="seccion">
                <div class="titulo-seccion-con-badge">
                    <h2 class="titulo-seccion">Nuevos Talentos</h2>
                    <span class="badge-nuevo"><i class="fas fa-seedling"></i> Descúbrelos</span>
                </div>

                <div v-if="cargandoEmergentes" class="estado-info-inline">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Cargando...</span>
                </div>

                <div v-else class="emergentes-lista">
                    <div
                        v-for="artista in emergentes"
                        :key="artista.id"
                        class="emergente-item"
                        @click="alHacerClicEnPlaylist(artista)"
                    >
                        <img
                            :src="artista.imagen || 'https://via.placeholder.com/56'"
                            :alt="artista.nombre"
                            class="emergente-avatar"
                        >
                        <div class="emergente-info">
                            <span class="emergente-nombre">{{ artista.nombre }}</span>
                            <span class="emergente-fans">{{ artista.descripcion }}</span>
                        </div>
                        <div class="emergente-tag">Emergente</div>
                    </div>
                </div>
            </section>

            <!-- ================================================================
                 ÁLBUMES populares
            ================================================================ -->
            <section class="seccion">
                <h2 class="titulo-seccion">Álbumes populares</h2>
                <div class="cuadricula-tarjetas">
                    <TarjetaPlaylist
                        v-for="item in albumes"
                        :key="item.id"
                        :playlist="item"
                        @click="alHacerClicEnPlaylist"
                    />
                </div>
            </section>

        </template>
    </div>
</template>

<style scoped>
.estado-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 80px 20px;
    color: var(--texto-gris);
}
.estado-info i { font-size: 48px; }
.estado-error i { color: #ff6b6b; }
.boton-reintentar {
    background: var(--morado);
    color: white;
    border: none;
    border-radius: 20px;
    padding: 8px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}
.boton-reintentar:hover { opacity: 0.85; }

/* Títulos con badge */
.titulo-seccion-con-badge {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
}
.titulo-seccion-con-badge .titulo-seccion {
    margin-bottom: 0;
}

.badge-live {
    background: linear-gradient(135deg, #ff6b6b, #ff5252);
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 50px;
    display: flex;
    align-items: center;
    gap: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.badge-nuevo {
    background: linear-gradient(135deg, #34d399, #059669);
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 50px;
    display: flex;
    align-items: center;
    gap: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.badge-genero {
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 50px;
    display: flex;
    align-items: center;
    gap: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.badge-pop    { background: linear-gradient(135deg, #ff6b6b, #ff5252); }
.badge-rap    { background: linear-gradient(135deg, #ffd93d, #f39c12); }
.badge-latino { background: linear-gradient(135deg, #f7971e, #ffd200); }

/* ================================================================
   HERO BANNER
================================================================ */
.hero-artista {
    position: relative;
    height: 280px;
    border-radius: 20px;
    overflow: hidden;
    cursor: pointer;
    margin-bottom: 40px;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.hero-artista:hover {
    transform: scale(1.01);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
}

.hero-imagen-fondo {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 20%;
}

.hero-gradiente {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        90deg,
        rgba(0, 0, 0, 0.88) 0%,
        rgba(0, 0, 0, 0.5) 55%,
        rgba(0, 0, 0, 0.1) 100%
    );
}

.hero-contenido {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    height: 100%;
    padding: 32px 36px;
    gap: 6px;
}

.hero-etiqueta {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #c4b5fd;
    display: flex;
    align-items: center;
    gap: 6px;
}

.hero-nombre {
    font-size: 48px;
    font-weight: 900;
    color: white;
    text-shadow: 0 2px 16px rgba(0, 0, 0, 0.6);
    letter-spacing: -1px;
    line-height: 1;
    margin: 0;
}

.hero-fans {
    font-size: 15px;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
}

.hero-boton {
    margin-top: 10px;
    width: fit-content;
    background: white;
    color: #1a1a2e;
    border: none;
    border-radius: 50px;
    padding: 10px 24px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
}

.hero-boton:hover {
    background: rgba(255, 255, 255, 0.85);
    transform: translateY(-2px);
}

/* ================================================================
   GÉNEROS — cuadrícula de tarjetas
================================================================ */
.badge-recomendacion {
    background: linear-gradient(135deg, #8b5cf6, #6d28d9);
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 50px;
    display: flex;
    align-items: center;
    gap: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.badge-populares {
    background: linear-gradient(135deg, #06b6d4, #0284c7);
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 50px;
    display: flex;
    align-items: center;
    gap: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.reproducciones-badge {
    font-size: 12px;
    color: var(--morado);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
}

.badge-explorar {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 50px;
    display: flex;
    align-items: center;
    gap: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.cuadricula-generos {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 14px;
}

.tarjeta-genero {
    position: relative;
    padding: 20px 18px 18px;
    border-radius: 14px;
    height: 108px;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.25s ease;
}

.tarjeta-genero:hover {
    transform: scale(1.04);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
}

.tarjeta-genero-nombre {
    font-size: 17px;
    font-weight: 800;
    color: white;
    position: relative;
    z-index: 2;
    line-height: 1.2;
    text-shadow: 0 1px 4px rgba(0,0,0,0.25);
    display: block;
}

.tarjeta-genero-icono {
    position: absolute;
    bottom: -10px;
    right: -10px;
    font-size: 76px;
    opacity: 0.22;
    transform: rotate(-15deg);
    color: white;
    pointer-events: none;
}

/* ================================================================
   LISTA DE CANCIONES DE GÉNERO
================================================================ */
.lista-genero {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

/* ================================================================
   RANKING
================================================================ */
.ranking-lista {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.ranking-item {
    display: flex;
    align-items: center;
    gap: 16px;
    background: var(--fondo-tarjeta);
    border-radius: 12px;
    padding: 12px 16px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.ranking-item:hover {
    background: var(--fondo-hover);
    transform: translateX(4px);
}

.ranking-numero {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 800;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.ranking-imagen {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
}

.ranking-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
}

.ranking-titulo {
    font-size: 15px;
    font-weight: 600;
    color: var(--texto-blanco);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ranking-artista {
    font-size: 13px;
    color: var(--texto-gris);
}

.ranking-acciones {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
}

.ranking-duracion {
    font-size: 13px;
    color: var(--texto-gris);
    font-variant-numeric: tabular-nums;
}

.ranking-play {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--morado);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.ranking-item:hover .ranking-play {
    opacity: 1;
}

/* ================================================================
   ARTISTAS EMERGENTES
================================================================ */
.estado-info-inline {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--texto-gris);
    padding: 20px 0;
}

.emergentes-lista {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
}

.emergente-item {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--fondo-tarjeta);
    border-radius: 12px;
    padding: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
}

.emergente-item:hover {
    background: var(--fondo-hover);
    border-color: rgba(139, 92, 246, 0.3);
    transform: translateY(-2px);
}

.emergente-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    border: 2px solid rgba(139, 92, 246, 0.4);
}

.emergente-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
}

.emergente-nombre {
    font-size: 14px;
    font-weight: 600;
    color: var(--texto-blanco);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.emergente-fans {
    font-size: 12px;
    color: var(--texto-gris);
}

.emergente-tag {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #34d399;
    background: rgba(52, 211, 153, 0.12);
    padding: 3px 8px;
    border-radius: 50px;
    flex-shrink: 0;
}

@media (max-width: 768px) {
    .hero-artista { height: 180px; margin-bottom: 20px; border-radius: 14px; }
    .hero-contenido { padding: 16px 18px; }
    .hero-nombre { font-size: 26px; }
    .hero-fans { font-size: 12px; }
    .hero-boton { padding: 8px 18px; font-size: 13px; margin-top: 6px; }

    .titulo-seccion-con-badge { gap: 8px; margin-bottom: 14px; }

    .ranking-item { gap: 10px; padding: 9px 12px; }
    .ranking-numero { width: 28px; height: 28px; font-size: 13px; border-radius: 7px; }
    .ranking-imagen { width: 38px; height: 38px; }
    .ranking-titulo { font-size: 13px; }
    .ranking-artista { font-size: 12px; }
    .ranking-duracion { font-size: 12px; }

    .cuadricula-generos { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
    .tarjeta-genero { height: 78px; padding: 12px 14px; border-radius: 10px; }
    .tarjeta-genero-nombre { font-size: 14px; }
    .tarjeta-genero-icono { font-size: 50px; }

    .emergentes-lista { grid-template-columns: 1fr; }
    .emergente-item { padding: 10px 12px; gap: 10px; }
    .emergente-avatar { width: 42px; height: 42px; }
}
</style>
