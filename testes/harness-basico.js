// Stubs mínimos pra rodar o app fora do navegador e testar a lógica pura.
const mem = {};
global.setInterval = () => 0;
global.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
};
const elStub = () => ({ scrollTop:0, innerHTML:"", className:"", hidden:true, textContent:"", disabled:false,
                        value:"", getAttribute:() => null, setSelectionRange(){}, focus(){}, click(){} });
global.document = {
  hidden:false, getElementById:elStub, querySelectorAll:() => [], querySelector:() => null,
  createElement:elStub, addEventListener(){}, body:{ appendChild(){}, removeChild(){} }
};
Object.defineProperty(globalThis, "navigator", {
  value:{ onLine:false, userAgent:"NodeTeste/1.0" }, configurable:true, writable:true
});
global.window = { addEventListener(){} };
