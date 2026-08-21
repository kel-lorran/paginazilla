/** Um ponto em pixels, no espaço de coordenadas da planta (imagem original, não da tela). */
export interface Point {
  x: number;
  y: number;
}

/** Pan/zoom salvo — posição da câmera do canvas em relação à planta. */
export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

/** Calibração de escala da planta: quantos pixels da imagem original equivalem a 1 cm reais. */
export interface ScaleCalibration {
  /** Dois pontos, no espaço de pixels da imagem da planta, marcando a cota de referência. */
  referenceLine: [Point, Point];
  /** Comprimento real da cota de referência, em centímetros. */
  realLengthCm: number;
  /** Derivado: pixels por centímetro. */
  pixelsPerCm: number;
}

/** Camada de máscara sobreposta à planta, para esmaecer áreas fora do piso-alvo. */
export interface MaskLayer {
  id: string;
  name: string;
  imageUrl: string;
  /** Posição da máscara no espaço de pixels da planta. */
  x: number;
  y: number;
  opacity: number;
}

/** Um material/peça disponível para compor o mosaico (ex: fatia de telha). */
export interface Material {
  id: string;
  name: string;
  imageUrl: string;
  /** Tamanho real travado, calibrado visualmente pelo autor contra a planta. */
  realWidthCm: number;
  realHeightCm: number;
}

/** Um cenário de paginação completo, publicado pelo autor. */
export interface Scenario {
  id: string;
  name: string;
  isometricImageUrl: string;
  planImageUrl: string;
  scaleCalibration: ScaleCalibration;
  masks: MaskLayer[];
  materials: Material[];
  initialViewport: Viewport;
}

/** Uma peça posicionada pelo usuário final sobre o cenário. */
export interface PieceInstance {
  id: string;
  materialId: string;
  x: number;
  y: number;
  rotationDeg: number;
  mirrored: boolean;
}

/** Progresso do usuário final num cenário — o que é salvo localmente (IndexedDB). */
export interface MosaicProgress {
  scenarioId: string;
  pieces: PieceInstance[];
  updatedAt: number;
}
