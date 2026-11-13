
/* DDO | Autenticação - arquivo público do Netlify.
   Necessita carregar primeiro supabase-js v2 (UMD).
   Chave PUBLICÁVEL: não é segredo.
   Nunca inclua service_role ou secret key aqui. */

(() => {
  'use strict';

  const SUPABASE_URL = 'https://bveijooqfpiaeghxijpz.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_jeXEB2W5DfHUaLGgU76K3A_fND6nxoK';
  const API_URL = 'https://entregas-api.vercel.app/api/dados2';
  const REDIRECT_URL = 'https://entregas-ddo.netlify.app/';

  // Preferência de manter conectado.
  const REMEMBER_KEY = 'ddo-remember-login';
  const SESSION_KEY = 'sb-bveijooqfpiaeghxijpz-auth-token';

  const rememberLogin = () =>
    localStorage.getItem(REMEMBER_KEY) !== 'false';

  // LocalStorage: mantém login após fechar navegador.
  // SessionStorage: sessão temporária.
  const sessionStorageAdapter = {
    getItem(key) {
      return (
        rememberLogin() ? localStorage : sessionStorage
      ).getItem(key);
    },

    setItem(key, value) {
      const storage = rememberLogin()
        ? localStorage
        : sessionStorage;

      const other = rememberLogin()
        ? sessionStorage
        : localStorage;

      storage.setItem(key, value);
      other.removeItem(key);
    },

    removeItem(key) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  };

  const client = window.supabase?.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: SESSION_KEY,
        storage: sessionStorageAdapter
      }
    }
  );

  if (!client) {
    console.error('Carregue supabase-js antes de auth.js');
    return;
  }

  let initializeDashboard = null;
  let dashboardStarted = false;
  let mode = 'login';

  const hash = new URLSearchParams(
    window.location.hash.replace(/^#/, '')
  );

  let isPasswordLink = [
    'invite',
    'recovery'
  ].includes(hash.get('type'));

  const $ = id => document.getElementById(id);

  function ensureUI() {
    if ($('ddo-auth-screen')) return;

    const style = document.createElement('style');

    style.textContent = `
      #ddo-auth-screen {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
        background: linear-gradient(145deg,#eef4f0,#f8fafc);
        font-family: Inter,Arial,sans-serif;
      }

      #ddo-auth-screen.ddo-hidden {
        display: none;
      }

      #ddo-auth-screen .ddo-card {
        background: #fff;
        width: min(100%,390px);
        padding: 34px;
        border-radius: 15px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 16px 50px #14291c17;
      }

      #ddo-auth-screen .ddo-logo {
        max-width: 230px;
        max-height: 54px;
        object-fit: contain;
        display: block;
        margin: 0 auto 22px;
      }

      #ddo-auth-screen h1 {
        font-size: 23px;
        font-weight: 700;
        text-align: center;
        color: #235937;
        margin: 0;
      }

      #ddo-auth-screen p.ddo-sub {
        text-align: center;
        font-size: 13px;
        color: #64748b;
        margin: 10px 0 25px;
      }

      #ddo-auth-screen label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: #334155;
        margin: 14px 0 7px;
      }

      #ddo-auth-screen input {
        display: block;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 11px 13px;
        font-size: 14px;
      }

      #ddo-auth-screen input:focus {
        outline: none;
        border-color: #235937;
        box-shadow: 0 0 0 3px #23593720;
      }

      #ddo-auth-screen .ddo-remember {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-top: 15px;
        cursor: pointer;
      }

      #ddo-auth-screen .ddo-remember input {
        width: 16px;
        height: 16px;
        padding: 0;
        margin: 0;
        accent-color: #235937;
        flex-shrink: 0;
      }

      #ddo-auth-screen .ddo-remember span {
        font-size: 13px;
        color: #334155;
        font-weight: 500;
      }

      #ddo-auth-screen .ddo-primary {
        width: 100%;
        border: 0;
        border-radius: 8px;
        background: #235937;
        color: #fff;
        font-weight: 600;
        padding: 12px;
        margin-top: 21px;
        cursor: pointer;
      }

      #ddo-auth-screen .ddo-primary:hover {
        background: #19462b;
      }

      #ddo-auth-screen .ddo-primary:disabled {
        opacity: .6;
        cursor: wait;
      }

      #ddo-auth-screen .ddo-link {
        background: none;
        border: 0;
        color: #235937;
        font-size: 13px;
        cursor: pointer;
        display: block;
        margin: 16px auto 0;
      }

      #ddo-auth-screen #ddo-auth-message {
        font-size: 13px;
        text-align: center;
        color: #b91c1c;
        margin: 15px 0 0;
        min-height: 18px;
      }

      #ddo-auth-screen #ddo-auth-message.ok {
        color: #166534;
      }

      #ddo-auth-screen .ddo-hidden {
        display: none!important;
      }

      #ddo-auth-screen .ddo-foot {
        text-align: center;
        color: #94a3b8;
        font-size: 11px;
        margin-top: 26px;
      }

      .ddo-logout {
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 13px;
        color: #334155;
        margin-left: 10px;
        cursor: pointer;
      }

      .ddo-logout:hover {
        background: #e2e8f0;
      }
    `;

    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.id = 'ddo-auth-screen';

    wrap.innerHTML = `
      <div class="ddo-card">

        <img
          class="ddo-logo"
          src="Sistema-FAEP-SENAR-PR.png"
          alt="Sistema FAEP - SENAR-PR"
        >

        <p class="ddo-sub" id="ddo-auth-sub">
          Acesso exclusivo a usuários autorizados
        </p>

        <form id="ddo-login-form">

          <label for="ddo-email">E-mail</label>
          <input
            type="email"
            id="ddo-email"
            autocomplete="username"
            required
            placeholder="Seu e-mail"
          >

          <label for="ddo-password">Senha</label>
          <input
            type="password"
            id="ddo-password"
            autocomplete="current-password"
            required
            placeholder="Sua senha"
          >

          <label class="ddo-remember" for="ddo-remember">
            <input
              type="checkbox"
              id="ddo-remember"
              checked
            >
            <span>
              Manter conectado neste dispositivo
            </span>
          </label>

          <button
            class="ddo-primary"
            id="ddo-login-btn"
            type="submit"
          >
            Entrar
          </button>

          <button
            type="button"
            class="ddo-link"
            id="ddo-forgot-btn"
          >
            Esqueci minha senha
          </button>

        </form>

        <form id="ddo-change-form" class="ddo-hidden">

          <label for="ddo-new-password">
            Nova senha (mínimo 12 caracteres)
          </label>

          <input
            type="password"
            id="ddo-new-password"
            autocomplete="new-password"
            required
            minlength="12"
          >

          <label for="ddo-confirm-password">
            Confirmar senha
          </label>

          <input
            type="password"
            id="ddo-confirm-password"
            autocomplete="new-password"
            required
            minlength="12"
          >

          <button class="ddo-primary" type="submit">
            Salvar senha
          </button>

        </form>

        <p
          id="ddo-auth-message"
          role="status"
          aria-live="polite"
        ></p>

      </div>
    `;

    document.body.prepend(wrap);

    $('dashboard-container').style.display = 'none';
    document.body.classList.remove('ddo-authorized');

    $('ddo-remember').checked = rememberLogin();

    // LOGIN
    $('ddo-login-form').addEventListener(
      'submit',
      async e => {
        e.preventDefault();

        const btn = $('ddo-login-btn');
        btn.disabled = true;
        message('');

        try {
          const keep = $('ddo-remember').checked;

          // Salva a preferência antes de autenticar.
          localStorage.setItem(
            REMEMBER_KEY,
            String(keep)
          );

          const { error } =
            await client.auth.signInWithPassword({
              email: $('ddo-email').value.trim(),
              password: $('ddo-password').value
            });

          if (error) throw error;

          $('ddo-password').value = '';

          await enterDashboard();

        } catch (err) {
          message(
            'Não foi possível entrar. Verifique os dados e se a conta está autorizada.'
          );
        } finally {
          btn.disabled = false;
        }
      }
    );

    // RECUPERAÇÃO DE SENHA
    $('ddo-forgot-btn').addEventListener(
      'click',
      async () => {
        const email = $('ddo-email').value.trim();

        if (!email) {
          return message(
            'Digite seu e-mail antes de solicitar a recuperação.'
          );
        }

        try {
          const { error } =
            await client.auth.resetPasswordForEmail(
              email,
              { redirectTo: REDIRECT_URL }
            );

          if (error) throw error;

          message(
            'Se a conta existir, você receberá um e-mail de recuperação.',
            true
          );

        } catch (_) {
          message(
            'Não foi possível solicitar a recuperação. Verifique a configuração de e-mail.'
          );
        }
      }
    );

    // ALTERAÇÃO DE SENHA
    $('ddo-change-form').addEventListener(
      'submit',
      async e => {
        e.preventDefault();

        const pass = $('ddo-new-password').value;

        if (pass !== $('ddo-confirm-password').value) {
          return message('As senhas não coincidem.');
        }

        try {
          const { error } = await client.auth.updateUser({
            password: pass
          });

          if (error) throw error;

          isPasswordLink = false;
          mode = 'login';

          history.replaceState(
            null,
            '',
            window.location.pathname
          );

          await enterDashboard();

        } catch (_) {
          message(
            'Não foi possível salvar a senha. Solicite um novo link.'
          );
        }
      }
    );

    // LOGOUT
    document.body.addEventListener(
      'click',
      async e => {
        if (!e.target.closest('.ddo-logout')) return;

        await client.auth.signOut();

        dashboardStarted = false;

        window.location.replace(REDIRECT_URL);
      }
    );

    // Insere novamente o botão Sair quando
    // o cabeçalho do dashboard é reconstruído.
    const observer = new MutationObserver(() => {
      document
        .querySelectorAll('#dashboard-container header')
        .forEach(header => {

          if (header.querySelector('.ddo-logout')) {
            return;
          }

          const button = document.createElement('button');

          button.className = 'ddo-logout';
          button.type = 'button';
          button.textContent = 'Sair';
          button.title = 'Encerrar sessão';

          header.appendChild(button);
        });
    });

    observer.observe(
      $('dashboard-container'),
      {
        childList: true,
        subtree: true
      }
    );
  }

  function message(txt, ok = false) {
    const el = $('ddo-auth-message');

    if (!el) return;

    el.textContent = txt;
    el.classList.toggle('ok', ok);
  }

  function showLogin() {
    ensureUI();

    $('ddo-auth-screen').classList.remove('ddo-hidden');

    $('dashboard-container').style.display = 'none';

    document.body.classList.remove('ddo-authorized');

    $('ddo-login-form').classList.toggle(
      'ddo-hidden',
      mode !== 'login'
    );

    $('ddo-change-form').classList.toggle(
      'ddo-hidden',
      mode !== 'password'
    );

    if ($('ddo-auth-sub')) {
      $('ddo-auth-sub').textContent =
        mode === 'password'
          ? 'Defina uma senha para concluir o acesso'
          : 'Acesso exclusivo a usuários autorizados';
    }
  }

  async function enterDashboard() {
    if (mode === 'password' || isPasswordLink) {
      showLogin();
      return;
    }

    const {
      data: { session },
      error
    } = await client.auth.getSession();

    if (error || !session) {
      return showLogin();
    }

    // A API determina se a conta está autorizada.
    const verification = await apiFetch(API_URL);

    if (!verification.ok) {
      showLogin();

      message(
        verification.status === 401 ||
        verification.status === 403
          ? 'Sua conta não está autorizada a acessar este dashboard.'
          : 'A API ainda não foi configurada ou está indisponível.'
      );

      return;
    }

    $('ddo-auth-screen').classList.add('ddo-hidden');

    $('dashboard-container').style.display = 'block';

    document.body.classList.add('ddo-authorized');

    if (!dashboardStarted && initializeDashboard) {
      dashboardStarted = true;
      await initializeDashboard();
    }
  }

  async function apiFetch(input, init = {}) {
    const {
      data: { session }
    } = await client.auth.getSession();

    if (!session) {
      showLogin();

      throw new Error(
        'Sessão encerrada. Faça login novamente.'
      );
    }

    const headers = new Headers(init.headers || {});

    headers.set(
      'Authorization',
      `Bearer ${session.access_token}`
    );

    const response = await fetch(input, {
      ...init,
      headers,
      cache: 'no-store'
    });

    if ([401, 403].includes(response.status)) {
      showLogin();

      message(
        'Sua sessão expirou ou o acesso foi removido.'
      );
    }

    return response;
  }

  async function bootstrap(callback) {
    initializeDashboard = callback;

    ensureUI();
    showLogin();

    const {
      data: { session }
    } = await client.auth.getSession();

    if (isPasswordLink && session) {
      mode = 'password';
      showLogin();
      return;
    }

    if (session) {
      try {
        await enterDashboard();
      } catch (e) {
        showLogin();

        message(
          'Não foi possível validar o acesso à API.'
        );
      }
    }
  }

  client.auth.onAuthStateChange(event => {
    if (event === 'PASSWORD_RECOVERY') {
      isPasswordLink = true;
      mode = 'password';

      if (document.readyState !== 'loading') {
        showLogin();
      }
    }

    if (
      event === 'SIGNED_OUT' &&
      document.readyState !== 'loading'
    ) {
      dashboardStarted = false;
      showLogin();
    }
  });

  window.DDOAuth = {
    bootstrap,
    fetch: apiFetch
  };

})();
