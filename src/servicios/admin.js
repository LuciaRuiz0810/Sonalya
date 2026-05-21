import { api } from './api'

export const admin = {
    estadisticas:      ()          => api.get('/admin/estadisticas'),

    usuarios:          ()          => api.get('/admin/usuarios'),
    crearUsuario:      (datos)     => api.post('/admin/usuarios', datos),
    actualizarUsuario: (id, datos) => api.put(`/admin/usuarios/${id}`, datos),
    eliminarUsuario:   (id)        => api.delete(`/admin/usuarios/${id}`),

    canciones:         ()          => api.get('/admin/canciones'),
    crearCancion:      (datos)     => api.post('/admin/canciones', datos),
    actualizarCancion: (id, datos) => api.put(`/admin/canciones/${id}`, datos),
    eliminarCancion:   (id)        => api.delete(`/admin/canciones/${id}`),

    albumes:           ()          => api.get('/admin/albumes'),
    crearAlbum:        (datos)     => api.post('/admin/albumes', datos),
    eliminarAlbum:     (id)        => api.delete(`/admin/albumes/${id}`),

    eventos:           ()          => api.get('/admin/eventos'),
    crearEvento:       (datos)     => api.post('/admin/eventos', datos),
    actualizarEvento:  (id, datos) => api.put(`/admin/eventos/${id}`, datos),
    eliminarEvento:    (id)        => api.delete(`/admin/eventos/${id}`),
}
