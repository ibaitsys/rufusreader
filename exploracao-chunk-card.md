# Exploração Criativa — Chunk Cards

Perfeito — vamos explorar possibilidades sem agir ainda. Abaixo está como maximizar a criatividade e como você pode me “soltar a rédea” com segurança.

## O Que Preciso Para Ir ao Máximo
- Objetivo do card: leitura rápida, navegação, descoberta ou conversão?
- Limites de marca: paleta, tipografia, tom, do’s/don’ts visuais.
- Conteúdo real: exemplos de 10–20 cards com variações (títulos longos/curtos, tags, mídia).
- Restrições técnicas: framework, tokens/design system existentes, performance alvo.
- Métrica de sucesso: CTR, tempo de leitura, scroll depth, save/share, erro de clique.
- Contexto de uso: mobile/desktop, dark mode, baixo contraste, redução de movimento.

## Trilhas de Exploração (Temas)
- Tipografia/Primeira Palavra: capitular editorial, weight swap, cor/tinta variável, sublinhado animado, ligaturas/variable font.
- Layout/Densidade: mídia-top vs media-left, compact/comfortable/cozy, grid/masonry/list, “headline card” hero, meta acima/abaixo.
- Estilo Visual: editorial clean, brutalista, glass com blur leve, skeuo sutil, outline-only.
- Interações/Motion: hover/press com micro-sombra, expandir em linha, quick actions (save/share), scroll-linked reveal, progress de leitura.
- Sinais Contextuais: badges por fonte/autor, confiança/relevância, destaque de entidades (NLP) com chips clicáveis.
- Acessibilidade/Resiliência: contraste AA/AAA, foco visível, sem dependência de cor, modo sem animação.

## Fluxo Divergir → Convergir
- Divergir: 12–20 variações de alto nível (miniaturas) cobrindo temas acima.
- Seleção: 4–6 finalistas com tokens nomeados e rationale claro.
- Refinamento: 2–3 variantes refinadas com estados (hover/focus/erro/vazio) e dark mode.
- Validação: protótipos clicáveis + teste rápido com 5–8 pessoas e A/B (se houver tráfego).
- Consolidação: 1–2 padrões oficiais documentados em Storybook/Design System.

## Matriz de Experimentos
- Eixos: estética (editorial ↔ brutalista), densidade (compacta ↔ aconchegante), motion (estático ↔ expressivo), affordances (ocultas ↔ explícitas).
- Gere combinações rápidas e descarte extremos que quebrem legibilidade ou marca.

## Guardrails Essenciais
- Acessibilidade primeiro (contraste, teclas, leitores).
- Performance: sem layouts custosos; imagens responsivas; mínimo de JS.
- Internacionalização: títulos longos/RTL sem quebrar; truncamento elegante.
- Consistência com tokens e temas existentes.

## Entregáveis
- 1 arquivo com variantes: componentes em Storybook (props claros) e tokens dedicados.
- Guia de uso: quando usar cada variante + anti-padrões.
- Plano de teste: hipótese, métricas, segmentos, duração e critérios de “stop/ship”.

## Perguntas Rápidas
- Qual a ação principal esperada no card (abrir, salvar, compartilhar)?
- O “charme” da primeira palavra é obrigatório ou pode ser opcional por contexto?
- Há imagens/capas sempre, às vezes, ou nunca?
- Quais devices priorizamos e qual a meta de LCP/CLS?
- Podemos usar fontes variáveis ou precisamos ficar em system fonts?

---

Se topar, me envie: exemplos reais de cards, limites de marca, e o stack/tokens atuais. Com isso, proponho a primeira leva de 12–20 variações para avaliarmos juntos.

