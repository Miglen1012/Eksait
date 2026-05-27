import logo from "../../assets/es-logo1.png";
import "../../styles/layout.css";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top-line"></div>

      <div className="layout-container footer-container">
        <div className="footer-brand">
          <a href="/" className="footer-logo-link" aria-label="Excite Company начало">
            <img src={logo} alt="Excite Company" className="footer-logo" loading="lazy" decoding="async" />
          </a>

          <h4>Ексайт Къмпани ООД</h4>
          <p>
            Голяма част от предлаганите изделия се поддържат в наличност, и при
            необходимост от спешна доставка можем да реагираме своевременно.
            Това ни дава възможност да бъдем гъвкави и да обслужваме нашите клиенти,
            като удовлетворяваме и техните специфични производствени нужди.
            Стремим се да постигнем оптимално съотношение между качество и цена.
          </p>
        </div>

        <div className="footer-column">
          <h4>Навигация</h4>
          <ul>
            <li><a href="/">Начало</a></li>
            <li><a href="/about">За нас</a></li>
            <li><a href="/category">Инструменти</a></li>
            <li><a href="/equipment">Оборудване</a></li>
            <li><a href="/contact">Контакти</a></li>
          </ul>
        </div>

        <div className="footer-column">
          <h4>За клиента</h4>
          <ul>
            <li><a href="/login">Моят профил</a></li>
            <li><a href="/cart">Поръчка</a></li>
            <li><a href="/terms">Общи условия</a></li>
          </ul>
        </div>

        <div className="footer-column">
          <h4>Контакти</h4>
          <p>гр. Стара Загора, България</p>
          <p>Тел: 0988 335 555</p>
          <p>Email: office@eksait.com</p>
          <p>Пон. - Пет.: 09:00 - 17:30</p>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="layout-container footer-bottom-inner">
          <p>© {new Date().getFullYear()} Ексайт Къмпани ООД. Всички права запазени.</p>
        </div>
      </div>
    </footer>
  );
}
