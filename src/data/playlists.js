/**
 * =============================================================================
 * DATOS DE PLAYLISTS Y CONTENIDO MUSICAL
 * =============================================================================
 *
 * Este archivo contiene todos los datos estáticos relacionados con el contenido
 * musical de la aplicación Sonalya. Incluye playlists, álbumes, canciones,
 * categorías y artistas.
 *
 * En producción, estos datos vendrían de una API REST conectada a una base
 * de datos. Por ahora, sirven como datos de demostración para el frontend.
 *
 * Estructura de datos:
 * - Playlists destacadas: Las más populares del usuario
 * - Playlists recomendadas: Sugerencias basadas en gustos
 * - Álbumes recientes: Historial de reproducción
 * - Nuevos lanzamientos: Últimas novedades musicales
 * - Categorías: Géneros musicales para explorar
 * - Búsquedas recientes: Historial de búsqueda del usuario
 * - Canciones favoritas: Lista de canciones marcadas como favoritas
 * - Artistas seguidos: Artistas que el usuario sigue
 *
 * @author Sonalya Team
 * @version 1.0.0
 */

// =============================================================================
// PLAYLISTS DESTACADAS
// =============================================================================

/**
 * Lista de playlists más escuchadas por el usuario
 * Aparecen en la sección principal de la página de inicio
 *
 * @type {Array<{id: number, nombre: string, imagen: string, descripcion: string}>}
 */
export const listaPlaylistsDestacadas = [
    {
        id: 1,
        nombre: 'Gym Motivation',
        imagen: 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=400&h=400&fit=crop',
        descripcion: 'Música para entrenar • 42 canciones'
    },
    {
        id: 2,
        nombre: 'Focus Time',
        imagen: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=400&fit=crop',
        descripcion: 'Jazz y lo-fi • 68 canciones'
    },
    {
        id: 3,
        nombre: 'Road Trip',
        imagen: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
        descripcion: 'Éxitos del momento • 35 canciones'
    },
    {
        id: 4,
        nombre: 'Melodías que brillan',
        imagen: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
        descripcion: 'Música acústica • 28 canciones'
    }
]

// Exportar también con nombre anterior para compatibilidad
export const playlistsDestacadas = listaPlaylistsDestacadas

// =============================================================================
// PLAYLISTS RECOMENDADAS
// =============================================================================

/**
 * Lista de playlists recomendadas basadas en los gustos del usuario
 * El algoritmo de recomendación analiza el historial de escucha
 *
 * @type {Array<{id: number, nombre: string, imagen: string, descripcion: string}>}
 */
export const listaPlaylistsRecomendadas = [
    {
        id: 5,
        nombre: 'Playlist Chill',
        imagen: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop',
        descripcion: 'Tu música relajante'
    },
    {
        id: 6,
        nombre: 'Energía para el día',
        imagen: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&h=400&fit=crop',
        descripcion: 'Los mejores éxitos'
    },
    {
        id: 7,
        nombre: 'Electrónica',
        imagen: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop',
        descripcion: 'Beats modernos'
    },
    {
        id: 8,
        nombre: 'Jazz Suave',
        imagen: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop',
        descripcion: 'Noches tranquilas'
    }
]

// Exportar también con nombre anterior para compatibilidad
export const playlistsRecomendadas = listaPlaylistsRecomendadas

// =============================================================================
// ÁLBUMES ESCUCHADOS RECIENTEMENTE
// =============================================================================

/**
 * Historial de álbumes reproducidos recientemente
 * Se actualiza cada vez que el usuario escucha un álbum completo
 *
 * @type {Array<{id: number, nombre: string, imagen: string, artista: string}>}
 */
export const listaAlbumsRecientes = [
    {
        id: 9,
        nombre: 'After Hours',
        imagen: 'https://upload.wikimedia.org/wikipedia/en/c/c1/The_Weeknd_-_After_Hours.png',
        artista: 'The Weeknd'
    },
    {
        id: 10,
        nombre: 'Future Nostalgia',
        imagen: 'https://upload.wikimedia.org/wikipedia/en/f/f5/Dua_Lipa_-_Future_Nostalgia_%28Official_Album_Cover%29.png',
        artista: 'Dua Lipa'
    },
    {
        id: 11,
        nombre: 'Sweetener',
        imagen: 'https://upload.wikimedia.org/wikipedia/en/7/7a/Sweetener_album_cover.png',
        artista: 'Ariana Grande'
    },
    {
        id: 12,
        nombre: 'Un Verano Sin Ti',
        imagen: 'https://upload.wikimedia.org/wikipedia/en/6/60/Bad_Bunny_-_Un_Verano_Sin_Ti.png',
        artista: 'Bad Bunny'
    }
]

// Exportar también con nombre anterior para compatibilidad
export const albumsRecientes = listaAlbumsRecientes

// =============================================================================
// NUEVOS LANZAMIENTOS
// =============================================================================

/**
 * Lista de álbumes y singles recién lanzados
 * Se actualiza semanalmente con las últimas novedades del catálogo
 *
 * @type {Array<{id: number, nombre: string, imagen: string, artista: string}>}
 */
export const listaNuevosLanzamientos = [
    {
        id: 13,
        nombre: 'GUTS',
        imagen: 'https://i.scdn.co/image/ab67616d0000b273e85259a1cae29a8d91f2093d',
        artista: 'Olivia Rodrigo'
    },
    {
        id: 14,
        nombre: 'Scorpion',
        imagen: 'https://upload.wikimedia.org/wikipedia/en/9/90/Scorpion_by_Drake.jpg',
        artista: 'Drake'
    },
    {
        id: 15,
        nombre: 'Midnights',
        imagen: 'https://upload.wikimedia.org/wikipedia/en/9/9f/Midnights_-_Taylor_Swift.png',
        artista: 'Taylor Swift'
    },
    {
        id: 16,
        nombre: '÷ (Divide)',
        imagen: 'https://upload.wikimedia.org/wikipedia/en/4/45/Divide_cover.png',
        artista: 'Ed Sheeran'
    }
]

// Exportar también con nombre anterior para compatibilidad
export const nuevosLanzamientos = listaNuevosLanzamientos

// =============================================================================
// CATEGORÍAS DE GÉNEROS MUSICALES
// =============================================================================

/**
 * Lista de categorías/géneros musicales para explorar
 * Cada categoría tiene un icono de FontAwesome y un gradiente de color único
 *
 * @type {Array<{id: number, nombre: string, icono: string, color: string}>}
 */
export const listaCategorias = [
    {
        id: 1,
        nombre: 'Pop',
        icono: 'fa-music',
        color: 'linear-gradient(135deg, #ff6b6b, #ff5252)'
    },
    {
        id: 2,
        nombre: 'Rock',
        icono: 'fa-guitar',
        color: 'linear-gradient(135deg, #4ecdc4, #44a08d)'
    },
    {
        id: 3,
        nombre: 'Indie',
        icono: 'fa-leaf',
        color: 'linear-gradient(135deg, #a8e6cf, #3ecc71)'
    },
    {
        id: 4,
        nombre: 'Hip Hop',
        icono: 'fa-microphone-alt',
        color: 'linear-gradient(135deg, #ffd93d, #f39c12)'
    },
    {
        id: 5,
        nombre: 'Electrónica',
        icono: 'fa-bolt',
        color: 'linear-gradient(135deg, #a8c0ff, #3f5efb)'
    },
    {
        id: 6,
        nombre: 'Latina',
        icono: 'fa-fire',
        color: 'linear-gradient(135deg, #fc6c85, #d946c4)'
    },
    {
        id: 7,
        nombre: 'Jazz',
        icono: 'fa-music',
        color: 'linear-gradient(135deg, #667eea, #764ba2)'
    },
    {
        id: 8,
        nombre: 'Clásica',
        icono: 'fa-music',
        color: 'linear-gradient(135deg, #ffa751, #ff6b95)'
    }
]

// Exportar también con nombre anterior para compatibilidad
export const categorias = listaCategorias

// =============================================================================
// HISTORIAL DE BÚSQUEDAS RECIENTES
// =============================================================================

/**
 * Lista de búsquedas recientes del usuario
 * Permite acceso rápido a artistas y canciones buscados anteriormente
 *
 * @type {Array<{id: number, nombre: string, tipo: string, artista?: string, imagen: string}>}
 */
export const listaBusquedasRecientes = [
    {
        id: 1,
        nombre: 'Blinding Lights',
        tipo: 'Canción',
        artista: 'The Weeknd',
        imagen: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80&h=80&fit=crop'
    },
    {
        id: 2,
        nombre: 'Dua Lipa',
        tipo: 'Artista',
        imagen: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop'
    },
    {
        id: 3,
        nombre: 'Arctic Monkeys',
        tipo: 'Artista',
        imagen: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=80&h=80&fit=crop'
    }
]

// Exportar también con nombre anterior para compatibilidad
export const busquedasRecientes = listaBusquedasRecientes

// =============================================================================
// CANCIONES FAVORITAS DEL USUARIO
// =============================================================================

/**
 * Lista de canciones marcadas como favoritas por el usuario
 * Se muestran en la pestaña "Favoritos" del perfil
 *
 * @type {Array<{id: number, titulo: string, artista: string, album: string, duracion: string, imagen: string}>}
 */
export const listaCancionesFavoritas = [
    {
        id: 1,
        titulo: 'Blinding Lights',
        artista: 'The Weeknd',
        album: 'After Hours',
        duracion: '3:20',
        imagen: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80&h=80&fit=crop'
    },
    {
        id: 2,
        titulo: 'Levitating',
        artista: 'Dua Lipa',
        album: 'Future Nostalgia',
        duracion: '3:23',
        imagen: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop'
    },
    {
        id: 3,
        titulo: 'Save Your Tears',
        artista: 'The Weeknd',
        album: 'After Hours',
        duracion: '3:35',
        imagen: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=80&h=80&fit=crop'
    },
    {
        id: 4,
        titulo: 'Do I Wanna Know?',
        artista: 'Arctic Monkeys',
        album: 'AM',
        duracion: '4:32',
        imagen: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=80&h=80&fit=crop'
    }
]

// Exportar también con nombre anterior para compatibilidad
export const cancionesFavoritas = listaCancionesFavoritas

// =============================================================================
// ARTISTAS SEGUIDOS POR EL USUARIO
// =============================================================================

/**
 * Lista de artistas que el usuario sigue
 * Recibe notificaciones de nuevos lanzamientos de estos artistas
 *
 * @type {Array<{id: number, nombre: string, oyentes: string, imagen: string}>}
 */
export const listaArtistasSeguidos = [
    {
        id: 1,
        nombre: 'The Weeknd',
        oyentes: '15.2M oyentes mensuales',
        imagen: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop'
    },
    {
        id: 2,
        nombre: 'Dua Lipa',
        oyentes: '42.8M oyentes mensuales',
        imagen: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop'
    },
    {
        id: 3,
        nombre: 'Arctic Monkeys',
        oyentes: '28.5M oyentes mensuales',
        imagen: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&h=300&fit=crop'
    },
    {
        id: 4,
        nombre: 'Bad Bunny',
        oyentes: '68.3M oyentes mensuales',
        imagen: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=300&h=300&fit=crop'
    }
]

// Exportar también con nombre anterior para compatibilidad
export const artistasSeguidos = listaArtistasSeguidos
