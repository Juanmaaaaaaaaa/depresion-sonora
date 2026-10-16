# Depresión Sonora — pequeño recorrido (p5.js)

Mini juego isométrico en línea negra sobre fondo blanco. Todo el arte (título, perritos, casa, gallo, árbol, persona, computador) se dibuja por código con trazo tembloroso y animado.

## Cómo ejecutar
1. Abre `index.html` en un navegador moderno (necesita internet para cargar p5.js desde el CDN).
2. Si el navegador bloquea algo al abrir el archivo directo, usa la extensión **Live Server** de VS Code.

## Controles
- `→` o `D`: avanzar.
- `A` o `←`: volver.
- `ESPACIO` (o `B`): ladrar. Si hay un perrito cerca, te responde.
- `E` (o clic/tap sobre el letrero): interactuar. Cada interacción hace que el perrito ladre.
- `R`: reiniciar.
- Cuando aparece la frase final: mantén el clic y arrastra para **dibujar** encima (también con el dedo). `C` borra tus trazos.
- Con mouse/dedo: mantén presionado para avanzar (el 20% izquierdo de la pantalla hace volver).

## Recorrido
1. Inicio: el título animado y tu perrito en el camino.
2. Perrito amigo → `E` → corazones.
3. Casita con gallo → `E` → «¿Cómo será vivir en el campo?».
4. Árbol → `E` → «Si no estoy contigo, prefiero estar muerto».
5. Persona con el celular → `E` → «Ser un humano, una máquina tonta es tan aburrido».
6. Computador abajo a la derecha → `E` → signos de interrogación junto al perrito, que se queda mirando la pantalla, y aparece el texto final. Ahí puedes dibujar con el mouse.

## Sonido
- El ladrido está sintetizado con Web Audio, no necesita archivos.
- Música: pon tu archivo (con derechos de uso) como `assets/cancion.mp3`; empieza a sonar cuando aparece el texto final. Si no existe, el juego funciona en silencio.

## Personalización (todo en `sketch.js`)
- Frases y de dónde salen: constante `PHRASES`.
- Posiciones de cada escena: `FRIEND_S`, `HOUSE_S`, `TREE_S`, `PERSON_S`, `PC_S`…
- Velocidad: `SPEED`. Temblor de la línea: `nz()` e `ink()`.
- Título: `GLYPHS` (letras como trazos) y `drawLogo()`.
- Perrito: `drawDog()`. Texto final: `drawFinal()`. Ladrido: `bark()` y `barkSound()`.
