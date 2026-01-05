// src/i18n/i18n.js
export const LANGS = ["sq", "en", "it"];

export const getInitialLang = (searchParams) => {
  const fromQuery = (searchParams?.get("lang") || "").toLowerCase().trim();
  if (LANGS.includes(fromQuery)) {
    localStorage.setItem("lang", fromQuery);
    return fromQuery;
  }

  const fromStorage = (localStorage.getItem("lang") || "").toLowerCase().trim();
  if (LANGS.includes(fromStorage)) return fromStorage;

  localStorage.setItem("lang", "sq");
  return "sq";
};

export const setLangPersist = (lang) => {
  if (!LANGS.includes(lang)) return;
  localStorage.setItem("lang", lang);
};

const dict = {
  sq: {
    menuTitle: "Menu",
    autoUpdate: "Çmimet përditësohen automatikisht",
    syncing: "Po përditësohet…",
    searchPlaceholder: "Kërko produkt…",
    clear: "Pastro",
    categories: "Kategoritë",
    all: "Të gjitha",
    items: "artikuj",
    emptyTitle: "S’u gjet asnjë produkt",
    emptySub: "Provo një kërkim tjetër ose ndrysho kategorinë.",
    tip: "Tip: Nëse menaxheri ndryshon çmime/produkte, kjo faqe përditësohet vetë ✅",

    orderTitle: "Porosi",
    orderSubtitle: "Zgjidh produktet dhe dërgo porosinë.",
    live: "Live",
    invalidQR: "Ky QR nuk është i vlefshëm (mungojnë të dhënat e dhomës/cadrës).",
    loadingMenu: "Duke ngarkuar menunë...",
    add: "Shto",
    send: "Dërgo porosinë",
    sending: "Duke dërguar...",
    chooseAtLeastOne: "Zgjidh të paktën një produkt për të bërë porosi.",
    noProductsForFilter: "Nuk ka produkte për këtë filtër.",
    invoice: "FATURË",
    total: "Totali",
    print: "Printo faturën",
    anotherOrder: "Porosi tjetër",
    orderSent: "✅ Porosia u dërgua! Një kamarier do vijë së shpejti.",
    status: "Status",
    id: "ID",
    decreaseQty: "Ul sasinë",
    increaseQty: "Rrit sasinë",
  },

  en: {
    menuTitle: "Menu",
    autoUpdate: "Prices update automatically",
    syncing: "Updating…",
    searchPlaceholder: "Search products…",
    clear: "Clear",
    categories: "Categories",
    all: "All",
    items: "items",
    emptyTitle: "No products found",
    emptySub: "Try another search or change the category.",
    tip: "Tip: If the manager changes prices/products, this page updates automatically ✅",

    orderTitle: "Order",
    orderSubtitle: "Choose items and send your order.",
    live: "Live",
    invalidQR: "Invalid QR (missing room/umbrella info).",
    loadingMenu: "Loading menu...",
    add: "Add",
    send: "Send order",
    sending: "Sending...",
    chooseAtLeastOne: "Please select at least one product to place an order.",
    noProductsForFilter: "No products for this filter.",
    invoice: "INVOICE",
    total: "Total",
    print: "Print invoice",
    anotherOrder: "New order",
    orderSent: "✅ Order sent! A waiter will come soon.",
    status: "Status",
    id: "ID",
    decreaseQty: "Decrease quantity",
    increaseQty: "Increase quantity",
  },

  it: {
    menuTitle: "Menù",
    autoUpdate: "I prezzi si aggiornano automaticamente",
    syncing: "Aggiornamento…",
    searchPlaceholder: "Cerca prodotti…",
    clear: "Pulisci",
    categories: "Categorie",
    all: "Tutti",
    items: "articoli",
    emptyTitle: "Nessun prodotto trovato",
    emptySub: "Prova un’altra ricerca o cambia categoria.",
    tip: "Suggerimento: se il manager cambia prezzi/prodotti, questa pagina si aggiorna automaticamente ✅",

    orderTitle: "Ordine",
    orderSubtitle: "Scegli i prodotti e invia l’ordine.",
    live: "Live",
    invalidQR: "QR non valido (mancano dati di stanza/ombrellone).",
    loadingMenu: "Caricamento menù...",
    add: "Aggiungi",
    send: "Invia ordine",
    sending: "Invio...",
    chooseAtLeastOne: "Scegli almeno un prodotto per fare l’ordine.",
    noProductsForFilter: "Nessun prodotto per questo filtro.",
    invoice: "FATTURA",
    total: "Totale",
    print: "Stampa fattura",
    anotherOrder: "Nuovo ordine",
    orderSent: "✅ Ordine inviato! Un cameriere arriverà presto.",
    status: "Stato",
    id: "ID",
    decreaseQty: "Diminuisci quantità",
    increaseQty: "Aumenta quantità",
  },
};

export const makeT = (lang) => {
  const safeLang = LANGS.includes(lang) ? lang : "sq";
  return (key) => dict[safeLang]?.[key] ?? dict.sq[key] ?? key;
};
