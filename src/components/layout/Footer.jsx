import { useEffect, useState } from "react";
import { fetchEquipmentProducts } from "../../api/equipment";
import { useLanguage } from "../../utils/language";
import logo from "../../assets/es-logo1.png";
import "../../styles/layout.css";

export default function Footer() {
  const { language, t } = useLanguage();
  const [hasEquipmentProducts, setHasEquipmentProducts] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadEquipmentAvailability() {
      try {
        const equipmentProducts = await fetchEquipmentProducts({ force: true, language });
        if (isMounted) {
          setHasEquipmentProducts(equipmentProducts.length > 0);
        }
      } catch {
        if (isMounted) {
          setHasEquipmentProducts(false);
        }
      }
    }

    loadEquipmentAvailability();

    return () => {
      isMounted = false;
    };
  }, [language]);

  return (
    <footer className="site-footer">
      <div className="footer-top-line"></div>

      <div className="layout-container footer-container">
        <div className="footer-brand">
          <a href="/" className="footer-logo-link" aria-label={t("footer.brandAria")}>
            <img src={logo} alt="Excite Company" className="footer-logo" loading="lazy" decoding="async" />
          </a>

          <h4>{t("footer.brand")}</h4>
          <p>{t("footer.brandText")}</p>
        </div>

        <div className="footer-column">
          <h4>{t("footer.nav")}</h4>
          <ul>
            <li><a href="/">{t("nav.home")}</a></li>
            <li><a href="/about">{t("nav.about")}</a></li>
            <li><a href="/category">{t("nav.tools")}</a></li>
            {hasEquipmentProducts && <li><a href="/equipment">{t("nav.equipment")}</a></li>}
            <li><a href="/contact">{t("nav.contact")}</a></li>
          </ul>
        </div>

        <div className="footer-column">
          <h4>{t("footer.client")}</h4>
          <ul>
            <li><a href="/login">{t("footer.myProfile")}</a></li>
            <li><a href="/cart">{t("footer.order")}</a></li>
            <li><a href="/terms">{t("footer.terms")}</a></li>
          </ul>
        </div>

        <div className="footer-column">
          <h4>{t("common.contacts")}</h4>
          <p>{t("footer.location")}</p>
          <p>{t("footer.phone")}: 0988 335 555</p>
          <p>Email: office@eksait.com</p>
          <p>{t("footer.workHours")}</p>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="layout-container footer-bottom-inner">
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
