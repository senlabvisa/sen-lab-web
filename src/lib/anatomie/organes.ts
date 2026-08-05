/**
 * Atlas anatomique — le catalogue des organes explorables en 3D.
 *
 * Les modèles (`/anatomie/modeles/*.glb`) et les illustrations
 * (`/anatomie/images/<organe>/*.webp`) sont volontairement exclus du précache
 * du service worker (voir `next.config.mjs`) : l'élève les télécharge quand il
 * ouvre l'organe, ou d'un coup via « rendre disponible hors-ligne ».
 *
 * Les coordonnées des points d'intérêt sont exprimées dans le repère normalisé
 * de <Organe3D> : chaque modèle est ramené dans un cube d'arête TAILLE_NORMEE,
 * centré sur l'origine. Un point reste donc valable quelle que soit l'échelle
 * d'origine du fichier GLB.
 */

export type OrganeId =
  | 'coeur'
  | 'cerveau'
  | 'poumons'
  | 'foie'
  | 'reins'
  | 'oeil'
  | 'intestin'
  | 'pancreas'
  | 'peau';

/** Niveaux du programme sénégalais, du collège au lycée. */
export type Niveau = '6ème' | '5ème' | '4ème' | '3ème' | 'Seconde' | 'Première' | 'Terminale';

export type PointInteret = {
  id: string;
  /** Nom de la structure, tel qu'il figure au tableau. */
  label: string;
  /** Une phrase : ce que fait cette structure. */
  detail: string;
  position: [number, number, number];
  couleur: string;
};

/** Un TP du catalogue qui parle de cet organe. */
export type TpLie = {
  slug: string;
  titre: string;
  niveau: Niveau;
};

export type Organe = {
  id: OrganeId;
  nom: string;
  /** Nom latin, affiché comme légende de la pièce. */
  nomScientifique: string;
  appareil: string;
  /** Une image mentale à retenir. */
  formule: string;
  description: string;
  taille: string;
  masse: string;
  situation: string;
  role: string;
  chaqueJour: string;
  irrigation: string;
  /** Le fait qui reste en tête après le cours. */
  leSaviezVous: string;
  /** Ce que la coupe microscopique montre. */
  tissu: string;
  /** Repères de santé publique utiles au Sénégal. */
  sante: string;
  affections: string[];
  /** Couleur d'accent, reprise par la visionneuse et les pastilles. */
  accent: string;
  niveaux: Niveau[];
  tpLies: TpLie[];
  pointsInteret: PointInteret[];
};

export const ORGANES: Organe[] = [
  {
    id: 'coeur',
    nom: 'Cœur',
    nomScientifique: 'Cor',
    appareil: 'Appareil circulatoire',
    formule: 'La pompe infatigable',
    description:
      "Un muscle creux qui pousse le sang dans tout le corps et apporte le dioxygène et les nutriments à chaque cellule. Il est cloisonné : le sang riche et le sang pauvre en dioxygène ne se mélangent jamais.",
    taille: 'Environ la taille de ton poing fermé',
    masse: '250 à 350 g',
    situation: 'Derrière le sternum, un peu à gauche',
    role: 'Mettre le sang en mouvement',
    chaqueJour: 'Environ 100 000 battements',
    irrigation: 'Artères coronaires droite et gauche',
    leSaviezVous:
      "Il bat près de 2,5 milliards de fois dans une vie, et il a commencé avant même ta naissance.",
    tissu: 'Muscle cardiaque (myocarde)',
    sante:
      "L'hypertension artérielle est fréquente au Sénégal et fatigue le cœur en silence : la mesurer régulièrement est le meilleur dépistage.",
    affections: [
      'Hypertension artérielle',
      'Insuffisance cardiaque',
      'Rhumatisme articulaire aigu',
      'Troubles du rythme',
      'Maladie coronarienne',
      'Malformations cardiaques',
    ],
    accent: '#DC2626',
    niveaux: ['5ème', 'Seconde'],
    tpLies: [
      { slug: 'circulation-sanguine-5eme', titre: 'La double circulation sanguine', niveau: '5ème' },
      { slug: 'respiration-5eme', titre: 'La respiration et les échanges gazeux', niveau: '5ème' },
    ],
    pointsInteret: [
      { id: 'aorte', label: 'Aorte', detail: 'La grosse artère qui part vers tout le corps.', position: [-0.35, 1.65, 0.55], couleur: '#DC2626' },
      { id: 'oreillette-gauche', label: 'Oreillette gauche', detail: 'Elle reçoit le sang riche en dioxygène qui revient des poumons.', position: [0.82, 0.65, 0.5], couleur: '#F59E0B' },
      { id: 'oreillette-droite', label: 'Oreillette droite', detail: 'Elle reçoit le sang pauvre en dioxygène qui revient des organes.', position: [-0.9, 0.35, 0.55], couleur: '#2563EB' },
      { id: 'ventricule-gauche', label: 'Ventricule gauche', detail: 'Paroi épaisse : il envoie le sang dans tout le corps.', position: [0.7, -0.75, 0.65], couleur: '#F59E0B' },
      { id: 'ventricule-droit', label: 'Ventricule droit', detail: 'Il pousse le sang vers les poumons.', position: [-0.65, -0.68, 0.66], couleur: '#DC2626' },
      { id: 'mitrale', label: 'Valve mitrale', detail: 'Elle empêche le sang de repartir en arrière.', position: [0.18, -1.35, 0.48], couleur: '#D946A0' },
    ],
  },
  {
    id: 'cerveau',
    nom: 'Cerveau',
    nomScientifique: 'Encephalon',
    appareil: 'Système nerveux',
    formule: "Le centre de commande",
    description:
      "Il reçoit les messages des organes des sens, les interprète, décide, puis commande les muscles. Mémoire, langage, émotions et mouvements précis y sont organisés en régions spécialisées.",
    taille: 'À peu près deux poings serrés',
    masse: '1,3 à 1,4 kg',
    situation: 'Protégé par les os du crâne',
    role: 'Traiter les informations et commander',
    chaqueJour: "Il consomme environ 20 % de l'énergie du corps",
    irrigation: 'Artères carotides internes et vertébrales',
    leSaviezVous:
      "Le cerveau lui-même ne ressent pas la douleur : un mal de tête vient des tissus qui l'entourent.",
    tissu: 'Cortex cérébral',
    sante:
      "Le paludisme grave de l'enfant peut atteindre le cerveau (neuropaludisme) : toute fièvre avec convulsions est une urgence.",
    affections: [
      'Neuropaludisme',
      'Accident vasculaire cérébral',
      'Épilepsie',
      'Méningite',
      'Traumatisme crânien',
      'Migraine',
    ],
    accent: '#C58696',
    niveaux: ['3ème', 'Terminale'],
    tpLies: [
      { slug: 'systeme-nerveux-3eme', titre: 'Le système nerveux et le réflexe', niveau: '3ème' },
    ],
    pointsInteret: [
      { id: 'frontal', label: 'Lobe frontal', detail: 'Il planifie les actions et commande les mouvements volontaires.', position: [-0.7, 0.65, 0.8], couleur: '#DC2626' },
      { id: 'parietal', label: 'Lobe pariétal', detail: 'Il rassemble les sensations : toucher, chaleur, position du corps.', position: [0.15, 1.1, 0.65], couleur: '#F59E0B' },
      { id: 'temporal', label: 'Lobe temporal', detail: "Il traite l'audition et la mémoire.", position: [0.75, -0.1, 0.82], couleur: '#2563EB' },
      { id: 'cervelet', label: 'Cervelet', detail: "Il assure l'équilibre et la coordination des gestes.", position: [0.72, -0.9, 0.55], couleur: '#D946A0' },
    ],
  },
  {
    id: 'poumons',
    nom: 'Poumons',
    nomScientifique: 'Pulmones',
    appareil: 'Appareil respiratoire',
    formule: "Le souffle de la vie",
    description:
      "Deux organes souples où l'air rencontre le sang. Le dioxygène passe dans le sang, le dioxyde de carbone en sort : c'est l'échange gazeux, au fond de millions de minuscules alvéoles.",
    taille: 'Chacun mesure environ 25 cm de haut',
    masse: 'Environ 1 kg pour les deux',
    situation: 'De part et d’autre du cœur, dans la cage thoracique',
    role: 'Échanger le dioxygène et le dioxyde de carbone',
    chaqueJour: 'Environ 11 000 litres d’air déplacés',
    irrigation: 'Artères pulmonaires et bronchiques',
    leSaviezVous:
      "Le poumon droit a trois lobes et le gauche seulement deux : il laisse la place au cœur.",
    tissu: 'Alvéoles pulmonaires',
    sante:
      "La poussière de l'harmattan et la fumée des foyers de cuisine irritent les bronches : aérer et cuisiner à l'extérieur protège les plus jeunes.",
    affections: [
      'Asthme',
      'Tuberculose pulmonaire',
      'Pneumonie',
      'Bronchite',
      'Infections respiratoires aiguës',
      'Broncho-pneumopathie chronique',
    ],
    accent: '#DD8F8B',
    niveaux: ['5ème', 'Première'],
    tpLies: [
      { slug: 'respiration-5eme', titre: 'La respiration et les échanges gazeux', niveau: '5ème' },
      { slug: 'respiration-cellulaire-1ere', titre: 'La respiration cellulaire', niveau: 'Première' },
      { slug: 'circulation-sanguine-5eme', titre: 'La double circulation sanguine', niveau: '5ème' },
    ],
    pointsInteret: [
      { id: 'trachee', label: 'Trachée', detail: "Le conduit qui amène l'air venu du nez et de la bouche.", position: [0, 1.6, 0.2], couleur: '#2563EB' },
      { id: 'poumon-droit', label: 'Poumon droit', detail: 'Trois lobes.', position: [-1.2, 0.1, 0.7], couleur: '#DC2626' },
      { id: 'poumon-gauche', label: 'Poumon gauche', detail: 'Deux lobes : il laisse la place au cœur.', position: [1.2, 0.1, 0.7], couleur: '#F59E0B' },
      { id: 'bronche', label: 'Bronche', detail: "L'air se divise ici, comme les branches d'un arbre.", position: [-0.03, 0.3, 0.35], couleur: '#D946A0' },
      { id: 'base', label: 'Base du poumon', detail: 'Elle repose sur le diaphragme, le muscle de la respiration.', position: [-1.14, -1.2, 1], couleur: '#7FA88A' },
    ],
  },
  {
    id: 'foie',
    nom: 'Foie',
    nomScientifique: 'Hepar',
    appareil: 'Appareil digestif',
    formule: "L'usine chimique du corps",
    description:
      "Le plus gros organe interne. Il trie et transforme ce que l'intestin a absorbé, met en réserve le sucre, neutralise les substances toxiques et fabrique la bile qui aide à digérer les graisses.",
    taille: 'À peu près la taille d’un ballon de football',
    masse: '1,4 à 1,6 kg',
    situation: 'En haut à droite de l’abdomen',
    role: 'Transformer, mettre en réserve, détoxifier',
    chaqueJour: 'Il assure plus de 500 fonctions différentes',
    irrigation: 'Artère hépatique et veine porte',
    leSaviezVous:
      "C'est le seul organe humain capable de repousser jusqu'à sa taille normale à partir d'un fragment.",
    tissu: 'Lobules hépatiques',
    sante:
      "L'hépatite B est très répandue en Afrique de l'Ouest ; la vaccination à la naissance est le moyen le plus sûr de l'éviter.",
    affections: [
      'Hépatite B',
      'Hépatite virale A et C',
      'Cirrhose',
      'Stéatose (foie gras)',
      'Cancer du foie',
      'Lithiase biliaire',
    ],
    accent: '#B86858',
    niveaux: ['5ème', 'Seconde'],
    tpLies: [
      { slug: 'digestion-5eme', titre: 'La digestion des aliments', niveau: '5ème' },
      { slug: 'alimentation-animale-6eme', titre: "L'alimentation et les nutriments", niveau: '6ème' },
    ],
    pointsInteret: [
      { id: 'lobe-droit', label: 'Lobe droit', detail: 'Le plus volumineux des deux lobes.', position: [-0.75, 0.35, 0.75], couleur: '#DC2626' },
      { id: 'lobe-gauche', label: 'Lobe gauche', detail: 'Il passe de l’autre côté de la ligne médiane.', position: [0.85, 0.25, 0.75], couleur: '#F59E0B' },
      { id: 'veine-porte', label: 'Veine porte', detail: "Elle apporte au foie tout ce que l'intestin vient d'absorber.", position: [0.1, -0.3, 0.82], couleur: '#2563EB' },
    ],
  },
  {
    id: 'reins',
    nom: 'Reins',
    nomScientifique: 'Renes',
    appareil: 'Appareil urinaire',
    formule: 'Les filtres du sang',
    description:
      "Deux organes en forme de haricot qui filtrent le sang en continu : ils éliminent les déchets dans l'urine, gardent l'eau et les sels dont le corps a besoin et participent au réglage de la pression artérielle.",
    taille: 'Chacun tient dans une main',
    masse: '120 à 170 g chacun',
    situation: 'De part et d’autre de la colonne, sous les côtes',
    role: 'Filtrer le sang et fabriquer l’urine',
    chaqueJour: 'Environ 180 litres de liquide filtrés',
    irrigation: 'Artères rénales',
    leSaviezVous:
      "Ils récupèrent presque tout ce qu'ils filtrent : seul 1 à 2 litres quittent le corps sous forme d'urine.",
    tissu: 'Cortex rénal (néphrons)',
    sante:
      "Sous la chaleur, la déshydratation favorise les calculs rénaux : boire régulièrement, même sans soif, protège les reins.",
    affections: [
      'Calculs rénaux',
      'Insuffisance rénale chronique',
      'Infection urinaire',
      'Néphropathie de l’hypertension',
      'Néphropathie du diabète',
      'Glomérulonéphrite',
    ],
    accent: '#C96963',
    niveaux: ['5ème', 'Première'],
    tpLies: [
      { slug: 'hormones-1ere', titre: 'Les hormones et la régulation', niveau: 'Première' },
      { slug: 'circulation-sanguine-5eme', titre: 'La double circulation sanguine', niveau: '5ème' },
    ],
    pointsInteret: [
      { id: 'cortex', label: 'Cortex rénal', detail: 'La couche externe, où le sang est filtré.', position: [-0.9, 0.55, 0.7], couleur: '#DC2626' },
      { id: 'medulla', label: 'Médulla rénale', detail: "C'est ici que l'urine est concentrée.", position: [0.85, 0.2, 0.7], couleur: '#F59E0B' },
      { id: 'uretere', label: 'Uretère', detail: "Le tuyau qui conduit l'urine vers la vessie.", position: [0.4, -1.1, 0.5], couleur: '#2563EB' },
    ],
  },
  {
    id: 'oeil',
    nom: 'Œil',
    nomScientifique: 'Oculus',
    appareil: 'Organes des sens',
    formule: 'Une chambre noire vivante',
    description:
      "Il fait converger la lumière sur la rétine, comme une lentille sur un écran, puis transforme cette image en messages nerveux que le cerveau interprète. La pupille règle la quantité de lumière qui entre.",
    taille: 'Environ 24 mm de diamètre',
    masse: 'Environ 7,5 g',
    situation: 'Dans l’orbite, creusée dans les os du crâne',
    role: 'Capter la lumière et former une image',
    chaqueJour: 'Des milliers de micro-mouvements',
    irrigation: 'Artère ophtalmique',
    leSaviezVous:
      "La cornée ne contient aucun vaisseau sanguin : elle prend son dioxygène directement dans l'air.",
    tissu: 'Couches de la rétine',
    sante:
      "La cataracte et le trachome sont des causes évitables de cécité ; une consultation précoce sauve la vue.",
    affections: [
      'Cataracte',
      'Trachome',
      'Conjonctivite',
      'Glaucome',
      'Myopie',
      'Carence en vitamine A',
    ],
    accent: '#7294B9',
    niveaux: ['5ème', '4ème', 'Première'],
    tpLies: [
      { slug: 'optique-lentilles-4eme', titre: 'Les lentilles et la formation des images', niveau: '4ème' },
      { slug: 'sources-lumiere-5eme', titre: 'Sources de lumière et propagation', niveau: '5ème' },
      { slug: 'optique-miroirs-1ere', titre: 'Miroirs et réflexion', niveau: 'Première' },
    ],
    pointsInteret: [
      { id: 'cornee', label: 'Cornée', detail: 'La surface transparente qui commence à faire converger la lumière.', position: [-0.94, 0.05, 1.47], couleur: '#2563EB' },
      { id: 'iris', label: 'Iris', detail: "Il règle l'ouverture de la pupille selon la luminosité.", position: [-1.22, -0.53, 1.15], couleur: '#F59E0B' },
      { id: 'nerf-optique', label: 'Nerf optique', detail: 'Il transporte le message visuel jusqu’au cerveau.', position: [1.61, -0.18, 0.54], couleur: '#D946A0' },
    ],
  },
  {
    id: 'intestin',
    nom: 'Intestin',
    nomScientifique: 'Intestinum',
    appareil: 'Appareil digestif',
    formule: 'Le jardin intérieur',
    description:
      "Un long tube replié où la digestion s'achève : les nutriments passent dans le sang à travers une paroi tapissée de villosités. Le gros intestin récupère ensuite l'eau restante.",
    taille: 'Environ 6 à 7 m déroulé',
    masse: 'Variable selon son contenu',
    situation: 'Au centre et en bas de l’abdomen',
    role: 'Absorber les nutriments',
    chaqueJour: 'Il héberge des milliards de micro-organismes',
    irrigation: 'Artères mésentériques supérieure et inférieure',
    leSaviezVous:
      "Sa paroi se renouvelle en quelques jours seulement : c'est le tissu qui se régénère le plus vite du corps.",
    tissu: 'Villosités intestinales',
    sante:
      "Les diarrhées et les parasitoses restent une cause majeure de dénutrition chez l'enfant : eau potable et lavage des mains sont les premières barrières.",
    affections: [
      'Diarrhées infectieuses',
      'Parasitoses intestinales',
      'Fièvre typhoïde',
      'Amibiase',
      'Déshydratation',
      'Malnutrition par malabsorption',
    ],
    accent: '#D78B77',
    niveaux: ['6ème', '5ème'],
    tpLies: [
      { slug: 'digestion-5eme', titre: 'La digestion des aliments', niveau: '5ème' },
      { slug: 'alimentation-animale-6eme', titre: "L'alimentation et les nutriments", niveau: '6ème' },
    ],
    pointsInteret: [
      { id: 'duodenum', label: 'Duodénum', detail: 'Le début de l’intestin grêle, juste après l’estomac.', position: [0.6, 0.8, 0.75], couleur: '#F59E0B' },
      { id: 'jejunum', label: 'Jéjunum', detail: "La zone où l'essentiel des nutriments passe dans le sang.", position: [-0.45, 0.1, 0.82], couleur: '#DC2626' },
      { id: 'colon', label: 'Côlon', detail: "Le gros intestin : il récupère l'eau restante.", position: [0.75, -0.55, 0.72], couleur: '#2563EB' },
    ],
  },
  {
    id: 'pancreas',
    nom: 'Pancréas',
    nomScientifique: 'Pancreas',
    appareil: 'Système endocrinien',
    formule: 'Le régulateur discret',
    description:
      "Une glande à double métier : elle déverse des enzymes digestives dans l'intestin et libère dans le sang l'insuline et le glucagon, les deux hormones qui maintiennent la glycémie stable.",
    taille: 'Environ 15 cm de long',
    masse: '70 à 100 g',
    situation: 'Derrière l’estomac, en travers de l’abdomen',
    role: 'Digérer et régler le taux de sucre',
    chaqueJour: 'Environ 1,5 L de suc digestif',
    irrigation: 'Artères splénique et pancréatico-duodénales',
    leSaviezVous:
      "À peine 2 % de sa masse fabrique les hormones : tout le reste sert à la digestion.",
    tissu: 'Îlots de Langerhans et acini',
    sante:
      "Le diabète progresse vite en milieu urbain ; une glycémie contrôlée et une activité physique régulière en limitent les complications.",
    affections: [
      'Diabète de type 1',
      'Diabète de type 2',
      'Pancréatite',
      'Insuffisance pancréatique',
      'Cancer du pancréas',
      'Hypoglycémie',
    ],
    accent: '#C69A5E',
    niveaux: ['Première', 'Terminale'],
    tpLies: [
      { slug: 'hormones-1ere', titre: 'Les hormones et la régulation', niveau: 'Première' },
      { slug: 'digestion-5eme', titre: 'La digestion des aliments', niveau: '5ème' },
    ],
    pointsInteret: [
      { id: 'tete', label: 'Tête', detail: 'Elle est enchâssée dans la courbure du duodénum.', position: [-1.32, -0.36, 0.55], couleur: '#DC2626' },
      { id: 'corps', label: 'Corps', detail: 'Il traverse l’abdomen devant la colonne vertébrale.', position: [0.05, 0.25, 0.45], couleur: '#F59E0B' },
      { id: 'queue', label: 'Queue', detail: 'Elle s’avance jusqu’à la rate.', position: [1.55, 0.3, 0.35], couleur: '#2563EB' },
      { id: 'canal', label: 'Canal pancréatique', detail: 'Il conduit les enzymes vers l’intestin.', position: [-0.61, 0.39, 0.5], couleur: '#D946A0' },
    ],
  },
  {
    id: 'peau',
    nom: 'Peau',
    nomScientifique: 'Integumentum',
    appareil: 'Système tégumentaire',
    formule: 'La frontière vivante',
    description:
      "Le plus grand organe du corps. Elle forme une barrière contre les microbes, retient l'eau, informe le cerveau par le toucher et régule la température grâce à la sueur.",
    taille: 'Environ 2 m² étalée',
    masse: '3,5 à 5 kg',
    situation: 'Elle recouvre tout le corps',
    role: 'Protéger, sentir, refroidir',
    chaqueJour: 'Environ 500 millions de cellules éliminées',
    irrigation: 'Réseau vasculaire du derme',
    leSaviezVous:
      "Un seul centimètre carré peut contenir des centaines de glandes sudoripares et des mètres de vaisseaux.",
    tissu: 'Épiderme, derme et hypoderme',
    sante:
      "Sous forte chaleur, la sueur est le principal moyen de refroidissement : boire suffisamment évite le coup de chaleur.",
    affections: [
      'Gale',
      'Teignes et mycoses',
      'Eczéma',
      'Impétigo',
      'Brûlures',
      'Dépigmentation artificielle',
    ],
    accent: '#C99277',
    niveaux: ['3ème', 'Terminale'],
    tpLies: [
      { slug: 'systeme-immunitaire-3eme', titre: 'Le système immunitaire et les barrières', niveau: '3ème' },
      { slug: 'cellule-animale-vegetale-2nde', titre: 'La cellule animale et végétale', niveau: 'Seconde' },
    ],
    pointsInteret: [
      { id: 'epiderme', label: 'Épiderme', detail: 'La couche externe, imperméable et renouvelée en permanence.', position: [-0.05, 0.88, 1.4], couleur: '#DC2626' },
      { id: 'derme', label: 'Derme', detail: 'Il contient les nerfs, les vaisseaux et les glandes sudoripares.', position: [0.29, 0.05, 1.4], couleur: '#F59E0B' },
      { id: 'hypoderme', label: 'Hypoderme', detail: 'La réserve de graisse, qui isole et amortit les chocs.', position: [-0.39, -1.15, 1.4], couleur: '#2563EB' },
      { id: 'follicule', label: 'Follicule pileux', detail: 'Chaque poil y prend racine.', position: [0.89, -0.44, 1.4], couleur: '#D946A0' },
    ],
  },
];

export const ORGANE_PAR_ID = Object.fromEntries(
  ORGANES.map((organe) => [organe.id, organe]),
) as Record<OrganeId, Organe>;

/** Chemin du modèle 3D d'un organe. */
export function modeleUrl(id: OrganeId): string {
  return `/anatomie/modeles/${id}.glb`;
}

/** Chemin d'une illustration. `organ` = la planche principale. */
export function imageUrl(
  id: OrganeId,
  vue: 'thumb' | 'organ' | 'microscopic' | 'compare' | 'location',
): string {
  return `/anatomie/images/${id}/${vue}.webp`;
}

/** Les organes qu'un TP donné permet d'explorer, pour le lien TP → atlas. */
export function organesDuTp(slug: string): Organe[] {
  return ORGANES.filter((organe) => organe.tpLies.some((tp) => tp.slug === slug));
}
