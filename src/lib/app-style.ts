import { cookies } from "next/headers";
import { APP_STYLES, STYLE_COOKIE, type AppStyle } from "@/config/styles";

export async function getAppStyle(): Promise<AppStyle> {
  const value = (await cookies()).get(STYLE_COOKIE)?.value;
  return APP_STYLES.find((s) => s.id === value)?.id ?? APP_STYLES[0].id;
}
