<script setup>
import { ref, computed, watch } from 'vue'
import TarjetaCancion from '@/components/comunes/TarjetaCancion.vue'
import TarjetaPlaylist from '@/components/comunes/TarjetaPlaylist.vue'
import { musica } from '@/servicios/musica'
import { almacenApp, abrirModalAuth, mostrarNotificacion, cacheGuardar, cacheObtener, cacheLimpiar } from '@/stores/appStore'
import { usuario as usuarioSvc } from '@/servicios/usuario'

const propiedades = defineProps({
    artistaId: { type: Number, required: true }
})

const emitir = defineEmits(['abrirPlaylist'])

const cargando        = ref(true)
const hayError        = ref(false)
const artista         = ref(null)
const canciones       = ref([])
const albumes         = ref([])
const relacionados    = ref([])
const bio             = ref(null)
const bioDesc         = ref(null)
const bioExpandida    = ref(false)
const siguiendo       = ref(false)
const cargandoSeguir  = ref(false)

const LIMITE_BIO = 1000

const bioCorta = computed(() => {
    if (!bio.value) return null
    return bio.value.length > LIMITE_BIO
        ? bio.value.slice(0, LIMITE_BIO) + '…'
        : bio.value
})

const estiloHero = computed(() => ({
    backgroundImage: artista.value?.imagen ? `url(${artista.value.imagen})` : 'none',
}))

const TTL_ARTISTA = 15 * 60_000  // 15 min

async function cargar(id) {
    const cacheKey = `artista_${id}`
    const cached = cacheObtener(cacheKey)
    bioExpandida.value = false
    if (cached) {
        artista.value      = cached.artista
        canciones.value    = cached.canciones
        albumes.value      = cached.albumes
        relacionados.value = cached.relacionados
        bio.value          = cached.bio
        bioDesc.value      = cached.bioDesc
        siguiendo.value    = cached.siguiendo ?? false
        cargando.value     = false
        return
    }
    try {
        cargando.value = true
        hayError.value = false
        const resp = await musica.obtenerArtista(id)
        artista.value      = resp.artista
        canciones.value    = resp.canciones
        albumes.value      = resp.albumes
        relacionados.value = resp.relacionados || []
        bio.value          = resp.bio     || null
        bioDesc.value      = resp.bioDesc || null

        if (almacenApp.autenticado) {
            const estado = await usuarioSvc.estadoFavorito('artista', id)
            siguiendo.value = estado.esFavorito
        }
        cacheGuardar(cacheKey, {
            artista:      artista.value,
            canciones:    canciones.value,
            albumes:      albumes.value,
            relacionados: relacionados.value,
            bio:          bio.value,
            bioDesc:      bioDesc.value,
            siguiendo:    siguiendo.value,
        }, TTL_ARTISTA)
    } catch (_) {
        hayError.value = true
    } finally {
        cargando.value = false
    }
}

async function toggleSeguir() {
    if (!almacenApp.autenticado) {
        abrirModalAuth('login')
        return
    }
    if (cargandoSeguir.value) return
    cargandoSeguir.value = true
    try {
        if (siguiendo.value) {
            await usuarioSvc.dejarSeguirArtista(propiedades.artistaId)
            siguiendo.value = false
            mostrarNotificacion(`Has dejado de seguir a ${artista.value.nombre}`)
        } else {
            await usuarioSvc.seguirArtista({
                deezer_id: String(propiedades.artistaId),
                nombre:    artista.value.nombre,
                imagen:    artista.value.imagen || artista.value.imagenMedium || '',
            })
            siguiendo.value = true
            mostrarNotificacion(`Ahora sigues a ${artista.value.nombre}`)
        }
        // Actualizar el campo siguiendo en caché
        const entrada = cacheObtener(`artista_${propiedades.artistaId}`)
        if (entrada) cacheGuardar(`artista_${propiedades.artistaId}`, { ...entrada, siguiendo: siguiendo.value }, TTL_ARTISTA)
        // Invalidar eventos seguidos por si aparece/desaparece este artista
        cacheLimpiar(['eventos_seguidos'])
    } catch (_) {
        mostrarNotificacion('No se pudo completar la acción')
    } finally {
        cargandoSeguir.value = false
    }
}

watch(() => propiedades.artistaId, (id) => cargar(id), { immediate: true })
</script>

<template>
    <div class="pagina-artista">

        <!-- Cargando -->
        <div v-if="cargando" class="estado-info">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando artista...</p>
        </div>

        <!-- Error -->
        <div v-else-if="hayError" class="estado-info estado-error">
            <i class="fas fa-exclamation-circle"></i>
            <p>No se pudo cargar el artista.</p>
            <button class="boton-reintentar" @click="cargar(propiedades.artistaId)">Reintentar</button>
        </div>

        <template v-else-if="artista">

            <!-- ============================================================
                 HERO: imagen de fondo + foto + nombre + fans
            ============================================================ -->
            <div class="artista-hero" :style="estiloHero">
                <div class="artista-hero-overlay">
                    <div class="artista-hero-contenido">
                        <img
                            :src="artista.imagenMedium"
                            :alt="artista.nombre"
                            class="artista-avatar"
                        >
                        <div class="artista-meta">
                            <span class="artista-etiqueta">
                                <i class="fas fa-check-circle"></i> Artista verificado
                            </span>
                            <h1 class="artista-nombre-grande">{{ artista.nombre }}</h1>
                            <p class="artista-fans">{{ artista.fans }} seguidores</p>
                            <button
                                class="boton-seguir"
                                :class="{ 'siguiendo': siguiendo }"
                                :disabled="cargandoSeguir"
                                @click="toggleSeguir"
                            >
                                <i v-if="cargandoSeguir" class="fas fa-spinner fa-spin"></i>
                                <template v-else>
                                    <i :class="siguiendo ? 'fas fa-check' : 'fas fa-plus'"></i>
                                    {{ siguiendo ? 'Siguiendo' : 'Seguir' }}
                                </template>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ============================================================
                 CONTENIDO: canciones + bio + álbumes + relacionados
            ============================================================ -->
            <div class="artista-contenido">

                <!-- Top canciones -->
                <section class="seccion" v-if="canciones.length">
                    <h2 class="titulo-seccion">Canciones populares</h2>
                    <div class="lista-canciones-artista">
                        <TarjetaCancion
                            v-for="(cancion, indice) in canciones"
                            :key="cancion.id"
                            :cancion="cancion"
                            :numero="indice + 1"
                            :mostrar-album="true"
                        />
                    </div>
                </section>

                <!-- Álbumes -->
                <section class="seccion" v-if="albumes.length">
                    <h2 class="titulo-seccion">Discografía</h2>
                    <div class="cuadricula-tarjetas">
                        <TarjetaPlaylist
                            v-for="album in albumes"
                            :key="album.id"
                            :playlist="album"
                            @click="emitir('abrirPlaylist', $event)"
                        />
                    </div>
                </section>

                <!-- Artistas relacionados -->
                <section class="seccion" v-if="relacionados.length">
                    <h2 class="titulo-seccion">Artistas relacionados</h2>
                    <div class="cuadricula-tarjetas">
                        <TarjetaPlaylist
                            v-for="rel in relacionados"
                            :key="rel.id"
                            :playlist="rel"
                            @click="emitir('abrirPlaylist', $event)"
                        />
                    </div>
                </section>

                <!-- Biografía (al final) -->
                <section class="seccion seccion-bio" v-if="bio">
                    <h2 class="titulo-seccion">Sobre el artista</h2>
                    <div class="bio-wrap">

                        <!-- Descripción corta + stats -->
                        <div class="bio-cabecera">
                            <span v-if="bioDesc" class="bio-desc-pill">
                                <i class="fas fa-music"></i>
                                {{ bioDesc }}
                            </span>
                            <div class="bio-stats">
                                <span class="bio-stat" v-if="albumes.length">
                                    <i class="fas fa-compact-disc"></i>
                                    {{ albumes.length >= 12 ? '12+' : albumes.length }} álbumes
                                </span>
                                <span class="bio-stat">
                                    <i class="fas fa-users"></i>
                                    {{ artista.fans }} oyentes
                                </span>
                            </div>
                        </div>

                        <!-- Texto principal -->
                        <p class="bio-texto">
                            {{ bioExpandida ? bio : bioCorta }}
                        </p>

                        <div class="bio-pie">
                            <button
                                v-if="bio.length > LIMITE_BIO"
                                class="bio-toggle"
                                @click="bioExpandida = !bioExpandida"
                            >
                                {{ bioExpandida ? 'Ver menos' : 'Ver más' }}
                                <i :class="bioExpandida ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                            </button>
                            <p class="bio-fuente">Fuente: Wikipedia</p>
                        </div>
                    </div>
                </section>

            </div>
        </template>
    </div>
</template>

<style scoped>
/* ============================================================
   HERO
============================================================ */
.artista-hero {
    width: 100%;
    min-height: 340px;
    background-size: cover;
    background-position: center top;
    position: relative;
}

.artista-hero-overlay {
    min-height: 340px;
    background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.25) 0%,
        rgba(18, 18, 18, 0.85) 70%,
        var(--fondo-principal) 100%
    );
    display: flex;
    align-items: flex-end;
    padding: 0 32px 36px;
}

.artista-hero-contenido {
    display: flex;
    align-items: flex-end;
    gap: 28px;
}

.artista-avatar {
    width: 160px;
    height: 160px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    flex-shrink: 0;
    border: 3px solid rgba(255, 255, 255, 0.15);
}

.artista-meta {
    padding-bottom: 8px;
}

.artista-etiqueta {
    font-size: 12px;
    font-weight: 700;
    color: var(--morado-claro, #a78bfa);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
}

.artista-nombre-grande {
    font-size: clamp(32px, 6vw, 72px);
    font-weight: 900;
    color: #fff;
    line-height: 1.05;
    margin-bottom: 14px;
    text-shadow: 0 2px 8px rgba(0,0,0,0.5);
}

.artista-fans {
    font-size: 15px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
    margin-bottom: 16px;
}

.boton-seguir {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    border-radius: 24px;
    border: 2px solid rgba(255, 255, 255, 0.7);
    background: transparent;
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 0.04em;
    transition: all 0.18s ease;
}

.boton-seguir:hover:not(:disabled) {
    border-color: #fff;
    background: rgba(255, 255, 255, 0.1);
}

.boton-seguir.siguiendo {
    background: var(--morado);
    border-color: var(--morado);
}

.boton-seguir.siguiendo:hover:not(:disabled) {
    background: transparent;
    border-color: #fff;
}

.boton-seguir:disabled {
    opacity: 0.6;
    cursor: default;
}

/* ============================================================
   CONTENIDO
============================================================ */
.artista-contenido {
    padding: 8px 32px 80px;
}

.lista-canciones-artista {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

/* ============================================================
   ESTADOS
============================================================ */
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

/* ============================================================
   BIOGRAFÍA
============================================================ */
.seccion-bio {
    max-width: 820px;
}

.bio-wrap {
    background: rgba(255, 255, 255, 0.04);
    border-radius: 14px;
    padding: 24px 28px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 16px;
}

/* Cabecera: pill descriptivo + stats */
.bio-cabecera {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.bio-desc-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(139, 92, 246, 0.18);
    border: 1px solid rgba(139, 92, 246, 0.35);
    color: #c4b5fd;
    font-size: 13px;
    font-weight: 600;
    padding: 5px 14px;
    border-radius: 50px;
    text-transform: capitalize;
}

.bio-desc-pill i {
    font-size: 11px;
    opacity: 0.8;
}

.bio-stats {
    display: flex;
    gap: 20px;
    margin-left: auto;
}

.bio-stat {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
}

.bio-stat i {
    color: var(--morado-claro, #a78bfa);
    font-size: 12px;
}

/* Texto principal */
.bio-texto {
    font-size: 15px;
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.82);
    margin: 0;
    white-space: pre-line;
}

/* Pie: toggle + fuente */
.bio-pie {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 4px;
}

.bio-toggle {
    background: none;
    border: none;
    color: var(--morado-claro, #a78bfa);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: opacity 0.15s;
}

.bio-toggle:hover {
    opacity: 0.75;
}

.bio-fuente {
    margin: 0;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.28);
}

/* ── Tablet ── */
@media (min-width: 769px) and (max-width: 1024px) {
    .artista-hero { min-height: 300px; }
    .artista-hero-overlay { min-height: 300px; padding: 0 24px 28px; }
    .artista-avatar { width: 120px; height: 120px; }
    .artista-nombre-grande { font-size: 48px; }
    .artista-contenido { padding: 8px 24px 60px; }
}

/* ── Móvil ── */
@media (max-width: 768px) {
    .artista-hero { min-height: 260px; }
    .artista-hero-overlay { min-height: 260px; padding: 0 14px 20px; }
    .artista-hero-contenido { gap: 12px; }
    .artista-avatar { width: 76px; height: 76px; }
    .artista-nombre-grande { font-size: 24px; margin-bottom: 6px; }
    .artista-fans { font-size: 12px; margin-bottom: 10px; }
    .boton-seguir { padding: 8px 18px; font-size: 13px; }
    .artista-etiqueta { font-size: 11px; margin-bottom: 6px; }
    .artista-contenido { padding: 6px 14px 80px; }
    .bio-wrap { padding: 14px; }
    .bio-stats { margin-left: 0; flex-wrap: wrap; gap: 8px; }
    .bio-cabecera { flex-direction: column; align-items: flex-start; }
    .bio-texto { font-size: 14px; }
}

/* ── Móvil muy pequeño (≤ 400px) ── */
@media (max-width: 400px) {
    .artista-hero { min-height: 220px; }
    .artista-hero-overlay { min-height: 220px; padding: 0 12px 16px; }
    .artista-avatar { width: 60px; height: 60px; }
    .artista-nombre-grande { font-size: 20px; }
    .artista-contenido { padding: 4px 10px 80px; }
}
</style>
