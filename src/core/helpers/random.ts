export function simpleRandomHash() {
  const hash = Number(new Date()).toString(36);
  return hash;
}
