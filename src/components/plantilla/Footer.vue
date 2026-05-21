<script setup>
defineEmits(['cambiar-pagina'])
</script>

<template>
    <footer class="footer-app">
        <div class="footer-contenido">

            <!-- Columna marca -->
            <div class="footer-marca">
                <div class="footer-logo">
                    <div class="footer-logo-icono">
                        <i class="fas fa-music"></i>
                    </div>
                    <span class="footer-logo-nombre">Sonalya</span>
                </div>
                <p class="footer-slogan">Tu música, tu mundo.</p>
                <p class="footer-descripcion">
                    Descubre millones de canciones, sigue a tus artistas favoritos y vive la música como nunca antes.
                </p>

                <!-- Redes sociales -->
                <div class="footer-redes">
                    <a href="https://www.instagram.com" target="_blank" rel="noopener" class="red-social red-instagram" title="Instagram">
                        <i class="fab fa-instagram"></i>
                    </a>
                    <a href="https://www.twitter.com" target="_blank" rel="noopener" class="red-social red-twitter" title="X (Twitter)">
                        <span class="x-icon">𝕏</span>
                    </a>
                    <a href="https://www.tiktok.com" target="_blank" rel="noopener" class="red-social red-tiktok" title="TikTok">
                        <i class="fab fa-tiktok"></i>
                    </a>
                    <a href="https://www.youtube.com" target="_blank" rel="noopener" class="red-social red-youtube" title="YouTube">
                        <i class="fab fa-youtube"></i>
                    </a>
                    <a href="https://www.facebook.com" target="_blank" rel="noopener" class="red-social red-facebook" title="Facebook">
                        <i class="fab fa-facebook-f"></i>
                    </a>
                </div>

                <!-- Copyright solo para móvil -->
                <p class="footer-copyright-movil">© 2026 Sonalya</p>
            </div>

            <!-- Columnas de links (wrapper para responsive) -->
            <div class="footer-links">

                <!-- Columna Descubrir -->
                <div class="footer-columna">
                    <h4 class="footer-titulo-col">Descubrir</h4>
                    <ul class="footer-lista">
                        <li><a href="#" class="footer-enlace" @click.prevent="$emit('cambiar-pagina', 'inicio')">Inicio</a></li>
                        <li><a href="#" class="footer-enlace" @click.prevent="$emit('cambiar-pagina', 'buscar')">Buscar música</a></li>
                        <li><a href="#" class="footer-enlace" @click.prevent="$emit('cambiar-pagina', 'eventos')">Eventos</a></li>
                        <li><a href="#" class="footer-enlace" @click.prevent="$emit('cambiar-pagina', 'buscar')">Géneros</a></li>
                        <li><a href="#" class="footer-enlace" @click.prevent="$emit('cambiar-pagina', 'inicio')">Nuevos Talentos</a></li>
                    </ul>
                </div>

                <!-- Columna Empresa (oculta en móvil) -->
                <div class="footer-columna footer-col-empresa">
                    <h4 class="footer-titulo-col">Empresa</h4>
                    <ul class="footer-lista">
                        <li><a href="#" class="footer-enlace">Sobre nosotros</a></li>
                        <li><a href="#" class="footer-enlace">Blog</a></li>
                        <li><a href="#" class="footer-enlace">Prensa</a></li>
                        <li><a href="#" class="footer-enlace">Trabaja con nosotros</a></li>
                        <li><a href="#" class="footer-enlace">Inversores</a></li>
                    </ul>
                </div>

                <!-- Columna Legal -->
                <div class="footer-columna">
                    <h4 class="footer-titulo-col">Legal</h4>
                    <ul class="footer-lista">
                        <li><a href="#" class="footer-enlace">Política de privacidad</a></li>
                        <li><a href="#" class="footer-enlace">Términos de uso</a></li>
                        <li><a href="#" class="footer-enlace">Política de cookies</a></li>
                        <li><a href="#" class="footer-enlace">Accesibilidad</a></li>
                    </ul>
                </div>

            </div><!-- /footer-links -->

        </div>

        <!-- Línea inferior -->
        <div class="footer-inferior">
            <p class="footer-copyright">
                © 2026 Sonalya, S.L. Todos los derechos reservados.
            </p>
            <div class="footer-badges">
                <span class="footer-badge"><i class="fab fa-app-store-ios"></i> App Store</span>
                <span class="footer-badge"><i class="fab fa-google-play"></i> Google Play</span>
            </div>
        </div>
    </footer>
</template>

<style scoped>
.footer-app {
    margin-top: 60px;
    background: var(--fondo-tarjeta);
    border-top: 1px solid var(--borde);
    position: relative;
}

/* Línea gradiente superior */
.footer-app::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--morado), var(--morado-claro), #ec4899, var(--morado));
    background-size: 200% 100%;
    animation: gradiente-slide 4s linear infinite;
}

@keyframes gradiente-slide {
    0%   { background-position: 0% 0%; }
    100% { background-position: 200% 0%; }
}

.footer-contenido {
    display: grid;
    grid-template-columns: 2fr 3fr;
    gap: 48px;
    padding: 48px 40px 32px;
    max-width: 1400px;
    margin: 0 auto;
}

/* Wrapper de las 3 columnas de links */
.footer-links {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 24px;
}

/* ── Columna marca ──────────────────────────────────── */
.footer-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
}

.footer-logo-icono {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, var(--morado), var(--morado-claro));
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.footer-logo-icono i { font-size: 16px; color: white; }

.footer-logo-nombre {
    font-size: 22px;
    font-weight: 800;
    background: linear-gradient(135deg, var(--morado), var(--morado-claro));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.footer-slogan {
    font-size: 14px;
    font-weight: 600;
    color: var(--texto-blanco);
    margin-bottom: 8px;
}

.footer-descripcion {
    font-size: 13px;
    color: var(--texto-gris);
    line-height: 1.6;
    margin-bottom: 20px;
    max-width: 280px;
}

/* Ocultar copyright-móvil en escritorio */
.footer-copyright-movil { display: none; }

/* ── Redes sociales ──────────────────────────────────── */
.footer-redes {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.red-social {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    color: var(--texto-gris);
    background: var(--fondo-hover);
    text-decoration: none;
    transition: all 0.2s ease;
    border: 1px solid transparent;
}

.red-social:hover { transform: translateY(-3px); color: white; }

.x-icon {
    font-size: 14px;
    font-weight: 700;
    font-family: sans-serif;
    line-height: 1;
}

.red-instagram:hover { background: linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); border-color: transparent; }
.red-twitter:hover   { background: #1d9bf0; border-color: transparent; }
.red-tiktok:hover    { background: #010101; border-color: #fe2c55; color: white; }
.red-youtube:hover   { background: #ff0000; }
.red-facebook:hover  { background: #1877f2; }

/* ── Columnas de links ──────────────────────────────── */
.footer-columna { display: flex; flex-direction: column; }

.footer-titulo-col {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--texto-blanco);
    margin-bottom: 16px;
}

.footer-lista {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.footer-enlace {
    font-size: 13px;
    color: var(--texto-gris);
    text-decoration: none;
    transition: color 0.15s ease;
    line-height: 1.4;
    cursor: pointer;
}

.footer-enlace:hover { color: var(--morado-claro); }

/* ── Franja inferior ────────────────────────────────── */
.footer-inferior {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 40px;
    border-top: 1px solid var(--borde);
    max-width: 1400px;
    margin: 0 auto;
}

.footer-copyright {
    font-size: 12px;
    color: var(--texto-gris);
}

.footer-badges {
    display: flex;
    gap: 12px;
}

.footer-badge {
    font-size: 11px;
    font-weight: 600;
    color: var(--texto-gris);
    background: var(--fondo-hover);
    border: 1px solid var(--borde);
    padding: 5px 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: default;
    transition: border-color 0.15s;
}

.footer-badge:hover { border-color: var(--morado); color: var(--texto-blanco); }

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 900px) {
    .footer-contenido {
        grid-template-columns: 1fr;
        gap: 32px;
        padding: 36px 24px 24px;
    }
}

/* ── Móvil ─────────────────────────────────────────── */
@media (max-width: 768px) {
    .footer-app { margin-top: 16px; }

    /* Ocultar todo el contenido normal */
    .footer-links { display: none; }
    .footer-inferior { display: none; }
    .footer-logo { display: none; }
    .footer-slogan { display: none; }
    .footer-descripcion { display: none; }

    /* El contenido queda como flex centrado */
    .footer-contenido {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 22px 20px 20px;
        gap: 0;
    }

    /* Marca actúa solo como wrapper de los iconos */
    .footer-marca {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        padding: 0;
        border: none;
        width: 100%;
    }

    /* Iconos grandes y bien espaciados */
    .footer-redes {
        justify-content: center;
        gap: 12px;
        margin: 0;
    }
    .red-social {
        width: 46px;
        height: 46px;
        font-size: 19px;
        border-radius: 13px;
        border: 1px solid var(--borde);
    }

    /* Pequeño copyright debajo de los iconos */
    .footer-copyright-movil {
        font-size: 11px;
        color: var(--texto-gris);
        opacity: 0.7;
    }
}
</style>
