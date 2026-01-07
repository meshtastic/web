import { fromByteArray, toByteArray } from "base64-js";
import yaml from "js-yaml";
import { describe, expect, it, vi } from "vitest";
import { ConfigBackupExportSchema } from "../../features/settings/components/panels/configBackup.ts";
import {
  type ConfigBackupData,
  ConfigBackupService,
} from "./configBackupService.ts";

// Helper type for channel entries in ConfigBackupData
interface ExportedChannel {
  index: number;
  role: number;
  settings: {
    name?: string;
    psk?: string;
    uplinkEnabled?: boolean;
    downlinkEnabled?: boolean;
    moduleSettings?: { positionPrecision?: number };
  };
}

const mockGetChannels = vi.fn();
const mockGetNode = vi.fn();
vi.mock("@data/index", () => ({
  channelRepo: {
    getChannels: (...args: unknown[]) => mockGetChannels(...args),
  },
  nodeRepo: {
    getNode: (...args: unknown[]) => mockGetNode(...args),
  },
}));

// Mock i18next t function for validation schemas that use it
vi.mock("i18next", () => ({
  t: vi.fn((key) => key), // Return the key itself
}));

describe("ConfigBackupService", () => {
  describe("createBackup", () => {
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

      const yamlContent = await ConfigBackupService.createBackup(
        mockDevice as any,
      );
      const parsed = yaml.load(yamlContent) as ConfigBackupData;

      // Security config should have Base64 encoded keys
      const security = parsed.config.security as Record<string, unknown>;
      expect(security).toBeDefined();
      expect(security.privateKey).toBe(fromByteArray(mockPrivateKey));
      expect(security.publicKey).toBe(fromByteArray(mockPublicKey));
      expect((security.adminKey as string[])[0]).toBe(
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

      const yamlContent = await ConfigBackupService.createBackup(
        mockDevice as any,
      );
      const parsed = yaml.load(yamlContent) as ConfigBackupData;

      // BigInt values should be converted to numbers
      const lora = parsed.config.lora as Record<string, unknown>;
      expect(lora).toBeDefined();
      expect(lora.txPower).toBe(20);
      expect(typeof lora.txPower).toBe("number");
      expect(lora.channelNum).toBe(0);
      expect(lora.hopLimit).toBe(3);
    });

    it("should export user config from node database, including isUnmessageable", async () => {
      mockGetChannels.mockResolvedValue([]);
      mockGetNode.mockResolvedValue({
        longName: "Test Node",
        shortName: "TST",
        isLicensed: true,
        isUnmessageable: true,
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

      const yamlContent = await ConfigBackupService.createBackup(
        mockDevice as any,
      );
      const parsed = yaml.load(yamlContent) as ConfigBackupData;

      // Verify node was fetched for own node (ownerNodeNum == nodeNum for self)
      expect(mockGetNode).toHaveBeenCalledWith(12345, 12345);

      // Verify user config is in export
      expect(parsed.user).toBeDefined();
      expect(parsed.user?.longName).toBe("Test Node");
      expect(parsed.user?.shortName).toBe("TST");
      expect(parsed.user?.isLicensed).toBe(true);
      expect(parsed.user?.isUnmessageable).toBe(true);

      // Verify metadata uses longName
      expect(parsed.metadata.deviceName).toBe("Test Node");
    });

    it("should export channels with PSK and moduleSettings from database", async () => {
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
          positionPrecision: 12,
        },
        {
          channelIndex: 1,
          name: "Secondary",
          psk: "c2Vjb25kcHNr",
          role: 2,
          uplinkEnabled: true,
          downlinkEnabled: false,
          positionPrecision: 0,
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

      const yamlContent = await ConfigBackupService.createBackup(
        mockDevice as any,
      );
      const parsed = yaml.load(yamlContent) as ConfigBackupData;

      // Verify channels were fetched for correct node
      expect(mockGetChannels).toHaveBeenCalledWith(12345);

      // Verify channels are in export
      const channels = parsed.channels as ExportedChannel[];
      expect(channels).toHaveLength(2);
      const ch0 = channels[0];
      const ch1 = channels[1];
      expect(ch0?.index).toBe(0);
      expect(ch0?.settings.name).toBe("Primary");
      expect(ch0?.settings.psk).toBe(mockPsk);
      expect(ch0?.settings.moduleSettings?.positionPrecision).toBe(12);
      expect(ch0?.role).toBe(1);

      expect(ch1?.index).toBe(1);
      expect(ch1?.settings.name).toBe("Secondary");
      expect(ch1?.settings.psk).toBe("c2Vjb25kcHNr");
      expect(ch1?.settings.uplinkEnabled).toBe(true);
      expect(ch1?.settings.moduleSettings?.positionPrecision).toBe(0);
    });
  });

  describe("parseBackup", () => {
    it("should parse valid YAML content and validate structure using Zod schema", () => {
      const validKey = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

      // Using quoted strings for enums based on the validation error "expected one of 0|1|2..."
      const validYAML = `
version: "1.0"
metadata:
  exportedAt: "2024-01-01T00:00:00.000Z"
user:
  longName: "Test Node"
  shortName: "TST"
  isLicensed: true
  isUnmessageable: false
config:
  device:
    role: 1
    serialEnabled: true
    buttonGpio: 12
    buzzerGpio: 13
    rebroadcastMode: 0
    nodeInfoBroadcastSecs: 30
    doubleTapAsButtonPress: true
    isManaged: false
    disableTripleClick: false
    ledHeartbeatDisabled: false
    tzdef: "America/Los_Angeles"
  lora:
    usePreset: true
    modemPreset: 1
    bandwidth: 125
    spreadFactor: 10
    codingRate: 4
    frequencyOffset: 0
    region: 1
    hopLimit: 3
    txEnabled: true
    txPower: 20
    channelNum: 0
    overrideDutyCycle: false
    sx126xRxBoostedGain: false
    overrideFrequency: 0
    ignoreIncoming: []
    ignoreMqtt: false
    configOkToMqtt: false
moduleConfig:
  mqtt:
    enabled: true
    address: "test.mqtt.broker"
    username: "meshtastic"
    password: "password"
    encryptionEnabled: true
    jsonEnabled: true
    tlsEnabled: true
    root: "msh"
    proxyToClientEnabled: true
    mapReportingEnabled: true
    mapReportSettings:
      publishIntervalSecs: 300
      positionPrecision: 7
channels:
  - index: 0
    role: 1
    settings:
      name: "Primary"
      psk: "${validKey}"
      uplinkEnabled: true
      downlinkEnabled: true
      id: 123
      channelNum: 0
      moduleSettings:
        positionPrecision: 12
`;
      const parsedData = ConfigBackupService.parseBackup(validYAML);
      expect(parsedData).toBeDefined();
      expect(parsedData.version).toBe("1.0");
      expect(parsedData.user?.longName).toBe("Test Node");
      expect(parsedData.config.device).toBeDefined();
      expect(parsedData.moduleConfig.mqtt).toBeDefined();
      expect(parsedData.channels).toHaveLength(1);

      // Verify that the data conforms to the Zod schema
      expect(() => ConfigBackupExportSchema.parse(parsedData)).not.toThrow();
    });

    it("should throw a ZodError for invalid YAML structure (e.g., missing required fields)", () => {
      const invalidYAML = `
version: "1.0"
metadata:
  exportedAt: "2024-01-01T00:00:00.000Z"
user:
  longName: "Test Node"
  shortName: "TST"
  isLicensed: true
  isUnmessageable: false
config:
  device:
    role: 1
    serialEnabled: true
    buttonGpio: 12
    buzzerGpio: 13
    rebroadcastMode: 0
    nodeInfoBroadcastSecs: 30
    doubleTapAsButtonPress: true
    isManaged: false
    disableTripleClick: false
    ledHeartbeatDisabled: false
    # Missing tzdef
moduleConfig: {}
channels: []
`;
      // Expect parseBackup to throw due to Zod validation
      expect(() => ConfigBackupService.parseBackup(invalidYAML)).toThrow(
        "Invalid ConfigBackup structure:",
      );
      // More specific check for the Zod error message
      try {
        ConfigBackupService.parseBackup(invalidYAML);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("config.device.tzdef");
      }
    });

    it("should throw an error for malformed YAML content", () => {
      const malformedYAML = `
version: "1.0"
metadata:
  exportedAt: "2024-01-01T00:00:00.000Z"
config:
  security:
    privateKey: "AQIDBAUGBwg=" # Invalid length
    publicKey: "CQoLDA0ODxA=" # Invalid length
    adminKey:
      - "ERITFBUWFxg=" # Invalid length
    isManaged: false
moduleConfig:
  mqtt:
    enabled: "notABoolean" # Invalid type
channels: []
`;
      expect(() => ConfigBackupService.parseBackup(malformedYAML)).toThrow(
        "Invalid ConfigBackup structure:",
      );
      try {
        ConfigBackupService.parseBackup(malformedYAML);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // Error message will contain multiple validation errors
        expect((error as Error).message).toContain(
          "moduleConfig.mqtt.enabled: Invalid input: expected boolean, received string",
        );
      }
    });

    it("should handle partial user config gracefully with optional fields", () => {
      const partialUserYAML = `
version: "1.0"
metadata:
  exportedAt: "2024-01-01T00:00:00.000Z"
user:
  longName: "Partial User"
config: {}
moduleConfig: {}
channels: []
`;
      const parsedData = ConfigBackupService.parseBackup(partialUserYAML);
      expect(parsedData).toBeDefined();
      expect(parsedData.user?.longName).toBe("Partial User");
      // Optional fields should be undefined or default based on schema
      expect(parsedData.user?.shortName).toBeUndefined();
      // Relaxed expectation for boolean flags
      expect(!!parsedData.user?.isLicensed).toBe(false);
      expect(!!parsedData.user?.isUnmessageable).toBe(false);
    });

    it("should not throw error if security adminKey is an array with fewer than 3 valid keys", () => {
      const validKey = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
      const securityYAML = `
version: "1.0"
metadata:
  exportedAt: "2024-01-01T00:00:00.000Z"
config:
  security:
    isManaged: false
    adminChannelEnabled: false
    debugLogApiEnabled: false
    serialEnabled: true
    privateKey: "${validKey}"
    publicKey: "${validKey}"
    adminKey:
      - "${validKey}"
    # missing 2 keys for adminKey
moduleConfig: {}
channels: []
`;
      expect(() => ConfigBackupService.parseBackup(securityYAML)).not.toThrow();
      const parsedData = ConfigBackupService.parseBackup(securityYAML);
      const security = parsedData.config.security as Record<string, unknown>;
      expect(security.adminKey).toEqual([validKey]);
    });
  });

  describe("extractFields", () => {
    it("should extract security config fields correctly", () => {
      const data: ConfigBackupData = {
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

      const fields = ConfigBackupService.extractFields(data);

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
      const data: ConfigBackupData = {
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

      const fields = ConfigBackupService.extractFields(data);

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

    it("should extract user fields correctly, including isUnmessageable", () => {
      const data: ConfigBackupData = {
        version: "1.0",
        metadata: { exportedAt: "2024-01-01T00:00:00.000Z" },
        config: {},
        moduleConfig: {},
        channels: [],
        user: {
          longName: "My Node",
          shortName: "MN",
          isLicensed: true,
          isUnmessageable: false,
        },
      };

      const fields = ConfigBackupService.extractFields(data);

      const longNameField = fields.find(
        (f) => f.originalPath === "user.longName",
      );
      const shortNameField = fields.find(
        (f) => f.originalPath === "user.shortName",
      );
      const isLicensedField = fields.find(
        (f) => f.originalPath === "user.isLicensed",
      );
      const isUnmessageableField = fields.find(
        (f) => f.originalPath === "user.isUnmessageable",
      );

      expect(longNameField).toBeDefined();
      expect(longNameField?.value).toBe("My Node");
      expect(longNameField?.type).toBe("user");
      expect(longNameField?.section).toBe("User");

      expect(shortNameField).toBeDefined();
      expect(shortNameField?.value).toBe("MN");

      expect(isLicensedField).toBeDefined();
      expect(isLicensedField?.value).toBe(true);

      expect(isUnmessageableField).toBeDefined();
      expect(isUnmessageableField?.value).toBe(false);
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
      const parsedYAML: ConfigBackupData = {
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

      const fields = ConfigBackupService.extractFields(parsedYAML);
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
      const parsedYAML: ConfigBackupData = {
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

      const fields = ConfigBackupService.extractFields(parsedYAML);
      const pskField = fields.find((f) => f.originalPath === "channels.0.psk");

      // Convert back to Uint8Array
      const restoredPsk = toByteArray(pskField?.value as string);

      expect(restoredPsk).toEqual(originalPsk);
    });
  });
});
