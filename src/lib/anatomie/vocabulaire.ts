/**
 * Vocabulaire de l'atlas — les mots que l'élève doit pouvoir définir.
 *
 * Les leçons emploient ces termes sans les définir en ligne : c'est ici qu'on
 * les explique, une fois, en une phrase. L'élève y revient quand un mot du
 * cours lui échappe, et l'enseignant y trouve la formulation attendue au
 * contrôle.
 */

import type { OrganeId } from './organes';

export type MotCle = {
  terme: string;
  definition: string;
};

export const VOCABULAIRE: Record<OrganeId, MotCle[]> = {
  coeur: [
    { terme: 'Myocarde', definition: 'Le muscle qui forme la paroi du cœur et qui se contracte à chaque battement.' },
    { terme: 'Oreillette', definition: 'Cavité supérieure du cœur, qui reçoit le sang arrivant par les veines.' },
    { terme: 'Ventricule', definition: 'Cavité inférieure du cœur, qui expulse le sang dans une artère.' },
    { terme: 'Artère', definition: 'Vaisseau qui part du cœur. Une artère n’est donc pas définie par la couleur du sang qu’elle porte.' },
    { terme: 'Veine', definition: 'Vaisseau qui ramène le sang vers le cœur.' },
    { terme: 'Débit cardiaque', definition: 'Volume de sang envoyé par le cœur en une minute : volume éjecté × fréquence.' },
  ],
  cerveau: [
    { terme: 'Neurone', definition: 'Cellule du tissu nerveux, capable de conduire un message électrique.' },
    { terme: 'Axone', definition: 'Long prolongement du neurone qui transporte le message, parfois sur plus d’un mètre.' },
    { terme: 'Synapse', definition: 'Espace minuscule entre deux neurones, où le message devient chimique.' },
    { terme: 'Lobe', definition: 'Grande région du cerveau spécialisée dans un type de traitement.' },
    { terme: 'Cervelet', definition: 'Structure située sous le cerveau, chargée de l’équilibre et de la précision des gestes.' },
    { terme: 'Stimulus', definition: 'Toute modification du milieu capable de déclencher un message nerveux.' },
  ],
  poumons: [
    { terme: 'Alvéole', definition: 'Petit sac au fond du poumon, où se fait l’échange entre l’air et le sang.' },
    { terme: 'Bronche', definition: 'Conduit qui amène l’air dans le poumon et se ramifie comme un arbre.' },
    { terme: 'Diaphragme', definition: 'Large muscle situé sous les poumons ; sa contraction fait entrer l’air.' },
    { terme: 'Capillaire', definition: 'Vaisseau sanguin microscopique, si fin que les échanges peuvent le traverser.' },
    { terme: 'Échange gazeux', definition: 'Passage du dioxygène vers le sang et du dioxyde de carbone vers l’air.' },
    { terme: 'Inspiration', definition: 'Entrée de l’air, provoquée par l’agrandissement de la cage thoracique.' },
  ],
  foie: [
    { terme: 'Veine porte', definition: 'Veine qui conduit au foie tout le sang chargé des nutriments de l’intestin.' },
    { terme: 'Glycogène', definition: 'Forme sous laquelle le foie met le glucose en réserve.' },
    { terme: 'Bile', definition: 'Liquide fabriqué par le foie, qui divise les graisses en fines gouttelettes.' },
    { terme: 'Détoxification', definition: 'Transformation d’une substance toxique en produit que les reins peuvent éliminer.' },
    { terme: 'Cirrhose', definition: 'Remplacement progressif du tissu du foie par un tissu dur et non fonctionnel.' },
    { terme: 'Glycémie', definition: 'Taux de glucose présent dans le sang.' },
  ],
  reins: [
    { terme: 'Néphron', definition: 'Unité microscopique de filtration du rein ; il y en a environ un million par rein.' },
    { terme: 'Filtration', definition: 'Passage de l’eau, des sels et des déchets hors du sang, les cellules restant à l’intérieur.' },
    { terme: 'Réabsorption', definition: 'Récupération, par l’organisme, de l’eau et des substances utiles déjà filtrées.' },
    { terme: 'Urée', definition: 'Déchet issu de la transformation des protéines, éliminé par l’urine.' },
    { terme: 'Uretère', definition: 'Conduit qui mène l’urine du rein à la vessie.' },
    { terme: 'Insuffisance rénale', definition: 'Perte progressive de la capacité des reins à filtrer le sang.' },
  ],
  oeil: [
    { terme: 'Cornée', definition: 'Surface transparente et bombée à l’avant de l’œil ; elle fait converger la lumière.' },
    { terme: 'Pupille', definition: 'Ouverture au centre de l’iris par laquelle la lumière entre.' },
    { terme: 'Cristallin', definition: 'Lentille souple qui change de forme pour faire la mise au point.' },
    { terme: 'Rétine', definition: 'Membrane au fond de l’œil qui transforme la lumière en message nerveux.' },
    { terme: 'Accommodation', definition: 'Changement de forme du cristallin qui rend nette une image proche ou lointaine.' },
    { terme: 'Nerf optique', definition: 'Nerf qui conduit le message visuel de la rétine jusqu’au cerveau.' },
  ],
  intestin: [
    { terme: 'Villosité', definition: 'Petit repli en forme de doigt qui tapisse l’intestin grêle et multiplie la surface d’absorption.' },
    { terme: 'Nutriment', definition: 'Molécule assez petite, issue de la digestion, capable de traverser la paroi intestinale.' },
    { terme: 'Absorption', definition: 'Passage des nutriments de l’intestin vers le sang.' },
    { terme: 'Enzyme', definition: 'Substance qui découpe les grosses molécules des aliments sans être consommée.' },
    { terme: 'Côlon', definition: 'Gros intestin ; il récupère l’eau restante avant l’évacuation.' },
    { terme: 'Microbiote', definition: 'Ensemble des bactéries qui vivent dans l’intestin et travaillent avec l’organisme.' },
  ],
  pancreas: [
    { terme: 'Îlots de Langerhans', definition: 'Petits amas de cellules du pancréas qui libèrent les hormones dans le sang.' },
    { terme: 'Insuline', definition: 'Hormone qui fait baisser la glycémie en faisant entrer le glucose dans les cellules.' },
    { terme: 'Glucagon', definition: 'Hormone qui fait remonter la glycémie en libérant les réserves du foie.' },
    { terme: 'Hormone', definition: 'Message chimique libéré dans le sang, qui agit à distance sur un organe cible.' },
    { terme: 'Suc pancréatique', definition: 'Liquide riche en enzymes déversé dans l’intestin ; il neutralise aussi l’acidité de l’estomac.' },
    { terme: 'Diabète', definition: 'Maladie caractérisée par une glycémie durablement trop élevée.' },
  ],
  peau: [
    { terme: 'Épiderme', definition: 'Couche superficielle de la peau, imperméable et renouvelée en permanence.' },
    { terme: 'Derme', definition: 'Couche intermédiaire, qui contient vaisseaux, nerfs et glandes.' },
    { terme: 'Hypoderme', definition: 'Couche profonde faite de graisse ; elle isole et amortit les chocs.' },
    { terme: 'Glande sudoripare', definition: 'Glande du derme qui fabrique la sueur.' },
    { terme: 'Follicule pileux', definition: 'Petite cavité de la peau dans laquelle un poil prend racine.' },
    { terme: 'Récepteur sensoriel', definition: 'Terminaison nerveuse qui détecte la pression, la chaleur ou la douleur.' },
  ],
};
