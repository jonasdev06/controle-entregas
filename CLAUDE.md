# Controle de Entregas — contexto do projeto

App de controle financeiro pessoal para um entregador (o pai do dono do projeto).
Registra entradas (ganhos por entrega) e saídas (gastos), mostra o saldo do dia e
o resumo do mês. Feito para uso no celular, na rua, muitas vezes sem internet.

## Stack e decisões importantes

- **HTML/CSS/JS puro (vanilla), sem framework e sem dependências externas.**
  Foi uma escolha deliberada: o app precisa funcionar 100% offline na rua e ser
  trivial de hospedar como site estático. Não introduzir React/build/CDN sem um
  motivo forte — isso quebraria o funcionamento offline e a simplicidade do deploy.
- **PWA**: tem `manifest.json` e `sw.js` (service worker) que cacheia os assets
  para funcionar offline e permitir "Adicionar à tela inicial".
- **`localStorage` é a fonte da verdade**, sempre. Chaves: `"lancamentos"`,
  `"config_entregas"` (`{ metaDiaria }`), `"sync_sessao"` e `"sync_desde"`.
  O app tem que continuar 100% funcional sem internet e sem servidor — a
  sincronização é uma camada por cima, nunca um pré-requisito.
- **Sincronização automática com Supabase** (ver seção própria abaixo). Se o
  servidor estiver fora, mal configurado ou sem rede, o app funciona igual.
- **Tema claro forçado** (`color-scheme: light` + `<meta name="color-scheme">`),
  porque o app estava herdando o dark mode do sistema e ficando escuro. Manter assim.
- **Comportamento "tipo app"**: zoom travado (`user-scalable=no`), sem bounce/overscroll
  (`overflow:hidden` no body, `#app` é o container de scroll com `overscroll-behavior`).
- Moeda formatada em BRL (`toLocaleString('pt-BR')`); datas em pt-BR.

## Estrutura dos arquivos

- `index.html` — app inteiro (HTML + CSS embutido + JS embutido num `<script>`).
- `manifest.json` — metadados do PWA.
- `sw.js` — service worker de cache offline.
- `supabase-schema.sql` — tabelas + políticas de RLS. Rodar no SQL Editor.
- `testes/` — três suítes em Node com DOM e servidor simulados. `sh testes/rodar.sh`.
- `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — ícones do PWA.
- `controle-entregas.jsx` — **não faz parte do app**. É o protótipo original em
  React/Tailwind, de onde o `index.html` nasceu. Não é referenciado por nada e não
  vai pro deploy; usa `window.storage`, que só existia no ambiente de artifact.

## Como o `index.html` funciona por dentro

Não há framework nem estado reativo. O padrão é **estado global + `render()` que
reescreve o `innerHTML`**:

- Estado em variáveis soltas (`lancamentos`, `visao`, `dataAtual`, `mesAtual`,
  `form`, `editandoId`, `config`…). Toda ação muda a variável e chama `render()`.
- Os handlers são `onclick="..."` inline, então as funções precisam ser globais.
- Três containers: `#app` (tela e scroll), `#modal` (folhas de lançamento/ajustes)
  e `#toast` (avisos flutuantes).
- Nenhum agregado é guardado: saldo, totais e resumos são derivados de `lancamentos`
  na hora de renderizar.
- **`render()` preserva o `scrollTop`** — só volta ao topo quando a navegação muda
  (`render(true)` em trocar dia/mês/visão).
- **`renderModal()` só remonta o `#modal` quando a "chave" muda** (`modalAtual`).
  Isso é essencial: remontar a folha no meio da digitação fecha o teclado do celular.
  Mudanças internas da folha (atalhos, dica de valor, botão salvar) são feitas com
  atualizações cirúrgicas no DOM, não com re-render.

## Modelo de dados (um lançamento)

```json
{
  "id": "169... -abc",        // timestamp + random
  "tipo": "entrada" | "saida",
  "valor": 25.0,               // number
  "descricao": "Lalamove",     // origem (entrada) ou categoria (saída)
  "data": "2026-08-29",        // YYYY-MM-DD
  "hora": "10:30"
}
```

Atalhos de origem (entrada): iFood, 99, Uber, Lalamove, Particular.
Atalhos de categoria (saída): Combustível, Comida, Manutenção, Outros.

### Formato do arquivo de backup

```json
{
  "app": "controle-entregas",
  "versao": 1,
  "exportado_em": "2026-09-02T13:00:00.000Z",
  "config": { "metaDiaria": 200 },
  "lancamentos": [ /* lançamentos, mesmo formato acima */ ]
}
```

O import também aceita um array puro de lançamentos. Ele **mescla** (nunca substitui):
descarta o que não bate com o formato (`normalizar()`), pula ids que já existem e
concatena o resto. Isso torna o import seguro tanto pra restaurar num aparelho novo
quanto pra juntar dois backups.

### Leitura do valor digitado (`parseValor`)

Aceita vírgula **ou** ponto como separador decimal. A regra: o último separador só
vale como decimal se sobrarem 1 ou 2 dígitos depois dele — assim `"1.234"` continua
sendo mil duzentos e trinta e quatro e `"25.50"` vira 25,50. A folha ainda mostra
`= R$ x` embaixo do campo pra confirmar como o app entendeu o número.

## Funcionalidades atuais

- Visão **Dia**: saldo do dia, total que entrou/saiu, barra da meta de ganho,
  lista de lançamentos, navegação entre dias, adicionar/**editar**/excluir.
- Visão **Mês**: saldo do mês, total entrou/saiu, dias trabalhados e média de saldo
  por dia, resumo **"De onde veio"** e **"Onde foi"** (% por origem/categoria),
  e a lista de cada dia (toca no dia para abrir o detalhe).
- **Editar lançamento**: toca no lançamento na lista; a folha abre preenchida e
  preserva `data` e `hora` originais.
- **Excluir com desfazer**: exclui na hora e mostra um aviso com "Desfazer" por 5s
  (em vez de um diálogo de confirmação, ruim no celular).
- **Ajustes** (engrenagem no topo): meta de ganho diário, exportar e importar backup.
- Se o `localStorage` falhar ao salvar (cota cheia, aba anônima do Safari), o app
  **avisa em vermelho** em vez de perder dados em silêncio.

## Sincronização (Supabase)

O objetivo era: **o usuário não faz nada, e nada se perde.** Como não havia acesso
ao aparelho dele pra digitar um login, a autenticação precisou ser automática.

- **Login anônimo.** No primeiro acesso o app chama `POST /auth/v1/signup` com
  corpo vazio; o Supabase cria uma conta só daquele aparelho e devolve uma sessão,
  que fica no `localStorage`. Ninguém vê tela de login. Exige
  *Authentication > Sign In / Providers > Anonymous sign-ins* ligado.
- **Consequência a não esquecer:** cada aparelho é uma conta diferente. O celular
  do pai e o do filho **não** compartilham dados. Pra ver os números de fora, use
  o painel do Supabase (há consultas prontas no fim do `supabase-schema.sql`).
  A tabela `dispositivos` diz qual `user_id` é qual aparelho.
- **Sem SDK.** Chamadas diretas na API REST com `fetch`, pra não quebrar a regra
  de "sem dependências e sem build".
- **Puxa antes de empurrar.** Assim, se o servidor tem versão mais nova de um
  lançamento, ela vence localmente antes que a versão velha suba por cima.
- **Desempate por `atualizado_em`** (último a escrever ganha). Empate mantém o local.
- **Exclusão é macia** (`excluido: true`). Se a linha sumisse do array, o próximo
  sync a traria de volta do servidor. Todas as telas leem via `ativos()`.
- **Fila offline.** Lançamento com `sincronizado: false` fica na fila e sobe no
  próximo gatilho. Falha de rede vira estado `offline`, não `erro` — ficar sem
  sinal na rua é o normal, não é defeito.
- **Gatilhos:** ao abrir, ao salvar/excluir, ao voltar pra tela
  (`visibilitychange`), ao voltar a internet (`online`) e a cada 5 min.
  Se algo é salvo *durante* uma sincronização, `syncPedido` faz rodar de novo.
- **Migração automática:** lançamentos antigos não tinham `atualizado_em`. O `load()`
  reconstrói o carimbo a partir do timestamp embutido no `id`, e marca tudo como
  pendente — é isso que faz o histórico antigo subir na primeira sincronização.
- **A chave publishable fica no código** (é assim em qualquer app Supabase). Quem
  protege os dados é o RLS. **Nunca** colocar senha ou service_role key aqui.
- Não há política de `DELETE` no banco, de propósito: nem um cliente adulterado
  consegue apagar histórico.

## Virada da meia-noite

`dataAtual` era definido uma única vez no load. Como o app é usado de madrugada,
quem deixasse ele aberto às 23h continuaria lançando no dia anterior depois da
meia-noite. `checarVirada()` reconfere o dia quando a tela volta e a cada minuto,
e só arrasta quem estava olhando "hoje" — quem foi ver um dia antigo fica lá.

## Estratégia de cache do service worker

- **HTML: rede primeiro**, cache como fallback offline. Sem isso, um deploy novo só
  chegaria no aparelho quando alguém lembrasse de bumpar a versão do cache.
- **Ícones e manifest: cache primeiro**, com atualização silenciosa em segundo plano.
- Bump `CACHE` (`entregas-v2`) ao trocar ícones/manifest. O HTML se resolve sozinho.

## Ideias de melhoria (backlog)

1. **Painel web pro filho** — hoje só dá pra ver os números pelo Supabase. Uma
   página que faça login de verdade e leia a conta do aparelho resolveria.
   Depende de vincular a conta anônima a um e-mail (`PUT /auth/v1/user`), o que
   exige acesso ao aparelho uma vez.
2. **Ganho por hora** — primeiro e último lançamento do dia dão a janela.
3. **Custo por km / combustível** — quanto do ganho o combustível comeu no mês.
4. **Filtro por origem no mês** — tocar numa origem e ver só aqueles lançamentos.
5. **Limpeza dos excluídos** — hoje eles ficam pra sempre. Só vira problema com
   muitos milhares de lançamentos.

## Como rodar/testar localmente

O service worker NÃO funciona abrindo o arquivo via `file://`. Suba um servidor local:

```bash
# na pasta do projeto
python -m http.server 8000
# abra http://localhost:8000 no navegador (use o DevTools em modo mobile)
```

Ao testar mudanças, force a atualização do service worker no DevTools
(Application > Service Workers > Update / Unregister), senão você pode ver a
versão antiga em cache.

## Deploy

Site estático hospedado no Vercel, conectado ao repositório no GitHub. Cada push
para o repo dispara um novo deploy automático. Não há etapa de build (Framework
Preset = "Other" no Vercel).
