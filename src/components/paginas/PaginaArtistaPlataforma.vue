<script setup>
import { ref, computed, onMounted } from 'vue'
import TarjetaCancion from '@/components/comunes/TarjetaCancion.vue'
import TarjetaPlaylist from '@/components/comunes/TarjetaPlaylist.vue'
import { almacenApp, mostrarNotificacion, reproducirCola, abrirModalAuth } from '@/stores/appStore'
import { usuario as usuarioSvc } from '@/servicios/usuario'

const props = defineProps({
    artistaId: { type: Number, required: true },
})

const emitir = defineEmits(['abrirPlaylist'])

const cargando    = ref(true)
const artista     = ref(null)
const canciones   = ref([])
const albumes     = ref([])
const siguiendo   = ref(false)
const cargandoSeg = ref(false)

// Ocultar el botón solo cuando estás viendo tu propio perfil
const esMiPerfil = computed(() => {
    if (!almacenApp.autenticado || !artista.value) return false
    const miId = almacenApp.usuario?.id
    if (miId == null) return false  // id aún no cargado → mostrar botón
    return miId === artista.value.id
})

async function cargar() {
    cargando.value = true
    try {
        const r = await usuarioSvc.artistaPlataforma(props.artistaId)
        artista.value   = r.artista
        canciones.value = r.canciones || []
        albumes.value   = r.albumes   || []
    } catch (_) {}
    finally { cargando.value = false }
}

async function cargarEstadoSeguimiento() {
    if (!almacenApp.autenticado) return
    try {
        const r = await usuarioSvc.estadoSeguimientoArtista(props.artistaId)
        siguiendo.value = r.siguiendo
    } catch (_) {}
}

async function toggleSeguir() {
    if (!almacenApp.autenticado) {
        abrirModalAuth('login')
        mostrarNotificacion('Inicia sesión para seguir artistas')
        return
    }
    cargandoSeg.value = true

    // Actualización optimista: cambiar el estado antes de que responda el servidor
    const erasSiguiendo = siguiendo.value
    const seguidoresAntes = artista.value.seguidores || 0

    if (erasSiguiendo) {
        siguiendo.value = false
        artista.value.seguidores = Math.max(0, seguidoresAntes - 1)
    } else {
        siguiendo.value = true
        artista.value.seguidores = seguidoresAntes + 1
    }

    try {
        if (erasSiguiendo) {
            await usuarioSvc.dejarSeguirArtistaPlataforma(props.artistaId)
            mostrarNotificacion(`Dejaste de seguir a ${artista.value.nombre}`)
        } else {
            await usuarioSvc.seguirArtistaPlataforma(props.artistaId)
            mostrarNotificacion(`Siguiendo a ${artista.value.nombre}`)
        }
    } catch (err) {
        siguiendo.value = erasSiguiendo
        artista.value.seguidores = seguidoresAntes
        if (err?.httpStatus === 401) {
            abrirModalAuth('login')
            mostrarNotificacion('Inicia sesión para seguir artistas')
        } else {
            mostrarNotificacion(err?.message || 'Error al actualizar seguimiento')
        }
    } finally {
        cargandoSeg.value = false
    }
}

function reproducirTodo() {
    if (!canciones.value.length) return
    reproducirCola(canciones.value, 0, false, 'artista_plataforma', props.artistaId)
}

function albumParaTarjeta(album) {
    return {
        id:          'plataforma_album_' + album.id,
        album_id:    album.id,
        artista_id:  props.artistaId,
        nombre:      album.titulo,
        imagen:      album.imagen || null,
        tipo:        'album_plataforma',
        descripcion: (album.canciones_count ?? 0) + ' canciones' + (album.genero ? ' · ' + album.genero : ''),
    }
}

onMounted(async () => {
    await cargar()
    cargarEstadoSeguimiento()
})
</script>

<template>
    <div class="contenedor-contenido">
        <div v-if="cargando" class="estado-info">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando perfil...</p>
        </div>

        <template v-else-if="artista">

            <!-- Hero -->
            <section
                class="artista-hero"
                :style="artista.imagen_portada ? `background-image:url('${artista.imagen_portada}')` : ''"
            >
                <div class="artista-hero-overlay"></div>
                <div class="artista-hero-contenido">
                    <img
                        :src="artista.imagen || `https://ui-avatars.com/api/?name=${encodeURIComponent(artista.nombre)}&background=6d28d9&color=fff&size=140`"
                        :alt="artista.nombre"
                        class="artista-avatar"
                    >
                    <div class="artista-hero-info">
                        <span class="artista-etiqueta"><i class="fas fa-star"></i> Artista en Sonalya</span>
                        <h1 class="artista-nombre">{{ artista.nombre }}</h1>
                        <p v-if="artista.ciudad || artista.genero" class="artista-meta">
                            <span v-if="artista.genero"><i class="fas fa-music"></i> {{ artista.genero }}</span>
                            <span v-if="artista.ciudad"><i class="fas fa-map-marker-alt"></i> {{ artista.ciudad }}</span>
                        </p>
                        <p class="artista-seguidores"><i class="fas fa-users"></i> {{ artista.seguidores.toLocaleString() }} seguidores</p>
                        <div class="artista-hero-acciones">
                            <button
                                v-if="canciones.length > 0"
                                class="boton-play-artista"
                                @click="reproducirTodo"
                            >
                                <i class="fas fa-play"></i> Reproducir
                            </button>
                            <button
                                v-if="!esMiPerfil"
                                class="boton-seguir"
                                :class="{ siguiendo }"
                                :disabled="cargandoSeg"
                                @click="toggleSeguir"
                            >
                                <i :class="siguiendo ? 'fas fa-check' : 'fas fa-user-plus'"></i>
                                {{ siguiendo ? 'Siguiendo' : 'Seguir' }}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Bio -->
            <section v-if="artista.bio" class="seccion">
                <h2 class="titulo-seccion">Sobre el artista</h2>
                <p class="artista-bio">{{ artista.bio }}</p>
                <a v-if="artista.sitio_web" :href="artista.sitio_web" target="_blank" rel="noopener" class="artista-web">
                    <i class="fas fa-globe"></i> {{ artista.sitio_web }}
                </a>
            </section>

            <!-- Canciones sueltas -->
            <section v-if="canciones.length > 0" class="seccion">
                <h2 class="titulo-seccion">Canciones populares</h2>
                <div class="lista-canciones">
                    <TarjetaCancion
                        v-for="(cancion, i) in canciones"
                        :key="cancion.id"
                        :cancion="cancion"
                        :numero="i + 1"
                        :mostrar-album="false"
                    />
                </div>
            </section>

            <!-- Álbumes -->
            <section v-if="albumes.length > 0" class="seccion">
                <h2 class="titulo-seccion">Discografía</h2>
                <div class="cuadricula-tarjetas">
                    <TarjetaPlaylist
                        v-for="album in albumes"
                        :key="album.id"
                        :playlist="albumParaTarjeta(album)"
                        @click="emitir('abrirPlaylist', $event)"
                    />
                </div>
            </section>

            <!-- Sin contenido -->
            <div v-if="canciones.length === 0 && albumes.length === 0 && !cargando" class="estado-vacio">
                <i class="fas fa-music"></i>
                <p>Este artista aún no ha subido música</p>
            </div>

        </template>
    </div>
</template>

<style scoped>
/* Hero */
.artista-hero {
    position: relative;
    min-height: 320px;
    border-radius: 20px;
    overflow: hidden;
    margin-bottom: 40px;
    background: linear-gradient(135deg, #1a0535 0%, #4c1d95 100%);
    background-size: cover;
    background-position: center top;
}
.artista-hero-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.25) 100%);
}
.artista-hero-contenido {
    position: relative; z-index: 1;
    display: flex; align-items: flex-end; gap: 28px;
    padding: 40px 36px; min-height: 320px;
}
.artista-avatar {
    width: 130px; height: 130px; border-radius: 50%;
    border: 4px solid white; object-fit: cover; flex-shrink: 0;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
.artista-hero-info { flex: 1; }
.artista-etiqueta {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1.5px; color: #c4b5fd;
    display: flex; align-items: center; gap: 5px; margin-bottom: 6px;
}
.artista-nombre {
    font-size: 44px; font-weight: 900; color: white;
    letter-spacing: -1.5px; line-height: 1; margin: 0 0 10px;
}
.artista-meta {
    display: flex; gap: 16px; color: rgba(255,255,255,0.75);
    font-size: 13px; margin-bottom: 6px;
}
.artista-meta span { display: flex; align-items: center; gap: 5px; }
.artista-seguidores {
    font-size: 14px; color: rgba(255,255,255,0.8);
    margin-bottom: 18px; display: flex; align-items: center; gap: 6px;
}
.artista-hero-acciones { display: flex; gap: 12px; flex-wrap: wrap; }

.boton-play-artista {
    display: flex; align-items: center; gap: 8px;
    background: var(--morado); color: white; border: none;
    border-radius: 50px; padding: 11px 28px;
    font-size: 14px; font-weight: 700; cursor: pointer;
    transition: all 0.2s;
}
.boton-play-artista:hover { background: var(--morado-claro); transform: scale(1.03); }

.boton-seguir {
    display: flex; align-items: center; gap: 8px;
    background: transparent; color: white;
    border: 2px solid rgba(255,255,255,0.6);
    border-radius: 50px; padding: 10px 24px;
    font-size: 14px; font-weight: 600; cursor: pointer;
    transition: all 0.2s;
}
.boton-seguir:hover:not(:disabled) { background: rgba(255,255,255,0.15); border-color: white; }
.boton-seguir.siguiendo { background: rgba(139,92,246,0.25); border-color: var(--morado); color: #c4b5fd; }
.boton-seguir:disabled { opacity: 0.6; cursor: not-allowed; }

/* Bio */
.artista-bio { font-size: 14px; color: var(--texto-gris); line-height: 1.7; max-width: 640px; }
.artista-web { display: inline-flex; align-items: center; gap: 6px; color: var(--morado); font-size: 13px; text-decoration: none; margin-top: 8px; }
.artista-web:hover { text-decoration: underline; }

/* Canciones */
.lista-canciones { display: flex; flex-direction: column; gap: 4px; }

/* Estados */
.estado-info { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 80px 20px; color: var(--texto-gris); }
.estado-info i { font-size: 40px; }
.estado-vacio { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 20px; color: var(--texto-gris); text-align: center; }
.estado-vacio i { font-size: 48px; opacity: 0.3; }
.estado-vacio p { font-size: 15px; color: var(--texto-blanco); margin: 0; }

/* ── Tablet ── */
@media (min-width: 769px) and (max-width: 1024px) {
    .artista-hero { min-height: 280px; border-radius: 16px; }
    .artista-hero-contenido { padding: 30px 28px; min-height: 280px; gap: 20px; }
    .artista-avatar { width: 100px; height: 100px; }
    .artista-nombre { font-size: 34px; }
}

/* ── Móvil ── */
@media (max-width: 768px) {
    .artista-hero { min-height: 240px; border-radius: 14px; }
    .artista-hero-contenido { padding: 16px 14px; min-height: 240px; gap: 12px; flex-direction: column; align-items: flex-start; justify-content: flex-end; }
    .artista-avatar { width: 68px; height: 68px; border-width: 3px; }
    .artista-nombre { font-size: 22px; margin: 0 0 6px; letter-spacing: -0.5px; }
    .artista-meta { flex-wrap: wrap; gap: 6px; font-size: 12px; margin-bottom: 4px; }
    .artista-seguidores { font-size: 12px; margin-bottom: 10px; }
    .artista-hero-acciones { gap: 8px; flex-wrap: wrap; }
    .boton-play-artista { padding: 9px 20px; font-size: 13px; }
    .boton-seguir { padding: 8px 16px; font-size: 13px; }
}

/* ── Móvil muy pequeño (≤ 400px) ── */
@media (max-width: 400px) {
    .artista-hero { min-height: 210px; }
    .artista-hero-contenido { padding: 12px 12px 14px; min-height: 210px; }
    .artista-avatar { width: 56px; height: 56px; }
    .artista-nombre { font-size: 19px; }
}
</style>
