<script setup>
import { ref, computed } from 'vue'
import { reproducirCancion, reproducirCola, irACola, almacenApp, mostrarNotificacion } from '@/stores/appStore'
import { musica } from '@/servicios/musica'
import { usuario as usuarioSvc } from '@/servicios/usuario'

const propiedades = defineProps({
    playlist: {
        type: Object,
        required: true
    },
    mostrarBadge: {
        type: Boolean,
        default: true
    }
})

const emitir = defineEmits(['click', 'reproducir'])

const cargandoAlbum = ref(false)

// true para álbumes y playlists personalizadas (ambos cargan cola completa)
const esCola = computed(() =>
    propiedades.playlist.tipo === 'album' ||
    propiedades.playlist.tipo === 'playlist' ||
    propiedades.playlist.tipo === 'album_plataforma'
)

// Gradientes para portadas por defecto — determinista según el id/nombre
const GRADIENTES = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    'linear-gradient(135deg, #fd7043, #ff8a65)',
    'linear-gradient(135deg, #26c6da, #00acc1)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
]

const gradienteDefecto = computed(() => {
    const id = propiedades.playlist.id
    let seed = 0
    if (typeof id === 'number') {
        seed = id
    } else {
        const s = String(id || propiedades.playlist.nombre || '')
        for (let i = 0; i < s.length; i++) seed += s.charCodeAt(i)
    }
    return GRADIENTES[Math.abs(seed) % GRADIENTES.length]
})

const letraDefecto = computed(() =>
    (propiedades.playlist.nombre || '?').charAt(0).toUpperCase()
)

async function cargarYReproducir(aleatorio) {
    if (cargandoAlbum.value) return
    cargandoAlbum.value = true
    try {
        const tipo = propiedades.playlist.tipo
        const id   = propiedades.playlist.id

        if (tipo === 'album') {
            const resp = await musica.obtenerAlbum(id)
            reproducirCola(resp.canciones || [], 0, aleatorio, 'album', id)
        } else if (tipo === 'album_plataforma') {
            const albumId = propiedades.playlist.album_id ?? id
            const resp = await usuarioSvc.cancionesAlbumArtista(null, albumId)
            reproducirCola(resp.canciones || [], 0, aleatorio, 'album_plataforma', albumId)
        } else {
            const resp = await usuarioSvc.obtenerPlaylist(id)
            const canciones = (resp.playlist.canciones || []).map(c => ({
                id:       c.deezer_id,
                titulo:   c.titulo,
                artista:  c.artista,
                imagen:   c.imagen  || null,
                duracion: c.duracion || '0:00',
                preview:  c.preview  || null,
            }))
            reproducirCola(canciones, 0, aleatorio, 'playlist', id)
        }
    } catch (_) {
        mostrarNotificacion('No se pudo cargar la reproducción')
    } finally {
        cargandoAlbum.value = false
    }
}

async function alReproducir(evento) {
    evento.stopPropagation()

    if (esCola.value) {
        const tipo = propiedades.playlist.tipo
        const id   = String(propiedades.playlist.id)
        // Si ya está la misma fuente en la cola → reiniciar desde el principio
        if (almacenApp.colaOrigen.tipo === tipo &&
            String(almacenApp.colaOrigen.id) === id &&
            almacenApp.cola.length) {
            irACola(0)
            emitir('reproducir', propiedades.playlist)
            return
        }
        await cargarYReproducir(false)
        emitir('reproducir', propiedades.playlist)
        return
    }

    reproducirCancion(propiedades.playlist)
    emitir('reproducir', propiedades.playlist)
}

async function alReproducirAleatorio(evento) {
    evento.stopPropagation()
    if (esCola.value) {
        await cargarYReproducir(true)
    }
}

function alHacerClic() {
    emitir('click', propiedades.playlist)
}
</script>

<template>
    <div class="tarjeta" :class="{ 'tarjeta-artista': playlist.tipo === 'artista' || playlist.tipo === 'artista_plataforma' }" @click="alHacerClic">
        <div class="imagen-tarjeta">

            <!-- Imagen real -->
            <img
                v-if="playlist.imagen"
                :src="playlist.imagen"
                :alt="playlist.nombre"
                :class="{ 'img-circular': playlist.tipo === 'artista' || playlist.tipo === 'artista_plataforma' }"
            >

            <!-- Portada por defecto cuando no hay imagen -->
            <div
                v-else
                class="portada-defecto"
                :style="{ background: gradienteDefecto }"
                :class="{ 'portada-defecto-circular': playlist.tipo === 'artista' || playlist.tipo === 'artista_plataforma' }"
            >
                <span class="portada-defecto-letra">{{ letraDefecto }}</span>
                <i class="fas fa-music portada-defecto-icono"></i>
            </div>

            <!-- Botones de reproducción (no aparecen para artistas) -->
            <template v-if="playlist.tipo !== 'artista' && playlist.tipo !== 'artista_plataforma'">
                <button
                    class="boton-reproducir"
                    :class="{ 'boton-play-con-aleatorio': esCola }"
                    :disabled="cargandoAlbum"
                    @click="alReproducir"
                >
                    <i :class="cargandoAlbum ? 'fas fa-spinner fa-spin' : 'fas fa-play'"></i>
                </button>

                <button
                    v-if="esCola"
                    class="boton-reproducir boton-aleatorio-tarjeta"
                    :disabled="cargandoAlbum"
                    @click="alReproducirAleatorio"
                    title="Reproducir en aleatorio"
                >
                    <i class="fas fa-random"></i>
                </button>
            </template>
        </div>

        <h3 class="titulo-tarjeta">{{ playlist.nombre }}</h3>

        <p class="subtitulo-tarjeta">
            {{ playlist.descripcion || playlist.artista }}
        </p>

        <!-- Badge Sonalya para artistas de la plataforma -->
        <div v-if="playlist.tipo === 'artista_plataforma' && mostrarBadge" class="badge-sonalya">
            <i class="fas fa-star"></i> Sonalya
        </div>
    </div>
</template>

<style scoped>
.tarjeta-artista .imagen-tarjeta {
    border-radius: 50%;
    overflow: hidden;
}

/* Badge Sonalya */
.badge-sonalya {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: linear-gradient(135deg, #7c3aed, #a78bfa);
    color: white;
    font-size: 10px;
    font-weight: 700;
    padding: 3px 7px;
    border-radius: 20px;
    margin-top: 4px;
    box-shadow: 0 2px 8px rgba(139,92,246,0.4);
    white-space: nowrap;
}

.img-circular {
    border-radius: 50%;
}

/* ── Portada por defecto ─────────────────────────── */
.portada-defecto {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    border-radius: 8px;
}

.portada-defecto-circular {
    border-radius: 50%;
}

.portada-defecto-letra {
    font-size: 56px;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.92);
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    line-height: 1;
    position: relative;
    z-index: 2;
    user-select: none;
}

.portada-defecto-icono {
    position: absolute;
    bottom: -10px;
    right: -10px;
    font-size: 68px;
    color: rgba(255, 255, 255, 0.18);
    transform: rotate(-15deg);
    pointer-events: none;
}

/* Cuando hay dos botones, el play se desplaza a la izquierda */
.boton-play-con-aleatorio {
    right: 64px !important;
}

.boton-aleatorio-tarjeta {
    right: 8px;
    font-size: 14px;
}
</style>
