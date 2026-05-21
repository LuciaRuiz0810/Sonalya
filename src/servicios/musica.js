import { api } from './api'

export const musica = {
    obtenerCharts:     ()   => api.get('/musica/charts'),
    obtenerGeneros:    ()   => api.get('/musica/generos'),
    buscar:            (q)  => api.get('/musica/buscar?q=' + encodeURIComponent(q)),
    obtenerArtista:    (id) => api.get(`/musica/artista/${id}`),
    obtenerAlbum:      (id) => api.get(`/musica/album/${id}`),
    obtenerEmergentes: ()   => api.get('/musica/emergentes'),
    obtenerGenero:     (id, nombre) => api.get(`/musica/genero/${id}?nombre=${encodeURIComponent(nombre)}`),
    buscarPlataforma:  (q) => api.get('/musica/buscar-plataforma?q=' + encodeURIComponent(q)),
}
