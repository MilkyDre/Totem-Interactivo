# Tótem Interactivo · Directorio 3D

Vista 3D interactiva del piso de **Adquisiciones** y del **Departamento de Gestión de Sistemas y TICs**, pensada para un tótem táctil vertical (1080 × 1920). El tótem está en el hall, frente a los 3 ascensores ("Usted está aquí").

## Qué hace

- **Pantalla principal centrada en trámites:** "Toca lo que necesitas" muestra tarjetas con lo que se puede hacer (reparar un computador, estado de una compra, entregar documentos…), con lo más consultado primero.
- **Modelo 3D detallado:** puestos de trabajo con monitores y sillas, mesas de reunión, ventanales, escaleras, ascensores, plantas, muros de vidrio con bordes de neón por departamento y efecto de brillo.
- **Ficha de oficina:** al tocar un trámite u oficina se ilumina con un haz de luz, se dibuja la ruta desde el tótem y se listan todas las cosas que se pueden hacer ahí, con una ubicación resumida (p. ej. "3.ª puerta a la derecha · ≈ 25 m").
- **▶ Ver recorrido:** vuelo tipo dron desde el tótem hasta la oficina.
- **Modo reposo llamativo:** tras 90 s sin uso va rotando preguntas ("¿Falla tu impresora?") y resalta en 3D la oficina que ayuda.
- Buscador con **teclado en pantalla**, filtros Compras / Informática y botón ▦ para ver el plano original sobre el modelo.
- Funciona **sin internet**: Three.js está incluido en `vendor/`.

## Cómo ejecutarlo

Necesita un servidor HTTP local (los módulos ES no cargan con `file://`).

- **Linux:** `./start-totem.sh` (abre Chromium en modo kiosco)
- **Windows:** doble clic en `start-totem.bat` (abre Chrome en modo kiosco)
- **Pruebas:** `python3 -m http.server 8080` y abrir <http://localhost:8080>

Para abrir directamente una oficina (útil para pruebas): `index.html?oficina=soporte`.

## Cómo editar la información

Todo está en [`js/data.js`](js/data.js):

- `OFFICES`: nombre, ícono, frase corta (`tagline`), trámites (`services`: ícono, título y detalle), puestos de trabajo (`desks`), polígono y puerta de cada oficina, en **píxeles del plano** (`assets/plano.png`).
- `TOTEM`: ubicación del tótem.
- `LANDMARKS`: escaleras, ascensores y baños.

En [`js/app.js`](js/app.js) están las palabras clave de búsqueda (`KEYWORDS`), el orden de la pantalla principal (`ORDER`) y las preguntas del modo reposo (`PROMPTS`).

## Estructura

```
index.html        Maqueta de la pantalla
css/styles.css    Estilos (lienzo fijo 1080x1920 que se escala a la pantalla)
js/data.js        Oficinas, trámites y geometría del plano
js/scene.js       Escena 3D, rutas y cámara
js/app.js         Interfaz: búsqueda, ficha, teclado, reposo
assets/plano.png  Plano original
vendor/three/     Three.js r160 (licencia MIT)
```
