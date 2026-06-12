import aboutImage from "../assets/hero/струг.jpg";
import { useLanguage } from "../utils/language";
import "../styles/about.css";

const aboutContent = {
  bg: {
    heroKicker: "За нас",
    title: "Ексайт Къмпани ООД",
    intro:
      "\"Ексайт Къмпани\" ООД, гр. Стара Загора, е представител на ново поколение фирми в металообработващия бранш, с основен предмет на дейност търговия с металообработващи инструменти, абразиви, измервателни уреди, части и оборудване на металообработващи машини.",
    imageAlt: "Металообработващо оборудване",
    activityKicker: "Дейност",
    activityTitle: "Фокус върху българската индустрия",
    activityParagraphs: [
      "Фирмата обслужва компании от българската индустрия от отраслите металургия, машиностроене, корабостроене, енергетика, строителство, транспорт, химическа, текстилна и хранително-вкусова промишленост, както и други производства с механична обработка, ремонт, монтаж, демонтаж и поддръжка.",
      "При доставка се прави подробно проучване на техническите изисквания на клиентите, с цел точен подбор на необходимата гама. Голяма част от предлаганите изделия се поддържат в наличност и при необходимост от спешна доставка можем да реагираме своевременно.",
      "Това ни дава възможност да бъдем гъвкави и да обслужваме нашите клиенти, като удовлетворяваме специфичните им производствени нужди. Стремим се да постигнем оптимално съотношение между качество и цена.",
    ],
    industriesKicker: "Отрасли",
    industriesTitle: "Обслужвани направления",
    industries: [
      "Металургия",
      "Машиностроене",
      "Корабостроене",
      "Енергетика",
      "Строителство",
      "Транспорт",
      "Химическа промишленост",
      "Текстилна промишленост",
      "Хранително-вкусова промишленост",
      "Други производства с механична обработка, ремонт, монтаж, демонтаж и поддръжка",
    ],
    rangeKicker: "Продуктова гама",
    rangeTitle: "Ексайт Къмпани ООД предлага",
    rangeText:
      "Следната продуктова гама за металообработващи, производствени, ремонтни и монтажни дейности.",
    productGroups: [
      {
        title: "Абразивни инструменти",
        items: [
          "Абразивни камъни - прав профил, универсални, опашкови, хонинг, заточващи",
          "Карбофлексови дискове за рязане и шлайфане за метал, INOX и неметал",
          "Ламелни шайби",
        ],
      },
      {
        title: "Металорежещи инструменти",
        items: [
          "Зенкери - цилиндрични и конусни с ъгъл 60°, 90°, 120°, с цилиндрична и конусна опашка",
          "Райбери - ръчни и машинни",
          "Метчици - комплекти ръчни и машинни за резби M, Mf, G, UNC, UNF, NPT, NPTF, BSW, Tr и специални резби",
          "Плашки - за резби M, Mf, G, UNC, UNF, NPT, NPTF, BSW, Tr и специални резби",
          "Инструменти със запоени твърдосплавни пластини - стругарски ножове, фрезови глави и други",
          "Инструменти със сменяеми твърдосплавни пластини",
          "Фрези опашкови - канални, челно-цилиндрични, с нормална и удължена работна част",
          "Фрези дорникови - циркулярни, канални, тристранни, челно-цилиндрични, ъглови, профилни",
          "Зъбообработващи инструменти - червячни фрези, комплекти за нарязване на зъбни колела, дълбяци",
          "Листи за механични и ръчни ножовки",
          "Отрезни ленти за метал и дърво",
          "Свредла за метал - нормални, дълги и супердълги с цилиндрична и конусна опашка",
          "Свредла за бетон - нормални и удължени със захващане цилиндрична опашка, SDS+, SDS-MAX",
          "Центрови свредла - форма A, B, R, NC-свредла",
        ],
      },
      {
        title: "Диамантени инструменти",
        items: [
          "Диамантени изравнители",
          "Диамантени пили",
          "Диамантени шайби с различни профили",
        ],
      },
      {
        title: "Измервателни инструменти",
        items: [
          "Часовници - индикаторни и дигитални",
          "Пасиметри",
          "Калибри - гривни и пробки",
          "Метални ъгли и линии",
          "Ъгломери, резбомери, луфтомери и профиломери",
          "Ролетки, нивелири и други",
          "Шублери - нониусни, индикаторни и дигитални",
          "Микрометри - стандартни и дигитални",
          "Вътромери - дигитални, индикаторни и триточкови",
        ],
      },
      {
        title: "Ръчни и шлосеро-монтажни инструменти",
        items: [
          "Ключове - гаечни, звездогаечни, лули, звезди, имбусни, раздвижни и ударни",
          "Комплекти гедорета и части за тях",
          "Пили за метал и дърво - различни профили и дължини",
          "Шлосерски менгемета",
          "Отвертки - плоски, PH, PZ, Torx, ударни",
          "Букви и цифри",
          "Електротехнически инструменти",
          "Шпилковадачи",
        ],
      },
      {
        title: "Екипировка и окомплектовка за металорежещи машини",
        items: [
          "Цангови патронници, преходни втулки, опашки за патронници",
          "Цанги",
          "Дорници присъединителни",
          "Стругови и фрезови държачи",
          "Закрепващи елементи",
          "Въртящи и мъртви центри",
          "Разстъргващи глави",
          "Машинни стиски и менгемета",
          "Универсали, планшайби и патронници за бормашини",
        ],
      },
    ],
  },
  en: {
    heroKicker: "About us",
    title: "Excite Company Ltd.",
    intro:
      "Excite Company Ltd., based in Stara Zagora, represents a new generation of suppliers in the metalworking sector. The company's core activity is the trade of metalworking tools, abrasives, measuring instruments, machine parts and equipment for metalworking machines.",
    imageAlt: "Metalworking equipment",
    activityKicker: "Activity",
    activityTitle: "Focused on Bulgarian industry",
    activityParagraphs: [
      "The company serves Bulgarian industrial businesses in metallurgy, machine building, shipbuilding, energy, construction, transport, chemical, textile and food industries, as well as other operations involving machining, repair, assembly, disassembly and maintenance.",
      "For each delivery we review the customer's technical requirements in detail so the right product range can be selected. A large part of the products is kept in stock, which allows us to respond quickly when urgent delivery is needed.",
      "This keeps us flexible and helps us meet the specific production needs of our customers. Our goal is to achieve the right balance between quality and price.",
    ],
    industriesKicker: "Industries",
    industriesTitle: "Sectors we serve",
    industries: [
      "Metallurgy",
      "Machine building",
      "Shipbuilding",
      "Energy",
      "Construction",
      "Transport",
      "Chemical industry",
      "Textile industry",
      "Food industry",
      "Other manufacturing with machining, repair, assembly, disassembly and maintenance",
    ],
    rangeKicker: "Product range",
    rangeTitle: "Excite Company Ltd. offers",
    rangeText:
      "A product range for metalworking, production, repair and assembly activities.",
    productGroups: [
      {
        title: "Abrasive tools",
        items: [
          "Abrasive stones - straight profile, universal, mounted, honing and sharpening stones",
          "Cutting and grinding discs for metal, INOX and non-metal materials",
          "Flap discs",
        ],
      },
      {
        title: "Metal-cutting tools",
        items: [
          "Countersinks - cylindrical and conical with 60°, 90° and 120° angles",
          "Reamers - hand and machine types",
          "Taps - hand and machine sets for M, Mf, G, UNC, UNF, NPT, NPTF, BSW, Tr and special threads",
          "Dies - for M, Mf, G, UNC, UNF, NPT, NPTF, BSW, Tr and special threads",
          "Brazed carbide tools - turning tools, milling heads and more",
          "Indexable carbide tools",
          "End mills - slot, face-cylindrical, standard and extended working lengths",
          "Arbor milling cutters - slitting, slotting, side-and-face, angle and profile cutters",
          "Gear-cutting tools - hob cutters, gear-cutting sets and slotting tools",
          "Blades for mechanical and hand hacksaws",
          "Cutting bands for metal and wood",
          "Metal drills - standard, long and extra-long, with cylindrical or taper shank",
          "Concrete drills - standard and extended, cylindrical shank, SDS+ and SDS-MAX",
          "Center drills - A, B, R and NC drills",
        ],
      },
      {
        title: "Diamond tools",
        items: [
          "Diamond dressers",
          "Diamond files",
          "Diamond wheels with different profiles",
        ],
      },
      {
        title: "Measuring tools",
        items: [
          "Dial and digital indicators",
          "Passameters",
          "Gauges - rings and plugs",
          "Metal squares and rulers",
          "Protractors, thread gauges, feeler gauges and profile gauges",
          "Tape measures, levels and more",
          "Calipers - vernier, dial and digital",
          "Micrometers - standard and digital",
          "Bore gauges - digital, dial and three-point types",
        ],
      },
      {
        title: "Hand and fitting tools",
        items: [
          "Wrenches - open-end, ring, socket, hex, adjustable and impact types",
          "Socket sets and spare parts",
          "Files for metal and wood - different profiles and lengths",
          "Bench vices",
          "Screwdrivers - flat, PH, PZ, Torx and impact types",
          "Letter and number punches",
          "Electrical tools",
          "Stud extractors",
        ],
      },
      {
        title: "Machine tooling and accessories",
        items: [
          "Collet chucks, adapter sleeves and chuck arbors",
          "Collets",
          "Mounting arbors",
          "Turning and milling holders",
          "Clamping elements",
          "Live and dead centers",
          "Boring heads",
          "Machine vices",
          "Lathe chucks, faceplates and drill chucks",
        ],
      },
    ],
  },
  de: {
    heroKicker: "Über uns",
    title: "Excite Company Ltd.",
    intro:
      "Excite Company Ltd. mit Sitz in Stara Zagora gehört zu einer neuen Generation von Lieferanten in der Metallbearbeitung. Das Kerngeschäft ist der Handel mit Metallbearbeitungswerkzeugen, Schleifmitteln, Messwerkzeugen, Maschinenteilen und Ausrüstung für Metallbearbeitungsmaschinen.",
    imageAlt: "Ausrüstung für die Metallbearbeitung",
    activityKicker: "Tätigkeit",
    activityTitle: "Fokus auf die bulgarische Industrie",
    activityParagraphs: [
      "Das Unternehmen beliefert Industriebetriebe in Bulgarien aus den Bereichen Metallurgie, Maschinenbau, Schiffbau, Energie, Bauwesen, Transport, Chemie, Textil und Lebensmittel sowie weitere Produktionen mit Zerspanung, Reparatur, Montage, Demontage und Wartung.",
      "Bei jeder Lieferung werden die technischen Anforderungen des Kunden genau geprüft, damit die passende Produktpalette ausgewählt werden kann. Ein großer Teil der Produkte wird auf Lager gehalten, wodurch wir bei dringenden Lieferungen schnell reagieren können.",
      "So bleiben wir flexibel und können die spezifischen Produktionsanforderungen unserer Kunden erfüllen. Unser Ziel ist ein optimales Verhältnis zwischen Qualität und Preis.",
    ],
    industriesKicker: "Branchen",
    industriesTitle: "Bediente Bereiche",
    industries: [
      "Metallurgie",
      "Maschinenbau",
      "Schiffbau",
      "Energie",
      "Bauwesen",
      "Transport",
      "Chemische Industrie",
      "Textilindustrie",
      "Lebensmittelindustrie",
      "Weitere Produktionen mit Zerspanung, Reparatur, Montage, Demontage und Wartung",
    ],
    rangeKicker: "Produktpalette",
    rangeTitle: "Excite Company Ltd. bietet",
    rangeText:
      "Eine Produktpalette für Metallbearbeitung, Produktion, Reparatur und Montage.",
    productGroups: [
      {
        title: "Schleifwerkzeuge",
        items: [
          "Schleifsteine - gerades Profil, universell, Schaftsteine, Hon- und Schärfsteine",
          "Trenn- und Schleifscheiben für Metall, INOX und Nichtmetalle",
          "Lamellenscheiben",
        ],
      },
      {
        title: "Zerspanungswerkzeuge",
        items: [
          "Senker - zylindrisch und konisch mit 60°, 90° und 120°",
          "Reibahlen - Hand- und Maschinenausführungen",
          "Gewindebohrer - Hand- und Maschinensätze für M, Mf, G, UNC, UNF, NPT, NPTF, BSW, Tr und Sondergewinde",
          "Schneideisen - für M, Mf, G, UNC, UNF, NPT, NPTF, BSW, Tr und Sondergewinde",
          "Werkzeuge mit gelöteten Hartmetallplatten - Drehmeißel, Fräsköpfe und weitere",
          "Werkzeuge mit wechselbaren Hartmetallplatten",
          "Schaftfräser - Nutfräser, Stirn-Zylinder-Fräser, normale und verlängerte Arbeitslängen",
          "Aufsteckfräser - Kreissäge-, Nut-, Scheiben-, Winkel- und Profilfräser",
          "Verzahnungswerkzeuge - Wälzfräser, Sätze zum Verzahnen und Stoßwerkzeuge",
          "Sägeblätter für Maschinen- und Handsägen",
          "Bandsägeblätter für Metall und Holz",
          "Metallbohrer - normal, lang und extra lang, mit zylindrischem oder konischem Schaft",
          "Betonbohrer - normal und verlängert, Zylinderschaft, SDS+ und SDS-MAX",
          "Zentrierbohrer - Formen A, B, R und NC-Bohrer",
        ],
      },
      {
        title: "Diamantwerkzeuge",
        items: [
          "Diamantabrichter",
          "Diamantfeilen",
          "Diamantscheiben mit verschiedenen Profilen",
        ],
      },
      {
        title: "Messwerkzeuge",
        items: [
          "Messuhren - analog und digital",
          "Passameter",
          "Lehren - Ringe und Stopfen",
          "Metallwinkel und Lineale",
          "Winkelmesser, Gewindelehren, Fühlerlehren und Profillehren",
          "Rollmeter, Wasserwaagen und weitere",
          "Messschieber - Nonius, analog und digital",
          "Mikrometer - Standard und digital",
          "Innenmessgeräte - digital, analog und Dreipunkt-Ausführung",
        ],
      },
      {
        title: "Hand- und Montagewerkzeuge",
        items: [
          "Schlüssel - Maul-, Ring-, Steck-, Inbus-, verstellbare und Schlag-Ausführungen",
          "Steckschlüsselsätze und Ersatzteile",
          "Feilen für Metall und Holz - verschiedene Profile und Längen",
          "Schraubstöcke",
          "Schraubendreher - Schlitz, PH, PZ, Torx und Schlag-Ausführungen",
          "Buchstaben- und Zahlenstempel",
          "Elektrotechnische Werkzeuge",
          "Stehbolzenausdreher",
        ],
      },
      {
        title: "Maschinenzubehör und Spanntechnik",
        items: [
          "Spannzangenfutter, Reduzierhülsen und Aufnahmen",
          "Spannzangen",
          "Aufnahmedorne",
          "Dreh- und Fräshalter",
          "Spannelemente",
          "Mitlaufende und feste Zentrierspitzen",
          "Ausdrehköpfe",
          "Maschinenschraubstöcke",
          "Drehfutter, Planscheiben und Bohrfutter",
        ],
      },
    ],
  },
};

export default function AboutUs() {
  const { language } = useLanguage();
  const content = aboutContent[language] || aboutContent.bg;

  return (
    <main className="container about-page">
      <section className="about-hero page-surface">
        <div className="about-hero-copy">
          <span className="page-kicker">{content.heroKicker}</span>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
        </div>
        <div className="about-hero-media">
          <img src={aboutImage} alt={content.imageAlt} loading="lazy" decoding="async" />
        </div>
      </section>

      <section className="about-grid">
        <article className="page-surface about-text">
          <span className="page-kicker">{content.activityKicker}</span>
          <h2>{content.activityTitle}</h2>
          {content.activityParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>

        <aside className="page-surface industries-panel">
          <span className="page-kicker">{content.industriesKicker}</span>
          <h2>{content.industriesTitle}</h2>
          <div className="industry-list">
            {content.industries.map((industry) => (
              <span key={industry}>{industry}</span>
            ))}
          </div>
        </aside>
      </section>

      <section className="page-surface product-range">
        <div className="section-title-row">
          <div>
            <span className="page-kicker">{content.rangeKicker}</span>
            <h2>{content.rangeTitle}</h2>
          </div>
          <p>{content.rangeText}</p>
        </div>

        <div className="product-range-grid">
          {content.productGroups.map((group, index) => (
            <article className="range-card" key={group.title}>
              <header className="range-card-head">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{group.title}</h3>
              </header>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
