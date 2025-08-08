import Mesh from "../mesh";
import { Vector2D, Vector3D } from "../vertex";

export async function loadObj(url: string) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const text = await response.text(); // Get the file content as text
    return text;
  } catch (error) {
    console.error(`Error reading file from URL ${url}:`, error);
    return ""; // Return an empty string in case of an error
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

  const lines = objString.split("\n");
  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      // Skip empty lines and comments
      continue;
    }

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
            indices.push(subPart ? parseInt(subPart) : 0);
          });
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

  //   return {
  //     vertices,
  //     normals,
  //     uvs,
  //     faces,
  //     // materials: Object.values(materialMap),
  //   };

  console.log("imported OBJ", { vertices, normals, uvs, faces });

  // Convert OBJ-style data to vertex buffer
  let meshPositions: Vector3D[] = [];
  let meshNormals: Vector3D[] = [];
  let meshUvs: Vector2D[] = [];
  let meshIndices: number[] = [];
  faces.forEach((face, index) => {
    face.vertices.forEach((vertexId) => {
      const vertex = vertices[vertexId - 1];
      meshPositions.push({ ...vertex });
    });
    meshIndices.push(...face.vertices);

    face.normals.forEach((normalId) => {
      const normal = normals[normalId - 1];
      meshNormals.push({ ...normal });
    });
    face.uvs.forEach((uvId) => {
      let uv = uvs[uvId - 1];
      if (!uv)
        uv = {
          x: 0,
          y: 0,
        };
      meshUvs.push({ ...uv });
    });
  });

  console.log("creating mesh", {
    meshPositions,
    meshNormals,
    meshUvs,
    meshIndices,
  });

  const mesh = new Mesh();
  mesh.position = meshPositions;
  mesh.normals = meshNormals;
  mesh.uvs = meshUvs;
  mesh.generateVertexBufferData();

  return {
    vertices: mesh.vertices,
    indices: new Uint16Array(meshIndices),
  };
}
