/**
 * Comparaisons de l'atlas — un organe mis en regard d'un autre.
 *
 * Comparer n'est pas un exercice décoratif : deux organes qu'on croit
 * ressemblants se distinguent par une différence précise, et c'est cette
 * différence qui fait comprendre le rôle de chacun. On choisit donc toujours
 * un organe de référence avec lequel la confusion est PLAUSIBLE (foie/reins,
 * poumons/cœur), jamais un organe pris au hasard.
 *
 * La `question` en tête est celle à laquelle le tableau répond.
 */

import type { OrganeId } from './organes';

export type LigneComparaison = {
  critere: string;
  /** Valeur pour l'organe courant. */
  ici: string;
  /** Valeur pour l'organe de référence. */
  autre: string;
};

export type Comparaison = {
  /** L'organe de référence. */
  avec: OrganeId;
  question: string;
  lignes: LigneComparaison[];
  /** Ce qu'il faut avoir compris en sortant du tableau. */
  conclusion: string;
};

export const COMPARAISONS: Record<OrganeId, Comparaison> = {
  coeur: {
    avec: 'poumons',
    question: 'Le cœur et les poumons travaillent ensemble : qui fait quoi exactement ?',
    lignes: [
      { critere: 'Rôle principal', ici: 'Mettre le sang en mouvement', autre: 'Charger le sang en dioxygène' },
      { critere: 'Type d’organe', ici: 'Muscle creux', autre: 'Organe souple, sans muscle propre' },
      { critere: 'Bouge de lui-même ?', ici: 'Oui, il bat sans commande volontaire', autre: 'Non, le diaphragme le fait bouger' },
      { critere: 'Ce qui y circule', ici: 'Du sang uniquement', autre: 'De l’air d’un côté, du sang de l’autre' },
      { critere: 'Si l’organe s’arrête', ici: 'Le sang ne circule plus', autre: 'Le sang circule mais n’est plus oxygéné' },
    ],
    conclusion:
      'Le cœur transporte, les poumons rechargent. Aucun des deux ne sert à rien sans l’autre : c’est pour cela qu’on parle d’appareil cardio-respiratoire.',
  },

  cerveau: {
    avec: 'coeur',
    question: 'Deux organes vitaux : pourquoi ne peut-on remplacer ni l’un ni l’autre ?',
    lignes: [
      { critere: 'Rôle principal', ici: 'Traiter l’information et commander', autre: 'Pomper le sang' },
      { critere: 'Fonctionne sur ordre ?', ici: 'Il donne les ordres', autre: 'Il bat de lui-même, sans ordre' },
      { critere: 'Consommation d’énergie', ici: 'Environ 20 % de l’énergie du corps', autre: 'Beaucoup moins, mais en continu' },
      { critere: 'Se répare ?', ici: 'Très peu : le tissu nerveux se régénère mal', autre: 'Partiellement, mais une zone détruite ne revient pas' },
      { critere: 'Réserve d’oxygène', ici: 'Quelques secondes seulement', autre: 'Dépend de son propre approvisionnement coronaire' },
    ],
    conclusion:
      'Le cœur alimente le cerveau, mais c’est le tronc cérébral qui règle le rythme du cœur. Chacun dépend de l’autre : la boucle est fermée.',
  },

  poumons: {
    avec: 'intestin',
    question: 'Deux surfaces d’échange géantes repliées dans le corps : quelle différence ?',
    lignes: [
      { critere: 'Ce qui est échangé', ici: 'Des gaz : O₂ et CO₂', autre: 'Des nutriments issus des aliments' },
      { critere: 'Structure d’échange', ici: 'Alvéoles', autre: 'Villosités' },
      { critere: 'Sens du passage', ici: 'Dans les deux sens à la fois', autre: 'Surtout de l’intestin vers le sang' },
      { critere: 'Moteur du passage', ici: 'Différence de concentration des gaz', autre: 'Transport actif à travers la paroi' },
      { critere: 'Destination immédiate', ici: 'Le cœur, puis tout le corps', autre: 'Le foie, par la veine porte' },
    ],
    conclusion:
      'Même principe — replier une immense surface dans un petit volume — mais deux contenus différents. Retenir le principe permet de comprendre les deux d’un coup.',
  },

  foie: {
    avec: 'reins',
    question: 'Foie et reins nettoient tous les deux le sang : où est la différence ?',
    lignes: [
      { critere: 'Mode d’action', ici: 'Il transforme chimiquement', autre: 'Ils filtrent mécaniquement' },
      { critere: 'Ce qui en sort', ici: 'Des produits transformés, remis dans le sang', autre: 'De l’urine, évacuée du corps' },
      { critere: 'Autres fonctions', ici: 'Réserve de sucre, bile, protéines du sang', autre: 'Réglage de l’eau, du sel et de la pression' },
      { critere: 'Nombre', ici: 'Un seul', autre: 'Deux' },
      { critere: 'Régénération', ici: 'Il repousse à partir d’un fragment', autre: 'Les néphrons détruits ne se remplacent pas' },
    ],
    conclusion:
      'Le foie transforme, les reins éliminent — et le second travaille souvent sur ce que le premier vient de préparer. Ils se suivent dans la chaîne, ils ne font pas doublon.',
  },

  reins: {
    avec: 'foie',
    question: 'Pourquoi ne peut-on pas dire que les reins « nettoient » le sang comme le foie ?',
    lignes: [
      { critere: 'Mode d’action', ici: 'Filtration puis récupération', autre: 'Transformation chimique' },
      { critere: 'Déchet type traité', ici: 'L’urée, éliminée dans l’urine', autre: 'L’alcool, les médicaments' },
      { critere: 'Produit final', ici: 'L’urine, qui quitte le corps', autre: 'Des molécules remises en circulation' },
      { critere: 'Réglage de l’eau', ici: 'Oui, c’est leur rôle central', autre: 'Non' },
      { critere: 'Suppléance possible', ici: 'Oui : la dialyse remplace la filtration', autre: 'Non : aucune machine ne remplace le foie' },
    ],
    conclusion:
      'Les reins font sortir, le foie transforme. Une machine sait filtrer le sang ; aucune ne sait faire les cinq cents métiers du foie.',
  },

  oeil: {
    avec: 'cerveau',
    question: 'L’œil voit-il, ou seulement le cerveau ?',
    lignes: [
      { critere: 'Ce qu’il fait', ici: 'Il capte la lumière et la convertit', autre: 'Il interprète le message reçu' },
      { critere: 'Nature du signal', ici: 'Lumière, puis message nerveux', autre: 'Message nerveux uniquement' },
      { critere: 'Image formée', ici: 'Renversée sur la rétine', autre: 'Remise à l’endroit par le cerveau' },
      { critere: 'Que se passe-t-il en cas de lésion ?', ici: 'La vue baisse mais l’image reste interprétable', autre: 'On peut voir sans reconnaître ce qu’on voit' },
      { critere: 'Lien entre les deux', ici: 'Le nerf optique part de la rétine', autre: 'La rétine est un prolongement du système nerveux' },
    ],
    conclusion:
      'L’œil est un capteur, pas un spectateur. La vision est un travail commun, et la rétine appartient déjà, embryologiquement, au système nerveux.',
  },

  intestin: {
    avec: 'foie',
    question: 'L’intestin absorbe, le foie trie : dans quel ordre et pourquoi ?',
    lignes: [
      { critere: 'Position dans la chaîne', ici: 'Premier : il fait entrer les nutriments', autre: 'Deuxième : il reçoit tout ce qui est entré' },
      { critere: 'Action sur les aliments', ici: 'Découpe puis absorbe', autre: 'Transforme et met en réserve' },
      { critere: 'Structure clé', ici: 'Les villosités', autre: 'Les lobules hépatiques' },
      { critere: 'Vaisseau de liaison', ici: 'Il déverse dans la veine porte', autre: 'Il reçoit par la veine porte' },
      { critere: 'Micro-organismes', ici: 'Des milliards, utiles', autre: 'Aucun en situation normale' },
    ],
    conclusion:
      'Aucun nutriment ne rejoint le corps sans passer par ce couple : l’intestin ouvre la porte, le foie contrôle ce qui passe.',
  },

  pancreas: {
    avec: 'foie',
    question: 'Les deux règlent la glycémie : lequel décide, lequel exécute ?',
    lignes: [
      { critere: 'Rôle dans la glycémie', ici: 'Il donne l’ordre (insuline, glucagon)', autre: 'Il exécute : il stocke ou libère' },
      { critere: 'Moyen d’action', ici: 'Des hormones, par le sang', autre: 'Une transformation chimique interne' },
      { critere: 'Rôle digestif', ici: 'Il fournit les enzymes', autre: 'Il fournit la bile' },
      { critere: 'Taille', ici: 'Environ 15 cm, 70 à 100 g', autre: 'Le plus gros organe interne, 1,5 kg' },
      { critere: 'Si l’organe faiblit', ici: 'Diabète', autre: 'Cirrhose, troubles de la coagulation' },
    ],
    conclusion:
      'Le pancréas commande, le foie obéit. Comprendre ce couple, c’est comprendre le diabète : l’ordre n’est plus donné, ou n’est plus entendu.',
  },

  peau: {
    avec: 'intestin',
    question: 'Deux frontières entre le corps et l’extérieur : que laissent-elles passer ?',
    lignes: [
      { critere: 'Ce qui doit passer', ici: 'Presque rien', autre: 'Les nutriments, en grande quantité' },
      { critere: 'Surface', ici: 'Environ 2 m²', autre: 'Beaucoup plus, grâce au repliement' },
      { critere: 'Renouvellement', ici: 'Quelques semaines', autre: 'Quelques jours seulement' },
      { critere: 'Rôle immunitaire', ici: 'Première barrière contre les microbes', autre: 'Tolère les bactéries utiles, bloque les autres' },
      { critere: 'Autre fonction majeure', ici: 'Régulation de la température', autre: 'Récupération de l’eau' },
    ],
    conclusion:
      'Une frontière ferme et une frontière sélective. La peau protège en bloquant ; l’intestin protège tout en laissant passer — c’est bien plus difficile.',
  },
};
