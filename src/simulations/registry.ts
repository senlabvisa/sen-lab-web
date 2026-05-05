import type { ComponentType } from 'react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { LoiDohm3eme } from './loi-dohm-3eme/module';
import { Photosynthese4eme } from './photosynthese-4eme/module';
import { Pythagore4eme } from './theoreme-pythagore-4eme/module';
import { FonctionsAffines3eme } from './fonctions-affines-3eme/module';
import { MoleculeEau4eme } from './molecule-eau-4eme/module';
import { EtatsMatiere6eme } from './etats-matiere-6eme/module';
import { MangroveSaloum6eme } from './mangrove-saloum-6eme/module';
import { ClassificationVivant6eme } from './classification-vivant-6eme/module';
import { AlimentationAnimale6eme } from './alimentation-animale-6eme/module';
import { MasseVolumeDensite6eme } from './masse-volume-densite-6eme/module';
import { ThermometreTropical6eme } from './thermometre-tropical-6eme/module';
import { Numeration6eme } from './numeration-6eme/module';
import { PerimetresAires6eme } from './perimetres-aires-6eme/module';
import { CercleDroitesAngles6eme } from './cercle-droites-angles-6eme/module';
import { GraphiquesMeteo6eme } from './graphiques-meteo-6eme/module';
import { FractionsSimples6eme } from './fractions-simples-6eme/module';
import { CycleVie6eme } from './cycle-vie-6eme/module';
import { ChangementsEtat6eme } from './changements-etat-6eme/module';

/**
 * Registry slug → composant SimulationModule.
 *
 * Pour ajouter un TP :
 *   1. Créer `src/simulations/<slug>/module.tsx` qui exporte un composant
 *      conforme à `SimulationModuleProps`
 *   2. L'ajouter ici
 *   3. Créer la simulation dans simulations-service (POST ou seed) avec le même slug
 *
 * Un slug absent du registry → /tp/[slug] rend une coquille générique.
 */
export const SIMULATION_MODULES: Record<string, ComponentType<SimulationModuleProps>> = {
  'loi-dohm-3eme': LoiDohm3eme,
  'photosynthese-4eme': Photosynthese4eme,
  'theoreme-pythagore-4eme': Pythagore4eme,
  'fonctions-affines-3eme': FonctionsAffines3eme,
  'molecule-eau-4eme': MoleculeEau4eme,
  'etats-matiere-6eme': EtatsMatiere6eme,
  'mangrove-saloum-6eme': MangroveSaloum6eme,
  'classification-vivant-6eme': ClassificationVivant6eme,
  'alimentation-animale-6eme': AlimentationAnimale6eme,
  'masse-volume-densite-6eme': MasseVolumeDensite6eme,
  'thermometre-tropical-6eme': ThermometreTropical6eme,
  'numeration-6eme': Numeration6eme,
  'perimetres-aires-6eme': PerimetresAires6eme,
  'cercle-droites-angles-6eme': CercleDroitesAngles6eme,
  'graphiques-meteo-6eme': GraphiquesMeteo6eme,
  'fractions-simples-6eme': FractionsSimples6eme,
  'cycle-vie-6eme': CycleVie6eme,
  'changements-etat-6eme': ChangementsEtat6eme,
};

export function getModule(slug: string): ComponentType<SimulationModuleProps> | null {
  return SIMULATION_MODULES[slug] ?? null;
}
