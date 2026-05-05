import type { ComponentType } from 'react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { LoiDohm3eme } from './loi-dohm-3eme/module';
import { Photosynthese4eme } from './photosynthese-4eme/module';
import { Pythagore4eme } from './theoreme-pythagore-4eme/module';
import { FonctionsAffines3eme } from './fonctions-affines-3eme/module';
import { MoleculeEau4eme } from './molecule-eau-4eme/module';

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
};

export function getModule(slug: string): ComponentType<SimulationModuleProps> | null {
  return SIMULATION_MODULES[slug] ?? null;
}
