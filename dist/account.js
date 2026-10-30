// Accounts, email verification, the profile page and saved crawlers ("My Crawlers").
//
// The builder still works signed out: the working draft always lives in
// localStorage (app.js). Signing in adds saving that draft to the account, up
// to the server's limit (5), once the email address is verified with the
// emailed code. `link` remembers which saved crawler the draft came from, and
// its JSON as last saved, so the header can show "Saved" or "Save changes" and
// Save updates the right record.
import { api, ApiError } from './api.js';

const LINK_KEY = 'dcc-crawler-builder-link';

export const account = {
  available: true, // false when no server answers (e.g. dist/ served statically)
  ready: false,
  user: null, // { id, email, name, emailVerified, pendingEmail }
  characters: [],
  limit: 5,
  mode: 'login', // or 'register'
  error: '',
  errorForm: '', // which form `error` belongs to
  busy: false,
};

let link = readLink();

function readLink() {
  try {
    const saved = JSON.parse(localStorage.getItem(LINK_KEY));
    return saved && Number.isInteger(saved.id) && typeof saved.json === 'string' ? saved : null;
  } catch {
    return null;
  }
}

export function setLink(id, state) {
  link = id ? { id, json: JSON.stringify(state) } : null;
  try {
    if (link) localStorage.setItem(LINK_KEY, JSON.stringify(link));
    else localStorage.removeItem(LINK_KEY);
  } catch {
    // Private mode: the link only lasts for this page load.
  }
}

export function linkedId() {
  return link?.id ?? null;
}

// 'saved' | 'unsaved' (linked, changed since) | 'new' (not saved to the account)
export function saveStatus(state) {
  if (!link) return 'new';
  return link.json === JSON.stringify(state) ? 'saved' : 'unsaved';
}

export function verified() {
  return Boolean(account.user?.emailVerified);
}

// One draft per browser until the email is verified: starting another crawler
// (which replaces the draft) needs a verified account. Without a server there's
// no way to verify, so the builder stays unrestricted.
export function canStartNewCrawler() {
  return !account.available || verified();
}

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadList() {
  if (!verified()) {
    account.characters = [];
    return;
  }
  const data = await api('characters');
  account.characters = data.characters;
  account.limit = data.limit;
  if (link && !account.characters.some((x) => x.id === link.id)) setLink(null);
}

export async function refreshAccount() {
  try {
    account.user = (await api('auth/me')).user;
    await loadList();
  } catch (error) {
    account.user = null;
    account.characters = [];
    // 401 means signed out; no server or no API means accounts are unavailable.
    if (!(error instanceof ApiError) || error.status !== 401) account.available = false;
  }
  account.ready = true;
}

// Forms on the account and profile pages. Each returns a notice on success;
// on failure it returns null and leaves the message in account.error.
const forms = {
  async login({ email, password }) {
    account.user = (await api('auth/login', { method: 'POST', body: { email, password } })).user;
    await loadList();
    return verified() ? 'Signed in.' : `Signed in. Enter the code sent to ${account.user.email}.`;
  },
  async register({ name, email, password }) {
    const data = await api('auth/register', { method: 'POST', body: { name, email, password } });
    account.user = data.user;
    return data.codeSent ? `Account created. We sent a code to ${account.user.email}.` : "Account created, but the code email couldn't be sent. Use Resend.";
  },
  async verify({ code }) {
    account.user = (await api('auth/verify', { method: 'POST', body: { code } })).user;
    await loadList();
    return 'Email verified. You can save crawlers now.';
  },
  async profile({ name }) {
    account.user = (await api('auth/profile', { method: 'PATCH', body: { name } })).user;
    return 'Profile saved.';
  },
  async 'change-email'({ email, password }) {
    account.user = (await api('auth/email', { method: 'POST', body: { email, password } })).user;
    return `We sent a code to ${account.user.pendingEmail}.`;
  },
  async 'confirm-email'({ code }) {
    account.user = (await api('auth/email/verify', { method: 'POST', body: { code } })).user;
    return `Your email is now ${account.user.email}.`;
  },
};

// Buttons that call the API without a form.
const actions = {
  async 'resend-verify'() {
    account.user = (await api('auth/verify/resend', { method: 'POST' })).user;
    return `Sent a code to ${account.user.email}.`;
  },
  async 'resend-email'() {
    await api('auth/email/resend', { method: 'POST' });
    return `Sent a new code to ${account.user.pendingEmail}.`;
  },
  async 'cancel-email'() {
    await api('auth/email', { method: 'DELETE' });
    account.user = (await api('auth/me')).user;
    return 'Email change cancelled.';
  },
};

export const isAccountForm = (kind) => kind in forms;
export const isAccountAction = (kind) => kind in actions;

async function run(kind, fn) {
  account.busy = true;
  account.error = '';
  account.errorForm = '';
  try {
    return await fn();
  } catch (error) {
    account.error = error.message;
    account.errorForm = kind;
    if (error instanceof ApiError && error.status === 401) await refreshAccount();
    return null;
  } finally {
    account.busy = false;
  }
}

export function submitAccountForm(kind, data) {
  return run(kind, () => forms[kind](data));
}

export function accountAction(kind) {
  return run(kind, () => actions[kind]());
}

export async function signOut() {
  await api('auth/logout', { method: 'POST' }).catch(() => {});
  account.user = null;
  account.characters = [];
  account.error = '';
  setLink(null);
}

// Saves the draft: updates the linked crawler, or creates one if there isn't one.
export async function saveCharacter(state) {
  let saved;
  if (link) {
    try {
      saved = await api(`characters/${link.id}`, { method: 'PUT', body: { state } });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
      setLink(null); // deleted elsewhere: save it as a new crawler
    }
  }
  saved ||= await api('characters', { method: 'POST', body: { state } });
  setLink(saved.id, state);
  await loadList();
  return saved;
}

export async function openCharacter(id) {
  return (await api(`characters/${id}`)).state;
}

export async function deleteCharacter(id) {
  await api(`characters/${id}`, { method: 'DELETE' });
  if (link?.id === id) setLink(null);
  await loadList();
}

export function slotText() {
  return `${account.characters.length}/${account.limit}`;
}

const signOutButton = '<button type="button" class="secondary account-button" data-action="sign-out">Sign out</button>';

export function accountBar(state) {
  if (!account.available || !account.ready) return '';
  if (!account.user) return '<button type="button" class="secondary account-button" data-action="account">Sign in to save</button>';
  if (!verified()) return `<button type="button" class="primary account-button" data-action="account">Verify email</button>${signOutButton}`;
  const status = saveStatus(state);
  const label = { saved: 'Saved', unsaved: 'Save changes', new: 'Save crawler' }[status];
  return `
    <button type="button" class="primary account-button" data-action="save-crawler" ${status === 'saved' ? 'disabled' : ''}>${label}</button>
    <button type="button" class="secondary account-button" data-action="account">My Crawlers <span>${slotText()}</span></button>
    <button type="button" class="secondary account-button profile-button" data-action="profile" title="Edit profile">${esc(account.user.name || account.user.email)}</button>
    ${signOutButton}`;
}

function formError(kind) {
  return account.error && account.errorForm === kind ? `<p class="error" role="alert">${esc(account.error)}</p>` : '';
}

function codeField() {
  return '<label class="field"><span class="field-label">6-digit code</span><input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" required></label>';
}

function authForm() {
  const register = account.mode === 'register';
  const kind = register ? 'register' : 'login';
  return `
    <section class="panel account-panel">
      <div class="stage-tabs" role="tablist">
        <button type="button" role="tab" aria-selected="${!register}" class="${register ? '' : 'active'}" data-account-mode="login">Sign in</button>
        <button type="button" role="tab" aria-selected="${register}" class="${register ? 'active' : ''}" data-account-mode="register">Create account</button>
      </div>
      <form data-account-form="${kind}" class="account-form">
        ${register ? '<label class="field"><span class="field-label">Name <span class="optional">optional</span></span><input name="name" autocomplete="name" maxlength="80"></label>' : ''}
        <label class="field"><span class="field-label">Email</span><input name="email" type="email" autocomplete="email" required maxlength="320">${register ? "<small>We'll email a code to confirm it.</small>" : ''}</label>
        <label class="field"><span class="field-label">Password</span><input name="password" type="password" autocomplete="${register ? 'new-password' : 'current-password'}" required minlength="${register ? 8 : 1}" maxlength="1024">${register ? '<small>At least 8 characters.</small>' : ''}</label>
        ${formError(kind)}
        <button class="primary" type="submit" ${account.busy ? 'disabled' : ''}>${register ? 'Create account' : 'Sign in'}</button>
      </form>
      <p class="muted micro">You can keep building without an account; the draft stays in this browser. An account saves up to ${account.limit} crawlers you can open anywhere.</p>
    </section>`;
}

function verifyView() {
  const email = `<strong>${esc(account.user.email)}</strong>`;
  if (!account.user.verifyCodeSent) {
    return `<p class="eyebrow">ACCOUNT · VERIFY EMAIL</p><h1>Verify your email.</h1>
    <p class="intro">Before you can save crawlers, confirm ${email}. We'll email it a 6-digit code.</p>
    <section class="panel account-panel">
      ${formError('resend-verify')}
      <button class="primary" type="button" data-account-action="resend-verify" ${account.busy ? 'disabled' : ''}>Send code</button>
      <p class="muted micro">Wrong address? Sign out and create the account again with the right one.</p>
    </section>`;
  }
  return `<p class="eyebrow">ACCOUNT · VERIFY EMAIL</p><h1>Check your email.</h1>
    <p class="intro">We sent a 6-digit code to ${email}. Enter it to finish setting up your account. The code expires in 15 minutes.</p>
    <section class="panel account-panel">
      <form data-account-form="verify" class="account-form">
        ${codeField()}
        ${formError('verify')}${formError('resend-verify')}
        <div class="account-form-actions">
          <button class="primary" type="submit" ${account.busy ? 'disabled' : ''}>Verify</button>
          <button class="secondary" type="button" data-account-action="resend-verify" ${account.busy ? 'disabled' : ''}>Send a new code</button>
        </div>
      </form>
      <p class="muted micro">Wrong address? Sign out and create the account again with the right one.</p>
    </section>`;
}

function characterRow(character, currentId) {
  const details = [`Level ${character.level}`, character.floor && `Floor ${character.floor}`, character.race, character.className].filter(Boolean).join(' · ');
  const updated = new Date(character.updatedAt).toLocaleString();
  const current = character.id === currentId;
  return `<li class="crawler-row ${current ? 'current' : ''}">
    <div><strong>${esc(character.name)}</strong>${current ? ' <span class="tag">OPEN</span>' : ''}<br><span class="muted micro">${character.number ? `#${esc(character.number)} · ` : ''}${esc(details)} · saved ${esc(updated)}</span></div>
    <div class="crawler-actions">
      ${current ? '' : `<button type="button" class="secondary" data-open-character="${character.id}">Open</button>`}
      <button type="button" class="secondary danger-button" data-delete-character="${character.id}" aria-label="Delete ${esc(character.name)}">Delete</button>
    </div>
  </li>`;
}

function unavailableView() {
  return `<p class="eyebrow">ACCOUNT</p><h1>Accounts are unavailable.</h1>
    <p class="intro">The server isn't reachable, so crawlers can't be saved to an account right now. Your draft is still kept in this browser.</p>`;
}

function signInView() {
  return `<p class="eyebrow">ACCOUNT</p><h1>Save your crawlers.</h1>
    <p class="intro">Sign in or create an account to keep up to ${account.limit} crawlers and pick them up on any device.</p>${authForm()}`;
}

export function accountView(state) {
  if (!account.available) return unavailableView();
  if (!account.user) return signInView();
  if (!verified()) return verifyView();
  const status = saveStatus(state);
  const full = account.characters.length >= account.limit;
  const canSave = status !== 'saved' && !(status === 'new' && full);
  const statusText = {
    saved: 'The open crawler is saved.',
    unsaved: 'The open crawler has unsaved changes.',
    new: full ? `This crawler isn't saved, and all ${account.limit} slots are full. Delete one to save it.` : "The open crawler isn't saved to your account yet.",
  }[status];
  return `
    <p class="eyebrow">ACCOUNT · ${esc(account.user.email)}</p>
    <h1>My Crawlers</h1>
    <p class="intro">${account.characters.length} of ${account.limit} slots used.</p>
    <section class="panel">
      <div class="panel-head"><h2>${esc(state.name || 'Unnamed Crawler')}</h2><span class="ref">${status === 'saved' ? 'SAVED' : status === 'unsaved' ? 'UNSAVED CHANGES' : 'NOT SAVED'}</span></div>
      <p class="muted">${statusText}</p>
      <div class="action-right account-actions">
        <button type="button" class="secondary" data-action="new-crawler">Start a new crawler</button>
        <button type="button" class="primary" data-action="save-crawler" ${canSave ? '' : 'disabled'}>${status === 'unsaved' ? 'Save changes' : 'Save crawler'}</button>
      </div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Saved crawlers</h2><span class="ref">${slotText()}</span></div>
      ${account.characters.length
        ? `<ul class="crawler-list">${account.characters.map((x) => characterRow(x, linkedId())).join('')}</ul>`
        : '<p class="muted">No saved crawlers yet.</p>'}
    </section>`;
}

export function profileView() {
  if (!account.available) return unavailableView();
  if (!account.user) return signInView();
  if (!verified()) return verifyView();
  const { name, email, pendingEmail } = account.user;
  const emailPanel = pendingEmail
    ? `<p class="muted">We sent a code to <strong>${esc(pendingEmail)}</strong>. Your email stays <strong>${esc(email)}</strong> until you enter it.</p>
      <form data-account-form="confirm-email" class="account-form">
        ${codeField()}
        ${formError('confirm-email')}${formError('resend-email')}${formError('cancel-email')}
        <div class="account-form-actions">
          <button class="primary" type="submit" ${account.busy ? 'disabled' : ''}>Confirm new email</button>
          <button class="secondary" type="button" data-account-action="resend-email" ${account.busy ? 'disabled' : ''}>Send a new code</button>
          <button class="secondary" type="button" data-account-action="cancel-email" ${account.busy ? 'disabled' : ''}>Cancel</button>
        </div>
      </form>`
    : `<p class="muted">Current email: <strong>${esc(email)}</strong>. We'll send a code to the new address, and the change happens once you enter it.</p>
      <form data-account-form="change-email" class="account-form">
        <label class="field"><span class="field-label">New email</span><input name="email" type="email" autocomplete="email" required maxlength="320"></label>
        <label class="field"><span class="field-label">Current password</span><input name="password" type="password" autocomplete="current-password" required maxlength="1024"></label>
        ${formError('change-email')}
        <button class="primary" type="submit" ${account.busy ? 'disabled' : ''}>Send code</button>
      </form>`;
  return `
    <p class="eyebrow">ACCOUNT · PROFILE</p>
    <h1>Edit profile</h1>
    <section class="panel account-panel">
      <div class="panel-head"><h2>Name</h2></div>
      <form data-account-form="profile" class="account-form">
        <label class="field"><span class="field-label">Name <span class="optional">optional</span></span><input name="name" value="${esc(name)}" autocomplete="name" maxlength="80"><small>Shown in the header instead of your email.</small></label>
        ${formError('profile')}
        <button class="primary" type="submit" ${account.busy ? 'disabled' : ''}>Save name</button>
      </form>
    </section>
    <section class="panel account-panel">
      <div class="panel-head"><h2>Email</h2></div>
      ${emailPanel}
    </section>`;
}
