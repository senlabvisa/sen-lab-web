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
// === 3ème ===
import { Trigonometrie3eme } from './trigonometrie-3eme/module';
import { RacinesCarrees3eme } from './racines-carrees-3eme/module';
import { SystemesEquations3eme } from './systemes-equations-3eme/module';
import { AgrandissementReduction3eme } from './agrandissement-reduction-3eme/module';
import { Cinematique3eme } from './cinematique-3eme/module';
import { PoidsMasse3eme } from './poids-masse-3eme/module';
import { PhSolutions3eme } from './ph-solutions-3eme/module';
import { EnergieElectrique3eme } from './energie-electrique-3eme/module';
import { GenetiqueMendel3eme } from './genetique-mendel-3eme/module';
import { SystemeImmunitaire3eme } from './systeme-immunitaire-3eme/module';
import { SystemeNerveux3eme } from './systeme-nerveux-3eme/module';
import { ProcreationHumaine3eme } from './procreation-humaine-3eme/module';
// === Seconde ===
import { Vecteurs2nde } from './vecteurs-2nde/module';
import { Statistiques2nde } from './statistiques-2nde/module';
import { EquationsSecondDegre2nde } from './equations-second-degre-2nde/module';
import { FonctionsReference2nde } from './fonctions-reference-2nde/module';
import { ForcesEquilibre2nde } from './forces-equilibre-2nde/module';
import { TableauPeriodique2nde } from './tableau-periodique-2nde/module';
import { MouvementVitesse2nde } from './mouvement-vitesse-2nde/module';
import { MoleConcentration2nde } from './mole-concentration-2nde/module';
import { CelluleAnimaleVegetale2nde } from './cellule-animale-vegetale-2nde/module';
import { AdnExtraction2nde } from './adn-extraction-2nde/module';
import { BiodiversiteBandia2nde } from './biodiversite-bandia-2nde/module';
// === Première ===
import { Derivees1ere } from './derivees-1ere/module';
import { Probabilites1ere } from './probabilites-1ere/module';
import { SuitesArithGeo1ere } from './suites-arith-geo-1ere/module';
import { ProduitScalaire1ere } from './produit-scalaire-1ere/module';
import { EnergieMecanique1ere } from './energie-mecanique-1ere/module';
import { DosageAcideBase1ere } from './dosage-acide-base-1ere/module';
import { OptiqueMiroirs1ere } from './optique-miroirs-1ere/module';
import { ChimieOrganique1ere } from './chimie-organique-1ere/module';
import { TectoniquePlaques1ere } from './tectonique-plaques-1ere/module';
import { EvolutionEspeces1ere } from './evolution-especes-1ere/module';
import { Hormones1ere } from './hormones-1ere/module';
import { RespirationCellulaire1ere } from './respiration-cellulaire-1ere/module';
// === Terminale ===
import { SuitesTerminale } from './suites-terminale/module';
import { IntegrationTerminale } from './integration-terminale/module';
import { ExponentielleLogTerminale } from './exponentielle-log-terminale/module';
import { GeometrieEspaceTerminale } from './geometrie-espace-terminale/module';
import { ComplexesTerminale } from './complexes-terminale/module';
import { MecaniqueNewtonTerminale } from './mecanique-newton-terminale/module';
import { CinetiqueChimiqueTerminale } from './cinetique-chimique-terminale/module';
import { CircuitRlcTerminale } from './circuit-rlc-terminale/module';
import { DesintegrationRadioactiveTerminale } from './desintegration-radioactive-terminale/module';
import { GenetiqueMoleculaireTerminale } from './genetique-moleculaire-terminale/module';
import { ClimatTerminale } from './climat-terminale/module';
import { VihImmuniteTerminale } from './vih-immunite-terminale/module';
import { MeioseMitoseTerminale } from './meiose-mitose-terminale/module';

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
  // === 3ème ===
  'trigonometrie-3eme': Trigonometrie3eme,
  'racines-carrees-3eme': RacinesCarrees3eme,
  'systemes-equations-3eme': SystemesEquations3eme,
  'agrandissement-reduction-3eme': AgrandissementReduction3eme,
  'cinematique-3eme': Cinematique3eme,
  'poids-masse-3eme': PoidsMasse3eme,
  'ph-solutions-3eme': PhSolutions3eme,
  'energie-electrique-3eme': EnergieElectrique3eme,
  'genetique-mendel-3eme': GenetiqueMendel3eme,
  'systeme-immunitaire-3eme': SystemeImmunitaire3eme,
  'systeme-nerveux-3eme': SystemeNerveux3eme,
  'procreation-humaine-3eme': ProcreationHumaine3eme,
  // === Seconde ===
  'vecteurs-2nde': Vecteurs2nde,
  'statistiques-2nde': Statistiques2nde,
  'equations-second-degre-2nde': EquationsSecondDegre2nde,
  'fonctions-reference-2nde': FonctionsReference2nde,
  'forces-equilibre-2nde': ForcesEquilibre2nde,
  'tableau-periodique-2nde': TableauPeriodique2nde,
  'mouvement-vitesse-2nde': MouvementVitesse2nde,
  'mole-concentration-2nde': MoleConcentration2nde,
  'cellule-animale-vegetale-2nde': CelluleAnimaleVegetale2nde,
  'adn-extraction-2nde': AdnExtraction2nde,
  'biodiversite-bandia-2nde': BiodiversiteBandia2nde,
  // === Première ===
  'derivees-1ere': Derivees1ere,
  'probabilites-1ere': Probabilites1ere,
  'suites-arith-geo-1ere': SuitesArithGeo1ere,
  'produit-scalaire-1ere': ProduitScalaire1ere,
  'energie-mecanique-1ere': EnergieMecanique1ere,
  'dosage-acide-base-1ere': DosageAcideBase1ere,
  'optique-miroirs-1ere': OptiqueMiroirs1ere,
  'chimie-organique-1ere': ChimieOrganique1ere,
  'tectonique-plaques-1ere': TectoniquePlaques1ere,
  'evolution-especes-1ere': EvolutionEspeces1ere,
  'hormones-1ere': Hormones1ere,
  'respiration-cellulaire-1ere': RespirationCellulaire1ere,
  // === Terminale ===
  'suites-terminale': SuitesTerminale,
  'integration-terminale': IntegrationTerminale,
  'exponentielle-log-terminale': ExponentielleLogTerminale,
  'geometrie-espace-terminale': GeometrieEspaceTerminale,
  'complexes-terminale': ComplexesTerminale,
  'mecanique-newton-terminale': MecaniqueNewtonTerminale,
  'cinetique-chimique-terminale': CinetiqueChimiqueTerminale,
  'circuit-rlc-terminale': CircuitRlcTerminale,
  'desintegration-radioactive-terminale': DesintegrationRadioactiveTerminale,
  'genetique-moleculaire-terminale': GenetiqueMoleculaireTerminale,
  'climat-terminale': ClimatTerminale,
  'vih-immunite-terminale': VihImmuniteTerminale,
  'meiose-mitose-terminale': MeioseMitoseTerminale,
};

export function getModule(slug: string): ComponentType<SimulationModuleProps> | null {
  return SIMULATION_MODULES[slug] ?? null;
}
