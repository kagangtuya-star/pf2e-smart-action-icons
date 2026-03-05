const MODULE_ID = "pf2e-smart-action-icons";
const GLOBAL_KEY = "PF2E_SMART_ACTION_ICONS";

const TRIGGER_ICONS = new Set([
  "systems/pf2e/icons/default-icons/action.svg",
  "systems/pf2e/icons/default-icons/feat.svg",
]);

const MANAGED_IMAGES = new Set([
  ...TRIGGER_ICONS,
  "systems/pf2e/icons/actions/FreeAction.webp",
  "systems/pf2e/icons/actions/OneAction.webp",
  "systems/pf2e/icons/actions/TwoActions.webp",
  "systems/pf2e/icons/actions/ThreeActions.webp",
  "systems/pf2e/icons/actions/Reaction.webp",
  "systems/pf2e/icons/actions/Passive.webp",
]);

function i18n(key, data = {}) {
  return game.i18n.format(`${MODULE_ID}.${key}`, data);
}

function logInfo(key, data = {}) {
  console.info(`[${MODULE_ID}] ${i18n(key, data)}`);
}

function isPf2eActionItem(item) {
  return Boolean(item?.system?.actionType?.value);
}

function getExpectedImage(actionType, actions) {
  if (actionType === "free") return "systems/pf2e/icons/actions/FreeAction.webp";
  if (actionType === "reaction") return "systems/pf2e/icons/actions/Reaction.webp";
  if (actionType === "passive") return "systems/pf2e/icons/actions/Passive.webp";
  if (actionType === "action") {
    if (actions == 1) return "systems/pf2e/icons/actions/OneAction.webp";
    if (actions == 2) return "systems/pf2e/icons/actions/TwoActions.webp";
    if (actions == 3) return "systems/pf2e/icons/actions/ThreeActions.webp";
  }
  return null;
}

function shouldReplaceForItem(item) {
  const isNpcOwnedItem = item?.actor?.type === "npc";
  if (isNpcOwnedItem) {
    return game.settings.get(MODULE_ID, "replaceNpcIcons");
  }
  return game.settings.get(MODULE_ID, "replaceItemIcons");
}

function registerSettings() {
  game.settings.register(MODULE_ID, "replaceNpcIcons", {
    name: `${MODULE_ID}.SETTINGS.REPLACE_NPC_ICONS.NAME`,
    hint: `${MODULE_ID}.SETTINGS.REPLACE_NPC_ICONS.HINT`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, "replaceItemIcons", {
    name: `${MODULE_ID}.SETTINGS.REPLACE_ITEM_ICONS.NAME`,
    hint: `${MODULE_ID}.SETTINGS.REPLACE_ITEM_ICONS.HINT`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
}

function attachHooks() {
  if (globalThis[GLOBAL_KEY]) {
    Hooks.off("preUpdateItem", globalThis[GLOBAL_KEY].preUpdateHook);
    Hooks.off("renderItemSheet", globalThis[GLOBAL_KEY].renderSheetHook);
  }

  const renderSheetHook = (app) => {
    const item = app?.document;
    if (!item) return;
    if (!shouldReplaceForItem(item)) return;
    if (!isPf2eActionItem(item)) return;
    if (!TRIGGER_ICONS.has(item.img)) return;

    const expectedImg = getExpectedImage(item.system.actionType.value, item.system.actions?.value);
    if (!expectedImg || expectedImg === item.img) return;

    item.update({ img: expectedImg }).then(() => {
      logInfo("LOG.SHEET_UPDATED", { itemName: item.name, image: expectedImg });
    });
  };

  const preUpdateHook = (item, changes, _options, userId) => {
    if (game.user.id !== userId) return;
    if (!item) return;
    if (!shouldReplaceForItem(item)) return;
    if (!isPf2eActionItem(item)) return;

    const finalImg = changes.img !== undefined ? changes.img : item.img;
    if (!MANAGED_IMAGES.has(finalImg)) return;

    const finalActionType = changes.system?.actionType?.value ?? item.system.actionType?.value;
    const finalActions = changes.system?.actions?.value ?? item.system.actions?.value;
    const expectedImg = getExpectedImage(finalActionType, finalActions);

    if (!expectedImg || finalImg === expectedImg) return;
    changes.img = expectedImg;
    logInfo("LOG.PREUPDATE_MATCHED", { itemName: item.name, image: expectedImg });
  };

  globalThis[GLOBAL_KEY] = { renderSheetHook, preUpdateHook };
  Hooks.on("renderItemSheet", renderSheetHook);
  Hooks.on("preUpdateItem", preUpdateHook);
}

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", () => {
  if (game.system.id !== "pf2e") {
    const message = i18n("NOTIFY.NOT_PF2E");
    ui.notifications?.warn?.(message);
    logInfo("LOG.NOT_PF2E", { systemId: game.system.id });
    return;
  }

  attachHooks();
  logInfo("LOG.READY");
});
