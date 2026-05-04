/**
 * Tuteur Sen Lab Visa — moteur de réponses pour le MVP.
 *
 * Pour l'instant, des réponses scriptées par mots-clés (couvre les TPs pilotes).
 * À remplacer par un appel LLM (Claude/OpenAI) via le gateway en Phase 1+.
 */

export type ChatRole = 'user' | 'bot' | 'system';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: number;
  /** Liens de TP suggérés à la fin du message. */
  tpSuggestions?: Array<{ slug: string; title: string }>;
};

export type SuggestionChip = {
  id: string;
  label: string;
  category: 'maths' | 'physique-chimie' | 'svt' | 'general';
  prompt: string;
};

/** Suggestions affichées au démarrage d'un nouveau chat. */
export const STARTER_SUGGESTIONS: SuggestionChip[] = [
  // Maths
  { id: 'pyth', label: '📐 Le théorème de Pythagore', category: 'maths', prompt: "Peux-tu m'expliquer simplement le théorème de Pythagore avec un exemple concret ?" },
  { id: 'frac', label: '➗ Les fractions', category: 'maths', prompt: "J'ai du mal avec les fractions. Comment additionner deux fractions ?" },
  { id: 'fonc', label: '📈 Fonctions affines', category: 'maths', prompt: "C'est quoi une fonction affine et à quoi ça sert dans la vraie vie ?" },
  // PC
  { id: 'ohm', label: '⚡ La loi d\'Ohm', category: 'physique-chimie', prompt: "Explique-moi la loi d'Ohm avec un exemple lié au compteur Woyofal." },
  { id: 'ph', label: '🧪 Acides et bases', category: 'physique-chimie', prompt: "Comment mesurer le pH d'une solution ? Et pourquoi c'est important ?" },
  { id: 'meca', label: '🪀 La gravité', category: 'physique-chimie', prompt: "Pourquoi un objet tombe vers le bas ? Explique-moi la gravité simplement." },
  // SVT
  { id: 'photo', label: '🌱 La photosynthèse', category: 'svt', prompt: "Comment les plantes produisent leur nourriture grâce à la lumière ?" },
  { id: 'cell', label: '🔬 La cellule', category: 'svt', prompt: "Quelle est la différence entre une cellule animale et une cellule végétale ?" },
  { id: 'digest', label: '🥬 La digestion', category: 'svt', prompt: "Que se passe-t-il quand je mange un fruit ? Explique-moi la digestion." },
  // Général
  { id: 'method', label: '📚 Comment réviser', category: 'general', prompt: "Comment je peux mieux réviser pour mes contrôles ?" },
  { id: 'rapport', label: '📝 Rédiger un rapport', category: 'general', prompt: "Comment je rédige un bon rapport de TP ?" },
  { id: 'bfem', label: '🎯 Préparer le BFEM', category: 'general', prompt: "Donne-moi des conseils pour bien préparer le BFEM." },
];

/**
 * Génère une réponse scriptée à partir d'un message utilisateur.
 * Utilise des mots-clés pour matcher des sujets connus.
 */
export function generateBotReply(userInput: string): { text: string; tpSuggestions?: ChatMessage['tpSuggestions'] } {
  const q = userInput.toLowerCase();

  // === Mathématiques ===

  if (q.includes('pythagor')) {
    return {
      text:
        "Le théorème de Pythagore dit que dans un triangle rectangle, le carré de l'hypoténuse (le plus grand côté) est égal à la somme des carrés des deux autres côtés.\n\n" +
        "**Formule** : a² + b² = c²\n\n" +
        "**Exemple concret au Sénégal** 🇸🇳 : un maçon de Thiès qui veut tracer un angle droit pour sa fondation utilise une corde à 13 nœuds. Il forme un triangle 3-4-5 (3² + 4² = 9 + 16 = 25 = 5²). C'est garanti d'être un angle droit !\n\n" +
        "Tu veux essayer ça en pratique sur le simulateur ?",
      tpSuggestions: [{ slug: 'pythagore-4eme', title: 'Théorème de Pythagore (4ème · Maths)' }],
    };
  }

  if (q.includes('fraction')) {
    return {
      text:
        "Pour additionner deux fractions, il y a deux cas :\n\n" +
        "**1. Même dénominateur** : tu additionnes juste les numérateurs.\n" +
        "Ex : 2/5 + 1/5 = 3/5\n\n" +
        "**2. Dénominateurs différents** : il faut d'abord trouver un dénominateur commun (en multipliant), puis additionner.\n" +
        "Ex : 1/2 + 1/3 = 3/6 + 2/6 = 5/6\n\n" +
        "Astuce : pense aux fractions comme des parts de gâteau 🍰. Si tu as 1/2 d'un gâteau et 1/3 d'un autre gâteau identique, tu coupes les deux en 6 parts égales pour pouvoir les comparer.",
    };
  }

  if (q.includes('fonction') || q.includes('affine')) {
    return {
      text:
        "Une **fonction affine** est de la forme **f(x) = ax + b**, où a et b sont des nombres.\n\n" +
        "**Exemple sénégalais** 🇸🇳 : la facture Senelec.\n" +
        "Si tu paies 800 FCFA d'abonnement fixe + 100 FCFA par kWh consommé, alors :\n" +
        "**Prix = 100 × kWh + 800**\n" +
        "C'est une fonction affine où a = 100 (le coefficient) et b = 800 (l'abonnement fixe).\n\n" +
        "Le graphique d'une fonction affine est toujours une **droite**.",
    };
  }

  // === Physique-Chimie ===

  if (q.includes('ohm') || q.includes('woyofal') || (q.includes('tension') && q.includes('courant'))) {
    return {
      text:
        "La **loi d'Ohm** dit : **U = R × I**, où :\n" +
        "- U = tension (en volts, V)\n" +
        "- R = résistance (en ohms, Ω)\n" +
        "- I = intensité (en ampères, A)\n\n" +
        "**Lien avec le compteur Woyofal** ⚡ :\n" +
        "Quand tu allumes une LED chez toi, le courant passe à travers une résistance. Plus la résistance est grande, moins le courant passe (donc moins ça consomme).\n\n" +
        "Si U = 220 V (réseau Senelec) et R = 100 Ω, alors I = U/R = 2,2 A.",
      tpSuggestions: [{ slug: 'loi-ohm-3eme', title: "Loi d'Ohm (3ème · Physique-Chimie)" }],
    };
  }

  if (q.includes('ph') || q.includes('acide') || q.includes('base')) {
    return {
      text:
        "Le **pH** mesure si une solution est acide, neutre ou basique.\n\n" +
        "- **pH < 7** : acide (citron, vinaigre, jus de bissap)\n" +
        "- **pH = 7** : neutre (eau pure)\n" +
        "- **pH > 7** : basique (savon, eau de Javel)\n\n" +
        "**Pourquoi c'est important** : ton estomac a un pH ~2 (très acide) pour digérer la nourriture. Le sang doit rester à pH 7,4 sinon c'est dangereux. Et le sol agricole du Saloum doit avoir un bon pH pour que le mil pousse !\n\n" +
        "Pour mesurer, on utilise du **papier pH** ou un **pH-mètre** électronique.",
    };
  }

  if (q.includes('gravit') || q.includes('tomber') || q.includes('chute')) {
    return {
      text:
        "Tout objet est attiré vers la Terre par la **force de gravité**. C'est Newton qui a découvert ça en voyant tomber une pomme 🍎.\n\n" +
        "**Formule** : F = m × g\n" +
        "- m = masse de l'objet (en kg)\n" +
        "- g = 9,8 m/s² au Sénégal (l'accélération de la pesanteur)\n\n" +
        "**Exemple** : un mango de 200 g (= 0,2 kg) qui tombe a une force de 0,2 × 9,8 = ~2 N (newtons) qui le tire vers le sol.\n\n" +
        "Plus l'objet est lourd, plus la force est grande. Mais étrangement, **tous les objets tombent à la même vitesse** dans le vide (ce qui change c'est la résistance de l'air).",
    };
  }

  // === SVT ===

  if (q.includes('photosynth') || q.includes('plante') || q.includes('chloroph')) {
    return {
      text:
        "La **photosynthèse**, c'est comment les plantes fabriquent leur nourriture 🌱.\n\n" +
        "**Recette** :\n" +
        "🌞 Lumière du soleil + 💧 Eau + 🌫️ CO₂ (dans l'air)\n" +
        "**↓**\n" +
        "🍃 Glucose (sucre = nourriture) + 🌬️ O₂ (dioxygène, qu'on respire)\n\n" +
        "C'est dans les **chloroplastes** des feuilles que ça se passe, grâce à la **chlorophylle** (le pigment vert).\n\n" +
        "Au Sénégal, tu peux observer ça avec une élodée (plante d'eau douce du Saloum) : sous lumière intense, des bulles d'oxygène se forment ! C'est le TP de 4ème.",
      tpSuggestions: [{ slug: 'photosynthese-4eme', title: 'Photosynthèse (4ème · SVT)' }],
    };
  }

  if (q.includes('cellule')) {
    return {
      text:
        "Toutes les cellules ont en commun :\n" +
        "- Une **membrane** (la peau de la cellule)\n" +
        "- Un **cytoplasme** (le liquide intérieur)\n" +
        "- Un **noyau** (le centre de commande, contient l'ADN)\n\n" +
        "**Cellule animale** vs **cellule végétale** :\n" +
        "| Élément | Animale | Végétale |\n" +
        "|---|---|---|\n" +
        "| Paroi rigide | ❌ Non | ✅ Oui (cellulose) |\n" +
        "| Chloroplastes | ❌ Non | ✅ Oui (verts, photosynthèse) |\n" +
        "| Vacuole géante | Petite | Grande (réserve d'eau) |\n\n" +
        "C'est pour ça que les feuilles sont vertes et rigides, et pas tes muscles !",
    };
  }

  if (q.includes('digest')) {
    return {
      text:
        "Quand tu manges une mangue 🥭, voici son voyage :\n\n" +
        "1. **Bouche** : tu mâches, la salive commence à digérer (enzyme amylase pour l'amidon)\n" +
        "2. **Œsophage** : le tube qui descend (3 secondes)\n" +
        "3. **Estomac** : 4h de bain dans l'acide chlorhydrique (pH ~2) + enzymes\n" +
        "4. **Intestin grêle** : 6m de long, c'est là que les nutriments passent dans le sang (vitamines, sucres, protéines)\n" +
        "5. **Gros intestin** : récupère l'eau, prépare les déchets\n" +
        "6. **Rectum + anus** : sortie 💩\n\n" +
        "Au total : ~24 à 48 heures pour un fruit. Ton corps absorbe tout ce qui est utile et jette le reste.",
    };
  }

  // === Méthodologie ===

  if (q.includes('rever') || q.includes('reviser') || q.includes('apprendre')) {
    return {
      text:
        "Voici 5 conseils pour mieux réviser 📚 :\n\n" +
        "1. **Espacer les révisions** : 3 sessions de 30 min sur 3 jours valent mieux qu'1 session de 2h la veille\n" +
        "2. **Réexpliquer à voix haute** comme si tu enseignais à ton petit frère\n" +
        "3. **Faire des exercices** : la lecture seule ne suffit pas\n" +
        "4. **Dormir 8h avant le contrôle** : la mémoire se consolide pendant le sommeil\n" +
        "5. **Couper le téléphone** pendant les sessions — tu seras 3× plus efficace\n\n" +
        "Et ici sur Sen Lab Visa, refais les TPs en mode entraînement libre, c'est super pour ancrer les concepts.",
    };
  }

  if (q.includes('rapport')) {
    return {
      text:
        "Un bon rapport de TP suit 5 étapes 📝 :\n\n" +
        "1. **Objectif** : qu'est-ce qu'on cherche ? (1 phrase)\n" +
        "2. **Hypothèse** : qu'est-ce qu'on pense qui va se passer ?\n" +
        "3. **Protocole** : matériel utilisé + étapes (numérotées)\n" +
        "4. **Résultats** : tableau de mesures + graphique si possible\n" +
        "5. **Conclusion** : l'hypothèse était-elle vérifiée ? Qu'a-t-on appris ?\n\n" +
        "**Astuce** : sois précis sur les chiffres (unités, chiffres significatifs) et illustre avec un schéma — un dessin vaut mille mots !",
    };
  }

  if (q.includes('bfem') || q.includes('examen') || q.includes('controle')) {
    return {
      text:
        "Pour bien préparer le BFEM 🎯, voici un plan en 4 semaines :\n\n" +
        "**Semaine 1-2** : faire un planning matière par matière, identifier tes points faibles\n" +
        "**Semaine 3** : sujets blancs (annales) en conditions d'examen\n" +
        "**Semaine 4** : révisions ciblées + repos\n\n" +
        "Spécificités BFEM 🇸🇳 :\n" +
        "- **Maths** : géométrie + théorèmes (Pythagore, Thalès) tombent souvent\n" +
        "- **PC** : électricité, lentilles, dosages\n" +
        "- **SVT** : reproduction, immunologie, géologie\n\n" +
        "Sur Sen Lab Visa tu peux refaire les TPs des 4 dernières années sans limite — c'est de l'entraînement gratuit !",
    };
  }

  // === Salutations / général ===

  if (
    q.includes('bonjour') ||
    q.includes('salut') ||
    q.includes('hello') ||
    q.includes('asalamou') ||
    q.includes('nanga') ||
    q.includes('hi ')
  ) {
    return {
      text:
        "Salut ! 👋 Je suis ton tuteur virtuel Sen Lab Visa. Je peux t'aider à :\n\n" +
        "- 📐 Comprendre un concept de **Maths**, **Physique-Chimie**, **SVT**\n" +
        "- 🧪 Te guider sur tes **TP** (avant, pendant, après)\n" +
        "- 📝 T'aider à rédiger un **rapport** ou réviser un **examen**\n" +
        "- 🇸🇳 Donner des **exemples concrets** ancrés au Sénégal\n\n" +
        "Pose-moi une question, ou clique sur une suggestion 👇",
    };
  }

  if (q.includes('merci') || q.includes('jerejef')) {
    return { text: "Avec plaisir ! 😊 Si tu as d'autres questions, n'hésite pas. Bon courage pour tes études !" };
  }

  // === Fallback ===

  return {
    text:
      "Je n'ai pas de réponse parfaite pour cette question, mais voici quelques pistes :\n\n" +
      "📚 **Pour comprendre un concept** : regarde dans tes cours ou refais le TP correspondant.\n" +
      "🧪 **Pour un TP** : lis bien la consigne et formule une hypothèse avant de manipuler.\n" +
      "👩‍🏫 **Pour de l'aide ciblée** : contacte ton enseignant·e via la messagerie.\n\n" +
      "Reformule ta question avec des mots-clés (ex : « Pythagore », « loi d'Ohm », « photosynthèse ») et je tenterai une meilleure réponse !",
  };
}
