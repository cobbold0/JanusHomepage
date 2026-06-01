import { promises as fs } from "fs";
import path from "path";

import yaml from "js-yaml";

import checkAndCopyConfig, { CONF_DIR } from "utils/config/config";
import createLogger from "utils/logger";

const logger = createLogger("configEditor");

const editableFiles = ["settings.yaml", "services.yaml", "widgets.yaml"];
const editableSettings = [
  "title",
  "description",
  "theme",
  "color",
  "language",
  "target",
  "favicon",
  "background",
  "cardBlur",
  "hideVersion",
  "disableCollapse",
  "groupsInitiallyCollapsed",
  "fullWidth",
  "showStats",
  "statusStyle",
];

function requireEditorEnabled() {
  if (process.env.HOMEPAGE_CONFIG_EDITOR === "true") return;

  const error = new Error("Config editor writes are disabled. Set HOMEPAGE_CONFIG_EDITOR=true to enable.");
  error.statusCode = 403;
  throw error;
}

function getEditableFile(file) {
  if (!editableFiles.includes(file)) {
    const error = new Error("Unsupported config file");
    error.statusCode = 422;
    throw error;
  }

  checkAndCopyConfig(file);
  return path.join(CONF_DIR, file);
}

function readYaml(content) {
  return yaml.load(content) ?? {};
}

function dumpYaml(document) {
  return `---\n${yaml.dump(document, { lineWidth: -1, noRefs: true, sortKeys: false })}`;
}

function firstObjectKey(item) {
  return item && typeof item === "object" && !Array.isArray(item) ? Object.keys(item)[0] : undefined;
}

function createServiceEntry(payload) {
  const serviceName = payload.name?.trim();
  const href = payload.href?.trim();

  if (!serviceName || !href) {
    const error = new Error("Service name and URL are required");
    error.statusCode = 400;
    throw error;
  }

  const service = { ...(payload.existing ?? {}), href };

  if (payload.description?.trim()) service.description = payload.description.trim();
  if (payload.icon?.trim()) service.icon = payload.icon.trim();

  if (payload.widget?.type?.trim()) {
    service.widget = Object.fromEntries(
      Object.entries(payload.widget)
        .filter(([, value]) => typeof value === "string" && value.trim())
        .map(([key, value]) => [key, value.trim()]),
    );
  }

  return { [serviceName]: service };
}

function getGroup(config, groupIndex) {
  const group = config[groupIndex];
  const groupName = firstObjectKey(group);

  if (!groupName || !Array.isArray(group[groupName])) {
    const error = new Error("Service group was not found");
    error.statusCode = 404;
    throw error;
  }

  return { group, groupName, services: group[groupName] };
}

function addService(config, payload) {
  const groupName = payload.group?.trim();

  if (!groupName) {
    const error = new Error("Group, service name, and URL are required");
    error.statusCode = 400;
    throw error;
  }

  const nextConfig = Array.isArray(config) ? [...config] : [];
  let group = nextConfig.find((item) => firstObjectKey(item) === groupName);

  if (!group) {
    group = { [groupName]: [] };
    nextConfig.push(group);
  }

  group[groupName].push(createServiceEntry(payload));
  return nextConfig;
}

function updateService(config, payload) {
  const nextConfig = Array.isArray(config) ? [...config] : [];
  const { groupIndex, serviceIndex } = payload;
  const targetGroupName = payload.group?.trim();

  if (!targetGroupName) {
    const error = new Error("Group is required");
    error.statusCode = 400;
    throw error;
  }

  const { groupName, services } = getGroup(nextConfig, groupIndex);

  if (!services[serviceIndex]) {
    const error = new Error("Service was not found");
    error.statusCode = 404;
    throw error;
  }

  const existingName = firstObjectKey(services[serviceIndex]);
  const existing = services[serviceIndex][existingName] ?? {};
  const updatedEntry = createServiceEntry({ ...payload, existing });

  if (targetGroupName === groupName) {
    services[serviceIndex] = updatedEntry;
    return nextConfig;
  }

  services.splice(serviceIndex, 1);
  if (services.length === 0) {
    nextConfig.splice(groupIndex, 1);
  }

  let targetGroup = nextConfig.find((item) => firstObjectKey(item) === targetGroupName);
  if (!targetGroup) {
    targetGroup = { [targetGroupName]: [] };
    nextConfig.push(targetGroup);
  }

  targetGroup[targetGroupName].push(updatedEntry);
  return nextConfig;
}

function deleteService(config, payload) {
  const nextConfig = Array.isArray(config) ? [...config] : [];
  const { groupIndex, serviceIndex } = payload;
  const { services } = getGroup(nextConfig, groupIndex);

  if (!services[serviceIndex]) {
    const error = new Error("Service was not found");
    error.statusCode = 404;
    throw error;
  }

  services.splice(serviceIndex, 1);
  if (services.length === 0) {
    nextConfig.splice(groupIndex, 1);
  }

  return nextConfig;
}

function moveService(config, payload) {
  const nextConfig = Array.isArray(config) ? [...config] : [];
  const { groupIndex, serviceIndex, direction } = payload;
  const { services } = getGroup(nextConfig, groupIndex);
  const targetIndex = direction === "up" ? serviceIndex - 1 : serviceIndex + 1;

  if (!services[serviceIndex] || !services[targetIndex]) {
    return nextConfig;
  }

  [services[serviceIndex], services[targetIndex]] = [services[targetIndex], services[serviceIndex]];
  return nextConfig;
}

function addWidget(config, payload) {
  return [...(Array.isArray(config) ? config : []), createWidgetEntry(payload)];
}

function createWidgetEntry(payload) {
  const type = payload.type?.trim();

  if (!type) {
    const error = new Error("Widget type is required");
    error.statusCode = 400;
    throw error;
  }

  const options = cleanOptions({ ...(payload.existing ?? {}), ...(payload.options ?? {}) });

  return { [type]: options };
}

function updateWidget(config, payload) {
  const nextConfig = Array.isArray(config) ? [...config] : [];
  const { widgetIndex } = payload;

  if (!nextConfig[widgetIndex]) {
    const error = new Error("Widget was not found");
    error.statusCode = 404;
    throw error;
  }

  const existingType = firstObjectKey(nextConfig[widgetIndex]);
  const existing = existingType === payload.type ? nextConfig[widgetIndex][existingType] : {};
  nextConfig[widgetIndex] = createWidgetEntry({ ...payload, existing });
  return nextConfig;
}

function updateSettings(config, payload) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    const error = new Error("settings.yaml must contain a YAML object");
    error.statusCode = 400;
    throw error;
  }

  const nextConfig = { ...config };

  editableSettings.forEach((key) => {
    if (!Object.hasOwn(payload.settings ?? {}, key)) return;

    const value = payload.settings[key];
    if (value === undefined || value === null || value === "") {
      delete nextConfig[key];
    } else {
      nextConfig[key] = value;
    }
  });

  return nextConfig;
}

function deleteWidget(config, payload) {
  const nextConfig = Array.isArray(config) ? [...config] : [];
  const { widgetIndex } = payload;

  if (!nextConfig[widgetIndex]) {
    const error = new Error("Widget was not found");
    error.statusCode = 404;
    throw error;
  }

  nextConfig.splice(widgetIndex, 1);
  return nextConfig;
}

function moveWidget(config, payload) {
  const nextConfig = Array.isArray(config) ? [...config] : [];
  const { widgetIndex, direction } = payload;
  const targetIndex = direction === "up" ? widgetIndex - 1 : widgetIndex + 1;

  if (!nextConfig[widgetIndex] || !nextConfig[targetIndex]) {
    return nextConfig;
  }

  [nextConfig[widgetIndex], nextConfig[targetIndex]] = [nextConfig[targetIndex], nextConfig[widgetIndex]];
  return nextConfig;
}

function cleanOptions(options) {
  return Object.fromEntries(
    Object.entries(options)
      .map(([key, value]) => {
        if (typeof value === "string") return [key, value.trim()];
        if (value && typeof value === "object" && !Array.isArray(value)) return [key, cleanOptions(value)];
        return [key, value];
      })
      .filter(([, value]) => {
        if (value === undefined || value === null || value === "") return false;
        if (value && typeof value === "object" && !Array.isArray(value)) return Object.keys(value).length > 0;
        return true;
      }),
  );
}

async function readConfig(file) {
  const filePath = getEditableFile(file);
  const content = await fs.readFile(filePath, "utf8");

  return {
    file,
    content,
    parsed: readYaml(content),
    editorEnabled: process.env.HOMEPAGE_CONFIG_EDITOR === "true",
  };
}

async function writeConfig(file, document) {
  const filePath = getEditableFile(file);
  const content = dumpYaml(document);

  await fs.writeFile(filePath, content, "utf8");

  return {
    file,
    content,
    parsed: document,
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { file = "services.yaml" } = req.query;
      return res.status(200).json(await readConfig(file));
    }

    if (req.method === "PUT") {
      requireEditorEnabled();
      const { file, content } = req.body ?? {};
      const filePath = getEditableFile(file);
      let parsed;

      try {
        parsed = readYaml(content);
      } catch (yamlError) {
        yamlError.statusCode = 400;
        throw yamlError;
      }

      await fs.writeFile(filePath, content, "utf8");
      return res.status(200).json({ file, content, parsed });
    }

    if (req.method === "POST") {
      requireEditorEnabled();
      const { file, action, payload } = req.body ?? {};
      const current = await readConfig(file);

      const nextDocument =
        action === "update-settings"
          ? updateSettings(current.parsed, payload ?? {})
          : action === "add-service"
          ? addService(current.parsed, payload ?? {})
          : action === "update-service"
            ? updateService(current.parsed, payload ?? {})
            : action === "delete-service"
              ? deleteService(current.parsed, payload ?? {})
              : action === "move-service"
                ? moveService(current.parsed, payload ?? {})
          : action === "add-widget"
            ? addWidget(current.parsed, payload ?? {})
            : action === "update-widget"
              ? updateWidget(current.parsed, payload ?? {})
              : action === "delete-widget"
                ? deleteWidget(current.parsed, payload ?? {})
                : action === "move-widget"
                  ? moveWidget(current.parsed, payload ?? {})
            : null;

      if (!nextDocument) {
        return res.status(422).json({ error: "Unsupported editor action" });
      }

      return res.status(200).json(await writeConfig(file, nextDocument));
    }

    res.setHeader("Allow", ["GET", "POST", "PUT"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    if (error) logger.error(error);
    return res.status(error.statusCode ?? 500).json({ error: error.message ?? "Internal Server Error" });
  }
}
