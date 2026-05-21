/**
 * =============================================================================
 * PUNTO DE ENTRADA PRINCIPAL DE LA APLICACIÓN
 * =============================================================================
 *
 * Este es el archivo principal que inicializa la aplicación Vue.js.
 * Aquí se configura la instancia de Vue, se importan los estilos globales
 * y se monta la aplicación en el DOM.
 *
 * Flujo de inicialización:
 * 1. Importar Vue y el componente raíz
 * 2. Importar estilos CSS globales
 * 3. Crear la instancia de la aplicación
 * 4. Montar la aplicación en el elemento #app
 *
 * @author Sonalya Team
 * @version 1.0.0
 */

// -----------------------------------------------------------------------------
// IMPORTACIONES
// -----------------------------------------------------------------------------

// Función principal de Vue para crear aplicaciones
import { createApp } from 'vue'

// Componente raíz de la aplicación
// Contiene toda la estructura principal y el layout
import App from './App.vue'

// -----------------------------------------------------------------------------
// ESTILOS GLOBALES
// -----------------------------------------------------------------------------

/**
 * Importar los estilos CSS globales de la aplicación
 * Incluye variables CSS, reset, tipografía y componentes base
 */
import './assets/css/main.css'

// -----------------------------------------------------------------------------
// INICIALIZACIÓN DE LA APLICACIÓN
// -----------------------------------------------------------------------------

/**
 * Crear la instancia principal de Vue
 * El componente App.vue actúa como contenedor raíz
 */
const aplicacion = createApp(App)

/**
 * Montar la aplicación en el elemento del DOM con id="app"
 * Este elemento está definido en index.html
 *
 * Una vez montada, Vue toma el control del elemento y su contenido,
 * renderizando la interfaz de usuario de forma reactiva
 */
aplicacion.mount('#app')
