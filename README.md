# Paginazilla

Webapp para montar mosaicos de paginação de piso: posicione peças de material
real (ex.: fatias de telha) sobre a planta baixa de um projeto, respeitando a
escala real, e exporte o resultado como mapa de assentamento.

Veja [PLANNING.md](./PLANNING.md) para o desenho do produto e das decisões de
arquitetura.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Cenários

Cada "cenário" (planta + isométrica + máscaras + materiais) vive em
`public/scenarios/<id>/`, listado em `public/scenarios/index.json`. Um
cenário de demonstração (`demo`) está incluído para testes.

### Criando um cenário novo (Modo Autor)

1. Acesse `/author` (link "Modo Autor" na home). É uma ferramenta local —
   não precisa estar publicada em produção.
2. Faça upload da planta e da isométrica.
3. Aba **Escala**: clique dois pontos na planta sobre uma cota conhecida
   (ex.: uma parede) e informe o comprimento real em cm.
4. Aba **Materiais**: faça upload da imagem de cada peça, clique em
   "Calibrar tamanho", arraste os cantos até o tamanho real na planta e
   clique em "Travar tamanho".
5. Aba **Máscaras** (opcional): faça upload de imagens com transparência
   pra esmaecer áreas fora do piso-alvo; ajuste opacidade e arraste pra
   posicionar.
6. Dê zoom/pan na visão que quer como inicial e clique em "Usar visão
   atual como inicial".
7. Clique em "Exportar bundle (.zip)". Extraia o conteúdo do zip
   (`manifest.json`, `plan.*`, `isometric.*`, `masks/`, `materials/`)
   diretamente dentro de `public/scenarios/<id>/`, onde `<id>` é o nome do
   cenário slugificado (também gravado como `"id"` dentro do
   `manifest.json`).
8. Adicione `{ "id": "<id>", "name": "<nome>" }` em
   `public/scenarios/index.json` pra ele aparecer na home.

## Build / deploy (GitHub Pages)

```bash
npm run build
```

O `base` em `vite.config.ts` está fixo em `/paginazilla/` — ajuste se o nome
do repositório no GitHub for diferente.
