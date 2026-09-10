// ---------- testes ----------
let falhas = 0;
function eq(rotulo, obtido, esperado){
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if(!ok) falhas++;
  console.log((ok ? "  ok  " : "  FALHOU  ") + rotulo + "  ->  " + JSON.stringify(obtido) + (ok ? "" : "  (esperado " + JSON.stringify(esperado) + ")"));
}

console.log("\nparseValor — separador decimal");
eq('"25,50"',      parseValor("25,50"),      25.5);
eq('"25.50"',      parseValor("25.50"),      25.5);   // era 2550 antes
eq('"25"',         parseValor("25"),         25);
eq('"1.234,56"',   parseValor("1.234,56"),   1234.56);
eq('"1,234.56"',   parseValor("1,234.56"),   1234.56);
eq('"1.234"',      parseValor("1.234"),      1234);   // milhar, nao 1,234
eq('"1.500"',      parseValor("1.500"),      1500);
eq('"12,5"',       parseValor("12,5"),       12.5);
eq('"R$ 30,00"',   parseValor("R$ 30,00"),   30);
eq('"25,"',        parseValor("25,"),        25);
eq('","',          parseValor(","),          0);
eq('""',           parseValor(""),           0);
eq('"abc"',        parseValor("abc"),        0);
eq('",50"',        parseValor(",50"),        0.5);

console.log("\nagrupar — resumo por origem");
const amostra = [
  {tipo:"entrada",valor:100,descricao:"iFood"},
  {tipo:"entrada",valor:50, descricao:"Lalamove"},
  {tipo:"entrada",valor:20, descricao:"iFood"},
  {tipo:"saida",  valor:80, descricao:"Combustível"},
];
eq("entradas somadas e ordenadas", agrupar(amostra,"entrada"), [{nome:"iFood",total:120},{nome:"Lalamove",total:50}]);
eq("saidas",                       agrupar(amostra,"saida"),   [{nome:"Combustível",total:80}]);
eq("soma entrada", soma(amostra,"entrada"), 170);
eq("soma saida",   soma(amostra,"saida"),    80);

console.log("\nesc — escape de HTML");
eq("tags viram texto", esc('<img src=x onerror="a">'), "&lt;img src=x onerror=&quot;a&quot;&gt;");

console.log("\nsemanas (segunda a domingo)");
eq("quarta cai na semana da segunda", inicioSemana("2026-09-02"), "2026-08-31");
eq("domingo fecha a semana anterior", inicioSemana("2026-09-06"), "2026-08-31");
eq("segunda é o próprio início", inicioSemana("2026-09-07"), "2026-09-07");
eq("somaDias atravessa o mês", somaDias("2026-08-31", 6), "2026-09-06");
eq("setembro tem 30 dias", diasNoMes("2026-09"), 30);
eq("fevereiro de 2028 tem 29", diasNoMes("2028-02"), 29);
eq("intervalo no mesmo mês", intervaloSemana("2026-09-07"), "7 a 13 de setembro");
eq("intervalo atravessando o mês", intervaloSemana("2026-08-31"), "31 de agosto a 6 de setembro");

console.log("\ncategorias de gasto");
eq("atalho fica como está", categoriaGasto("Combustível"), "Combustível");
eq("'gasolina' vira Combustível", categoriaGasto("gasolina"), "Combustível");
eq("'Etanol' vira Combustível", categoriaGasto("Etanol"), "Combustível");
eq("'Almoço' vira Comida", categoriaGasto("Almoço"), "Comida");
eq("'troca de óleo' vira Manutenção", categoriaGasto("troca de óleo"), "Manutenção");
eq("'Imposto' NÃO vira Combustível", categoriaGasto("Imposto"), "Imposto");
eq("descrição própria vira categoria dela", categoriaGasto("Pedágio"), "Pedágio");
eq("gasto sem descrição vai pra Outros", categoriaGasto("Gasto"), "Outros");

console.log("\nescala do gráfico");
eq("60 -> 60", tetoRedondo(60), 60);
eq("65 -> 80", tetoRedondo(65), 80);
eq("130 -> 150", tetoRedondo(130), 150);
eq("7 -> 8", tetoRedondo(7), 8);
eq("sem gasto -> 10", tetoRedondo(0), 10);
eq("rótulo curto sem centavos", fmtCurto(60), "R$ 60");

console.log(falhas === 0 ? "\nTODOS OS TESTES PASSARAM\n" : "\n" + falhas + " TESTE(S) FALHARAM\n");
process.exit(falhas ? 1 : 0);
