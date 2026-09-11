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

Campos da Carteira do Lalamove (só em entrada da Lalamove): `credito` (true = pago
em crédito, fica na carteira do app) e `sacado_em` (`YYYY-MM-DD` do "Saquei", ou
null enquanto está na carteira).

### Não existe backup manual, de propósito

Já houve export/import de `.json` em Ajustes. Foi **removido**: o dono do projeto
não quer nenhuma tarefa manual para o usuário — quem garante que nada se perde é a
sincronização automática. Não reintroduzir sem pedido explícito.

### Leitura do valor digitado (`parseValor`)

Aceita vírgula **ou** ponto como separador decimal. A regra: o último separador só
vale como decimal se sobrarem 1 ou 2 dígitos depois dele — assim `"1.234"` continua
sendo mil duzentos e trinta e quatro e `"25.50"` vira 25,50. A folha ainda mostra
`= R$ x` embaixo do campo pra confirmar como o app entendeu o número.

## Funcionalidades atuais

- Visão **Dia**: saldo do dia, total que entrou/saiu, barra da meta (líquida),
  lista de lançamentos, navegação entre dias, adicionar/**editar**/excluir.
- Visão **Mês**: saldo do mês, total entrou/saiu, dias trabalhados e média de saldo
  por dia, resumo **"De onde veio"** e **"Onde foi"** (% por origem/categoria),
  e a lista de cada dia (toca no dia para abrir o detalhe).
- Visão **Semana** (segunda a domingo): saldo da semana, gráfico de gastos por dia
  com filtro por categoria, "De onde veio", "Onde foi" e a lista dos dias.
- **Gráfico de gastos** também no Mês, com uma barra por dia. Ver seção própria.
- **Carteira do Lalamove**: corrida em crédito conta no dia, e um card mostra o que
  ainda não foi sacado. Ver seção própria.
- **Editar lançamento**: toca no lançamento na lista; a folha abre preenchida e
  preserva `data` e `hora` originais.
- **Excluir com desfazer**: exclui na hora e mostra um aviso com "Desfazer" por 5s
  (em vez de um diálogo de confirmação, ruim no celular).
- **Ajustes** (engrenagem no topo): só a meta diária. Nada de backup, status de
  servidor, botão de sincronizar ou contadores — a sincronização é invisível.
- **A meta é sobre o LÍQUIDO** (entrou − saiu), não sobre o bruto. Ela responde
  "já posso parar hoje?", e quem gastou R$ 80 de gasolina precisa mesmo faturar
  R$ 80 a mais pra levar pra casa o mesmo tanto. Já foi sobre o bruto e estava
  errado. Não voltar atrás sem pedido explícito.
- **Não colocar contador de "N lançamentos" na tela.** Já teve um em Ajustes com
  o total de todos os dias, e foi lido como "os de hoje". Qualquer número na tela
  precisa deixar óbvio a que período se refere.
- Se o `localStorage` falhar ao salvar (cota cheia, aba anônima do Safari), o app
  **avisa em vermelho** em vez de perder dados em silêncio.

## Abas Semana e Mês: gráfico de gastos

- **A semana vai de segunda a domingo** (`inicioSemana`). O domingo fecha a conta.
- **Card "Gastos"**: total do período, atalhos por categoria (só aparecem quando o
  período tem 2+ categorias) e **uma barra por dia**. Tocar em qualquer ponto do
  gráfico seleciona o dia mais próximo, porque no mês as colunas têm ~9px, pequenas
  demais pra acertar uma a uma. A barra tocada fica vermelha e as outras cinza.
- **A barra mostra o que ele PAGOU naquele dia, não o que consumiu.** O dia de encher
  o tanque tem barra alta e os seguintes ficam zerados. Isso foi discutido: consumo
  real por dia exigiria km, e o dono descartou km. Semana e mês fecham certo.
- **"Média por dia trabalhado"** divide pelos dias com ganho, a mesma regra da média
  do card de saldo, pra que "por dia" signifique a mesma coisa na tela toda.
- **`categoriaGasto()`** junta texto livre com os atalhos ("gasolina" e "etanol" →
  Combustível, "almoço" → Comida, "troca de óleo" → Manutenção). O "Onde foi" usa a
  mesma função, então os dois cards sempre batem. Descrição que não casa com nada
  vira categoria própria ("Pedágio"). Cuidado ao ampliar a lista: "posto" ficou de
  fora porque casaria com "Imposto".
- **Regras do gráfico** (diretrizes de visualização): série única, uma cor, nenhuma
  legenda; barras de no máximo 24px, topo arredondado e 2px de folga; grade em fio;
  valor escrito só na barra mais alta, com contorno branco pra não brigar com a
  grade; a lista de dias embaixo é a "tabela" com todos os valores. O SVG é
  desenhado na largura exata do card (`larguraGrafico`) e redesenhado no `resize`.
- **Tocar na barra não chama `render()`.** `selecionarBarra()` só troca as cores e
  a leitura, pelo mesmo motivo do `modalAtual`: não reconstruir o DOM no meio do gesto.
- Barras de gasto (gráfico e "Onde foi") são vermelhas, como toda saída no app.

## Carteira do Lalamove

Na Lalamove a maioria das corridas é paga em crédito: o valor fica na carteira do
app, e ele saca no domingo ou de 15 em 15 dias. (A 99 cai na hora.)

- **O crédito conta como ganho no dia da corrida**, igual a qualquer entrada. O
  trabalho foi feito ali, e a meta, a semana e o mês precisam refletir isso. Contar
  só no saque foi discutido e descartado: a meta mandaria ele rodar à toa num dia de
  muita Lalamove, e o saque inflaria o domingo.
- **"Saquei" nunca cria entrada.** Só preenche `sacado_em` nas corridas que estão na
  carteira. O dinheiro já tinha sido contado, e lançar o saque de novo seria dupla
  contagem.
- Ao lançar Lalamove, a folha pergunta "Crédito" ou "Pix ou dinheiro". Crédito já
  vem marcado, porque é a maioria. O bloco fica sempre no HTML e só aparece ou some
  (`pintarForma`), pelo mesmo motivo do `modalAtual`.
- O card "Carteira do Lalamove" só aparece na tela de **hoje**, porque o saldo é de
  agora e não do dia olhado, e some quando zera. Crédito já sacado não muda mais de
  forma na edição.
- **Colunas `credito` e `sacado_em` no Supabase.** Qualquer campo novo no lançamento
  precisa da coluna criada ANTES do deploy: o upsert manda todos os campos, e uma
  coluna que não existe derruba a sincronização.
- A carteira começa vazia: corridas lançadas antes desta função não têm `credito`.
  Dá pra abrir uma e marcar "Crédito" na edição.
- Taxa de saque: aguardando o pai confirmar se existe. Se existir, "Saquei" passa a
  perguntar quanto caiu e lança a diferença como gasto "Taxa de saque".

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
- **Sem interface nenhuma.** Sem status, sem botão "sincronizar agora", sem ícone
  de alerta. O usuário não deve saber que existe servidor. Se falhar, tenta de novo
  sozinho; a coluna `visto_em` de `dispositivos` é o canal de monitoramento remoto.
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
   exige acesso ao aparelho uma vez. **Este é o único caminho de restauração para
   um aparelho novo** — hoje um celular novo vira uma conta nova e vazia; os dados
   antigos continuam no servidor, mas só acessíveis pelo painel do Supabase.
2. **Ganho por hora** — primeiro e último lançamento do dia dão a janela.
3. **Quanto o combustível comeu** — % do que entrou no período (sem km: km foi descartado).
4. **Filtro por origem no mês** — tocar numa origem e ver só aqueles lançamentos.
5. **Limpeza dos excluídos** — hoje eles ficam pra sempre. Só vira problema com
   muitos milhares de lançamentos.

## Decidido NÃO fazer

- **GPS / trajeto do dia.** Site (PWA) não recebe localização em segundo plano, e na
  rua quem fica na frente é o app do iFood: o trajeto sairia cheio de buracos. Só
  daria virando app de loja (Play Store/App Store). Decidido em 2026-09-10.
- **Km rodados e controle de revisão.** Descartados pelo dono em 2026-09-10.

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

Pra olhar o layout sem celular, o Chrome headless serve (`--screenshot`), com um
porém: ele tem largura mínima de janela (~500px) e desenha a página mais larga que
o pedido, cortando a direita da foto. Pra ver em 360/390px de verdade, coloque o app
num `<iframe>` com a largura exata dentro de uma janela maior. E desligue a
sincronização na cópia de teste (`SUPABASE_URL = ""`), senão cada foto cria uma
conta anônima no Supabase.

## Deploy

Site estático hospedado no Vercel, conectado ao repositório no GitHub. Cada push
para o repo dispara um novo deploy automático. Não há etapa de build (Framework
Preset = "Other" no Vercel).
