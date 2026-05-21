<script setup>
import { ref, onMounted, computed } from 'vue'
import TarjetaPlaylist from '@/components/comunes/TarjetaPlaylist.vue'
import TarjetaCancion  from '@/components/comunes/TarjetaCancion.vue'
import Modal           from '@/components/comunes/Modal.vue'
import PaginaPerfilArtista from '@/components/paginas/PaginaPerfilArtista.vue'
import { almacenApp, sincronizarUsuario, mostrarNotificacion, abrirModalAuth } from '@/stores/appStore'
import { api }          from '@/servicios/api'
import { usuario as usuarioSvc } from '@/servicios/usuario'

const emitir = defineEmits(['abrirPlaylist'])

// ── Navegación por pestañas ───────────────────────────────────────────────────
const pestanaActiva = ref('playlists')
const pestanas = [
    { id: 'playlists', nombre: 'Mis Playlists' },
    { id: 'favoritos', nombre: 'Favoritos'      },
    { id: 'artistas',  nombre: 'Artistas'       },
]

// ── Estado general ────────────────────────────────────────────────────────────
const cargandoPerfil = ref(false)

// ── Playlists ─────────────────────────────────────────────────────────────────
const misPlaylists          = ref([])
const cargandoPlaylists     = ref(false)
const mostrarModalPlaylist  = ref(false)
const nombreNuevaPlaylist   = ref('')
const guardandoPlaylist     = ref(false)

async function cargarPlaylists() {
    if (!almacenApp.autenticado) return
    try {
        cargandoPlaylists.value = true
        const resp = await usuarioSvc.playlists()
        misPlaylists.value = resp.playlists || []
    } catch (_) {
        misPlaylists.value = []
    } finally {
        cargandoPlaylists.value = false
    }
}

async function crearPlaylist() {
    if (!nombreNuevaPlaylist.value.trim()) return
    try {
        guardandoPlaylist.value = true
        const resp = await usuarioSvc.crearPlaylist({ nombre: nombreNuevaPlaylist.value.trim() })
        misPlaylists.value.unshift(resp.playlist)
        nombreNuevaPlaylist.value = ''
        mostrarModalPlaylist.value = false
        mostrarNotificacion('Playlist creada')
    } catch (_) {
        mostrarNotificacion('Error al crear la playlist')
    } finally {
        guardandoPlaylist.value = false
    }
}

async function eliminarPlaylist(playlist) {
    try {
        await usuarioSvc.eliminarPlaylist(playlist.id)
        misPlaylists.value = misPlaylists.value.filter(p => p.id !== playlist.id)
        mostrarNotificacion('Playlist eliminada')
    } catch (_) {
        mostrarNotificacion('Error al eliminar la playlist')
    }
}

// ── Favoritos — canciones ─────────────────────────────────────────────────────
const cancionesFav      = ref([])
const cargandoFavCanciones = ref(false)
const subtabFav         = ref('canciones') // 'canciones' | 'albumes'

async function cargarCancionesFav() {
    if (!almacenApp.autenticado) return
    try {
        cargandoFavCanciones.value = true
        const resp = await usuarioSvc.cancionesFav()
        cancionesFav.value = resp.canciones || []
    } catch (_) {
        cancionesFav.value = []
    } finally {
        cargandoFavCanciones.value = false
    }
}

// ── Favoritos — álbumes ───────────────────────────────────────────────────────
const albumesFav         = ref([])
const cargandoFavAlbumes = ref(false)

async function cargarAlbumesFav() {
    if (!almacenApp.autenticado) return
    try {
        cargandoFavAlbumes.value = true
        const resp = await usuarioSvc.albumesFav()
        albumesFav.value = (resp.albumes || []).map(a => ({
            ...a,
            id:          a.deezer_id,   // el id que usa TarjetaPlaylist para llamar obtenerAlbum
            nombre:      a.nombre,
            descripcion: a.artista,
            tipo:        'album',
        }))
    } catch (_) {
        albumesFav.value = []
    } finally {
        cargandoFavAlbumes.value = false
    }
}

function alCambiarSubtabFav(tab) {
    subtabFav.value = tab
    if (tab === 'canciones' && cancionesFav.value.length === 0) cargarCancionesFav()
    if (tab === 'albumes'   && albumesFav.value.length   === 0) cargarAlbumesFav()
}

// ── Artistas seguidos ─────────────────────────────────────────────────────────
const artistasSeguidos     = ref([])
const cargandoArtistas     = ref(false)

async function cargarArtistas() {
    if (!almacenApp.autenticado) return
    try {
        cargandoArtistas.value = true
        const resp = await usuarioSvc.artistasSeguidos()
        artistasSeguidos.value = resp.artistas || []
    } catch (_) {
        artistasSeguidos.value = []
    } finally {
        cargandoArtistas.value = false
    }
}

async function dejarDeSeguir(artista) {
    try {
        await usuarioSvc.dejarSeguirArtista(artista.deezer_id)
        artistasSeguidos.value = artistasSeguidos.value.filter(a => a.id !== artista.id)
        mostrarNotificacion(`Dejaste de seguir a ${artista.nombre}`)
    } catch (_) {
        mostrarNotificacion('Error al dejar de seguir')
    }
}

function verArtista(artista) {
    emitir('abrirPlaylist', { tipo: 'artista', id: Number(artista.deezer_id), nombre: artista.nombre })
}

function alToggleFavCancion(cancion, estado) {
    if (!estado) {
        cancionesFav.value = cancionesFav.value.filter(c => String(c.deezer_id) !== String(cancion.id))
    }
}

// ── Estadísticas del header ───────────────────────────────────────────────────
const cantidadPlaylists = computed(() => misPlaylists.value.length)
const cantidadFav       = computed(() => cancionesFav.value.length)
const cantidadArtistas  = computed(() => artistasSeguidos.value.length)

// ── Carga inicial ─────────────────────────────────────────────────────────────
onMounted(async () => {
    if (!almacenApp.autenticado) return
    cargandoPerfil.value = true
    try {
        const respuesta = await api.get('/usuario/perfil')
        sincronizarUsuario(respuesta.data)
    } catch (_) {}
    finally { cargandoPerfil.value = false }

    cargarPlaylists()
    cargarCancionesFav()
    cargarArtistas()
})

// ── Modal cambiar contraseña ──────────────────────────────────────────────────
const mostrarModalPassword    = ref(false)
const guardandoPassword       = ref(false)
const erroresPassword         = ref({})
const errorGeneralPassword    = ref('')
const formularioPassword      = ref({ password_actual: '', password: '', password_confirmation: '' })

async function cambiarPassword() {
    guardandoPassword.value    = true
    erroresPassword.value      = {}
    errorGeneralPassword.value = ''
    try {
        const resp = await usuarioSvc.cambiarPassword({
            password_actual:       formularioPassword.value.password_actual,
            password:              formularioPassword.value.password,
            password_confirmation: formularioPassword.value.password_confirmation,
        })
        if (resp.data?.token) {
            almacenApp.token = resp.data.token
            localStorage.setItem('token_auth', resp.data.token)
        }
        mostrarModalPassword.value = false
        formularioPassword.value   = { password_actual: '', password: '', password_confirmation: '' }
        mostrarNotificacion('Contraseña cambiada correctamente.')
    } catch (error) {
        erroresPassword.value      = error.errors || {}
        errorGeneralPassword.value = error.message || 'Error al cambiar la contraseña.'
    } finally {
        guardandoPassword.value = false
    }
}

// ── Modal editar perfil ───────────────────────────────────────────────────────
const mostrarModalEditarPerfil = ref(false)
const cargandoGuardar          = ref(false)
const erroresPerfil            = ref({})
const errorGeneralPerfil       = ref('')

const formularioPerfil = ref({ nombre: '', correo: '', nombreUsuario: '', biografia: '' })
const archivoAvatar      = ref(null)
const vistaAvatarPrevia  = ref(null)
const inputAvatarRef     = ref(null)

function abrirEdicion() {
    formularioPerfil.value = {
        nombre:        almacenApp.usuario.nombre,
        correo:        almacenApp.usuario.correo,
        nombreUsuario: almacenApp.usuario.nombreUsuario,
        biografia:     almacenApp.usuario.biografia || '',
    }
    archivoAvatar.value      = null
    vistaAvatarPrevia.value  = null
    erroresPerfil.value      = {}
    errorGeneralPerfil.value = ''
    mostrarModalEditarPerfil.value = true
}

function alSeleccionarAvatar(evento) {
    const archivo = evento.target.files[0]
    if (!archivo) return
    archivoAvatar.value     = archivo
    vistaAvatarPrevia.value = URL.createObjectURL(archivo)
}

async function guardarPerfil() {
    cargandoGuardar.value    = true
    erroresPerfil.value      = {}
    errorGeneralPerfil.value = ''
    try {
        let respuesta
        if (archivoAvatar.value) {
            const formData = new FormData()
            formData.append('nombre',         formularioPerfil.value.nombre)
            formData.append('nombre_usuario', formularioPerfil.value.nombreUsuario)
            formData.append('email',          formularioPerfil.value.correo)
            formData.append('biografia',      formularioPerfil.value.biografia)
            formData.append('avatar',         archivoAvatar.value)
            respuesta = await api.upload('/usuario/perfil', formData)
        } else {
            respuesta = await api.put('/usuario/perfil', {
                nombre:         formularioPerfil.value.nombre,
                nombre_usuario: formularioPerfil.value.nombreUsuario,
                email:          formularioPerfil.value.correo,
                biografia:      formularioPerfil.value.biografia,
            })
        }
        sincronizarUsuario(respuesta.data)
        mostrarModalEditarPerfil.value = false
        mostrarNotificacion('Perfil actualizado correctamente.')
    } catch (error) {
        erroresPerfil.value      = error.errors || {}
        errorGeneralPerfil.value = error.message || 'Error al actualizar el perfil.'
    } finally {
        cargandoGuardar.value = false
    }
}
</script>

<template>
    <div class="contenedor-contenido">

        <!-- Guard: usuario no autenticado -->
        <div v-if="!almacenApp.autenticado" class="promo-no-autenticado">
            <div class="promo-hero">
                <div class="promo-hero-fondo">
                    <span class="nota-deco nota-1"><i class="fas fa-music"></i></span>
                    <span class="nota-deco nota-2"><i class="fas fa-headphones"></i></span>
                    <span class="nota-deco nota-3"><i class="fas fa-music"></i></span>
                    <span class="nota-deco nota-4"><i class="fas fa-compact-disc"></i></span>
                </div>
                <div class="promo-hero-contenido">
                    <div class="promo-logo-wrap">
                        <div class="promo-logo-anillo"></div>
                        <div class="promo-logo"><i class="fas fa-headphones-alt"></i></div>
                    </div>
                    <div class="promo-hero-texto">
                        <p class="promo-etiqueta">Bienvenido a Sonalya</p>
                        <h1 class="promo-titulo">Tu música,<br><span class="promo-titulo-acento">tu espacio.</span></h1>
                        <p class="promo-subtitulo">Crea playlists, sigue a tus artistas favoritos, compra entradas y vive la música como nunca antes. Todo gratis, para siempre.</p>
                    </div>
                    <div class="promo-botones">
                        <button class="promo-btn-registro" @click="abrirModalAuth('registro')"><i class="fas fa-user-plus"></i> Empezar gratis</button>
                        <button class="promo-btn-login" @click="abrirModalAuth('login')">Ya tengo cuenta</button>
                    </div>
                    <div class="promo-badges">
                        <span class="promo-badge"><i class="fas fa-check-circle"></i> 100% gratuito</span>
                        <span class="promo-badge"><i class="fas fa-ban"></i> Sin anuncios</span>
                        <span class="promo-badge"><i class="fas fa-play-circle"></i> Preview de canciones</span>
                    </div>
                </div>
            </div>
            <div class="promo-beneficios">
                <div class="promo-beneficio">
                    <div class="promo-beneficio-icono" style="background:linear-gradient(135deg,#8b5cf6,#6d28d9)"><i class="fas fa-list-ul"></i></div>
                    <div class="promo-beneficio-texto"><h3>Tus playlists</h3><p>Crea, edita y comparte playlists ilimitadas con tus canciones favoritas.</p></div>
                </div>
                <div class="promo-beneficio">
                    <div class="promo-beneficio-icono" style="background:linear-gradient(135deg,#ec4899,#be185d)"><i class="fas fa-heart"></i></div>
                    <div class="promo-beneficio-texto"><h3>Favoritos y seguimiento</h3><p>Marca canciones y sigue a artistas para estar al día con sus novedades.</p></div>
                </div>
                <div class="promo-beneficio">
                    <div class="promo-beneficio-icono" style="background:linear-gradient(135deg,#f59e0b,#d97706)"><i class="fas fa-ticket-alt"></i></div>
                    <div class="promo-beneficio-texto"><h3>Entradas exclusivas</h3><p>Compra entradas para conciertos y festivales directamente desde la app.</p></div>
                </div>
                <div class="promo-beneficio">
                    <div class="promo-beneficio-icono" style="background:linear-gradient(135deg,#10b981,#059669)"><i class="fas fa-history"></i></div>
                    <div class="promo-beneficio-texto"><h3>Historial y sugerencias</h3><p>Revive lo que has escuchado y recibe recomendaciones personalizadas.</p></div>
                </div>
            </div>
            <div class="promo-cta-final">
                <div class="promo-cta-final-contenido">
                    <h2>¿Listo para empezar?</h2>
                    <p>Únete gratis y sin tarjeta de crédito.</p>
                    <button class="promo-btn-registro promo-btn-grande" @click="abrirModalAuth('registro')"><i class="fas fa-rocket"></i> Crear mi cuenta ahora</button>
                </div>
            </div>
        </div>

        <!-- Perfil artista -->
        <PaginaPerfilArtista v-else-if="almacenApp.usuario.tipo === 'artista'" @abrirPlaylist="emitir('abrirPlaylist', $event)" />

        <!-- Contenido autenticado (oyente) -->
        <template v-else>

            <div v-if="cargandoPerfil" class="estado-cargando">
                <i class="fas fa-spinner fa-spin"></i> Cargando perfil...
            </div>

            <template v-else>
                <!-- Cabecera del perfil -->
                <section class="cabecera-perfil">
                    <div class="banner-perfil">
                        <img
                            :src="almacenApp.usuario.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(almacenApp.usuario.nombre)}&background=8b5cf6&color=fff&size=160`"
                            alt="Avatar"
                            class="avatar-perfil"
                        >
                        <div class="info-perfil">
                            <h1 class="nombre-perfil">{{ almacenApp.usuario.nombre }}</h1>
                            <p v-if="almacenApp.usuario.biografia" class="biografia-perfil">{{ almacenApp.usuario.biografia }}</p>
                            <div class="estadisticas-perfil">
                                <span class="estadistica-perfil"><i class="fas fa-list-ul"></i> {{ cantidadPlaylists }} Playlists</span>
                                <span class="estadistica-perfil"><i class="fas fa-heart"></i> {{ cantidadFav }} Favoritas</span>
                                <span class="estadistica-perfil"><i class="fas fa-user-friends"></i> {{ cantidadArtistas }} Artistas</span>
                            </div>
                            <div class="botones-perfil">
                                <button class="boton-principal" @click="abrirEdicion">Editar Perfil</button>
                                <button class="boton-secundario-perfil" @click="mostrarModalPassword = true"><i class="fas fa-lock"></i> Cambiar Contraseña</button>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Pestañas -->
                <div class="pestanas-perfil">
                    <button
                        v-for="p in pestanas"
                        :key="p.id"
                        class="boton-pestana"
                        :class="{ activo: pestanaActiva === p.id }"
                        @click="pestanaActiva = p.id"
                    >{{ p.nombre }}</button>
                </div>

                <!-- ── PESTAÑA: Playlists ── -->
                <div v-show="pestanaActiva === 'playlists'" class="contenido-pestana">
                    <div class="crear-playlist">
                        <button class="boton-crear-playlist" @click="mostrarModalPlaylist = true">
                            <i class="fas fa-plus"></i>
                            <span>Crear Nueva Playlist</span>
                        </button>
                    </div>

                    <div v-if="cargandoPlaylists" class="estado-info">
                        <i class="fas fa-spinner fa-spin"></i> Cargando playlists...
                    </div>
                    <div v-else-if="misPlaylists.length === 0" class="estado-vacio-tab">
                        <i class="fas fa-list-ul"></i>
                        <p>Aún no tienes playlists</p>
                        <p class="sub">Crea tu primera playlist y empieza a añadir canciones</p>
                    </div>
                    <div v-else class="cuadricula-tarjetas">
                        <div v-for="playlist in misPlaylists" :key="playlist.id" class="tarjeta-playlist-wrap">
                            <TarjetaPlaylist
                                :playlist="{ ...playlist, tipo: 'playlist', descripcion: (playlist.canciones_count ?? 0) + ' canciones' }"
                                @click="emitir('abrirPlaylist', { ...playlist, tipo: 'playlist' })"
                            />
                            <button class="boton-eliminar-playlist" @click.stop="eliminarPlaylist(playlist)" title="Eliminar playlist">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- ── PESTAÑA: Favoritos ── -->
                <div v-show="pestanaActiva === 'favoritos'" class="contenido-pestana">
                    <div class="subtabs-favoritos">
                        <button :class="['subtab', { activo: subtabFav === 'canciones' }]" @click="alCambiarSubtabFav('canciones')">
                            <i class="fas fa-music"></i> Canciones
                        </button>
                        <button :class="['subtab', { activo: subtabFav === 'albumes' }]" @click="alCambiarSubtabFav('albumes')">
                            <i class="fas fa-compact-disc"></i> Álbumes
                        </button>
                    </div>

                    <!-- Canciones favoritas -->
                    <div v-if="subtabFav === 'canciones'">
                        <div v-if="cargandoFavCanciones" class="estado-info"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
                        <div v-else-if="cancionesFav.length === 0" class="estado-vacio-tab">
                            <i class="far fa-heart"></i>
                            <p>No tienes canciones favoritas</p>
                            <p class="sub">Marca canciones como favoritas mientras las escuchas</p>
                        </div>
                        <div v-else class="lista-canciones">
                            <TarjetaCancion
                                v-for="(c, i) in cancionesFav"
                                :key="c.id"
                                :cancion="{ id: c.deezer_id, titulo: c.titulo, artista: c.artista, imagen: c.imagen, duracion: c.duracion, preview: c.preview }"
                                :numero="i + 1"
                                :mostrar-album="false"
                                :es-favorito="true"
                                @favorito="alToggleFavCancion"
                            />
                        </div>
                    </div>

                    <!-- Álbumes favoritos -->
                    <div v-if="subtabFav === 'albumes'">
                        <div v-if="cargandoFavAlbumes" class="estado-info"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
                        <div v-else-if="albumesFav.length === 0" class="estado-vacio-tab">
                            <i class="fas fa-compact-disc"></i>
                            <p>No tienes álbumes favoritos</p>
                            <p class="sub">Guarda álbumes para encontrarlos fácilmente</p>
                        </div>
                        <div v-else class="cuadricula-tarjetas">
                            <TarjetaPlaylist
                                v-for="album in albumesFav"
                                :key="album.deezer_id"
                                :playlist="album"
                                @click="emitir('abrirPlaylist', album)"
                            />
                        </div>
                    </div>
                </div>

                <!-- ── PESTAÑA: Artistas seguidos ── -->
                <div v-show="pestanaActiva === 'artistas'" class="contenido-pestana">
                    <div v-if="cargandoArtistas" class="estado-info"><i class="fas fa-spinner fa-spin"></i> Cargando artistas...</div>
                    <div v-else-if="artistasSeguidos.length === 0" class="estado-vacio-tab">
                        <i class="fas fa-user-music"></i>
                        <p>No sigues a ningún artista</p>
                        <p class="sub">Entra en el perfil de un artista y dale a "Seguir"</p>
                    </div>
                    <div v-else class="cuadricula-artistas">
                        <div v-for="artista in artistasSeguidos" :key="artista.id" class="tarjeta-artista tarjeta-artista-clickable" @click="verArtista(artista)">
                            <img :src="artista.imagen || `https://ui-avatars.com/api/?name=${encodeURIComponent(artista.nombre)}&background=8b5cf6&color=fff&size=140`" :alt="artista.nombre" class="imagen-artista">
                            <h3>{{ artista.nombre }}</h3>
                            <p>{{ artista.descripcion || 'Artista' }}</p>
                            <button class="boton-siguiendo" @click.stop="dejarDeSeguir(artista)">
                                <i class="fas fa-check"></i> Siguiendo
                            </button>
                        </div>
                    </div>
                </div>

            </template>
        </template>
    </div>

    <!-- Modal: Editar Perfil -->
    <Modal :visible="mostrarModalEditarPerfil" titulo="Editar Perfil" @cerrar="mostrarModalEditarPerfil = false">
        <div v-if="errorGeneralPerfil" class="error-modal"><i class="fas fa-exclamation-circle"></i> {{ errorGeneralPerfil }}</div>
        <div class="subida-avatar">
            <img :src="vistaAvatarPrevia || almacenApp.usuario.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(almacenApp.usuario.nombre)}&background=8b5cf6&color=fff&size=100`" alt="Avatar" class="vista-previa-avatar">
            <input ref="inputAvatarRef" type="file" accept="image/jpg,image/jpeg,image/png,image/webp" style="display:none" @change="alSeleccionarAvatar">
            <button class="boton-subir" @click="inputAvatarRef.click()"><i class="fas fa-camera"></i> Cambiar Foto</button>
        </div>
        <div class="grupo-formulario">
            <label>Nombre Completo</label>
            <input type="text" v-model="formularioPerfil.nombre" :class="{ error: erroresPerfil.nombre }">
            <span v-if="erroresPerfil.nombre" class="campo-error">{{ erroresPerfil.nombre[0] }}</span>
        </div>
        <div class="grupo-formulario">
            <label>Nombre de Usuario</label>
            <input type="text" v-model="formularioPerfil.nombreUsuario" :class="{ error: erroresPerfil.nombre_usuario }">
            <span v-if="erroresPerfil.nombre_usuario" class="campo-error">{{ erroresPerfil.nombre_usuario[0] }}</span>
        </div>
        <div class="grupo-formulario">
            <label>Email</label>
            <input type="email" v-model="formularioPerfil.correo" :class="{ error: erroresPerfil.email }">
            <span v-if="erroresPerfil.email" class="campo-error">{{ erroresPerfil.email[0] }}</span>
        </div>
        <div class="grupo-formulario">
            <label>Biografía</label>
            <textarea v-model="formularioPerfil.biografia" rows="3"></textarea>
        </div>
        <template #acciones>
            <button class="boton-cancelar" @click="mostrarModalEditarPerfil = false" :disabled="cargandoGuardar">Cancelar</button>
            <button class="boton-guardar" @click="guardarPerfil" :disabled="cargandoGuardar">
                <i v-if="cargandoGuardar" class="fas fa-spinner fa-spin"></i>
                <span v-else>Guardar Cambios</span>
            </button>
        </template>
    </Modal>

    <!-- Modal: Cambiar Contraseña -->
    <Modal :visible="mostrarModalPassword" titulo="Cambiar Contraseña" @cerrar="mostrarModalPassword = false">
        <div v-if="errorGeneralPassword" class="error-modal"><i class="fas fa-exclamation-circle"></i> {{ errorGeneralPassword }}</div>
        <div class="grupo-formulario">
            <label>Contraseña actual</label>
            <input type="password" v-model="formularioPassword.password_actual" :class="{ error: erroresPassword.password_actual }" placeholder="Tu contraseña actual">
            <span v-if="erroresPassword.password_actual" class="campo-error">{{ erroresPassword.password_actual[0] }}</span>
        </div>
        <div class="grupo-formulario">
            <label>Nueva contraseña</label>
            <input type="password" v-model="formularioPassword.password" :class="{ error: erroresPassword.password }" placeholder="Mín. 8 caracteres, mayúsculas y números">
            <span v-if="erroresPassword.password" class="campo-error">{{ erroresPassword.password[0] }}</span>
        </div>
        <div class="grupo-formulario">
            <label>Confirmar nueva contraseña</label>
            <input type="password" v-model="formularioPassword.password_confirmation" placeholder="Repite la nueva contraseña">
        </div>
        <template #acciones>
            <button class="boton-cancelar" @click="mostrarModalPassword = false" :disabled="guardandoPassword">Cancelar</button>
            <button class="boton-guardar" @click="cambiarPassword" :disabled="guardandoPassword">
                <i v-if="guardandoPassword" class="fas fa-spinner fa-spin"></i>
                <span v-else>Cambiar Contraseña</span>
            </button>
        </template>
    </Modal>

    <!-- Modal: Crear Nueva Playlist -->
    <Modal :visible="mostrarModalPlaylist" titulo="Crear Nueva Playlist" @cerrar="mostrarModalPlaylist = false">
        <div class="grupo-formulario">
            <label>Nombre de la Playlist</label>
            <input type="text" v-model="nombreNuevaPlaylist" placeholder="Mi Playlist Favorita" @keyup.enter="crearPlaylist">
        </div>
        <template #acciones>
            <button class="boton-cancelar" @click="mostrarModalPlaylist = false" :disabled="guardandoPlaylist">Cancelar</button>
            <button class="boton-guardar" @click="crearPlaylist" :disabled="guardandoPlaylist">
                <i v-if="guardandoPlaylist" class="fas fa-spinner fa-spin"></i>
                <span v-else>Crear</span>
            </button>
        </template>
    </Modal>
</template>

<style scoped>
.cabecera-perfil { margin-bottom: 32px; }

.botones-perfil { display: flex; gap: 12px; flex-wrap: wrap; }

.boton-secundario-perfil {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.1); backdrop-filter: blur(8px);
    color: white; border: 1.5px solid rgba(255,255,255,0.35);
    border-radius: 50px; padding: 10px 20px;
    font-size: 13px; font-weight: 600; cursor: pointer;
    transition: all 0.25s ease;
}
.boton-secundario-perfil:hover { border-color: white; background: rgba(255,255,255,0.18); }

.banner-perfil {
    background: linear-gradient(135deg, var(--morado), var(--morado-claro));
    padding: 48px 32px 32px;
    border-radius: 16px;
    display: flex;
    align-items: flex-end;
    gap: 28px;
}

.avatar-perfil {
    width: 160px; height: 160px;
    border-radius: 50%;
    border: 4px solid white;
    object-fit: cover;
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
}

.info-perfil { flex: 1; padding-bottom: 8px; }

.nombre-perfil { font-size: 48px; font-weight: 700; margin-bottom: 12px; color: white; }

.biografia-perfil { color: rgba(255,255,255,0.8); font-size: 14px; margin-bottom: 12px; max-width: 500px; }

.estadisticas-perfil {
    color: rgba(255,255,255,0.9);
    margin-bottom: 20px; font-size: 14px;
    display: flex; gap: 24px;
}

.estadistica-perfil { display: flex; align-items: center; gap: 8px; }

.pestanas-perfil {
    display: flex; gap: 24px;
    border-bottom: 1px solid var(--borde);
    margin-bottom: 32px;
}

.boton-pestana {
    background: none; border: none;
    color: var(--texto-gris);
    font-size: 15px; font-weight: 600;
    padding: 14px 0; cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
}
.boton-pestana:hover { color: var(--texto-blanco); }
.boton-pestana.activo { color: var(--texto-blanco); border-bottom-color: var(--morado); }

.contenido-pestana { animation: aparecer 0.3s ease; }
@keyframes aparecer { from { opacity: 0; } to { opacity: 1; } }

.crear-playlist { margin-bottom: 28px; }

.boton-crear-playlist {
    display: flex; align-items: center; gap: 12px;
    background: var(--fondo-tarjeta);
    border: 2px dashed var(--morado);
    color: var(--texto-blanco);
    padding: 20px 32px; border-radius: 12px;
    cursor: pointer; font-size: 15px; font-weight: 600;
    transition: all 0.2s ease; width: 100%;
}
.boton-crear-playlist:hover { background: var(--fondo-hover); border-style: solid; }
.boton-crear-playlist i { font-size: 22px; color: var(--morado); }

.tarjeta-playlist-wrap { position: relative; }

.boton-eliminar-playlist {
    position: absolute; top: 8px; right: 8px;
    background: rgba(0,0,0,0.6);
    color: #ff6b6b; border: none;
    width: 28px; height: 28px;
    border-radius: 50%; cursor: pointer;
    font-size: 11px; display: flex;
    align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.2s;
    z-index: 2;
}
.tarjeta-playlist-wrap:hover .boton-eliminar-playlist { opacity: 1; }

.estado-info {
    display: flex; align-items: center; gap: 12px;
    padding: 40px 20px; color: var(--texto-gris); font-size: 15px;
}

.estado-vacio-tab {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-height: 200px; gap: 12px;
    color: var(--texto-gris); text-align: center;
}
.estado-vacio-tab i { font-size: 48px; color: var(--morado); opacity: 0.4; }
.estado-vacio-tab p { font-size: 16px; font-weight: 600; color: var(--texto-blanco); margin: 0; }
.estado-vacio-tab .sub { font-size: 13px; font-weight: 400; color: var(--texto-gris); }

.subtabs-favoritos {
    display: flex; gap: 12px; margin-bottom: 24px;
}

.subtab {
    display: flex; align-items: center; gap: 6px;
    background: var(--fondo-tarjeta);
    color: var(--texto-gris);
    border: 1px solid transparent;
    border-radius: 50px;
    padding: 8px 18px; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
}
.subtab:hover { color: var(--texto-blanco); background: var(--fondo-hover); }
.subtab.activo { background: var(--morado); color: white; border-color: var(--morado); }

.cuadricula-artistas {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 24px;
}

.tarjeta-artista {
    background: var(--fondo-tarjeta);
    padding: 24px; border-radius: 12px;
    text-align: center; transition: all 0.3s ease;
}
.tarjeta-artista-clickable { cursor: pointer; }
.tarjeta-artista:hover { background: var(--fondo-hover); transform: translateY(-6px); }

.imagen-artista { width: 140px; height: 140px; border-radius: 50%; margin-bottom: 16px; object-fit: cover; }

.tarjeta-artista h3 { font-size: 17px; font-weight: 600; margin-bottom: 8px; color: var(--texto-blanco); }
.tarjeta-artista p  { font-size: 13px; color: var(--texto-gris); margin-bottom: 16px; }

.boton-siguiendo {
    background: transparent;
    border: 1.5px solid var(--morado);
    color: var(--morado);
    border-radius: 50px;
    padding: 8px 18px; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
    display: inline-flex; align-items: center; gap: 6px;
}
.boton-siguiendo:hover { background: rgba(139,92,246,0.1); color: #ff6b6b; border-color: #ff6b6b; }

.lista-canciones { display: flex; flex-direction: column; gap: 4px; }

/* Modal */
.subida-avatar {
    display: flex; flex-direction: column; align-items: center;
    gap: 16px; padding: 24px;
    background: var(--fondo-hover); border-radius: 12px; margin-bottom: 12px;
}
.vista-previa-avatar { width: 100px; height: 100px; border-radius: 50%; border: 3px solid var(--morado); object-fit: cover; }
.boton-subir {
    background: var(--morado); color: white; border: none;
    padding: 10px 20px; border-radius: 8px; cursor: pointer;
    font-weight: 600; font-size: 13px;
    display: flex; align-items: center; gap: 8px;
}
.boton-subir:hover { background: var(--morado-claro); }

textarea { resize: vertical; min-height: 80px; }

.error-modal {
    background: rgba(220,50,50,0.12); color: #ff6b6b;
    border: 1px solid rgba(220,50,50,0.3);
    border-radius: 8px; padding: 10px 14px;
    font-size: 13px; margin-bottom: 12px;
    display: flex; align-items: center; gap: 8px;
}
.campo-error { font-size: 12px; color: #ff6b6b; margin-top: 2px; }
input.error, textarea.error { border-color: #ff6b6b !important; }

.estado-cargando {
    display: flex; align-items: center; justify-content: center;
    min-height: 200px; color: var(--texto-gris); font-size: 15px; gap: 10px;
}

@media (max-width: 768px) {
    .banner-perfil { flex-direction: column; align-items: center; text-align: center; padding: 24px 16px 20px; gap: 14px; border-radius: 12px; }
    .avatar-perfil { width: 90px; height: 90px; }
    .nombre-perfil { font-size: 22px; margin-bottom: 6px; }
    .biografia-perfil { font-size: 13px; }
    .estadisticas-perfil { gap: 10px; flex-wrap: wrap; justify-content: center; font-size: 12px; margin-bottom: 14px; }
    .botones-perfil { justify-content: center; flex-wrap: wrap; }
    .pestanas-perfil { gap: 8px; overflow-x: auto; padding-bottom: 4px; }
    .boton-pestana { white-space: nowrap; font-size: 13px; padding: 10px 0; }
    .cuadricula-artistas { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }
    .tarjeta-artista { padding: 16px; }
    .imagen-artista { width: 80px; height: 80px; margin-bottom: 10px; }
    .tarjeta-artista h3 { font-size: 14px; }
    .boton-crear-playlist { padding: 16px 20px; font-size: 14px; }
    /* Promo no autenticado */
    .promo-hero { min-height: auto; border-radius: 16px; }
    .promo-hero-contenido { padding: 24px 18px; gap: 16px; }
    .promo-titulo { font-size: 26px; letter-spacing: -0.5px; }
    .promo-subtitulo { font-size: 13px; }
    .promo-botones { flex-direction: column; gap: 10px; }
    .promo-btn-registro, .promo-btn-login { width: 100%; justify-content: center; }
    .promo-beneficios { grid-template-columns: 1fr; gap: 10px; }
}

/* Promo (igual que antes) */
.promo-no-autenticado { display: flex; flex-direction: column; gap: 28px; }
.promo-hero { position: relative; border-radius: 24px; overflow: hidden; min-height: 420px; display: flex; align-items: center; }
.promo-hero-fondo { position: absolute; inset: 0; background: linear-gradient(135deg, #0f0520 0%, #2d0a5c 35%, #5b21b6 70%, #7c3aed 100%); }
.nota-deco { position: absolute; color: rgba(255,255,255,0.06); pointer-events: none; animation: flotar 6s ease-in-out infinite; }
.nota-1 { font-size: 120px; top: 10%; left: 5%; animation-delay: 0s; }
.nota-2 { font-size: 80px; top: 60%; right: 8%; animation-delay: 2s; }
.nota-3 { font-size: 60px; bottom: 10%; left: 25%; animation-delay: 4s; }
.nota-4 { font-size: 90px; top: 20%; right: 30%; animation-delay: 1s; }
@keyframes flotar { 0%, 100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-18px) rotate(5deg); } }
.promo-hero-contenido { position: relative; z-index: 1; width: 100%; padding: 48px 44px; display: flex; flex-direction: column; gap: 24px; }
.promo-logo-wrap { position: relative; width: 80px; height: 80px; }
.promo-logo-anillo { position: absolute; inset: -6px; border-radius: 50%; border: 2px solid rgba(167,139,250,0.5); animation: pulsar 2.5s ease-in-out infinite; }
@keyframes pulsar { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.12); opacity: 1; } }
.promo-logo { width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,0.12); backdrop-filter: blur(12px); border: 2px solid rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; font-size: 34px; color: white; }
.promo-hero-texto { display: flex; flex-direction: column; gap: 12px; }
.promo-etiqueta { font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: rgba(167,139,250,1); margin: 0; }
.promo-titulo { font-size: 44px; font-weight: 900; color: white; margin: 0; line-height: 1.1; letter-spacing: -1.5px; }
.promo-titulo-acento { background: linear-gradient(90deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.promo-subtitulo { font-size: 15px; color: rgba(255,255,255,0.7); max-width: 480px; margin: 0; line-height: 1.7; }
.promo-botones { display: flex; gap: 14px; flex-wrap: wrap; }
.promo-btn-registro { background: white; color: #5b21b6; border: none; border-radius: 50px; padding: 14px 30px; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.25s ease; box-shadow: 0 4px 24px rgba(0,0,0,0.3); }
.promo-btn-registro:hover { transform: translateY(-3px); box-shadow: 0 10px 32px rgba(0,0,0,0.4); }
.promo-btn-login { background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); color: white; border: 1.5px solid rgba(255,255,255,0.35); border-radius: 50px; padding: 14px 28px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.25s ease; }
.promo-btn-login:hover { border-color: white; background: rgba(255,255,255,0.18); }
.promo-badges { display: flex; flex-wrap: wrap; gap: 10px; padding-top: 4px; }
.promo-badge { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 50px; }
.promo-badge i { color: #a78bfa; font-size: 13px; }
.promo-beneficios { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.promo-beneficio { background: var(--fondo-tarjeta); border-radius: 16px; padding: 24px; display: flex; gap: 18px; align-items: flex-start; border: 1px solid rgba(255,255,255,0.04); transition: all 0.2s ease; }
.promo-beneficio:hover { transform: translateY(-3px); border-color: rgba(139,92,246,0.3); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
.promo-beneficio-icono { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: white; flex-shrink: 0; }
.promo-beneficio-texto h3 { font-size: 15px; font-weight: 700; color: var(--texto-blanco); margin: 0 0 6px; }
.promo-beneficio-texto p { font-size: 13px; color: var(--texto-gris); margin: 0; line-height: 1.55; }
.promo-cta-final { border-radius: 20px; background: linear-gradient(135deg, rgba(109,40,217,0.2), rgba(59,7,100,0.4)); border: 1px solid rgba(139,92,246,0.25); padding: 40px; text-align: center; }
.promo-cta-final-contenido { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.promo-cta-final h2 { font-size: 26px; font-weight: 800; color: var(--texto-blanco); margin: 0; }
.promo-cta-final p { font-size: 14px; color: var(--texto-gris); margin: 0; }
.promo-btn-grande { padding: 16px 40px; font-size: 15px; margin-top: 6px; }
</style>
