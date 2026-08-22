# Informe técnico — plantilla LaTeX

Plantilla vacía, ya compilando. Contiene la estructura de secciones; el
contenido se escribe dentro de `secciones/`.

## Compilar

```bash
make            # genera informe.pdf
make watch      # recompila al guardar
make clean      # borra intermedios, conserva el PDF
```

Sin `make`, el equivalente directo es:

```bash
latexmk -pdf informe.tex
```

Requiere una distribución LaTeX con `latexmk` y `biber` (TeX Live, MacTeX o
MiKTeX). MiKTeX instala los paquetes que falten en la primera compilación, así
que esa pasada tarda más.

En VS Code, la extensión **LaTeX Workshop** usa el `Makefile` y el `latexmkrc`
sin configuración adicional.

## Estructura

```
informe.tex              ensamblador: solo \input, sin texto
config/
  datos.tex              ← autores, docente, institución, título
  preambulo.tex          paquetes y estilo
  plantilla.tex          cajas de instrucción, marcadores, macros propias
  portada.tex            portada (toma los datos de datos.tex)
secciones/
  00-resumen.tex            resumen y palabras clave
  01-introduccion.tex       contexto, problema, justificación
  02-objetivos.tex          objetivo general y específicos
  03-alcance-funcional.tex  roles, módulos, exclusiones
  04-arquitectura.tex       vistas, composición, seguridad, decisiones
  05-modelo-datos.tex       DER, diccionario, integridad
  06-reglas-negocio.tex     catálogo de reglas y su implementación
  07-resultados.tex         cumplimiento de criterios, limitaciones
  08-conclusiones.tex       conclusiones, lecciones, trabajo futuro
  A-anexos.tex              scripts, colecciones, capturas
referencias.bib          bibliografía (formato IEEE)
figuras/                 imágenes: PDF, PNG o JPG
```

Para escribir, empieza por `config/datos.tex` y luego ve sección por sección.
No hace falta tocar `informe.tex` salvo que agregues o quites una sección.

## Modo borrador y modo entrega

Mientras se escribe, el PDF muestra dos ayudas que no deben salir en la
versión final: las cajas grises de **Instrucción** (qué va en cada sitio) y los
marcadores ámbar `[Insertar ...]`. Se apagan sin borrar nada del texto, en
`config/plantilla.tex`:

```latex
\guiafalse          % oculta las cajas de instrucción
\marcadoresfalse    % deja los marcadores en negro, para que salten a la vista
```

Los marcadores se dejan en negro a propósito: si alguno quedó sin rellenar,
aparece en el PDF final como texto plano y se detecta en la revisión. Para
ocultar además las notas al margen, añade `disable` a las opciones de
`todonotes` en el mismo archivo.

## Convenciones

**Figuras** — el `\graphicspath` ya apunta a `figuras/`, así que basta el
nombre del archivo:

```latex
\begin{figure}[H]
    \centering
    \includegraphics[width=0.9\textwidth]{arquitectura.png}
    \caption{Vista general de la arquitectura.}
    \label{fig:arquitectura}
\end{figure}
```

**Diagramas** — para los diagramas conviene `\diagrama{nombre}`, que busca
`figuras/nombre.pdf` y, si no existe, deja un recuadro visible en su lugar en
vez de romper la compilación. `\diagramapagina{nombre}` es la variante a página
completa, para diagramas que no caben legibles en el bloque de texto.

**Referencias cruzadas** — con `\cref` no se escribe la palabra «figura»:

```latex
Como se observa en \cref{fig:arquitectura}...   % -> "en la figura 3"
```

**Código** — los lenguajes `Java`, `SQL`, `JavaScript`, `yaml` y `json` ya
están configurados:

```latex
\begin{lstlisting}[language=Java,caption={Título del listado.},label={lst:ejemplo}]
// ...
\end{lstlisting}
```

**Atajos definidos** — `\rn{02}` → **RN-02** (regla de negocio), `\adrref{01}`
→ ADR-01 (decisión), `\vista{02}` → V-02 (vista), `\crit{3}` → CA-3 (criterio
de aceptación), `\ent{1}` → **E1** (entregable), `\id{ms-pedidos}` →
`ms-pedidos` en monoespaciado. Todos crean hiperenlace: si el `\label` destino
no existe, el PDF muestra «??», que es justo lo que se quiere.

**Decisiones de arquitectura** — `\decision{01}{título}{contexto}{decisión}
{alternativa descartada}{consecuencia}` compone un ADR compacto en una caja.

**Citas** — agrega la entrada en `referencias.bib` y cita con `\cite{clave}`.
Solo aparecen en el PDF las referencias efectivamente citadas. Las cuatro
entradas de ejemplo del `.bib` hay que reemplazarlas.

## Notas

- Los índices de figuras y tablas salen vacíos hasta que agregues la primera.
  Si el informe final no lleva ninguno, comenta `\listoffigures` y
  `\listoftables` en `informe.tex`.
- El índice de pendientes (`\listoftodos`) es una ayuda de escritura:
  coméntalo al entregar.
- El estilo bibliográfico es IEEE. Para APA, cambia `style=ieee` por
  `style=apa` en `config/preambulo.tex`.
- Si necesitas entregar en Word, `pandoc informe.tex -o informe.docx` da una
  base aproximada, pero se pierde el formato de tablas y código.
