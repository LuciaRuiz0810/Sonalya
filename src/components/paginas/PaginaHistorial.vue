<script setup>
import { ref, onMounted } from 'vue'
import { almacenApp, actualizarReproductor, abrirModalAuth, cacheGuardar, cacheObtener } from '@/stores/appStore'
import { usuario as usuarioSvc } from '@/servicios/usuario'

const historial  = ref([])
const cargando   = ref(false)

function formatearFecha(fechaStr) {
    // Normalizar a ISO con zona horaria para que new Date() lo interprete como UTC
    const iso = typeof fechaStr === 'string' && !fechaStr.includes('T')
        ? fechaStr.replace(' ', 'T') + 'Z'
        : fechaStr
    const fecha = new Date(iso)
    const ahora = new Date()
    const diff  = ahora - fecha
    const mins  = Math.floor(diff / 60000)
    const horas = Math.floor(diff / 3600000)
    const dias  = Math.floor(diff / 86400000)
    if (mins  < 1)  return 'Ahora mismo'
    if (mins  < 60) return `Hace ${mins} min`
    if (horas < 24) return `Hace ${horas}h`
    if (dias  < 7)  return `Hace ${dias} día${dias > 1 ? 's' : ''}`
    return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function reproducir(entrada) {
    actualizarReproductor(
        entrada.titulo,
        entrada.artista,
        entrada.imagen,
        entrada.preview || null,
        entrada.deezer_id,
        entrada.tipo
    )
}

async function cargar() {
    if (!almacenApp.autenticado) return
    const cached = cacheObtener('historial')
    if (cached) { historial.value = cached; return }
    try {
        cargando.value = true
        const resp = await usuarioSvc.historial()
        historial.value = resp.historial || []
        cacheGuardar('historial', historial.value, 2 * 60_000)  // 2 min
    } catch (_) {
        historial.value = []
    } finally {
        cargando.value = false
    }
}

onMounted(cargar)
</script>

<template>
    <div class="contenedor-contenido">
        <h1 class="titulo-pagina">Historial de reproducción</h1>

        <!-- Sin sesión -->
        <div v-if="!almacenApp.autenticado" class="estado-vacio">
            <i class="fas fa-history"></i>
            <p>Inicia sesión para ver tu historial</p>
            <button class="boton-principal" @click="abrirModalAuth('login')">Iniciar sesión</button>
        </div>

        <!-- Cargando -->
        <div v-else-if="cargando" class="estado-cargando">
            <i class="fas fa-spinner fa-spin"></i> Cargando historial...
        </div>

        <!-- Vacío -->
        <div v-else-if="historial.length === 0" class="estado-vacio">
            <i class="fas fa-history"></i>
            <p>Aún no has reproducido ninguna canción</p>
            <p class="estado-vacio-sub">Las canciones que escuches aparecerán aquí</p>
        </div>

        <!-- Lista -->
        <div v-else class="lista-historial">
            <div
                v-for="entrada in historial"
                :key="entrada.id"
                class="fila-historial"
                @click="reproducir(entrada)"
            >
                <img
                    v-if="entrada.imagen"
                    :src="entrada.imagen"
                    :alt="entrada.titulo"
                    class="imagen-historial"
                >
                <div v-else class="imagen-historial imagen-vacia">
                    <i class="fas fa-music"></i>
                </div>

                <div class="info-historial">
                    <span class="titulo-historial">{{ entrada.titulo }}</span>
                    <span class="artista-historial">{{ entrada.artista }}</span>
                </div>

                <span class="tipo-historial">
                    <i :class="entrada.tipo === 'album' ? 'fas fa-compact-disc' : 'fas fa-music'"></i>
                    {{ entrada.tipo === 'album' ? 'Álbum' : 'Canción' }}
                </span>

                <span class="fecha-historial">{{ formatearFecha(entrada.reproducido_at) }}</span>

                <button class="boton-icono boton-play-historial">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.titulo-pagina {
    font-size: 32px;
    font-weight: 800;
    margin-bottom: 28px;
    color: var(--texto-blanco);
}

.estado-vacio {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    gap: 16px;
    color: var(--texto-gris);
    text-align: center;
}

.estado-vacio i {
    font-size: 56px;
    color: var(--morado);
    opacity: 0.5;
}

.estado-vacio p {
    font-size: 17px;
    font-weight: 600;
    color: var(--texto-blanco);
}

.estado-vacio-sub {
    font-size: 14px !important;
    font-weight: 400 !important;
    color: var(--texto-gris) !important;
}

.estado-cargando {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    color: var(--texto-gris);
    gap: 10px;
    font-size: 15px;
}

.lista-historial {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.fila-historial {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 16px;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.18s ease;
}

.fila-historial:hover {
    background: var(--fondo-tarjeta);
}

.fila-historial:hover .boton-play-historial {
    opacity: 1;
}

.imagen-historial {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
}

.imagen-vacia {
    background: var(--fondo-tarjeta);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--texto-gris);
    font-size: 18px;
}

.info-historial {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
}

.titulo-historial {
    font-size: 14px;
    font-weight: 600;
    color: var(--texto-blanco);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.artista-historial {
    font-size: 12px;
    color: var(--texto-gris);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tipo-historial {
    font-size: 12px;
    color: var(--texto-gris);
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 70px;
    flex-shrink: 0;
}

.fecha-historial {
    font-size: 12px;
    color: var(--texto-gris);
    min-width: 90px;
    text-align: right;
    flex-shrink: 0;
}

.boton-play-historial {
    opacity: 0;
    transition: opacity 0.2s;
    flex-shrink: 0;
}
</style>
