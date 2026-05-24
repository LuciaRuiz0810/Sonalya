# 🎵 Sonalya - Frontend (Client Application)

Sonalya es una plataforma web de música en streaming moderna e intuitiva que consume datos en tiempo real de la API de Deezer, permitiendo a los usuarios descubrir géneros, consultar álbumes, gestionar favoritos y revisar eventos.

Esta sección del repositorio contiene la aplicación cliente (Frontend) desarrollada como una **Single Page Application (SPA)** utilizando tecnologías modernas de desarrollo web.

## 🚀 Tecnologías Utilizadas

* **Framework Principal:** [Vue.js 3](https://vuejs.org/) (Composition API)
* **Herramienta de Construcción:** [Vite](https://vite.dev/) (Rápido y optimizado para producción)
* **Enrutamiento:** Vue Router (Para una navegación fluida sin recargar la página)
* **Estilos y Maquetación:** CSS3 Moderno / Flexbox / Grid Customizados
* **Cliente HTTP:** Consultas API REST mediante Fetch API con HTTPS

## 📦 Instalación y Configuración Local

Si deseas clonar este proyecto y ejecutarlo en tu ordenador local, sigue estos pasos:

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/tu-usuario/FrontendSonalya.git](https://github.com/tu-usuario/FrontendSonalya.git)
   cd FrontendSonalya

## 📖 Manual de Usuario y Acceso de Prueba

Para facilitar la evaluación de la plataforma **Sonalya**, se han precargado tres tipos de perfiles demo en el sistema a través de los Seeders de la base de datos. Cada perfil tiene permisos y vistas completamente diferentes dentro de la aplicación.

### 🌐 1. Formas de Acceso (¿Dónde probarlo?)

* **Opción A - En la Nube (Recomendado):** No requiere instalar nada. Puedes probar la aplicación directamente entrando en la URL de producción:
  👉 **Frontend Web:** [https://frontend-sonalya.vercel.app](https://frontend-sonalya.vercel.app)

* **Opción B - En Entorno Local:** Si estás ejecutando el proyecto en tu ordenador, asegúrate de tener levantados tanto el frontend (`npm run dev`) como el backend (`php artisan serve`). 
  👉 **URL Local:** `http://localhost:5173`

---

### 🔑 2. Credenciales de los Perfiles de Prueba

Ve al apartado de **Iniciar Sesión** e introduce cualquiera de las siguientes cuentas para probar las distintas funcionalidades del sistema:

#### 👑 Perfil: Administrador
Ideal para gestionar el control global de la plataforma, moderar contenido y revisar estadísticas generales del sitio.
* **Correo Electrónico:** `admin@sonalya.com`
* **Contraseña:** `Admin1234!`
* **Nombre de usuario:** `@admin`

#### 🎸 Perfil: Artista Demo
Acceso diseñado para creadores de contenido musical. Al entrar con este perfil podrás acceder a herramientas de artista, editar tu biografía, gestionar tus álbumes, canciones propias y publicar eventos/conciertos.
* **Correo Electrónico:** `artista@sonalya.com`
* **Contraseña:** `Artista1234!`
* **Nombre de usuario:** `@artista_ejemplo`
* **Detalles del perfil:** Artista independiente enfocado en la fusión de pop, electrónica y soul.

#### 🎧 Perfil: Oyente Demo
El perfil estándar de usuario. Permite navegar por todo el catálogo musical de la API de Deezer, reproducir pistas, seguir a tus artistas favoritos, crear y gestionar tus propias playlists personalizadas y marcar álbumes o eventos.
* **Correo Electrónico:** `oyente@sonalya.com`
* **Contraseña:** `Oyente1234!`
* **Nombre de usuario:** `@oyente_demo`

---

### ⚙️ 3. Flujo Básico de Prueba Sugerido
1. **Navegación Libre:** Entra a la web sin loguearte para revisar la página de inicio, los géneros musicales generales y el buscador global (consumiendo datos reales de Deezer).
2. **Interacción como Oyente:** Inicia sesión como `oyente@sonalya.com` para probar el sistema de "Añadir a favoritos" (canciones/álbumes) y crear una playlist personalizada.
3. **Gestión como Artista/Admin:** Cierra sesión e ingresa como `artista@sonalya.com` o `admin@sonalya.com` para comprobar cómo cambia la barra de navegación y se habilitan los paneles privados de gestión y creación de eventos musicales.
