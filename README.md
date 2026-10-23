# Tótem Interactivo · Directorio 3D

Vista 3D interactiva del piso de **Adquisiciones** y del **Departamento de Gestión de Sistemas y TICs**, pensada para un tótem táctil vertical (1080 × 1920). El tótem está en el hall, frente a los 3 ascensores ("Usted está aquí").

## Qué hace

- Modelo 3D del piso (Three.js) generado a partir del plano (`assets/plano.png`).
- El edificio está orientado como lo ve la persona frente al tótem: el pasillo se aleja hacia arriba, **Informática a la derecha** y **Adquisiciones a la izquierda**.
- Al tocar una oficina (en el modelo, en su etiqueta o en el listado):
  - se resalta la oficina y se dibuja una **ruta animada** desde el tótem,
  - se abre una ficha con los **trámites que atiende** y **cómo llegar** (puerta n.º X a su derecha/izquierda, distancia aproximada).
- Buscador con **teclado en pantalla** (busca en nombres, trámites y palabras clave como "impresora", "wifi", "PAC", "Mercado Público").
- Filtros: Todos / Adquisiciones / Informática.
- Botón **Plano real** para ver el plano original sobre el piso 3D.
- Tras 90 s sin uso vuelve a la **pantalla de reposo** (con rotación automática).
- Funciona **sin internet**: Three.js está incluido en `vendor/`.

## Cómo ejecutarlo

Necesita un servidor HTTP local (los módulos ES no cargan con `file://`).

- **Linux:** `./start-totem.sh` (abre Chromium en modo kiosco)
- **Windows:** doble clic en `start-totem.bat` (abre Chrome en modo kiosco)
- **Pruebas:** `python3 -m http.server 8080` y abrir <http://localhost:8080>

Para abrir directamente una oficina (útil para pruebas): `index.html?oficina=soporte`.

## Cómo editar la información

Todo está en [`js/data.js`](js/data.js):

- `OFFICES`: nombre, nombre corto, ícono, trámites (`services`), polígono y puerta de cada oficina, en **píxeles del plano** (`assets/plano.png`).
- `TOTEM`: ubicación del tótem.
- `LANDMARKS`: escaleras, ascensores y baños.

Las palabras clave extra para la búsqueda están en `KEYWORDS`, en [`js/app.js`](js/app.js).

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
