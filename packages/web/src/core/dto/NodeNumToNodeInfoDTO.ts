import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/core";

function createDefaultUser(num: number): Protobuf.Mesh.User {
  const userIdHex = num.toString(16).toUpperCase().padStart(2, "0");
  const userId = `!${userIdHex}`;
  const last4 = userIdHex.slice(-4);
  const longName = `Meshtastic ${last4}`;
  const shortName = last4;

  return create(Protobuf.Mesh.UserSchema, {
    id: userId,
    longName: longName.toString(),
    shortName: shortName.toString(),
  });
}

export function ensureDefaultUser(
  node: Protobuf.Mesh.NodeInfo,
): Protobuf.Mesh.NodeInfo {
  if (!node) {
    return node;
  }

  if (!node.user) {
    if (node.num === undefined || node.num === null) {
      console.error(
        `NodeInfoFactory.ensureDefaultUser: Cannot create default user for node because 'num' is missing.`,
        node,
      );
      return node;
    }

    // Assign the created user directly
    node.user = createDefaultUser(node.num);
  }

  return node;
}
