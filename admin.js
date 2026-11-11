(() => {
  const { key, read, update, transition, next, demoCustomers, money, total, when, escape: esc, image } = Brasa;
  const $ = id => document.getElementById(id);
  const tabs = {
    visao: ["Visão geral", dashboard], produtos: ["Produtos e estoque", products],
    categorias: ["Categorias", categories], pedidos: ["Pedidos simulados", orders],
    clientes: ["Clientes demonstrativos", customers], conteudos: ["Banners e conteúdo", content],
    loja: ["Configurações da loja", settings]
  };
  const empty = message => '<p class="empty">' + message + '</p>';
  const action = (name, id, label, style = "") =>
    `<button type="button" class="${style}" data-action="${name}" data-id="${esc(id)}">${label}</button>`;
  let state;
  let edit;
  let orderFilter = "";
  const expandedOrders = new Set();

  function showMessage(id, message = "") {
    $(id).textContent = message;
    $(id).hidden = !message;
  }
  function route() {
    const hash = location.hash.slice(1);
    return Object.hasOwn(tabs, hash) ? hash : "visao";
  }
  function render() {
    const current = route();
    const [label, renderView] = tabs[current];
    $("page-title").textContent = label;
    document.title = label + " | Brasa Burger Demo";
    for (const a of $("admin-nav").querySelectorAll("a")) {
      if (a.hash === "#" + current) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    try {
      state = read();
      $("view").innerHTML = renderView();
      showMessage("error");
    } catch (error) {
      $("view").innerHTML = empty("Verifique se o navegador permite armazenamento local e recarregue a página.");
      showMessage("error", "Não foi possível carregar os dados da demonstração.");
    }
  }
  function save(change, message) {
    update(change);
    render();
    showMessage("notice", message);
  }

  function dashboard() {
    const completed = state.orders.filter(order => order.status === "Concluído");
    const revenue = completed.reduce((sum, order) => sum + total(order), 0);
    const cards = [
      ["Vendas concluídas", money(revenue)], ["Pedidos simulados", state.orders.length],
      ["Ticket médio concluído", money(completed.length ? revenue / completed.length : 0)],
      ["Produtos com estoque baixo", state.products.filter(p => p.stock <= 5).length]
    ];
    const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 6 + i);
      const label = dateLabel.format(date);
      const value = completed.filter(order => new Date(order.at).toDateString() === date.toDateString())
        .reduce((sum, order) => sum + total(order), 0);
      return [label, value];
    });
    const stages = Brasa.status.map(status => [status, state.orders.filter(order => order.status === status).length]);
    return `<div class="metrics">${cards.map(([label, value]) => `<article class="panel metric"><p>${label}</p><strong>${value}</strong></article>`).join("")}</div>
      <div class="charts">${chart("Vendas por dia do pedido · últimos 7 dias", days, money)}${chart("Pedidos por status", stages, value => value)}</div>
      <section class="panel"><h2>Pedidos recentes</h2>${state.orders.slice(0, 4).map(order =>
        `<p class="recent"><a href="#pedidos">${esc(order.id)}</a><span>${esc(order.status)}</span><strong>${money(total(order))}</strong></p>`).join("") || empty("Nenhum pedido simulado.")}</section>`;
  }
  function chart(title, rows, format) {
    const max = Math.max(1, ...rows.map(([, value]) => value));
    return `<section class="panel"><h2>${title}</h2><ul class="chart">${rows.map(([label, value]) =>
      `<li><span>${label}</span><span class="track" aria-hidden="true"><i style="width:${100 * value / max}%"></i></span><strong>${format(value)}</strong></li>`).join("")}</ul></section>`;
  }

  function table(headers, rows) {
    return `<div class="table-wrap" tabindex="0" role="region" aria-label="Tabela com rolagem horizontal"><table>
      <thead><tr>${headers.map(header => "<th scope='col'>" + header + "</th>").join("")}</tr></thead>
      <tbody>${rows.map(cells => "<tr>" + cells.map(cell => "<td>" + cell + "</td>").join("") + "</tr>").join("")}</tbody></table></div>`;
  }
  function products() {
    const rows = state.products.map(p => [
      `<div class="product-cell">${image(p.image) ? `<img src="${esc(p.image)}" alt="">` : ""}<strong>${esc(p.name)}</strong></div>`,
      esc(state.categories.find(category => category.id === p.category)?.name || "Sem categoria"),
      money(p.price),
      `<span class="badge ${p.stock <= 5 ? "low" : ""}">${p.stock} un.</span>`,
      p.active && p.stock > 0 ? "Disponível" : p.active ? "Sem estoque" : "Pausado",
      `<div class="actions">${action("product", p.id, "Editar")}${action("remove-product", p.id, "Excluir", "danger")}</div>`
    ]);
    return `<div class="toolbar"><p>Estoque baixo sinalizado a partir de 5 unidades.</p>${action("product", "", "Novo produto", "primary")}</div>
      <section class="panel listing">${rows.length ? table(["Produto", "Categoria", "Preço", "Estoque", "Cardápio", "Ações"], rows) : empty("Cadastre o primeiro produto para preencher o cardápio.")}</section>`;
  }
  function categories() {
    const rows = state.categories.map(category => [
      esc(category.name), state.products.filter(p => p.category === category.id).length,
      `<div class="actions">${action("category", category.id, "Editar")}${action("remove-category", category.id, "Excluir", "danger")}</div>`
    ]);
    return `<div class="toolbar"><p>As categorias aparecem como filtros no cardápio.</p>${action("category", "", "Nova categoria", "primary")}</div>
      <section class="panel listing">${rows.length ? table(["Categoria", "Produtos", "Ações"], rows) : empty("Nenhuma categoria cadastrada.")}</section>`;
  }
  function detailsRows(order) {
    return Brasa.orderFields(order.customer, order.details).map(([label, value]) =>
      `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join("");
  }
  function acceptanceLink(order) {
    if (!next[order.status].length) return "";
    const message = "Olá, " + order.customer + "! Seu pedido " + order.id + " foi aceito pela " + state.settings.name + ".";
    const url = Brasa.whatsappUrl(Brasa.customerWhatsappNumber(order.details?.phone), message);
    return url ? `<a class="button" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Enviar aceite pelo WhatsApp</a>` : "";
  }
  function orders() {
    const visible = state.orders.filter(order => !orderFilter || order.status === orderFilter);
    return `<div class="toolbar"><p>Para gerar um novo pedido, use a sacola do site público.</p>
      <label>Filtrar por status <select id="order-filter"><option value="">Todos</option>${Brasa.status.map(s => option(s, s, orderFilter)).join("")}</select></label></div>
      <div class="order-list">${visible.map(order => `<details class="panel order" data-order="${esc(order.id)}" ${expandedOrders.has(order.id) ? "open" : ""}>
      <summary><strong>${esc(order.id)}</strong><span>${esc(order.customer)}</span><span class="badge">${esc(order.status)}</span><strong>${money(total(order))}</strong></summary>
      <div class="order-body"><p>Registrado em ${when(order.at)}</p><dl class="order-details">${detailsRows(order)}</dl><div class="order-columns"><div><h3>Itens</h3><ul>${order.lines.map(line =>
        `<li>${line.qty} × ${esc(line.name)} · ${money(line.price * line.qty)}${line.note ? `<p class="item-note">Obs.: ${esc(line.note)}</p>` : ""}</li>`).join("")}</ul></div><div><h3>Histórico</h3><ol>${order.history.map(entry =>
        `<li>${esc(entry.status)} · ${when(entry.at)}</li>`).join("")}</ol></div></div>
      <div class="order-controls">
      ${next[order.status].length ? `<form data-status-id="${esc(order.id)}" class="status-form"><label>Novo status <select name="status">${next[order.status].map(s => option(s, s)).join("")}</select></label><button type="submit" class="primary">Atualizar status</button></form>` : ""}
      ${acceptanceLink(order)}${action("print", order.id, "Imprimir comanda")}</div></div></details>`).join("") || empty("Nenhum pedido com este status.")}</div>`;
  }

  function printOrder(id) {
    const { orders, settings } = read();
    const order = orders.find(item => item.id === id);
    if (!order) throw new Error("Pedido indisponível para impressão.");

    $("print-order").innerHTML = `
      <header>
        <strong>${esc(settings.name)}</strong>
        <h2>Comanda ${esc(order.id)}</h2>
        <p>Pedido demonstrativo</p>
      </header>
      <dl>
        <div><dt>Horário</dt><dd>${esc(when(order.at))}</dd></div>
        <div><dt>Status</dt><dd>${esc(order.status)}</dd></div>
        ${detailsRows(order)}
      </dl>
      <ul>${order.lines.map(line => `
        <li><div><strong>${line.qty} × ${esc(line.name)}</strong>${line.note ? `<p class="item-note">Obs.: ${esc(line.note)}</p>` : ""}</div><span>${money(line.price * line.qty)}</span></li>`).join("")}</ul>
      <p class="print-total"><strong>Total</strong><strong>${money(total(order))}</strong></p>
    `;
    document.body.classList.add("printing-order");
    window.print();
  }

  window.addEventListener("afterprint", () => {
    document.body.classList.remove("printing-order");
    $("print-order").replaceChildren();
  });
  function customers() {
    const names = [...new Set([...demoCustomers, ...state.orders.map(order => order.customer)])];
    return `<p class="toolbar">Pedidos demonstrativos agrupados pelo nome informado.</p><section class="panel listing">${table(["Cliente fictício", "Pedidos", "Total concluído"], names.map(name => {
      const orders = state.orders.filter(order => order.customer === name);
      return [esc(name), orders.length, money(orders.filter(order => order.status === "Concluído").reduce((sum, order) => sum + total(order), 0))];
    }))}</section>`;
  }

  function input(label, name, value, attributes = "required maxlength='120'") {
    return `<label>${label}<input name="${name}" value="${esc(value)}" ${attributes}></label>`;
  }
  function textarea(label, name, value) {
    return `<label class="wide">${label}<textarea name="${name}" rows="3" required maxlength="700">${esc(value)}</textarea></label>`;
  }
  function file(label, name, current) {
    return `<label class="wide">${label}${image(current) ? `<img class="thumb" src="${esc(current)}" alt="Imagem atual">` : ""}<input type="file" name="${name}" accept="image/jpeg,image/png,image/webp,image/avif"><small>JPEG, PNG, WebP ou AVIF até 350 KB.</small></label>`;
  }
  function option(value, label, selected) {
    return `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(label)}</option>`;
  }
  function content() {
    const c = state.content;
    return `<form class="panel form-grid" id="content-form">
      <h2 class="wide">Capa do site</h2>${input("Texto acima do título", "kicker", c.kicker, "required maxlength='40'")}
      ${input("Título", "title", c.title, "required maxlength='32'")}${input("Destaque", "highlight", c.highlight, "required maxlength='32'")}
      ${textarea("Texto de introdução", "intro", c.intro)}
      ${file("Imagem de capa para desktop", "hero", c.hero)}${file("Imagem de capa para celular", "mobile", c.mobile)}
      <h2 class="wide">Faixa promocional e seção Sobre</h2>
      <div class="wide">${input("Faixa promocional (vazio oculta a faixa)", "banner", c.banner, "maxlength='120'")}</div>
      ${textarea("Texto da seção Sobre", "about", c.about)}
      <div class="wide"><button type="submit" class="primary">Salvar conteúdo</button></div></form>`;
  }
  function settings() {
    const s = state.settings;
    return `<form class="panel form-grid" id="settings-form">${input("Nome da loja", "name", s.name)}
      ${textarea("Endereço fictício", "address", s.address)}${textarea("Horários ilustrativos", "hours", s.hours)}
      ${textarea("Texto de contato", "contact", s.contact)}
      <div class="wide">${input("WhatsApp autorizado (opcional)", "whatsapp", s.whatsapp, "type='tel' inputmode='numeric' pattern='[1-9][0-9]{7,14}' maxlength='15' aria-describedby='phone-help'")}
      <p id="phone-help">Use código do país, DDD e telefone, apenas dígitos. Deixe vazio para desativar.</p>
      <label class="check"><input type="checkbox" name="authorized"> Confirmo que tenho autorização para usar o número informado.</label></div>
      <div class="wide"><button type="submit" class="primary">Salvar configurações</button></div></form>`;
  }

  function openEditor(type, id, opener) {
    const item = (type === "product" ? state.products : state.categories).find(entry => entry.id === id);
    if (id && !item) throw new Error("Este registro já foi removido.");
    if (type === "product" && !state.categories.length) throw new Error("Cadastre uma categoria antes de adicionar um produto.");
    edit = { type, id, opener, stock: item?.stock };
    $("editor-title").textContent = (item ? "Editar " : "Cadastrar ") + (type === "product" ? "produto" : "categoria");
    $("edit-fields").innerHTML = input("Nome", "name", item?.name, "required maxlength='80'");
    if (type === "product") {
      $("edit-fields").innerHTML += `<label>Categoria<select name="category" required>${state.categories.map(c => option(c.id, c.name, item?.category)).join("")}</select></label>
        ${input("Preço em reais", "price", item ? (item.price / 100).toFixed(2) : "", "type='number' min='0.01' max='99999' step='0.01' required")}
        ${input("Estoque (unidades)", "stock", item?.stock ?? 0, "type='number' min='0' max='99999' step='1' required")}
        ${textarea("Descrição", "description", item?.description)}
        ${file("Imagem do produto", "image", item?.image)}
        ${item?.image ? '<label class="check"><input name="removeImage" type="checkbox"> Remover imagem atual</label>' : ""}
        <label class="check wide"><input name="active" type="checkbox" ${item?.active !== false ? "checked" : ""}> Disponível para venda quando houver estoque</label>`;
    }
    showMessage("edit-error");
    $("editor").showModal();
  }
  const field = (form, name) => String(form.get(name) ?? "").trim();
  function required(form, name) {
    const value = field(form, name);
    if (!value) throw new Error("Preencha todos os campos obrigatórios.");
    return value;
  }
  function uploaded(form, name) {
    const selected = form.get(name);
    if (!selected?.size) return Promise.resolve(null);
    if (!/^image\/(jpeg|png|webp|avif)$/.test(selected.type) || selected.size > 350 * 1024) {
      throw new Error("Escolha uma imagem JPEG, PNG, WebP ou AVIF com até 350 KB.");
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
      reader.readAsDataURL(selected);
    });
  }
  function errorText(error) {
    if (error.name === "QuotaExceededError") return "O armazenamento local está cheio. Remova imagens ou use arquivos menores.";
    if (error.name === "SecurityError") return "O navegador bloqueou o armazenamento local.";
    return error.message;
  }

  $("edit-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentEdit = edit;
    const { id, type, stock: originalStock } = currentEdit;
    const submit = event.submitter;
    submit.disabled = true;
    try {
      const name = required(form, "name");
      const upload = type === "product" ? await uploaded(form, "image") : null;
      if (!$("editor").open || edit !== currentEdit) return;
      save(current => {
        const items = type === "product" ? current.products : current.categories;
        const existing = items.find(item => item.id === id);
        if (id && !existing) throw new Error("Este registro já foi removido.");
        if (items.some(item => item.id !== id && item.name.localeCompare(name, "pt-BR", { sensitivity: "base" }) === 0)) {
          throw new Error("Já existe um registro com esse nome.");
        }
        const record = { id: id || crypto.randomUUID(), name };
        if (type === "product") {
          const category = field(form, "category");
          if (!current.categories.some(item => item.id === category)) throw new Error("Selecione uma categoria existente.");
          const stock = Number(field(form, "stock"));
          if (existing && stock !== originalStock && existing.stock !== originalStock) throw new Error("O estoque mudou em outra aba. Reabra a edição para ajustar a quantidade.");
          Object.assign(record, { category, price: Math.round(Number(field(form, "price")) * 100),
            stock: existing && stock === originalStock ? existing.stock : stock, description: required(form, "description"),
            active: form.has("active"), image: upload ?? (form.has("removeImage") ? "" : existing?.image || "") });
        }
        if (existing) Object.assign(existing, record);
        else items.push(record);
      }, "Registro salvo. A alteração já está disponível no cardápio.");
      $("editor").close();
    } catch (error) {
      showMessage("edit-error", errorText(error));
    } finally {
      submit.disabled = false;
    }
  });
  $("editor").addEventListener("close", () => {
    if (edit?.opener.isConnected) edit.opener.focus();
    else $("view").querySelector("[data-action]")?.focus();
  });
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;
    showMessage("notice");
    showMessage("error");
    try {
      if (action === "close") $("editor").close();
      else if (action === "print") printOrder(id);
      else if (action === "category" || action === "product") openEditor(action, id, button);
      else if (action === "remove-product" && confirm("Excluir este produto do cardápio? Os pedidos anteriores preservam seus itens.")) {
        save(current => { current.products = current.products.filter(p => p.id !== id); }, "Produto excluído.");
      } else if (action === "remove-category" && confirm("Excluir esta categoria?")) {
        save(current => {
          if (current.products.some(p => p.category === id)) throw new Error("Mova os produtos para outra categoria antes de excluir esta.");
          current.categories = current.categories.filter(c => c.id !== id);
        }, "Categoria excluída.");
      }
    } catch (error) {
      showMessage("error", errorText(error));
    }
  });
  $("view").addEventListener("change", event => {
    if (event.target.id !== "order-filter") return;
    orderFilter = event.target.value;
    render();
    $("order-filter").focus();
  });
  $("view").addEventListener("toggle", event => {
    const id = event.target.dataset.order;
    if (!id) return;
    if (event.target.open) expandedOrders.add(id);
    else expandedOrders.delete(id);
  }, true);
  $("view").addEventListener("submit", async event => {
    event.preventDefault();
    const target = event.target;
    const form = new FormData(target);
    const submit = event.submitter;
    submit.disabled = true;
    showMessage("notice");
    showMessage("error");
    try {
      if (target.id === "content-form") {
        const hero = await uploaded(form, "hero");
        const mobile = await uploaded(form, "mobile");
        save(current => {
          for (const name of ["kicker", "title", "highlight", "intro", "about"]) current.content[name] = required(form, name);
          current.content.banner = field(form, "banner");
          if (hero) current.content.hero = hero;
          if (hero || mobile) current.content.mobile = mobile || hero;
        }, "Conteúdo atualizado no site.");
      } else if (target.id === "settings-form") {
        const whatsapp = field(form, "whatsapp");
        save(current => {
          if (whatsapp && whatsapp !== current.settings.whatsapp && !form.has("authorized")) throw new Error("Confirme a autorização para usar este número.");
          for (const name of ["name", "address", "hours", "contact"]) current.settings[name] = required(form, name);
          current.settings.whatsapp = whatsapp;
        }, "Configurações salvas.");
      } else if (target.dataset.statusId) {
        save(current => transition(current, target.dataset.statusId, field(form, "status")), "Status atualizado no histórico do pedido.");
      }
    } catch (error) {
      showMessage("error", errorText(error));
      $("error").scrollIntoView({ block: "nearest" });
    } finally {
      submit.disabled = false;
    }
  });
  window.addEventListener("hashchange", () => { showMessage("notice"); render(); $("workspace").focus({ preventScroll: true }); });
  window.addEventListener("storage", event => {
    if (event.key !== key && event.key !== null) return;
    if ($("editor").open || $("view").contains(document.activeElement) && ["conteudos", "loja"].includes(route())) {
      showMessage("notice", "Dados atualizados em outra aba. Suas alterações serão aplicadas ao salvar.");
      return;
    }
    render();
  });
  render();
})();


