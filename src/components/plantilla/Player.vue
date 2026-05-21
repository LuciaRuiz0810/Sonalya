<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { almacenApp, alternarFavorito, mostrarNotificacion, siguienteEnCola, anteriorEnCola, irACola, quitarDeCola, alternarAleatorio } from '@/stores/appStore'
import { musica } from '@/servicios/musica'
import { usuario as usuarioSvc } from '@/servicios/usuario'

const emitir = defineEmits(['navegar-artista'])

const buscandoArtista = ref(false)

async function irAlArtista() {
    if (!almacenApp.reproductor.artista || buscandoArtista.value) return

    // Si ya tenemos el ID, navegar directamente
    if (almacenApp.reproductor.artistaId) {
        emitir('navegar-artista', almacenApp.reproductor.artistaId)
        return
    }

    // Si no, buscar el artista por nombre
    buscandoArtista.value = true
    try {
        const resp = await musica.buscar(almacenApp.reproductor.artista)
        const primerArtista = resp.artistas?.[0]
        if (primerArtista) {
            const id = primerArtista.tipo === 'artista_plataforma'
                ? `plataforma_${primerArtista.id}`
                : primerArtista.id
            emitir('navegar-artista', id)
        } else {
            mostrarNotificacion('No se encontró el perfil del artista')
        }
    } catch (_) {
        mostrarNotificacion('No se pudo buscar el artista')
    } finally {
        buscandoArtista.value = false
    }
}

// Referencia al elemento <audio> nativo
const audioEl = ref(null)

// Evita contar la misma canción dos veces (pause + resume)
const reproduccionContada = ref(false)

// ============================================================
// Helpers
// ============================================================

function formatearTiempo(segundos) {
    if (!segundos || isNaN(segundos)) return '0:00'
    const s = Math.floor(segundos)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ============================================================
// Computed
// ============================================================

const iconoReproduccion = computed(() =>
    almacenApp.reproductor.reproduciendo ? 'fa-pause' : 'fa-play'
)

// Reactivo al Set global: si el Set está cargado, lo usa como fuente de verdad
const esFavoritoActual = computed(() => {
    const id = almacenApp.reproductor.deezerId
    if (!id) return false
    if (almacenApp.favsCancionesCargados) {
        return almacenApp.idsFavCanciones.has(String(id))
    }
    return almacenApp.reproductor.esFavorito
})

const iconoFavorito = computed(() =>
    esFavoritoActual.value ? 'fas fa-heart' : 'far fa-heart'
)

const hayCancion = computed(() => !!almacenApp.reproductor.titulo)

// ============================================================
// Watchers — sincronizan el store con el elemento <audio>
// ============================================================

// Cuando cambia la URL de preview: carga y reproduce.
// flush:'post' garantiza que el <audio> ya está en el DOM (el v-if puede acabar de montarlo)
watch(() => almacenApp.reproductor.previewUrl, (url) => {
    reproduccionContada.value = false
    if (!audioEl.value) return
    if (url) {
        audioEl.value.pause()
        audioEl.value.src = url
        audioEl.value.play()
            .then(() => { almacenApp.reproductor.reproduciendo = true })
            .catch((err) => {
                // AbortError ocurre cuando se cambia de canción rápido: no es un fallo real
                if (err.name !== 'AbortError') {
                    almacenApp.reproductor.reproduciendo = false
                }
            })
    } else {
        audioEl.value.pause()
        almacenApp.reproductor.reproduciendo = false
    }
}, { flush: 'post' })

// Sincroniza el volumen del store con el audio
watch(() => almacenApp.reproductor.volumen, (vol) => {
    if (audioEl.value) audioEl.value.volume = vol / 100
})

// ============================================================
// Controles manuales
// ============================================================

function togglePlayback() {
    if (!audioEl.value || !almacenApp.reproductor.previewUrl) return

    if (almacenApp.reproductor.reproduciendo) {
        audioEl.value.pause()
    } else {
        audioEl.value.play()
            .catch(() => { almacenApp.reproductor.reproduciendo = false })
    }
}

function alHacerClicEnProgreso(evento) {
    const rect = evento.currentTarget.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(100, ((evento.clientX - rect.left) / rect.width) * 100))
    almacenApp.reproductor.progreso = pct
    if (audioEl.value && audioEl.value.duration) {
        audioEl.value.currentTime = (pct / 100) * audioEl.value.duration
    }
}

// ── Volumen: drag + mute ──────────────────────────────────────────
const barraVolRef        = ref(null)
const arrastrando        = ref(false)
const volAntesDesilenciar = ref(70)

const iconoVolumen = computed(() => {
    const v = almacenApp.reproductor.volumen
    if (v === 0) return 'fas fa-volume-mute'
    if (v < 40)  return 'fas fa-volume-down'
    return 'fas fa-volume-up'
})

function calcularVol(clientX) {
    const rect = barraVolRef.value.getBoundingClientRect()
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
}

function iniciarArrastre(e) {
    e.preventDefault()
    arrastrando.value = true
    almacenApp.reproductor.volumen = calcularVol(e.clientX)
    document.addEventListener('mousemove', moverArrastre)
    document.addEventListener('mouseup',   terminarArrastre)
}

function moverArrastre(e) {
    if (!arrastrando.value) return
    almacenApp.reproductor.volumen = calcularVol(e.clientX)
}

function terminarArrastre() {
    arrastrando.value = false
    document.removeEventListener('mousemove', moverArrastre)
    document.removeEventListener('mouseup',   terminarArrastre)
    document.removeEventListener('touchmove', moverArrastreTactil)
    document.removeEventListener('touchend',  terminarArrastre)
}

function iniciarArrastreTactil(e) {
    e.preventDefault()
    arrastrando.value = true
    almacenApp.reproductor.volumen = calcularVol(e.touches[0].clientX)
    document.addEventListener('touchmove', moverArrastreTactil, { passive: false })
    document.addEventListener('touchend',  terminarArrastre)
}

function moverArrastreTactil(e) {
    if (!arrastrando.value) return
    e.preventDefault()
    almacenApp.reproductor.volumen = calcularVol(e.touches[0].clientX)
}

function toggleMute() {
    if (almacenApp.reproductor.volumen > 0) {
        volAntesDesilenciar.value = almacenApp.reproductor.volumen
        almacenApp.reproductor.volumen = 0
    } else {
        almacenApp.reproductor.volumen = volAntesDesilenciar.value || 70
    }
}

// ============================================================
// Eventos del elemento <audio>
// ============================================================

function alActualizarTiempo() {
    const el = audioEl.value
    if (!el || !el.duration) return
    almacenApp.reproductor.progreso    = (el.currentTime / el.duration) * 100
    almacenApp.reproductor.tiempoActual = formatearTiempo(el.currentTime)
}

function alCargarMetadatos() {
    const el = audioEl.value
    if (!el) return
    almacenApp.reproductor.duracion = formatearTiempo(el.duration)
    el.volume = almacenApp.reproductor.volumen / 100
}

function alReproducir() {
    almacenApp.reproductor.reproduciendo = true
    if (!reproduccionContada.value) {
        reproduccionContada.value = true
        const deezerId  = almacenApp.reproductor.deezerId
        const artistaId = almacenApp.reproductor.artistaId
        if (deezerId && String(deezerId).startsWith('plataforma_')) {
            const cancionId = parseInt(String(deezerId).replace('plataforma_', ''))
            const artiId    = artistaId ? parseInt(String(artistaId).replace('plataforma_', '')) : null
            if (cancionId && artiId) {
                usuarioSvc.reproducirCancionArtista(artiId, cancionId).catch(() => {})
            }
        }
    }
}
function alPausar()      { almacenApp.reproductor.reproduciendo = false }
function alTerminar() {
    siguienteEnCola()
}

onMounted(() => {
    audioEl.value.volume = almacenApp.reproductor.volumen / 100
})
</script>

<template>
    <!-- Panel de cola (se muestra encima del reproductor) -->
    <div v-if="almacenApp.mostrarCola && hayCancion" class="panel-cola">
        <div class="panel-cola-cabecera">
            <span>Cola de reproducción</span>
            <button class="panel-cola-cerrar" @click="almacenApp.mostrarCola = false">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="panel-cola-lista">
            <div
                v-for="(cancion, i) in almacenApp.cola"
                :key="i"
                class="cola-item"
                :class="{ 'cola-item-activo': i === almacenApp.indiceActual }"
                @click="irACola(i)"
            >
                <div class="cola-item-num">
                    <i v-if="i === almacenApp.indiceActual" class="fas fa-volume-up"></i>
                    <span v-else>{{ i + 1 }}</span>
                </div>
                <img v-if="cancion.imagen" :src="cancion.imagen" class="cola-item-img">
                <div v-else class="cola-item-img-vacia"><i class="fas fa-music"></i></div>
                <div class="cola-item-info">
                    <span class="cola-item-titulo">{{ cancion.titulo }}</span>
                    <span class="cola-item-artista">{{ cancion.artista }}</span>
                </div>
                <button class="cola-item-quitar" @click.stop="quitarDeCola(i)" title="Quitar de la cola">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    </div>

    <!-- Audio siempre en el DOM para que audioEl.value nunca sea null al reproducir -->
    <audio
        ref="audioEl"
        @timeupdate="alActualizarTiempo"
        @loadedmetadata="alCargarMetadatos"
        @play="alReproducir"
        @pause="alPausar"
        @ended="alTerminar"
        style="display:none"
    ></audio>

    <div v-if="hayCancion" class="reproductor">

        <!-- ============================================================
             IZQUIERDA: portada + info + favorito
        ============================================================ -->
        <div class="reproductor-izquierda">
            <img
                v-if="almacenApp.reproductor.imagen"
                :src="almacenApp.reproductor.imagen"
                :alt="almacenApp.reproductor.titulo"
            >
            <div v-else class="portada-vacia">
                <i class="fas fa-music"></i>
            </div>

            <div class="info-reproductor">
                <h4>{{ almacenApp.reproductor.titulo || 'Sin canción' }}</h4>
                <p
                    v-if="almacenApp.reproductor.artista"
                    class="artista-clickable"
                    :class="{ 'artista-buscando': buscandoArtista }"
                    @click="irAlArtista"
                >{{ almacenApp.reproductor.artista }}</p>
            </div>

            <button
                class="boton-icono"
                :class="{ activo: esFavoritoActual }"
                :disabled="!hayCancion"
                @click="alternarFavorito"
            >
                <i :class="iconoFavorito"></i>
            </button>
        </div>

        <!-- ============================================================
             CENTRO: controles + barra de progreso
        ============================================================ -->
        <div class="reproductor-centro">
            <div class="controles-reproductor">
                <button
                    class="boton-control boton-modo"
                    :class="{ activo: !almacenApp.aleatorio }"
                    title="En orden"
                    :disabled="!almacenApp.cola.length"
                    @click="almacenApp.aleatorio && alternarAleatorio()"
                >
                    <i class="fas fa-list-ol"></i>
                </button>

                <button
                    class="boton-control"
                    title="Anterior"
                    :disabled="almacenApp.indiceActual < 1"
                    @click="anteriorEnCola"
                >
                    <i class="fas fa-step-backward"></i>
                </button>

                <button
                    class="boton-control boton-reproducir-grande"
                    :disabled="!hayCancion || !almacenApp.reproductor.previewUrl"
                    @click="togglePlayback"
                    title="Reproducir/Pausar"
                >
                    <i :class="['fas', iconoReproduccion]"></i>
                </button>

                <button
                    class="boton-control"
                    title="Siguiente"
                    :disabled="almacenApp.indiceActual >= almacenApp.cola.length - 1"
                    @click="siguienteEnCola"
                >
                    <i class="fas fa-step-forward"></i>
                </button>

                <button
                    class="boton-control boton-modo"
                    :class="{ activo: almacenApp.aleatorio }"
                    title="Aleatorio"
                    :disabled="!almacenApp.cola.length"
                    @click="!almacenApp.aleatorio && alternarAleatorio()"
                >
                    <i class="fas fa-random"></i>
                </button>
            </div>

            <div class="progreso-reproductor">
                <span class="tiempo">{{ almacenApp.reproductor.tiempoActual }}</span>

                <div class="barra-progreso" @click="alHacerClicEnProgreso">
                    <div
                        class="relleno-progreso"
                        :style="{ width: almacenApp.reproductor.progreso + '%' }"
                    ></div>
                </div>

                <span class="tiempo">{{ almacenApp.reproductor.duracion }}</span>
            </div>
        </div>

        <!-- ============================================================
             DERECHA: cola + volumen
        ============================================================ -->
        <div class="reproductor-derecha">
            <button
                class="boton-icono"
                :class="{ activo: almacenApp.mostrarCola }"
                title="Cola de reproducción"
                @click="almacenApp.mostrarCola = !almacenApp.mostrarCola"
            >
                <i class="fas fa-list"></i>
            </button>

            <button class="boton-icono" title="Silenciar / Activar" @click="toggleMute">
                <i :class="iconoVolumen"></i>
            </button>

            <div class="barra-volumen" ref="barraVolRef" @mousedown="iniciarArrastre" @touchstart.prevent="iniciarArrastreTactil">
                <div
                    class="relleno-volumen"
                    :style="{ width: almacenApp.reproductor.volumen + '%' }"
                ></div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* ── Panel de cola ─────────────────────────────────────────────── */
.panel-cola {
    position: fixed;
    bottom: 90px;
    right: 16px;
    width: 360px;
    max-height: 60vh;
    background: #1a1a2e;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.7);
    z-index: 200;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.panel-cola-cabecera {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px 10px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--texto-gris);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
}

.panel-cola-cerrar {
    background: none;
    border: none;
    color: var(--texto-gris);
    cursor: pointer;
    font-size: 14px;
    padding: 4px 6px;
    border-radius: 6px;
    transition: background 0.15s, color 0.15s;
}
.panel-cola-cerrar:hover { background: rgba(255,255,255,0.1); color: var(--texto-blanco); }

.panel-cola-lista {
    overflow-y: auto;
    flex: 1;
}

.cola-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background 0.15s;
    border-radius: 8px;
    margin: 2px 6px;
}
.cola-item:hover { background: rgba(255,255,255,0.07); }
.cola-item-activo { background: rgba(139,92,246,0.15) !important; }

.cola-item-num {
    width: 20px;
    text-align: center;
    color: var(--texto-gris);
    font-size: 12px;
    flex-shrink: 0;
}
.cola-item-activo .cola-item-num { color: var(--morado); }

.cola-item-img {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
}
.cola-item-img-vacia {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    background: var(--fondo-tarjeta);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--texto-gris);
    font-size: 14px;
    flex-shrink: 0;
}

.cola-item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.cola-item-titulo {
    font-size: 13px;
    font-weight: 500;
    color: var(--texto-blanco);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.cola-item-activo .cola-item-titulo { color: var(--morado); }
.cola-item-artista {
    font-size: 12px;
    color: var(--texto-gris);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.cola-item-quitar {
    background: none;
    border: none;
    color: var(--texto-gris);
    cursor: pointer;
    font-size: 12px;
    padding: 4px 6px;
    border-radius: 4px;
    opacity: 0;
    transition: opacity 0.15s, background 0.15s, color 0.15s;
    flex-shrink: 0;
}
.cola-item:hover .cola-item-quitar { opacity: 1; }
.cola-item-quitar:hover { background: rgba(255,68,68,0.2); color: #ff6b6b; }

/* ── Estilos generales ─────────────────────────────────────────── */
.portada-vacia {
    width: 56px;
    height: 56px;
    border-radius: 6px;
    background: var(--fondo-tarjeta);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--texto-gris);
    font-size: 20px;
    flex-shrink: 0;
}

.boton-control:disabled,
.boton-reproducir-grande:disabled {
    opacity: 0.35;
    cursor: default;
}

.boton-modo { font-size: 13px; }
.boton-modo.activo { color: var(--morado); }
.boton-modo:not(:disabled):hover { color: var(--texto-blanco); }

.artista-clickable {
    cursor: pointer;
}

.artista-clickable:hover {
    text-decoration: underline;
}

.artista-buscando {
    opacity: 0.6;
    cursor: wait;
}

/* ── Tablet (769–1024 px): igual que PC pero algo más compacto ── */
@media (min-width: 769px) and (max-width: 1024px) {
    .reproductor-izquierda,
    .reproductor-derecha {
        min-width: 190px;
    }
    .reproductor-izquierda img,
    .portada-vacia {
        width: 48px;
        height: 48px;
    }
    .barra-volumen {
        width: 80px;
    }
    .panel-cola {
        width: 320px;
    }
}

/* ── Móvil (≤768 px): 2 filas, TODOS los controles visibles ── */
@media (max-width: 768px) {
    /* Panel cola: ocupa casi todo el ancho */
    .panel-cola {
        bottom: 88px;
        right: 8px;
        left: 8px;
        width: auto;
    }

    /* Reproductor en 2 filas */
    .reproductor {
        flex-wrap: wrap;
        height: auto;
        padding: 7px 10px 6px;
        gap: 0;
        row-gap: 3px;
        align-content: center;
    }

    /* ── Fila 1 izquierda: imagen + info + corazón ── */
    .reproductor-izquierda {
        order: 1;
        flex: 1;
        min-width: 0;
        gap: 7px;
    }
    .reproductor-izquierda img,
    .portada-vacia {
        width: 36px;
        height: 36px;
        border-radius: 5px;
        flex-shrink: 0;
        font-size: 14px;
    }
    .info-reproductor {
        min-width: 0;
        flex: 1;
    }
    .info-reproductor h4 {
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 2px;
    }
    .info-reproductor p {
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .reproductor-izquierda .boton-icono {
        font-size: 13px;
        padding: 5px 6px;
        flex-shrink: 0;
    }

    /* ── Fila 1 derecha: cola + mute + barra volumen ── */
    .reproductor-derecha {
        order: 2;
        display: flex;
        min-width: auto;
        gap: 0;
        justify-content: flex-end;
        flex-shrink: 0;
    }
    .reproductor-derecha .boton-icono {
        font-size: 13px;
        padding: 5px 6px;
    }
    .barra-volumen {
        width: 44px;
        align-self: center;
        margin-left: 2px;
    }

    /* ── Fila 2: botones modo + prev/play/next + barra progreso ── */
    .reproductor-centro {
        order: 3;
        width: 100%;
        flex: none;
        gap: 3px;
        max-width: none;
    }
    .controles-reproductor {
        gap: 5px;
    }
    /* Mostrar botones orden/aleatorio, más pequeños */
    .boton-modo {
        display: flex;
        font-size: 11px;
        padding: 3px 4px;
    }
    .boton-control {
        font-size: 12px;
        padding: 3px 5px;
    }
    .boton-reproducir-grande {
        width: 30px;
        height: 30px;
        font-size: 12px;
    }
    .progreso-reproductor {
        gap: 5px;
    }
    .tiempo {
        font-size: 10px;
        min-width: 26px;
    }
}
</style>
