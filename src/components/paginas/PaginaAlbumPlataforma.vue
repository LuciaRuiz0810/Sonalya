<script setup>
import { ref, watch } from 'vue'
import TarjetaCancion from '@/components/comunes/TarjetaCancion.vue'
import { usuario as usuarioSvc } from '@/servicios/usuario'
import { reproducirCola, mostrarNotificacion, almacenApp, abrirModalAuth } from '@/stores/appStore'

const props = defineProps({
    albumId:   { type: Number, required: true },
    artistaId: { type: Number, required: true },
})

const emitir = defineEmits(['abrirPlaylist'])

const cargando        = ref(false)
const hayError        = ref(false)
const album           = ref(null)
const canciones       = ref([])
const guardado        = ref(false)
const cargandoGuardar = ref(false)

async function cargar() {
    cargando.value  = true
    hayError.value  = false
    album.value     = null
    canciones.value = []
    guardado.value  = false
    try {
        const r = await usuarioSvc.cancionesAlbumArtista(props.artistaId, props.albumId)
        album.value     = r.album
        canciones.value = r.canciones || []
        if (almacenApp.autenticado) {
            try {
                const estado = await usuarioSvc.estadoFavorito('album', 'plataforma_' + props.albumId)
                guardado.value = estado.esFavorito
            } catch (_) {}
        }
    } catch (err) {
        console.error('Error al cargar álbum plataforma:', err)
        hayError.value = true
        mostrarNotificacion('No se pudo cargar el álbum')
    } finally {
        cargando.value = false
    }
}

async function toggleGuardar() {
    if (!almacenApp.autenticado) {
        abrirModalAuth('login')
        mostrarNotificacion('Inicia sesión para guardar álbumes')
        return
    }
    if (cargandoGuardar.value || !album.value) return
    cargandoGuardar.value = true
    const favId = 'plataforma_' + props.albumId
    try {
        if (guardado.value) {
            await usuarioSvc.quitarAlbumFav(favId)
            guardado.value = false
            mostrarNotificacion(`"${album.value.titulo}" eliminado de tu biblioteca`)
        } else {
            await usuarioSvc.agregarAlbumFav({
                deezer_id: favId,
                nombre:    album.value.titulo,
                artista:   album.value.artista?.nombre_artista ?? album.value.artista?.nombre ?? '',
                imagen:    album.value.imagen || '',
            })
            guardado.value = true
            mostrarNotificacion(`"${album.value.titulo}" guardado en tu biblioteca`)
        }
    } catch (_) {
        mostrarNotificacion('No se pudo completar la acción')
    } finally {
        cargandoGuardar.value = false
    }
}

function reproducirTodo(aleatorio = false) {
    if (!canciones.value.length) return
    const idx = aleatorio ? Math.floor(Math.random() * canciones.value.length) : 0
    reproducirCola(canciones.value, idx, aleatorio, 'album_plataforma', props.albumId)
}

function verArtista() {
    emitir('abrirPlaylist', {
        tipo:   'artista_plataforma',
        id:     props.artistaId,
        nombre: album.value?.artista?.nombre_artista ?? album.value?.artista?.nombre ?? '',
    })
}

watch(() => [props.albumId, props.artistaId], cargar, { immediate: true })
</script>

<template>
    <div class="pagina-album">

        <div v-if="cargando" class="estado-info">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando álbum...</p>
        </div>

        <div v-else-if="hayError" class="estado-info estado-error">
            <i class="fas fa-exclamation-circle"></i>
            <p>No se pudo cargar el álbum.</p>
            <button class="boton-reintentar" @click="cargar">Reintentar</button>
        </div>

        <template v-else-if="album">

            <div class="album-cabecera">
                <div class="album-portada-wrap">
                    <div v-if="!album.imagen" class="album-portada-placeholder">
                        <i class="fas fa-compact-disc"></i>
                    </div>
                    <img v-else :src="album.imagen" :alt="album.titulo" class="album-portada">
                </div>
                <div class="album-info">
                    <span class="album-tipo">Álbum · Sonalya</span>
                    <h1 class="album-titulo">{{ album.titulo }}</h1>
                    <div class="album-meta">
                        <span class="album-artista" @click="verArtista">
                            {{ album.artista?.nombre_artista ?? album.artista?.nombre }}
                        </span>
                        <span v-if="album.genero" class="separador">·</span>
                        <span v-if="album.genero" class="album-genero">{{ album.genero }}</span>
                        <span class="separador">·</span>
                        <span class="album-pistas">
                            {{ canciones.length }} {{ canciones.length === 1 ? 'canción' : 'canciones' }}
                        </span>
                    </div>
                    <div class="album-acciones">
                        <button
                            class="boton-reproducir-album"
                            :disabled="!canciones.length"
                            @click="reproducirTodo(false)"
                        >
                            <i class="fas fa-play"></i> Reproducir
                        </button>
                        <button
                            class="boton-aleatorio-album"
                            :disabled="!canciones.length"
                            @click="reproducirTodo(true)"
                        >
                            <i class="fas fa-random"></i> Aleatorio
                        </button>
                        <button
                            class="boton-guardar-album"
                            :class="{ guardado }"
                            :disabled="cargandoGuardar"
                            @click="toggleGuardar"
                        >
                            <i :class="cargandoGuardar ? 'fas fa-spinner fa-spin' : guardado ? 'fas fa-heart' : 'far fa-heart'"></i>
                            {{ guardado ? 'Guardado' : 'Guardar' }}
                        </button>
                    </div>
                </div>
            </div>

            <div class="album-contenido">
                <section class="seccion">
                    <div v-if="!canciones.length" class="estado-info">
                        <i class="fas fa-music"></i>
                        <p>Este álbum no tiene canciones aún</p>
                    </div>
                    <div v-else class="lista-canciones-album">
                        <TarjetaCancion
                            v-for="(cancion, i) in canciones"
                            :key="cancion.id"
                            :cancion="cancion"
                            :numero="i + 1"
                            :mostrar-album="false"
                        />
                    </div>
                </section>
            </div>

        </template>
    </div>
</template>

<style scoped>
.pagina-album { min-height: 100%; }

.album-cabecera {
    display: flex; gap: 32px; align-items: flex-end;
    padding: 32px 32px 28px;
    background: linear-gradient(to bottom, rgba(109,40,217,0.3) 0%, transparent 100%);
}
.album-portada-wrap { flex-shrink: 0; }
.album-portada {
    width: 200px; height: 200px; border-radius: 8px;
    object-fit: cover; box-shadow: 0 12px 40px rgba(0,0,0,0.5);
}
.album-portada-placeholder {
    width: 200px; height: 200px; border-radius: 8px;
    background: rgba(255,255,255,0.07);
    display: flex; align-items: center; justify-content: center;
    font-size: 72px; color: rgba(255,255,255,0.18);
    box-shadow: 0 12px 40px rgba(0,0,0,0.5);
}
.album-info { display: flex; flex-direction: column; gap: 10px; padding-bottom: 8px; }
.album-tipo {
    font-size: 12px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1.5px; color: var(--texto-gris);
}
.album-titulo {
    font-size: 42px; font-weight: 800; color: var(--texto-blanco);
    margin: 0; line-height: 1.1; letter-spacing: -1px;
}
.album-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.album-artista {
    font-weight: 700; color: var(--texto-blanco); font-size: 14px;
    cursor: pointer; transition: color 0.15s;
}
.album-artista:hover { color: var(--morado-claro); text-decoration: underline; }
.album-acciones { margin-top: 20px; display: flex; align-items: center; gap: 12px; }

.boton-reproducir-album {
    display: inline-flex; align-items: center; gap: 10px;
    background: var(--morado); color: white; border: none;
    border-radius: 50px; padding: 14px 32px;
    font-size: 15px; font-weight: 700; cursor: pointer;
    transition: all 0.2s; box-shadow: 0 4px 16px rgba(139,92,246,0.4);
}
.boton-reproducir-album:hover:not(:disabled) { background: var(--morado-claro); transform: scale(1.04); }
.boton-reproducir-album:disabled { opacity: 0.45; cursor: default; }

.boton-aleatorio-album {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 24px; border-radius: 50px;
    border: 2px solid rgba(255,255,255,0.4);
    background: transparent; color: #fff;
    font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.boton-aleatorio-album:hover:not(:disabled) { border-color: #fff; background: rgba(255,255,255,0.1); }
.boton-aleatorio-album:disabled { opacity: 0.45; cursor: default; }

.album-genero, .album-pistas { font-size: 14px; color: var(--texto-gris); }
.separador { color: var(--texto-gris); font-size: 14px; }

.boton-guardar-album {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 24px; border-radius: 50px;
    border: 2px solid rgba(255,255,255,0.35);
    background: transparent; color: rgba(255,255,255,0.85);
    font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.boton-guardar-album:hover:not(:disabled) { border-color: white; color: white; background: rgba(255,255,255,0.08); }
.boton-guardar-album.guardado { border-color: #ec4899; color: #ec4899; background: rgba(236,72,153,0.12); }
.boton-guardar-album.guardado:hover:not(:disabled) { background: rgba(236,72,153,0.2); }
.boton-guardar-album:disabled { opacity: 0.45; cursor: default; }

.album-contenido { padding: 0 32px 32px; }
.lista-canciones-album { display: flex; flex-direction: column; gap: 4px; }

.estado-info {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; min-height: 300px; gap: 16px;
    color: var(--texto-gris); text-align: center;
}
.estado-info i { font-size: 40px; }
.estado-error { color: #ff6b6b; }
.boton-reintentar {
    background: var(--morado); color: white; border: none;
    border-radius: 50px; padding: 10px 24px;
    font-size: 14px; font-weight: 600; cursor: pointer;
}

/* ── Tablet ── */
@media (min-width: 769px) and (max-width: 1024px) {
    .album-cabecera { padding: 24px 24px 20px; gap: 24px; }
    .album-portada, .album-portada-placeholder { width: 160px; height: 160px; }
    .album-titulo { font-size: 34px; }
    .album-portada-placeholder { font-size: 56px; }
    .album-contenido { padding: 0 24px 32px; }
}

/* ── Móvil ── */
@media (max-width: 768px) {
    .album-cabecera { flex-direction: column; align-items: center; padding: 20px 16px 16px; gap: 14px; text-align: center; }
    .album-portada, .album-portada-placeholder { width: 150px; height: 150px; border-radius: 10px; }
    .album-portada-placeholder { font-size: 48px; }
    .album-titulo { font-size: 24px; letter-spacing: -0.3px; }
    .album-meta { justify-content: center; font-size: 13px; }
    .album-acciones { margin-top: 10px; justify-content: center; flex-wrap: wrap; gap: 8px; }
    .boton-reproducir-album { padding: 10px 22px; font-size: 14px; }
    .boton-aleatorio-album { padding: 9px 18px; font-size: 13px; }
    .boton-guardar-album { padding: 9px 18px; font-size: 13px; }
    .album-contenido { padding: 0 12px 80px; }
}
</style>
