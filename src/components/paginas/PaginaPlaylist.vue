<script setup>
import { ref, reactive, computed, watch } from 'vue'
import TarjetaCancion from '@/components/comunes/TarjetaCancion.vue'
import { usuario as usuarioSvc } from '@/servicios/usuario'
import { reproducirCola, mostrarNotificacion, almacenApp } from '@/stores/appStore'

const propiedades = defineProps({
    playlistId:     { type: Number, required: true },
    playlistNombre: { type: String, default: ''   },
    playlistImagen: { type: String, default: null },
})

const cargando  = ref(false)
const hayError  = ref(false)
const playlist  = ref(null)
const canciones = ref([])

// — Edición —
const editando       = ref(false)
const guardandoEdit  = ref(false)
const formulario     = reactive({ nombre: '', descripcion: '' })
const archivoImagen  = ref(null)
const previewImagen  = ref(null)
const inputImagen    = ref(null)

function abrirEditor() {
    formulario.nombre      = playlist.value?.nombre      || ''
    formulario.descripcion = playlist.value?.descripcion || ''
    archivoImagen.value    = null
    previewImagen.value    = null
    editando.value = true
}

function cerrarEditor() {
    if (previewImagen.value) URL.revokeObjectURL(previewImagen.value)
    previewImagen.value = null
    archivoImagen.value = null
    editando.value = false
}

function alSeleccionarImagen(e) {
    const file = e.target.files[0]
    if (!file) return
    if (previewImagen.value) URL.revokeObjectURL(previewImagen.value)
    archivoImagen.value = file
    previewImagen.value = URL.createObjectURL(file)
}

async function guardarEdicion() {
    if (!formulario.nombre.trim()) return
    guardandoEdit.value = true
    try {
        // 1. Guardar nombre y descripción
        const resp = await usuarioSvc.actualizarPlaylist(propiedades.playlistId, {
            nombre:      formulario.nombre.trim(),
            descripcion: formulario.descripcion.trim() || null,
        })
        playlist.value = resp.playlist

        // 2. Subir imagen si se seleccionó una
        if (archivoImagen.value) {
            const fd = new FormData()
            fd.append('imagen', archivoImagen.value)
            const respImg = await usuarioSvc.subirImagenPlaylist(propiedades.playlistId, fd)
            playlist.value = respImg.playlist
        }

        editando.value = false
        mostrarNotificacion('Playlist actualizada')

        // Sincronizar en almacenApp.misPlaylists
        const idx = almacenApp.misPlaylists.findIndex(p => p.id === propiedades.playlistId)
        if (idx !== -1) {
            almacenApp.misPlaylists[idx] = {
                ...almacenApp.misPlaylists[idx],
                nombre:      playlist.value.nombre,
                descripcion: playlist.value.descripcion,
                imagen:      playlist.value.imagen,
            }
        }
    } catch (_) {
        mostrarNotificacion('No se pudo actualizar la playlist')
    } finally {
        guardandoEdit.value = false
        archivoImagen.value = null
        previewImagen.value = null
    }
}

// Misma lógica de gradiente que TarjetaPlaylist
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

const gradientePortada = computed(() =>
    GRADIENTES[Math.abs(propiedades.playlistId) % GRADIENTES.length]
)

const letraPortada = computed(() =>
    (propiedades.playlistNombre || playlist.value?.nombre || '?').charAt(0).toUpperCase()
)

// PlaylistCancion → formato TarjetaCancion
const cancionesFormateadas = computed(() =>
    canciones.value.map(c => ({
        id:        c.deezer_id,
        deezer_id: c.deezer_id,
        titulo:    c.titulo,
        artista:   c.artista,
        imagen:    c.imagen  || null,
        duracion:  c.duracion || null,
        preview:   c.preview  || null,
        _pcId:     c.id,   // id local en playlist_canciones, para borrar
    }))
)

const hayCanciones   = computed(() => cancionesFormateadas.value.length > 0)
const cantidadTexto  = computed(() => {
    const n = canciones.value.length
    return n === 1 ? '1 canción' : `${n} canciones`
})

async function cargar(id) {
    try {
        cargando.value = true
        hayError.value = false
        const resp = await usuarioSvc.obtenerPlaylist(id)
        playlist.value  = resp.playlist
        canciones.value = resp.playlist.canciones || []
    } catch (_) {
        hayError.value = true
    } finally {
        cargando.value = false
    }
}

function reproducirTodo(aleatorio = false) {
    reproducirCola(cancionesFormateadas.value, 0, aleatorio, 'playlist', propiedades.playlistId)
}

async function eliminarCancion(cancion) {
    try {
        await usuarioSvc.quitarCancion(propiedades.playlistId, cancion._pcId)
        canciones.value = canciones.value.filter(c => c.id !== cancion._pcId)
        if (playlist.value) {
            playlist.value.canciones_count = Math.max(0, (playlist.value.canciones_count ?? 1) - 1)
        }
        mostrarNotificacion(`"${cancion.titulo}" eliminada de la playlist`)
    } catch (_) {
        mostrarNotificacion('No se pudo eliminar la canción')
    }
}

watch(() => propiedades.playlistId, (id) => { if (id) cargar(id) }, { immediate: true })
</script>

<template>
    <div class="pagina-playlist">

        <!-- Cargando -->
        <div v-if="cargando" class="estado-info">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando playlist...</p>
        </div>

        <!-- Error -->
        <div v-else-if="hayError" class="estado-info estado-error">
            <i class="fas fa-exclamation-circle"></i>
            <p>No se pudo cargar la playlist.</p>
            <button class="boton-reintentar" @click="cargar(playlistId)">Reintentar</button>
        </div>

        <template v-else-if="playlist">

            <!-- ================================================================
                 CABECERA
            ================================================================ -->
            <div class="playlist-cabecera">

                <!-- Portada -->
                <div class="playlist-portada-wrap">
                    <img
                        v-if="playlist.imagen"
                        :src="playlist.imagen"
                        :alt="playlist.nombre"
                        class="playlist-portada"
                    >
                    <div
                        v-else
                        class="playlist-portada playlist-portada-defecto"
                        :style="{ background: gradientePortada }"
                    >
                        <span class="portada-letra">{{ letraPortada }}</span>
                        <i class="fas fa-music portada-icono-fondo"></i>
                    </div>
                </div>

                <!-- Info -->
                <div class="playlist-info">
                    <span class="playlist-tipo">Playlist</span>
                    <h1 class="playlist-titulo">{{ playlist.nombre }}</h1>
                    <p v-if="playlist.descripcion" class="playlist-descripcion">{{ playlist.descripcion }}</p>
                    <div class="playlist-meta">
                        <span class="playlist-usuario">
                            <i class="fas fa-user-circle"></i>
                            {{ almacenApp.usuario.nombre || 'Tú' }}
                        </span>
                        <span class="separador">·</span>
                        <span class="playlist-cantidad">{{ cantidadTexto }}</span>
                    </div>

                    <div class="playlist-acciones">
                        <button
                            class="boton-reproducir-todo"
                            :disabled="!hayCanciones"
                            @click="reproducirTodo(false)"
                        >
                            <i class="fas fa-play"></i>
                            Reproducir todo
                        </button>
                        <button
                            class="boton-aleatorio-playlist"
                            :disabled="!hayCanciones"
                            @click="reproducirTodo(true)"
                            title="Reproducir en aleatorio"
                        >
                            <i class="fas fa-random"></i>
                            Aleatorio
                        </button>
                        <button
                            class="boton-editar-playlist"
                            @click="abrirEditor"
                            title="Editar playlist"
                        >
                            <i class="fas fa-pencil-alt"></i>
                            Editar
                        </button>
                    </div>
                </div>
            </div>

            <!-- ================================================================
                 CANCIONES
            ================================================================ -->
            <div class="playlist-contenido">

                <!-- Vacía -->
                <div v-if="!hayCanciones" class="estado-vacio">
                    <i class="fas fa-music"></i>
                    <p>Esta playlist está vacía</p>
                    <p class="estado-vacio-sub">Busca canciones y añádelas desde su menú</p>
                </div>

                <div v-else class="lista-canciones-playlist">
                    <TarjetaCancion
                        v-for="(cancion, i) in cancionesFormateadas"
                        :key="cancion._pcId"
                        :cancion="cancion"
                        :numero="i + 1"
                        :mostrar-album="false"
                        :mostrar-eliminar="true"
                        @eliminar="eliminarCancion"
                    />
                </div>
            </div>

        </template>
    </div>

    <!-- ================================================================
         MODAL EDICIÓN
    ================================================================ -->
    <Teleport to="body">
        <div v-if="editando" class="modal-overlay" @click.self="cerrarEditor">
            <div class="modal-edicion">
                <div class="modal-cabecera">
                    <h2>Editar playlist</h2>
                    <button class="modal-cerrar" @click="cerrarEditor">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="modal-cuerpo">
                    <!-- Portada clickable para seleccionar imagen -->
                    <div class="edicion-portada-preview" @click="inputImagen.click()" title="Cambiar portada">
                        <img
                            v-if="previewImagen || playlist?.imagen"
                            :src="previewImagen || playlist.imagen"
                            class="preview-img"
                        >
                        <div
                            v-else
                            class="preview-defecto"
                            :style="{ background: gradientePortada }"
                        >
                            <span>{{ (formulario.nombre || playlist?.nombre || '?').charAt(0).toUpperCase() }}</span>
                        </div>
                        <div class="portada-camara-overlay">
                            <i class="fas fa-camera"></i>
                        </div>
                        <input
                            ref="inputImagen"
                            type="file"
                            accept="image/*"
                            style="display:none"
                            @change="alSeleccionarImagen"
                        >
                    </div>

                    <div class="edicion-campos">
                        <label class="campo-label">
                            Nombre
                            <input
                                v-model="formulario.nombre"
                                class="campo-input"
                                placeholder="Nombre de la playlist"
                                maxlength="255"
                            >
                        </label>

                        <label class="campo-label">
                            Descripción
                            <textarea
                                v-model="formulario.descripcion"
                                class="campo-textarea"
                                placeholder="Añade una descripción (opcional)"
                                rows="3"
                            ></textarea>
                        </label>
                    </div>
                </div>

                <div class="modal-pie">
                    <button class="boton-cancelar-modal" @click="cerrarEditor">Cancelar</button>
                    <button
                        class="boton-guardar-modal"
                        :disabled="!formulario.nombre.trim() || guardandoEdit"
                        @click="guardarEdicion"
                    >
                        <i v-if="guardandoEdit" class="fas fa-spinner fa-spin"></i>
                        <template v-else>Guardar</template>
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.pagina-playlist {
    min-height: 100%;
}

/* ================================================================
   CABECERA
================================================================ */
.playlist-cabecera {
    display: flex;
    gap: 32px;
    align-items: flex-end;
    padding: 32px 32px 28px;
    background: linear-gradient(to bottom, rgba(109,40,217,0.3) 0%, transparent 100%);
}

.playlist-portada-wrap {
    flex-shrink: 0;
}

.playlist-portada {
    width: 200px;
    height: 200px;
    border-radius: 8px;
    object-fit: cover;
    box-shadow: 0 12px 40px rgba(0,0,0,0.5);
    display: block;
}

.playlist-portada-defecto {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}

.portada-letra {
    font-size: 80px;
    font-weight: 900;
    color: rgba(255,255,255,0.9);
    text-shadow: 0 2px 12px rgba(0,0,0,0.3);
    position: relative;
    z-index: 2;
    user-select: none;
    line-height: 1;
}

.portada-icono-fondo {
    position: absolute;
    bottom: -12px;
    right: -12px;
    font-size: 96px;
    color: rgba(255,255,255,0.15);
    transform: rotate(-15deg);
    pointer-events: none;
}

.playlist-info {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 8px;
    min-width: 0;
}

.playlist-tipo {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--texto-gris);
}

.playlist-titulo {
    font-size: 42px;
    font-weight: 800;
    color: var(--texto-blanco);
    margin: 0;
    line-height: 1.1;
    letter-spacing: -1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.playlist-descripcion {
    font-size: 14px;
    color: var(--texto-gris);
    margin: 0;
    max-width: 480px;
}

.playlist-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.playlist-usuario {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    color: var(--texto-blanco);
    font-size: 14px;
}

.playlist-usuario i {
    color: var(--morado);
}

.playlist-cantidad {
    font-size: 14px;
    color: var(--texto-gris);
}

.separador {
    color: var(--texto-gris);
    font-size: 14px;
}

.playlist-acciones {
    margin-top: 20px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.boton-reproducir-todo {
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

.boton-reproducir-todo:hover:not(:disabled) {
    background: var(--morado-claro);
    transform: scale(1.04);
}

.boton-reproducir-todo:disabled {
    opacity: 0.45;
    cursor: default;
}

.boton-aleatorio-playlist {
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

.boton-aleatorio-playlist:hover:not(:disabled) {
    border-color: #fff;
    background: rgba(255, 255, 255, 0.1);
}

.boton-aleatorio-playlist:disabled {
    opacity: 0.45;
    cursor: default;
}

/* ================================================================
   CONTENIDO
================================================================ */
.playlist-contenido {
    padding: 0 32px 40px;
}

.lista-canciones-playlist {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

/* Estado vacío */
.estado-vacio {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 220px;
    gap: 12px;
    color: var(--texto-gris);
    text-align: center;
}

.estado-vacio i {
    font-size: 48px;
    color: var(--morado);
    opacity: 0.4;
}

.estado-vacio p {
    font-size: 17px;
    font-weight: 600;
    color: var(--texto-blanco);
    margin: 0;
}

.estado-vacio-sub {
    font-size: 13px !important;
    font-weight: 400 !important;
    color: var(--texto-gris) !important;
}

/* Estado info (loading/error) */
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

.estado-info i { font-size: 40px; }
.estado-error  { color: #ff6b6b; }

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

/* Botón editar */
.boton-editar-playlist {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 22px;
    border-radius: 50px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    background: transparent;
    color: rgba(255, 255, 255, 0.75);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.boton-editar-playlist:hover {
    border-color: rgba(255, 255, 255, 0.7);
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
}

/* Modal overlay */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.72);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 900;
    padding: 20px;
    backdrop-filter: blur(4px);
}

.modal-edicion {
    background: #1e1e2e;
    border-radius: 16px;
    width: 100%;
    max-width: 520px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
    overflow: hidden;
}

.modal-cabecera {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.modal-cabecera h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--texto-blanco);
    margin: 0;
}

.modal-cerrar {
    background: none;
    border: none;
    color: var(--texto-gris);
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: color 0.15s;
}

.modal-cerrar:hover {
    color: #fff;
}

.modal-cuerpo {
    display: flex;
    gap: 20px;
    padding: 20px 24px;
    align-items: flex-start;
}

.edicion-portada-preview {
    flex-shrink: 0;
    position: relative;
    width: 100px;
    height: 100px;
    cursor: pointer;
    border-radius: 8px;
    overflow: hidden;
}

.edicion-portada-preview:hover .portada-camara-overlay {
    opacity: 1;
}

.portada-camara-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.18s;
    border-radius: 8px;
    font-size: 22px;
    color: #fff;
}

.preview-img,
.preview-defecto {
    width: 100px;
    height: 100px;
    border-radius: 8px;
    object-fit: cover;
    display: block;
}

.preview-defecto {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.85);
}

.edicion-campos {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
}

.campo-label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: var(--texto-gris);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.campo-input,
.campo-textarea {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 10px 12px;
    color: var(--texto-blanco);
    font-size: 14px;
    font-family: inherit;
    transition: border-color 0.15s;
    resize: none;
    width: 100%;
    box-sizing: border-box;
}

.campo-input:focus,
.campo-textarea:focus {
    outline: none;
    border-color: var(--morado);
}

.modal-pie {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 24px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.boton-cancelar-modal {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.7);
    border-radius: 50px;
    padding: 10px 22px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
}

.boton-cancelar-modal:hover {
    border-color: rgba(255, 255, 255, 0.5);
    color: #fff;
}

.boton-guardar-modal {
    background: var(--morado);
    border: none;
    color: #fff;
    border-radius: 50px;
    padding: 10px 28px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    min-width: 90px;
}

.boton-guardar-modal:hover:not(:disabled) {
    background: var(--morado-claro);
}

.boton-guardar-modal:disabled {
    opacity: 0.45;
    cursor: default;
}
</style>
