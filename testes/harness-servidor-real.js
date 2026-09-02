// ATENÇÃO: esta suíte fala com o Supabase DE VERDADE.
// Ela cria uma conta anônima e grava linhas reais a cada execução.
// Rode só quando quiser validar o backend de ponta a ponta, e limpe depois
// com o limpar-contas-de-teste.sql. As outras três suítes usam servidor falso
// e podem rodar à vontade.
//
//   sed -n '/^<script>$/,/^<\/script>$/p' index.html | sed '1d;$d' > /tmp/app.js
//   cat testes/harness-servidor-real.js /tmp/app.js testes/casos-servidor-real.js > /tmp/s.js && node /tmp/s.js
//
// Mesmos stubs de DOM, mas SEM servidor falso: o fetch é o real.
const mem = {};
global.setInterval = () => 0;
global.localStorage = {
  getItem:(k) => (k in mem ? mem[k] : null),
  setItem:(k,v) => { mem[k] = String(v); },
  removeItem:(k) => { delete mem[k]; },
};
global.__mem = mem;
const el = () => ({ scrollTop:0, innerHTML:"", className:"", hidden:true, textContent:"", disabled:false,
                    value:"", getAttribute:() => null, setSelectionRange(){}, focus(){}, click(){} });
global.document = { hidden:false, getElementById:el, querySelectorAll:() => [], querySelector:() => null,
                    createElement:el, addEventListener(){}, body:{ appendChild(){}, removeChild(){} } };
Object.defineProperty(globalThis, "navigator", {
  value:{ onLine:true, userAgent:"CelularDoPai-TESTE/1.0" }, configurable:true, writable:true
});
global.window = { addEventListener(){} };

// Histórico no formato ANTIGO, como está hoje no celular dele (sem campos de sync).
mem["lancamentos"] = JSON.stringify([
  {id:"1756000000000-r1", tipo:"entrada", valor:45.5, descricao:"iFood",       data:"2026-09-02", hora:"10:30"},
  {id:"1756000000001-r2", tipo:"entrada", valor:30,   descricao:"Lalamove",    data:"2026-09-02", hora:"12:00"},
  {id:"1756000000002-r3", tipo:"saida",   valor:60,   descricao:"Combustível", data:"2026-09-02", hora:"13:00"}
]);
