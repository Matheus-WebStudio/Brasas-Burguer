(() => {
  const { read, key, money, escape: esc, image, place } = Brasa;
  const $ = id => document.getElementById(id);
  const cart = Object.create(null);
  const checkout = $("order");
  const cartButtons = [$("open-cart"), $("floating-cart")];
  let filter = "";
  let state;
  let selection;
  let checkoutLines = [];
  let confirmedOrder = false;
  const available = product => product?.active && product.stock > 0;
  const quantityOf = productId => Object.values(cart)
    .filter(line => line.productId === productId).reduce((sum, line) => sum + line.qty, 0);
  function refresh() {
    try {
      state = read();
      render();
      $("public-error").hidden = true;
    } catch (error) {
      $("public-error").textContent = "Não foi possível carregar a demonstração. Verifique se o navegador permite armazenamento local e recarregue a página.";
      $("public-error").hidden = false;
    }
  }
  function render() {
    const { content, settings, categories, products } = state;
    for (const [id, value] of Object.entries({
      "hero-kicker": content.kicker, "hero-lead": content.title, "hero-highlight": content.highlight,
      "hero-text": content.intro, "promo": content.banner, "about-copy": content.about,
      "shop-address": settings.address, "shop-hours": settings.hours, "shop-contact": settings.contact
    })) $(id).textContent = value;
    document.title = settings.name + " — Smash & Fogo | Matheus Web Studio";
    $("promo").hidden = !content.banner;
    $("hero-image").src = image(content.hero) ? content.hero : "assets/hero.webp";
    $("hero-mobile").srcset = image(content.mobile) ? content.mobile : $("hero-image").src;
    if (!categories.some(item => item.id === filter)) filter = "";
    $("filters").innerHTML = [{ id: "", name: "Todos" }, ...categories].map(category =>
      '<button type="button" data-filter="' + esc(category.id) + '" aria-pressed="' + (filter === category.id) + '">' + esc(category.name) + '</button>').join("");
    const visible = products.filter(product => !filter || product.category === filter);
    $("products").innerHTML = visible.map(p => `
      <article class="product">
        ${image(p.image) ? '<img loading="lazy" src="' + esc(p.image) + '" alt="">' : '<div class="product-art" aria-hidden="true">✦</div>'}
        <div class="product-info"><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p>
        <div class="product-bottom"><strong>${money(p.price)}</strong>
        <button type="button" data-add="${esc(p.id)}" ${available(p) ? "" : "disabled"}>${available(p) ? "Adicionar" : "Indisponível"}</button></div></div>
      </article>`).join("") || "<p>Sem produtos nesta categoria.</p>";
    renderCart();
  }
  function renderCart() {
    const lines = [];
    const remaining = new Map(state.products.map(product => [product.id, available(product) ? product.stock : 0]));
    for (const [id, line] of Object.entries(cart)) {
      const product = state.products.find(item => item.id === line.productId);
      const qty = Math.min(line.qty, remaining.get(line.productId) ?? 0);
      if (!qty) {
        delete cart[id];
        $("cart-feedback").textContent = "Um produto indisponível foi removido da sacola.";
        continue;
      }
      remaining.set(line.productId, remaining.get(line.productId) - qty);
      line.qty = qty;
      lines.push({ ...product, ...line, id });
    }
    const count = lines.reduce((sum, line) => sum + line.qty, 0);
    for (const button of cartButtons) {
      button.firstElementChild.textContent = count;
      button.setAttribute("aria-label", "Sacola, " + count + (count === 1 ? " item" : " itens"));
    }
    $("cart-body").innerHTML = lines.map(p => `<div class="cart-line"><div><strong>${esc(p.name)}</strong><br>${money(p.price)}
      ${p.note ? `<p class="cart-note">Obs.: ${esc(p.note)}</p>` : ""}
      <button type="button" class="edit-note" data-cart="${esc(p.id)}">Editar observação<span class="sr-only"> de ${esc(p.name)}</span></button></div>
      <div class="quantity"><button type="button" aria-label="Remover uma unidade de ${esc(p.name)}" data-cart="${esc(p.id)}" data-step="-1">−</button>
      <span>${p.qty}</span><button type="button" aria-label="Adicionar uma unidade de ${esc(p.name)}" data-cart="${esc(p.id)}" data-step="1" ${!remaining.get(p.productId) ? "disabled" : ""}>+</button></div></div>`).join("") || "<p>Sua sacola está vazia.</p>";
    $("cart-footer").hidden = lines.length === 0;
    checkoutLines = lines;
    $("total").textContent = money(Brasa.total({ lines }));
    renderCheckout();
    renderOrderWhatsApp();
  }
  function readCheckout() {
    return Object.fromEntries(new FormData(checkout));
  }
  function renderCheckout() {
    $("address-label").textContent = $("fulfillment").value === "delivery" ? "Endereço de entrega" : "Endereço do cliente";
    $("card-payment-note").hidden = $("payment").value !== "card";

    let message = "";
    try {
      const { customer, ...details } = Brasa.checkoutDetails(readCheckout());
      if (checkoutLines.length) {
        message = [
          "Pedido demonstrativo • " + state.settings.name,
          ...Brasa.orderFields(customer, details).map(([label, value]) => label + ": " + value),
          ...checkoutLines.flatMap(line => [
            line.qty + " × " + line.name + " — " + money(line.qty * line.price),
            ...(line.note ? ["Obs.: " + line.note.replace(/\s+/g, " ")] : [])
          ]),
          "Subtotal ilustrativo: " + money(Brasa.total({ lines: checkoutLines }))
        ].join("\n");
      }
    } catch {
      // A prévia fica vazia até que os dados obrigatórios sejam preenchidos.
    }
    $("order-text").value = message;
    $("order-text").placeholder = "Preencha os dados obrigatórios para ver a mensagem.";
  }
  function renderOrderWhatsApp() {
    const url = confirmedOrder ? Brasa.whatsappUrl(state.settings.whatsapp, "quero acompanhar meu pedido!") : "";
    const link = $("whatsapp-link");
    $("order-whatsapp").hidden = !confirmedOrder;
    $("whatsapp-note").hidden = Boolean(url);
    link.hidden = !url;
    if (url) link.href = url;
    else link.removeAttribute("href");
  }
  $("filters").addEventListener("click", event => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    filter = button.dataset.filter;
    render();
    [...$("filters").children].find(item => item.dataset.filter === filter)?.focus();
  });
  $("products").addEventListener("click", event => {
    const button = event.target.closest("[data-add]");
    if (!button) return;
    const product = state.products.find(item => item.id === button.dataset.add);
    if (!available(product)) return;
    openProduct(product);
  });
  function openProduct(product, lineId) {
    selection = { productId: product.id, lineId };
    $("product-title").textContent = product.name;
    $("product-description").textContent = product.description;
    $("product-price").textContent = money(product.price);
    $("product-note").value = cart[lineId]?.note ?? "";
    $("product-error").hidden = true;
    $("save-product").textContent = lineId ? "Salvar observação" : "Adicionar à sacola";
    $("product-dialog").showModal();
  }
  $("close-product").onclick = () => $("product-dialog").close();
  $("product-form").addEventListener("submit", event => {
    event.preventDefault();
    const { productId, lineId } = selection;
    const product = state.products.find(item => item.id === productId);
    if (!available(product) || (lineId ? !cart[lineId] : quantityOf(productId) >= product.stock)) {
      $("product-error").textContent = "A quantidade disponível mudou. Revise a sacola.";
      $("product-error").hidden = false;
      return;
    }
    const note = $("product-note").value.trim();
    if (lineId) cart[lineId].note = note;
    else {
      const matching = Object.values(cart).find(line => line.productId === productId && line.note === note);
      if (matching) matching.qty += 1;
      else cart[crypto.randomUUID()] = { productId, qty: 1, note };
      $("shop-feedback").textContent = product.name + " adicionado à sacola.";
      $("feedback").textContent = product.name + " na sacola. Quantidade " + quantityOf(productId) + ".";
      $("cart-result").textContent = "";
      confirmedOrder = false;
    }
    $("product-dialog").close();
    renderCart();
    if (lineId) $("cart-body").querySelector('.edit-note[data-cart="' + lineId + '"]')?.focus();
  });
  $("cart-body").addEventListener("click", event => {
    const button = event.target.closest("[data-cart]");
    if (!button) return;
    const { cart: id, step } = button.dataset;
    const line = cart[id];
    if (!line) return;
    if (!step) {
      openProduct(state.products.find(item => item.id === line.productId), id);
      return;
    }
    line.qty += Number(step);
    if (!line.qty) delete cart[id];
    renderCart();
    const buttons = [...$("cart-body").querySelectorAll("[data-cart]")].filter(item => item.dataset.cart === id && !item.disabled);
    (buttons.find(item => item.dataset.step === step) || buttons[0] || $("cart").querySelector("[autofocus]")).focus();
  });
  for (const button of cartButtons) {
    button.addEventListener("click", () => { refresh(); $("cart").showModal(); });
  }
  const [headerCart, floatingCart] = cartButtons;
  const cartObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && document.activeElement === floatingCart) {
      headerCart.focus({ preventScroll: true });
    }
    floatingCart.hidden = entry.isIntersecting;
  });
  cartObserver.observe(headerCart);
  $("preview-order").onclick = () => {
    checkout.hidden = !checkout.hidden;
    $("preview-order").setAttribute("aria-expanded", String(!checkout.hidden));
    if (!checkout.hidden) $("customer-name").focus();
  };
  checkout.addEventListener("input", () => {
    $("order-error").hidden = true;
    renderCheckout();
  });
  checkout.addEventListener("submit", event => {
    event.preventDefault();
    try {
      const order = place(Object.values(cart), readCheckout());
      confirmedOrder = true;
      for (const id of Object.keys(cart)) delete cart[id];
      checkout.reset();
      checkout.hidden = true;
      $("order-error").hidden = true;
      $("preview-order").setAttribute("aria-expanded", "false");
      refresh();
      $("cart").querySelector("[autofocus]").focus();
      $("cart-feedback").textContent = "Pedido " + order.id + " registrado no painel demo.";
      $("cart-result").textContent = $("cart-feedback").textContent;
    } catch (error) {
      refresh();
      $("order-error").textContent = error.message;
      $("order-error").hidden = false;
    }
  });
  window.addEventListener("storage", event => { if (event.key === key || event.key === null) refresh(); });
  window.addEventListener("pageshow", refresh);
  refresh();
})();
