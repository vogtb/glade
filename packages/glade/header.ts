import { text } from "./element";

/**
 * Like <h1> HTML tag.
 */
export function h1(value: string) {
  return text(value).size(32).weight(600).lineHeight(38.4);
}

/**
 * Like <h2> HTML tag.
 */
export function h2(value: string) {
  return text(value).size(24).weight(600).lineHeight(28.8);
}

/**
 * Like <h3> HTML tag.
 */
export function h3(value: string) {
  return text(value).size(19).weight(600).lineHeight(22.8);
}

/**
 * Like <h4> HTML tag.
 */
export function h4(value: string) {
  return text(value).size(16).weight(600).lineHeight(19.2);
}

/**
 * Like <h5> HTML tag.
 */
export function h5(value: string) {
  return text(value).size(13).weight(600).lineHeight(15.6);
}

/**
 * Like <h6> HTML tag.
 */
export function h6(value: string) {
  return text(value).size(11).weight(600).lineHeight(12.32);
}
