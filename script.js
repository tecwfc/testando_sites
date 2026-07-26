// script.js
import { supabase } from './supabase-config.js';
import { 
  buscarProdutos, 
  criarPedido, 
  buscarConfiguracoes,
  buscarEstatisticas,
  buscarClientes,
  uploadImagem
} from './supabase-services.js';

// Variáveis globais
let produtosLoja = [];
let cart = [];
let configuracoes = {};
const FRETE_GRATIS_VALOR = 100;

// ====================== INICIALIZAÇÃO ======================

document.addEventListener("DOMContentLoaded", async () => {
  await carregarConfiguracoes();
  await carregarProdutos();
  await carregarEstatisticas();
  
  document.getElementById("cart-modal").classList.add("hidden");
  setupEventListeners();
});

// ====================== CARREGAR DADOS ======================

async function carregarConfiguracoes() {
  try {
    configuracoes = await buscarConfiguracoes();
    console.log('Configurações carregadas:', configuracoes);
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
  }
}

async function carregarProdutos() {
  try {
    produtosLoja = await buscarProdutos();
    renderizarProdutos(produtosLoja);
    renderizarDestaques();
    renderizarCategorias();
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    Toastify({
      text: 'Erro ao carregar produtos!',
      style: { background: '#ef4444' }
    }).showToast();
  }
}

async function carregarEstatisticas() {
  try {
    const stats = await buscarEstatisticas();
    // Atualizar dashboard se existir
    document.querySelector('.total-vendas')?.textContent = `R$ ${stats.totalVendas.toFixed(2)}`;
    document.querySelector('.pedidos-dia')?.textContent = stats.pedidosHoje;
    document.querySelector('.produtos-cadastrados')?.textContent = stats.totalProdutos;
    document.querySelector('.sem-estoque')?.textContent = stats.semEstoque;
    document.querySelector('.clientes-cadastrados')?.textContent = stats.totalClientes;
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}

// ====================== RENDERIZAR PRODUTOS ======================

function renderizarProdutos(lista) {
  const container = document.getElementById("produtos-container");
  if (!container) return;

  container.innerHTML = lista.map(p => {
    const isEsgotado = p.saldo <= 0 || !p.disponivel;
    const isUltimaUnidade = p.saldo === 1;
    let tagEstoque = "";

    if (!isEsgotado && isUltimaUnidade) {
      tagEstoque = `
        <div class="absolute top-3 right-3 z-20 animate-bounce-soft">
          <span class="bg-red-600 text-white text-[9px] sm:text-[10px] font-black px-1 py-1.5 rounded-full shadow-lg shadow-red-500/40 leading-none inline-block text-center min-w-[70px]">
            Última<br>unidade!
          </span>
        </div>`;
    } else if (!isEsgotado) {
      tagEstoque = `
        <div class="absolute top-4 right-4 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-xl border border-white/20 shadow-sm">
          <span class="text-[9px] text-slate-500 font-bold block text-center">${p.saldo} un</span>
        </div>`;
    }

    return `
      <div class="product-card bg-white rounded-[2.5rem] p-3 flex flex-col relative group transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 ${isEsgotado ? "opacity-60" : ""}">
        <div class="relative aspect-square rounded-[2rem] bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden mb-5">
          <img src="${p.image}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy">
          
          ${tagEstoque}

          ${isEsgotado ? `
            <div class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <span class="bg-white text-dark px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest">Esgotado</span>
            </div>
          ` : `
            <button onclick="addToCart('${p.id}')" class="absolute bottom-4 right-4 bg-dark text-white w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center hover:bg-primary transition-all duration-300 active:scale-90 group-hover:rotate-6">
              <i class="fa-solid fa-plus"></i>
            </button>
          `}
        </div>

        <div class="px-3 pb-2">
          <p class="text-[9px] uppercase tracking-[0.2em] text-primary font-bold mb-1 opacity-70">${p.category}</p>
          <h3 class="text-dark font-extrabold text-sm mb-1 truncate leading-tight">${p.name}</h3>
          
          <div class="flex items-center gap-1 mb-3">
            <span class="text-[11px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
              <i class="fa-solid fa-droplet text-[9px] mr-1"></i> ${p.ml}
            </span>
          </div>
          
          <div class="flex justify-between items-center border-t border-slate-50 pt-3">
            <div class="flex flex-col">
              <span class="text-[8px] text-slate-400 font-bold uppercase leading-none">Preço</span>
              <span class="text-base font-black text-dark">R$ ${p.price.toFixed(2).replace(".", ",")}</span>
            </div>
            <div class="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center">
              <i class="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
            </div>
          </div>
        </div>
      </div>`;
  }).join("");
}

// ====================== RENDERIZAR DESTAQUES ======================

function renderizarDestaques() {
  const destaqueContainer = document.getElementById("destaques-container");
  if (!destaqueContainer) return;

  const destaques = produtosLoja.filter((p) => p.destaque && p.saldo > 0).slice(0, 8);
  if (destaques.length === 0) return;

  destaqueContainer.innerHTML = destaques.map((p) => `
    <div class="swiper-slide py-10">
      <div class="destaque-card-premium group relative overflow-hidden rounded-[3rem] p-6">
        <div class="absolute top-6 left-6 z-20 transition-all duration-500 group-hover:translate-x-2">
          <span class="bg-primary text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg shadow-primary/30">${p.ml}</span>
        </div>
        <div class="relative w-full aspect-square mb-8 flex items-center justify-center rounded-[2.5rem] bg-gradient-to-b from-slate-50 to-white overflow-hidden">
          <div class="absolute w-32 h-32 bg-primary/10 rounded-full blur-3xl transition-all duration-700 group-hover:scale-[3] group-hover:bg-primary/20"></div>
          <img src="${p.image}" class="img-reveal w-4/5 h-4/5 object-contain z-10" loading="lazy">
        </div>
        <div class="text-center relative z-10">
          <p class="text-[9px] uppercase tracking-[0.3em] text-primary/60 font-bold mb-2">${p.category}</p>
          <h3 class="font-extrabold text-base text-dark mb-4 leading-tight">${p.name}</h3>
          <div class="mb-6">
            <span class="text-2xl font-black text-dark tracking-tighter">R$ ${p.price.toFixed(2).replace(".", ",")}</span>
          </div>
          <button onclick="addToCart('${p.id}')" class="w-full bg-dark text-white py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all duration-300 hover:bg-primary hover:shadow-xl hover:shadow-primary/40 active:scale-95 flex items-center justify-center gap-3">
            <i class="fa-solid fa-cart-shopping text-xs"></i> Reservar Agora
          </button>
        </div>
      </div>
    </div>`).join("");

  new Swiper(".destaquesSwiper", {
    slidesPerView: 1.3,
    centeredSlides: true,
    spaceBetween: 25,
    loop: destaques.length > 1,
    autoplay: { delay: 4000 },
    speed: 800,
    breakpoints: { 
      768: { slidesPerView: 3, centeredSlides: false }, 
      1024: { slidesPerView: 4, centeredSlides: false } 
    },
  });
}

// ====================== RENDERIZAR CATEGORIAS ======================

function renderizarCategorias() {
  const categoriasContainer = document.querySelector('.flex.overflow-x-auto');
  if (!categoriasContainer) return;

  const categorias = [...new Set(produtosLoja.map(p => p.category))];
  
  categoriasContainer.innerHTML = `
    <button onclick="filtrarProdutos('todos')" class="category-card flex flex-col items-center gap-3 min-w-[85px] group snap-center">
      <div class="category-ring">
        <div class="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center border-4 border-white overflow-hidden shadow-inner">
          <i class="fa-solid fa-border-all text-xl text-primary"></i>
        </div>
      </div>
      <span class="text-[9px] font-black uppercase tracking-widest text-dark/60 text-center">Todos</span>
    </button>
    ${categorias.map(cat => `
      <button onclick="filtrarProdutos('${cat}')" class="category-card flex flex-col items-center gap-3 min-w-[85px] group snap-center">
        <div class="category-ring">
          <div class="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center border-4 border-white overflow-hidden shadow-inner">
            <i class="fa-solid fa-tag text-xl text-primary"></i>
          </div>
        </div>
        <span class="text-[9px] font-black uppercase tracking-widest text-dark/60 text-center">${cat}</span>
      </button>
    `).join('')}
  `;
}

// ====================== CARRINHO ======================

window.addToCart = function(id) {
  const p = produtosLoja.find(i => i.id == id);
  if (!p) return;
  
  const exists = cart.find(i => i.id == id);
  if (exists && exists.quantity >= p.saldo) {
    return Toastify({ 
      text: "Saldo insuficiente!", 
      gravity: "bottom",
      style: { background: "#ef4444" } 
    }).showToast();
  }

  if (exists) {
    exists.quantity++;
  } else {
    cart.push({ ...p, quantity: 1 });
  }

  updateCart();
  Toastify({
    text: "Adicionado ao carrinho!",
    gravity: "bottom",
    duration: 2000,
    style: { background: "#8e5fb1" }
  }).showToast();
};

window.changeQuantity = function(id, delta) {
  const item = cart.find(i => i.id == id);
  const prod = produtosLoja.find(p => p.id == id);
  if (!item || !prod) return;

  if (delta > 0 && item.quantity >= prod.saldo) {
    return Toastify({
      text: "Limite de estoque!",
      gravity: "bottom",
      style: { background: "#ef4444" }
    }).showToast();
  }

  item.quantity += delta;
  if (item.quantity <= 0) removeItem(id);
  updateCart();
};

function updateCart() {
  const container = document.getElementById("cart-items");
  container.innerHTML = "";
  let total = 0;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-8 opacity-20">
        <i class="fa-solid fa-bag-shopping text-4xl mb-2"></i>
        <p class="text-xs font-bold">Sacola vazia</p>
      </div>`;
    updateCartUI(0);
    return;
  }

  cart.forEach(item => {
    total += item.price * item.quantity;
    const pOrig = produtosLoja.find(p => p.id === item.id);
    
    const alerta = pOrig?.saldo < 2 ? 
      `<div class="text-red-600 text-[9px] font-black mb-1 flex items-center gap-1 animate-pulse">
        <i class="fa-solid fa-triangle-exclamation"></i> ÚLTIMA UNIDADE!
      </div>` : "";

    const div = document.createElement("div");
    div.className = "flex flex-col mb-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm";
    
    div.innerHTML = `
      ${alerta}
      <div class="flex items-center gap-3">
        <img src="${item.image}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-50">
        
        <div class="flex-1 min-w-0">
          <p class="font-black text-[12px] text-dark truncate leading-tight">${item.name}</p>
          <p class="text-dark font-black text-[12px]">R$ ${item.price.toFixed(2).replace(".", ",")}</p>
        </div>

        <div class="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
          <button onclick="changeQuantity('${item.id}', -1)" class="w-6 h-6 bg-white rounded shadow-xs text-primary flex items-center justify-center active:scale-90">
            <i class="fa-solid fa-minus text-[8px]"></i>
          </button>
          <span class="font-black text-xs w-3 text-center text-dark">${item.quantity}</span>
          <button onclick="changeQuantity('${item.id}', 1)" class="w-6 h-6 bg-white rounded shadow-xs text-primary flex items-center justify-center active:scale-90">
            <i class="fa-solid fa-plus text-[8px]"></i>
          </button>
        </div>

        <button onclick="removeItem('${item.id}')" class="text-slate-300 hover:text-red-500 p-1">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>
    `;
    container.appendChild(div);
  });

  updateCartUI(total);
}

function updateCartUI(totalProdutos) {
  const valorEntrega = totalProdutos >= FRETE_GRATIS_VALOR ? 0 : 5.00;
  const totalGeral = totalProdutos + valorEntrega;

  document.getElementById("cart-total").innerText = `R$ ${totalGeral.toFixed(2).replace(".", ",")}`;
  document.getElementById("cart-count").innerText = cart.length;

  const entregaDesc = document.getElementById("entrega-valor-desc");
  if (entregaDesc) {
    entregaDesc.innerText = valorEntrega === 0 ? "GRÁTIS" : "R$ 5,00";
    entregaDesc.style.color = valorEntrega === 0 ? "#16a34a" : "#0f0717";
  }

  const freteBar = document.getElementById("frete-bar");
  const freteStatus = document.getElementById("frete-status");
  
  if (freteBar && freteStatus) {
    let porcentagem = (totalProdutos / FRETE_GRATIS_VALOR) * 100;
    freteBar.style.width = `${Math.min(porcentagem, 100)}%`;
    
    if (totalProdutos >= FRETE_GRATIS_VALOR) {
      freteStatus.innerHTML = "🎉 VOCÊ GANHOU FRETE GRÁTIS!";
      freteBar.style.backgroundColor = "#16a34a";
    } else {
      const falta = (FRETE_GRATIS_VALOR - totalProdutos).toFixed(2).replace(".", ",");
      freteStatus.innerHTML = `Faltam <span class="text-primary font-black">R$ ${falta}</span> para Frete Grátis`;
      freteBar.style.backgroundColor = "#6d28d9";
    }
  }
}

window.removeItem = function(id) {
  cart = cart.filter(i => i.id !== id);
  updateCart();
};

window.clearCart = function() {
  if (cart.length === 0) {
    return Toastify({
      text: "A sacola já está vazia!",
      style: { background: "#f59e0b" }
    }).showToast();
  }

  if (confirm("Deseja remover todos os itens da sacola?")) {
    cart = [];
    updateCart();
    const cartModal = document.getElementById("cart-modal");
    if (cartModal) {
      cartModal.classList.replace("flex", "hidden");
    }
    Toastify({
      text: "Sacola limpa!",
      duration: 2000,
      style: { background: "#ef4444" }
    }).showToast();
  }
};

// ====================== FINALIZAR PEDIDO ======================

document.getElementById("checkout-btn").onclick = async () => {
  const address = document.getElementById("address").value;
  if (cart.length === 0) {
    return Toastify({ 
      text: "Sua sacola está vazia!", 
      style: { background: "#ef4444" } 
    }).showToast();
  }
  if (!address || address.length < 10) {
    return Toastify({ 
      text: "Por favor, informe o endereço completo!", 
      style: { background: "#f59e0b" } 
    }).showToast();
  }

  try {
    const totalProdutos = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const valorEntrega = totalProdutos >= FRETE_GRATIS_VALOR ? 0 : 5.00;
    const totalGeral = totalProdutos + valorEntrega;

    const pedido = {
      cliente_nome: "Cliente Web",
      cliente_telefone: "999999999",
      forma_pagamento: "WhatsApp",
      valor_total: totalGeral,
      valor_produtos: totalProdutos,
      valor_entrega: valorEntrega,
      endereco_entrega: address,
      itens: cart.map(item => ({
        produto_id: item.id,
        quantidade: item.quantity,
        preco_unitario: item.price,
        subtotal: item.price * item.quantity,
      }))
    };

    const resultado = await criarPedido(pedido);
    console.log('Pedido criado:', resultado);
    
    enviarParaWhatsapp(address);
    cart = [];
    updateCart();
    document.getElementById("address").value = "";
    document.getElementById("cart-modal").classList.add("hidden");
    
    Toastify({
      text: "Pedido enviado com sucesso!",
      duration: 3000,
      style: { background: "#064e3b" }
    }).showToast();
  } catch (error) {
    console.error('Erro ao finalizar pedido:', error);
    Toastify({
      text: "Erro ao enviar pedido!",
      style: { background: "#ef4444" }
    }).showToast();
  }
};

function enviarParaWhatsapp(endereco) {
  const fone = configuracoes.whatsapp || "5588999049636";
  
  const totalProdutos = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const valorEntrega = totalProdutos >= FRETE_GRATIS_VALOR ? 0 : 5.00;
  const totalGeral = totalProdutos + valorEntrega;

  let msg = `*🛍️ NOVO PEDIDO - WR AROMATIZANTES*\n`;
  msg += `------------------------------------------\n\n`;
  msg += `*ITENS:*\n`;
  
  cart.forEach(i => {
    msg += `• ${i.quantity}x ${i.name} (${i.ml}) - R$ ${(i.price * i.quantity).toFixed(2).replace(".", ",")}\n`;
  });

  msg += `\n------------------------------------------\n`;
  msg += `*Produtos:* R$ ${totalProdutos.toFixed(2).replace(".", ",")}\n`;
  msg += `*Entrega:* ${valorEntrega === 0 ? "GRÁTIS" : "R$ 5,00"}\n`;
  msg += `*TOTAL FINAL: R$ ${totalGeral.toFixed(2).replace(".", ",")}*\n\n`;
  msg += `*📍 ENDEREÇO DE ENTREGA:*\n${endereco}`;

  window.open(`https://wa.me/${fone}?text=${encodeURIComponent(msg)}`, "_blank");
}

// ====================== FILTROS E MENU ======================

window.filtrarProdutos = function(cat) {
  if (!mobileMenu.classList.contains("translate-x-full")) toggleMenu();
  const filtrados = cat === "todos" 
    ? produtosLoja 
    : produtosLoja.filter(p => 
        p.category.toLowerCase().includes(cat.toLowerCase()) || 
        p.ml.toLowerCase().includes(cat.toLowerCase())
      );
  renderizarProdutos(filtrados);
  setTimeout(() => { 
    document.getElementById("produtos").scrollIntoView({ behavior: "smooth" }); 
  }, 300);
};

// ====================== EVENT LISTENERS ======================

function setupEventListeners() {
  const cartBtn = document.getElementById("cart-btn");
  const cartModal = document.getElementById("cart-modal");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileOverlay = document.getElementById("mobile-overlay");

  if (cartBtn) {
    cartBtn.onclick = () => cartModal.classList.replace("hidden", "flex");
  }
  
  document.getElementById("close-modal-btn").onclick = () => {
    cartModal.classList.replace("flex", "hidden");
  };

  window.toggleMenu = () => {
    mobileMenu.classList.toggle("translate-x-full");
    mobileOverlay.classList.toggle("hidden");
  };
  
  if (mobileOverlay) {
    mobileOverlay.onclick = toggleMenu;
  }
  
  document.getElementById("close-mobile-menu").onclick = toggleMenu;

  // Fechar modal com ESC
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      cartModal.classList.replace("flex", "hidden");
      document.getElementById("quiz-modal")?.classList.replace("flex", "hidden");
    }
  });

  // Fechar modal ao clicar fora
  cartModal.addEventListener("click", (event) => {
    if (event.target.id === "cart-modal") {
      cartModal.classList.replace("flex", "hidden");
    }
  });
}

// ====================== QUIZ ======================

const questions = [
  { 
    question: "Onde você pretende usar o aroma?", 
    options: [
      { text: "No meu carro", value: "automotivo", icon: "fa-car" },
      { text: "Na sala/quarto", value: "casa", icon: "fa-house" },
      { text: "Escritório", value: "business", icon: "fa-briefcase" }
    ] 
  },
  { 
    question: "Qual sensação você busca?", 
    options: [
      { text: "Frescor", value: "citrico", icon: "fa-leaf" },
      { text: "Calma", value: "lavanda", icon: "fa-moon" },
      { text: "Luxo", value: "amadeirado", icon: "fa-crown" }
    ] 
  },
  { 
    question: "Qual intensidade?", 
    options: [
      { text: "Suave", value: "leve", icon: "fa-feather" },
      { text: "Marcante", value: "forte", icon: "fa-fire" }
    ] 
  }
];

let currentStep = 0;
let answers = [];

window.openQuiz = () => {
  document.getElementById("quiz-modal").classList.replace("hidden", "flex");
  currentStep = 0;
  answers = [];
  renderQuestion();
};

window.closeQuiz = () => {
  document.getElementById("quiz-modal").classList.replace("flex", "hidden");
};

function renderQuestion() {
  const content = document.getElementById("quiz-content");
  document.getElementById("quiz-progress").style.width = `${(currentStep / questions.length) * 100}%`;
  
  if (currentStep < questions.length) {
    const q = questions[currentStep];
    content.innerHTML = `
      <h2 class="text-2xl font-black mb-8">${q.question}</h2>
      <div class="grid gap-4">
        ${q.options.map(opt => `
          <button onclick="nextStep('${opt.value}')" class="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-50 hover:border-primary text-left">
            <div class="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
              <i class="fa-solid ${opt.icon}"></i>
            </div>
            <span class="font-bold">${opt.text}</span>
          </button>
        `).join("")}
      </div>
    `;
  } else {
    const filtro = answers[0] === "automotivo" ? "automotivo" : "500ml";
    content.innerHTML = `
      <div class="text-center">
        <h2 class="text-2xl font-black mb-8">Seu par ideal!</h2>
        <button onclick="finalizarQuiz('${filtro}')" class="w-full bg-primary text-white py-5 rounded-2xl font-black">
          Ver Recomendação
        </button>
      </div>
    `;
  }
}

window.nextStep = function(val) {
  answers.push(val);
  currentStep++;
  renderQuestion();
};

window.finalizarQuiz = function(cat) {
  closeQuiz();
  filtrarProdutos(cat);
  window.location.hash = "produtos";
};

// ====================== UPLOAD DE IMAGENS ======================

window.uploadProdutoImagem = async function(file) {
  try {
    const url = await uploadImagem(file, 'produtos');
    return url;
  } catch (error) {
    console.error('Erro no upload:', error);
    Toastify({
      text: 'Erro ao fazer upload da imagem!',
      style: { background: '#ef4444' }
    }).showToast();
    return null;
  }
};

// ====================== INSTALL BANNER (PWA) ======================

let deferredPrompt;
const installBanner = document.getElementById('install-banner');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (window.innerWidth < 768 && !localStorage.getItem('bannerClosed')) {
    setTimeout(() => {
      installBanner.classList.remove('translate-y-[150%]');
    }, 3000);
  }
});

document.getElementById('btn-install-now').addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('Usuário instalou o app');
    }
    deferredPrompt = null;
    installBanner.classList.add('translate-y-[150%]');
  } else {
    alert("No iPhone: Clique no ícone de 'Compartilhar' (quadrado com seta) e depois em 'Adicionar à Tela de Início'.");
  }
});

function closeInstallBanner() {
  installBanner.classList.add('translate-y-[150%]');
  localStorage.setItem('bannerClosed', 'true');
}

if (window.matchMedia('(display-mode: standalone)').matches) {
  installBanner.style.display = 'none';
}