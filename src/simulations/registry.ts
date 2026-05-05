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
// === 5ème ===
import { FractionsDecimaux5eme } from './fractions-decimaux-5eme/module';
import { SymetrieAxiale5eme } from './symetrie-axiale-5eme/module';
import { Pourcentages5eme } from './pourcentages-5eme/module';
import { Triangles5eme } from './triangles-5eme/module';
import { MelangesSolutions5eme } from './melanges-solutions-5eme/module';
import { CircuitsSimples5eme } from './circuits-simples-5eme/module';
import { SourcesLumiere5eme } from './sources-lumiere-5eme/module';
import { Respiration5eme } from './respiration-5eme/module';
import { CirculationSanguine5eme } from './circulation-sanguine-5eme/module';
import { Digestion5eme } from './digestion-5eme/module';
import { SolVivant5eme } from './sol-vivant-5eme/module';
// === 4ème ===
import { TheoremeThales4eme } from './theoreme-thales-4eme/module';
import { Puissances4eme } from './puissances-4eme/module';
import { CalculLitteral4eme } from './calcul-litteral-4eme/module';
import { Statistiques4eme } from './statistiques-4eme/module';
import { AirPression4eme } from './air-pression-4eme/module';
import { OptiqueLentilles4eme } from './optique-lentilles-4eme/module';
import { AtomesMolecules4eme } from './atomes-molecules-4eme/module';
import { IntensiteTension4eme } from './intensite-tension-4eme/module';
import { ReproductionPlantes4eme } from './reproduction-plantes-4eme/module';
import { ReproductionAnimale4eme } from './reproduction-animale-4eme/module';

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
  // === 5ème ===
  'fractions-decimaux-5eme': FractionsDecimaux5eme,
  'symetrie-axiale-5eme': SymetrieAxiale5eme,
  'pourcentages-5eme': Pourcentages5eme,
  'triangles-5eme': Triangles5eme,
  'melanges-solutions-5eme': MelangesSolutions5eme,
  'circuits-simples-5eme': CircuitsSimples5eme,
  'sources-lumiere-5eme': SourcesLumiere5eme,
  'respiration-5eme': Respiration5eme,
  'circulation-sanguine-5eme': CirculationSanguine5eme,
  'digestion-5eme': Digestion5eme,
  'sol-vivant-5eme': SolVivant5eme,
  // === 4ème ===
  'theoreme-thales-4eme': TheoremeThales4eme,
  'puissances-4eme': Puissances4eme,
  'calcul-litteral-4eme': CalculLitteral4eme,
  'statistiques-4eme': Statistiques4eme,
  'air-pression-4eme': AirPression4eme,
  'optique-lentilles-4eme': OptiqueLentilles4eme,
  'atomes-molecules-4eme': AtomesMolecules4eme,
  'intensite-tension-4eme': IntensiteTension4eme,
  'reproduction-plantes-4eme': ReproductionPlantes4eme,
  'reproduction-animale-4eme': ReproductionAnimale4eme,
};

export function getModule(slug: string): ComponentType<SimulationModuleProps> | null {
  return SIMULATION_MODULES[slug] ?? null;
}
