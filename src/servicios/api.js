const URL_API = 'http://localhost:8000/api'

function obtenerCabeceras(esFormData = false) {
    const token = localStorage.getItem('token_auth')
    const cabeceras = { 'Accept': 'application/json' }
    if (!esFormData) cabeceras['Content-Type'] = 'application/json'
    if (token) cabeceras['Authorization'] = `Bearer ${token}`
    return cabeceras
}

async function peticion(ruta, opciones = {}) {
    const respuesta = await fetch(`${URL_API}${ruta}`, {
        ...opciones,
        headers: obtenerCabeceras(),
    })
    const datos = await respuesta.json()
    if (!respuesta.ok) throw datos
    return datos
}

async function peticionFormData(ruta, formData) {
    const respuesta = await fetch(`${URL_API}${ruta}`, {
        method: 'POST',
        headers: obtenerCabeceras(true),
        body: formData,
    })
    const datos = await respuesta.json()
    if (!respuesta.ok) throw datos
    return datos
}

export const api = {
    get:    (ruta)          => peticion(ruta, { method: 'GET' }),
    post:   (ruta, cuerpo)  => peticion(ruta, { method: 'POST',  body: JSON.stringify(cuerpo) }),
    put:    (ruta, cuerpo)  => peticion(ruta, { method: 'PUT',   body: JSON.stringify(cuerpo) }),
    delete: (ruta)          => peticion(ruta, { method: 'DELETE' }),
    upload: (ruta, formData) => peticionFormData(ruta, formData),
}
