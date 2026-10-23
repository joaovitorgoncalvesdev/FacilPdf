import { useContext, useId } from "react";
import { ValidationContext } from "./ValidationContext";
import { TextField } from "@radix-ui/themes";
import { citiesFor, stateNames, canonicalCity } from "./locations";
export default function LocationFields({
  state,
  city,
  onChange,
  cityLabel,
  stateLabel,
  required = false,
}: {
  state: string;
  city: string;
  onChange: (location: { state: string; city: string }) => void;
  cityLabel: string;
  stateLabel: string;
  required?: boolean;
}) {
  const id = useId();
  const attempted = useContext(ValidationContext);
  const stateError = attempted && required && !state;
  const cityError =
    (attempted && required && !city) ||
    !!(state && city && !canonicalCity(city, state));
  const cities = citiesFor(state);
  return (
    <>
      <label>
        <span className="field-title">
          {stateLabel}
          {required ? " *" : ""}
        </span>
        <select
          aria-required={required}
          aria-invalid={!!stateError}
          aria-describedby={stateError ? `${id}-state-error` : undefined}
          value={state}
          onChange={(e) => {
            const uf = e.target.value;
            onChange({ state: uf, city: canonicalCity(city, uf) || "" });
          }}
        >
          <option value="">Escolha o estado</option>
          {Object.entries(stateNames)
            .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
            .map(([uf, name]) => (
              <option value={uf} key={uf}>
                {name} ({uf})
              </option>
            ))}
        </select>
        {stateError && (
          <small id={`${id}-state-error`} className="review-warning">
            Escolha o estado.
          </small>
        )}
      </label>
      <label>
        <span className="field-title">
          {cityLabel}
          {required ? " *" : ""}
        </span>
        <TextField.Root
          aria-required={required}
          aria-invalid={!!cityError}
          aria-describedby={cityError ? `${id}-city-error` : undefined}
          value={city}
          list={id}
          disabled={!state}
          placeholder={
            state
              ? "Digite para buscar a cidade"
              : "Selecione primeiro o estado"
          }
          onChange={(e) => onChange({ state, city: e.target.value })}
          onBlur={() => {
            const normalized = canonicalCity(city, state);
            if (normalized && normalized !== city)
              onChange({ state, city: normalized });
          }}
        />
        <datalist id={id}>
          {cities.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        {cityError && (
          <small id={`${id}-city-error`} className="review-warning">
            {city
              ? `Escolha um município de ${stateNames[state]} na lista.`
              : "Informe a cidade após escolher o estado."}
          </small>
        )}
      </label>
    </>
  );
}
