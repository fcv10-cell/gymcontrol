# GymControl

App de gestión para un gimnasio pequeño: socios, entradas, vencimientos, renovaciones y caja.
Se instala en Windows como un programa (ícono propio, ventana propia) y funciona sin internet.

## Abrirla

Doble clic en el ícono **GymControl** del escritorio. Abre en su propia ventana, sin consola ni barra
del navegador (usa `GymControl.vbs`, que arranca el servidor local oculto y abre Edge en modo app).
Si se borra el acceso directo, también sirve doble clic en `GymControl.vbs` o en `Iniciar GymControl.bat`.

La primera vez: escribe el nombre de tu gimnasio y elige cómo empezar (con datos de ejemplo o vacío).

## Instalarla como app en Windows

En **Microsoft Edge**: menú **⋯** → **Aplicaciones** → **Instalar este sitio como aplicación**.
En **Google Chrome**: el ícono **Instalar** que aparece a la derecha de la barra de direcciones.
También puedes usar el botón **Instalar** del menú lateral de la app.

Después la abres desde el menú Inicio o la anclas a la barra de tareas. Una vez instalada abre
aunque la ventana negra del `.bat` esté cerrada. Para recibir mejoras, abre el `.bat` de vez en cuando.

## Conectar la nube (datos iguales en todos tus equipos)

1. Crea una cuenta gratis en **supabase.com** y un proyecto nuevo.
2. En **SQL Editor** → **New query**, pega el archivo `supabase/schema.sql` completo y pulsa **Run**.
3. En **Authentication → Users → Add user**, crea tu usuario (correo y contraseña).
   Si alguien más va a usar la app (recepción), créale su propio usuario aquí.
4. En **Authentication → Sign In / Providers**, desactiva **Allow new users to sign up**
   para que nadie más pueda crearse una cuenta.
5. En **Project Settings → API** copia la **Project URL** y la clave **anon public**.
6. En la app: **Ajustes → Nube y sincronización**, pega los dos datos e inicia sesión.

Si la nube está vacía, la app sube lo que ya tenías en este equipo (sin los datos de ejemplo).
Sin internet sigue funcionando: los cambios quedan guardados y se suben solos al volver la conexión.

## Personalizados

Sección para tus clientes de entrenamiento personal (mensualidad, un solo entrenador):
agenda de hoy con botones **Asistió / Faltó**, agenda de la semana, nota de lo que entrenó en cada
sesión, asistencia del mes y botón **Cobrar mes** (renueva un mes calendario y registra el pago en la caja).
Los que vencen aparecen también en **Para cobrar** del Inicio.

> Si ya conectaste Supabase antes de esta sección, vuelve a ejecutar `supabase/schema.sql`
> (crea las tablas nuevas sin tocar tus datos).

## Atajos

- **Ctrl + K**: registrar la entrada de un socio desde cualquier pantalla (Enter registra, Shift + Enter abre la ficha).
- En **Entradas**, la app sugiere los socios que suelen llegar a esa hora.

## Copias de seguridad

**Ajustes → Copia de seguridad**: descarga un archivo `.json` con todo, restáuralo cuando quieras
o exporta la lista de socios a Excel (`.csv`).

## Archivos

| Archivo | Para qué |
| --- | --- |
| `index.html`, `css/`, `js/` | La app |
| `sw.js`, `manifest.webmanifest`, `icons/` | Lo que la hace instalable y usable sin internet |
| `supabase/schema.sql` | Tablas y seguridad de la base de datos en la nube |
| `server.js`, `Iniciar GymControl.bat` | Servidor local para abrirla en este PC |
