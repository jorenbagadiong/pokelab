import Link from "next/link";
import { APP_NAME } from "@/constants/app";
import { LogoMark } from "./logo";
import { PageContainer } from "./page-container";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-24 border-t border-border bg-bg/60 backdrop-blur-sm">
      <PageContainer className="grid gap-8 py-10 text-sm text-muted md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-text">
            <LogoMark className="size-6" />
            <span className="font-display font-semibold">{APP_NAME}</span>
          </div>
          <p className="max-w-md">
            An unofficial, fan-made Pokédex. Pokémon and Pokémon character names are trademarks of Nintendo, Creatures
            Inc. and GAME FREAK inc. This project is not affiliated with or endorsed by them.
          </p>
        </div>
        <div className="space-y-2">
          <p>
            Data and sprites from{" "}
            <a className="text-accent underline-offset-4 hover:underline" href="https://pokeapi.co/" rel="noreferrer" target="_blank">
              PokéAPI
            </a>
            .
          </p>
          <p>
            3D placeholder model: “Fox” from the{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox"
              rel="noreferrer"
              target="_blank"
            >
              Khronos glTF Sample Assets
            </a>
            . Model by PixelMannen (CC0), rigging and animation by tomkranis (CC BY 4.0), glTF conversion by
            AsoboStudio and scurest (CC BY 4.0).
          </p>
          <p>
            <Link href="/pokemon" className="text-accent underline-offset-4 hover:underline">
              Browse the Pokédex →
            </Link>
          </p>
        </div>
      </PageContainer>
    </footer>
  );
}
