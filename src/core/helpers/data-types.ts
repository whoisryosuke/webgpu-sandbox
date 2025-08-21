export const isObject = (value: any) =>
  typeof value === "object" && !Array.isArray(value) && value !== null;
export const isArray = (value: any) =>
  typeof value != "object" && Array.isArray(value) && value !== null;

export const isObjOrArray = (value: any) => {
  const checkObject = isObject(value);
  const checkArray = isArray(value);

  return checkObject ? "object" : checkArray ? "array" : "other";
};
