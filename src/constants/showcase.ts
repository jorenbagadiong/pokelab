export interface ShowcaseModel {
  url: string;
  /** Name of the model itself (not the Pokémon). */
  modelName: string;
  /** True when the model is a stand-in rather than a model of the Pokémon. */
  isPlaceholder: boolean;
  /** Animation clip to loop when motion is allowed. */
  idleAnimation?: string;
  credit: string;
  sourceUrl: string;
}

/**
 * 3D showcases keyed by National Pokédex number. Only one is configured: no
 * properly licensed Pokémon model is available, so Eevee's page uses a clearly
 * labelled CC0 / CC BY 4.0 placeholder (see public/models/ATTRIBUTION.md).
 */
export const SHOWCASE_MODELS: Partial<Record<number, ShowcaseModel>> = {
  133: {
    url: "/models/fox.glb",
    modelName: "Fox",
    isPlaceholder: true,
    idleAnimation: "Survey",
    credit:
      "“Fox” by PixelMannen (CC0), rigging & animation by tomkranis (CC BY 4.0), glTF conversion by AsoboStudio & scurest (CC BY 4.0).",
    sourceUrl: "https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox",
  },
};

export const SHOWCASE_POKEMON_SLUG = "eevee";
