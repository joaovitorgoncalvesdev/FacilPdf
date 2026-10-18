import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Theme } from "@radix-ui/themes";
type Preference = "light" | "dark" | "system";
const Appearance = createContext<{
  preference: Preference;
  dark: boolean;
  setPreference: (value: Preference) => void;
}>({ preference: "system", dark: false, setPreference: () => {} });
export const useAppearance = () => useContext(Appearance);
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Preference>(() => {
    try {
      const value = localStorage.getItem("facilpdf-theme");
      return value === "dark" || value === "light" ? value : "system";
    } catch {
      return "system";
    }
  });
  const [systemDark, setSystemDark] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const dark = preference === "dark" || (preference === "system" && systemDark);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#141c18" : "#176348");
    try {
      localStorage.setItem("facilpdf-theme", preference);
    } catch {
      /* The theme still works when storage is unavailable. */
    }
  }, [dark, preference]);
  return (
    <Appearance.Provider value={{ preference, dark, setPreference }}>
      <Theme
        accentColor="green"
        grayColor="sage"
        radius="medium"
        appearance={dark ? "dark" : "light"}
      >
        {children}
      </Theme>
    </Appearance.Provider>
  );
}
