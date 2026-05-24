<!--
  =============================================================================
  COMPONENTE CABECERA (Header)
  =============================================================================

  Barra superior de la aplicación que contiene:
  - Barra de búsqueda configurable
  - Botón para cambiar el tema (claro/oscuro)
  - Botón de notificaciones
  - Acceso rápido al perfil del usuario

  La cabecera es configurable mediante props para adaptarse a cada página.
  Por ejemplo, la página de búsqueda muestra una barra de búsqueda más grande.

  Props:
  - placeholder: Texto del placeholder en la barra de búsqueda
  - grande: Si es true, la barra de búsqueda es más prominente
  - mostrarBusqueda: Controla la visibilidad de la barra de búsqueda
  - mostrarVolver: Muestra un botón de volver (para páginas de detalle)
  - textoVolver: Texto del botón de volver

  Eventos emitidos:
  - buscar: Emitido cuando el usuario escribe en la barra de búsqueda
  - volver: Emitido cuando se hace clic en el botón de volver
  - cambiar-pagina: Emitido para navegar a otra página

  @author Lucia Ruiz Salvador
  @version 1.0.0
-->

<script setup>
// =============================================================================
// IMPORTACIONES
// =============================================================================

import { ref, computed, watch, nextTick } from 'vue'
import { almacenApp, alternarTema, abrirModalAuth, cerrarSesion, mostrarNotificacion } from '@/stores/appStore'
import { api } from '@/servicios/api'

// =============================================================================
// PROPS (Propiedades configurables)
// =============================================================================

const propiedades = defineProps({
    /**
     * Texto de ayuda que aparece en la barra de búsqueda
     */
    placeholder: {
        type: String,
        default: 'Buscar canciones, artistas, álbumes...'
    },

    /**
     * Si es true, la barra de búsqueda se muestra más grande
     * Útil para páginas donde la búsqueda es la acción principal
     */
    grande: {
        type: Boolean,
        default: false
    },

    /**
     * Controla si se muestra la barra de búsqueda
     */
    mostrarBusqueda: {
        type: Boolean,
        default: true
    },

    /**
     * Si es true, muestra un botón para volver a la página anterior
     */
    mostrarVolver: {
        type: Boolean,
        default: false
    },

    /**
     * Texto del botón de volver
     */
    textoVolver: {
        type: String,
        default: 'Volver'
    },

    /**
     * Contador que al incrementarse limpia la barra de búsqueda
     */
    resetearContador: {
        type: Number,
        default: 0
    },

    /**
     * Texto de búsqueda que se puede establecer programáticamente desde el exterior
     */
    valorBusqueda: {
        type: String,
        default: ''
    }
})

// =============================================================================
// EVENTOS EMITIDOS
// =============================================================================

const emitir = defineEmits(['buscar', 'volver', 'cambiarPagina', 'toggleMenu'])

// =============================================================================
// ESTADO LOCAL
// =============================================================================

/**
 * Texto actual en la barra de búsqueda
 * Se actualiza con v-model cuando el usuario escribe
 */
const textoBusqueda    = ref('')
const inputBusqueda    = ref(null)
const busquedaExpandida = ref(false)

watch(() => propiedades.resetearContador, () => {
    textoBusqueda.value = ''
})

watch(() => propiedades.valorBusqueda, (nuevo) => {
    if (nuevo !== textoBusqueda.value) {
        textoBusqueda.value = nuevo
    }
})

// =============================================================================
// PROPIEDADES COMPUTADAS
// =============================================================================

/**
 * Determina qué icono mostrar para el botón de tema
 * Luna para modo oscuro, sol para modo claro
 */
// Muestra el DESTINO: true = estamos en oscuro y al clicar iremos a claro (sol)
const temaEsOscuro = computed(() => almacenApp.tema === 'oscuro')

// =============================================================================
// MANEJADORES DE EVENTOS
// =============================================================================

/**
 * Se ejecuta cuando el usuario escribe en la barra de búsqueda
 * Emite el evento con el texto actual
 */
function alBuscar() {
    emitir('buscar', textoBusqueda.value)
}

function alHacerClicEnBarra() {
    if (!propiedades.grande) {
        emitir('cambiarPagina', 'buscar')
    }
    nextTick(() => inputBusqueda.value?.focus())
}

/**
 * Se ejecuta cuando el usuario hace clic en el botón de volver
 */
function alVolver() {
    emitir('volver')
}

function irAPerfil() {
    emitir('cambiarPagina', 'perfil')
}

async function alCerrarSesion() {
    try {
        await api.post('/auth/logout')
    } catch (_) {}
    cerrarSesion()
    mostrarNotificacion('Sesión cerrada correctamente.')
}
</script>

<template>
    <!--
      Barra superior con búsqueda y acciones de usuario
    -->
    <header class="barra-superior" :class="{ 'busqueda-activa': busquedaExpandida }">

        <!-- Botón hamburguesa: solo visible en móvil, solo cuando NO hay volver -->
        <button
            v-if="!mostrarVolver"
            class="boton-hamburguesa"
            @click="emitir('toggleMenu')"
            aria-label="Abrir menú"
        >
            <i class="fas fa-bars"></i>
        </button>

        <!-- =================================================================
             BOTÓN VOLVER UNIFICADO (todos los tamaños de pantalla)
             Solo se muestra cuando mostrarVolver es true — nunca junto al hamburguesa
        ================================================================= -->
        <button v-if="mostrarVolver" class="boton-volver" @click="alVolver" aria-label="Volver">
            <span class="boton-volver-icono">
                <i class="fas fa-chevron-left"></i>
            </span>
            <span class="boton-volver-texto">{{ textoVolver }}</span>
        </button>

        <!-- =================================================================
             BARRA DE BÚSQUEDA
             Configurable con diferentes tamaños según la página
        ================================================================= -->
        <div
            v-if="mostrarBusqueda"
            class="barra-busqueda"
            :class="{ 'barra-busqueda-grande': grande }"
            @click="alHacerClicEnBarra"
        >
            <!-- Icono de búsqueda -->
            <i class="fas fa-search"></i>

            <!-- Campo de entrada de texto -->
            <input
                ref="inputBusqueda"
                type="text"
                :placeholder="placeholder"
                v-model="textoBusqueda"
                @input="alBuscar"
                @click.stop
                @focus="busquedaExpandida = true"
                @blur="busquedaExpandida = false"
            >
        </div>

        <!-- =================================================================
             ACCIONES DE USUARIO
             Botones de tema, notificaciones y perfil
        ================================================================= -->
        <div class="acciones-usuario">

            <!-- Botón para alternar tema claro/oscuro -->
            <button
                class="boton-icono"
                @click="alternarTema"
                :title="temaEsOscuro ? 'Activar tema claro' : 'Activar tema oscuro'"
            >
                <!-- Sol: unicode ☀ — claramente un sol, no una rueda de ajustes -->
                <span v-if="temaEsOscuro" class="icono-sol" aria-hidden="true">☀</span>
                <i v-else class="fas fa-moon" aria-hidden="true"></i>
            </button>

            <!-- Si el usuario está autenticado -->
            <template v-if="almacenApp.autenticado">
                <!-- Botón de notificaciones -->
                <button class="boton-icono" title="Notificaciones">
                    <i class="fas fa-bell"></i>
                </button>

                <!-- Perfil del usuario con menú desplegable -->
                <div class="perfil-contenedor">
                    <a href="#" class="boton-perfil-usuario" @click.prevent="irAPerfil">
                        <img
                            :src="almacenApp.usuario.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(almacenApp.usuario.nombre) + '&background=8b5cf6&color=fff&size=80'"
                            :alt="almacenApp.usuario.nombre"
                            class="avatar-perfil-usuario"
                        >
                        <span class="nombre-perfil-usuario">
                            {{ almacenApp.usuario.nombre.split(' ')[0] }}
                        </span>
                    </a>
                    <button class="boton-salir" @click="alCerrarSesion" title="Cerrar sesión">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </template>

            <!-- Si NO está autenticado: botones login / registro -->
            <template v-else>
                <button class="boton-login" @click="abrirModalAuth('login')">
                    Iniciar sesión
                </button>
                <button class="boton-registro" @click="abrirModalAuth('registro')">
                    Registrarse
                </button>
            </template>
        </div>
    </header>
</template>

<style scoped>
/**
 * Estilos específicos del componente Header
 * Los estilos generales están en main.css
 */

/* ── Icono sol (Unicode ☀ — mucho más claro que fa-sun) ── */
.icono-sol {
    font-size: 20px;
    line-height: 1;
    color: inherit;
    font-style: normal;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Botón hamburguesa (oculto en escritorio, visible en móvil) */
.boton-hamburguesa {
    display: none;
    background: none;
    border: none;
    color: var(--texto-blanco);
    font-size: 20px;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: background 0.2s;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.boton-hamburguesa:hover { background: var(--fondo-hover); }

@media (max-width: 768px) {
    .boton-hamburguesa { display: flex; }
}

/* ── Botón volver unificado ───────────────────────────── */
.boton-volver {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    color: var(--texto-gris);
    transition: color 0.2s;
}
.boton-volver:hover { color: var(--texto-blanco); }
.boton-volver:hover .boton-volver-icono { background: rgba(255,255,255,0.15); transform: translateX(-2px); }

.boton-volver-icono {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--fondo-hover);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    transition: background 0.2s, transform 0.2s;
    border: 1px solid var(--borde);
    flex-shrink: 0;
}

.boton-volver-texto {
    font-size: 14px;
    font-weight: 600;
}

/* En móvil: solo el círculo, sin texto */
@media (max-width: 768px) {
    .boton-volver-icono {
        width: 38px;
        height: 38px;
        font-size: 15px;
        background: rgba(255,255,255,0.08);
        border-color: rgba(255,255,255,0.15);
    }
    .boton-volver-texto { display: none; }
}

/* ── Expansión de la barra de búsqueda en móvil al enfocar ── */
@media (max-width: 768px) {
    /* Transiciones suaves para los elementos que se ocultan */
    .boton-hamburguesa,
    .boton-volver,
    .acciones-usuario {
        transition: opacity 0.2s ease;
    }

    /* La barra se posiciona como overlay cuando está activa */
    .barra-superior.busqueda-activa .barra-busqueda {
        position: absolute;
        left: 10px;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 10;
        box-shadow: 0 2px 20px rgba(0, 0, 0, 0.35);
    }

    /* Los otros elementos del header se desvanecen */
    .barra-superior.busqueda-activa .boton-hamburguesa,
    .barra-superior.busqueda-activa .boton-volver,
    .barra-superior.busqueda-activa .acciones-usuario {
        opacity: 0;
        pointer-events: none;
    }
}

/* Contenedor del perfil con botón salir */
.perfil-contenedor {
    display: flex;
    align-items: center;
    gap: 6px;
}

/* Botón cerrar sesión */
.boton-salir {
    background: none;
    border: none;
    color: var(--texto-gris);
    font-size: 14px;
    cursor: pointer;
    padding: 6px 8px;
    border-radius: 6px;
    transition: color 0.2s, background 0.2s;
}

.boton-salir:hover {
    color: #ff6b6b;
    background: rgba(255, 107, 107, 0.1);
}

/* Botón iniciar sesión */
.boton-login {
    background: transparent;
    border: 1px solid var(--texto-gris, #aaa);
    color: var(--texto-blanco, #fff);
    border-radius: 50px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
}

.boton-login:hover {
    border-color: var(--texto-blanco, #fff);
}

/* Botón registrarse */
.boton-registro {
    background: #fff;
    border: none;
    color: #000;
    border-radius: 50px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
}

.boton-registro:hover {
    background: #e0e0e0;
    transform: scale(1.03);
}
</style>
