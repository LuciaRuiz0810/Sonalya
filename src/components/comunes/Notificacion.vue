<!--
  =============================================================================
  COMPONENTE NOTIFICACIÓN (Toast)
  =============================================================================

  Muestra notificaciones temporales tipo "toast" en la esquina de la pantalla.
  Las notificaciones aparecen brevemente y desaparecen automáticamente.

  El componente está conectado al almacén global (appStore) y reacciona
  automáticamente cuando se actualiza el estado de la notificación.

  Características:
  - Animación de entrada/salida deslizante
  - Posición fija en la pantalla
  - Desaparición automática (controlada por el store)
  - Estilos consistentes con el tema de la aplicación

  Este componente no recibe props ni emite eventos, ya que su estado
  se gestiona completamente desde el almacén global.

  Uso:
  Simplemente incluir el componente en App.vue y usar la función
  mostrarNotificacion() del store para mostrar mensajes.

  @author Sonalya Team
  @version 1.0.0
-->

<script setup>
// =============================================================================
// IMPORTACIONES
// =============================================================================

// Importar el almacén global para acceder al estado de la notificación
import { almacenApp } from '@/stores/appStore'
</script>

<template>
    <!--
      Transition añade animaciones de entrada y salida
      La animación 'slide' desliza la notificación desde la derecha
    -->
    <Transition name="slide">
        <!--
          Contenedor de la notificación
          Solo se muestra cuando appStore.notificacion.visible es true
        -->
        <div v-if="almacenApp.notificacion.visible" class="notificacion">
            <!-- Texto del mensaje de notificación -->
            {{ almacenApp.notificacion.mensaje }}
        </div>
    </Transition>
</template>

<style scoped>
/**
 * Estilos de la animación de deslizamiento
 * La notificación entra desde la derecha y sale hacia la derecha
 */

/* Estado activo de la transición (entrada y salida) */
.slide-enter-active,
.slide-leave-active {
    transition: all 0.3s ease;
}

/* Estado inicial (entrada) y final (salida) */
.slide-enter-from,
.slide-leave-to {
    /* Desplazar 100px hacia la derecha */
    transform: translateX(100px);
    /* Hacerla invisible */
    opacity: 0;
}
</style>
