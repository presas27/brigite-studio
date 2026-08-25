# Brigite's Studio — App de Alunos

Pesquisa sobre o **ABC Trainerize** ("Fitness App"), inventário de features, e plano
para construir a alternativa própria da Sara dentro deste projeto.

Data da pesquisa: 2026-08-10. Fontes primárias: `help.trainerize.com` (índice de
categorias e artigos), `trainerize.com/features`, App Store / Google Play, Capterra,
Trustpilot, docs oficiais de Apple, Convex e Supabase. Onde não há fonte direta,
está marcado `[INFERÊNCIA]`.

---

## 1. Decisão recomendada (lê isto primeiro)

**Não clonar o Trainerize.** O Trainerize é um SaaS horizontal com ~600 mil treinadores
e literalmente centenas de features (nutrição, macros, wearables, comunidade, desafios,
marketplace, multi-treinador, integrações com ginásios). A Sara usa — e precisa — de
talvez 15% disso.

**Construir o "Studio App": uma app pequena, em português, desenhada à volta do método
concreto da Sara** (força, mobilidade, acrobacia aérea, equilibrismo), com uma feature
central que o Trainerize *não* tem bem: **vídeo-feedback anotado**.

### Aviso honesto sobre a economia

O argumento "poupar o custo por aluno" **não paga o desenvolvimento**:

| | Trainerize (25 alunos) | Studio App (25 alunos) |
|---|---|---|
| Custo mensal | ~€100–130/mês | ~€45–70/mês (infra) |
| Custo anual | ~€1.200–1.500 | ~€550–850 |
| Poupança anual | — | **~€500–700** |
| Custo de construção | €0 | €5.000–9.000 equivalentes (120–200h) |
| Break-even só com poupança | — | **8 a 14 anos** |

Ou seja: se o objetivo for *só* poupar dinheiro, **fica no Trainerize**. Isto só faz
sentido por uma de três razões:

1. **Diferenciação** — a app é parte da marca Brigite's Studio; o aluno entra na *app da
   Sara*, não numa app genérica canadiana com o logo dela colado.
2. **Encaixe no nicho** — a biblioteca do Trainerize é 100% ginásio. Aéreo, equilibrismo,
   mão-a-mão e mobilidade avançada não existem lá. A Sara filma tudo à mão de qualquer
   maneira.
3. **Produto revendável** — este é o argumento forte. Se for construído *multi-tenant*
   desde o dia 1, a Sara é o cliente zero e o mesmo código serve outros PTs portugueses
   a €25–35/mês fixos. Aí a matemática inverte-se completamente e o custo de construção
   é um investimento em produto, não uma despesa da Sara.

**Recomendação:** construir multi-tenant desde o início (custa ~10% mais de esforço no
schema, poupa uma reescrita), lançar com a Sara, e decidir a comercialização depois.

---

## 2. O que é o ABC Trainerize

- Plataforma SaaS de coaching de fitness, canadiana, hoje propriedade da **ABC Fitness
  Solutions**. A app que os alunos instalam chama-se literalmente **"Fitness App"**
  (App Store id `516851502`) — é o modo white-label barato: a app é da Trainerize, o
  treinador aparece lá dentro.
- Arquitetura: **dashboard web** (onde o treinador faz tudo o que é construção e
  administração) + **apps nativas iOS/Android** (otimizadas para o aluno; o treinador tem
  um subconjunto). Existe app de **Apple Watch**.
  Fonte: [Feature Access: Web vs. Mobile App](https://help.trainerize.com/hc/en-us/articles/28912597414292-ABC-Trainerize-Feature-Access-Web-Account-vs-Mobile-App)

### 2.1 Modelo de preço (a razão de estarmos aqui)

Tiers públicos (2026), cobrados **por número de alunos ativos**:

| Plano | Alunos | Preço |
|---|---|---|
| Basic | 1 | grátis |
| Grow | 2 | $10/mês |
| Pro | 5 → 50 | $25/mês → $135/mês |
| Studio Plus | 500 | $275/mês |

Add-ons que quase toda a gente acaba por precisar:

| Add-on | Custo |
|---|---|
| Advanced Nutrition | ~$20–45/mês conforme o tier |
| Stripe Integrated Payments | $10/mês (Grow e Pro) |
| Custom Branded App | $169 uma vez + $99/ano de Apple Developer |
| Business add-on (booking, prospects, video coaching) | pago à parte |

Custo real reportado para um treinador médio: **~$115–200/mês**.
Faturação anual poupa 10%.

> **Ação:** o número verdadeiro está na fatura da Sara. Antes de qualquer decisão, pedir
> o print do ecrã de billing dela — a página de preços é renderizada em JS e os tiers
> intermédios não são públicos.

Fontes: [trainerize.com/pricing](https://www.trainerize.com/pricing/),
[coachway.io/articles/trainerize-pricing](https://coachway.io/articles/trainerize-pricing/),
[pt-suite.com — the add-on trap](https://www.pt-suite.com/blog/trainerize-add-on-trap-real-cost-2026)

---

## 3. Inventário de features do Trainerize

Legenda: **Onde** = coach web (CW) / coach mobile (CM) / client mobile (CL) ·
**Sara** = must / should / nice / **não** (fora do âmbito dela) ·
**Dif.** = dificuldade de replicar (baixa / média / alta)

### 3.1 Onboarding

| Feature | O que faz | Onde | Sara | Dif. |
|---|---|---|---|---|
| Client Consultation Form | Questionário inicial (objetivos, histórico, lesões) preenchido pelo aluno | CW+CL | **must** | baixa |
| Vários modos de adicionar aluno | Convite por email, link de auto-registo, importação, compra de produto | CW/CM | must | baixa |
| Client types (Active / Basic / Offline) | Só os *Active* contam para a fatura; *Basic* são ilimitados mas sem features; *Offline* para presenciais | CW/CM | should | baixa |
| Client permissions por tipo | Que módulos o aluno vê | CW | should | baixa |
| Waivers / Terms of Service em produtos recorrentes | Aceitação de termos no checkout | CW | should | baixa |

### 3.2 Training (o núcleo)

| Feature | O que faz | Onde | Sara | Dif. |
|---|---|---|---|---|
| Exercise library (~2.400 vídeos) | Catálogo com demonstrações em vídeo | CW/CL | should* | alta |
| Custom exercises | Exercícios próprios, vídeo do YouTube ou upload | CW/CM* | **must** | baixa |
| Exercise tags | Organização/filtragem da biblioteca | CW | must | baixa |
| Exercise notes | Notas técnicas por exercício dentro do treino | CW/CL | **must** | baixa |
| Exercise substitution durante o treino | O aluno troca por alternativa a meio da sessão | CL | nice | média |
| Tipos de treino | Standard, superset, circuit, interval, metabolic conditioning (AMRAP/EMOM) | CW | must | média |
| Tempo, RPE, rest, drop sets, %1RM | Prescrição detalhada | CW/CL | must | média |
| Tracking types | reps / peso / tempo / distância | CW/CL | must | baixa |
| Auto-fill exercise stats | Pré-preenche com a última sessão | CL | **must** | baixa |
| AI Workout Builder | Gera rascunho de treino a partir de objetivos/equipamento | CW | não | alta |
| Master Workouts (~70 pré-feitos) | Biblioteca reutilizável de treinos | CW | **must** | baixa |
| Master Programs (~60 pré-feitos) | Programas multi-semana reutilizáveis | CW | **must** | média |
| Phased Programs | Programa dividido em fases/blocos com progressão | CW | should | média |
| On-Demand Programs | Programa sem datas, o aluno faz ao ritmo dele | CW | should | baixa |
| Program tags | Organização da biblioteca de programas | CW | nice | baixa |
| Multiple Programming | Vários programas ativos e como empilham no calendário | CW | nice | alta |
| Subscribe vs Copy a program | Subscrever mantém sincronizado com o master; copiar desliga | CW | should | média |
| Progressions Editor | Editar progressão de cargas ao longo das semanas | CW | should | média |
| Calendário do aluno | Agendamento de treinos e cardio, repetições, backdate, pause, mass delete | CW/CM | **must** | média |
| On-Demand Video Workouts | Aulas em vídeo (com closed captions) | CW/CL | nice | alta |
| Bulk assign / mass actions | Atribuir programa/hábito/grupo a N alunos de uma vez | CW | should | baixa |

\* A biblioteca de 2.400 vídeos é a feature mais cara de replicar — ver §6.3.

### 3.3 Nutrition — **fora do âmbito da Sara**

Macro/calorie tracking in-app, Smart Meal Planner (gera plano + lista de compras),
Flexible Meal Planner, TDEE/BMR calculator, biblioteca de alimentos e receitas, custom
meals/foods, meal photos, water tracker, nutrition compliance targets, sincronização
bidirecional com MyFitnessPal e Fitbit, integração Evolution Nutrition.

Os três planos da Sara (`Treino 1:1`, `Treino Online`, `Acrobacia/mobilidade`) não
mencionam nutrição. **Não construir.** No máximo, um campo de texto livre com
recomendações e link para o MyFitnessPal.

### 3.4 Tracking & Progress

| Feature | O que faz | Onde | Sara | Dif. |
|---|---|---|---|---|
| Body stats / measurements | Peso, medidas, % gordura; agendáveis como atividade diária | CW/CL | should | baixa |
| Progress photos | Frente/lado/costas com comparação lado-a-lado | CL | nice⚠ | média |
| Personal Records | PRs automáticos por exercício | CL | should | baixa |
| Goals (health/fitness/nutrition) | Objetivos com data-alvo e progresso | CW/CL | should | baixa |
| Habits + Master Habits | Hábitos prescritos, streaks, milestones, badges | CW/CL | should | baixa |
| Client Insights Dashboard | Visão de compliance por aluno | CW | **must** | média |
| Configurable dashboard tiles | Escolher que métricas aparecem | CW | nice | média |
| Threshold Alerts | Alerta quando o aluno cai abaixo de X% de compliance | CW | **must** | baixa |
| Company-wide compliance overview | Compliance agregado de todos os alunos | CW | should | baixa |
| Check-in forms | Formulário periódico partilhado com o aluno | CW/CL | **must** | baixa |

⚠ Fotos de progresso são dados de saúde de categoria especial (RGPD art. 9) — ver §8.

### 3.5 Engagement & Comms

| Feature | O que faz | Onde | Sara | Dif. |
|---|---|---|---|---|
| 1:1 in-app messaging | Chat treinador↔aluno | todos | **must** | média |
| Voice messages | Mensagens de voz | todos | should | baixa |
| Photo / PDF em mensagens | Anexos | todos | must | baixa |
| Video messages (até 3 min) | Vídeo curto no chat | CM/CL | **must** | média |
| Group messages | Chat de grupo treinador+alunos | todos | nice | média |
| Groups / comunidade | Feed privado, conteúdo educativo, WOD partilhado | todos | não | alta |
| Challenges + leaderboards | Desafios com classificação (até ~1000 membros) | CW | não | alta |
| Announcements (banners + push) | Aviso global a todos os alunos | CW | should | baixa |
| Auto-messages | Mensagens pré-agendadas com campos de personalização | CW | **must** | média |
| Push notifications | Notificações nativas | CL | must⚠ | ver §7 |

### 3.6 Automation

| Feature | O que faz | Sara | Dif. |
|---|---|---|---|
| Product Automation | Compra de produto → cria conta, atribui programa, envia mensagem | should | média |
| Membership Control | Desativa automaticamente alunos com pagamento falhado/produto expirado | should | baixa |
| Auto-messages agendadas | Sequência de boas-vindas, lembretes, check-ins | **must** | média |
| Zapier (triggers + actions) | Ligação a qualquer outra ferramenta | nice | baixa |
| API + Webhooks | Integração programática | n/a (é nossa) | — |

### 3.7 Business & Payments

| Feature | O que faz | Sara | Dif. |
|---|---|---|---|
| Products (main + add-ons + bundles) | Catálogo de serviços vendáveis | should | média |
| Recurring billing (Stripe) | Subscrições, SCA/3DS, retries | should | média |
| Manual sale / invoice | Venda registada à mão | should | baixa |
| Discount codes, free trials, trial products | Promoções | nice | baixa |
| Session packs + tracking de créditos | Packs de sessões presenciais e consumo | **must** | baixa |
| Appointments + availability + booking link | Agenda, disponibilidade, link público de marcação, prospects | **must** | média |
| Video calls (1:1 e turmas virtuais) | Sessões por vídeo dentro da plataforma | should | alta |
| Trainerize.me storefront | Página pública de perfil e venda | já existe (o site!) | — |
| Refunds, transactions, export para IRS | Gestão financeira | should | baixa |

### 3.8 Analytics

Client Insights Dashboard, compliance tiles configuráveis, threshold alerts,
overview de compliance da empresa, Business Dashboard (early access), relatórios de
vendas e de performance por treinador.

### 3.9 Integrations

| Integração | O que sincroniza | Sara |
|---|---|---|
| Apple Health / Apple Watch | Passos, sono, HR, peso, treinos, cardio (bidirecional) | nice⚠ |
| Google Health Connect | Idem, Android | nice⚠ |
| Fitbit | Cardio (unidirecional) + nutrição | não |
| Garmin | Cardio | não |
| Withings | Peso/composição corporal | não |
| MyFitnessPal | Diário alimentar bidirecional (com atrasos conhecidos) | não |
| Mindbody / Glofox / ABC / DataTrak | Sistemas de ginásio | não |
| Les Mills | Conteúdo licenciado | não |
| YouTube (batch import) | Importar vídeos de exercícios | **must** |
| Zapier | Automação genérica | nice |

⚠ Wearables exigem app nativa — ver §7.

### 3.10 Branding & White-label

- Custom branding (logo, cores) no plano base.
- **Custom Branded App**: app própria nas lojas, $169 uma vez + $99/ano Apple.
- `trainerize.me` — perfil público do treinador com venda de produtos.

### 3.11 Admin & Platform

Team members com permissões, atribuir aluno a vários treinadores, transferência de
propriedade da conta, transferência de programas entre contas, export de transações,
notification preferences, status page pública.

---

## 4. O que corre mal no Trainerize (as nossas oportunidades)

Sintetizado de Capterra (~693 reviews), Trustpilot (~88, 3.5/5), Google Play, App Store
e Reddit. Ordenado por frequência.

**Queixas do treinador:**

1. **Curva de aprendizagem** — 4 a 8 horas para dominar a plataforma; excesso de features.
2. **App móvel do treinador é fraca** — responder a um check-in ou atribuir um programa
   exige muito mais toques do que na web. Android descrito como "terrível".
3. **Sincronização com MyFitnessPal falha** de forma persistente.
4. **Preço opaco** — base + por-aluno + add-ons obrigatórios.
5. **Suporte** — "impossível falar com uma pessoa"; erros de faturação arrastados.

**Queixas do aluno:**

1. Crashes (notoriamente em iPad ao introduzir peso).
2. Lentidão e loading.
3. Atrasos de sincronização de wearables (minutos a horas) e do MyFitnessPal.
4. **Não há logging offline verdadeiro** — perde-se trabalho num ginásio/estúdio sem rede.
5. Notificações push falham em Samsung (deep sleep do Android).
6. Qualidade do módulo de nutrição (receitas aleatórias, plano demora dias a ajustar).
7. Bateria do Apple Watch.

**Traduzido em requisitos para nós:** *poucas features, cada uma sólida*; consola da
treinadora com **um ecrã** onde vê o que precisa de atenção; **logging offline a sério**;
**tudo em português**; e a app nunca perde dados do aluno.

---

## 5. O que a Sara realmente precisa

Derivado do conteúdo do próprio site (`messages/pt.json`, `src/lib/plans.ts`):

- **Treino 1:1 presencial** → precisa de: packs de sessões, agenda, notas de sessão,
  progressão registada.
- **Treino Online** → "plano semanal adaptado", "**vídeos e feedback técnico**",
  "check-ins regulares", "ajustes sempre que precisares".
- **Acrobacia aérea / equilibrismo / mobilidade** → biblioteca de exercícios *dela*,
  progressões longas (uma parada de mãos leva meses), vídeo é obrigatório.

O FAQ dela diz literalmente: *"Recebes um plano semanal, **gravas os exercícios quando
precisas de feedback** e fazemos check-ins regulares para ajustar."*

> **Isto é a app inteira.** Plano → execução → vídeo → feedback → check-in → ajuste.
> Tudo o resto é acessório.

---

## 6. Recorte: o que construir

### 6.1 MVP (obrigatório)

1. **Autenticação** — magic link por email (Resend já está montado). Sem passwords.
2. **Gestão de alunos** — convite, perfil, questionário inicial, notas privadas, arquivo.
3. **Biblioteca de exercícios própria** — nome, cues técnicos, tags
   (força/mobilidade/aéreo/equilíbrio/…), vídeo (upload direto do telemóvel ou YouTube),
   progressões/regressões ligadas entre si.
4. **Construtor de treinos** — blocos (normal, superset, circuito, intervalo), séries,
   reps ou tempo, tempo de execução, descanso, RPE, notas por exercício.
5. **Programas e calendário** — programa multi-semana, atribuição a aluno, arrastar no
   calendário, duplicar semana, pausar, adiar.
6. **Execução do treino (aluno)** — ecrã "Hoje", vídeo demo inline, registo de séries com
   **auto-fill da última sessão**, cronómetro de descanso, wake-lock do ecrã,
   **funciona offline** e sincroniza depois.
7. **Vídeo-feedback anotado** ← *a feature diferenciadora*. O aluno grava, faz upload;
   a Sara vê e deixa **comentários com timestamp** sobre a timeline, mais um veredito
   (ok / ajustar / regredir). O Trainerize só tem vídeo-mensagem de 3 minutos sem
   anotação.
8. **Mensagens 1:1** — texto, foto, áudio, vídeo curto.
9. **Check-in semanal** — formulário configurável + peso/medidas opcionais + resposta da
   Sara.
10. **Consola "Hoje" da Sara** — uma única lista: quem não treinou, quem submeteu vídeo,
    quem não respondeu ao check-in, quem tem mensagem por ler. Zero navegação.
11. **PT/EN** — reutiliza o `next-intl` que já existe.

### 6.2 Fase 2

Medições + gráficos · PRs automáticos · hábitos com streaks · packs de sessões
presenciais e consumo de créditos · agenda e link público de marcação · lembretes
automáticos por email · exportação de dados do aluno (RGPD) · templates de programa
partilháveis.

### 6.3 Fase 3

Pagamentos (Stripe: cartão + **MB Way** + SEPA Direct Debit) · faturação certificada AT
(via API de InvoiceXpress / Vendus / Moloni — em Portugal a fatura **tem** de sair de
software certificado, com SAF-T e ATCUD) · auto-signup a partir do site · produtos e
subscrições.

### 6.4 Fase 4 (só se se justificar)

Shell nativo (Capacitor ou Expo) para desbloquear **push nativo** + **HealthKit /
Health Connect**. Não começar por aqui.

### 6.5 Nunca construir

Base de dados de alimentos · meal planner · tracking de macros · comunidade/feed ·
desafios com leaderboard · multi-treinador com permissões · marketplace de programas ·
integrações com sistemas de ginásio · AI workout builder.

E sobre a **biblioteca de 2.400 vídeos**: não a tentar igualar. Alternativas:

| Fonte | Nº | Licença | Média |
|---|---|---|---|
| Free Exercise DB | ~800 | domínio público | imagens |
| wger | ~3.000+ | CC-BY-SA | imagens, algumas |
| MuscleWiki | — | **só streaming, não redistribuível** | vídeo |

Plano: semear com o Free Exercise DB (domínio público, sem atribuição) para o básico de
ginásio, e a Sara filma o que interessa mesmo — aéreo, equilibrismo, mobilidade — que
*nenhuma* biblioteca tem. A biblioteca própria dela passa a ser um ativo, não um custo.

---

## 7. Restrições técnicas duras

Estas decidem a arquitetura. Não são opinião.

### 7.1 Dados de saúde de wearables — **impossível sem app nativa**

- **Apple HealthKit não tem API web.** Não existe forma de ler dados do Apple Health a
  partir de um servidor ou de uma página. É preciso uma app iOS nativa com entitlement.
- **Google Health Connect** — idem, SDK Android nativo.
- Agregadores (Terra, Rook, Spike, Vital) resolvem o problema *mas continuam a precisar
  do SDK nativo* para as fontes Apple/Google; só as fontes com OAuth próprio (Fitbit,
  Garmin, Withings, Strava) funcionam server-to-server.

**Conclusão:** wearables ficam fora do MVP. Se algum dia forem críticos → Fase 4.

### 7.2 Push notifications em iOS na UE — **estado contestado**

As fontes divergem e o assunto está poluído por artigos de fevereiro de 2024:

- Apple anunciou que ia remover home-screen web apps na UE (iOS 17.4 beta) e **reverteu
  em março de 2024**, mantendo-as em WebKit como antes.
  ([9to5Mac](https://9to5mac.com/2024/03/01/apple-home-screen-web-apps-ios-17-eu/),
  [TechCrunch](https://techcrunch.com/2024/03/01/apple-reverses-decision-about-blocking-web-apps-on-iphones-in-the-eu/))
- Vários artigos de 2026 continuam a afirmar que na UE as PWAs abrem em separador do
  Safari e não têm push. `[INFERÊNCIA]` — é muito provável que sejam conteúdo reciclado
  do período pré-reversão, mas **não confirmámos numa fonte primária da Apple**.

**Decisão de engenharia:** não apostar a arquitetura nisto. **Fase 1 não depende de push.**
Notificações por **email** (Resend, já integrado) + o hábito português real: **WhatsApp**.
Antes da Fase 1 fechar, testar push num iPhone português a sério — leva 20 minutos e
resolve a dúvida de vez.

### 7.3 O que uma PWA não faz bem num estúdio

Wake lock ✅ (Screen Wake Lock API), offline ✅ (service worker + IndexedDB),
áudio de cronómetro ⚠️ (precisa de interação do utilizador primeiro), timers em
background ❌, haptics ❌ em iOS, push ❓ (ver acima).

Mitigação: o cronómetro corre no ecrã aceso com wake lock; o log é local-first.

---

## 8. RGPD e obrigações em Portugal

- Dados de treino, medidas corporais, questionários de saúde e **fotos de progresso** são
  **dados de categoria especial** (RGPD art. 9). Exigem **consentimento explícito**,
  separado dos termos gerais, e revogável.
- **Não há obrigação legal de manter os dados na UE**, mas manter simplifica
  radicalmente a defesa (Schrems II, CLOUD Act). Escolher região UE em tudo.
- É preciso: registo de atividades de tratamento, DPA assinado com cada subprocessador
  (Vercel, Convex/Supabase, Resend, Stripe), política de retenção, e mecanismo de
  **exportação e apagamento** dos dados do aluno dentro da app.
- **Fotos de progresso**: recomendação — deixar de fora do MVP. É a maior exposição
  legal com o menor valor para o nicho da Sara (para mobilidade e aéreo, **vídeo de
  execução** vale muito mais que fotos de frente/lado/costas). Se entrarem depois:
  storage UE, URLs assinados de curta duração, apagamento automático, opt-in explícito.
- **Faturação**: em Portugal a fatura tem de ser emitida por software certificado pela
  AT (SAF-T, ATCUD, QR code). **Não emitir faturas nós** — integrar InvoiceXpress,
  Vendus ou Moloni via API na Fase 3.
- **Pagamentos**: MB Way é ~42% do e-commerce português. Stripe suporta MB Way,
  Multibanco e SEPA Direct Debit — chega.

---

## 9. Arquitetura proposta

### 9.1 Onde vive

**Neste repositório.** O site de marketing fica em `/`; a app entra num route group
`src/app/(studio)/` servido em `app.brigitestudio.com` (ou `/area`), com layout próprio,
autenticado. Reutiliza `next-intl`, o design system, os componentes de motion, o Resend
e o deploy Vercel que já existem. Zero infraestrutura nova de frontend.

### 9.2 Stack

| Camada | Escolha | Porquê |
|---|---|---|
| Frontend | Next.js 16 + React 19 (já cá está) | reutiliza tudo |
| Backend | **Convex, região EU West (Irlanda)** | TypeScript ponta-a-ponta, queries reativas (chat e logging ao vivo sem WebSockets à mão), file storage com URLs assinados, cron jobs para lembretes, sem migrações SQL. Residência UE confirmada. |
| Auth | Convex Auth + magic link via Resend | menos subprocessadores, PII fica na UE |
| Vídeo/imagens | Convex file storage no MVP | limite de 60s e compressão no cliente; migrar para Mux/Cloudflare Stream só se o volume justificar |
| Email | Resend (já integrado) | — |
| Pagamentos | Stripe (Fase 3) | MB Way + Multibanco + SEPA |
| Faturação | InvoiceXpress/Vendus/Moloni via API (Fase 3) | obrigação legal AT |
| App nativa | Capacitor ou Expo (Fase 4, só se preciso) | push + HealthKit |

Alternativa a Convex: **Supabase** em `eu-central-1` (Frankfurt) ou `eu-west-1` (Irlanda),
com Postgres + RLS + Storage + Realtime. É a escolha certa se quiseres SQL e RLS
explícitas; é mais trabalho de plumbing para o mesmo resultado a esta escala.

### 9.3 Esboço do modelo de dados

```
tenants            id, nome, branding                    ← multi-tenant desde o dia 1
users              tenantId, role: coach|client, email, locale
clientProfiles     userId, objetivos, lesões, notasPrivadas, estado, tags[]
exercises          tenantId, nome, cues, videoId, tags[], progressaoDe, regressaoDe
workouts           tenantId, nome, blocos[]              ← template reutilizável
  blocks             tipo: normal|superset|circuito|intervalo, itens[]
  items              exerciseId, séries, reps|tempo, tempo, descanso, rpeAlvo, notas
programs           tenantId, nome, semanas[] → dias[] → workoutId
assignments        clientId, programId, dataInício, estado
sessions           clientId, data, snapshot do workout, estado
setLogs            sessionId, exerciseId, índiceSérie, reps, carga, tempo, rpe, notas
submissions        clientId, sessionId?, exerciseId, videoId, estado
reviews            submissionId, comentários[{tMs, texto}], veredito
checkins           clientId, semana, respostas, resposta da coach
measurements       clientId, data, tipo, valor
messages           threadId, autorId, corpo, anexos[]
sessionPacks       clientId, totalSessões, usadas          ← 1:1 presencial
```

O `snapshot do workout` em `sessions` é deliberado: quando a Sara edita um template, as
sessões já feitas **não** mudam retroativamente. É o erro clássico neste tipo de app.

### 9.4 Regras não negociáveis

- **Local-first no logging.** O registo de séries escreve em IndexedDB primeiro e
  sincroniza. Nunca perder um treino por falta de rede.
- **Snapshot, não referência**, em tudo o que é histórico.
- **Multi-tenant desde a primeira migração.** `tenantId` em todas as tabelas.
- **Sem per-seat pricing interno.** Adicionar um aluno tem de ser gratuito e instantâneo.

---

## 10. Migração do Trainerize

**Confirmado** (help centre, 2026-08): não é possível exportar nem transferir treinos ou
programas, a biblioteca de exercícios não sai, e o único CSV oficial é a lista de
clientes (nomes e contactos). Treinos só em PDF, via `Print`.
Fonte: [What Information Can Be Exported from ABC Trainerize?](https://help.trainerize.com/hc/en-us/articles/31089834946324-What-Information-Can-Be-Exported-from-ABC-Trainerize)

Plano prudente:

1. Antes de cancelar, extrair manualmente: lista de alunos + contactos, programas e
   treinos-mestre (screenshot/PDF), medidas atuais de cada aluno.
2. Data de corte única. Histórico antigo **fica** no Trainerize em modo leitura durante
   1–2 meses (downgrade para o tier mais barato, não cancelar já).
3. Recomeçar o histórico na app nova. Para treino, 2 meses de histórico perdido não é
   drama; para a relação com o aluno, uma migração falhada é.

### 10.1 Biblioteca de exercícios — já resolvido

Não havendo export, a biblioteca sai pela própria app, e entra por um caminho único:

```
bun run trainerize:export                    ← abre o Chrome num perfil próprio, login à mão
scripts/trainerize/export/library.json       ← o que foi capturado (fora do git)
bun run trainerize:import                    ← lê por nome de campo, não por posição
src/lib/studio/library-trainerize.ts         ← artefacto gerado, versionado
```

O extractor não adivinha a API do Trainerize: **observa-a**. Fica à escuta de todas as
respostas JSON da página da biblioteca, guarda as que trazem registos com cara de
exercício, e depois **repete o pedido mais rico com o número de paginação a andar para a
frente** — é isso que torna a extracção independente de fazer scroll numa lista virtual.
Se não houver JSON nenhum, lê a grelha do DOM. O relatório em
`.data/trainerize-export-report.json` diz o que viu, com que paginação e um registo de
amostra: é o que se lê quando uma corrida vem magra.

O perfil do browser vive em `.data/trainerize-profile`, portanto o login é pedido uma vez
e não em cada corrida. Nenhuma credencial passa pelo código.

O importador lê `nome`, `instruções → cues`, `tipo → registo` (reps/tempo/isometria/
distância), `grupo muscular + equipamento + categoria → tags` e um link de vídeo quando
existe. Aceita `.csv`, `.tsv` e `.json`, e reporta o que ignorou: linhas sem nome,
repetidos, colunas desconhecidas.

Tem de ser **seed** e não um `INSERT` local: no preview a base vive em `/tmp` e é
reconstruída a cada cold start (§13), portanto o que não estiver no bundle desaparece
com a lambda. O seed insere o que falta comparando nomes sem acentos nem maiúsculas —
correr o import outra vez acrescenta os novos e não mexe no que a Sara editou à mão,
nem ressuscita o que ela arquivou.

Os vídeos **não** vêm: ficam no Trainerize até serem re-filmados. Um exercício chega com
link, na melhor das hipóteses, e sem nada na pior.

### 10.2 Migração para Convex — em curso

Motivo, medido e não suposto: no Vercel a base vive em `/tmp`, que é **por
instância**. Uma gravação fica no disco da lambda que a serviu e o pedido seguinte pode
cair noutra, cuja base acabou de ser reconstruída do seed. Gravei um link de vídeo no
preview e recarreguei a mesma página dez vezes — `video, VAZIO, video, video, VAZIO,
VAZIO, VAZIO, VAZIO, VAZIO, VAZIO`. Não há correcção em código enquanto a base viver
dentro da instância.

**Não há dados para migrar.** A base actual é efémera e reconstruída do seed, portanto
isto é uma reescrita da camada de dados, não uma migração de dados: sem backfill, sem
escrita dupla, sem janela de corte.

Superfície, contada: **17 tabelas**, ~120 funções exportadas em `src/lib/studio/`,
~150 call sites em `src/app/` e `src/components/`.

Ordem obrigatória — cada passo depende da forma do anterior:

| # | Passo | Estado |
|---|---|---|
| 1 | `convex/schema.ts` — as 17 tabelas, validadores e índices | **feito** |
| 2 | Autenticação: decide como a identidade chega às funções | **decisão aberta** |
| 3 | Funções por domínio (library, users, plan, coaching, leads, media) | |
| 4 | Call sites: sync → `await`, em todas as páginas e server actions | |
| 5 | Seed + import da biblioteca em lotes (2233 documentos não cabem numa mutation) | |
| 6 | `media` para Convex file storage; a rota `/app/media/[id]` deixa de ler do disco | |
| 7 | Apagar `db.ts`, `paths.ts`, `id.ts` e o SQL todo | |

#### O passo 2 é o que trava o resto

`NEXT_PUBLIC_CONVEX_URL` é público por definição. Qualquer `query` ou `mutation`
exportada é chamável por quem souber o URL — expor `updateExercise` é deixar qualquer
pessoa editar a biblioteca da Sara. Hoje a autorização vive no Next (`requireCoach()`,
cookie HMAC), e as funções Convex não sabem quem está a chamar.

Duas saídas, e mudam a forma de todas as ~120 funções:

- **Convex Auth** (§9.1 já o nomeia). As funções defendem-se a si próprias com
  `ctx.auth.getUserIdentity()`. É o destino certo e abre as queries reactivas no
  browser, que é metade da razão para vir para o Convex. Custo: substitui o fluxo
  actual de magic link + cookie HMAC, e os utilizadores do piloto já estão a entrar
  por lá.
- **Chave de serviço.** Todo o tráfego continua a passar pelo Next, que fala com o
  Convex com um segredo de servidor; a autorização fica onde já está. Mais barato e
  não mexe no login, mas fecha a porta ao real-time no browser e é um padrão que a
  documentação do Convex desaconselha para tráfego de aplicação.

#### O que o SQLite garantia e agora é trabalho das mutations

- **Unicidade:** `users.email` e `checkins (clientId, weekOf)`. O índice existe para a
  mutation verificar antes de inserir.
- **Limpeza referencial:** os `ON DELETE CASCADE` (perfil, tokens, blocos, itens, logs,
  comentários) e `ON DELETE SET NULL` (media de um exercício, workout de uma marcação)
  passam a ser apagamentos explícitos.
- **`effort BETWEEN 1 AND 10`** passa a ser uma verificação na mutation.

#### O que a mudança apaga de graça

`withStableIds()` desaparece. Existia porque um host efémero reconstruía as linhas em
cada cold start e um link impresso por uma instância tinha de resolver noutra — com ids
duráveis o problema deixa de existir. O mesmo para a impressão digital em `meta`, que
passa a servir só o re-import da biblioteca.

---

## 11. Fases e esforço

| Fase | Conteúdo | Esforço |
|---|---|---|
| 0 | Confirmar fatura real da Sara, o que ela usa mesmo, consentimentos RGPD, teste de push em iPhone PT | 1 semana |
| 1 | MVP §6.1 | 4–6 semanas |
| 2 | §6.2 | 2–3 semanas |
| 3 | Pagamentos + faturação AT | 2 semanas |
| 4 | Shell nativo (opcional) | 2–3 semanas |

Custo de operação estimado (Fase 1–2, ~25 alunos):
Vercel Pro $20 + Convex ~$25 + Resend $0–20 + domínio ≈ **€45–70/mês**.

---

## 12. Riscos

| Risco | Mitigação |
|---|---|
| Scope creep para "clone do Trainerize" | A lista §6.5 é vinculativa. Cada feature nova tem de passar o teste: "a Sara usa isto todas as semanas?" |
| A Sara usa features que não descobrimos | Fase 0 — sessão de 1h a ver o ecrã dela, não a perguntar. |
| Vídeo mais caro do que o previsto | Cap de 60s, compressão no cliente, apagamento automático de submissões com >12 meses. |
| Push em iOS não funcionar | Já assumido. Email + WhatsApp cobrem a Fase 1. |
| Break-even nunca acontece | Só avançar com a decisão multi-tenant/produto de §1. |
| Fotos de progresso → exposição RGPD | Fora do MVP. |

---

## 13. Estado da implementação (v1 construída)

A app vive em `/app`, dentro deste repositório, **sem qualquer link a partir do site**
(`robots: noindex` + zero CTAs). Os alunos entram só pelo link enviado por email.

### Rotas

| Rota | Quem | O que faz |
|---|---|---|
| `/app` | — | router: manda para a área certa conforme o papel |
| `/app/entrar` | público | pedido de link de acesso (magic link, sem password) |
| `/app/entrar/verificar` | público | consome o token e abre sessão |
| `/app/media/[id]` | autenticado | entrega os vídeos/imagens com `Range`, nunca a partir de `public/` |
| `/app/coach` | Sara | **Resumo** — métricas, "precisa de ti", treinos de hoje, atividade recente |
| `/app/coach/alunos` · `/[clientId]` | Sara | roster, perfil, notas privadas, arquivo, reenvio de convite |
| `/app/coach/plano` | Sara | matriz aluno × dia de toda a semana do estúdio |
| `/app/coach/alunos/[clientId]/plano` | Sara | semana de um aluno: atribuir/mover/remover, repetir semana |
| `/app/coach/videos` · `/[submissionId]` | Sara | fila de revisão + **feedback anotado no vídeo** |
| `/app/coach/checkins` | Sara | check-ins da semana de todos, por responder primeiro |
| `/app/coach/alunos/[clientId]/checkins` | Sara | histórico de check-ins de um aluno |
| `/app/coach/mensagens` · `/[clientId]` | Sara | conversas |
| `/app/coach/treinos` · `/[workoutId]` | Sara | templates e construtor de blocos |
| `/app/coach/biblioteca` | Sara | exercícios próprios, cues, tags, upload de demo |
| `/app/aluno` | aluno | "Hoje" — o treino de agora |
| `/app/aluno/treino/[assignmentId]` | aluno | execução e registo de séries |
| `/app/aluno/plano` | aluno | a semana, só leitura |
| `/app/aluno/videos` | aluno | enviar execução, ver feedback com marcas |
| `/app/aluno/checkin` | aluno | check-in semanal |
| `/app/aluno/mensagens` | aluno | conversa com a Sara |
| `/app/aluno/progresso` | aluno | adesão, recordes, peso, histórico |

### Duas shells, de propósito

A área da Sara é uma **sidebar persistente + topbar** (`CoachChrome`): ela trabalha
num portátil e salta entre muito estado de aluno, e nove destinos não cabem numa tab
bar sem esconder a maioria. A área do aluno mantém a **tab bar** — é um telemóvel, num
estúdio, com uma mão.

Item ativo = pill caramelo com texto em tinta, o equivalente ao amarelo da referência.
Ícones são 15 glifos de traço desenhados à mão em `coach/icons.tsx` — não vale uma
dependência, e desenhá-los no mesmo sítio é o que faz um conjunto parecer um conjunto.

### Tema claro

O switch é o da dashboard da Developh, portado: mesmos glifos (`SunMedium` /
`MoonStar` do Lucide, path data inline — ISC, dois glifos não valem uma dependência)
e a mesma reveal circular a partir do ponto do clique, via View Transitions API.
A classe muda em `documentElement` dentro do callback da transição, para pintura e
animação caírem no mesmo frame; o cookie é escrito depois, só para o pedido seguinte
já vir certo. `prefers-reduced-motion` e browsers sem view transitions levam o flip
seco.

**Só a app muda.** A paleta clara está pendurada em `.studio`, o wrapper das duas
shells, e nunca em `html` — o site é uma peça editorial escura e não inverte. O
atributo `data-studio-theme` vive em `html` apenas para o toggle ter uma coisa só
para virar, e é renderizado no servidor a partir do cookie, logo não há flash.

Isto só funciona porque as cores passaram a ter **tokens de papel**: `--rail`,
`--surface-hover`, `--primary-hover`, `--accent-ink`. Os nomes literais (`--caramel`,
`--ink`) são cor de marca e não invertem; `--on-dark` e `--ink-hover` são fixos porque
vivem dentro das superfícies douradas, que são iguais nos dois temas. Duas subtilezas
que se pagam: `--butter` passa a ser caramelo no claro (o botão primário viraria um
creme invisível em papel), e `--accent-ink` escurece porque caramelo como *texto* em
papel tem contraste de 2,3:1.

### Menu de conta

O sair estava no fundo da sidebar, que é onde se põe uma coisa que não queremos que
seja encontrada. Passou para um menu no chip da conta, no topo direito: nome, email,
papel, **Dados da conta** (`/app/conta` — nome, idioma, tema, e o plano quando é
aluno) e **Sair**. Fecha com clique fora e com Escape.

### Uso do gradiente caramelo

O gradiente do site entra na app com uma regra: **uma superfície dourada por ecrã, na
única coisa que importa**. Espalhá-lo por todos os cartões faz com que deixe de
significar nada.

| Onde | Porquê |
|---|---|
| `/app/entrar` | Full-bleed `gradient-hero`, cartão de tinta por cima. É o momento de marca. |
| Cartão do treino de hoje (aluno) | O elemento mais importante da app inteira. |
| Resumo da sessão terminada | O momento de recompensa. |
| Adesão em `/app/aluno/progresso` | O número-manchete. |
| Consola vazia (`nada pendente`) | Inbox a zero é uma conquista, não um vazio. |
| Confirmação do check-in da semana | Confirmação, não aviso. |

Tudo o resto fica plano (`bg-ink-lift`). O único fio dourado permanente é o filete de
1px sob o cabeçalho.

Vocabulário em `src/components/studio/theme.ts`: `surfaceAccent` /
`surfaceAccentLink` mais os gémeos do lado da tinta (`eyebrowOnAccent`,
`mutedOnAccent`, `buttonOnAccent`, `buttonGhostOnAccent`, `chipOnAccent`,
`panelOnAccent`) — sobre o dourado o texto é `ink`, por isso qualquer classe
baseada em `cream` desaparece.

### Decisões que se desviam do plano

- **Persistência: SQLite local** (`node:sqlite`), não Convex. Razão: zero
  provisionamento, corre num `bun run dev` sem credenciais. Todo o acesso a
  dados passa por `all`/`get`/`run` em `src/lib/studio/db.ts` com SQL escrito à mão, por
  isso a troca para Convex/Postgres/libSQL (§9.2) é mecânica.
  **Um ficheiro em disco não sobrevive a um deploy serverless** — antes de produção há
  mesmo de haver esta migração, ou um host persistente.
- **Raiz de dados** em `src/lib/studio/paths.ts`: `.data/` em local, `/tmp` no Vercel
  (o bundle da lambda é read-only), `STUDIO_DATA_DIR` para apontar a um volume. No
  Vercel a base é portanto **recriada pelo seed em cada cold start** — é o que torna o
  preview navegável, e é exatamente o que produção não pode ter.
- **Uploads em disco** (`<raiz>/uploads`) servidos pela rota autenticada, não blob
  storage. Mesma razão, mesmo caminho de migração.
- **Fotos de progresso continuam fora**, como decidido em §8.
- Nutrição, comunidade, desafios, wearables e pagamentos: não construídos, por desenho.

### Verificado end-to-end no browser

Magic link → sessão → consola · criar/editar exercícios e treinos · atribuir e mover
treinos na semana · executar o treino com registo de séries que sobrevive a reload ·
terminar sessão → aparece no progresso com recordes calculados · enviar vídeo (`.txt`
rejeitado com `errors.fileType`, `.mp4` aceite) · marcar dois comentários em instantes
diferentes do vídeo, escolher veredito e enviar · o aluno vê as marcas e salta para o
instante · check-in semanal → resposta da Sara · mensagens nos dois sentidos · os alertas
da consola desaparecem à medida que são resolvidos.

### Dois defeitos encontrados por esta verificação (e corrigidos)

1. `/app/media/[id]` não respondia a `Range`. Sem isso o browser **não consegue fazer
   seek** num vídeo: atribuir `currentTime` falha em silêncio e todas as marcas caíam em
   `0:00.0`, o que inutilizava a feature central. Agora responde 206 com `Content-Range`.
2. O leitor de revisão só ouvia `timeupdate`, que não dispara com o vídeo em pausa —
   exatamente o estado em que se revê técnica. Passou a ouvir `seeked`/`seeking`/
   `loadedmetadata` e a ler `currentTime` do elemento no momento de marcar.

### Modo demonstração

`STUDIO_DEMO=1` faz duas coisas: o seed cria a aluna de demonstração com uma semana de
plano, e `/app/entrar` ganha entrada direta como Sara ou como essa aluna. A entrada
direta existe porque numa base efémera o magic link **não pode** funcionar — o token é
estado na base, e a instância que o emitiu não é a que serve o clique. Sem a variável,
o ecrã de entrada e o fluxo de magic link ficam exatamente como estavam.

O seed corre com ids determinísticos (`withStableIds`, `src/lib/studio/id.ts`) pela mesma
razão: `/app/coach/alunos/seed-0034` tem de resolver em qualquer instância. Linhas
criadas por utilizadores mantêm ids aleatórios.

Está montado em `test.brigitestudio.com` (projeto Vercel `brigite-studio-test`, branch
`test`), sem proteção de deployment e sem `RESEND_API_KEY` — logo sem envio de email.

### Variáveis de ambiente

`STUDIO_SECRET` (assinatura de sessões; cai para `CONTACT_FORM_SECRET`/`RESEND_API_KEY`),
`STUDIO_COACH_EMAIL` (default `hello@brigitestudio.com`), `STUDIO_DEMO=1` (aluna de
demonstração + entrada direta), `STUDIO_DATA_DIR` (raiz de dados alternativa),
`RESEND_API_KEY` (sem ela o link de acesso é impresso na consola e devolvido no ecrã,
para desenvolvimento). Ver `.env.example`.
