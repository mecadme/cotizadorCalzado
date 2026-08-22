# ===========================================================================
#  Compilación del informe.
#
#    make          -> genera informe.pdf (resuelve índices y bibliografía)
#    make watch    -> recompila automáticamente al guardar
#    make clean    -> borra archivos intermedios, conserva el PDF
#    make cleanall -> borra también el PDF
# ===========================================================================

PRINCIPAL = informe

.PHONY: all watch clean cleanall

all:
	latexmk -pdf -interaction=nonstopmode -halt-on-error $(PRINCIPAL).tex

watch:
	latexmk -pdf -pvc -interaction=nonstopmode $(PRINCIPAL).tex

clean:
	latexmk -c

cleanall:
	latexmk -C
