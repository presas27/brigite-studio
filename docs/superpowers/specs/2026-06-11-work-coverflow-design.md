# Secção "Trabalho" — Coverflow GSAP

**Data:** 2026-06-11
**Estado:** aprovado pelo utilizador

## Objetivo

Adicionar uma secção de portefólio que reflita o trabalho artístico da cliente
(Sara Brigite, Circus Performer / aerialist & hand balancer). Carrossel estilo
**coverflow** com auto-rotação, animado com **GSAP**, estética super clean e
minimalista, com um CTA "Ver +" que reencaminha para o perfil JamarGig.

## Origem das imagens

- Perfil: `https://profile.jamargig.com/sarabrigite/`
- Dados (SPA Vite): `https://profile.jamargig.com/sarabrigite/main.json`
  → `media.images` (26 imagens, URLs CloudFront).
- Download exige `User-Agent` de browser + `Referer: https://profile.jamargig.com/sarabrigite/`.
- **Só imagens limpas** (sem marca de água "JAYA AERIAL LAB / TIAGO XAVIER").
- Seleção curada (~9–10): núcleo de performance de circo/aéreos + 2–3 editoriais a vermelho.
- Otimização local com `sharp` (0.34.5, já instalado): redimensionar a ~1200px de
  largura, exportar `webp` q≈78 → `public/images/work/`. Servir via `next/image`.
  Orçamento ~1.5MB/rota.

## Posição na página

`Hero → Services → About → **Work** → Testimonials → Contact` (`id="work"`).

## Componentes

- `src/lib/work.ts` — lista curada `{ src, alt }` das imagens.
- `src/components/sections/Work.tsx` — **server component**: lê traduções
  (namespace `Work`), renderiza eyebrow + título + `<Coverflow>` + CTA "Ver +".
- `src/components/ui/Coverflow.tsx` — **client component** (`"use client"`),
  GSAP. Recebe `images` e labels via props.

## Comportamento do Coverflow

- Cartões **retrato** (aspeto 2/3). Centro grande/nítido; laterais escalados
  (~0.8), recuados em profundidade (translateZ/scale + opacidade ~0.5),
  ligeiramente dessaturados. Sem reflexos.
- **Auto-avança** ~3.5s; transição GSAP `power3.out` (~0.8s).
- **Pausa** em hover/focus.
- Navegação: **arrastar/swipe**, **setas teclado**, **clique** nos cartões laterais.
- A11y: cartões focáveis, `aria-label`, botões de navegação com label.
- `prefers-reduced-motion`: sem auto-avanço; fila simples navegável.
- Cleanup com `@gsap/react` `useGSAP` (React 19 / Next 16).

## CTA

Botão minimalista "Ver +" com seta → `https://profile.jamargig.com/sarabrigite/`,
`target="_blank"`, `rel="noopener noreferrer"`.

## i18n (next-intl)

Novo namespace `Work` em `messages/pt.json` e `messages/en.json`: `eyebrow`,
`title`, `cta`. Paridade PT/EN obrigatória.

## Dependências

- `gsap` + `@gsap/react` via `bun add`. Não alterar o uso existente de `motion`.

## Verificação

- `image-budget`, `awwwards-critic`, `motion-review`/`a11y-audit`, `i18n-coverage`.
- `bun run build` + lint limpos.
