<!--
  =============================================================================
  COMPONENTE BARRA LATERAL (Sidebar)
  =============================================================================

  Barra de navegación lateral que permite moverse entre las diferentes
  secciones de la aplicación. Incluye el logo y los enlaces de navegación.

  Características:
  - Logo clicable que lleva al inicio
  - Menú de navegación con iconos
  - Indicador visual del elemento activo
  - Diseño responsive con transiciones suaves

  Props:
  - paginaActual: String con el id de la página activa

  Eventos emitidos:
  - cambiar-pagina: Emitido cuando el usuario hace clic en un elemento del menú

  @author Lucia Ruiz Salvador
  @version 1.0.0
-->

<script setup>
// =============================================================================
// IMPORTACIONES
// =============================================================================

// Importar función del almacén (aunque no se usa directamente aquí)
import { almacenApp, cambiarPagina } from '@/stores/appStore'

// =============================================================================
// PROPS (Propiedades recibidas del componente padre)
// =============================================================================

/**
 * Definición de las props que recibe el componente
 */
const propiedades = defineProps({
    /**
     * Identificador de la página actualmente activa
     * Se usa para resaltar el elemento del menú correspondiente
     */
    paginaActual: {
        type: String,
        default: 'inicio'
    },
    /** Controla si el menú está abierto en móvil */
    abierto: {
        type: Boolean,
        default: false
    }
})

// =============================================================================
// EVENTOS EMITIDOS
// =============================================================================

/**
 * Definir los eventos que este componente puede emitir al padre
 */
const emitir = defineEmits(['cambiarPagina', 'cerrarMenu'])

// =============================================================================
// DATOS DEL MENÚ DE NAVEGACIÓN
// =============================================================================

/**
 * Lista de elementos del menú de navegación
 * Cada elemento tiene un id, nombre visible e icono de FontAwesome
 */
const elementosMenu = [
    { id: 'inicio',    nombre: 'Inicio',    icono: 'fa-home'     },
    { id: 'perfil',    nombre: 'Perfil',    icono: 'fa-user'     },
    { id: 'eventos',   nombre: 'Eventos',   icono: 'fa-calendar' },
    { id: 'buscar',    nombre: 'Buscar',    icono: 'fa-search'   },
    { id: 'historial', nombre: 'Historial', icono: 'fa-history'  },
]

// =============================================================================
// FUNCIONES DE NAVEGACIÓN
// =============================================================================

/**
 * Navega a una página específica
 * Emite el evento al componente padre para que gestione el cambio
 *
 * @param {string} pagina - Identificador de la página destino
 */
function navegarA(pagina) {
    emitir('cambiarPagina', pagina)
}
</script>

<template>
    <!-- Overlay para cerrar el menú al tocar fuera (solo móvil) -->
    <div
        v-if="propiedades.abierto"
        class="overlay-movil"
        @click="emitir('cerrarMenu')"
    ></div>

    <!--
      Barra lateral con navegación principal
      Usa la clase CSS definida en main.css
    -->
    <aside class="barra-lateral" :class="{ abierto: propiedades.abierto }">

        <!-- Botón cerrar (solo visible en móvil) -->
        <button class="boton-cerrar-menu" @click="emitir('cerrarMenu')" aria-label="Cerrar menú">
            <i class="fas fa-times"></i>
        </button>

        <!-- =================================================================
             LOGO DE LA APLICACIÓN
             Clicable para volver al inicio
        ================================================================= -->
        <div class="logo" @click="navegarA('inicio')">
            <!-- Contenedor del icono del logo -->
            <div class="logo-icono">
                <i class="fas fa-music"></i>
            </div>
            <!-- Nombre de la aplicación -->
            <h1>Sonalya</h1>
        </div>

        <!-- =================================================================
             MENÚ DE NAVEGACIÓN
             Lista de enlaces a las diferentes secciones
        ================================================================= -->
        <nav class="menu-navegacion">
            <!--
              Iterar sobre los elementos del menú
              Aplicar clase 'activo' al elemento de la página actual
            -->
            <a
                v-for="elemento in elementosMenu"
                :key="elemento.id"
                href="#"
                class="elemento-nav"
                :class="{ activo: paginaActual === elemento.id }"
                @click.prevent="navegarA(elemento.id)"
            >
                <!-- Icono del elemento -->
                <i :class="['fas', elemento.icono]"></i>
                <!-- Texto del elemento -->
                <span>{{ elemento.nombre }}</span>
            </a>

            <!-- Panel de administración: solo visible para admins -->
            <a
                v-if="almacenApp.usuario?.tipo === 'admin'"
                href="#"
                class="elemento-nav elemento-admin"
                :class="{ activo: paginaActual === 'admin' }"
                @click.prevent="navegarA('admin')"
            >
                <i class="fas fa-shield-alt"></i>
                <span>Admin</span>
            </a>
        </nav>
    </aside>
</template>

<style scoped>
.elemento-admin {
    margin-top: auto;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    color: #f59e0b;
}
.elemento-admin:hover,
.elemento-admin.activo {
    color: #fbbf24;
    background: rgba(245, 158, 11, 0.15);
}

/* Overlay oscuro detrás del menú en móvil */
.overlay-movil {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 299;
    backdrop-filter: blur(2px);
}

/* Botón X para cerrar el menú (oculto en escritorio/tablet) */
.boton-cerrar-menu {
    display: none;
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    color: var(--texto-gris);
    font-size: 18px;
    cursor: pointer;
    padding: 6px 8px;
    border-radius: 6px;
    transition: color 0.2s, background 0.2s;
}
.boton-cerrar-menu:hover {
    color: var(--texto-blanco);
    background: rgba(255, 255, 255, 0.1);
}

@media (max-width: 768px) {
    .boton-cerrar-menu {
        display: flex;
        align-items: center;
        justify-content: center;
    }
}
</style>
