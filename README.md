# Planeacion

Aplicacion web para la gestion de planeacion academica, con autenticacion Google y manejo de indicadores por dependencias (escuelas/oficinas).

## Tabla de contenido

1. Descripcion general
2. Que hace el proyecto
3. Como funciona
4. Stack tecnologico
5. Requisitos para correrlo
6. Instalacion local
7. Scripts disponibles
8. Integracion con backend
9. Endpoints del backend
10. Modelo de permisos y roles
11. Estructura principal del frontend
12. Flujo funcional resumido
13. Despliegue
14. Problemas comunes

## Descripcion general

Este frontend permite:

- Iniciar sesion con cuenta Google.
- Validar permisos del usuario contra una fuente de datos central.
- Consultar y editar estructura de planeacion (ejes, estrategias, objetivos).
- Consultar, crear y actualizar indicadores por dependencia.

El frontend esta construido con React + Vite y consume un backend desplegado en Vercel:

- Base URL backend: `https://planeacion-server.vercel.app`

## Que hace el proyecto

El sistema tiene dos modulos principales:

1. Ejes, Estrategias y Objetivos Decanato
- Lista jerarquica de ejes -> estrategias -> objetivos.
- Usuarios con permiso `Sistemas` pueden editar nombres y guardar cambios.

2. Indicadores por Dependencia
- Muestra oficinas y escuelas segun permisos del usuario.
- Permite ver detalle del indicador: descripcion, meta del anio actual, avance, responsable, coequipero y enlace.
- Usuarios con permiso `Sistemas` pueden crear indicadores.
- Usuarios autorizados pueden actualizar avance anual.

## Como funciona

1. Al abrir la app, se verifica cookie `token`.
2. Si no hay sesion, se muestra boton Google Sign-In.
3. Al autenticarse:
- Se decodifica el token JWT de Google.
- Se consulta `Permisos` en backend (`/getData`) y se valida el correo.
- Si el usuario existe en permisos, se guarda sesion en:
	- Cookie `token` (5 dias)
	- `sessionStorage.logged` (datos de permiso)
4. Con sesion activa se muestra la interfaz principal con pestañas.

## Stack tecnologico

- React 18
- Vite 2
- Material UI (MUI)
- Bootstrap
- Axios
- js-cookie
- react-jwt
- react-router-dom

## Requisitos para correrlo

- Node.js 16+ (recomendado 18+)
- npm 8+
- Conexion a internet (Google Identity + backend remoto)
- Backend activo y accesible en `https://planeacion-server.vercel.app`

Tambien necesitas que el backend tenga disponibles las hojas/tablas esperadas:

- `Permisos`
- `EJES`
- `ESTRATEGIAS`
- `PROGR_INST`
- `OBJ_DEC`
- `ESC_OFI`
- `INDICADORES`
- `METAS`
- `PLANTILLAS`

## Instalacion local

1. Clonar el repositorio

```bash
git clone <URL_DEL_REPO>
cd planeacion
```

2. Instalar dependencias

```bash
npm install
```

3. Levantar en desarrollo

```bash
npm run dev
```

4. Abrir en navegador

```txt
http://localhost:5173
```

## Scripts disponibles

- `npm run dev`: inicia servidor de desarrollo en puerto 5173.
- `npm run build`: genera build de produccion.
- `npm run serve`: sirve el build generado para prueba local.
- `npm start`: alias de Vite (equivalente a `vite`).

## Integracion con backend

Este frontend depende de un backend que:

- Lee y escribe informacion de planeacion/indicadores.
- Devuelve respuestas en formato consistente.
- Controla tablas/hojas de datos por nombre.

Formato de respuesta esperado para lecturas:

```json
{
	"data": [
		{ "...": "..." }
	]
}
```

El frontend asume especificamente `response.data.data` como arreglo.

## Endpoints del backend

Base URL: `https://planeacion-server.vercel.app`

1. `POST /getData`
- Uso: consultar datos por hoja.
- Body:

```json
{
	"sheetName": "Permisos"
}
```

- Hojas usadas por el frontend:
	- `Permisos`, `EJES`, `ESTRATEGIAS`, `PROGR_INST`, `OBJ_DEC`, `ESC_OFI`, `INDICADORES`, `METAS`, `PLANTILLAS`

2. `POST /updateData`
- Uso: editar nombre en estructuras de planeacion.
- Body esperado:

```json
{
	"id": 12,
	"sheetName": "EJES",
	"updateData": [12, "Nuevo nombre"]
}
```

Notas:
- El frontend construye `sheetName` con la logica `type.toUpperCase() + 'S'`.
- Para `eje`, `estrategia`, `objetivo` espera hojas en plural.

3. `POST /updateMetas`
- Uso: actualizar avance del anio actual para un indicador.
- Body esperado:

```json
{
	"id": 34,
	"sheetName": "METAS",
	"updateData": ["ejec_2026", "75"]
}
```

Nota:
- `ejec_<anio>` se calcula dinamicamente segun fecha actual del cliente.

4. `POST /createIndicator`
- Uso: crear nuevo indicador.
- Body esperado:

```json
{
	"nombre": "Nombre del indicador",
	"oficinaEscuela": 5,
	"id_obj_dec": 10,
	"responsable": "usuario@correounivalle.edu.co",
	"coequipero": "Nombre o NA",
	"meta2024": "10",
	"meta2025": "20",
	"meta2026": "30",
	"tipoOficinaEscuela": "Escuela",
	"plantillaId": 2
}
```

Validaciones aplicadas por frontend:

- El correo de `responsable` debe pertenecer al dominio `@correounivalle.edu.co`.

## Modelo de permisos y roles

El frontend usa `sessionStorage.logged` para controlar visibilidad y acciones.

Roles detectados en la logica actual:

- `Sistemas`
- `Escuela_jefe`
- `Escuela_prof`
- `Oficina_jefe`

Campos esperados en el objeto de permisos:

- `permiso`
- `id_escuela` (cuando aplica)
- `id_oficina` (cuando aplica)

Reglas principales:

- `Sistemas`: puede editar estructuras, crear indicadores y editar avances.
- `Escuela_prof`: puede editar avance en su contexto.
- `Escuela_jefe` / `Oficina_jefe`: filtran visualizacion por dependencia.

## Estructura principal del frontend

- `src/App.jsx`: layout principal, tabs y control de sesion.
- `src/components/GoogleLogin.jsx`: autenticacion Google y validacion de permisos.
- `src/components/Page1.jsx`: jerarquia ejes/estrategias/objetivos y edicion.
- `src/components/Page2.jsx`: indicadores por dependencia, detalle, creacion y avance.
- `src/components/Header.jsx`: encabezado con usuario y rol.

## Flujo funcional resumido

1. Login con Google.
2. Validacion de acceso contra `Permisos`.
3. Carga de catalogos y datos operativos.
4. Interaccion segun rol (consulta/edicion/creacion).
5. Persistencia de cambios via backend.

## Despliegue

- Frontend pensado para Vercel (incluye `vercel.json` con rewrite a `index.html`).
- Build command sugerido:

```bash
npm run build
```

- Directorio de salida:

```txt
dist
```

## Problemas comunes

1. No aparece login Google
- Verifica conectividad a `https://accounts.google.com/gsi/client`.

2. Login exitoso pero sin acceso
- El correo no esta registrado en la hoja/tabla `Permisos`.

3. Errores al cargar datos
- Revisar que backend responda correctamente en `/getData`.
- Revisar que `response.data.data` sea arreglo.

4. No se guardan ediciones
- Revisar payloads de `/updateData` y `/updateMetas`.
- Confirmar permisos del usuario.

---

Si quieres, en un siguiente paso puedo agregar en este README una seccion de variables de entorno (`.env`) para dejar configurable la URL del backend y el Google Client ID sin hardcodearlos en el codigo.
