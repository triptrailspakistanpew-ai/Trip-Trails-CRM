export const CREATE_DRAWER_SEARCH_PARAM = "create";

export function withCreateDrawer(href: string): string {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}${CREATE_DRAWER_SEARCH_PARAM}=true`;
}
