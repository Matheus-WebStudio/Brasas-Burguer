(() => {
  const key = "brasa-burger.demo.v1";
  const demoCustomers = ["Cliente Demo 01", "Cliente Demo 02", "Cliente Demo 03"];
  const categories = [
    { id: "smash", name: "Smash burgers" },
    { id: "extras", name: "Acompanhamentos" },
    { id: "drinks", name: "Bebidas" }
  ];
  const products = [
    { id: "classico", name: "Brasa Clássico", category: "smash", price: 2890, stock: 22, active: true, image: "assets/classico.webp", description: "Smash bovino, queijo, picles e molho da casa." },
    { id: "bacon", name: "Bacon Fumê", category: "smash", price: 3690, stock: 14, active: true, image: "assets/bacon.webp", description: "Dois smash, queijo derretido e bacon crocante." },
    { id: "fritas", name: "Fritas da Casa", category: "extras", price: 1690, stock: 5, active: true, image: "assets/fritas.webp", description: "Fritas onduladas e temperadas, sequinhas e crocantes." },
    { id: "refri", name: "Refrigerante", category: "drinks", price: 690, stock: 18, active: true, image: "", description: "Lata gelada de 350 ml." }
  ];
  const status = ["Recebido", "Em preparo", "Pronto", "Concluído", "Cancelado"];
  const next = { Recebido: ["Em preparo", "Cancelado"], "Em preparo": ["Pronto", "Cancelado"], Pronto: ["Concluído", "Cancelado"], Concluído: [], Cancelado: [] };
  function makeOrder(id, customer, lines, at, state = "Recebido") {
    return { id, customer, lines, at, status: state, history: state === "Recebido" ? [{ at, status: state }] : [{ at, status: "Recebido" }, { at: at + 1800000, status: state }] };
  }
  function seed() {
    const now = Date.now() - 3600000;
    const samples = [3, 1, 0, 2, 0, 1, 2].map((days, i) => {
      const p = products[i % products.length];
      return makeOrder("DEMO-10" + (i + 1), demoCustomers[i % demoCustomers.length],
        [{ name: p.name, price: p.price, qty: i % 3 + 1 }], now - days * 86400000,
        ["Concluído", "Concluído", "Recebido", "Concluído", "Em preparo", "Cancelado", "Concluído"][i]);
    });
    return structuredClone({
      categories, products, orders: samples.sort((a, b) => b.at - a.at),
      content: { kicker: "SMASH & FOGO", title: "NA BRASA.", highlight: "SEM MISÉRIA.", intro: "Smash crocante, queijo derretendo e aquele sabor defumado que só o fogo entrega.", hero: "assets/hero.webp", mobile: "assets/hero-mobile.webp", banner: "", about: "A BRASA BURGER nasceu no portfólio da Matheus Web Studio com uma ideia simples: imaginar uma hamburgueria que leva a chapa quente a sério. No cardápio, o pão tostado segura a carne com bordas crocantes, o queijo fundido e o toque ácido dos picles." },
      settings: { name: "BRASA BURGER", address: "Rua da Chapa, 00\nBairro Braseiro · Cidade fictícia", hours: "Terça a quinta · 18h às 22h\nSexta a domingo · 18h às 23h", contact: "Monte sua sacola para ver a mensagem do pedido. O contato depende da configuração de um número autorizado.", whatsapp: window.BRASA_CONFIG?.whatsappNumber || "" }
    });
  }
  function read() {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      const initial = seed();
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved?.products) || !Array.isArray(saved.categories) || !Array.isArray(saved.orders) || !saved.content || !saved.settings) {
      throw new Error("Os dados locais da demonstração não puderam ser lidos.");
    }
    return saved;
  }
  function update(change) {
    const state = read();
    change(state);
    localStorage.setItem(key, JSON.stringify(state));
    return state;
  }
  const payments = { cash: "Dinheiro", pix: "Pix", card: "Cartão na maquininha da loja" };
  function checkoutDetails(fields) {
    const clean = (value, limit) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
    const { method, payment } = fields;
    const customer = clean(fields.customer, 80);
    const phone = clean(fields.phone, 25);
    const address = clean(fields.address, 240);
    if (!customer) throw new Error("Preencha o nome do cliente.");
    if (!phone) throw new Error("Preencha o telefone.");
    if (!customerWhatsappNumber(phone)) {
      throw new Error("Informe um telefone com DDD. Para outros países, inclua + e o código do país.");
    }
    if (method !== "pickup" && method !== "delivery") throw new Error("Selecione entrega ou retirada.");
    if (!address) throw new Error("Preencha o endereço.");
    if (!Object.hasOwn(payments, payment)) throw new Error("Selecione a forma de pagamento.");
    return { customer, method, address, phone, payment, reference: clean(fields.reference, 120) };
  }
  function place(cart, fields) {
    if (!cart.length) throw new Error("A sacola está vazia.");
    const { customer, ...details } = checkoutDetails(fields);
    return update(state => {
      const lines = cart.map(({ productId, qty, note }) => {
        const p = state.products.find(item => item.id === productId);
        if (!Number.isInteger(qty) || qty < 1 || !p?.active || p.stock < qty) {
          throw new Error("A disponibilidade mudou. Revise a sacola e tente novamente.");
        }
        p.stock -= qty;
        return { productId: p.id, name: p.name, price: p.price, qty, note: String(note ?? "").trim().slice(0, 160) };
      });
      const id = "DEMO-" + crypto.randomUUID().slice(0, 8).toUpperCase();
      state.orders.unshift({ ...makeOrder(id, customer, lines, Date.now()), details });
    }).orders[0];
  }
  function transition(state, id, value) {
    const order = state.orders.find(item => item.id === id);
    if (!order || !next[order.status].includes(value)) throw new Error("O status mudou. Atualize a página.");
    if (value === "Cancelado") {
      for (const line of order.lines) {
        const product = state.products.find(item => item.id === line.productId);
        if (product) product.stock += line.qty;
      }
    }
    order.status = value;
    order.history.push({ status: value, at: Date.now() });
  }
  const money = cents => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  const total = order => order.lines.reduce((sum, line) => sum + line.qty * line.price, 0);
  const when = at => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(at);
  function orderFields(customer, details) {
    return [
      ["Cliente", customer],
      ["Modalidade", details?.method === "delivery" ? "Entrega" : details?.method === "pickup" ? "Retirada no balcão" : ""],
      ["Telefone", details?.phone], ["Endereço", details?.address], ["Referência", details?.reference],
      ["Pagamento", Object.hasOwn(payments, details?.payment) ? payments[details.payment] : ""]
    ].filter(([, value]) => value);
  }
  function whatsappUrl(number, message) {
    return /^[1-9]\d{7,14}$/.test(number ?? "")
      ? "https://wa.me/" + number + "?text=" + encodeURIComponent(message)
      : "";
  }
  function customerWhatsappNumber(phone) {
    const value = (phone ?? "").trim();
    const digits = value.replace(/\D/g, "");
    if (!/^\+?[\d().\s-]+$/.test(value)) return "";
    if (value.startsWith("+")) return /^[1-9]\d{7,14}$/.test(digits) ? digits : "";
    if (/^[1-9]\d[1-9]\d{7,8}$/.test(digits)) return "55" + digits;
    return /^55[1-9]\d[1-9]\d{7,8}$/.test(digits) ? digits : "";
  }
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const image = value => /^(assets\/[a-z\d_.-]+\.(webp|png|jpe?g|avif)|data:image\/(webp|png|jpeg|avif);base64,[a-z\d+/=]+)$/i.test(value);
  window.Brasa = { key, read, update, place, checkoutDetails, orderFields, whatsappUrl, customerWhatsappNumber, transition, seed, status, next, demoCustomers, money, total, when, escape, image };
})();

