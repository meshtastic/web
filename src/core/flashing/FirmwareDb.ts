import type { FirmwareVersion } from "@app/components/PageComponents/Flasher/FlashSettings";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const db = indexedDB.open("firmwares");
    db.onsuccess = () => {
      resolve(db.result);
    };
    db.onupgradeneeded = (ev) => {
      const objStore = db.result.createObjectStore("files");
      objStore.transaction.oncomplete = () => resolve(db.result);
    };
  });
}

export async function isStoredInDb(firmwareTag: string): Promise<boolean> {
  const dbs = await indexedDB.databases();
  if (dbs.find((db) => db.name == "firmwares") === undefined) return false;
  return new Promise<boolean>((resolve, reject) => {
    const db = indexedDB.open("firmwares");
    db.onsuccess = () => {
      if (!db.result.objectStoreNames.contains("files")) resolve(false);
      const objStore = db.result
        .transaction("files", "readonly")
        .objectStore("files");
      const transaction = objStore.getKey(firmwareTag);
      transaction.onsuccess = () => resolve(transaction.result !== undefined);
      transaction.onerror = () => resolve(false);
    };
  });
}

export async function storeInDb(firmware: FirmwareVersion, file: ArrayBuffer) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const fileStore = db.transaction("files", "readwrite").objectStore("files");
    const addOp = fileStore.add(file, firmware.tag);
    fileStore.transaction.oncomplete = () => {
      console.log("Successfully stored firmware in DB.");
      resolve();
    };
    fileStore.transaction.onerror = reject;
  });
}

export async function loadFromDb(firmware: FirmwareVersion) {
  const db = await openDb();
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const objStore = db.transaction("files", "readonly").objectStore("files");
    const transaction = objStore.get(firmware.tag);
    transaction.onsuccess = () => {
      resolve(transaction.result as ArrayBuffer);
    };
    transaction.onerror = reject;
  });
}

export async function deleteFromDb(firmware: FirmwareVersion) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    if (!db.objectStoreNames.contains("files")) {
      resolve();
      return;
    }
    const objStore = db.transaction("files", "readonly").objectStore("files");
    const transaction = objStore.delete(firmware.tag);
    transaction.onsuccess = () => resolve;
    transaction.onerror = reject;
  });
}
