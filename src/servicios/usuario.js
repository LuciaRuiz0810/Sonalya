import { api } from './api'

export const usuario = {
    // Playlists
    playlists:          ()         => api.get('/playlists'),
    obtenerPlaylist:    (id)       => api.get(`/playlists/${id}`),
    crearPlaylist:      (datos)    => api.post('/playlists', datos),
    actualizarPlaylist:     (id, datos)     => api.put(`/playlists/${id}`, datos),
    subirImagenPlaylist:   (id, formData)  => api.upload(`/playlists/${id}/imagen`, formData),
    eliminarPlaylist:   (id)       => api.delete(`/playlists/${id}`),
    agregarCancion:     (id, c)    => api.post(`/playlists/${id}/canciones`, c),
    quitarCancion:      (id, cid)  => api.delete(`/playlists/${id}/canciones/${cid}`),

    // Favoritos — canciones
    cancionesFav:       ()         => api.get('/favoritos/canciones'),
    agregarCancionFav:  (datos)    => api.post('/favoritos/canciones', datos),
    quitarCancionFav:   (deezerId) => api.delete(`/favoritos/canciones/${deezerId}`),

    // Favoritos — álbumes
    albumesFav:         ()         => api.get('/favoritos/albumes'),
    agregarAlbumFav:    (datos)    => api.post('/favoritos/albumes', datos),
    quitarAlbumFav:     (deezerId) => api.delete(`/favoritos/albumes/${deezerId}`),

    // Favoritos — artistas
    artistasSeguidos:       ()         => api.get('/favoritos/artistas'),
    seguirArtista:          (datos)    => api.post('/favoritos/artistas', datos),
    dejarSeguirArtista:     (deezerId) => api.delete(`/favoritos/artistas/${deezerId}`),
    estadoFavorito:         (tipo, id) => api.get(`/favoritos/estado/${tipo}/${id}`),

    // Historial
    historial:          ()         => api.get('/historial'),
    registrarHistorial: (datos)    => api.post('/historial', datos),

    // Eventos
    eventos:              ()   => api.get('/eventos'),
    eventosSeguidos:      ()   => api.get('/eventos/seguidos'),
    eventosTalentos:      ()   => api.get('/eventos/nuevos-talentos'),
    comprarEntrada:       (id) => api.post(`/eventos/${id}/comprar`, {}),
    misEntradas:          ()   => api.get('/mis-entradas'),

    // Recomendaciones
    recomendaciones:      ()   => api.get('/recomendaciones'),
    cancionesPopulares:   ()   => api.get('/historial/populares'),

    // Artistas de la plataforma (públicos)
    artistas:                   ()   => api.get('/artistas-plataforma'),
    artistaPlataforma:          (id) => api.get(`/artistas-plataforma/${id}`),
    cancionesAlbumArtista:      (_artistaId, albumId) => api.get(`/artistas-plataforma/album/${albumId}`),
    seguirArtistaPlataforma:    (id) => api.post(`/artistas-plataforma/${id}/seguir`, {}),
    dejarSeguirArtistaPlataforma: (id) => api.delete(`/artistas-plataforma/${id}/seguir`),
    estadoSeguimientoArtista:   (id) => api.get(`/artistas-plataforma/${id}/estado-seguimiento`),
    reproducirCancionArtista:   (artistaId, cancionId) => api.post(`/artistas-plataforma/${artistaId}/reproducir/${cancionId}`, {}),

    // Cuenta
    cambiarPassword: (datos) => api.put('/usuario/cambiar-password', datos),

    // Gestión propia del artista
    miPerfilArtista:         ()          => api.get('/artista-cuenta/perfil'),
    actualizarPerfilArtista: (datos)     => api.put('/artista-cuenta/perfil', datos),
    estadisticasArtista:     ()          => api.get('/artista-cuenta/estadisticas'),
    misCancionesArtista:     ()          => api.get('/artista-cuenta/canciones'),
    crearCancion:            (datos)     => api.post('/artista-cuenta/canciones', datos),
    actualizarCancion:       (id, datos) => api.put(`/artista-cuenta/canciones/${id}`, datos),
    eliminarCancionArtista:  (id)        => api.delete(`/artista-cuenta/canciones/${id}`),
    misAlbumesArtista:       ()          => api.get('/artista-cuenta/albumes'),
    crearAlbum:              (datos)     => api.post('/artista-cuenta/albumes', datos),
    actualizarAlbum:         (id, datos) => api.put(`/artista-cuenta/albumes/${id}`, datos),
    eliminarAlbumArtista:    (id)        => api.delete(`/artista-cuenta/albumes/${id}`),

    // Eventos del artista
    misEventosArtista:       ()          => api.get('/artista-cuenta/eventos'),
    crearEventoArtista:      (datos)     => api.upload('/artista-cuenta/eventos', datos),
    actualizarEventoArtista: (id, datos) => api.upload(`/artista-cuenta/eventos/${id}`, datos),
    eliminarEventoArtista:   (id)        => api.delete(`/artista-cuenta/eventos/${id}`),
}
