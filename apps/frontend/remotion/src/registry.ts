import type React from "react";
import { CodeScene, KeyPoints, SummaryCards, TitleReveal } from "./components";
import { IconShowcase } from "./Icons";
import { CloudSync, CommitTimeline, FileChaos, IconSummary } from "./GitScenes";
import { HookScene } from "./FunScenes";
import { JobScene } from "./JobScene";
import { RestaurantScene } from "./RestaurantScene";
import { BigStatement, CardList, CompareCards, CtaCard, FlowSteps, IconGrid, IconHero } from "./GenericScenes";
import { CompareScene, CtaScene, DeveloperScene, LaptopScene, SdlcScene, StrikeScene, VennScene } from "./FunScenes2";
import { DiagramScene } from "./DiagramScene";
import type { Scene } from "./storyboard";

export const DEFAULT_COMPONENT_VERSION = "1.0.0";

// Registri komponen: storyboard hanya boleh memakai komponen yang terdaftar di sini.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registry: Record<string, React.FC<any>> = {
  TitleReveal,
  CodeScene,
  SummaryCards,
  KeyPoints,
  IconShowcase,
  FileChaos,
  CommitTimeline,
  CloudSync,
  IconSummary,
  HookScene,
  JobScene,
  RestaurantScene,
  DeveloperScene,
  CompareScene,
  VennScene,
  StrikeScene,
  LaptopScene,
  SdlcScene,
  CtaScene,
  BigStatement,
  CompareCards,
  FlowSteps,
  CardList,
  CtaCard,
  IconHero,
  IconGrid,
  DiagramScene,
};

// Resolver sistem (DL-10): menormalkan componentId dan mengisi componentVersion default jika belum diset.
export function resolveSceneComponent(scene: Scene) {
  const componentId = scene.componentId ?? scene.component ?? "";
  const componentVersion = scene.componentVersion ?? DEFAULT_COMPONENT_VERSION;
  return {
    componentId,
    componentVersion,
    Component: registry[componentId],
  };
}