import municipalityData from "./data/cities.json";
const data: Record<string, string[]> = municipalityData;
export const stateNames: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};
const key = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\s]+$/, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
export const citiesFor = (state: string) => data[state] || [];
export function canonicalCity(value: string, state: string) {
  return citiesFor(state).find((city) => key(city) === key(value));
}
export function stateForCity(value: string) {
  const states = Object.entries(data)
    .filter(([, cities]) => cities.some((city) => key(city) === key(value)))
    .map(([state]) => state);
  return states.length === 1 ? states[0] : undefined;
}
