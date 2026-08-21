# Sessão de treino: player focado

**Data:** 2026-08-21
**Rota afetada:** `/app/aluno/treino/[assignmentId]`

## Problema

A sessão é hoje uma página de scroll: cabeçalho, nota da Sara, e depois todos os
blocos abertos ao mesmo tempo, cada exercício com uma linha por série e três
caixas por linha (reps, carga, RPE). Quem está a treinar tem de procurar onde
está, e o ecrã mostra sempre trabalho que já fez ou que ainda vem longe.

Uma sessão de treino é uma sequência, não um formulário. O ecrã deve mostrar
uma coisa: a série que está a acontecer agora.

## Forma

Um player em ecrã cheio que percorre a sessão série a série. Entre séries, um
ecrã de descanso. No fim, uma pergunta única sobre o esforço. Um CTA de lista
abre a sessão inteira em modal para quem quiser ver o mapa.

### Enquadramento

A rota sai da consola através de um route group: `src/app/app/(sessao)/aluno/treino/[assignmentId]/`.
Mesmo URL, sem `AlunoChrome`. A pasta `aluno/treino` deixa de existir, por isso
nenhum outro grupo resolve o mesmo path (a única condição que o Next 16 impõe).

O root do player leva `className="studio"` — é essa classe que ancora o tema
claro em `globals.css`; sem ela o player renderiza sempre escuro.

## Componentes

| Ficheiro | Responsabilidade |
|---|---|
| `lib/studio/session-queue.ts` | Puro. `WorkoutSnapshot` → passos ordenados. Sem React. |
| `session/useSessionLog.ts` | Registos + fila offline + wake lock. Extraído do `SessionLogger`. |
| `session/SessionPlayer.tsx` | Máquina de estados e orquestração. |
| `session/ExerciseStage.tsx` | Ecrã do exercício: média, título, alvo, inputs, Seguinte. |
| `session/RestScreen.tsx` | Contagem decrescente e o que vem a seguir. |
| `session/StepProgress.tsx` | Barra segmentada do topo. |
| `session/SessionListModal.tsx` | A lista da sessão. |
| `session/ExitSheet.tsx` | Parar, submeter, descartar. |
| `session/EffortDial.tsx` | Arco 1–10. |
| `session/SessionSummary.tsx` | Estado final. |

Substituídos e apagados: `SessionLogger.tsx`, `ItemLogger.tsx`, `SetRow.tsx`,
`RestTimer.tsx`.

## A fila

Um passo é uma série. A chave é `itemId:setIndex` — a mesma que `set_logs` já
usa, por isso o histórico e os valores anteriores alinham sem migração.

- **Bloco `normal`:** exercício a exercício, série a série. Descanso após cada
  passo = `item.restSeconds`.
- **Bloco `superset` / `circuit` / `interval`:** intercalado por ronda —
  A1·s1, A2·s1, descanso do bloco, A1·s2, A2·s2… O número de rondas é
  `block.rounds` quando > 1, senão o máximo de `item.sets`. Um item com menos
  séries do que rondas sai da fila nas rondas em excesso. Dentro da ronda o
  descanso é `item.restSeconds` (0 → passa direto ao próximo exercício); no fim
  da ronda é `block.restSeconds`.
- O último passo da sessão nunca tem descanso.

Cada passo carrega `round`, `setNumber`/`setCount` e `changesExercise` — é daí
que saem as duas transições distintas.

## O player

Topo, sempre: `✕`, barra segmentada, `Lista · 7/24`. Nada mais.

**Barra segmentada.** Um segmento por série, agrupados por exercício (folga
pequena entre exercícios, maior entre blocos). Cheio = registado, oco = saltado,
atual = contornado. É o que responde a "dá para perceber quando muda".

**Mudança de série** (mesmo exercício): título e média não se movem — ficam
montados. Só o contador de série e os campos trocam: cross-fade e 12px para
cima, 0.25s. Um segmento avança.

**Mudança de exercício**: o painel inteiro entra de 24px com stagger curto
(título → alvo → inputs), 0.4s `power2.out`. A média nova pré-carregou durante
o descanso.

Duas gramáticas de movimento diferentes, e é isso que torna a diferença legível
sem escrever "novo exercício" em lado nenhum. Tudo dentro de
`gsap.matchMedia("(prefers-reduced-motion: no-preference)")`, como o resto do
projeto.

**Inputs, por tracking:**

- `reps` → reps + carga. Placeholder = anterior; um chip `Anterior: 8 × 60kg`
  preenche ambos ao toque. Nunca pré-preenche sozinho: não se inventam números
  que ela não fez.
- `time` / `hold` → contador grande do alvo com `Começar`; ao acabar escreve os
  segundos. Editável à mão à mesma.
- `distance` → metros.

`Seguinte →` avança sempre, mesmo vazio. Série vazia = segmento oco, sem log.
`Anterior` discreto ao lado.

**Descanso.** Ecrã próprio, relógio ancorado num `deadline` absoluto — minimizar
o browser não desalinha. Mostra o que vem a seguir: série `n` do mesmo
exercício, ou o nome do próximo. `Saltar` e `+30s`. Vibração curta no fim onde
o dispositivo suporta. No fim avança sozinho.

**Modal da lista.** Blocos por ordem; cada linha com nome, séries × reps/tempo,
descanso e progresso. Toque salta para a primeira série por registar desse
exercício. A linha atual fica marcada.

## Sair, submeter, descartar

O `✕` está sempre disponível e abre uma folha:

```
Parar o treino?
Registaste 7 de 24 séries.

[ Submeter treino ]          → vai direto ao esforço, mesmo a meio
[ Sair e continuar depois ]  → nada muda; os registos ficam

Descartar registos · Não consegui treinar
```

- **Submeter** salta para o `EffortDial` com o que estiver registado. É o mesmo
  caminho do fim natural da sessão.
- **Sair e continuar depois** navega para `/app/aluno`. Estado intacto: os
  registos já estão gravados, `startedAt` mantém-se, a sessão fica `scheduled`.
- **Descartar registos** pede segunda confirmação na mesma folha e depois apaga
  todos os `set_logs` da sessão, repõe `started_at` a `NULL`, limpa o
  localStorage e sai. A sessão volta ao estado de nunca aberta.
- **Não consegui treinar** é o `skipSession` que já existe.

## Esforço

Arco SVG, 1 a 10. Fill via `stroke-dasharray` animado com GSAP, número com pop
curto. Arrasta-se no arco; há também dez marcas tocáveis e um
`<input type="range">` visualmente escondido a espelhar o valor — é o que dá
teclado e leitor de ecrã. Legenda por banda: Leve · Moderado · Forte · Máximo.
Confirmar = `Terminar treino`.

Guardar sem responder é possível: `Terminar sem responder` grava `effort = null`.

## Persistência

Coluna nova `effort INTEGER` em `assignments`, nullable, `CHECK (effort BETWEEN 1 AND 10)`.
Migração `ALTER TABLE ADD COLUMN` guardada por `PRAGMA table_info`, ao lado da
migração do `date` que já existe em `db.ts`.

Ações do servidor:

- `finishSession(assignmentId, effort: number | null)` — passa a receber o esforço.
- `discardSession(assignmentId)` — apaga os logs e repõe `started_at`.
- `logSet` / `unlogSet` / `beginSession` / `skipSession` mantêm-se.

`plan.ts` ganha `clearAssignmentLogs(assignmentId)` e `resetAssignment(assignmentId)`,
e `setAssignmentStatus` passa a aceitar o esforço.

Porque não se recolhem dados que ninguém vê: o esforço aparece como chip no
`AssignmentCard` da Sara e no resumo da sessão.

## RPE por série

As colunas ficam na base intactas — só o input sai do player. O histórico já
registado continua a ler-se. O esforço da sessão substitui-o como sinal que a
aluna dá à Sara.

## Não faz parte

- Editar registos de sessões já fechadas.
- Reordenar exercícios durante o treino.
- Guardar o passo atual no servidor: recomeça-se na primeira série por
  registar, que é a mesma coisa na prática e não precisa de estado novo.
