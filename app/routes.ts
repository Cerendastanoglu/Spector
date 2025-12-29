import { flatRoutes } from "@remix-run/fs-routes";
import type { RouteConfig } from "@remix-run/route-config";

const routes = flatRoutes();

export default routes || [] as RouteConfig;

