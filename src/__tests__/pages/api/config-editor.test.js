import { beforeEach, describe, expect, it, vi } from "vitest";

import createMockRes from "test-utils/create-mock-res";

const { fs, config, logger } = vi.hoisted(() => ({
  fs: {
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
    },
  },
  config: {
    default: vi.fn(),
    CONF_DIR: "/conf",
  },
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("fs", () => fs);

vi.mock("utils/config/config", () => config);

vi.mock("utils/logger", () => ({
  default: () => logger,
}));

import handler from "pages/api/config-editor";

describe("pages/api/config-editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HOMEPAGE_CONFIG_EDITOR = "true";
    fs.promises.readFile.mockResolvedValue("---\n[]\n");
  });

  it("rejects unsupported config files", async () => {
    const req = { method: "GET", query: { file: "docker.yaml" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(422);
    expect(res.body.error).toBe("Unsupported config file");
  });

  it("returns raw and parsed YAML for supported files", async () => {
    fs.promises.readFile.mockResolvedValueOnce("---\n- search:\n    provider: duckduckgo\n");

    const req = { method: "GET", query: { file: "widgets.yaml" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.file).toBe("widgets.yaml");
    expect(res.body.parsed).toEqual([{ search: { provider: "duckduckgo" } }]);
  });

  it("supports settings.yaml", async () => {
    fs.promises.readFile.mockResolvedValueOnce("---\ntitle: Home\n");

    const req = { method: "GET", query: { file: "settings.yaml" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.file).toBe("settings.yaml");
    expect(res.body.parsed).toEqual({ title: "Home" });
  });

  it("rejects writes when the editor is disabled", async () => {
    delete process.env.HOMEPAGE_CONFIG_EDITOR;

    const req = {
      method: "POST",
      body: {
        file: "settings.yaml",
        action: "update-settings",
        payload: {
          settings: { title: "Home" },
        },
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(fs.promises.writeFile).not.toHaveBeenCalled();
  });

  it("structured settings updates preserve unknown keys", async () => {
    fs.promises.readFile.mockResolvedValueOnce("---\ntitle: Old\ncustomThing: keep\n");

    const req = {
      method: "POST",
      body: {
        file: "settings.yaml",
        action: "update-settings",
        payload: {
          settings: {
            title: "New",
            theme: "dark",
          },
        },
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.parsed).toEqual({ title: "New", customThing: "keep", theme: "dark" });
  });

  it("adds a service to a new group", async () => {
    const req = {
      method: "POST",
      body: {
        file: "services.yaml",
        action: "add-service",
        payload: {
          group: "Media",
          name: "Sonarr",
          href: "http://sonarr.local",
          description: "TV",
          icon: "sonarr.png",
        },
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      "/conf/services.yaml",
      expect.stringContaining("Sonarr:"),
      "utf8",
    );
    expect(res.body.parsed).toEqual([
      {
        Media: [
          {
            Sonarr: {
              href: "http://sonarr.local",
              description: "TV",
              icon: "sonarr.png",
            },
          },
        ],
      },
    ]);
  });

  it("adds an information widget", async () => {
    const req = {
      method: "POST",
      body: {
        file: "widgets.yaml",
        action: "add-widget",
        payload: {
          type: "search",
          options: {
            provider: "duckduckgo",
          },
        },
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.parsed).toEqual([{ search: { provider: "duckduckgo" } }]);
  });

  it("updates an existing information widget", async () => {
    fs.promises.readFile.mockResolvedValueOnce("---\n- search:\n    provider: google\n    customThing: keep\n");

    const req = {
      method: "POST",
      body: {
        file: "widgets.yaml",
        action: "update-widget",
        payload: {
          widgetIndex: 0,
          type: "search",
          options: {
            provider: "duckduckgo",
          },
        },
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.parsed).toEqual([{ search: { provider: "duckduckgo", customThing: "keep" } }]);
  });

  it("deletes an existing information widget", async () => {
    fs.promises.readFile.mockResolvedValueOnce("---\n- search:\n    provider: google\n");

    const req = {
      method: "POST",
      body: {
        file: "widgets.yaml",
        action: "delete-widget",
        payload: {
          widgetIndex: 0,
        },
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.parsed).toEqual([]);
  });

  it("moves an information widget", async () => {
    fs.promises.readFile.mockResolvedValueOnce("---\n- resources:\n    cpu: true\n- search:\n    provider: google\n");

    const req = {
      method: "POST",
      body: {
        file: "widgets.yaml",
        action: "move-widget",
        payload: {
          widgetIndex: 1,
          direction: "up",
        },
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.parsed.map((widget) => Object.keys(widget)[0])).toEqual(["search", "resources"]);
  });

  it("updates an existing service", async () => {
    fs.promises.readFile.mockResolvedValueOnce("---\n- Media:\n    - Sonarr:\n        href: http://old.local\n        customThing: keep\n");

    const req = {
      method: "POST",
      body: {
        file: "services.yaml",
        action: "update-service",
        payload: {
          groupIndex: 0,
          serviceIndex: 0,
          group: "Media",
          name: "Radarr",
          href: "http://radarr.local",
        },
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.parsed).toEqual([
      {
        Media: [
          {
            Radarr: {
              href: "http://radarr.local",
              customThing: "keep",
            },
          },
        ],
      },
    ]);
  });

  it("deletes an existing service and removes empty groups", async () => {
    fs.promises.readFile.mockResolvedValueOnce("---\n- Media:\n    - Sonarr:\n        href: http://sonarr.local\n");

    const req = {
      method: "POST",
      body: {
        file: "services.yaml",
        action: "delete-service",
        payload: {
          groupIndex: 0,
          serviceIndex: 0,
        },
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.parsed).toEqual([]);
  });

  it("moves a service within its group", async () => {
    fs.promises.readFile.mockResolvedValueOnce(
      "---\n- Media:\n    - Sonarr:\n        href: http://sonarr.local\n    - Radarr:\n        href: http://radarr.local\n",
    );

    const req = {
      method: "POST",
      body: {
        file: "services.yaml",
        action: "move-service",
        payload: {
          groupIndex: 0,
          serviceIndex: 1,
          direction: "up",
        },
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.parsed[0].Media.map((service) => Object.keys(service)[0])).toEqual(["Radarr", "Sonarr"]);
  });

  it("validates raw YAML before saving", async () => {
    const req = {
      method: "PUT",
      body: {
        file: "services.yaml",
        content: ":\n  bad",
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(fs.promises.writeFile).not.toHaveBeenCalled();
  });

  it("rejects unsupported actions", async () => {
    const req = {
      method: "POST",
      body: {
        file: "settings.yaml",
        action: "nope",
        payload: {},
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(422);
    expect(fs.promises.writeFile).not.toHaveBeenCalled();
  });
});
