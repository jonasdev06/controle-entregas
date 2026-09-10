// ---------- testes de integração ----------
let falhas = 0;
function ok(rotulo, cond, detalhe){
  if(!cond) falhas++;
  console.log((cond ? "  ok  " : "  FALHOU  ") + rotulo + (cond ? "" : ("  << " + (detalhe||""))));
}
const app = document.getElementById("app");
const modal = document.getElementById("modal");

// força a data pro dia da semente
dataAtual = "2026-09-02"; mesAtual = "2026-09";

console.log("\nVISÃO DIA");
render();
ok("card do dia com saldo 15,50", /R\$.?15,50/.test(app.innerHTML), app.innerHTML.slice(0,200));
ok("mostra entrou 75,50", /R\$.?75,50/.test(app.innerHTML));
ok("mostra saiu 60,00", /R\$.?60,00/.test(app.innerHTML));
ok("barra de meta renderizada", app.innerHTML.includes("Meta do dia (o que sobra)"));
ok("meta usa o liquido: faltam 184,50 (200 - (75,50-60))", app.innerHTML.includes("Faltam R$"+" "+"184,50")
   || app.innerHTML.includes("Faltam R$ 184,50"), app.innerHTML.match(/Faltam[^<]*/));
ok("nao usa mais o bruto (nao mostra 124,50)", !app.innerHTML.includes("124,50"));
ok("3 itens na lista do dia", (app.innerHTML.match(/class="item"/g)||[]).length === 3);
ok("item clicável pra editar", app.innerHTML.includes("abrirEdicao("));
ok("botões Entrada/Saída aparecem", app.innerHTML.includes(">Entrada<") && app.innerHTML.includes(">Saída<"));

console.log("\nVISÃO MÊS");
visao = "mes"; render();
ok("saldo do mês 135,50 (45,50+30+120-60)", app.innerHTML.includes("135,50"), app.innerHTML.match(/big tnum[^>]*>([^<]*)/));
ok("resumo 'De onde veio'", app.innerHTML.includes("De onde veio"));
ok("iFood aparece agregado (165,50)", /iFood<\/span><span class="bval tnum">R\$.?165,50/.test(app.innerHTML));
ok("resumo 'Onde foi'", app.innerHTML.includes("Onde foi"));
ok("2 dias trabalhados (gasto-só não conta)", app.innerHTML.includes("2 dias trabalhados"), app.innerHTML.match(/\d+ dias? trabalhado[^<]*/));
ok("sem botões de ação no mês", !app.innerHTML.includes('class="act g"'));

console.log("\nABA SEMANA");
// semente: 01/09 (ter) e 02/09 (qua) caem na semana de 31/08 a 06/09; o gasto de 30/08 é da anterior
visao = "semana"; semanaAtual = "2026-08-31"; filtroGasto = "Todos"; barraSel = -1;
render();
ok("alternador tem Semana", app.innerHTML.includes("setVisao('semana')"));
ok("mostra o intervalo da semana", app.innerHTML.includes("31 de agosto a 6 de setembro") || app.innerHTML.includes("31 ago a 6 set"));
ok("saldo da semana 135,50 (195,50 - 60)", app.innerHTML.includes("135,50"));
ok("gráfico com 7 dias", graficoAtual && graficoAtual.dados.length === 7, graficoAtual && graficoAtual.dados.length);
ok("só a quarta tem barra (R$ 60)", (app.innerHTML.match(/class="gbar"/g)||[]).length === 1);
ok("eixo de seg a dom", app.innerHTML.includes(">seg<") && app.innerHTML.includes(">dom<"));
ok("total de gastos da semana 60,00", /gtotal">R\$.?60,00/.test(app.innerHTML));
ok("média por dia trabalhado: 60 / 2 = 30,00", /Média de <b>R\$.?30,00<\/b> por dia trabalhado/.test(app.innerHTML));
ok("o gasto de 30/08 ficou fora (é da semana anterior)", !app.innerHTML.includes("Comida"));
ok("uma categoria só: sem atalhos de filtro", !app.innerHTML.includes('class="gchips"'));

console.log("\nFILTRO POR CATEGORIA");
lancamentos.push(carimbar({id:"1756700000000-f01", tipo:"saida", valor:20, descricao:"gasolina", data:"2026-09-01", hora:"08:00", excluido:false}));
lancamentos.push(carimbar({id:"1756700000001-f02", tipo:"saida", valor:15, descricao:"Almoço",   data:"2026-09-02", hora:"12:30", excluido:false}));
render();
ok("atalhos aparecem com 2+ categorias", app.innerHTML.includes('class="gchips"'));
ok("'gasolina' somou em Combustível (60+20 = 80)", /Combustível<\/span><span class="bval tnum">R\$.?80,00/.test(app.innerHTML));
ok("total de todos os gastos 95,00", /gtotal">R\$.?95,00/.test(app.innerHTML));
escolherFiltro("Combustível");
ok("título vira 'Combustível na semana'", app.innerHTML.includes("Combustível na semana"));
ok("total só de combustível 80,00", /gtotal">R\$.?80,00/.test(app.innerHTML));
ok("atalho Combustível marcado", app.innerHTML.includes('class="gchip on" data-cat="Combustível"'));
ok("2 barras (ter 20, qua 60)", (app.innerHTML.match(/class="gbar"/g)||[]).length === 2);

console.log("\nTOCAR NUMA BARRA");
selecionarBarra(2);   // quarta, 02/09
ok("leitura mostra o valor do dia", document.getElementById("gleitura").innerHTML.includes("60,00"),
   document.getElementById("gleitura").innerHTML);
ok("e o dia", document.getElementById("gleitura").innerHTML.includes("2 de set"), document.getElementById("gleitura").innerHTML);
selecionarBarra(-1);
ok("soltar volta pra média", document.getElementById("gleitura").innerHTML.includes("por dia trabalhado"));

console.log("\nGRÁFICO NO MÊS");
visao = "mes"; mesAtual = "2026-09"; render();
ok("setembro: 30 colunas", graficoAtual && graficoAtual.dados.length === 30, graficoAtual && graficoAtual.dados.length);
ok("o filtro escolhido vale no mês também", app.innerHTML.includes("Combustível no mês"));
filtroGasto = "Manutenção"; render();
ok("categoria sem gasto no período cai pra Todos", app.innerHTML.includes("Gastos do mês"));
filtroGasto = "Todos";
mesAtual = "2026-07"; render();
ok("mês sem gasto mostra aviso, sem gráfico", app.innerHTML.includes("Nenhum gasto nesse mês") && !app.innerHTML.includes('<svg id="grafico"'));
mesAtual = "2026-09"; visao = "dia";

console.log("\nFOLHA DE LANÇAMENTO");
visao = "dia";
abrirForm("entrada");
ok("folha aberta como 'Nova entrada'", modal.innerHTML.includes("Nova entrada"));
ok("atalhos de origem presentes", modal.innerHTML.includes('data-val="iFood"'));
ok("botão salvar começa desabilitado", modal.innerHTML.includes("disabled"));
const chaveAntes = modalAtual;
setDescricao("iFood");
ok("chip não remonta a folha (teclado não fecha)", modalAtual === chaveAntes && formDescricao === "iFood");
formValor = "25.50";                       // usuário digitou com ponto
salvar();
const novo = lancamentos[0];
ok("salvou 25,50 (não 2550)", novo.valor === 25.5, "valor=" + novo.valor);
ok("descrição veio do chip", novo.descricao === "iFood");
ok("folha fechou", modal.innerHTML === "");

console.log("\nEDIÇÃO");
abrirEdicao(novo.id);
ok("abre como 'Editar entrada'", modal.innerHTML.includes("Editar entrada"));
ok("campo pré-preenchido com 25,50", formValor === "25,50", formValor);
formValor = "40"; salvar();
const editado = lancamentos.filter(l => l.id === novo.id)[0];
ok("valor atualizado pra 40", editado.valor === 40);
ok("não duplicou o lançamento", lancamentos.filter(l => l.id === novo.id).length === 1);
ok("data e hora originais preservadas", editado.data === "2026-09-02" && editado.hora === novo.hora);

console.log("\nEXCLUIR / DESFAZER");
const antes = ativos().length;
excluir(editado.id);
ok("sumiu da tela", ativos().length === antes - 1);
ok("mas continua guardado, marcado como excluido", lancamentos.some(l => l.id === editado.id && l.excluido));
ok("aviso com botão Desfazer", document.getElementById("toast").innerHTML.includes("desfazer()"));
desfazer();
ok("desfazer restaurou", ativos().length === antes && ativos().some(l => l.id === editado.id));
ok("aviso sumiu", document.getElementById("toast").hidden === true);

console.log(falhas === 0 ? "\nTODOS OS TESTES DE INTEGRAÇÃO PASSARAM\n" : "\n" + falhas + " FALHA(S)\n");
process.exit(falhas ? 1 : 0);
