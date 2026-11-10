# Despliegue en un servidor Ubuntu

Esta guía describe el despliegue actual de TacticalBoard en un servidor Ubuntu usando Caddy como proxy y servidor de archivos estáticos, Fastify como servicio local y PostgreSQL en Docker Compose. El repositorio todavía no incluye Dockerfiles ni un despliegue de aplicación con un solo comando.

## 1. Preparar el servidor

Usa una versión mantenida de Ubuntu, apunta el DNS del dominio a la IP del servidor y crea un usuario de servicio, por ejemplo `tacticalboard`.

```sh
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl gnupg ca-certificates
sudo adduser --system --group --home /home/tacticalboard --shell /usr/sbin/nologin tacticalboard
sudo mkdir -p /opt/tacticalboard
sudo chown tacticalboard:tacticalboard /opt/tacticalboard
```

Instala Docker Engine con Docker Compose v2, Caddy y Node.js 22.12 o superior desde sus fuentes oficiales. Si Caddy aún no está instalado, usa el repositorio oficial para Ubuntu:

```sh
sudo apt install --yes debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

Si ya usas Caddy, conserva su instalación y su `Caddyfile`; más adelante solo añadirás un bloque para TacticalBoard.

Después de instalar Node.js, habilita Corepack para usar la versión de pnpm fijada por el repositorio:

```sh
sudo corepack enable
```

Configura también:

- Un dominio apuntando al servidor.
- SSH con clave pública.
- Node.js 22.12 o superior; se recomienda Node.js 24 LTS.
- pnpm 10.x (el monorepo fija pnpm 10.8.0 en `package.json`).
- Docker Engine con Docker Compose v2, Git y Caddy.

Permite en el firewall SSH y los puertos web 80/443 para Caddy. No abras PostgreSQL al público. Docker debe quedar accesible para el usuario que ejecutará el comando de base de datos.

## 2. Descargar el proyecto e instalar dependencias

Configura una clave SSH de solo lectura para el repositorio privado, si corresponde. Clona el repositorio como el usuario de servicio y ejecuta pnpm con ese mismo usuario:

```sh
sudo -u tacticalboard -H git clone <URL_DEL_REPOSITORIO> /opt/tacticalboard
sudo -u tacticalboard -H sh -lc 'cd /opt/tacticalboard && corepack prepare pnpm@10.8.0 --activate && pnpm install --frozen-lockfile'
```

El API importa los paquetes internos `@tactical-board/contracts` y `@tactical-board/domain` desde sus fuentes TypeScript. Por eso, para el modo de ejecución documentado más abajo hay que conservar la dependencia de desarrollo `tsx`; **no ejecutes `pnpm install --prod`** con esta configuración.

## 3. Configurar secretos y PostgreSQL

Hay dos archivos de entorno distintos:

- `.env` en la raíz lo lee Docker Compose para crear PostgreSQL.
- `apps/api/.env` lo lee la API para conectarse a PostgreSQL y acceder a sus proveedores.

Genera una contraseña aleatoria para PostgreSQL; valores hexadecimales evitan caracteres que requieren codificación en `DATABASE_URL`:

```sh
openssl rand -hex 32
```

En el `.env` de la raíz configura (usa la misma contraseña en `DATABASE_URL`). Créalo con permisos privados, por ejemplo `sudo install -m 600 /dev/null /opt/tacticalboard/.env`, y edítalo con `sudoedit`:

```dotenv
POSTGRES_DB=tacticalboard
POSTGRES_USER=tacticalboard
POSTGRES_PASSWORD=CONTRASENA_ALEATORIA
```

Crea `apps/api/.env` como el usuario `tacticalboard` a partir de `apps/api/.env.example`, conservando la clave de API-Football y sustituyendo los valores locales por los de producción. Por ejemplo:

```sh
sudo -u tacticalboard cp /opt/tacticalboard/apps/api/.env.example /opt/tacticalboard/apps/api/.env
sudo chmod 600 /opt/tacticalboard/apps/api/.env
```

Edita después el archivo con el usuario de servicio:

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://tacticalboard:CONTRASENA_ALEATORIA@127.0.0.1:5434/tacticalboard
SESSION_COOKIE_SECRET=SECRETO_ALEATORIO_DISTINTO
APP_ORIGIN=https://TU_DOMINIO
APIFOOTBALL_API_KEY=CLAVE_DEL_PROVEEDOR
GOOGLE_CLIENT_ID=CLIENT_ID_WEB
GOOGLE_CLIENT_SECRET=CLIENT_SECRET_WEB
GOOGLE_REDIRECT_URI=https://TU_DOMINIO/api/auth/google/callback
```

En el ejemplo, `CONTRASENA_ALEATORIA` debe ser la contraseña de PostgreSQL que acabas de crear; genera `SESSION_COOKIE_SECRET` por separado. No pongas comillas alrededor de los valores simples de `.env`.

`SESSION_COOKIE_SECRET` debe tener al menos 32 caracteres y mantenerse estable entre reinicios. Protege ambos archivos (`chmod 600`) y no los subas al repositorio. No uses `tacticalboard-local-only` ni otros valores de desarrollo en el servidor.

Levanta PostgreSQL desde la raíz del repositorio (el usuario que ejecute Docker Compose debe poder acceder al daemon) y aplica las migraciones como el usuario de la aplicación:

```sh
cd /opt/tacticalboard
sudo docker compose up -d postgres
sudo -u tacticalboard -H sh -lc 'cd /opt/tacticalboard && pnpm db:migrate'
```

El volumen `tacticalboard-postgres-data` conserva los datos al reiniciar el contenedor. El mapeo actual solo escucha en `127.0.0.1:5434`; mantenlo inaccesible desde Internet.

## 4. Configurar Google OAuth

En Google Cloud Console, en el cliente OAuth de tipo **Web**, registra la URI exacta:

```text
https://TU_DOMINIO/api/auth/google/callback
```

`APP_ORIGIN` debe ser exactamente `https://TU_DOMINIO`. La aplicación usa un flujo de autorización gestionado por el servidor, así que el origen JavaScript no se necesita para el flujo actual. Si también lo registras, debe ser solo el origen, sin ruta: `https://TU_DOMINIO`.

Si la pantalla de consentimiento está en modo de prueba, agrega las cuentas de Google autorizadas como usuarios de prueba. El cliente secreto debe permanecer solo en `apps/api/.env` o en el almacén de secretos del servidor.

## 5. Construir y ejecutar el API

Construye todos los paquetes:

```sh
pnpm build
```

El servidor debe arrancar con `apps/api` como directorio de trabajo porque `dotenv/config` lee allí `apps/api/.env`. Por ejemplo:

```sh
cd /opt/tacticalboard/apps/api
pnpm exec tsx src/server.ts
```

Para producción, mantenlo bajo `systemd` con un usuario sin privilegios. Un servicio mínimo puede usar:

```ini
[Unit]
Description=TacticalBoard API
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=tacticalboard
WorkingDirectory=/opt/tacticalboard/apps/api
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3001
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=/RUTA/ABSOLUTA/A/pnpm exec tsx src/server.ts
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Obtén las rutas con `sudo -u tacticalboard -H sh -lc 'command -v node; command -v pnpm'`. Usa rutas absolutas y asegúrate de que `PATH` incluya Node.js. Guarda la unidad como `/etc/systemd/system/tacticalboard-api.service`, luego actívala y revisa su estado y registros:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now tacticalboard-api
sudo systemctl status tacticalboard-api
sudo journalctl -u tacticalboard-api -n 100 --no-pager
```

En producción `server.ts` **no ejecuta migraciones al arrancar**, así que vuelve a correr `pnpm db:migrate` como paso explícito de cada actualización que incluya una migración. El API escucha en loopback (`127.0.0.1`) para que Caddy sea el único servicio web que lo alcance desde el host.

## 6. Servir la web y publicar el API con Caddy

La configuración `server.proxy` de Vite solo existe durante el desarrollo. Añade este bloque al `Caddyfile` existente (normalmente `/etc/caddy/Caddyfile`); no reemplaces los bloques de otros sitios. Caddy sirve `apps/web/dist`, resuelve las rutas de React hacia `index.html`, y reenvía `/api/` a Fastify sin quitar ese prefijo:

```caddyfile
TU_DOMINIO {
    encode zstd gzip

    handle /api/* {
        reverse_proxy 127.0.0.1:3001
    }

    handle {
        root * /opt/tacticalboard/apps/web/dist
        try_files {path} /index.html
        file_server
    }
}
```

Edita el archivo existente con `sudoedit /etc/caddy/Caddyfile`, añade el bloque y valida/recarga Caddy:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy
```

Caddy obtiene y renueva HTTPS automáticamente cuando el dominio resuelve a este servidor y los puertos 80/443 están accesibles. En `NODE_ENV=production` las cookies de sesión llevan `Secure`, por lo que el sitio debe servirse por HTTPS.

Comprueba estos dos endpoints desde el servidor:

```sh
curl -fsS http://127.0.0.1:3001/api/health
curl -fsS https://TU_DOMINIO/api/health
```

## 7. Actualizaciones, copias de seguridad y datos externos

Para publicar una actualización: descarga el cambio, ejecuta `pnpm install --frozen-lockfile`, `pnpm build`, aplica `pnpm db:migrate` si corresponde, reinicia el servicio del API y recarga Caddy. Mantén copias de seguridad de PostgreSQL fuera del servidor y prueba la restauración antes de depender de ellas.

La búsqueda de un equipo puede consumir una llamada; al abrir un plantel, el API puede hacer hasta cuatro llamadas no cacheadas (plantel, dos fixtures y hasta dos alineaciones). API-Football Free tiene una cuota diaria limitada y el sistema reserva cinco llamadas. La disponibilidad de las alineaciones también depende de la competición y el plan. Las fotos y escudos siguen omitidos, y los derechos para retener/publicar datos de terceros en un servicio alojado deben revisarse antes de abrir el servidor al público.

## Estado de preparación

El repositorio permite construir la web y el API, pero aún no incluye Dockerfiles de producción, un `Caddyfile` versionado ni un servicio `systemd` instalado. Este procedimiento es manual y se debe adaptar al dominio, usuario, rutas y política de copias de seguridad de tu servidor. Caddy gestiona TLS automáticamente.
