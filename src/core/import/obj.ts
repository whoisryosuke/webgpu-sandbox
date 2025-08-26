import Material, { MaterialUniform } from "../material";
import Geometry, {
  generateIndexBufferData,
  generateVertexBufferData,
} from "../geometry";
import { createTexture, loadImage } from "../texture";
import { Vector2D, Vector3D } from "../vertex";
import { Mesh } from "../mesh";

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

const createDefaultMaterial = () => ({
  name: "Default",
  ambient: generateDefaultColor(),
  diffuse: generateDefaultColor(),
  specularColor: generateDefaultColor(),
  specularAmount: 500,
  emissive: generateDefaultColor(),
  opticalDensity: 0,
  opacity: 0,
  illum: 0,
  textures: {},
});

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
  ambient: RGBColor;
  /**
   * The color you see
   */
  diffuse: RGBColor;
  /**
   * Specularity aka how "shiny" object is
   */
  specularColor: RGBColor;
  specularAmount: number;
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

  const materials: OBJMaterial[] = [];
  let material: OBJMaterial = createDefaultMaterial();
  let materialCount = 0;

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
      case "newmtl":
        // Each material file can contain multiple materials.
        // Each time this is called, it means it's a new material

        // First time? Skip it.
        if (materialCount == 0) {
          materialCount += 1;
        } else {
          // Not first time? Push material onto stack.
          materials.push(material);
          material = createDefaultMaterial();
        }

        // Material name
        console.log("[OBJ] Importing new material", parts[1]);
        material.name = parts[1];
        break;
      case "Ka": // Ambient Color
        material.ambient = parseRGBParts(parts);
        break;
      case "Kd": // Diffuse Color
        material.diffuse = parseRGBParts(parts);
        break;
      case "Ks": // Specular Color
        material.specularColor = parseRGBParts(parts);
        break;
      case "Ke": // Emissive Color
        material.emissive = parseRGBParts(parts);
        break;
      case "Ns": // Specular "shininess"
        material.specularAmount = parseFloat(parts[1]);
        console.log(
          "specularity",
          material.specularAmount,
          material.specularAmount / 1000
        );
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

  // Push final
  materials.push(material);

  // console.log("[OBJ] Material created", material);
  return materials;
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
  faces: Face[];
  /**
   * Key that maps to material cache
   */
  material: string;
};

function createDefaultObject() {
  return {
    name: "",
    faces: new Array(),
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

  // OBJ files may contain multiple "objects" (aka meshes)
  // it assumes data will be global, and indexes keep incrementing after each object
  const vertices = new Array();
  const normals = new Array();
  const uvs = new Array();

  // We create "objects" that represent each individual object in the `.obj` file
  let objects: OBJObject[] = [];
  // And we make a new "object" to start adding stuff into
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
          vertices.push({
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
          normals.push({
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
          uvs.push({
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

        // Break down the face (expect 3 for now, quads/n-gons not supported)
        // aka make sure mesh is "triangulated"
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
        const objMaterials = await loadMaterialLibrary(
          materialLibPath,
          objPath
        );

        objMaterials.forEach((objMaterial) => {
          // Convert OBJ material to standard renderer material
          const material = new Material(device, objMaterial.name);

          // Setup uniform data with material properties
          const uniforms: MaterialUniform = {
            color: {
              r: objMaterial.diffuse.r,
              g: objMaterial.diffuse.g,
              b: objMaterial.diffuse.b,
              a: objMaterial.opacity,
            },
            specular: objMaterial.specularAmount,
            flags: {
              texture: objMaterial.textures.diffuse ? true : false,
              debugUv: false,
              debugNormals: false,
              debugColor: false,
            },
          };

          // Update material with new uniform data
          material.uniforms.uniforms = { ...uniforms };
          material.uniforms.setUniforms();

          // Do we have textures? Create them using material
          if (objMaterial.textures.diffuse) {
            material.addTexture(
              device,
              objMaterial.textures.diffuse,
              sampler,
              "diffuse"
            );
          } else {
            material.createDefaultTexture(device, sampler);
          }

          // Add material to cache
          materials[objMaterial.name] = material;
        });

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
        const vertex = vertices[vertexId];
        // console.log("[OBJ] meshPositions", vertex);
        meshPositions.push({ ...vertex });
      });

      // Indices
      const lastIndex = meshPositions.length - 3;
      meshIndices.push(lastIndex, lastIndex + 1, lastIndex + 2);

      // Normals
      face.normals.forEach((normalId) => {
        const normal = normals[normalId];
        meshNormals.push({ ...normal });
      });

      // UVs
      face.uvs.forEach((uvId) => {
        let uv = uvs[uvId];
        if (!uv)
          uv = {
            x: 0,
            y: 0,
          };
        meshUvs.push({ ...uv });
      });
    });

    // Create "geometry" containing the vertex + index data
    const geometry = new Geometry(device, {
      name: obj.name,
      vertices: generateVertexBufferData(meshPositions, meshNormals, meshUvs),
      indices: generateIndexBufferData(meshIndices),
    });

    // Create a mesh that combines geometry and material
    const mesh = new Mesh(device, renderPipeline, geometry, obj.material);

    return mesh;
  });

  return {
    meshes,
    materials,
  };
}
