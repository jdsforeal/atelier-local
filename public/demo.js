const COMPLETE_DEMO_VERSION = 5;
function atelierDemo() {
  const day = (base, n = 0) => {
    const d = new Date(base + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const names = [
    "Aurore",
    "Riviera",
    "Solstice",
    "Chromatique",
    "Forêt",
    "Minuit",
    "Équinoxe",
    "Portraits Atelier",
    "Première Neige",
    "Éclosion",
  ];
  const cities = ["Paris", "Bruxelles", "Lyon", "Anvers", "Lille"];
  const people = [
    "Mila",
    "Noé",
    "Lina",
    "Sacha",
    "Ari",
    "Éva",
    "Nora",
    "Alma",
    "Lou",
    "Iris",
  ];
  const seasons = ["Printemps", "Été", "Automne", "Hiver"];
  const brands = [
    "ARKET",
    "Rouje",
    "A.P.C.",
    "VEJA",
    "COS",
    "AGMES",
    "Galvan",
    "Jimmy Choo",
  ];
  const contacts = Array.from({ length: 100 }, (_, i) => ({
    id: "full-c" + i,
    name:
      [
        "Camille",
        "Alex",
        "Lou",
        "Morgan",
        "Charlie",
        "Sam",
        "Sasha",
        "Andrea",
        "Robin",
        "Alix",
      ][i % 10] +
      " " +
      [
        "Martin",
        "Morel",
        "Petit",
        "Laurent",
        "Dubois",
        "Roux",
        "Simon",
        "Leroy",
        "Blanc",
        "Faure",
      ][Math.floor(i / 10)],
    brand:
      i < 18
        ? brands[i % brands.length] + " · interlocuteur fictif"
        : ["Atelier Sauge", "Vestiaire Lune", "Studio Argile", "Showroom Onde"][
            i % 4
          ] +
          " " +
          String(i + 1).padStart(3, "0"),
    email: "simulation" + (i + 1) + "@example.invalid",
    role: [
      "Relations presse — simulation",
      "Créateur — simulation",
      "Showroom — simulation",
      "Loueur — simulation",
    ][i % 4],
    city: cities[i % 5],
    note: "Personne fictive. Aucun lien professionnel réel avec la marque mentionnée. Conditions de prêt et échanges simulés.",
  }));
  const db = {
    simulationVersion: COMPLETE_DEMO_VERSION,
    projects: [],
    pieces: [],
    contacts,
    tasks: [],
    news: [],
    expenses: [],
    quotes: [],
    requests: [],
    catalog: atelierCatalog,
  };
  const active = [
    [
      "Cannes — lumière de mai",
      "Éva",
      "Événement",
      "Printemps",
      "Préparation",
      "2027-05-17",
      3,
    ],
    [
      "Clip Aurore — version studio",
      "Mila",
      "Clip",
      "Hiver",
      "Préparation",
      "2026-12-03",
      2,
    ],
    [
      "Éclosion — collection capsule",
      "Studio Alba",
      "Collection",
      "Printemps",
      "Préparation",
      "2027-03-11",
      5,
    ],
    [
      "Riviera — éditorial été",
      "Magazine Horizon",
      "Éditorial",
      "Été",
      "Recherche",
      "2027-06-10",
      3,
    ],
    [
      "Solstice — tournée lumière",
      "Noé",
      "Tournée",
      "Automne",
      "Recherche",
      "2026-11-20",
      4,
    ],
    [
      "Portraits Atelier — casting",
      "Collectif Lumière",
      "Éditorial",
      "Automne",
      "Recherche",
      "2026-11-06",
      2,
    ],
    [
      "Minuit — tournage du clip",
      "Sacha",
      "Clip",
      "Automne",
      "Production",
      "2026-10-16",
      3,
    ],
    [
      "Forêt — séance magazine",
      "Magazine Sillage",
      "Éditorial",
      "Automne",
      "Production",
      "2026-10-18",
      5,
    ],
    [
      "Équinoxe — retours tournée",
      "Ari",
      "Tournée",
      "Automne",
      "Retours",
      "2026-10-10",
      2,
    ],
    [
      "Première Neige — presse",
      "Nora",
      "Événement",
      "Hiver",
      "Retours",
      "2026-10-11",
      1,
    ],
  ];
  const specs = [
    ...active,
    ...Array.from({ length: 50 }, (_, i) => [
      names[i % 10] +
        " — " +
        cities[Math.floor(i / 10)] +
        " " +
        (i % 2 ? "édition scène" : "édition image"),
      people[i % 10],
      ["Clip", "Éditorial", "Tournée", "Événement", "Personnel"][i % 5],
      seasons[i % 4],
      "Terminé",
      day("2026-09-28", -i * 17),
      1 + (i % 5),
    ]),
  ];
  const cat = (ref) => atelierCatalog.find((c) => c.ref === ref);
  let pn = 0,
    ln = 0,
    rn = 0;
  const stageIndex = {
    Préparation: 0,
    Recherche: 2,
    Production: 4,
    Retours: 6,
    Terminé: 8,
  };
  specs.forEach(([name, client, type, season, status, date, n], i) => {
    const done = status === "Terminé",
      stage = stageIndex[status],
      recordDate = (offset, completed = true) => {
        const value = day(date, offset);
        return !done && completed && value > "2026-10-14"
          ? day("2026-10-14", offset)
          : value;
      },
      p = {
        id: "full-p" + i,
        name,
        client,
        type,
        season,
        status,
        date,
        budget: 1800 + n * 650,
        tone: ["sage", "rose", "dark"][i % 3],
        boards: [],
        looks: [],
        validation:
          stage >= 4 ? "Validé" : stage >= 2 ? "À revoir" : "À demander",
        people: [
          {
            name: client,
            top: "M",
            bottom: "38",
            shoe: "39",
            note: "Mesures fictives à confirmer avant commande",
          },
        ],
        brief: `${n} silhouette${n > 1 ? "s" : ""} pour ${type.toLowerCase()} à ${cities[i % 5]}. ${season === "Été" ? "Lin, bleu marine, rouge floral et légèreté." : season === "Hiver" ? "Maille abricot, bleu nuit et volumes chauds." : "Blanc, denim et tailoring bleu nuit."} Prévoir mouvement et confort. Bijoux argent ou doré selon le look. Références réelles ; toute opération et disponibilité de ce scénario est simulée.`,
        history: [],
        simulation: true,
      };
    for (let j = 0; j < n; j++) {
      const dress = season === "Été" && j % 2 === 0;
      const formal = type === "Événement" && j % 2 === 0;
      const refs = formal
        ? ["phoenix", "azia", "dahlia", "bag"]
        : dress
          ? ["gabin", "sandals", "dahlia", "bag"]
          : season === "Hiver"
            ? ["cashmere", "trousers", "blazer", "loafers", "dahlia"]
            : season === "Été"
              ? ["linen", "trousers", "sandals", "hoops"]
              : [
                  "cotton",
                  j % 2 ? "trousers" : "jeans",
                  "blazer",
                  j % 2 ? "loafers" : "esplar",
                  "dahlia",
                ];
      const look = {
        id: "full-l" + ln++,
        name: [
          "Ouverture",
          "Ligne graphique",
          "Mouvement",
          "Contraste",
          "Finale",
        ][j],
        person: client,
        needs: refs.map((ref) => ({
          name: cat(ref).category,
          state:
            stage >= 4 ? "Retenu" : stage >= 2 ? "En sélection" : "À chercher",
        })),
        fitting:
          stage >= 4 ? "Validé après essayage simulé" : "Essayage à programmer",
      };
      p.looks.push(look);
      refs.forEach((ref, k) => {
        const c = cat(ref),
          mode =
            k === 0
              ? "Prêt"
              : k === 1
                ? "Achat"
                : k === 2
                  ? "Location"
                  : k === 3
                    ? "Achat"
                    : "Prêt",
          isLoan = ["Prêt", "Location"].includes(mode),
          commit = stage >= 4 || (stage >= 2 && k < 2),
          isReturned = done || (status === "Retours" && j === 0 && k === 0),
          price =
            mode === "Prêt"
              ? 0
              : mode === "Location"
                ? 65 + j * 10
                : ref === "esplar"
                  ? 130
                  : ref === "bag"
                    ? 450
                    : 75 + k * 20;
        const x = {
          ...c,
          id: "full-i" + pn++,
          project: p.id,
          look: look.id,
          contact: contacts[(i * 3 + k) % 100].id,
          mode,
          price,
          caution: isLoan && k === 2 ? 200 : 0,
          cautionReturned: isReturned,
          commit,
          status: done
            ? isLoan
              ? "Retourné"
              : "Conservé"
            : status === "Retours"
              ? isLoan
                ? isReturned
                  ? "Retourné"
                  : "Porté"
                : "Conservé"
              : status === "Production"
                ? "Reçu"
                : stage >= 2
                  ? k < 2
                    ? "Confirmé"
                    : "Demandé"
                  : "Repéré",
          size:
            c.category === "Chaussures"
              ? "39"
              : c.category === "Bijoux" || c.category === "Sac"
                ? "TU"
                : c.category === "Bas"
                  ? "38"
                  : "M",
          received: stage >= 4 ? day(date, -3) : "",
          returnDue: isLoan && stage >= 4 ? day(date, 5) : "",
          returned: isLoan && isReturned ? day(date, 4) : "",
          availability: "Non vérifiée auprès de la marque",
          note: "Référence réelle ; coût EUR, obtention, taille et suivi entièrement simulés. Prix public observé le 14/10/2026, pas de stock temps réel.",
        };
        db.pieces.push(x);
      });
      // One rejected alternative per look demonstrates selection history.
      const alternative = cat(dress ? "linen" : "gabin");
      db.pieces.push({
        ...alternative,
        id: "full-i" + pn++,
        project: p.id,
        look: look.id,
        mode: "Location",
        price: 45,
        caution: 0,
        commit: false,
        status: stage >= 4 ? "Écarté" : "Repéré",
        note:
          stage >= 4
            ? "Alternative écartée : direction artistique différente — simulation."
            : "Alternative à comparer — simulation.",
        size: "38",
        availability: "Non vérifiée",
        contact: contacts[(i * 3 + j + 7) % 100].id,
      });
    }
    const items = db.pieces.filter((x) => x.project === p.id);
    p.cover = items[0].image;
    const boardRefs = [
      ...new Set(items.filter((x) => x.status !== "Écarté").map((x) => x.ref)),
    ].slice(0, 6);
    p.boards = boardRefs.map((ref) => ({
      image: cat(ref).image,
      caption: cat(ref).brand + " · " + cat(ref).name,
      url: cat(ref).url,
    }));
    for (const [j, label, amount] of [
      [0, "Transport des pièces", 65 + (i % 5) * 12],
      [1, "Retouches et ajustements", 90 + n * 15],
      [2, "Pressing après production", 45 + n * 8],
      [3, "Coursier retours", 35 + (i % 4) * 10],
    ])
      db.expenses.push({
        id: "full-e" + i + "-" + j,
        project: p.id,
        name: label,
        amount,
        state: done ? "Payé" : stage >= 4 ? "Engagé" : "Prévu",
        date: day(date, j < 2 ? -3 : 3),
      });
    const steps = [
      ["Brief reçu", -21, 0],
      ["Moodboard proposé", -18, 1],
      ["Direction validée par le client", -15, 3],
      ["Demandes de pièces", -12, 2],
      ["Réceptions et essayages", -3, 4],
      ["Production réalisée", 0, 5],
      ["Retours et cautions", 4, 7],
      ["Bilan et clôture", 7, 8],
    ];
    p.history = steps.map(([label, offset, index]) => ({
      label,
      date:
        !done && stage >= index && day(date, offset) > "2026-10-14"
          ? day("2026-10-14", offset)
          : day(date, offset),
      done: stage >= index,
      detail:
        index === 3
          ? "Validation version 2 — simulation"
          : index === 8
            ? "Toutes les pièces prêtées retournées, cautions restituées, frais réglés — simulation"
            : "Étape du scénario fictif",
    }));
    if (done) p.closed = day(date, 7);
    for (const [j, [label, offset, index]] of steps.entries())
      db.tasks.push({
        id: "full-t" + i + "-" + j,
        project: p.id,
        name: label,
        date: p.history[j].date,
        done: stage >= index,
      });
    const grouped = new Map();
    for (const x of items.filter((x) => x.status !== "Écarté")) {
      const arr = grouped.get(x.contact) || [];
      arr.push(x);
      grouped.set(x.contact, arr);
    }
    for (const [contact, group] of grouped) {
      const confirmed =
        stage >= 4 || (stage >= 2 && group.some((x) => x.commit));
      db.requests.push({
        id: "full-r" + rn++,
        project: p.id,
        contact,
        pieces: group.map((x) => x.id),
        status: done
          ? "Clôturée"
          : confirmed
            ? "Confirmée"
            : stage >= 2
              ? "En attente"
              : "Brouillon",
        sent: stage >= 2 ? recordDate(-12) : "",
        reply: confirmed ? recordDate(-10) : "",
        followup: stage >= 2 && !confirmed ? day(date, -7) : "",
        history: [
          {
            date: recordDate(-12, stage >= 2),
            text: "Demande groupée personnalisée — simulation",
          },
          {
            date: recordDate(-10, confirmed),
            text: confirmed
              ? "Tailles et dates confirmées dans le scénario fictif"
              : "En attente de confirmation fictive",
          },
        ],
        note: "Aucun message réel envoyé. Le contact et les modalités sont fictifs.",
      });
    }
    if (i === 4) {
      const declined = items.find((x) => !x.commit);
      if (declined) {
        declined.status = "Indisponible";
        db.requests.push({
          id: "full-r" + rn++,
          project: p.id,
          contact: declined.contact,
          pieces: [declined.id],
          status: "Refusée",
          sent: recordDate(-12),
          reply: recordDate(-11),
          history: [
            {
              date: recordDate(-11),
              text: "Taille indisponible — refus simulé",
            },
          ],
          note: "Prévoir une alternative.",
        });
      }
    }
    if (status === "Retours") {
      const late = items.find(
        (x) => ["Prêt", "Location"].includes(x.mode) && !x.returned,
      );
      if (late) {
        late.returnDue = "2026-10-13";
        late.note += " Retour en retard dans la simulation.";
      }
    }
    const costs =
      items.filter((x) => x.commit).reduce((n, x) => n + x.price, 0) +
      db.expenses
        .filter(
          (x) => x.project === p.id && ["Engagé", "Payé"].includes(x.state),
        )
        .reduce((n, e) => n + e.amount, 0);
    if (i === 6) p.budget = Math.max(100, costs - 180); // A visible overspend scenario.
    db.quotes.push({
      id: "full-q" + i,
      project: p.id,
      number:
        "SIM-" +
        (done ? date.slice(0, 4) : "2026") +
        "-" +
        String(i + 1).padStart(3, "0"),
      version: done ? 2 : 1,
      status: done
        ? "Accepté — simulation"
        : stage >= 4
          ? "Accepté — simulation"
          : "Brouillon",
      lines: [
        ...items
          .filter((x) => x.commit && x.price > 0)
          .map((x) => ({
            name: x.brand + " · " + x.name,
            qty: 1,
            rate: x.price,
          })),
        ...db.expenses
          .filter((x) => x.project === p.id)
          .map((e) => ({ name: e.name, qty: 1, rate: e.amount })),
        { name: "Direction artistique et sourcing", qty: 2, rate: 350 },
        {
          name: "Stylisme / présence en production",
          qty: type === "Tournée" ? 3 : 1,
          rate: 450,
        },
      ],
      simulation: true,
    });
    db.projects.push(p);
  });
  db.news = atelierCatalog.slice(0, 6).map((c) => ({
    title: c.name,
    brand: c.brand,
    url: c.url,
    note: "Référence officielle consultée le 14/10/2026. Ce n’est pas une actualité de lancement vérifiée.",
  }));
  return db;
}
