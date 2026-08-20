# Medidas + Evolução — área do aluno

**Data:** 2026-08-20
**Estado:** aprovado pelo utilizador

## Objetivo

Duas tabs novas na área do aluno (`/app/aluno`), ambas de auto-registo/auto-leitura
pelo próprio cliente — sem vista equivalente do lado da Sara (coach) nesta v1:

1. **Medidas** — registar peso e altura ao longo do tempo, com IMC calculado.
2. **Evolução** — gráficos de evolução por métrica (peso, reps de um exercício,
   tempo de corrida, e outras no futuro), já pensados para vir de dados reais
   mais tarde.

## Feature 1 — Medidas

**Rota:** `/app/aluno/medidas`. Novo item de nav (`nav.medidas`) entre "Check-in"
e "Mensagens".

**Dados:** reutiliza a tabela `measurements` já existente (`client_id, date, kind,
value`) — sem migração. O peso já lá é gravado como `kind="weight"` a partir do
check-in; passa a gravar-se também aqui. Adiciona-se `kind="height"` em paralelo.
Cada submissão grava as duas linhas com a mesma data (`dayKey()`, sempre "hoje" —
sem seletor de data manual, como o check-in).

**Formulário:** peso (kg) e altura (cm), ambos obrigatórios (ao contrário do
campo de peso opcional no check-in). Pré-preenchidos com o último valor
registado de cada um (`measurements(clientId, "weight", 1)` /
`measurements(clientId, "height", 1)`), para a pessoa só confirmar ou ajustar.

**Métricas calculadas:**
- IMC = peso ÷ altura²(m), com categoria OMS: `<18.5` abaixo do peso,
  `18.5–24.9` peso saudável, `25–29.9` excesso de peso, `≥30` obesidade.
- Variação de peso desde a marcação anterior (kg e %), omitida se só existir
  uma marcação.

**Histórico:** entradas de peso e altura são combinadas por data (a linha mais
recente de cada `kind` por dia, já que ambas se gravam no mesmo instante) numa
lista única, mais recente primeiro: data, peso, altura, IMC.

**Fora de âmbito:** taxa de gordura corporal (precisaria de sexo/idade no
perfil ou fita métrica — nenhum dos dois existe hoje); vista do lado da Sara;
nova tabela na base de dados.

## Feature 2 — Evolução

**Rota:** `/app/aluno/evolucao`. Novo item de nav (`nav.evolucao`) a seguir a
"Progresso", no fim da lista.

**Biblioteca:** [Recharts](https://recharts.org) — nova dependência (suporte
oficial a React 19, publicação ativa). `react-charts` (TanStack) foi
considerado e descartado: última versão é beta de novembro de 2023, peer
dependency só cobre React 16.

Estilizado com os tokens de marca já existentes em `theme.ts` /
`globals.css` (`--butter`, `--caramel`, `--cream`, `--ink-lift`) — sem o
visual default (azul/cinza) do Recharts.

**Estrutura — um card por métrica, tipo de gráfico ajustado a cada caso:**
1. **Peso** — line chart contínuo. Valor mais recente e variação em destaque
   (como o `WeightSparkline` do Progresso, mas com eixos, grid e tooltip).
2. **Reps de um exercício específico** — line chart com um seletor por cima
   para escolher o exercício.
3. **Tempo de corrida** — line chart, anotado como "menor é melhor" (aqui
   descer é progresso, ao contrário do peso/reps).

**Extensibilidade:** em vez de três componentes hardcoded, um registo de
métricas tipado:

```ts
type MetricSeries = {
  id: string;
  label: string;
  unit: string;
  direction: "higher-is-better" | "lower-is-better" | "neutral";
  points: { date: string; value: number }[];
};
```

e um componente `<MetricChart>` reutilizável (client component) que consome
qualquer `MetricSeries`. Adicionar uma 4ª métrica no futuro é acrescentar uma
entrada ao registo, não escrever outro gráfico.

**Mocks (v1 desta feature):** todos os dados desta tab — incluindo a lista de
exercícios do seletor — vêm de um módulo isolado,
`src/lib/studio/analyticsMock.ts`, com séries plausíveis (peso a descer aos
poucos, reps a subir, tempo de corrida a descer). A página (server component)
importa deste módulo tal como importaria uma função de dados reais; é esse
módulo que se substitui quando a Sara quiser ligar a dados reais — o resto
(página, `<MetricChart>`) não muda. O peso é o candidato óbvio a ligar
primeiro, porque a Feature 1 já vai estar a gravá-lo de verdade em
`measurements`.

**Fora de âmbito:** ligação a dados reais (fica para depois, explicitamente
pedido pelo utilizador).

## Adenda — vista do lado da Sara

A v1 excluía propositadamente uma vista para a coach. Depois de implementada
a v1, o utilizador pediu para a Sara também ver esta informação por cliente —
revertendo essa exclusão.

**Rota:** novo separador "Medidas" em `/app/coach/alunos/[clientId]/medidas`,
a seguir a "Check-ins" na tab strip já existente do cliente
(`ClientTabs`/`layout.tsx`).

**Conteúdo:** só leitura, sem formulário (a Sara não é quem se pesa) —
o mesmo IMC/histórico real (via `BodyMetricsPanel`, extraído da página do
aluno para ser partilhável) e os mesmos três gráficos de Evolução (via
`EvolutionCharts`, extraído de igual forma) — ainda todos mock, como no resto
desta feature.

**Detalhe corrigido (revertido na 2ª adenda):** o estado vazio do histórico
tinha uma dica ("Regista o peso e a altura acima") que só fazia sentido na
página do aluno. `BodyMetricsPanel` chegou a ganhar uma prop `readOnly` para
isso — removida a seguir, ver adenda seguinte.

## 2ª adenda — um gráfico só, com filtros (era três cartões fixos)

O utilizador pediu, com um print anotado, para simplificar drasticamente a
tab da coach: tirar o cartão de IMC/histórico e os três gráficos fixos
(Peso, Reps por exercício, Tempo de corrida), e ficar só com **um** gráfico
com filtros — métrica (Peso/Exercício), dentro de Exercício uma sub-métrica
(Reps/Esforço), e tipo de gráfico (Linha/Barras). A tab em si passa a
chamar-se "Progresso" (era "Medidas"), rota `.../[clientId]/progresso`
(era `.../medidas`).

Ao decidir o âmbito, apliquei a mesma simplificação à página do próprio
aluno (`/app/aluno/evolucao`) — antes três cartões fixos, agora o mesmo
gráfico único filtrável — para não manter duas UIs diferentes para os
mesmos dados. Só a tab da coach tinha sido mostrada/anotada; esta extensão
à página do aluno foi decisão minha, não pedido explícito.

**Consequência boa:** ao remover o cartão de IMC/histórico da coach, a
única métrica com dados reais (peso) deixava de ter onde viver — por isso
o filtro "Peso" passou a ler `measurements(clientId, "weight")` a sério via
`seriesFromMeasurements()` (novo helper em `analytics.ts`), em vez do mock.
Altura/IMC deixaram de ter vista dedicada nesta tab (ficam só na Medidas do
aluno). Reps e Esforço por exercício continuam mock — Esforço (RPE 1-10) é
novo, `common.rpe` já existia para a unidade.

**Removido nesta adenda:** `BodyMetricsPanel.readOnly` (só tinha um
consumidor, que desapareceu); `EvolutionCharts.tsx` e
`ExerciseMetricCard.tsx` (substituídos por `ProgressChart.tsx`);
`evolucao.runningMetric`/`lowerIsBetter` (tempo de corrida saiu do âmbito);
`clients.tab.medidas` → renomeada para `clients.tab.progresso`;
`medidas.coachEmptyHint` (o `readOnly` que a usava desapareceu).

## Notas de implementação

- App Router padrão já usado no resto do projeto: página server component
  (`async function Page()`), sem `"use cache"` em lado nenhum do código
  existente — não introduzir aqui também. `<MetricChart>` precisa de
  `"use client"` (Recharts é interativo/SVG no browser); o seletor de
  exercício também.
- i18n: novas chaves em `messages/pt.json` e `messages/en.json` —
  `Studio.nav.medidas`, `Studio.nav.evolucao`, `Studio.medidas.*`,
  `Studio.evolucao.*`.
- `bun add recharts`.
