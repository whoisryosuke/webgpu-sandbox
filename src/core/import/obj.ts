import Material, { MaterialUniform } from "../material";
import Mesh, {
  generateIndexBufferData,
  generateVertexBufferData,
} from "../mesh";
import { createTexture, loadImage } from "../texture";
import { Vector2D, Vector3D } from "../vertex";

export type RGBColor = {
  r: number;
  g: number;
  b: number;
};
export type RGBAColor = RGBColor & {
  a: number;
};

export function rgbaToArray(color: RGBAColor) {
  return [color.r, color.g, color.b, color.a];
}

const generateDefaultColor = () => ({ r: 0, g: 0, b: 0 });

/**
 * Map of all textures attached to an OBJ
 */
export interface OBJTexture {
  ambient?: ImageBitmap;
  diffuse?: ImageBitmap;
  specular?: ImageBitmap;
  emissive?: ImageBitmap;
}

/**
 * We load all the OBJ file data into this object
 * Then convert this to a renderer-comptaible "Material" later
 */
export interface OBJMaterial {
  name: string;
  shininess: number;
  ambient: RGBColor;
  /**
   * The color you see
   */
  diffuse: RGBColor;
  specular: RGBColor;
  /**
   * Outer glow
   */
  emissive: RGBColor;
  opticalDensity: number;
  opacity: number;
  /**
   * Illumination method
   */
  illum: number;
  textures: OBJTexture;
}

export async function fetchTextFile(url: string) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Get OBJ as text (since it's a text-based not binary)
    const text = await response.text();
    return text;
  } catch (error) {
    console.error(`Error reading file from URL ${url}:`, error);
    // Return an empty string in case of an error
    return "";
  }
}

const RGBA_COLOR_INDEX_MAP = {
  0: "r",
  1: "g",
  2: "b",
  3: "a",
};

function parseRGBParts(parts: string[]) {
  const [label, ...colorStrings] = parts;

  // Take [0, 0, 1] array and convert to {r:0,g:0,b:1} object
  return colorStrings.reduce((merge, colorString, index) => {
    const label =
      RGBA_COLOR_INDEX_MAP[index as keyof typeof RGBA_COLOR_INDEX_MAP];
    return {
      ...merge,
      [label]: parseFloat(colorString),
    };
  }, {} as RGBColor);
}

/**
 * Load a `.mtl` file from server and parse into material
 */
export async function loadMaterialLibrary(
  materialFilename: string,
  objPath: string
) {
  // OBJ provides material file name, but we need to grab it from correct folder
  // which we assume is same folder as OBJ file
  // Note: Since it's web-based, it can't support PC paths (e.g. `C:/image.png` or `/Home/User/image.png`)
  const materialPath = `${objPath}/${materialFilename}`;
  // console.log("[OBJ] loading mat", materialPath);
  const materialFile = await fetchTextFile(materialPath);

  // Grab every line in document
  const lines = materialFile.split("\n");
  let material: OBJMaterial = {
    name: "Default",
    shininess: 0,
    ambient: generateDefaultColor(),
    diffuse: generateDefaultColor(),
    specular: generateDefaultColor(),
    emissive: generateDefaultColor(),
    opticalDensity: 0,
    opacity: 0,
    illum: 0,
    textures: {},
  };
  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    // Get each part of each line (e.g. the label, then 1/2/3, etc)
    const parts = trimmedLine.split(" ");

    // Process each property by it's label
    switch (parts[0]) {
      case "newmtl": // Material name
        material.name = parts[1];
        break;
      case "Ka": // Ambient Color
        material.ambient = parseRGBParts(parts);
        break;
      case "Kd": // Diffuse Color
        material.diffuse = parseRGBParts(parts);
        break;
      case "Ks": // Specular Color
        material.specular = parseRGBParts(parts);
        break;
      case "Ke": // Emissive Color
        material.emissive = parseRGBParts(parts);
        break;
      case "Ns": // Specular shininess
        material.shininess = parseFloat(parts[1]);
        break;
      case "d": // Specular shininess
        material.opacity = parseFloat(parts[1]);
        break;
      case "Ni": // Optical Density
        material.opticalDensity = parseFloat(parts[1]);
        break;
      case "illum": // Optical Density
        material.illum = parseInt(parts[1]);
        break;
    }

    // Handle texture maps (always start with `map_`)
    if (parts[0].startsWith("map_")) {
      const imagePath = `${objPath}/${parts[1]}`;
      const label = parts[0].replace("map_", "");
      switch (label) {
        case "Ka": // Ambient Color
          material.textures.ambient = await loadImage(imagePath);
          break;
        case "Kd": // Diffuse Color
          material.textures.diffuse = await loadImage(imagePath);
          break;
        case "Ks": // Specular Color
          material.textures.specular = await loadImage(imagePath);
          break;
        case "Ke": // Emissive Color
          material.textures.emissive = await loadImage(imagePath);
      }
    }
  }

  // console.log("[OBJ] Material created", material);
  return material;
}

export async function loadObj(url: string) {
  return await fetchTextFile(url);
}

interface Face {
  // The "indices" to each
  vertices: [number, number, number];
  normals: [number, number, number];
  uvs: [number, number];
}

type OBJObject = {
  name: string;
  vertices: Vector3D[];
  normals: Vector3D[];
  uvs: Vector2D[];
  faces: Face[];
  /**
   * Key that maps to material cache
   */
  material: string;
};

function createDefaultObject() {
  return {
    name: "",
    vertices: [],
    normals: [],
    uvs: [],
    faces: [],
    material: "Default",
  };
}

export async function importObj(
  url: string,
  device: GPUDevice,
  renderPipeline: GPURenderPipeline,
  sampler: GPUSampler
) {
  const objString = await fetchTextFile(url);

  let objects: OBJObject[] = [];
  let object: OBJObject = createDefaultObject();
  const materials: Record<string, Material> = {};

  // Grab every line in document
  const lines = objString.split("\n");
  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    // Get each part of each line (e.g. the label, then 1/2/3, etc)
    const parts = trimmedLine.split(" ");

    switch (parts[0]) {
      // OBJ supports multiple objects in one file
      // Each time we detect an object, we save last one and create fresh object
      case "o": // Object
        // Save last mesh if it's not the first
        if (object.name != "") objects.push({ ...object });

        // Create new object
        object = createDefaultObject();
        // Save the object name we parsed
        object.name = parts[1];
        // console.log("[OBJ] Parsing object", object.name);
        break;

      case "v": // Vertex
        if (parts.length === 4) {
          object.vertices.push({
            x: parseFloat(parts[1]),
            y: parseFloat(parts[2]),
            z: parseFloat(parts[3]),
          });
        } else {
          console.warn(`Invalid vertex format: ${trimmedLine}`);
        }
        break;

      case "vn": // Normal
        if (parts.length === 4) {
          object.normals.push({
            x: parseFloat(parts[1]),
            y: parseFloat(parts[2]),
            z: parseFloat(parts[3]),
          });
        } else {
          console.warn(`Invalid normal format: ${trimmedLine}`);
        }
        break;

      case "vt": // Texture Coordinate
        if (parts.length === 3) {
          object.uvs.push({
            x: parseFloat(parts[1]),
            y: parseFloat(parts[2]),
          });
        } else {
          console.warn(`Invalid texture coordinate format: ${trimmedLine}`);
        }
        break;

      case "f": // Face
        const face: Face = {
          vertices: [0, 0, 0],
          normals: [0, 0, 0],
          uvs: [0, 0],
        };

        // console.log("[OBJ] Detected face", parts);

        // Break down the face (expect 3 for now, quads/n-gons not supported)
        parts.forEach((part, i) => {
          if (part == "f") return;

          const facePart = parts[i];
          const indices: number[] = [];

          const subParts = facePart.split("/");
          subParts.forEach((subPart) => {
            // We parse the number and subtract 1 because OBJ indexing starts at 1 (not 0 like arrays)
            indices.push(subPart ? parseInt(subPart) - 1 : 0);
          });
          // Didn't get enough values? Let user know OBJ is malformed possibly
          if (indices.length < 3) {
            console.error(
              `[OBJ] Malformed face line: ${trimmedLine}.  Skipping face.`
            );
            return;
          }

          face.vertices[i - 1] = indices[0];
          face.uvs[i - 1] = indices[1];
          face.normals[i - 1] = indices[2];
        });

        object.faces.push({ ...face });
        break;

      case "mtllib": // Material Library
        const materialLibPath = parts[1];
        // console.log(`[OBJ] Material library: ${materialLibPath}`);

        // Get relative path to model. We assume material is in same folder.
        // We split path by `/`, remove last part with OBJ file, and return path
        const objPath = url.split("/").slice(0, -1).join("/");
        // console.log("[OBJ] Loading material file...", materialLibPath, objPath);
        const objMaterial = await loadMaterialLibrary(materialLibPath, objPath);

        // Convert OBJ material to standard renderer material
        const material = new Material(device, renderPipeline, objMaterial.name);

        // Setup uniform data with material properties
        const uniforms: MaterialUniform = {
          color: {
            r: objMaterial.diffuse.r,
            g: objMaterial.diffuse.g,
            b: objMaterial.diffuse.b,
            a: objMaterial.opacity,
          },
          scale: {
            x: 1,
            y: 1,
            z: 1,
          },
          offset: {
            // x: Math.random(),
            // y: Math.random(),
            // z: Math.random(),
            x: 0,
            y: 0,
            z: 0,
          },
          texture: objMaterial.textures.diffuse ? 1 : 0,
          debugUV: 0,
        };

        // Update material with new uniform data
        material.setUniforms(device, uniforms);

        // Do we have textures? Create them using material
        if (objMaterial.textures.diffuse) {
          material.addTexture(
            device,
            renderPipeline,
            objMaterial.textures.diffuse,
            sampler,
            "diffuse"
          );
        } else {
          material.createDefaultTexture(device, renderPipeline, sampler);
        }

        // Add material to cache
        materials[objMaterial.name] = material;
        break;

      case "usemtl": // Use Material
        const currentMaterialName = parts[1];
        // Assign the material to an object
        // This is the name/key of the material and refers to the material cache map
        object.material = currentMaterialName;
        break;

      default:
        console.warn(`Unknown command: ${trimmedLine}`); // Handle unknown commands gracefully
    }
  }

  // Last object? Push onto stack.
  if (object.name != "") objects.push({ ...object });

  // Convert OBJ-style data to vertex buffer
  const meshes = objects.map((obj) => {
    let meshPositions: Vector3D[] = [];
    let meshNormals: Vector3D[] = [];
    let meshUvs: Vector2D[] = [];
    let meshIndices: number[] = [];

    // Loop over each face and map the index to real data
    obj.faces.forEach((face, index) => {
      // Vertices
      face.vertices.forEach((vertexId) => {
        const vertex = obj.vertices[vertexId];
        meshPositions.push({ ...vertex });
      });

      // Indices
      const lastIndex = meshPositions.length - 3;
      meshIndices.push(lastIndex, lastIndex + 1, lastIndex + 2);

      // Normals
      face.normals.forEach((normalId) => {
        const normal = obj.normals[normalId];
        meshNormals.push({ ...normal });
      });

      // UVs
      face.uvs.forEach((uvId) => {
        let uv = obj.uvs[uvId];
        if (!uv)
          uv = {
            x: 0,
            y: 0,
          };
        meshUvs.push({ ...uv });
      });
    });

    // Create a "mesh" containing the vertex + index data
    const mesh = new Mesh(device, {
      name: obj.name,
      vertices: generateVertexBufferData(meshPositions, meshNormals, meshUvs),
      indices: generateIndexBufferData(meshIndices),
      // The name/key of the material in the global cache
      material: obj.material,
    });
    return mesh;
  });

  return {
    meshes,
    materials,
  };
}
