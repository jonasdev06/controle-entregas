// DOM/rede mínimos pra exercitar o app fora do navegador.
const mem = {};
global.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
};
global.__mem = mem;

function novoEl(id){
  return { id, scrollTop:0, innerHTML:"", className:"", hidden:true, textContent:"", disabled:false, value:"",
           getAttribute(){ return null; }, setSelectionRange(){}, focus(){}, click(){} };
}
const els = {};
global.document = {
  hidden:false,
  getElementById(id){ if(!els[id]) els[id]=novoEl(id); return els[id]; },
  querySelectorAll(){ return []; },
  querySelector(){ return null; },
  createElement(){ return novoEl("tmp"); },
  addEventListener(){},
  body:{ appendChild(){}, removeChild(){} }
};
global.__els = els;
Object.defineProperty(globalThis, "navigator", {
  value:{ onLine:true, userAgent:"NodeTeste/1.0" }, configurable:true, writable:true
});
global.window = { addEventListener(){} };
global.Blob = class { constructor(p){ this.p = p; } };
global.URL = { createObjectURL: () => "blob:fake", revokeObjectURL(){} };
global.setInterval = () => 0;   // sem timers pendurados segurando o processo

// --- Supabase de mentira: guarda linhas em memória e fala PostgREST o suficiente ---
const servidor = { usuarios:0, linhas:new Map(), dispositivos:new Map(), chamadas:[] };
global.__servidor = servidor;
let falharRede = false;
global.__falharRede = (v) => { falharRede = v; };

function resposta(status, corpo){
  // Espelha o PostgREST: com "return=minimal" ele devolve 201 e CORPO VAZIO.
  // O fake antes devolvia 204 com JSON, e isso escondeu um bug de verdade.
  const vazio = corpo === null || corpo === undefined;
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => vazio ? Promise.reject(new Error("Unexpected end of JSON input")) : Promise.resolve(corpo),
    text: () => Promise.resolve(vazio ? "" : JSON.stringify(corpo)),
  });
}

global.fetch = (url, opcoes) => {
  if(falharRede) return Promise.reject(new TypeError("Failed to fetch"));
  const o = opcoes || {};
  const corpo = o.body ? JSON.parse(o.body) : null;
  servidor.chamadas.push({ url, metodo:o.method || "GET" });

  if(url.includes("/auth/v1/signup")){
    servidor.usuarios++;
    return resposta(200, {
      access_token:"tok-"+servidor.usuarios, refresh_token:"ref-"+servidor.usuarios,
      user:{ id:"user-"+servidor.usuarios, is_anonymous:true }
    });
  }
  if(url.includes("/auth/v1/token")){
    return resposta(200, { access_token:"tok-renovado", refresh_token:"ref-renovado", user:{ id:"user-1" } });
  }
  const auth = (o.headers && o.headers.Authorization) || "";
  if(!auth.startsWith("Bearer tok")) return resposta(401, { message:"sem token" });
  // Simula o RLS: o token diz de quem e a sessao, e a conta so enxerga o que e dela.
  const dono = "user-" + auth.replace("Bearer tok-", "");

  if(url.includes("/rest/v1/dispositivos")){
    servidor.dispositivos.set(corpo.user_id, corpo);
    return resposta(201, null);
  }
  if(url.includes("/rest/v1/lancamentos")){
    if((o.method || "GET") === "POST"){
      if(corpo.some(r => r.user_id !== dono)) return resposta(403, { message:"RLS" });
      corpo.forEach(r => servidor.linhas.set(r.user_id + "|" + r.id, r));   // upsert
      return resposta(201, null);
    }
    const m = /atualizado_em=gt\.([^&]+)/.exec(url);
    const marca = m ? decodeURIComponent(m[1]) : "";
    const saida = [...servidor.linhas.values()]
      .filter(r => r.user_id === dono && r.atualizado_em > marca)
      .sort((a,b) => a.atualizado_em.localeCompare(b.atualizado_em));
    return resposta(200, saida);
  }
  return resposta(404, {});
};

// Semente: histórico que já existia no aparelho antes da sincronização existir
// (formato ANTIGO, sem atualizado_em/excluido/sincronizado — testa a migração).
mem["lancamentos"] = JSON.stringify([
  {id:"1756000000000-aaa", tipo:"entrada", valor:45.5, descricao:"iFood",       data:"2026-09-02", hora:"10:30"},
  {id:"1756000000001-bbb", tipo:"entrada", valor:30,   descricao:"Lalamove",    data:"2026-09-02", hora:"12:00"},
  {id:"1756000000002-ccc", tipo:"saida",   valor:60,   descricao:"Combustível", data:"2026-09-02", hora:"13:00"},
  {id:"1755900000000-ddd", tipo:"entrada", valor:120,  descricao:"iFood",       data:"2026-09-01", hora:"09:00"},
  {id:"1755900000001-eee", tipo:"saida",   valor:15,   descricao:"Comida",      data:"2026-08-30", hora:"19:00"}
]);
mem["config_entregas"] = JSON.stringify({ metaDiaria: 200 });
