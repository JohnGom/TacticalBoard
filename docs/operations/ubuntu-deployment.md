# Despliegue en un servidor Ubuntu

Esta guía despliega la web, la API y PostgreSQL con Docker Compose. Caddy permanece instalado en el host y termina HTTPS, enviando el tráfico a los puertos locales de los contenedores.

## 1. Preparar el servidor

Usa una versión mantenida de Ubuntu, apunta el DNS del dominio a la IP del servidor y crea un usuario de servicio, por ejemplo `tacticalboard`:

```sh
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ca-certificates gnupg
sudo adduser --system --group --home /home/tacticalboard --shell /usr/sbin/nologin tacticalboard
sudo mkdir -p /opt/tacticalboard
sudo chown tacticalboard:tacticalboard /opt/tacticalboard
```

Instala Docker Engine con el plugin Docker Compose v2 siguiendo las instrucciones oficiales de Docker para Ubuntu. Si Caddy aún no está instalado, usa el repositorio oficial:

```sh
sudo apt install --yes debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

Si ya usas Caddy, conserva su instalación y su `Caddyfile`; más adelante solo añadirás un bloque para TacticalBoard. No hace falta instalar Node.js ni pnpm en el host: la imagen de la aplicación contiene sus versiones fijadas.

Permite SSH y los puertos web 80/443 para Caddy. Los puertos de web, API y PostgreSQL publicados por Compose se enlazan solo a `127.0.0.1`; no los abras al exterior. Ejecuta los comandos de Docker con `sudo` o configura el acceso al daemon según la política del servidor. La pertenencia al grupo `docker` equivale a privilegios de root.

## 2. Descargar el proyecto

Configura una clave SSH de solo lectura para el repositorio privado, si corresponde. Clona el repositorio como usuario de servicio:

```sh
sudo -u tacticalboard -H git clone <URL_DEL_REPOSITORIO> /opt/tacticalboard
```

## 3. Configurar los secretos

Compose lee los valores de PostgreSQL desde `.env` en la raíz. El contenedor de API lee sus credenciales de `apps/api/.env`; Compose configura `DATABASE_URL` por encima del valor de ese archivo para conectarse al servicio interno `postgres`.

```sh
cd /opt/tacticalboard
sudo -u tacticalboard cp .env.example .env
sudo -u tacticalboard cp apps/api/.env.example apps/api/.env
sudo chmod 600 .env apps/api/.env
```

Genera una contraseña de PostgreSQL hexadecimal para que se pueda usar directamente en la URL de conexión y un secreto de sesión distinto:

```sh
openssl rand -hex 32
openssl rand -base64 48
```

Edita `.env` y cambia `POSTGRES_PASSWORD` por el primer valor generado. Los valores de ejemplo son exclusivamente para desarrollo local; no los uses en un servidor.

Edita `apps/api/.env` y configura como mínimo:

```dotenv
NODE_ENV=production
SESSION_COOKIE_SECRET=SECRETO_ALEATORIO_DISTINTO_DE_32_CARACTERES_O_MAS
APP_ORIGIN=https://TU_DOMINIO
APIFOOTBALL_API_KEY=CLAVE_DEL_PROVEEDOR
GOOGLE_CLIENT_ID=CLIENT_ID_WEB
GOOGLE_CLIENT_SECRET=CLIENT_SECRET_WEB
GOOGLE_REDIRECT_URI=https://TU_DOMINIO/api/auth/google/callback
```

`DATABASE_URL` del ejemplo de API es para desarrollo local; Compose la reemplaza al iniciar la API. El nombre de usuario, base de datos y contraseña del URL interno se construyen desde los valores del `.env` raíz. Mantén `POSTGRES_PASSWORD` hexadecimal para evitar caracteres que requieran codificación URL.

Protege ambos archivos, conserva `SESSION_COOKIE_SECRET` estable entre reinicios y no los subas al repositorio. `.env` y `apps/api/.env` están excluidos de Git y del contexto de construcción Docker.

## 4. Configurar Google OAuth

En Google Cloud Console, en el cliente OAuth de tipo **Web**, registra la URI exacta:

```text
https://TU_DOMINIO/api/auth/google/callback
```

`APP_ORIGIN` debe ser exactamente `https://TU_DOMINIO`. Si también registras un origen JavaScript, debe ser solo el origen, sin ruta. Si la pantalla de consentimiento está en modo de prueba, agrega las cuentas autorizadas como usuarios de prueba. El cliente secreto solo debe estar en `apps/api/.env` o en el almacén de secretos del servidor.

## 5. Construir e iniciar los servicios

Desde la raíz del repositorio, construye las imágenes y espera a que PostgreSQL esté listo:

```sh
cd /opt/tacticalboard
sudo docker compose build
sudo docker compose up -d postgres
```

Ejecuta las migraciones explícitamente usando la imagen del API y luego inicia la aplicación:

```sh
sudo docker compose run --rm api pnpm exec tsx src/db/migrate.ts
sudo docker compose up -d api web
sudo docker compose ps
```

En producción la API no aplica migraciones al arrancar. La base de datos queda persistida en el volumen `tacticalboard-postgres-data`; PostgreSQL solo se publica en loopback del host, en el puerto `5434`.

## 6. Configurar Caddy en el host

Añade este bloque al `Caddyfile` existente (normalmente `/etc/caddy/Caddyfile`); no reemplaces la configuración de otros sitios. La web del contenedor escucha en `127.0.0.1:8080` y el API en `127.0.0.1:3001`:

```caddyfile
TU_DOMINIO {
    encode zstd gzip

    handle /api/* {
        reverse_proxy 127.0.0.1:3001
    }

    handle {
        reverse_proxy 127.0.0.1:8080
    }
}
```

Valida y recarga Caddy:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy
```

Caddy obtiene y renueva HTTPS automáticamente cuando el dominio resuelve a este servidor y los puertos 80/443 son accesibles. En producción las cookies de sesión usan `Secure`, por lo que el sitio debe servirse por HTTPS.

Verifica el estado local y el acceso público:

```sh
sudo docker compose ps
curl -fsS http://127.0.0.1:3001/api/health
curl -fsS https://TU_DOMINIO/api/health
```

## 7. Actualizaciones y copias de seguridad

Para publicar una actualización, actualiza el checkout, reconstruye las imágenes, ejecuta las migraciones y recrea los servicios:

```sh
cd /opt/tacticalboard
sudo -u tacticalboard git pull --ff-only
sudo docker compose build
sudo docker compose run --rm api pnpm exec tsx src/db/migrate.ts
sudo docker compose up -d
sudo docker compose ps
```

Haz copias de seguridad de PostgreSQL fuera del servidor y prueba su restauración. Un volcado manual puede generarse así:

```sh
sudo docker compose exec -T postgres pg_dump -U tacticalboard -d tacticalboard > tacticalboard-$(date +%F).sql
```

Conserva el volumen `tacticalboard-postgres-data` al actualizar. No ejecutes `docker compose down -v` salvo que quieras borrar deliberadamente todos los datos persistidos.

La búsqueda de un equipo puede consumir una llamada; al abrir un plantel, el API puede hacer hasta cuatro llamadas no cacheadas (plantel, dos fixtures y hasta dos alineaciones). API-Football Free tiene una cuota diaria limitada y el sistema reserva cinco llamadas. La disponibilidad de alineaciones depende de la competición y el plan. Las fotos y escudos siguen omitidos, y los derechos para retener/publicar datos de terceros en un servicio alojado deben revisarse antes de abrir el servidor al público.
