export interface TutorialTip {
  title: string;
  body: string;
}

export const scenarioTutorialTips: TutorialTip[] = [
  {
    title: "Bem-vindo(a)!",
    body: "Clique num material no painel à direita pra adicionar uma peça — ela já nasce no tamanho real do projeto.",
  },
  {
    title: "Mover",
    body: "Arraste a peça com o mouse pra posicionar. Pra ajuste fino, selecione e use as setas do teclado — segurando Shift, o passo fica maior.",
  },
  {
    title: "Selecionar várias peças",
    body: "Clique numa peça pra selecionar. Shift+clique adiciona outras à seleção. Ou segure Shift e arraste no fundo pra abrir uma janela — tudo que ela tocar entra na seleção.",
  },
  {
    title: "Rotacionar, espelhar, duplicar, excluir",
    body: "Com a peça (ou grupo) selecionado, aparece uma mini barra: ⟳ rotaciona, ⇄ espelha, ⧉ duplica, ✕ remove. Vírgula e ponto giram em passos menores (5°), pra ajustes finos.",
  },
  {
    title: "Desfazer e refazer",
    body: "Ctrl+Z desfaz, Ctrl+Shift+Z (ou Ctrl+Y) refaz. No celular, os botões ↶ ↷ aparecem na barra de ações.",
  },
  {
    title: "Cruz de navegação (mobile)",
    body: "Com uma peça selecionada, uma cruz aparece no canto inferior direito: os triângulos movem, e arrastar o círculo ao redor do anel gira em passos de 5°.",
  },
  {
    title: "Copiar e colar",
    body: "Ctrl+C copia a seleção, Ctrl+V cola. Cada colagem aparece um pouco deslocada, então dá pra colar várias vezes sem empilhar tudo no mesmo lugar.",
  },
  {
    title: "Alinhamento automático",
    body: "Ao arrastar, a peça gruda no centro ou na borda de peças vizinhas — uma linha rosa mostra o alinhamento. Tem também uma grade opcional (canto superior direito), só como referência visual.",
  },
  {
    title: "Navegar pela planta",
    body: "Role o scroll do mouse pra dar zoom. Arraste o fundo (fora das peças) pra mover a visão.",
  },
  {
    title: "Salvar e exportar",
    body: 'Seu progresso é salvo automaticamente. O botão "Salvar" só confirma isso, e "Carregar" volta pra última versão salva. Quando terminar, "Exportar PNG" baixa o mosaico final.',
  },
];
