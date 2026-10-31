import { LocaleCode, TranslationDictionary } from "../types";
import { as } from "./as";
import { bn } from "./bn";
import { brx } from "./brx";
import { doi } from "./doi";
import { en } from "./en";
import { gu } from "./gu";
import { hi } from "./hi";
import { kn } from "./kn";
import { kok } from "./kok";
import { ks } from "./ks";
import { mai } from "./mai";
import { ml } from "./ml";
import { mni } from "./mni";
import { mr } from "./mr";
import { ne } from "./ne";
import { or } from "./or";
import { pa } from "./pa";
import { sa } from "./sa";
import { sat } from "./sat";
import { sd } from "./sd";
import { ta } from "./ta";
import { te } from "./te";
import { ur } from "./ur";

export const DICTIONARIES: Record<LocaleCode, TranslationDictionary> = {
  en,
  as,
  bn,
  brx,
  doi,
  gu,
  hi,
  kn,
  kok,
  ks,
  mai,
  ml,
  mni,
  mr,
  ne,
  or,
  pa,
  sa,
  sat,
  sd,
  ta,
  te,
  ur,
};

export function getDictionary(locale: LocaleCode): TranslationDictionary {
  return DICTIONARIES[locale] || DICTIONARIES.en;
}
