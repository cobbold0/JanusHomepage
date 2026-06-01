import classNames from "classnames";
import { useEffect, useMemo, useState } from "react";
import { FiArrowDown, FiArrowUp, FiCode, FiEdit2, FiPlus, FiRefreshCw, FiSave, FiSettings, FiTrash2, FiX } from "react-icons/fi";

const sections = [
  { id: "general", label: "General", file: "settings.yaml" },
  { id: "appearance", label: "Appearance", file: "settings.yaml" },
  { id: "services", label: "Services", file: "services.yaml" },
  { id: "widgets", label: "Info Widgets", file: "widgets.yaml" },
  { id: "advanced", label: "Advanced YAML", file: "settings.yaml" },
];

const yamlFiles = ["settings.yaml", "services.yaml", "widgets.yaml"];
const themes = ["light", "dark"];
const colors = ["slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"];
const targets = ["_blank", "_self"];
const statusStyles = ["dot", "basic"];

const serviceWidgetPresets = ["", "sonarr", "radarr", "lidarr", "prowlarr", "plex", "jellyfin", "emby", "qbittorrent", "transmission", "sabnzbd"];

const widgetCatalog = [
  {
    type: "search",
    name: "Search",
    category: "Productivity",
    description: "Web search box with selectable provider.",
    defaults: { provider: "duckduckgo", target: "_blank" },
    fields: [
      { key: "provider", label: "Provider", type: "select", options: ["duckduckgo", "google", "bing", "brave"] },
      { key: "target", label: "Open in", type: "select", options: ["_blank", "_self"] },
    ],
  },
  {
    type: "resources",
    name: "Resources",
    category: "System",
    description: "CPU, memory, and disk usage.",
    defaults: { cpu: true, memory: true, disk: "/" },
    fields: [
      { key: "cpu", label: "CPU", type: "checkbox" },
      { key: "memory", label: "Memory", type: "checkbox" },
      { key: "disk", label: "Disk path", placeholder: "/" },
    ],
  },
  {
    type: "datetime",
    name: "Date & Time",
    category: "Utility",
    description: "Current date and time.",
    defaults: { text_size: "xl", format: { timeStyle: "short", dateStyle: "short" } },
    fields: [
      { key: "text_size", label: "Text size", type: "select", options: ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"] },
      { key: "format.timeStyle", label: "Time style", type: "select", options: ["short", "medium", "long"] },
      { key: "format.dateStyle", label: "Date style", type: "select", options: ["short", "medium", "long", "full"] },
    ],
  },
  {
    type: "openmeteo",
    name: "Weather",
    category: "Weather",
    description: "Weather without an API key.",
    defaults: { label: "Home", latitude: "", longitude: "", timezone: "auto", units: "metric" },
    fields: [
      { key: "label", label: "Label", placeholder: "Home" },
      { key: "latitude", label: "Latitude", placeholder: "5.6037" },
      { key: "longitude", label: "Longitude", placeholder: "-0.1870" },
      { key: "timezone", label: "Timezone", placeholder: "auto" },
      { key: "units", label: "Units", type: "select", options: ["metric", "imperial"] },
    ],
  },
  {
    type: "stocks",
    name: "Stocks",
    category: "Finance",
    description: "Track market symbols.",
    defaults: { provider: "finnhub", color: true, watchlist: "AAPL,MSFT,GOOGL" },
    fields: [
      { key: "provider", label: "Provider", type: "select", options: ["finnhub", "alphavantage"] },
      { key: "watchlist", label: "Symbols", placeholder: "AAPL,MSFT,GOOGL" },
      { key: "color", label: "Color movement", type: "checkbox" },
    ],
  },
  {
    type: "logo",
    name: "Logo",
    category: "Brand",
    description: "Show a logo or icon in the header.",
    defaults: { icon: "homepage.png" },
    fields: [{ key: "icon", label: "Icon", placeholder: "homepage.png" }],
  },
  {
    type: "greeting",
    name: "Greeting",
    category: "Personal",
    description: "Simple greeting text.",
    defaults: { text: "Welcome back" },
    fields: [{ key: "text", label: "Text", placeholder: "Welcome back" }],
  },
];

async function requestConfigEditor(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? "Unable to update config");
  }

  return body;
}

function TextField({ label, name, value, onChange, placeholder, required, type = "text" }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-theme-700 dark:text-theme-200">
      {label}
      <input
        className="rounded-md border border-theme-300/60 bg-white/80 px-3 py-2 text-sm text-theme-900 outline-none transition focus:border-theme-600 focus:ring-2 focus:ring-theme-400/40 dark:border-white/10 dark:bg-black/20 dark:text-theme-50"
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function TextAreaField({ label, name, value, onChange, placeholder }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-theme-700 dark:text-theme-200">
      {label}
      <textarea
        className="min-h-20 resize-y rounded-md border border-theme-300/60 bg-white/80 px-3 py-2 text-sm text-theme-900 outline-none transition focus:border-theme-600 focus:ring-2 focus:ring-theme-400/40 dark:border-white/10 dark:bg-black/20 dark:text-theme-50"
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function SectionHeading({ children }) {
  return <h3 className="text-sm font-semibold text-theme-900 dark:text-theme-50">{children}</h3>;
}

function CheckboxField({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-theme-200 bg-white/50 px-3 py-2 text-xs font-medium text-theme-700 dark:border-white/10 dark:bg-black/10 dark:text-theme-200">
      <input
        checked={checked}
        className="rounded border-theme-300 text-theme-700 focus:ring-theme-400 dark:border-white/20"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-theme-700 dark:text-theme-200">
      {label}
      <select
        className="rounded-md border border-theme-300/60 bg-white/80 px-3 py-2 text-sm text-theme-900 outline-none transition focus:border-theme-600 focus:ring-2 focus:ring-theme-400/40 dark:border-white/10 dark:bg-black/20 dark:text-theme-50"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option || "None"}
          </option>
        ))}
      </select>
    </label>
  );
}

function getFirstKey(item) {
  return item && typeof item === "object" && !Array.isArray(item) ? Object.keys(item)[0] : undefined;
}

function getPathValue(source, path) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}

function setPathValue(source, path, value) {
  const keys = path.split(".");
  const next = { ...source };
  let cursor = next;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }

    cursor[key] = { ...(cursor[key] ?? {}) };
    cursor = cursor[key];
  });

  return next;
}

function getServices(parsedConfig) {
  if (!Array.isArray(parsedConfig)) return [];

  return parsedConfig
    .map((group, groupIndex) => {
      const groupName = getFirstKey(group);
      const services = Array.isArray(group?.[groupName]) ? group[groupName] : [];

      return {
        groupIndex,
        groupName,
        services: services.map((service, serviceIndex) => {
          const name = getFirstKey(service);
          const config = service?.[name] ?? {};

          return {
            groupIndex,
            groupName,
            serviceIndex,
            name,
            href: config.href ?? "",
            description: config.description ?? "",
            icon: config.icon ?? "",
            widgetType: config.widget?.type ?? "",
            widgetUrl: config.widget?.url ?? "",
            widgetKey: config.widget?.key ?? "",
          };
        }),
      };
    })
    .filter((group) => group.groupName);
}

function getWidgets(parsedConfig) {
  if (!Array.isArray(parsedConfig)) return [];

  return parsedConfig
    .map((widget, widgetIndex) => {
      const type = getFirstKey(widget);
      const options = widget?.[type] ?? {};
      const catalogWidget = widgetCatalog.find((item) => item.type === type);

      return {
        widgetIndex,
        type,
        name: catalogWidget?.name ?? type,
        description: catalogWidget?.description ?? "Custom information widget.",
        options,
      };
    })
    .filter((widget) => widget.type);
}

function toServiceForm(service = {}) {
  return {
    group: service.groupName ?? service.group ?? "",
    name: service.name ?? "",
    href: service.href ?? "",
    description: service.description ?? "",
    icon: service.icon ?? "",
    widgetType: service.widgetType ?? "",
    widgetUrl: service.widgetUrl ?? "",
    widgetKey: service.widgetKey ?? "",
  };
}

function getWidgetDefaults(type) {
  return widgetCatalog.find((widget) => widget.type === type)?.defaults ?? {};
}

function getSettingsForm(settings = {}) {
  return {
    title: settings.title ?? "",
    description: settings.description ?? "",
    theme: settings.theme ?? "",
    color: settings.color ?? "",
    language: settings.language ?? "",
    target: settings.target ?? "",
    favicon: settings.favicon ?? "",
    background: typeof settings.background === "string" ? settings.background : settings.background?.image ?? "",
    cardBlur: settings.cardBlur ?? "",
    hideVersion: Boolean(settings.hideVersion),
    disableCollapse: Boolean(settings.disableCollapse),
    groupsInitiallyCollapsed: Boolean(settings.groupsInitiallyCollapsed),
    fullWidth: Boolean(settings.fullWidth),
    showStats: Boolean(settings.showStats),
    statusStyle: settings.statusStyle ?? "",
  };
}

function normalizeSettingsForm(form) {
  return {
    ...form,
    hideVersion: Boolean(form.hideVersion),
    disableCollapse: Boolean(form.disableCollapse),
    groupsInitiallyCollapsed: Boolean(form.groupsInitiallyCollapsed),
    fullWidth: Boolean(form.fullWidth),
    showStats: Boolean(form.showStats),
  };
}

export default function ConfigEditor() {
  const [activeSection, setActiveSection] = useState("general");
  const [activeFile, setActiveFile] = useState("settings.yaml");
  const [rawMode, setRawMode] = useState(false);
  const [rawContent, setRawContent] = useState("");
  const [savedRawContent, setSavedRawContent] = useState("");
  const [parsedConfig, setParsedConfig] = useState([]);
  const [settingsForm, setSettingsForm] = useState(getSettingsForm());
  const [savedSettingsForm, setSavedSettingsForm] = useState(getSettingsForm());
  const [editorEnabled, setEditorEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState(toServiceForm());
  const [editingWidget, setEditingWidget] = useState(null);
  const [selectedWidgetType, setSelectedWidgetType] = useState("search");
  const [widgetOptions, setWidgetOptions] = useState(getWidgetDefaults("search"));

  const selectedWidget = useMemo(
    () => widgetCatalog.find((widget) => widget.type === selectedWidgetType) ?? widgetCatalog[0],
    [selectedWidgetType],
  );
  const serviceGroups = useMemo(() => getServices(parsedConfig), [parsedConfig]);
  const widgets = useMemo(() => getWidgets(parsedConfig), [parsedConfig]);
  const settingsDirty = JSON.stringify(settingsForm) !== JSON.stringify(savedSettingsForm);
  const rawDirty = rawContent !== savedRawContent;

  async function refreshConfig(file = activeFile) {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const body = await requestConfigEditor(`/api/config-editor?file=${encodeURIComponent(file)}`);
      setRawContent(body.content);
      setSavedRawContent(body.content);
      setParsedConfig(body.parsed);
      setEditorEnabled(Boolean(body.editorEnabled));
      if (file === "settings.yaml") {
        const nextSettingsForm = getSettingsForm(body.parsed);
        setSettingsForm(nextSettingsForm);
        setSavedSettingsForm(nextSettingsForm);
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }


  async function reloadDashboard() {
    await fetch("/api/revalidate");
    window.location.reload();
  }

  function updateEditorState(body) {
    setRawContent(body.content);
    setSavedRawContent(body.content);
    setParsedConfig(body.parsed);
    setEditorEnabled(Boolean(body.editorEnabled));
  }

  function changeSection(section) {
    setActiveSection(section.id);
    setActiveFile(section.file);
    setRawMode(section.id === "advanced");
  }

  function changeYamlFile(file) {
    setActiveFile(file);
    refreshConfig(file);
  }

  function updateSettingsField(name, value) {
    setSettingsForm((current) => ({ ...current, [name]: value }));
  }

  function discardSettingsChanges() {
    setSettingsForm(savedSettingsForm);
    setMessage("Discarded unsaved settings changes.");
    setError("");
  }

  function discardRawChanges() {
    setRawContent(savedRawContent);
    setMessage("Discarded unsaved YAML changes.");
    setError("");
  }

  function updateServiceForm(event) {
    const { name, value } = event.target;
    setServiceForm((current) => ({ ...current, [name]: value }));
  }

  function changeWidgetType(type) {
    setSelectedWidgetType(type);
    setWidgetOptions(getWidgetDefaults(type));
  }

  function editWidget(widget) {
    setEditingWidget(widget);
    setSelectedWidgetType(widget.type);
    setWidgetOptions({ ...getWidgetDefaults(widget.type), ...widget.options });
  }

  function resetWidgetForm() {
    setEditingWidget(null);
    setSelectedWidgetType("search");
    setWidgetOptions(getWidgetDefaults("search"));
  }

  function updateWidgetOption(key, value) {
    setWidgetOptions((current) => setPathValue(current, key, value));
  }

  function servicePayload() {
    const widget = serviceForm.widgetType
      ? {
        type: serviceForm.widgetType,
        url: serviceForm.widgetUrl,
        key: serviceForm.widgetKey,
      }
      : undefined;

    return {
      group: serviceForm.group,
      name: serviceForm.name,
      href: serviceForm.href,
      description: serviceForm.description,
      icon: serviceForm.icon,
      widget,
    };
  }

  async function saveService(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const urlError = validateUrl(serviceForm.href, "Service URL") || validateUrl(serviceForm.widgetUrl, "Widget URL");
      if (urlError) throw new Error(urlError);

      const body = await requestConfigEditor("/api/config-editor", {
        method: "POST",
        body: JSON.stringify({
          file: "services.yaml",
          action: editingService ? "update-service" : "add-service",
          payload: {
            ...servicePayload(),
            groupIndex: editingService?.groupIndex,
            serviceIndex: editingService?.serviceIndex,
          },
        }),
      });

      updateEditorState(body);
      setEditingService(null);
      setServiceForm(toServiceForm());
      setMessage(editingService ? "Service updated." : "Service added.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const urlError = validateUrl(settingsForm.favicon, "Favicon") || validateUrl(settingsForm.background, "Background");
      if (urlError) throw new Error(urlError);

      const body = await requestConfigEditor("/api/config-editor", {
        method: "POST",
        body: JSON.stringify({
          file: "settings.yaml",
          action: "update-settings",
          payload: {
            settings: normalizeSettingsForm(settingsForm),
          },
        }),
      });

      updateEditorState(body);
      const nextSettingsForm = getSettingsForm(body.parsed);
      setSettingsForm(nextSettingsForm);
      setSavedSettingsForm(nextSettingsForm);
      setMessage("Settings saved.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setLoading(false);
    }
  }

  function validateUrl(value, label) {
    if (!value) return null;
    try {
      // eslint-disable-next-line no-new
      new URL(value);
      return null;
    } catch {
      return `${label} must be a valid URL.`;
    }
  }

  async function saveAndRefresh() {
    setLoading(true);
    setError("");
    setMessage("Refreshing dashboard...");

    try {
      await reloadDashboard();
    } catch (refreshError) {
      setError(refreshError.message);
      setLoading(false);
    }
  }

  async function serviceAction(action, service) {
    const shouldDelete = action === "delete-service";

    if (shouldDelete && !window.confirm(`Delete ${service.name}?`)) {
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const body = await requestConfigEditor("/api/config-editor", {
        method: "POST",
        body: JSON.stringify({
          file: "services.yaml",
          action,
          payload: {
            groupIndex: service.groupIndex,
            serviceIndex: service.serviceIndex,
            direction: action === "move-service" ? service.direction : undefined,
          },
        }),
      });

      updateEditorState(body);
      setMessage(shouldDelete ? "Service deleted." : "Service moved.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveWidget(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const body = await requestConfigEditor("/api/config-editor", {
        method: "POST",
        body: JSON.stringify({
          file: "widgets.yaml",
          action: editingWidget ? "update-widget" : "add-widget",
          payload: {
            widgetIndex: editingWidget?.widgetIndex,
            type: selectedWidgetType,
            options: widgetOptions,
          },
        }),
      });

      updateEditorState(body);
      resetWidgetForm();
      setMessage(editingWidget ? "Widget updated." : "Widget added.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setLoading(false);
    }
  }

  async function widgetAction(action, widget) {
    const shouldDelete = action === "delete-widget";

    if (shouldDelete && !window.confirm(`Delete ${widget.name}?`)) {
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const body = await requestConfigEditor("/api/config-editor", {
        method: "POST",
        body: JSON.stringify({
          file: "widgets.yaml",
          action,
          payload: {
            widgetIndex: widget.widgetIndex,
            direction: action === "move-widget" ? widget.direction : undefined,
          },
        }),
      });

      updateEditorState(body);
      setMessage(shouldDelete ? "Widget deleted." : "Widget moved.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveRaw() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await requestConfigEditor("/api/config-editor", {
        method: "PUT",
        body: JSON.stringify({
          file: activeFile,
          content: rawContent,
        }),
      });
      await refreshConfig(activeFile);
      setMessage("Config saved.");
    } catch (saveError) {
      setError(saveError.message);
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshConfig(activeFile);
  }, [activeFile]);

  return (
    <>
      <div
        className={"grid w-full h-screen lg:grid-cols-[260px_minmax(0,1fr)]"}
      >
        <aside className="border-b border-theme-200 bg-theme-100/70 p-4 dark:border-white/10 dark:bg-black/20 lg:border-b-0 lg:border-r">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Settings</h2>
              <p className="mt-1 text-xs text-theme-600 dark:text-theme-300">Dashboard configuration</p>
            </div>  
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-x-visible lg:pb-0">
            {sections.map((section) => (
              <button
                className={classNames(
                  "flex min-w-fit items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition lg:w-full",
                  activeSection === section.id
                    ? "bg-theme-800 text-white shadow-sm dark:bg-dark dark:text-theme-950"
                    : "text-theme-700 hover:bg-theme-200 dark:text-theme-200 dark:hover:bg-white/10",
                )}
                key={section.id}
                onClick={() => changeSection(section)}
                type="button"
              >
                <span>{section.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-5 hidden rounded-md border border-theme-200 bg-white/60 p-3 text-xs text-theme-600 dark:border-white/10 dark:bg-white/5 dark:text-theme-300 lg:block">
            {editorEnabled
              ? "Editing is enabled for this session."
              : "Read-only. Set HOMEPAGE_CONFIG_EDITOR=true to enable saving."}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-theme-200 px-5 py-4 dark:border-white/10">
            <div>
              <h3 className="text-xl font-semibold">{sections.find((section) => section.id === activeSection)?.label}</h3>
              <p className="mt-1 text-sm text-theme-600 dark:text-theme-300">
                {activeSection === "general" && "Core dashboard metadata and behavior."}
                {activeSection === "appearance" && "Theme, colors, background, and visual preferences."}
                {activeSection === "services" && "Manage service groups and service widgets."}
                {activeSection === "widgets" && "Manage header information widgets."}
                {activeSection === "advanced" && "Edit raw YAML for supported configuration files."}
              </p>
            </div>
          </div>

          {!editorEnabled && (
            <div className="border-b border-amber-300 bg-amber-100 px-5 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              Configuration editing is read-only. Set HOMEPAGE_CONFIG_EDITOR=true to enable saving.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-theme-200 px-5 py-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              {(settingsDirty || rawDirty) && (
                <span className="inline-flex h-8 items-center rounded-md bg-amber-100 px-3 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-100">
                  Unsaved changes
                </span>
              )}
              <span className="text-xs text-theme-500 dark:text-theme-400">
                {activeSection === "advanced" ? activeFile : sections.find((section) => section.id === activeSection)?.file}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {(activeSection === "general" || activeSection === "appearance") && (
                <>
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-theme-800 px-3 text-sm font-semibold text-white transition hover:bg-theme-700 disabled:opacity-60 dark:bg-theme-100 dark:text-theme-900 dark:hover:bg-white"
                    disabled={loading || !settingsDirty || !editorEnabled}
                    onClick={saveSettings}
                    type="button"
                  >
                    <FiSave className="h-4 w-4" />
                    Save changes
                  </button>
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-theme-700 transition hover:bg-theme-200 disabled:opacity-60 dark:text-theme-100 dark:hover:bg-white/10"
                    disabled={loading || !settingsDirty}
                    onClick={discardSettingsChanges}
                    type="button"
                  >
                    Discard
                  </button>
                </>
              )}
              <button
                className="inline-flex h-9 items-center gap-2 rounded-md bg-theme-800 px-3 text-sm font-semibold text-white transition hover:bg-theme-700 disabled:opacity-60 dark:bg-theme-100 dark:text-theme-900 dark:hover:bg-white"
                disabled={loading}
                onClick={saveAndRefresh}
                type="button"
              >
                <FiSave className="h-4 w-4" />
                Apply
              </button>
              {activeSection !== "advanced" && (
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-theme-700 transition hover:bg-theme-200 dark:text-theme-100 dark:hover:bg-white/10"
                  onClick={() => changeSection(sections.find((section) => section.id === "advanced"))}
                  type="button"
                >
                  <FiCode className="h-4 w-4" />
                  YAML
                </button>
              )}
              <button
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-theme-700 transition hover:bg-theme-200 dark:text-theme-100 dark:hover:bg-white/10"
                disabled={loading}
                onClick={() => refreshConfig()}
                type="button"
              >
                <FiRefreshCw className={classNames("h-4 w-4", loading && "animate-spin")} />
                Reload
              </button>
            </div>
          </div>

          <div className="grid flex-1 overflow-y-auto md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="border-b border-theme-200 p-4 dark:border-white/10 md:border-b-0 md:border-r">
              {activeSection === "general" ? (
                <form className="flex flex-col gap-4" onSubmit={saveSettings}>
                  <SectionHeading>General</SectionHeading>
                  <TextField
                    label="Title"
                    name="title"
                    onChange={(event) => updateSettingsField("title", event.target.value)}
                    value={settingsForm.title}
                  />
                  <TextAreaField
                    label="Description"
                    name="description"
                    onChange={(event) => updateSettingsField("description", event.target.value)}
                    value={settingsForm.description}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                      label="Language"
                      name="language"
                      onChange={(event) => updateSettingsField("language", event.target.value)}
                      placeholder="en"
                      value={settingsForm.language}
                    />
                    <SelectField
                      label="Default link target"
                      onChange={(value) => updateSettingsField("target", value)}
                      options={["", ...targets]}
                      value={settingsForm.target}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CheckboxField
                      checked={settingsForm.hideVersion}
                      label="Hide version"
                      onChange={(value) => updateSettingsField("hideVersion", value)}
                    />
                    <CheckboxField
                      checked={settingsForm.showStats}
                      label="Show stats"
                      onChange={(value) => updateSettingsField("showStats", value)}
                    />
                    <CheckboxField
                      checked={settingsForm.disableCollapse}
                      label="Disable collapse"
                      onChange={(value) => updateSettingsField("disableCollapse", value)}
                    />
                    <CheckboxField
                      checked={settingsForm.groupsInitiallyCollapsed}
                      label="Groups initially collapsed"
                      onChange={(value) => updateSettingsField("groupsInitiallyCollapsed", value)}
                    />
                  </div>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-theme-800 px-4 text-sm font-semibold text-white transition hover:bg-theme-700 disabled:opacity-60 dark:bg-theme-100 dark:text-theme-900 dark:hover:bg-white"
                    disabled={loading || !settingsDirty || !editorEnabled}
                    type="submit"
                  >
                    <FiSave className="h-4 w-4" />
                    Save changes
                  </button>
                </form>
              ) : activeSection === "appearance" ? (
                <form className="flex flex-col gap-4" onSubmit={saveSettings}>
                  <SectionHeading>Appearance</SectionHeading>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SelectField
                      label="Theme"
                      onChange={(value) => updateSettingsField("theme", value)}
                      options={["", ...themes]}
                      value={settingsForm.theme}
                    />
                    <SelectField
                      label="Color"
                      onChange={(value) => updateSettingsField("color", value)}
                      options={["", ...colors]}
                      value={settingsForm.color}
                    />
                  </div>
                  <TextField
                    label="Favicon"
                    name="favicon"
                    onChange={(event) => updateSettingsField("favicon", event.target.value)}
                    placeholder="https://example.com/icon.png"
                    value={settingsForm.favicon}
                  />
                  <TextField
                    label="Background"
                    name="background"
                    onChange={(event) => updateSettingsField("background", event.target.value)}
                    placeholder="https://example.com/background.jpg"
                    value={settingsForm.background}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                      label="Card blur"
                      name="cardBlur"
                      onChange={(event) => updateSettingsField("cardBlur", event.target.value)}
                      placeholder="sm"
                      value={settingsForm.cardBlur}
                    />
                    <SelectField
                      label="Status style"
                      onChange={(value) => updateSettingsField("statusStyle", value)}
                      options={["", ...statusStyles]}
                      value={settingsForm.statusStyle}
                    />
                  </div>
                  <CheckboxField
                    checked={settingsForm.fullWidth}
                    label="Full width dashboard"
                    onChange={(value) => updateSettingsField("fullWidth", value)}
                  />
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-theme-800 px-4 text-sm font-semibold text-white transition hover:bg-theme-700 disabled:opacity-60 dark:bg-theme-100 dark:text-theme-900 dark:hover:bg-white"
                    disabled={loading || !settingsDirty || !editorEnabled}
                    type="submit"
                  >
                    <FiSave className="h-4 w-4" />
                    Save changes
                  </button>
                </form>
              ) : activeSection === "services" ? (
                <form className="flex flex-col gap-4" onSubmit={saveService}>
                  <div className="flex items-center justify-between gap-3">
                    <SectionHeading>{editingService ? "Edit service" : "Add service"}</SectionHeading>
                    {editingService && (
                      <button
                        className="text-xs font-medium text-theme-600 transition hover:text-theme-900 dark:text-theme-300 dark:hover:text-theme-50"
                        onClick={() => {
                          setEditingService(null);
                          setServiceForm(toServiceForm());
                        }}
                        type="button"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField label="Group" name="group" onChange={updateServiceForm} required value={serviceForm.group} />
                    <TextField label="Name" name="name" onChange={updateServiceForm} required value={serviceForm.name} />
                  </div>
                  <TextField
                    label="URL"
                    name="href"
                    onChange={updateServiceForm}
                    placeholder="https://example.local"
                    required
                    type="url"
                    value={serviceForm.href}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField label="Description" name="description" onChange={updateServiceForm} value={serviceForm.description} />
                    <TextField label="Icon" name="icon" onChange={updateServiceForm} placeholder="homepage.png" value={serviceForm.icon} />
                  </div>
                  <div className="grid gap-3 border-t border-theme-200 pt-4 dark:border-white/10 sm:grid-cols-2">
                    <TextField label="Widget type" name="widgetType" onChange={updateServiceForm} placeholder="sonarr" value={serviceForm.widgetType} />
                    <SelectField
                      label="Preset"
                      onChange={(value) => setServiceForm((current) => ({ ...current, widgetType: value }))}
                      options={serviceWidgetPresets}
                      value={serviceForm.widgetType}
                    />
                    <TextField label="Widget URL" name="widgetUrl" onChange={updateServiceForm} placeholder="http://sonarr:8989" value={serviceForm.widgetUrl} />
                    <TextField label="Widget key" name="widgetKey" onChange={updateServiceForm} value={serviceForm.widgetKey} />
                  </div>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-theme-800 px-4 text-sm font-semibold text-white transition hover:bg-theme-700 disabled:opacity-60 dark:bg-theme-100 dark:text-theme-900 dark:hover:bg-white"
                    disabled={loading || !editorEnabled}
                    type="submit"
                  >
                    {editingService ? <FiSave className="h-4 w-4" /> : <FiPlus className="h-4 w-4" />}
                    {editingService ? "Save service" : "Add service"}
                  </button>
                </form>
              ) : activeSection === "widgets" ? (
                <form className="flex flex-col gap-4" onSubmit={saveWidget}>
                  <div className="flex items-center justify-between gap-3">
                    <SectionHeading>{editingWidget ? "Edit widget" : "Add widget"}</SectionHeading>
                    {editingWidget && (
                      <button
                        className="text-xs font-medium text-theme-600 transition hover:text-theme-900 dark:text-theme-300 dark:hover:text-theme-50"
                        onClick={resetWidgetForm}
                        type="button"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <SelectField
                    label="Type"
                    onChange={changeWidgetType}
                    options={widgetCatalog.map((widget) => widget.type)}
                    value={selectedWidgetType}
                  />
                  <SectionHeading>{selectedWidget.name}</SectionHeading>
                  <p className="text-xs text-theme-600 dark:text-theme-300">{selectedWidget.description}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedWidget.fields.map((field) =>
                      field.type === "checkbox" ? (
                        <CheckboxField
                          checked={Boolean(getPathValue(widgetOptions, field.key))}
                          key={field.key}
                          label={field.label}
                          onChange={(value) => updateWidgetOption(field.key, value)}
                        />
                      ) : field.type === "select" ? (
                        <SelectField
                          key={field.key}
                          label={field.label}
                          onChange={(value) => updateWidgetOption(field.key, value)}
                          options={field.options}
                          value={getPathValue(widgetOptions, field.key) ?? ""}
                        />
                      ) : (
                        <TextField
                          key={field.key}
                          label={field.label}
                          name={field.key}
                          onChange={(event) => updateWidgetOption(field.key, event.target.value)}
                          placeholder={field.placeholder}
                          value={getPathValue(widgetOptions, field.key) ?? ""}
                        />
                      ),
                    )}
                  </div>
                  <div className="rounded-md bg-theme-100 p-3 text-xs text-theme-700 dark:bg-black/20 dark:text-theme-200">
                    <pre className="whitespace-pre-wrap">{yamlPreview({ [selectedWidgetType]: widgetOptions })}</pre>
                  </div>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-theme-800 px-4 text-sm font-semibold text-white transition hover:bg-theme-700 disabled:opacity-60 dark:bg-theme-100 dark:text-theme-900 dark:hover:bg-white"
                    disabled={loading || !editorEnabled}
                    type="submit"
                  >
                    {editingWidget ? <FiSave className="h-4 w-4" /> : <FiPlus className="h-4 w-4" />}
                    {editingWidget ? "Save widget" : "Add widget"}
                  </button>
                </form>
              ) : (
                <div className="flex flex-col gap-4">
                  <SectionHeading>Advanced YAML</SectionHeading>
                  <SelectField label="File" onChange={changeYamlFile} options={yamlFiles} value={activeFile} />
                  <p className="text-xs text-theme-600 dark:text-theme-300">
                    Raw YAML is useful for fields not yet covered by the visual editor.
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-theme-800 px-4 text-sm font-semibold text-white transition hover:bg-theme-700 disabled:opacity-60 dark:bg-theme-100 dark:text-theme-900 dark:hover:bg-white"
                      disabled={loading || !rawDirty || !editorEnabled}
                      onClick={saveRaw}
                      type="button"
                    >
                      <FiSave className="h-4 w-4" />
                      Save changes
                    </button>
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-theme-700 transition hover:bg-theme-200 disabled:opacity-60 dark:text-theme-100 dark:hover:bg-white/10"
                      disabled={loading || !rawDirty}
                      onClick={discardRawChanges}
                      type="button"
                    >
                      Discard changes
                    </button>
                  </div>
                </div>
              )}

              {(message || error) && (
                <div
                  className={classNames(
                    "mt-4 rounded-md px-3 py-2 text-sm",
                    error
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-100"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
                  )}
                >
                  {error || message}
                </div>
              )}
            </div>

            <div className="flex min-h-[420px] flex-col p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <SectionHeading>
                  {activeSection === "advanced" ? activeFile : activeSection === "services" ? "Services" : activeSection === "widgets" ? "Info Widgets" : "Settings"}
                </SectionHeading>
                {activeSection === "advanced" && (
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-theme-800 px-3 text-sm font-semibold text-white transition hover:bg-theme-700 disabled:opacity-60 dark:bg-theme-100 dark:text-theme-900 dark:hover:bg-white"
                    disabled={loading || !rawDirty || !editorEnabled}
                    onClick={saveRaw}
                    type="button"
                  >
                    <FiSave className="h-4 w-4" />
                    Save YAML
                  </button>
                )}
              </div>
              {activeSection === "advanced" ? (
                <textarea
                  className="min-h-[360px] flex-1 resize-none rounded-md border border-theme-300/60 bg-white/80 p-3 font-mono text-xs leading-5 text-theme-900 outline-none transition focus:border-theme-600 focus:ring-2 focus:ring-theme-400/40 dark:border-white/10 dark:bg-black/20 dark:text-theme-50"
                  onChange={(event) => setRawContent(event.target.value)}
                  spellCheck={false}
                  value={rawContent}
                />
              ) : activeSection === "services" ? (
                <div className="flex flex-col gap-4">
                  {serviceGroups.map((group) => (
                    <div className="flex flex-col gap-2" key={group.groupIndex}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase text-theme-500 dark:text-theme-300">{group.groupName}</h4>
                        <span className="text-xs text-theme-500 dark:text-theme-400">{group.services.length}</span>
                      </div>
                      <div className="grid gap-2">
                        {group.services.map((service) => (
                          <div
                            className="rounded-md border border-theme-200 bg-white/70 p-3 shadow-sm dark:border-white/10 dark:bg-black/20"
                            key={`${service.groupIndex}-${service.serviceIndex}-${service.name}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-theme-900 dark:text-theme-50">{service.name}</p>
                                <p className="truncate text-xs text-theme-600 dark:text-theme-300">{service.href}</p>
                                {service.description && (
                                  <p className="mt-1 line-clamp-2 text-xs text-theme-500 dark:text-theme-400">{service.description}</p>
                                )}
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <button
                                  aria-label={`Move ${service.name} up`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-theme-600 transition hover:bg-theme-100 hover:text-theme-900 disabled:opacity-30 dark:text-theme-300 dark:hover:bg-white/10 dark:hover:text-theme-50"
                                  disabled={loading || !editorEnabled || service.serviceIndex === 0}
                                  onClick={() => serviceAction("move-service", { ...service, direction: "up" })}
                                  type="button"
                                >
                                  <FiArrowUp className="h-4 w-4" />
                                </button>
                                <button
                                  aria-label={`Move ${service.name} down`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-theme-600 transition hover:bg-theme-100 hover:text-theme-900 disabled:opacity-30 dark:text-theme-300 dark:hover:bg-white/10 dark:hover:text-theme-50"
                                  disabled={loading || !editorEnabled || service.serviceIndex === group.services.length - 1}
                                  onClick={() => serviceAction("move-service", { ...service, direction: "down" })}
                                  type="button"
                                >
                                  <FiArrowDown className="h-4 w-4" />
                                </button>
                                <button
                                  aria-label={`Edit ${service.name}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-theme-600 transition hover:bg-theme-100 hover:text-theme-900 dark:text-theme-300 dark:hover:bg-white/10 dark:hover:text-theme-50"
                                  disabled={loading || !editorEnabled}
                                  onClick={() => {
                                    setEditingService(service);
                                    setServiceForm(toServiceForm(service));
                                  }}
                                  type="button"
                                >
                                  <FiEdit2 className="h-4 w-4" />
                                </button>
                                <button
                                  aria-label={`Delete ${service.name}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-950"
                                  disabled={loading || !editorEnabled}
                                  onClick={() => serviceAction("delete-service", service)}
                                  type="button"
                                >
                                  <FiTrash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {serviceGroups.length === 0 && (
                    <div className="rounded-md border border-dashed border-theme-300 p-6 text-center text-sm text-theme-500 dark:border-white/10 dark:text-theme-300">
                      No services yet.
                    </div>
                  )}
                </div>
              ) : activeSection === "widgets" ? (
                <div className="flex flex-col gap-4">
                  {widgets.map((widget) => (
                    <div
                      className="rounded-md border border-theme-200 bg-white/70 p-3 shadow-sm dark:border-white/10 dark:bg-black/20"
                      key={`${widget.widgetIndex}-${widget.type}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-theme-900 dark:text-theme-50">{widget.name}</p>
                          <p className="truncate text-xs text-theme-600 dark:text-theme-300">{widget.type}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-theme-500 dark:text-theme-400">
                            {Object.keys(widget.options).length
                              ? yamlPreview(widget.options)
                              : widget.description}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            aria-label={`Move ${widget.name} up`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-theme-600 transition hover:bg-theme-100 hover:text-theme-900 disabled:opacity-30 dark:text-theme-300 dark:hover:bg-white/10 dark:hover:text-theme-50"
                            disabled={loading || !editorEnabled || widget.widgetIndex === 0}
                            onClick={() => widgetAction("move-widget", { ...widget, direction: "up" })}
                            type="button"
                          >
                            <FiArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            aria-label={`Move ${widget.name} down`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-theme-600 transition hover:bg-theme-100 hover:text-theme-900 disabled:opacity-30 dark:text-theme-300 dark:hover:bg-white/10 dark:hover:text-theme-50"
                            disabled={loading || !editorEnabled || widget.widgetIndex === widgets.length - 1}
                            onClick={() => widgetAction("move-widget", { ...widget, direction: "down" })}
                            type="button"
                          >
                            <FiArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            aria-label={`Edit ${widget.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-theme-600 transition hover:bg-theme-100 hover:text-theme-900 dark:text-theme-300 dark:hover:bg-white/10 dark:hover:text-theme-50"
                            disabled={loading || !editorEnabled}
                            onClick={() => editWidget(widget)}
                            type="button"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                          <button
                            aria-label={`Delete ${widget.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-950"
                            disabled={loading || !editorEnabled}
                            onClick={() => widgetAction("delete-widget", widget)}
                            type="button"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {widgets.length === 0 && (
                    <div className="rounded-md border border-dashed border-theme-300 p-6 text-center text-sm text-theme-500 dark:border-white/10 dark:text-theme-300">
                      No widgets yet.
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 text-sm">
                  {[
                    ["Title", settingsForm.title || "Default"],
                    ["Theme", settingsForm.theme || "Default"],
                    ["Color", settingsForm.color || "Default"],
                    ["Language", settingsForm.language || "Default"],
                    ["Link target", settingsForm.target || "Default"],
                    ["Full width", settingsForm.fullWidth ? "Enabled" : "Disabled"],
                  ].map(([label, value]) => (
                    <div
                      className="flex items-center justify-between rounded-md border border-theme-200 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-black/20"
                      key={label}
                    >
                      <span className="font-medium text-theme-700 dark:text-theme-200">{label}</span>
                      <span className="text-theme-500 dark:text-theme-400">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function yamlPreview(value) {
  return JSON.stringify(value, null, 2);
}
