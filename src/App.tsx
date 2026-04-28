import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clipboard,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  LayoutDashboard,
  Link as LinkIcon,
  LogOut,
  Menu,
  PackagePlus,
  Plus,
  Settings,
  ShoppingBag,
  Store as StoreIcon,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';

type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

type Store = {
  id: string;
  userId: string;
  businessName: string;
  slug: string;
  category: string;
  whatsappNumber: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  address: string;
  openingHours: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Product = {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
};

type Order = {
  id: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  orderType: 'Entrega' | 'Retirada';
  address: string;
  paymentMethod: string;
  notes: string;
  items: CartItem[];
  total: number;
  status: 'Novo' | 'Em preparo' | 'Finalizado' | 'Cancelado';
  createdAt: string;
};

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

type DashboardView = 'overview' | 'store' | 'products' | 'orders' | 'account';

const STORAGE_KEY = 'meu-zappedido-data-v1';
const SESSION_KEY = 'meu-zappedido-session';
const businessCategories = ['Hamburgueria', 'Pizzaria', 'Restaurante', 'Lanchonete', 'Açaíteria', 'Padaria', 'Doceria', 'Outros'];
const paymentMethods = ['Dinheiro', 'Pix', 'Cartão de crédito', 'Cartão de débito', 'Outros'];

type Database = {
  users: User[];
  stores: Store[];
  products: Product[];
  orders: Order[];
};

const emptyDatabase: Database = { users: [], stores: [], products: [], orders: [] };

function now() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
}

function readDb(): Database {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return emptyDatabase;
    const parsed = JSON.parse(saved) as Database;
    return {
      users: parsed.users ?? [],
      stores: parsed.stores ?? [],
      products: parsed.products ?? [],
      orders: parsed.orders ?? [],
    };
  } catch {
    return emptyDatabase;
  }
}

function writeDb(db: Database) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function sanitizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

function currentPath() {
  return window.location.pathname.replace(/\/$/, '') || '/';
}

function publicMenuPath(slug: string) {
  return `/cardapio/${slug}`;
}

function getMenuUrl(slug: string) {
  return `${window.location.origin}${publicMenuPath(slug)}`;
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="toast">
      <Check size={18} />
      {message}
    </div>
  );
}

function App() {
  const [path, setPath] = useState(currentPath());
  const [db, setDb] = useState<Database>(() => readDb());
  const [sessionUserId, setSessionUserId] = useState(() => localStorage.getItem(SESSION_KEY));
  const [toast, setToast] = useState('');

  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    writeDb(db);
  }, [db]);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setPath(currentPath());
    window.scrollTo({ top: 0 });
  };

  const showToast = (message: string) => setToast(message);
  const currentUser = db.users.find((user) => user.id === sessionUserId) ?? null;

  const login = (userId: string) => {
    localStorage.setItem(SESSION_KEY, userId);
    setSessionUserId(userId);
    navigate('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSessionUserId(null);
    navigate('/');
  };

  const appProps = { db, setDb, navigate, showToast };

  let page: React.ReactNode;
  if (path.startsWith('/cardapio/') || path.startsWith('/menu/')) {
    const slug = decodeURIComponent(path.split('/').filter(Boolean)[1] ?? '');
    page = <PublicMenu {...appProps} slug={slug} />;
  } else if (path === '/login') {
    page = <LoginPage {...appProps} onLogin={login} />;
  } else if (path === '/register') {
    page = <RegisterPage {...appProps} onLogin={login} />;
  } else if (path.startsWith('/dashboard')) {
    page = currentUser ? <Dashboard {...appProps} user={currentUser} onLogout={logout} /> : <Unauthorized navigate={navigate} />;
  } else {
    page = <LandingPage navigate={navigate} isLoggedIn={Boolean(currentUser)} />;
  }

  return (
    <>
      {page}
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}

function LandingPage({ navigate, isLoggedIn }: { navigate: (to: string) => void; isLoggedIn: boolean }) {
  const benefits = [
    'Cardápio digital profissional',
    'Pedidos enviados direto para o WhatsApp',
    'Link exclusivo para divulgar nas redes sociais',
    'Painel simples para gerenciar produtos',
    'Ideal para negócios de alimentação',
    'Funciona no celular, tablet e computador',
  ];

  return (
    <main className="landing">
      <header className="site-header">
        <button className="brand" onClick={() => navigate('/')}>
          <span><Utensils size={20} /></span>
          Meu ZapPedido
        </button>
        <nav>
          <button className="ghost-btn" onClick={() => navigate('/login')}>Login</button>
          <button className="primary-btn small" onClick={() => navigate(isLoggedIn ? '/dashboard' : '/register')}>
            {isLoggedIn ? 'Ir para o painel' : 'Criar conta'}
          </button>
        </nav>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Cardápio digital para vender pelo WhatsApp</p>
          <h1>Crie seu cardápio digital e receba pedidos direto no WhatsApp</h1>
          <p className="hero-subtitle">
            Com o Meu ZapPedido, seu cliente acessa seu cardápio online, escolhe os produtos e envia o pedido pronto para o seu WhatsApp.
          </p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => navigate('/register')}>Começar agora</button>
            <a className="secondary-btn" href="#como-funciona">Ver como funciona</a>
          </div>
        </div>
        <div className="hero-preview" aria-label="Prévia do cardápio digital">
          <div className="phone-preview">
            <div className="phone-banner" />
            <h3>Burger House</h3>
            <p>Hambúrgueres artesanais e combos especiais</p>
            {['X-Bacon especial', 'Batata com cheddar', 'Refrigerante 2L'].map((item, index) => (
              <div className="preview-product" key={item}>
                <span>{item}</span>
                <strong>{formatCurrency([25, 18, 12][index])}</strong>
              </div>
            ))}
            <button className="primary-btn full">Finalizar pedido</button>
          </div>
        </div>
      </section>

      <section className="section-grid">
        {benefits.map((benefit) => (
          <article className="benefit-card" key={benefit}>
            <Check size={20} />
            <span>{benefit}</span>
          </article>
        ))}
      </section>

      <section id="como-funciona" className="content-section">
        <p className="eyebrow">Como funciona</p>
        <h2>Do cadastro ao pedido em poucos passos</h2>
        <div className="steps">
          {['O profissional cria sua conta', 'Cadastra os dados da loja', 'Adiciona produtos ao cardápio', 'Compartilha o link com os clientes', 'Recebe pedidos direto no WhatsApp'].map((step, index) => (
            <div className="step" key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pricing-section">
        <div>
          <p className="eyebrow">Plano simples</p>
          <h2>Preço acessível para pequenos negócios</h2>
          <p>Você pode testar gratuitamente antes de contratar.</p>
        </div>
        <article className="pricing-card">
          <h3>Plano Profissional</h3>
          <strong>R$ 19,90<span>/mês</span></strong>
          {['Cardápio digital completo', 'Produtos ilimitados', 'Link personalizado', 'Pedidos via WhatsApp', 'Painel administrativo', 'Suporte básico'].map((item) => (
            <p key={item}><Check size={17} /> {item}</p>
          ))}
          <button className="primary-btn full" onClick={() => navigate('/register')}>Entrar em contato</button>
        </article>
      </section>

      <section className="faq-section">
        <p className="eyebrow">FAQ</p>
        <h2>Perguntas frequentes</h2>
        <details><summary>O cliente precisa criar conta?</summary><p>Não. O cliente acessa o link, monta o pedido e envia tudo pelo WhatsApp.</p></details>
        <details><summary>Posso usar meu próprio WhatsApp?</summary><p>Sim. O pedido é enviado para o número configurado na sua loja.</p></details>
        <details><summary>O pagamento online já está ativo?</summary><p>Nesta versão o pagamento é combinado diretamente com o estabelecimento pelo WhatsApp.</p></details>
      </section>
    </main>
  );
}

type CommonProps = {
  db: Database;
  setDb: React.Dispatch<React.SetStateAction<Database>>;
  navigate: (to: string) => void;
  showToast: (message: string) => void;
};

function LoginPage({ db, navigate, onLogin }: CommonProps & { onLogin: (userId: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const passwordHash = await hashPassword(password);
    const user = db.users.find((entry) => entry.email.toLowerCase() === email.trim().toLowerCase() && entry.passwordHash === passwordHash);
    setLoading(false);
    if (!user) {
      setError('E-mail ou senha inválidos. Verifique os dados e tente novamente.');
      return;
    }
    onLogin(user.id);
  };

  return (
    <AuthLayout title="Entrar no painel" subtitle="Acesse sua conta para gerenciar sua loja.">
      <form onSubmit={submit} className="form-stack">
        <Input label="E-mail" type="email" value={email} onChange={setEmail} required />
        <Input label="Senha" type="password" value={password} onChange={setPassword} required />
        {error && <p className="form-error">{error}</p>}
        <button className="primary-btn full" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
        <button type="button" className="link-btn" onClick={() => navigate('/register')}>Criar minha conta</button>
      </form>
    </AuthLayout>
  );
}

function RegisterPage({ db, setDb, navigate, onLogin }: CommonProps & { onLogin: (userId: string) => void }) {
  const [form, setForm] = useState({
    ownerName: '',
    businessName: '',
    email: '',
    password: '',
    whatsappNumber: '',
    category: 'Lanchonete',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }
    if (db.users.some((user) => user.email.toLowerCase() === form.email.trim().toLowerCase())) {
      setError('Este e-mail já está cadastrado. Use outro e-mail ou faça login.');
      setLoading(false);
      return;
    }

    const userId = createId('usr');
    const storeId = createId('sto');
    const createdAt = now();
    const baseSlug = slugify(form.businessName);
    let slug = baseSlug || `loja-${userId.slice(-6)}`;
    let suffix = 2;
    while (db.stores.some((store) => store.slug === slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const user: User = {
      id: userId,
      name: sanitizeText(form.ownerName),
      email: form.email.trim().toLowerCase(),
      passwordHash: await hashPassword(form.password),
      createdAt,
      updatedAt: createdAt,
    };
    const store: Store = {
      id: storeId,
      userId,
      businessName: sanitizeText(form.businessName),
      slug,
      category: form.category,
      whatsappNumber: form.whatsappNumber,
      description: '',
      logoUrl: '',
      bannerUrl: '',
      address: '',
      openingHours: '',
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    };
    setDb((current) => ({ ...current, users: [...current.users, user], stores: [...current.stores, store] }));
    setLoading(false);
    onLogin(userId);
  };

  return (
    <AuthLayout title="Criar conta" subtitle="Configure seu cardápio digital em poucos minutos.">
      <form onSubmit={submit} className="form-stack">
        <Input label="Nome do responsável" value={form.ownerName} onChange={(value) => update('ownerName', value)} required />
        <Input label="Nome do estabelecimento" value={form.businessName} onChange={(value) => update('businessName', value)} required />
        <Input label="E-mail" type="email" value={form.email} onChange={(value) => update('email', value)} required />
        <Input label="Senha" type="password" value={form.password} onChange={(value) => update('password', value)} required />
        <Input label="WhatsApp" value={form.whatsappNumber} onChange={(value) => update('whatsappNumber', value)} required />
        <Select label="Categoria" value={form.category} onChange={(value) => update('category', value)} options={businessCategories} />
        {error && <p className="form-error">{error}</p>}
        <button className="primary-btn full" disabled={loading}>{loading ? 'Criando conta...' : 'Começar agora'}</button>
        <button type="button" className="link-btn" onClick={() => navigate('/login')}>Já tenho conta</button>
      </form>
    </AuthLayout>
  );
}

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="auth-page">
      <a className="brand auth-brand" href="/">
        <span><Utensils size={20} /></span>
        Meu ZapPedido
      </a>
      <section className="auth-card">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {children}
      </section>
    </main>
  );
}

function Dashboard({ db, setDb, navigate, showToast, user, onLogout }: CommonProps & { user: User; onLogout: () => void }) {
  const [view, setView] = useState<DashboardView>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const store = db.stores.find((entry) => entry.userId === user.id) ?? null;
  const products = store ? db.products.filter((product) => product.storeId === store.id) : [];
  const orders = store ? db.orders.filter((order) => order.storeId === store.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];

  const menuItems: { id: DashboardView; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Visão geral', icon: <LayoutDashboard size={18} /> },
    { id: 'store', label: 'Loja', icon: <StoreIcon size={18} /> },
    { id: 'products', label: 'Produtos', icon: <ShoppingBag size={18} /> },
    { id: 'orders', label: 'Pedidos', icon: <Clipboard size={18} /> },
    { id: 'account', label: 'Conta', icon: <Settings size={18} /> },
  ];

  const selectView = (next: DashboardView) => {
    setView(next);
    setMobileNavOpen(false);
  };

  return (
    <main className="dashboard-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <button className="brand dashboard-brand" onClick={() => selectView('overview')}>
          <span><Utensils size={20} /></span>
          Meu ZapPedido
        </button>
        <nav className="dashboard-nav">
          {menuItems.map((item) => (
            <button className={view === item.id ? 'active' : ''} key={item.id} onClick={() => selectView(item.id)}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <button className="logout-btn" onClick={onLogout}><LogOut size={18} /> Sair</button>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <button className="icon-btn mobile-only" onClick={() => setMobileNavOpen((open) => !open)}>
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <p>Olá, {user.name}</p>
            <h1>{store?.businessName || 'Configure sua loja'}</h1>
          </div>
          {store && <button className="secondary-btn compact" onClick={() => navigate(publicMenuPath(store.slug))}><ExternalLink size={16} /> Abrir cardápio</button>}
        </header>

        {!store && <StoreMissing onConfigure={() => setView('store')} />}
        {store && view === 'overview' && <Overview store={store} products={products} orders={orders} navigate={navigate} showToast={showToast} onAddProduct={() => setView('products')} />}
        {view === 'store' && <StoreSettings db={db} setDb={setDb} user={user} store={store} showToast={showToast} />}
        {store && view === 'products' && <ProductsManager db={db} setDb={setDb} store={store} showToast={showToast} />}
        {store && view === 'orders' && <OrdersManager setDb={setDb} orders={orders} showToast={showToast} />}
        {view === 'account' && <AccountSettings user={user} />}
      </section>
    </main>
  );
}

function Overview({ store, products, orders, navigate, showToast, onAddProduct }: {
  store: Store;
  products: Product[];
  orders: Order[];
  navigate: (to: string) => void;
  showToast: (message: string) => void;
  onAddProduct: () => void;
}) {
  const menuUrl = getMenuUrl(store.slug);
  const available = products.filter((product) => product.isAvailable).length;
  const configured = store.businessName && store.whatsappNumber && store.slug;

  const copyLink = async () => {
    await navigator.clipboard.writeText(menuUrl);
    showToast('Link copiado com sucesso!');
  };

  return (
    <div className="dashboard-content">
      {!configured && <StoreMissing onConfigure={() => undefined} />}
      <div className="metrics-grid">
        <Metric label="Total de produtos" value={products.length.toString()} icon={<ShoppingBag size={20} />} />
        <Metric label="Produtos disponíveis" value={available.toString()} icon={<Eye size={20} />} />
        <Metric label="Total de pedidos" value={orders.length.toString()} icon={<Clipboard size={20} />} />
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Link público</p>
            <h2>Compartilhe seu cardápio</h2>
            <p>Compartilhe esse link no Instagram, WhatsApp e redes sociais.</p>
          </div>
          <div className="button-row">
            <button className="secondary-btn compact" onClick={copyLink}><Clipboard size={16} /> Copiar link do cardápio</button>
            <button className="primary-btn compact" onClick={() => navigate(publicMenuPath(store.slug))}><ExternalLink size={16} /> Abrir</button>
          </div>
        </div>
        <div className="link-box"><LinkIcon size={18} /> {menuUrl}</div>
      </section>
      {products.length === 0 && <EmptyState title="Nenhum produto cadastrado" text="Adicione seu primeiro produto para começar a vender pelo WhatsApp." button="Adicionar produto" onClick={onAddProduct} />}
      {orders.length === 0 && <EmptyState title="Nenhum pedido ainda" text="Quando seus clientes fizerem pedidos, eles aparecerão aqui." />}
    </div>
  );
}

function StoreSettings({ db, setDb, user, store, showToast }: {
  db: Database;
  setDb: React.Dispatch<React.SetStateAction<Database>>;
  user: User;
  store: Store | null;
  showToast: (message: string) => void;
}) {
  const [form, setForm] = useState(() => store ?? {
    id: createId('sto'),
    userId: user.id,
    businessName: '',
    slug: '',
    category: 'Lanchonete',
    whatsappNumber: '',
    description: '',
    logoUrl: '',
    bannerUrl: '',
    address: '',
    openingHours: '',
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (store) setForm(store);
  }, [store]);

  const update = (key: keyof Store, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const cleanSlug = slugify(form.slug || form.businessName);
    if (!cleanSlug) {
      setError('Informe um link válido para a loja.');
      setSaving(false);
      return;
    }
    if (db.stores.some((entry) => entry.slug === cleanSlug && entry.id !== form.id)) {
      setError('Esse link já está em uso. Escolha outro nome.');
      setSaving(false);
      return;
    }
    if (!form.whatsappNumber.trim()) {
      setError('Informe o WhatsApp que receberá os pedidos.');
      setSaving(false);
      return;
    }
    const savedStore: Store = {
      ...form,
      businessName: sanitizeText(form.businessName),
      slug: cleanSlug,
      whatsappNumber: form.whatsappNumber,
      updatedAt: now(),
    };
    setDb((current) => ({
      ...current,
      stores: current.stores.some((entry) => entry.id === savedStore.id)
        ? current.stores.map((entry) => (entry.id === savedStore.id ? savedStore : entry))
        : [...current.stores, savedStore],
    }));
    setSaving(false);
    showToast('Dados da loja salvos com sucesso!');
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Configuração</p>
          <h2>Dados da loja</h2>
          <p>Complete as informações que aparecem no cardápio público.</p>
        </div>
      </div>
      <form onSubmit={submit} className="settings-grid">
        <Input label="Nome do estabelecimento" value={form.businessName} onChange={(value) => update('businessName', value)} required />
        <Input label="WhatsApp" value={form.whatsappNumber} onChange={(value) => update('whatsappNumber', value)} required />
        <Select label="Categoria" value={form.category} onChange={(value) => update('category', value)} options={businessCategories} />
        <Input label="Link personalizado" value={form.slug} onChange={(value) => update('slug', slugify(value))} required helper={`Seu link: ${getMenuUrl(form.slug || 'sua-loja')}`} />
        <Input label="Descrição" value={form.description} onChange={(value) => update('description', value)} />
        <Input label="Endereço" value={form.address} onChange={(value) => update('address', value)} />
        <Input label="Horário de funcionamento" value={form.openingHours} onChange={(value) => update('openingHours', value)} />
        <Input label="URL da logo" value={form.logoUrl} onChange={(value) => update('logoUrl', value)} />
        <Input label="URL do banner" value={form.bannerUrl} onChange={(value) => update('bannerUrl', value)} />
        <label className="switch-row"><input type="checkbox" checked={form.isActive} onChange={(event) => update('isActive', event.target.checked)} /> Cardápio ativo</label>
        {error && <p className="form-error wide">{error}</p>}
        <button className="primary-btn wide" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</button>
      </form>
    </section>
  );
}

function ProductsManager({ db, setDb, store, showToast }: {
  db: Database;
  setDb: React.Dispatch<React.SetStateAction<Database>>;
  store: Store;
  showToast: (message: string) => void;
}) {
  const initialProduct = {
    id: '',
    storeId: store.id,
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    category: 'Lanches',
    isAvailable: true,
    createdAt: now(),
    updatedAt: now(),
  };
  const [form, setForm] = useState<Product>(initialProduct);
  const [editing, setEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const products = db.products.filter((product) => product.storeId === store.id);

  const update = (key: keyof Product, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const reset = () => {
    setForm({ ...initialProduct, createdAt: now(), updatedAt: now() });
    setEditing(false);
    setError('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Informe o nome do produto.');
      return;
    }
    if (!form.price || form.price <= 0) {
      setError('Informe um preço válido para o produto.');
      return;
    }
    const saved: Product = {
      ...form,
      id: form.id || createId('prd'),
      storeId: store.id,
      name: sanitizeText(form.name),
      price: Number(form.price),
      createdAt: form.createdAt || now(),
      updatedAt: now(),
    };
    setDb((current) => ({
      ...current,
      products: current.products.some((product) => product.id === saved.id)
        ? current.products.map((product) => (product.id === saved.id ? saved : product))
        : [...current.products, saved],
    }));
    showToast(editing ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!');
    reset();
  };

  const removeProduct = () => {
    if (!deleteTarget) return;
    setDb((current) => ({ ...current, products: current.products.filter((product) => product.id !== deleteTarget.id) }));
    setDeleteTarget(null);
    showToast('Produto excluído com sucesso.');
  };

  const toggleAvailable = (product: Product) => {
    setDb((current) => ({
      ...current,
      products: current.products.map((entry) => entry.id === product.id ? { ...entry, isAvailable: !entry.isAvailable, updatedAt: now() } : entry),
    }));
  };

  return (
    <div className="dashboard-content two-column">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">{editing ? 'Editar produto' : 'Novo produto'}</p>
            <h2>{editing ? form.name : 'Adicionar produto'}</h2>
          </div>
          {editing && <button className="secondary-btn compact" onClick={reset}>Cancelar</button>}
        </div>
        <form onSubmit={submit} className="form-stack">
          <Input label="Nome do produto" value={form.name} onChange={(value) => update('name', value)} required />
          <Input label="Descrição" value={form.description} onChange={(value) => update('description', value)} />
          <Input label="Preço" type="number" value={String(form.price || '')} onChange={(value) => update('price', Number(value))} required />
          <Input label="Categoria" value={form.category} onChange={(value) => update('category', value)} />
          <Input label="URL da imagem" value={form.imageUrl} onChange={(value) => update('imageUrl', value)} />
          <label className="switch-row"><input type="checkbox" checked={form.isAvailable} onChange={(event) => update('isAvailable', event.target.checked)} /> Produto disponível</label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-btn full"><PackagePlus size={18} /> {editing ? 'Salvar produto' : 'Adicionar produto'}</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Cardápio</p>
            <h2>Produtos cadastrados</h2>
          </div>
        </div>
        {products.length === 0 ? (
          <EmptyState title="Nenhum produto cadastrado" text="Adicione seu primeiro produto para começar a vender pelo WhatsApp." />
        ) : (
          <div className="product-admin-list">
            {products.map((product) => (
              <article className="product-admin-card" key={product.id}>
                <div className="product-thumb">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <ShoppingBag size={22} />}</div>
                <div>
                  <h3>{product.name}</h3>
                  <p>{product.category} · {formatCurrency(product.price)}</p>
                  <span className={product.isAvailable ? 'status-pill success' : 'status-pill muted'}>{product.isAvailable ? 'Disponível' : 'Indisponível'}</span>
                </div>
                <div className="card-actions">
                  <button className="icon-btn" title="Alterar disponibilidade" onClick={() => toggleAvailable(product)}>{product.isAvailable ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  <button className="icon-btn" title="Editar" onClick={() => { setForm(product); setEditing(true); }}><Settings size={18} /></button>
                  <button className="icon-btn danger" title="Excluir" onClick={() => setDeleteTarget(product)}><Trash2 size={18} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {deleteTarget && (
        <ConfirmModal
          title="Excluir produto"
          text={`Tem certeza que deseja excluir ${deleteTarget.name}? Essa ação não pode ser desfeita.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={removeProduct}
        />
      )}
    </div>
  );
}

function OrdersManager({ setDb, orders, showToast }: {
  setDb: React.Dispatch<React.SetStateAction<Database>>;
  orders: Order[];
  showToast: (message: string) => void;
}) {
  const updateStatus = (order: Order, status: Order['status']) => {
    setDb((current) => ({
      ...current,
      orders: current.orders.map((entry) => entry.id === order.id ? { ...entry, status } : entry),
    }));
    showToast('Status do pedido atualizado.');
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Pedidos</p>
          <h2>Histórico de pedidos</h2>
        </div>
      </div>
      {orders.length === 0 ? (
        <EmptyState title="Nenhum pedido ainda" text="Quando seus clientes fizerem pedidos, eles aparecerão aqui." />
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div>
                <h3>{order.customerName}</h3>
                <p>{new Date(order.createdAt).toLocaleString('pt-BR')} · {order.orderType} · {formatCurrency(order.total)}</p>
                <p>{order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}</p>
              </div>
              <Select label="Status" value={order.status} onChange={(value) => updateStatus(order, value as Order['status'])} options={['Novo', 'Em preparo', 'Finalizado', 'Cancelado']} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PublicMenu({ db, setDb, slug, showToast }: CommonProps & { slug: string }) {
  const store = db.stores.find((entry) => entry.slug === slug && entry.isActive) ?? null;
  const products = store ? db.products.filter((product) => product.storeId === store.id && product.isAvailable && product.price > 0) : [];
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    document.title = store ? `${store.businessName} | Meu ZapPedido` : 'Cardápio não encontrado | Meu ZapPedido';
  }, [store]);

  if (!store) {
    return (
      <main className="not-found-page">
        <div className="not-found-card">
          <Utensils size={32} />
          <h1>Cardápio não encontrado</h1>
          <p>Verifique se o link está correto ou entre em contato com o estabelecimento.</p>
          <a className="primary-btn" href="/">Voltar ao início</a>
        </div>
      </main>
    );
  }

  const grouped = products.reduce<Record<string, Product[]>>((acc, product) => {
    const category = product.category || 'Produtos';
    acc[category] = [...(acc[category] ?? []), product];
    return acc;
  }, {});

  const addToCart = (product: Product) => {
    setCart((current) => {
      const found = current.find((item) => item.productId === product.id);
      if (found) {
        return current.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setCart((current) => current
      .map((item) => item.productId === productId ? { ...item, quantity: item.quantity + delta } : item)
      .filter((item) => item.quantity > 0));
  };

  return (
    <main className="menu-page">
      <header className="menu-hero">
        {store.bannerUrl && <img className="menu-banner" src={store.bannerUrl} alt="" />}
        <div className="menu-hero-content">
          <div className="menu-logo">{store.logoUrl ? <img src={store.logoUrl} alt="" /> : <StoreIcon size={28} />}</div>
          <div>
            <p className="eyebrow">{store.category}</p>
            <h1>{store.businessName}</h1>
            {store.description && <p>{store.description}</p>}
            <div className="menu-meta">
              {store.openingHours && <span><Clock size={15} /> {store.openingHours}</span>}
              {store.address && <span>{store.address}</span>}
            </div>
          </div>
        </div>
      </header>

      <section className="menu-content">
        {products.length === 0 ? (
          <EmptyState title="Nenhum produto disponível" text="Este estabelecimento ainda não possui produtos disponíveis no cardápio." />
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <section className="menu-category" key={category}>
              <h2>{category}</h2>
              <div className="menu-products">
                {items.map((product) => (
                  <article className="menu-product" key={product.id}>
                    <div>
                      <h3>{product.name}</h3>
                      {product.description && <p>{product.description}</p>}
                      <strong>{formatCurrency(product.price)}</strong>
                    </div>
                    <div className="menu-product-side">
                      {product.imageUrl && <img src={product.imageUrl} alt="" />}
                      <button className="icon-btn add" onClick={() => addToCart(product)} title="Adicionar produto"><Plus size={20} /></button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </section>

      {cart.length > 0 && (
        <div className="cart-bar">
          <div>
            <strong>{cart.reduce((sum, item) => sum + item.quantity, 0)} itens</strong>
            <span>{formatCurrency(total)}</span>
          </div>
          <button className="primary-btn" onClick={() => setCheckoutOpen(true)}>Finalizar pedido</button>
        </div>
      )}

      {checkoutOpen && (
        <CheckoutModal
          store={store}
          cart={cart}
          total={total}
          onClose={() => setCheckoutOpen(false)}
          onQuantity={changeQty}
          onClear={() => setCart([])}
          setDb={setDb}
          showToast={showToast}
        />
      )}
    </main>
  );
}

function CheckoutModal({ store, cart, total, onClose, onQuantity, onClear, setDb, showToast }: {
  store: Store;
  cart: CartItem[];
  total: number;
  onClose: () => void;
  onQuantity: (productId: string, delta: number) => void;
  onClear: () => void;
  setDb: React.Dispatch<React.SetStateAction<Database>>;
  showToast: (message: string) => void;
}) {
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    orderType: 'Entrega' as 'Entrega' | 'Retirada',
    address: '',
    paymentMethod: 'Pix',
    notes: '',
  });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const sendOrder = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (cart.length === 0) {
      setError('Seu carrinho está vazio.');
      return;
    }
    if (!store.whatsappNumber.trim()) {
      setError('O estabelecimento ainda não configurou o WhatsApp para receber pedidos.');
      return;
    }
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      setError('Informe seu nome e telefone para finalizar o pedido.');
      return;
    }
    if (form.orderType === 'Entrega' && !form.address.trim()) {
      setError('Informe o endereço para entrega.');
      return;
    }
    setSending(true);
    const order: Order = {
      id: createId('ord'),
      storeId: store.id,
      customerName: sanitizeText(form.customerName),
      customerPhone: form.customerPhone,
      orderType: form.orderType,
      address: form.orderType === 'Entrega' ? form.address : '',
      paymentMethod: form.paymentMethod,
      notes: form.notes,
      items: cart,
      total,
      status: 'Novo',
      createdAt: now(),
    };
    setDb((current) => {
      const next = { ...current, orders: [...current.orders, order] };
      writeDb(next);
      return next;
    });
    const message = buildWhatsAppMessage(store, order);
    const phone = normalizeWhatsAppNumber(store.whatsappNumber);
    onClear();
    showToast('Pedido gerado com sucesso!');
    window.setTimeout(() => {
      window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    }, 300);
  };

  return (
    <div className="modal-backdrop">
      <section className="checkout-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Checkout</p>
            <h2>Finalizar pedido</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="cart-items">
          {cart.map((item) => (
            <div className="cart-item" key={item.productId}>
              <div>
                <strong>{item.name}</strong>
                <span>{formatCurrency(item.price)} cada</span>
              </div>
              <div className="qty-control">
                <button onClick={() => onQuantity(item.productId, -1)} type="button">-</button>
                <span>{item.quantity}</span>
                <button onClick={() => onQuantity(item.productId, 1)} type="button">+</button>
              </div>
            </div>
          ))}
          <div className="cart-total"><span>Total</span><strong>{formatCurrency(total)}</strong></div>
        </div>
        <form onSubmit={sendOrder} className="settings-grid">
          <Input label="Nome" value={form.customerName} onChange={(value) => update('customerName', value)} required />
          <Input label="Telefone" value={form.customerPhone} onChange={(value) => update('customerPhone', value)} required />
          <Select label="Tipo de pedido" value={form.orderType} onChange={(value) => update('orderType', value)} options={['Entrega', 'Retirada']} />
          {form.orderType === 'Entrega' && <Input label="Endereço" value={form.address} onChange={(value) => update('address', value)} required />}
          <Select label="Forma de pagamento" value={form.paymentMethod} onChange={(value) => update('paymentMethod', value)} options={paymentMethods} />
          <Input label="Observação opcional" value={form.notes} onChange={(value) => update('notes', value)} />
          {error && <p className="form-error wide">{error}</p>}
          <button className="primary-btn wide" disabled={sending}>{sending ? 'Enviando pedido...' : 'Enviar pedido pelo WhatsApp'}</button>
        </form>
      </section>
    </div>
  );
}

function buildWhatsAppMessage(store: Store, order: Order) {
  const address = order.orderType === 'Entrega' ? `\nEndereço: ${order.address}` : '';
  const notes = order.notes.trim() ? order.notes.trim() : 'Sem observações.';
  const items = order.items.map((item) => `${item.quantity}x ${item.name} - ${formatCurrency(item.price)}`).join('\n');
  return `Olá, gostaria de fazer um pedido pelo Meu ZapPedido.

Loja: ${store.businessName}

Cliente: ${order.customerName}
Telefone: ${order.customerPhone}

Tipo de pedido: ${order.orderType}${address}

Itens:
${items}

Total: ${formatCurrency(order.total)}

Forma de pagamento: ${order.paymentMethod}

Observação:
${notes}`;
}

function Input({ label, value, onChange, type = 'text', required = false, helper }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; helper?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined} />
      {helper && <small>{helper}</small>}
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <article className="metric-card">
      <span>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function EmptyState({ title, text, button, onClick }: { title: string; text: string; button?: string; onClick?: () => void }) {
  return (
    <div className="empty-state">
      <ShoppingBag size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
      {button && onClick && <button className="primary-btn compact" onClick={onClick}>{button}</button>}
    </div>
  );
}

function StoreMissing({ onConfigure }: { onConfigure: () => void }) {
  return (
    <EmptyState
      title="Configure sua loja"
      text="Antes de divulgar seu cardápio, complete as informações do seu estabelecimento."
      button="Configurar loja"
      onClick={onConfigure}
    />
  );
}

function AccountSettings({ user }: { user: User }) {
  return (
    <section className="panel">
      <p className="eyebrow">Conta</p>
      <h2>Dados do responsável</h2>
      <div className="account-box">
        <p><strong>Nome:</strong> {user.name}</p>
        <p><strong>E-mail:</strong> {user.email}</p>
        <p><strong>Criado em:</strong> {new Date(user.createdAt).toLocaleDateString('pt-BR')}</p>
      </div>
    </section>
  );
}

function ConfirmModal({ title, text, onCancel, onConfirm }: { title: string; text: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-backdrop">
      <section className="confirm-modal">
        <h2>{title}</h2>
        <p>{text}</p>
        <div className="button-row end">
          <button className="secondary-btn compact" onClick={onCancel}>Cancelar</button>
          <button className="danger-btn compact" onClick={onConfirm}>Excluir</button>
        </div>
      </section>
    </div>
  );
}

function Unauthorized({ navigate }: { navigate: (to: string) => void }) {
  return (
    <main className="not-found-page">
      <div className="not-found-card">
        <ArrowLeft size={30} />
        <h1>Acesso restrito</h1>
        <p>Faça login para acessar o painel da sua loja.</p>
        <button className="primary-btn" onClick={() => navigate('/login')}>Entrar</button>
      </div>
    </main>
  );
}

export default App;
