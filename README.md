# Planeacion

Aplicacion web para la gestion de planeacion academica, con autenticacion Google y manejo de indicadores producto por dependencia.

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
- Consultar los indicadores producto segun la dependencia del usuario.
- Crear, editar y eliminar indicadores producto.
- Filtrar indicadores con filtros encadenados segun la relacion entre desafio y sus niveles asociados.

El frontend esta construido con React + Vite y consume un backend desplegado en Vercel:

- Base URL backend: `https://planeacion-server.vercel.app`

## Que hace el proyecto

El sistema tiene dos modulos principales:

1. Ejes, Estrategias y Objetivos Decanato
- Mantiene la estructura historica del proyecto.
- Usuarios con permiso `Sistemas` pueden editar nombres y guardar cambios.

2. Indicadores producto por dependencia
- Muestra indicadores producto filtrados por la dependencia asociada al usuario.
- Cada indicador se renderiza como un acordeon con `ID`, `nombre` y `dependencia`.
- Al abrir el acordeon se ve el `desafio`, una tabla con `meta`, `avance` y `URL documento`, y los botones `Ver detalles`, `Editar` y `Eliminar`.
- El boton `Crear indicador` esta dentro del bloque de filtros.
- Los filtros se encadenan de esta forma:
  - `Desafio` filtra `Estrategia convergente`
  - `Estrategia convergente` filtra `Estrategia facultad`
  - `Estrategia facultad` filtra `Programa institucional`
  - `Programa institucional` filtra `Indicador resultado`

## Como funciona

1. Al abrir la app, se verifica la cookie `token`.
2. Si no hay sesion, se muestra el boton de Google Sign-In.
3. Al autenticarse:
- Se decodifica el token JWT de Google.
- Se consultan los datos del backend con `POST /getData`.
- Se valida el correo contra la hoja `USUARIOS`.
- Si el usuario existe, se guarda sesion en:
  - Cookie `token` por 5 dias
  - `sessionStorage.loggedUser`
4. Con sesion activa se muestra la interfaz principal.
5. La vista de indicadores se limita a la dependencia del usuario autenticado.

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

```js
SHEET_COLUMNS = {
  USUARIOS: {
    id: 0,
    dependencia: 1,
    correo: 2,
    rol: 3,
  },
  PERIODO: {
    id: 0,
    anio_ini: 1,
    anio_final: 2,
    nombre_decano: 3,
    actual: 4,
  },
  DEPENDENCIA: {
    id: 0,
    nombre: 1,
    abreviatura: 2,
    tipo: 3,
  },
  DESAFIOS: {
    id: 0,
    titulo: 1,
  },
  ESTRATEGIA_COVERGENTE: {
    id: 0,
    id_desafio: 1,
    titulo: 2,
  },
  ESTRATEGIA_FACULTAD: {
    id: 0,
    id_convergente: 1,
    titulo: 2,
  },
  PROGRAMAS_INST: {
    id: 0,
    id_estrategia_facultad: 1,
    titulo: 2,
  },
  INDICADORES_RESULTADO: {
    id: 0,
    id_programa_inst: 1,
    nombre: 2,
  },
  RESPONDE_A: {
    id: 0,
    nombre: 1,
  },
  INDICADORES_PRODUCTO: {
    id: 0,
    id_dependencia: 1,
    id_desafio: 2,
    id_estrategia_convergente: 3,
    id_estrategia_facultad: 4,
    id_programa_inst: 5,
    id_indicador_resultado: 6,
    id_periodo: 7,
    objetivo_escuela: 8,
    nombre: 9,
    id_responde_a: 10,
    logro: 11,
    responsable: 12,
    suma_facultad: 13,
  },
  METAS: {
    id: 0,
    id_indicador: 1,
    meta_2024: 2,
    meta_2025: 3,
    meta_2026: 4,
    total_trienio: 5,
    tipo: 6,
  },
  AVANCES: {
    id: 0,
    id_indicador: 1,
    Avance2024: 2,
    Avance2025: 3,
    Avance2026: 4,
  },
};
```

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

- Lee y escribe informacion de planeacion e indicadores.
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
  - `USUARIOS`
  - `PERIODO`
  - `DEPENDENCIA`
  - `DESAFIOS`
  - `ESTRATEGIA_COVERGENTE`
  - `ESTRATEGIA_FACULTAD`
  - `PROGRAMAS_INST`
  - `INDICADORES_RESULTADO`
  - `INDICADORES_PRODUCTO`
  - `METAS`
  - `AVANCES`

2. `POST /:sheetName`
- Uso: crear una nueva fila en la hoja indicada.
- El `id` se asigna automaticamente.
- Body esperado:

```json
{
  "data": {
    "nombre": "Indicador Producto ABC",
    "id_dependencia": "1",
    "id_desafio": "2",
    "id_periodo": "1",
    "objetivo_escuela": "Mejorar procesos"
  }
}
```

3. `PUT /:sheetName/:id`
- Uso: actualizar una fila existente por `id`.
- Body esperado:

```json
{
  "data": {
    "nombre": "Indicador actualizado",
    "id_desafio": "3"
  }
}
```

4. `DELETE /:sheetName/:id`
- Uso: eliminar una fila por `id`.

## Modelo de permisos y roles

El frontend usa `sessionStorage.loggedUser` para controlar visibilidad y acciones.

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

- `Sistemas` puede crear, editar y eliminar indicadores.
- El contenido de indicadores se filtra por la dependencia del usuario autenticado.
- Los filtros y los modales muestran solo opciones compatibles con la seleccion anterior.

## Estructura principal del frontend

- `src/App.jsx`: layout principal, tabs y control de sesion.
- `src/components/GoogleLogin.jsx`: autenticacion Google y validacion de permisos.
- `src/pages/IndicatorsPage.jsx`: indicadores producto, filtros encadenados y acordeones.
- `src/components/CreateIndicator.jsx`: modal de creacion del indicador.
- `src/components/EditModal.jsx`: modal de edicion del indicador.
- `src/components/ModalDetails.jsx`: modal con detalles del indicador.
- `src/components/Header.jsx`: encabezado con usuario y rol.

## Flujo funcional resumido

1. Login con Google.
2. Validacion de acceso contra `USUARIOS`.
3. Carga de catalogos y datos operativos con `getData`.
4. Filtrado de indicadores por dependencia del usuario.
5. Creacion, edicion y eliminacion de indicadores en `INDICADORES_PRODUCTO`.

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
- El correo no esta registrado en la hoja `USUARIOS`.

3. Errores al cargar datos
- Revisar que backend responda correctamente en `POST /getData`.
- Revisar que `response.data.data` sea arreglo.

4. No se guardan cambios
- Revisar payloads de `POST /:sheetName`, `PUT /:sheetName/:id` y `DELETE /:sheetName/:id`.
- Confirmar permisos del usuario.

---

Si quieres, en un siguiente paso puedo dejar el README aun mas afinado con ejemplos reales de payload para `INDICADORES_PRODUCTO`, `METAS` y `AVANCES`.
