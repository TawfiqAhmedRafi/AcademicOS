"use strict";

/**
 * Academic OS desktop app (Electron).
 *
 * This is a thin, secure wrapper around the live web app. All data, login,
 * payments and APIs stay on the server; the window simply loads the site.
 * Web changes deployed to Vercel reach desktop users automatically.
 *
 * Env (optional, for development):
 *   AOS_URL=http://localhost:3000   load a different server
 */

const {
  app,
  BrowserWindow,
  Menu,
  clipboard,
  dialog,
  nativeTheme,
  screen,
  session,
  shell,
} = require("electron");
const fs = require("fs");
const path = require("path");

const APP_ID = "bd.ac.ruet.ete.academicos"; // must match build.appId in package.json
const APP_URL = (process.env.AOS_URL || "https://academic-os-iota.vercel.app").replace(/\/+$/, "");
const APP_ORIGIN = new URL(APP_URL).origin;
const START_URL = `${APP_URL}/`;

// Payment gateway: registration / form-fillup do `window.location.href = GatewayPageURL`,
// so SSLCommerz must open inside the app (the callback returns to our own origin).
const PAYMENT_HOST_RE = /(^|\.)sslcommerz\.com$/i;

// Permissions the site may request (everything else is denied).
const ALLOWED_PERMISSIONS = new Set([
  "clipboard-read",
  "clipboard-sanitized-write",
  "notifications",
  "fullscreen",
]);

const ICON_PATH = path.join(__dirname, "assets", "icon.png");
const OFFLINE_PAGE = path.join(__dirname, "offline.html");

let mainWindow = null;

// ─── helpers ────────────────────────────────────────────────────────────────

function parseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isAppOrigin(u) {
  return !!u && u.origin === APP_ORIGIN;
}

function isPaymentHost(u) {
  return !!u && u.protocol === "https:" && PAYMENT_HOST_RE.test(u.hostname);
}

function isHttp(u) {
  return !!u && (u.protocol === "https:" || u.protocol === "http:");
}

/** Open a URL in the user's default browser / mail app (safe schemes only). */
function openExternal(url) {
  const u = parseUrl(url);
  if (u && ["https:", "http:", "mailto:", "tel:"].includes(u.protocol)) {
    shell.openExternal(u.toString()).catch(() => {});
  }
}

function targetWindow() {
  return BrowserWindow.getFocusedWindow() || mainWindow;
}

function goBack(win = targetWindow()) {
  const h = win && !win.isDestroyed() ? win.webContents.navigationHistory : null;
  if (h && h.canGoBack()) h.goBack();
}

function goForward(win = targetWindow()) {
  const h = win && !win.isDestroyed() ? win.webContents.navigationHistory : null;
  if (h && h.canGoForward()) h.goForward();
}

function goHome() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(START_URL).catch(() => {});
  }
}

/** Use a standard Chrome user agent (drops the "Electron/x" token some payment/bank pages reject). */
function useChromeUserAgent() {
  const ua = app.userAgentFallback;
  const m = ua.match(
    /^(Mozilla\/5\.0 \([^)]*\) AppleWebKit\/[\d.]+ \(KHTML, like Gecko\)).*?(Chrome\/[\d.]+).*?(Safari\/[\d.]+)/
  );
  if (m) app.userAgentFallback = `${m[1]} ${m[2]} ${m[3]}`;
}

// ─── window state (size / position / maximized) ─────────────────────────────

function stateFile() {
  return path.join(app.getPath("userData"), "window-state.json");
}

function loadWindowState() {
  const defaults = { width: 1280, height: 800, maximized: false };
  try {
    const s = JSON.parse(fs.readFileSync(stateFile(), "utf8"));
    const state = {
      width: Math.max(800, Number(s.width) || defaults.width),
      height: Math.max(560, Number(s.height) || defaults.height),
      maximized: !!s.maximized,
    };
    // Only restore the position if it is still on a connected screen.
    if (Number.isFinite(s.x) && Number.isFinite(s.y)) {
      const visible = screen.getAllDisplays().some(({ workArea: a }) =>
        s.x < a.x + a.width && s.x + state.width > a.x && s.y < a.y + a.height && s.y + state.height > a.y
      );
      if (visible) {
        state.x = s.x;
        state.y = s.y;
      }
    }
    return state;
  } catch {
    return defaults;
  }
}

function saveWindowState(win) {
  try {
    if (!win || win.isDestroyed()) return;
    const maximized = win.isMaximized();
    const b = maximized ? win.getNormalBounds() : win.getBounds();
    fs.writeFileSync(stateFile(), JSON.stringify({ ...b, maximized }));
  } catch {
    /* non-fatal */
  }
}

// ─── offline handling ───────────────────────────────────────────────────────

function showOfflinePage(win, failedUrl, reason) {
  const failed = parseUrl(failedUrl);
  // Retry the same page if it belongs to the app or payment gateway; otherwise go home.
  const retry = isAppOrigin(failed) || isPaymentHost(failed) ? failed.toString() : START_URL;
  win.loadFile(OFFLINE_PAGE, { query: { retry, reason: String(reason || "") } }).catch(() => {});
}

// ─── per-webContents security & behaviour (main window and any popups) ──────

function attachPolicies(contents) {
  // In-window navigation rules.
  contents.on("will-navigate", (event, legacyUrl) => {
    const url = event.url || legacyUrl;
    const target = parseUrl(url);

    if (!target) return event.preventDefault();

    if (target.protocol === "mailto:" || target.protocol === "tel:") {
      event.preventDefault();
      openExternal(url);
      return;
    }
    if (!isHttp(target)) return event.preventDefault(); // block file:, javascript:, etc.

    if (isAppOrigin(target) || isPaymentHost(target)) return; // stay in app

    // Already inside the payment flow (gateway -> bank / card pages): let it continue.
    const current = parseUrl(contents.getURL());
    if (isHttp(current) && !isAppOrigin(current)) return;

    // Any other external link from the app opens in the default browser.
    event.preventDefault();
    openExternal(url);
  });

  // window.open / target="_blank"
  contents.setWindowOpenHandler(({ url }) => {
    const target = parseUrl(url);
    if (url === "about:blank" || isAppOrigin(target)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          icon: ICON_PATH,
          autoHideMenuBar: true,
          backgroundColor: nativeTheme.shouldUseDarkColors ? "#020617" : "#f8fafc",
        },
      };
    }
    openExternal(url);
    return { action: "deny" };
  });

  // Right-click menu (Electron has none by default).
  contents.on("context-menu", (_event, params) => {
    const items = [];

    if (params.misspelledWord) {
      for (const s of params.dictionarySuggestions.slice(0, 5)) {
        items.push({ label: s, click: () => contents.replaceMisspelling(s) });
      }
      if (items.length) items.push({ type: "separator" });
    }

    if (params.isEditable) {
      const f = params.editFlags;
      items.push(
        { role: "undo", enabled: f.canUndo },
        { role: "redo", enabled: f.canRedo },
        { type: "separator" },
        { role: "cut", enabled: f.canCut },
        { role: "copy", enabled: f.canCopy },
        { role: "paste", enabled: f.canPaste },
        { role: "selectAll", enabled: f.canSelectAll }
      );
    } else if (params.selectionText && params.selectionText.trim()) {
      items.push({ role: "copy" });
    }

    if (params.linkURL) {
      items.push({ label: "Copy Link Address", click: () => clipboard.writeText(params.linkURL) });
    }

    if (items.length) items.push({ type: "separator" });
    const h = contents.navigationHistory;
    items.push(
      { label: "Back", enabled: h.canGoBack(), click: () => h.goBack() },
      { label: "Forward", enabled: h.canGoForward(), click: () => h.goForward() },
      { label: "Reload", click: () => contents.reload() }
    );

    const win = BrowserWindow.fromWebContents(contents);
    Menu.buildFromTemplate(items).popup(win ? { window: win } : undefined);
  });
}

// ─── application menu (hidden; press Alt to show) — also provides shortcuts ─

function buildMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        { label: "Home", accelerator: "Alt+Home", click: goHome },
        { label: "Open in Browser", click: () => openExternal(targetWindow()?.webContents.getURL() || APP_URL) },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Back", accelerator: "Alt+Left", click: () => goBack() },
        { label: "Forward", accelerator: "Alt+Right", click: () => goForward() },
        { type: "separator" },
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        { role: "toggleDevTools" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About Academic OS",
          click: () =>
            dialog.showMessageBox(targetWindow(), {
              type: "info",
              title: "About Academic OS",
              message: "Academic OS",
              detail: `Version ${app.getVersion()}\n${APP_URL}`,
              icon: ICON_PATH,
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── main window ────────────────────────────────────────────────────────────

function createMainWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 800,
    minHeight: 560,
    show: false,
    title: "Academic OS",
    icon: ICON_PATH,
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#020617" : "#f8fafc",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: true,
    },
  });

  if (state.maximized) mainWindow.maximize();

  // Show once painted (no white flash); fall back after 4s on slow networks.
  let shown = false;
  const reveal = () => {
    if (!shown && mainWindow && !mainWindow.isDestroyed()) {
      shown = true;
      mainWindow.show();
    }
  };
  mainWindow.once("ready-to-show", reveal);
  setTimeout(reveal, 4000);

  const wc = mainWindow.webContents;

  wc.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    if (errorCode === -3) return; // ERR_ABORTED: redirects, downloads, user cancel
    const failed = parseUrl(validatedURL);
    if (!failed || failed.protocol === "file:") return;
    showOfflinePage(mainWindow, validatedURL, errorDescription);
  });

  wc.on("render-process-gone", (_e, details) => {
    if (details.reason === "clean-exit") return;
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: "error",
      title: "Academic OS",
      message: "The page stopped unexpectedly.",
      buttons: ["Reload", "Quit"],
      defaultId: 0,
      cancelId: 1,
    });
    if (choice === 0) wc.reload();
    else app.quit();
  });

  // Mouse back / forward buttons (Windows).
  mainWindow.on("app-command", (_e, cmd) => {
    if (cmd === "browser-backward") goBack(mainWindow);
    else if (cmd === "browser-forward") goForward(mainWindow);
  });

  mainWindow.on("close", () => saveWindowState(mainWindow));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadURL(START_URL).catch(() => {
    /* did-fail-load shows the offline page */
  });
}

// ─── downloads: taskbar progress (Save dialog is Electron's default) ────────

function setupDownloads() {
  session.defaultSession.on("will-download", (_event, item) => {
    const win = mainWindow;
    item.on("updated", () => {
      const total = item.getTotalBytes();
      if (win && !win.isDestroyed() && total > 0) win.setProgressBar(item.getReceivedBytes() / total);
    });
    item.once("done", () => {
      if (win && !win.isDestroyed()) win.setProgressBar(-1);
    });
  });
}

// ─── app lifecycle ──────────────────────────────────────────────────────────

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setAppUserModelId(APP_ID);
  useChromeUserAgent();

  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.on("web-contents-created", (_e, contents) => attachPolicies(contents));

  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
      const origin = parseUrl(details.requestingUrl || wc.getURL());
      callback(isAppOrigin(origin) && ALLOWED_PERMISSIONS.has(permission));
    });

    setupDownloads();
    buildMenu();
    createMainWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
