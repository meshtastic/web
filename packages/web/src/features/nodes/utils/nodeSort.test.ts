import { describe, expect, it } from "vitest";
import { type SortConfig, sortNodes } from "./nodeSort.ts";

describe("sortNodes", () => {
  type TestNode = {
    name: string;
    lastHeard: number;
    isFavorite: boolean;
    isChannel?: boolean;
  };

  const config: SortConfig<TestNode> = {
    getName: (node) => node.name,
    getLastHeard: (node) => node.lastHeard,
    isFavorite: (node) => node.isFavorite,
    isChannel: (node) => !!node.isChannel,
  };

  const nodeA: TestNode = {
    name: "Alpha",
    lastHeard: 100,
    isFavorite: false,
    isChannel: false,
  };
  const nodeB: TestNode = {
    name: "Beta",
    lastHeard: 200,
    isFavorite: true,
    isChannel: false,
  };
  const nodeC: TestNode = {
    name: "Gamma",
    lastHeard: 300,
    isFavorite: false,
    isChannel: true,
  };
  const nodeD: TestNode = {
    name: "Delta",
    lastHeard: 0,
    isFavorite: false,
    isChannel: false,
  };
  const nodeE: TestNode = {
    name: "Echo",
    lastHeard: 50,
    isFavorite: false,
    isChannel: false,
  };
  const nodeF: TestNode = {
    name: "Foxtrot",
    lastHeard: 150,
    isFavorite: true,
    isChannel: false,
  };
  const nodeG: TestNode = {
    name: "aChannel",
    lastHeard: 10,
    isFavorite: false,
    isChannel: true,
  };
  const nodeH: TestNode = {
    name: "bravo",
    lastHeard: 120,
    isFavorite: false,
    isChannel: false,
  }; // for case-insensitivity
  const nodeI: TestNode = {
    name: "India",
    lastHeard: 0,
    isFavorite: true,
    isChannel: false,
  }; // favorite, never heard

  it("should sort channels first, then favorites, then recently heard, then never heard", () => {
    const nodes = [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF, nodeG];
    const sorted = sortNodes(nodes, config);

    const _expectedOrder = [nodeG, nodeC, nodeB, nodeF, nodeE, nodeA, nodeD]; // Manual expected order based on groups and internal sort
    // Channels: C, G -> sorted by name: G, C (aChannel, Gamma)
    // Favorites: B, F -> sorted by name: B, F (Beta, Foxtrot)
    // Recently Heard: A, E -> sorted by lastHeardDesc: A(100), E(50) -> No, E(50), A(100) -> A(100), E(50)
    // Never Heard: D -> sorted by name: D
    // C, G, B, F, A, E, D
    // Expected based on alphabetical within groups, lastHeard desc for 'recently heard'
    // Channels (A-Z): nodeG (aChannel), nodeC (Gamma)
    // Favorites (A-Z): nodeB (Beta), nodeF (Foxtrot)
    // Recently Heard (lastHeard DESC): nodeA (100), nodeE (50)
    // Never Heard (A-Z): nodeD (Delta)

    expect(sorted[0]).toBe(nodeG); // aChannel
    expect(sorted[1]).toBe(nodeC); // Gamma
    expect(sorted[2]).toBe(nodeB); // Beta (favorite)
    expect(sorted[3]).toBe(nodeF); // Foxtrot (favorite)
    expect(sorted[4]).toBe(nodeA); // Alpha (recently heard, lastHeard:100)
    expect(sorted[5]).toBe(nodeE); // Echo (recently heard, lastHeard:50)
    expect(sorted[6]).toBe(nodeD); // Delta (never heard)
  });

  it("should sort channels first, then favorites, then recently heard, then never heard", () => {
    const nodes = [
      nodeA,
      nodeB,
      nodeC,
      nodeD,
      nodeE,
      nodeF,
      nodeG,
      nodeH,
      nodeI,
    ];
    const sorted = sortNodes(nodes, config);

    // Expected order: Channels (aChannel, Gamma) -> Favorites (Beta, Foxtrot, India) -> Recently Heard (bravo, Alpha, Echo) -> Never Heard (Delta)
    // Channels (A-Z): nodeG (aChannel), nodeC (Gamma)
    // Favorites (A-Z): nodeB (Beta), nodeF (Foxtrot), nodeI (India)
    // Recently Heard (lastHeard DESC): nodeH (120), nodeA (100), nodeE (50)
    // Never Heard (A-Z): nodeD (Delta)

    expect(sorted[0]).toBe(nodeG); // aChannel
    expect(sorted[1]).toBe(nodeC); // Gamma
    expect(sorted[2]).toBe(nodeB); // Beta
    expect(sorted[3]).toBe(nodeF); // Foxtrot
    expect(sorted[4]).toBe(nodeI); // India
    expect(sorted[5]).toBe(nodeH); // bravo (120)
    expect(sorted[6]).toBe(nodeA); // Alpha (100)
    expect(sorted[7]).toBe(nodeE); // Echo (50)
    expect(sorted[8]).toBe(nodeD); // Delta
  });

  it("should sort groups alphabetically for channels and favorites, and by lastHeard desc for recently heard", () => {
    const nodes = [nodeA, nodeG, nodeC, nodeB, nodeF, nodeH, nodeI]; // Test with a mix
    const sorted = sortNodes(nodes, config);

    // Channels (aChannel, Gamma)
    expect(sorted[0].name).toBe("aChannel");
    expect(sorted[1].name).toBe("Gamma");
    // Favorites (Beta, Foxtrot, India)
    expect(sorted[2].name).toBe("Beta");
    expect(sorted[3].name).toBe("Foxtrot");
    expect(sorted[4].name).toBe("India");
    // Recently Heard (bravo, Alpha)
    expect(sorted[5].name).toBe("bravo"); // 120
    expect(sorted[6].name).toBe("Alpha"); // 100
  });

  it("should sort recently heard by lastHeard descending", () => {
    const nodes = [nodeA, nodeE, nodeH]; // lastHeard: 100, 50, 120
    const sorted = sortNodes(nodes, config);

    // Should be sorted by lastHeardDesc: H(120), A(100), E(50)
    expect(sorted[0]).toBe(nodeH);
    expect(sorted[1]).toBe(nodeA);
    expect(sorted[2]).toBe(nodeE);
  });

  it("should handle case-insensitive sorting for names in alphabetical groups", () => {
    const nodes = [{ ...nodeA, name: "alpha" }, nodeG]; // "alpha", "aChannel"
    const _sorted = sortNodes(nodes, config);
    // aChannel is channel, then alpha is recently heard. So it's about groups.

    // Let's create a specific scenario for case-insensitive within a group.
    const nodesForCaseTest = [
      { name: "zebra", lastHeard: 100, isFavorite: false, isChannel: false },
      { name: "apple", lastHeard: 110, isFavorite: false, isChannel: false },
      { name: "Apple", lastHeard: 120, isFavorite: false, isChannel: false },
      { name: "Zebra", lastHeard: 90, isFavorite: false, isChannel: false },
    ];
    // All are "recently heard"
    const _sortedCaseTest = sortNodes(nodesForCaseTest, config);

    // Should be sorted by lastHeard Desc: Apple(120), apple(110), zebra(100), Zebra(90)
    // No, byName for recentlyHeard: if there were no two with same lastHeard.
    // The previous instruction was to sort RecentlyHeard by LastHeard Desc.
    // My change was to make byName case-insensitive.

    // So if I have "Alpha" and "alpha", "Alpha".localeCompare("alpha", {sensitivity: "base"}) should be 0.
    // It should keep original order? Or consistent order.

    // The code uses byLastHeardDesc for RecentlyHeard. So `nodeH (bravo, 120), { ...nodeA, name: "alpha" } (alpha, 100)` -> bravo, alpha.
    const alphaNode: TestNode = {
      name: "alpha",
      lastHeard: 100,
      isFavorite: false,
      isChannel: false,
    };
    const bravoNode: TestNode = {
      name: "bravo",
      lastHeard: 120,
      isFavorite: false,
      isChannel: false,
    };
    const nodesToTestCaseInsensitive = [alphaNode, bravoNode];

    const sortedRecent = sortNodes(nodesToTestCaseInsensitive, config);
    expect(sortedRecent[0]).toBe(bravoNode);
    expect(sortedRecent[1]).toBe(alphaNode);

    // Let's test case-insensitive sorting within Channels for instance.
    const channel1: TestNode = {
      name: "ZChannel",
      lastHeard: 10,
      isFavorite: false,
      isChannel: true,
    };
    const channel2: TestNode = {
      name: "achannel",
      lastHeard: 10,
      isFavorite: false,
      isChannel: true,
    };
    const sortedChannels = sortNodes([channel1, channel2], config);
    expect(sortedChannels[0]).toBe(channel2); // achannel
    expect(sortedChannels[1]).toBe(channel1); // ZChannel
  });

  it("should correctly place favorite nodes that have never been heard", () => {
    const nodes = [nodeD, nodeI]; // Delta (never heard), India (favorite, never heard)
    const sorted = sortNodes(nodes, config);

    // I (favorite) should come before D (never heard)
    expect(sorted[0]).toBe(nodeI);
    expect(sorted[1]).toBe(nodeD);
  });

  it("should correctly place favorite nodes that have never been heard", () => {
    const nodes = [nodeD, nodeI]; // Delta (never heard), India (favorite, never heard)
    const sorted = sortNodes(nodes, config);

    // I (favorite) should come before D (never heard)
    expect(sorted[0]).toBe(nodeI);
    expect(sorted[1]).toBe(nodeD);
  });
});
