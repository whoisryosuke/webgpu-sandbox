import OBJFile from "obj-file-parser";
import fs from "node:fs";

const PATH_TO_FILE = "./scripts/cube-triangulated.obj";

const fileData = fs.readFileSync(PATH_TO_FILE, "utf8");

const objFile = new OBJFile(fileData);

const output = objFile.parse();
console.log("vertices", output);
const model = output.models[0];
const vertexPool = model.vertices;
const normalsPool = model.vertexNormals;
const texCoordsPool = model.textureCoords;
console.log("vertices", vertexPool);
console.log("vertexNormals", normalsPool);
console.log("texCoordsPool", texCoordsPool);
console.log("face", model.faces[0].vertices[0]);

const formattedVertexData = model.faces.reduce((merge, face) => {
  const vertices = face.vertices.map((vertexRef) => {
    const vertex = vertexPool[vertexRef.vertexIndex - 1];
    const normals = normalsPool[vertexRef.vertexNormalIndex - 1];
    const texCoords = texCoordsPool[vertexRef.textureCoordsIndex - 1];
    return {
      position: [vertex.x, vertex.y, vertex.z, 1],
      normals: [normals.x, normals.y, normals.z, 1],
      //   tex_coords: [texCoords.u, texCoords.v, texCoords.w],
    };
  });

  return [...merge, ...vertices];
}, []);

console.log("formattedVertexData", formattedVertexData);
