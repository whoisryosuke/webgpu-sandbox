import Mesh from "../mesh";
import { Vector2D, Vector3D } from "../vertex";

export async function loadObj(url: string) {
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

interface Face {
  // The "indices" to each
  vertices: [number, number, number];
  normals: [number, number, number];
  uvs: [number, number];
}

export function importObj(objString: string) {
  let vertices: Vector3D[] = [];
  let normals: Vector3D[] = [];
  let uvs: Vector2D[] = []; // Optional
  let faces: Face[] = [];
  //   let materials: Material[] = [];
  //   let currentMaterialName: string | null = null;
  //   const materialMap: { [name: string]: Material } = {};

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
        parts.forEach((part, i) => {
          if (part == "f") return;

          const facePart = parts[i];
          const indices: number[] = [];

          const subParts = facePart.split("/");
          subParts.forEach((subPart) => {
            // We parse the number and subtract 1 because OBJ indexing starts at 1 (not 0 like arrays)
            indices.push(subPart ? parseInt(subPart) - 1 : 0);
          });
          // Didn't get enough values? Fill in the space with 0's
          // @TODO: Maybe this isn't correct? How should we handle this?
          if (indices.length < 3) {
            [...new Array(3)].forEach((_, indicesIndex) => {
              indices[indicesIndex] = indices[indicesIndex] ?? 0;
            });
          }

          face.vertices[i - 1] = indices[0];
          face.uvs[i - 1] = indices[1];
          face.normals[i - 1] = indices[2];

          i++;
        });

        faces.push(face);
        break;

      //   case "mtllib": // Material Library
      //     const materialLibPath = parts[1];
      //     // In a real implementation, you'd load the MTL file here and populate materialMap.
      //     // It's also a text file you can parse
      //     console.log(`Material library: ${materialLibPath}`);
      //     break;

      //   case "usemtl": // Use Material
      //     currentMaterialName = parts[1];
      //     if (!materialMap[currentMaterialName]) {
      //       materialMap[currentMaterialName] = { name: currentMaterialName };
      //     }
      //     break;

      default:
        console.warn(`Unknown command: ${trimmedLine}`); // Handle unknown commands gracefully
    }
  }

  // console.log("imported OBJ", { vertices, normals, uvs, faces });

  // Convert OBJ-style data to vertex buffer
  let meshPositions: Vector3D[] = [];
  let meshNormals: Vector3D[] = [];
  let meshUvs: Vector2D[] = [];
  let meshIndices: number[] = [];
  faces.forEach((face, index) => {
    face.vertices.forEach((vertexId) => {
      const vertex = vertices[vertexId];
      meshPositions.push({ ...vertex });
    });

    const lastIndex = meshIndices.length - 1;
    meshIndices.push(lastIndex + 1, lastIndex + 2, lastIndex + 3);

    face.normals.forEach((normalId) => {
      const normal = normals[normalId];
      meshNormals.push({ ...normal });
    });
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

  // console.log("creating mesh", {
  //   meshPositions,
  //   meshNormals,
  //   meshUvs,
  //   meshIndices,
  // });

  const mesh = new Mesh();
  mesh.position = meshPositions;
  mesh.normals = meshNormals;
  mesh.uvs = meshUvs;
  mesh.generateVertexBufferData();

  // Because we use Uint16 each row needs to be 4 bytes
  // 1 number x 2 bytes = 2 bytes per element
  // So we pad when necessary
  // Basically make sure this is an even number
  const paddedSize = Math.ceil(meshIndices.length / 2) * 2;
  const meshIndicesTypedArray = new Uint16Array(paddedSize);
  meshIndicesTypedArray.set(meshIndices);

  return {
    vertices: mesh.vertices,
    indices: meshIndicesTypedArray,
  };
}
