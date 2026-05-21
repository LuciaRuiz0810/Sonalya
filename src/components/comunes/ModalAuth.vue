<script setup>
import { ref, watch } from 'vue'
import { almacenApp, cerrarModalAuth, iniciarSesion, mostrarNotificacion } from '@/stores/appStore'
import { api } from '@/servicios/api'

const cargando     = ref(false)
const errores      = ref({})
const errorGeneral = ref('')

const datosLogin = ref({ correo: '', contrasena: '' })

const datosRegistro = ref({
    nombre: '',
    nombre_artista: '',
    nombre_usuario: '',
    correo: '',
    contrasena: '',
    contrasena_confirmacion: '',
    tipo: 'oyente',
})

const correoRecuperacion = ref('')
const recuperacionEnviada = ref(false)

watch(() => almacenApp.modalAuth.visible, (visible) => {
    if (!visible) {
        errores.value = {}
        errorGeneral.value = ''
        datosLogin.value = { correo: '', contrasena: '' }
        datosRegistro.value = { nombre: '', nombre_artista: '', nombre_usuario: '', correo: '', contrasena: '', contrasena_confirmacion: '', tipo: 'oyente' }
        correoRecuperacion.value = ''
        recuperacionEnviada.value = false
        cargando.value = false
    }
})

function cambiarPestana(pestana) {
    almacenApp.modalAuth.pestana = pestana
    errores.value = {}
    errorGeneral.value = ''
    recuperacionEnviada.value = false
}

async function enviarLogin() {
    cargando.value = true
    errores.value = {}
    errorGeneral.value = ''

    try {
        const respuesta = await api.post('/auth/login', {
            email:    datosLogin.value.correo,
            password: datosLogin.value.contrasena,
        })

        iniciarSesion(respuesta.data.user, respuesta.data.token)
        cerrarModalAuth()
        mostrarNotificacion(`¡Bienvenido, ${respuesta.data.user.nombre}!`)
    } catch (error) {
        if (error.errors) {
            errores.value = error.errors
        }
        errorGeneral.value = error.message || 'Error al iniciar sesión.'
    } finally {
        cargando.value = false
    }
}

async function enviarRegistro() {
    cargando.value = true
    errores.value = {}
    errorGeneral.value = ''

    try {
        const respuesta = await api.post('/auth/registro', {
            nombre:                datosRegistro.value.nombre,
            nombre_artista:        datosRegistro.value.tipo === 'artista' ? datosRegistro.value.nombre_artista : undefined,
            nombre_usuario:        datosRegistro.value.nombre_usuario,
            email:                 datosRegistro.value.correo,
            password:              datosRegistro.value.contrasena,
            password_confirmation: datosRegistro.value.contrasena_confirmacion,
            tipo:                  datosRegistro.value.tipo,
        })

        iniciarSesion(respuesta.data.user, respuesta.data.token)
        cerrarModalAuth()
        mostrarNotificacion(`¡Cuenta creada! Bienvenido, ${respuesta.data.user.nombre}.`)
    } catch (error) {
        if (error.errors) {
            errores.value = error.errors
        }
        errorGeneral.value = error.message || 'Error al registrarse.'
    } finally {
        cargando.value = false
    }
}

async function enviarRecuperacion() {
    cargando.value = true
    errores.value = {}
    errorGeneral.value = ''

    try {
        await api.post('/auth/recuperar-password', { email: correoRecuperacion.value })
        recuperacionEnviada.value = true
    } catch (error) {
        if (error.errors) errores.value = error.errors
        errorGeneral.value = error.message || 'No se pudo enviar el email de recuperación.'
    } finally {
        cargando.value = false
    }
}

function cerrar() {
    cerrarModalAuth()
}
</script>

<template>
    <Teleport to="body">
        <div v-if="almacenApp.modalAuth.visible" class="modal-fondo" @click.self="cerrar">
            <div class="modal-auth">

                <!-- Botón cerrar -->
                <button class="modal-cerrar" @click="cerrar">
                    <i class="fas fa-times"></i>
                </button>

                <!-- Logo -->
                <div class="modal-logo">
                    <span class="logo-texto">Sonalya</span>
                </div>

                <!-- Pestañas (ocultas en recuperación) -->
                <div v-if="almacenApp.modalAuth.pestana !== 'recuperar'" class="modal-pestanas">
                    <button
                        class="pestana"
                        :class="{ activa: almacenApp.modalAuth.pestana === 'login' }"
                        @click="cambiarPestana('login')"
                    >
                        Iniciar sesión
                    </button>
                    <button
                        class="pestana"
                        :class="{ activa: almacenApp.modalAuth.pestana === 'registro' }"
                        @click="cambiarPestana('registro')"
                    >
                        Registrarse
                    </button>
                </div>

                <!-- Cabecera de recuperación -->
                <div v-else class="recuperar-cabecera">
                    <button class="boton-volver" @click="cambiarPestana('login')">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <span>Recuperar contraseña</span>
                </div>

                <!-- Error general -->
                <div v-if="errorGeneral" class="error-general">
                    <i class="fas fa-exclamation-circle"></i> {{ errorGeneral }}
                </div>

                <!-- Formulario Login -->
                <form
                    v-if="almacenApp.modalAuth.pestana === 'login'"
                    class="modal-formulario"
                    @submit.prevent="enviarLogin"
                >
                    <div class="campo">
                        <label>Correo electrónico</label>
                        <input
                            type="email"
                            v-model="datosLogin.correo"
                            placeholder="tu@correo.com"
                            :class="{ error: errores.email }"
                            required
                        >
                        <span v-if="errores.email" class="campo-error">{{ errores.email[0] }}</span>
                    </div>

                    <div class="campo">
                        <div class="campo-label-fila">
                            <label>Contraseña</label>
                            <a href="#" class="link-recuperar" @click.prevent="cambiarPestana('recuperar')">
                                ¿Has olvidado tu contraseña?
                            </a>
                        </div>
                        <input
                            type="password"
                            v-model="datosLogin.contrasena"
                            placeholder="Tu contraseña"
                            :class="{ error: errores.password }"
                            required
                        >
                        <span v-if="errores.password" class="campo-error">{{ errores.password[0] }}</span>
                    </div>

                    <button type="submit" class="boton-enviar" :disabled="cargando">
                        <i v-if="cargando" class="fas fa-spinner fa-spin"></i>
                        <span v-else>Iniciar sesión</span>
                    </button>

                    <p class="cambiar-pestana">
                        ¿No tienes cuenta?
                        <a href="#" @click.prevent="cambiarPestana('registro')">Regístrate</a>
                    </p>
                </form>

                <!-- Vista recuperación de contraseña -->
                <div v-else-if="almacenApp.modalAuth.pestana === 'recuperar'" class="modal-formulario">

                    <!-- Estado: enlace enviado con éxito -->
                    <div v-if="recuperacionEnviada" class="recuperar-exito">
                        <div class="recuperar-exito-icono">
                            <i class="fas fa-envelope-open-text"></i>
                        </div>
                        <h3>Revisa tu correo</h3>
                        <p>
                            Hemos enviado un enlace de recuperación a
                            <strong>{{ correoRecuperacion }}</strong>.
                            Puede tardar unos minutos.
                        </p>
                        <button class="boton-enviar" @click="cambiarPestana('login')">
                            Volver al inicio de sesión
                        </button>
                    </div>

                    <!-- Estado: formulario de recuperación -->
                    <form v-else @submit.prevent="enviarRecuperacion" style="display:contents">
                        <p class="recuperar-descripcion">
                            Introduce tu correo y te enviaremos un enlace para restablecer tu contraseña.
                        </p>

                        <div class="campo">
                            <label>Correo electrónico</label>
                            <input
                                type="email"
                                v-model="correoRecuperacion"
                                placeholder="tu@correo.com"
                                :class="{ error: errores.email }"
                                required
                                autofocus
                            >
                            <span v-if="errores.email" class="campo-error">{{ errores.email[0] }}</span>
                        </div>

                        <button type="submit" class="boton-enviar" :disabled="cargando">
                            <i v-if="cargando" class="fas fa-spinner fa-spin"></i>
                            <span v-else>Enviar enlace</span>
                        </button>

                        <p class="cambiar-pestana">
                            <a href="#" @click.prevent="cambiarPestana('login')">Volver al inicio de sesión</a>
                        </p>
                    </form>
                </div>

                <!-- Formulario Registro -->
                <form
                    v-else
                    class="modal-formulario"
                    @submit.prevent="enviarRegistro"
                >
                    <!-- Selector tipo de cuenta -->
                    <div class="campo">
                        <label>Tipo de cuenta</label>
                        <div class="selector-tipo">
                            <button
                                type="button"
                                class="tipo-opcion"
                                :class="{ activa: datosRegistro.tipo === 'oyente' }"
                                @click="datosRegistro.tipo = 'oyente'"
                            >
                                <i class="fas fa-headphones"></i>
                                <span class="tipo-nombre">Oyente</span>
                                <span class="tipo-desc">Escucha música y sigue artistas</span>
                            </button>
                            <button
                                type="button"
                                class="tipo-opcion"
                                :class="{ activa: datosRegistro.tipo === 'artista' }"
                                @click="datosRegistro.tipo = 'artista'"
                            >
                                <i class="fas fa-microphone-alt"></i>
                                <span class="tipo-nombre">Artista</span>
                                <span class="tipo-desc">Sube tu música y consigue fans</span>
                            </button>
                        </div>
                    </div>

                    <div class="campo">
                        <label>Nombre completo</label>
                        <input
                            type="text"
                            v-model="datosRegistro.nombre"
                            placeholder="Tu nombre"
                            :class="{ error: errores.nombre }"
                            required
                        >
                        <span v-if="errores.nombre" class="campo-error">{{ errores.nombre[0] }}</span>
                    </div>

                    <div v-if="datosRegistro.tipo === 'artista'" class="campo">
                        <label>Nombre artístico</label>
                        <input
                            type="text"
                            v-model="datosRegistro.nombre_artista"
                            placeholder="El nombre con que te conocerán"
                            :class="{ error: errores.nombre_artista }"
                        >
                        <span v-if="errores.nombre_artista" class="campo-error">{{ errores.nombre_artista[0] }}</span>
                    </div>

                    <div class="campo">
                        <label>Nombre de usuario</label>
                        <input
                            type="text"
                            v-model="datosRegistro.nombre_usuario"
                            placeholder="@tunombre"
                            :class="{ error: errores.nombre_usuario }"
                            required
                        >
                        <span v-if="errores.nombre_usuario" class="campo-error">{{ errores.nombre_usuario[0] }}</span>
                    </div>

                    <div class="campo">
                        <label>Correo electrónico</label>
                        <input
                            type="email"
                            v-model="datosRegistro.correo"
                            placeholder="tu@correo.com"
                            :class="{ error: errores.email }"
                            required
                        >
                        <span v-if="errores.email" class="campo-error">{{ errores.email[0] }}</span>
                    </div>

                    <div class="campo">
                        <label>Contraseña</label>
                        <input
                            type="password"
                            v-model="datosRegistro.contrasena"
                            placeholder="Mín. 8 caracteres, mayúscula y número"
                            :class="{ error: errores.password }"
                            required
                        >
                        <span v-if="errores.password" class="campo-error">{{ errores.password[0] }}</span>
                    </div>

                    <div class="campo">
                        <label>Confirmar contraseña</label>
                        <input
                            type="password"
                            v-model="datosRegistro.contrasena_confirmacion"
                            placeholder="Repite tu contraseña"
                            required
                        >
                    </div>

                    <button type="submit" class="boton-enviar" :disabled="cargando">
                        <i v-if="cargando" class="fas fa-spinner fa-spin"></i>
                        <span v-else>Crear cuenta</span>
                    </button>

                    <p class="cambiar-pestana">
                        ¿Ya tienes cuenta?
                        <a href="#" @click.prevent="cambiarPestana('login')">Inicia sesión</a>
                    </p>
                </form>

            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.modal-fondo {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
}

.modal-auth {
    background: var(--fondo-secundario, #181818);
    border-radius: 16px;
    padding: 40px 36px;
    width: 100%;
    max-width: 420px;
    position: relative;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
}

.modal-cerrar {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    color: var(--texto-gris, #aaa);
    font-size: 18px;
    cursor: pointer;
    padding: 6px;
    line-height: 1;
    transition: color 0.2s;
}

.modal-cerrar:hover {
    color: var(--texto-blanco, #fff);
}

.modal-logo {
    text-align: center;
    margin-bottom: 24px;
}

.logo-texto {
    font-size: 26px;
    font-weight: 800;
    background: linear-gradient(135deg, var(--morado), var(--morado-claro));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.5px;
}

.modal-pestanas {
    display: flex;
    border-bottom: 1px solid var(--borde, #282828);
    margin-bottom: 24px;
    gap: 4px;
}

.pestana {
    flex: 1;
    background: none;
    border: none;
    color: var(--texto-gris, #aaa);
    padding: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: all 0.2s;
}

.pestana.activa {
    color: var(--texto-blanco, #fff);
    border-bottom-color: var(--morado);
}

.pestana:hover:not(.activa) {
    color: var(--texto-blanco, #fff);
}

.error-general {
    background: rgba(220, 50, 50, 0.12);
    color: #ff6b6b;
    border: 1px solid rgba(220, 50, 50, 0.3);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.modal-formulario {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.campo {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.campo label {
    font-size: 13px;
    font-weight: 500;
    color: var(--texto-gris, #aaa);
}

.campo input {
    background: var(--fondo-terciario, #282828);
    border: 1px solid var(--borde, #333);
    border-radius: 8px;
    padding: 10px 14px;
    color: var(--texto-blanco, #fff);
    font-size: 14px;
    transition: border-color 0.2s;
    outline: none;
}

.campo input:focus {
    border-color: var(--morado);
}

.campo input.error {
    border-color: #ff6b6b;
}

.campo input::placeholder {
    color: var(--texto-gris, #666);
}

.campo-error {
    font-size: 12px;
    color: #ff6b6b;
}

.boton-enviar {
    background: var(--morado);
    color: #000;
    border: none;
    border-radius: 50px;
    padding: 12px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    margin-top: 4px;
    transition: background 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 46px;
}

.boton-enviar:hover:not(:disabled) {
    background: var(--morado-claro);
    transform: scale(1.01);
}

.boton-enviar:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.cambiar-pestana {
    text-align: center;
    font-size: 13px;
    color: var(--texto-gris, #aaa);
    margin: 0;
}

.cambiar-pestana a {
    color: var(--morado);
    text-decoration: none;
    font-weight: 600;
}

.cambiar-pestana a:hover {
    text-decoration: underline;
}

/* Fila label + link "¿olvidaste?" en la misma línea */
.campo-label-fila {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.campo-label-fila label {
    font-size: 13px;
    font-weight: 500;
    color: var(--texto-gris, #aaa);
}

.link-recuperar {
    font-size: 12px;
    color: var(--texto-gris, #aaa);
    text-decoration: none;
    transition: color 0.2s;
}

.link-recuperar:hover {
    color: var(--morado);
    text-decoration: underline;
}

/* Cabecera de la vista de recuperación */
.recuperar-cabecera {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 24px;
    font-size: 15px;
    font-weight: 600;
    color: var(--texto-blanco, #fff);
}

.boton-volver {
    background: none;
    border: none;
    color: var(--texto-gris, #aaa);
    font-size: 16px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: color 0.2s, background 0.2s;
    line-height: 1;
}

.boton-volver:hover {
    color: var(--texto-blanco, #fff);
    background: rgba(255,255,255,0.08);
}

/* Texto descriptivo en recuperación */
.recuperar-descripcion {
    font-size: 14px;
    color: var(--texto-gris, #aaa);
    margin: 0 0 4px;
    line-height: 1.5;
}

/* Estado de éxito tras enviar el correo */
.recuperar-exito {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 14px;
    padding: 8px 0;
}

.recuperar-exito-icono {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(139, 92, 246, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    color: var(--morado);
}

.recuperar-exito h3 {
    font-size: 18px;
    font-weight: 700;
    color: var(--texto-blanco, #fff);
    margin: 0;
}

.recuperar-exito p {
    font-size: 14px;
    color: var(--texto-gris, #aaa);
    margin: 0;
    line-height: 1.6;
}

.recuperar-exito strong {
    color: var(--texto-blanco, #fff);
}

/* Selector tipo de cuenta */
.selector-tipo {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 4px;
}

.tipo-opcion {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 14px 10px;
    background: var(--fondo-terciario, #282828);
    border: 2px solid var(--borde, #333);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
    color: var(--texto-gris, #aaa);
}

.tipo-opcion i {
    font-size: 22px;
    transition: color 0.2s;
}

.tipo-opcion .tipo-nombre {
    font-size: 13px;
    font-weight: 700;
    color: var(--texto-blanco, #fff);
}

.tipo-opcion .tipo-desc {
    font-size: 11px;
    line-height: 1.3;
    color: var(--texto-gris, #aaa);
}

.tipo-opcion:hover {
    border-color: var(--morado);
    background: rgba(139, 92, 246, 0.08);
}

.tipo-opcion.activa {
    border-color: var(--morado);
    background: rgba(139, 92, 246, 0.12);
    color: var(--morado);
}

.tipo-opcion.activa i {
    color: var(--morado);
}
</style>
