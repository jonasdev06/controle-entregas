// ---------- testes de sincronização ----------
let falhas = 0;
function ok(rotulo, cond, detalhe){
  if(!cond) falhas++;
  console.log((cond ? "  ok  " : "  FALHOU  ") + rotulo + (cond ? "" : ("  << " + JSON.stringify(detalhe))));
}
const S = __servidor;
const tick = () => new Promise(r => setTimeout(r, 0));
// espera a fila de sincronização assentar (o app dispara sync sozinho no load)
async function assentar(){ for(let i=0;i<80;i++){ await tick(); if(!syncRodando && !syncPedido) return; } }

(async () => {
console.log("\nMIGRAÇÃO DOS DADOS ANTIGOS");
ok("todos ganharam carimbo de tempo", lancamentos.every(l => typeof l.atualizado_em === "string"));
ok("carimbo veio do id, não de agora", lancamentos[0].atualizado_em.startsWith("2025-"), lancamentos[0].atualizado_em);
ok("nenhum nasce excluído", lancamentos.every(l => l.excluido === false));

console.log("\nCONTA ANÔNIMA AUTOMÁTICA (sem ninguém tocar em nada)");
await assentar();
ok("criou a conta sozinho", S.usuarios === 1 && sessao && sessao.user_id === "user-1", { u:S.usuarios, s:sessao });
ok("marcou como anônima", sessao.anonimo === true);
ok("sessão persistida pro próximo acesso", !!JSON.parse(__mem["sync_sessao"]).access_token);
ok("subiu o histórico inteiro que já existia", S.linhas.size === 5, S.linhas.size);
ok("fila zerada", pendentes().length === 0);
const disp = S.dispositivos.get("user-1");
ok("registrou o aparelho pra dar pra achar depois", !!disp && typeof disp.agente === "string" && disp.agente.length > 0, disp);
ok("estado final ok", syncEstado === "ok", syncEstado);

console.log("\nLANÇAMENTO NOVO SOBE SOZINHO");
dataAtual = "2026-09-02";
abrirForm("entrada"); formValor = "25,50"; formDescricao = "Uber"; salvar();
await assentar();
const novo = lancamentos[0];
ok("chegou no servidor sem ninguém pedir", S.linhas.has("user-1|" + novo.id));
ok("valor certo no servidor", S.linhas.get("user-1|" + novo.id).valor === 25.5);
ok("nada na fila", pendentes().length === 0);

console.log("\nEXCLUSÃO SE PROPAGA");
excluir(novo.id);
await assentar();
ok("sumiu da tela", ativos().every(l => l.id !== novo.id));
ok("continua no aparelho, marcado como excluído", lancamentos.some(l => l.id === novo.id && l.excluido));
ok("servidor sabe que foi excluído", S.linhas.get("user-1|" + novo.id).excluido === true);
desfazer();
await assentar();
ok("desfazer trouxe de volta", ativos().some(l => l.id === novo.id));
ok("servidor sabe que voltou", S.linhas.get("user-1|" + novo.id).excluido === false);

console.log("\nSEM INTERNET NÃO PERDE NADA");
__falharRede(true);
abrirForm("saida"); formValor = "40"; formDescricao = "Combustível"; salvar();
await assentar();
const offline = lancamentos[0];
ok("estado vira 'offline', não 'erro'", syncEstado === "offline", syncEstado);
ok("lançamento fica na fila", pendentes().some(l => l.id === offline.id));
ok("mas está salvo no aparelho", JSON.parse(__mem["lancamentos"]).some(l => l.id === offline.id));
ok("e aparece na tela normalmente", ativos().some(l => l.id === offline.id));
__falharRede(false);
await sincronizar(); await assentar();
ok("voltou a internet: subiu a fila", S.linhas.has("user-1|" + offline.id));
ok("fila zerada de novo", pendentes().length === 0);

console.log("\nSALVAR DURANTE UMA SINCRONIZAÇÃO");
const antes = S.linhas.size;
sincronizar();                                  // começa uma rodada
abrirForm("entrada"); formValor = "12"; formDescricao = "99"; salvar();   // salva no meio
await assentar();
ok("o que foi salvo no meio também subiu", S.linhas.size === antes + 1, { antes, agora:S.linhas.size });
ok("fila zerada", pendentes().length === 0);

console.log("\nCELULAR TROCADO / FORMATADO");
const totalServidor = S.linhas.size;
const sessaoDoPai = JSON.parse(__mem["sync_sessao"]);
lancamentos = []; guardarSessao(null); guardarDesde("1970-01-01T00:00:00.000Z");
await sincronizar(); await assentar();
ok("criou outra conta anônima", S.usuarios === 2);
ok("o histórico antigo continua intacto no servidor", S.linhas.size >= totalServidor);
ok("conta nova não enxerga a antiga (RLS separa)", ativos().length === 0);

console.log("\nRECUPERAR OS DADOS DO APARELHO ANTIGO");
guardarSessao(sessaoDoPai); lancamentos = []; guardarDesde("1970-01-01T00:00:00.000Z");
await sincronizar(); await assentar();
ok("puxou o histórico inteiro de volta", ativos().length === 8, ativos().length);
ok("com os valores certos", ativos().some(l => l.valor === 45.5 && l.descricao === "iFood"));
ok("o excluído não voltou pra tela", ativos().every(l => !l.excluido));

console.log("\nÚLTIMO A ESCREVER GANHA");
const alvo = ativos()[0];
S.linhas.set("user-1|" + alvo.id, Object.assign({}, S.linhas.get("user-1|" + alvo.id), {
  valor: 999, atualizado_em: "2099-01-01T00:00:00.000Z"
}));
guardarDesde("1970-01-01T00:00:00.000Z");
await sincronizar(); await assentar();
ok("versão mais nova do servidor venceu", lancamentos.filter(l => l.id === alvo.id)[0].valor === 999);

console.log("\nVIRADA DA MEIA-NOITE");
const realHoje = hojeISO;
dataAtual = "2026-09-02"; mesAtual = "2026-09"; hojeConhecido = "2026-09-02";
hojeISO = () => "2026-09-03";
checarVirada();
ok("pulou pro novo dia sozinho", dataAtual === "2026-09-03", dataAtual);
dataAtual = "2026-08-15"; hojeConhecido = "2026-09-03";
hojeISO = () => "2026-09-04";
checarVirada();
ok("não arrasta quem foi ver um dia antigo", dataAtual === "2026-08-15", dataAtual);
hojeISO = realHoje;

console.log(falhas === 0 ? "\nTODOS OS TESTES DE SINCRONIZAÇÃO PASSARAM\n" : "\n" + falhas + " FALHA(S)\n");
process.exit(falhas ? 1 : 0);
})();
