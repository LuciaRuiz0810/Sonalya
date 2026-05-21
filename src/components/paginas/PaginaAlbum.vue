<script setup>
import { ref, watch } from 'vue'
import TarjetaCancion from '@/components/comunes/TarjetaCancion.vue'
import { musica } from '@/servicios/musica'
import { almacenApp, mostrarNotificacion, abrirModalAuth, reproducirCola, cacheGuardar, cacheObtener } from '@/stores/appStore'
import { usuario as usuarioSvc } from '@/servicios/usuario'

const propiedades = defineProps({
    albumId:       { type: Number, default: null },
    cancionDirecta: { type: Object, default: null },
})

const cargando        = ref(false)
const hayError        = ref(false)
const album           = ref(null)
const canciones       = ref([])
const guardado        = ref(false)
const cargandoGuardar = ref(false)

const TTL_ALBUM = 15 * 60_000  // 15 min

async function cargar(id) {
    const cacheKey = `album_${id}`
    const cached = cacheObtener(cacheKey)
    if (cached) {
        album.value    = cached.album
        canciones.value = cached.canciones
        guardado.value  = cached.guardado ?? false
        cargando.value  = false
        return
    }
    try {
        cargando.value = true
        hayError.value = false
        const resp = await musica.obtenerAlbum(id)
        album.value     = resp.album
        canciones.value = resp.canciones

        if (almacenApp.autenticado) {
            const estado = await usuarioSvc.estadoFavorito('album', id)
            guardado.value = estado.esFavorito
        }
        cacheGuardar(cacheKey, { album: album.value, canciones: canciones.value, guardado: guardado.value }, TTL_ALBUM)
    } catch (_) {
        hayError.value = true
    } finally {
        cargando.value = false
    }
}

function cargarCancionDirecta(cancion) {
    guardado.value = false
    album.value = {
        id:      cancion.id,
        nombre:  cancion.nombre,
        artista: cancion.artista,
        imagen:  cancion.imagen,
        fecha:   null,
        genero:  null,
        fans:    null,
    }
    canciones.value = [{
        id:       cancion.id,
        titulo:   cancion.nombre,
        artista:  cancion.artista,
        album:    cancion.nombre,
        imagen:   cancion.imagen,
        duracion: cancion.duracion || '0:00',
        preview:  cancion.preview || null,
    }]
}

async function toggleGuardar() {
    if (!almacenApp.autenticado) {
        abrirModalAuth('login')
        return
    }
    if (cargandoGuardar.value || !album.value) return
    cargandoGuardar.value = true
    try {
        if (guardado.value) {
            await usuarioSvc.quitarAlbumFav(album.value.id)
            guardado.value = false
            mostrarNotificacion(`"${album.value.nombre}" eliminado de tu biblioteca`)
        } else {
            await usuarioSvc.agregarAlbumFav({
                deezer_id: String(album.value.id),
                nombre:    album.value.nombre,
                artista:   album.value.artista,
                imagen:    album.value.imagen || '',
            })
            guardado.value = true
            mostrarNotificacion(`"${album.value.nombre}" guardado en tu biblioteca`)
        }
        // Reflejar el nuevo estado de guardado en caché
        const cacheKey = `album_${album.value.id}`
        const entrada = cacheObtener(cacheKey)
        if (entrada) cacheGuardar(cacheKey, { ...entrada, guardado: guardado.value }, TTL_ALBUM)
    } catch (_) {
        mostrarNotificacion('No se pudo completar la acción')
    } finally {
        cargandoGuardar.value = false
    }
}

function reproducirTodo(aleatorio = false) {
    reproducirCola(canciones.value, 0, aleatorio, 'album', album.value?.id)
}

watch(
    () => [propiedades.albumId, propiedades.cancionDirecta],
    ([albumId, cancionDirecta]) => {
        if (cancionDirecta) {
            cargarCancionDirecta(cancionDirecta)
        } else if (albumId) {
            cargar(albumId)
        }
    },
    { immediate: true }
)
</script>

<template>
    <div class="pagina-album">

        <!-- Cargando -->
        <div v-if="cargando" class="estado-info">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando álbum...</p>
        </div>

        <!-- Error -->
        <div v-else-if="hayError" class="estado-info estado-error">
            <i class="fas fa-exclamation-circle"></i>
            <p>No se pudo cargar el contenido.</p>
            <button class="boton-reintentar" @click="cargar(propiedades.albumId)">Reintentar</button>
        </div>

        <template v-else-if="album">

            <!-- ================================================================
                 CABECERA: portada + info del álbum
            ================================================================ -->
            <div class="album-cabecera">
                <div class="album-portada-wrap">
                    <img
                        :src="album.imagen"
                        :alt="album.nombre"
                        class="album-portada"
                    >
                </div>
                <div class="album-info">
                    <span class="album-tipo">
                        {{ propiedades.cancionDirecta ? 'Canción' : 'Álbum' }}
                    </span>
                    <h1 class="album-titulo">{{ album.nombre }}</h1>
                    <div class="album-meta">
                        <span class="album-artista">{{ album.artista }}</span>
                        <span v-if="album.fecha" class="separador">·</span>
                        <span v-if="album.fecha" class="album-fecha">{{ album.fecha }}</span>
                        <span v-if="album.genero" class="separador">·</span>
                        <span v-if="album.genero" class="album-genero">{{ album.genero }}</span>
                        <span class="separador">·</span>
                        <span class="album-pistas">{{ canciones.length }} {{ canciones.length === 1 ? 'canción' : 'canciones' }}</span>
                    </div>
                    <div class="album-acciones">
                        <button
                            class="boton-reproducir-album"
                            :disabled="!canciones.length"
                            @click="reproducirTodo(false)"
                        >
                            <i class="fas fa-play"></i>
                            Reproducir
                        </button>

                        <button
                            v-if="!propiedades.cancionDirecta"
                            class="boton-aleatorio-album"
                            :disabled="!canciones.length"
                            @click="reproducirTodo(true)"
                            title="Reproducir en aleatorio"
                        >
                            <i class="fas fa-random"></i>
                            Aleatorio
                        </button>

                        <button
                            v-if="!propiedades.cancionDirecta"
                            class="boton-guardar-album"
                            :class="{ guardado }"
                            :disabled="cargandoGuardar"
                            @click="toggleGuardar"
                        >
                            <i v-if="cargandoGuardar" class="fas fa-spinner fa-spin"></i>
                            <template v-else>
                                <i :class="guardado ? 'fas fa-heart' : 'far fa-heart'"></i>
                                {{ guardado ? 'Guardado' : 'Guardar álbum' }}
                            </template>
                        </button>
                    </div>
                </div>
            </div>

            <!-- ================================================================
                 LISTA DE CANCIONES
            ================================================================ -->
            <div class="album-contenido">
                <section class="seccion">
                    <div class="lista-canciones-album">
                        <TarjetaCancion
                            v-for="(cancion, indice) in canciones"
                            :key="cancion.id"
                            :cancion="cancion"
                            :numero="indice + 1"
                            :mostrar-album="false"
                        />
                    </div>
                </section>
            </div>

        </template>
    </div>
</template>

<style scoped>
.pagina-album {
    min-height: 100%;
}

/* ================================================================
   CABECERA
================================================================ */
.album-cabecera {
    display: flex;
    gap: 32px;
    align-items: flex-end;
    padding: 32px 32px 28px;
    background: linear-gradient(to bottom, rgba(109,40,217,0.3) 0%, transparent 100%);
}

.album-portada-wrap {
    flex-shrink: 0;
}

.album-portada {
    width: 200px;
    height: 200px;
    border-radius: 8px;
    object-fit: cover;
    box-shadow: 0 12px 40px rgba(0,0,0,0.5);
}

.album-info {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 8px;
}

.album-tipo {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--texto-gris);
}

.album-titulo {
    font-size: 42px;
    font-weight: 800;
    color: var(--texto-blanco);
    margin: 0;
    line-height: 1.1;
    letter-spacing: -1px;
}

.album-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.album-artista {
    font-weight: 700;
    color: var(--texto-blanco);
    font-size: 14px;
}

.album-acciones {
    margin-top: 20px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.boton-reproducir-album {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: var(--morado);
    color: white;
    border: none;
    border-radius: 50px;
    padding: 14px 32px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 16px rgba(139,92,246,0.4);
}
.boton-reproducir-album:hover:not(:disabled) {
    background: var(--morado-claro);
    transform: scale(1.04);
}
.boton-reproducir-album:disabled { opacity: 0.45; cursor: default; }

.boton-aleatorio-album {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    border-radius: 50px;
    border: 2px solid rgba(255, 255, 255, 0.4);
    background: transparent;
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
}

.boton-aleatorio-album:hover:not(:disabled) {
    border-color: #fff;
    background: rgba(255, 255, 255, 0.1);
}

.boton-aleatorio-album:disabled { opacity: 0.45; cursor: default; }

.boton-guardar-album {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 22px;
    border-radius: 24px;
    border: 2px solid rgba(255, 255, 255, 0.5);
    background: transparent;
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.18s ease;
}

.boton-guardar-album:hover:not(:disabled) {
    border-color: #fff;
    background: rgba(255, 255, 255, 0.1);
}

.boton-guardar-album.guardado {
    background: var(--morado);
    border-color: var(--morado);
}

.boton-guardar-album.guardado:hover:not(:disabled) {
    background: transparent;
    border-color: #fff;
}

.boton-guardar-album:disabled {
    opacity: 0.6;
    cursor: default;
}

.album-fecha,
.album-genero,
.album-pistas {
    font-size: 14px;
    color: var(--texto-gris);
}

.separador {
    color: var(--texto-gris);
    font-size: 14px;
}

/* ================================================================
   CONTENIDO (canciones)
================================================================ */
.album-contenido {
    padding: 0 32px 32px;
}

.lista-canciones-album {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

/* Estado informativo */
.estado-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    gap: 16px;
    color: var(--texto-gris);
    text-align: center;
}

.estado-info i {
    font-size: 40px;
}

.estado-error {
    color: #ff6b6b;
}

.boton-reintentar {
    background: var(--morado);
    color: white;
    border: none;
    border-radius: 50px;
    padding: 10px 24px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}

/* ── Tablet ── */
@media (min-width: 769px) and (max-width: 1024px) {
    .album-cabecera {
        padding: 24px 24px 20px;
        gap: 24px;
    }
    .album-portada {
        width: 160px;
        height: 160px;
    }
    .album-titulo {
        font-size: 34px;
    }
    .album-contenido {
        padding: 0 24px 32px;
    }
}

/* ── Móvil ── */
@media (max-width: 768px) {
    .album-cabecera {
        flex-direction: column;
        align-items: center;
        padding: 20px 16px 16px;
        gap: 14px;
        text-align: center;
    }
    .album-portada {
        width: 150px;
        height: 150px;
    }
    .album-titulo {
        font-size: 24px;
        letter-spacing: -0.3px;
    }
    .album-meta {
        justify-content: center;
        font-size: 13px;
    }
    .album-acciones {
        margin-top: 10px;
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px;
    }
    .boton-reproducir-album {
        padding: 10px 22px;
        font-size: 14px;
    }
    .boton-aleatorio-album {
        padding: 9px 18px;
        font-size: 13px;
    }
    .boton-guardar-album {
        padding: 8px 16px;
        font-size: 13px;
    }
    .album-contenido {
        padding: 0 12px 80px;
    }
}
</style>
