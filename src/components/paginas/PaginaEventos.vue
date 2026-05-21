<script setup>
import { ref, computed, onMounted } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import Modal from '@/components/comunes/Modal.vue'
import { almacenApp, mostrarNotificacion, abrirModalAuth, cacheGuardar, cacheObtener, cacheLimpiar } from '@/stores/appStore'
import { usuario as usuarioSvc } from '@/servicios/usuario'

const emitir = defineEmits(['irAPago', 'verEntrada', 'cambiarPagina'])

// ── Estado ────────────────────────────────────────────────────────────────────
const eventos               = ref([])
const misEntradas           = ref([])
const eventosSeguidos       = ref([])
const eventosTalentos       = ref([])
const cargando              = ref(false)
const cargandoEntradas      = ref(false)
const cargandoSeguidos      = ref(false)
const cargandoTalentos      = ref(false)

// Filtro de ciudad
const ciudadFiltro = ref('todas')
const textoBusqueda = ref('')

const ciudades = computed(() => {
    const set = new Set(eventos.value.map(e => e.ciudad).filter(Boolean))
    return ['todas', ...Array.from(set).sort()]
})

const eventosFiltrados = computed(() => {
    let lista = eventos.value
    if (ciudadFiltro.value !== 'todas') {
        lista = lista.filter(e => e.ciudad === ciudadFiltro.value)
    }
    if (textoBusqueda.value.trim()) {
        const q = textoBusqueda.value.trim().toLowerCase()
        lista = lista.filter(e =>
            e.nombre.toLowerCase().includes(q) ||
            e.artista.toLowerCase().includes(q) ||
            e.ciudad.toLowerCase().includes(q) ||
            e.lugar.toLowerCase().includes(q)
        )
    }
    return lista
})

// Modal de compra
const modalCompra        = ref(false)
const eventoSeleccionado = ref(null)
const comprando          = ref(false)
const entradaConfirmada  = ref(null)
const modalEntrada       = ref(false)

// Opciones de entrada
const tipoEntrada = ref('pista')
const cantidad    = ref(1)

const tiposEntrada = computed(() => {
    const tipos = eventoSeleccionado.value?.tipos_entrada
    if (tipos && tipos.length > 0) {
        return tipos.map(t => ({ id: t.tipo.toLowerCase(), label: t.tipo, precio: Number(t.precio) }))
    }
    // Fallback para eventos sin tipos definidos (creados por admin)
    const base = Number(eventoSeleccionado.value?.precio || 0)
    return [
        { id: 'pista',   label: 'Pista',   precio: base },
        { id: 'tribuna', label: 'Tribuna', precio: base + 20 },
        { id: 'vip',     label: 'VIP',     precio: base + 50 },
    ]
})

const precioUnit  = computed(() => tiposEntrada.value.find(t => t.id === tipoEntrada.value)?.precio ?? 0)
const cargosServ  = computed(() => +(precioUnit.value * cantidad.value * 0.1).toFixed(2))
const precioTotal = computed(() => +(precioUnit.value * cantidad.value + cargosServ.value).toFixed(2))

// Formulario de pago
const tarjeta = ref({ titular: '', numero: '', expiry: '', cvv: '' })
const erroresTarjeta = ref({})

function formatearNumeroTarjeta(val) {
    const digits = val.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(.{4})/g, '$1 ').trim()
}

function alEscribirNumero(e) {
    tarjeta.value.numero = formatearNumeroTarjeta(e.target.value)
}

function alEscribirExpiry(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4)
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2)
    tarjeta.value.expiry = v
}

function validarTarjeta() {
    const err = {}
    if (!tarjeta.value.titular.trim())                          err.titular = 'Introduce el nombre del titular'
    const digitos = tarjeta.value.numero.replace(/\s/g, '')
    if (digitos.length !== 16)                                  err.numero  = 'El número debe tener 16 dígitos'
    if (!/^\d{2}\/\d{2}$/.test(tarjeta.value.expiry))          err.expiry  = 'Formato MM/AA'
    if (!/^\d{3,4}$/.test(tarjeta.value.cvv))                  err.cvv     = 'CVV inválido'
    erroresTarjeta.value = err
    return Object.keys(err).length === 0
}

// ── FullCalendar ──────────────────────────────────────────────────────────────
const opcionesCalendario = {
    plugins:     [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale:      'es',
    height:      420,
    headerToolbar: {
        left:   'prev,next today',
        center: 'title',
        right:  ''
    },
    buttonText: { today: 'Hoy' },
    eventColor: '#8b5cf6',
    eventTextColor: '#ffffff',
    events: [],
}

const eventosCalendario = computed(() =>
    misEntradas.value.map(e => ({
        id:    String(e.id),
        title: e.evento.nombre,
        date:  e.evento.fecha.substring(0, 10),
        extendedProps: { entrada: e },
    }))
)

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatearFecha(fechaStr) {
    // Parsear manualmente para evitar que el navegador interprete la fecha como UTC
    // y retroceda un día en zonas UTC+ (p.ej. España UTC+2 en verano)
    const [datePart = '', timePart = '00:00'] = fechaStr.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hours, minutes] = timePart.replace('Z', '').split(':').map(Number)
    const f = new Date(year, month - 1, day, hours || 0, minutes || 0)
    return {
        dia:  f.getDate().toString().padStart(2, '0'),
        mes:  f.toLocaleString('es-ES', { month: 'short' }).toUpperCase(),
        hora: f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    }
}

function imagenEvento(evento) {
    // Imagen genérica si no hay
    return evento.imagen || `https://picsum.photos/seed/${evento.id}/200/200`
}

const TTL_EVENTOS   = 10 * 60_000  // 10 min
const TTL_SEGUIDOS  =  5 * 60_000  //  5 min

// ── Carga de datos ────────────────────────────────────────────────────────────
async function cargarEventos() {
    const cached = cacheObtener('eventos_lista')
    if (cached) { eventos.value = cached; cargando.value = false; return }
    try {
        cargando.value = true
        const resp = await usuarioSvc.eventos()
        eventos.value = resp.eventos || []
        cacheGuardar('eventos_lista', eventos.value, TTL_EVENTOS)
    } catch (_) {
        eventos.value = []
    } finally {
        cargando.value = false
    }
}

async function cargarEventosSeguidos() {
    if (!almacenApp.autenticado) return
    const cached = cacheObtener('eventos_seguidos')
    if (cached) { eventosSeguidos.value = cached; cargandoSeguidos.value = false; return }
    try {
        cargandoSeguidos.value = true
        const resp = await usuarioSvc.eventosSeguidos()
        eventosSeguidos.value = resp.eventos || []
        cacheGuardar('eventos_seguidos', eventosSeguidos.value, TTL_SEGUIDOS)
    } catch (_) {
        eventosSeguidos.value = []
    } finally {
        cargandoSeguidos.value = false
    }
}

async function cargarEventosTalentos() {
    const cached = cacheObtener('eventos_talentos')
    if (cached) { eventosTalentos.value = cached; cargandoTalentos.value = false; return }
    try {
        cargandoTalentos.value = true
        const resp = await usuarioSvc.eventosTalentos()
        eventosTalentos.value = resp.eventos || []
        cacheGuardar('eventos_talentos', eventosTalentos.value, TTL_EVENTOS)
    } catch (_) {
        eventosTalentos.value = []
    } finally {
        cargandoTalentos.value = false
    }
}

async function cargarMisEntradas() {
    if (!almacenApp.autenticado) return
    const cached = cacheObtener('eventos_mis_entradas')
    if (cached) { misEntradas.value = cached; cargandoEntradas.value = false; return }
    try {
        cargandoEntradas.value = true
        const resp = await usuarioSvc.misEntradas()
        misEntradas.value = resp.entradas || []
        cacheGuardar('eventos_mis_entradas', misEntradas.value, TTL_SEGUIDOS)
    } catch (_) {
        misEntradas.value = []
    } finally {
        cargandoEntradas.value = false
    }
}

onMounted(() => {
    cargarEventos()
    cargarEventosTalentos()
    if (almacenApp.autenticado) {
        cargarMisEntradas()
        cargarEventosSeguidos()
    }
})

// ── Compra de entradas ────────────────────────────────────────────────────────
function iniciarCompra(evento) {
    if (!almacenApp.autenticado) {
        abrirModalAuth('login')
        mostrarNotificacion('Inicia sesión para comprar entradas')
        return
    }
    eventoSeleccionado.value = evento
    tipoEntrada.value = 'pista'
    cantidad.value = 1
    tarjeta.value = { titular: '', numero: '', expiry: '', cvv: '' }
    erroresTarjeta.value = {}
    modalCompra.value = true
}

async function confirmarCompra() {
    if (!eventoSeleccionado.value) return
    if (!validarTarjeta()) return
    try {
        comprando.value = true
        const resp = await usuarioSvc.comprarEntrada(eventoSeleccionado.value.id)
        entradaConfirmada.value = {
            ...resp.entrada,
            tipo:     tipoEntrada.value,
            cantidad: cantidad.value,
            total:    precioTotal.value,
        }
        modalCompra.value = false
        modalEntrada.value = true
        mostrarNotificacion(`¡Entrada confirmada para ${eventoSeleccionado.value.nombre}!`)
        const ev = eventos.value.find(e => e.id === eventoSeleccionado.value.id)
        if (ev) ev.tiene_entrada = true
        misEntradas.value.push(resp.entrada)
        cacheLimpiar(['eventos_mis_entradas', 'eventos_lista'])
    } catch (err) {
        const msg = err?.message || 'Error al procesar la compra'
        mostrarNotificacion(msg)
        modalCompra.value = false
    } finally {
        comprando.value = false
    }
}

function verMiEntrada(entrada) {
    entradaConfirmada.value = entrada
    modalEntrada.value = true
}
</script>

<template>
    <div class="contenedor-contenido">

        <!-- Calendario — solo autenticados -->
        <section v-if="almacenApp.autenticado" class="seccion-calendario">
            <h2 class="titulo-seccion">Mi Calendario de Eventos</h2>
            <div class="calendario-wrap">
                <FullCalendar
                    :options="{ ...opcionesCalendario, events: eventosCalendario }"
                />
            </div>
            <p v-if="misEntradas.length === 0" class="calendario-vacio">
                <i class="fas fa-calendar-plus"></i>
                Aquí aparecerán los eventos que compres
            </p>
        </section>

        <!-- Banner invitado -->
        <div v-else class="banner-invitado-eventos">
            <div class="banner-invitado-icono"><i class="fas fa-ticket-alt"></i></div>
            <div class="banner-invitado-texto">
                <h3>¿Quieres comprar entradas?</h3>
                <p>Crea una cuenta gratuita para comprar entradas y acceder a tu calendario personal.</p>
            </div>
            <div class="banner-invitado-acciones">
                <button class="boton-principal" @click="abrirModalAuth('registro')">
                    <i class="fas fa-user-plus"></i> Registrarse gratis
                </button>
                <button class="boton-invitado-login" @click="abrirModalAuth('login')">Iniciar sesión</button>
            </div>
        </div>

        <!-- ================================================================
             EVENTOS DE ARTISTAS SEGUIDOS (solo autenticados)
        ================================================================ -->
        <section v-if="almacenApp.autenticado && (cargandoSeguidos || eventosSeguidos.length > 0)" class="seccion">
            <div class="titulo-seccion-con-badge-ev">
                <h2 class="titulo-seccion">Eventos de artistas que sigues</h2>
                <span class="badge-ev badge-ev-siguiendo"><i class="fas fa-heart"></i> Tus artistas</span>
            </div>
            <div v-if="cargandoSeguidos" class="estado-info-inline-ev">
                <i class="fas fa-spinner fa-spin"></i> <span>Cargando...</span>
            </div>
            <div v-else-if="eventosSeguidos.length === 0" class="estado-info-inline-ev">
                <i class="fas fa-info-circle"></i>
                <span>Ninguno de los artistas que sigues tiene eventos próximos.</span>
            </div>
            <div v-else class="lista-eventos">
                <div
                    v-for="evento in eventosSeguidos"
                    :key="evento.id"
                    class="tarjeta-evento"
                    :class="{ comprado: evento.tiene_entrada }"
                >
                    <div class="fecha-evento">
                        <div class="dia-evento">{{ formatearFecha(evento.fecha).dia }}</div>
                        <div class="mes-evento">{{ formatearFecha(evento.fecha).mes }}</div>
                    </div>
                    <div class="imagen-evento">
                        <img :src="imagenEvento(evento)" :alt="evento.nombre">
                    </div>
                    <div class="info-evento">
                        <h3>{{ evento.nombre }}</h3>
                        <p class="artista-evento">{{ evento.artista }}</p>
                        <p class="ubicacion-evento"><i class="fas fa-map-marker-alt"></i> {{ evento.lugar }}, {{ evento.ciudad }}</p>
                        <p class="hora-evento"><i class="fas fa-clock"></i> {{ formatearFecha(evento.fecha).hora }}</p>
                        <p class="precio-evento">
                            <i class="fas fa-tag"></i>
                            {{ Number(evento.precio).toFixed(2) }} €
                            <span class="aforo-badge">{{ evento.entradas_disponibles }} disponibles</span>
                        </p>
                    </div>
                    <div class="acciones-evento">
                        <button v-if="evento.tiene_entrada" class="boton-principal boton-comprado" disabled>
                            <i class="fas fa-check"></i> Entrada comprada
                        </button>
                        <button v-else-if="evento.entradas_disponibles === 0" class="boton-principal boton-agotado" disabled>
                            Agotado
                        </button>
                        <button v-else class="boton-principal" @click="iniciarCompra(evento)">
                            Comprar
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- ================================================================
             EVENTOS DE NUEVOS TALENTOS
        ================================================================ -->
        <section class="seccion">
            <div class="titulo-seccion-con-badge-ev">
                <h2 class="titulo-seccion">Nuevos Talentos en directo</h2>
                <span class="badge-ev badge-ev-talento"><i class="fas fa-seedling"></i> Emergentes</span>
            </div>
            <div v-if="cargandoTalentos" class="estado-info-inline-ev">
                <i class="fas fa-spinner fa-spin"></i> <span>Cargando...</span>
            </div>
            <div v-else-if="eventosTalentos.length === 0" class="estado-vacio-talentos">
                <i class="fas fa-seedling"></i>
                <p>Próximamente nuevos artistas emergentes</p>
            </div>
            <div v-else class="lista-eventos">
                <div
                    v-for="evento in eventosTalentos"
                    :key="evento.id"
                    class="tarjeta-evento"
                    :class="{ comprado: evento.tiene_entrada }"
                >
                    <div class="fecha-evento">
                        <div class="dia-evento">{{ formatearFecha(evento.fecha).dia }}</div>
                        <div class="mes-evento">{{ formatearFecha(evento.fecha).mes }}</div>
                    </div>
                    <div class="imagen-evento">
                        <img :src="imagenEvento(evento)" :alt="evento.nombre">
                    </div>
                    <div class="info-evento">
                        <h3>{{ evento.nombre }}</h3>
                        <p class="artista-evento">{{ evento.artista }}</p>
                        <p class="ubicacion-evento"><i class="fas fa-map-marker-alt"></i> {{ evento.lugar }}, {{ evento.ciudad }}</p>
                        <p class="hora-evento"><i class="fas fa-clock"></i> {{ formatearFecha(evento.fecha).hora }}</p>
                        <p class="precio-evento">
                            <i class="fas fa-tag"></i>
                            {{ Number(evento.precio).toFixed(2) }} €
                            <span class="aforo-badge">{{ evento.entradas_disponibles }} disponibles</span>
                        </p>
                    </div>
                    <div class="acciones-evento">
                        <button v-if="evento.tiene_entrada" class="boton-principal boton-comprado" disabled>
                            <i class="fas fa-check"></i> Entrada comprada
                        </button>
                        <button v-else-if="evento.entradas_disponibles === 0" class="boton-principal boton-agotado" disabled>
                            Agotado
                        </button>
                        <button
                            v-else
                            class="boton-principal"
                            :class="{ 'boton-bloqueado': !almacenApp.autenticado }"
                            @click="iniciarCompra(evento)"
                        >
                            <i v-if="!almacenApp.autenticado" class="fas fa-lock"></i>
                            Comprar
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Lista de próximos eventos -->
        <section class="seccion">
            <h2 class="titulo-seccion">
                {{ almacenApp.autenticado ? 'Próximos Eventos' : 'Eventos Populares' }}
            </h2>

            <!-- Barra de filtros -->
            <div v-if="!cargando && eventos.length > 0" class="filtros-eventos">
                <!-- Buscador libre -->
                <div class="buscador-eventos">
                    <i class="fas fa-search buscador-icono"></i>
                    <input
                        v-model="textoBusqueda"
                        class="buscador-input"
                        type="text"
                        placeholder="Buscar por artista, evento, recinto..."
                    >
                    <button v-if="textoBusqueda" class="buscador-limpiar" @click="textoBusqueda = ''">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Chips de ciudad -->
                <div class="chips-ciudad">
                    <button
                        v-for="ciudad in ciudades"
                        :key="ciudad"
                        class="chip-ciudad"
                        :class="{ activo: ciudadFiltro === ciudad }"
                        @click="ciudadFiltro = ciudad"
                    >
                        <i v-if="ciudad !== 'todas'" class="fas fa-map-marker-alt"></i>
                        {{ ciudad === 'todas' ? 'Todas las ciudades' : ciudad }}
                    </button>
                </div>

                <!-- Contador de resultados -->
                <p class="contador-resultados">
                    <template v-if="eventosFiltrados.length === eventos.length">
                        {{ eventos.length }} eventos disponibles
                    </template>
                    <template v-else-if="eventosFiltrados.length === 0">
                        Sin resultados para esta búsqueda
                    </template>
                    <template v-else>
                        {{ eventosFiltrados.length }} evento{{ eventosFiltrados.length !== 1 ? 's' : '' }}
                        {{ ciudadFiltro !== 'todas' ? `en ${ciudadFiltro}` : '' }}
                    </template>
                </p>
            </div>

            <div v-if="cargando" class="estado-info">
                <i class="fas fa-spinner fa-spin"></i> Cargando eventos...
            </div>

            <div v-else-if="eventos.length === 0" class="estado-info">
                <i class="fas fa-calendar-times"></i> No hay eventos disponibles
            </div>

            <div v-else-if="eventosFiltrados.length === 0" class="estado-vacio-filtro">
                <i class="fas fa-map-marker-alt"></i>
                <p>No hay eventos en <strong>{{ ciudadFiltro }}</strong> con esos criterios</p>
                <button class="boton-limpiar-filtro" @click="ciudadFiltro = 'todas'; textoBusqueda = ''">
                    Ver todos los eventos
                </button>
            </div>

            <div v-else class="lista-eventos">
                <div
                    v-for="evento in eventosFiltrados"
                    :key="evento.id"
                    class="tarjeta-evento"
                    :class="{ comprado: evento.tiene_entrada }"
                >
                    <div class="fecha-evento">
                        <div class="dia-evento">{{ formatearFecha(evento.fecha).dia }}</div>
                        <div class="mes-evento">{{ formatearFecha(evento.fecha).mes }}</div>
                    </div>

                    <div class="imagen-evento">
                        <img :src="imagenEvento(evento)" :alt="evento.nombre">
                    </div>

                    <div class="info-evento">
                        <h3>{{ evento.nombre }}</h3>
                        <p class="artista-evento">{{ evento.artista }}</p>
                        <p class="ubicacion-evento">
                            <i class="fas fa-map-marker-alt"></i>
                            {{ evento.lugar }}, {{ evento.ciudad }}
                        </p>
                        <p class="hora-evento">
                            <i class="fas fa-clock"></i>
                            {{ formatearFecha(evento.fecha).hora }}
                        </p>
                        <p class="precio-evento">
                            <i class="fas fa-tag"></i>
                            {{ Number(evento.precio).toFixed(2) }} €
                            <span class="aforo-badge">{{ evento.entradas_disponibles }} disponibles</span>
                        </p>
                    </div>

                    <div class="acciones-evento">
                        <button
                            v-if="evento.tiene_entrada"
                            class="boton-principal boton-comprado"
                            disabled
                        >
                            <i class="fas fa-check"></i> Entrada comprada
                        </button>
                        <button
                            v-else-if="evento.entradas_disponibles === 0"
                            class="boton-principal boton-agotado"
                            disabled
                        >
                            Agotado
                        </button>
                        <button
                            v-else
                            class="boton-principal"
                            :class="{ 'boton-bloqueado': !almacenApp.autenticado }"
                            @click="iniciarCompra(evento)"
                        >
                            <i v-if="!almacenApp.autenticado" class="fas fa-lock"></i>
                            Comprar
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Mis Entradas — solo autenticados -->
        <section v-if="almacenApp.autenticado && misEntradas.length > 0" class="seccion">
            <h2 class="titulo-seccion">Mis Entradas</h2>
            <div class="lista-eventos">
                <div
                    v-for="entrada in misEntradas"
                    :key="entrada.id"
                    class="tarjeta-evento comprado"
                >
                    <div class="fecha-evento">
                        <div class="dia-evento">{{ formatearFecha(entrada.evento.fecha).dia }}</div>
                        <div class="mes-evento">{{ formatearFecha(entrada.evento.fecha).mes }}</div>
                    </div>

                    <div class="info-evento">
                        <h3>{{ entrada.evento.nombre }}</h3>
                        <p class="artista-evento">{{ entrada.evento.artista }}</p>
                        <p class="ubicacion-evento">
                            <i class="fas fa-map-marker-alt"></i>
                            {{ entrada.evento.lugar }}, {{ entrada.evento.ciudad }}
                        </p>
                        <p class="hora-evento">
                            <i class="fas fa-clock"></i>
                            {{ formatearFecha(entrada.evento.fecha).hora }}
                        </p>
                        <p class="codigo-entrada-mini">
                            <i class="fas fa-qrcode"></i> {{ entrada.codigo }}
                        </p>
                    </div>

                    <div class="acciones-evento">
                        <button class="boton-principal" @click="verMiEntrada(entrada)">
                            <i class="fas fa-ticket-alt"></i> Ver Entrada
                        </button>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <!-- Modal: Compra de entrada -->
    <Modal
        v-if="eventoSeleccionado"
        :visible="modalCompra"
        titulo="Comprar entrada"
        @cerrar="modalCompra = false"
    >
        <!-- Evento header -->
        <div class="mc-evento-header">
            <img :src="imagenEvento(eventoSeleccionado)" :alt="eventoSeleccionado.nombre" class="mc-evento-img">
            <div class="mc-evento-info">
                <h3 class="mc-evento-nombre">{{ eventoSeleccionado.nombre }}</h3>
                <p class="mc-evento-artista">{{ eventoSeleccionado.artista }}</p>
                <p class="mc-meta"><i class="fas fa-calendar"></i>
                    {{ formatearFecha(eventoSeleccionado.fecha).dia }} {{ formatearFecha(eventoSeleccionado.fecha).mes }}
                    · {{ formatearFecha(eventoSeleccionado.fecha).hora }}
                </p>
                <p class="mc-meta"><i class="fas fa-map-marker-alt"></i>
                    {{ eventoSeleccionado.lugar }}, {{ eventoSeleccionado.ciudad }}
                </p>
            </div>
        </div>

        <div class="mc-divider"></div>

        <!-- Tipo de entrada -->
        <div class="mc-campo-grupo">
            <label class="mc-label">Tipo de entrada</label>
            <div class="mc-tipo-opciones">
                <button
                    v-for="tipo in tiposEntrada"
                    :key="tipo.id"
                    class="mc-tipo-btn"
                    :class="{ activo: tipoEntrada === tipo.id }"
                    @click="tipoEntrada = tipo.id"
                >
                    <span class="mc-tipo-nombre">{{ tipo.label }}</span>
                    <span class="mc-tipo-precio">{{ tipo.precio.toFixed(2) }} €</span>
                </button>
            </div>
        </div>

        <!-- Cantidad -->
        <div class="mc-campo-grupo">
            <label class="mc-label">Cantidad de entradas</label>
            <div class="mc-cantidad-control">
                <button class="mc-qty-btn" :disabled="cantidad <= 1" @click="cantidad--">
                    <i class="fas fa-minus"></i>
                </button>
                <span class="mc-qty-valor">{{ cantidad }}</span>
                <button class="mc-qty-btn" :disabled="cantidad >= 4" @click="cantidad++">
                    <i class="fas fa-plus"></i>
                </button>
                <span class="mc-qty-hint">Máx. 4 por pedido</span>
            </div>
        </div>

        <!-- Resumen de precio -->
        <div class="mc-resumen">
            <div class="mc-resumen-fila">
                <span>{{ cantidad }} × entrada {{ tiposEntrada.find(t=>t.id===tipoEntrada)?.label }}</span>
                <span>{{ (precioUnit * cantidad).toFixed(2) }} €</span>
            </div>
            <div class="mc-resumen-fila">
                <span>Cargos de servicio (10%)</span>
                <span>{{ cargosServ.toFixed(2) }} €</span>
            </div>
            <div class="mc-resumen-fila mc-resumen-total">
                <strong>Total</strong>
                <strong class="mc-precio-total-valor">{{ precioTotal.toFixed(2) }} €</strong>
            </div>
        </div>

        <div class="mc-divider"></div>

        <!-- Pago con tarjeta -->
        <div class="mc-pago-titulo">
            <i class="fas fa-credit-card"></i> Datos de pago
        </div>

        <div class="mc-campo-grupo">
            <label class="mc-label">Titular de la tarjeta</label>
            <input
                v-model="tarjeta.titular"
                class="mc-input"
                :class="{ 'mc-input-error': erroresTarjeta.titular }"
                type="text"
                placeholder="NOMBRE APELLIDO"
                autocomplete="cc-name"
                @input="erroresTarjeta.titular = ''"
            >
            <span v-if="erroresTarjeta.titular" class="mc-error">{{ erroresTarjeta.titular }}</span>
        </div>

        <div class="mc-campo-grupo">
            <label class="mc-label">Número de tarjeta</label>
            <div class="mc-input-icono">
                <input
                    :value="tarjeta.numero"
                    class="mc-input"
                    :class="{ 'mc-input-error': erroresTarjeta.numero }"
                    type="text"
                    placeholder="0000 0000 0000 0000"
                    maxlength="19"
                    autocomplete="cc-number"
                    inputmode="numeric"
                    @input="alEscribirNumero($event); erroresTarjeta.numero = ''"
                >
                <i class="fas fa-credit-card mc-input-icon"></i>
            </div>
            <span v-if="erroresTarjeta.numero" class="mc-error">{{ erroresTarjeta.numero }}</span>
        </div>

        <div class="mc-fila-dos">
            <div class="mc-campo-grupo">
                <label class="mc-label">Fecha de caducidad</label>
                <input
                    :value="tarjeta.expiry"
                    class="mc-input"
                    :class="{ 'mc-input-error': erroresTarjeta.expiry }"
                    type="text"
                    placeholder="MM/AA"
                    maxlength="5"
                    autocomplete="cc-exp"
                    inputmode="numeric"
                    @input="alEscribirExpiry($event); erroresTarjeta.expiry = ''"
                >
                <span v-if="erroresTarjeta.expiry" class="mc-error">{{ erroresTarjeta.expiry }}</span>
            </div>
            <div class="mc-campo-grupo">
                <label class="mc-label">CVV</label>
                <input
                    v-model="tarjeta.cvv"
                    class="mc-input"
                    :class="{ 'mc-input-error': erroresTarjeta.cvv }"
                    type="password"
                    placeholder="•••"
                    maxlength="4"
                    autocomplete="cc-csc"
                    inputmode="numeric"
                    @input="erroresTarjeta.cvv = ''"
                >
                <span v-if="erroresTarjeta.cvv" class="mc-error">{{ erroresTarjeta.cvv }}</span>
            </div>
        </div>

        <template #acciones>
            <button class="boton-cancelar" @click="modalCompra = false" :disabled="comprando">Cancelar</button>
            <button class="boton-guardar" @click="confirmarCompra" :disabled="comprando">
                <i v-if="comprando" class="fas fa-spinner fa-spin"></i>
                <span v-else>
                    <i class="fas fa-lock"></i> Pagar {{ precioTotal.toFixed(2) }} €
                </span>
            </button>
        </template>
    </Modal>

    <!-- Modal: Entrada confirmada / Ver entrada -->
    <Modal
        v-if="entradaConfirmada"
        :visible="modalEntrada"
        titulo="Tu Entrada"
        @cerrar="modalEntrada = false"
    >
        <div class="entrada-confirmada">
            <div class="entrada-icono-ok">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>{{ entradaConfirmada.evento?.nombre }}</h3>
            <p class="entrada-artista">{{ entradaConfirmada.evento?.artista }}</p>

            <div class="entrada-qr">
                <i class="fas fa-qrcode"></i>
            </div>

            <div class="entrada-codigo">
                <span class="codigo-label">Código de entrada</span>
                <strong class="codigo-valor">{{ entradaConfirmada.codigo }}</strong>
            </div>

            <div class="entrada-detalles">
                <div class="entrada-detalle" v-if="entradaConfirmada.evento">
                    <i class="fas fa-calendar"></i>
                    <span>
                        {{ formatearFecha(entradaConfirmada.evento.fecha).dia }}
                        {{ formatearFecha(entradaConfirmada.evento.fecha).mes }} —
                        {{ formatearFecha(entradaConfirmada.evento.fecha).hora }}
                    </span>
                </div>
                <div class="entrada-detalle" v-if="entradaConfirmada.evento">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>{{ entradaConfirmada.evento.lugar }}, {{ entradaConfirmada.evento.ciudad }}</span>
                </div>
                <div class="entrada-detalle">
                    <i class="fas fa-chair"></i>
                    <span>
                        Tipo: <strong style="color:var(--texto-blanco);text-transform:capitalize">{{ entradaConfirmada.tipo || 'Pista' }}</strong>
                        · {{ entradaConfirmada.cantidad || 1 }} entrada{{ (entradaConfirmada.cantidad||1) > 1 ? 's' : '' }}
                    </span>
                </div>
                <div class="entrada-detalle">
                    <i class="fas fa-receipt"></i>
                    <span>Total pagado: <strong style="color:var(--morado)">{{ entradaConfirmada.total?.toFixed(2) || entradaConfirmada.evento?.precio }} €</strong></span>
                </div>
                <div class="entrada-detalle">
                    <i class="fas fa-check-circle"></i>
                    <span>Estado: <strong style="color:#10b981">Confirmada</strong></span>
                </div>
            </div>
        </div>
        <template #acciones>
            <button class="boton-guardar" @click="modalEntrada = false">Cerrar</button>
        </template>
    </Modal>
</template>

<style scoped>
/* ── Badges y helpers para nuevas secciones ──────────────────────────────── */
.titulo-seccion-con-badge-ev {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
}
.titulo-seccion-con-badge-ev .titulo-seccion { margin-bottom: 0; }

.badge-ev {
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 50px;
    display: flex;
    align-items: center;
    gap: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.badge-ev-siguiendo { background: linear-gradient(135deg, #ec4899, #be185d); }
.badge-ev-talento   { background: linear-gradient(135deg, #34d399, #059669); }

.estado-info-inline-ev {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--texto-gris);
    padding: 16px 0;
    font-size: 14px;
}

.seccion-calendario {
    background: var(--fondo-tarjeta);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 32px;
}

.calendario-wrap { border-radius: 10px; overflow: hidden; }

.calendario-vacio {
    text-align: center;
    color: var(--texto-gris);
    font-size: 13px;
    margin-top: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.lista-eventos { display: flex; flex-direction: column; gap: 16px; }

.tarjeta-evento {
    display: flex; gap: 20px;
    background: var(--fondo-tarjeta);
    padding: 20px; border-radius: 14px;
    transition: all 0.3s ease; align-items: center;
}
.tarjeta-evento:hover { background: var(--fondo-hover); transform: translateX(6px); }
.tarjeta-evento.comprado { border: 2px solid var(--morado); }

.fecha-evento {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: linear-gradient(135deg, var(--morado), var(--morado-claro));
    padding: 14px 18px; border-radius: 12px;
    min-width: 70px; color: white;
}
.dia-evento { font-size: 28px; font-weight: 700; line-height: 1; }
.mes-evento { font-size: 12px; font-weight: 600; text-transform: uppercase; margin-top: 4px; opacity: 0.9; }

.imagen-evento { width: 100px; height: 100px; border-radius: 10px; overflow: hidden; flex-shrink: 0; }
.imagen-evento img { width: 100%; height: 100%; object-fit: cover; }

.info-evento { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.info-evento h3 { font-size: 18px; font-weight: 600; color: var(--texto-blanco); }
.artista-evento { color: var(--texto-gris); font-size: 14px; }
.ubicacion-evento, .hora-evento, .precio-evento, .codigo-entrada-mini {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: var(--texto-gris);
}
.ubicacion-evento i, .hora-evento i, .precio-evento i, .codigo-entrada-mini i { color: var(--morado); width: 16px; }

.precio-evento { font-weight: 600; color: var(--texto-blanco); }

.aforo-badge {
    background: rgba(139,92,246,0.15);
    color: var(--morado);
    font-size: 11px; font-weight: 600;
    padding: 2px 8px; border-radius: 50px;
    margin-left: 6px;
}

.acciones-evento { display: flex; flex-direction: column; gap: 10px; align-items: center; min-width: 140px; }

.boton-comprado { background: #10b981 !important; cursor: default; opacity: 0.9; }
.boton-agotado  { background: var(--fondo-hover) !important; cursor: default; color: var(--texto-gris) !important; }
.boton-bloqueado { opacity: 0.75; display: flex; align-items: center; gap: 6px; }

/* Banner invitado */
.banner-invitado-eventos {
    display: flex; align-items: center; gap: 20px;
    background: linear-gradient(135deg, rgba(109,40,217,0.15), rgba(139,92,246,0.1));
    border: 1px solid rgba(139,92,246,0.3);
    border-radius: 16px; padding: 24px; margin-bottom: 32px; flex-wrap: wrap;
}
.banner-invitado-icono { width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg,var(--morado),var(--morado-claro)); display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; flex-shrink: 0; }
.banner-invitado-texto { flex: 1; min-width: 200px; }
.banner-invitado-texto h3 { font-size: 16px; font-weight: 700; color: var(--texto-blanco); margin: 0 0 4px; }
.banner-invitado-texto p { font-size: 13px; color: var(--texto-gris); margin: 0; line-height: 1.5; }
.banner-invitado-acciones { display: flex; gap: 10px; align-items: center; }
.boton-invitado-login { background: transparent; border: 1px solid var(--texto-gris); color: var(--texto-blanco); border-radius: 50px; padding: 10px 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: border-color 0.2s; white-space: nowrap; }
.boton-invitado-login:hover { border-color: var(--texto-blanco); }

.estado-info { display: flex; align-items: center; gap: 12px; padding: 40px 20px; color: var(--texto-gris); font-size: 15px; }

.estado-vacio-talentos {
    display: flex; align-items: center; gap: 14px;
    padding: 32px 20px; color: var(--texto-gris); font-size: 14px;
    background: rgba(52,211,153,0.05); border-radius: 12px;
    border: 1px dashed rgba(52,211,153,0.2);
}
.estado-vacio-talentos i { font-size: 22px; color: #34d399; }
.estado-vacio-talentos p { margin: 0; }

/* ── Modal compra ──────────────────────────────────────────────── */
.mc-evento-header {
    display: flex; gap: 14px; align-items: flex-start; margin-bottom: 4px;
}
.mc-evento-img {
    width: 80px; height: 80px; border-radius: 10px; object-fit: cover; flex-shrink: 0;
}
.mc-evento-info { flex: 1; }
.mc-evento-nombre { font-size: 17px; font-weight: 700; color: var(--texto-blanco); margin: 0 0 2px; }
.mc-evento-artista { font-size: 13px; color: var(--texto-gris); margin: 0 0 6px; }
.mc-meta {
    display: flex; align-items: center; gap: 7px;
    font-size: 12px; color: var(--texto-gris); margin: 3px 0;
}
.mc-meta i { color: var(--morado); width: 12px; }

.mc-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 14px 0; }

.mc-pago-titulo {
    font-size: 13px; font-weight: 700; color: var(--texto-blanco);
    display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
}
.mc-pago-titulo i { color: var(--morado); }

.mc-label {
    display: block; font-size: 12px; font-weight: 600;
    color: var(--texto-gris); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;
}
.mc-campo-grupo { margin-bottom: 14px; }

.mc-tipo-opciones { display: flex; gap: 10px; }
.mc-tipo-btn {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 10px 8px; border-radius: 10px;
    border: 2px solid rgba(255,255,255,0.1);
    background: var(--fondo-hover); cursor: pointer;
    transition: all 0.18s ease; color: var(--texto-gris);
}
.mc-tipo-btn:hover { border-color: rgba(139,92,246,0.5); }
.mc-tipo-btn.activo { border-color: var(--morado); background: rgba(139,92,246,0.15); color: var(--texto-blanco); }
.mc-tipo-nombre { font-size: 13px; font-weight: 700; }
.mc-tipo-precio { font-size: 12px; }

.mc-cantidad-control {
    display: flex; align-items: center; gap: 14px;
}
.mc-qty-btn {
    width: 32px; height: 32px; border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.2);
    background: var(--fondo-hover); color: var(--texto-blanco);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 12px; transition: all 0.15s;
}
.mc-qty-btn:hover:not(:disabled) { border-color: var(--morado); color: var(--morado); }
.mc-qty-btn:disabled { opacity: 0.35; cursor: default; }
.mc-qty-valor { font-size: 20px; font-weight: 700; color: var(--texto-blanco); min-width: 28px; text-align: center; }
.mc-qty-hint { font-size: 11px; color: var(--texto-gris); }

.mc-resumen {
    background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.2);
    border-radius: 10px; padding: 14px 16px; margin-bottom: 4px;
    display: flex; flex-direction: column; gap: 8px;
}
.mc-resumen-fila {
    display: flex; justify-content: space-between;
    font-size: 13px; color: var(--texto-gris);
}
.mc-resumen-total {
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 8px; margin-top: 2px;
    font-size: 15px; color: var(--texto-blanco);
}
.mc-precio-total-valor { color: var(--morado); font-size: 18px; }

.mc-input {
    width: 100%; padding: 11px 14px; border-radius: 8px;
    border: 1.5px solid rgba(255,255,255,0.12);
    background: var(--fondo-hover); color: var(--texto-blanco);
    font-size: 14px; outline: none; box-sizing: border-box;
    transition: border-color 0.18s;
}
.mc-input:focus { border-color: var(--morado); }
.mc-input::placeholder { color: var(--texto-gris); opacity: 0.6; }
.mc-input-error { border-color: #f87171 !important; }

.mc-input-icono { position: relative; }
.mc-input-icono .mc-input { padding-right: 40px; }
.mc-input-icon {
    position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    color: var(--texto-gris); font-size: 14px; pointer-events: none;
}

.mc-error { font-size: 11px; color: #f87171; margin-top: 4px; display: block; }

.mc-fila-dos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* Modal entrada */
.entrada-confirmada { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 8px 0; }
.entrada-icono-ok { font-size: 52px; color: #10b981; }
.entrada-confirmada h3 { font-size: 20px; font-weight: 700; color: var(--texto-blanco); text-align: center; margin: 0; }
.entrada-artista { color: var(--texto-gris); font-size: 14px; margin: 0; }
.entrada-qr { font-size: 120px; color: var(--texto-blanco); margin: 8px 0; line-height: 1; }
.entrada-codigo { text-align: center; }
.codigo-label { display: block; font-size: 12px; color: var(--texto-gris); margin-bottom: 4px; }
.codigo-valor { font-size: 22px; font-weight: 800; letter-spacing: 3px; color: var(--morado); font-family: monospace; }
.entrada-detalles { width: 100%; background: var(--fondo-hover); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.entrada-detalle { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--texto-gris); }
.entrada-detalle i { color: var(--morado); width: 16px; }
.entrada-detalle strong { color: var(--texto-blanco); }

@media (max-width: 768px) {
    /* Tarjeta de evento: columna en móvil */
    .tarjeta-evento { flex-direction: column; align-items: stretch; gap: 12px; padding: 14px; }
    .tarjeta-evento:hover { transform: none; }
    .fecha-evento { flex-direction: row; justify-content: flex-start; gap: 10px; padding: 10px 14px; border-radius: 8px; min-width: unset; align-self: flex-start; }
    .dia-evento { font-size: 22px; }
    .mes-evento { font-size: 12px; margin-top: 0; align-self: center; }
    .imagen-evento { width: 100%; height: 160px; border-radius: 8px; }
    .imagen-evento img { border-radius: 8px; }
    .info-evento h3 { font-size: 16px; }
    .acciones-evento { min-width: unset; align-items: stretch; }
    .acciones-evento .boton-principal { width: 100%; justify-content: center; }

    /* Banner invitado */
    .banner-invitado-eventos { flex-direction: column; gap: 12px; padding: 16px; }
    .banner-invitado-acciones { width: 100%; flex-direction: column; }
    .boton-invitado-login { width: 100%; text-align: center; }

    /* Calendario */
    .seccion-calendario { padding: 14px; }

    /* Estado vacio filtro */
    .estado-vacio-filtro { padding: 24px 16px; }
}

/* ── Filtros de eventos ────────────────────────────────────────── */
.filtros-eventos {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 24px;
    padding: 20px;
    background: var(--fondo-tarjeta);
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.06);
}

.buscador-eventos {
    position: relative;
    display: flex;
    align-items: center;
}

.buscador-icono {
    position: absolute;
    left: 14px;
    color: var(--texto-gris);
    font-size: 14px;
    pointer-events: none;
}

.buscador-input {
    width: 100%;
    padding: 11px 40px 11px 40px;
    background: var(--fondo-negro);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 50px;
    color: var(--texto-blanco);
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
}

.buscador-input:focus { border-color: var(--morado); }
.buscador-input::placeholder { color: var(--texto-gris); opacity: 0.7; }

.buscador-limpiar {
    position: absolute;
    right: 12px;
    background: none;
    border: none;
    color: var(--texto-gris);
    cursor: pointer;
    padding: 4px;
    font-size: 13px;
    transition: color 0.2s;
}
.buscador-limpiar:hover { color: var(--texto-blanco); }

.chips-ciudad {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.chip-ciudad {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    border-radius: 50px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: 1.5px solid rgba(255,255,255,0.12);
    background: transparent;
    color: var(--texto-gris);
    transition: all 0.18s ease;
    white-space: nowrap;
}

.chip-ciudad i { font-size: 11px; }

.chip-ciudad:hover {
    border-color: rgba(139,92,246,0.5);
    color: var(--texto-blanco);
    background: rgba(139,92,246,0.08);
}

.chip-ciudad.activo {
    background: var(--morado);
    border-color: var(--morado);
    color: white;
}

.contador-resultados {
    font-size: 12px;
    color: var(--texto-gris);
    margin: 0;
}

/* Estado vacío cuando no hay resultados del filtro */
.estado-vacio-filtro {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 60px 20px;
    color: var(--texto-gris);
    text-align: center;
}

.estado-vacio-filtro i {
    font-size: 40px;
    color: var(--morado);
    opacity: 0.5;
}

.estado-vacio-filtro p {
    font-size: 15px;
    color: var(--texto-blanco);
}

.estado-vacio-filtro strong {
    color: var(--morado);
}

.boton-limpiar-filtro {
    background: rgba(139,92,246,0.15);
    border: 1px solid rgba(139,92,246,0.4);
    color: var(--morado);
    border-radius: 50px;
    padding: 9px 22px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}
.boton-limpiar-filtro:hover {
    background: rgba(139,92,246,0.25);
}
</style>
