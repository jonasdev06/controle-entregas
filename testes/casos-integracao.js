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
