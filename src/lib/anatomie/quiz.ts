/**
 * Quiz de l'atlas — cinq questions par organe.
 *
 * Règles suivies pour que le quiz apprenne quelque chose au lieu de trier :
 *  • Les mauvaises réponses sont des ERREURS COURANTES, pas des absurdités.
 *    Cocher « les poumons se gonflent tout seuls » est une confusion réelle
 *    d'élève ; « les poumons fabriquent le sang » n'aurait rien testé.
 *  • Chaque question a une `explication`, affichée quelle que soit la réponse :
 *    l'élève qui a juste par chance apprend autant que celui qui s'est trompé.
 *  • Aucune question ne porte sur un détail de vocabulaire latin. On teste la
 *    compréhension du fonctionnement.
 */

import type { OrganeId } from './organes';

export type OptionQuiz = {
  id: string;
  texte: string;
};

export type QuestionQuiz = {
  id: string;
  question: string;
  options: OptionQuiz[];
  bonneReponse: string;
  explication: string;
};

export const QUIZ: Record<OrganeId, QuestionQuiz[]> = {
  coeur: [
    {
      id: 'cavites',
      question: 'Combien de cavités le cœur humain compte-t-il ?',
      options: [
        { id: 'deux', texte: 'Deux : une oreillette et un ventricule' },
        { id: 'quatre', texte: 'Quatre : deux oreillettes et deux ventricules' },
        { id: 'trois', texte: 'Trois : deux oreillettes et un ventricule' },
      ],
      bonneReponse: 'quatre',
      explication:
        "Quatre cavités : les deux oreillettes reçoivent le sang, les deux ventricules l'expulsent. Une cloison sépare la moitié droite de la moitié gauche.",
    },
    {
      id: 'cloison',
      question: 'À quoi sert la cloison qui sépare le cœur droit du cœur gauche ?',
      options: [
        { id: 'solidite', texte: 'À rendre le muscle cardiaque plus solide' },
        { id: 'melange', texte: 'À empêcher les deux sangs de se mélanger' },
        { id: 'vitesse', texte: 'À accélérer le passage du sang' },
      ],
      bonneReponse: 'melange',
      explication:
        "Le sang pauvre en dioxygène circule à droite, le sang riche à gauche. Si les deux se mélangeaient, le sang envoyé aux organes serait moins bien oxygéné.",
    },
    {
      id: 'paroi',
      question: 'Pourquoi la paroi du ventricule gauche est-elle plus épaisse que celle du droit ?',
      options: [
        { id: 'distance', texte: 'Parce qu’il doit envoyer le sang dans tout le corps' },
        { id: 'volume', texte: 'Parce qu’il contient beaucoup plus de sang' },
        { id: 'protection', texte: 'Parce qu’il est plus exposé aux chocs' },
      ],
      bonneReponse: 'distance',
      explication:
        "Le ventricule droit ne pousse le sang que jusqu'aux poumons, tout proches. Le gauche doit l'envoyer jusqu'aux pieds : il lui faut bien plus de force, donc un muscle plus épais.",
    },
    {
      id: 'debit',
      question:
        'Un cœur bat 80 fois par minute et éjecte 70 mL à chaque battement. Quel est son débit ?',
      options: [
        { id: '56', texte: 'Environ 5,6 L par minute' },
        { id: '150', texte: 'Environ 150 mL par minute' },
        { id: '80', texte: 'Environ 80 L par minute' },
      ],
      bonneReponse: '56',
      explication:
        'Débit = volume éjecté × fréquence, soit 70 × 80 = 5 600 mL, c’est-à-dire 5,6 litres par minute.',
    },
    {
      id: 'valves',
      question: 'Quel est le rôle des valves cardiaques ?',
      options: [
        { id: 'sens', texte: 'Empêcher le sang de repartir en arrière' },
        { id: 'filtre', texte: 'Filtrer les impuretés du sang' },
        { id: 'oxygene', texte: 'Charger le sang en dioxygène' },
      ],
      bonneReponse: 'sens',
      explication:
        "Ce sont des clapets qui ne s'ouvrent que dans un sens. Le bruit du cœur, « toum-ta », est le claquement de ces valves qui se referment.",
    },
  ],

  cerveau: [
    {
      id: 'role',
      question: 'Quel est le rôle principal du cerveau ?',
      options: [
        { id: 'transmettre', texte: 'Transmettre les messages sans les modifier' },
        { id: 'traiter', texte: 'Recevoir, interpréter, décider et commander' },
        { id: 'produire', texte: 'Produire l’énergie dont le corps a besoin' },
      ],
      bonneReponse: 'traiter',
      explication:
        "Le cerveau n'est pas un simple relais : il interprète les informations reçues, les compare à sa mémoire, décide d'une réponse et commande les muscles.",
    },
    {
      id: 'cervelet',
      question: 'À quoi sert le cervelet ?',
      options: [
        { id: 'equilibre', texte: 'À l’équilibre et à la coordination des gestes' },
        { id: 'memoire', texte: 'À stocker les souvenirs anciens' },
        { id: 'vue', texte: 'À traiter les images venues des yeux' },
      ],
      bonneReponse: 'equilibre',
      explication:
        "Le cervelet ajuste les mouvements en continu. C'est lui qui rend un geste précis au lieu d'être approximatif.",
    },
    {
      id: 'synapse',
      question: 'Comment le message passe-t-il d’un neurone au suivant ?',
      options: [
        { id: 'contact', texte: 'Les deux neurones se touchent directement' },
        { id: 'chimique', texte: 'Par une substance chimique libérée dans la synapse' },
        { id: 'sang', texte: 'Par le sang qui circule entre eux' },
      ],
      bonneReponse: 'chimique',
      explication:
        "Les neurones ne se touchent pas : un espace minuscule, la synapse, les sépare. Le message y devient chimique avant de redevenir électrique dans le neurone suivant.",
    },
    {
      id: 'douleur',
      question: 'Pourquoi dit-on que le cerveau lui-même ne ressent pas la douleur ?',
      options: [
        { id: 'protege', texte: 'Parce que le crâne le protège de tout' },
        { id: 'recepteurs', texte: 'Parce qu’il ne possède pas de récepteurs de la douleur' },
        { id: 'endormi', texte: 'Parce qu’il est insensible pendant le sommeil' },
      ],
      bonneReponse: 'recepteurs',
      explication:
        "Le tissu cérébral n'a pas de récepteurs de la douleur. Un mal de tête vient des enveloppes et des vaisseaux qui l'entourent, pas du cerveau lui-même.",
    },
    {
      id: 'apprendre',
      question: 'Que se passe-t-il dans le cerveau quand on apprend une leçon ?',
      options: [
        { id: 'connexions', texte: 'Les connexions entre neurones utilisées se renforcent' },
        { id: 'nouveaux', texte: 'De nouveaux neurones remplacent les anciens' },
        { id: 'taille', texte: 'Le cerveau augmente de volume' },
      ],
      bonneReponse: 'connexions',
      explication:
        "Apprendre modifie la force des connexions. C'est pourquoi réviser plusieurs fois à quelques jours d'intervalle est bien plus efficace que tout relire la veille.",
    },
  ],

  poumons: [
    {
      id: 'echange',
      question: 'Où se fait exactement l’échange entre l’air et le sang ?',
      options: [
        { id: 'bronches', texte: 'Dans les bronches' },
        { id: 'alveoles', texte: 'Dans les alvéoles' },
        { id: 'trachee', texte: 'Dans la trachée' },
      ],
      bonneReponse: 'alveoles',
      explication:
        "Trachée et bronches ne font que conduire l'air. L'échange n'a lieu qu'au fond, dans les alvéoles, dont la paroi est très fine et entourée de capillaires.",
    },
    {
      id: 'diaphragme',
      question: 'Qu’est-ce qui fait entrer l’air dans les poumons ?',
      options: [
        { id: 'seuls', texte: 'Les poumons se gonflent d’eux-mêmes' },
        { id: 'diaphragme', texte: 'La contraction du diaphragme agrandit la cage thoracique' },
        { id: 'coeur', texte: 'Le cœur aspire l’air en battant' },
      ],
      bonneReponse: 'diaphragme',
      explication:
        "Les poumons ne contiennent aucun muscle. C'est le diaphragme qui s'abaisse, agrandit la cage thoracique, et l'air entre alors tout seul.",
    },
    {
      id: 'gaz',
      question: 'Que devient le sang après son passage dans les poumons ?',
      options: [
        {
          id: 'riche',
          texte: 'Il se charge en dioxygène et se décharge en dioxyde de carbone',
        },
        { id: 'inverse', texte: 'Il se charge en dioxyde de carbone' },
        { id: 'rien', texte: 'Sa composition ne change pas' },
      ],
      bonneReponse: 'riche',
      explication:
        'Les deux gaz font le trajet inverse l’un de l’autre. Le sang ressort rouge vif, riche en dioxygène.',
    },
    {
      id: 'lobes',
      question: 'Pourquoi le poumon gauche est-il plus petit que le droit ?',
      options: [
        { id: 'coeur', texte: 'Parce qu’il laisse de la place au cœur' },
        { id: 'usage', texte: 'Parce qu’il sert moins que le droit' },
        { id: 'estomac', texte: 'Parce que l’estomac le comprime' },
      ],
      bonneReponse: 'coeur',
      explication:
        'Le poumon droit a trois lobes, le gauche seulement deux : le cœur, décalé vers la gauche, empiète sur son côté.',
    },
    {
      id: 'surface',
      question: 'Pourquoi la surface d’échange des poumons est-elle si grande ?',
      options: [
        { id: 'longueur', texte: 'Parce que les bronches sont très longues' },
        {
          id: 'repli',
          texte: 'Parce que des centaines de millions d’alvéoles replient cette surface',
        },
        { id: 'volume', texte: 'Parce que les poumons occupent tout le thorax' },
      ],
      bonneReponse: 'repli',
      explication:
        "Mises bout à bout, les alvéoles couvriraient à peu près un terrain de tennis. C'est ce repliement qui rend l'échange aussi efficace.",
    },
  ],

  foie: [
    {
      id: 'porte',
      question: 'Que transporte la veine porte jusqu’au foie ?',
      options: [
        { id: 'nutriments', texte: 'Le sang chargé des nutriments absorbés par l’intestin' },
        { id: 'oxygene', texte: 'Le sang riche en dioxygène venu des poumons' },
        { id: 'urine', texte: 'Les déchets destinés aux reins' },
      ],
      bonneReponse: 'nutriments',
      explication:
        "Rien de ce que l'intestin absorbe n'entre dans le corps sans passer par le foie : c'est lui qui trie avant redistribution.",
    },
    {
      id: 'glycemie',
      question: 'Comment le foie intervient-il sur le taux de sucre du sang ?',
      options: [
        { id: 'stocke', texte: 'Il stocke le glucose en excès et le libère entre les repas' },
        { id: 'detruit', texte: 'Il détruit le glucose en excès' },
        { id: 'fabrique', texte: 'Il fabrique du sucre en permanence' },
      ],
      bonneReponse: 'stocke',
      explication:
        "Après un repas il met en réserve sous forme de glycogène ; entre les repas il défait ses réserves. C'est cette alternance qui stabilise la glycémie.",
    },
    {
      id: 'bile',
      question: 'Quel est le rôle exact de la bile ?',
      options: [
        { id: 'digere', texte: 'Elle digère les graisses' },
        { id: 'divise', texte: 'Elle divise les graisses en gouttelettes pour aider les enzymes' },
        { id: 'neutralise', texte: 'Elle neutralise les microbes des aliments' },
      ],
      bonneReponse: 'divise',
      explication:
        "La bile ne contient pas d'enzyme : elle casse les grosses gouttes en gouttelettes, comme du savon sur de l'huile, pour que les enzymes travaillent plus vite.",
    },
    {
      id: 'regeneration',
      question: 'Quelle particularité le foie possède-t-il ?',
      options: [
        { id: 'repousse', texte: 'Il peut repousser à partir d’un fragment' },
        { id: 'immortel', texte: 'Ses cellules ne meurent jamais' },
        { id: 'double', texte: 'Il existe en double comme les reins' },
      ],
      bonneReponse: 'repousse',
      explication:
        "C'est le seul organe humain capable de retrouver sa taille normale après en avoir perdu une grande partie. Cela rend possible le don de foie entre vivants.",
    },
    {
      id: 'hepatiteb',
      question: 'Quel est le meilleur moyen de se protéger de l’hépatite B ?',
      options: [
        { id: 'vaccin', texte: 'La vaccination, dès la naissance' },
        { id: 'eau', texte: 'Faire bouillir l’eau de boisson' },
        { id: 'moustique', texte: 'Dormir sous une moustiquaire' },
      ],
      bonneReponse: 'vaccin',
      explication:
        "L'hépatite B est très répandue en Afrique de l'Ouest et se transmet par le sang et les liquides biologiques. La vaccination précoce est la protection la plus sûre.",
    },
  ],

  reins: [
    {
      id: 'volume',
      question:
        'Les reins filtrent environ 180 litres par jour mais n’éliminent qu’un à deux litres d’urine. Pourquoi ?',
      options: [
        { id: 'recupere', texte: 'Parce qu’ils récupèrent presque toute l’eau filtrée' },
        { id: 'evapore', texte: 'Parce que le reste s’évapore par la peau' },
        { id: 'erreur', texte: 'Parce que la mesure de 180 litres est approximative' },
      ],
      bonneReponse: 'recupere',
      explication:
        'Le rein filtre largement puis reprend plus de 99 % de ce qu’il a filtré. Le volume d’urine dépend donc surtout de cette récupération.',
    },
    {
      id: 'nephron',
      question: 'Comment s’appelle l’unité microscopique de filtration du rein ?',
      options: [
        { id: 'nephron', texte: 'Le néphron' },
        { id: 'alveole', texte: 'L’alvéole' },
        { id: 'villosite', texte: 'La villosité' },
      ],
      bonneReponse: 'nephron',
      explication:
        'Chaque rein en contient environ un million. L’alvéole appartient au poumon, la villosité à l’intestin.',
    },
    {
      id: 'filtration',
      question: 'Que doit-on ne PAS retrouver dans l’urine d’une personne en bonne santé ?',
      options: [
        { id: 'eau', texte: 'De l’eau' },
        { id: 'proteines', texte: 'Des protéines en quantité' },
        { id: 'sels', texte: 'Des sels minéraux' },
      ],
      bonneReponse: 'proteines',
      explication:
        'Le filtre laisse passer l’eau, les sels et les déchets, mais retient les cellules et les grosses protéines. En trouver dans l’urine signale un filtre abîmé.',
    },
    {
      id: 'chaleur',
      question: 'Sous forte chaleur, pourquoi l’urine devient-elle foncée ?',
      options: [
        { id: 'economie', texte: 'Le corps économise l’eau, donc l’urine se concentre' },
        { id: 'dechets', texte: 'Le corps produit davantage de déchets' },
        { id: 'sang', texte: 'Du sang passe dans l’urine' },
      ],
      bonneReponse: 'economie',
      explication:
        'Une urine foncée est un signal de déshydratation. Boire régulièrement, même sans soif, évite aussi la formation de calculs.',
    },
    {
      id: 'maladie',
      question: 'Quelles sont les deux principales causes d’insuffisance rénale ?',
      options: [
        { id: 'diabete', texte: 'Le diabète et l’hypertension artérielle' },
        { id: 'froid', texte: 'Le froid et le manque de sommeil' },
        { id: 'sport', texte: 'L’activité physique intense' },
      ],
      bonneReponse: 'diabete',
      explication:
        "Les deux abîment les reins lentement et sans douleur. Seuls une analyse d'urine et une prise de sang permettent de le détecter tôt.",
    },
  ],

  oeil: [
    {
      id: 'qui-voit',
      question: 'Qui « voit » réellement l’image ?',
      options: [
        { id: 'retine', texte: 'La rétine' },
        { id: 'cerveau', texte: 'Le cerveau' },
        { id: 'cristallin', texte: 'Le cristallin' },
      ],
      bonneReponse: 'cerveau',
      explication:
        "L'œil forme une image et la convertit en message nerveux. C'est le cerveau qui l'interprète — et qui la remet à l'endroit, car l'image rétinienne est renversée.",
    },
    {
      id: 'iris',
      question: 'Quel est le rôle de l’iris ?',
      options: [
        { id: 'lumiere', texte: 'Régler la quantité de lumière qui entre' },
        { id: 'nettete', texte: 'Faire la mise au point' },
        { id: 'couleur', texte: 'Détecter les couleurs' },
      ],
      bonneReponse: 'lumiere',
      explication:
        "L'iris est un muscle qui agrandit la pupille dans la pénombre et la rétrécit au soleil. C'est la mise au point, elle, qui revient au cristallin.",
    },
    {
      id: 'accommodation',
      question: 'Comment l’œil fait-il la mise au point sur un objet proche ?',
      options: [
        { id: 'bombe', texte: 'Le cristallin se bombe' },
        { id: 'avance', texte: 'La rétine se rapproche du cristallin' },
        { id: 'pupille', texte: 'La pupille se rétrécit' },
      ],
      bonneReponse: 'bombe',
      explication:
        "C'est l'accommodation. Avec l'âge, le cristallin devient moins souple et lire de près demande alors des lunettes.",
    },
    {
      id: 'cornee',
      question: 'Pourquoi la cornée ne contient-elle aucun vaisseau sanguin ?',
      options: [
        { id: 'transparence', texte: 'Parce qu’elle doit rester transparente' },
        { id: 'petite', texte: 'Parce qu’elle est trop petite' },
        { id: 'protection', texte: 'Parce qu’elle est protégée par la paupière' },
      ],
      bonneReponse: 'transparence',
      explication:
        "Des vaisseaux la rendraient opaque et la lumière ne passerait plus. Elle prend donc son dioxygène directement dans l'air.",
    },
    {
      id: 'cataracte',
      question: 'Qu’est-ce que la cataracte ?',
      options: [
        { id: 'cristallin', texte: 'Le cristallin qui devient opaque' },
        { id: 'retine', texte: 'La rétine qui se décolle' },
        { id: 'infection', texte: 'Une infection de la paupière' },
      ],
      bonneReponse: 'cristallin',
      explication:
        "La lumière ne traverse plus correctement et la vue se brouille. C'est une cause fréquente de cécité, mais elle s'opère bien.",
    },
  ],

  intestin: [
    {
      id: 'absorption',
      question: 'Dans quelle partie du tube digestif les nutriments passent-ils dans le sang ?',
      options: [
        { id: 'estomac', texte: 'Dans l’estomac' },
        { id: 'grele', texte: 'Dans l’intestin grêle' },
        { id: 'colon', texte: 'Dans le gros intestin' },
      ],
      bonneReponse: 'grele',
      explication:
        "L'estomac prépare, le gros intestin récupère l'eau. L'absorption des nutriments a lieu dans l'intestin grêle, au niveau des villosités.",
    },
    {
      id: 'villosites',
      question: 'Pourquoi la paroi de l’intestin grêle est-elle couverte de villosités ?',
      options: [
        { id: 'surface', texte: 'Pour multiplier la surface d’absorption' },
        { id: 'broyer', texte: 'Pour broyer les aliments' },
        { id: 'proteger', texte: 'Pour protéger la paroi de l’acidité' },
      ],
      bonneReponse: 'surface',
      explication:
        'Replis, villosités et micro-plis se superposent. Sept mètres de tube offrent ainsi une surface d’échange gigantesque.',
    },
    {
      id: 'colon',
      question: 'Quelle est la fonction principale du gros intestin ?',
      options: [
        { id: 'eau', texte: 'Récupérer l’eau restante' },
        { id: 'nutriments', texte: 'Absorber les nutriments' },
        { id: 'enzymes', texte: 'Fabriquer les enzymes digestives' },
      ],
      bonneReponse: 'eau',
      explication:
        "C'est pourquoi une diarrhée fait perdre beaucoup d'eau : le transit est trop rapide pour que le côlon fasse son travail.",
    },
    {
      id: 'diarrhee',
      question: 'Quel est le principal danger d’une diarrhée chez un jeune enfant ?',
      options: [
        { id: 'deshydratation', texte: 'La déshydratation' },
        { id: 'faim', texte: 'La perte d’appétit' },
        { id: 'fievre', texte: 'La fièvre' },
      ],
      bonneReponse: 'deshydratation',
      explication:
        "Ce n'est pas l'infection elle-même mais la perte d'eau et de sels qui met en danger. La réhydratation par voie orale est le geste qui sauve.",
    },
    {
      id: 'microbiote',
      question: 'Que font les bactéries qui vivent dans le gros intestin ?',
      options: [
        { id: 'utiles', texte: 'Elles digèrent des fibres et fabriquent des vitamines' },
        { id: 'nuisibles', texte: 'Elles sont toutes nuisibles et doivent être éliminées' },
        { id: 'inertes', texte: 'Elles ne jouent aucun rôle' },
      ],
      bonneReponse: 'utiles',
      explication:
        'Ces milliards de bactéries vivent en bonne entente avec nous : elles digèrent ce que nous ne savons pas digérer.',
    },
  ],

  pancreas: [
    {
      id: 'deux-roles',
      question: 'Quelles sont les deux fonctions du pancréas ?',
      options: [
        { id: 'digestive-hormonale', texte: 'Digestive (enzymes) et hormonale (insuline)' },
        { id: 'filtration', texte: 'Filtration du sang et fabrication d’urine' },
        { id: 'respiratoire', texte: 'Échange gazeux et transport du dioxygène' },
      ],
      bonneReponse: 'digestive-hormonale',
      explication:
        'Il déverse un suc riche en enzymes dans l’intestin, et libère dans le sang des hormones qui règlent la glycémie.',
    },
    {
      id: 'insuline',
      question: 'Que fait l’insuline quand la glycémie monte après un repas ?',
      options: [
        { id: 'entrer', texte: 'Elle fait entrer le glucose dans les cellules' },
        { id: 'detruire', texte: 'Elle détruit le glucose en excès' },
        { id: 'urine', texte: 'Elle évacue le glucose dans l’urine' },
      ],
      bonneReponse: 'entrer',
      explication:
        'Elle fait entrer le glucose dans les cellules et le fait stocker par le foie : la glycémie redescend vers sa valeur habituelle.',
    },
    {
      id: 'glucagon',
      question: 'Quelle hormone agit en sens inverse de l’insuline ?',
      options: [
        { id: 'glucagon', texte: 'Le glucagon' },
        { id: 'adrenaline', texte: 'L’adrénaline' },
        { id: 'bile', texte: 'La bile' },
      ],
      bonneReponse: 'glucagon',
      explication:
        'Loin des repas, le glucagon pousse le foie à libérer du glucose. Les deux hormones travaillent en opposition et stabilisent ainsi la glycémie.',
    },
    {
      id: 'proportion',
      question: 'Quelle part du pancréas fabrique les hormones ?',
      options: [
        { id: 'deux', texte: 'Environ 2 % de sa masse' },
        { id: 'moitie', texte: 'La moitié' },
        { id: 'tout', texte: 'La totalité' },
      ],
      bonneReponse: 'deux',
      explication:
        'Les îlots de Langerhans ne représentent qu’environ 2 % de la masse. Tout le reste est consacré à la digestion.',
    },
    {
      id: 'diabete',
      question: 'Quelle est la différence entre diabète de type 1 et de type 2 ?',
      options: [
        {
          id: 'production',
          texte: 'Type 1 : le pancréas ne produit plus d’insuline ; type 2 : le corps y répond mal',
        },
        { id: 'age', texte: 'Le type 1 touche les adultes, le type 2 les enfants' },
        { id: 'sucre', texte: 'Le type 1 vient du sucre, le type 2 des graisses' },
      ],
      bonneReponse: 'production',
      explication:
        "Dans le type 1 l'insuline manque ; dans le type 2 elle est présente mais devient inefficace. C'est le type 2 qui progresse le plus vite en milieu urbain.",
    },
  ],

  peau: [
    {
      id: 'organe',
      question: 'Quel est le plus grand organe du corps humain ?',
      options: [
        { id: 'peau', texte: 'La peau' },
        { id: 'foie', texte: 'Le foie' },
        { id: 'intestin', texte: 'L’intestin' },
      ],
      bonneReponse: 'peau',
      explication:
        'Étalée, elle couvrirait environ deux mètres carrés et pèse trois à cinq kilos : plus que le foie ou le cerveau.',
    },
    {
      id: 'couches',
      question: 'Quelles sont les trois couches de la peau, de la surface vers la profondeur ?',
      options: [
        { id: 'ordre', texte: 'Épiderme, derme, hypoderme' },
        { id: 'inverse', texte: 'Hypoderme, derme, épiderme' },
        { id: 'faux', texte: 'Derme, épiderme, hypoderme' },
      ],
      bonneReponse: 'ordre',
      explication:
        "L'épiderme est la barrière imperméable, le derme contient nerfs et vaisseaux, l'hypoderme est la réserve de graisse qui isole.",
    },
    {
      id: 'barriere',
      question: 'Pourquoi faut-il nettoyer et protéger une plaie ?',
      options: [
        { id: 'microbes', texte: 'Parce que la barrière est ouverte et que des microbes peuvent entrer' },
        { id: 'douleur', texte: 'Pour que ça fasse moins mal' },
        { id: 'cicatrice', texte: 'Pour éviter que la peau change de couleur' },
      ],
      bonneReponse: 'microbes',
      explication:
        "Tant qu'elle est intacte, la peau empêche les micro-organismes d'entrer. Une plaie est une brèche dans la première ligne de défense.",
    },
    {
      id: 'sueur',
      question: 'Comment la transpiration refroidit-elle le corps ?',
      options: [
        { id: 'evaporation', texte: 'En s’évaporant, la sueur emporte de la chaleur' },
        { id: 'froide', texte: 'Parce que la sueur est froide en sortant' },
        { id: 'vaisseaux', texte: 'Parce qu’elle bouche les vaisseaux de la peau' },
      ],
      bonneReponse: 'evaporation',
      explication:
        "C'est l'évaporation qui refroidit, pas la sueur elle-même. D'où l'importance de boire : sans eau, plus de transpiration possible.",
    },
    {
      id: 'toucher',
      question: 'Pourquoi reconnaît-on mieux un objet avec les doigts qu’avec le coude ?',
      options: [
        { id: 'recepteurs', texte: 'Parce que les doigts comptent beaucoup plus de récepteurs' },
        { id: 'habitude', texte: 'Parce qu’on en a simplement l’habitude' },
        { id: 'peau-fine', texte: 'Parce que la peau des doigts est plus épaisse' },
      ],
      bonneReponse: 'recepteurs',
      explication:
        'Les récepteurs du toucher ne sont pas répartis uniformément : le bout des doigts et les lèvres en sont très richement pourvus.',
    },
  ],
};
