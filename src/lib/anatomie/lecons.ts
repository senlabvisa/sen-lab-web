/**
 * Leçons de l'atlas — le cours qui accompagne chaque pièce 3D.
 *
 * Deux registres, volontairement séparés :
 *  • `sections` : le cours structuré, à lire. Il suit la progression du
 *    programme (ce que c'est → comment c'est fait → comment ça marche → ce
 *    qu'il faut en retenir).
 *  • `fonctionnement` : le même organe raconté comme une suite d'étapes
 *    numérotées. C'est ce qu'un élève rejoue dans sa tête pendant un contrôle,
 *    et c'est ce que la vue 3D illustre pendant qu'on le lit.
 *
 * Le texte est écrit pour être lu par un élève de collège : phrases courtes,
 * pas de terme technique introduit sans être défini (les définitions vivent
 * dans `vocabulaire.ts`).
 */

import type { OrganeId } from './organes';

export type SectionLecon = {
  titre: string;
  /** Un ou plusieurs paragraphes. */
  paragraphes: string[];
};

export type EtapeFonctionnement = {
  titre: string;
  texte: string;
};

export type Lecon = {
  /** Phrase d'accroche : pourquoi cet organe mérite une heure de cours. */
  accroche: string;
  sections: SectionLecon[];
  fonctionnement: EtapeFonctionnement[];
  /** Trois phrases à retenir par cœur. */
  aRetenir: string[];
};

export const LECONS: Record<OrganeId, Lecon> = {
  coeur: {
    accroche:
      "Pose deux doigts sur ton poignet : ce que tu sens, c'est un muscle qui pousse le sang, sans s'arrêter, depuis avant ta naissance.",
    sections: [
      {
        titre: 'Un muscle creux, pas une simple poche',
        paragraphes: [
          "Le cœur est un muscle creux de la taille de ton poing, logé derrière le sternum et légèrement penché vers la gauche. Contrairement aux muscles de tes bras, il ne se fatigue jamais et ne reçoit aucun ordre volontaire : il bat tout seul, même quand tu dors.",
          "Sa paroi, le myocarde, est faite d'un muscle particulier qui se contracte de façon rythmée. Un tissu spécialisé, comme une horloge interne, déclenche chaque battement et le fait se propager à toutes les cavités dans le bon ordre.",
        ],
      },
      {
        titre: 'Quatre cavités, deux cœurs côte à côte',
        paragraphes: [
          "Le cœur contient quatre cavités : deux oreillettes en haut, qui reçoivent le sang, et deux ventricules en bas, qui l'expulsent. Une cloison épaisse sépare la moitié droite de la moitié gauche.",
          "Cette cloison est essentielle : elle empêche le sang pauvre en dioxygène (à droite) de se mélanger au sang riche en dioxygène (à gauche). On dit que le cœur est une double pompe : le cœur droit envoie vers les poumons, le cœur gauche vers tout le reste du corps.",
          "Le ventricule gauche a une paroi bien plus épaisse que le droit. C'est logique : le droit ne pousse le sang que jusqu'aux poumons, tout proches, tandis que le gauche doit l'envoyer jusqu'aux orteils.",
        ],
      },
      {
        titre: 'Des valves pour un sens unique',
        paragraphes: [
          "Entre chaque oreillette et son ventricule, puis à la sortie de chaque ventricule, se trouvent des valves. Ce sont des clapets souples qui ne s'ouvrent que dans un sens.",
          "Grâce à elles, le sang ne peut jamais repartir en arrière : il avance toujours dans le même sens, oreillette → ventricule → artère. Le bruit du cœur que l'on entend au stéthoscope, « toum-ta », est justement le claquement de ces valves qui se referment.",
        ],
      },
      {
        titre: 'Le débit cardiaque',
        paragraphes: [
          "À chaque battement, le ventricule gauche éjecte environ 70 millilitres de sang. Si le cœur bat 70 fois par minute, il envoie donc à peu près 70 × 70 = 4 900 millilitres, soit près de 5 litres par minute : l'équivalent de tout ton sang.",
          "Quand tu cours, la fréquence monte à 150 ou 180 battements par minute. Le débit augmente dans les mêmes proportions et tes muscles reçoivent bien plus de dioxygène. C'est exactement ce que tu mesures dans le TP sur la circulation sanguine.",
        ],
      },
    ],
    fonctionnement: [
      {
        titre: 'Le sang revient des organes',
        texte:
          "Pauvre en dioxygène, il arrive par les veines caves et remplit l'oreillette droite.",
      },
      {
        titre: "L'oreillette droite se contracte",
        texte: 'Elle pousse le sang dans le ventricule droit, à travers une valve.',
      },
      {
        titre: 'Le ventricule droit éjecte',
        texte:
          "Le sang part par l'artère pulmonaire vers les poumons. C'est la petite circulation.",
      },
      {
        titre: 'Les poumons rechargent le sang',
        texte:
          'Le sang y prend du dioxygène et rejette du dioxyde de carbone : il devient rouge vif.',
      },
      {
        titre: "Retour dans l'oreillette gauche",
        texte: 'Les veines pulmonaires ramènent le sang riche en dioxygène au cœur.',
      },
      {
        titre: 'Le ventricule gauche éjecte',
        texte:
          "Sa paroi épaisse propulse le sang dans l'aorte, vers tout le corps. C'est la grande circulation.",
      },
    ],
    aRetenir: [
      'Le cœur est une double pompe : le sang y passe deux fois par tour complet.',
      'La cloison empêche les deux sangs de se mélanger ; les valves imposent un sens unique.',
      'Débit cardiaque = volume éjecté par battement × fréquence cardiaque.',
    ],
  },

  cerveau: {
    accroche:
      "Un kilo et demi de tissu qui consomme un cinquième de ton énergie : tout ce que tu ressens, décides et retiens s'y fabrique.",
    sections: [
      {
        titre: 'Le centre de commande du corps',
        paragraphes: [
          "Le cerveau reçoit en permanence des messages venus des organes des sens : la lumière par les yeux, les sons par les oreilles, le toucher par la peau. Il les interprète, décide d'une réponse, puis envoie des ordres aux muscles.",
          "Il est protégé par les os du crâne, par trois enveloppes appelées méninges, et il baigne dans un liquide qui amortit les chocs. Cette protection est à la hauteur de sa fragilité : le tissu nerveux ne se répare presque pas.",
        ],
      },
      {
        titre: 'Des régions spécialisées',
        paragraphes: [
          "La surface du cerveau, très plissée, se divise en lobes qui n'ont pas le même métier. Le lobe frontal planifie et commande les mouvements volontaires. Le lobe pariétal rassemble les sensations. Le lobe temporal traite l'audition et la mémoire. Le lobe occipital, à l'arrière, s'occupe de la vision.",
          "En dessous, le cervelet assure l'équilibre et la précision des gestes. Le tronc cérébral, lui, commande les fonctions vitales : respiration, rythme du cœur. On peut vivre sans un morceau de lobe, jamais sans tronc cérébral.",
        ],
      },
      {
        titre: 'Le neurone, unité du message nerveux',
        paragraphes: [
          "Le tissu nerveux est fait de milliards de cellules appelées neurones. Chacune possède un long prolongement, l'axone, qui conduit un message électrique parfois sur plus d'un mètre.",
          "Deux neurones ne se touchent pas : entre eux existe un espace minuscule, la synapse. Le message y est transmis par une substance chimique. C'est ce relais chimique que perturbent l'alcool et de nombreuses drogues.",
        ],
      },
      {
        titre: 'Un organe qui apprend',
        paragraphes: [
          "Les connexions entre neurones se renforcent quand elles servent souvent, et s'affaiblissent quand elles ne servent plus. Apprendre, c'est littéralement modifier son cerveau.",
          "C'est pourquoi réviser plusieurs fois à quelques jours d'intervalle marche bien mieux que de tout relire la veille : chaque rappel renforce le chemin déjà tracé.",
        ],
      },
    ],
    fonctionnement: [
      {
        titre: 'Un stimulus est capté',
        texte:
          'Un organe des sens — œil, oreille, peau — transforme une information du milieu en message nerveux.',
      },
      {
        titre: 'Le message remonte',
        texte:
          'Il circule le long des nerfs sensitifs jusqu’à la moelle épinière puis au cerveau.',
      },
      {
        titre: 'Le cerveau interprète',
        texte:
          'La région spécialisée reconnaît l’information et la compare à ce qui est déjà en mémoire.',
      },
      {
        titre: 'Une décision est prise',
        texte: 'Le lobe frontal choisit la réponse adaptée à la situation.',
      },
      {
        titre: "L'ordre part vers les muscles",
        texte:
          'Les nerfs moteurs transportent la commande jusqu’aux muscles, qui se contractent.',
      },
      {
        titre: 'Le résultat est contrôlé',
        texte:
          'Le cervelet ajuste le geste en continu grâce aux informations qui remontent : c’est ce qui rend le mouvement précis.',
      },
    ],
    aRetenir: [
      'Le cerveau reçoit, interprète, décide et commande : c’est un centre de traitement, pas un simple relais.',
      'Chaque lobe a une spécialité ; le cervelet coordonne, le tronc cérébral maintient en vie.',
      'Le message nerveux est électrique dans le neurone, chimique au niveau de la synapse.',
    ],
  },

  poumons: {
    accroche:
      "Onze mille litres d'air par jour traversent deux organes si légers qu'ils flotteraient sur l'eau.",
    sections: [
      {
        titre: 'Le chemin de l’air',
        paragraphes: [
          "L'air entre par le nez, où il est réchauffé, humidifié et filtré. Il descend ensuite par la trachée, un tube maintenu ouvert par des anneaux de cartilage, puis se divise en deux bronches, une pour chaque poumon.",
          "À l'intérieur du poumon, les bronches se ramifient encore et encore, comme les branches d'un arbre, jusqu'à devenir des conduits microscopiques qui se terminent en petits sacs : les alvéoles.",
        ],
      },
      {
        titre: 'Les alvéoles, lieu de l’échange',
        paragraphes: [
          "Chaque poumon contient des centaines de millions d'alvéoles. Leur paroi est extrêmement fine et elles sont entourées d'un réseau serré de vaisseaux sanguins minuscules, les capillaires.",
          "Mises bout à bout, toutes ces alvéoles offriraient une surface d'échange de la taille d'un terrain de tennis, repliée dans ta cage thoracique. C'est ce pliage qui rend l'échange gazeux aussi efficace.",
          "Le dioxygène de l'air traverse la paroi et passe dans le sang ; le dioxyde de carbone fait le trajet inverse. Ce passage se fait tout seul, du milieu où le gaz est le plus concentré vers celui où il l'est le moins.",
        ],
      },
      {
        titre: 'Respirer : un travail de muscles',
        paragraphes: [
          "Les poumons ne contiennent aucun muscle : ils ne peuvent pas se gonfler seuls. C'est le diaphragme, un large muscle situé sous eux, qui fait tout le travail.",
          "Quand le diaphragme se contracte, il s'abaisse, la cage thoracique augmente de volume et l'air entre : c'est l'inspiration. Quand il se relâche, la cage se réduit et l'air est chassé : c'est l'expiration, qui, au repos, ne demande aucun effort.",
        ],
      },
      {
        titre: 'Deux poumons qui ne sont pas jumeaux',
        paragraphes: [
          "Le poumon droit compte trois lobes, le gauche seulement deux. La différence n'est pas un hasard : le poumon gauche laisse de la place au cœur, qui empiète sur son côté.",
          "L'air que nous respirons n'est pas toujours propre. La poussière de l'harmattan, la fumée des foyers de cuisine et celle du tabac irritent les bronches et abîment les alvéoles à la longue.",
        ],
      },
    ],
    fonctionnement: [
      {
        titre: 'Le diaphragme s’abaisse',
        texte: 'La cage thoracique s’agrandit et l’air est aspiré par le nez.',
      },
      {
        titre: 'L’air descend',
        texte: 'Trachée, puis bronches, puis conduits de plus en plus fins.',
      },
      {
        titre: 'Il atteint les alvéoles',
        texte: 'Des centaines de millions de petits sacs entourés de capillaires.',
      },
      {
        titre: 'Le dioxygène passe dans le sang',
        texte:
          'Il traverse la paroi très fine de l’alvéole et se fixe sur les globules rouges.',
      },
      {
        titre: 'Le dioxyde de carbone sort',
        texte: 'Il fait le trajet inverse, du sang vers l’alvéole.',
      },
      {
        titre: 'Le diaphragme se relâche',
        texte: 'La cage se réduit et l’air chargé en dioxyde de carbone est expiré.',
      },
    ],
    aRetenir: [
      "L'échange gazeux a lieu dans les alvéoles, jamais dans les bronches.",
      'Le sang se charge en dioxygène et se décharge en dioxyde de carbone.',
      'Ce sont les muscles respiratoires, surtout le diaphragme, qui font entrer l’air.',
    ],
  },

  foie: {
    accroche:
      "Plus de cinq cents métiers dans un seul organe — et le seul du corps humain capable de repousser.",
    sections: [
      {
        titre: 'Le plus gros organe interne',
        paragraphes: [
          "Le foie occupe toute la partie haute et droite de l'abdomen, juste sous le diaphragme. Il pèse environ un kilo et demi chez l'adulte, ce qui en fait le plus lourd des organes internes.",
          "Il reçoit du sang par deux voies : l'artère hépatique lui apporte du dioxygène, et la veine porte lui amène tout ce que l'intestin vient d'absorber. Rien de ce qui est digéré ne passe dans le corps sans être passé par le foie.",
        ],
      },
      {
        titre: 'Le trieur de nutriments',
        paragraphes: [
          "Après un repas, le sang venu de l'intestin est très riche en glucose. Le foie en met une partie en réserve sous forme de glycogène et laisse repartir le reste.",
          "Entre deux repas, il fait l'inverse : il défait ses réserves et libère du glucose dans le sang pour que le taux de sucre reste stable. C'est cette régulation qui t'évite de tomber en hypoglycémie pendant la nuit.",
        ],
      },
      {
        titre: 'Le laboratoire de détoxification',
        paragraphes: [
          "Le foie transforme les substances toxiques en produits que les reins pourront éliminer. C'est lui qui traite l'alcool, les médicaments et de nombreux déchets du corps.",
          "Cette capacité a une limite. Un excès régulier d'alcool ou certaines infections virales détruisent peu à peu les cellules du foie, qui sont remplacées par du tissu dur et inutile : c'est la cirrhose.",
        ],
      },
      {
        titre: 'La bile',
        paragraphes: [
          "Le foie fabrique en continu un liquide verdâtre, la bile, stocké dans la vésicule biliaire et déversé dans l'intestin au moment des repas.",
          "La bile ne digère rien elle-même : elle casse les grosses gouttes de graisse en gouttelettes minuscules, ce qui permet aux enzymes de travailler beaucoup plus vite. C'est le même principe que le savon sur de l'huile.",
        ],
      },
    ],
    fonctionnement: [
      {
        titre: 'Le repas est digéré',
        texte: 'L’intestin absorbe les nutriments et les fait passer dans le sang.',
      },
      {
        titre: 'La veine porte conduit au foie',
        texte: 'Tout le sang venu de l’intestin traverse le foie avant d’aller ailleurs.',
      },
      {
        titre: 'Le foie trie',
        texte:
          'Il garde ce qui est en excès, transforme ce qui doit l’être, laisse passer le reste.',
      },
      {
        titre: 'Il met en réserve',
        texte: 'Le glucose excédentaire est stocké sous forme de glycogène.',
      },
      {
        titre: 'Il neutralise les toxiques',
        texte:
          'Alcool, médicaments et déchets sont transformés en produits éliminables par les reins.',
      },
      {
        titre: 'Il libère de la bile',
        texte: 'Envoyée dans l’intestin, elle prépare les graisses à être digérées.',
      },
    ],
    aRetenir: [
      'Tout ce que l’intestin absorbe passe d’abord par le foie.',
      'Le foie stabilise le taux de sucre dans le sang en stockant puis en libérant du glucose.',
      'La bile ne digère pas : elle divise les graisses pour que les enzymes agissent.',
    ],
  },

  reins: {
    accroche:
      "Cent quatre-vingts litres filtrés par jour pour n'en éliminer qu'un seul et demi : les reins gardent presque tout.",
    sections: [
      {
        titre: 'Deux filtres en série avec le sang',
        paragraphes: [
          "Les reins sont deux organes en forme de haricot, placés de part et d'autre de la colonne vertébrale, juste sous les côtes. Chacun tient dans une main.",
          "Ils reçoivent une part énorme du sang qui sort du cœur. Ce sang y entre par l'artère rénale, y est filtré, puis en ressort nettoyé par la veine rénale.",
        ],
      },
      {
        titre: 'Le néphron, unité de filtration',
        paragraphes: [
          "Chaque rein contient environ un million d'unités microscopiques appelées néphrons. C'est là que tout se joue.",
          "Le néphron commence par filtrer le sang de façon grossière : l'eau, les sels, le glucose et les déchets passent, tandis que les cellules et les grosses protéines restent dans le sang. Puis, tout au long d'un long tube, l'organisme récupère ce qui lui est utile — presque toute l'eau et tout le glucose.",
          "Ce qui n'a pas été récupéré forme l'urine. C'est pour cela que le rein filtre 180 litres par jour mais n'élimine qu'un à deux litres : il reprend plus de 99 % de ce qu'il a filtré.",
        ],
      },
      {
        titre: 'Bien plus qu’un filtre',
        paragraphes: [
          "Les reins règlent aussi la quantité d'eau et de sel du corps. Si tu bois beaucoup, ils fabriquent une urine claire et abondante ; si tu transpires sous la chaleur, ils économisent l'eau et l'urine devient foncée et concentrée.",
          "Ils participent en outre au contrôle de la pression artérielle et déclenchent la fabrication des globules rouges. Un rein malade entraîne donc souvent de l'hypertension et une anémie.",
        ],
      },
      {
        titre: 'Ce qui les met en danger',
        paragraphes: [
          "Sous forte chaleur, le manque d'eau concentre l'urine et favorise la formation de calculs : de petits cailloux très douloureux à évacuer. Boire régulièrement, même sans soif, est la meilleure prévention.",
          "À long terme, le diabète et l'hypertension mal contrôlés sont les deux principales causes d'insuffisance rénale. Les reins s'abîment sans douleur : seuls une analyse d'urine et une prise de sang le détectent tôt.",
        ],
      },
    ],
    fonctionnement: [
      {
        titre: 'Le sang arrive',
        texte: 'L’artère rénale amène un sang chargé de déchets à filtrer.',
      },
      {
        titre: 'Filtration dans le néphron',
        texte:
          'Eau, sels, glucose et déchets passent ; cellules et grosses protéines restent dans le sang.',
      },
      {
        titre: 'Récupération de l’utile',
        texte:
          'Le long du tube, le corps reprend presque toute l’eau et tout le glucose.',
      },
      {
        titre: 'Concentration de l’urine',
        texte:
          'Dans la médulla, l’urine devient plus concentrée selon les besoins en eau du corps.',
      },
      {
        titre: 'Évacuation',
        texte: 'L’urine descend par l’uretère jusqu’à la vessie, où elle est stockée.',
      },
      {
        titre: 'Le sang repart propre',
        texte: 'La veine rénale ramène un sang débarrassé de ses déchets.',
      },
    ],
    aRetenir: [
      'Le rein filtre puis récupère : c’est la récupération qui détermine le volume d’urine.',
      'L’urine se concentre ou se dilue selon la quantité d’eau disponible.',
      'Diabète et hypertension sont les premières causes de maladie rénale.',
    ],
  },

  oeil: {
    accroche:
      "Une chambre noire de 24 millimètres qui transforme la lumière en image — puis en souvenir.",
    sections: [
      {
        titre: 'Le trajet de la lumière',
        paragraphes: [
          "La lumière entre par la cornée, la surface transparente et bombée à l'avant de l'œil. C'est elle qui la fait converger le plus fortement.",
          "Elle traverse ensuite la pupille, ce trou noir au centre de l'iris, puis le cristallin, une lentille souple. Elle vient enfin former une image sur la rétine, au fond de l'œil.",
        ],
      },
      {
        titre: 'Régler la lumière et la netteté',
        paragraphes: [
          "L'iris, la partie colorée, est un muscle : il agrandit la pupille dans la pénombre et la rétrécit en plein soleil. C'est un réflexe, tu ne le commandes pas.",
          "Le cristallin, lui, change de forme pour rendre nette une image proche ou lointaine : c'est l'accommodation. Avec l'âge il devient moins souple, et lire de près demande alors des lunettes.",
        ],
      },
      {
        titre: 'La rétine, un morceau de cerveau',
        paragraphes: [
          "La rétine contient des cellules sensibles à la lumière. Les unes fonctionnent en faible éclairage mais ne voient pas les couleurs ; les autres exigent beaucoup de lumière et distinguent les couleurs.",
          "Ces cellules transforment la lumière en messages nerveux. Le nerf optique les conduit jusqu'au cerveau, qui seul « voit » réellement. L'image formée sur la rétine est d'ailleurs à l'envers : c'est le cerveau qui la remet dans le bon sens.",
        ],
      },
      {
        titre: 'Protéger sa vue',
        paragraphes: [
          "La cornée ne contient aucun vaisseau sanguin — sinon elle ne serait pas transparente — et prend son dioxygène directement dans l'air.",
          "Deux causes de cécité sont très évitables : la cataracte, où le cristallin devient opaque et qui s'opère bien, et le trachome, une infection qui se transmet par les mains et les mouches et que l'hygiène du visage prévient efficacement.",
        ],
      },
    ],
    fonctionnement: [
      {
        titre: 'La lumière arrive sur la cornée',
        texte: 'Elle commence immédiatement à converger.',
      },
      {
        titre: 'L’iris dose la lumière',
        texte: 'La pupille se rétrécit s’il y a trop de lumière, s’ouvre s’il en manque.',
      },
      {
        titre: 'Le cristallin fait la mise au point',
        texte: 'Il se bombe pour le proche, s’aplatit pour le lointain.',
      },
      {
        titre: 'L’image se forme sur la rétine',
        texte: 'Renversée et plus petite que l’objet réel.',
      },
      {
        titre: 'La rétine convertit',
        texte: 'Les cellules sensibles transforment la lumière en message nerveux.',
      },
      {
        titre: 'Le cerveau interprète',
        texte:
          'Par le nerf optique, le message rejoint le cerveau, qui reconstruit l’image à l’endroit.',
      },
    ],
    aRetenir: [
      "L'œil forme l'image, mais c'est le cerveau qui voit.",
      "L'iris règle la quantité de lumière ; le cristallin règle la netteté.",
      "L'image formée sur la rétine est renversée.",
    ],
  },

  intestin: {
    accroche:
      "Sept mètres de tube replié, une surface d'absorption gigantesque et des milliards de micro-organismes qui travaillent pour toi.",
    sections: [
      {
        titre: 'Où finit la digestion',
        paragraphes: [
          "La digestion a commencé dans la bouche puis dans l'estomac, mais c'est dans l'intestin grêle qu'elle s'achève, sous l'action des sucs du pancréas et de la bile du foie.",
          "Les grosses molécules des aliments y sont découpées en nutriments assez petits pour traverser la paroi : les glucides en glucose, les protéines en acides aminés, les lipides en acides gras.",
        ],
      },
      {
        titre: 'Une surface repliée trois fois',
        paragraphes: [
          "La paroi de l'intestin grêle n'est pas lisse. Elle forme d'abord de grands replis, puis chaque repli est couvert de villosités — de minuscules doigts —, et chaque cellule de villosité porte encore des micro-plis.",
          "Ce triple repliement multiplie énormément la surface d'échange. Une longueur de tube d'à peine sept mètres offre ainsi une surface d'absorption équivalente à celle d'un appartement.",
          "Chaque villosité contient un vaisseau sanguin : les nutriments qui la traversent passent directement dans le sang, puis rejoignent le foie.",
        ],
      },
      {
        titre: 'Le gros intestin',
        paragraphes: [
          "Ce qui n'a pas été absorbé passe dans le côlon, le gros intestin. Son travail est simple mais vital : récupérer l'eau restante.",
          "Quand une infection accélère le transit, cette eau n'a plus le temps d'être récupérée : c'est la diarrhée, et le vrai danger n'est pas l'infection elle-même mais la déshydratation qu'elle provoque, surtout chez le jeune enfant.",
        ],
      },
      {
        titre: 'Le microbiote',
        paragraphes: [
          "Le côlon héberge des milliards de bactéries qui vivent en bonne entente avec nous. Elles digèrent des fibres que nous ne savons pas digérer et fabriquent certaines vitamines.",
          "La paroi de l'intestin se renouvelle en quelques jours seulement : c'est le tissu qui se régénère le plus vite du corps. Il le faut : il est agressé en permanence.",
        ],
      },
    ],
    fonctionnement: [
      {
        titre: 'Les aliments arrivent de l’estomac',
        texte: 'Réduits en bouillie acide, ils entrent dans le duodénum.',
      },
      {
        titre: 'Sucs et bile sont déversés',
        texte:
          'Le pancréas apporte les enzymes, le foie la bile qui divise les graisses.',
      },
      {
        titre: 'Les nutriments sont libérés',
        texte:
          'Les grosses molécules sont découpées en molécules assez petites pour passer.',
      },
      {
        titre: 'Absorption par les villosités',
        texte: 'Les nutriments traversent la paroi et passent dans le sang.',
      },
      {
        titre: 'Le côlon récupère l’eau',
        texte: 'Ce qui reste s’épaissit progressivement.',
      },
      {
        titre: 'Les déchets sont évacués',
        texte: 'Seul l’indigestible termine le trajet.',
      },
    ],
    aRetenir: [
      "L'absorption des nutriments a lieu dans l'intestin grêle, au niveau des villosités.",
      'Le repliement de la paroi multiplie la surface d’échange.',
      'Le gros intestin récupère l’eau : une diarrhée déshydrate avant tout.',
    ],
  },

  pancreas: {
    accroche:
      "Une glande discrète, deux métiers sans rapport, et l'hormone dont dépend ton taux de sucre à chaque instant.",
    sections: [
      {
        titre: 'Une glande à deux métiers',
        paragraphes: [
          "Le pancréas est allongé derrière l'estomac, en travers de l'abdomen. Il mesure une quinzaine de centimètres.",
          "Il exerce deux fonctions totalement différentes. La première, exocrine, occupe 98 % de sa masse : il fabrique un suc rempli d'enzymes qu'il déverse dans l'intestin par un canal. La seconde, endocrine, tient dans les 2 % restants : de petits amas de cellules, les îlots de Langerhans, libèrent des hormones directement dans le sang.",
        ],
      },
      {
        titre: 'Le suc pancréatique',
        paragraphes: [
          "Chaque jour, le pancréas produit environ un litre et demi de suc digestif. Ses enzymes savent découper les trois familles d'aliments : les glucides, les protéines et les lipides.",
          "Ce suc est aussi basique, ce qui neutralise l'acidité venue de l'estomac. Sans cette neutralisation, les enzymes de l'intestin ne pourraient pas travailler.",
        ],
      },
      {
        titre: 'Insuline et glucagon',
        paragraphes: [
          "Après un repas, le taux de sucre du sang monte. Le pancréas libère alors de l'insuline, qui fait entrer le glucose dans les cellules et le fait stocker par le foie : la glycémie redescend.",
          "Entre les repas, c'est l'inverse : le pancréas libère du glucagon, qui pousse le foie à relâcher du glucose. Les deux hormones travaillent en sens opposé, et c'est cet équilibre permanent qui maintient la glycémie autour d'une valeur stable.",
        ],
      },
      {
        titre: 'Le diabète',
        paragraphes: [
          "Quand ce réglage tombe en panne, le glucose s'accumule dans le sang : c'est le diabète. Dans le type 1, le pancréas ne fabrique plus d'insuline. Dans le type 2, il en fabrique mais le corps y répond mal.",
          "Le diabète de type 2 progresse rapidement dans les villes du Sénégal, en lien avec l'alimentation et la sédentarité. Une glycémie surveillée, une alimentation équilibrée et une activité physique régulière en limitent nettement les complications.",
        ],
      },
    ],
    fonctionnement: [
      {
        titre: 'Le repas est avalé',
        texte: 'Les aliments arrivent dans l’estomac, puis dans le duodénum.',
      },
      {
        titre: 'Le suc pancréatique est libéré',
        texte:
          'Il passe par le canal pancréatique, neutralise l’acidité et découpe les aliments.',
      },
      {
        titre: 'La glycémie monte',
        texte: 'Le glucose absorbé par l’intestin arrive dans le sang.',
      },
      {
        titre: 'Les îlots libèrent l’insuline',
        texte:
          'Elle fait entrer le glucose dans les cellules et le fait stocker par le foie.',
      },
      {
        titre: 'La glycémie redescend',
        texte: 'Elle revient vers sa valeur habituelle.',
      },
      {
        titre: 'Loin des repas, le glucagon prend le relais',
        texte: 'Il fait libérer les réserves du foie pour éviter la chute du taux de sucre.',
      },
    ],
    aRetenir: [
      'Le pancréas a deux fonctions : digestive (enzymes) et hormonale (insuline, glucagon).',
      'Insuline et glucagon agissent en sens opposé pour stabiliser la glycémie.',
      'Le diabète est un défaut de ce réglage, pas un simple excès de sucre alimentaire.',
    ],
  },

  peau: {
    accroche:
      "Deux mètres carrés d'organe vivant : ta barrière contre les microbes, ton thermostat et ton principal organe du toucher.",
    sections: [
      {
        titre: 'Le plus grand organe du corps',
        paragraphes: [
          "On oublie souvent que la peau est un organe. Étalée, elle couvrirait environ deux mètres carrés et pèse entre trois et cinq kilos : plus que le foie, plus que le cerveau.",
          "Elle est faite de trois couches superposées. L'épiderme, en surface, est une barrière imperméable renouvelée en permanence. Le derme, en dessous, contient les vaisseaux, les nerfs et les glandes. L'hypoderme, tout au fond, est une réserve de graisse qui isole et amortit.",
        ],
      },
      {
        titre: 'Une barrière contre les microbes',
        paragraphes: [
          "Tant qu'elle est intacte, la peau empêche les micro-organismes d'entrer : c'est la toute première ligne de défense de l'organisme, avant même le système immunitaire.",
          "Une plaie ouvre une brèche. C'est pourquoi une coupure doit être nettoyée puis protégée : ce n'est pas la blessure elle-même qui est dangereuse, mais ce qui peut entrer par là.",
        ],
      },
      {
        titre: 'Le thermostat du corps',
        paragraphes: [
          "Quand la température monte, les vaisseaux du derme se dilatent — la peau rougit — et les glandes sudoripares libèrent de la sueur. En s'évaporant, cette sueur emporte de la chaleur et refroidit le corps.",
          "Sous forte chaleur, c'est le principal moyen de refroidissement dont tu disposes. Encore faut-il avoir de l'eau à transpirer : boire suffisamment n'est pas un confort, c'est ce qui rend la régulation possible.",
        ],
      },
      {
        titre: 'L’organe du toucher',
        paragraphes: [
          "Le derme est truffé de terminaisons nerveuses spécialisées : les unes détectent la pression, d'autres la chaleur, d'autres encore la douleur.",
          "Elles ne sont pas réparties uniformément. Le bout des doigts et les lèvres en comptent énormément, le dos beaucoup moins : c'est pourquoi on reconnaît un objet au toucher avec les doigts, pas avec le coude.",
        ],
      },
    ],
    fonctionnement: [
      {
        titre: 'Un contact a lieu',
        texte: 'Un objet, une source de chaleur ou une piqûre atteint la surface.',
      },
      {
        titre: 'Les récepteurs du derme réagissent',
        texte: 'Chaque type de récepteur répond à ce qui le concerne.',
      },
      {
        titre: 'Le message part vers le cerveau',
        texte: 'Les nerfs sensitifs transportent l’information.',
      },
      {
        titre: 'La température est ajustée',
        texte:
          'S’il fait chaud, les vaisseaux se dilatent et les glandes libèrent de la sueur.',
      },
      {
        titre: 'La sueur s’évapore',
        texte: 'En s’évaporant, elle emporte de la chaleur : le corps refroidit.',
      },
      {
        titre: 'La barrière se répare',
        texte:
          'L’épiderme se renouvelle sans arrêt et referme les brèches en quelques jours.',
      },
    ],
    aRetenir: [
      'La peau est un organe à part entière, et le plus grand du corps.',
      'Épiderme, derme, hypoderme : trois couches, trois rôles différents.',
      "La transpiration est le principal moyen de refroidir le corps ; elle exige de l'eau.",
    ],
  },
};
