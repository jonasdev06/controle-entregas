// DOM mínimo, porém com elementos persistentes por id, pra exercitar render() de verdade.
const mem = {};
global.setInterval = () => 0;
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
  getElementById(id){ if(!els[id]) els[id]=novoEl(id); return els[id]; },
  querySelectorAll(){ return []; },
  querySelector(){ return null; },
  addEventListener(){},
  hidden:false,
  createElement(){ return novoEl("tmp"); },
  body:{ appendChild(){}, removeChild(){} }
};
global.__els = els;
Object.defineProperty(globalThis, "navigator", { value:{ onLine:false, userAgent:"NodeTeste/1.0" }, configurable:true, writable:true });
global.window = { addEventListener(){} };
global.Blob = class { constructor(p){ this.p = p; } };
global.URL = { createObjectURL: () => "blob:fake", revokeObjectURL(){} };

// Semente: dois dias do mesmo mês, com entradas de origens diferentes e um gasto.
mem["lancamentos"] = JSON.stringify([
  {id:"1756000000000-aaa", tipo:"entrada", valor:45.5,  descricao:"iFood",       data:"2026-09-02", hora:"10:30"},
  {id:"1756000000001-bbb", tipo:"entrada", valor:30,    descricao:"Lalamove",    data:"2026-09-02", hora:"12:00"},
  {id:"1756000000002-ccc", tipo:"saida",   valor:60,    descricao:"Combustível", data:"2026-09-02", hora:"13:00"},
  {id:"1755900000000-ddd", tipo:"entrada", valor:120,   descricao:"iFood",       data:"2026-09-01", hora:"09:00"},
  {id:"1755900000001-eee", tipo:"saida",   valor:15,    descricao:"Comida",      data:"2026-08-30", hora:"19:00"}
]);
mem["config_entregas"] = JSON.stringify({ metaDiaria: 200 });
