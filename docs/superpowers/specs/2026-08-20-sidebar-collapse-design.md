# Sidebar recolhível — `CoachChrome`

**Data:** 2026-08-20
**Estado:** aprovado pelo utilizador

## Objetivo

Dar à Sara uma opção para recolher a rail de navegação do coach (`CoachChrome`)
para um modo "só ícones", com uma animação GSAP limpa tanto a abrir como a
fechar. Aplica-se apenas à rail fixa de desktop (`lg:`); o drawer mobile já
"recolhe" ao deslizar para fora do ecrã, não precisa de modo ícone.

## Estado

`useState<boolean>` local em `CoachChrome` (`collapsed`). Sem persistência em
cookie — reabre sempre expandida ao dar refresh. Mais simples, e é o que foi
pedido.

## Toggle

Botão de chevron junto ao logo, no canto superior esquerdo da rail — o mesmo
canto onde hoje vive o botão de fechar do drawer mobile (`lg:hidden`). Em vez
de esconder esse canto em desktop, passa a mostrar o botão de recolher/expandir
(`hidden lg:inline-flex` em vez de `lg:hidden`). `aria-label` distinto consoante
o estado (`recolher menu` / `expandir menu`), `aria-expanded={!collapsed}`.

## Comportamento visual quando recolhida

- Largura da rail: `16.5rem` → `4.75rem`.
- Wordmark "Brigite's Studio" desaparece; fica só o `SolMark`.
- Formulário de pesquisa esconde-se.
- Labels dos itens de menu desaparecem; ficam só os ícones, centrados.
- O grupo "Bibliotecas" (com filhos) deixa de abrir em disclosure quando
  recolhido — o clique navega direto para `item.href`, sem submenu. Sem
  flyout nesta v1 (YAGNI).
- Badges de contagem pendente (`videos`, `mensagens`) passam de número para um
  pontinho caramelo no canto do ícone, para a Sara continuar a ver que há algo
  pendente mesmo recolhida.
- Cada link de navegação ganha `title={label}` quando recolhido, para tooltip
  nativo do browser.

## Animação (GSAP)

Segue o padrão já usado em `src/components/layout/HeaderMotion.tsx`:
`useGSAP` (`@gsap/react`), `gsap.matchMedia` a respeitar
`prefers-reduced-motion` (sem transição, aplica o estado final direto).

Uma única timeline por toggle, a animar em conjunto:

- largura da `<aside>` (`16.5rem` ↔ `4.75rem`), `power2.out`, ~0.35s;
- opacidade + `autoAlpha` dos labels/wordmark/pesquisa (fade rápido no início
  de fechar / fim de abrir, para não "esticar" texto durante a transição de
  largura);
- `overflow-x: hidden` na `<aside>` durante a animação, para não deixar o
  texto quebrar linha enquanto a largura muda.

Sem novas dependências — `gsap` e `@gsap/react` já estão instalados e em uso
no site.

## Fora de âmbito (v1)

- Persistência da preferência (cookie/localStorage).
- Flyout com submenu ao passar o rato sobre "Bibliotecas" quando recolhido.
- Aplicar o mesmo padrão ao lado do aluno (não tem rail persistente, usa tab
  bar).
