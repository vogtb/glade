import { text } from "./element";

export function h1(value: string) {
  return text(value).size(32).weight(600).lineHeight(38.4);
}

export function h2(value: string) {
  return text(value).size(24).weight(600).lineHeight(28.8);
}

export function h3(value: string) {
  return text(value).size(19).weight(600).lineHeight(22.8);
}

export function h4(value: string) {
  return text(value).size(16).weight(600).lineHeight(19.2);
}

export function h5(value: string) {
  return text(value).size(13).weight(600).lineHeight(15.6);
}

export function h6(value: string) {
  return text(value).size(11).weight(600).lineHeight(12.32);
}
