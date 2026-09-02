#!/bin/sh
# Roda as três suítes. Na pasta do projeto:  sh testes/rodar.sh
set -e
cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"

# O app inteiro vive dentro de um <script> no index.html: extrai pra poder testar.
sed -n '/^<script>$/,/^<\/script>$/p' index.html | sed '1d;$d' > "$TMP/app.js"
node --check "$TMP/app.js" && echo "sintaxe OK"

falhou=0
run() {
  cat "testes/$1" "$TMP/app.js" "testes/$2" > "$TMP/suite.js"
  node "$TMP/suite.js" || falhou=1
}
run harness-basico.js   casos-unitarios.js
run harness-dom.js      casos-integracao.js
run harness-servidor.js casos-sincronizacao.js

rm -rf "$TMP"
exit $falhou
