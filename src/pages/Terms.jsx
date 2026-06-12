import { useEffect } from "react";
import { useLanguage } from "../utils/language";
import "../styles/terms.css";

const termsCopy = {
  bg: {
    kicker: "Правна информация",
    title: "Общи условия",
    intro: [
      "Този уеб сайт (www.Eksait.com) и всички изображения, видеа, програмен код и свързана информация под формата на съдържание (занапред наричани „Сайт“ или „Сайтът“) са собственост на „Ексайт Къмпани“ ООД, ЕИК: 200257153, със седалище и адрес на управление гр. Стара Загора 6000, кв. Трите чучура 68 вх.А, ап.26.",
      "Целта на настоящите общи условия е да фиксира отношенията между „Ексайт Къмпани“ ООД (занапред наричан „Търговец“) и всички физически или юридически лица (занапред наричани „Клиенти“), които искат да закупят продукти, предлагани в онлайн пространството от Сайта.",
    ],
    navAria: "Навигация в общите условия",
    sectionsLabel: "Раздели",
    sections: [
      {
        id: "general",
        title: "I Общи разпоредби",
        paragraphs: [
          "1.1 Информация, изисквана от Закона за защита на потребители, Закона за електронна търговия и Директивите на Европейския съюз за продажба на продукти в Интернет.",
          "Търговско наименование на Търговеца: „Ексайт Къмпани“ ООД. Седалище и адрес на управление: гр. Стара Загора 6000, кв. Трите чучура 68 вх. А, ап.26. ЕИК: 200257153.",
          "1.2. Сайтът е достъпен на адрес www.eksait.com и чрез него Клиентите могат да закупуват продукти и да получават услуги, свързани с доставката им.",
          "1.3. Чрез Сайта Клиентите могат да получават информация за нови продукти, характеристики, цени, условия за доставка и промоции.",
          "1.4. Търговецът доставя поръчаните продукти според приложимите законови рамки и гарантира правата на Потребителите.",
          "1.5. Търговецът използва услугите на куриерска компания Еконт Експрес ООД. Цената за доставка се определя отделно от цената на стоките и се показва при процеса на поръчка.",
        ],
      },
      {
        id: "orders",
        title: "II Поръчка, доставка и документи при поръчка",
        paragraphs: [
          "2.1. За да направи поръчка, Клиентът избира продукт и количество, след което въвежда данни за доставка.",
          "2.2. При поръчка Клиентът трябва да се съгласи с настоящите общи условия. При несъгласие поръчката не може да бъде завършена.",
          "2.3. Клиентът се задължава да въвежда точни, актуални и коректни данни за доставка и контакт.",
          "2.4. Имейлът и телефонът, предоставени при поръчка, се използват като канал за комуникация и обмен на електронни документи между Търговеца и Клиента.",
          "2.5. Промени по поръчка се заявяват само чрез предоставените при поръчката контакти.",
          "2.6. След потвърждение Клиентът получава информация за поръчката на посочения имейл адрес.",
          "2.7. Поръчаните артикули се доставят чрез куриерска компания Еконт Експрес ООД.",
          "2.8. Срокът за изпълнение на доставката е 5 работни дни.",
          "2.9. Ако Търговецът не може да изпълни поръчка поради липса на наличност, той уведомява Клиента.",
        ],
      },
      {
        id: "consumer-protection",
        title: "III Защита на потребителите",
        paragraphs: [
          "3.1. Разпоредбите се прилагат спрямо лица, които са потребители по смисъла на Закона за защита на потребителите, Закона за електронната търговия и Директива 2011/83/EC.",
          "3.2. Основните характеристики на продуктите са описани на страницата на съответния продукт.",
          "3.3. Цените на продуктите са крайни и включват изискваните по закон данъци или такси.",
          "3.4. Пощенските и куриерските разходи не са включени в цената на продуктите и се предоставят като информация преди изпращане на поръчката.",
          "3.5. Информацията, предоставяна на Клиентите, е актуална към момента на визуализирането й в Сайта.",
          "3.6. Търговецът посочва условията за доставка на отделните продукти в Сайта.",
          "3.7. Продуктите се заплащат с избрания от Клиента метод на плащане.",
        ],
      },
      {
        id: "returns",
        title: "IV Отказ от стока",
        paragraphs: [
          "4.1. Клиентът има право да се откаже от поръчаните стоки в срок от 14 дни от получаването им, ако не са използвани, опаковката не е нарушена и са във вида, в който са получени.",
          "4.2. При установен дефект до 24 часа от получаване и при ненарушен търговски вид Търговецът може да подмени продукта или да възстанови платената сума съгласно приложимото законодателство.",
          "4.2.1. Не се приемат продукти със следи от манипулации или друг тип интервенция.",
          "4.2.2. Не се приемат продукти със следи от опит за самостоятелно отстраняване на дефект.",
          "4.2.3. Не се приемат продукти със следи от силов натиск или интервенция.",
          "4.2.4. Не се приемат продукти с демонтирани елементи.",
          "4.3. Транспортните и други разходи по връщане са за сметка на клиента, освен в случаите, предвидени от закона.",
          "4.4. Продукти могат да се върнат единствено на адрес: гр. Стара Загора, ул. Никола Икономов №5, получател „Ексайт Къмпани“ ООД, телефон за контакт 0886496896.",
          "4.5. Клиентът се задължава да съхранява получените продукти с грижата на добър стопанин и да пази оригиналната опаковка за срока на възможност за връщане.",
        ],
      },
      {
        id: "other",
        title: "V Други условия",
        paragraphs: [
          "5.1. Търговецът доставя и предава стоката на Клиента в определените срокове.",
          "5.2. Клиентът трябва да прегледа продуктите при получаване и при несъответствие да уведоми Търговеца незабавно.",
          "5.3. Търговецът предприема мерки за опазване на личните данни на Клиента според Закона за защита на личните данни.",
          "5.4. Клиентът се съгласява Търговецът да обработва личните му данни само за целите на направените поръчки, освен ако компетентен орган не разпореди друго.",
          "5.5. Клиентът се съгласява да получава търговски съобщения от Търговеца за бъдещи маркетинг цели и кампании.",
          "5.6. Настоящите общи условия са видими постоянно на адрес www.eksait.com и могат да бъдат изменяни от Търговеца.",
          "5.7. Недействителността на отделна разпоредба не води до недействителност на поръчката.",
          "5.8. За неуредените въпроси страните прилагат законите на Република България и компетентните органи по адрес и седалище на Търговеца.",
        ],
      },
    ],
  },
  en: {
    kicker: "Legal information",
    title: "Terms and conditions",
    intro: [
      "This website (www.Eksait.com), including all images, videos, source code and related content, is owned by Excite Company Ltd., UIC: 200257153, with registered office and address of management in Stara Zagora 6000, Trite Chuchura district 68, entrance A, apt. 26.",
      "These terms govern the relationship between Excite Company Ltd. (the Merchant) and all natural or legal persons (Customers) who wish to purchase products offered through the Site.",
    ],
    navAria: "Terms navigation",
    sectionsLabel: "Sections",
    sections: [
      {
        id: "general",
        title: "I General provisions",
        paragraphs: [
          "1.1. This section contains information required by consumer protection, electronic commerce and European Union rules for online product sales.",
          "Merchant trade name: Excite Company Ltd. Registered office: Stara Zagora 6000, Trite Chuchura district 68, entrance A, apt. 26. UIC: 200257153.",
          "1.2. The Site is available at www.eksait.com and allows Customers to purchase products and receive services related to their delivery.",
          "1.3. Through the Site, Customers can receive information about new products, characteristics, prices, delivery terms and promotions.",
          "1.4. The Merchant delivers ordered products under the applicable legal framework and respects consumer rights.",
          "1.5. The Merchant uses Econt Express Ltd. as courier. Delivery cost is separate from product price and is shown during checkout.",
        ],
      },
      {
        id: "orders",
        title: "II Orders, delivery and order documents",
        paragraphs: [
          "2.1. To place an order, the Customer selects a product and quantity, then enters delivery details.",
          "2.2. The Customer must accept these terms to complete an order.",
          "2.3. The Customer must provide accurate and up-to-date delivery and contact details.",
          "2.4. The email and phone number provided during checkout are used for communication and electronic document exchange.",
          "2.5. Order changes can be requested only through the contact details provided during checkout.",
          "2.6. After confirmation, the Customer receives order information at the provided email address.",
          "2.7. Ordered items are delivered through Econt Express Ltd.",
          "2.8. The delivery execution period is 5 working days.",
          "2.9. If the Merchant cannot fulfil an order due to lack of stock, the Customer will be notified.",
        ],
      },
      {
        id: "consumer-protection",
        title: "III Consumer protection",
        paragraphs: [
          "3.1. These provisions apply to persons considered consumers under applicable consumer protection, electronic commerce and Directive 2011/83/EC rules.",
          "3.2. Product characteristics are described on the relevant product page.",
          "3.3. Product prices are final and include legally required taxes or fees.",
          "3.4. Postal and courier costs are not included in the product price and are shown before order submission.",
          "3.5. The information provided to Customers is current at the time it is displayed on the Site.",
          "3.6. The Merchant states the delivery terms for individual products on the Site.",
          "3.7. Products are paid for using the payment method selected by the Customer.",
        ],
      },
      {
        id: "returns",
        title: "IV Withdrawal and returns",
        paragraphs: [
          "4.1. The Customer may withdraw from ordered goods within 14 days of receipt if they are unused, the packaging is intact and the goods are in the condition in which they were received.",
          "4.2. If a defect is found within 24 hours of receipt and the commercial appearance is intact, the Merchant may replace the product or refund the paid amount under applicable law.",
          "4.2.1. Products with signs of manipulation or intervention are not accepted.",
          "4.2.2. Products with signs of attempted self-repair are not accepted.",
          "4.2.3. Products with signs of forceful pressure or intervention are not accepted.",
          "4.2.4. Products with removed elements are not accepted.",
          "4.3. Transport and return costs are borne by the Customer except where the law provides otherwise.",
          "4.4. Products may be returned only to: Stara Zagora, 5 Nikola Ikonomov St., recipient Excite Company Ltd., contact phone 0886496896.",
          "4.5. The Customer must keep the products with due care and preserve the original packaging during the return period.",
        ],
      },
      {
        id: "other",
        title: "V Other terms",
        paragraphs: [
          "5.1. The Merchant delivers and hands over the goods within the specified periods.",
          "5.2. The Customer must inspect the products upon receipt and notify the Merchant immediately if there is any discrepancy.",
          "5.3. The Merchant takes measures to protect the Customer's personal data under applicable data protection law.",
          "5.4. The Customer agrees that the Merchant processes personal data only for order purposes unless a competent authority orders otherwise.",
          "5.5. The Customer agrees to receive commercial messages from the Merchant for future marketing purposes and campaigns.",
          "5.6. These terms are permanently visible at www.eksait.com and may be amended by the Merchant.",
          "5.7. Invalidity of a single provision does not invalidate the order.",
          "5.8. For matters not covered by these terms, the laws of the Republic of Bulgaria and the competent authorities at the Merchant's address and registered office apply.",
        ],
      },
    ],
  },
  de: {
    kicker: "Rechtliche Informationen",
    title: "Allgemeine Bedingungen",
    intro: [
      "Diese Website (www.Eksait.com) einschließlich aller Bilder, Videos, Quellcodes und zugehörigen Inhalte ist Eigentum von Excite Company Ltd., UIC: 200257153, mit Sitz in Stara Zagora 6000, Wohnviertel Trite Chuchura 68, Eingang A, Wohnung 26.",
      "Diese Bedingungen regeln die Beziehung zwischen Excite Company Ltd. (dem Händler) und allen natürlichen oder juristischen Personen (Kunden), die Produkte über die Website kaufen möchten.",
    ],
    navAria: "Navigation in den Bedingungen",
    sectionsLabel: "Abschnitte",
    sections: [
      {
        id: "general",
        title: "I Allgemeine Bestimmungen",
        paragraphs: [
          "1.1. Dieser Abschnitt enthält Informationen, die nach Verbraucherschutz-, E-Commerce- und EU-Regeln für Online-Produktverkäufe erforderlich sind.",
          "Handelsname des Händlers: Excite Company Ltd. Sitz: Stara Zagora 6000, Wohnviertel Trite Chuchura 68, Eingang A, Wohnung 26. UIC: 200257153.",
          "1.2. Die Website ist unter www.eksait.com erreichbar und ermöglicht Kunden, Produkte zu kaufen und damit verbundene Lieferleistungen zu erhalten.",
          "1.3. Über die Website erhalten Kunden Informationen zu neuen Produkten, Eigenschaften, Preisen, Lieferbedingungen und Aktionen.",
          "1.4. Der Händler liefert bestellte Produkte gemäß den geltenden gesetzlichen Rahmenbedingungen und wahrt Verbraucherrechte.",
          "1.5. Der Händler nutzt Econt Express Ltd. als Kurierdienst. Die Lieferkosten werden getrennt vom Produktpreis ausgewiesen und im Checkout angezeigt.",
        ],
      },
      {
        id: "orders",
        title: "II Bestellung, Lieferung und Bestelldokumente",
        paragraphs: [
          "2.1. Zur Bestellung wählt der Kunde ein Produkt und eine Menge aus und gibt anschließend Lieferdaten ein.",
          "2.2. Der Kunde muss diese Bedingungen akzeptieren, um eine Bestellung abzuschließen.",
          "2.3. Der Kunde muss korrekte und aktuelle Liefer- und Kontaktdaten angeben.",
          "2.4. Die beim Checkout angegebene E-Mail-Adresse und Telefonnummer werden für Kommunikation und elektronische Dokumente genutzt.",
          "2.5. Änderungen an Bestellungen können nur über die beim Checkout angegebenen Kontaktdaten beantragt werden.",
          "2.6. Nach Bestätigung erhält der Kunde Bestellinformationen an die angegebene E-Mail-Adresse.",
          "2.7. Bestellte Artikel werden über Econt Express Ltd. geliefert.",
          "2.8. Die Lieferfrist beträgt 5 Werktage.",
          "2.9. Kann der Händler eine Bestellung wegen fehlender Verfügbarkeit nicht erfüllen, wird der Kunde benachrichtigt.",
        ],
      },
      {
        id: "consumer-protection",
        title: "III Verbraucherschutz",
        paragraphs: [
          "3.1. Diese Bestimmungen gelten für Personen, die nach geltendem Verbraucher-, E-Commerce- und Richtlinie-2011/83/EC-Recht als Verbraucher gelten.",
          "3.2. Die wichtigsten Produkteigenschaften sind auf der jeweiligen Produktseite beschrieben.",
          "3.3. Produktpreise sind Endpreise und enthalten gesetzlich vorgeschriebene Steuern oder Gebühren.",
          "3.4. Post- und Kurierkosten sind nicht im Produktpreis enthalten und werden vor Absenden der Bestellung angezeigt.",
          "3.5. Die den Kunden bereitgestellten Informationen sind zum Zeitpunkt der Anzeige auf der Website aktuell.",
          "3.6. Der Händler gibt Lieferbedingungen für einzelne Produkte auf der Website an.",
          "3.7. Produkte werden mit der vom Kunden gewählten Zahlungsmethode bezahlt.",
        ],
      },
      {
        id: "returns",
        title: "IV Widerruf und Rücksendungen",
        paragraphs: [
          "4.1. Der Kunde kann bestellte Waren innerhalb von 14 Tagen nach Erhalt zurückgeben, wenn sie unbenutzt sind, die Verpackung unbeschädigt ist und sie sich im erhaltenen Zustand befinden.",
          "4.2. Wird innerhalb von 24 Stunden nach Erhalt ein Defekt festgestellt und ist der handelsübliche Zustand erhalten, kann der Händler das Produkt ersetzen oder den gezahlten Betrag nach geltendem Recht erstatten.",
          "4.2.1. Produkte mit Spuren von Manipulation oder Eingriffen werden nicht angenommen.",
          "4.2.2. Produkte mit Spuren eines selbstständigen Reparaturversuchs werden nicht angenommen.",
          "4.2.3. Produkte mit Spuren von starker Krafteinwirkung oder Eingriffen werden nicht angenommen.",
          "4.2.4. Produkte mit demontierten Elementen werden nicht angenommen.",
          "4.3. Transport- und Rücksendekosten trägt der Kunde, außer soweit das Gesetz etwas anderes vorsieht.",
          "4.4. Produkte können nur an folgende Adresse zurückgesendet werden: Stara Zagora, Nikola Ikonomov Str. 5, Empfänger Excite Company Ltd., Kontakttelefon 0886496896.",
          "4.5. Der Kunde muss die erhaltenen Produkte sorgfältig aufbewahren und die Originalverpackung während der Rückgabefrist erhalten.",
        ],
      },
      {
        id: "other",
        title: "V Weitere Bedingungen",
        paragraphs: [
          "5.1. Der Händler liefert und übergibt die Ware innerhalb der angegebenen Fristen.",
          "5.2. Der Kunde muss die Produkte bei Erhalt prüfen und den Händler bei Abweichungen unverzüglich informieren.",
          "5.3. Der Händler trifft Maßnahmen zum Schutz personenbezogener Daten des Kunden nach geltendem Datenschutzrecht.",
          "5.4. Der Kunde stimmt zu, dass der Händler personenbezogene Daten nur zu Bestellzwecken verarbeitet, sofern keine zuständige Behörde etwas anderes anordnet.",
          "5.5. Der Kunde stimmt zu, kommerzielle Mitteilungen des Händlers für zukünftige Marketingzwecke und Kampagnen zu erhalten.",
          "5.6. Diese Bedingungen sind dauerhaft unter www.eksait.com sichtbar und können vom Händler geändert werden.",
          "5.7. Die Unwirksamkeit einer einzelnen Bestimmung macht die Bestellung nicht unwirksam.",
          "5.8. Für nicht geregelte Fragen gelten die Gesetze der Republik Bulgarien und die zuständigen Behörden am Sitz des Händlers.",
        ],
      },
    ],
  },
};

export default function Terms() {
  const { language } = useLanguage();
  const copy = termsCopy[language] || termsCopy.bg;

  function scrollToSection(sectionId, updateUrl = true) {
    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    if (updateUrl) {
      window.history.pushState(
        { ...(window.history.state || {}), __appScrollState: true, scrollY: window.scrollY },
        "",
        `/terms#${sectionId}`,
      );
    }

    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const sectionId = window.location.hash.replace("#", "");

    if (!sectionId) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => scrollToSection(sectionId, false));

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return (
    <main className="container terms-page">
      <section className="page-surface terms-hero">
        <span className="page-kicker">{copy.kicker}</span>
        <h1>{copy.title}</h1>
        {copy.intro.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>

      <div className="terms-layout">
        <aside className="terms-nav page-surface" aria-label={copy.navAria}>
          <span className="page-kicker">{copy.sectionsLabel}</span>
          {copy.sections.map((section) => (
            <a
              href={`#${section.id}`}
              key={section.id}
              onClick={(event) => {
                event.preventDefault();
                scrollToSection(section.id);
              }}
            >
              {section.title}
            </a>
          ))}
        </aside>

        <section className="terms-content">
          {copy.sections.map((section) => (
            <article className="page-surface terms-section" id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
