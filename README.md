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

## Build / deploy (GitHub Pages)

```bash
npm run build
```

O `base` em `vite.config.ts` está fixo em `/paginazilla/` — ajuste se o nome
do repositório no GitHub for diferente.
