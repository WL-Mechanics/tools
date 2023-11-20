"use strict";

/* -------- */

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function replaceAll(array, replacements) {
    const result = [];
    for (const elem of array) {
        result.push(replacements[elem] || elem);
    }
    return result;
}

/* -------- */

const CATEGORIES = ["sexScenes", "props", "characters", "poses"];

function getAllEntityHandles(scene) {
    const result = {};
    for (const category of CATEGORIES) {
        const nodes = scene[category] || [];
        for (const node of nodes) {
            const guid = node["guid"];
            const handle = {
                category: category,
                guid: guid,
                parent: node["parent"],
                label: node["label"],
                index: node["childIndex"]
            };
            result[guid] = handle;
        }
    }
    return result;
}

function findEntity(scene, guid) {
    for (const category of CATEGORIES) {
        if (category in scene) {
            for (const entity of scene[category]) {
                if (entity["guid"] === guid) {
                    return entity;
                }
            }
        }
    }
    return null;
}

function replaceEntity(scene, guid, replacement) {
    const result = deepCopy(scene);
    const entity = findEntity(result, guid);
    for (const prop in entity) {
        delete entity[prop];
    }
    Object.assign(entity, replacement);
    return result;
}

function copyTransform(fromEntity, toEntity) {
    const result = deepCopy(toEntity);
    for (const key of ["position", "rotation", "scale"]) {
        result[key] = deepCopy(fromEntity[key]);
    }
    return result;
}

/* -------- */

function getCharacterHierarchy(scene) {
    const entities = getAllEntityHandles(scene);

    function getFirstNonPropAncestor(guid) {
        const entity = entities[guid];
        if (entity == null) {
            return null;
        }
        const parent = entities[entity["parent"]];
        if (parent == null) {
            return null;
        }
        if (parent["category"] !== "props") {
            return parent;
        }
        return getFirstNonPropAncestor(parent["guid"]);
    }

    function addNode(parent, node) {
        if ("nodes" in parent) {
            const nodes = parent["nodes"];
            if (!nodes.includes(node)) {
                nodes.push(node);
            }
        } else {
            parent["nodes"] = [node];
        }
    }

    function visit(handle) {
        const ancestor = getFirstNonPropAncestor(handle["guid"]);
        if (ancestor !== null) {
            addNode(ancestor, handle);
            visit(ancestor);
        }
    }

    for (const [_, handle] of Object.entries(entities)) {
        if (handle["category"] === "characters") {
            visit(handle);
        }
    }

    const result = [];

    for (const [_, handle] of Object.entries(entities)) {
        if (handle["category"] !== "props" && getFirstNonPropAncestor(handle["guid"]) === null) {
            result.push(handle);
        }
    }

    return result;
}

function replaceCharacterReferences(scene, guidReplacements) {
    const result = deepCopy(scene);

    const poses = result["poses"] || [];
    for (const pose of poses) {
        const settings = pose["settings"];
        const characterGuid = settings["characterGUId"];
        if (characterGuid in guidReplacements) {
            settings["characterGUId"] = guidReplacements[characterGuid];
        }
    }

    const sexScenes = result["sexScenes"] || [];
    for (const sexScene of sexScenes) {
        const settings = sexScene["settings"];
        settings["characterGUIds"] = replaceAll(settings["characterGUIds"], guidReplacements);
    }

    return result;
}

function swapCharacters(scene, guid1, guid2) {
    let result = deepCopy(scene);

    const character1 = findEntity(result, guid1);
    const character2 = findEntity(result, guid2);

    const transformed1 = copyTransform(character2, character1);
    const transformed2 = copyTransform(character1, character2);

    transformed1["parent"] = character2["parent"];
    transformed2["parent"] = character1["parent"];

    transformed1["bIsPlayer"] = character2["bIsPlayer"];
    transformed2["bIsPlayer"] = character1["bIsPlayer"];

    result = replaceEntity(result, guid1, transformed1);
    result = replaceEntity(result, guid2, transformed2);

    const replacements = { [guid1]: guid2, [guid2]: guid1 };

    result = replaceCharacterReferences(result, replacements);

    return result;
}

/* -------- */

export { swapCharacters, getCharacterHierarchy };
