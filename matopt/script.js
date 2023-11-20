"use strict";

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function extractMaterialNames(prop) {
    const result = new Set();

    const stringSettings = prop["stringSettings"];

    if (stringSettings) {
        for (const key in stringSettings) {
            if (key.toLocaleLowerCase().includes("material")) {
                const value = stringSettings[key];

                if (value) {
                    result.add(value);
                }
            }
        }
    }

    return result;
}

function findUsedMaterialNames(scene) {
    const result = new Set();

    const props = scene["props"] || [];

    for (const prop of props) {
        for (const materialName of extractMaterialNames(prop)) {
            result.add(materialName);
        }
    }

    return result;
}

function removeUnusedMaterials(scene) {
    const usedMaterialNames = findUsedMaterialNames(scene);

    const result = deepCopy(scene);

    if (result["customMaterials"]) {
        result["customMaterials"] = result["customMaterials"].filter(mat => usedMaterialNames.has(mat["name"]));
    }

    return result;
}

export default removeUnusedMaterials;
