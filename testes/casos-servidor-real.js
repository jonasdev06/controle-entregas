let falhas = 0;
const ok = (r,c,d) => { if(!c) falhas++; console.log((c?"  ok  ":"  FALHOU  ")+r+(c?"":"  << "+JSON.stringify(d))); };
const tick = () => new Promise(r => setTimeout(r, 120));
async function assentar(){ for(let i=0;i<60;i++){ await tick(); if(!syncRodando && !syncPedido) return; } }

(async () => {
console.log("\nPRIMEIRO ACESSO DO APP (sem ninguém tocar em nada)");
await assentar();
ok("o app criou a conta do aparelho sozinho", !!(sessao && sessao.user_id), sessao);
ok("marcou como anônima", sessao && sessao.anonimo === true);
ok("estado final: ok", syncEstado === "ok", { syncEstado, syncErro });
ok("nada ficou na fila", pendentes().length === 0, pendentes().length);

console.log("\nO HISTÓRICO QUE JÁ ESTAVA NO CELULAR SUBIU");
const h = { apikey:SUPABASE_KEY, Authorization:"Bearer "+sessao.access_token };
let r = await fetch(SUPABASE_URL+"/rest/v1/lancamentos?select=*&order=data.asc", { headers:h });
let noServidor = await r.json();
ok("3 lançamentos antigos chegaram no servidor", noServidor.length === 3, noServidor.length);
ok("com os valores certos", noServidor.some(l => Number(l.valor) === 45.5 && l.descricao === "iFood"));
ok("aparelho registrado pra você achar depois", await fetch(SUPABASE_URL+"/rest/v1/dispositivos?select=*", { headers:h })
     .then(x => x.json()).then(d => d.length === 1 && d[0].agente.includes("CelularDoPai")));

console.log("\nLANÇAMENTO NOVO NA RUA");
dataAtual = "2026-09-02";
abrirForm("entrada"); formValor = "25.50"; formDescricao = "Uber"; salvar();   // digitado com PONTO
await assentar();
const novo = lancamentos[0];
ok("salvou 25,50 e não 2.550,00", novo.valor === 25.5, novo.valor);
r = await fetch(SUPABASE_URL+"/rest/v1/lancamentos?select=*&id=eq."+novo.id, { headers:h });
ok("subiu sozinho pro servidor", (await r.json()).length === 1);

console.log("\nEXCLUSÃO CHEGA NO SERVIDOR");
excluir(novo.id);
await assentar();
r = await fetch(SUPABASE_URL+"/rest/v1/lancamentos?select=excluido&id=eq."+novo.id, { headers:h });
ok("servidor sabe que foi excluído", (await r.json())[0].excluido === true);
desfazer();
await assentar();
r = await fetch(SUPABASE_URL+"/rest/v1/lancamentos?select=excluido&id=eq."+novo.id, { headers:h });
ok("e sabe que o desfazer trouxe de volta", (await r.json())[0].excluido === false);

console.log("\nCELULAR FORMATADO: DÁ PRA RECUPERAR TUDO?");
const sessaoSalva = JSON.parse(__mem["sync_sessao"]);
lancamentos = []; guardarDesde("1970-01-01T00:00:00.000Z"); guardarSessao(sessaoSalva);
await sincronizar(); await assentar();
ok("puxou os 4 lançamentos de volta do servidor", ativos().length === 4, ativos().length);
ok("com iFood 45,50 intacto", ativos().some(l => l.valor === 45.5 && l.descricao === "iFood"));

console.log("\n--- conta de teste criada:", sessao.user_id, "---");
console.log(falhas === 0 ? "\nO APP FUNCIONA CONTRA O SUPABASE REAL\n" : "\n"+falhas+" FALHA(S)\n");
process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("ERRO:", e); process.exit(1); });
