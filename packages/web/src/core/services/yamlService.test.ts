import { describe, expect, it, vi } from "vitest";
import { fromByteArray, toByteArray } from "base64-js";
import yaml from "js-yaml";
import { YAMLService, type YAMLExportData } from "./yamlService";

// Mock channelRepo and nodeRepo
const mockGetChannels = vi.fn();
const mockGetNode = vi.fn();
vi.mock("@db/index", () => ({
  channelRepo: {
    getChannels: (...args: unknown[]) => mockGetChannels(...args),
  },
  nodeRepo: {
    getNode: (...args: unknown[]) => mockGetNode(...args),
  },
}));

describe("YAMLService", () => {
  describe("exportToYAML", () => {
    it("should convert Uint8Array fields to Base64 in security config", async () => {
      const mockPrivateKey = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const mockPublicKey = new Uint8Array([9, 10, 11, 12, 13, 14, 15, 16]);
      const mockAdminKey = new Uint8Array([17, 18, 19, 20, 21, 22, 23, 24]);

      mockGetChannels.mockResolvedValue([]);
      mockGetNode.mockResolvedValue(null);

      const mockDevice = {
        id: 1,
        getMyNodeNum: vi.fn().mockReturnValue(12345),
        hardware: {
          myNodeNum: 12345,
          firmwareEdition: undefined,
        },
        getEffectiveConfig: vi.fn().mockImplementation((type: string) => {
          if (type === "security") {
            return {
              privateKey: mockPrivateKey,
              publicKey: mockPublicKey,
              adminKey: [mockAdminKey],
              isManaged: false,
              serialEnabled: true,
              debugLogApiEnabled: false,
              bluetoothLoggingEnabled: false,
            };
          }
          return undefined;
        }),
        getEffectiveModuleConfig: vi.fn().mockReturnValue(undefined),
      };

      const yamlContent = await YAMLService.exportToYAML(mockDevice as any);
      const parsed = yaml.load(yamlContent) as YAMLExportData;

      // Security config should have Base64 encoded keys
      expect(parsed.config.security).toBeDefined();
      expect(parsed.config.security.privateKey).toBe(
        fromByteArray(mockPrivateKey),
      );
      expect(parsed.config.security.publicKey).toBe(
        fromByteArray(mockPublicKey),
      );
      expect(parsed.config.security.adminKey[0]).toBe(
        fromByteArray(mockAdminKey),
      );
    });

    it("should convert BigInt values to numbers", async () => {
      mockGetChannels.mockResolvedValue([]);
      mockGetNode.mockResolvedValue(null);

      const mockDevice = {
        id: 1,
        getMyNodeNum: vi.fn().mockReturnValue(12345),
        hardware: {
          myNodeNum: 12345,
          firmwareEdition: undefined,
        },
        getEffectiveConfig: vi.fn().mockImplementation((type: string) => {
          if (type === "lora") {
            return {
              // Simulate BigInt values that protobuf might return
              txPower: BigInt(20),
              channelNum: BigInt(0),
              hopLimit: 3,
            };
          }
          return undefined;
        }),
        getEffectiveModuleConfig: vi.fn().mockReturnValue(undefined),
      };

      const yamlContent = await YAMLService.exportToYAML(mockDevice as any);
      const parsed = yaml.load(yamlContent) as YAMLExportData;

      // BigInt values should be converted to numbers
      expect(parsed.config.lora).toBeDefined();
      expect(parsed.config.lora.txPower).toBe(20);
      expect(typeof parsed.config.lora.txPower).toBe("number");
      expect(parsed.config.lora.channelNum).toBe(0);
      expect(parsed.config.lora.hopLimit).toBe(3);
    });

    it("should export user config from node database", async () => {
      mockGetChannels.mockResolvedValue([]);
      mockGetNode.mockResolvedValue({
        longName: "Test Node",
        shortName: "TST",
        isLicensed: true,
      });

      const mockDevice = {
        id: 42,
        getMyNodeNum: vi.fn().mockReturnValue(12345),
        hardware: {
          myNodeNum: 12345,
          firmwareEdition: undefined,
        },
        getEffectiveConfig: vi.fn().mockReturnValue(undefined),
        getEffectiveModuleConfig: vi.fn().mockReturnValue(undefined),
      };

      const yamlContent = await YAMLService.exportToYAML(mockDevice as any);
      const parsed = yaml.load(yamlContent) as YAMLExportData;

      // Verify node was fetched for correct device and node
      expect(mockGetNode).toHaveBeenCalledWith(42, 12345);

      // Verify user config is in export
      expect(parsed.user).toBeDefined();
      expect(parsed.user?.longName).toBe("Test Node");
      expect(parsed.user?.shortName).toBe("TST");
      expect(parsed.user?.isLicensed).toBe(true);

      // Verify metadata uses longName
      expect(parsed.metadata.deviceName).toBe("Test Node");
    });

    it("should export channels with PSK from database", async () => {
      const mockPsk = "dGVzdHBzaw=="; // "testpsk" base64
      mockGetNode.mockResolvedValue(null);
      mockGetChannels.mockResolvedValue([
        {
          channelIndex: 0,
          name: "Primary",
          psk: mockPsk,
          role: 1,
          uplinkEnabled: false,
          downlinkEnabled: false,
        },
        {
          channelIndex: 1,
          name: "Secondary",
          psk: "c2Vjb25kcHNr",
          role: 2,
          uplinkEnabled: true,
          downlinkEnabled: false,
        },
      ]);

      const mockDevice = {
        id: 42,
        getMyNodeNum: vi.fn().mockReturnValue(12345),
        hardware: {
          myNodeNum: 12345,
          firmwareEdition: undefined,
        },
        getEffectiveConfig: vi.fn().mockReturnValue(undefined),
        getEffectiveModuleConfig: vi.fn().mockReturnValue(undefined),
      };

      const yamlContent = await YAMLService.exportToYAML(mockDevice as any);
      const parsed = yaml.load(yamlContent) as YAMLExportData;

      // Verify channels were fetched for correct device
      expect(mockGetChannels).toHaveBeenCalledWith(42);

      // Verify channels are in export
      expect(parsed.channels).toHaveLength(2);
      expect(parsed.channels[0].index).toBe(0);
      expect(parsed.channels[0].settings.name).toBe("Primary");
      expect(parsed.channels[0].settings.psk).toBe(mockPsk);
      expect(parsed.channels[0].role).toBe(1);

      expect(parsed.channels[1].index).toBe(1);
      expect(parsed.channels[1].settings.name).toBe("Secondary");
      expect(parsed.channels[1].settings.psk).toBe("c2Vjb25kcHNr");
      expect(parsed.channels[1].settings.uplinkEnabled).toBe(true);
    });
  });

  describe("parseYAML", () => {
    it("should parse valid YAML with security config", () => {
      const validYAML = `
version: "1.0"
metadata:
  exportedAt: "2024-01-01T00:00:00.000Z"
config:
  security:
    privateKey: "AQIDBAUGBwg="
    publicKey: "CQoLDA0ODxA="
    adminKey:
      - "ERITFBUWFxg="
    isManaged: false
moduleConfig: {}
channels: []
`;
      const parsed = YAMLService.parseYAML(validYAML);

      expect(parsed.version).toBe("1.0");
      expect(parsed.config.security.privateKey).toBe("AQIDBAUGBwg=");
      expect(parsed.config.security.publicKey).toBe("CQoLDA0ODxA=");
    });

    it("should throw on missing version", () => {
      const invalidYAML = `
config: {}
moduleConfig: {}
channels: []
`;
      expect(() => YAMLService.parseYAML(invalidYAML)).toThrow(
        "Invalid YAML: missing version",
      );
    });

    it("should throw on missing config section", () => {
      const invalidYAML = `
version: "1.0"
moduleConfig: {}
channels: []
`;
      expect(() => YAMLService.parseYAML(invalidYAML)).toThrow(
        "Invalid YAML: missing config section",
      );
    });
  });

  describe("extractFields", () => {
    it("should extract security config fields correctly", () => {
      const data: YAMLExportData = {
        version: "1.0",
        metadata: { exportedAt: "2024-01-01T00:00:00.000Z" },
        config: {
          security: {
            privateKey: "AQIDBAUGBwg=",
            publicKey: "CQoLDA0ODxA=",
            adminKey: ["ERITFBUWFxg="],
            isManaged: false,
          },
        },
        moduleConfig: {},
        channels: [],
      };

      const fields = YAMLService.extractFields(data);

      const privateKeyField = fields.find(
        (f) => f.originalPath === "config.security.privateKey",
      );
      const publicKeyField = fields.find(
        (f) => f.originalPath === "config.security.publicKey",
      );

      expect(privateKeyField).toBeDefined();
      expect(privateKeyField?.value).toBe("AQIDBAUGBwg=");
      expect(privateKeyField?.type).toBe("config");
      expect(privateKeyField?.section).toBe("security");

      expect(publicKeyField).toBeDefined();
      expect(publicKeyField?.value).toBe("CQoLDA0ODxA=");
    });

    it("should extract channel fields correctly", () => {
      const data: YAMLExportData = {
        version: "1.0",
        metadata: { exportedAt: "2024-01-01T00:00:00.000Z" },
        config: {},
        moduleConfig: {},
        channels: [
          {
            index: 0,
            role: 1,
            settings: {
              name: "Primary",
              psk: "dGVzdHBzaw==", // "testpsk" in Base64
              uplinkEnabled: false,
              downlinkEnabled: false,
            },
          },
          {
            index: 1,
            role: 2,
            settings: {
              name: "Secondary",
              psk: "c2Vjb25kcHNr", // "secondpsk" in Base64
            },
          },
        ],
      };

      const fields = YAMLService.extractFields(data);

      const channel0NameField = fields.find(
        (f) => f.originalPath === "channels.0.name",
      );
      const channel0PskField = fields.find(
        (f) => f.originalPath === "channels.0.psk",
      );
      const channel1PskField = fields.find(
        (f) => f.originalPath === "channels.1.psk",
      );

      expect(channel0NameField).toBeDefined();
      expect(channel0NameField?.value).toBe("Primary");
      expect(channel0NameField?.type).toBe("channel");

      expect(channel0PskField).toBeDefined();
      expect(channel0PskField?.value).toBe("dGVzdHBzaw==");

      expect(channel1PskField).toBeDefined();
      expect(channel1PskField?.value).toBe("c2Vjb25kcHNr");
    });

    it("should extract user fields correctly", () => {
      const data: YAMLExportData = {
        version: "1.0",
        metadata: { exportedAt: "2024-01-01T00:00:00.000Z" },
        config: {},
        moduleConfig: {},
        channels: [],
        user: {
          longName: "My Node",
          shortName: "MN",
          isLicensed: true,
        },
      };

      const fields = YAMLService.extractFields(data);

      const longNameField = fields.find(
        (f) => f.originalPath === "user.longName",
      );
      const shortNameField = fields.find(
        (f) => f.originalPath === "user.shortName",
      );
      const isLicensedField = fields.find(
        (f) => f.originalPath === "user.isLicensed",
      );

      expect(longNameField).toBeDefined();
      expect(longNameField?.value).toBe("My Node");
      expect(longNameField?.type).toBe("user");
      expect(longNameField?.section).toBe("User");

      expect(shortNameField).toBeDefined();
      expect(shortNameField?.value).toBe("MN");

      expect(isLicensedField).toBeDefined();
      expect(isLicensedField?.value).toBe(true);
    });
  });

  describe("round-trip conversion", () => {
    it("should preserve security keys through export/import cycle", () => {
      // Original key as Uint8Array (what comes from device)
      const originalPrivateKey = new Uint8Array([
        0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
      ]);

      // Convert to Base64 (what export does)
      const base64Key = fromByteArray(originalPrivateKey);

      // Parse YAML (simulating import)
      const parsedYAML: YAMLExportData = {
        version: "1.0",
        metadata: { exportedAt: "2024-01-01T00:00:00.000Z" },
        config: {
          security: {
            privateKey: base64Key,
          },
        },
        moduleConfig: {},
        channels: [],
      };

      const fields = YAMLService.extractFields(parsedYAML);
      const privateKeyField = fields.find(
        (f) => f.originalPath === "config.security.privateKey",
      );

      // Convert back to Uint8Array (what applyToDevice does via processValue)
      const restoredKey = toByteArray(privateKeyField?.value as string);

      expect(restoredKey).toEqual(originalPrivateKey);
    });

    it("should preserve channel PSK through export/import cycle", () => {
      // Original PSK as Uint8Array
      const originalPsk = new Uint8Array([
        0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x00, 0x11,
      ]);

      // Convert to Base64 (what export does)
      const base64Psk = fromByteArray(originalPsk);

      // Parse YAML (simulating import)
      const parsedYAML: YAMLExportData = {
        version: "1.0",
        metadata: { exportedAt: "2024-01-01T00:00:00.000Z" },
        config: {},
        moduleConfig: {},
        channels: [
          {
            index: 0,
            role: 1,
            settings: {
              name: "Test Channel",
              psk: base64Psk,
            },
          },
        ],
      };

      const fields = YAMLService.extractFields(parsedYAML);
      const pskField = fields.find((f) => f.originalPath === "channels.0.psk");

      // Convert back to Uint8Array
      const restoredPsk = toByteArray(pskField?.value as string);

      expect(restoredPsk).toEqual(originalPsk);
    });
  });
});
