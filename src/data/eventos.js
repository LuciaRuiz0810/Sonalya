/**
 * =============================================================================
 * DATOS DE EVENTOS Y CONCIERTOS
 * =============================================================================
 *
 * Este archivo contiene todos los datos relacionados con eventos musicales,
 * conciertos y festivales disponibles en la aplicación Sonalya.
 *
 * En producción, estos datos vendrían de una API conectada a servicios de
 * venta de entradas y calendarios de eventos.
 *
 * Estructura de datos:
 * - Eventos próximos: Conciertos disponibles para compra
 * - Eventos guardados: Conciertos que el usuario ha guardado/comprado
 * - Eventos para calendario: Formato compatible con FullCalendar
 * - Tipos de entradas: Opciones de tickets disponibles
 *
 * @author Sonalya Team
 * @version 1.0.0
 */

// =============================================================================
// EVENTOS PRÓXIMOS DISPONIBLES
// =============================================================================

/**
 * Lista de eventos próximos disponibles para compra
 * Incluye información completa del evento: fecha, ubicación, precio, etc.
 *
 * @type {Array<Object>}
 * @property {number} id - Identificador único del evento
 * @property {string} nombre - Nombre del evento o concierto
 * @property {string} artista - Artista(s) principal(es)
 * @property {string} ubicacion - Lugar donde se celebra el evento
 * @property {string} hora - Horario del evento
 * @property {string} dia - Día del mes (formato DD)
 * @property {string} mes - Abreviatura del mes (formato MMM)
 * @property {string} fecha - Fecha completa en formato ISO (YYYY-MM-DD)
 * @property {string} imagen - URL de la imagen promocional
 * @property {number} precio - Precio base de la entrada en euros
 * @property {string} color - Color identificativo del evento (hex)
 */
export const listaEventosProximos = [
    {
        id: 1,
        nombre: 'Noche Electrónica',
        artista: 'DJ Calvin Harris',
        ubicacion: 'Club Pacha, Valencia',
        hora: '22:00 - 05:00',
        dia: '25',
        mes: 'OCT',
        fecha: '2025-10-25',
        imagen: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=240&h=240&fit=crop',
        precio: 25,
        color: '#ff6b6b'
    },
    {
        id: 2,
        nombre: 'Acústico Indie',
        artista: 'León Benavente',
        ubicacion: 'Café Central, Sevilla',
        hora: '19:00 - 21:00',
        dia: '05',
        mes: 'NOV',
        fecha: '2025-11-05',
        imagen: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=240&h=240&fit=crop',
        precio: 15,
        color: '#4ecdc4'
    },
    {
        id: 3,
        nombre: 'Festival Rock Nation',
        artista: 'Foo Fighters, Green Day',
        ubicacion: 'Estadio Wanda, Madrid',
        hora: '16:00 - 23:00',
        dia: '12',
        mes: 'NOV',
        fecha: '2025-11-12',
        imagen: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=240&h=240&fit=crop',
        precio: 45,
        color: '#45b7d1'
    }
]

// Exportar también con nombre anterior para compatibilidad
export const eventosProximos = listaEventosProximos

// =============================================================================
// EVENTOS GUARDADOS POR EL USUARIO
// =============================================================================

/**
 * Lista de eventos que el usuario ha guardado o para los que ha comprado entrada
 * Estos eventos aparecen en la sección "Mis Eventos Guardados"
 *
 * @type {Array<Object>}
 */
export const listaEventosGuardados = [
    {
        id: 4,
        nombre: 'Music of the Spheres Tour',
        artista: 'Coldplay',
        ubicacion: 'Estadio Santiago Bernabéu, Madrid',
        hora: '21:00 - 23:30',
        dia: '15',
        mes: 'NOV',
        fecha: '2025-11-15',
        imagen: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=240&h=240&fit=crop',
        precio: 85,
        color: '#96ceb4',
        guardado: true  // Indica que el usuario ya tiene este evento guardado
    },
    {
        id: 5,
        nombre: 'Barcelona Jazz Festival',
        artista: 'Jamie Cullum, Gregory Porter',
        ubicacion: 'Palau de la Música, Barcelona',
        hora: '20:00 - 23:00',
        dia: '20',
        mes: 'NOV',
        fecha: '2025-11-20',
        imagen: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=240&h=240&fit=crop',
        precio: 65,
        color: '#feca57',
        guardado: true
    }
]

// Exportar también con nombre anterior para compatibilidad
export const eventosGuardados = listaEventosGuardados

// =============================================================================
// EVENTOS PARA EL CALENDARIO (Formato FullCalendar)
// =============================================================================

/**
 * Lista de eventos formateada para la librería FullCalendar
 * Este formato es específico para la integración con el componente de calendario
 *
 * Documentación de FullCalendar: https://fullcalendar.io/docs/event-object
 *
 * @type {Array<Object>}
 * @property {string} title - Título que se muestra en el calendario
 * @property {string} start - Fecha de inicio en formato ISO
 * @property {string} color - Color de fondo del evento en el calendario
 * @property {Object} extendedProps - Propiedades adicionales personalizadas
 */
export const listaEventosCalendario = [
    {
        title: 'Noche Electrónica',
        start: '2025-10-25',
        color: '#ff6b6b',
        extendedProps: {
            type: 'disponible',           // Estado del evento
            descripcion: 'Evento de música electrónica',
            ubicacion: 'Club Pacha, Valencia',
            precio: '€25.00'
        }
    },
    {
        title: 'Acústico Indie',
        start: '2025-11-05',
        color: '#4ecdc4',
        extendedProps: {
            type: 'disponible',
            descripcion: 'Sesión acústica indie',
            ubicacion: 'Café Central, Sevilla',
            precio: '€15.00'
        }
    },
    {
        title: 'Festival Rock Nation',
        start: '2025-11-12',
        color: '#45b7d1',
        extendedProps: {
            type: 'disponible',
            descripcion: 'Festival de rock',
            ubicacion: 'Estadio Wanda, Madrid',
            precio: '€45.00'
        }
    },
    {
        title: 'Music of the Spheres Tour',
        start: '2025-11-15',
        color: '#96ceb4',
        extendedProps: {
            type: 'disponible',
            descripcion: 'Concierto de Coldplay',
            ubicacion: 'Estadio Santiago Bernabéu, Madrid',
            precio: '€85.00'
        }
    },
    {
        title: 'Barcelona Jazz Festival',
        start: '2025-11-20',
        color: '#feca57',
        extendedProps: {
            type: 'disponible',
            descripcion: 'Festival de jazz',
            ubicacion: 'Palau de la Música, Barcelona',
            precio: '€65.00'
        }
    }
]

// Exportar también con nombre anterior para compatibilidad
export const eventosCalendario = listaEventosCalendario

// =============================================================================
// TIPOS DE ENTRADAS DISPONIBLES
// =============================================================================

/**
 * Lista de tipos de entradas disponibles para la compra
 * Se muestran en el modal de compra de entradas
 *
 * @type {Array<Object>}
 * @property {string} id - Identificador único del tipo de entrada
 * @property {string} nombre - Nombre del tipo de entrada
 * @property {string} descripcion - Descripción de lo que incluye
 * @property {number} precio - Precio en euros
 */
export const listaTiposEntradas = [
    {
        id: 'general',
        nombre: 'General',
        descripcion: 'Acceso general al estadio',
        precio: 65
    },
    {
        id: 'vip',
        nombre: 'VIP',
        descripcion: 'Asientos preferenciales + Merchandising',
        precio: 150
    },
    {
        id: 'platinum',
        nombre: 'Platinum',
        descripcion: 'Acceso exclusivo + Meet & Greet',
        precio: 350
    }
]

// Exportar también con nombre anterior para compatibilidad
export const tiposEntradas = listaTiposEntradas
