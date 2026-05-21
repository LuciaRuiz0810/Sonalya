<!--
  =============================================================================
  COMPONENTE MODAL (Ventana Emergente)
  =============================================================================

  Componente reutilizable para mostrar contenido en una ventana modal.
  Incluye animaciones de entrada/salida y cierre al hacer clic en el fondo.

  Estructura del modal:
  - Fondo oscuro semi-transparente (backdrop)
  - Ventana centrada con cabecera, cuerpo y acciones
  - Usa Teleport para renderizar fuera del árbol DOM padre

  Props:
  - visible: Controla si el modal está visible
  - titulo: Texto del título en la cabecera

  Eventos emitidos:
  - cerrar: Se emite cuando el usuario cierra el modal

  Slots:
  - default: Contenido principal del modal (cuerpo)
  - acciones: Botones de acción en el footer (opcional)

  Uso:
  <Modal :visible="mostrarModal" titulo="Mi Título" @cerrar="mostrarModal = false">
    <p>Contenido del modal</p>
    <template #acciones>
      <button @click="guardar">Guardar</button>
    </template>
  </Modal>

  @author Sonalya Team
  @version 1.0.0
-->

<script setup>
// =============================================================================
// PROPS
// =============================================================================

const propiedades = defineProps({
    /**
     * Controla la visibilidad del modal
     * Cuando es true, el modal se muestra con animación
     */
    visible: {
        type: Boolean,
        default: false
    },

    /**
     * Título que se muestra en la cabecera del modal
     */
    titulo: {
        type: String,
        default: ''
    }
})

// =============================================================================
// EVENTOS
// =============================================================================

const emitir = defineEmits(['cerrar'])

// =============================================================================
// FUNCIONES
// =============================================================================

/**
 * Cierra el modal emitiendo el evento al padre
 */
function cerrar() {
    emitir('cerrar')
}

/**
 * Maneja el clic en el fondo oscuro
 * Solo cierra si el clic fue directamente en el fondo
 * (no en el contenido del modal)
 *
 * @param {MouseEvent} evento - Evento del clic
 */
function alHacerClicEnFondo(evento) {
    // Verificar que el clic fue en el fondo, no en un elemento hijo
    if (evento.target === evento.currentTarget) {
        cerrar()
    }
}
</script>

<template>
    <!--
      Teleport mueve el contenido al body del documento
      Esto evita problemas de z-index y posicionamiento
    -->
    <Teleport to="body">
        <!--
          Transition añade animaciones de entrada y salida
          Las clases CSS están definidas en la sección de estilos
        -->
        <Transition name="fade">
            <!-- Fondo oscuro semi-transparente -->
            <div
                v-if="visible"
                class="fondo-modal activo"
                @click="alHacerClicEnFondo"
            >
                <!-- Ventana del modal -->
                <div class="modal">
                    <!-- =======================================================
                         CABECERA DEL MODAL
                    ======================================================= -->
                    <div class="cabecera-modal">
                        <!-- Título -->
                        <h2 class="titulo-modal">{{ titulo }}</h2>

                        <!-- Botón de cerrar (X) -->
                        <button class="cerrar-modal" @click="cerrar">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <!-- =======================================================
                         CUERPO DEL MODAL
                         Slot por defecto para el contenido
                    ======================================================= -->
                    <div class="cuerpo-modal">
                        <slot></slot>
                    </div>

                    <!-- =======================================================
                         ACCIONES DEL MODAL (Footer)
                         Solo se muestra si se proporciona el slot
                    ======================================================= -->
                    <div v-if="$slots.acciones" class="acciones-modal">
                        <slot name="acciones"></slot>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
/**
 * Estilos de las transiciones de entrada y salida
 * Vue aplica estas clases automáticamente durante las animaciones
 */

/* Estado activo de la transición (entrada y salida) */
.fade-enter-active,
.fade-leave-active {
    transition: all 0.3s ease;
}

/* Estado inicial (entrada) y final (salida) */
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* Animación de escala del modal durante las transiciones */
.fade-enter-from .modal,
.fade-leave-to .modal {
    transform: scale(0.95);
}
</style>
